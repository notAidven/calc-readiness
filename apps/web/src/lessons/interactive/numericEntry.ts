/**
 * One numeric answer box, shared by every lesson widget that asks for a number.
 *
 * The boxes used to be `type="number"`, which draws the browser's spin arrows. Where the
 * answer space is small — and on these boards it usually is a single digit or a value a
 * dozen clicks away — the arrows walk a learner to the answer without doing the work the
 * slot exists to ask for. `MixedRadicandSolver` made that ruling for its own board first:
 *
 * > The field is plain text entry rather than `type="number"`. Every answer on both boards
 * > is a single digit, so a spinner let a learner arrow to `5` without factoring anything,
 * > which is the gate this slot exists to be.
 *
 * Plain entry costs something in return: the field will now accept `abc`, where the number
 * field would not have. `Number("abc")` is `NaN`, `NaN` misses every comparison, and the
 * miss branch prints the widget's subject-matter hint — answering a question the learner
 * never asked. So every converted box runs `readNumericEntry` BEFORE its comparison, and
 * says so in its own words. The read still counts as an attempt, so the reveal stays on
 * offer.
 */

export type NumericEntryMode = "integer" | "decimal";

/**
 * The attributes that make a box plain entry. Spread these rather than writing `type` out,
 * so no board can quietly grow its spinner back, and so `step` has nowhere to live.
 */
export const numericEntryProps = (mode: NumericEntryMode) =>
  ({
    type: "text",
    inputMode: mode === "decimal" ? "decimal" : "numeric",
    autoComplete: "off",
  }) as const;

/** Entry a learner can type but no comparison should see. */
export const NUMERIC_MISS = "This slot takes a number. Enter one and check again.";

/** The same, where only a whole number can be right. */
export const WHOLE_NUMBER_MISS =
  "This slot takes a whole number. Enter one and check again.";

/** Whichever of the two the box's own mode calls for. */
export const numericMiss = (mode: NumericEntryMode): string =>
  mode === "decimal" ? NUMERIC_MISS : WHOLE_NUMBER_MISS;

export type NumericEntryRead = { ok: true; value: number } | { ok: false };

/**
 * A typed number, or a miss. Follows the `parseInteger` helpers already scattered through
 * these widgets: the unicode minus sign a phone keyboard offers reads as a minus, and
 * stray spaces are the learner's typing rather than their answer.
 *
 * `decimal` mode takes a decimal point and nothing else, so `1/2` and `2e3` are misses:
 * these boxes ask for a plain reading, and the graded ASCII fields are elsewhere.
 */
export function readNumericEntry(typed: string, mode: NumericEntryMode): NumericEntryRead {
  const cleaned = typed
    .trim()
    .replace(/\u2212/g, "-")
    .replace(/\s+/g, "");
  const shape = mode === "decimal" ? /^[+-]?(\d+(\.\d*)?|\.\d+)$/ : /^[+-]?\d+$/;
  if (!shape.test(cleaned)) {
    return { ok: false };
  }
  const value = Number(cleaned);
  return Number.isFinite(value) ? { ok: true, value } : { ok: false };
}
