ALTER TABLE `participant_forms` ADD `isCommander` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `participant_forms` ADD `rank` varchar(100);--> statement-breakpoint
ALTER TABLE `participant_forms` ADD `branch` varchar(100);--> statement-breakpoint
ALTER TABLE `participant_forms` ADD `yearsOfService` varchar(50);--> statement-breakpoint
ALTER TABLE `participant_forms` ADD `attendees` json;
