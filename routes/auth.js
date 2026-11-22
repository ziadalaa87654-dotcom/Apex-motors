// routes/auth.js — APEX MOTORS Authentication API
const express  = require("express");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const router   = express.Router();
const pool     = require("../db");
const { requireAuth, JWT_SECRET } = require("../middleware/auth");

const BCRYPT_ROUNDS = 12;
const JWT_EXPIRES   = process.env.JWT_EXPIRES_IN || "7d";

// Helper: sign a JWT for a user row
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

// ─── POST /api/auth/register ───────────────────────────────────────────────
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  const errors = [];

  if (!name    || name.trim().length < 2)      errors.push("Name must be at least 2 characters.");
  if (!email   || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Valid email is required.");
  if (!password || password.length < 8)        errors.push("Password must be at least 8 characters.");
  if (errors.length) return res.status(422).json({ success: false, errors });

  try {
    // Check email uniqueness
    const exists = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase().trim()]);
    if (exists.rows.length) {
      return res.status(409).json({ success: false, message: "An account with this email already exists." });
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, role, created_at`,
      [name.trim(), email.toLowerCase().trim(), hash]
    );

    const user  = rows[0];
    const token = signToken(user);
    console.log(`[Auth] New registration: ${user.email}`);

    return res.status(201).json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("[Auth/register] Error:", err.message);
    return res.status(500).json({ success: false, message: "Registration failed. Please try again." });
  }
});

// ─── POST /api/auth/login ──────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(422).json({ success: false, message: "Email and password are required." });
  }

  try {
    const { rows } = await pool.query(
      "SELECT id, name, email, role, password_hash FROM users WHERE email = $1",
      [email.toLowerCase().trim()]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    const user     = rows[0];
    const match    = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    const token = signToken(user);
    console.log(`[Auth] Login: ${user.email} (${user.role})`);

    return res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("[Auth/login] Error:", err.message);
    return res.status(500).json({ success: false, message: "Login failed. Please try again." });
  }
});

// ─── GET /api/auth/me ──────────────────────────────────────────────────────
router.get("/me", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, email, role, created_at FROM users WHERE id = $1",
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "User not found." });
    return res.json({ success: true, user: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─── PATCH /api/auth/me ────────────────────────────────────────────────────
// Update own name or password
router.patch("/me", requireAuth, async (req, res) => {
  const { name, currentPassword, newPassword } = req.body;
  const updates = [];
  const params  = [];

  try {
    if (name && name.trim().length >= 2) {
      params.push(name.trim());
      updates.push(`name = $${params.length}`);
    }

    if (currentPassword && newPassword) {
      if (newPassword.length < 8) {
        return res.status(422).json({ success: false, message: "New password must be at least 8 characters." });
      }
      const { rows } = await pool.query("SELECT password_hash FROM users WHERE id = $1", [req.user.id]);
      const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
      if (!match) return res.status(401).json({ success: false, message: "Current password is incorrect." });

      params.push(await bcrypt.hash(newPassword, BCRYPT_ROUNDS));
      updates.push(`password_hash = $${params.length}`);
    }

    if (!updates.length) return res.status(422).json({ success: false, message: "Nothing to update." });

    params.push(req.user.id);
    const { rows } = await pool.query(
      `UPDATE users SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${params.length}
       RETURNING id, name, email, role`,
      params
    );
    return res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error("[Auth/me PATCH] Error:", err.message);
    return res.status(500).json({ success: false, message: "Update failed." });
  }
});

module.exports = router;
