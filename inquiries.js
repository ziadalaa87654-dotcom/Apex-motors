const express = require("express");
const router = express.Router();
const pool = require("../db"); // استدعاء اتصال الداتابيز

// ─── POST /api/inquiries ──────────────────────────────────────────────────────
// تسجيل طلب استفسار جديد في قاعدة البيانات
router.post("/", async (req, res) => {
  const { carId, name, email, phone, message } = req.body;

  // 1. التأكد من وجود البيانات المطلوبة
  const missing = [];
  if (!carId) missing.push("carId");
  if (!name) missing.push("name");
  if (!email) missing.push("email");
  if (!phone) missing.push("phone");

  if (missing.length) {
    return res.status(400).json({ error: "Missing required fields", missing });
  }

  // 2. فحص صيغة الإيميل
  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRx.test(email)) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  try {
    // 3. التأكد أن السيارة موجودة فعلاً في جدول cars قبل تسجيل الطلب
    const carCheck = await pool.query("SELECT name FROM cars WHERE id = $1", [carId]);
    if (carCheck.rows.length === 0) {
      return res.status(404).json({ error: "Vehicle not found" });
    }
    const vehicleName = carCheck.rows[0].name;

    // 4. حفظ الطلب في جدول car_inquiries
    const insertQuery = `
      INSERT INTO car_inquiries (car_id, customer_name, email, phone, message)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [carId, name.trim(), email.trim().toLowerCase(), phone.trim(), message ? message.trim() : ""];
    
    const result = await pool.query(insertQuery, values);
    const savedInquiry = result.rows[0];

    console.log(`[Inquiry Saved] ID: ${savedInquiry.id} — From: ${savedInquiry.customer_name}`);

    res.status(201).json({
      success: true,
      message: `Thank you ${name}! Your inquiry about the ${vehicleName} has been received.`,
      inquiryId: savedInquiry.id,
    });

  } catch (err) {
    console.error("Database Error:", err.message);
    res.status(500).json({ error: "Internal server error while saving inquiry" });
  }
});

// ─── GET /api/inquiries ───────────────────────────────────────────────────────
// عرض قائمة بكل الطلبات المسجلة
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM car_inquiries ORDER BY created_at DESC");
    res.json({ count: result.rows.length, inquiries: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/inquiries/:id ───────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM car_inquiries WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Inquiry not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PATCH /api/inquiries/:id/status ─────────────────────────────────────────
// تحديث حالة الطلب (new, contacted, closed)
router.patch("/:id/status", async (req, res) => {
  const { status } = req.body;
  const allowed = ["pending", "contacted", "closed"]; // عدلت pending لتمشي مع الديفولت بتاعك في الداتابيز

  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });
  }

  try {
    const updateQuery = "UPDATE car_inquiries SET status = $1 WHERE id = $2 RETURNING *";
    const result = await pool.query(updateQuery, [status, req.params.id]);

    if (result.rows.length === 0) return res.status(404).json({ error: "Inquiry not found" });

    res.json({ success: true, inquiry: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;