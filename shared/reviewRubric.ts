import type { CategoryRubric, QuestionComment, ScoringConfig, ScoringCriteria } from "../drizzle/schema";
import { DEFAULT_CATEGORY_FIELD_ID } from "./awardEligibility";

// A program has a default reviewer form and may add one per award category. An entry is
// reviewed on the form for its category, or the default form when none applies.

type RubricProgram = {
  scoringConfig?: ScoringConfig | null;
  settings?: { categoryFieldId?: string } | null;
};

type RubricEntry = { formData?: Record<string, unknown> | null };

export function resolveCriteria(program: RubricProgram | null | undefined, entry: RubricEntry | null | undefined): ScoringCriteria[] {
  const config = program?.scoringConfig;
  const fieldId = program?.settings?.categoryFieldId || DEFAULT_CATEGORY_FIELD_ID;
  const answer = entry?.formData?.[fieldId];
  const answers = (Array.isArray(answer) ? answer : [answer]).map(String);
  const rubric = config?.categoryRubrics?.find(item => item.categoryValues.some(value => answers.includes(value)));
  return rubric?.criteria ?? config?.criteria ?? [];
}

/** Every question across all reviewer forms, for labelling scores on staff reports. */
export function allCriteria(config: ScoringConfig | null | undefined): ScoringCriteria[] {
  return [...(config?.criteria ?? []), ...(config?.categoryRubrics ?? []).flatMap(rubric => rubric.criteria)];
}

/** Questions that take a score. Comment-only questions never count towards one. */
export function ratedCriteria(criteria: ScoringCriteria[]) {
  return criteria.filter(criterion => !criterion.commentOnly);
}

/** Keeps answered comment-only questions from this form; undefined if any id is not one. */
export function cleanQuestionComments(criteria: ScoringCriteria[], submitted: QuestionComment[] = []) {
  const allowed = new Set(criteria.filter(criterion => criterion.commentOnly).map(criterion => criterion.id));
  if (submitted.some(item => !allowed.has(item.criteriaId))) return undefined;
  return submitted
    .map(item => ({ criteriaId: item.criteriaId, comment: item.comment.trim() }))
    .filter(item => item.comment);
}

/** A reviewer's comment-only answers with their question wording, for staff screens. */
export function questionCommentEntries(config: ScoringConfig | null | undefined, score: { questionComments?: QuestionComment[] | null }) {
  const questions = allCriteria(config);
  return (score.questionComments ?? []).map(item => ({
    label: questions.find(question => question.id === item.criteriaId)?.name ?? item.criteriaId,
    comment: item.comment,
  }));
}

export function minScoreOf(criterion: Pick<ScoringCriteria, "minScore">) {
  return criterion.minScore ?? 0;
}

/** A new category form starting from an existing form, with its own question ids. */
export function createRubric(name: string, source: ScoringCriteria[], stamp: number): CategoryRubric {
  const id = `rubric_${stamp}`;
  return {
    id,
    name,
    categoryValues: [],
    criteria: source.map((criterion, index) => ({ ...criterion, id: `${id}_${index + 1}` })),
  };
}

/** Problems that would leave a reviewer form unusable; empty when valid. */
export function validateRubrics(config: ScoringConfig) {
  const problems: string[] = [];
  const claimed = new Map<string, string>();
  const checkQuestions = (name: string, criteria: ScoringCriteria[]) => {
    for (const criterion of criteria) {
      if (!criterion.name?.trim()) problems.push(`${name} has a question with no wording.`);
      if (!criterion.commentOnly && !(criterion.maxScore > minScoreOf(criterion))) {
        problems.push(`${name}: the highest score must be above the lowest score.`);
      }
    }
  };
  checkQuestions("The default reviewer form", config.criteria);
  for (const rubric of config.categoryRubrics ?? []) {
    const name = rubric.name?.trim() || "A category reviewer form";
    if (!rubric.name?.trim()) problems.push("A category reviewer form needs a name.");
    if (rubric.categoryValues.length === 0) problems.push(`${name} needs at least one category.`);
    if (rubric.criteria.length === 0) problems.push(`${name} needs at least one question.`);
    for (const value of rubric.categoryValues) {
      const other = claimed.get(value);
      if (other) problems.push(`${name} and ${other} use the same category.`);
      claimed.set(value, name);
    }
    if (rubric.criteria.length > 0 && ratedCriteria(rubric.criteria).length === 0) {
      problems.push(`${name} needs at least one rated question.`);
    }
    checkQuestions(name, rubric.criteria);
  }
  return problems;
}
