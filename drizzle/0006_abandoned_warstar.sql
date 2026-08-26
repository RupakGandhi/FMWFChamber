ALTER TABLE `applications` ADD COLUMN `participantAccessToken` varchar(64) NULL;--> statement-breakpoint
UPDATE `applications`
SET `participantAccessToken` = REPLACE(UUID(), '-', '')
WHERE `participantAccessToken` IS NULL OR `participantAccessToken` = '';--> statement-breakpoint
ALTER TABLE `applications` MODIFY COLUMN `participantAccessToken` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `applications` ADD CONSTRAINT `applications_participantAccessToken_unique` UNIQUE(`participantAccessToken`);
