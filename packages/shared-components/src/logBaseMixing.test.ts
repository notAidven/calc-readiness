import { describe, expect, it } from "vitest";

import type { AnswerDefinition } from "./checker-core";
import type { AnswerSpec } from "./index";
import {
  createProductAnswerChecker,
  PRODUCT_CHECKER_VERSION,
  type ProductItemVersion,
} from "./product-answer-checker";

/**
 * An EL.5 answer may be written in whatever base the learner likes, but it must be ONE base.
 *
 * ## The defect this file was written for (strictness report L1)
 *
 * `LOG_SCOPE` binds `log` and `ln` to the same `Math.log`, and that binding is deliberate:
 * the expand/condense identities are base-independent (`log_b(xy) = log_b x + log_b y` in every
 * base), no EL.5 prompt names a base — measured: 0 of 28 — and grading the property at one
 * fixed base is correct and deterministic. **That policy stands, and the first test below is
 * what pins it:** a uniform `ln`-for-`log` swap is ACCEPTED, on purpose.
 *
 * What the policy does not cover is an answer that uses BOTH tokens. `log₁₀(y) + ln(n)` is not
 * `log_b(yn)` for any base `b` at all, so it is wrong on every policy, base-independent or not.
 * Base-independence says a solver may pick a base and be graded there; it does not say they may
 * pick two. Measured through the full submit path over the served pool: 21 of 28 EL.5 items
 * accepted a mixed-base answer (the other 7 keys hold a single logarithm, so no mixture can be
 * constructed for them), and all 28 keys are spelled with `log(`.
 *
 * So the fix is a FORM check and not a value change: all logarithm tokens in one submission
 * must carry the same name. It cannot affect any single-base answer, which is what makes it
 * safe to place beside a deliberate base-independence policy rather than against it.
 *
 * ## The opposite policy next door is also deliberate
 *
 * `EXACT_ROSTER_SCOPE` binds `log` to `Math.log10` for EL.6, exactly the reverse, because a
 * roster member is a NUMBER and not an identity — `log 2` and `ln 2` are different numbers. The
 * two policies are recorded next to each other in the source so the pair does not read as an
 * accident; `rosterExactValues.test.ts` holds the EL.6 side.
 */

function logSpec(requiredForm: "is_expanded_log" | "is_condensed_log"): AnswerSpec {
  return {
    answer_type: "expression",
    equivalence: "symbolic",
    representation: "any",
    simplification: "none",
    required_form: requiredForm,
    required_notation: "none",
    precision: null,
    unit_policy: "none",
  };
}

/**
 * One item per EL.5 key shape actually served, read off all 28 instances in the frozen pool:
 * `expand-product` (`log(y) + log(n)`), `expand-power` (`5 * log(b) + log(m)`),
 * `expand-quotient` (`3 * log(u) - log(a)`) and `condense-sum` (`log(m*a*q)`). The first three
 * hold two logarithms and are the 21 items a mixture can be built for; `condense-sum` is the
 * 7-item remainder that holds exactly one, and it is here precisely so the new rule can be
 * shown NOT to disturb a single-token answer.
 */
const ITEMS: readonly ProductItemVersion[] = [
  {
    item_version_id: "el5:expand-product",
    node_id: "EL.5",
    answer: {
      answer_key: "log(y) + log(n)",
      allowed_symbols: ["y", "n"],
      answer_spec: logSpec("is_expanded_log"),
    } as AnswerDefinition,
  },
  {
    item_version_id: "el5:expand-power",
    node_id: "EL.5",
    answer: {
      answer_key: "5 * log(b) + log(m)",
      allowed_symbols: ["b", "m"],
      answer_spec: logSpec("is_expanded_log"),
    } as AnswerDefinition,
  },
  {
    item_version_id: "el5:expand-quotient",
    node_id: "EL.5",
    answer: {
      answer_key: "3 * log(u) - log(a)",
      allowed_symbols: ["u", "a"],
      answer_spec: logSpec("is_expanded_log"),
    } as AnswerDefinition,
  },
  {
    item_version_id: "el5:condense-sum",
    node_id: "EL.5",
    answer: {
      answer_key: "log(m*a*q)",
      allowed_symbols: ["m", "a", "q"],
      answer_spec: logSpec("is_condensed_log"),
    } as AnswerDefinition,
  },
];

const check = createProductAnswerChecker({ itemVersions: ITEMS });

function grade(id: string, rawAnswer: unknown): string {
  const result = check({
    raw_answer: rawAnswer,
    item_version_id: id,
    equivalence_checker_version: PRODUCT_CHECKER_VERSION,
  });
  return `${result.status}/${result.reason_code}`;
}

/** The key, and the uniform `ln` swap of it, for each of the four shapes. */
const SHAPES: readonly { readonly id: string; readonly key: string }[] = [
  { id: "el5:expand-product", key: "log(y) + log(n)" },
  { id: "el5:expand-power", key: "5 * log(b) + log(m)" },
  { id: "el5:expand-quotient", key: "3 * log(u) - log(a)" },
  { id: "el5:condense-sum", key: "log(m*a*q)" },
];

describe("a uniform base swap stays accepted (the binding policy)", () => {
  it("accepts the key and its wholesale ln respelling on every shape", () => {
    for (const { id, key } of SHAPES) {
      expect(grade(id, key), `key ${key}`).toBe("correct/match");
      expect(grade(id, key.replaceAll("log(", "ln(")), `ln swap of ${key}`).toBe(
        "correct/match",
      );
    }
    expect(SHAPES.length).toBeGreaterThanOrEqual(4);
  });
});

describe("an expression that mixes log and ln is refused", () => {
  it("refuses a mixture in either direction on a two-logarithm key", () => {
    expect(grade("el5:expand-product", "log(y) + ln(n)")).toBe("incorrect/mixed_log_bases");
    expect(grade("el5:expand-product", "ln(y) + log(n)")).toBe("incorrect/mixed_log_bases");
  });

  it("refuses a mixture on every shape that can express one", () => {
    // The 21-item population: a mixture exists exactly when the key holds two logarithms.
    const mixable = SHAPES.filter(({ key }) => key.split("log(").length - 1 > 1);
    for (const { id, key } of mixable) {
      let swapped = false;
      const mixed = key.replaceAll("log(", (token) => {
        if (swapped) {
          return token;
        }
        swapped = true;
        return "ln(";
      });
      expect(grade(id, mixed), `mixed ${mixed}`).toBe("incorrect/mixed_log_bases");
    }
    // A floor, so a shape list that stopped producing mixtures could not pass by being empty.
    expect(mixable.length).toBeGreaterThanOrEqual(3);
  });

  it("refuses a mixture even where the expand/condense form is also wrong", () => {
    // Two things are wrong with `log(m*a) + ln(q)` on a condense item: it is not condensed,
    // and it is not in one base. The mixture is the more basic objection — the expression
    // denotes nothing — so it is the one reported.
    expect(grade("el5:condense-sum", "log(m*a) + ln(q)")).toBe("incorrect/mixed_log_bases");
  });

  it("does not disturb a single-logarithm answer", () => {
    // The 7-item remainder. One token cannot be a mixture, so both spellings stay correct and
    // the form rule keeps owning the not-condensed refusal.
    expect(grade("el5:condense-sum", "log(m*a*q)")).toBe("correct/match");
    expect(grade("el5:condense-sum", "ln(m*a*q)")).toBe("correct/match");
    expect(grade("el5:condense-sum", "log(m) + log(a) + log(q)")).toBe(
      "incorrect/not_condensed",
    );
    expect(grade("el5:condense-sum", "ln(m) + ln(a) + ln(q)")).toBe(
      "incorrect/not_condensed",
    );
  });

  it("still grades a wrong-valued single-base answer on its value", () => {
    // The new rule must not swallow the ordinary miss: a one-base answer that is simply wrong
    // keeps its own reason code.
    expect(grade("el5:expand-product", "log(y) - log(n)")).toBe("incorrect/value_mismatch");
    expect(grade("el5:expand-product", "ln(y) - ln(n)")).toBe("incorrect/value_mismatch");
  });
});
