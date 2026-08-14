CREATE TABLE `oauth_states` (
	`state` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `youtube_auth` (
	`user_id` text PRIMARY KEY NOT NULL,
	`refresh_token_encrypted` text NOT NULL,
	`iv` text NOT NULL,
	`channel_name` text,
	`channel_id` text,
	`updated_at` text NOT NULL
);
