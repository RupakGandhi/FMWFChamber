import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock database functions
vi.mock("./db", () => ({
  getPrograms: vi.fn().mockResolvedValue([
    { id: 1, name: 'Test Program', slug: 'test-program', status: 'open', programType: 'leadership', year: 2026 }
  ]),
  getProgramById: vi.fn().mockResolvedValue({
    id: 1,
    name: 'Test Program',
    slug: 'test-program',
    status: 'open',
    programType: 'leadership',
    year: 2026,
    formConfig: { fields: [] },
    scoringConfig: { criteria: [] },
    settings: { blindReview: true }
  }),
  getProgramBySlug: vi.fn().mockResolvedValue({
    id: 1,
    name: 'Test Program',
    slug: 'test-program',
    status: 'open',
    programType: 'leadership',
    year: 2026,
    formConfig: { fields: [] },
    scoringConfig: { criteria: [] },
    settings: { blindReview: true }
  }),
  getApplicationsByProgram: vi.fn().mockResolvedValue([
    { id: 1, applicationNumber: 'APP-001', status: 'submitted', applicantName: 'Test User' }
  ]),
  getApplications: vi.fn().mockResolvedValue([
    { id: 1, applicationNumber: 'APP-001', status: 'submitted', applicantName: 'Test User' }
  ]),
  getApplicationById: vi.fn().mockResolvedValue({
    id: 1,
    programId: 1,
    applicationNumber: 'APP-001',
    status: 'submitted',
    applicantName: 'Test User',
    applicantEmail: 'test@example.com',
    formData: { test: 'data' }
  }),
  createApplication: vi.fn().mockResolvedValue({ id: 1, applicationNumber: 'APP-001' }),
  isApplicantRestricted: vi.fn().mockResolvedValue(false),
  getAllocatedCapacityByProgram: vi.fn().mockResolvedValue({ allocated: 0, acceptedApplications: 0 }),
  addToWaitlist: vi.fn().mockResolvedValue({ id: 1, position: 1 }),
  updateApplication: vi.fn().mockResolvedValue(undefined),
  getReviewers: vi.fn().mockResolvedValue([
    { id: 1, name: 'Reviewer 1', email: 'reviewer@example.com', accessToken: 'token123', isActive: true }
  ]),
  createReviewer: vi.fn().mockResolvedValue({ id: 1, accessToken: 'newtoken123' }),
  getReviewerByToken: vi.fn().mockResolvedValue({
    id: 1, name: 'Reviewer 1', email: 'reviewer@example.com', accessToken: 'token123', isActive: true
  }),
  getAssignmentsByReviewer: vi.fn().mockResolvedValue([
    { id: 1, reviewerId: 1, applicationId: 1, programId: 1, status: 'pending' }
  ]),
  getScoreByReviewerAndApplication: vi.fn().mockResolvedValue(null),
  createScore: vi.fn().mockResolvedValue({ id: 1 }),
  updateAssignment: vi.fn().mockResolvedValue(undefined),
  updateApplicationScores: vi.fn().mockResolvedValue(undefined),
  getProgramStats: vi.fn().mockResolvedValue({
    totalApplications: 10,
    pending: 5,
    reviewed: 5,
    averageScore: '7.5'
  }),
}));

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("Programs Router", () => {
  it("admin can list programs", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.programs.list();
    
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(0);
  });

  it("admin can get program by id", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.programs.getById({ id: 1 });
    
    expect(result).toBeDefined();
    expect(result?.id).toBe(1);
  });

  it("public can get open program by slug", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.programs.getBySlug({ slug: 'test-program' });
    
    expect(result).toBeDefined();
    expect(result?.slug).toBe('test-program');
    expect(result?.status).toBe('open');
  });
});

describe("Applications Router", () => {
  it("public can submit application", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.applications.submit({
      programSlug: 'test-program',
      formData: { test: 'data' },
      applicantName: 'Test Applicant',
      applicantEmail: 'test@example.com',
    });
    
    expect(result).toBeDefined();
    expect(result.applicationNumber).toBeDefined();
  });

  it("admin can list applications for a program", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.applications.list({ programId: 1 });
    
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin can update application status", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.applications.updateStatus({
      id: 1,
      status: 'under_review',
    });
    
    expect(result.success).toBe(true);
  });
});

describe("Reviewers Router", () => {
  it("admin can list reviewers", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.reviewers.list();
    
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin can create reviewer", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.reviewers.create({
      name: 'New Reviewer',
      email: 'newreviewer@example.com',
    });
    
    expect(result).toBeDefined();
    expect(result.accessToken).toBeDefined();
  });
});

describe("Reviewer Portal Router", () => {
  it("can validate reviewer token", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.reviewer.validate({ token: 'token123' });
    
    expect(result).toBeDefined();
    expect(result.id).toBe(1);
    expect(result.name).toBe('Reviewer 1');
  });

  it("can get assignments for reviewer", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.reviewer.getAssignments({ token: 'token123' });
    
    expect(Array.isArray(result)).toBe(true);
  });
});
