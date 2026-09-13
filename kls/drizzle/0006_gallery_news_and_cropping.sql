ALTER TABLE `media_assets` ADD `position_x` integer DEFAULT 50 NOT NULL;
--> statement-breakpoint
ALTER TABLE `media_assets` ADD `position_y` integer DEFAULT 50 NOT NULL;
--> statement-breakpoint
CREATE TABLE `gallery_albums` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`visible` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_gallery_albums_slug` ON `gallery_albums` (`slug`);
--> statement-breakpoint
CREATE INDEX `idx_gallery_albums_order` ON `gallery_albums` (`sort_order`);
--> statement-breakpoint
CREATE TABLE `gallery_photos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`album_id` integer,
	`match_key` text DEFAULT '' NOT NULL,
	`object_key` text NOT NULL,
	`file_name` text NOT NULL,
	`content_type` text NOT NULL,
	`caption` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`album_id`) REFERENCES `gallery_albums`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_gallery_photos_album_order` ON `gallery_photos` (`album_id`,`sort_order`);
--> statement-breakpoint
CREATE INDEX `idx_gallery_photos_match_order` ON `gallery_photos` (`match_key`,`sort_order`);
--> statement-breakpoint
CREATE TABLE `news_posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`link_label` text DEFAULT '' NOT NULL,
	`link_url` text DEFAULT '' NOT NULL,
	`published_at` text NOT NULL,
	`visible` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_news_posts_visible_date` ON `news_posts` (`visible`,`published_at`);
