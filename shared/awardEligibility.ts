import type { FormField, ProgramSettings } from "../drizzle/schema";
import { isUploadedFile } from "./formLogic";

// Award restriction rules. A win restricts the same nominee in the same category only:
// a win in year Y with a 5-year restriction blocks Y..Y+4, and Y+5 is eligible again.
// Matches are warnings for staff to review, never automatic rejections.

export const DEFAULT_RESTRICTION_YEARS = 5;
export const DEFAULT_NOMINEE_FIELD_ID = "nominee_business";
export const DEFAULT_CATEGORY_FIELD_ID = "award_category";

export interface AwardWinRecord {
  id: number;
  recipientName: string;
  category: string;
  awardYear: number;
  restrictionYears: number;
}

const LEGAL_SUFFIXES = new Set(["inc", "incorporated", "llc", "llp", "ltd", "limited", "corp", "corporation", "co", "company"]);

/** Compare names ignoring case, punctuation and legal suffixes ("ACME, Inc." = "Acme"). */
export function normalizeRecipient(name: string) {
  const words = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  while (words.length > 1 && LEGAL_SUFFIXES.has(words[words.length - 1])) words.pop();
  if (words[0] === "the" && words.length > 1) words.shift();
  return words.join(" ");
}

export function normalizeCategory(category: string) {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function eligibleAgainYear(win: Pick<AwardWinRecord, "awardYear" | "restrictionYears">) {
  return win.awardYear + win.restrictionYears;
}

export function isWinRestricting(win: Pick<AwardWinRecord, "awardYear" | "restrictionYears">, year: number) {
  return year >= win.awardYear && year < eligibleAgainYear(win);
}

/** The label staff and applicants see for a stored answer. Unknown values are returned as stored. */
export function answerLabels(field: FormField | undefined, value: unknown): string[] {
  const values = Array.isArray(value) ? value : value === null || value === undefined || value === "" ? [] : [value];
  const options = (field?.options ?? []) as (string | { value: string; label: string })[];
  return values.map(item => {
    const match = options.find(option => (typeof option === "string" ? option : option.value) === item);
    if (match === undefined) return String(item);
    return typeof match === "string" ? match : match.label;
  });
}

/** A stored answer as staff should read it: choices by label, everything else unchanged. */
export function formatAnswer(fields: FormField[] | undefined, fieldId: string, value: unknown) {
  const field = fields?.find(item => item.id === fieldId);
  if (isUploadedFile(value)) return value.name;
  if (field?.options?.length) return answerLabels(field, value).join(", ");
  if (value === null || value === undefined) return "";
  return typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
}

type EntrySource = {
  formData?: Record<string, unknown> | null;
  organizationName?: string | null;
  applicantName?: string | null;
};

type ProgramSource = {
  formConfig?: { fields?: FormField[] } | null;
  settings?: ProgramSettings | null;
};

/** Who the entry is about and which categories it is in, resolved from the program's own form. */
export function describeEntry(program: ProgramSource, entry: EntrySource) {
  const fields = program.formConfig?.fields ?? [];
  const nomineeFieldId = program.settings?.nomineeFieldId || DEFAULT_NOMINEE_FIELD_ID;
  const categoryFieldId = program.settings?.categoryFieldId || DEFAULT_CATEGORY_FIELD_ID;
  const formData = entry.formData ?? {};
  const nominee = String(formData[nomineeFieldId] ?? "").trim();
  return {
    // Empty when this form has no nominee answer, so callers never match on the nominator.
    nominee,
    displayName: nominee || entry.organizationName || entry.applicantName || "Unnamed entry",
    categories: answerLabels(fields.find(field => field.id === categoryFieldId), formData[categoryFieldId]),
  };
}

/** Wins that restrict this nominee in one of these categories for the given program year. */
export function findRestrictions<T extends AwardWinRecord>(
  wins: T[],
  entry: { nominee: string; categories: string[] },
  year: number,
) {
  const recipient = normalizeRecipient(entry.nominee);
  if (!recipient) return [];
  const categories = new Set(entry.categories.map(normalizeCategory));
  return wins.filter(win =>
    normalizeRecipient(win.recipientName) === recipient &&
    categories.has(normalizeCategory(win.category)) &&
    isWinRestricting(win, year)
  );
}
