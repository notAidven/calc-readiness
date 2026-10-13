/**
 * **NO BOARD PAINTS ITS VERDICT COLOUR WHILE THE LEARNER IS STILL DECIDING.**
 *
 * R26 puts green and red on the learner's own pick and nowhere else. A dial is the one control
 * where that is easy to lose, because the learner scrubs THROUGH the answer on the way past it:
 * `factor-pair-stepper` printed its sum readout in `CIVIC` the moment the slider landed on the
 * answering pair, with the "Use this pair" button still on screen and nothing committed. The
 * board had done the noticing the task asks for, and the task stops being "find the pair whose
 * sum is the middle coefficient" and becomes "drag until it turns green".
 *
 * The colour was not the only signal — the readout also prints `4 + 9 = 13` beside a trinomial
 * whose middle coefficient is 13 — and that is the argument for leaving it, which is exactly why
 * this is decided from a frame rather than from a reading. `.qa-frames/` carries both.
 *
 * ## The population is the behaviour, not the widget
 *
 * Every visual any lesson pack places, mounted, kept if it renders a `type="range"` control. A
 * slider is what makes the defect reachable without committing, and the population is derived
 * from the mount rather than listed, because a hand-picked list of sliders is how `widgetTaskOrder`
 * came to be missing a drop slot. Scrubbed across its WHOLE domain, one step at a time, since a
 * readout that only goes green on the answering position is invisible at any other value — which
 * is why a mount-state palette sweep cannot see this and did not.
 *
 * Three floors, because "nothing turned green" is vacuously true of a population that never moved
 * a control, and equally true of one that only holds boards where the dial IS the commit and so
 * have no pre-commit state to get wrong: the sliders found, the readings taken across them, and
 * the sliders that offer a Check.
 *
 * ## A DIAL IS NOT THE ONLY WAY TO REACH A PRE-JUDGEMENT STATE. PICKING SOMETHING UP IS ANOTHER
 *
 * This file's title is "no board paints its verdict colour while the learner is still deciding",
 * and until P2-22 its population was the boards that offer a DIAL. That is a fact about one
 * control, not about the behaviour, and the rest of the behaviour was reachable on far more
 * boards: a learner who lifts a chip has offered nothing either, and three shared kinds painted
 * that lift in the correctness channel. `MatchPairs` gave a picked-up item a `BRICK` border over
 * a brick-tinted fill — the shape of "you got that wrong" around an item nobody had judged — and
 * `FillTable` and `LabelParts` gave a lifted chip a `CIVIC` border, which is the colour those same
 * boards use for a value that has been marked right.
 *
 * So the population is widened to the behaviour: **a control the learner can put into a HELD
 * state without offering anything**. Derived from the mounted board, exactly as the slider
 * population is — a `button` that reports `aria-pressed="false"`, is clicked, and reports
 * `aria-pressed="true"` afterwards with the board's status line unmoved. Nothing here reads a
 * source file or names a widget, so the sweep does not stop at the layer that was edited: a
 * bespoke board that reimplements pickup with its own `useState` is in the population for
 * exhibiting the behaviour, which is the correction `revealReAsk.test.ts` records at `#219`.
 *
 * A tap that the board JUDGES is not in the population and is not an exception either: it is a
 * commit, and a verdict on a committed pick is what R26 asks for. The discriminator is read off
 * the product — the status line's `data-state` moving off `"prompt"` — rather than declared.
 *
 * ### Reading a tint, not just a token
 *
 * `MatchPairs` did not set `--brick` on that fill; it set `color-mix(in srgb, var(--brick) 12%,
 * var(--paper))`, and a sweep matching the bare token would have walked straight past the largest
 * surface on the board. So the held reading is matched against every mix of each verdict token
 * over the surfaces it can be laid on, enumerated by probing rather than computed, which keeps
 * this free of any assumption about how Chromium serializes a colour. The classifier carries its
 * own two-directional self-check: the brick tint that shipped must be recognised, and a neutral
 * ink tint and `SIGNAL_DEEP` must not be, or a green run would mean the detector had stopped
 * detecting.
 *
 * The sweep is SHARDED across several tests. Mounting ~170 boards, scrubbing each dial end to end
 * and lifting each board's chips runs past a single test's 300s on a machine doing anything else,
 * and a timeout answers nothing; the claim asserts all shards ran before reading their
 * accumulators.
 */

import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { cdp, commands, page } from "vitest/browser";

import { allLessons } from "./domains";
import { FIGURE_CONTENT_CAP } from "./readingWidths";
import { mount, setInputValue, waitFor } from "./testHarness";
import { LessonVisual, type LessonVisualId } from "./visuals";

import "../styles.css";

/** Explicit opt-in for evidence files; ordinary browser runs stay read-only. */
const CAPTURE_EVIDENCE = Boolean(import.meta.env.VITE_CAPTURE_EVIDENCE);

const VIEWPORT = { width: 1024, height: 580 } as const;

/**
 * The boards where the DIAL IS THE COMMIT, so "before the learner commits" is not a state they
 * have. Named rather than filtered out, and asserted in both directions below.
 *
 * `balance-beam-slider` (D3 LIN.1) offers no Check at all: `moveTo` calls `finish(true)` the
 * instant the beam levels, and its own header says the beam is the judge rather than the widget.
 * Every position of that dial is an offered answer, so `x = 6` going `CIVIC` and a low guess going
 * `BRICK` are verdicts on the learner's own pick, which is what R26 asks for rather than what it
 * forbids. A board that acquires a commit control has to leave this list, and a board that stops
 * colouring its readout has to leave it too, so an entry cannot sit here excusing nothing.
 */
const DIAL_IS_THE_COMMIT: readonly { visual: string; why: string }[] = [
  {
    visual: "balance-beam-slider",
    why: "no Check: moving the dial IS the answer, so every position is the learner's own pick",
  },
];

let mounted: { cleanup: () => void } | null = null;

function unmount(): void {
  mounted?.cleanup();
  mounted = null;
}

beforeAll(async () => {
  await page.viewport(VIEWPORT.width, VIEWPORT.height);
});

afterAll(async () => {
  await page.viewport(414, 896);
});

afterEach(() => {
  unmount();
});

function liveVisualIds(): LessonVisualId[] {
  return Array.from(
    new Set(allLessons.flatMap((lesson) => (lesson.visuals ?? []).map((v) => v.id))),
  ) as LessonVisualId[];
}

/**
 * Mount a visual and wait for its figure.
 *
 * 20s rather than the harness's 4s default, which is not slack for its own sake: this sweep mounts
 * every placed visual, several of them heavy, and on a machine doing anything else the 4s wait
 * expired on boards that mount perfectly well. A mount timeout aborts its shard and takes the rest
 * of that shard's boards out of the population, so a loaded machine turned into a smaller sweep. A
 * board that genuinely never mounts still fails here, just slowly.
 */
async function mountVisual(id: LessonVisualId): Promise<HTMLElement> {
  const harness = mount(
    <div style={{ width: `${FIGURE_CONTENT_CAP}px`, margin: "8px auto" }}>
      <LessonVisual id={id} />
    </div>,
  );
  mounted = harness;
  const host = harness.host;
  await waitFor(
    () => host.querySelector("figure.lesson-visual") !== null,
    `${id} mounts`,
    20_000,
  );
  return host;
}

/**
 * Wait for KaTeX on a board already mounted, then for its fonts.
 *
 * Called only after the board is known to carry a slider, and on the SAME mount rather than a
 * fresh one: a colour read before KaTeX has run is a colour read off nothing, but paying 1.5s and
 * a second render for that on all ~170 placed visuals is what put this file over its budget.
 */
async function awaitTypeset(id: LessonVisualId, host: HTMLElement): Promise<void> {
  await waitFor(() => host.querySelector(".katex") !== null, `${id} typesets`, 1500).catch(
    () => {},
  );
  await document.fonts.ready;
}

/**
 * The verdict palette as this stylesheet resolves it.
 *
 * Probed rather than written down: `CIVIC` is `var(--civic)`, so a hard-coded `rgb(...)` would be
 * a claim about the theme and would silently stop matching the day a token moves.
 */
function verdictColours(host: HTMLElement): Map<string, string> {
  const probe = document.createElement("span");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  host.appendChild(probe);
  const found = new Map<string, string>();
  for (const token of ["--civic", "--brick"]) {
    probe.style.color = `var(${token})`;
    found.set(getComputedStyle(probe).color, token);
  }
  probe.remove();
  return found;
}

/**
 * One turn of the event loop and one frame boundary, before a moved board is read.
 *
 * React commits a discrete `input` event synchronously, so a board that renders straight off the
 * event is already done when `setInputValue` returns — but one that derives its readout in an
 * effect, or defers a repaint to a frame, is not. The timer turn flushes the first and the frame
 * flushes the second. Paint is not waited for and does not need to be: `getComputedStyle` forces
 * its own style recalc, so what this waits for is the DOM to stop being written to.
 *
 * The frame is raced against a timer because a frame is not owed to anybody — a throttled or
 * backgrounded tab stops serving them — and nothing in this file may be able to hang on a wait
 * again.
 */
function settle(): Promise<void> {
  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = (): void => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    setTimeout(() => {
      requestAnimationFrame(finish);
      setTimeout(finish, 50);
    }, 0);
  });
}

/**
 * The widget's own math spans, in document order, with the colour each resolves to.
 *
 * `[data-latex]` only, which is the hook `MathSpan` sets and nothing else does. Sweeping every
 * `<span>` was tried first and is the wrong population twice over: KaTeX emits a nested span per
 * glyph, so one formula reports its own fragments a dozen times over, and a run that INHERITS a
 * colour reports it as if the board had set it there.
 */
function mathRuns(host: HTMLElement): { latex: string; colour: string }[] {
  return Array.from(host.querySelectorAll<HTMLElement>("[data-latex]")).map((node) => ({
    latex: node.getAttribute("data-latex") ?? "",
    colour: getComputedStyle(node).color,
  }));
}

/* -------------------------------------------------------------------------- */
/* The correctness channel, including everything mixed out of it               */
/* -------------------------------------------------------------------------- */

const VERDICT_TOKENS = ["--civic", "--brick"] as const;

/**
 * Every colour the correctness channel can put on screen, over one surface.
 *
 * Not just `var(--civic)` and `var(--brick)`. The shipped defect this widening was written for
 * painted `color-mix(in srgb, var(--brick) 12%, var(--paper))` across a held item's whole face,
 * and a sweep matching only the two bare tokens reads that as neutral. So each token is mixed
 * over the surface at every whole percentage and the computed results are collected, which makes
 * membership an exact string comparison.
 *
 * ENUMERATED BY PROBING RATHER THAN BY ARITHMETIC, on purpose. Doing the algebra would require
 * knowing which colour space Chromium serializes an `oklch()` token into and whether `color-mix`
 * is linear in it; probing asks the browser the same question the board asked it, so the answer
 * cannot disagree.
 */
function channelOver(probe: HTMLElement, surface: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const token of VERDICT_TOKENS) {
    probe.style.color = `var(${token})`;
    found.set(getComputedStyle(probe).color, token);
    for (let pct = 1; pct <= 100; pct += 1) {
      probe.style.color = `color-mix(in srgb, var(${token}) ${pct}%, ${surface})`;
      found.set(getComputedStyle(probe).color, token);
    }
  }
  return found;
}

function withProbe<T>(host: HTMLElement, read: (probe: HTMLElement) => T): T {
  const probe = document.createElement("span");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  host.appendChild(probe);
  try {
    return read(probe);
  } finally {
    probe.remove();
  }
}

/** Opaque background colours in an element's ancestry: what a tint on it could be mixed over. */
function surfacesBehind(element: HTMLElement): string[] {
  const surfaces = new Set<string>(["var(--paper)"]);
  let node: HTMLElement | null = element.parentElement;
  for (let depth = 0; node !== null && depth < 6; depth += 1) {
    const background = getComputedStyle(node).backgroundColor;
    if (background !== "" && !/rgba\([^)]*,\s*0\s*\)$/.test(background)) {
      surfaces.add(background);
    }
    node = node.parentElement;
  }
  return Array.from(surfaces);
}

/* -------------------------------------------------------------------------- */
/* Pickup: the other way to reach a state the board has not judged             */
/* -------------------------------------------------------------------------- */

/** What a control looked like, in the three places a board can paint a state. */
interface Face {
  border: string;
  background: string;
  ink: string;
}

function faceOf(element: HTMLElement): Face {
  const style = getComputedStyle(element);
  return {
    border: style.borderTopColor,
    background: style.backgroundColor,
    ink: style.color,
  };
}

interface HeldReading {
  visual: string;
  /** Which of the board's pressable controls, by position, so the finding is reproducible. */
  control: number;
  /** The control's accessible name, so a human can find it on the board. */
  named: string;
  /** Which face of it turned, and what it turned to. */
  face: keyof Face;
  was: string;
  became: string;
  token: string;
  /** Whether the board is one of the three shared pickup kinds, or its own. */
  bespoke: boolean;
}

interface Reading {
  visual: string;
  /** Position of the run in the board's math spans, which is stable as the dial moves. */
  slot: number;
  /** What the run said at the step where it turned, and what colour it turned. */
  at: string;
  token: string;
  step: number;
  /** What the same slot reads at a step where it is NOT the verdict colour. */
  otherwise: string;
}

/**
 * What the whole sweep has found so far, filled by the shards below.
 *
 * Sharded because the sweep does not fit one test's wall clock: mounting every placed visual and
 * scrubbing each dial from end to end runs past 300s on a loaded machine, and a timeout is a
 * non-answer rather than a red. `shardsRun` is what stops the shape mattering — the claim reads
 * these accumulators, so a shard that did not run would quietly shrink the population, and the
 * claim asserts all of them did.
 */
/**
 * Six, which is what this was before it was briefly eight.
 *
 * The eighth and seventh were added because the file was reading 345s against a 300s per-test
 * budget, and splitting the work smaller is the ordinary answer to that. It was the wrong answer,
 * because the load was not real: one shard was spending 232.8s inside the scrub loop's wait,
 * timing out on 194 of 201 dial positions against a float comparison that could not hold (see
 * `scrubShard`). Sharding cannot spread a cost that lives in one board — seven shards totalled 43s
 * while the eighth took 285s — and with the comparison fixed there is no load to spread.
 *
 * Sharding still earns its place: the sweep genuinely does mount ~170 boards and a single test's
 * 300s is a real ceiling on a loaded machine. Six is the number that was measured; it is not
 * raised again without a timing that says why.
 */
const SHARDS = 6;
const found = {
  sliders: [] as string[],
  /** The sliders whose board also offers a commit control while nothing is settled. */
  committing: [] as string[],
  verdicts: [] as Reading[],
  readings: 0,
  /** Dials that stopped taking positions part-way, with where they stopped. */
  stoppedEarly: [] as string[],
  /** Boards where a control could be put into a held state with nothing offered. */
  pickups: [] as string[],
  /** Of those, the ones NOT built on the three shared pickup kinds. */
  bespokePickups: [] as string[],
  /** Taps the board consumed on the spot, so they are commits rather than pickups. */
  judged: [] as string[],
  /** Controls already wearing a verdict token unheld: a taxonomy, not a pickup verdict. */
  identityHues: [] as string[],
  /** Faces read across held controls, so "nothing turned" cannot be true of nothing. */
  heldReadings: 0,
  held: [] as HeldReading[],
  shardsRun: new Set<number>(),
};

/** The class the three shared pickup kinds put on their root, so "bespoke" is read, not listed. */
const SHARED_KIND_ROOTS = [
  ".lesson-interactive--match",
  ".lesson-interactive--table",
  ".lesson-interactive--label",
];

/**
 * Lift what this board offers to lift, and read what the lift painted.
 *
 * The population is the board's own `aria-pressed` buttons rather than a list of widgets, and
 * membership is decided by what the click DOES rather than by which file drew the button.
 *
 * ## A PICKUP IS REVERSIBLE, AND THAT IS WHAT SEPARATES IT FROM A COMMIT
 *
 * `aria-pressed` going true is not sufficient, because a chip that IS the answer also goes
 * pressed. `abs-count-classify` is the worked case: tapping a count calls it, the chip is
 * `disabled` from that moment and its accessible name becomes *"your answer, wrong"*. Colouring
 * that `BRICK` is precisely what R26 asks for. So a tap counts as a PICKUP only if the same tap
 * can be undone — press, then press again and come back to `aria-pressed="false"` still enabled.
 * A tap that cannot be taken back was consumed by the board, and is recorded as a commit rather
 * than excused as an exception, because it never exhibited the behaviour in the first place.
 *
 * ## A HUE THE CHIP ALREADY WORE IS NOT A VERDICT THE LIFT MADE
 *
 * The same distinction the dial sweep draws between a run that TURNS the palette and one that is
 * that colour at every position. `like-terms-sorter` keys its tray on the kind of term — variable
 * amber, square brick, constant civic — so a constant chip is green before anything is touched
 * and the pressed fill is `color-mix(currentColor 20%, ...)` of that same green. The lift did not
 * introduce it. Matched per TOKEN rather than per channel, so a control that wore civic and turns
 * BRICK on the lift is still a finding; the tokens a control already carries are recorded in the
 * artifact either way, since a taxonomy painted in the correctness palette is a real question and
 * simply not the one this file asks.
 */
async function pickupPass(id: LessonVisualId, host: HTMLElement): Promise<boolean> {
  const pressable = Array.from(
    host.querySelectorAll<HTMLButtonElement>('button[aria-pressed="false"]:not(:disabled)'),
  );
  if (pressable.length === 0) {
    return false;
  }
  await awaitTypeset(id, host);
  const bespoke = SHARED_KIND_ROOTS.every((root) => host.querySelector(root) === null);
  const channel = withProbe(host, (probe) => channelOver(probe, "var(--paper)"));
  const surfaced = new Set(["var(--paper)"]);
  let touched = false;

  // Three at most. The defect is a property of how the board paints ANY held control, so the
  // fourth chip on a nine-chip tray is the same widget answering the same question; lifting
  // every one of them across ~170 boards buys repetition rather than coverage.
  for (const control of pressable.slice(0, 3)) {
    for (const surface of surfacesBehind(control)) {
      if (!surfaced.has(surface)) {
        surfaced.add(surface);
        for (const [colour, token] of withProbe(host, (probe) =>
          channelOver(probe, surface),
        )) {
          channel.set(colour, token);
        }
      }
    }
    const was = faceOf(control);
    control.click();
    // These two waits keep their `.catch`, unlike the dial's: here the timeout IS a reading. A
    // control that never goes pressed is not in the population and a control that will not come
    // back up is a commit, and both branches below are written on the state the wait leaves
    // behind. Swallowing a timeout is only a defect where nothing afterwards looks at it.
    await waitFor(
      () => control.getAttribute("aria-pressed") === "true",
      `${id} holds a control`,
      600,
    ).catch(() => {});
    if (control.getAttribute("aria-pressed") !== "true") {
      continue;
    }
    touched = true;
    const now = faceOf(control);

    // Put it back down. Whether it GOES back down is what decides the tap's kind, so this is
    // the measurement and not tidying up after one.
    control.click();
    await waitFor(
      () => control.getAttribute("aria-pressed") === "false",
      `${id} puts a control back down`,
      600,
    ).catch(() => {});
    const reversible =
      control.getAttribute("aria-pressed") === "false" && !control.disabled;
    if (!reversible) {
      found.judged.push(
        `${id}: "${control.getAttribute("aria-label") ?? ""}" cannot be put back down, so the tap was the answer`,
      );
      continue;
    }

    found.pickups.push(id);
    if (bespoke) {
      found.bespokePickups.push(id);
    }
    const already = new Set(
      (["border", "background", "ink"] as (keyof Face)[])
        .map((face) => channel.get(was[face]))
        .filter((token): token is string => token !== undefined),
    );
    if (already.size > 0) {
      found.identityHues.push(
        `${id}: "${control.getAttribute("aria-label") ?? ""}" already wears ${Array.from(already).join(", ")} unheld`,
      );
    }
    for (const face of ["border", "background", "ink"] as (keyof Face)[]) {
      found.heldReadings += 1;
      const token = channel.get(now[face]);
      if (now[face] === was[face] || token === undefined || already.has(token)) {
        continue;
      }
      found.held.push({
        visual: id,
        control: pressable.indexOf(control),
        named: control.getAttribute("aria-label") ?? (control.textContent ?? "").trim(),
        face,
        was: was[face],
        became: now[face],
        token,
        bespoke,
      });
    }
  }
  return touched;
}

/** Scrub every dial among this shard's share of the placed visuals. */
async function scrubShard(shard: number): Promise<void> {
  const ids = liveVisualIds().filter((_, index) => index % SHARDS === shard);
  for (const id of ids) {
    let host = await mountVisual(id);
    // Lifting first, on a board nothing has touched. A scrubbed dial can change what a board
    // draws, and a chip lifted off a moved board is a chip lifted off a different board.
    const lifted = await pickupPass(id, host);
    let range = host.querySelector<HTMLInputElement>('input[type="range"]');
    if (range === null) {
      unmount();
      continue;
    }
    if (lifted) {
      // Both behaviours on one board, so the dial gets the untouched mount the lift just had.
      unmount();
      host = await mountVisual(id);
      range = host.querySelector<HTMLInputElement>('input[type="range"]');
      if (range === null) {
        unmount();
        continue;
      }
    }
    await awaitTypeset(id, host);
    found.sliders.push(id);
    // Whether "before the learner commits" is a state this board HAS. A dial with a Check beside
    // it can be scrubbed without offering anything; a dial with none is itself the answer. Read
    // off the mounted board rather than declared, so the discriminator is the product's and not
    // this file's.
    if (host.querySelector(".lesson-interactive__check") !== null) {
      found.committing.push(id);
    }
    const palette = verdictColours(host);
    const min = Number(range.min || "0");
    const max = Number(range.max || "0");
    const step = Number(range.step || "1") || 1;
    /** Per slot, what it said and what colour it was at each step of the dial. */
    const trace = new Map<
      number,
      { latex: string; token: string | undefined; step: number }[]
    >();
    // Positions off the index rather than accumulated. `value += step` drifts, and the drift is
    // not cosmetic: over `-0.4` to `1.6` at `0.01` the counter reaches `-0.37000000000000005`
    // while the input snaps its value to `-0.37`, so 194 of these 201 positions asked for a
    // number the dial could never report back.
    const positions = Math.floor((max - min) / step + 1e-9) + 1;
    for (let index = 0; index < positions; index += 1) {
      // A DIAL THE BOARD HAS TAKEN AWAY CANNOT GO ON BEING SCRUBBED, and that is the dial half's
      // version of the discriminator the pickup half already draws: `balance-beam-slider` sets
      // `disabled` the instant the beam levels, because moving it WAS the answer. Read off the
      // control rather than declared, and recorded rather than absorbed — a board that stops at
      // its first position would otherwise shrink this sweep without saying so, which is exactly
      // what the swallowed timeout below used to let happen. It scrubbed six real positions of
      // this board and then re-read the frozen result six more times, and reported twelve.
      if (range.disabled) {
        found.stoppedEarly.push(
          `${id}: dial went disabled after ${index} of ${positions} positions, so the board had consumed it`,
        );
        break;
      }
      const asked = min + index * step;
      setInputValue(range, String(asked));
      // Half a step of tolerance, because that IS the input's own rule: a range control snaps
      // whatever it is handed to the nearest `min + k * step`, so "the dial took it" can only
      // mean "it landed inside this position's half-step". Exact equality was asking the browser
      // to reproduce a float it had every right to round.
      //
      // NOT swallowed. The `.catch(() => {})` that used to sit here is what turned a wait that
      // could not succeed into 232.8s of silence rather than a red on the first board: a dial
      // that will not take a position is a board this sweep is not scrubbing, and a sweep that
      // is quietly not scrubbing is the failure mode this whole file exists to avoid.
      await waitFor(
        () => Math.abs(Number(range.value) - asked) <= step / 2,
        `${id} takes position ${index + 1} of ${positions} (asked ${asked}, dial reports "${range.value}"; min ${range.min} max ${range.max} step ${range.step})`,
        1200,
      );
      // The settle, now deliberate instead of a side effect of the comparison above failing. The
      // old loop gave 1200ms to every position whose float happened not to match and NONE to the
      // six that did, so how long a board had to finish drawing was decided by binary rounding.
      await settle();
      // The position the dial reports, not the one asked for, so a finding quotes where the
      // control actually was.
      const at = Number(range.value);
      mathRuns(host).forEach((run, slot) => {
        found.readings += 1;
        const seen = trace.get(slot) ?? [];
        seen.push({ latex: run.latex, token: palette.get(run.colour), step: at });
        trace.set(slot, seen);
      });
    }
    // A slot that is the verdict colour at EVERY position is an identity or emphasis hue and is
    // not what this measures — the board is not answering anything by being that colour all the
    // time. A slot that TURNS the verdict colour as the dial passes over one value is the board
    // marking that value right or wrong before it has been offered, which is the defect.
    for (const [slot, seen] of trace) {
      const turned = seen.find((entry) => entry.token !== undefined);
      const neutral = seen.find((entry) => entry.token === undefined);
      if (turned !== undefined && neutral !== undefined) {
        found.verdicts.push({
          visual: id,
          slot,
          at: turned.latex,
          token: turned.token ?? "?",
          step: turned.step,
          otherwise: neutral.latex,
        });
      }
    }
    unmount();
  }
  found.shardsRun.add(shard);
}

test.each(Array.from({ length: SHARDS }, (_, shard) => shard))(
  "shard %i of the placed visuals: every dial it finds is scrubbed end to end",
  async (shard) => {
    await scrubShard(shard);
  },
  300_000,
);

/**
 * Floors, under what this tree measures at the pin: 21 placed visuals render a slider, 19 of them
 * beside a commit control, and 1508 colours are read across the scrub.
 *
 * That last figure was 1534 while the scrub loop's wait was broken, and both halves of the
 * difference were the loop being wrong rather than this one reading less. It lost 30 by no longer
 * re-reading `balance-beam-slider` six times after the board had disabled its own dial, and it
 * gained 4 because `value += step` used to overshoot `max` on the two dials with fractional steps
 * — `trg-combine-estimate` (-0.4 to 1.6 by 0.01) and `negative-exponent-estimate` (-0.5 to 1.5 by
 * 0.05) were never scrubbed at their top position at all.
 *
 * `COMMITTING_FLOOR` is the load-bearing one. The claim below can only fail on a board that has a
 * pre-commit state at all, so a population that drifted to nothing but commitless dials would
 * report green over boards that could never break it. It also has to hold clear of the excuse
 * list, or the list could grow until it had swallowed the population.
 */
const SLIDER_FLOOR = 18;
const COMMITTING_FLOOR = 15;
const READING_FLOOR = 1200;

test("no slider's readout carries the verdict palette before the learner commits", async () => {
  const { sliders, committing, readings, verdicts, stoppedEarly, shardsRun } = found;
  expect(
    shardsRun.size,
    `only ${shardsRun.size} of ${SHARDS} shards ran, so this claim is made over part of the population`,
  ).toBe(SHARDS);
  const excused = new Set(DIAL_IS_THE_COMMIT.map((entry) => entry.visual));
  const offenders = verdicts.filter((reading) => !excused.has(reading.visual));

  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(
      ".qa-frames/pre-commit-verdict-colour.json",
      JSON.stringify(
        {
          sliders,
          committing,
          readings,
          stoppedEarly,
          verdicts: verdicts.map(
            (v) =>
              `${v.visual} slot ${v.slot} at dial ${v.step}: "${v.at}" is ${v.token}, and reads "${v.otherwise}" neutral elsewhere`,
          ),
        },
        null,
        2,
      ),
      { encoding: "utf-8" },
    );
  }

  expect(
    Array.from(
      new Set(
        offenders.map(
          (v) =>
            `${v.visual}: "${v.at}" turns ${v.token} at dial position ${v.step}, while the same readout is neutral at "${v.otherwise}"`,
        ),
      ),
    ).join("\n    "),
    "these boards paint the correctness palette on a value the learner has not offered yet, so the board does the noticing the task asks for",
  ).toBe("");

  expect(sliders.length, "no placed visual renders a slider").toBeGreaterThanOrEqual(
    SLIDER_FLOOR,
  );
  expect(
    committing.filter((id) => !excused.has(id)).length,
    "no dial in the population offers a commit control, so nothing here HAS a pre-commit state and the claim above is true over boards that could never break it",
  ).toBeGreaterThanOrEqual(COMMITTING_FLOOR);
  expect(
    readings,
    "no colour was read off a moved slider, so this claim is empty",
  ).toBeGreaterThanOrEqual(READING_FLOOR);
  // A dial that stops part-way is a board only partly swept, so it may not do that quietly. The
  // only reason a dial goes away with nothing pressed is that moving it was itself the commit,
  // which is the same thing `DIAL_IS_THE_COMMIT` excuses — so a board appearing here that is not
  // on that list is either a new commit-on-move dial nobody declared, or a dial breaking.
  expect(
    stoppedEarly.filter((entry) => !excused.has(entry.split(":")[0] ?? "")).join("\n    "),
    "these dials stopped taking positions part-way through the scrub without being declared commit-on-move, so the sweep covered less of them than it reports",
  ).toBe("");
}, 60_000);

/**
 * Floors under the pickup half. Measured on this tree at the pin: 62 placed visuals offer a
 * reversible pickup, 10 of them outside the three shared kinds, over 555 faces read.
 *
 * `BESPOKE_PICKUP_FLOOR` is the composition assertion beside the size one, and it is the whole
 * point of the widening. A floor on the pickup boards alone is satisfied by the three shared
 * kinds' instances and nothing else, which is exactly the population reading three source files
 * would already have covered — so it would let this sweep drift back to the layer it used to stop
 * at while still reporting a healthy number. This one fails unless the sweep is reaching boards
 * that carry the mechanic in their own code, and those are where the defect actually was: of the
 * ten, SIX were painting `--civic` on a lifted chip when this widening first ran.
 */
const PICKUP_FLOOR = 50;
const BESPOKE_PICKUP_FLOOR = 8;
const HELD_READING_FLOOR = 400;

test("the verdict channel detector recognises a tint of a verdict, and only that", () => {
  // Without this the claim below could go green because the detector had stopped detecting, and
  // a colour sweep that classifies nothing looks exactly like a board that paints nothing.
  const host = document.createElement("div");
  document.body.appendChild(host);
  try {
    const channel = withProbe(host, (probe) => channelOver(probe, "var(--paper)"));
    const resolve = (value: string): string =>
      withProbe(host, (probe) => {
        probe.style.color = value;
        return getComputedStyle(probe).color;
      });
    // Direction one: the tint that shipped. `.lesson-match__item[data-state="held"]` painted
    // exactly this under every picked-up item, and it is not the bare token. Classified to the
    // token it came out of, since a merged channel could not tell a chip that TURNS brick from
    // one that was already civic.
    expect(
      channel.get(resolve("color-mix(in srgb, var(--brick) 12%, var(--paper))")),
      "the 12% brick tint that shipped on a held match item is not recognised as the verdict channel",
    ).toBe("--brick");
    expect(
      channel.get(resolve("var(--civic)")),
      "the bare civic token is not recognised as the verdict channel",
    ).toBe("--civic");
    // Direction two: a detector that matched everything would report every board and be worth
    // nothing. The neutral tint is what a pressed chip legitimately wears, and SIGNAL_DEEP is
    // what this lane moved the held state ONTO, so a detector that flagged either would make
    // the fix impossible to distinguish from the defect.
    expect(
      channel.has(resolve("color-mix(in srgb, var(--ink) 20%, var(--paper))")),
      "a neutral ink tint is being read as a verdict colour, so the sweep below flags every pressed chip",
    ).toBe(false);
    expect(
      channel.has(resolve("var(--signal-deep)")),
      "SIGNAL_DEEP is being read as a verdict colour, so the third hue is unusable",
    ).toBe(false);
  } finally {
    host.remove();
  }
});

test("nothing a learner has merely PICKED UP is painted in the verdict palette", async () => {
  const { pickups, bespokePickups, judged, identityHues, held, heldReadings, shardsRun } =
    found;
  expect(
    shardsRun.size,
    `only ${shardsRun.size} of ${SHARDS} shards ran, so this claim is made over part of the population`,
  ).toBe(SHARDS);

  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(
      ".qa-frames/pre-commit-pickup-colour.json",
      JSON.stringify(
        {
          pickups: Array.from(new Set(pickups)).sort(),
          bespokePickups: Array.from(new Set(bespokePickups)).sort(),
          judged: Array.from(new Set(judged)).sort(),
          // Recorded and not asserted: a tray keyed on the KIND of term in the correctness
          // palette is a real question about R26 and it is not the one this file asks, so it is
          // left where the next reader will find it rather than folded into the claim above.
          identityHues: Array.from(new Set(identityHues)).sort(),
          heldReadings,
          held: held.map(
            (reading) =>
              `${reading.visual}${reading.bespoke ? " (bespoke)" : ""} control ${reading.control} "${reading.named}": ${reading.face} goes ${reading.was} -> ${reading.became} (${reading.token}) on pickup`,
          ),
        },
        null,
        2,
      ),
      { encoding: "utf-8" },
    );
  }

  expect(
    Array.from(
      new Set(
        held.map(
          (reading) =>
            `${reading.visual}: lifting "${reading.named}" turns its ${reading.face} from ${reading.was} to ${reading.token}, which is the correctness palette on something the learner has not offered`,
        ),
      ),
    ).join("\n    "),
    "these boards mark a chip right or wrong the instant it is picked up, so the learner is told the answer by the act of reaching for it",
  ).toBe("");

  expect(
    new Set(pickups).size,
    "no placed visual offered a control that could be held without being judged, so this claim is empty",
  ).toBeGreaterThanOrEqual(PICKUP_FLOOR);
  expect(
    new Set(bespokePickups).size,
    "every pickup board found is one of the three shared kinds, so this sweep has narrowed back to the layer that was edited and would miss a bespoke widget carrying its own copy of the mechanic",
  ).toBeGreaterThanOrEqual(BESPOKE_PICKUP_FLOOR);
  expect(
    heldReadings,
    "no face was read off a held control, so the claim above holds over nothing",
  ).toBeGreaterThanOrEqual(HELD_READING_FLOOR);
}, 60_000);

test("every excused dial still qualifies for its excuse, and still needs it", () => {
  const { sliders, committing, verdicts } = found;
  const live = new Set(sliders);
  const commits = new Set(committing);
  const colours = new Set(verdicts.map((reading) => reading.visual));
  for (const entry of DIAL_IS_THE_COMMIT) {
    // Direction one: an entry that stops qualifying fails, so a renamed or deleted board cannot
    // sit here forever, and one that GAINS a Check has to leave — because then it does have a
    // pre-commit state and the excuse has stopped describing it.
    expect(
      live.has(entry.visual),
      `${entry.visual} is excused here but renders no slider any more`,
    ).toBe(true);
    expect(
      commits.has(entry.visual),
      `${entry.visual} now offers a commit control, so it HAS a pre-commit state and cannot be excused as a dial that is its own commit`,
    ).toBe(false);
    // Direction two: a listed board that no longer paints the palette has to leave, or the list
    // goes on excusing something it has stopped doing and nobody finds out.
    expect(
      colours.has(entry.visual),
      `${entry.visual} no longer turns the verdict palette on its readout, so this exemption excuses nothing`,
    ).toBe(true);
  }
});

/* -------------------------------------------------------------------------- */
/* Frames                                                                      */
/* -------------------------------------------------------------------------- */

function testViewportBox(): {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
} {
  const frameElement = window.frameElement as HTMLElement | null;
  if (!frameElement) {
    throw new Error("not running inside vitest's tester iframe, so nothing can be clipped");
  }
  const box = frameElement.getBoundingClientRect();
  const outer = window.parent as Window;
  return {
    x: box.left + outer.scrollX,
    y: box.top + outer.scrollY,
    width: box.width,
    height: box.height,
    scale: box.height / window.innerHeight,
  };
}

/**
 * A magnified crop of one element, from the same rendered page as the full frame beside it.
 *
 * The full-viewport frame is what the spatial rule asks for and it is taken as well, but P2-22 is a
 * claim about a COLOUR on one short line of math, and at 1024x580 the fixed and the broken board
 * are indistinguishable to the eye: `--civic` and the neutral label are both dark, and the readout
 * is 14px. Magnifying the same capture is not a different screen — the clip is in page coordinates
 * and `scale` is CDP's zoom on the output — so what this shows is exactly the pixels a learner
 * gets, large enough to be looked at.
 */
async function shootRegion(name: string, element: HTMLElement, scale = 6): Promise<void> {
  await document.fonts.ready;
  const frame = testViewportBox();
  const rect = element.getBoundingClientRect();
  const session = cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
  };
  const shot = await session.send("Page.captureScreenshot", {
    format: "png",
    clip: {
      x: frame.x + rect.left - 6,
      y: frame.y + rect.top - 4,
      width: rect.width + 12,
      height: rect.height + 8,
      scale,
    },
  });
  expect(shot.data, `no screenshot data for ${name}`).toBeTruthy();
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(`.qa-frames/${name}.png`, shot.data, { encoding: "base64" });
  }
}

async function shoot(name: string): Promise<void> {
  await document.fonts.ready;
  const box = testViewportBox();
  expect(
    box.scale,
    `the tester iframe is scaled to ${box.scale.toFixed(3)}, so this frame is not a ${VIEWPORT.width}x${VIEWPORT.height} screen`,
  ).toBeCloseTo(1, 1);
  const session = cdp() as unknown as {
    send: (method: string, params?: Record<string, unknown>) => Promise<{ data: string }>;
  };
  const shot = await session.send("Page.captureScreenshot", {
    format: "png",
    clip: {
      x: box.x,
      y: box.y,
      width: Math.min(box.width, VIEWPORT.width),
      height: Math.min(box.height, VIEWPORT.height),
      scale: 1,
    },
  });
  expect(shot.data, `no screenshot data for ${name}`).toBeTruthy();
  if (CAPTURE_EVIDENCE) {
    await commands.writeFile(`.qa-frames/${name}.png`, shot.data, { encoding: "base64" });
  }
}

/**
 * The two boards P2-22 is about, photographed in the state the report is a claim about.
 *
 * `factor-pair-stepper` is scrubbed onto the answering pair with nothing committed, which is the
 * frame the decision rests on. `common-measure-classify` is the widget the round-1 report NAMED,
 * shot untouched, because the readout it describes is not on that board at all.
 */
test("the pre-commit state is photographed at the reviewer's viewport", async () => {
  const untouched = await mountVisual("common-measure-classify");
  await awaitTypeset("common-measure-classify", untouched);
  expect(
    untouched.querySelector(".lesson-interactive__controls"),
    "common-measure-classify drew no controls",
  ).not.toBeNull();
  await shoot(
    `p2-22-common-measure-classify-untouched-${VIEWPORT.width}x${VIEWPORT.height}`,
  );
  unmount();

  const host = await mountVisual("factor-pair-stepper");
  await awaitTypeset("factor-pair-stepper", host);
  const range = host.querySelector<HTMLInputElement>('input[type="range"]');
  if (range === null) {
    throw new Error("factor-pair-stepper drew no slider");
  }
  // The opening board is `x^2 + 13x + 36`, whose factor pairs are (1,36) (2,18) (3,12) (4,9)
  // (6,6): the answering pair is index 3. Read off the control rather than written down.
  const target = (() => {
    for (let value = Number(range.min); value <= Number(range.max); value += 1) {
      setInputValue(range, String(value));
      const sums = Array.from(host.querySelectorAll("[data-latex]")).map(
        (node) => node.getAttribute("data-latex") ?? "",
      );
      if (sums.some((latex) => /^4 \+ 9 = 13$/.test(latex))) {
        return value;
      }
    }
    return null;
  })();
  expect(target, "the slider never reached the answering pair 4 + 9 = 13").not.toBeNull();
  setInputValue(range, String(target));
  await waitFor(
    () => host.textContent?.includes("Use this pair") === true,
    "nothing has been committed, so the Check is still on offer",
  );
  await shoot(
    `p2-22-factor-pair-stepper-on-the-answer-uncommitted-${VIEWPORT.width}x${VIEWPORT.height}`,
  );

  const readout = Array.from(host.querySelectorAll<HTMLElement>("[data-latex]")).find(
    (node) => (node.getAttribute("data-latex") ?? "") === "4 + 9 = 13",
  );
  if (!readout) {
    throw new Error("the sum readout is not on the board at the answering pair");
  }
  const row = readout.closest<HTMLElement>("p");
  await shootRegion(`p2-22-factor-pair-stepper-readout-x6-uncommitted`, row ?? readout);
}, 120_000);
