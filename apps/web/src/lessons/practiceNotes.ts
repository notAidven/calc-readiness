/** Advisor line while answering a NUM.S L2/L3 practice item (signed ops + multiply-before-add). */
export const NUM_S_OOO_NPC_LINE =
  "This question requires **order of operations**, which will be covered more thoroughly in a future lesson. For now, just know to multiply before adding.";

/**
 * Advisor line for the NUM.S L3 shape that DIVIDES (`d1.num-s.l3b`).
 *
 * {@link NUM_S_OOO_NPC_LINE} closes on "multiply before adding", which is the whole of what
 * the shapes it is keyed to need. This shape's chain is a product feeding a quotient, so that
 * line would be true and still leave the learner without the rule that decides the answer:
 * multiplication and division are one tier taken left to right. Hence a second line rather
 * than a reused one.
 */
export const NUM_S_OOO_DIV_NPC_LINE =
  "This question requires **order of operations**, which will be covered more thoroughly in a future lesson. For now, just know that multiplying and dividing both come before adding, and that when they sit side by side you work through them from left to right.";

/** Advisor line while answering a NUM.3 L3 practice item (expand + combine like terms). */
export const NUM_3_L3_NPC_LINE =
  "This question requires **combining like terms**, which is covered in a future lesson. For now you can leave the variable terms uncombined (for example $2x + 4x$), but do add the plain numbers together.";

/**
 * Advisor line for the two TRG.3 shapes that need a special-angle value before the unit
 * circle can be read.
 *
 * TRG.3's prereq list is empty and the skill graph says so on purpose: it carries a SOFTENED
 * TRG.2 edge, recorded as "conceptual precursor, not hard gate". So a learner can legitimately
 * arrive at these two shapes never having seen that $\sin 30^{\circ} = 1/2$, and the gate that
 * would otherwise have taught them is the one the graph deliberately removed. That is exactly
 * the gap this mechanism exists for.
 *
 * It hands over the one value the shape turns on rather than the whole table, because the
 * graded skill here is the SIGN and the coordinate reading, not the recall.
 */
export const TRG_3_SPECIAL_VALUE_NPC_LINE =
  "This question needs an **exact value from a special angle**, which is covered in a lesson you have not been gated through. For now, take the three you need as given: $\\sin 30^{\\circ} = \\dfrac{1}{2}$, $\\sin 45^{\\circ} = \\dfrac{\\sqrt{2}}{2}$ and $\\sin 60^{\\circ} = \\dfrac{\\sqrt{3}}{2}$, with the cosines the same three values in the opposite order. What this question is really asking for is the sign and the coordinate, not the recall.";

/**
 * Cross-skill advisor notes keyed by `template_id` (NOT by node/difficulty): only
 * the specific problem shapes that genuinely need another node's concept show a
 * warning, so alternate shapes sharing a difficulty tier (e.g. the NUM.S three-term
 * sum or absolute-value items) do not surface a false dependency line.
 */
export const PRACTICE_NPC_NOTES: Record<string, string> = {
  "d1.num-s.l2": NUM_S_OOO_NPC_LINE, // (±a) + (±b) x (±c): multiply before add
  "d1.num-s.l3": NUM_S_OOO_NPC_LINE, // two signed products, then add
  "d1.num-s.l3b": NUM_S_OOO_DIV_NPC_LINE, // signed product feeding a quotient, then add
  "d1.num-3.l3": NUM_3_L3_NPC_LINE, // expand two products, then combine like terms
  "d1.num-3.l3b": NUM_3_L3_NPC_LINE, // opposite factor over a difference, same grading profile
  "d9.trg3.exact-value-circle.l3": TRG_3_SPECIAL_VALUE_NPC_LINE, // exact value off the circle
  "d9.trg3.coordinates.l3": TRG_3_SPECIAL_VALUE_NPC_LINE, // one named coordinate of the point
};

/** The cross-skill advisor note for a practice item's template, if any. */
export function getPracticeNpcNote(templateId: string | undefined): string | undefined {
  return templateId ? PRACTICE_NPC_NOTES[templateId] : undefined;
}
