import { describe, expect, it } from "vitest";

import { createRng, type ItemTemplate } from "../template";
import { D7_PRACTICE_TEMPLATES } from "./index";

/**
 * Every D7 answer key, re-derived from the RENDERED PROMPT TEXT.
 *
 * `validateTemplates` already grades each sampled key through the product checker, but it
 * takes the key as authored: a template whose prompt prints one set of numbers and whose
 * key is computed from another passes it, because both halves come from the same
 * `generate()` closure. So does any sweep that re-derives from `template_params`, which
 * agrees with the key by construction and passes over exactly the defect it should catch.
 *
 * The derivations below therefore read nothing but `prompt`. They parse the LaTeX a learner
 * actually sees, re-solve the problem with independent arithmetic, and compare against
 * `answer.answer_key`. A prompt that prints a coefficient the key does not use, a point the
 * key does not sit on, or a direction word the key contradicts fails here.
 *
 * The population is derived from `D7_PRACTICE_TEMPLATES` and asserted equal to the case
 * table in both directions, so a new template cannot join the pool without a derivation and
 * a derivation cannot outlive the template it covers.
 */

/* -------------------------------------------------------------------------- */
/* Parsing the rendered prompt                                                 */
/* -------------------------------------------------------------------------- */

/** Every `$...$` math span, in the order a reader meets them. */
function mathSpans(prompt: string): string[] {
  return [...prompt.matchAll(/\$([^$]+)\$/g)].map((match) => match[1] ?? "");
}

/** Only the spans that are a bare integer, which is how every number reaches a reader. */
function promptNumbers(prompt: string): number[] {
  return mathSpans(prompt)
    .filter((span) => /^-?\d+$/.test(span))
    .map(Number);
}

/** Every ordered pair written the way the diagrams space it: `(x,\, y)`. */
function promptPoints(prompt: string): (readonly [number, number])[] {
  return [...prompt.matchAll(/\((-?\d+),\\,\s*(-?\d+)\)/g)].map(
    (match) => [Number(match[1]), Number(match[2])] as const,
  );
}

/** A plain `(x, y)` pair, as the point-through prompts write it. */
function plainPoint(prompt: string): readonly [number, number] {
  const match = prompt.match(/\((-?\d+), (-?\d+)\)/);
  if (!match) {
    throw new Error(`no plain point in prompt: ${prompt}`);
  }
  return [Number(match[1]), Number(match[2])] as const;
}

/** A coefficient written as LaTeX, where an empty string means 1 and `-` means -1. */
function coefficient(text: string | undefined): number {
  if (text === undefined || text === "") {
    return 1;
  }
  if (text === "-") {
    return -1;
  }
  return Number(text);
}

/** `ax + by = c` exactly as `stdTex` prints it. */
function parseStandard(span: string): { a: number; b: number; c: number } {
  const match = span.match(/^(-?\d*)x ([+-]) (\d*)y = (-?\d+)$/);
  if (!match) {
    throw new Error(`not a standard-form equation: ${span}`);
  }
  const magnitude = match[3] === "" ? 1 : Number(match[3]);
  return {
    a: coefficient(match[1]),
    b: match[2] === "-" ? -magnitude : magnitude,
    c: Number(match[4]),
  };
}

/** `mx + b` exactly as `lineTex` / `slopeRhs` print it, with the intercept optional. */
function parseLinearTex(span: string): { m: number; b: number } {
  const match = span.match(/^(-?\d*)x(?: ([+-]) (\d+))?$/);
  if (!match) {
    throw new Error(`not a linear right-hand side: ${span}`);
  }
  const constant = match[3] === undefined ? 0 : Number(match[3]);
  return { m: coefficient(match[1]), b: match[2] === "-" ? -constant : constant };
}

/** The authored key for an expression answer, `-3*x + 5` or `7x + 45`. */
function parseLinearKey(key: string): { m: number; b: number } {
  const match = key.match(/^(-?\d*)\*?x(?: ([+-]) (\d+))?$/);
  if (!match) {
    throw new Error(`not a linear key: ${key}`);
  }
  const constant = match[3] === undefined ? 0 : Number(match[3]);
  return { m: coefficient(match[1]), b: match[2] === "-" ? -constant : constant };
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    [x, y] = [y, x % y];
  }
  return x || 1;
}

/** `n/d` in lowest terms with the sign on the numerator, matching `reducedFraction`. */
function fractionText(n: number, d: number): string {
  const divisor = gcd(n, d);
  const sign = d < 0 ? -1 : 1;
  return `${(sign * n) / divisor}/${Math.abs(d) / divisor}`;
}

/** An exact integer quotient, or a failure naming the pair that did not divide. */
function exactQuotient(n: number, d: number): number {
  if (d === 0 || n % d !== 0) {
    throw new Error(`prompt numbers do not divide: ${n} / ${d}`);
  }
  return n / d;
}

/** A slope as a fraction pair, however the prompt chose to print it. */
function parseSlopeTerm(text: string): readonly [number, number] {
  const fraction = text.match(/^(-?)\\dfrac\{(\d+)\}\{(\d+)\}$/);
  if (fraction) {
    const numerator = Number(fraction[2]);
    return [fraction[1] === "-" ? -numerator : numerator, Number(fraction[3])] as const;
  }
  return [coefficient(text), 1] as const;
}

/** The canonical `m|b` of a linear model, so a derivation and a key compare as numbers. */
function modelText(m: number, b: number): string {
  return `${m}|${b}`;
}

/* -------------------------------------------------------------------------- */
/* One derivation per template                                                 */
/* -------------------------------------------------------------------------- */

interface Case {
  /** Re-solve the problem from the prompt alone. */
  derive(prompt: string): string;
  /** Put the authored key in the same shape the derivation returns. */
  canon(key: string): string;
}

const identity = (key: string): string => key;
const spaceless = (key: string): string => key.replace(/\s+/g, "");
const asModel = (key: string): string => {
  const { m, b } = parseLinearKey(key);
  return modelText(m, b);
};

const CASES: Readonly<Record<string, Case>> = {
  /* ---------------------------- LF.1, slope ------------------------------- */

  "d7.lf1.table-rate.l1": {
    derive(prompt) {
      const points = promptPoints(prompt);
      if (points.length !== 4) {
        throw new Error(`expected four listed points, saw ${points.length}`);
      }
      const slopes = new Set<number>();
      for (let index = 1; index < points.length; index += 1) {
        const [xPrev, yPrev] = points[index - 1] as readonly [number, number];
        const [x, y] = points[index] as readonly [number, number];
        slopes.add(exactQuotient(y - yPrev, x - xPrev));
      }
      // The prompt promises a constant rate, so every consecutive pair owes the same one.
      if (slopes.size !== 1) {
        throw new Error(`listed points do not share one rate: ${[...slopes].join(", ")}`);
      }
      return `${[...slopes][0]}`;
    },
    canon: identity,
  },

  "d7.lf1.rise-run.l2": {
    derive(prompt) {
      const match = prompt.match(
        /Moving \$(\d+)\$ units to the right and then \$(\d+)\$ units (up|down)/,
      );
      if (!match) {
        throw new Error(`no rise-and-run move in prompt: ${prompt}`);
      }
      const run = Number(match[1]);
      const magnitude = Number(match[2]);
      return fractionText(match[3] === "up" ? magnitude : -magnitude, run);
    },
    canon: identity,
  },

  "d7.lf1.direction.l2": {
    derive(prompt) {
      const points = promptPoints(prompt);
      if (points.length !== 2) {
        throw new Error(`expected two points, saw ${points.length}`);
      }
      const [left, right] = points as [
        readonly [number, number],
        readonly [number, number],
      ];
      const [x1, y1] = left[0] <= right[0] ? left : right;
      const [x2, y2] = left[0] <= right[0] ? right : left;
      if (x2 === x1) {
        throw new Error("the two points share an x-value, so there is no slope to sign");
      }
      const rise = y2 - y1;
      return rise === 0 ? "constant" : rise > 0 ? "increasing" : "decreasing";
    },
    canon: identity,
  },

  "d7.lf1.two-point.l3": {
    derive(prompt) {
      const points = promptPoints(prompt);
      if (points.length !== 2) {
        throw new Error(`expected two points, saw ${points.length}`);
      }
      const [first, second] = points as [
        readonly [number, number],
        readonly [number, number],
      ];
      return fractionText(second[1] - first[1], second[0] - first[0]);
    },
    canon: identity,
  },

  "d7.lf1.rate-context.l3": {
    derive(prompt) {
      const [t1, v1, t2, v2] = promptNumbers(prompt);
      if (t1 === undefined || v1 === undefined || t2 === undefined || v2 === undefined) {
        throw new Error(`expected two time-and-value readings: ${prompt}`);
      }
      return `${exactQuotient(v2 - v1, t2 - t1)}`;
    },
    canon: identity,
  },

  /* ------------------------ LF.2, lines and pairs ------------------------- */

  "d7.lf2.slope-intercept.l1": {
    derive(prompt) {
      const slope = prompt.match(/slope \$m = (-?\d+)\$/);
      const crossing = prompt.match(/\$\(0, (-?\d+)\)\$/);
      if (!slope || !crossing) {
        throw new Error(`no slope and y-axis crossing in prompt: ${prompt}`);
      }
      return modelText(Number(slope[1]), Number(crossing[1]));
    },
    canon: asModel,
  },

  "d7.lf2.parallel-point.l2": {
    derive(prompt) {
      const given = prompt.match(/The line \$y = ([^$]+)\$ is given/);
      if (!given) {
        throw new Error(`no given line in prompt: ${prompt}`);
      }
      const { m } = parseLinearTex(given[1] ?? "");
      const [x1, y1] = plainPoint(prompt);
      // Parallel, so the slope carries over and only the intercept is new.
      return modelText(m, y1 - m * x1);
    },
    canon: asModel,
  },

  "d7.lf2.pair-classify.l2": {
    derive(prompt) {
      const lineA = prompt.match(/Line A is \$y = (.*?)x ([+-]) (\d+)\$/);
      const lineB = prompt.match(/line B is \$(-?\d+)y = (-?\d+)x ([+-]) (\d+)\$/);
      if (!lineA || !lineB) {
        throw new Error(`could not read both lines from prompt: ${prompt}`);
      }
      const [nA, dA] = parseSlopeTerm(lineA[1] ?? "");
      const nB = Number(lineB[2]);
      const dB = Number(lineB[1]);
      if (nA * dB === nB * dA) {
        return "parallel";
      }
      if (nA * nB === -(dA * dB)) {
        return "perpendicular";
      }
      return "neither";
    },
    canon: identity,
  },

  "d7.lf2.point-slope.l3": {
    derive(prompt) {
      const match = prompt.match(/Rewrite \$y ([+-]) (\d+) = (-?\d+)\(x ([+-]) (\d+)\)\$/);
      if (!match) {
        throw new Error(`no point-slope equation in prompt: ${prompt}`);
      }
      // `y - 5` means the point's y-value is 5: the printed sign is the negated one.
      const y1 = match[1] === "-" ? Number(match[2]) : -Number(match[2]);
      const m = Number(match[3]);
      const x1 = match[4] === "-" ? Number(match[5]) : -Number(match[5]);
      return modelText(m, y1 - m * x1);
    },
    canon: asModel,
  },

  "d7.lf2.perpendicular-standard.l3": {
    derive(prompt) {
      const given = prompt.match(/The line \$(-?)x ([+-]) (\d+)y = (-?\d+)\$ is given/);
      if (!given) {
        throw new Error(`no standard-form line in prompt: ${prompt}`);
      }
      const a = given[1] === "-" ? -1 : 1;
      const magnitude = Number(given[3]);
      const b = given[2] === "-" ? -magnitude : magnitude;
      // The given line has slope -a/b, so the perpendicular slope is b/a.
      const m = exactQuotient(b, a);
      const [x1, y1] = plainPoint(prompt);
      return modelText(m, y1 - m * x1);
    },
    canon: asModel,
  },

  /* --------------------------- LF.3, modelling ---------------------------- */

  "d7.lf3.describe-model.l1": {
    derive(prompt) {
      const [b, m] = promptNumbers(prompt);
      if (b === undefined || m === undefined) {
        throw new Error(`expected a starting value and a rate: ${prompt}`);
      }
      return modelText(m, b);
    },
    canon: asModel,
  },

  "d7.lf3.table-model.l2": {
    derive(prompt) {
      const numbers = promptNumbers(prompt);
      if (numbers.length !== 6) {
        throw new Error(`expected three table rows, saw ${numbers.length} numbers`);
      }
      const [x1, y1, x2, y2, x3, y3] = numbers as [
        number,
        number,
        number,
        number,
        number,
        number,
      ];
      const m = exactQuotient(y2 - y1, x2 - x1);
      // The third row is not needed for the model, so it is free to disagree: check it.
      if (m !== exactQuotient(y3 - y2, x3 - x2)) {
        throw new Error("the three listed rows do not share one rate");
      }
      return modelText(m, y1 - m * x1);
    },
    canon: asModel,
  },

  "d7.lf3.predict.l2": {
    derive(prompt) {
      const [b, m, xq] = promptNumbers(prompt);
      if (b === undefined || m === undefined || xq === undefined) {
        throw new Error(`expected a start, a rate and a requested input: ${prompt}`);
      }
      return `${m * xq + b}`;
    },
    canon: identity,
  },

  "d7.lf3.table-predict.l3": {
    derive(prompt) {
      const numbers = promptNumbers(prompt);
      if (numbers.length !== 5) {
        throw new Error(`expected two rows and a requested input, saw ${numbers.length}`);
      }
      const [x1, y1, x2, y2, xq] = numbers as [number, number, number, number, number];
      const m = exactQuotient(y2 - y1, x2 - x1);
      const b = y1 - m * x1;
      return `${m * xq + b}`;
    },
    canon: identity,
  },

  "d7.lf3.point-rate-model.l3": {
    derive(prompt) {
      const [magnitude, xp, yp] = promptNumbers(prompt);
      if (magnitude === undefined || xp === undefined || yp === undefined) {
        throw new Error(`expected a rate and a reading: ${prompt}`);
      }
      const falling = /drains|falls by/.test(prompt);
      const rising = /fills|grows by/.test(prompt);
      // The sign of the rate is carried by the words alone, so an ambiguous or missing
      // direction word is itself the defect.
      if (falling === rising) {
        throw new Error(`prompt does not state one direction: ${prompt}`);
      }
      const m = falling ? -magnitude : magnitude;
      return modelText(m, yp - m * xp);
    },
    canon: asModel,
  },

  /* ---------------------------- LF.4, systems ----------------------------- */

  "d7.lf4.substitution.l1": {
    derive(prompt) {
      const spans = mathSpans(prompt);
      const solved = (spans[0] ?? "").match(/^y = (.+)$/);
      if (!solved) {
        throw new Error(`first equation is not solved for y: ${spans[0]}`);
      }
      const { m, b } = parseLinearTex(solved[1] ?? "");
      const { a, b: c, c: d } = parseStandard(spans[1] ?? "");
      const x = exactQuotient(d - c * b, a + c * m);
      return `(${x},${m * x + b})`;
    },
    canon: spaceless,
  },

  "d7.lf4.elimination.l2": {
    derive: (prompt) => solveSystemFromPrompt(prompt),
    canon: spaceless,
  },

  "d7.lf4.classify.l2": {
    derive(prompt) {
      const spans = mathSpans(prompt);
      const one = parseStandard(spans[0] ?? "");
      const two = parseStandard(spans[1] ?? "");
      const determinant = one.a * two.b - two.a * one.b;
      if (determinant !== 0) {
        return "one solution";
      }
      // Same slope: the constants decide whether it is one line or two that never meet.
      const consistent =
        one.a * two.c - two.a * one.c === 0 && one.b * two.c - two.b * one.c === 0;
      return consistent ? "infinitely many" : "no solution";
    },
    canon: identity,
  },

  "d7.lf4.elimination.l3": {
    derive: (prompt) => solveSystemFromPrompt(prompt),
    canon: spaceless,
  },

  "d7.lf4.isolate.l3": {
    derive(prompt) {
      const requested = prompt.match(/then give the value of \$([xy])\$/);
      if (!requested) {
        throw new Error(`prompt does not name the coordinate it wants: ${prompt}`);
      }
      const pair = solveSystemFromPrompt(prompt);
      const [x, y] = pair.slice(1, -1).split(",");
      return (requested[1] === "x" ? x : y) ?? "";
    },
    canon: identity,
  },
};

/** Solve the 2x2 system printed in the first two math spans, as `(x,y)`. */
function solveSystemFromPrompt(prompt: string): string {
  const spans = mathSpans(prompt);
  const one = parseStandard(spans[0] ?? "");
  const two = parseStandard(spans[1] ?? "");
  const determinant = one.a * two.b - two.a * one.b;
  if (determinant === 0) {
    throw new Error("the printed system does not cross at a single point");
  }
  const x = exactQuotient(one.c * two.b - two.c * one.b, determinant);
  const y = exactQuotient(one.a * two.c - two.a * one.c, determinant);
  return `(${x},${y})`;
}

/* -------------------------------------------------------------------------- */
/* The sweep                                                                   */
/* -------------------------------------------------------------------------- */

/** How many independent draws each template is re-solved on. */
const DRAWS_PER_TEMPLATE = 60;

const templatesById = new Map<string, ItemTemplate>(
  D7_PRACTICE_TEMPLATES.map((template) => [template.template_id, template]),
);

describe("D7 keys re-derived from the rendered prompt", () => {
  /**
   * Without this the sweep is free to measure a subset of the pool and still report green,
   * which is how a coverage assertion over its own written-down list passes while covering
   * nothing. Both directions: a template with no derivation fails, and a derivation whose
   * template is gone fails too.
   */
  it("covers every D7 template, and no template it does not own", () => {
    const authored = [...templatesById.keys()].sort();
    expect(Object.keys(CASES).sort()).toEqual(authored);
    expect(authored.length).toBeGreaterThanOrEqual(20);
  });

  for (const [templateId, testCase] of Object.entries(CASES)) {
    it(`${templateId} answers the question its prompt asks, on ${DRAWS_PER_TEMPLATE} draws`, () => {
      const template = templatesById.get(templateId);
      expect(template, templateId).toBeDefined();
      if (!template) {
        return;
      }
      let checked = 0;
      for (let seed = 1; seed <= DRAWS_PER_TEMPLATE; seed += 1) {
        const instance = template.generate(createRng(seed * 7919 + 13));
        const key = instance.answer.answer_key;
        if (key === undefined) {
          throw new Error(
            `${templateId} seed ${seed}: the generated item carries no answer_key`,
          );
        }
        const fromPrompt = testCase.derive(instance.prompt);
        expect(fromPrompt, `${templateId} seed ${seed}\nprompt: ${instance.prompt}`).toBe(
          testCase.canon(key),
        );
        checked += 1;
      }
      expect(checked).toBe(DRAWS_PER_TEMPLATE);
    });
  }
});
