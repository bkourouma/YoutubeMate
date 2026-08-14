CREATE TABLE `descript_jobs` (
	`user_id` text NOT NULL,
	`key` text NOT NULL,
	`project_id` text NOT NULL,
	`job_id` text NOT NULL,
	`job_state` text NOT NULL,
	`model` text,
	`usage_payload` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `key`)
);
