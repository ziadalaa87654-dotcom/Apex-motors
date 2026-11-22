// routes/contact.js — APEX MOTORS contact form endpoint
const express = require("express");
const router  = express.Router();
const pool    = require("../db");
const { sendAdminNotification, sendCustomerAutoReply } = require("../mailer");

// ── Validation ────────────────────────────────────────────
const VALID_SUBJECTS = ["inventory", "services", "appointment", "testdrive", "financing", "other", ""];

function validateContact(body) {
  if (!body || typeof body !== "object")
    return { valid: false, errors: [{ field: "body", message: "Request body must be a JSON object." }] };

  const errors = [];

  if (!body.firstName || body.firstName.trim().length < 2)
    errors.push({ field: "firstName", message: "First name is required (min 2 chars)." });

  if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))
    errors.push({ field: "email", message: "A valid email address is required." });

  if (body.subject !== undefined && !VALID_SUBJECTS.includes(body.subject))
    errors.push({ field: "subject", message: "Please select a valid subject." });

  if (!body.message || body.message.trim().length < 10)
    errors.push({ field: "message", message: "Message is required (min 10 chars)." });

  if (errors.length) return { valid: false, errors };

  return {
    valid: true,
    data: {
      first_name: body.firstName.trim(),
      last_name:  body.lastName  ? body.lastName.trim()  : null,
      email:      body.email.trim().toLowerCase(),
      phone:      body.phone     ? body.phone.trim()     : null,
      subject:    body.subject   || null,
      message:    body.message.trim(),
      status:     "new",
    },
  };
}

// ── POST /api/contact ─────────────────────────────────────
router.post("/", async (req, res) => {
  const result = validateContact(req.body);

  if (!result.valid) {
    return res.status(422).json({ success: false, errors: result.errors });
  }

  const { first_name, last_name, email, phone, subject, message, status } = result.data;

  let row;
  try {
    const { rows } = await pool.query(
      `INSERT INTO contact_messages
         (name, first_name, last_name, email, phone, subject, message, status, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING id, submitted_at`,
      [(first_name + " " + (last_name || "")).trim(), first_name, last_name, email, phone, subject, message, status]
    );
    row = rows[0];
  } catch (err) {
    console.error("[Contact] DB error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error. Please try again." });
  }

  // Respond to client immediately, then fire emails in the background
  res.status(201).json({
    success: true,
    message: "Message received. We'll be in touch within 24 hours.",
    id: row.id,
    submittedAt: row.submitted_at,
  });

  // Background emails — won't crash the request if they fail
  const emailData = { id: row.id, firstName: first_name, lastName: last_name, email, phone, subject, message };

  sendAdminNotification(emailData).catch((err) =>
    console.warn("[Contact] Admin email failed (non-fatal):", err.message)
  );
  sendCustomerAutoReply(emailData).catch((err) =>
    console.warn("[Contact] Auto-reply email failed (non-fatal):", err.message)
  );
});

// ── GET /api/contact — list all messages (admin) ──────────
router.get("/", async (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;

  let query = `SELECT * FROM contact_messages`;
  const params = [];

  if (status) {
    params.push(status);
    query += ` WHERE status = $${params.length}`;
  }

  query += ` ORDER BY submitted_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(Number(limit), Number(offset));

  try {
    const { rows } = await pool.query(query, params);
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) FROM contact_messages${status ? " WHERE status = $1" : ""}`,
      status ? [status] : []
    );
    return res.json({ success: true, total: Number(countRows[0].count), count: rows.length, data: rows });
  } catch (err) {
    console.error("[Contact] DB error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// ── PATCH /api/contact/:id/status ────────────────────────
router.patch("/:id/status", async (req, res) => {
  const id     = Number(req.params.id);
  const { status } = req.body;
  const VALID  = ["new", "read", "resolved"];

  if (!Number.isInteger(id) || id < 1)
    return res.status(400).json({ success: false, message: "Invalid ID." });

  if (!VALID.includes(status))
    return res.status(422).json({ success: false, message: "status must be: new | read | resolved" });

  try {
    const { rowCount } = await pool.query(
      `UPDATE contact_messages SET status = $1 WHERE id = $2`,
      [status, id]
    );
    if (!rowCount) return res.status(404).json({ success: false, message: "Message not found." });
    return res.json({ success: true, id, status });
  } catch (err) {
    console.error("[Contact] DB error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// ── DELETE /api/contact/:id ───────────────────────────────
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1)
    return res.status(400).json({ success: false, message: "Invalid ID." });

  try {
    const { rowCount } = await pool.query(`DELETE FROM contact_messages WHERE id = $1`, [id]);
    if (!rowCount) return res.status(404).json({ success: false, message: "Message not found." });
    return res.json({ success: true, id });
  } catch (err) {
    console.error("[Contact] DB error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

module.exports = router;
