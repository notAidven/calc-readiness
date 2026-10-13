/**
 * A later round on a board must not be cleared by the mark that settled an earlier one.
 *
 * The defect: POL.7's `turning-points-estimate` deals `(x - 1)^2(x + 4)^3` and then
 * `2(x + 2)^4(x - 5)`. Two different-looking polynomials, and both are degree five, so both
 * bound at four turning points — with the landmark, which is the wrong answer made visible,
 * also sitting at two brackets on each. A learner who worked the first round out and then
 * left the marker where it was cleared the second without adding anything up, which is the
 * one thing a commit-then-check board cannot afford: the whole shape rests on the learner
 * committing a number they derived.
 *
 * ## What is asserted, and why it is not "the values differ"
 *
 * Reading the true values would mean parsing them out of KaTeX, and it would also be the
 * wrong claim on a board with a tolerance, where two distinct values can both accept the
 * same mark. The claim is the learner's: the setting that SETTLED an earlier round of this
 * board is offered to every later round and has to be refused. That is measured by driving
 * the real dials and the real Check button, so it is a fact about what the board does and
 * not about what its data says.
 *
 * Each round is then settled without the test knowing any answers — by bisecting the scale on
 * a board that says which way it missed, and otherwise by walking the dials' own settings
 * until one is taken. What that search returns is a position a learner could have arrived at,
 * and it is what the later rounds are probed with.
 *
 * ## Population: the behaviour, not the archetype
 *
 * This swept `visualsBuiltOn("EstimateThenCheck")` — five widgets sharing one kind — on the
 * reasoning that the kind is where the mechanic lives. That is a fact about the code. The
 * BEHAVIOUR is a board that deals several rounds in sequence and takes each round's answer as
 * a position committed on a numeric scale, and two widgets do exactly that without importing
 * a line of the kind: `linear-line-form-build` builds two lines in a row off an `m` dial and a
 * `b` dial, and `trg-amplitude-slider` reads two pairs off a level dial and a strength dial.
 * Neither was in the old population, and nothing else would have caught them.
 *
 * So the population is every registered visual that mounts a committed scale, derived off the
 * sources, and the walk MEASURES what each one turns out to be. Three kinds of member owe
 * nothing here, and each is a named list checked in both directions against that measurement,
 * so a board that quietly loses its second round fails just as loudly as one that gains a
 * defect:
 *
 *  - {@link NO_COMMIT} — an explore surface with no Check at all, so no mark ever settles;
 *  - {@link DIALS_ARE_NOT_THE_ANSWER} — the round wants something the dials do not carry, so
 *    there is no setting to re-offer;
 *  - {@link ONE_ROUND} — the dials do answer the round, and the board deals exactly one.
 *
 * ## What this sweep still does not reach, stated rather than left out
 *
 * Around a dozen boards deal several rounds in sequence and take each round's answer as a
 * TYPED string or a chosen chip — `exponent-laws-builder` and `compose-evaluate` among them —
 * and the same defect is possible on every one of them. They are not swept, and the reason is
 * a limit of the driver rather than a property of the product: an answer that has to be
 * produced cannot be discovered by trying every position, the way a setting on a dial can, so
 * nothing here could settle their first round without being told what it is. {@link REACHED}
 * counts them so the gap is a number this file fails on if it is ever quietly forgotten.
 */

import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { visualsBuiltOn, visualsMatching } from "./kindFamily";
import { LessonVisual, type LessonVisualId } from "./visuals";

/** A committed scale, as every one of these boards mounts it. */
const SCALE = /className="lesson-interactive__range"/;

const SCALE_VISUALS: readonly LessonVisualId[] = visualsMatching(SCALE);

/** A floor, not a pin. Twenty is what the scale carried when this was widened. */
const MIN_SCALE_VISUALS = 16;

/** The old population, kept only to assert that the new one is strictly wider. */
const KIND_VISUALS: readonly LessonVisualId[] = visualsBuiltOn("EstimateThenCheck");

/** How many boards to walk per widget. Every swept adopter deals at least two. */
const MAX_BOARDS = 4;

/** A guard on the round loop, well above any board's round count. */
const MAX_ROUNDS = 8;

/**
 * The most dial settings a round may be searched through. Every board here is far under it;
 * a board that is not fails rather than hanging, which is the failure worth having.
 */
const MAX_SETTINGS = 3000;

/**
 * Boards on a scale that never settle anything, so there is no mark and no round.
 *
 * Checked in both directions: an entry that grows a Check control fails, and a board that
 * loses one without being listed fails too.
 */
const NO_COMMIT: Readonly<Record<string, string>> = {
  "balance-beam-slider":
    "an explore surface: the beam is dragged to feel the balance and nothing is ever submitted",
  "rational-gauge-domain-explore":
    "an explore surface: the gauge is swept to watch the reading blow up, with no answer to commit",
};

/**
 * Boards where the dials are not what the round is graded on, so there is no setting an
 * earlier round could hand to a later one. Measured, not assumed: the walk tries every
 * setting the dials can hold and the round takes none of them, or takes all of them.
 */
const DIALS_ARE_NOT_THE_ANSWER: Readonly<Record<string, string>> = {
  "absvalue-vertex-slider":
    "the corner dial is half the answer and a typed height is the other half",
  "rate-interval-slider": "the interval dial is set first and the rate is then typed",
  "exp-factor-slider": "the factor dial is set first and the growth is then typed",
  "function-vertical-line-slider":
    "the sweep line is placed to look, and the verdict is given on separate controls",
  "geo-shadow-slider": "the shadow dial is set first and the height is then typed",
  "inequality-endpoint-drag":
    "the endpoint is dragged and the round also turns on whether the boundary is accepted or refused",
  "log-shift-slider": "the shift dial is set first and the equation is then typed",
  "percent-slider": "the percent dial is set first and the amount is then typed",
  "domain-range-slider":
    "the round turns on which direction the readings run, chosen on buttons, and the dial is graded on nothing",
  "transform-stretch-explore":
    "the gain dial is set first and the crossing is answered on its own control",
};

/**
 * Boards whose dials DO answer the round, dealing exactly one of them. Nothing precedes a
 * first round, so there is no earlier mark to refuse.
 */
const ONE_ROUND: Readonly<Record<string, string>> = {
  "transform-shift-slider":
    "one reading, taken in two stages off the same pair of dials, and the dials lock behind it",
};

/**
 * A floor under the boards this sweep does NOT reach: the ones dealing another round behind a
 * Next control without a scale to answer it on. Derived, so it moves with the tree, and
 * floored so that "the gap closed on its own" has to be demonstrated rather than assumed.
 */
const REACHED = visualsMatching(/Next: |Next reading/);
const MIN_UNREACHED_NEXT_BOARDS = 8;

function scales(host: HTMLElement): HTMLInputElement[] {
  return Array.from(
    host.querySelectorAll<HTMLInputElement>("input.lesson-interactive__range"),
  );
}

function buttonStarting(host: HTMLElement, text: string): HTMLButtonElement | null {
  return (
    Array.from(host.querySelectorAll<HTMLButtonElement>("button")).find((candidate) =>
      (candidate.textContent ?? "").trim().startsWith(text),
    ) ?? null
  );
}

/** Whether the board's own status is sitting on a refusal. */
function refused(host: HTMLElement): boolean {
  return (
    host.querySelector(".lesson-interactive__status")?.getAttribute("data-state") ===
    "wrong"
  );
}

function said(host: HTMLElement): string {
  return host.querySelector(".lesson-interactive__status")?.textContent ?? "";
}

/** Every value a dial can hold, in the order it holds them. */
function positions(dial: HTMLInputElement): number[] {
  const min = Number(dial.min);
  const max = Number(dial.max);
  const step = Number(dial.step) || 1;
  const out: number[] = [];
  for (let value = min; value <= max + 1e-9; value += step) {
    out.push(Number(value.toFixed(6)));
  }
  return out;
}

/** Put the dials on `setting` and press Check. `null` when the board offers no Check. */
function commit(host: HTMLElement, setting: readonly number[]): boolean | null {
  const dials = scales(host);
  if (dials.length !== setting.length || dials.some((dial) => dial.disabled)) {
    return null;
  }
  dials.forEach((dial, index) => {
    fireEvent.change(dial, { target: { value: String(setting[index]) } });
  });
  const check = buttonStarting(host, "Check");
  if (!check) {
    return null;
  }
  fireEvent.click(check);
  return !refused(host);
}

/** Where the dials are sitting right now. */
function reading(host: HTMLElement): number[] {
  return scales(host).map((dial) => Number(dial.value));
}

/**
 * Settle the round and report the setting that did it, or `null` if the dials never settle
 * anything. Nothing here knows any answer: a board that says which way the mark missed is
 * bisected on its own words, and every other board has its dials walked until one is taken.
 */
function settle(host: HTMLElement): number[] | null {
  const dials = scales(host);
  if (dials.length === 0) {
    return null;
  }
  const axes = dials.map(positions);
  const total = axes.reduce((product, axis) => product * axis.length, 1);
  if (total > MAX_SETTINGS) {
    throw new Error(
      `the dials hold ${total} settings, past the ${MAX_SETTINGS} this sweep will search`,
    );
  }

  if (axes.length === 1) {
    const [axis] = axes as [number[]];
    let lo = 0;
    let hi = axis.length - 1;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const at = axis[mid] as number;
      const took = commit(host, [at]);
      if (took === null) {
        return null;
      }
      if (took) {
        return [at];
      }
      const words = said(host);
      if (words.includes("too far right")) {
        hi = mid - 1;
      } else if (words.includes("too far left")) {
        lo = mid + 1;
      } else {
        // Not a board that says which way it missed, so fall through and walk the dial.
        break;
      }
    }
  }

  for (let n = 0; n < total; n += 1) {
    let rest = n;
    const setting = axes.map((axis) => {
      const at = axis[rest % axis.length] as number;
      rest = Math.floor(rest / axis.length);
      return at;
    });
    const took = commit(host, setting);
    if (took === null) {
      return null;
    }
    if (took) {
      return setting;
    }
  }
  return null;
}

interface Probe {
  readonly board: number;
  readonly round: number;
  readonly at: readonly number[];
}

type Verdict = "no-commit" | "dials-not-the-answer" | "one-round" | "swept";

interface Walked {
  readonly id: LessonVisualId;
  readonly verdict: Verdict;
  readonly boards: number;
  readonly rounds: number;
  readonly probed: number;
  /** Every later round that took a setting which had already settled an earlier one. */
  readonly taken: Probe[];
}

/** Walk one widget's boards, probing every later round with every earlier settling mark. */
function walk(id: LessonVisualId): Walked {
  const { container: host, unmount } = render(
    <LessonVisual id={id} onComplete={() => {}} />,
  );
  const taken: Probe[] = [];
  let boards = 0;
  let rounds = 0;
  let probed = 0;
  let gradesItsDials = true;
  try {
    if (!buttonStarting(host, "Check")) {
      return { id, verdict: "no-commit", boards: 0, rounds: 0, probed: 0, taken };
    }
    for (let board = 0; board < MAX_BOARDS; board += 1) {
      const settledAt: number[][] = [];
      let round = 0;
      while (round < MAX_ROUNDS) {
        for (const earlier of settledAt) {
          const took = commit(host, earlier);
          if (took === null) {
            break;
          }
          probed += 1;
          if (took) {
            taken.push({ board, round, at: earlier });
            // The round took it, so the walk cannot continue meaningfully. The assertion
            // reports it; stopping here keeps the failure legible.
            return {
              id,
              verdict: "swept",
              boards: boards + 1,
              rounds: rounds + round + 1,
              probed,
              taken,
            };
          }
        }
        const found = settle(host);
        if (!found) {
          // No setting of the dials is ever taken, so the round is graded on something the
          // dials do not carry.
          gradesItsDials = round > 0;
          break;
        }
        settledAt.push(found);
        round += 1;

        // What the board did with the settled round is also how the walk learns whether it
        // WAS one. Four endings count, and every board here takes one of them: it offers the
        // way on, it closes, it locks the dials, or it clears them for the next question.
        const next = buttonStarting(host, "Next");
        if (next) {
          fireEvent.click(next);
          continue;
        }
        if (host.querySelector(".lesson-interactive__reset")) {
          break;
        }
        const dials = scales(host);
        if (dials.length === 0 || dials.some((dial) => dial.disabled)) {
          break;
        }
        if (reading(host).some((at, index) => at !== found[index])) {
          continue;
        }
        // The dials still read exactly what they were given and nothing else moved, so the
        // board took no notice of the commit: it is not grading what this walk can set.
        gradesItsDials = round > 1;
        round -= 1;
        settledAt.pop();
        break;
      }
      if (!gradesItsDials) {
        break;
      }
      boards += 1;
      rounds += round;
      const restart = host.querySelector<HTMLButtonElement>(".lesson-interactive__reset");
      if (!restart) {
        break;
      }
      fireEvent.click(restart);
    }
  } finally {
    unmount();
  }

  const verdict: Verdict = !gradesItsDials
    ? "dials-not-the-answer"
    : rounds < boards * 2
      ? "one-round"
      : "swept";
  return { id, verdict, boards, rounds, probed, taken };
}

const WALKED: Walked[] = [];

describe("a later round is not answered by an earlier round's mark", () => {
  it(`sweeps ${SCALE_VISUALS.length} boards that commit an answer on a scale`, () => {
    expect(
      SCALE_VISUALS.length,
      "no registered widget mounts a committed scale, so this sweep measures nothing",
    ).toBeGreaterThanOrEqual(MIN_SCALE_VISUALS);
    expect(
      SCALE_VISUALS,
      "turning-points-estimate is the board this sweep was measured on and it has left the population",
    ).toContain("turning-points-estimate");
    for (const id of KIND_VISUALS) {
      expect(
        SCALE_VISUALS,
        `${id} is built on EstimateThenCheck, so the widened population has to still contain it`,
      ).toContain(id);
    }
    expect(
      SCALE_VISUALS.filter((id) => !KIND_VISUALS.includes(id)).length,
      "the population has collapsed back onto the kind it used to stop at",
    ).toBeGreaterThanOrEqual(10);
  });

  it.each(SCALE_VISUALS)(
    "%s refuses each earlier round's mark",
    (id) => {
      const walked = walk(id);
      WALKED.push(walked);
      expect(
        walked.taken.map(
          (probe) =>
            `board ${probe.board} round ${probe.round} at [${probe.at.join(", ")}]`,
        ),
        `${id} lets a later round be cleared by the mark that settled an earlier one, so a learner who remembers the number never works the second question`,
      ).toEqual([]);
    },
    120_000,
  );

  /**
   * The floors, which the assertion above needs because containment over an empty set of
   * probes holds trivially, and the composition, because a floor constrains size and not
   * shape: a population that drifted back to the five widgets on the shared kind would clear
   * a count and lose the two bespoke boards this widening exists for.
   */
  it("actually probed later rounds, on boards outside the kind as well as on it", () => {
    const swept = WALKED.filter((walked) => walked.verdict === "swept");
    expect(
      swept.map((walked) => walked.id),
      "no board was swept at all, so every assertion above held over nothing",
    ).not.toEqual([]);

    for (const walked of swept) {
      expect(
        walked.boards,
        `${walked.id}: only one board was walked`,
      ).toBeGreaterThanOrEqual(2);
      expect(
        walked.rounds,
        `${walked.id}: fewer rounds than boards were settled`,
      ).toBeGreaterThanOrEqual(walked.boards * 2);
      expect(walked.probed, `${walked.id}: no later round was probed`).toBeGreaterThan(0);
    }

    for (const id of KIND_VISUALS) {
      expect(
        swept.map((walked) => walked.id),
        `${id} is built on the kind this sweep started at and it was not swept`,
      ).toContain(id);
    }

    const bespoke = swept
      .map((walked) => walked.id)
      .filter((id) => !KIND_VISUALS.includes(id));
    expect(
      bespoke,
      "linear-line-form-build reimplements the mechanic off two dials and the old population could not see it",
    ).toContain("linear-line-form-build");
    expect(
      bespoke,
      "trg-amplitude-slider reimplements the mechanic off two dials and the old population could not see it",
    ).toContain("trg-amplitude-slider");
    expect(
      bespoke.length,
      "the sweep is no wider than the kind it used to stop at",
    ).toBeGreaterThanOrEqual(2);
  });

  /**
   * The three exception lists, each against what the walk measured rather than against
   * itself. Both directions, so a listed board that stops qualifying fails and a board that
   * starts qualifying without being listed fails.
   */
  it.each([
    ["no-commit", NO_COMMIT] as const,
    ["dials-not-the-answer", DIALS_ARE_NOT_THE_ANSWER] as const,
    ["one-round", ONE_ROUND] as const,
  ])("the %s exceptions are the boards that measure that way", (verdict, listed) => {
    expect(
      WALKED.length,
      "the walk did not reach every board, so this census is comparing a list against a partial measurement",
    ).toBe(SCALE_VISUALS.length);
    const measured = WALKED.filter((walked) => walked.verdict === verdict)
      .map((walked) => walked.id as string)
      .sort();
    const named = Object.keys(listed).sort();

    expect(
      named.filter((id) => !measured.includes(id)),
      `these are excused as "${verdict}" and no longer measure that way, so each is either a stale name or a board that has quietly started owing this sweep`,
    ).toEqual([]);
    expect(
      measured.filter((id) => !named.includes(id)),
      `these measure as "${verdict}" and are not excused, so either a board has lost the rounds it used to deal or the driver has stopped reaching it`,
    ).toEqual([]);
    expect(named.length, `nothing is excused as "${verdict}"`).toBeGreaterThan(0);
  });

  it("does not excuse one board twice", () => {
    const all = [
      ...Object.keys(NO_COMMIT),
      ...Object.keys(DIALS_ARE_NOT_THE_ANSWER),
      ...Object.keys(ONE_ROUND),
    ];
    expect(new Set(all).size, "a board is excused by two lists at once").toBe(all.length);
    expect(
      all.length,
      "the exception lists have grown until they excuse the whole population",
    ).toBeLessThan(SCALE_VISUALS.length);
  });

  /**
   * The gap this sweep does not close, kept as a number rather than as a sentence. These
   * boards deal another round behind a Next control and answer it with something other than a
   * dial, so the same defect is possible on every one and nothing here would see it.
   */
  it("still cannot reach the boards that answer their rounds by typing", () => {
    const unreached = REACHED.filter((id) => !SCALE_VISUALS.includes(id));
    expect(
      unreached.length,
      "the typed-answer boards this sweep cannot drive have gone; if that is real, the caveat in this file's header should go with them",
    ).toBeGreaterThanOrEqual(MIN_UNREACHED_NEXT_BOARDS);
  });
});
