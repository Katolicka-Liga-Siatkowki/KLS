ALTER TABLE event_registrations ADD COLUMN parish_name TEXT NOT NULL DEFAULT '';
ALTER TABLE event_registrations ADD COLUMN brings_supporters INTEGER NOT NULL DEFAULT 0 CHECK(brings_supporters IN (0,1));
ALTER TABLE event_registrations ADD COLUMN player_count INTEGER NOT NULL DEFAULT 8 CHECK(player_count BETWEEN 8 AND 12);
ALTER TABLE event_registrations ADD COLUMN rules_accepted INTEGER NOT NULL DEFAULT 0 CHECK(rules_accepted IN (0,1));
