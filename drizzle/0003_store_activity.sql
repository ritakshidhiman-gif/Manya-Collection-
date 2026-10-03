CREATE TABLE `store_activity` (
	`id` varchar(36) NOT NULL,
	`visitorId` varchar(64) NOT NULL,
	`checkoutId` varchar(64),
	`eventType` varchar(32) NOT NULL,
	`path` varchar(255) NOT NULL,
	`customerName` varchar(240),
	`customerEmail` varchar(320),
	`customerPhone` varchar(32),
	`amount` int,
	`paymentId` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `store_activity_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `store_activity_visitor_idx` ON `store_activity` (`visitorId`);--> statement-breakpoint
CREATE INDEX `store_activity_checkout_idx` ON `store_activity` (`checkoutId`);--> statement-breakpoint
CREATE INDEX `store_activity_created_at_idx` ON `store_activity` (`createdAt`);