// mailer.js — Nodemailer transporter + email helpers
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ── Verify connection on startup ──────────────────────────
async function verifyConnection() {
  try {
    await transporter.verify();
    console.log("✅  SMTP connection verified");
  } catch (err) {
    console.warn("⚠️   SMTP not configured — emails will be skipped:", err.message);
  }
}

// ── Notification email to APEX staff ─────────────────────
async function sendAdminNotification(data) {
  const subjectMap = {
    inventory:    "Inventory Inquiry",
    services:     "Services Information",
    appointment:  "Book Appointment",
    testdrive:    "Test Drive",
    financing:    "Financing Options",
    other:        "Other",
  };

  const readableSubject = subjectMap[data.subject] || data.subject;

  await transporter.sendMail({
    from: `"APEX MOTORS Contact Form" <${process.env.SMTP_USER}>`,
    to: process.env.CONTACT_RECIPIENT,
    replyTo: data.email,
    subject: `[APEX MOTORS] New Inquiry: ${readableSubject} — ${data.firstName} ${data.lastName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
        <div style="background:#0a0a0a;padding:24px 32px;border-bottom:2px solid #c9a84c;">
          <h1 style="margin:0;color:#c9a84c;font-size:22px;letter-spacing:3px;">APEX<span style="color:#fff;">.</span>MOTORS</h1>
          <p style="margin:4px 0 0;color:#888;font-size:13px;">New Contact Form Submission</p>
        </div>

        <div style="padding:32px;background:#f9f9f9;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:8px 12px;font-weight:bold;width:140px;color:#555;">Name</td>
                <td style="padding:8px 12px;">${data.firstName} ${data.lastName}</td></tr>
            <tr style="background:#fff;"><td style="padding:8px 12px;font-weight:bold;color:#555;">Email</td>
                <td style="padding:8px 12px;"><a href="mailto:${data.email}" style="color:#c9a84c;">${data.email}</a></td></tr>
            <tr><td style="padding:8px 12px;font-weight:bold;color:#555;">Phone</td>
                <td style="padding:8px 12px;">${data.phone || "—"}</td></tr>
            <tr style="background:#fff;"><td style="padding:8px 12px;font-weight:bold;color:#555;">Subject</td>
                <td style="padding:8px 12px;">${readableSubject}</td></tr>
          </table>

          <div style="margin-top:24px;padding:20px;background:#fff;border-left:3px solid #c9a84c;border-radius:2px;">
            <p style="margin:0 0 8px;font-weight:bold;color:#555;font-size:13px;">MESSAGE</p>
            <p style="margin:0;line-height:1.7;white-space:pre-wrap;">${data.message}</p>
          </div>

          <p style="margin-top:24px;font-size:12px;color:#999;">
            Submitted at ${new Date().toLocaleString("en-EG", { timeZone: "Africa/Cairo" })} (Cairo time) · ID #${data.id}
          </p>
        </div>
      </div>
    `,
  });
}

// ── Auto-reply to the customer ────────────────────────────
async function sendCustomerAutoReply(data) {
  await transporter.sendMail({
    from: `"APEX MOTORS" <${process.env.SMTP_USER}>`,
    to: data.email,
    subject: "We received your message — APEX MOTORS",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
        <div style="background:#0a0a0a;padding:24px 32px;border-bottom:2px solid #c9a84c;">
          <h1 style="margin:0;color:#c9a84c;font-size:22px;letter-spacing:3px;">APEX<span style="color:#fff;">.</span>MOTORS</h1>
        </div>

        <div style="padding:32px;">
          <p style="font-size:16px;">Dear ${data.firstName},</p>
          <p style="line-height:1.7;color:#444;">
            Thank you for reaching out to <strong>APEX MOTORS</strong>. We have received your message 
            and a member of our team will get back to you within <strong>24 business hours</strong>.
          </p>
          <p style="line-height:1.7;color:#444;">
            In the meantime, feel free to call us directly at
            <a href="tel:+0201025899677" style="color:#c9a84c;">020 1025 899677</a> or visit our 
            showroom in New Cairo.
          </p>

          <div style="margin:28px 0;padding:20px;background:#f9f9f9;border-radius:4px;font-size:13px;color:#555;">
            <strong>Your submission summary</strong><br/><br/>
            Subject: ${data.subject}<br/>
            Reference ID: #${data.id}
          </div>

          <p style="line-height:1.7;color:#444;">We look forward to serving you.</p>
          <p style="color:#c9a84c;font-weight:bold;">— The APEX MOTORS Team</p>
        </div>

        <div style="padding:16px 32px;background:#f0f0f0;font-size:11px;color:#999;text-align:center;">
          New Cairo Industrial Area, Egypt &nbsp;·&nbsp; 
          <a href="mailto:info@apexmotors.com" style="color:#999;">info@apexmotors.com</a>
        </div>
      </div>
    `,
  });
}

// ── Car inquiry notification to APEX staff ────────────────
async function sendInquiryNotification(data) {
  const priceLabel = data.price ? `$${Number(data.price).toLocaleString()}` : "Not listed";

  await transporter.sendMail({
    from: `"APEX MOTORS Inquiries" <${process.env.SMTP_USER}>`,
    to: process.env.CONTACT_RECIPIENT,
    replyTo: data.email,
    subject: `[APEX MOTORS] New Car Inquiry #${data.id} — ${data.vehicle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
        <div style="background:#0a0a0a;padding:24px 32px;border-bottom:2px solid #c9a84c;">
          <h1 style="margin:0;color:#c9a84c;font-size:22px;letter-spacing:3px;">APEX<span style="color:#fff;">.</span>MOTORS</h1>
          <p style="margin:4px 0 0;color:#888;font-size:13px;">New Vehicle Inquiry</p>
        </div>

        <div style="padding:32px;background:#f9f9f9;">
          <h2 style="margin:0 0 20px;font-size:18px;color:#333;">Vehicle Requested</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:8px 12px;font-weight:bold;width:140px;color:#555;">Vehicle</td>
                <td style="padding:8px 12px;font-weight:bold;color:#c9a84c;">${data.vehicle}</td></tr>
            <tr style="background:#fff;"><td style="padding:8px 12px;font-weight:bold;color:#555;">Price</td>
                <td style="padding:8px 12px;">${priceLabel}</td></tr>
            <tr><td style="padding:8px 12px;font-weight:bold;color:#555;">Customer</td>
                <td style="padding:8px 12px;">${data.name}</td></tr>
            <tr style="background:#fff;"><td style="padding:8px 12px;font-weight:bold;color:#555;">Email</td>
                <td style="padding:8px 12px;"><a href="mailto:${data.email}" style="color:#c9a84c;">${data.email}</a></td></tr>
            <tr><td style="padding:8px 12px;font-weight:bold;color:#555;">Phone</td>
                <td style="padding:8px 12px;">${data.phone || "—"}</td></tr>
          </table>

          <div style="margin-top:24px;padding:20px;background:#fff;border-left:3px solid #c9a84c;border-radius:2px;">
            <p style="margin:0 0 8px;font-weight:bold;color:#555;font-size:13px;">CUSTOMER MESSAGE</p>
            <p style="margin:0;line-height:1.7;white-space:pre-wrap;">${data.message || "No message provided."}</p>
          </div>

          <p style="margin-top:24px;font-size:12px;color:#999;">
            Submitted at ${new Date(data.submittedAt).toLocaleString("en-EG", { timeZone: "Africa/Cairo" })} (Cairo time) · Inquiry #${data.id}
          </p>
        </div>
      </div>
    `,
  });
}

module.exports = { verifyConnection, sendAdminNotification, sendCustomerAutoReply, sendInquiryNotification };
