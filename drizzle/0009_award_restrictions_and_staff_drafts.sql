CREATE TABLE `award_wins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientName` varchar(255) NOT NULL,
	`recipientType` enum('business','individual') NOT NULL,
	`category` varchar(255) NOT NULL,
	`awardYear` int NOT NULL,
	`restrictionYears` int NOT NULL DEFAULT 5,
	`notes` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `award_wins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `staff_edit_drafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`programId` int NOT NULL,
	`scope` varchar(32) NOT NULL,
	`payload` json,
	`baseRevision` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `staff_edit_drafts_id` PRIMARY KEY(`id`),
	CONSTRAINT `staff_edit_drafts_owner_unique` UNIQUE(`userId`,`programId`,`scope`)
);
--> statement-breakpoint
ALTER TABLE `applications` ADD `eligibilityStatus` enum('not_reviewed','eligible','ineligible') DEFAULT 'not_reviewed' NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD `eligibilityReason` text;--> statement-breakpoint
ALTER TABLE `applications` ADD `eligibilityReviewedBy` int;--> statement-breakpoint
ALTER TABLE `applications` ADD `eligibilityReviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `programs` ADD `revision` int DEFAULT 0 NOT NULL;