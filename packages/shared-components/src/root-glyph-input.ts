/**
 * Canonicalize unambiguous uses of the square-root glyph before a value becomes `raw_answer`.
 *
 * The checker already accepts `sqrt(...)`; this boundary rewrite deliberately leaves checker
 * generations untouched. A bare glyph may own one numeric literal (`√2`) or one balanced group
 * (`√(2*x)`). Adjacency that could change the radicand, such as `√2x`, is returned unchanged so
 * the checker refuses it rather than grading a guess.
 */
export function canonicalizeRootGlyphInput(value: string): string {
  if (!value.includes("√")) {
    return value;
  }

  let output = "";
  let cursor = 0;

  while (cursor < value.length) {
    if (value[cursor] !== "√") {
      output += value[cursor];
      cursor += 1;
      continue;
    }

    let argumentStart = cursor + 1;
    while (/\s/.test(value[argumentStart] ?? "")) {
      argumentStart += 1;
    }

    let argument = "";
    let next = argumentStart;
    const grouped = value[argumentStart] === "(";

    if (grouped) {
      let depth = 0;
      let close = -1;
      for (let at = argumentStart; at < value.length; at += 1) {
        if (value[at] === "(") depth += 1;
        if (value[at] === ")") depth -= 1;
        if (depth === 0) {
          close = at;
          break;
        }
      }
      if (close < 0) {
        return value;
      }
      argument = value.slice(argumentStart + 1, close);
      next = close + 1;
      if (argument.trim() === "") {
        return value;
      }
      const nested = canonicalizeRootGlyphInput(argument);
      if (nested.includes("√")) {
        return value;
      }
      argument = nested;
    } else {
      const number = value.slice(argumentStart).match(/^(?:\d+(?:\.\d*)?|\.\d+)/)?.[0];
      if (!number) {
        return value;
      }
      argument = number;
      next = argumentStart + number.length;
    }

    let after = next;
    while (/\s/.test(value[after] ?? "")) {
      after += 1;
    }
    const afterChar = value[after] ?? "";
    if (!grouped && /[A-Za-z0-9_(.]/.test(afterChar)) {
      return value;
    }

    const previous = output.trimEnd().at(-1) ?? "";
    if (/[A-Za-z0-9_)]/.test(previous)) {
      output += "*";
    }
    output += `sqrt(${argument})`;
    if (grouped && /[A-Za-z0-9_(.]/.test(afterChar)) {
      output += "*";
    }
    cursor = next;
  }

  return output;
}
