// ─── APEX MOTORS — Validation ─────────────────────────────────────────────────

const VALID_TYPES = ["test-drive", "acquisition", "restoration", "general"];

function validateInquiry(body) {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object." };
  }

  if (!body.name || body.name.trim().length < 2) {
    return { valid: false, error: "Field 'name' is required (min 2 chars)." };
  }

  if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return { valid: false, error: "Field 'email' must be a valid email address." };
  }

  if (!VALID_TYPES.includes(body.type)) {
    return { valid: false, error: `Field 'type' must be one of: ${VALID_TYPES.join(", ")}.` };
  }

  if (!body.message || body.message.trim().length < 10) {
    return { valid: false, error: "Field 'message' is required (min 10 chars)." };
  }

  return {
    valid: true,
    data: {
      name:    body.name.trim(),
      email:   body.email.trim().toLowerCase(),
      phone:   body.phone ? body.phone.trim() : undefined,
      type:    body.type,
      message: body.message.trim(),
    },
  };
}

module.exports = { validateInquiry };
