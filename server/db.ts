import { eq, and, desc, asc, sql, inArray, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql, { TypeCastField, TypeCastNext } from "mysql2";
import {
  InsertUser, users,
  programs, InsertProgram, Program,
  applications, InsertApplication, Application,
  reviewers, InsertReviewer, Reviewer,
  reviewerAssignments, InsertReviewerAssignment,
  scores, InsertScore, Score,
  emailLogs, InsertEmailLog,
  applicationDocuments, InsertApplicationDocument, ApplicationDocument,
  reviewerReminders, InsertReviewerReminder,
  archives, InsertArchive,
  checkins, InsertCheckin,
  applicantFlags, InsertApplicantFlag,
  waitlist, InsertWaitlist,
  participantForms, InsertParticipantForm
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { nanoid } from 'nanoid';

// Columns declared as json() in drizzle/schema.ts. Real MySQL auto-parses its
// native JSON type, but some MySQL-compatible hosts (e.g. MariaDB, where JSON
// is just a LONGTEXT alias) never report the column as JSON at the protocol
// level, so mysql2's built-in auto-parsing never triggers and these columns
// come back as raw strings. Force-parse them here by column name so program
// configuration and application data hydrate into objects on every host.
const JSON_COLUMN_NAMES = new Set([
  "formConfig", "scoringConfig", "emailConfig", "settings",
  "formData", "criteriaScores", "calendarSettings", "value", "data", "attendees",
]);

function parseJsonColumn(raw: string | null): unknown {
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

// Defense in depth: the typeCast above has proven unreliable on Hostinger's
// production MySQL/MariaDB under Drizzle's prepared-statement query path
// (works in isolated scripts, not through the live pooled app connection —
// root cause not fully pinned down). Explicitly re-hydrate JSON columns here
// on every row so program/application data is correct regardless of what the
// driver already did.
function hydrateJsonFields<T extends Record<string, unknown>>(row: T, fields: readonly string[]): T {
  for (const field of fields) {
    const value = row[field];
    if (typeof value === "string") {
      try {
        (row as Record<string, unknown>)[field] = JSON.parse(value);
      } catch {
        // leave as-is if it doesn't parse
      }
    }
  }
  return row;
}

function hydrateJsonRows<T extends Record<string, unknown>>(rows: T[], fields: readonly string[]): T[] {
  for (const row of rows) hydrateJsonFields(row, fields);
  return rows;
}

const PROGRAM_JSON_FIELDS = ["formConfig", "scoringConfig", "emailConfig", "settings"] as const;
const APPLICATION_JSON_FIELDS = ["formData"] as const;
const SCORE_JSON_FIELDS = ["criteriaScores"] as const;
const ARCHIVE_JSON_FIELDS = ["data"] as const;
const PARTICIPANT_FORM_JSON_FIELDS = ["attendees"] as const;
const USER_JSON_FIELDS = ["calendarSettings"] as const;

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        typeCast(field: TypeCastField, next: TypeCastNext) {
          if (JSON_COLUMN_NAMES.has(field.name)) {
            return parseJsonColumn(field.string());
          }
          return next();
        },
      });
      _db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// User queries
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? hydrateJsonFields(result[0], USER_JSON_FIELDS) : undefined;
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result[0] ? hydrateJsonFields(result[0], USER_JSON_FIELDS) : undefined;
}

export async function listNativeStaffUsers() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      mustChangePassword: users.mustChangePassword,
      failedLoginAttempts: users.failedLoginAttempts,
      lockedUntil: users.lockedUntil,
      passwordUpdatedAt: users.passwordUpdatedAt,
      lastSignedIn: users.lastSignedIn,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.loginMethod, "native"))
    .orderBy(asc(users.name), asc(users.username));
}

export async function createNativeStaffUser(input: {
  username: string;
  passwordHash: string;
  name: string;
  email: string;
  role: "admin" | "user";
  mustChangePassword?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(users).values({
    openId: `native:${nanoid(32)}`,
    username: input.username,
    passwordHash: input.passwordHash,
    name: input.name,
    email: input.email,
    loginMethod: "native",
    role: input.role,
    isActive: true,
    mustChangePassword: input.mustChangePassword ?? true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    passwordUpdatedAt: new Date(),
    lastSignedIn: new Date("2000-01-01T00:00:00.000Z"),
  });
  return result[0].insertId;
}

export async function updateNativeStaffUser(id: number, values: Partial<InsertUser>) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  await database.update(users).set(values).where(and(eq(users.id, id), eq(users.loginMethod, "native")));
}

export async function countActiveAdministrators() {
  const database = await getDb();
  if (!database) return 0;
  const result = await database
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.isActive, true)));
  return Number(result[0]?.count || 0);
}

// Program queries
export async function createProgram(program: InsertProgram) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(programs).values(program);
  return result[0].insertId;
}

export async function updateProgram(id: number, data: Partial<InsertProgram>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(programs).set(data).where(eq(programs.id, id));
}

export async function getPrograms(status?: string) {
  const db = await getDb();
  if (!db) return [];
  const rows = status
    ? await db.select().from(programs).where(eq(programs.status, status as any)).orderBy(desc(programs.year), asc(programs.name))
    : await db.select().from(programs).orderBy(desc(programs.year), asc(programs.name));
  return hydrateJsonRows(rows, PROGRAM_JSON_FIELDS);
}

export async function getProgramById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(programs).where(eq(programs.id, id)).limit(1);
  return result[0] ? hydrateJsonFields(result[0], PROGRAM_JSON_FIELDS) : undefined;
}

export async function getProgramBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  // Try exact match first
  const result = await db.select().from(programs).where(eq(programs.slug, slug)).limit(1);
  if (result[0]) return hydrateJsonFields(result[0], PROGRAM_JSON_FIELDS);
  // Fallback: try word-based fuzzy match (e.g., "military-appreciation-2026" matches "military-appreciation-night-2026")
  const allPrograms = hydrateJsonRows(await db.select().from(programs), PROGRAM_JSON_FIELDS);
  const inputWords = slug.split('-').filter(w => w.length > 2);
  const match = allPrograms.find(p => {
    const slugWords = p.slug.split('-');
    return inputWords.every(w => slugWords.includes(w));
  });
  return match;
}

export async function duplicateProgram(id: number, newYear: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const original = await getProgramById(id);
  if (!original) throw new Error("Program not found");
  const newSlug = `${original.slug.replace(/-\d{4}$/, '')}-${newYear}`;
  const newProgram: InsertProgram = {
    name: original.name.replace(/\d{4}/, String(newYear)),
    slug: newSlug,
    description: original.description,
    programType: original.programType,
    status: 'draft',
    year: newYear,
    formConfig: original.formConfig,
    scoringConfig: original.scoringConfig,
    emailConfig: original.emailConfig,
    settings: original.settings,
  };
  return createProgram(newProgram);
}

// Application queries
export async function createApplication(application: Omit<InsertApplication, 'applicationNumber' | 'participantAccessToken'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const appNumber = `APP-${Date.now().toString(36).toUpperCase()}-${nanoid(4).toUpperCase()}`;
  const participantAccessToken = nanoid(40);
  const result = await db.insert(applications).values({
    ...application,
    applicationNumber: appNumber,
    participantAccessToken,
  });
  return { id: result[0].insertId, applicationNumber: appNumber, participantAccessToken };
}

export async function getApplicationsByProgram(programId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  const rows = status
    ? await db.select().from(applications)
        .where(and(eq(applications.programId, programId), eq(applications.status, status as any)))
        .orderBy(desc(applications.submittedAt))
    : await db.select().from(applications)
        .where(eq(applications.programId, programId))
        .orderBy(desc(applications.submittedAt));
  return hydrateJsonRows(rows, APPLICATION_JSON_FIELDS);
}

export async function getApplicationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
  return result[0] ? hydrateJsonFields(result[0], APPLICATION_JSON_FIELDS) : undefined;
}

export async function getApplicationByParticipantToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(applications)
    .where(eq(applications.participantAccessToken, token))
    .limit(1);
  return result[0] ? hydrateJsonFields(result[0], APPLICATION_JSON_FIELDS) : undefined;
}

export async function updateApplication(id: number, data: Partial<InsertApplication>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(applications).set(data).where(eq(applications.id, id));
}

export async function updateApplicationScores(applicationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const appScores = await db.select().from(scores).where(eq(scores.applicationId, applicationId));
  if (appScores.length === 0) return;
  const totalScores = appScores.map(s => parseFloat(s.totalScore || '0'));
  const avgScore = totalScores.reduce((a, b) => a + b, 0) / totalScores.length;
  const sumScore = totalScores.reduce((a, b) => a + b, 0);
  await db.update(applications).set({
    averageScore: String(avgScore.toFixed(2)),
    totalScore: String(sumScore.toFixed(2)),
    reviewCount: appScores.length
  }).where(eq(applications.id, applicationId));
}

export async function rankApplicationsByProgram(programId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const apps = await db.select().from(applications)
    .where(eq(applications.programId, programId))
    .orderBy(desc(applications.averageScore));
  for (let i = 0; i < apps.length; i++) {
    await db.update(applications).set({ rank: i + 1 }).where(eq(applications.id, apps[i].id));
  }
}

// Reviewer queries
export async function createReviewer(reviewer: Omit<InsertReviewer, 'accessToken'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const accessToken = nanoid(32);
  const result = await db.insert(reviewers).values({ ...reviewer, accessToken });
  return { id: result[0].insertId, accessToken };
}

export async function getReviewers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reviewers).where(eq(reviewers.isActive, true)).orderBy(asc(reviewers.name));
}

export async function getReviewerByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(reviewers)
    .where(and(eq(reviewers.accessToken, token), eq(reviewers.isActive, true)))
    .limit(1);
  if (result[0]) {
    await db.update(reviewers).set({ lastAccessedAt: new Date() }).where(eq(reviewers.id, result[0].id));
  }
  return result[0];
}

export async function getReviewerById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(reviewers).where(eq(reviewers.id, id)).limit(1);
  return result[0];
}

export async function updateReviewer(id: number, data: Partial<InsertReviewer>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(reviewers).set(data).where(eq(reviewers.id, id));
}

export async function deleteReviewer(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // First delete all assignments for this reviewer
  await db.delete(reviewerAssignments).where(eq(reviewerAssignments.reviewerId, id));
  // Then delete the reviewer
  await db.delete(reviewers).where(eq(reviewers.id, id));
}

// Assignment queries
export async function assignReviewerToApplication(assignment: InsertReviewerAssignment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(reviewerAssignments)
    .where(and(
      eq(reviewerAssignments.reviewerId, assignment.reviewerId),
      eq(reviewerAssignments.applicationId, assignment.applicationId)
    )).limit(1);
  if (existing.length > 0) return existing[0].id;
  const result = await db.insert(reviewerAssignments).values(assignment);
  return result[0].insertId;
}

export async function getAssignmentsByReviewer(reviewerId: number, programId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (programId) {
    return db.select().from(reviewerAssignments)
      .where(and(eq(reviewerAssignments.reviewerId, reviewerId), eq(reviewerAssignments.programId, programId)))
      .orderBy(asc(reviewerAssignments.status));
  }
  return db.select().from(reviewerAssignments)
    .where(eq(reviewerAssignments.reviewerId, reviewerId))
    .orderBy(asc(reviewerAssignments.status));
}

export async function getAssignmentsByApplication(applicationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reviewerAssignments)
    .where(eq(reviewerAssignments.applicationId, applicationId));
}

export async function updateAssignment(id: number, data: Partial<InsertReviewerAssignment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(reviewerAssignments).set(data).where(eq(reviewerAssignments.id, id));
}

export async function bulkAssignReviewers(programId: number, applicationIds: number[], reviewerIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const assignments: InsertReviewerAssignment[] = [];
  for (const appId of applicationIds) {
    for (const revId of reviewerIds) {
      assignments.push({ programId, applicationId: appId, reviewerId: revId });
    }
  }
  if (assignments.length > 0) {
    await db.insert(reviewerAssignments).values(assignments).onDuplicateKeyUpdate({ set: { status: 'pending' } });
  }
  return assignments.length;
}

export async function unassignReviewerFromApplication(reviewerId: number, applicationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(reviewerAssignments)
    .where(and(
      eq(reviewerAssignments.reviewerId, reviewerId),
      eq(reviewerAssignments.applicationId, applicationId)
    ));
}

export async function bulkUnassignReviewers(applicationIds: number[], reviewerIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  let count = 0;
  for (const appId of applicationIds) {
    for (const revId of reviewerIds) {
      await db.delete(reviewerAssignments)
        .where(and(
          eq(reviewerAssignments.reviewerId, revId),
          eq(reviewerAssignments.applicationId, appId)
        ));
      count++;
    }
  }
  return count;
}

// Reassign reviewer - move assignment from one reviewer to another
export async function reassignReviewer(applicationId: number, fromReviewerId: number, toReviewerId: number, programId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if the target reviewer is already assigned
  const existingAssignment = await db.select().from(reviewerAssignments)
    .where(and(
      eq(reviewerAssignments.applicationId, applicationId),
      eq(reviewerAssignments.reviewerId, toReviewerId)
    ))
    .limit(1);
  
  if (existingAssignment.length > 0) {
    throw new Error("Target reviewer is already assigned to this application");
  }
  
  // Remove the old assignment
  await db.delete(reviewerAssignments)
    .where(and(
      eq(reviewerAssignments.reviewerId, fromReviewerId),
      eq(reviewerAssignments.applicationId, applicationId)
    ));
  
  // Create the new assignment
  await db.insert(reviewerAssignments).values({
    reviewerId: toReviewerId,
    applicationId,
    programId,
    status: 'pending',
  });
  
  return true;
}

// Bulk reassign - move multiple applications from one reviewer to another
export async function bulkReassignReviewer(
  applicationIds: number[], 
  fromReviewerId: number, 
  toReviewerId: number, 
  programId: number
): Promise<{ success: number; skipped: number; errors: string[] }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  let success = 0;
  let skipped = 0;
  const errors: string[] = [];
  
  for (const applicationId of applicationIds) {
    try {
      // Check if the from reviewer is actually assigned
      const fromAssignment = await db.select().from(reviewerAssignments)
        .where(and(
          eq(reviewerAssignments.applicationId, applicationId),
          eq(reviewerAssignments.reviewerId, fromReviewerId)
        ))
        .limit(1);
      
      if (fromAssignment.length === 0) {
        skipped++;
        continue; // Skip if not assigned
      }
      
      // Check if the target reviewer is already assigned
      const existingAssignment = await db.select().from(reviewerAssignments)
        .where(and(
          eq(reviewerAssignments.applicationId, applicationId),
          eq(reviewerAssignments.reviewerId, toReviewerId)
        ))
        .limit(1);
      
      if (existingAssignment.length > 0) {
        skipped++;
        continue; // Skip if already assigned
      }
      
      // Remove the old assignment
      await db.delete(reviewerAssignments)
        .where(and(
          eq(reviewerAssignments.reviewerId, fromReviewerId),
          eq(reviewerAssignments.applicationId, applicationId)
        ));
      
      // Create the new assignment
      await db.insert(reviewerAssignments).values({
        reviewerId: toReviewerId,
        applicationId,
        programId,
        status: 'pending',
      });
      
      success++;
    } catch (error) {
      errors.push(`Application ${applicationId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return { success, skipped, errors };
}

// Score queries
export async function submitScore(score: InsertScore) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(scores)
    .where(and(eq(scores.applicationId, score.applicationId), eq(scores.reviewerId, score.reviewerId)))
    .limit(1);
  if (existing.length > 0) {
    await db.update(scores).set({ ...score, updatedAt: new Date() }).where(eq(scores.id, existing[0].id));
    await db.update(reviewerAssignments).set({ status: 'completed', completedAt: new Date() })
      .where(and(
        eq(reviewerAssignments.applicationId, score.applicationId),
        eq(reviewerAssignments.reviewerId, score.reviewerId)
      ));
    await updateApplicationScores(score.applicationId);
    return existing[0].id;
  }
  const result = await db.insert(scores).values(score);
  // Update assignment status
  await db.update(reviewerAssignments).set({ status: 'completed', completedAt: new Date() })
    .where(and(
      eq(reviewerAssignments.applicationId, score.applicationId),
      eq(reviewerAssignments.reviewerId, score.reviewerId)
    ));
  // Update application scores
  await updateApplicationScores(score.applicationId);
  return result[0].insertId;
}

export async function getScoresByApplication(applicationId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(scores).where(eq(scores.applicationId, applicationId));
  return hydrateJsonRows(rows, SCORE_JSON_FIELDS);
}

export async function getScoreByReviewerAndApplication(reviewerId: number, applicationId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(scores)
    .where(and(eq(scores.reviewerId, reviewerId), eq(scores.applicationId, applicationId)))
    .limit(1);
  return result[0] ? hydrateJsonFields(result[0], SCORE_JSON_FIELDS) : undefined;
}

// Email log queries
export async function logEmail(log: InsertEmailLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(emailLogs).values(log);
  return result[0].insertId;
}

export async function updateEmailLog(id: number, data: Partial<InsertEmailLog>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(emailLogs).set(data).where(eq(emailLogs.id, id));
}

// Export helpers
export async function getApplicationsForExport(programId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(applications)
    .where(eq(applications.programId, programId))
    .orderBy(asc(applications.rank), desc(applications.averageScore));
  return hydrateJsonRows(rows, APPLICATION_JSON_FIELDS);
}

export async function getScoresForExport(programId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    applicationId: scores.applicationId,
    applicationNumber: applications.applicationNumber,
    applicantName: applications.applicantName,
    reviewerId: scores.reviewerId,
    reviewerName: reviewers.name,
    criteriaScores: scores.criteriaScores,
    totalScore: scores.totalScore,
    comments: scores.comments,
    submittedAt: scores.submittedAt
  })
    .from(scores)
    .innerJoin(applications, eq(scores.applicationId, applications.id))
    .innerJoin(reviewers, eq(scores.reviewerId, reviewers.id))
    .where(eq(applications.programId, programId))
    .orderBy(asc(applications.rank));
  return hydrateJsonRows(rows, SCORE_JSON_FIELDS);
}

// Stats queries
// Extract ticket count from an application's formData
export function getTicketCountFromFormData(formData: Record<string, unknown> | null, ticketFieldId?: string): number {
  if (!formData) return 0;
  const fieldId = ticketFieldId || 'ticket_count';
  const value = formData[fieldId];
  if (!value) return 0;
  const strVal = String(value).replace('+', '');
  const num = parseInt(strVal, 10);
  return isNaN(num) ? 0 : num;
}

// Get total tickets requested across all applications for a program
export async function getTotalTicketsByProgram(programId: number, ticketFieldId?: string): Promise<{ totalTickets: number; applicationCount: number }> {
  const db = await getDb();
  if (!db) return { totalTickets: 0, applicationCount: 0 };
  const apps = hydrateJsonRows(await db.select().from(applications).where(eq(applications.programId, programId)), APPLICATION_JSON_FIELDS);
  let totalTickets = 0;
  for (const app of apps) {
    totalTickets += getTicketCountFromFormData(app.formData as Record<string, unknown> | null, ticketFieldId);
  }
  return { totalTickets, applicationCount: apps.length };
}

/**
 * Return capacity that has actually been allocated by an administrator.
 * Registration programs use accepted ticket counts; other programs use the
 * number of accepted applications. Submitted requests never consume capacity.
 */
export async function getAllocatedCapacityByProgram(
  programId: number,
  ticketFieldId?: string,
): Promise<{ allocated: number; acceptedApplications: number }> {
  const db = await getDb();
  if (!db) return { allocated: 0, acceptedApplications: 0 };

  const accepted = hydrateJsonRows(
    await db.select().from(applications)
      .where(and(eq(applications.programId, programId), eq(applications.status, 'accepted'))),
    APPLICATION_JSON_FIELDS,
  );

  let allocated = 0;
  for (const app of accepted) {
    const ticketCount = getTicketCountFromFormData(
      app.formData as Record<string, unknown> | null,
      ticketFieldId,
    );
    allocated += ticketCount > 0 ? ticketCount : 1;
  }

  return { allocated, acceptedApplications: accepted.length };
}

export async function getProgramStats(programId: number) {
  const db = await getDb();
  if (!db) return null;
  const apps = hydrateJsonRows(await db.select().from(applications).where(eq(applications.programId, programId)), APPLICATION_JSON_FIELDS);
  const totalApplications = apps.length;
  const reviewed = apps.filter(a => (a.reviewCount || 0) > 0).length;
  const pending = apps.filter(a => a.status === 'submitted').length;
  const avgScore = apps.reduce((sum, a) => sum + parseFloat(a.averageScore || '0'), 0) / (apps.length || 1);

  // Calculate total tickets for registration programs
  const program = hydrateJsonRows(await db.select().from(programs).where(eq(programs.id, programId)).limit(1), PROGRAM_JSON_FIELDS);
  let totalTickets: number | undefined;
  if (program[0]?.programType === 'registration') {
    const settings = program[0].settings as any;
    let ticketSum = 0;
    for (const app of apps) {
      ticketSum += getTicketCountFromFormData(app.formData as Record<string, unknown> | null, settings?.ticketFieldId);
    }
    totalTickets = ticketSum;
  }
  
  return { totalApplications, reviewed, pending, averageScore: avgScore.toFixed(2), totalTickets };
}

// Reviewer progress dashboard query
export async function getReviewerProgress() {
  const db = await getDb();
  if (!db) return [];
  
  // Get all reviewers with their assignment stats
  const allReviewers = await db.select().from(reviewers).where(eq(reviewers.isActive, true));
  
  const progressData = [];
  for (const reviewer of allReviewers) {
    const assignments = await db.select().from(reviewerAssignments)
      .where(eq(reviewerAssignments.reviewerId, reviewer.id));
    
    const totalAssigned = assignments.length;
    const completed = assignments.filter(a => a.status === 'completed').length;
    const pending = assignments.filter(a => a.status === 'pending').length;
    const inProgress = assignments.filter(a => a.status === 'in_progress').length;
    
    progressData.push({
      id: reviewer.id,
      name: reviewer.name,
      email: reviewer.email,
      totalAssigned,
      completed,
      pending,
      inProgress,
      completionRate: totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0,
      lastAccessedAt: reviewer.lastAccessedAt,
    });
  }
  
  return progressData;
}

// Get reviewer progress by program
export async function getReviewerProgressByProgram(programId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const allReviewers = await db.select().from(reviewers).where(eq(reviewers.isActive, true));
  
  const progressData = [];
  for (const reviewer of allReviewers) {
    const assignments = await db.select().from(reviewerAssignments)
      .where(and(
        eq(reviewerAssignments.reviewerId, reviewer.id),
        eq(reviewerAssignments.programId, programId)
      ));
    
    if (assignments.length === 0) continue; // Skip reviewers not assigned to this program
    
    const totalAssigned = assignments.length;
    const completed = assignments.filter(a => a.status === 'completed').length;
    const pending = assignments.filter(a => a.status === 'pending').length;
    const inProgress = assignments.filter(a => a.status === 'in_progress').length;
    
    progressData.push({
      id: reviewer.id,
      name: reviewer.name,
      email: reviewer.email,
      totalAssigned,
      completed,
      pending,
      inProgress,
      completionRate: totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0,
      lastAccessedAt: reviewer.lastAccessedAt,
    });
  }
  
  return progressData;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] ? hydrateJsonFields(result[0], USER_JSON_FIELDS) : undefined;
}

// Application management (delete, bulk delete, reset)
export async function deleteApplication(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete related records first
  await db.delete(scores).where(eq(scores.applicationId, id));
  await db.delete(reviewerAssignments).where(eq(reviewerAssignments.applicationId, id));
  await db.delete(applications).where(eq(applications.id, id));
}

export async function bulkDeleteApplications(ids: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  for (const id of ids) {
    await deleteApplication(id);
  }
  return ids.length;
}

export async function resetProgramApplications(programId: number, archiveYear?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get all application IDs for this program
  const apps = await db.select({ id: applications.id }).from(applications)
    .where(eq(applications.programId, programId));
  
  // Delete all related data
  for (const app of apps) {
    await db.delete(scores).where(eq(scores.applicationId, app.id));
    await db.delete(reviewerAssignments).where(eq(reviewerAssignments.applicationId, app.id));
  }
  
  // Delete all applications for this program
  await db.delete(applications).where(eq(applications.programId, programId));
  
  // Optionally update the program year
  if (archiveYear) {
    await db.update(programs).set({ year: archiveYear }).where(eq(programs.id, programId));
  }
  
  return apps.length;
}

/**
 * Permanently removes an archived program and every program-owned record:
 * applications, scores, participant forms, check-ins, waitlist entries,
 * archives, documents, reminders, and email logs. Cross-program Applicant
 * Flags are deliberately retained. Only permitted for programs already in
 * `archived` status.
 */
export async function deleteProgramPermanently(programId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const program = await getProgramById(programId);
  if (!program) throw new Error("Program not found");
  if (program.status !== 'archived') {
    throw new Error("Only archived programs can be permanently deleted");
  }

  await db.delete(scores).where(eq(scores.programId, programId));
  await db.delete(reviewerAssignments).where(eq(reviewerAssignments.programId, programId));
  await db.delete(checkins).where(eq(checkins.programId, programId));
  await db.delete(waitlist).where(eq(waitlist.programId, programId));
  await db.delete(participantForms).where(eq(participantForms.programId, programId));
  await db.delete(applicationDocuments).where(eq(applicationDocuments.programId, programId));
  await db.delete(reviewerReminders).where(eq(reviewerReminders.programId, programId));
  await db.delete(emailLogs).where(eq(emailLogs.programId, programId));
  await db.delete(archives).where(eq(archives.programId, programId));
  await db.delete(applications).where(eq(applications.programId, programId));
  await db.delete(programs).where(eq(programs.id, programId));

  return { success: true };
}

// Get application by confirmation number (for applicant portal)
export async function getApplicationByNumber(applicationNumber: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(applications)
    .where(eq(applications.applicationNumber, applicationNumber))
    .limit(1);
  return result[0] ? hydrateJsonFields(result[0], APPLICATION_JSON_FIELDS) : undefined;
}

// Get application with program info for status lookup
export async function getApplicationStatusInfo(applicationNumber: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select({
    id: applications.id,
    applicationNumber: applications.applicationNumber,
    status: applications.status,
    phase: applications.phase,
    applicantName: applications.applicantName,
    applicantEmail: applications.applicantEmail,
    submittedAt: applications.submittedAt,
    programId: applications.programId,
    programName: programs.name,
    programType: programs.programType,
  })
    .from(applications)
    .innerJoin(programs, eq(applications.programId, programs.id))
    .where(eq(applications.applicationNumber, applicationNumber))
    .limit(1);
  
  if (result.length === 0) return undefined;

  return result[0];
}

// Document upload queries
export async function createApplicationDocument(doc: InsertApplicationDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(applicationDocuments).values(doc);
  return result[0].insertId;
}

export async function getDocumentsByApplication(applicationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(applicationDocuments)
    .where(eq(applicationDocuments.applicationId, applicationId))
    .orderBy(desc(applicationDocuments.uploadedAt));
}

export async function deleteDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(applicationDocuments).where(eq(applicationDocuments.id, id));
}

export async function getDocumentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(applicationDocuments)
    .where(eq(applicationDocuments.id, id))
    .limit(1);
  return result[0];
}

// Reviewer reminder queries
export async function createReviewerReminder(reminder: InsertReviewerReminder) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(reviewerReminders).values(reminder);
  return result[0].insertId;
}

export async function getReviewerReminders(reviewerId: number, programId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reviewerReminders)
    .where(and(
      eq(reviewerReminders.reviewerId, reviewerId),
      eq(reviewerReminders.programId, programId)
    ))
    .orderBy(desc(reviewerReminders.sentAt));
}

export async function getPendingReviewersForReminders(programId: number, daysThreshold: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get assignments that are still pending and were assigned more than daysThreshold ago
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);
  
  const pendingAssignments = await db.select({
    assignmentId: reviewerAssignments.id,
    reviewerId: reviewerAssignments.reviewerId,
    applicationId: reviewerAssignments.applicationId,
    assignedAt: reviewerAssignments.assignedAt,
    reviewerName: reviewers.name,
    reviewerEmail: reviewers.email,
    reviewerToken: reviewers.accessToken,
  })
    .from(reviewerAssignments)
    .innerJoin(reviewers, eq(reviewerAssignments.reviewerId, reviewers.id))
    .where(and(
      eq(reviewerAssignments.programId, programId),
      eq(reviewerAssignments.status, 'pending')
    ));
  
  // Filter to only those assigned before threshold and haven't received recent reminder
  const result = [];
  for (const assignment of pendingAssignments) {
    if (assignment.assignedAt && assignment.assignedAt < thresholdDate) {
      // Check if reminder was already sent recently (within last 3 days)
      const recentReminders = await db.select().from(reviewerReminders)
        .where(and(
          eq(reviewerReminders.assignmentId, assignment.assignmentId),
          gte(reviewerReminders.sentAt, new Date(Date.now() - 3 * 24 * 60 * 60 * 1000))
        ));
      
      if (recentReminders.length === 0) {
        result.push(assignment);
      }
    }
  }
  
  return result;
}

// Delete documents when deleting application
export async function deleteApplicationWithDocuments(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete documents first
  await db.delete(applicationDocuments).where(eq(applicationDocuments.applicationId, id));
  // Then delete the rest
  await deleteApplication(id);
}

// ============ PHASE 2: Archive Functions ============

export async function archiveProgram(programId: number, archivedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const program = await getProgramById(programId);
  if (!program) throw new Error("Program not found");
  
  // Gather all data for this program
  const apps = hydrateJsonRows(await db.select().from(applications).where(eq(applications.programId, programId)), APPLICATION_JSON_FIELDS);
  const allScores = hydrateJsonRows(await db.select().from(scores).where(eq(scores.programId, programId)), SCORE_JSON_FIELDS);
  const allAssignments = await db.select().from(reviewerAssignments).where(eq(reviewerAssignments.programId, programId));
  const allCheckins = await db.select().from(checkins).where(eq(checkins.programId, programId));
  const allParticipantForms = hydrateJsonRows(await db.select().from(participantForms).where(eq(participantForms.programId, programId)), PARTICIPANT_FORM_JSON_FIELDS);
  
  // Get unique reviewer IDs from assignments
  const reviewerIds = Array.from(new Set(allAssignments.map(a => a.reviewerId)));
  const allReviewers = reviewerIds.length > 0 
    ? await db.select().from(reviewers).where(inArray(reviewers.id, reviewerIds))
    : [];
  
  // Create archive record
  const [result] = await db.insert(archives).values({
    programId,
    programName: program.name,
    year: program.year,
    data: {
      applications: apps as unknown as Record<string, unknown>[],
      scores: allScores as unknown as Record<string, unknown>[],
      reviewers: allReviewers as unknown as Record<string, unknown>[],
      assignments: allAssignments as unknown as Record<string, unknown>[],
      checkins: allCheckins as unknown as Record<string, unknown>[],
      participantForms: allParticipantForms as unknown as Record<string, unknown>[],
    },
    applicationCount: apps.length,
    archivedBy,
  });

  await db.update(programs).set({ status: 'archived' }).where(eq(programs.id, programId));

  return result.insertId;
}

export async function getArchives(programId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = programId
    ? await db.select().from(archives).where(eq(archives.programId, programId)).orderBy(desc(archives.archivedAt))
    : await db.select().from(archives).orderBy(desc(archives.archivedAt));
  return hydrateJsonRows(rows, ARCHIVE_JSON_FIELDS);
}

export async function getArchiveById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [archive] = await db.select().from(archives).where(eq(archives.id, id));
  return archive ? hydrateJsonFields(archive, ARCHIVE_JSON_FIELDS) : null;
}

// ============ PHASE 2: Check-in Functions ============

export async function createCheckin(data: Omit<InsertCheckin, 'id'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(checkins).values(data);
  return result.insertId;
}

export async function updateCheckinStatus(applicationId: number, programId: number, status: string, checkedInBy: number, notes?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if checkin record exists
  const [existing] = await db.select().from(checkins)
    .where(and(eq(checkins.applicationId, applicationId), eq(checkins.programId, programId)));
  
  if (existing) {
    await db.update(checkins)
      .set({ 
        status: status as any, 
        checkedInAt: status === 'picked_up' ? new Date() : null,
        checkedInBy,
        notes 
      })
      .where(eq(checkins.id, existing.id));
  } else {
    await db.insert(checkins).values({
      applicationId,
      programId,
      status: status as any,
      checkedInAt: status === 'picked_up' ? new Date() : null,
      checkedInBy,
      notes,
    });
  }
}

export async function getCheckinsByProgram(programId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(checkins).where(eq(checkins.programId, programId));
}

// ============ PHASE 2: Applicant Flags Functions ============

export async function flagApplicant(data: Omit<InsertApplicantFlag, 'id'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(applicantFlags).values(data);
  return result.insertId;
}

export async function getApplicantFlags(email?: string, programId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const conditions = [];
  if (email) conditions.push(eq(applicantFlags.applicantEmail, email));
  if (programId) conditions.push(eq(applicantFlags.programId, programId));
  
  if (conditions.length > 0) {
    return db.select().from(applicantFlags).where(and(...conditions));
  }
  return db.select().from(applicantFlags);
}

export async function removeApplicantFlag(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(applicantFlags).where(eq(applicantFlags.id, id));
}

export async function isApplicantRestricted(email: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const flags = await db.select().from(applicantFlags)
    .where(and(
      eq(applicantFlags.applicantEmail, email),
      eq(applicantFlags.flagType, 'restricted')
    ));
  
  return flags.length > 0;
}

// ============ PHASE 2: Waitlist Functions ============

export async function addToWaitlist(applicationId: number, programId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [existingEntry] = await db.select().from(waitlist)
    .where(and(eq(waitlist.applicationId, applicationId), eq(waitlist.programId, programId)))
    .limit(1);
  if (existingEntry) {
    if (existingEntry.status !== 'waiting') {
      await db.update(waitlist)
        .set({ status: 'waiting', promotedAt: null, notifiedAt: null })
        .where(eq(waitlist.id, existingEntry.id));
    }
    await db.update(applications)
      .set({ status: 'waitlist' })
      .where(eq(applications.id, applicationId));
    return { id: existingEntry.id, position: existingEntry.position };
  }
  
  // Get the next position
  const existing = await db.select().from(waitlist)
    .where(and(eq(waitlist.programId, programId), eq(waitlist.status, 'waiting')))
    .orderBy(desc(waitlist.position));
  
  const nextPosition = existing.length > 0 ? existing[0].position + 1 : 1;
  
  const [result] = await db.insert(waitlist).values({
    applicationId,
    programId,
    position: nextPosition,
    status: 'waiting',
  });

  await db.update(applications)
    .set({ status: 'waitlist' })
    .where(eq(applications.id, applicationId));
  
  return { id: result.insertId, position: nextPosition };
}

export async function getWaitlistByProgram(programId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select({
    id: waitlist.id,
    applicationId: waitlist.applicationId,
    position: waitlist.position,
    status: waitlist.status,
    promotedAt: waitlist.promotedAt,
    notifiedAt: waitlist.notifiedAt,
    createdAt: waitlist.createdAt,
    applicantName: applications.applicantName,
    applicantEmail: applications.applicantEmail,
  }).from(waitlist)
    .leftJoin(applications, eq(waitlist.applicationId, applications.id))
    .where(eq(waitlist.programId, programId))
    .orderBy(waitlist.position);
}

export async function promoteFromWaitlist(waitlistId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [entry] = await db.select().from(waitlist).where(eq(waitlist.id, waitlistId));
  if (!entry) throw new Error("Waitlist entry not found");
  
  await db.update(waitlist)
    .set({ status: 'promoted', promotedAt: new Date() })
    .where(eq(waitlist.id, waitlistId));
  
  // Update the application status to accepted
  await db.update(applications)
    .set({ status: 'accepted' })
    .where(eq(applications.id, entry.applicationId));
  
  return entry;
}

// ============ PHASE 2: Participant Forms Functions ============

export async function submitParticipantForm(data: Omit<InsertParticipantForm, 'id'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(participantForms).values(data);
  return result.insertId;
}

export async function getParticipantFormsByApplication(applicationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db.select().from(participantForms).where(eq(participantForms.applicationId, applicationId));
  return hydrateJsonRows(rows, PARTICIPANT_FORM_JSON_FIELDS);
}

export async function getParticipantFormsByProgram(programId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db.select().from(participantForms).where(eq(participantForms.programId, programId));
  return hydrateJsonRows(rows, PARTICIPANT_FORM_JSON_FIELDS);
}

export async function updateParticipantForm(id: number, data: Partial<InsertParticipantForm>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(participantForms).set(data).where(eq(participantForms.id, id));
}

export async function deleteParticipantForm(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(participantForms).where(eq(participantForms.id, id));
}

// ============ PHASE 2: Score Edit Functions ============

export async function updateScore(scoreId: number, data: { criteriaScores?: any; totalScore?: string; comments?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(scores).set({ ...data, updatedAt: new Date() }).where(eq(scores.id, scoreId));
}

export async function getScoreById(scoreId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [score] = await db.select().from(scores).where(eq(scores.id, scoreId));
  return score ? hydrateJsonFields(score, SCORE_JSON_FIELDS) : null;
}

// T-shirt inventory summary
export async function getTshirtInventory(programId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const forms = await db.select().from(participantForms).where(eq(participantForms.programId, programId));
  
  const inventory: Record<string, number> = {};
  for (const form of forms) {
    if (form.tshirtSize) {
      inventory[form.tshirtSize] = (inventory[form.tshirtSize] || 0) + 1;
    }
    if (form.plusOne && form.plusOneTshirtSize) {
      inventory[form.plusOneTshirtSize] = (inventory[form.plusOneTshirtSize] || 0) + 1;
    }
  }
  
  return { inventory, totalForms: forms.length, forms };
}
