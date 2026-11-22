// ─── APEX MOTORS — About Routes ───────────────────────────────────────────────

const { Router } = require("express");
const { randomUUID } = require("crypto");
const { timeline, stories, philosophy, expertise, milestones } = require("../data/about.data");
const { validateInquiry } = require("../utils/validation");

const router = Router();

// Wrap response in standard envelope
function ok(res, data, statusCode = 200) {
  res.status(statusCode).json({ data, timestamp: new Date().toISOString() });
}

// GET /api/about — all sections in one shot
router.get("/", (req, res) => {
  ok(res, {
    timeline:   [...timeline].sort((a, b) => a.order - b.order),
    stories:    [...stories].sort((a, b) => a.order - b.order),
    philosophy: [...philosophy].sort((a, b) => a.order - b.order),
    expertise:  [...expertise].sort((a, b) => a.order - b.order),
    milestones: [...milestones].sort((a, b) => a.order - b.order),
  });
});

// GET /api/about/timeline
router.get("/timeline", (req, res) => {
  ok(res, [...timeline].sort((a, b) => a.order - b.order));
});

// GET /api/about/timeline/:id
router.get("/timeline/:id", (req, res) => {
  const event = timeline.find((e) => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: "Timeline event not found.", statusCode: 404 });
  ok(res, event);
});

// GET /api/about/stories
router.get("/stories", (req, res) => {
  ok(res, [...stories].sort((a, b) => a.order - b.order));
});

// GET /api/about/philosophy
router.get("/philosophy", (req, res) => {
  ok(res, [...philosophy].sort((a, b) => a.order - b.order));
});

// GET /api/about/expertise
router.get("/expertise", (req, res) => {
  ok(res, [...expertise].sort((a, b) => a.order - b.order));
});

// GET /api/about/milestones
router.get("/milestones", (req, res) => {
  ok(res, [...milestones].sort((a, b) => a.order - b.order));
});

// POST /api/about/inquiry
router.post("/inquiry", (req, res) => {
  const result = validateInquiry(req.body);

  if (!result.valid) {
    return res.status(400).json({ error: result.error, statusCode: 400 });
  }

  console.log("[APEX] New inquiry:", result.data);

  // TODO: save to DB / send email here

  ok(res, {
    success: true,
    referenceId: randomUUID(),
    message: `Thank you, ${result.data.name}. A member of our team will be in touch within 24 hours.`,
  }, 201);
});

module.exports = router;
