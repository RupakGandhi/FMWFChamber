import type { FormField } from "../drizzle/schema";

// Rules shared by the public form and the server, so what an applicant sees is exactly
// what is validated. A heading starts a section, so a hidden heading hides its section.

export const MAX_UPLOAD_MB = 10;
export const DEFAULT_FILE_TYPES = ["pdf", "doc", "docx", "jpg", "jpeg", "png"];

export interface UploadedFile {
  fileToken: string;
  name: string;
  size: number;
}

export function isUploadedFile(value: unknown): value is UploadedFile {
  return typeof value === "object" && value !== null && typeof (value as UploadedFile).fileToken === "string";
}

export function isDisplayOnly(field: Pick<FormField, "type">) {
  return field.type === "heading" || field.type === "section" || field.type === "instructions";
}

export function conditionValues(field: Pick<FormField, "conditionalOn">) {
  const expected = field.conditionalOn?.value;
  if (expected === undefined) return [];
  return (Array.isArray(expected) ? expected : [expected]).map(String);
}

export function conditionIsMet(field: Pick<FormField, "conditionalOn">, formData: Record<string, unknown>) {
  if (!field.conditionalOn) return true;
  const actual = formData[field.conditionalOn.fieldId];
  const answers = (Array.isArray(actual) ? actual : [actual ?? ""]).map(String);
  const expected = conditionValues(field);
  return answers.some(answer => expected.includes(answer));
}

/** The fields shown for these answers, in order. */
export function visibleFields(fields: FormField[], formData: Record<string, unknown>) {
  let sectionHidden = false;
  return fields.filter(field => {
    if (field.type === "heading") {
      sectionHidden = !conditionIsMet(field, formData);
      return !sectionHidden;
    }
    return !sectionHidden && conditionIsMet(field, formData);
  });
}

/** Removes answers to questions that are hidden, such as after changing category. */
export function withoutHiddenAnswers(fields: FormField[], formData: Record<string, unknown>) {
  const shown = new Set(visibleFields(fields, formData).map(field => field.id));
  const known = new Set(fields.map(field => field.id));
  return Object.fromEntries(Object.entries(formData).filter(([id]) => !known.has(id) || shown.has(id)));
}

export function fileExtension(name: string) {
  const match = /\.([a-z0-9]+)$/i.exec(name);
  return match ? match[1].toLowerCase() : "";
}

export function allowedFileTypes(field: Pick<FormField, "fileTypes">) {
  return field.fileTypes?.length ? field.fileTypes : DEFAULT_FILE_TYPES;
}
