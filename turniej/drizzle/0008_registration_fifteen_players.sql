ALTER TABLE event_registrations RENAME COLUMN player_count TO previous_player_count;
ALTER TABLE event_registrations ADD COLUMN player_count INTEGER NOT NULL DEFAULT 8 CHECK(player_count BETWEEN 8 AND 15);
UPDATE event_registrations SET player_count=previous_player_count;
ALTER TABLE event_registrations DROP COLUMN previous_player_count;
