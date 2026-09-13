CREATE TABLE `site_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label` text NOT NULL,
	`url` text NOT NULL,
	`location` text DEFAULT 'footer' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`visible` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_site_links_location_order` ON `site_links` (`location`,`sort_order`);--> statement-breakpoint
CREATE TABLE `site_sections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`section_key` text NOT NULL,
	`kind` text DEFAULT 'custom' NOT NULL,
	`nav_label` text NOT NULL,
	`eyebrow` text DEFAULT '' NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`layout` text DEFAULT 'standard' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`visible` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_site_sections_key` ON `site_sections` (`section_key`);--> statement-breakpoint
CREATE INDEX `idx_site_sections_order_visible` ON `site_sections` (`sort_order`,`visible`);