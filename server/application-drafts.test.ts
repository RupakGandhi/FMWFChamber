import { describe, it, expect } from "vitest";
import type { FormField } from "../drizzle/schema";
import { DEFAULT_DRAFT_REMINDER, draftProgress, fillTemplate, RESUME_LINK_VARIABLE, reopenedAfterReminder } from "../shared/applicationDrafts";

const fields: FormField[] = [
  { id: "category", type: "radio", label: "Category", required: true, options: [{ value: "a", label: "A" }, { value: "b", label: "B" }] },
  { id: "for_a", type: "text", label: "Only A", required: true, conditionalOn: { fieldId: "category", value: ["a"] } },
  { id: "story", type: "textarea", label: "Story", required: true },
  { id: "extra", type: "text", label: "Optional" },
  { id: "tips", type: "instructions", label: "", content: "Read me", required: true },
];

describe("saved application progress", () => {
  it("counts only required questions shown for the answers so far", () => {
    expect(draftProgress(fields, {})).toBe(0);
    expect(draftProgress(fields, { category: "b" })).toBe(50);
    expect(draftProgress(fields, { category: "a" })).toBe(33);
    expect(draftProgress(fields, { category: "a", for_a: "x", story: "y" })).toBe(100);
  });

  it("ignores optional questions and instruction blocks", () => {
    expect(draftProgress(fields, { category: "b", story: "y", extra: "" })).toBe(100);
  });
});

describe("reminder email", () => {
  it("fills known variables and leaves others for later", () => {
    expect(fillTemplate("Hi {{applicant_name}}, {{resume_link}} {{other}}", { applicant_name: "Pat", resume_link: "L" }))
      .toBe("Hi Pat, L {{other}}");
  });

  it("always carries the private link in the default message", () => {
    expect(DEFAULT_DRAFT_REMINDER.body).toContain(RESUME_LINK_VARIABLE);
  });
});

describe("reopened after reminder", () => {
  it("is true only when the link was used after the latest reminder", () => {
    const reminder = new Date("2027-01-10T10:00:00Z");
    expect(reopenedAfterReminder({ lastReminderAt: null, lastResumedAt: new Date() })).toBe(false);
    expect(reopenedAfterReminder({ lastReminderAt: reminder, lastResumedAt: null })).toBe(false);
    expect(reopenedAfterReminder({ lastReminderAt: reminder, lastResumedAt: new Date("2027-01-09T10:00:00Z") })).toBe(false);
    expect(reopenedAfterReminder({ lastReminderAt: reminder, lastResumedAt: new Date("2027-01-11T10:00:00Z") })).toBe(true);
  });
});
