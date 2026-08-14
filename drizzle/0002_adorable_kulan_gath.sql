CREATE TABLE `ai_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ai_cache_user_created` ON `ai_cache` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `shorts_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`stage` integer DEFAULT 1 NOT NULL,
	`state_payload` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_shorts_projects_user_updated` ON `shorts_projects` (`user_id`,`updated_at`);