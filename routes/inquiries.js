const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const cars = require("../data/cars");

const DB_PATH = path.join(__dirname, "../data/inquiries.json");

// ─── helpers ──────────────────────────────────────────────────────────────────

function readInquiries() {
  if (!fs.existsSync(DB_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  } catch {
    return [];
  }
}

function writeInquiries(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
}

// ─── POST /api/inquiries ──────────────────────────────────────────────────────
router.post("/", (req, res) => {
  const { carId, name, email, phone, message } = req.body;

  // Validate required fields
  const missing = [];
  if (!carId) missing.push("carId");
  if (!name) missing.push("name");
  if (!email) missing.push("email");
  if (!phone) missing.push("phone");

  if (missing.length) {
    return res.status(400).json({
      error: "Missing required fields",
      missing,
    });
  }

  // Basic email format check
  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRx.test(email)) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  // Make sure the vehicle exists
  const car = cars.find((c) => c.id === parseInt(carId));
  if (!car) {
    return res.status(404).json({ error: "Vehicle not found" });
  }

  // Build & persist the inquiry
  const inquiry = {
    id: Date.now(),
    carId: car.id,
    vehicle: `${car.year} ${car.make} ${car.model}`,
    price: car.price,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    message: message ? message.trim() : "",
    submittedAt: new Date().toISOString(),
    status: "new",
  };

  const all = readInquiries();
  all.push(inquiry);
  writeInquiries(all);

  console.log(
    `[Inquiry] ${inquiry.submittedAt} — ${inquiry.name} <${inquiry.email}> re: ${inquiry.vehicle}`
  );

  res.status(201).json({
    success: true,
    message: `Thank you ${inquiry.name}! Your inquiry about the ${inquiry.vehicle} has been received. We'll be in touch at ${inquiry.email} soon.`,
    inquiryId: inquiry.id,
  });
});

// ─── GET /api/inquiries ───────────────────────────────────────────────────────
// Simple admin-only listing (protect with auth middleware in production)
router.get("/", (req, res) => {
  const all = readInquiries();
  res.json({ count: all.length, inquiries: all });
});

// ─── GET /api/inquiries/:id ───────────────────────────────────────────────────
router.get("/:id", (req, res) => {
  const all = readInquiries();
  const inq = all.find((i) => i.id === parseInt(req.params.id));
  if (!inq) return res.status(404).json({ error: "Inquiry not found" });
  res.json(inq);
});

// ─── PATCH /api/inquiries/:id/status ─────────────────────────────────────────
router.patch("/:id/status", (req, res) => {
  const { status } = req.body;
  const allowed = ["new", "contacted", "closed"];

  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });
  }

  const all = readInquiries();
  const idx = all.findIndex((i) => i.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: "Inquiry not found" });

  all[idx].status = status;
  all[idx].updatedAt = new Date().toISOString();
  writeInquiries(all);

  res.json({ success: true, inquiry: all[idx] });
});

module.exports = router;
