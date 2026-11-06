import { describe, it, expect } from "vitest";
import { TRPCError } from "@trpc/server";
import type { FormConfig } from "../drizzle/schema";
import { categoryChoices, describeEntry, findRestrictions, normalizeCategory, resolveCategoryId } from "../shared/awardEligibility";
import { assignOptionValues } from "../shared/formBuilder";
import { ratingOptions } from "../shared/reviewRubric";
import { validateConfiguredForm, validateCriteriaScores } from "./routers";

const form = (label = "2027 Business of the Year"): FormConfig => ({
  fields: [{
    id: "award_category",
    type: "radio",
    label: "Award",
    required: true,
    options: [
      { value: "business_of_the_year", label },
      { value: "small_business_of_the_year", label: "2027 Small Business of the Year" },
    ],
  }],
});

describe("configured choices", () => {
  it("rejects an award category that is not a configured choice", () => {
    expect(() => validateConfiguredForm(form(), { award_category: "made_up" })).toThrow(TRPCError);
    expect(() => validateConfiguredForm(form(), { award_category: "made_up" })).toThrow("please choose one of the listed options");
  });

  it("accepts a configured choice", () => {
    expect(() => validateConfiguredForm(form(), { award_category: "business_of_the_year" })).not.toThrow();
  });

  it("rejects an unlisted value hidden among checkbox answers", () => {
    const boxes: FormConfig = { fields: [{ id: "c", type: "checkbox", label: "C", options: [{ value: "a", label: "A" }] }] };
    expect(() => validateConfiguredForm(boxes, { c: ["a"] })).not.toThrow();
    expect(() => validateConfiguredForm(boxes, { c: ["a", "b"] })).toThrow("listed options");
  });

  it("accepts older forms that store choices as plain text, and numeric answers", () => {
    const legacy = { fields: [{ id: "t", type: "select", label: "T", options: ["1", "2"] }] } as unknown as FormConfig;
    expect(() => validateConfiguredForm(legacy, { t: "2" })).not.toThrow();
    expect(() => validateConfiguredForm(legacy, { t: 2 })).not.toThrow();
    expect(() => validateConfiguredForm(legacy, { t: "3" })).toThrow("listed options");
  });

  it("does not check a question that has no choices yet, or an optional blank answer", () => {
    const pending: FormConfig = { fields: [{ id: "a", type: "select", label: "A", options: [] }, { id: "b", type: "radio", label: "B", options: [{ value: "x", label: "X" }] }] };
    expect(() => validateConfiguredForm(pending, { a: "anything", b: "" })).not.toThrow();
  });
});

describe("five-year match by stable category id", () => {
  const win = { id: 1, recipientName: "Flint Group", category: "Business of the Year", categoryId: "business_of_the_year", awardYear: 2023, restrictionYears: 5 };
  const entryOn = (label: string) => describeEntry(
    { formConfig: form(label), settings: { nomineeFieldId: "org" } },
    { formData: { org: "Flint Group", award_category: "business_of_the_year" } },
  );

  it("matches a historical label with no year against the 2027 category", () => {
    expect(findRestrictions([win], entryOn("2027 Business of the Year"), 2027)).toHaveLength(1);
  });

  it("still matches after only the display label is renamed", () => {
    expect(findRestrictions([win], entryOn("2027 Chamber Business Award"), 2027)).toHaveLength(1);
  });

  it("does not match a different category that happens to share the old wording", () => {
    const entry = { nominee: "Flint Group", categories: ["Business of the Year"], categoryIds: ["small_business_of_the_year"] };
    expect(findRestrictions([win], entry, 2027)).toEqual([]);
  });

  it("falls back to wording for an older record with no id, ignoring the year", () => {
    const older = { ...win, categoryId: null };
    expect(findRestrictions([older], entryOn("2027 Business of the Year"), 2027)).toHaveLength(1);
    expect(normalizeCategory("2027 Non-Profit of the Year")).toBe(normalizeCategory("Non Profit of the Year"));
  });

  it("links a wording-only record to its id, and leaves unknown wording unlinked", () => {
    const choices = categoryChoices([{ formConfig: form(), settings: {} }]);
    expect(resolveCategoryId("Business of the Year", choices)).toBe("business_of_the_year");
    expect(resolveCategoryId("Community Choice", choices)).toBeNull();
  });

  it("gives a new choice a value without the year, so next year's copy keeps matching", () => {
    expect(assignOptionValues([{ value: "", label: "2027 Rising Leader" }])[0].value).toBe("rising_leader");
  });
});

describe("rating dropdown", () => {
  const labels = { lowLabel: "No Evidence", highLabel: "Very Strong Evidence" };

  it("offers 0 to 5 with the end labels", () => {
    expect(ratingOptions({ maxScore: 5 }, labels).map(option => option.label))
      .toEqual(["0 - No Evidence", "1", "2", "3", "4", "5 - Very Strong Evidence"]);
  });

  it("follows a question's own range", () => {
    expect(ratingOptions({ minScore: 1, maxScore: 3 }, {}).map(option => option.value)).toEqual([1, 2, 3]);
  });

  const program = {
    scoringConfig: {
      ratingDropdown: labels,
      criteria: [
        { id: "q", name: "Question", maxScore: 5 },
        { id: "letter", name: "Letter", maxScore: 0, commentOnly: true },
      ],
    },
  } as unknown as Parameters<typeof validateCriteriaScores>[0];

  it("requires a selection for every scored question but not the comment-only one", () => {
    expect(() => validateCriteriaScores(program, [])).toThrow("A score is required");
    expect(() => validateCriteriaScores(program, [{ criteriaId: "q", score: 0 }])).not.toThrow();
  });

  it("refuses part scores and out-of-range values", () => {
    expect(() => validateCriteriaScores(program, [{ criteriaId: "q", score: 2.5 }])).toThrow("whole number");
    expect(() => validateCriteriaScores(program, [{ criteriaId: "q", score: 6 }])).toThrow("between 0 and 5");
  });
});
