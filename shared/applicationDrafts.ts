import type { FormField } from "../drizzle/schema";
import { isDisplayOnly, visibleFields } from "./formLogic";

// Save and Return: an applicant's unfinished application, reopened with a private link.

export const MAX_DRAFT_BYTES = 500_000;
export const RESUME_LINK_VARIABLE = "{{resume_link}}";

export const DEFAULT_DRAFT_REMINDER = {
  subject: "Reminder: finish your application for {{program_name}}",
  body: `Hi {{applicant_name}},

You started an application for {{program_name}} but have not submitted it yet. Use your private link to pick up where you left off:

{{resume_link}}
{{deadline_line}}
Your application is not submitted until you click Submit on the last page.

Thank you,
The FMWF Chamber`,
};

export const DRAFT_LINK_EMAIL = {
  subject: "Your saved application for {{program_name}}",
  body: `Hi {{applicant_name}},

Your application for {{program_name}} has been saved. Use this private link to return and finish it:

{{resume_link}}

Keep this link private: anyone with it can open and edit your saved application. Your application is not submitted until you click Submit on the last page.

Thank you,
The FMWF Chamber`,
};

/** Share of the required questions shown for these answers that have been answered. */
export function draftProgress(fields: FormField[], formData: Record<string, unknown>) {
  const required = visibleFields(fields, formData).filter(field => field.required && !isDisplayOnly(field));
  if (required.length === 0) return 100;
  const answered = required.filter(field => {
    const value = formData[field.id];
    return !(value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0));
  });
  return Math.round((answered.length / required.length) * 100);
}

/** Fills {{name}} variables; unknown variables are left as written. */
export function fillTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => (key in values ? values[key] : match));
}

/** Whether the applicant reopened their saved application after the most recent reminder. */
export function reopenedAfterReminder(draft: { lastReminderAt: Date | string | null; lastResumedAt: Date | string | null }) {
  if (!draft.lastReminderAt || !draft.lastResumedAt) return false;
  return new Date(draft.lastResumedAt).getTime() >= new Date(draft.lastReminderAt).getTime();
}
