CREATE TABLE `interviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationId` int NOT NULL,
	`programId` int NOT NULL,
	`scheduledBy` int NOT NULL,
	`scheduledAt` timestamp NOT NULL,
	`duration` int NOT NULL DEFAULT 30,
	`location` varchar(500),
	`meetingLink` varchar(500),
	`notes` text,
	`status` enum('scheduled','completed','cancelled','rescheduled') NOT NULL DEFAULT 'scheduled',
	`calendarEventId` varchar(255),
	`reminderSent` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `interviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `calendarSettings` json;