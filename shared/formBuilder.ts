import type { FormField } from "../drizzle/schema";
import { conditionValues } from "./formLogic";

// Form builder helpers. A "heading" field starts a section: every field after it,
// up to the next heading, belongs to that section (this is how the public form
// builds its steps). Moving a section therefore moves its heading together with
// its questions, and questions before the first heading stay at the top.

export const CHOICE_FIELD_TYPES: FormField["type"][] = ["select", "radio", "checkbox"];

export function isChoiceField(field: Pick<FormField, "type">) {
  return CHOICE_FIELD_TYPES.includes(field.type);
}

/** Older forms may store a choice as a plain string; the builder always edits { value, label }. */
export function normalizeOptions(fields: FormField[]): FormField[] {
  return fields.map(field => {
    if (!field.options?.some(option => typeof option === "string")) return field;
    const options = (field.options as (string | { value: string; label: string })[]).map(option =>
      typeof option === "string" ? { value: option, label: option } : option
    );
    return { ...field, options };
  });
}

/** Index range [start, end) of the block that moves with the field at `index`. */
export function getBlockRange(fields: FormField[], index: number): [number, number] {
  if (fields[index]?.type !== "heading") return [index, index + 1];
  let end = index + 1;
  while (end < fields.length && fields[end].type !== "heading") end++;
  return [index, end];
}

/** Start indexes of every section (heading) in order. */
function sectionStarts(fields: FormField[]) {
  return fields.flatMap((field, index) => (field.type === "heading" ? [index] : []));
}

function moveRange(fields: FormField[], [start, end]: [number, number], insertAt: number) {
  const block = fields.slice(start, end);
  const rest = [...fields.slice(0, start), ...fields.slice(end)];
  const target = insertAt > start ? insertAt - block.length : insertAt;
  return [...rest.slice(0, target), ...block, ...rest.slice(target)];
}

/** Whether the field at `index` can move one step up/down. */
export function canMove(fields: FormField[], index: number, direction: "up" | "down") {
  if (fields[index]?.type !== "heading") {
    return direction === "up" ? index > 0 : index < fields.length - 1;
  }
  const starts = sectionStarts(fields);
  const position = starts.indexOf(index);
  return direction === "up" ? position > 0 : position < starts.length - 1;
}

/**
 * Move a question one position, or a whole section past its neighbouring section.
 * A question moved past a heading joins the adjacent section.
 */
export function moveField(fields: FormField[], index: number, direction: "up" | "down") {
  if (!canMove(fields, index, direction)) return fields;
  if (fields[index].type !== "heading") {
    const next = [...fields];
    const swap = direction === "up" ? index - 1 : index + 1;
    [next[index], next[swap]] = [next[swap], next[index]];
    return next;
  }
  const range = getBlockRange(fields, index);
  if (direction === "up") {
    const starts = sectionStarts(fields);
    return moveRange(fields, range, starts[starts.indexOf(index) - 1]);
  }
  return moveRange(fields, range, getBlockRange(fields, range[1])[1]);
}

/**
 * Drag-and-drop: move the field (or section) at `from` onto the position of `to`.
 * Sections only land on section boundaries, so they never split another section.
 */
export function dropField(fields: FormField[], from: number, to: number) {
  if (from === to || to < 0 || to >= fields.length) return fields;
  if (fields[from].type !== "heading") {
    const next = [...fields];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  }
  const range = getBlockRange(fields, from);
  if (to >= range[0] && to < range[1]) return fields;
  const starts = sectionStarts(fields);
  // The section containing the drop target; targets above the first heading
  // resolve to the first section.
  const targetStart = [...starts].reverse().find(start => start <= to) ?? starts[0];
  if (targetStart === range[0]) return fields;
  const insertAt = to < from ? targetStart : getBlockRange(fields, targetStart)[1];
  return moveRange(fields, range, insertAt);
}

function slugify(label: string) {
  return label
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

/**
 * Give every option without a stored value a permanent one derived from its label.
 * Existing values are never changed, so relabelling an option keeps earlier answers
 * pointing at the same choice.
 */
export function assignOptionValues(options: { value: string; label: string }[]) {
  const used = new Set(options.map(option => option.value).filter(Boolean));
  return options.map(option => {
    if (option.value) return option;
    const base = slugify(option.label) || "option";
    let value = base;
    for (let n = 2; used.has(value); n++) value = `${base}_${n}`;
    used.add(value);
    return { ...option, value };
  });
}

/**
 * Choice questions with nothing to pick yet. These are allowed, so a form whose final
 * categories are still pending can keep being saved, but staff should be told.
 */
export function findEmptyChoiceFields(fields: FormField[]) {
  return fields.filter(field => isChoiceField(field) && !field.options?.length);
}

/** Problems that would make the saved form unusable; empty when it is valid. */
export function validateFormFields(fields: FormField[]) {
  const problems: string[] = [];
  fields.forEach((field, index) => {
    const name = field.label?.trim() || `Field ${index + 1}`;
    if (field.type === "instructions") {
      if (!field.content?.trim()) problems.push(`${name} needs instruction text.`);
    } else if (!field.label?.trim()) {
      problems.push(`Field ${index + 1} needs a label.`);
    }
    if (field.conditionalOn && conditionValues(field).length === 0) {
      problems.push(`"${name}" is set to show only for certain answers, but none are chosen.`);
    }
    if (!isChoiceField(field)) return;
    const options = field.options ?? [];
    if (options.some(option => !option.label.trim())) problems.push(`"${name}" has a choice with no label.`);
    const labels = options.map(option => option.label.trim().toLowerCase());
    if (new Set(labels).size !== labels.length) problems.push(`"${name}" has duplicate choices.`);
  });
  return problems;
}
