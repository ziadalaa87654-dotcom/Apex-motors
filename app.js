// ─── APEX MOTORS — Express App ────────────────────────────────────────────────

const express = require("express");
const aboutRouter = require("./routes/about.routes");

const app = express();

// Middleware
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "apex-motors-api", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/about", aboutRouter);

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Route not found.", statusCode: 404 });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("[APEX] Error:", err);
  res.status(500).json({ error: "Internal server error.", statusCode: 500 });
});

module.exports = app;
