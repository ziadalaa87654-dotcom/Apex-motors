-- APEX MOTORS — contact_messages table
-- Run this once in pgAdmin to create the table before starting the server.

CREATE TABLE IF NOT EXISTS contact_messages (
  id           SERIAL       PRIMARY KEY,
  first_name   VARCHAR(100) NOT NULL,
  last_name    VARCHAR(100),
  email        VARCHAR(255) NOT NULL,
  phone        VARCHAR(30),
  subject      VARCHAR(50),
  message      TEXT         NOT NULL,
  status       VARCHAR(20)  NOT NULL DEFAULT 'new',  -- new | read | resolved
  submitted_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index for common admin queries
CREATE INDEX IF NOT EXISTS idx_contact_messages_status       ON contact_messages (status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_submitted_at ON contact_messages (submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_email        ON contact_messages (email);
