// middleware/auth.js — JWT verification middleware
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "apex-motors-change-this-secret";

/**
 * requireAuth — verifies the Bearer token in Authorization header.
 * Attaches decoded payload to req.user on success.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token  = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: "Authentication required." });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    const msg = err.name === "TokenExpiredError" ? "Session expired. Please log in again." : "Invalid token.";
    return res.status(401).json({ success: false, message: msg });
  }
}

/**
 * requireAdmin — same as requireAuth but also checks role === 'admin'.
 */
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin access required." });
    }
    next();
  });
}

/**
 * optionalAuth — attaches req.user if a valid token is present, but doesn't
 * block the request if there's no token (used for inquiry pre-fill).
 */
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token  = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (token) {
    try { req.user = jwt.verify(token, JWT_SECRET); } catch { /* ignore */ }
  }
  next();
}

module.exports = { requireAuth, requireAdmin, optionalAuth, JWT_SECRET };
