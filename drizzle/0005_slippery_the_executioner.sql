CREATE TABLE `applicant_flags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicantEmail` varchar(320) NOT NULL,
	`applicantName` varchar(255),
	`flagType` enum('no_show','repeat_no_show','restricted','warning') NOT NULL,
	`reason` text,
	`programId` int,
	`year` int,
	`flaggedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `applicant_flags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `archives` (
	`id` int AUTO_INCREMENT NOT NULL,
	`programId` int NOT NULL,
	`programName` varchar(255) NOT NULL,
	`year` int NOT NULL,
	`data` json,
	`applicationCount` int DEFAULT 0,
	`archivedAt` timestamp NOT NULL DEFAULT (now()),
	`archivedBy` int,
	CONSTRAINT `archives_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `checkins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationId` int NOT NULL,
	`programId` int NOT NULL,
	`status` enum('approved','picked_up','no_show','no_show_communicated') NOT NULL DEFAULT 'approved',
	`checkedInAt` timestamp,
	`checkedInBy` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `checkins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `participant_forms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationId` int NOT NULL,
	`programId` int NOT NULL,
	`participantName` varchar(255) NOT NULL,
	`tshirtSize` varchar(20),
	`plusOne` boolean DEFAULT false,
	`plusOneName` varchar(255),
	`plusOneTshirtSize` varchar(20),
	`namePronunciation` varchar(500),
	`dietaryRestrictions` text,
	`specialNeeds` text,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `participant_forms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `waitlist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationId` int NOT NULL,
	`programId` int NOT NULL,
	`position` int NOT NULL,
	`status` enum('waiting','promoted','expired','declined') NOT NULL DEFAULT 'waiting',
	`promotedAt` timestamp,
	`notifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `waitlist_id` PRIMARY KEY(`id`)
);
