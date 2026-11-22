-- ─── APEX MOTORS — Complete Database Schema ──────────────────────────────────
-- Run once on a fresh database to set up all tables.
-- Usage:  psql -U <user> -d apex_motors -f schema.sql
--
-- Tables (in dependency order):
--   1. cars            — Vehicle inventory
--   2. users           — Customer & admin accounts
--   3. contact_messages — Contact form submissions
--   4. car_inquiries   — Vehicle inquiry submissions (links to cars + users)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Helper: auto-update updated_at ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE 1 — cars
--   Stores the vehicle inventory.
--   Populated by seed_cars.sql after this schema is applied.
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cars (
    id          SERIAL PRIMARY KEY,
    year        SMALLINT      NOT NULL CHECK (year >= 1900 AND year <= 2100),
    make        VARCHAR(100)  NOT NULL,
    model       VARCHAR(150)  NOT NULL,
    price       INTEGER       NOT NULL CHECK (price >= 0),
    mileage     INTEGER       NOT NULL DEFAULT 0 CHECK (mileage >= 0),
    hp          VARCHAR(30),                         -- e.g. "503 hp"
    engine      VARCHAR(80),                         -- e.g. "4.0L V8"
    category    TEXT[]        NOT NULL DEFAULT '{}', -- e.g. {sedan,luxury,new}
    badge       VARCHAR(20)   CHECK (badge IN ('new', 'certified', 'sale') OR badge IS NULL),
    featured    BOOLEAN       NOT NULL DEFAULT FALSE,
    stock       INTEGER       NOT NULL DEFAULT 1 CHECK (stock >= 0),
    status      VARCHAR(20)   NOT NULL DEFAULT 'available'
                    CHECK (status IN ('available', 'sold', 'reserved', 'hidden')),
    img         TEXT,                                -- URL or base64 data URI
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS cars_updated_at ON cars;
CREATE TRIGGER cars_updated_at
    BEFORE UPDATE ON cars
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_cars_featured  ON cars (featured DESC);
CREATE INDEX IF NOT EXISTS idx_cars_price     ON cars (price);
CREATE INDEX IF NOT EXISTS idx_cars_year      ON cars (year DESC);
CREATE INDEX IF NOT EXISTS idx_cars_badge     ON cars (badge);
CREATE INDEX IF NOT EXISTS idx_cars_status    ON cars (status);
CREATE INDEX IF NOT EXISTS idx_cars_category  ON cars USING GIN (category);


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE 2 — users
--   Customer and admin accounts.
--   role: 'customer' (default) or 'admin'
-- ═══════════════════════════════════════════════════════════════════════════════
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


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE 3 — contact_messages
--   Stores submissions from the Contact Us page.
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS contact_messages (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(200)  NOT NULL,            -- full name (combined)
    first_name    VARCHAR(100),
    last_name     VARCHAR(100),
    email         VARCHAR(255)  NOT NULL,
    phone         VARCHAR(30),
    subject       VARCHAR(50),
    message       TEXT          NOT NULL,
    status        VARCHAR(20)   NOT NULL DEFAULT 'new'
                      CHECK (status IN ('new', 'read', 'resolved')),
    submitted_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS contact_messages_updated_at ON contact_messages;
CREATE TRIGGER contact_messages_updated_at
    BEFORE UPDATE ON contact_messages
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_contact_messages_email     ON contact_messages (email);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status    ON contact_messages (status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_submitted ON contact_messages (submitted_at DESC);


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE 4 — car_inquiries
--   Stores "Inquire Now" submissions from the Inventory page.
--   car_id  → nullable so inquiry survives if the car is deleted.
--   user_id → nullable so guests (if re-enabled) can still submit.
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS car_inquiries (
    id              SERIAL PRIMARY KEY,
    car_id          INTEGER       REFERENCES cars(id)  ON DELETE SET NULL,
    user_id         INTEGER       REFERENCES users(id) ON DELETE SET NULL,
    vehicle_name    VARCHAR(200)  NOT NULL,            -- snapshot of car name at inquiry time
    vehicle_price   INTEGER,                           -- snapshot of price at inquiry time
    customer_name   VARCHAR(200)  NOT NULL,
    email           VARCHAR(255)  NOT NULL,
    phone           VARCHAR(30),
    message         TEXT          NOT NULL DEFAULT '',
    status          VARCHAR(20)   NOT NULL DEFAULT 'new'
                        CHECK (status IN ('new', 'contacted', 'closed')),
    submitted_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS car_inquiries_updated_at ON car_inquiries;
CREATE TRIGGER car_inquiries_updated_at
    BEFORE UPDATE ON car_inquiries
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_car_inquiries_car_id    ON car_inquiries (car_id);
CREATE INDEX IF NOT EXISTS idx_car_inquiries_user_id   ON car_inquiries (user_id);
CREATE INDEX IF NOT EXISTS idx_car_inquiries_email     ON car_inquiries (email);
CREATE INDEX IF NOT EXISTS idx_car_inquiries_status    ON car_inquiries (status);
CREATE INDEX IF NOT EXISTS idx_car_inquiries_submitted ON car_inquiries (submitted_at DESC);


-- ── Done ──────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    RAISE NOTICE 'APEX MOTORS schema ready.';
    RAISE NOTICE 'Tables: cars, users, contact_messages, car_inquiries';
    RAISE NOTICE 'Next step: run seed_cars.sql to populate the inventory.';
END $$;
