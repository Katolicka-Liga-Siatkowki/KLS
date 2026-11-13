CREATE TABLE tournament_event (id INTEGER PRIMARY KEY CHECK(id=1), event_id TEXT NOT NULL);
INSERT INTO tournament_event (id,event_id) VALUES (1,lower(hex(randomblob(16))));
ALTER TABLE tournament_history ADD COLUMN event_id TEXT;
CREATE TABLE event_registrations (
 id TEXT PRIMARY KEY, event_id TEXT NOT NULL, team_name TEXT NOT NULL, team_key TEXT NOT NULL,
 email TEXT NOT NULL, phone TEXT NOT NULL, file_name TEXT NOT NULL, file_type TEXT NOT NULL,
 file_data BLOB NOT NULL, file_size INTEGER NOT NULL, token_hash TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected')),
 created_at TEXT NOT NULL, UNIQUE(event_id,team_key)
);
CREATE INDEX event_registration_event ON event_registrations(event_id,created_at);
CREATE TABLE event_pledges (
 event_id TEXT NOT NULL, item_id TEXT NOT NULL, owner_id TEXT NOT NULL, team_name TEXT NOT NULL,
 quantity INTEGER NOT NULL CHECK(quantity>0), delivered INTEGER NOT NULL DEFAULT 0 CHECK(delivered IN (0,1)),
 PRIMARY KEY(event_id,item_id,owner_id)
);
CREATE TABLE event_request_limits (id TEXT PRIMARY KEY, started_at INTEGER NOT NULL, attempts INTEGER NOT NULL);
