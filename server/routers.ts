import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { notifyApplicationSubmitted, notifyReviewerAssigned, notifyReviewerUnassigned, notifyStatusChanged, generateReviewerAssignmentEmail, generateApplicationConfirmationEmail, generateStatusUpdateEmail, defaultTemplates, replaceTemplateVariables } from "./emailNotifications";
import { getSmtpConfig, saveSmtpConfig, testSmtpConnection } from "./smtpService";
import { FormConfig, ScoringConfig, EmailConfig, ProgramSettings, CriteriaScore, SmtpConfig } from "../drizzle/schema";
import { categoryChoices, describeEntry, DEFAULT_RESTRICTION_YEARS, eligibleAgainYear, findRestrictions, resolveCategoryId } from "../shared/awardEligibility";
import { isChoiceField } from "../shared/formBuilder";
import { isDisplayOnly, isUploadedFile, visibleFields, withoutHiddenAnswers } from "../shared/formLogic";
import { buildLeaderboards } from "../shared/leaderboard";
import { cleanQuestionComments, minScoreOf, ratedCriteria, resolveCriteria } from "../shared/reviewRubric";
import { generateTemporaryPassword, hashPassword, normalizeUsername, validatePasswordPolicy, validateUsername, verifyPassword } from "./nativeAuth";

const DUMMY_NATIVE_PASSWORD_HASH = hashPassword("NativeAuthDummy!12345");
const NATIVE_LOGIN_MAX_FAILURES = 5;
const NATIVE_LOGIN_LOCK_MS = 15 * 60 * 1000;
const NATIVE_SESSION_MS = 12 * 60 * 60 * 1000;
const nativeSessionAppId = () => process.env.SESSION_APP_ID || process.env.VITE_APP_ID || "fmwf-chamber-apps";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.loginMethod === "native" && !ctx.user.isActive) {
    throw new TRPCError({ code: "FORBIDDEN", message: "This staff account is inactive." });
  }
  if (ctx.user.loginMethod === "native" && ctx.user.mustChangePassword) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Password change required before administrator access." });
  }
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

const staffDraftScope = z.enum(['program-editor', 'program-settings', 'email-templates']);

const awardWinInput = z.object({
  recipientName: z.string().trim().min(1, 'Name is required').max(255),
  recipientType: z.enum(['business', 'individual']),
  category: z.string().trim().min(1, 'Category is required').max(255),
  categoryId: z.string().trim().max(100).nullable().optional(),
  awardYear: z.number().int().min(1900).max(2100),
  restrictionYears: z.number().int().min(1).max(50).default(DEFAULT_RESTRICTION_YEARS),
  notes: z.string().trim().max(2000).nullable().optional(),
});

const publicBaseUrl = () => {
  const configured = process.env.PUBLIC_APP_URL || process.env.VITE_APP_URL;
  if (configured) return configured.replace(/\/$/, '');
  if (process.env.NODE_ENV === 'production') {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'PUBLIC_APP_URL is not configured.' });
  }
  return 'http://localhost:3000';
};

export function currentCentralDate(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = (type: string) => parts.find(part => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function applicationDeadlineHasPassed(deadline: string | null | undefined, today = currentCentralDate()): boolean {
  return Boolean(deadline && today > deadline.slice(0, 10));
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
}

export function validateConfiguredForm(formConfig: FormConfig | null | undefined, formData: Record<string, unknown>) {
  for (const field of visibleFields(formConfig?.fields || [], formData)) {
    if (isDisplayOnly(field)) continue;
    const value = formData[field.id];
    if (field.required && isBlank(value)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: `Required field missing: ${field.label}` });
    }
    if (isBlank(value)) continue;
    if (isChoiceField(field) && field.options?.length) {
      const allowed = (field.options as (string | { value: string })[]).map(option => (typeof option === 'string' ? option : option.value));
      const answers = Array.isArray(value) ? value : [value];
      if (answers.some(answer => !allowed.includes(String(answer)))) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `${field.label}: please choose one of the listed options.` });
      }
    }
    if (field.type === 'number') {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `${field.label} must be a number` });
      }
      if (field.validation?.min !== undefined && numeric < field.validation.min) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `${field.label} must be at least ${field.validation.min}` });
      }
      if (field.validation?.max !== undefined && numeric > field.validation.max) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `${field.label} must be no more than ${field.validation.max}` });
      }
    }
    if (field.validation?.pattern && typeof value === 'string') {
      try {
        if (!new RegExp(field.validation.pattern).test(value)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `${field.label} is not in the required format` });
        }
      } catch (error) {
        if (error instanceof TRPCError) throw error;
      }
    }
  }
}

/** Eligibility decisions are staff-only; reviewers must never receive them. */
export function withoutStaffFields<T extends object>(application: T) {
  const { eligibilityStatus, eligibilityReason, eligibilityReviewedBy, eligibilityReviewedAt, ...visible } =
    application as T & Partial<Record<'eligibilityStatus' | 'eligibilityReason' | 'eligibilityReviewedBy' | 'eligibilityReviewedAt', unknown>>;
  return visible;
}

/** Replaces each file answer with the verified upload, and returns the tokens to claim. */
async function attachUploads(program: NonNullable<Awaited<ReturnType<typeof db.getProgramById>>>, formData: Record<string, unknown>) {
  const tokens: string[] = [];
  for (const field of visibleFields(program.formConfig?.fields || [], formData)) {
    if (field.type !== 'file' || isBlank(formData[field.id])) continue;
    const value = formData[field.id];
    const file = isUploadedFile(value) ? await db.getUnclaimedFile(value.fileToken, program.id, field.id) : undefined;
    if (!file) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: `Please upload ${field.label} again.` });
    }
    formData[field.id] = { fileToken: file.token, name: file.originalName, size: file.fileSize };
    tokens.push(file.token);
  }
  return tokens;
}

/** A win's stable category: as chosen by staff, or found from its wording. */
async function winCategoryId(win: { category: string; categoryId?: string | null }) {
  if (win.categoryId) return win.categoryId;
  const programs = await db.getPrograms();
  return resolveCategoryId(win.category, categoryChoices(programs.filter(program => program.programType === 'awards')));
}

async function saveProgramEditsOrThrow(id: number, data: Parameters<typeof db.saveProgramEdits>[1], expectedRevision?: number) {
  if (await db.saveProgramEdits(id, data, expectedRevision)) return;
  throw new TRPCError({
    code: 'CONFLICT',
    message: 'This program was saved by someone else, or in another tab, after you opened it.',
  });
}

export function validateCriteriaScores(
  program: Awaited<ReturnType<typeof db.getProgramById>>,
  criteriaScores: CriteriaScore[],
  application?: { formData?: Record<string, unknown> | null },
) {
  const criteria = ratedCriteria(resolveCriteria(program, application));
  const byId = new Map(criteria.map(item => [item.id, item]));
  if (criteria.length > 0 && criteriaScores.length !== criteria.length) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'A score is required for every scoring criterion.' });
  }
  for (const score of criteriaScores) {
    const configured = byId.get(score.criteriaId);
    if (!configured) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'An unknown scoring criterion was submitted.' });
    }
    const minScore = minScoreOf(configured);
    if (program?.scoringConfig?.ratingDropdown && !Number.isInteger(score.score)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: `${configured.name} must be a whole number.` });
    }
    if (!Number.isFinite(score.score) || score.score < minScore || score.score > configured.maxScore) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `${configured.name} must be between ${minScore} and ${configured.maxScore}.`,
      });
    }
    if (configured.commentRequired && !score.comment?.trim()) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: `A comment is required for ${configured.name}.` });
    }
  }
}

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user ? {
      id: ctx.user.id,
      username: ctx.user.username,
      name: ctx.user.name,
      email: ctx.user.email,
      loginMethod: ctx.user.loginMethod,
      role: ctx.user.role,
      isActive: ctx.user.isActive,
      mustChangePassword: ctx.user.mustChangePassword,
      lastSignedIn: ctx.user.lastSignedIn,
    } : null),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    nativeLogin: publicProcedure.input(z.object({
      username: z.string().min(1).max(64),
      password: z.string().min(1).max(128),
    })).mutation(async ({ input, ctx }) => {
      const username = normalizeUsername(input.username);
      const user = await db.getUserByUsername(username);
      const passwordHash = user?.passwordHash || await DUMMY_NATIVE_PASSWORD_HASH;
      const passwordMatches = await verifyPassword(input.password, passwordHash);

      if (!user || user.loginMethod !== "native" || !user.passwordHash || !passwordMatches) {
        if (user?.loginMethod === "native") {
          const failedLoginAttempts = user.failedLoginAttempts + 1;
          await db.updateNativeStaffUser(user.id, {
            failedLoginAttempts,
            lockedUntil: failedLoginAttempts >= NATIVE_LOGIN_MAX_FAILURES
              ? new Date(Date.now() + NATIVE_LOGIN_LOCK_MS)
              : user.lockedUntil,
          });
        }
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid username or password." });
      }

      if (!user.isActive) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This staff account is inactive." });
      }
      if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Account temporarily locked. Contact an administrator or try again later." });
      }

      await db.updateNativeStaffUser(user.id, {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastSignedIn: new Date(),
      });
      const { sdk } = await import("./_core/sdk");
      const sessionToken = await sdk.signSession({
        openId: user.openId,
        appId: nativeSessionAppId(),
        name: user.name || username,
      }, { expiresInMs: NATIVE_SESSION_MS });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: NATIVE_SESSION_MS,
      });
      return { success: true, mustChangePassword: user.mustChangePassword };
    }),

    changePassword: protectedProcedure.input(z.object({
      currentPassword: z.string().min(1).max(128),
      newPassword: z.string().min(12).max(128),
    })).mutation(async ({ input, ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      if (!user || user.loginMethod !== "native" || !user.passwordHash) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This account does not use a native password." });
      }
      if (!await verifyPassword(input.currentPassword, user.passwordHash)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect." });
      }
      const policyError = validatePasswordPolicy(input.newPassword);
      if (policyError) throw new TRPCError({ code: "BAD_REQUEST", message: policyError });
      if (await verifyPassword(input.newPassword, user.passwordHash)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "New password must differ from the current password." });
      }
      await db.updateNativeStaffUser(user.id, {
        passwordHash: await hashPassword(input.newPassword),
        mustChangePassword: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
        passwordUpdatedAt: new Date(),
      });
      return { success: true };
    }),
    
    // Demo login for testing purposes
    demoLogin: publicProcedure.input(z.object({
      username: z.string(),
      password: z.string(),
    })).mutation(async ({ input, ctx }) => {
      if (process.env.ENABLE_DEMO_LOGIN !== 'true') {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Demo login is not enabled.' });
      }
      const DEMO_CREDENTIALS = {
        username: process.env.DEMO_USERNAME,
        password: process.env.DEMO_PASSWORD,
      };
      if (!DEMO_CREDENTIALS.username || !DEMO_CREDENTIALS.password) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Demo login is not configured.' });
      }
      
      if (input.username !== DEMO_CREDENTIALS.username || input.password !== DEMO_CREDENTIALS.password) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid demo credentials' });
      }
      
      // Create or get demo admin user
      const demoOpenId = 'demo-admin-fmwf-chamber';
      await db.upsertUser({
        openId: demoOpenId,
        name: 'Demo Admin',
        email: 'demo@fmwfchamber.com',
        loginMethod: 'demo',
        role: 'admin',
        lastSignedIn: new Date(),
      });
      
      // Create session token
      const { sdk } = await import('./_core/sdk');
      const sessionToken = await sdk.createSessionToken(demoOpenId, { name: 'Demo Admin' });
      
      // Set session cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
      
      return { success: true };
    }),
  }),

  staffAccounts: router({
    list: adminProcedure.query(async () => db.listNativeStaffUsers()),

    create: adminProcedure.input(z.object({
      username: z.string().min(3).max(64),
      name: z.string().min(2).max(255),
      email: z.string().email(),
      temporaryPassword: z.string().min(12).max(128).optional(),
    })).mutation(async ({ input }) => {
      const username = normalizeUsername(input.username);
      const usernameError = validateUsername(username);
      if (usernameError) throw new TRPCError({ code: "BAD_REQUEST", message: usernameError });
      if (await db.getUserByUsername(username)) {
        throw new TRPCError({ code: "CONFLICT", message: "That username is already in use." });
      }
      const temporaryPassword = input.temporaryPassword || generateTemporaryPassword();
      const passwordError = validatePasswordPolicy(temporaryPassword);
      if (passwordError) throw new TRPCError({ code: "BAD_REQUEST", message: passwordError });
      const id = await db.createNativeStaffUser({
        username,
        passwordHash: await hashPassword(temporaryPassword),
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        role: "admin",
        mustChangePassword: true,
      });
      return { id, username, temporaryPassword };
    }),

    update: adminProcedure.input(z.object({
      id: z.number(),
      name: z.string().min(2).max(255),
      email: z.string().email(),
      isActive: z.boolean(),
    })).mutation(async ({ input, ctx }) => {
      const target = await db.getUserById(input.id);
      if (!target || target.loginMethod !== "native") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Native staff account not found." });
      }
      if (ctx.user.id === target.id && !input.isActive) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot deactivate your own administrator account." });
      }
      if (target.role === "admin" && target.isActive && !input.isActive && await db.countActiveAdministrators() <= 1) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "At least one active administrator is required." });
      }
      await db.updateNativeStaffUser(target.id, {
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        role: "admin",
        isActive: input.isActive,
      });
      return { success: true };
    }),

    resetPassword: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const target = await db.getUserById(input.id);
      if (!target || target.loginMethod !== "native") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Native staff account not found." });
      }
      const temporaryPassword = generateTemporaryPassword();
      await db.updateNativeStaffUser(target.id, {
        passwordHash: await hashPassword(temporaryPassword),
        mustChangePassword: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
        passwordUpdatedAt: new Date(),
      });
      return { username: target.username, temporaryPassword };
    }),

    unlock: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const target = await db.getUserById(input.id);
      if (!target || target.loginMethod !== "native") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Native staff account not found." });
      }
      await db.updateNativeStaffUser(target.id, { failedLoginAttempts: 0, lockedUntil: null });
      return { success: true };
    }),
  }),

  // Program management (admin only)
  // Autosaved staff edits. Private to the signed-in staff member and never applied to the
  // live program; only Save Changes does that.
  staffDrafts: router({
    get: adminProcedure.input(z.object({
      programId: z.number(),
      scope: staffDraftScope,
    })).query(async ({ input, ctx }) => {
      return db.getStaffDraft(ctx.user.id, input.programId, input.scope);
    }),

    save: adminProcedure.input(z.object({
      programId: z.number(),
      scope: staffDraftScope,
      payload: z.unknown(),
      baseRevision: z.number(),
    })).mutation(async ({ input, ctx }) => {
      await db.saveStaffDraft({ ...input, userId: ctx.user.id });
      return { savedAt: new Date() };
    }),

    discard: adminProcedure.input(z.object({
      programId: z.number(),
      scope: staffDraftScope,
    })).mutation(async ({ input, ctx }) => {
      await db.deleteStaffDraft(ctx.user.id, input.programId, input.scope);
      return { success: true };
    }),
  }),

  // Past winners and staff eligibility decisions. Kept apart from applicant flags, which
  // are email-based and used for Military no-show restrictions.
  awards: router({
    listWins: adminProcedure.query(async () => {
      const wins = await db.getAwardWins();
      return wins.map(win => ({ ...win, eligibleAgainYear: eligibleAgainYear(win) }));
    }),

    createWin: adminProcedure.input(awardWinInput).mutation(async ({ input, ctx }) => {
      const id = await db.createAwardWin({ ...input, categoryId: await winCategoryId(input), createdBy: ctx.user.id });
      return { id };
    }),

    updateWin: adminProcedure.input(awardWinInput.extend({ id: z.number() })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateAwardWin(id, { ...data, categoryId: await winCategoryId(data) });
      return { success: true };
    }),

    deleteWin: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteAwardWin(input.id);
      return { success: true };
    }),

    // Lists a program's entries with any past win that may restrict them. Nothing here
    // rejects an entry or contacts anyone.
    eligibilityCheck: adminProcedure.input(z.object({ programId: z.number() })).query(async ({ input }) => {
      const program = await db.getProgramById(input.programId);
      if (!program) throw new TRPCError({ code: 'NOT_FOUND', message: 'Program not found' });
      const [wins, data] = await Promise.all([db.getAwardWins(), db.getLeaderboardData(input.programId)]);
      return data.applications.map(application => {
        const entry = describeEntry(program, application);
        return {
          id: application.id,
          applicationNumber: application.applicationNumber,
          displayName: entry.displayName,
          nominee: entry.nominee,
          categories: entry.categories,
          eligibilityStatus: application.eligibilityStatus,
          eligibilityReason: application.eligibilityReason,
          eligibilityReviewedAt: application.eligibilityReviewedAt,
          matches: findRestrictions(wins, entry, program.year).map(win => ({
            ...win,
            eligibleAgainYear: eligibleAgainYear(win),
          })),
        };
      });
    }),

    setEligibility: adminProcedure.input(z.object({
      applicationId: z.number(),
      status: z.enum(['not_reviewed', 'eligible', 'ineligible']),
      reason: z.string().trim().max(2000).optional(),
    })).mutation(async ({ input, ctx }) => {
      if (input.status === 'ineligible' && !input.reason) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'A reason is required when marking an entry ineligible.' });
      }
      const entry = await db.getApplicationById(input.applicationId);
      if (input.status === 'ineligible' && entry?.status === 'accepted') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This entry is already accepted. Change its status before confirming it ineligible.',
        });
      }
      const reviewed = input.status !== 'not_reviewed';
      await db.updateApplication(input.applicationId, {
        eligibilityStatus: input.status,
        eligibilityReason: reviewed ? input.reason || null : null,
        eligibilityReviewedBy: reviewed ? ctx.user.id : null,
        eligibilityReviewedAt: reviewed ? new Date() : null,
        ...(input.status === 'ineligible' ? { rank: null } : {}),
      });
      return { success: true };
    }),
  }),

  leaderboards: router({
    get: adminProcedure.input(z.object({
      programId: z.number(),
      category: z.string().optional(),
    })).query(async ({ input }) => {
      const program = await db.getProgramById(input.programId);
      if (!program) throw new TRPCError({ code: 'NOT_FOUND', message: 'Program not found' });
      const data = await db.getLeaderboardData(input.programId);
      const applications = data.applications.map(application => {
        const entry = describeEntry(program, application);
        return {
          id: application.id,
          applicationNumber: application.applicationNumber,
          displayName: entry.displayName,
          categories: entry.categories,
          ineligible: application.eligibilityStatus === 'ineligible',
          ineligibleReason: application.eligibilityReason,
        };
      });
      // Lists are always per category, because categories use different reviewer forms.
      const categories = Array.from(new Set(applications.flatMap(application => application.categories))).sort();
      const category = input.category && categories.includes(input.category) ? input.category : categories[0];
      return {
        categories,
        category,
        ...buildLeaderboards(applications, data.scores, data.assignments, { category }),
      };
    }),
  }),

  programs: router({
    list: adminProcedure.input(z.object({ status: z.string().optional() }).optional()).query(async ({ input }) => {
      return db.getPrograms(input?.status);
    }),
    
    getById: adminProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getProgramById(input.id);
    }),
    
    getBySlug: publicProcedure.input(z.object({ slug: z.string() })).query(async ({ input, ctx }) => {
      const program = await db.getProgramBySlug(input.slug);
      // Signed-in staff can preview a Draft; it stays hidden from everyone else.
      const staffPreview = program?.status === 'draft' && ctx.user?.role === 'admin';
      if (!program || (program.status !== 'open' && program.status !== 'closed' && !staffPreview)) {
        return null;
      }
      return program;
    }),
    
    listOpen: publicProcedure.query(async () => {
      const allPrograms = await db.getPrograms('open');
      // Return only public-safe fields
      return allPrograms.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        programType: p.programType,
        status: p.status,
        year: p.year,
        applicationDeadline: (p.settings as any)?.applicationDeadline || null,
      }));
    }),
    
    create: adminProcedure.input(z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
      description: z.string().optional(),
      programType: z.enum(['leadership', 'awards', 'registration']),
      year: z.number(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    })).mutation(async ({ input, ctx }) => {
      const id = await db.createProgram({
        ...input,
        createdBy: ctx.user.id,
      });
      return { id };
    }),
    
    update: adminProcedure.input(z.object({
      id: z.number(),
      name: z.string().trim().min(1, 'Program name is required').max(255).optional(),
      description: z.string().optional(),
      status: z.enum(['draft', 'open', 'closed', 'archived']).optional(),
      startDate: z.date().nullable().optional(),
      endDate: z.date().nullable().optional(),
      formConfig: z.any().optional(),
      scoringConfig: z.any().optional(),
      emailConfig: z.any().optional(),
      settings: z.any().optional(),
      expectedRevision: z.number().optional(),
    })).mutation(async ({ input }) => {
      const { id, expectedRevision, ...data } = input;
      const editsContent = data.name !== undefined || data.description !== undefined || data.formConfig !== undefined
        || data.scoringConfig !== undefined || data.emailConfig !== undefined || data.settings !== undefined;
      if (!editsContent) {
        await db.updateProgram(id, data);
        return { success: true };
      }
      await saveProgramEditsOrThrow(id, data, expectedRevision);
      return { success: true };
    }),

    // Independent copy with its own name and public link, always starting as Draft
    copy: adminProcedure.input(z.object({
      id: z.number(),
      name: z.string().trim().min(1, 'Program name is required').max(255),
      slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only'),
      year: z.number().int().min(2000).max(2100),
    })).mutation(async ({ input, ctx }) => {
      if (await db.getProgramBySlug(input.slug)) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Another program already uses this public link.' });
      }
      const { id, ...copy } = input;
      const newId = await db.copyProgram(id, { ...copy, createdBy: ctx.user.id });
      return { id: newId };
    }),
    
    duplicate: adminProcedure.input(z.object({
      id: z.number(),
      newYear: z.number(),
    })).mutation(async ({ input }) => {
      const newId = await db.duplicateProgram(input.id, input.newYear);
      return { id: newId };
    }),

    // Permanently removes an archived program and its program-owned records.
    // Cross-program Applicant Flags are deliberately retained.
    deletePermanently: adminProcedure.input(z.object({
      id: z.number(),
    })).mutation(async ({ input }) => {
      return db.deleteProgramPermanently(input.id);
    }),

    getStats: adminProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getProgramStats(input.id);
    }),
    
    // Get ticket stats for registration programs
    getTicketStats: adminProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const program = await db.getProgramById(input.id);
      if (!program) return null;
      const settings = program.settings as any;
      const { totalTickets, applicationCount } = await db.getTotalTicketsByProgram(input.id, settings?.ticketFieldId);
      return {
        totalTickets,
        applicationCount,
        threshold: settings?.ticketCapacityThreshold || null,
        thresholdReached: settings?.ticketCapacityThreshold ? totalTickets >= settings.ticketCapacityThreshold : false,
        notificationSent: settings?.ticketThresholdNotificationSent || false,
      };
    }),
  }),

  // Application management
  applications: router({
    // Public submission (no auth required)
    submit: publicProcedure.input(z.object({
      programSlug: z.string(),
      formData: z.record(z.string(), z.unknown()),
      applicantName: z.string().optional(),
      applicantEmail: z.string().email().optional(),
      applicantPhone: z.string().optional(),
      organizationName: z.string().optional(),
    })).mutation(async ({ input }) => {
      const program = await db.getProgramBySlug(input.programSlug);
      if (!program) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Program not found' });
      }
      if (program.status !== 'open') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Applications are not currently being accepted' });
      }
      const settings = program.settings || {};
      if (applicationDeadlineHasPassed(settings.applicationDeadline)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'The application deadline has passed.' });
      }
      const formData = withoutHiddenAnswers(program.formConfig?.fields || [], input.formData);
      validateConfiguredForm(program.formConfig, formData);
      const fileTokens = await attachUploads(program, formData);
      if (settings.requireOrganization && !input.organizationName?.trim()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Organization / Company is required.' });
      }
      if (program.formConfig?.contactStep?.phoneRequired && !input.applicantPhone?.trim()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Required field missing: ${program.formConfig.contactStep.phoneLabel || 'Phone Number'}` });
      }
      if (input.applicantEmail && await db.isApplicantRestricted(input.applicantEmail)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This applicant is not eligible to submit online. Please contact the FMWF Chamber for assistance.',
        });
      }

      let shouldWaitlist = false;
      if (program.programType === 'registration' && settings.waitlistEnabled && settings.maxCapacity) {
        const { allocated } = await db.getAllocatedCapacityByProgram(program.id, settings.ticketFieldId);
        shouldWaitlist = allocated >= settings.maxCapacity;
      }
      const result = await db.createApplication({
        programId: program.id,
        formData,
        applicantName: input.applicantName || undefined,
        applicantEmail: input.applicantEmail || undefined,
        applicantPhone: input.applicantPhone || undefined,
        organizationName: input.organizationName || undefined,
      });
      if (shouldWaitlist) {
        await db.addToWaitlist(result.id, program.id);
      }
      if (fileTokens.length > 0) await db.claimApplicationFiles(fileTokens, result.id);
      
      // Send notification for new application
      if (input.applicantName && input.applicantEmail) {
        notifyApplicationSubmitted({
          applicantName: input.applicantName,
          applicantEmail: input.applicantEmail,
          programName: program.name,
          applicationNumber: result.applicationNumber,
          emailConfig: program.emailConfig,
        }).catch(err => console.warn('Failed to send application notification:', err));
      }
      
      // Check ticket capacity threshold for registration programs
      if (program.programType === 'registration') {
        const settings = program.settings as any;
        const threshold = settings?.ticketCapacityThreshold;
        if (threshold && !settings?.ticketThresholdNotificationSent) {
          const { totalTickets } = await db.getTotalTicketsByProgram(program.id, settings?.ticketFieldId);
          if (totalTickets >= threshold) {
            // Send in-app notification to owner
            const { notifyOwner } = await import('./_core/notification');
            notifyOwner({
              title: `Ticket Threshold Reached: ${program.name}`,
              content: `Total tickets requested (${totalTickets}) has reached or exceeded your threshold of ${threshold}. Please review the submissions and manage allocations.`,
            }).catch(err => console.warn('Failed to send threshold notification:', err));
            // Send email notification via SMTP if configured
            const { sendEmail, isSmtpEnabled } = await import('./smtpService');
            const smtpEnabled = await isSmtpEnabled();
            if (smtpEnabled) {
              const { getSmtpConfig } = await import('./smtpService');
              const smtpConfig = await getSmtpConfig();
              const adminEmail = smtpConfig?.fromEmail || smtpConfig?.username;
              if (adminEmail) {
                sendEmail({
                  to: adminEmail,
                  subject: `[Alert] Ticket Threshold Reached: ${program.name}`,
                  text: `Ticket Capacity Threshold Reached. Total tickets requested for ${program.name} has reached ${totalTickets}, meeting or exceeding your configured threshold of ${threshold}. Please log in to the admin dashboard to review submissions and manage allocations.`,
                  html: `<h2>Ticket Capacity Threshold Reached</h2><p>Total tickets requested for <strong>${program.name}</strong> has reached <strong>${totalTickets}</strong>, meeting or exceeding your configured threshold of <strong>${threshold}</strong>.</p><p>Please log in to the admin dashboard to review submissions and manage allocations.</p>`,
                }).catch(err => console.warn('Failed to send threshold email:', err));
              }
            }
            // Mark notification as sent
            await db.updateProgram(program.id, {
              settings: { ...settings, ticketThresholdNotificationSent: true },
            });
          }
        }
      }
      
      return { ...result, waitlisted: shouldWaitlist };
    }),
    
    // Admin: list applications
    list: adminProcedure.input(z.object({
      programId: z.number(),
      status: z.string().optional(),
    })).query(async ({ input }) => {
      return db.getApplicationsByProgram(input.programId, input.status);
    }),
    
    // Admin: get single application with full details
    getById: adminProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const app = await db.getApplicationById(input.id);
      if (!app) return null;
      const scores = await db.getScoresByApplication(input.id);
      const assignments = await db.getAssignmentsByApplication(input.id);
      return { ...app, scores, assignments };
    }),
    
    // Admin: update application status (auto-sends approval email with participant form link)
    updateStatus: adminProcedure.input(z.object({
      id: z.number(),
      status: z.enum(['submitted', 'under_review', 'accepted', 'rejected', 'waitlist']),
    })).mutation(async ({ input }) => {
      const previous = await db.getApplicationById(input.id);
      if (!previous) throw new TRPCError({ code: 'NOT_FOUND', message: 'Application not found' });
      const program = await db.getProgramById(previous.programId);
      if (!program) throw new TRPCError({ code: 'NOT_FOUND', message: 'Program not found' });
      if (input.status === 'accepted' && previous.eligibilityStatus === 'ineligible') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This entry is confirmed ineligible. Clear that decision in Award Restrictions before accepting it.',
        });
      }

      if (input.status === 'waitlist') {
        await db.addToWaitlist(input.id, previous.programId);
      } else {
        await db.updateApplication(input.id, { status: input.status });
      }
      const app = await db.getApplicationById(input.id);
      
      if (app && program && program.emailConfig?.statusUpdateEnabled && app.applicantEmail) {
        // Generate participant form link for registration-type programs when accepted
        const participantFormLink = (
          input.status === 'accepted' &&
          program.programType === 'registration' &&
          program.settings?.participantFormEnabled !== false
        )
          ? `${publicBaseUrl()}/participant-form/${app.participantAccessToken}`
          : undefined;
        
        notifyStatusChanged({
          applicantName: app.applicantName || 'Applicant',
          applicantEmail: app.applicantEmail,
          applicationNumber: app.applicationNumber,
          programName: program.name,
          newStatus: input.status,
          emailConfig: program.emailConfig,
          participantFormLink,
          applicationId: input.id,
          programId: app.programId,
        }).catch(err => console.warn('Failed to send status notification:', err));
      }

      // Optional automatic promotion is never enabled by default. Military Night
      // remains manually allocated unless staff intentionally enable this setting.
      if (
        previous.status === 'accepted' &&
        input.status !== 'accepted' &&
        program.settings?.waitlistEnabled &&
        program.settings?.autoWaitlistPromotionEnabled
      ) {
        const waiting = (await db.getWaitlistByProgram(program.id)).find(entry => entry.status === 'waiting');
        if (waiting) {
          const promoted = await db.promoteFromWaitlist(waiting.id);
          const promotedApp = await db.getApplicationById(promoted.applicationId);
          if (promotedApp?.applicantEmail) {
            const participantFormLink = (
              program.programType === 'registration' &&
              program.settings?.participantFormEnabled !== false
            ) ? `${publicBaseUrl()}/participant-form/${promotedApp.participantAccessToken}` : undefined;
            notifyStatusChanged({
              applicantName: promotedApp.applicantName || 'Applicant',
              applicantEmail: promotedApp.applicantEmail,
              applicationNumber: promotedApp.applicationNumber,
              programName: program.name,
              newStatus: 'accepted',
              emailConfig: program.emailConfig,
              participantFormLink,
              applicationId: promotedApp.id,
              programId: program.id,
            }).catch(err => console.warn('Failed to send waitlist promotion notification:', err));
          }
        }
      }
      
      return { success: true };
    }),
    
    // Admin: advance to next phase
    advancePhase: adminProcedure.input(z.object({
      ids: z.array(z.number()),
      phase: z.number(),
    })).mutation(async ({ input }) => {
      for (const id of input.ids) {
        await db.updateApplication(id, { phase: input.phase, status: 'under_review' });
      }
      return { success: true };
    }),
    
    // Admin: recalculate rankings
    recalculateRankings: adminProcedure.input(z.object({ programId: z.number() })).mutation(async ({ input }) => {
      await db.rankApplicationsByProgram(input.programId);
      return { success: true };
    }),
    
    // Export data
    exportData: adminProcedure.input(z.object({ programId: z.number() })).query(async ({ input }) => {
      const [applications, scores, reviewers, participantForms, checkins, waitlistEntries] = await Promise.all([
        db.getApplicationsForExport(input.programId),
        db.getScoresForExport(input.programId),
        db.getReviewers(),
        db.getParticipantFormsByProgram(input.programId),
        db.getCheckinsByProgram(input.programId),
        db.getWaitlistByProgram(input.programId),
      ]);
      const reviewerNames = new Map(reviewers.map(reviewer => [reviewer.id, reviewer.name]));
      const detailedScores = scores.map(score => ({
        ...score,
        reviewerName: reviewerNames.get(score.reviewerId) || `Reviewer ${score.reviewerId}`,
      }));
      return { applications, scores: detailedScores, participantForms, checkins, waitlistEntries };
    }),
  }),

  // Reviewer management (admin)
  reviewers: router({
    list: adminProcedure.query(async () => {
      return db.getReviewers();
    }),
    
    create: adminProcedure.input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
    })).mutation(async ({ input }) => {
      const result = await db.createReviewer(input);
      return result;
    }),
    
    update: adminProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      isActive: z.boolean().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateReviewer(id, data);
      return { success: true };
    }),
    
    regenerateToken: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const { nanoid } = await import('nanoid');
      const newToken = nanoid(32);
      await db.updateReviewer(input.id, { accessToken: newToken });
      return { accessToken: newToken };
    }),
    
    getAssignments: adminProcedure.input(z.object({
      reviewerId: z.number(),
      programId: z.number().optional(),
    })).query(async ({ input }) => {
      return db.getAssignmentsByReviewer(input.reviewerId, input.programId);
    }),
    
    // Get reviewer progress dashboard data
    progress: adminProcedure.query(async () => {
      return db.getReviewerProgress();
    }),
    
    // Get reviewer progress for a specific program
    progressByProgram: adminProcedure.input(z.object({ programId: z.number() })).query(async ({ input }) => {
      return db.getReviewerProgressByProgram(input.programId);
    }),
    
    // Delete a reviewer
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteReviewer(input.id);
      return { success: true };
    }),
    
    // Resend access link to reviewer
    resendAccessLink: adminProcedure.input(z.object({ reviewerId: z.number() })).mutation(async ({ input }) => {
      const reviewer = await db.getReviewerById(input.reviewerId);
      if (!reviewer) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Reviewer not found' });
      }
      
      // Send email with access link
      const baseUrl = publicBaseUrl();
      await notifyReviewerAssigned({
        reviewerName: reviewer.name,
        reviewerEmail: reviewer.email,
        reviewerAccessToken: reviewer.accessToken,
        programName: 'FMWF Chamber Programs',
        applicationCount: 0,
        baseUrl,
      });
      
      return { success: true };
    }),
  }),

  // Assignment management (admin)
  assignments: router({
    assign: adminProcedure.input(z.object({
      reviewerId: z.number(),
      applicationId: z.number(),
      programId: z.number(),
    })).mutation(async ({ input }) => {
      const id = await db.assignReviewerToApplication(input);
      return { id };
    }),
    
    bulkAssign: adminProcedure.input(z.object({
      programId: z.number(),
      applicationIds: z.array(z.number()),
      reviewerIds: z.array(z.number()),
    })).mutation(async ({ input }) => {
      const count = await db.bulkAssignReviewers(input.programId, input.applicationIds, input.reviewerIds);
      
      // Send notifications to each reviewer
      const program = await db.getProgramById(input.programId);
      if (program) {
        for (const reviewerId of input.reviewerIds) {
          const reviewer = await db.getReviewerById(reviewerId);
          if (reviewer) {
            const assignmentCount = input.applicationIds.length;
            notifyReviewerAssigned({
              reviewerName: reviewer.name,
              reviewerEmail: reviewer.email,
              reviewerAccessToken: reviewer.accessToken,
              programName: program.name,
              applicationCount: assignmentCount,
              baseUrl: publicBaseUrl(),
            }).catch(err => console.warn('Failed to send reviewer notification:', err));
          }
        }
      }
      
      return { count };
    }),
    
    getByApplication: adminProcedure.input(z.object({ applicationId: z.number() })).query(async ({ input }) => {
      return db.getAssignmentsByApplication(input.applicationId);
    }),
    
    unassign: adminProcedure.input(z.object({
      reviewerId: z.number(),
      applicationId: z.number(),
    })).mutation(async ({ input }) => {
      // Get reviewer and application info before unassigning for notification
      const reviewer = await db.getReviewerById(input.reviewerId);
      const application = await db.getApplicationById(input.applicationId);
      const program = application ? await db.getProgramById(application.programId) : null;
      
      await db.unassignReviewerFromApplication(input.reviewerId, input.applicationId);
      
      // Send notification
      if (reviewer && program) {
        notifyReviewerUnassigned({
          reviewerName: reviewer.name,
          reviewerEmail: reviewer.email,
          programName: program.name,
          applicationNumber: application?.applicationNumber || 'Unknown',
          emailConfig: program.emailConfig,
        }).catch((err: unknown) => console.warn('Failed to send unassign notification:', err));
      }
      
      return { success: true };
    }),
    
    bulkUnassign: adminProcedure.input(z.object({
      applicationIds: z.array(z.number()),
      reviewerIds: z.array(z.number()),
      programId: z.number().optional(),
    })).mutation(async ({ input }) => {
      // Get reviewer and program info before unassigning for notifications
      const reviewersToNotify: Array<{reviewer: NonNullable<Awaited<ReturnType<typeof db.getReviewerById>>>, programName: string, applicationNumbers: string[]}> = [];
      
      // Get program info
      let program = null;
      if (input.programId) {
        program = await db.getProgramById(input.programId);
      } else if (input.applicationIds.length > 0) {
        const firstApp = await db.getApplicationById(input.applicationIds[0]);
        if (firstApp) {
          program = await db.getProgramById(firstApp.programId);
        }
      }
      
      // Collect application numbers for each reviewer
      for (const reviewerId of input.reviewerIds) {
        const reviewer = await db.getReviewerById(reviewerId);
        if (reviewer && program) {
          const applicationNumbers: string[] = [];
          for (const appId of input.applicationIds) {
            const app = await db.getApplicationById(appId);
            if (app) {
              applicationNumbers.push(app.applicationNumber);
            }
          }
          reviewersToNotify.push({
            reviewer,
            programName: program.name,
            applicationNumbers,
          });
        }
      }
      
      // Perform the bulk unassign
      const count = await db.bulkUnassignReviewers(input.applicationIds, input.reviewerIds);
      
      // Send notifications to all affected reviewers
      for (const { reviewer, programName, applicationNumbers } of reviewersToNotify) {
        notifyReviewerUnassigned({
          reviewerName: reviewer.name,
          reviewerEmail: reviewer.email,
          programName,
          applicationNumber: applicationNumbers.length > 1 
            ? `${applicationNumbers.length} applications (${applicationNumbers.slice(0, 3).join(', ')}${applicationNumbers.length > 3 ? '...' : ''})`
            : applicationNumbers[0] || 'Unknown',
          emailConfig: program?.emailConfig,
        }).catch((err: unknown) => console.warn('Failed to send bulk unassign notification:', err));
      }
      
      return { count };
    }),
    
    // Reassign a reviewer - move assignment from one reviewer to another
    reassign: adminProcedure.input(z.object({
      applicationId: z.number(),
      fromReviewerId: z.number(),
      toReviewerId: z.number(),
      programId: z.number(),
    })).mutation(async ({ input }) => {
      // Get reviewer and application info for notifications
      const fromReviewer = await db.getReviewerById(input.fromReviewerId);
      const toReviewer = await db.getReviewerById(input.toReviewerId);
      const application = await db.getApplicationById(input.applicationId);
      const program = await db.getProgramById(input.programId);
      
      // Perform the reassignment
      await db.reassignReviewer(input.applicationId, input.fromReviewerId, input.toReviewerId, input.programId);
      
      // Send notification to the old reviewer about removal
      if (fromReviewer && program) {
        notifyReviewerUnassigned({
          reviewerName: fromReviewer.name,
          reviewerEmail: fromReviewer.email,
          programName: program.name,
          applicationNumber: application?.applicationNumber || 'Unknown',
          emailConfig: program.emailConfig,
        }).catch((err: unknown) => console.warn('Failed to send unassign notification:', err));
      }
      
      // Send notification to the new reviewer about assignment
      if (toReviewer && program) {
        notifyReviewerAssigned({
          reviewerName: toReviewer.name,
          reviewerEmail: toReviewer.email,
          reviewerAccessToken: toReviewer.accessToken,
          programName: program.name,
          applicationCount: 1,
          baseUrl: publicBaseUrl(),
          emailConfig: program.emailConfig,
        }).catch((err: unknown) => console.warn('Failed to send assign notification:', err));
      }
      
      return { success: true };
    }),
    
    // Bulk reassign - move multiple applications from one reviewer to another
    bulkReassign: adminProcedure.input(z.object({
      applicationIds: z.array(z.number()),
      fromReviewerId: z.number(),
      toReviewerId: z.number(),
      programId: z.number(),
    })).mutation(async ({ input }) => {
      // Get reviewer and program info for notifications
      const fromReviewer = await db.getReviewerById(input.fromReviewerId);
      const toReviewer = await db.getReviewerById(input.toReviewerId);
      const program = await db.getProgramById(input.programId);
      
      // Perform the bulk reassignment
      const result = await db.bulkReassignReviewer(
        input.applicationIds,
        input.fromReviewerId,
        input.toReviewerId,
        input.programId
      );
      
      // Collect application numbers for notifications
      const applicationNumbers: string[] = [];
      for (const appId of input.applicationIds) {
        const app = await db.getApplicationById(appId);
        if (app) applicationNumbers.push(app.applicationNumber);
      }
      
      // Send notification to the old reviewer about removal (if any were reassigned)
      if (result.success > 0 && fromReviewer && program) {
        notifyReviewerUnassigned({
          reviewerName: fromReviewer.name,
          reviewerEmail: fromReviewer.email,
          programName: program.name,
          applicationNumber: result.success > 1 
            ? `${result.success} applications (${applicationNumbers.slice(0, 3).join(', ')}${applicationNumbers.length > 3 ? '...' : ''})`
            : applicationNumbers[0] || 'Unknown',
          emailConfig: program.emailConfig,
        }).catch((err: unknown) => console.warn('Failed to send unassign notification:', err));
      }
      
      // Send notification to the new reviewer about assignment (if any were reassigned)
      if (result.success > 0 && toReviewer && program) {
        notifyReviewerAssigned({
          reviewerName: toReviewer.name,
          reviewerEmail: toReviewer.email,
          reviewerAccessToken: toReviewer.accessToken,
          programName: program.name,
          applicationCount: result.success,
          baseUrl: publicBaseUrl(),
          emailConfig: program.emailConfig,
        }).catch((err: unknown) => console.warn('Failed to send assign notification:', err));
      }
      
      return { 
        success: result.success, 
        skipped: result.skipped,
        errors: result.errors 
      };
    }),
  }),

  // Reviewer portal (token-based access, no login required)
  reviewer: router({
    // Validate token and get reviewer info
    validate: publicProcedure.input(z.object({ token: z.string() })).query(async ({ input }) => {
      const reviewer = await db.getReviewerByToken(input.token);
      if (!reviewer) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid or expired access link' });
      }
      return { id: reviewer.id, name: reviewer.name, email: reviewer.email };
    }),
    
    // Get assigned applications for reviewer
    getAssignments: publicProcedure.input(z.object({
      token: z.string(),
      programId: z.number().optional(),
    })).query(async ({ input }) => {
      const reviewer = await db.getReviewerByToken(input.token);
      if (!reviewer) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid access link' });
      }
      const assignments = await db.getAssignmentsByReviewer(reviewer.id, input.programId);
      
      // Get application details for each assignment (blind review - no names)
      const result = [];
      for (const assignment of assignments) {
        const app = await db.getApplicationById(assignment.applicationId);
        const program = await db.getProgramById(assignment.programId);
        const existingScore = await db.getScoreByReviewerAndApplication(reviewer.id, assignment.applicationId);
        
        if (app && program) {
          // Blind review: hide applicant name
          const blindApp = program.settings?.blindReview ? {
            ...app,
            applicantName: `Applicant #${app.applicationNumber}`,
            applicantEmail: undefined,
            applicantPhone: undefined,
          } : app;
          
          result.push({
            assignment,
            application: withoutStaffFields(blindApp),
            program: { id: program.id, name: program.name, scoringConfig: program.scoringConfig },
            existingScore,
          });
        }
      }
      return result;
    }),
    
    // Get single application for review (blind)
    getApplication: publicProcedure.input(z.object({
      token: z.string(),
      applicationId: z.number(),
    })).query(async ({ input }) => {
      const reviewer = await db.getReviewerByToken(input.token);
      if (!reviewer) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid access link' });
      }
      
      // Verify assignment exists
      const assignments = await db.getAssignmentsByReviewer(reviewer.id);
      const hasAccess = assignments.some(a => a.applicationId === input.applicationId);
      if (!hasAccess) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not assigned to this application' });
      }
      
      const app = await db.getApplicationById(input.applicationId);
      if (!app) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Application not found' });
      }
      
      const program = await db.getProgramById(app.programId);
      const existingScore = await db.getScoreByReviewerAndApplication(reviewer.id, input.applicationId);
      
      // Blind review - only if blindReviewEnabled toggle is ON
      const blindReviewActive = program?.settings?.blindReviewEnabled && program?.settings?.blindReview;
      const blindApp = blindReviewActive ? {
        ...app,
        applicantName: `Applicant #${app.applicationNumber}`,
        applicantEmail: undefined,
        applicantPhone: undefined,
      } : app;
      
      return {
        application: withoutStaffFields(blindApp),
        program: program ? { 
          id: program.id, 
          name: program.name, 
          scoringConfig: program.scoringConfig, 
          formConfig: program.formConfig,
          settings: {
            reviewDeadline: program.settings?.reviewDeadline || null,
            reviewDeadlineEnabled: program.settings?.reviewDeadlineEnabled || false,
            scoreEditingEnabled: program.settings?.scoreEditingEnabled || false,
            mandatoryCommentsEnabled: program.settings?.mandatoryCommentsEnabled || false,
            blindReviewEnabled: program.settings?.blindReviewEnabled || false,
            minScoreForComment: program.settings?.minScoreForComment || 0,
            categoryFieldId: program.settings?.categoryFieldId,
          }
        } : null,
        existingScore,
      };
    }),
    
    // Submit score
    submitScore: publicProcedure.input(z.object({
      token: z.string(),
      applicationId: z.number(),
      criteriaScores: z.array(z.object({
        criteriaId: z.string(),
        score: z.number(),
        comment: z.string().optional(),
      })),
      questionComments: z.array(z.object({
        criteriaId: z.string(),
        comment: z.string().max(10000),
      })).optional(),
      comments: z.string().optional(),
    })).mutation(async ({ input }) => {
      const reviewer = await db.getReviewerByToken(input.token);
      if (!reviewer) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid access link' });
      }
      
      // Verify assignment
      const assignments = await db.getAssignmentsByReviewer(reviewer.id);
      const assignment = assignments.find(a => a.applicationId === input.applicationId);
      if (!assignment) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not assigned to this application' });
      }
      
      // Get program settings for toggle enforcement
      const program = await db.getProgramById(assignment.programId);
      const settings = program?.settings;
      const scoredApplication = await db.getApplicationById(input.applicationId);
      validateCriteriaScores(program, input.criteriaScores as CriteriaScore[], scoredApplication);
      const questionComments = cleanQuestionComments(resolveCriteria(program, scoredApplication), input.questionComments);
      if (!questionComments) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'An unknown comment question was submitted.' });
      }
      
      // Enforce review deadline if enabled
      if (settings?.reviewDeadlineEnabled && settings?.reviewDeadline) {
        if (new Date() > new Date(settings.reviewDeadline)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Review deadline has passed. Scores are now locked.' });
        }
      }
      
      // Enforce score editing rules if enabled
      const existingScore = await db.getScoreByReviewerAndApplication(reviewer.id, input.applicationId);
      if (existingScore && !settings?.scoreEditingEnabled) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Score editing is not enabled for this program. You have already submitted your review.' });
      }
      
      // Enforce mandatory comments if enabled
      if (settings?.mandatoryCommentsEnabled && settings?.minScoreForComment) {
        for (const cs of input.criteriaScores) {
          if (cs.score < settings.minScoreForComment && (!cs.comment || !cs.comment.trim())) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: `A comment is required when scoring below ${settings.minScoreForComment}` });
          }
        }
      }
      
      // Calculate total score
      const totalScore = input.criteriaScores.reduce((sum, cs) => sum + cs.score, 0);
      
      const scoreId = await db.submitScore({
        applicationId: input.applicationId,
        reviewerId: reviewer.id,
        programId: assignment.programId,
        criteriaScores: input.criteriaScores as CriteriaScore[],
        questionComments,
        totalScore: String(totalScore),
        comments: input.comments,
      });
      
      return { id: scoreId, totalScore };
    }),
  }),

  // Scores (admin view)
  scores: router({
    getByApplication: adminProcedure.input(z.object({ applicationId: z.number() })).query(async ({ input }) => {
      return db.getScoresByApplication(input.applicationId);
    }),
  }),

  // Applicant status portal (public, no login)
  applicantPortal: router({
    checkStatus: publicProcedure.input(z.object({
      applicationNumber: z.string(),
    })).query(async ({ input }) => {
      const info = await db.getApplicationStatusInfo(input.applicationNumber);
      if (!info) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Application not found. Please check your confirmation number.' });
      }
      return info;
    }),
  }),

  // Admin management (delete, reset, etc.)
  admin: router({
    deleteApplication: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteApplication(input.id);
      return { success: true };
    }),
    
    bulkDeleteApplications: adminProcedure.input(z.object({
      ids: z.array(z.number()),
    })).mutation(async ({ input }) => {
      const count = await db.bulkDeleteApplications(input.ids);
      return { count };
    }),
    
    resetProgram: adminProcedure.input(z.object({
      programId: z.number(),
      newYear: z.number().optional(),
    })).mutation(async ({ input }) => {
      const count = await db.resetProgramApplications(input.programId, input.newYear);
      return { count, message: `Deleted ${count} applications and reset program for new year` };
    }),
    
    // Toggle status update emails for a program
    updateProgramEmailSettings: adminProcedure.input(z.object({
      programId: z.number(),
      statusUpdateEnabled: z.boolean(),
    })).mutation(async ({ input }) => {
      const program = await db.getProgramById(input.programId);
      if (!program) throw new TRPCError({ code: 'NOT_FOUND' });
      
      const emailConfig = {
        ...(program.emailConfig || {}),
        statusUpdateEnabled: input.statusUpdateEnabled,
      };
      await saveProgramEditsOrThrow(input.programId, { emailConfig });
      return { success: true };
    }),
    
    // Update program settings (reviewer reminders, document uploads)
    updateProgramSettings: adminProcedure.input(z.object({
      programId: z.number(),
      settings: z.object({
        reviewerRemindersEnabled: z.boolean().optional(),
        reminderDaysThreshold: z.number().optional(),
        documentUploadsEnabled: z.boolean().optional(),
        maxDocuments: z.number().optional(),
        allowedFileTypes: z.array(z.string()).optional(),
        maxFileSizeMB: z.number().optional(),
        reviewDeadline: z.string().optional(),
        reviewDeadlineEnabled: z.boolean().optional(),
        scoreEditingEnabled: z.boolean().optional(),
        mandatoryCommentsEnabled: z.boolean().optional(),
        blindReviewEnabled: z.boolean().optional(),
        minScoreForComment: z.number().optional(),
        maxCapacity: z.number().optional(),
        waitlistEnabled: z.boolean().optional(),
        autoWaitlistPromotionEnabled: z.boolean().optional(),
        checkInEnabled: z.boolean().optional(),
        tshirtTrackingEnabled: z.boolean().optional(),
        participantFormEnabled: z.boolean().optional(),
        noShowTrackingEnabled: z.boolean().optional(),
        ticketCapacityThreshold: z.number().optional(),
        ticketThresholdNotificationSent: z.boolean().optional(),
        ticketFieldId: z.string().optional(),
        applicationDeadline: z.string().optional(),
        nomineeFieldId: z.string().optional(),
        categoryFieldId: z.string().optional(),
      }),
      expectedRevision: z.number().optional(),
    })).mutation(async ({ input }) => {
      const program = await db.getProgramById(input.programId);
      if (!program) throw new TRPCError({ code: 'NOT_FOUND' });
      
      // If threshold is being changed, reset the notification sent flag
      const existingSettings = program.settings || {};
      const newSettings = { ...input.settings };
      if (newSettings.ticketCapacityThreshold !== undefined && 
          newSettings.ticketCapacityThreshold !== (existingSettings as any).ticketCapacityThreshold) {
        newSettings.ticketThresholdNotificationSent = false;
      }
      
      const settings = {
        ...existingSettings,
        ...newSettings,
      };
      await saveProgramEditsOrThrow(input.programId, { settings }, input.expectedRevision);
      return { success: true };
    }),
    
    // Send reviewer reminders manually
    sendReviewerReminders: adminProcedure.input(z.object({
      programId: z.number(),
    })).mutation(async ({ input }) => {
      const program = await db.getProgramById(input.programId);
      if (!program) throw new TRPCError({ code: 'NOT_FOUND' });
      
      const daysThreshold = program.settings?.reminderDaysThreshold || 3;
      const pendingReviewers = await db.getPendingReviewersForReminders(input.programId, daysThreshold);
      
      let sentCount = 0;
      for (const reviewer of pendingReviewers) {
        await notifyReviewerAssigned({
          reviewerName: reviewer.reviewerName,
          reviewerEmail: reviewer.reviewerEmail,
          programName: program.name,
          reviewerAccessToken: reviewer.reviewerToken,
          applicationCount: 1,
          baseUrl: publicBaseUrl(),
          isReminder: true,
          emailConfig: program.emailConfig,
        });

        // Record only after the delivery workflow has completed successfully.
        await db.createReviewerReminder({
          reviewerId: reviewer.reviewerId,
          programId: input.programId,
          assignmentId: reviewer.assignmentId,
          reminderType: 'first',
        });
        
        sentCount++;
      }
      
      return { sentCount, message: `Sent ${sentCount} reminder(s)` };
    }),
  }),

  // Document uploads
  documents: router({
    // Get documents for an application
    getByApplication: adminProcedure.input(z.object({
      applicationId: z.number(),
    })).query(async ({ input }) => {
      return db.getDocumentsByApplication(input.applicationId);
    }),
    
    // Upload document (called after file is uploaded to S3)
    create: adminProcedure.input(z.object({
      applicationId: z.number(),
      programId: z.number(),
      fileName: z.string(),
      originalName: z.string(),
      fileType: z.string(),
      fileSize: z.number(),
      fileUrl: z.string(),
      fileKey: z.string(),
    })).mutation(async ({ input }) => {
      // Verify program allows uploads
      const program = await db.getProgramById(input.programId);
      if (!program?.settings?.documentUploadsEnabled) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Document uploads are not enabled for this program' });
      }
      
      // Check file count limit
      const existingDocs = await db.getDocumentsByApplication(input.applicationId);
      const maxDocs = program.settings?.maxDocuments || 5;
      if (existingDocs.length >= maxDocs) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Maximum ${maxDocs} documents allowed` });
      }
      
      // Check file size
      const maxSizeMB = program.settings?.maxFileSizeMB || 10;
      if (input.fileSize > maxSizeMB * 1024 * 1024) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `File size exceeds ${maxSizeMB}MB limit` });
      }
      
      const id = await db.createApplicationDocument(input);
      return { id };
    }),
    
    // Delete document
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteDocument(input.id);
      return { success: true };
    }),
  }),

  // SMTP Email Configuration
  smtp: router({
    // Get current SMTP configuration
    getConfig: adminProcedure.query(async () => {
      const config = await getSmtpConfig();
      // Don't expose password to frontend
      if (config) {
        return {
          ...config,
          password: config.password ? '********' : '',
          hasPassword: !!config.password,
        };
      }
      return null;
    }),
    
    // Save SMTP configuration
    saveConfig: adminProcedure.input(z.object({
      enabled: z.boolean(),
      host: z.string().min(1),
      port: z.number().min(1).max(65535),
      secure: z.boolean(),
      username: z.string(),
      password: z.string().optional(), // Optional - if not provided, keep existing
      fromName: z.string().min(1),
      fromEmail: z.string().email(),
      replyToEmail: z.string().email().optional().or(z.literal('')),
      replyToName: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      // Get existing config to preserve password if not provided
      const existingConfig = await getSmtpConfig();
      
      const config: SmtpConfig = {
        enabled: input.enabled,
        host: input.host,
        port: input.port,
        secure: input.secure,
        username: input.username,
        password: input.password || existingConfig?.password || '',
        fromName: input.fromName,
        fromEmail: input.fromEmail,
        replyToEmail: input.replyToEmail || undefined,
        replyToName: input.replyToName || undefined,
      };
      
      const success = await saveSmtpConfig(config, ctx.user.id);
      if (!success) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to save SMTP configuration' });
      }
      return { success: true };
    }),
    
    // Test SMTP connection and send test email
    testConnection: adminProcedure.input(z.object({
      host: z.string().min(1),
      port: z.number().min(1).max(65535),
      secure: z.boolean(),
      username: z.string(),
      password: z.string().optional(),
      fromName: z.string().min(1),
      fromEmail: z.string().email(),
      replyToEmail: z.string().email().optional().or(z.literal('')),
      replyToName: z.string().optional(),
      testEmail: z.string().email(),
    })).mutation(async ({ input }) => {
      // Get existing config to use password if not provided
      const existingConfig = await getSmtpConfig();
      
      const config: SmtpConfig = {
        enabled: true,
        host: input.host,
        port: input.port,
        secure: input.secure,
        username: input.username,
        password: input.password || existingConfig?.password || '',
        fromName: input.fromName,
        fromEmail: input.fromEmail,
        replyToEmail: input.replyToEmail || undefined,
        replyToName: input.replyToName || undefined,
      };
      
      const result = await testSmtpConnection(config, input.testEmail);
      return result;
    }),
    
    // Preview email with sample data
    previewEmail: adminProcedure.input(z.object({
      templateType: z.enum(['confirmation', 'reviewerAssignment', 'statusUpdate', 'reviewerReminder']),
      programId: z.number().optional(),
    })).query(async ({ input }) => {
      // Get program email config if provided
      let emailConfig: EmailConfig | null = null;
      let programName = 'Sample Program';
      if (input.programId) {
        const program = await db.getProgramById(input.programId);
        if (program) {
          emailConfig = program.emailConfig;
          programName = program.name;
        }
      }
      
      // Sample data for preview
      const sampleVariables = {
        applicant_name: 'John Smith',
        applicant_email: 'john.smith@example.com',
        program_name: programName,
        application_number: 'APP-2026-001',
        application_status: 'Under Review',
        reviewer_name: 'Jane Reviewer',
        reviewer_link: `${publicBaseUrl()}/review/SAMPLE-TOKEN`,
        pending_count: '3',
      };
      
      // Get the appropriate template
      let template: { subject: string; body: string };
      switch (input.templateType) {
        case 'confirmation':
          template = {
            subject: emailConfig?.confirmationSubject || defaultTemplates.confirmation.subject,
            body: emailConfig?.confirmationBody || defaultTemplates.confirmation.body,
          };
          break;
        case 'reviewerAssignment':
          template = {
            subject: emailConfig?.reviewerAssignmentSubject || defaultTemplates.reviewerAssignment.subject,
            body: emailConfig?.reviewerAssignmentBody || defaultTemplates.reviewerAssignment.body,
          };
          break;
        case 'statusUpdate':
          template = {
            subject: emailConfig?.statusUpdateSubject || defaultTemplates.statusUpdate.subject,
            body: emailConfig?.statusUpdateBody || defaultTemplates.statusUpdate.body,
          };
          break;
        case 'reviewerReminder':
          template = {
            subject: emailConfig?.reviewerReminderSubject || defaultTemplates.reviewerReminder.subject,
            body: emailConfig?.reviewerReminderBody || defaultTemplates.reviewerReminder.body,
          };
          break;
        default:
          template = defaultTemplates.confirmation;
      }
      
      // Replace variables
      const subject = replaceTemplateVariables(template.subject, sampleVariables);
      const body = replaceTemplateVariables(template.body, sampleVariables);
      
      return {
        subject,
        body,
        rawSubject: template.subject,
        rawBody: template.body,
      };
    }),
  }),

  // ============ PHASE 2: Archive Router ============
  archives: router({
    list: adminProcedure.input(z.object({ programId: z.number().optional() }).optional()).query(async ({ input }) => {
      return db.getArchives(input?.programId);
    }),
    
    getById: adminProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getArchiveById(input.id);
    }),
    
    create: adminProcedure.input(z.object({ programId: z.number() })).mutation(async ({ input, ctx }) => {
      const id = await db.archiveProgram(input.programId, ctx.user.id);
      return { id };
    }),
  }),

  // ============ PHASE 2: Check-in Router ============
  checkins: router({
    getByProgram: adminProcedure.input(z.object({ programId: z.number() })).query(async ({ input }) => {
      return db.getCheckinsByProgram(input.programId);
    }),
    
    updateStatus: adminProcedure.input(z.object({
      applicationId: z.number(),
      programId: z.number(),
      status: z.enum(['approved', 'picked_up', 'no_show', 'no_show_communicated']),
      notes: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      await db.updateCheckinStatus(input.applicationId, input.programId, input.status, ctx.user.id, input.notes);
      return { success: true };
    }),
  }),

  // ============ PHASE 2: Applicant Flags Router ============
  flags: router({
    list: adminProcedure.input(z.object({ email: z.string().optional(), programId: z.number().optional() }).optional()).query(async ({ input }) => {
      return db.getApplicantFlags(input?.email, input?.programId);
    }),
    
    create: adminProcedure.input(z.object({
      applicantEmail: z.string().email(),
      applicantName: z.string().optional(),
      flagType: z.enum(['no_show', 'repeat_no_show', 'restricted', 'warning']),
      reason: z.string().optional(),
      programId: z.number().optional(),
      year: z.number().optional(),
    })).mutation(async ({ input, ctx }) => {
      const id = await db.flagApplicant({ ...input, flaggedBy: ctx.user.id });
      return { id };
    }),
    
    remove: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.removeApplicantFlag(input.id);
      return { success: true };
    }),
    
    checkRestricted: publicProcedure.input(z.object({ email: z.string().email() })).query(async ({ input }) => {
      return { restricted: await db.isApplicantRestricted(input.email) };
    }),
  }),

  // ============ PHASE 2: Waitlist Router ============
  waitlist: router({
    getByProgram: adminProcedure.input(z.object({ programId: z.number() })).query(async ({ input }) => {
      return db.getWaitlistByProgram(input.programId);
    }),
    
    add: adminProcedure.input(z.object({
      applicationId: z.number(),
      programId: z.number(),
    })).mutation(async ({ input }) => {
      return db.addToWaitlist(input.applicationId, input.programId);
    }),
    
    promote: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const entry = await db.promoteFromWaitlist(input.id);
      const application = await db.getApplicationById(entry.applicationId);
      const program = application ? await db.getProgramById(application.programId) : null;
      if (application?.applicantEmail && program) {
        const participantFormLink = (
          program.programType === 'registration' &&
          program.settings?.participantFormEnabled !== false
        ) ? `${publicBaseUrl()}/participant-form/${application.participantAccessToken}` : undefined;
        await notifyStatusChanged({
          applicantName: application.applicantName || 'Applicant',
          applicantEmail: application.applicantEmail,
          applicationNumber: application.applicationNumber,
          programName: program.name,
          newStatus: 'accepted',
          emailConfig: program.emailConfig,
          participantFormLink,
          applicationId: application.id,
          programId: program.id,
        });
      }
      return { success: true, entry };
    }),
  }),

  // ============ PHASE 2: Participant Forms Router ============
  participantForms: router({
    getAccessContext: publicProcedure.input(z.object({
      token: z.string().min(20),
    })).query(async ({ input }) => {
      const application = await db.getApplicationByParticipantToken(input.token);
      if (!application) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'This participant form link is invalid.' });
      }
      const program = await db.getProgramById(application.programId);
      if (
        !program ||
        program.programType !== 'registration' ||
        program.settings?.participantFormEnabled === false
      ) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Participant forms are not enabled for this program.' });
      }
      if (application.status !== 'accepted') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'This participant form is available only after approval.' });
      }
      const existing = await db.getParticipantFormsByApplication(application.id);
      return {
        programName: program.name,
        applicationNumber: application.applicationNumber,
        applicantName: application.applicantName,
        alreadySubmitted: existing.length > 0,
      };
    }),

    submit: publicProcedure.input(z.object({
      token: z.string().min(20),
      participantName: z.string().min(1),
      tshirtSize: z.string().optional(),
      plusOne: z.boolean().optional(),
      plusOneName: z.string().optional(),
      plusOneTshirtSize: z.string().optional(),
      namePronunciation: z.string().optional(),
      dietaryRestrictions: z.string().optional(),
      specialNeeds: z.string().optional(),
      isCommander: z.boolean().optional(),
      rank: z.string().optional(),
      branch: z.string().optional(),
      yearsOfService: z.string().optional(),
      attendees: z.array(z.object({
        name: z.string().min(1),
        tshirtSize: z.string().min(1),
        relationship: z.enum(['self', 'spouse', 'child', 'guest']),
      })).optional(),
    })).mutation(async ({ input }) => {
      const application = await db.getApplicationByParticipantToken(input.token);
      if (!application) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'This participant form link is invalid.' });
      }
      const program = await db.getProgramById(application.programId);
      if (
        !program ||
        program.programType !== 'registration' ||
        program.settings?.participantFormEnabled === false
      ) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Participant forms are not enabled for this program.' });
      }
      if (application.status !== 'accepted') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'This participant form is available only after approval.' });
      }
      const existing = await db.getParticipantFormsByApplication(application.id);
      if (existing.length > 0) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Participant information has already been submitted.' });
      }
      const { token: _token, ...data } = input;
      const id = await db.submitParticipantForm({
        ...data,
        applicationId: application.id,
        programId: application.programId,
      });
      return { id };
    }),
    
    getByApplication: adminProcedure.input(z.object({ applicationId: z.number() })).query(async ({ input }) => {
      return db.getParticipantFormsByApplication(input.applicationId);
    }),
    
    getByProgram: adminProcedure.input(z.object({ programId: z.number() })).query(async ({ input }) => {
      return db.getParticipantFormsByProgram(input.programId);
    }),
    
    update: adminProcedure.input(z.object({
      id: z.number(),
      participantName: z.string().optional(),
      tshirtSize: z.string().optional(),
      plusOne: z.boolean().optional(),
      plusOneName: z.string().optional(),
      plusOneTshirtSize: z.string().optional(),
      namePronunciation: z.string().optional(),
      dietaryRestrictions: z.string().optional(),
      specialNeeds: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateParticipantForm(id, data);
      return { success: true };
    }),
    
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteParticipantForm(input.id);
      return { success: true };
    }),
    
    tshirtInventory: adminProcedure.input(z.object({ programId: z.number() })).query(async ({ input }) => {
      return db.getTshirtInventory(input.programId);
    }),
  }),

  // ============ PHASE 2: Score Edit Router ============
  scoreEdit: router({
    update: publicProcedure.input(z.object({
      scoreId: z.number(),
      reviewerToken: z.string(),
      criteriaScores: z.array(z.object({
        criteriaId: z.string(),
        score: z.number(),
        comment: z.string().optional(),
      })),
      totalScore: z.string().optional(),
      comments: z.string().optional(),
    })).mutation(async ({ input }) => {
      // Verify the reviewer owns this score
      const score = await db.getScoreById(input.scoreId);
      if (!score) throw new TRPCError({ code: 'NOT_FOUND', message: 'Score not found' });
      
      const reviewer = await db.getReviewerByToken(input.reviewerToken);
      if (!reviewer || reviewer.id !== score.reviewerId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to edit this score' });
      }
      
      // Check if review deadline has passed
      const program = await db.getProgramById(score.programId);
      if (!program?.settings?.scoreEditingEnabled) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Score editing is not enabled for this program.' });
      }
      const scoredApplication = await db.getApplicationById(score.applicationId);
      validateCriteriaScores(program, input.criteriaScores as CriteriaScore[], scoredApplication);
      if (program.settings?.reviewDeadlineEnabled && program.settings?.reviewDeadline) {
        const deadline = new Date(program.settings.reviewDeadline);
        if (new Date() > deadline) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Review deadline has passed. Scores are now locked.' });
        }
      }

      if (program.settings?.mandatoryCommentsEnabled && program.settings?.minScoreForComment) {
        for (const criterion of input.criteriaScores) {
          if (
            criterion.score < program.settings.minScoreForComment &&
            (!criterion.comment || !criterion.comment.trim())
          ) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `A comment is required when scoring below ${program.settings.minScoreForComment}`,
            });
          }
        }
      }

      const totalScore = input.criteriaScores.reduce((sum, criterion) => sum + criterion.score, 0);
      
      await db.updateScore(input.scoreId, {
        criteriaScores: input.criteriaScores,
        totalScore: String(totalScore),
        comments: input.comments,
      });
      await db.updateApplicationScores(score.applicationId);
      
      return { success: true };
    }),
  }),

  // PDF export
  export: router({
    // Generate application PDF data
    applicationPdf: adminProcedure.input(z.object({
      applicationId: z.number(),
    })).query(async ({ input }) => {
      const app = await db.getApplicationById(input.applicationId);
      if (!app) throw new TRPCError({ code: 'NOT_FOUND' });
      
      const program = await db.getProgramById(app.programId);
      const scores = await db.getScoresByApplication(input.applicationId);
      const documents = await db.getDocumentsByApplication(input.applicationId);
      
      // Get reviewer names for scores
      const scoresWithReviewers = [];
      for (const score of scores) {
        const reviewer = await db.getReviewerById(score.reviewerId);
        scoresWithReviewers.push({
          ...score,
          reviewerName: reviewer?.name || 'Unknown',
        });
      }
      
      return {
        application: app,
        program: program ? { name: program.name, formConfig: program.formConfig, scoringConfig: program.scoringConfig } : null,
        scores: scoresWithReviewers,
        documents,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
