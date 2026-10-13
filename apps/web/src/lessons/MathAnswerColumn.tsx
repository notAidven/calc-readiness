import type { ReactElement, ReactNode } from "react";

import type { MathKey } from "./answerFormat";
import { MathPreview } from "./MathPreview";

/**
 * A math answer field with the two things its item owes stacked under it: the notation line
 * that says how the answer is typed, and the preview that reads back what was typed.
 *
 * The `<input>` stays with the surface that owns it and comes in as `children`, because
 * the practice card and the check-your-understanding card give their fields different
 * ids, describedby wiring and placeholders, and none of that belongs here. What is shared
 * is the column and the order of the two aids.
 *
 * **Which aid appears is TWO decisions, and this component takes them as two props.** It
 * used to take one: `keys.length === 0` returned the bare field, so the preview shipped and
 * un-shipped with the notation row. That coupling is what left the notation-carrying answers
 * — an interval, a roster, a set-builder domain — as the only fields in the product with no
 * reading of what the learner had written, because they are precisely the fields whose form
 * is the graded skill and so must not be handed their own notation. `keys` is still the
 * notation row from `answerKeypad` / `cfuKeypad`; `preview` is a separate answer from
 * `previewsNotation`, and the note on that function is where the two rules are stated side
 * by side.
 *
 * **An item that wants neither gets the bare field back, unchanged.** Not a column with an
 * empty aid in it: the same single element the surface rendered before this existed, so a
 * choose-one field keeps its exact geometry and the placeholder widths measured against it
 * stay true.
 *
 * ## The INSERT NOTATION strip used to be here, and is gone
 *
 * `MathKeypad` drew a `<fieldset>` labelled "Insert notation" on the field's bottom edge, a
 * caption plus one to four 44px buttons that spliced plain ASCII at the caret. It was removed
 * on the product lead's call, and the measurement that made removing it safe is in
 * `loadBearingNotation.browser.test.tsx`: every key it offered types a character a keyboard
 * already has, and the one served cohort whose grader genuinely CANNOT read the answer without
 * one (`d8.el5.condense-sum.l2`, whose `log(m*a*q)` is `unknown_symbol` written `log(maq)`) has
 * that star named by its own line.
 *
 * `keys` is still the prop, and the dispatch behind it is untouched. It is read now for what it
 * always meant — "this item's answer needs notation a learner cannot guess" — and it decides
 * whether the notation LINE is drawn rather than which buttons appear in a strip. What it no
 * longer decides is the preview: an interval field has no notation to hand the learner and
 * still owes them a reading of the brackets they wrote.
 *
 * ## Why the notation line exists, given the field already has a placeholder
 *
 * A placeholder is gone the moment the learner types, and the rule it carries is needed for as
 * long as they are typing: `Use ^ for a power: a^2 + 3a` is exactly the sort of thing to want on
 * the second character, not only on the zeroth. So the same string is repeated under the field
 * once the field is non-empty — the one moment the placeholder stops saying it — and the row
 * holds its height either way so nothing shifts as it appears.
 *
 * It is the item's OWN placeholder string, not a second wording of it. One dispatch decides what
 * an item's notation is (`answerFormat.ts`), one leak sweep grades every one of those strings
 * against every item it is shown to (`answerFormat.test.ts`), and a second copy of the same
 * advice in different words is how a field comes to promise two notations.
 *
 * ## The two aids are not one unit, and the column's spacing says so
 *
 * The notation line is INPUT guidance and the preview is OUTPUT. The line is drawn quiet and
 * tight under the field it belongs to; the preview is the only thing in the column with clear
 * air above it. There is no `gap` on this element: the separation is the preview's own top
 * margin, in `styles.css`, so which pair is joined and which is split is stated once.
 */
export function MathAnswerColumn({
  keys,
  preview,
  value,
  hint,
  children,
}: {
  /**
   * The item's notation row, from `answerKeypad`. Its LENGTH is what this reads: a non-empty
   * row means the item's answer carries notation a learner cannot guess, which is what earns
   * the notation line.
   */
  keys: readonly MathKey[];
  /**
   * Whether the live reading is drawn under the field — `previewsNotation`'s answer for this
   * item, which is NOT `keys.length > 0`. See the note above.
   */
  preview: boolean;
  value: string;
  /**
   * The item's own notation line — the same string its field shows as a placeholder. Omitted
   * by a caller with nothing to say, in which case the column is the field and the preview.
   */
  hint?: string;
  children: ReactNode;
}): ReactElement {
  const keyed = keys.length > 0;
  if (!keyed && !preview) {
    return <>{children}</>;
  }

  const typing = value.trim().length > 0;

  return (
    <div className="cr-math-answer">
      {children}
      {keyed && hint && (
        /*
         * `aria-hidden`, and it has to be: this is the field's own placeholder repeated, and
         * the field already carries it as its accessible description. Exposing the copy would
         * have a screen reader read the same sentence twice, once from the input and once from
         * the text under it — the mistake `MathKeypad`'s caption documented and avoided the
         * same way. The learner who needs it in words has it from the field.
         */
        <p className="cr-math-notation" data-showing={typing} aria-hidden="true">
          {typing ? hint : null}
        </p>
      )}
      {preview && <MathPreview value={value} />}
    </div>
  );
}
