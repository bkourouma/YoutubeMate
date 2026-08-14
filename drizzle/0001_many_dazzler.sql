CREATE TABLE `integration_settings` (
	`user_id` text NOT NULL,
	`service` text NOT NULL,
	`encrypted_value` text NOT NULL,
	`iv` text NOT NULL,
	`last4` text,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `service`)
);
