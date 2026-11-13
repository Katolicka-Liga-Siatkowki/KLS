ALTER TABLE tournament ADD COLUMN last_mutation TEXT NOT NULL DEFAULT '';
ALTER TABLE event_registrations ADD COLUMN team_id TEXT;
ALTER TABLE event_registrations ADD COLUMN withdrawn_at TEXT;
ALTER TABLE event_registrations ADD COLUMN file_chunk_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE event_registrations ADD COLUMN mail_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE event_registrations ADD COLUMN mail_sent_at TEXT;
ALTER TABLE event_registrations ADD COLUMN mail_lock TEXT;
ALTER TABLE event_registrations ADD COLUMN mail_lock_at INTEGER;
CREATE TABLE event_roster_chunks (
 registration_id TEXT NOT NULL,
 chunk_index INTEGER NOT NULL,
 data BLOB NOT NULL,
 PRIMARY KEY(registration_id,chunk_index)
);
