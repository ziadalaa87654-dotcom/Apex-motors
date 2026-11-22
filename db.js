// db.js — PostgreSQL connection pool
const { Pool } = require("pg");

let poolConfig;

if (process.env.DATABASE_URL) {
    // Cloud DB / full connection string
    poolConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes("localhost") ?
            false :
            { rejectUnauthorized: false }, // needed for Supabase, Neon, Railway, etc.
    };
} else {
    // Individual env vars
    poolConfig = {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || "apex_motors",
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASS || "",
    };
}

const pool = new Pool({
    ...poolConfig,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
    console.error("⚠️  Unexpected DB pool error:", err.message);
});

// Quick connectivity test exported for startup check
async function testConnection() {
    const client = await pool.connect();
    const { rows } = await client.query("SELECT NOW() AS now");
    client.release();
    return rows[0].now;
}

module.exports = pool;
module.exports.testConnection = testConnection;