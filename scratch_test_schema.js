require('dotenv').config();
const pool = require('./db');

async function checkSchema() {
  try {
    const { rows } = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'contact_messages';
    `);
    console.log(rows);
  } catch(e) {
    console.log("Error:", e.message);
  } finally {
    pool.end();
  }
}
checkSchema();
