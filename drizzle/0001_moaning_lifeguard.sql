CREATE TABLE `applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`programId` int NOT NULL,
	`applicationNumber` varchar(50) NOT NULL,
	`status` enum('submitted','under_review','interview','accepted','rejected','waitlist') NOT NULL DEFAULT 'submitted',
	`phase` int NOT NULL DEFAULT 1,
	`formData` json,
	`applicantName` varchar(255),
	`applicantEmail` varchar(320),
	`applicantPhone` varchar(50),
	`organizationName` varchar(255),
	`averageScore` decimal(5,2),
	`totalScore` decimal(8,2),
	`reviewCount` int DEFAULT 0,
	`rank` int,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `applications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`recipientName` varchar(255),
	`emailType` enum('application_confirmation','reviewer_assignment','status_update','reminder') NOT NULL,
	`subject` varchar(500),
	`programId` int,
	`applicationId` int,
	`reviewerId` int,
	`status` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `programs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`description` text,
	`programType` enum('leadership','awards','registration') NOT NULL,
	`status` enum('draft','open','closed','archived') NOT NULL DEFAULT 'draft',
	`startDate` timestamp,
	`endDate` timestamp,
	`year` int NOT NULL,
	`formConfig` json,
	`scoringConfig` json,
	`emailConfig` json,
	`settings` json,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `programs_id` PRIMARY KEY(`id`),
	CONSTRAINT `programs_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `reviewer_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reviewerId` int NOT NULL,
	`applicationId` int NOT NULL,
	`programId` int NOT NULL,
	`status` enum('pending','in_progress','completed') NOT NULL DEFAULT 'pending',
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `reviewer_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviewers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`accessToken` varchar(64) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastAccessedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviewers_id` PRIMARY KEY(`id`),
	CONSTRAINT `reviewers_accessToken_unique` UNIQUE(`accessToken`)
);
--> statement-breakpoint
CREATE TABLE `scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationId` int NOT NULL,
	`reviewerId` int NOT NULL,
	`programId` int NOT NULL,
	`criteriaScores` json,
	`totalScore` decimal(8,2),
	`comments` text,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scores_id` PRIMARY KEY(`id`)
);
