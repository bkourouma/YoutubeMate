CREATE TABLE `usage_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`project_id` text DEFAULT '' NOT NULL,
	`project_title` text DEFAULT '' NOT NULL,
	`pipeline` text NOT NULL,
	`action` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`cost_usd` real DEFAULT 0 NOT NULL,
	`prompt_tokens` integer DEFAULT 0 NOT NULL,
	`completion_tokens` integer DEFAULT 0 NOT NULL,
	`reasoning_tokens` integer DEFAULT 0 NOT NULL,
	`cached_tokens` integer DEFAULT 0 NOT NULL,
	`images` integer DEFAULT 0 NOT NULL,
	`cache_hit` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_usage_user_created` ON `usage_events` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_usage_user_project` ON `usage_events` (`user_id`,`project_id`);