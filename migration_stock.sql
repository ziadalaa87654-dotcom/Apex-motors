-- ─── APEX MOTORS — Stock Migration ──────────────────────────────────────────
-- Run this on your EXISTING database (after schema.sql was already applied).
-- Usage:  psql -U postgres -d apex_motors -f migration_stock.sql
-- Safe to re-run — uses IF NOT EXISTS / ON CONFLICT.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add columns (IF NOT EXISTS = safe to re-run)
ALTER TABLE cars
    ADD COLUMN IF NOT EXISTS stock  INTEGER     NOT NULL DEFAULT 1 CHECK (stock >= 0),
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'available'
        CHECK (status IN ('available', 'sold', 'reserved', 'hidden'));

-- 2. Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_cars_status ON cars (status);
CREATE INDEX IF NOT EXISTS idx_cars_stock  ON cars (stock);

-- 3. Set initial stock values
--    All cars default to stock=1, status='available' from column defaults above.
--    Override specifics below:

-- Multi-unit cars (2 in stock)
UPDATE cars SET stock = 2
WHERE id IN (1, 3, 7, 9, 13, 14, 19, 22, 24, 31, 33, 36, 39, 42, 45, 48, 50, 56);

-- Sold out (demo the feature)
UPDATE cars SET stock = 0, status = 'sold'
WHERE id IN (5, 11, 30, 54);

-- Reserved (demo the feature)
UPDATE cars SET stock = 1, status = 'reserved'
WHERE id IN (38);

DO $$
BEGIN
    RAISE NOTICE 'Stock migration complete. % cars updated.', (SELECT COUNT(*) FROM cars);
    RAISE NOTICE 'Available: %, Reserved: %, Sold: %',
        (SELECT COUNT(*) FROM cars WHERE status = 'available'),
        (SELECT COUNT(*) FROM cars WHERE status = 'reserved'),
        (SELECT COUNT(*) FROM cars WHERE status = 'sold');
END $$;
