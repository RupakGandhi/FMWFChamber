CREATE TABLE `application_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationId` int NOT NULL,
	`programId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`fileType` varchar(100) NOT NULL,
	`fileSize` int NOT NULL,
	`fileUrl` varchar(1000) NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `application_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviewer_reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reviewerId` int NOT NULL,
	`programId` int NOT NULL,
	`assignmentId` int NOT NULL,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`reminderType` enum('first','second','final') NOT NULL DEFAULT 'first',
	CONSTRAINT `reviewer_reminders_id` PRIMARY KEY(`id`)
);
