// routes/cars.js — APEX MOTORS vehicle inventory from PostgreSQL
const express = require("express");
const router  = express.Router();
const pool    = require("../db");

// ─── GET /api/cars ─────────────────────────────────────────────────────────
// Supports: ?filter=suv&search=porsche&sort=price-asc&include_hidden=1
router.get("/", async (req, res) => {
  const { filter, search, sort, include_hidden } = req.query;

  const params = [];
  const where  = [];

  // Hide 'hidden' cars from public inventory (admin can pass ?include_hidden=1)
  if (!include_hidden) {
    where.push(`status != 'hidden'`);
  }

  // Category filter
  if (filter && filter !== "all") {
    params.push(`%${filter.toLowerCase()}%`);
    where.push(`LOWER(category::text) LIKE $${params.length}`);
  }

  // Text search across year + make + model
  if (search) {
    params.push(`%${search.toLowerCase().trim()}%`);
    where.push(
      `LOWER(CONCAT(year::text, ' ', make, ' ', model)) LIKE $${params.length}`
    );
  }

  const whereSQL = where.length ? "WHERE " + where.join(" AND ") : "";

  // Sorting
  const sortMap = {
    "price-asc":   "price ASC",
    "price-desc":  "price DESC",
    "year-desc":   "year DESC",
    "year-asc":    "year ASC",
    "mileage-asc": "mileage ASC",
    "default":     "featured DESC, id ASC",
  };
  const orderSQL = sortMap[sort] || sortMap["default"];

  try {
    const { rows } = await pool.query(
      `SELECT * FROM cars ${whereSQL} ORDER BY ${orderSQL}`,
      params
    );
    return res.json({ count: rows.length, cars: rows });
  } catch (err) {
    console.error("[Cars] DB error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// ─── GET /api/cars/stats ───────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status != 'hidden')               AS total,
        COUNT(DISTINCT make) FILTER (WHERE status != 'hidden')   AS makes,
        COUNT(*) FILTER (WHERE badge = 'certified')              AS cpo,
        COUNT(*) FILTER (WHERE status = 'available' AND stock > 0) AS available
      FROM cars
    `);
    const { total, makes, cpo, available } = rows[0];
    return res.json({
      total:     Number(total),
      makes:     Number(makes),
      cpo:       Number(cpo),
      available: Number(available),
    });
  } catch (err) {
    console.error("[Cars/stats] DB error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// ─── GET /api/cars/:id ─────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1)
    return res.status(400).json({ success: false, message: "Invalid car ID." });

  try {
    const { rows } = await pool.query("SELECT * FROM cars WHERE id = $1", [id]);
    if (!rows.length)
      return res.status(404).json({ success: false, message: "Vehicle not found." });
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// ─── PATCH /api/cars/:id/stock ─────────────────────────────────────────────
// Body: { stock: 3 }  — admin sets the stock count directly
router.patch("/:id/stock", async (req, res) => {
  const id    = Number(req.params.id);
  const stock = req.body.stock;

  if (!Number.isInteger(id) || id < 1)
    return res.status(400).json({ success: false, message: "Invalid ID." });

  if (!Number.isInteger(stock) || stock < 0)
    return res.status(422).json({ success: false, message: "stock must be a non-negative integer." });

  try {
    // Auto-update status: if stock drops to 0 and car was available → mark sold
    const { rows } = await pool.query(
      `UPDATE cars
       SET stock      = $1,
           status     = CASE
                          WHEN $1 = 0 AND status = 'available' THEN 'sold'
                          WHEN $1 > 0 AND status = 'sold'      THEN 'available'
                          ELSE status
                        END,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, stock, status`,
      [stock, id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: "Vehicle not found." });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("[Cars/stock] DB error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// ─── PATCH /api/cars/:id/status ────────────────────────────────────────────
// Body: { status: "sold" }
router.patch("/:id/status", async (req, res) => {
  const id     = Number(req.params.id);
  const { status } = req.body;
  const VALID  = ["available", "sold", "reserved", "hidden"];

  if (!Number.isInteger(id) || id < 1)
    return res.status(400).json({ success: false, message: "Invalid ID." });

  if (!VALID.includes(status))
    return res.status(422).json({
      success: false,
      message: `status must be: ${VALID.join(" | ")}`,
    });

  try {
    const { rows } = await pool.query(
      `UPDATE cars
       SET status     = $1,
           stock      = CASE WHEN $1 = 'sold' THEN 0 ELSE stock END,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, stock, status`,
      [status, id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: "Vehicle not found." });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("[Cars/status] DB error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});

module.exports = router;
