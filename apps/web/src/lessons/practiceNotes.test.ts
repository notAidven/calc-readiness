import {
  D1_PRACTICE_TEMPLATES,
  D2_PRACTICE_TEMPLATES,
  D3_PRACTICE_TEMPLATES,
  D4_PRACTICE_TEMPLATES,
  D5_PRACTICE_TEMPLATES,
  D7_PRACTICE_TEMPLATES,
  D8_PRACTICE_TEMPLATES,
  D9_PRACTICE_TEMPLATES,
  D10_PRACTICE_TEMPLATES,
} from "@cr/item-bank";
import { describe, expect, it } from "vitest";

import {
  getPracticeNpcNote,
  NUM_3_L3_NPC_LINE,
  NUM_S_OOO_NPC_LINE,
  PRACTICE_NPC_NOTES,
  TRG_3_SPECIAL_VALUE_NPC_LINE,
} from "./practiceNotes";

describe("getPracticeNpcNote", () => {
  it("shows the order-of-operations note only for NUM.S shapes that need it", () => {
    expect(getPracticeNpcNote("d1.num-s.l2")).toBe(NUM_S_OOO_NPC_LINE);
    expect(getPracticeNpcNote("d1.num-s.l3")).toBe(NUM_S_OOO_NPC_LINE);
    // Alternate shapes sharing the L1/L2 tiers do NOT need order of operations.
    expect(getPracticeNpcNote("d1.num-s.l1")).toBeUndefined();
    expect(getPracticeNpcNote("d1.num-s.l1b")).toBeUndefined();
    expect(getPracticeNpcNote("d1.num-s.l2b")).toBeUndefined();
    expect(getPracticeNpcNote("d1.num-s.l2c")).toBeUndefined();
  });

  it("shows the combine-like-terms note only for the NUM.3 expand-and-combine shape", () => {
    expect(getPracticeNpcNote("d1.num-3.l3")).toBe(NUM_3_L3_NPC_LINE);
    expect(getPracticeNpcNote("d1.num-3.l1b")).toBeUndefined();
    expect(getPracticeNpcNote("d1.num-3.l2b")).toBeUndefined();
    expect(getPracticeNpcNote("d1.num-3.l2c")).toBeUndefined();
  });

  it("shows the special-angle note only for the two TRG.3 shapes that need it", () => {
    // TRG.3's prereqs are empty and its TRG.2 edge is softened, so these two can be reached
    // by a learner who has never been shown an exact value.
    expect(getPracticeNpcNote("d9.trg3.exact-value-circle.l3")).toBe(
      TRG_3_SPECIAL_VALUE_NPC_LINE,
    );
    expect(getPracticeNpcNote("d9.trg3.coordinates.l3")).toBe(TRG_3_SPECIAL_VALUE_NPC_LINE);
    // The node's other shapes read a sign or a reference angle and need no value handed over.
    expect(getPracticeNpcNote("d9.trg3.quadrant-sign.l1")).toBeUndefined();
    expect(getPracticeNpcNote("d9.trg3.reference-angle.l2")).toBeUndefined();
  });

  it("returns undefined for unknown or missing templates", () => {
    expect(getPracticeNpcNote("d1.num-f.l1")).toBeUndefined();
    expect(getPracticeNpcNote(undefined)).toBeUndefined();
  });

  /**
   * Every note is keyed to a template that actually exists.
   *
   * Nothing else in the tree checks this. A note is looked up by `template_id` at render time
   * and silently resolves to `undefined` when the key matches nothing, so a typo, a renamed
   * template or a deleted shape leaves an entry sitting here attached to no item — indis-
   * tinguishable, from inside this file, from a note that reaches a learner every day. The
   * tests above are all reachability in the other direction: they ask what a KNOWN key
   * returns, which a dead key answers just as happily.
   *
   * The floor is what stops the sweep passing over a map that has emptied out, and the
   * per-domain count is what stops D9's two entries being quietly lost while D1's five keep
   * it green.
   */
  it("keys every note to a template the bank actually serves", () => {
    const served = new Set(
      [
        ...D1_PRACTICE_TEMPLATES,
        ...D2_PRACTICE_TEMPLATES,
        ...D3_PRACTICE_TEMPLATES,
        ...D4_PRACTICE_TEMPLATES,
        ...D5_PRACTICE_TEMPLATES,
        ...D7_PRACTICE_TEMPLATES,
        ...D8_PRACTICE_TEMPLATES,
        ...D9_PRACTICE_TEMPLATES,
        ...D10_PRACTICE_TEMPLATES,
      ].map((template) => template.template_id),
    );

    const keys = Object.keys(PRACTICE_NPC_NOTES);
    expect(keys.length, "the note map has emptied out").toBeGreaterThanOrEqual(7);
    expect(
      keys.filter((key) => key.startsWith("d9.")).length,
      "D9's cross-skill notes are still keyed",
    ).toBe(2);
    for (const key of keys) {
      expect(served.has(key), `${key} is a note keyed to no served template`).toBe(true);
    }
  });
});
