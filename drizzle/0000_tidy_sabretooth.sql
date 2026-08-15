CREATE TABLE `feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`email` text,
	`category` text NOT NULL,
	`message` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_feedback_created` ON `feedback` (`created_at`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	`amount` real NOT NULL,
	`distance` real NOT NULL,
	`minutes` real NOT NULL,
	`extra_wait` real DEFAULT 0 NOT NULL,
	`return_risk` integer DEFAULT false NOT NULL,
	`signal` text NOT NULL,
	`full_hourly` real NOT NULL,
	`per_km` real NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_orders_user_created` ON `orders` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`plan` text DEFAULT 'free' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
