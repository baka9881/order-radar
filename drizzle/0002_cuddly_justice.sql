ALTER TABLE `orders` ADD `return_mode` text DEFAULT 'local' NOT NULL;
--> statement-breakpoint
UPDATE `orders` SET `return_mode` = 'hotspot' WHERE `return_risk` = 1;
