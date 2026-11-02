CREATE TABLE tournament_referee_credentials (
 id INTEGER PRIMARY KEY CHECK(id=1),
 password_hash TEXT NOT NULL,
 version TEXT NOT NULL
);
