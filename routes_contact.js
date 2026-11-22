// routes/contact.js — APEX MOTORS contact form endpoint
const express = require("express");
const router  = express.Router();
const pool    = require("../db");

// ── Validation ────────────────────────────────────────────
const VALID_SUBJECTS = [
  "inventory", "services", "appointment",
  "testdrive", "financing", "other", ""
];

function validateContact(body) {
  if (!body || typeof body !== "object")
    return { valid: false, errors: [{ field: "body", message: "Request body must be a JSON object." }] };

  const errors = [];

  if (!body.firstName || body.firstName.trim().length < 2)
    errors.push({ field: "firstName", message: "First name is required (min 2 chars)." });

  if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))
    errors.push({ field: "email", message: "A valid email address is required." });

  if (!VALID_SUBJECTS.includes(body.subject))
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

// ── POST /api/contact — submit a contact message ──────────
router.post("/", async (req, res) => {
  const result = validateContact(req.body);

  if (!result.valid) {
    return res.status(422).json({ success: false, errors: result.errors });
  }

  const { first_name, last_name, email, phone, subject, message, status } = result.data;

  try {
    const { rows } = await pool.query(
      `INSERT INTO contact_messages
         (name, first_name, last_name, email, phone, subject, message, status, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING id, submitted_at`,
      [(first_name + " " + (last_name || "")).trim(), first_name, last_name, email, phone, subject, message, status]
    );

    return res.status(201).json({
      success: true,
      message: "Message received. We'll be in touch within 24 hours.",
      id: rows[0].id,
      submittedAt: rows[0].submitted_at,
    });
  } catch (err) {
    console.error("[Contact] DB error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// ── GET /api/contact — list all messages (admin) ──────────
router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM contact_messages ORDER BY submitted_at DESC`
    );
    return res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    console.error("[Contact] DB error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// ── PATCH /api/contact/:id/status — mark read/resolved ───
router.patch("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const VALID = ["new", "read", "resolved"];

  if (!VALID.includes(status)) {
    return res.status(422).json({ success: false, message: "status must be: new | read | resolved" });
  }

  try {
    const { rowCount } = await pool.query(
      `UPDATE contact_messages SET status = $1 WHERE id = $2`,
      [status, id]
    );
    if (!rowCount) return res.status(404).json({ success: false, message: "Message not found." });
    return res.json({ success: true, id: Number(id), status });
  } catch (err) {
    console.error("[Contact] DB error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

module.exports = router;
