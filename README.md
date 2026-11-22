# APEX MOTORS — Backend Setup Guide

## What's in here

```
apex-motors/
├── server.js              ← Express app entry point
├── db.js                  ← PostgreSQL connection pool
├── mailer.js              ← Nodemailer email helpers
├── validation.js          ← Inquiry validator
├── schema.sql             ← Database tables (run this once)
├── package.json
├── .env.example           ← Copy to .env and fill in your values
├── routes/
│   ├── contact.js         ← POST/GET/PATCH/DELETE /api/contact
│   └── inquiry.js         ← POST/GET /api/inquiry
└── public/
    ├── contact.html       ← Your frontend (copy your CSS here too)
    └── contact.js         ← Frontend form handler
```

---

## Step 1 — Install PostgreSQL

If you don't have PostgreSQL installed:

- **Windows**: Download from https://www.postgresql.org/download/windows/
- **Mac**: `brew install postgresql@16 && brew services start postgresql@16`
- **Ubuntu/Debian**: `sudo apt install postgresql postgresql-contrib && sudo systemctl start postgresql`

---

## Step 2 — Create the database

```bash
# Connect to PostgreSQL
psql -U postgres

# Inside psql:
CREATE DATABASE apex_motors;
CREATE USER apex_user WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE apex_motors TO apex_user;
\q
```

---

## Step 3 — Run the schema

```bash
psql -U apex_user -d apex_motors -f schema.sql
```

You should see: `APEX MOTORS schema ready. Tables: contact_messages, inquiries.`

---

## Step 4 — Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in:

```env
DATABASE_URL=postgresql://apex_user:yourpassword@localhost:5432/apex_motors
PORT=3000
CORS_ORIGINS=http://localhost:5500,http://127.0.0.1:5500

# Optional — leave blank to skip emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password      # Use a Gmail App Password, not your real password
CONTACT_RECIPIENT=info@apexmotors.com
```

> **Gmail App Password**: Go to myaccount.google.com → Security → 2-Step Verification → App passwords.

---

## Step 5 — Install dependencies and start

```bash
npm install
npm start
```

You should see:
```
✅  Database connected — 2024-...
✅  SMTP connection verified   (or a warning if SMTP is not configured)
🚀  APEX MOTORS API running → http://localhost:3000
```

---

## Step 6 — Serve your frontend

Open `public/contact.html` in a browser. The form posts to `http://localhost:3000/api/contact`.

If you're using VS Code Live Server (port 5500), make sure `http://localhost:5500` is in `CORS_ORIGINS`.

---

## API Reference

### Submit a contact message
```
POST /api/contact
Content-Type: application/json

{
  "firstName": "Ahmed",
  "lastName": "Hassan",
  "email": "ahmed@example.com",
  "phone": "01012345678",
  "subject": "testdrive",
  "message": "I'd like to test drive the Porsche 911."
}
```

Valid subjects: `inventory` | `services` | `appointment` | `testdrive` | `financing` | `other`

**Response 201:**
```json
{ "success": true, "message": "Message received...", "id": 1, "submittedAt": "..." }
```

**Response 422 (validation error):**
```json
{ "success": false, "errors": [{ "field": "email", "message": "..." }] }
```

---

### List all messages (admin)
```
GET /api/contact?status=new&limit=50&offset=0
```

### Update message status (admin)
```
PATCH /api/contact/:id/status
{ "status": "read" }         (new | read | resolved)
```

### Delete a message (admin)
```
DELETE /api/contact/:id
```

### Health check
```
GET /health
```

---

## Cloud deployment (optional)

For a free cloud PostgreSQL database, use one of:
- **Neon** (neon.tech) — free tier, serverless
- **Supabase** (supabase.com) — free tier, includes a dashboard
- **Railway** (railway.app) — easy one-click Postgres

Just set `DATABASE_URL` to the connection string they give you. The SSL config in `db.js` handles it automatically.

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `ECONNREFUSED` on DB | PostgreSQL isn't running. Start it with `brew services start postgresql` or `sudo systemctl start postgresql` |
| `relation "contact_messages" does not exist` | You didn't run `schema.sql`. Do Step 3. |
| CORS error in browser | Add your frontend URL to `CORS_ORIGINS` in `.env` |
| Emails not sending | SMTP settings wrong. The API still works — emails are non-fatal. Check Gmail App Password. |
| `Cannot find module '../db'` | You're running a file from the wrong directory. Run everything from the project root. |
