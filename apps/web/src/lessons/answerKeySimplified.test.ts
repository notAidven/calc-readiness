/**
 * Every answer key a generator draws is a fully reduced fraction and a fully simplified radical.
 *
 * ## The defect this was written for
 *
 * `docs/qa-d2-round-1.md` P0-1 and P0-2. Two CFU generators keyed answers they had not
 * finished. `cfu.rad1.quotient-radical` drew its denominator root independently of its
 * coefficient, so the fraction the answer is written as could share a factor: at seed 2 the
 * draw was `sqrt(216/16)`, keyed `6*sqrt(6)/4` where the answer is `3*sqrt(6)/2`. And
 * `cfu.rad2.combine-rationalize` multiplied its two draws into the radicand without stopping
 * either from carrying a square, keying `sqrt(18)` for `3*sqrt(2)` and `sqrt(49)` for `7`.
 * Both prompts ask for a simplified radical and the accepted list is computed FROM the key, so
 * in both cases the learner who finished the job was the one marked wrong.
 *
 * The round measured the two over an ad-hoc 4000-draw sweep (1626 and 2087 defective) and
 * committed no test, which is a fix nobody can re-break and catch. This is that sweep, at a
 * size the suite can afford, over a population derived rather than typed.
 *
 * ## Why the population is every generator in the tree, pool templates included
 *
 * Nothing about either defect is a property of RAD.1 or RAD.2. What makes a generator able to
 * have it is that it draws parameters and computes a NUMBER or a RADICAL out of them for a
 * learner to be graded against, and that is true of every template in the item bank as much as
 * of the 41 a check draws from: the practice card grades a typed answer against a pool key the
 * same way the re-ask grades one against a CFU key. Scoping this to the CFU-only list would be
 * scoping the guard to where the two reported instances happened to live, so the sweep runs
 * over the nine domain pools and `CFU_ONLY_TEMPLATE_LIST` together, and the membership test is
 * the BEHAVIOUR: did this template ever draw a key with something in it that can be reduced or
 * simplified at all.
 *
 * ## Where the classifier stops, stated rather than left to be discovered
 *
 * "Reduced and simplified" is decidable arithmetic for an integer fraction, an integer
 * radicand and a coefficient over a denominator. It is not decidable by regex for a RATIONAL
 * EXPRESSION: whether `(x + 2)/(x - 6)` is in lowest terms is a question about polynomial
 * factors, and `(10*x + 12)/(x*(x + 2))` is a shape no arithmetic reading of a string settles.
 * So the atoms below are numeric only, and D5's rational-expression keys are outside this
 * sweep by construction rather than by oversight. The negative controls pin that boundary from
 * the other side: an algebraic key must produce NO atom, so a widened regex that started
 * reading `3*x^2/2` as the fraction `2/2` fails here rather than reddening D5.
 *
 * The counterpart is that a variable radicand's numeric factor IS decidable and is swept:
 * `2*n^2*sqrt(2*n)` owes a squarefree `2` exactly as `sqrt(2)` does, which is what brings
 * RAD.4's two templates into the population.
 *
 * ## What each assertion is standing under
 *
 * A derived population can be derived wrongly, and a floor constrains its size and not its
 * shape, so the composition is asserted beside the count: both sources, five atom kinds, the
 * node and domain spread, and the population with the two reported templates removed. The
 * classifier itself carries positive controls (the four historical keys quoted above must be
 * caught) and negative ones (the shapes it must not read), because a detector that quietly
 * stopped detecting would leave every sweep below green over a tree it was no longer reading.
 */

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
  generateFromTemplate,
  type ItemTemplate,
} from "@cr/item-bank";
import { describe, expect, it } from "vitest";

import { CFU_ONLY_TEMPLATE_LIST } from "./cfuVariants";

const POOL: readonly ItemTemplate[] = [
  ...D1_PRACTICE_TEMPLATES,
  ...D2_PRACTICE_TEMPLATES,
  ...D3_PRACTICE_TEMPLATES,
  ...D4_PRACTICE_TEMPLATES,
  ...D5_PRACTICE_TEMPLATES,
  ...D7_PRACTICE_TEMPLATES,
  ...D8_PRACTICE_TEMPLATES,
  ...D9_PRACTICE_TEMPLATES,
  ...D10_PRACTICE_TEMPLATES,
];

/** Where a generator is reached from. Both halves grade a learner against a drawn key. */
type Source = "pool" | "cfu-only";

const GENERATORS: readonly { source: Source; template: ItemTemplate }[] = [
  ...POOL.map((template) => ({ source: "pool" as const, template })),
  ...CFU_ONLY_TEMPLATE_LIST.map((template) => ({ source: "cfu-only" as const, template })),
];

/**
 * Draws per template, and the seed they start from.
 *
 * Deterministic and offset clear of the seeds the other sweeps walk (`4000` in
 * `cfuAnswerShape.test.tsx`, `6100` in its checker pass, `91_000` for the CFU resolver), so a
 * failure here reproduces by rerunning the file rather than by luck. 150 is sized off the
 * measured density of the two defects this was written for: at 40.7% and 52.2% of draws, one
 * escaping 150 independent draws is not a rate this suite needs to plan for, and the whole
 * sweep is 287 templates for a few seconds.
 */
const DRAWS = 150;
const SEED_BASE = 44_000;

function gcdOf(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

/** The smallest `d > 1` whose square divides `value`, or `0` when `value` is squarefree. */
function squareFactorOf(value: number): number {
  for (let d = 2; d * d <= value; d += 1) {
    if (value % (d * d) === 0) {
      return d;
    }
  }
  return 0;
}

/**
 * The five shapes in a key whose reducedness or simplification is decidable arithmetic.
 *
 * `radical-fraction` is P0-1's shape and `radicand` is P0-2's. The other three are the same
 * property on the shapes the rest of the tree keys: a bare integer fraction, the numeric
 * factor of a variable radicand, and a multiple of pi over an integer.
 */
type AtomKind =
  | "radical-fraction"
  | "radicand"
  | "radicand-factor"
  | "fraction"
  | "pi-fraction";

interface Atom {
  kind: AtomKind;
  /** The substring read, quoted back in a failure so the key can be found in it. */
  text: string;
  /** Null when this atom is finished, else what is left to do to it. */
  fault: string | null;
}

/**
 * Every decidable atom in one answer key, each already judged.
 *
 * Read off the string rather than off `template_params`, deliberately: the key is what the
 * accepted list is computed from and what the reveal prints, so it is the thing a learner is
 * held to. A parameter set can be perfectly coprime and still be assembled into a key that is
 * not.
 */
function keyAtoms(key: string): readonly Atom[] {
  const found: Atom[] = [];

  // A coefficient times a root over a denominator: the fraction has to be in lowest terms.
  for (const match of key.matchAll(/(\d+)?\s*\*?\s*sqrt\(\s*(\d+)\s*\)\s*\/\s*(\d+)/g)) {
    const coefficient = match[1] === undefined ? 1 : Number(match[1]);
    const denominator = Number(match[3]);
    const shared = gcdOf(coefficient, denominator);
    found.push({
      kind: "radical-fraction",
      text: match[0],
      fault:
        shared === 1
          ? null
          : `the coefficient ${coefficient} and the denominator ${denominator} still share ${shared}`,
    });
  }

  // An integer under a root: nothing square may be left inside it.
  for (const match of key.matchAll(/sqrt\(\s*(\d+)\s*\)/g)) {
    const radicand = Number(match[1]);
    const root = squareFactorOf(radicand);
    found.push({
      kind: "radicand",
      text: match[0],
      fault:
        root === 0
          ? null
          : `${radicand} still holds the perfect square ${root * root}, so ${root} has not been pulled out`,
    });
  }

  // The numeric factor of a radicand that also carries a variable, which owes the same.
  for (const match of key.matchAll(/sqrt\(\s*(\d+)\s*\*/g)) {
    const factor = Number(match[1]);
    const root = squareFactorOf(factor);
    found.push({
      kind: "radicand-factor",
      text: match[0],
      fault:
        root === 0
          ? null
          : `the numeric factor ${factor} still holds the perfect square ${root * root}`,
    });
  }

  // A bare integer fraction. The lookbehind keeps `x^2/2` out, where the digits belong to an
  // exponent and the denominator is nobody's numerator; the lookahead keeps `4/5x` out.
  for (const match of key.matchAll(/(?<![\w^.\\])(\d+)\s*\/\s*(\d+)(?![\w.])/g)) {
    const numerator = Number(match[1]);
    const denominator = Number(match[2]);
    const shared = gcdOf(numerator, denominator);
    found.push({
      kind: "fraction",
      text: match[0],
      fault:
        shared === 1
          ? null
          : `${numerator}/${denominator} is not in lowest terms, both being divisible by ${shared}`,
    });
  }

  // A multiple of pi over an integer, D9's radian shape. A missing numerator is 1.
  for (const match of key.matchAll(/(?<![\w^.])(\d*)\s*pi\s*\/\s*(\d+)/g)) {
    const numerator = match[1] === undefined || match[1] === "" ? 1 : Number(match[1]);
    const denominator = Number(match[2]);
    const shared = gcdOf(numerator, denominator);
    found.push({
      kind: "pi-fraction",
      text: match[0],
      fault:
        shared === 1
          ? null
          : `${numerator}pi/${denominator} is not in lowest terms, both being divisible by ${shared}`,
    });
  }

  return found;
}

interface Measured {
  source: Source;
  templateId: string;
  nodeId: string;
  /** The `d2.` / `cfu.` segment, which is the lane a template's keys are authored in. */
  lane: string;
  atoms: number;
  kinds: ReadonlySet<AtomKind>;
  faults: readonly string[];
}

/** One pass over every generator, from which both the population and the verdict are read. */
const MEASURED: readonly Measured[] = GENERATORS.map(({ source, template }) => {
  const kinds = new Set<AtomKind>();
  const faults = new Set<string>();
  let atoms = 0;
  for (let draw = 0; draw < DRAWS; draw += 1) {
    const seed = SEED_BASE + draw;
    const key = generateFromTemplate(template, "practice", seed).answer.answer_key ?? "";
    for (const atom of keyAtoms(key)) {
      atoms += 1;
      kinds.add(atom.kind);
      if (atom.fault !== null) {
        faults.add(
          `${template.template_id} at seed ${seed} keyed ${JSON.stringify(key)}: in "${atom.text}", ${atom.fault}`,
        );
      }
    }
  }
  return {
    source,
    templateId: template.template_id,
    nodeId: template.node_id,
    lane: template.template_id.split(".")[0] ?? "",
    atoms,
    kinds,
    faults: [...faults],
  };
});

/** The population: every generator that ever drew a key with something reducible in it. */
const POPULATION: readonly Measured[] = MEASURED.filter((measured) => measured.atoms > 0);

/**
 * The two templates the round reported, named here as a COVERAGE claim rather than as the
 * population. A classifier that stopped reading `6*sqrt(6)/5` or `sqrt(21)` would shrink the
 * population past both of them and still clear every floor below, so the guard has to say out
 * loud that it still covers the defect it was written for.
 */
const REPORTED = ["cfu.rad1.quotient-radical", "cfu.rad2.combine-rationalize"] as const;

/**
 * Floors, all measured at this tip and set below the measurement so growth needs no edit here.
 *
 * Measured: 56 templates in the population out of 287 swept, 47 of them pool and 9 CFU-only,
 * over 19 nodes and 8 lanes, 9271 atoms judged, 0 faults. The per-kind template counts were
 * `fraction` 27, `radicand` 18, `pi-fraction` 12, `radical-fraction` 7, `radicand-factor` 2.
 */
const POPULATION_FLOOR = 50;
const POOL_FLOOR = 40;
const CFU_ONLY_FLOOR = 8;
const NODE_FLOOR = 17;
const LANE_FLOOR = 7;
const ATOM_FLOOR = 8000;
const BEYOND_REPORTED_FLOOR = 50;
const KIND_FLOORS: ReadonlyArray<readonly [AtomKind, number]> = [
  ["fraction", 22],
  ["radicand", 15],
  ["pi-fraction", 10],
  ["radical-fraction", 6],
  ["radicand-factor", 2],
];

const withKind = (kind: AtomKind) =>
  POPULATION.filter((measured) => measured.kinds.has(kind)).map(
    (measured) => measured.templateId,
  );

describe("the classifier reads what it claims to read", () => {
  // Positive controls, and they are not synthetic: every string here is a key one of the two
  // generators actually produced at the seed named in `docs/qa-d2-round-1.md`. A detector that
  // stops catching these makes every sweep below vacuous while leaving it green.
  it.each([
    ["6*sqrt(6)/4", "radical-fraction"],
    ["6*sqrt(3)/6", "radical-fraction"],
    ["sqrt(18)", "radicand"],
    ["sqrt(36)", "radicand"],
    ["sqrt(9)", "radicand"],
    ["sqrt(49)", "radicand"],
    ["2/4", "fraction"],
    ["2pi/4", "pi-fraction"],
    ["2*n^2*sqrt(8*n)", "radicand-factor"],
  ])("%s is caught, as a %s fault", (key, kind) => {
    const faulty = keyAtoms(key).filter((atom) => atom.fault !== null);
    expect(
      faulty.map((atom) => atom.kind),
      `${key} was read as ${JSON.stringify(keyAtoms(key))}`,
    ).toContain(kind);
  });

  // Negative controls, which pin the boundary the header states. The algebraic entries are the
  // ones that matter: they are real keys from D2's and D5's pools, and a regex widened until it
  // read them would report faults over shapes this file cannot judge.
  it.each([
    "3*sqrt(6)/2",
    "6*sqrt(2)/5",
    "sqrt(13)/3",
    "sqrt(21)",
    "2sqrt(3)/3",
    "(sqrt(6)+sqrt(2))/4",
    "35/18",
    "-40/41",
    "4pi/3",
    "pi/2",
    "{56/15}",
    "{-2, 3/4}",
    "-4/5, decreasing",
    "x^4/y^3",
    "3*x^2/2",
    "(x + 2)/(x - 6)",
    "(10*x + 12)/(x*(x + 2))",
    "4/(7x); x = -7, 0",
    "2*n^2*sqrt(2*n)",
    "2*abs(p)*t^2*sqrt(2*t)",
  ])("%s is read without a fault", (key) => {
    expect(
      keyAtoms(key)
        .filter((atom) => atom.fault !== null)
        .map((atom) => `${atom.text}: ${atom.fault}`),
    ).toEqual([]);
  });
});

describe("the sweep's population is derived, and derived to the right shape", () => {
  it("found a population, and one that is neither empty nor the whole tree", () => {
    expect(
      POPULATION.length,
      `only ${POPULATION.length} of ${GENERATORS.length} generators drew a key with anything reducible in it, so the sweep below is measuring almost nothing`,
    ).toBeGreaterThanOrEqual(POPULATION_FLOOR);
    // The other end. A regex that started matching everything would look like the widest
    // possible sweep while reporting faults over shapes it cannot judge.
    expect(
      POPULATION.length,
      `${POPULATION.length} of ${GENERATORS.length} generators derived in, so the classifier has stopped discriminating between an arithmetic key and an algebraic one`,
    ).toBeLessThan(GENERATORS.length / 2);
    expect(
      MEASURED.reduce((total, measured) => total + measured.atoms, 0),
      "the sweep judged nothing at all",
    ).toBeGreaterThanOrEqual(ATOM_FLOOR);
  });

  it("still covers the two generators it was written for", () => {
    const missing = REPORTED.filter(
      (id) => !POPULATION.some((measured) => measured.templateId === id),
    );
    expect(
      missing,
      `these are the templates the round fixed and they are no longer in the derived population, so this file no longer measures the defect it exists for. Population: ${POPULATION.map((m) => m.templateId).join(", ")}`,
    ).toEqual([]);
  });

  it("is wider than those two, on both sources and across the lanes", () => {
    // A floor constrains size, not shape: 50 members is satisfied by the two reported ones plus
    // 48 of anything. These are the shape.
    expect(
      POPULATION.filter((measured) => !REPORTED.some((id) => id === measured.templateId))
        .length,
      "the population is barely wider than the two templates this was written for",
    ).toBeGreaterThanOrEqual(BEYOND_REPORTED_FLOOR);
    expect(
      POPULATION.filter((measured) => measured.source === "pool").length,
      "no practice-pool generator is in the population, so this sweep has narrowed back to the CFU-only list the two reported instances happened to live in",
    ).toBeGreaterThanOrEqual(POOL_FLOOR);
    expect(
      POPULATION.filter((measured) => measured.source === "cfu-only").length,
      "no CFU-only generator is in the population, so the half of the tree that both reported defects were in is unswept",
    ).toBeGreaterThanOrEqual(CFU_ONLY_FLOOR);
    expect(
      new Set(POPULATION.map((measured) => measured.nodeId)).size,
      "the population has collapsed onto a handful of nodes",
    ).toBeGreaterThanOrEqual(NODE_FLOOR);
    expect(
      new Set(POPULATION.map((measured) => measured.lane)).size,
      `the population spans only ${[...new Set(POPULATION.map((m) => m.lane))].join(", ")}`,
    ).toBeGreaterThanOrEqual(LANE_FLOOR);
  });

  it.each(KIND_FLOORS)("reads %s atoms out of at least %i generators", (kind, floor) => {
    expect(
      withKind(kind).length,
      `${kind} is read from ${withKind(kind).length} generators (${withKind(kind).join(", ")}), so that half of the classifier is asserting almost nothing`,
    ).toBeGreaterThanOrEqual(floor);
  });
});

describe("every drawn answer key is fully reduced and fully simplified", () => {
  it("no generator in the tree keys an unfinished answer", () => {
    const faults = MEASURED.flatMap((measured) => measured.faults);
    expect(
      faults.join("\n"),
      "a generated key the learner is graded against is not the answer the prompt asks for",
    ).toBe("");
    // The floor beside it, because the line above holds for free over an empty sweep.
    expect(
      POPULATION.length,
      "nothing was swept, so the emptiness passed rather than the tree",
    ).toBeGreaterThanOrEqual(POPULATION_FLOOR);
  });
});
