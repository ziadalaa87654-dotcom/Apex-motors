// server.js — APEX MOTORS Express server
require("dotenv").config();

const express    = require("express");
const cors       = require("cors");
const rateLimit  = require("express-rate-limit");
const path       = require("path");
const { testConnection } = require("./db");
const { verifyConnection }  = require("./mailer");
const contactRouter = require("./routes/contact");
const inquiryRouter = require("./routes/inquiry");
const carsRouter    = require("./routes/cars");
const authRouter    = require("./routes/auth");
const adminRouter   = require("./routes/admin");
const accountRouter = require("./routes/account");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CORS ──────────────────────────────────────────────────
// Build a set of explicitly allowed origins from the env var
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)
);

// Always allow the server's own origin (same-origin browser requests)
const PORT_NUM = process.env.PORT || 3000;
allowedOrigins.add(`http://localhost:${PORT_NUM}`);
allowedOrigins.add(`http://127.0.0.1:${PORT_NUM}`);

app.use(cors({
  origin: (origin, cb) => {
    // Allow: no origin (Postman/curl), same-origin, or explicitly listed origin
    if (!origin || allowedOrigins.has(origin)) {
      return cb(null, true);
    }
    cb(new Error(`CORS: origin '${origin}' not allowed`));
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// ── Body parsing ──────────────────────────────────────────
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: false, limit: "64kb" }));

// ── Rate limiting (anti-spam) ─────────────────────────────
// Contact form: strict limit (unauthenticated, spam risk)
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many submissions. Please try again in 15 minutes." },
});

// Inquiry form: no rate limit (protected by JWT auth)

// ── Static files (your HTML/CSS/JS frontend) ──────────────
// Point this at the folder that contains your contact.html etc.
// Serve HTML/CSS/JS frontend from the project root
app.use(express.static(path.join(__dirname)));

// ── API routes ────────────────────────────────────────────
app.use("/api/contact",   contactLimiter, contactRouter);
app.use("/api/inquiries", inquiryRouter);
app.use("/api/cars",      carsRouter);
app.use("/api/auth",      authRouter);
app.use("/api/admin",     adminRouter);
app.use("/api/account",   accountRouter);

// ── Health check ──────────────────────────────────────────
app.get("/health", async (_req, res) => {
  try {
    const dbTime = await testConnection();
    res.json({ status: "ok", db: "connected", serverTime: dbTime });
  } catch (err) {
    res.status(503).json({ status: "degraded", db: "unreachable", error: err.message });
  }
});

// ── 404 handler ───────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ success: false, message: "Not found." }));

// ── Global error handler ──────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, message: "Internal server error." });
});

// ── Start ─────────────────────────────────────────────────
async function start() {
  // DB connectivity check
  try {
    const dbTime = await testConnection();
    console.log("✅  Database connected —", dbTime);
  } catch (err) {
    console.error("❌  Database connection failed:", err.message);
    console.error("    Check your DATABASE_URL / DB_* env vars and that PostgreSQL is running.");
    process.exit(1);
  }

  // SMTP check (non-fatal — emails just won't send if misconfigured)
  await verifyConnection();

  app.listen(PORT, () => {
    console.log(`🚀  APEX MOTORS API running → http://localhost:${PORT}`);
    console.log(`    Health check: http://localhost:${PORT}/health`);
  });
}

start();
