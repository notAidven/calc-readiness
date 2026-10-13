/**
 * The task statement comes BEFORE the controls that answer it.
 *
 * The defect, on RAD.4's tap-a-power widget: reading top to bottom the learner got a round
 * counter, $\sqrt{p^{7}}$, a small grey note saying "a square root can only pull out pairs",
 * four chips, and only then the sentence telling them what the chips were for. The task was
 * in `.lesson-interactive__status`, which is the LAST child of every widget because it is the
 * `aria-live` region, and which the first wrong move overwrites with feedback.
 *
 * So this asserts DOM ORDER, not presence. Presence is exactly what the status line already
 * had, and `widgetQaFixes.browser.test.tsx` already covers "the objective is not a copy of
 * the mechanic" for the three assembly kinds. What was missing is the ordering claim, and it
 * is the only one that catches the defect as the learner met it.
 *
 * ## Scope, and why it is this scope
 *
 * 84 of the 102 widget files render a status line and have no task line at all. They are
 * bespoke components rather than instances of a kind, so there is no contract to extend and no
 * sweep that can fix them at once; an 84-file edit is not a QA item. The line drawn here is
 * the two lessons this QA pass is reading, RAD.3 and RAD.4, plus every widget built on a
 * shared KIND, because fixing a kind fixes every instance at once and that is the whole
 * argument for having the kinds.
 *
 * ## The kind half was scoped to ONE kind, and that is how `MatchPairs` shipped the defect
 *
 * It read `visualsBuiltOn("SpotTheError")`, which is a fact about which kind the RAD.3/RAD.4
 * pass happened to touch rather than about which surfaces exhibit the behaviour. Six widgets
 * across four domains are built on `MatchPairs`, and that kind rendered no task line at all:
 * its prompt lived only in `.lesson-interactive__status`, after all eight controls, as
 * `feedback ?? namedNote ?? prompt`, so the first wrong join erased it. That is the RAD.4
 * defect exactly, in a kind this file was not looking at, and it survived because R17's
 * `objective` exemption for `MatchPairs` and `EstimateThenCheck` was reading as an exemption
 * from R24 as well. It is not: R17 is about whether a board owes a SEPARATE goal line and R24
 * is about where the task sits.
 *
 * So the derived half is now every widget built on ANY shared kind, read from the sources
 * through `interactionKinds()`. A kind added is swept without an edit here, and a kind that
 * stops leading with its task fails at every instance rather than at none.
 *
 * ## The named half went too, and with it the last place a D9 board could hide
 *
 * `BESPOKE_VISUALS` was eleven ids whose own comment called them "a scope decision rather
 * than a population — they are the two lessons this QA pass read". Two lessons is not a
 * population, and the sentence above about 84 unfixed files had gone stale: 96 bespoke widgets
 * render the shared slot today, so what was once an 84-file edit is now a derivation. The
 * population is therefore every registered visual whose widget renders {@link WidgetTask},
 * directly or through a kind it is built on, floored rather than pinned.
 *
 * That widening is worth having on its own merits and it is NOT what catches the defect
 * below, which is the part worth being precise about. All five of D9's bespoke visuals sat
 * outside the old list, including `trg-tangent-explore`, and the ordering assertion would have
 * PASSED on it: it renders its task slot first, ahead of the svg and every control. What it
 * put in that slot was a standing board-level goal while the round's own question rendered in
 * `.lesson-interactive__status`, which is a claim about CONTENT that document position cannot
 * make. Hence the second sweep.
 *
 * ## The second sweep: the round's question is IN the slot, and a miss cannot take it out
 *
 * The defect, on TRG.6's tangent board: three parts share one board, the task slot carried
 * "Goal: work out the three headings this mount cannot report from", and the sentence naming
 * the round — "This dish hangs 12 meters above the deck. Swing the beam to 45 degrees: how
 * many meters out from the foot of the mast does it land?" — rendered at the bottom as
 * `feedback ?? open?.question`. One wrong answer replaced it permanently, because
 * `setFeedback(null)` happened only when the round advanced. The learner was left an empty
 * box, a Check button and a note about formatting, with neither `12` nor `45` anywhere on
 * screen.
 *
 * Two assertions, because the property has two halves and each fails on its own:
 *
 *  - **A right answer MOVES the task on.** This is what says the round's question lives in the
 *    slot at all. A standing goal reads identically on part 1 and part 2, so a board whose
 *    question is somewhere else fails here — and this is the assertion that was red on
 *    `trg-tangent-explore` and `geo-angle-explore` before either was fixed.
 *  - **A miss does NOT move it.** Which is the defect as the learner met it. On its own this
 *    is satisfied by a static goal, which is exactly what shipped, so it is only evidence
 *    beside the assertion above.
 *
 * ## Scoping the second sweep, twice, because one derivation was not enough
 *
 * A board can only exhibit this if it holds MORE THAN ONE question at a time: where there is
 * one question a standing task line states it, and feedback replacing the status line costs
 * the learner nothing. So the population is the boards that walk a sequence of authored
 * questions, derived from the sources as the widgets carrying a per-round `question` field.
 * That is three widgets tree-wide and each one is driven below.
 *
 * A field name is a weak thing to derive from, and #219 is the standing warning about a
 * derivation that is clean, floored and still the wrong set: a fourth board could hold the
 * same behaviour under `ask` or `prompt` and this derivation would not see it. So the SHAPE of
 * the defect is asserted separately, in source, over the whole task-slot population above,
 * where a field name cannot hide it — no widget may fall back from `feedback` to a property of
 * the round in hand. Measured at `24493680` that pattern had exactly two instances tree-wide
 * and they were the two defects. The two derivations fail in different directions on purpose:
 * the runtime one proves the three boards behave, the source one proves no fourth board has
 * quietly acquired the shape.
 */

import { afterEach, expect, test } from "vitest";

import {
  interactionKinds,
  visualsBuiltOn,
  visualsMatching,
  widgetsMatching,
} from "./kindFamily";
import { findButton, type Harness, mount, setInputValue, waitFor } from "./testHarness";
import { LessonVisual, type LessonVisualId } from "./visuals";

/**
 * The bespoke widgets in scope: the four on RAD.3 and the four on RAD.4. These are a genuine
 * scope decision rather than a population — they are the two lessons that QA pass read — so
 * they are named, and the three assembly-kind instances below are named for the same reason.
 *
 * Kept even though {@link TASK_OWNERS} now subsumes almost all of it. One round deleted this
 * list on the reasoning that a behaviour-scoped derivation covers everything a hand-written
 * one does, which is true TODAY and is not what the list is for: it is the record of which
 * widgets someone actually read, so a derivation that silently narrows fails against it
 * instead of shrinking unnoticed. The meta test below spends it for exactly that.
 */
const BESPOKE_VISUALS: readonly LessonVisualId[] = [
  // RAD.3, bespoke
  "rational-exponent-play",
  "radical-form-builder",
  "exponent-form-builder",
  "rational-power-solver",
  // RAD.4, bespoke
  "magnitude-root-play",
  "root-parity-builder",
  "variable-radicand-builder",
  "mixed-radicand-solver",
  // The three kinds that already had the slot, so the extraction is covered too
  "radical-parts-label",
  "fraction-exponent-label",
  "unlike-sum-table",
];

/**
 * Every widget built on ANY shared kind, DERIVED twice over: the kinds come from the sources
 * under `interactive/kinds/` and each kind's adopters from the widgets that import it.
 *
 * It used to be `visualsBuiltOn("SpotTheError")` alone, and before that a written-down pair of
 * ids. Each narrowing was a fact about which files a QA pass had open rather than about which
 * surfaces can exhibit the defect, and each one hid an instance: the hand-written pair missed
 * the three widgets #179 added to that kind, and the single-kind slice missed the six built on
 * `MatchPairs`, whose task line did not exist at all.
 */
const KIND_VISUALS: readonly LessonVisualId[] = interactionKinds().flatMap((kind) =>
  visualsBuiltOn(kind),
);

/**
 * Every visual that RENDERS A TASK LINE, which is the population the rule is about.
 *
 * The two halves above are both scoped by implementation — one by a hand-picked list, one by
 * "is built on a shared kind" — and a widget can put its goal line under its own chips without
 * importing a line of either. Twelve of D4's twenty-five do exactly that, and every one of them
 * was outside this sweep while the file's own header explained that narrowing the population to
 * the layer a QA pass had open is how the defect keeps shipping. So the scope is the behaviour:
 * a widget owes the ordering if it renders `WidgetTask`, whether it owns that call or inherits
 * it from a kind, and `visualsMatching` is exactly that union.
 */
const TASK_OWNERS: readonly LessonVisualId[] = visualsMatching(/<WidgetTask[\s>]/);

/**
 * Every visual whose task line is claimed to precede its controls.
 *
 * DEDUPED, because the halves overlap on purpose: the named half includes three kind instances
 * that were listed when the derived half stopped at one kind, and widening the derivation
 * brought them in from the other side. Losing the duplicate is the right outcome; each is still
 * swept exactly once.
 */
const TASK_FIRST_VISUALS: readonly LessonVisualId[] = [
  ...new Set([...BESPOKE_VISUALS, ...KIND_VISUALS, ...TASK_OWNERS]),
];

/**
 * Anything the learner answers WITH. Deliberately wide: a task line that beat the chips but
 * not the entry box would still be arriving after the controls on half the widgets here.
 * `.lesson-interactive__reset` is excluded because it only appears on a finished instance, and
 * the reveal button because it is the way out rather than a way to answer.
 *
 * Anything added to the scope above owes a check that its own control class is here, because
 * "precedes everything in an empty set" is the pass that hides it. EL.6's `MatchPairs` instance
 * is the worked example: with the population widened but this list not, its ordering assertion
 * passed the moment the task line was found and the floor under it reported zero controls.
 */
const CONTROLS = [
  ".lesson-interactive__chip",
  ".lesson-interactive__step",
  ".lesson-interactive__input",
  ".lesson-interactive__check",
  ".lesson-sorter__chip",
  ".lesson-label__slot",
  ".lesson-table__slot",
  ".lesson-spot__line-button",
  // The two columns of a matching board. Without this the floor below reports "no controls"
  // for every `MatchPairs` widget, which is a pass that proves the opposite of what it looks
  // like, so widening the population and widening this list are one change.
  ".lesson-match__item",
  // A sorter's BINS and a figure's drop slots, which is where a board with no tray takes its
  // answers. Widening the population above to every widget that renders a task line is what
  // needed these: `geo-net-drag` answers by carrying faces drawn inside its own figure into
  // two piles, so it owns neither a chip class nor an input, and it reported zero controls —
  // the vacuous pass this list exists to prevent, arriving exactly as the note above predicts.
  //
  // Both spellings of a pile, because two rounds reached `geo-net-drag` independently and each
  // read a different element off it: the bin itself and the label the bin's own button carries.
  // Neither subsumes the other on every board, and a selector that matches nothing costs a
  // string.
  ".lesson-sorter__bin",
  ".lesson-sorter__bin-label",
  "[data-drop-slot]",
  // The slot a builder drops a chip into. On a solver this is an `input` and was already
  // covered; on a builder it is a named span, and the difference is invisible from the class.
  // Found by injection: with the task line moved below the slots of `divide-rebuild-builder`
  // and above its tray, the sweep stayed green, because the only control it could see on that
  // board was the tray the defect had left in place.
  ".lesson-equation__slot",
  // Every input and every button, MINUS the named non-answer controls below. A class list is
  // the wrong shape for this claim and was found short twice: `.lesson-equation__slot` after
  // round 1's injection, and `.lesson-interactive__direction-key` after this round's — four
  // arrow keys that walk a marker across a survey grid, on four boards, which is answering by
  // any reading. Rendering that pad above `coordinate-plot-stepper`'s task line left this sweep
  // GREEN at `68c5aa9a`. So the population is now every control the learner can operate, and
  // the enumeration that remains above only decides which of them count as answering ON TOP of
  // the bare tags -- a new widget cannot fall outside this by inventing a class name.
  "input",
  "button",
].join(", ");

/**
 * The three controls that would be on a board for some purpose OTHER than answering it: the
 * restart, the reveal and the re-ask.
 *
 * They are NOT excluded from the population, and that is a measurement rather than an oversight.
 * An exemption whose members are absent excuses nothing while looking like carefulness, so before
 * writing one this sweep counted them: on all 190 freshly mounted boards, zero of the three are
 * rendered. Every one belongs to a LATER state — a finished board, or a wrong answer that has been
 * offered a way out — and this sweep photographs boards at mount. So no exemption is needed and
 * none is written, and the count below is asserted so that the day one of them does appear up
 * front, the ordering claim reds and someone decides it on evidence.
 */
const LATER_STATE_CONTROLS: readonly { selector: string; why: string }[] = [
  {
    selector: ".lesson-interactive__reset",
    why: "hands back a fresh instance, so it belongs to a FINISHED board",
  },
  {
    selector: ".lesson-interactive__reveal-button",
    why: "the way out of the question, offered only after a wrong answer",
  },
  {
    selector: ".lesson-interactive__reask-button",
    why: "takes the answer back, so it exists only after the reveal",
  },
];

/** Everything on the board the learner answers WITH, in document order. */
function answeringControls(widget: HTMLElement): HTMLElement[] {
  return Array.from(widget.querySelectorAll<HTMLElement>(CONTROLS));
}

let h: Harness | null = null;

afterEach(() => {
  h?.cleanup();
  h = null;
});

async function board(id: LessonVisualId): Promise<HTMLElement> {
  h = mount(<LessonVisual id={id} />);
  const host = h.host;
  await waitFor(() => host.querySelector(".lesson-interactive") !== null, `${id} mounts`);
  return host.querySelector(".lesson-interactive") as HTMLElement;
}

test.each(TASK_FIRST_VISUALS)(
  "%s: the task line precedes every control that answers it",
  async (id) => {
    const widget = await board(id);

    const task = widget.querySelector<HTMLElement>(".lesson-interactive__objective");
    expect(task, `${id}: no task line at all`).not.toBeNull();

    // A floor, because "precedes everything in an empty set" is a pass that proves the
    // opposite of what it looks like: it is what a selector drifting off the board produces.
    const controls = answeringControls(widget);
    expect(
      controls.length,
      `${id}: no controls were found, so the ordering claim below is vacuous`,
    ).toBeGreaterThan(0);

    // THE DEFECT, stated on document position. `DOCUMENT_POSITION_FOLLOWING` is set on the
    // argument when it comes after the node, which is what "the task is read first" means.
    for (const control of controls) {
      const relation = (task as HTMLElement).compareDocumentPosition(control);
      expect(
        relation & Node.DOCUMENT_POSITION_FOLLOWING,
        `${id}: the control "${control.className}" comes before the task line`,
      ).toBeGreaterThan(0);
    }

    // And it is the task rather than a second copy of the feedback line. Two lines saying
    // the same words is the loophole wearing the fix's clothes.
    const status = widget.querySelector<HTMLElement>(".lesson-interactive__status");
    const said = (task?.textContent ?? "").trim();
    expect(said.length, `${id}: the task line is too short to name a task`).toBeGreaterThan(
      40,
    );
    expect(said, `${id}: the task line is a copy of the status line`).not.toBe(
      (status?.textContent ?? "").trim(),
    );
  },
);

/**
 * Why the population above needs no exemptions: nothing but answering controls is on a board yet.
 *
 * This is the assertion that lets the ordering claim be made over EVERY button and input rather
 * than over a class list, which is what round 1's `.lesson-equation__slot` and this round's
 * `.lesson-interactive__direction-key` both got past. It also keeps that widening honest in the
 * other direction: if a board starts offering its restart or its reveal before it has been
 * answered, this reds and names the board, instead of an exemption quietly absorbing it.
 */
test("an unanswered board offers nothing but the controls that answer it", async () => {
  const early: string[] = [];
  let counted = 0;
  for (const id of TASK_FIRST_VISUALS) {
    const widget = await board(id);
    for (const entry of LATER_STATE_CONTROLS) {
      if (widget.querySelector(entry.selector) !== null) {
        early.push(`${id} renders ${entry.selector}, which ${entry.why}`);
      }
    }
    counted += 1;
    h?.cleanup();
    h = null;
  }
  expect(
    early.join("\n    "),
    "these boards put a later-state control on an unanswered board, so the ordering claim above is being made over controls that do not answer anything",
  ).toBe("");
  expect(counted, "no board was mounted, so this counted nothing").toBe(
    TASK_FIRST_VISUALS.length,
  );
  expect(counted, "the sweep has shrunk").toBeGreaterThanOrEqual(180);
}, 300_000);

test("the sweep covers the scope that was actually fixed", () => {
  // Every half is derived and floored. A floor catches the glob resolving to nothing, a
  // widget deleted and a registry id renamed out from under the lookup; it is deliberately
  // not a ceiling, so a widget adopting the slot is swept without an edit here.
  expect(new Set(TASK_FIRST_VISUALS).size).toBe(TASK_FIRST_VISUALS.length);
  // The union covers every half whole, which is what the dedupe must not quietly cost.
  for (const id of [...BESPOKE_VISUALS, ...KIND_VISUALS, ...TASK_OWNERS]) {
    expect(TASK_FIRST_VISUALS, `${id} left the sweep`).toContain(id);
  }
  // And the behaviour-scoped half is genuinely wider than the implementation-scoped ones it
  // was added to, rather than a third name for the same set. A widget that renders its own
  // task line without a kind under it is the case the other two halves cannot reach: twelve of
  // D4's twenty-five were exactly that, and 51 visuals in all. The floor is that measurement
  // and not a margin under it, for the reason `widgetRevealFill`'s is — slack here is scope
  // that can be given back without failing anything. It moves DOWN only when a widget adopts a
  // shared kind, which is a real narrowing of this half and a real widening of the one above,
  // so re-measure both rather than shaving this.
  const beyondTheKinds = TASK_OWNERS.filter(
    (id) => !KIND_VISUALS.includes(id) && !BESPOKE_VISUALS.includes(id),
  );
  expect(
    beyondTheKinds.length,
    "the behaviour-scoped half has narrowed back to the widgets built on a shared kind",
  ).toBeGreaterThanOrEqual(51);
  // The absolute size of the behaviour-scoped half, which the relative floor above cannot see:
  // `beyondTheKinds` is a DIFFERENCE, so it stays large while both sides shrink together. Two
  // rounds derived this population independently and measured it over 100, so the floor is well
  // under that and still far over the eleven ids this file once named.
  expect(
    TASK_OWNERS.length,
    "hardly any widget was found rendering the shared task slot, so the derivation has narrowed",
  ).toBeGreaterThanOrEqual(90);
  expect(
    KIND_VISUALS.length,
    "no widget built on a shared kind was found, so the kinds' instances are unswept",
  ).toBeGreaterThanOrEqual(5);
  // And the derivation is genuinely over the kinds rather than over one of them: every kind
  // under `interactive/kinds/` has to be represented, or the sweep has narrowed back to the
  // layer a QA pass happened to have open. A kind with no adopters yet is named rather than
  // silently satisfying this, because "no adopters" and "the lookup broke" print the same zero.
  const kinds = interactionKinds();
  expect(
    kinds.length,
    "no shared interaction kinds were found at all",
  ).toBeGreaterThanOrEqual(7);
  expect(
    kinds.filter((kind) => visualsBuiltOn(kind).length === 0),
    "a shared kind has no registered adopter, so this sweep silently skips it",
  ).toEqual([]);
});

/**
 * A board that walks a sequence of authored questions, and how to answer its first one
 * rightly and wrongly.
 *
 * Both drivers are hand-derived against the board every widget opens on, the way
 * `widgetRevealFill`'s per-widget cases are: `useWidgetVariants` starts at index 0, so each
 * value below is read off the first entry of the pool named in that widget's own header.
 */
interface QuestionBoard {
  id: LessonVisualId;
  /** The widget source, as `kindFamily`'s glob names it, so the population can be checked. */
  path: string;
  /** Answer the open question WRONGLY, which is what puts feedback on the status line. */
  miss: (host: HTMLElement) => void | Promise<void>;
  /** Answer it RIGHTLY, which is what moves the board on to the next question. */
  solve: (host: HTMLElement) => void | Promise<void>;
  /**
   * Words and numbers from the OPENING question that the task slot has to be carrying: the
   * quantities the first answer cannot be worked out without, and a phrase from the sentence
   * asking for them.
   *
   * These exist because "the task moved on" turned out not to imply "the question is in the
   * task slot". Both fixed boards number their slot `Part 1 of 3`, so the counter alone makes
   * the text differ between one question and the next, and the advancing assertion below
   * passed with the question deleted from the slot it is supposed to prove it occupies —
   * measured by deleting it, at which point 197 assertions here stayed green. The counter is
   * stripped before that comparison now, and these tokens are the positive half: on
   * `trg-tangent-explore` they are exactly the `12` and the `45` whose absence from the screen
   * is how the defect was reported.
   */
  needs: readonly string[];
}

/** The nth text box on the board, excluding a dial. */
function box(host: HTMLElement, index: number): HTMLInputElement {
  const found = Array.from(
    host.querySelectorAll<HTMLInputElement>("input:not([type='range'])"),
  )[index];
  if (found === undefined) {
    throw new Error(`no box at index ${index}`);
  }
  return found;
}

/** Type a value into the first box and press Check, which is how both explores are answered. */
function typeAndCheck(host: HTMLElement, value: string): void {
  setInputValue(box(host, 0), value);
  findButton(host, "Check").click();
}

const QUESTION_BOARDS: readonly QuestionBoard[] = [
  {
    // TRG.6 s0. Board 0 hangs the dish 12 meters up and part 1 asks for the reach at a
    // 45-degree swing, where the tangent is 1, so the answer is the height itself. The miss is
    // the misconception the board is drawn for: reading the stepper's readout in mast-heights
    // instead of converting it through the height.
    id: "trg-tangent-explore",
    path: "./interactive/TrigTangentExplore.tsx",
    miss: (host) => typeAndCheck(host, "1"),
    solve: (host) => typeAndCheck(host, "12"),
    // The height and the swing, which are the two numbers the answer is computed from and the
    // two the bug report named as missing from the screen.
    needs: ["12", "45", "meters out from the foot"],
  },
  {
    // GEO.1 s2. Board 0 marks the crossing at 52 degrees and part 1 asks for the angle beside
    // it on a straight line, so 128. The miss is the other angle at the crossing, which is the
    // supplement's own vertical partner and the slide's live confusion.
    id: "geo-angle-explore",
    path: "./interactive/GeoAngleExplore.tsx",
    miss: (host) => typeAndCheck(host, "52"),
    solve: (host) => typeAndCheck(host, "128"),
    // The marked angle the unknown is derived from, and which of the three unknowns is asked
    // for: without the symbol the board has three blanks and no way to tell them apart.
    needs: ["52", "on a straight line"],
  },
  {
    // TRG.3 s0. Board 0 starts the arm at 30 degrees and part 1 asks for the tip straight up,
    // which is 90. `MARKED` runs 0, 30, 45, 60, 90, so three counterclockwise steps reach it.
    // The miss is locking in the heading the board opened on, which answers none of its tasks.
    id: "trg-unitcircle-explore",
    path: "./interactive/TrigUnitCircleExplore.tsx",
    miss: (host) => findButton(host, "Lock in this heading").click(),
    solve: async (host) => {
      const turn = Array.from(host.querySelectorAll<HTMLElement>("button")).find(
        (button) =>
          button.getAttribute("aria-label") ===
          "Turn the antenna counterclockwise to the next marked heading",
      );
      if (turn === undefined) {
        throw new Error("no counterclockwise control");
      }
      // One commit per press. The widget steps off `heading` rather than off a state updater,
      // so three presses in one React batch all read 30 and land on 45; a learner pressing a
      // button three times gets three commits, and this is what reproduces that.
      for (let step = 0; step < 3; step += 1) {
        turn.click();
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
      findButton(host, "Lock in this heading").click();
    },
    // This board's questions carry no numbers at all — they are asked entirely in the reach
    // vocabulary — so the phrase IS the question, and a slot holding a standing goal has none
    // of it.
    needs: ["as far above the horizontal axis", "no horizontal reach"],
  },
];

function taskText(widget: HTMLElement): string {
  return (
    widget.querySelector<HTMLElement>(".lesson-interactive__objective")?.textContent ?? ""
  ).trim();
}

/** The task slot with runs of whitespace flattened, so a JSX line break is not a difference. */
function flat(widget: HTMLElement): string {
  return taskText(widget).replace(/\s+/g, " ");
}

/**
 * The same text with a leading `Part 1 of 3.` counter taken off.
 *
 * The counter is the reason this helper exists. Both fixed boards number their slot, so the
 * raw text differs between one question and the next whatever else the slot holds, and the
 * assertion below — the one whose job is to show the round's question is IN the slot — is
 * satisfied by the numbering alone. Compare the body, and the counter cannot stand in for the
 * question it is printed beside.
 */
function questionBody(widget: HTMLElement): string {
  return flat(widget).replace(/^Part\s+\d+\s+of\s+\d+\.\s*/, "");
}

function statusState(widget: HTMLElement): string {
  return (
    widget
      .querySelector<HTMLElement>(".lesson-interactive__status")
      ?.getAttribute("data-state") ?? ""
  );
}

/**
 * Which of the board's questions is open, as an index into its own row of slots.
 *
 * All three of these boards mark the open one with `data-open="yes"`, which is how the floors
 * below can tell a driver that worked from a driver that clicked nothing: read off the board
 * rather than off the task slot, so it is independent of the thing being asserted.
 */
function openQuestion(widget: HTMLElement): number {
  return Array.from(widget.querySelectorAll<HTMLElement>("[data-open]")).findIndex(
    (slot) => slot.getAttribute("data-open") === "yes",
  );
}

test.each(QUESTION_BOARDS.map((c) => [c.id, c] as const))(
  "%s: the round's own question is in the task slot, so answering moves it on",
  async (id, driver) => {
    const widget = await board(id);
    const opening = taskText(widget);
    const openingBody = questionBody(widget);
    expect(opening.length, `${id}: no task line to hold a question`).toBeGreaterThan(40);
    expect(openQuestion(widget), `${id}: no question is marked open`).toBe(0);
    // The positive half, and the one the counter cannot fake: the slot is carrying the words
    // and quantities of the question that is actually open.
    for (const token of driver.needs) {
      expect(
        flat(widget),
        `${id}: the task slot does not carry «${token}» from the question it has open, so the question is somewhere else`,
      ).toContain(token);
    }

    await driver.solve(widget);
    // The floor. Without it the inequality below is satisfied by a driver that did nothing
    // and a slot that renders the empty string, which is the vacuous pass this file is about.
    await waitFor(
      () => openQuestion(widget) === 1,
      `${id}: the right answer did not move the board on, so nothing below is about advancing`,
    );
    expect(
      taskText(widget),
      `${id}: the task slot reads the same on the second question as on the first, so it holds a standing goal and the round's own question is somewhere feedback can overwrite`,
    ).not.toBe(opening);
    expect(
      questionBody(widget),
      `${id}: with the part counter stripped the task slot reads the same on the second question as on the first, so what moved was the numbering and not the question`,
    ).not.toBe(openingBody);
  },
);

test.each(QUESTION_BOARDS.map((c) => [c.id, c] as const))(
  "%s: a miss does not take that question off the board",
  async (id, driver) => {
    const widget = await board(id);
    const opening = taskText(widget);

    await driver.miss(widget);
    // Two floors, because "unchanged" is trivially true of a board that never registered the
    // attempt: the miss drew feedback, and it did NOT quietly turn out to be the right answer.
    await waitFor(
      () => statusState(widget) === "wrong",
      `${id}: the wrong answer drew no feedback, so there was no miss to survive`,
    );
    expect(
      openQuestion(widget),
      `${id}: the miss advanced the board, so it was not a miss`,
    ).toBe(0);
    expect(
      taskText(widget),
      `${id}: the miss changed what the task slot says, so feedback is reaching the question`,
    ).toBe(opening);
    // Unchanged is only worth having if what is unchanged is the question. Without this the
    // pair is satisfied by a slot that held no question before the miss and none after it,
    // which is the state the defect actually left the learner in.
    for (const token of driver.needs) {
      expect(
        flat(widget),
        `${id}: «${token}» is not on the board after one wrong answer, which is the defect: the learner cannot see what was asked`,
      ).toContain(token);
    }
  },
);

/**
 * The boards that hold a sequence of authored questions, read off the sources: a widget
 * carrying a per-round `question` field. Three tree-wide, and every one of them is driven
 * above, so there is no exception list — if one is ever owed, it belongs here as a named entry
 * asserted in both directions rather than as an id quietly missing from the cases.
 */
const QUESTION_WIDGETS = widgetsMatching(/^\s*question:/m);

test("every board that walks a sequence of authored questions is driven above", () => {
  expect(
    QUESTION_WIDGETS.length,
    "no widget was found carrying per-round questions, so the two sweeps above are vacuous",
  ).toBeGreaterThanOrEqual(3);
  expect(new Set(QUESTION_BOARDS.map((c) => c.id)).size).toBe(QUESTION_BOARDS.length);
  // Both directions. A widget that gains the behaviour has to gain a case, and a case whose
  // widget was renamed or lost the behaviour fails rather than sitting here driving nothing.
  const driven = new Set(QUESTION_BOARDS.map((c) => c.path));
  for (const widget of QUESTION_WIDGETS) {
    expect(
      driven.has(widget.path),
      `${widget.path} walks a sequence of authored questions and no case above drives it`,
    ).toBe(true);
    expect(
      widget.ids.length,
      `${widget.path}: the registry renders no id for it, so a case here would mount nothing`,
    ).toBeGreaterThanOrEqual(1);
  }
  for (const board of QUESTION_BOARDS) {
    expect(
      QUESTION_WIDGETS.map((widget) => widget.path),
      `${board.path} is driven above but no longer walks a sequence of authored questions`,
    ).toContain(board.path);
    expect(
      QUESTION_WIDGETS.find((widget) => widget.path === board.path)?.ids ?? [],
      `${board.path} is driven above under an id the registry does not render it by`,
    ).toContain(board.id);
  }
});

/**
 * Every bespoke widget source, with its comments stripped.
 *
 * Globbed here rather than through `kindFamily` because the claim below is about CODE, and a
 * head comment describing the defect in the past tense is prose about it. The two files fixed
 * for this round both carry that description, so matching the raw source reported them as
 * defective on the strength of their own explanation of why they no longer are. Comments out,
 * then match.
 *
 * The options are written out inline because Vite's glob transform reads them at build time and
 * rejects anything but a literal object.
 */
const CODE_OF: ReadonlyMap<string, string> = new Map(
  Object.entries(
    import.meta.glob("./interactive/*.tsx", {
      query: "?raw",
      import: "default",
      eager: true,
    }) as Record<string, string>,
  ).map(
    ([path, source]) =>
      [path, source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ")] as const,
  ),
);

/**
 * And the SHAPE of the defect, over every widget rendering the slot rather than over the three
 * the field-name derivation can see.
 *
 * The bug is one expression: the status line falls back from the per-attempt message to a
 * PROPERTY OF THE ROUND IN HAND, so the message replaces the question and nothing puts it back.
 * Falling back to a module constant or a standing prop is the fix and is untouched here. A board
 * naming its field `ask` would escape {@link QUESTION_WIDGETS} and not this, which is the whole
 * point of having both: the runtime sweep proves the three known boards behave, and this proves
 * no fourth board has quietly acquired the shape under another name.
 */
test("no widget lets feedback fall back to a property of the round in hand", () => {
  const shape = /feedback\s*\?\?\s*\w+\??\.\w+/;
  // Two floors. The glob resolved to real files, and enough of them render the slot for the
  // claim to be about the population rather than about whatever the glob happened to return.
  expect(
    CODE_OF.size,
    "no widget sources were read, so the claim below is vacuous",
  ).toBeGreaterThanOrEqual(100);
  expect(
    [...CODE_OF.values()].filter((code) => /\bWidgetTask\b/.test(code)).length,
    "hardly any widget source renders the task slot, so the comment-stripping has eaten the code",
  ).toBeGreaterThanOrEqual(90);
  expect(
    [...CODE_OF.entries()].filter(([, code]) => shape.test(code)).map(([path]) => path),
    "a widget renders its round's question where its own feedback will replace it",
  ).toEqual([]);
});
