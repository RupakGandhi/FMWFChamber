CREATE TABLE `application_drafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`programId` int NOT NULL,
	`token` varchar(64) NOT NULL,
	`applicantName` varchar(255) NOT NULL,
	`applicantEmail` varchar(320) NOT NULL,
	`applicantPhone` varchar(50),
	`organizationName` varchar(255),
	`formData` json,
	`currentStep` int NOT NULL DEFAULT 0,
	`savedAt` timestamp,
	`lastResumedAt` timestamp,
	`reminderCount` int NOT NULL DEFAULT 0,
	`lastReminderAt` timestamp,
	`lastReminderStatus` enum('sent','failed'),
	`lastReminderError` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `application_drafts_id` PRIMARY KEY(`id`),
	CONSTRAINT `application_drafts_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `application_files` ADD `draftId` int;