// routes/inquiry.js — APEX MOTORS car inquiry endpoint
const express = require("express");
const router  = express.Router();
const pool    = require("../db");
const { sendInquiryNotification } = require("../mailer");
const { optionalAuth } = require("../middleware/auth");

// ── POST /api/inquiries ───────────────────────────────────
// Payload sent by inventory.js frontend:
//   { carId, vehicle, price, name, email, phone, message }
router.post("/", optionalAuth, async (req, res) => {
  const { carId, vehicle, price, name, email, phone, message } = req.body;

  // ── Validate required fields ──────────────────────────
  const errors = [];
  if (!name  || name.trim().length  < 2) errors.push("name is required (min 2 chars).");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("A valid email is required.");
  if (!carId && !vehicle) errors.push("carId or vehicle name is required.");

  if (errors.length) {
    return res.status(422).json({ success: false, errors });
  }

  const cleanName    = name.trim();
  const cleanEmail   = email.trim().toLowerCase();
  const cleanPhone   = phone ? phone.trim() : null;
  const cleanMsg     = message ? message.trim() : "";
  const vehicleName  = vehicle || `Vehicle ID ${carId}`;
  let vehiclePrice = null;
  if (price !== undefined && price !== null) {
    const numStr = String(price).replace(/[^0-9]/g, '');
    if (numStr) vehiclePrice = parseInt(numStr, 10);
  }
  const vehicleId    = carId ? Number(carId) : null;

  try {
    // ── Availability check ────────────────────────────────
    if (vehicleId) {
      const { rows: carRows } = await pool.query(
        "SELECT stock, status, make, model, year FROM cars WHERE id = $1",
        [vehicleId]
      );
      if (carRows.length > 0) {
        const { stock, status, make, model, year } = carRows[0];
        const displayName = `${year} ${make} ${model}`;
        if (status === "sold" || status === "hidden") {
          return res.status(409).json({
            success: false,
            message: `Sorry, the ${displayName} is no longer available.`,
          });
        }
        if (stock === 0) {
          return res.status(409).json({
            success: false,
            message: `Sorry, the ${displayName} is currently out of stock.`,
          });
        }
      }
    }

    // Attach user_id if the request came from a logged-in customer
    const userId = req.user ? req.user.id : null;

    const { rows } = await pool.query(
      `INSERT INTO car_inquiries
         (car_id, vehicle_name, vehicle_price, customer_name, email, phone, message, user_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'new')
       RETURNING id, submitted_at`,
      [vehicleId, vehicleName, vehiclePrice, cleanName, cleanEmail, cleanPhone, cleanMsg, userId]
    );

    const saved = rows[0];
    console.log(`[Inquiry] Saved #${saved.id} — ${cleanName} → ${vehicleName}`);

    // Fire notification email in the background (non-fatal if SMTP not configured)
    sendInquiryNotification({
      id:           saved.id,
      name:         cleanName,
      email:        cleanEmail,
      phone:        cleanPhone,
      vehicle:      vehicleName,
      price:        vehiclePrice,
      message:      cleanMsg,
      submittedAt:  saved.submitted_at,
    }).catch((err) =>
      console.warn("[Inquiry] Email notification failed (non-fatal):", err.message)
    );

    return res.status(201).json({
      success: true,
      message: `Thank you ${cleanName}! Your inquiry about the ${vehicleName} has been received. We'll be in touch within 24 hours.`,
      id: saved.id,
      submittedAt: saved.submitted_at,
    });

  } catch (err) {
    console.error("[Inquiry] DB error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error. Please try again." });
  }
});

// ── GET /api/inquiries ─────────────────────────────────────
router.get("/", async (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;
  const params = [];
  let whereClause = "";

  if (status) {
    params.push(status);
    whereClause = `WHERE status = $${params.length}`;
  }

  params.push(Number(limit), Number(offset));

  try {
    const { rows } = await pool.query(
      `SELECT * FROM car_inquiries ${whereClause}
       ORDER BY submitted_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) FROM car_inquiries ${whereClause}`,
      status ? [status] : []
    );
    return res.json({
      success: true,
      total: Number(countRows[0].count),
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("[Inquiry] DB error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// ── GET /api/inquiries/:id ─────────────────────────────────
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1)
    return res.status(400).json({ success: false, message: "Invalid ID." });

  try {
    const { rows } = await pool.query(
      "SELECT * FROM car_inquiries WHERE id = $1",
      [id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "Inquiry not found." });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// ── PATCH /api/inquiries/:id/status ───────────────────────
router.patch("/:id/status", async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  const VALID = ["new", "contacted", "closed"];

  if (!Number.isInteger(id) || id < 1)
    return res.status(400).json({ success: false, message: "Invalid ID." });

  if (!VALID.includes(status))
    return res.status(422).json({ success: false, message: `status must be: ${VALID.join(" | ")}` });

  try {
    const { rowCount } = await pool.query(
      "UPDATE car_inquiries SET status = $1, updated_at = NOW() WHERE id = $2",
      [status, id]
    );
    if (!rowCount) return res.status(404).json({ success: false, message: "Inquiry not found." });
    return res.json({ success: true, id, status });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

module.exports = router;
