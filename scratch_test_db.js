require('dotenv').config();
const pool = require('./db');

async function check() {
  try {
    const { rows } = await pool.query("SELECT * FROM contact_messages");
    console.log("Success! Columns:", Object.keys(rows[0] || {}).length ? Object.keys(rows[0]) : "No rows yet");
  } catch(e) {
    console.log("Query Error:", e.message);
  } finally {
    pool.end();
  }
}
check();
