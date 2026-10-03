CREATE TABLE `catalog_products` (
	`id` varchar(80) NOT NULL,
	`name` varchar(240) NOT NULL,
	`price` int NOT NULL,
	`fabric` varchar(120) NOT NULL,
	`color` varchar(120) NOT NULL,
	`category` varchar(120) NOT NULL,
	`image` text NOT NULL,
	`sizes` json NOT NULL,
	`description` text NOT NULL,
	`badge` varchar(120),
	`inStock` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `catalog_products_id` PRIMARY KEY(`id`)
);
