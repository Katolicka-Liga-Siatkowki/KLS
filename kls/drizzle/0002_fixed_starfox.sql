CREATE TABLE `team_logos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`league` integer NOT NULL,
	`team_key` text NOT NULL,
	`object_key` text NOT NULL,
	`file_name` text NOT NULL,
	`content_type` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_team_logos_league_team` ON `team_logos` (`league`,`team_key`);