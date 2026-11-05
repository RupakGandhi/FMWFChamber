import { describe, it, expect } from "vitest";
import type { FormField } from "../drizzle/schema";
import {
  answerLabels,
  describeEntry,
  eligibleAgainYear,
  findRestrictions,
  isWinRestricting,
  normalizeRecipient,
} from "../shared/awardEligibility";
import { withoutStaffFields } from "./routers";

const win = (overrides: Partial<{ id: number; recipientName: string; category: string; awardYear: number; restrictionYears: number }> = {}) => ({
  id: 1,
  recipientName: "Acme Roofing, Inc.",
  category: "Business of the Year",
  awardYear: 2023,
  restrictionYears: 5,
  ...overrides,
});

describe("five-year award restriction", () => {
  it("restricts the win year through year four and frees year five", () => {
    expect(eligibleAgainYear(win())).toBe(2028);
    expect(isWinRestricting(win(), 2023)).toBe(true);
    expect(isWinRestricting(win(), 2027)).toBe(true);
    expect(isWinRestricting(win(), 2028)).toBe(false);
    expect(isWinRestricting(win(), 2022)).toBe(false);
  });

  it("matches the same nominee and category whoever nominates them", () => {
    const entry = { nominee: "ACME Roofing LLC", categories: ["Business of the Year"] };
    expect(findRestrictions([win()], entry, 2027)).toHaveLength(1);
  });

  it("allows the same nominee in a different category", () => {
    const entry = { nominee: "Acme Roofing", categories: ["Small Business of the Year"] };
    expect(findRestrictions([win()], entry, 2027)).toEqual([]);
  });

  it("does not match a different nominee in the same category", () => {
    const entry = { nominee: "Acme Plumbing", categories: ["Business of the Year"] };
    expect(findRestrictions([win()], entry, 2027)).toEqual([]);
  });

  it("does not match at the boundary year", () => {
    const entry = { nominee: "Acme Roofing", categories: ["Business of the Year"] };
    expect(findRestrictions([win()], entry, 2028)).toEqual([]);
  });

  it("honours a per-record restriction length", () => {
    const entry = { nominee: "Acme Roofing", categories: ["Business of the Year"] };
    expect(findRestrictions([win({ restrictionYears: 3 })], entry, 2026)).toEqual([]);
  });

  it("never matches an entry with no nominee answer", () => {
    expect(findRestrictions([win({ recipientName: "" })], { nominee: "", categories: ["Business of the Year"] }, 2027)).toEqual([]);
  });

  it("normalizes names without merging different ones", () => {
    expect(normalizeRecipient("The Acme Company")).toBe("acme");
    expect(normalizeRecipient("Smith & Sons, Ltd.")).toBe("smith and sons");
    expect(normalizeRecipient("Co")).toBe("co");
    expect(normalizeRecipient("Acme Roofing")).not.toBe(normalizeRecipient("Acme Plumbing"));
  });
});

describe("reading an entry from a program's form", () => {
  const category: FormField = {
    id: "award_category",
    type: "select",
    label: "Award Category",
    options: [{ value: "boy", label: "Business of the Year" }],
  };
  const program = { formConfig: { fields: [category] }, settings: {} };

  it("uses the nominee and the category label, not the nominator or stored code", () => {
    const entry = describeEntry(program, {
      formData: { nominee_business: "Acme Roofing", award_category: "boy" },
      applicantName: "Nominator Person",
    });
    expect(entry).toEqual({ nominee: "Acme Roofing", displayName: "Acme Roofing", categories: ["Business of the Year"] });
  });

  it("honours per-program field settings", () => {
    const entry = describeEntry(
      { formConfig: { fields: [] }, settings: { nomineeFieldId: "person", categoryFieldId: "award" } },
      { formData: { person: "Pat Example", award: "Rising Leader" } },
    );
    expect(entry.nominee).toBe("Pat Example");
    expect(entry.categories).toEqual(["Rising Leader"]);
  });

  it("falls back to the applicant for display only", () => {
    const entry = describeEntry({ formConfig: { fields: [] } }, { formData: {}, applicantName: "Someone" });
    expect(entry.displayName).toBe("Someone");
    expect(entry.nominee).toBe("");
  });

  it("keeps an unknown stored answer readable", () => {
    expect(answerLabels(category, "removed_choice")).toEqual(["removed_choice"]);
    expect(answerLabels(category, ["boy", "other"])).toEqual(["Business of the Year", "other"]);
    expect(answerLabels(category, "")).toEqual([]);
  });
});

describe("staff-only eligibility data", () => {
  it("is removed from what reviewers receive", () => {
    const visible = withoutStaffFields({
      id: 1,
      applicationNumber: "APP-1",
      eligibilityStatus: "ineligible",
      eligibilityReason: "Won in 2023",
      eligibilityReviewedBy: 7,
      eligibilityReviewedAt: new Date(),
    });
    expect(visible).toEqual({ id: 1, applicationNumber: "APP-1" });
  });
});
