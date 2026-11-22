// routes/admin.js — APEX MOTORS Admin API (requireAdmin on all routes)
const express = require("express");
const router  = express.Router();
const pool    = require("../db");
const { requireAdmin } = require("../middleware/auth");

// Apply admin guard to every route in this file
router.use(requireAdmin);

// ─── GET /api/admin/stats ──────────────────────────────────────────────────
router.get("/stats", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM cars WHERE status != 'hidden')           AS total_cars,
        (SELECT COUNT(*) FROM cars WHERE stock = 0)                    AS out_of_stock,
        (SELECT COUNT(*) FROM car_inquiries WHERE status = 'new')      AS new_inquiries,
        (SELECT COUNT(*) FROM car_inquiries
          WHERE submitted_at >= NOW() - INTERVAL '24 hours')           AS inquiries_today,
        (SELECT COUNT(*) FROM contact_messages WHERE status = 'new')   AS unread_contacts,
        (SELECT COUNT(*) FROM users)                                   AS total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'admin')              AS admin_count
    `);
    return res.json({ success: true, stats: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── INQUIRIES ─────────────────────────────────────────────────────────────
router.get("/inquiries", async (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;
  const where = status ? `WHERE ci.status = $3` : "";
  const params = status ? [limit, offset, status] : [limit, offset];
  try {
    const { rows } = await pool.query(
      `SELECT ci.*, u.name AS user_name
       FROM car_inquiries ci
       LEFT JOIN users u ON ci.user_id = u.id
       ${where}
       ORDER BY ci.submitted_at DESC
       LIMIT $1 OFFSET $2`,
      params
    );
    const total = await pool.query(`SELECT COUNT(*) FROM car_inquiries ${status ? "WHERE status = $1" : ""}`, status ? [status] : []);
    return res.json({ success: true, inquiries: rows, total: Number(total.rows[0].count) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.patch("/inquiries/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const VALID = ["new", "contacted", "closed"];
  if (!VALID.includes(status)) return res.status(422).json({ success: false, message: `status must be: ${VALID.join(" | ")}` });
  try {
    const { rows } = await pool.query(
      "UPDATE car_inquiries SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [status, id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "Not found." });
    return res.json({ success: true, inquiry: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete("/inquiries/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM car_inquiries WHERE id = $1", [req.params.id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── CONTACT MESSAGES ──────────────────────────────────────────────────────
router.get("/contacts", async (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;
  const where = status ? "WHERE status = $3" : "";
  const params = status ? [limit, offset, status] : [limit, offset];
  try {
    const { rows } = await pool.query(
      `SELECT * FROM contact_messages ${where} ORDER BY submitted_at DESC LIMIT $1 OFFSET $2`,
      params
    );
    const total = await pool.query(`SELECT COUNT(*) FROM contact_messages ${status ? "WHERE status = $1" : ""}`, status ? [status] : []);
    return res.json({ success: true, contacts: rows, total: Number(total.rows[0].count) });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.patch("/contacts/:id/status", async (req, res) => {
  const { status } = req.body;
  const VALID = ["new", "read", "resolved"];
  if (!VALID.includes(status)) return res.status(422).json({ success: false, message: `status must be: ${VALID.join(" | ")}` });
  try {
    const { rows } = await pool.query(
      "UPDATE contact_messages SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "Not found." });
    return res.json({ success: true, contact: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete("/contacts/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM contact_messages WHERE id = $1", [req.params.id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── CARS CRUD ─────────────────────────────────────────────────────────────
router.get("/cars", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM cars ORDER BY id ASC");
    return res.json({ success: true, cars: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/cars", async (req, res) => {
  const { year, make, model, price, mileage, hp, engine, category, badge, featured, stock, status, img } = req.body;
  if (!year || !make || !model || !price) return res.status(422).json({ success: false, message: "year, make, model, price are required." });
  try {
    const { rows } = await pool.query(
      `INSERT INTO cars (year, make, model, price, mileage, hp, engine, category, badge, featured, stock, status, img)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [year, make, model, price, mileage||0, hp||null, engine||null,
       category||[], badge||null, featured||false, stock??1, status||"available", img||null]
    );
    return res.status(201).json({ success: true, car: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.patch("/cars/:id", async (req, res) => {
  const fields = ["year","make","model","price","mileage","hp","engine","category","badge","featured","stock","status","img"];
  const updates = []; const params = [];
  fields.forEach(f => {
    if (req.body[f] !== undefined) { params.push(req.body[f]); updates.push(`${f} = $${params.length}`); }
  });
  if (!updates.length) return res.status(422).json({ success: false, message: "Nothing to update." });
  params.push(req.params.id);
  try {
    const { rows } = await pool.query(
      `UPDATE cars SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "Car not found." });
    return res.json({ success: true, car: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete("/cars/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM cars WHERE id = $1", [req.params.id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── USERS ─────────────────────────────────────────────────────────────────
router.get("/users", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC");
    return res.json({ success: true, users: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.patch("/users/:id/role", async (req, res) => {
  const { role } = req.body;
  if (!["admin", "customer"].includes(role)) return res.status(422).json({ success: false, message: "role must be admin | customer" });
  try {
    const { rows } = await pool.query("UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role", [role, req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "User not found." });
    return res.json({ success: true, user: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
