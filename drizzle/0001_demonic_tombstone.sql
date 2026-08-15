CREATE TABLE `market_contributions` (
	`receipt_id` text PRIMARY KEY NOT NULL,
	`consent_version` text NOT NULL,
	`observed_hour` text NOT NULL,
	`amount_band` integer NOT NULL,
	`distance_band` real NOT NULL,
	`duration_band` integer NOT NULL,
	`wait_band` integer NOT NULL,
	`signal` text NOT NULL,
	`area_lat` real,
	`area_lng` real,
	`submitted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_market_area_hour` ON `market_contributions` (`area_lat`,`area_lng`,`observed_hour`);--> statement-breakpoint
CREATE INDEX `idx_market_expires` ON `market_contributions` (`expires_at`);