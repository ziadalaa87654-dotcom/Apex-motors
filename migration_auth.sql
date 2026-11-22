-- ─── APEX MOTORS — Auth Migration ───────────────────────────────────────────
-- Run after schema.sql + migration_stock.sql on an EXISTING database.
-- Usage: paste into pgAdmin Query Tool and run.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(200)  NOT NULL,
    email         VARCHAR(255)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    role          VARCHAR(20)   NOT NULL DEFAULT 'customer'
                      CHECK (role IN ('admin', 'customer')),
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users (role);

-- 2. Link inquiries to registered users (nullable — guests can still inquire)
ALTER TABLE car_inquiries
    ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inquiries_user_id ON car_inquiries (user_id);

DO $$
BEGIN
    RAISE NOTICE 'Auth migration complete. Tables: users. Columns: car_inquiries.user_id.';
END $$;
