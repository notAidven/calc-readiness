/**
 * A missed binary row keeps both of its options and marks them. It does not collapse.
 *
 * The defect, on RAD.1's perfect-root board: a wrong tap replaced both buttons with the words
 * "Actually stays a radical" and a banner reading "Not quite. Nothing whole times itself gives
 * 32, so that row is locked as a miss." Two harms, and the colours were neither of them.
 *
 *  1. THE COMPARISON WAS THE TEACHING, and removing the buttons threw it away. "sqrt(32) stays
 *     a radical" instructs only while it sits beside "you said it comes out whole". A verdict
 *     in words TELLS; two options with one marked right and one marked as the miss SHOW.
 *  2. THE ANSWERED ROW BECAME STRUCTURALLY UNLIKE the unanswered ones, so a finished row read
 *     as broken rather than as done.
 *
 * The two claims below are therefore separate assertions and both are made: the options are
 * still in the DOM, AND they carry two different treatments. Either one alone passes on a
 * board that is still half wrong.
 *
 * ## The colour assertions are all paired with non-colour ones
 *
 * `CIVIC` and `BRICK` are the correctness channel and they report on the learner's ACTION, so
 * the call that was right on a row the learner MISSED cannot be green: they did not pick it.
 * It is `SIGNAL_DEEP`, dashed where a verdict is solid, and it names itself. A palette edit
 * that put green back would be caught by the colour half; a "fix" that shuffled hues and left
 * the states indistinguishable to a colourblind learner would be caught by the other.
 */

import { afterEach, expect, test } from "vitest";

import { visualsBuiltOn } from "./kindFamily";
import { FIGURE_CONTENT_CAP } from "./readingWidths";
import { type Harness, mount, waitFor } from "./testHarness";
import { LessonVisual, type LessonVisualId } from "./visuals";

import "../styles.css";

/**
 * Every widget built on the binary-row kind, which is what makes the mechanic one
 * implementation rather than five. READ OFF THE SOURCES rather than listed: the other four
 * copies of this pattern (one in D1, three in D5, all in another owner's lane) are expected to
 * adopt it, and a written-down list plus a count to bump is exactly how the `SpotTheError`
 * sweep came to cover two of its five widgets while claiming to cover all of them.
 */
const BINARY_ROW_VISUALS: readonly LessonVisualId[] = visualsBuiltOn("BinaryRowSort");

/**
 * A floor at the population the kind actually has, and deliberately not a ceiling.
 *
 * It sat at one, which was honest while RAD.1 was the only adopter and became very nearly
 * nothing once there were ten: a derivation that silently returned a single widget would have
 * met it, and every `test.each` in this file would have reported green over one board while
 * claiming a family. A floor's job is to fail when the sweep shrinks, and a floor nine below the
 * population cannot do that job.
 *
 * Twelve is what `visualsBuiltOn` finds today: D9's six sorters, D6's function-mapping and
 * one-to-one boards, plus LIN.4's perfect-square board, LIN.5's compound-band board, RAD.1's
 * perfect-root board and D5's tolerance board. Raising it is what makes losing an adopter fail
 * here, and it stays a FLOOR so the thirteenth joins the sweep with no edit.
 *
 * It read ten until D6's two adopters landed, and nothing went red: a floor two under its
 * population still catches a derivation that returns nothing. That is the whole of what it was
 * still doing, though — a floor below its population cannot report an adopter leaving, which is
 * the reason this number is not one any more.
 */
const ADOPTER_FLOOR = 12;

/**
 * The six D9 sorters, named, because a floor constrains SIZE and not SHAPE.
 *
 * Ten of anything satisfies the number above, so it would go on passing with every board this
 * branch is about gone from the derivation and ten unrelated adopters in their place. These are
 * asserted present by name, and the population with them removed is floored separately, so
 * neither half of the family can quietly swallow the other.
 */
const D9_SORTERS: readonly LessonVisualId[] = [
  "trg-window-sorter",
  "trg-secant-sorter",
  "trg-quadrant-sorter",
  "trg-evenodd-sorter",
  "trg-coterminal-sorter",
  "trg-compose-sorter",
] as LessonVisualId[];

/**
 * LIN.4, LIN.5, RAD.1, D5's tolerance board and D6's two: the adopters outside this branch's
 * lane. Four when D9 landed, and six since D6 did — moved with the floor above, because a floor
 * that under-counts the half of the family it is about can no longer report that half shrinking,
 * which is the only reason it is here.
 */
const OUTSIDE_D9_FLOOR = 6;

/**
 * The two rows every assertion below needs, named by POSITION rather than by expression.
 *
 * They used to be RAD.1's own `\sqrt{81}` and `\sqrt{24}`, which made the sweep's derived
 * population a promise it could not keep: the population grew from the sources and the driver
 * still looked for one adopter's rows, so the second adopter to land failed with "no row for
 * \sqrt{81}" out of a helper rather than by name. Position works for every adopter and asks
 * nothing of the content, and the precondition it rests on is asserted rather than assumed by
 * the first test in the file.
 */
const RIGHT_IS_FIRST_ROW = 0;
const RIGHT_IS_SECOND_ROW = 1;

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

function all<T extends Element>(root: ParentNode, selector: string): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

/** A theme token as the browser resolves it, for comparing against a border. */
function token(name: string): string {
  const probe = document.createElement("div");
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved;
}

async function board(id: LessonVisualId): Promise<HTMLElement> {
  h = mount(<LessonVisual id={id} />);
  const host = h.host;
  host.style.width = `${FIGURE_CONTENT_CAP}px`;
  await waitFor(() => host.querySelector(".lesson-interactive") !== null, `${id} mounts`);
  return host.querySelector(".lesson-interactive") as HTMLElement;
}

/** The `.lesson-classify__item` at a position on the board. */
function rowAt(widget: HTMLElement, index: number): HTMLElement {
  const rows = all<HTMLElement>(widget, ".lesson-classify__item");
  const found = rows[index];
  if (found === undefined) {
    throw new Error(`board has ${rows.length} rows, so there is no row ${index}`);
  }
  return found;
}

function chips(item: HTMLElement): HTMLButtonElement[] {
  return all<HTMLButtonElement>(item, ".lesson-interactive__chip");
}

/**
 * Wait for the row to settle, and do it WITHOUT reading the options.
 *
 * That property is what matters and it used to come from the check column, which filled in on
 * any settled row whatever the row then did with its buttons. The column is gone — it was a
 * second copy of a call the options already carry — so the row states its own settled-ness in
 * `data-settled` instead, and this waits on that. Waiting on the buttons would make the
 * collapsing implementation time out here, so the red would be a timeout in a helper rather
 * than the two claims below failing by name, and a test whose red does not name the defect is
 * a test nobody can read.
 */
async function settle(item: HTMLElement, id: string): Promise<HTMLButtonElement[]> {
  await waitFor(() => item.dataset.settled === "true", `${id}: the row never settled`);
  const after = chips(item);
  expect(after.length, `${id}: a settled row dropped one of its two options`).toBe(2);
  return after as HTMLButtonElement[];
}

/**
 * Every tick or cross drawn on the row, and whether each one is inside one of the two options.
 *
 * The count is the point. A settled row makes ONE call, so it may carry one mark per option it
 * has marked and nothing else; the verdict column outside the options put a second copy of the
 * same call in a fourth position, so a correct row showed two ticks for one answer and a missed
 * row showed three marks in two valences.
 */
function verdictGlyphs(item: HTMLElement): { glyph: string; inOption: boolean }[] {
  const row = item.querySelector(".lesson-classify__row") as HTMLElement;
  const found: { glyph: string; inOption: boolean }[] = [];
  const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
  while (walker.nextNode() !== null) {
    const text = walker.currentNode as Text;
    const inOption = text.parentElement?.closest(".lesson-interactive__chip") != null;
    for (const glyph of text.data) {
      if (glyph === "\u2713" || glyph === "\u2717") {
        found.push({ glyph, inOption });
      }
    }
  }
  return found;
}

/** What one option is saying in the channels that are NOT colour. */
function carriers(chip: HTMLButtonElement): {
  mark: string;
  name: string;
  border: string;
  glyph: string;
} {
  return {
    mark: chip.getAttribute("data-mark") ?? "",
    name: chip.getAttribute("aria-label") ?? "",
    border: getComputedStyle(chip).borderTopStyle,
    glyph: (chip.querySelector(".lesson-classify__mark")?.textContent ?? "").trim(),
  };
}

function borderColour(chip: HTMLButtonElement): string {
  return getComputedStyle(chip).borderTopColor;
}

/**
 * The precondition every test below rests on: on each adopter's OPENING board, the first row's
 * right call is the first option and the second row's is the second.
 *
 * Asserted rather than assumed, because it is the whole reason the driver may name its rows by
 * position. It is also the one claim in this file that is about the CONTENT of a board rather
 * than about the kind, so an adopter whose opening board happened to answer both rows the same
 * way fails here, by name, instead of making one of the assertions below silently test the same
 * case twice.
 */
test.each(BINARY_ROW_VISUALS)(
  "%s: the opening board answers its first two rows opposite ways",
  async (id) => {
    const widget = await board(id);
    expect(
      all(widget, ".lesson-classify__item").length,
      `${id}: the board has fewer than two rows`,
    ).toBeGreaterThan(1);

    const first = rowAt(widget, RIGHT_IS_FIRST_ROW);
    chips(first)[0]?.click();
    const firstSettled = await settle(first, id);
    expect(
      carriers(firstSettled[0] as HTMLButtonElement).mark,
      `${id}: the first option is not the right call on row ${RIGHT_IS_FIRST_ROW}`,
    ).toBe("chosenRight");

    const second = rowAt(widget, RIGHT_IS_SECOND_ROW);
    chips(second)[0]?.click();
    const secondSettled = await settle(second, id);
    expect(
      carriers(secondSettled[0] as HTMLButtonElement).mark,
      `${id}: the first option is ALSO the right call on row ${RIGHT_IS_SECOND_ROW}`,
    ).toBe("chosenWrong");
  },
);

test.each(BINARY_ROW_VISUALS)(
  "%s: a missed row keeps both options in the DOM",
  async (id) => {
    const widget = await board(id);
    const item = rowAt(widget, RIGHT_IS_FIRST_ROW);

    // The floor: two options before the tap, so "both survived" is a claim about two things.
    const before = chips(item);
    expect(before.length, `${id}: the row does not offer two options`).toBe(2);
    for (const chip of before) {
      expect(chip.disabled, `${id}: an option was dead before the row was answered`).toBe(
        false,
      );
      expect(carriers(chip).mark, `${id}: an option was marked before the tap`).toBe("");
    }

    // The second option is the wrong call on this row, and a wrong call settles it. This is
    // the exact tap the screenshot was taken on.
    (before[1] as HTMLButtonElement).click();

    // CLAIM ONE, on its own. Nothing was removed.
    const after = await settle(item, id);
    expect(
      after.map((chip) => (chip.textContent ?? "").replace(/[\u2713\u2717]/g, "").trim()),
      `${id}: a settled row no longer says what the two calls were`,
    ).toEqual(
      before.map((chip) => (chip.textContent ?? "").replace(/[\u2713\u2717]/g, "").trim()),
    );
    // And the row is still structurally a row: same expression, still four grid children.
    expect(
      all(item, ".lesson-interactive__step-eq [data-latex]").length,
      `${id}: the settled row stopped stating what was classified`,
    ).toBeGreaterThan(0);
    for (const chip of after) {
      expect(chip.disabled, `${id}: a settled option is still tappable`).toBe(true);
    }
  },
);

test.each(BINARY_ROW_VISUALS)(
  "%s: the two options carry two different treatments, colour and otherwise",
  async (id) => {
    const widget = await board(id);
    const item = rowAt(widget, RIGHT_IS_FIRST_ROW);
    chips(item)[1]?.click();
    const settled = await settle(item, id);
    const [right, picked] = settled as [HTMLButtonElement, HTMLButtonElement];
    const civic = token("--civic");
    const brick = token("--brick");

    // CLAIM TWO, on its own. Two marks, and they are not the same mark.
    const rightSaid = carriers(right);
    const pickedSaid = carriers(picked);
    expect(rightSaid.mark, `${id}: the correct option is unmarked`).not.toBe("");
    expect(pickedSaid.mark, `${id}: the learner's wrong pick is unmarked`).not.toBe("");
    expect(rightSaid.mark, `${id}: both options carry the same mark`).not.toBe(
      pickedSaid.mark,
    );

    // Non-colour, so the pair survives a palette edit: different glyph, different words, and
    // the learner's own verdict is solid where the standing mark is dashed.
    expect(rightSaid.glyph, `${id}: the correct option shows no glyph`).not.toBe("");
    expect(pickedSaid.glyph, `${id}: the wrong pick shows no glyph`).not.toBe("");
    expect(rightSaid.glyph, `${id}: both options show the same glyph`).not.toBe(
      pickedSaid.glyph,
    );
    expect(rightSaid.name, `${id}: the two options read the same`).not.toBe(
      pickedSaid.name,
    );
    expect(
      pickedSaid.name.toLowerCase(),
      `${id}: the wrong pick claims to be correct`,
    ).toContain("wrong");
    expect(pickedSaid.border, `${id}: the learner's own verdict is not solid`).toBe(
      "solid",
    );
    expect(rightSaid.border, `${id}: the standing mark is not dashed`).toBe("dashed");

    // Colour, paired with all of the above. A wrong pick is the wrong end of the correctness
    // palette; the call the learner did NOT make is outside that palette altogether, because
    // green there would credit them with a pick they never made.
    expect(borderColour(picked), `${id}: a wrong pick is not marked wrong`).toBe(brick);
    expect(borderColour(picked), `${id}: a wrong pick reads as a correct one`).not.toBe(
      civic,
    );
    expect(
      borderColour(right),
      `${id}: the call the learner missed is drawn as their own correct answer`,
    ).not.toBe(civic);
    expect(
      borderColour(right),
      `${id}: the call that was right is marked as a mistake`,
    ).not.toBe(brick);

    // The explanation sits BELOW the row, not in place of it, and it is the explanation alone.
    const note = item.querySelector<HTMLElement>(".lesson-classify__note");
    expect(note, `${id}: a missed row gives no explanation`).not.toBeNull();
    const row = item.querySelector(".lesson-classify__row") as HTMLElement;
    expect(
      row.compareDocumentPosition(note as HTMLElement) & Node.DOCUMENT_POSITION_FOLLOWING,
      `${id}: the explanation comes before the row it explains`,
    ).toBeGreaterThan(0);
    expect(
      (widget.textContent ?? "").toLowerCase(),
      `${id}: the board still narrates itself`,
    ).not.toContain("locked as a miss");
  },
);

/**
 * A missed row makes ONE call, so it carries one mark per option and NOTHING outside them.
 *
 * The row used to end in a verdict column, a `CIVIC` tick or a `BRICK` cross in its own track.
 * That was information while a settled row collapsed to a single line of words, and it stopped
 * being any the moment both options were marked inline: a correct row then showed two ticks for
 * one answer, and a missed row showed a cross inside the wrong pick, a tick inside the right one
 * and a third mark outside, three marks in two valences for one call.
 *
 * Counted rather than selected by class name. Deleting the column and drawing the same tick from
 * somewhere else would pass a `querySelector` check and fail this one.
 */
test.each(BINARY_ROW_VISUALS)(
  "%s: a settled row carries no mark outside its two options",
  async (id) => {
    const widget = await board(id);

    const correct = rowAt(widget, RIGHT_IS_FIRST_ROW);
    chips(correct)[0]?.click();
    await settle(correct, id);
    const onCorrect = verdictGlyphs(correct);
    expect(
      onCorrect.length,
      `${id}: one correct call is marked ${onCorrect.length} times on its row`,
    ).toBe(1);
    expect(
      onCorrect.filter((mark) => !mark.inOption),
      `${id}: a correct row draws a verdict outside the option that earned it`,
    ).toEqual([]);

    const missedRow = rowAt(widget, RIGHT_IS_SECOND_ROW);
    chips(missedRow)[0]?.click();
    await settle(missedRow, id);
    const onMissed = verdictGlyphs(missedRow);
    // Two, and no more: the learner's wrong pick and the call that was right. Both inline.
    expect(
      onMissed.length,
      `${id}: a missed row carries ${onMissed.length} marks for one call`,
    ).toBe(2);
    expect(
      onMissed.filter((mark) => !mark.inOption),
      `${id}: a missed row still draws a verdict outside its options`,
    ).toEqual([]);
    expect(
      missedRow.querySelector(".lesson-classify__check"),
      `${id}: the verdict column is back`,
    ).toBeNull();
  },
);

/**
 * The reason a missed row was missed is ON the row, in the wrong-valence colour, with nothing
 * to open.
 *
 * Reported off this board: "not really sure the 'why that row?' is displayed; just a short
 * explanation in red is sufficient." Both halves of that are asserted, because the screen had
 * both defects. The sentence WAS rendered and was `--ink-soft`, so it read as an aside beside
 * the pick it was the reason for; and a per-row disclosure button sat under it holding the
 * reasoning, a full-width control between two rows of a four-row grid.
 *
 * ## The colour claim is paired with two claims that are not colour
 *
 * `BRICK` is the wrong end of the correctness channel and this sentence explains a wrong pick,
 * which is why it is the same red `.lesson-interactive__status[data-state="wrong"]` already
 * uses rather than a fourth meaning on the palette. But a learner who cannot separate the hues
 * has to get the same thing, so the valence is also on the element as `data-state`, the weight
 * is raised, and the sentence is a `role="status"` region. The probe below is what makes the
 * last two real: the same class WITHOUT the attribute is measured in the same document, so
 * "the state changes the treatment" is a comparison rather than a restatement of the value read.
 *
 * The announcement is load-bearing HERE and would not be inside a reveal: the whole widget
 * stage carries `inert` while a passage is up, so nothing in it is exposed. A settled row is
 * not a reveal, which is why this channel can be counted.
 */
test.each(BINARY_ROW_VISUALS)(
  "%s: the missed row's explanation is inline, in the wrong valence, and behind no control",
  async (id) => {
    const widget = await board(id);
    const item = rowAt(widget, RIGHT_IS_FIRST_ROW);
    // The second option is the wrong call on this row, so this tap settles it as a miss.
    chips(item)[1]?.click();
    await settle(item, id);

    const note = item.querySelector<HTMLElement>(".lesson-classify__note");
    expect(note, `${id}: a missed row gives no explanation`).not.toBeNull();
    const shown = note as HTMLElement;
    // On screen rather than merely in the DOM, and saying something.
    const box = shown.getBoundingClientRect();
    expect(box.height, `${id}: the explanation has no rendered height`).toBeGreaterThan(0);
    expect(box.width, `${id}: the explanation has no rendered width`).toBeGreaterThan(0);
    expect(
      (shown.textContent ?? "").trim().length,
      `${id}: the explanation is empty`,
    ).toBeGreaterThan(10);
    // Inside the row's own block, so it cannot drift onto the board-level status line where
    // the next row's tap would overwrite it.
    expect(
      item.contains(shown),
      `${id}: the explanation is not on the row it explains`,
    ).toBe(true);

    // NOTHING TO OPEN. Not on this row, and not anywhere on a board still being worked: the
    // screen that was reported is a mid-board miss with three rows still open.
    expect(
      shown.querySelector("button"),
      `${id}: the explanation is behind a control`,
    ).toBeNull();
    expect(
      item.querySelector(".lesson-interactive__reveal-button"),
      `${id}: the missed row still offers a disclosure of its own`,
    ).toBeNull();
    expect(
      h?.host.querySelector(".lesson-interactive__reveal-button") ?? null,
      `${id}: a board with rows still open offers something to open`,
    ).toBeNull();

    // THE WRONG VALENCE, in colour.
    expect(getComputedStyle(shown).color, `${id}: the explanation is not in red`).toBe(
      token("--brick"),
    );
    // And not by colour alone. A probe with the same class and no state attribute says what
    // the treatment would be without it, so both channels are measured as differences.
    const probe = document.createElement("p");
    probe.className = "lesson-classify__note";
    probe.textContent = shown.textContent;
    shown.parentElement?.appendChild(probe);
    const plain = getComputedStyle(probe);
    const marked = getComputedStyle(shown);
    expect(shown.dataset.state, `${id}: the valence is not stated in the DOM`).toBe(
      "wrong",
    );
    expect(marked.color, `${id}: the state attribute changes nothing`).not.toBe(
      plain.color,
    );
    expect(
      Number(marked.fontWeight),
      `${id}: colour is the only channel separating the reason from an aside`,
    ).toBeGreaterThan(Number(plain.fontWeight));
    probe.remove();
    // Heard as well as seen, which is a channel this row HAS because it is not frozen. The
    // second half is the one worth measuring: an `aria-live` region inside an `inert` subtree
    // is not in the accessibility tree at all, so counting it as a channel during a reveal
    // would be counting text nothing can reach. A settled row is not a reveal, and this is
    // where that is asserted rather than assumed.
    expect(shown.getAttribute("role"), `${id}: the miss is not announced`).toBe("status");
    const frozen = h?.host.querySelector(".lesson-feedback-host__stage") as HTMLElement;
    expect(
      frozen.hasAttribute("inert"),
      `${id}: the row that just settled is inside a frozen subtree, so its status region is not exposed`,
    ).toBe(false);
  },
);

/**
 * The reasoning behind the sentence is still reachable, once, and only from a finished board.
 *
 * It is the shared teach-then-re-ask reveal, which is the anti-trap rule the whole lesson layer
 * depends on, so it is not deleted with the per-row button that used to carry it: it is moved to
 * the one moment the learner is choosing what to do next. Both halves are asserted, because
 * either alone is satisfied by a board that never offers it at all.
 */
test.each(BINARY_ROW_VISUALS)(
  "%s: the reasoning is offered once, on a finished board, and never on a row",
  async (id) => {
    const widget = await board(id);
    const items = all<HTMLElement>(widget, ".lesson-classify__item");
    expect(items.length, `${id}: no rows to answer`).toBeGreaterThan(1);
    const host = h?.host as HTMLElement;

    // Board 1 is 81, 24, 64, 45. Miss the first, take the rest, so the board finishes dirty.
    for (const [at, item] of items.entries()) {
      const right = at % 2 === 0 ? 0 : 1;
      chips(item)[at === 0 ? 1 - right : right]?.click();
      await settle(item, id);
      if (at < items.length - 1) {
        expect(
          host.querySelector(".lesson-interactive__reveal-button"),
          `${id}: something was offered to open with row ${at + 1} still unanswered`,
        ).toBeNull();
      }
    }

    await waitFor(
      () => host.querySelector(".lesson-interactive__reveal-button") !== null,
      `${id}: a finished board with a miss on it offers no way to the reasoning`,
    );
    expect(
      all(host, ".lesson-interactive__reveal-button").length,
      `${id}: a finished board offers more than one way in`,
    ).toBe(1);
    for (const item of items) {
      expect(
        item.querySelector(".lesson-interactive__reveal-button"),
        `${id}: the offer is on a row rather than on the board`,
      ).toBeNull();
    }
  },
);

test.each(BINARY_ROW_VISUALS)(
  "%s: a correct call marks only the option the learner took",
  async (id) => {
    const widget = await board(id);
    const item = rowAt(widget, RIGHT_IS_FIRST_ROW);
    // The right call this time, so the success end of the palette is the right one to use.
    chips(item)[0]?.click();
    const settled = await settle(item, id);
    const [right, other] = settled as [HTMLButtonElement, HTMLButtonElement];
    expect(carriers(right).mark, `${id}: a correct pick is unmarked`).toBe("chosenRight");
    expect(borderColour(right), `${id}: a correct pick is not the success colour`).toBe(
      token("--civic"),
    );
    expect(carriers(right).name.toLowerCase(), `${id}: the name does not say it`).toContain(
      "correct",
    );
    // Nothing is said about the option nobody took, and no explanation is owed for a row
    // that was answered right.
    expect(carriers(other).mark, `${id}: the untaken option was marked too`).toBe("");
    expect(
      item.querySelector(".lesson-classify__note"),
      `${id}: a correct row was given a correction`,
    ).toBeNull();
  },
);

/**
 * WHAT THE GATE TURNS ON: every row CALLED, not every row called correctly.
 *
 * This replaces "the gate opens only on a clean board", and the pair of properties below is
 * deliberately split so that loosening one cannot quietly take the other with it.
 *
 *  - A miss no longer holds a finished board shut. A learner who misses row one, reads the
 *    sentence it prints and calls the rest correctly has answered every question on the board.
 *  - Completing every row is STILL required. That is the whole of the anti-brute-force
 *    property now: with two options per row, a gate that opened early would let a learner
 *    walk past by tapping nothing in particular.
 *
 * The first test carries the miss-visibility assertions rather than leaving them to the marks
 * sweep above, because they are what makes the loosening honest: they fail if a future change
 * "forgives" a miss by ceasing to report it. A containment assertion over the marks would hold
 * trivially on a row rendering no options at all, so the count is asserted first.
 */
async function play(
  id: LessonVisualId,
  onComplete: () => void,
  { missAt, leaveOpen = 0 }: { missAt?: number; leaveOpen?: number } = {},
): Promise<HTMLElement> {
  h = mount(<LessonVisual id={id} onComplete={onComplete} />);
  const host = h.host;
  await waitFor(() => host.querySelector(".lesson-interactive") !== null, `${id} mounts`);
  const widget = host.querySelector(".lesson-interactive") as HTMLElement;
  const items = all<HTMLElement>(widget, ".lesson-classify__item");
  expect(items.length, `${id}: no rows to answer`).toBeGreaterThan(1);
  // Board 1 is 81, 24, 64, 45: perfect, not, perfect, not. So the right call alternates
  // between the two options, which is also why the answers cannot be tapped in one column.
  for (const [at, item] of items.entries()) {
    if (at >= items.length - leaveOpen) {
      break;
    }
    const right = at % 2 === 0 ? 0 : 1;
    chips(item)[at === missAt ? 1 - right : right]?.click();
    await waitFor(() => item.dataset.settled === "true", `${id}: row ${at} never settled`);
  }
  return widget;
}

test.each(BINARY_ROW_VISUALS)(
  "%s: a miss does not hold the gate shut once every row is called",
  async (id) => {
    let completed = 0;
    const widget = await play(
      id,
      () => {
        completed += 1;
      },
      { missAt: 0 },
    );

    expect(
      completed,
      `${id}: every row was called with one miss among them and the gate stayed shut`,
    ).toBe(1);

    // Advancing past a miss is not the same as pretending it did not happen. Every channel
    // the row reported it in before is still reporting it.
    const missedRow = all<HTMLElement>(widget, ".lesson-classify__item")[0] as HTMLElement;
    const marks = chips(missedRow).map((chip) => chip.dataset.mark ?? "");
    expect(marks.length, `${id}: the missed row is not showing two options`).toBe(2);
    expect(marks, `${id}: the learner's wrong pick lost its verdict`).toContain(
      "chosenWrong",
    );
    expect(marks, `${id}: the call that was right lost its standing mark`).toContain(
      "standing",
    );
    expect(
      (missedRow.querySelector(".lesson-classify__note")?.textContent ?? "").length,
      `${id}: the missed row lost the sentence saying why`,
    ).toBeGreaterThan(0);
    expect(
      widget.querySelector(".lesson-interactive__status")?.getAttribute("data-state"),
      `${id}: the board-level line stopped reporting the miss`,
    ).toBe("wrong");
    // The fresh set is still OFFERED after a miss; it is just no longer the only way on.
    expect(
      (h?.host.textContent ?? "").includes("Try a fresh set"),
      `${id}: a missed board offers something other than a fresh set`,
    ).toBe(true);
  },
);

test.each(BINARY_ROW_VISUALS)("%s: a clean board opens the gate", async (id) => {
  let completed = 0;
  await play(id, () => {
    completed += 1;
  });
  expect(completed, `${id}: a clean board did not open the gate`).toBe(1);
});

test.each(BINARY_ROW_VISUALS)(
  "%s: a row left unanswered still holds the gate shut",
  async (id) => {
    let completed = 0;
    await play(
      id,
      () => {
        completed += 1;
      },
      { leaveOpen: 1 },
    );
    expect(completed, `${id}: the gate opened with a row still unanswered`).toBe(0);
  },
);

test("the sweep found the widgets built on the binary-row kind", () => {
  // A floor rather than a count: the eleventh adopter joins the sweep above without an edit
  // here, and losing one of the ten fails, which is the whole reason it is no longer at one.
  expect(
    BINARY_ROW_VISUALS.length,
    `the source sweep found ${BINARY_ROW_VISUALS.length} widgets built on the binary-row kind, so an adopter has left the derivation`,
  ).toBeGreaterThanOrEqual(ADOPTER_FLOOR);
  expect(new Set(BINARY_ROW_VISUALS).size).toBe(BINARY_ROW_VISUALS.length);

  // AND THE SHAPE, in two directions, because the count alone cannot tell one population of
  // ten from another. The named half fails if a sorter leaves; the floor on what is left fails
  // if the D9 boards grow until they are the whole family and the sweep stops proving anything
  // about the kind's reach outside this branch.
  const outside = BINARY_ROW_VISUALS.filter((id) => !D9_SORTERS.includes(id));
  for (const sorter of D9_SORTERS) {
    expect(
      BINARY_ROW_VISUALS,
      `${sorter} is no longer derived as built on the binary-row kind, so nothing below is measuring it`,
    ).toContain(sorter);
  }
  expect(
    outside.length,
    `only ${outside.length} adopters outside D9 are left (${outside.join(", ") || "none"}), so the floor above is being met by this branch's own boards`,
  ).toBeGreaterThanOrEqual(OUTSIDE_D9_FLOOR);
});
