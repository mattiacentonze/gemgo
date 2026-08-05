CREATE TABLE `gem_suggestions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`region` text NOT NULL,
	`category` text NOT NULL,
	`map_url` text,
	`normalized_key` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gem_suggestions_normalized_key_unique` ON `gem_suggestions` (`normalized_key`);