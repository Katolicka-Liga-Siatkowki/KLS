CREATE TABLE `tournament` (
	`id` integer PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`owner` text NOT NULL,
	`state` text NOT NULL
);
