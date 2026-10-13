import { MAX_INPUT_LENGTH } from "./checker-core";

/**
 * Absolute-value PIPE notation (`|x|`) for the product checker.
 *
 * mathjs cannot parse `|x|` at all (`math.parse("|x|")` throws "Value expected"),
 * so a learner who types the textbook notation has no way to answer an
 * absolute-value item. This module rewrites pipe pairs into `abs(...)` BEFORE the
 * expression reaches the parser.
 *
 * ## The ambiguity, and why we refuse to guess
 *
 * Pipes are not brackets: they have no distinct open/close glyph, so a run of
 * them has more than one reading. `|a|b|c|` is either `abs(a)*b*abs(c)` or
 * `abs(a*abs(b)*c)`, and nothing in the string decides which. Rather than pick
 * one and silently mis-grade, this rewriter accepts only the NON-NESTED,
 * unambiguous shape and rejects everything else with a reason code.
 *
 * ## Accepted grammar (the documented limitation)
 *
 * 1. An EVEN number of pipes. An odd count is `unbalanced_pipes`.
 * 2. Pipes pair left to right: 1st with 2nd, 3rd with 4th, ...
 * 3. Every pair's content is non-empty (`||` is rejected).
 * 4. Consecutive pairs must be joined by an EXPLICIT operator: the text between
 *    one pair's closing pipe and the next pair's opening pipe must be non-empty
 *    and end with one of `+ - * / ^ ( ,`. So `|x| + |y|` and `|x|*(|y| + 1)` are
 *    accepted, while `|a|b|c|` (implicit multiplication between two pairs, the
 *    ambiguous case) and `|x||y|` are rejected as `ambiguous_pipe_notation`.
 *    This rule is also what rejects a NESTED intent such as `|x + |y||`, whose
 *    left-to-right pairing leaves a bare `y` between the pairs.
 *
 * Implicit multiplication OUTSIDE the pipes is fine and left alone (`2|x|`
 * rewrites to `2abs(x)`, which mathjs reads as `2*abs(x)`) — with rule 4 in force
 * a single pair cannot be re-associated, so there is nothing to guess.
 *
 * Everything here fails CLOSED: a rejected input yields a reason code and the
 * caller turns it into `invalid_input`, never a parse attempt on a guessed
 * reading.
 */

/** Characters that may legally END the text joining two pipe pairs. */
const JOINING_TAIL: ReadonlySet<string> = new Set(["+", "-", "*", "/", "^", "(", ","]);

export interface PipeRewrite {
  /** The rewritten expression (`|x|` -> `abs(x)`), present only on success. */
  expression?: string;
  /** `unbalanced_pipes` | `ambiguous_pipe_notation` | `input_too_long`. */
  reason?: string;
}

/**
 * Rewrite non-nested `|expr|` pairs into `abs(expr)`. An expression with no pipe
 * is returned unchanged (byte-identical), so this is a no-op for every existing
 * input.
 */
export function rewritePipeAbsolute(expression: string): PipeRewrite {
  const pipes: number[] = [];
  for (let index = 0; index < expression.length; index += 1) {
    if (expression[index] === "|") {
      pipes.push(index);
    }
  }
  if (pipes.length === 0) {
    return { expression };
  }
  if (pipes.length % 2 !== 0) {
    return { reason: "unbalanced_pipes" };
  }
  for (let pair = 0; pair < pipes.length; pair += 2) {
    const open = pipes[pair] as number;
    const close = pipes[pair + 1] as number;
    if (!expression.slice(open + 1, close).trim()) {
      return { reason: "ambiguous_pipe_notation" };
    }
    const nextOpen = pipes[pair + 2];
    if (nextOpen !== undefined) {
      const joiner = expression.slice(close + 1, nextOpen).trim();
      const tail = joiner.at(-1);
      if (!tail || !JOINING_TAIL.has(tail)) {
        return { reason: "ambiguous_pipe_notation" };
      }
    }
  }
  let rewritten = "";
  let cursor = 0;
  for (let pair = 0; pair < pipes.length; pair += 2) {
    const open = pipes[pair] as number;
    const close = pipes[pair + 1] as number;
    rewritten += `${expression.slice(cursor, open)}abs(${expression.slice(open + 1, close)})`;
    cursor = close + 1;
  }
  rewritten += expression.slice(cursor);
  // `abs(...)` is 3 characters longer than `|...|`, so re-apply the input bound.
  return rewritten.length > MAX_INPUT_LENGTH
    ? { reason: "input_too_long" }
    : { expression: rewritten };
}
