CREATE TABLE `player_photos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`league` integer NOT NULL,
	`team_key` text NOT NULL,
	`player_key` text NOT NULL,
	`object_key` text NOT NULL,
	`file_name` text NOT NULL,
	`content_type` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_player_photos_identity` ON `player_photos` (`league`,`team_key`,`player_key`);
