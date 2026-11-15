ALTER TABLE event_registrations ADD COLUMN captain_token TEXT;
ALTER TABLE event_registrations ADD COLUMN captain_message_id TEXT;
ALTER TABLE event_registrations ADD COLUMN captain_mail_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE event_registrations ADD COLUMN captain_mail_sent_at TEXT;
