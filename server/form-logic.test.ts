import { describe, it, expect } from "vitest";
import type { FormField, ScoringConfig } from "../drizzle/schema";
import { formatAnswer } from "../shared/awardEligibility";
import { validateFormFields } from "../shared/formBuilder";
import { allowedFileTypes, conditionIsMet, DEFAULT_FILE_TYPES, fileExtension, visibleFields, withoutHiddenAnswers } from "../shared/formLogic";
import { allCriteria, cleanQuestionComments, createRubric, minScoreOf, questionCommentEntries, ratedCriteria, resolveCriteria, validateRubrics } from "../shared/reviewRubric";

const when = (value: string | string[]) => ({ fieldId: "award_category", value });
const form: FormField[] = [
  { id: "award_category", type: "radio", label: "Award", options: [{ value: "boty", label: "BOTY" }, { value: "np", label: "Non-Profit" }] },
  { id: "criteria_boty", type: "instructions", label: "", content: "Business criteria", conditionalOn: when("boty") },
  { id: "h_np", type: "heading", label: "Non-Profit Section", conditionalOn: when(["np"]) },
  { id: "budget", type: "text", label: "Budget", required: true },
  { id: "h_all", type: "heading", label: "Everyone" },
  { id: "story", type: "textarea", label: "Story" },
];
const ids = (fields: FormField[]) => fields.map(field => field.id);

describe("category-dependent questions", () => {
  it("shows a block only for its category", () => {
    expect(ids(visibleFields(form, { award_category: "boty" }))).toEqual(["award_category", "criteria_boty", "h_all", "story"]);
  });

  it("hides a whole section when its heading is hidden, then resumes at the next heading", () => {
    expect(ids(visibleFields(form, { award_category: "np" }))).toEqual(["award_category", "h_np", "budget", "h_all", "story"]);
  });

  it("hides conditional content until a category is chosen", () => {
    expect(ids(visibleFields(form, {}))).toEqual(["award_category", "h_all", "story"]);
  });

  it("matches checkbox answers", () => {
    expect(conditionIsMet({ conditionalOn: when("np") }, { award_category: ["boty", "np"] })).toBe(true);
    expect(conditionIsMet({ conditionalOn: when(["np"]) }, { award_category: ["boty"] })).toBe(false);
  });

  it("drops answers left behind by a changed category but keeps unrelated data", () => {
    const answers = { award_category: "boty", budget: "left over", story: "kept", extra: "kept" };
    expect(withoutHiddenAnswers(form, answers)).toEqual({ award_category: "boty", story: "kept", extra: "kept" });
  });

  it("leaves forms with no conditions unchanged", () => {
    const plain: FormField[] = [{ id: "a", type: "text", label: "A" }, { id: "h", type: "heading", label: "H" }, { id: "b", type: "text", label: "B" }];
    expect(visibleFields(plain, {})).toEqual(plain);
  });
});

describe("builder rules for new block types", () => {
  it("allows instructions without a label but not without text", () => {
    expect(validateFormFields([{ id: "a", type: "instructions", label: "", content: "Read this" }])).toEqual([]);
    expect(validateFormFields([{ id: "a", type: "instructions", label: "", content: " " }])).toHaveLength(1);
  });

  it("requires a condition to name at least one answer", () => {
    const field: FormField = { id: "a", type: "text", label: "A", conditionalOn: { fieldId: "x", value: [] } };
    expect(validateFormFields([field])).toHaveLength(1);
  });
});

describe("uploads", () => {
  it("reads extensions safely", () => {
    expect(fileExtension("Cover Letter.PDF")).toBe("pdf");
    expect(fileExtension("archive.tar.gz")).toBe("gz");
    expect(fileExtension("noextension")).toBe("");
  });

  it("uses the safe default list unless staff set their own", () => {
    expect(allowedFileTypes({})).toEqual(DEFAULT_FILE_TYPES);
    expect(allowedFileTypes({ fileTypes: ["ai", "eps"] })).toEqual(["ai", "eps"]);
  });

  it("shows an uploaded answer by its file name", () => {
    expect(formatAnswer([], "logo", { fileToken: "t", name: "logo.png", size: 5 })).toBe("logo.png");
  });
});

describe("reviewer form per category", () => {
  const question = (id: string) => ({ id, name: id, maxScore: 5 });
  const config: ScoringConfig = {
    criteria: [question("default_q")],
    categoryRubrics: [{ id: "r1", name: "Non-Profit", categoryValues: ["np"], criteria: [question("np_q")] }],
  };
  const program = { scoringConfig: config, settings: {} };

  it("uses the form for the entry's category", () => {
    expect(resolveCriteria(program, { formData: { award_category: "np" } }).map(item => item.id)).toEqual(["np_q"]);
  });

  it("falls back to the default form", () => {
    expect(resolveCriteria(program, { formData: { award_category: "boty" } }).map(item => item.id)).toEqual(["default_q"]);
    expect(resolveCriteria(program, { formData: {} }).map(item => item.id)).toEqual(["default_q"]);
  });

  it("keeps programs with no category forms on their existing criteria", () => {
    const plain = { scoringConfig: { criteria: [question("a")] } };
    expect(resolveCriteria(plain, { formData: { award_category: "np" } }).map(item => item.id)).toEqual(["a"]);
  });

  it("honours a program's own category question", () => {
    const custom = { scoringConfig: config, settings: { categoryFieldId: "award" } };
    expect(resolveCriteria(custom, { formData: { award: "np" } }).map(item => item.id)).toEqual(["np_q"]);
  });

  it("lists every question for staff labels", () => {
    expect(allCriteria(config).map(item => item.id)).toEqual(["default_q", "np_q"]);
  });

  it("gives a new form its own question ids so old scores stay linked", () => {
    const rubric = createRubric("New", config.criteria, 7);
    expect(rubric.criteria[0].id).toBe("rubric_7_1");
    expect(rubric.criteria[0].name).toBe("default_q");
  });

  it("defaults the lowest score to zero", () => {
    expect(minScoreOf({})).toBe(0);
    expect(minScoreOf({ minScore: 1 })).toBe(1);
  });

  it("rejects unusable reviewer forms", () => {
    const rubric = { id: "r", name: "A", categoryValues: ["np"], criteria: [question("q")] };
    expect(validateRubrics(config)).toEqual([]);
    expect(validateRubrics({ criteria: [], categoryRubrics: [{ ...rubric, categoryValues: [] }] })).toHaveLength(1);
    expect(validateRubrics({ criteria: [], categoryRubrics: [{ ...rubric, name: " " }] })).toHaveLength(1);
    expect(validateRubrics({ criteria: [], categoryRubrics: [rubric, { ...rubric, id: "r2", name: "B" }] })).toHaveLength(1);
    expect(validateRubrics({ criteria: [{ id: "q", name: "Q", maxScore: 5, minScore: 5 }] })).toHaveLength(1);
  });
});

describe("comment-only reviewer questions", () => {
  const rated = { id: "rated", name: "Rated", maxScore: 5 };
  const note = { id: "letter", name: "Letter of support", maxScore: 0, commentOnly: true };

  it("is left out of what gets scored", () => {
    expect(ratedCriteria([rated, note])).toEqual([rated]);
  });

  it("keeps only answered comment-only questions from this form", () => {
    expect(cleanQuestionComments([rated, note], [{ criteriaId: "letter", comment: "  Strong  " }]))
      .toEqual([{ criteriaId: "letter", comment: "Strong" }]);
    expect(cleanQuestionComments([rated, note], [{ criteriaId: "letter", comment: "   " }])).toEqual([]);
    expect(cleanQuestionComments([rated, note])).toEqual([]);
  });

  it("refuses comments aimed at a rated or unknown question", () => {
    expect(cleanQuestionComments([rated, note], [{ criteriaId: "rated", comment: "x" }])).toBeUndefined();
    expect(cleanQuestionComments([rated, note], [{ criteriaId: "other", comment: "x" }])).toBeUndefined();
  });

  it("shows staff the question wording", () => {
    const entries = questionCommentEntries({ criteria: [rated, note] }, { questionComments: [{ criteriaId: "letter", comment: "Strong" }] });
    expect(entries).toEqual([{ label: "Letter of support", comment: "Strong" }]);
  });

  it("does not need a score range", () => {
    expect(validateRubrics({ criteria: [rated, note] })).toEqual([]);
  });

  it("still needs at least one rated question on a category form", () => {
    const rubric = { id: "r", name: "A", categoryValues: ["np"], criteria: [note] };
    expect(validateRubrics({ criteria: [], categoryRubrics: [rubric] })).toHaveLength(1);
  });
});
