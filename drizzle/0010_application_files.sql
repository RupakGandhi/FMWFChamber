CREATE TABLE `application_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(64) NOT NULL,
	`programId` int NOT NULL,
	`applicationId` int,
	`fieldId` varchar(100) NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`fileSize` int NOT NULL,
	`data` mediumblob NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `application_files_id` PRIMARY KEY(`id`),
	CONSTRAINT `application_files_token_unique` UNIQUE(`token`)
);
