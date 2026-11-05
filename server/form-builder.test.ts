import { describe, it, expect } from "vitest";
import type { FormField } from "../drizzle/schema";
import {
  assignOptionValues,
  canMove,
  dropField,
  findEmptyChoiceFields,
  getBlockRange,
  moveField,
  normalizeOptions,
  validateFormFields,
} from "../shared/formBuilder";

const q = (id: string): FormField => ({ id, type: "text", label: id });
const h = (id: string): FormField => ({ id, type: "heading", label: id });
const ids = (fields: FormField[]) => fields.map(field => field.id);

// intro, [A: a1 a2], [B: b1], [C: c1 c2]
const form = () => [q("intro"), h("A"), q("a1"), q("a2"), h("B"), q("b1"), h("C"), q("c1"), q("c2")];

describe("form builder reordering", () => {
  it("treats a heading and its questions as one block", () => {
    expect(getBlockRange(form(), 1)).toEqual([1, 4]);
    expect(getBlockRange(form(), 6)).toEqual([6, 9]);
    expect(getBlockRange(form(), 2)).toEqual([2, 3]);
  });

  it("moves a question one step, crossing into the neighbouring section", () => {
    expect(ids(moveField(form(), 3, "down"))).toEqual(["intro", "A", "a1", "B", "a2", "b1", "C", "c1", "c2"]);
    expect(ids(moveField(form(), 2, "up"))).toEqual(["intro", "a1", "A", "a2", "B", "b1", "C", "c1", "c2"]);
  });

  it("moves a whole section past its neighbour, keeping its questions in order", () => {
    expect(ids(moveField(form(), 1, "down"))).toEqual(["intro", "B", "b1", "A", "a1", "a2", "C", "c1", "c2"]);
    expect(ids(moveField(form(), 6, "up"))).toEqual(["intro", "A", "a1", "a2", "C", "c1", "c2", "B", "b1"]);
  });

  it("never moves a section above questions that precede the first heading", () => {
    expect(canMove(form(), 1, "up")).toBe(false);
    expect(canMove(form(), 6, "down")).toBe(false);
    expect(canMove(form(), 0, "up")).toBe(false);
    expect(moveField(form(), 1, "up")).toEqual(form());
  });

  it("drags a question onto another position", () => {
    expect(ids(dropField(form(), 2, 7))).toEqual(["intro", "A", "a2", "B", "b1", "C", "c1", "a1", "c2"]);
    expect(ids(dropField(form(), 8, 0))).toEqual(["c2", "intro", "A", "a1", "a2", "B", "b1", "C", "c1"]);
  });

  it("drags a section only to section boundaries", () => {
    // Dropping A onto a question inside C places it after C, not inside it.
    expect(ids(dropField(form(), 1, 7))).toEqual(["intro", "B", "b1", "C", "c1", "c2", "A", "a1", "a2"]);
    // Dropping C onto a question inside A places it before A.
    expect(ids(dropField(form(), 6, 3))).toEqual(["intro", "C", "c1", "c2", "A", "a1", "a2", "B", "b1"]);
    // Dropping onto the intro question resolves to the first section.
    expect(ids(dropField(form(), 4, 0))).toEqual(["intro", "B", "b1", "A", "a1", "a2", "C", "c1", "c2"]);
    // Dropping a section onto itself changes nothing.
    expect(dropField(form(), 1, 2)).toEqual(form());
  });

  it("keeps field ids, required rules and conditions untouched", () => {
    const fields: FormField[] = [
      h("A"),
      { id: "category", type: "select", label: "Category", required: true, options: [{ value: "x", label: "X" }] },
      h("B"),
      { id: "detail", type: "textarea", label: "Detail", conditionalOn: { fieldId: "category", value: "x" } },
    ];
    const moved = moveField(fields, 2, "up");
    expect(moved.find(field => field.id === "detail")).toEqual(fields[3]);
    expect(moved.find(field => field.id === "category")).toEqual(fields[1]);
  });
});

describe("form builder compatibility with existing forms", () => {
  it("converts plain string choices without changing their stored value", () => {
    const legacy = [{ id: "a", type: "select", label: "A", options: ["Yes", "No"] }] as unknown as FormField[];
    const [field] = normalizeOptions(legacy);
    expect(field.options).toEqual([{ value: "Yes", label: "Yes" }, { value: "No", label: "No" }]);
    expect(validateFormFields([field])).toEqual([]);
  });

  it("leaves forms that already use value/label choices untouched", () => {
    const fields: FormField[] = [{ id: "a", type: "radio", label: "A", options: [{ value: "x", label: "X" }] }];
    expect(normalizeOptions(fields)[0]).toBe(fields[0]);
  });
});

describe("form builder choice options", () => {
  it("keeps existing option values when labels change", () => {
    const options = assignOptionValues([{ value: "small_business", label: "Renamed Small Business" }]);
    expect(options[0].value).toBe("small_business");
  });

  it("gives new options unique values derived from their labels", () => {
    const options = assignOptionValues([
      { value: "test_a", label: "Test A" },
      { value: "", label: "Test A" },
      { value: "", label: "Ünïque & Co." },
      { value: "", label: "!!!" },
    ]);
    expect(options.map(option => option.value)).toEqual(["test_a", "test_a_2", "unique_co", "option"]);
  });

  it("warns about, but does not block, a choice question awaiting its categories", () => {
    const pending: FormField = { id: "a", type: "select", label: "A", options: [] };
    expect(validateFormFields([pending])).toEqual([]);
    expect(findEmptyChoiceFields([pending, q("b")])).toEqual([pending]);
  });

  it("rejects blank or duplicate choices", () => {
    expect(validateFormFields([{ id: "a", type: "radio", label: "A", options: [{ value: "", label: " " }] }])).toHaveLength(1);
    expect(validateFormFields([
      { id: "a", type: "checkbox", label: "A", options: [{ value: "x", label: "X" }, { value: "", label: "x" }] },
    ])).toHaveLength(1);
    expect(validateFormFields([{ id: "a", type: "select", label: "A", options: [{ value: "x", label: "X" }] }])).toEqual([]);
    expect(validateFormFields([q("a"), h("b")])).toEqual([]);
  });
});
