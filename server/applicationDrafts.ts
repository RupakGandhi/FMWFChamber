import type { FormField } from "../drizzle/schema";
import { fillTemplate } from "../shared/applicationDrafts";
import { isDisplayOnly, isUploadedFile } from "../shared/formLogic";
import * as db from "./db";
import { sendEmail } from "./smtpService";

const escapeHtml = (value: string) => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

/**
 * Keeps only answers to this form's own questions. Uploads are kept only when they are
 * this program's unsubmitted files for that question, so a saved application can never
 * point at someone else's file.
 */
export async function cleanDraftAnswers(programId: number, fields: FormField[], formData: Record<string, unknown>, draftId?: number) {
  const clean: Record<string, unknown> = {};
  const fileTokens: string[] = [];
  for (const field of fields) {
    if (isDisplayOnly(field) || !(field.id in formData)) continue;
    const value = formData[field.id];
    if (field.type === "file") {
      if (!isUploadedFile(value)) continue;
      const file = await db.getUnclaimedFile(value.fileToken, programId, field.id, draftId);
      if (!file) continue;
      clean[field.id] = { fileToken: file.token, name: file.originalName, size: file.fileSize };
      fileTokens.push(file.token);
      continue;
    }
    clean[field.id] = value;
  }
  return { formData: clean, fileTokens };
}

/** Sends one Save and Return email and records it in the email log. */
export async function sendDraftEmail(options: {
  to: string;
  name: string;
  programId: number;
  subject: string;
  body: string;
  values: Record<string, string>;
}) {
  const subject = fillTemplate(options.subject, options.values).replace(/[\r\n]+/g, " ").slice(0, 500);
  const text = fillTemplate(options.body, options.values);
  const link = options.values.resume_link;
  const html = `<div style="font-family: Arial, sans-serif; line-height: 1.5">${escapeHtml(text)
    .split(escapeHtml(link)).join(`<a href="${escapeHtml(link)}">${escapeHtml(link)}</a>`)
    .replace(/\n/g, "<br>")}</div>`;
  const result = await sendEmail({ to: options.to, toName: options.name, subject, text, html });
  await db.logEmail({
    recipientEmail: options.to,
    recipientName: options.name,
    emailType: "reminder",
    subject,
    programId: options.programId,
    status: result.success ? "sent" : "failed",
    sentAt: result.success ? new Date() : null,
  });
  return result;
}
