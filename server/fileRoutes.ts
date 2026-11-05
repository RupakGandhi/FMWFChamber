import express, { type Express, type Request, type Response } from "express";
import { nanoid } from "nanoid";
import * as db from "./db";
import { sdk } from "./_core/sdk";
import { allowedFileTypes, fileExtension, MAX_UPLOAD_MB } from "../shared/formLogic";

const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT = 40;
const uploadCounts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string, now = Date.now()) {
  const entry = uploadCounts.get(key);
  if (!entry || entry.resetAt <= now) {
    uploadCounts.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

async function handleUpload(req: Request, res: Response) {
  const slug = String(req.query.slug ?? "");
  const fieldId = String(req.query.fieldId ?? "");
  const name = String(req.query.name ?? "").slice(0, 255);
  const body = req.body as Buffer;

  if (isRateLimited(req.ip ?? "unknown")) {
    return res.status(429).json({ error: "Too many uploads. Please wait a few minutes and try again." });
  }
  const program = await db.getProgramBySlug(slug);
  if (!program || program.status !== "open") {
    return res.status(403).json({ error: "Applications are not currently being accepted." });
  }
  const field = program.formConfig?.fields?.find(item => item.id === fieldId && item.type === "file");
  if (!field) return res.status(400).json({ error: "This form does not accept that file." });
  if (!Buffer.isBuffer(body) || body.length === 0) return res.status(400).json({ error: "The file is empty." });
  if (!allowedFileTypes(field).includes(fileExtension(name))) {
    return res.status(400).json({ error: `Please upload one of: ${allowedFileTypes(field).join(", ")}.` });
  }

  await db.deleteAbandonedFiles();
  const token = nanoid(40);
  await db.createApplicationFile({
    token,
    programId: program.id,
    fieldId,
    originalName: name,
    fileSize: body.length,
    data: body,
  });
  return res.json({ fileToken: token, name, size: body.length });
}

async function canDownload(req: Request, applicationId: number) {
  const reviewerToken = typeof req.query.reviewer === "string" ? req.query.reviewer : "";
  if (reviewerToken) {
    const reviewer = await db.getReviewerByToken(reviewerToken);
    if (!reviewer) return false;
    const assignments = await db.getAssignmentsByReviewer(reviewer.id);
    return assignments.some(assignment => assignment.applicationId === applicationId);
  }
  try {
    const user = await sdk.authenticateRequest(req);
    if (user.role !== "admin") return false;
    if (user.loginMethod !== "native") return true;
    return user.isActive && !user.mustChangePassword;
  } catch {
    return false;
  }
}

async function handleDownload(req: Request, res: Response) {
  const file = await db.getApplicationFile(String(req.params.token));
  if (!file?.applicationId || !(await canDownload(req, file.applicationId))) {
    return res.status(404).json({ error: "File not found." });
  }
  // Always a download of opaque bytes, so an uploaded file can never run in the page.
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "private, no-store");
  return res.send(file.data);
}

const guarded = (handler: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response) => {
  handler(req, res).catch(error => {
    console.error("[files]", error);
    if (!res.headersSent) res.status(500).json({ error: "The file could not be processed. Please try again." });
  });
};

export function registerFileRoutes(app: Express) {
  app.post(
    "/api/public/uploads",
    express.raw({ type: "application/octet-stream", limit: `${MAX_UPLOAD_MB}mb` }),
    guarded(handleUpload),
    // express.raw reports an oversized body as an error, which reaches this handler.
    (error: { type?: string }, _req: Request, res: Response, next: express.NextFunction) => {
      if (error.type === "entity.too.large") {
        return res.status(413).json({ error: `Files must be ${MAX_UPLOAD_MB} MB or smaller.` });
      }
      return next(error);
    },
  );
  app.get("/api/files/:token", guarded(handleDownload));
}
