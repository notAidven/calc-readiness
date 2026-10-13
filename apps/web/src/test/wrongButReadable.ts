/**
 * A WRONG ANSWER THE GRADER CAN READ, for the suites that drive a crisis or a ceremony to a
 * deliberate miss.
 *
 * ## What this replaced, and why it mattered
 *
 * Eleven suites fabricated their wrong answer by appending digits to the item's answer key:
 * `` `${key}00000+1` ``. For a plain number that is a parseable miss. For several other shapes it
 * is garbage: a solution set `{-1, 4}` becomes `{-1, 4}00000+1` and a point `(6, -7)` becomes
 * `(6, -7)00000+1`, and the checker answers `invalid_input` on both.
 *
 * Those suites passed anyway, because the surfaces they drive banked `.client_correct` and an
 * unreadable answer arrived as `false`. So they were driving the swallow and green over it — which
 * is why fixing the swallow turned sixteen of their assertions red, and why the right response was
 * to give them a real miss rather than to loosen anything.
 *
 * `wellFormedWrongRawAnswer` in `@cr/item-bank` is the same idea one layer down, used by the
 * diagnostic's dev skip for the same stated reason: *"an unparseable answer is a FAULT, the walk
 * re-serves the item instead of scoring it, and a skip built on garbage would hang on question
 * one."* This is its string-only sibling, taking the KEY rather than the frozen item, because that
 * is what every one of those eleven call sites already has in hand.
 *
 * `wrongButReadable.test.ts` grades the result of this against every item the crisis pools can
 * serve and requires `incorrect` on all of them, so "readable" is measured rather than asserted.
 */

/** A braced roster: `{-1, 4}`, `{8/3}`. */
const ROSTER = /^\{.*\}$/;
/** A bracketed pair, which is a point or an interval depending on the item. */
const PAIR = /^[([].*,.*[)\]]$/;
/** A plain value: an integer, a decimal or a bare fraction. */
const PLAIN = /^[+-]?\d+(\.\d+)?(\s*\/\s*[+-]?\d+)?$/;

export function wrongButReadable(answerKey: string): string {
  const key = answerKey.trim();
  if (ROSTER.test(key)) {
    // A roster of one value nothing keys, so it is a miss rather than an incomplete set.
    return "{123456}";
  }
  if (PAIR.test(key)) {
    // Reads as a point OR an interval, whichever the item wants, and answers neither.
    return "(123456, 123457)";
  }
  if (PLAIN.test(key) || key === "") {
    return "999999";
  }
  if (/^[a-z][a-z ]*$/i.test(key)) {
    /*
     * A choose-one answer. Every word-keyed item in the bank is `multiple_choice`, which is graded
     * by an exact `===`, so any word that is not the key is a miss. `neither` is itself a served
     * key on two templates (`d6.fun9.parity`, `d7.lf2.pair`), so those get the other word rather
     * than their own answer handed back to them.
     */
    return key.toLowerCase() === "neither" ? "none" : "neither";
  }
  // An expression, an equation form, a radical, a log identity: parenthesised and shifted, which
  // parses and is off by one under every simplification profile. A fixed literal would not be,
  // since an expression key may legally be any shape.
  return `(${key}) + 1`;
}
