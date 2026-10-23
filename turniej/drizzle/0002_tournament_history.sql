CREATE TABLE tournament_history (
 id TEXT PRIMARY KEY NOT NULL,
 owner TEXT NOT NULL,
 source_revision INTEGER NOT NULL,
 created_at TEXT NOT NULL,
 state TEXT NOT NULL,
 UNIQUE(owner, source_revision)
);
CREATE INDEX tournament_history_owner_date ON tournament_history(owner, created_at);
