import {
  canonicalRawAnswer,
  DIAGNOSTIC_WALK_ITEM_PACK,
  wellFormedWrongRawAnswer,
} from "@cr/item-bank";
import { fireEvent, within } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";

/**
 * ANSWER A SERVED DIAGNOSTIC PROBE, whatever shape it asks for.
 *
 * Shared by the three suites that sit a whole administration — the diagnostic runner and the
 * completion ceremony's final check, on both its keyboard and its end-to-end route — because
 * they were each carrying a copy of "type the key into the one textbox", and that stopped
 * being true when the instrument widened past D1.
 *
 * Two things about it are load-bearing rather than convenient:
 *
 *  - **It fills EVERY text field on the card.** `rational_answer` (RAT.1) renders two, the
 *    simplified expression and the values the original denominator forbids, because the
 *    comparator grades both and rejects a bare string. A single-field helper submits
 *    `invalid_rational_answer`, which is `invalid_input`, which `isScorable` refuses — so the
 *    walk re-serves the identical question and the test spins until its guard trips rather
 *    than failing on the thing that is wrong.
 *  - **A wrong answer is WELL-FORMED.** Same reason in the other direction: an unparseable
 *    answer is a fault, faults are re-served, and a "get it wrong" helper built on garbage
 *    models a learner who is stuck rather than one who missed.
 *
 * Both shapes come from the item bank's own reconstruction (`canonicalRawAnswer` /
 * `wellFormedWrongRawAnswer`) rather than from a copy here, so a new answer type is answerable
 * in every suite the moment the bank knows how to answer it.
 */

const ITEM_BY_ID = new Map(
  DIAGNOSTIC_WALK_ITEM_PACK.map((entry) => [entry.item_version_id, entry] as const),
);

/** The authored item behind a served probe. Throws rather than silently answering blank. */
export function probeItem(itemVersionId: string) {
  const entry = ITEM_BY_ID.get(itemVersionId);
  if (!entry) {
    throw new Error(`served an item the diagnostic pack does not carry: ${itemVersionId}`);
  }
  return entry;
}

/** Type a raw answer into a card's field(s), dispatching on the payload's shape. */
export function fillProbeCard(card: HTMLElement, answer: unknown): void {
  const fields = within(card).getAllByRole("textbox");
  const first = fields[0];
  if (!first) {
    throw new Error("the question card has no answer field");
  }
  if (typeof answer === "string") {
    fireEvent.change(first, { target: { value: answer } });
    return;
  }
  const payload = (answer ?? {}) as { expression?: unknown; excluded_values?: unknown };
  fireEvent.change(first, { target: { value: String(payload.expression ?? "") } });
  const second = fields[1];
  if (second) {
    const exclusions = Array.isArray(payload.excluded_values)
      ? payload.excluded_values.join(", ")
      : String(payload.excluded_values ?? "");
    fireEvent.change(second, { target: { value: exclusions } });
  }
}

/**
 * Answer the one visible probe card and submit it.
 *
 * `cardSelector` differs by surface (`.diagnostic-item` for the diagnostic,
 * `.completion__item` for the ending), which is the only thing the two hosts disagree about.
 */
export async function answerProbeCard(
  user: UserEvent,
  cardSelector: string,
  opts: { correct?: boolean } = {},
): Promise<string> {
  const card = document.querySelector<HTMLElement>(cardSelector);
  if (!card) {
    throw new Error(`expected a question card at ${cardSelector}`);
  }
  const id = card.getAttribute("data-item-version-id") ?? "";
  const entry = probeItem(id);
  fillProbeCard(
    card,
    opts.correct === false
      ? wellFormedWrongRawAnswer(entry)
      : canonicalRawAnswer(entry.answer),
  );
  await user.click(within(card).getByRole("button", { name: /submit answer/i }));
  return id;
}

/** The visible probe card's item-version id, or null once the surface has moved on. */
export function currentProbeId(cardSelector: string): string | null {
  return document.querySelector(cardSelector)?.getAttribute("data-item-version-id") ?? null;
}
