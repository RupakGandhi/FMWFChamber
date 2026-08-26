import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, decimal } from "drizzle-orm/mysql-core";

// Core user table for admin authentication
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  username: varchar("username", { length: 64 }).unique(),
  passwordHash: text("passwordHash"),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  mustChangePassword: boolean("mustChangePassword").default(false).notNull(),
  failedLoginAttempts: int("failedLoginAttempts").default(0).notNull(),
  lockedUntil: timestamp("lockedUntil"),
  passwordUpdatedAt: timestamp("passwordUpdatedAt"),
  calendarSettings: json("calendarSettings").$type<CalendarSettings>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Programs table - stores different application programs (Leadership, Awards, Military Night)
export const programs = mysqlTable("programs", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  programType: mysqlEnum("programType", ["leadership", "awards", "registration"]).notNull(),
  status: mysqlEnum("status", ["draft", "open", "closed", "archived"]).default("draft").notNull(),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  year: int("year").notNull(),
  formConfig: json("formConfig").$type<FormConfig>(),
  scoringConfig: json("scoringConfig").$type<ScoringConfig>(),
  emailConfig: json("emailConfig").$type<EmailConfig>(),
  settings: json("settings").$type<ProgramSettings>(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Program = typeof programs.$inferSelect;
export type InsertProgram = typeof programs.$inferInsert;

// Applications table - stores submitted applications
export const applications = mysqlTable("applications", {
  id: int("id").autoincrement().primaryKey(),
  programId: int("programId").notNull(),
  applicationNumber: varchar("applicationNumber", { length: 50 }).notNull(),
  participantAccessToken: varchar("participantAccessToken", { length: 64 }).notNull().unique(),
  status: mysqlEnum("status", ["submitted", "under_review", "interview", "accepted", "rejected", "waitlist"]).default("submitted").notNull(),
  phase: int("phase").default(1).notNull(),
  formData: json("formData").$type<Record<string, unknown>>(),
  applicantName: varchar("applicantName", { length: 255 }),
  applicantEmail: varchar("applicantEmail", { length: 320 }),
  applicantPhone: varchar("applicantPhone", { length: 50 }),
  organizationName: varchar("organizationName", { length: 255 }),
  averageScore: decimal("averageScore", { precision: 5, scale: 2 }),
  totalScore: decimal("totalScore", { precision: 8, scale: 2 }),
  reviewCount: int("reviewCount").default(0),
  rank: int("rank"),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Application = typeof applications.$inferSelect;
export type InsertApplication = typeof applications.$inferInsert;

// Reviewers table - stores reviewer information with secure access tokens
export const reviewers = mysqlTable("reviewers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  accessToken: varchar("accessToken", { length: 64 }).notNull().unique(),
  isActive: boolean("isActive").default(true).notNull(),
  lastAccessedAt: timestamp("lastAccessedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Reviewer = typeof reviewers.$inferSelect;
export type InsertReviewer = typeof reviewers.$inferInsert;

// Reviewer assignments - links reviewers to specific applications
export const reviewerAssignments = mysqlTable("reviewer_assignments", {
  id: int("id").autoincrement().primaryKey(),
  reviewerId: int("reviewerId").notNull(),
  applicationId: int("applicationId").notNull(),
  programId: int("programId").notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "completed"]).default("pending").notNull(),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type ReviewerAssignment = typeof reviewerAssignments.$inferSelect;
export type InsertReviewerAssignment = typeof reviewerAssignments.$inferInsert;

// Scores table - stores individual reviewer scores
export const scores = mysqlTable("scores", {
  id: int("id").autoincrement().primaryKey(),
  applicationId: int("applicationId").notNull(),
  reviewerId: int("reviewerId").notNull(),
  programId: int("programId").notNull(),
  criteriaScores: json("criteriaScores").$type<CriteriaScore[]>(),
  totalScore: decimal("totalScore", { precision: 8, scale: 2 }),
  comments: text("comments"),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Score = typeof scores.$inferSelect;
export type InsertScore = typeof scores.$inferInsert;

// Email logs - tracks sent notifications
export const emailLogs = mysqlTable("email_logs", {
  id: int("id").autoincrement().primaryKey(),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  recipientName: varchar("recipientName", { length: 255 }),
  emailType: mysqlEnum("emailType", ["application_confirmation", "reviewer_assignment", "status_update", "reminder"]).notNull(),
  subject: varchar("subject", { length: 500 }),
  programId: int("programId"),
  applicationId: int("applicationId"),
  reviewerId: int("reviewerId"),
  status: mysqlEnum("status", ["pending", "sent", "failed"]).default("pending").notNull(),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = typeof emailLogs.$inferInsert;

// Type definitions for JSON fields
export interface FormField {
  id: string;
  type: "text" | "textarea" | "email" | "phone" | "select" | "radio" | "checkbox" | "number" | "date" | "file" | "section" | "heading";
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  conditionalOn?: { fieldId: string; value: string | string[] };
  validation?: { min?: number; max?: number; pattern?: string };
  helpText?: string;
  section?: string;
}

export interface FormConfig {
  fields: FormField[];
  sections?: { id: string; title: string; description?: string }[];
  submitButtonText?: string;
  confirmationMessage?: string;
}

export interface ScoringCriteria {
  id: string;
  name: string;
  description?: string;
  maxScore: number;
  weight?: number;
}

export interface ScoringConfig {
  criteria: ScoringCriteria[];
  maxTotalScore?: number;
  passingScore?: number;
  reviewersPerApplication?: number;
  minScoreForComment?: number; // Below this score, comment is mandatory
}

export interface EmailConfig {
  // Application Confirmation Email
  confirmationEnabled?: boolean;
  confirmationSubject?: string;
  confirmationBody?: string;
  // Reviewer Assignment Email
  reviewerNotificationEnabled?: boolean;
  reviewerAssignmentSubject?: string;
  reviewerAssignmentBody?: string;
  // Status Update Email
  statusUpdateEnabled?: boolean;
  statusUpdateSubject?: string;
  statusUpdateBody?: string;
  // Reviewer Reminder Email
  reviewerReminderSubject?: string;
  reviewerReminderBody?: string;
}

// Email template variables that can be used in templates
// {{applicant_name}} - Applicant's full name
// {{applicant_email}} - Applicant's email
// {{program_name}} - Name of the program
// {{application_number}} - Application confirmation number
// {{application_status}} - Current status of application
// {{reviewer_name}} - Reviewer's name
// {{reviewer_link}} - Secure link for reviewer access
// {{pending_count}} - Number of pending reviews

export interface ProgramSettings {
  allowMultipleSubmissions?: boolean;
  requireOrganization?: boolean;
  blindReview?: boolean;
  phases?: { id: number; name: string; description?: string }[];
  interviewRoundEnabled?: boolean;
  interviewCutoff?: number;
  // New toggleable features
  reviewerRemindersEnabled?: boolean;
  reminderDaysThreshold?: number; // Days before sending reminder
  documentUploadsEnabled?: boolean;
  maxDocuments?: number;
  allowedFileTypes?: string[]; // e.g., ['pdf', 'doc', 'docx']
  maxFileSizeMB?: number;
  // Phase 2: Review deadline and scoring
  reviewDeadline?: string; // ISO date string - after this date scores are locked
  reviewDeadlineEnabled?: boolean; // Toggle for review deadline
  scoreEditingEnabled?: boolean; // Allow reviewers to edit scores until deadline
  mandatoryCommentsEnabled?: boolean; // Require comments for low scores
  blindReviewEnabled?: boolean; // Hide applicant names from reviewers
  minScoreForComment?: number; // Scores below this require mandatory comment
  // Phase 2: Event/Registration features
  maxCapacity?: number; // Max attendees for registration programs
  waitlistEnabled?: boolean;
  autoWaitlistPromotionEnabled?: boolean; // Optional; keep off for manually allocated events
  checkInEnabled?: boolean; // Enable check-in/pickup tracking
  tshirtTrackingEnabled?: boolean; // Enable t-shirt inventory
  participantFormEnabled?: boolean; // Enable separate commander/participant form
  noShowTrackingEnabled?: boolean; // Enable no-show flagging
  // Phase 2: Ticket capacity management
  ticketCapacityThreshold?: number; // Notify admin when total tickets reach this number
  ticketThresholdNotificationSent?: boolean; // Track if notification was already sent
  ticketFieldId?: string; // Which form field contains the ticket count (default: 'ticket_count')
  // Phase 2: Workflow stages
  workflowStages?: { id: string; name: string; color?: string }[];
  // Application deadline (ISO date string, displayed on homepage)
  applicationDeadline?: string;
}

export interface CriteriaScore {
  criteriaId: string;
  score: number;
  comment?: string;
}

// Calendar integration settings for admin users
export interface CalendarSettings {
  provider?: "google" | "apple" | "outlook" | "ical";
  calendarUrl?: string; // For iCal/webcal URLs
  connected?: boolean;
  lastSynced?: string;
}

// Interview scheduling
export const interviews = mysqlTable("interviews", {
  id: int("id").autoincrement().primaryKey(),
  applicationId: int("applicationId").notNull(),
  programId: int("programId").notNull(),
  scheduledBy: int("scheduledBy").notNull(), // User ID of admin who scheduled
  scheduledAt: timestamp("scheduledAt").notNull(),
  duration: int("duration").default(30).notNull(), // Duration in minutes
  location: varchar("location", { length: 500 }),
  meetingLink: varchar("meetingLink", { length: 500 }),
  notes: text("notes"),
  status: mysqlEnum("status", ["scheduled", "completed", "cancelled", "rescheduled"]).default("scheduled").notNull(),
  calendarEventId: varchar("calendarEventId", { length: 255 }), // External calendar event ID
  reminderSent: boolean("reminderSent").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Interview = typeof interviews.$inferSelect;
export type InsertInterview = typeof interviews.$inferInsert;

// Document uploads for applications
export const applicationDocuments = mysqlTable("application_documents", {
  id: int("id").autoincrement().primaryKey(),
  applicationId: int("applicationId").notNull(),
  programId: int("programId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  originalName: varchar("originalName", { length: 255 }).notNull(),
  fileType: varchar("fileType", { length: 100 }).notNull(),
  fileSize: int("fileSize").notNull(), // Size in bytes
  fileUrl: varchar("fileUrl", { length: 1000 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(), // S3 key
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});

export type ApplicationDocument = typeof applicationDocuments.$inferSelect;
export type InsertApplicationDocument = typeof applicationDocuments.$inferInsert;

// Reviewer reminders tracking
export const reviewerReminders = mysqlTable("reviewer_reminders", {
  id: int("id").autoincrement().primaryKey(),
  reviewerId: int("reviewerId").notNull(),
  programId: int("programId").notNull(),
  assignmentId: int("assignmentId").notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  reminderType: mysqlEnum("reminderType", ["first", "second", "final"]).default("first").notNull(),
});

export type ReviewerReminder = typeof reviewerReminders.$inferSelect;
export type InsertReviewerReminder = typeof reviewerReminders.$inferInsert;

// Global system settings (SMTP, etc.)
export const systemSettings = mysqlTable("system_settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: json("value").$type<unknown>(),
  updatedBy: int("updatedBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;

// Archives table - stores archived program data from previous years
export const archives = mysqlTable("archives", {
  id: int("id").autoincrement().primaryKey(),
  programId: int("programId").notNull(),
  programName: varchar("programName", { length: 255 }).notNull(),
  year: int("year").notNull(),
  data: json("data").$type<ArchiveData>(),
  applicationCount: int("applicationCount").default(0),
  archivedAt: timestamp("archivedAt").defaultNow().notNull(),
  archivedBy: int("archivedBy"),
});

export type Archive = typeof archives.$inferSelect;
export type InsertArchive = typeof archives.$inferInsert;

export interface ArchiveData {
  applications: Record<string, unknown>[];
  scores: Record<string, unknown>[];
  reviewers: Record<string, unknown>[];
  assignments: Record<string, unknown>[];
  checkins?: Record<string, unknown>[];
  participantForms?: Record<string, unknown>[];
}

// Check-in tracking for event programs
export const checkins = mysqlTable("checkins", {
  id: int("id").autoincrement().primaryKey(),
  applicationId: int("applicationId").notNull(),
  programId: int("programId").notNull(),
  status: mysqlEnum("status", ["approved", "picked_up", "no_show", "no_show_communicated"]).default("approved").notNull(),
  checkedInAt: timestamp("checkedInAt"),
  checkedInBy: int("checkedInBy"), // Admin user ID
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Checkin = typeof checkins.$inferSelect;
export type InsertCheckin = typeof checkins.$inferInsert;

// Applicant flags for no-show tracking and eligibility restrictions
export const applicantFlags = mysqlTable("applicant_flags", {
  id: int("id").autoincrement().primaryKey(),
  applicantEmail: varchar("applicantEmail", { length: 320 }).notNull(),
  applicantName: varchar("applicantName", { length: 255 }),
  flagType: mysqlEnum("flagType", ["no_show", "repeat_no_show", "restricted", "warning"]).notNull(),
  reason: text("reason"),
  programId: int("programId"),
  year: int("year"),
  flaggedBy: int("flaggedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ApplicantFlag = typeof applicantFlags.$inferSelect;
export type InsertApplicantFlag = typeof applicantFlags.$inferInsert;

// Waitlist management
export const waitlist = mysqlTable("waitlist", {
  id: int("id").autoincrement().primaryKey(),
  applicationId: int("applicationId").notNull(),
  programId: int("programId").notNull(),
  position: int("position").notNull(),
  status: mysqlEnum("status", ["waiting", "promoted", "expired", "declined"]).default("waiting").notNull(),
  promotedAt: timestamp("promotedAt"),
  notifiedAt: timestamp("notifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Waitlist = typeof waitlist.$inferSelect;
export type InsertWaitlist = typeof waitlist.$inferInsert;

// Participant forms - separate form for military commanders/participants
export const participantForms = mysqlTable("participant_forms", {
  id: int("id").autoincrement().primaryKey(),
  applicationId: int("applicationId").notNull(),
  programId: int("programId").notNull(),
  participantName: varchar("participantName", { length: 255 }).notNull(),
  tshirtSize: varchar("tshirtSize", { length: 20 }),
  plusOne: boolean("plusOne").default(false),
  plusOneName: varchar("plusOneName", { length: 255 }),
  plusOneTshirtSize: varchar("plusOneTshirtSize", { length: 20 }),
  namePronunciation: varchar("namePronunciation", { length: 500 }),
  dietaryRestrictions: text("dietaryRestrictions"),
  specialNeeds: text("specialNeeds"),
  isCommander: boolean("isCommander").default(false),
  rank: varchar("rank", { length: 100 }),
  branch: varchar("branch", { length: 100 }),
  yearsOfService: varchar("yearsOfService", { length: 50 }),
  attendees: json("attendees").$type<Array<{
    name: string;
    tshirtSize: string;
    relationship: 'self' | 'spouse' | 'child' | 'guest';
  }>>(),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ParticipantForm = typeof participantForms.$inferSelect;
export type InsertParticipantForm = typeof participantForms.$inferInsert;

// SMTP Configuration interface
export interface SmtpConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean; // true for 465, false for other ports
  username: string;
  password: string; // encrypted
  fromName: string;
  fromEmail: string;
  replyToEmail?: string;
  replyToName?: string;
  testEmailSent?: boolean;
  lastTestAt?: string;
}
