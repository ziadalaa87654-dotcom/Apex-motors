// routes/account.js — Customer Portal API (requireAuth — any logged-in user)
const express = require("express");
const router  = express.Router();
const bcrypt  = require("bcryptjs");
const pool    = require("../db");
const { requireAuth } = require("../middleware/auth");

router.use(requireAuth);

// ─── GET /api/account/profile ──────────────────────────────────────────────
router.get("/profile", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, email, role, created_at FROM users WHERE id = $1",
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "User not found." });
    return res.json({ success: true, user: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PATCH /api/account/profile ────────────────────────────────────────────
router.patch("/profile", async (req, res) => {
  const { name, currentPassword, newPassword } = req.body;
  const updates = []; const params = [];

  try {
    if (name && name.trim().length >= 2) {
      params.push(name.trim());
      updates.push(`name = $${params.length}`);
    }

    if (currentPassword && newPassword) {
      if (newPassword.length < 8)
        return res.status(422).json({ success: false, message: "New password must be at least 8 characters." });

      const { rows } = await pool.query("SELECT password_hash FROM users WHERE id = $1", [req.user.id]);
      const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
      if (!match)
        return res.status(401).json({ success: false, message: "Current password is incorrect." });

      params.push(await bcrypt.hash(newPassword, 12));
      updates.push(`password_hash = $${params.length}`);
    }

    if (!updates.length)
      return res.status(422).json({ success: false, message: "Nothing to update." });

    params.push(req.user.id);
    const { rows } = await pool.query(
      `UPDATE users SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${params.length}
       RETURNING id, name, email, role`,
      params
    );
    return res.json({ success: true, user: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/account/inquiries ────────────────────────────────────────────
router.get("/inquiries", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ci.id, ci.vehicle_name, ci.vehicle_price, ci.message,
              ci.status, ci.submitted_at, ci.updated_at,
              c.img AS car_img, c.year, c.make, c.model, c.stock, c.status AS car_status
       FROM car_inquiries ci
       LEFT JOIN cars c ON ci.car_id = c.id
       WHERE ci.user_id = $1
       ORDER BY ci.submitted_at DESC`,
      [req.user.id]
    );
    return res.json({ success: true, inquiries: rows, total: rows.length });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/account/stats ────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
        COUNT(*)                                           AS total,
        COUNT(*) FILTER (WHERE status = 'new')            AS pending,
        COUNT(*) FILTER (WHERE status = 'contacted')      AS contacted,
        COUNT(*) FILTER (WHERE status = 'closed')         AS closed
       FROM car_inquiries WHERE user_id = $1`,
      [req.user.id]
    );
    return res.json({ success: true, stats: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
