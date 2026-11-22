require('dotenv').config();
const pool = require('./db');

async function insert() {
  try {
    const { rows } = await pool.query(
      `INSERT INTO contact_messages
         (first_name, last_name, email, phone, subject, message, status, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id, submitted_at`,
      ["John", "Doe", "test@test.com", "123", "inventory", "1234567890", "new"]
    );
    console.log("Insert success!", rows);
  } catch(e) {
    console.log("Insert Error:", e.message);
  } finally {
    pool.end();
  }
}
insert();
