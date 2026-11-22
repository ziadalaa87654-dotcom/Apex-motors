require('dotenv').config();
const fs = require('fs');
const pool = require('./db');

async function run() {
  try {
    const sql = fs.readFileSync('create_contact_messages.sql', 'utf8');
    await pool.query(sql);
    console.log('Successfully created contact_messages table.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}

run();
