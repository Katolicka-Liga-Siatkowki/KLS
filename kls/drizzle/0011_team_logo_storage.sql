CREATE TABLE IF NOT EXISTS team_logo_chunks (
  league INTEGER NOT NULL,
  team_key TEXT NOT NULL,
  part INTEGER NOT NULL,
  content BLOB NOT NULL,
  PRIMARY KEY (league, team_key, part),
  FOREIGN KEY (league, team_key) REFERENCES team_logos(league, team_key) ON DELETE CASCADE
);
