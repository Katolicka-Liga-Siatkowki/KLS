CREATE TABLE IF NOT EXISTS contact_limits (bucket TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS contact_limits_expiry ON contact_limits(expires_at);
