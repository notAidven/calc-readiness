/**
 * **NO ORDINARY TEST RUN WRITES EVIDENCE ANYWHERE INSIDE THE CHECKOUT.**
 *
 * The older version of this guard protected tracked destinations only. That stopped committed
 * frames being rewritten, but it explicitly excused `.qa-frames/` and `__screenshots__/`.
 * Focused QA therefore still left ignored PNG/JSON files behind, while newly merged Presenter
 * writers also bypassed the tracked-path rule. A clean run was not read-only; `git status` merely
 * hid part of the mutation.
 *
 * The invariant is now destination-independent:
 *
 *   **every screenshot/evidence write inside the checkout is enclosed by one positive, explicit
 *   capture opt-in. Use the suite's existing `VITE_*_SHOTS`/review flag when it has one; otherwise
 *   use `VITE_CAPTURE_EVIDENCE`.**
 *
 * Rendering and measurement stay on. Only the operation that persists bytes is gated, so the
 * ordinary browser suite keeps its layout, pixel and accessibility assertions. A deliberate
 * capture run keeps the same destination and write assertion.
 *
 * ## Population: actual write calls, never a list of shot suites
 *
 * The population is every `*.test.ts` / `*.test.tsx` file git can see, including untracked test
 * files under construction, scanned for the mechanisms that actually put bytes on disk:
 * `commands.writeFile`/`removeFile`, `.screenshot`, `node:fs` writers and vitest snapshots. A
 * file joins the census by adding its first write call; no inventory here has to be updated.
 *
 * Normal browser evidence is currently written directly in browser test files. Human-invoked
 * reusable capture tooling belongs in `scripts/`; its generated output remains ignored and is not
 * reached by `npm test`, `npm run test:browser` or `npm run check`. Exporter/check scripts write
 * disposable staging directories rather than screenshot evidence. If normal execution gains a
 * source-level helper, its calling test still contains the write mechanism or this
 * mechanism-composition assertion changes and fails for review.
 *
 * Snapshot pins are a different family. Their tracked `.snap` reference is created only when
 * absent (and CI refuses that state), so the fourteen item-bank pins are named in
 * `SNAPSHOT_PINS` and asserted in both directions. Node fixtures resolving below `mkdtempSync` or
 * `tmpdir()` are outside the checkout and outside this invariant.
 *
 * ## Resolution and composition are fail-closed
 *
 * An unbalanced source or unresolved destination is a failure, never a skipped writer. Every
 * destination is also classified through `git check-ignore`, not a duplicate ignore parser.
 * Tracked and ignored evidence each have independent population/file/directory floors, as do the
 * actual `commands.writeFile` and `.screenshot` mechanisms. Those floors prove the sweep still
 * has the shape it claims: a broad total cannot be propped up by snapshots, temp fixtures, or
 * only one destination family.
 *
 * A gate is not a boolean rubber stamp. The detector returns the exact `VITE_` variable and the
 * positive `if`/`test.runIf` that encloses the call; the variable must be declared by that same
 * file and name capture/review/evidence semantics. `if (!SHOTS)` and unrelated injection/runtime
 * flags do not qualify.
 *
 * ## Red proof
 *
 * At the requested staging SHA the pre-fix guard reported 15 ungated tracked write sites and
 * five destinations it could not classify. Widening the derived population to ignored evidence
 * exposed 122 ungated write calls. After the repair, removing one positive gate from
 * `presenterRuntime.browser.test.tsx` makes this guard fail at that exact writer. This is the
 * load-bearing negative control, not an argument that the source looks gated.
 *
 * `bindingsIn` deliberately over-approximates helper parameters across same-named functions.
 * That can make a failure list extra candidate basenames, but it can never hide a destination
 * directory: widening is the safe direction for this guard.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

const ROOT = resolveRepoRoot();

/**
 * Every test file git can see, node and browser alike. The population.
 *
 * `--others --exclude-standard` alongside `--cached` on purpose: a test file being written right
 * now is UNTRACKED, and a plain `git ls-files` would leave it out of the sweep for exactly as long
 * as its author is the only person who could still cheaply fix it. Verified rather than assumed —
 * dropping a new file with an unlisted `toMatchSnapshot()` into `test/` left this file green with
 * `--cached` alone, and fails with the flags below. Ignored files stay out, which is what
 * `--exclude-standard` is for.
 */
const TEST_FILES: readonly string[] = execFileSync(
  "git",
  [
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "--",
    "*.test.ts",
    "*.test.tsx",
  ],
  { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
)
  .split("\n")
  .filter((line) => line.length > 0)
  .sort();

/* -------------------------------------------------------------------------- */
/* A scanner, because a regex cannot tell code from the inside of a string     */
/* -------------------------------------------------------------------------- */

interface Bracket {
  readonly char: "(" | "[" | "{" | "$";
  readonly open: number;
  /** Offset of the closing character. Equal to `open` when the file is unbalanced. */
  readonly close: number;
}

interface Scanned {
  /** 1 where the offset is executable code: not a comment, a string body or template text. */
  readonly code: Uint8Array;
  readonly byOpen: ReadonlyMap<number, Bracket>;
  readonly brackets: readonly Bracket[];
  /** False when the bracket stack did not empty, which makes every span below suspect. */
  readonly balanced: boolean;
}

/**
 * Characters after which a `/` opens a regex literal rather than dividing.
 *
 * `<` and `>` are deliberately absent, and their absence is what lets this read `.tsx`. With
 * `<` in the set, `</div>` reads as a regex opening after the `<`, which then swallows source up
 * to the next `/` — brackets and all.
 *
 * Measured over the 620 test files, one variable at a time, because each of these three rules
 * looks like a nicety and none of them is:
 *
 *   with `<` and `>` in the set ............................. 180 unbalanced
 *   `<` and `>` removed ..................................... 187 unbalanced
 *   plus the `=>` rule below ................................ 179 unbalanced
 *   plus the `/>` rule below ................................   0 unbalanced
 *
 * Removing the two made things WORSE on its own, by seven files, because `=> /re/.test(x)` is an
 * ordinary line here — so `>` is accepted, but only as the tail of a `=>`. What is left
 * unreadable is `a < /re/.test(b)`, of which this tree contains none.
 */
const BEFORE_REGEX = new Set([
  "(",
  ",",
  "=",
  ":",
  "[",
  "!",
  "&",
  "|",
  "?",
  "{",
  "}",
  ";",
  "+",
  "-",
  "*",
  "%",
  "~",
  "^",
  "\n",
  undefined,
]);

/**
 * Bracket spans and a code mask for one TypeScript source.
 *
 * Deliberately a scanner and not a parser: all it has to get right is which offsets are code
 * and which bracket closes which, and it reports `balanced: false` rather than guessing when
 * it loses track — which the assertions below turn into a failure for that file.
 *
 * Template literals get their own context so that `` `${dir}/${name}.png` `` reads as template
 * text with two code holes in it, and so that a backtick inside a `${}` opens a nested
 * template rather than closing the outer one.
 */
function scanSource(source: string): Scanned {
  const code = new Uint8Array(source.length);
  const brackets: Bracket[] = [];
  const byOpen = new Map<number, Bracket>();
  const stack: { char: "(" | "[" | "{" | "$" | "`"; open: number }[] = [];
  let balanced = true;
  let i = 0;

  const close = (char: "(" | "[" | "{" | "$", at: number) => {
    const top = stack.pop();
    if (!top || top.char !== char) {
      balanced = false;
      return;
    }
    const span: Bracket = { char, open: top.open, close: at };
    brackets.push(span);
    byOpen.set(top.open, span);
  };

  while (i < source.length) {
    const inTemplateText = stack[stack.length - 1]?.char === "`";
    const c = source[i] as string;

    if (inTemplateText) {
      if (c === "\\") {
        i += 2;
        continue;
      }
      if (c === "`") {
        stack.pop();
        i += 1;
        continue;
      }
      if (c === "$" && source[i + 1] === "{") {
        stack.push({ char: "$", open: i });
        code[i] = 1;
        code[i + 1] = 1;
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }

    if (c === "/" && source[i + 1] === "/") {
      while (i < source.length && source[i] !== "\n") {
        i += 1;
      }
      continue;
    }
    if (c === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      i = end === -1 ? source.length : end + 2;
      continue;
    }
    if (c === '"' || c === "'") {
      i += 1;
      while (i < source.length) {
        if (source[i] === "\\") {
          i += 2;
          continue;
        }
        if (source[i] === c) {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    if (c === "`") {
      stack.push({ char: "`", open: i });
      i += 1;
      continue;
    }
    if (c === "/") {
      // Regex or division. Look back over whitespace at the previous code character.
      let back = i - 1;
      while (back >= 0 && /\s/.test(source[back] as string)) {
        back -= 1;
      }
      const previous = back < 0 ? undefined : (source[back] as string);
      const before = source.slice(Math.max(0, back - 9), back + 1);
      const keyword = /\b(return|typeof|case|in|of|do|else|yield|await)$/.test(before);
      const arrow = previous === ">" && before.endsWith("=>");
      // `/>` closes a JSX element. The grammar does allow a regex to open with `>` and no test
      // file here does: swept for one, and every `/>` in the tree is JSX. Without this,
      // `<Foo bar={x} />` reads as a regex opening after the `}` and eats the `)` that closed
      // the call around it — 179 files' worth.
      const selfClosingJsx = source[i + 1] === ">";
      if (!selfClosingJsx && (BEFORE_REGEX.has(previous) || keyword || arrow)) {
        i += 1;
        let inClass = false;
        while (i < source.length) {
          if (source[i] === "\\") {
            i += 2;
            continue;
          }
          if (source[i] === "[") {
            inClass = true;
          } else if (source[i] === "]") {
            inClass = false;
          } else if (source[i] === "/" && !inClass) {
            i += 1;
            break;
          } else if (source[i] === "\n") {
            break;
          }
          i += 1;
        }
        while (i < source.length && /[a-z]/.test(source[i] as string)) {
          i += 1;
        }
        continue;
      }
      code[i] = 1;
      i += 1;
      continue;
    }
    if (c === "(" || c === "[" || c === "{") {
      stack.push({ char: c, open: i });
      code[i] = 1;
      i += 1;
      continue;
    }
    if (c === ")" || c === "]" || c === "}") {
      if (c === "}" && stack[stack.length - 1]?.char === "$") {
        close("$", i);
      } else {
        close(c === ")" ? "(" : c === "]" ? "[" : "{", i);
      }
      code[i] = 1;
      i += 1;
      continue;
    }
    code[i] = 1;
    i += 1;
  }

  return { code, byOpen, brackets, balanced: balanced && stack.length === 0 };
}

/** The comma-separated entries of a bracket span, split at its own top level. */
function entriesOf(source: string, scan: Scanned, span: Bracket): string[] {
  const found: string[] = [];
  let from = span.open + 1;
  let at = from;
  while (at < span.close) {
    const nested = scan.byOpen.get(at);
    if (nested) {
      at = nested.close + 1;
      continue;
    }
    if (source[at] === "," && scan.code[at] === 1) {
      found.push(source.slice(from, at));
      from = at + 1;
    }
    at += 1;
  }
  found.push(source.slice(from, span.close));
  return found;
}

/* -------------------------------------------------------------------------- */
/* The three ways a test in this tree puts bytes on disk                      */
/* -------------------------------------------------------------------------- */

/**
 * Where a mechanism's relative destination is resolved from, which is not the same for all
 * three and is the reason `winterConclusionSheet` could name a tracked path with five `../`
 * segments and no `docs/` prefix anywhere near it:
 *
 *  - `repo` — vitest's built-in `writeFile`/`removeFile` commands do
 *    `resolve(project.config.root, path)`, and no project here overrides `root`;
 *  - `test-file` — `resolveScreenshotPath` does `resolve(dirname(testPath), customPath)`;
 *  - `cwd` — `node:fs` in the node suites, whose working directory is the repository root.
 */
type Base = "repo" | "test-file" | "cwd";

interface Mechanism {
  readonly id: string;
  readonly pattern: RegExp;
  readonly base: Base;
}

const MECHANISMS: readonly Mechanism[] = [
  { id: "commands.writeFile", pattern: /\bcommands\s*\.\s*writeFile\s*\(/g, base: "repo" },
  {
    id: "commands.removeFile",
    pattern: /\bcommands\s*\.\s*removeFile\s*\(/g,
    base: "repo",
  },
  { id: "screenshot", pattern: /\.\s*screenshot\s*\(/g, base: "test-file" },
  {
    id: "node:fs",
    pattern:
      /\b(writeFileSync|appendFileSync|mkdirSync|cpSync|copyFileSync|renameSync|createWriteStream|unlinkSync|rmSync|rmdirSync|truncateSync|mkdtempSync)\s*\(/g,
    base: "cwd",
  },
  /*
   * AND VITEST'S SNAPSHOTS, which are the second family of tracked writes in this tree and the
   * one that is easy to leave out because it does not look like a file write at all.
   *
   * `packages/item-bank/src/__snapshots__/` holds thirteen `.snap` files, all tracked, in a
   * directory `.gitignore` says nothing about — it ignores `__screenshots__` at any depth and not
   * `__snapshots__`. `expect(pool).toMatchSnapshot()` writes one whenever its reference is
   * absent. Excluding them silently is exactly what the QA rule warns against, so they are in the
   * population and exempted by name in `SNAPSHOT_PINS` below.
   *
   * `toMatchInlineSnapshot` and `toMatchFileSnapshot` are unused today and listed anyway: the
   * first rewrites the TEST FILE, which is as tracked as a `.snap`, and the second takes an
   * explicit path. A first use of either lands in the census below rather than slipping past it.
   */
  { id: "toMatchSnapshot", pattern: /\.\s*toMatchSnapshot\s*\(/g, base: "test-file" },
  {
    id: "toMatchInlineSnapshot",
    pattern: /\.\s*toMatchInlineSnapshot\s*\(/g,
    base: "test-file",
  },
  {
    id: "toMatchFileSnapshot",
    pattern: /\.\s*toMatchFileSnapshot\s*\(/g,
    base: "test-file",
  },
];

interface WriteSite {
  readonly file: string;
  readonly line: number;
  readonly mechanism: string;
  readonly base: Base;
  /** The source text of the destination expression, for the failure message. */
  readonly expression: string;
  /** Where the destination expression sits, so the gate search can start from it. */
  readonly at: number;
  /**
   * A destination the mechanism derives for itself rather than taking as an argument, already
   * resolved relative to the test file: `__screenshots__/` for a `.screenshot()` with no `path`,
   * `__snapshots__/<basename>.snap` for `toMatchSnapshot`, and the test file itself for
   * `toMatchInlineSnapshot`, which rewrites its own source.
   */
  readonly implicit: string | null;
}

/** Every write this file can see in one source, with its destination expression. */
function writeSitesIn(file: string, source: string, scan: Scanned): WriteSite[] {
  const found: WriteSite[] = [];
  for (const mechanism of MECHANISMS) {
    mechanism.pattern.lastIndex = 0;
    let match: RegExpExecArray | null = mechanism.pattern.exec(source);
    for (; match !== null; match = mechanism.pattern.exec(source)) {
      const at = match.index;
      if (scan.code[at] !== 1) {
        continue;
      }
      const call = scan.byOpen.get(at + match[0].length - 1);
      if (!call) {
        // An unbalanced file; the balance assertion below reports it rather than this loop.
        continue;
      }
      const line = source.slice(0, at).split("\n").length;
      const shared = { file, line, mechanism: mechanism.id, base: mechanism.base, at };
      const base = path.posix.basename(file);

      if (mechanism.id === "toMatchSnapshot") {
        // `resolveSnapshotPath`: `<dir>/__snapshots__/<basename>.snap`, beside the test file.
        found.push({ ...shared, expression: "", implicit: `__snapshots__/${base}.snap` });
        continue;
      }
      if (mechanism.id === "toMatchInlineSnapshot") {
        // Vitest edits the test's own source in place, so the destination is the test file.
        found.push({ ...shared, expression: "", implicit: base });
        continue;
      }

      if (mechanism.id !== "screenshot") {
        found.push({
          ...shared,
          expression: (entriesOf(source, scan, call)[0] ?? "").trim(),
          implicit: null,
        });
        continue;
      }

      // `.screenshot({ path: ... })`. With no `path` key it writes vitest's own default.
      const options = scan.brackets.find(
        (span) =>
          span.char === "{" &&
          span.open > call.open &&
          span.close < call.close &&
          !scan.brackets.some(
            (other) =>
              other !== span &&
              other.open > call.open &&
              other.close < call.close &&
              other.open < span.open &&
              other.close > span.close,
          ),
      );
      const entry = options
        ? entriesOf(source, scan, options).find((text) => /^\s*path\s*:/.test(text))
        : undefined;
      found.push({
        ...shared,
        expression: entry ? entry.replace(/^\s*path\s*:/, "").trim() : "",
        implicit: entry ? null : `__screenshots__/${base}/default.png`,
      });
    }
  }
  return found.sort((a, b) => a.at - b.at);
}

/* -------------------------------------------------------------------------- */
/* Resolving a destination expression to a directory                          */
/* -------------------------------------------------------------------------- */

/** A destination that cannot be a repository path, however the run is invoked. */
const OUTSIDE = "\u0000outside the checkout";

/** A hole in a template whose value only ever affects the basename. */
const ANY_LEAF = "\u0000leaf";

/**
 * What each name in the file could hold: `const NAME = <initialiser>` at any scope, plus
 * `for (const NAME of <array>)`, which is how the two shot files that keep a copy of a frame
 * in `output/` name their pair of destination directories.
 *
 * Scope is ignored on purpose. A name bound twice in one file yields both initialisers and the
 * caller has to resolve all of them, so a shadowed name widens the destination set rather than
 * narrowing it — the safe direction for a guard whose job is to notice tracked paths.
 */
function bindingsIn(source: string, scan: Scanned): Map<string, string[]> {
  const bindings = new Map<string, string[]>();
  const add = (name: string, initialiser: string) => {
    bindings.set(name, [...(bindings.get(name) ?? []), initialiser.trim()]);
  };

  const declaration = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]+)?=\s*/g;
  let match: RegExpExecArray | null = declaration.exec(source);
  for (; match !== null; match = declaration.exec(source)) {
    if (scan.code[match.index] !== 1) {
      continue;
    }
    const from = match.index + match[0].length;
    let at = from;
    while (at < source.length) {
      const nested = scan.byOpen.get(at);
      if (nested) {
        at = nested.close + 1;
        continue;
      }
      if (scan.code[at] === 1 && (source[at] === ";" || source[at] === "\n")) {
        break;
      }
      at += 1;
    }
    add(match[1] as string, source.slice(from, at));
  }

  const iteration = /\bfor\s*\(\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s+of\s+([^)]+)\)/g;
  let loop: RegExpExecArray | null = iteration.exec(source);
  for (; loop !== null; loop = iteration.exec(source)) {
    if (scan.code[loop.index] === 1) {
      add(loop[1] as string, loop[2] as string);
    }
  }

  /*
   * And a helper's PARAMETERS, bound to whatever its callers hand it.
   *
   * `functionNotationLabelShot.browser.test.tsx` writes `commands.writeFile(path, ...)` inside a
   * `shoot(path: string)`, so without this the destination is a bare parameter name and the
   * resolver has nothing. Its one caller passes `` `${SHOT}-...png` ``, and `SHOT` is a literal
   * naming a `__screenshots__` directory — which is the answer, one hop away.
   */
  for (const [name, parameters] of parametersIn(source, scan)) {
    for (const argument of callArguments(source, scan, name)) {
      const parameter = parameters[argument.index];
      if (parameter) {
        add(parameter, argument.text);
      }
    }
  }
  return bindings;
}

/** The parameter names of every named function in the file, declaration or arrow. */
function parametersIn(source: string, scan: Scanned): Map<string, string[]> {
  const found = new Map<string, string[]>();
  for (const span of scan.brackets) {
    if (span.char !== "(") {
      continue;
    }
    const name = declaredNameBefore(source, span.open);
    if (!name) {
      continue;
    }
    const names = entriesOf(source, scan, span)
      .map((entry) => /^\s*(?:readonly\s+)?([A-Za-z_$][\w$]*)/.exec(entry)?.[1])
      .map((entry) => entry ?? "");
    found.set(name, names);
  }
  return found;
}

/** Every argument handed to `name(...)` anywhere in the file, by position. */
function callArguments(
  source: string,
  scan: Scanned,
  name: string,
): { index: number; text: string }[] {
  const found: { index: number; text: string }[] = [];
  const reference = new RegExp(`\\b${name}\\s*\\(`, "g");
  let match: RegExpExecArray | null = reference.exec(source);
  for (; match !== null; match = reference.exec(source)) {
    const at = match.index;
    if (
      scan.code[at] !== 1 ||
      declaredNameBefore(source, at + match[0].length - 1) === name
    ) {
      continue;
    }
    const call = scan.byOpen.get(at + match[0].length - 1);
    if (!call) {
      continue;
    }
    for (const [index, text] of entriesOf(source, scan, call).entries()) {
      found.push({ index, text });
    }
  }
  return found;
}

/**
 * The name being DECLARED by the parameter list opening at `parenOpen`, or null.
 *
 * `function keep(` and `const keep = async (` both count; a call `keep(` does not, which is what
 * separates a declaration from every other occurrence of the same name.
 */
function declaredNameBefore(source: string, parenOpen: number): string | null {
  const head = stripComments(source.slice(Math.max(0, parenOpen - 120), parenOpen));
  return (
    /\bfunction\s*\*?\s*([A-Za-z_$][\w$]*)\s*$/.exec(head)?.[1] ??
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]*)?=\s*(?:async\s+)?$/.exec(
      head,
    )?.[1] ??
    null
  );
}

function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

/**
 * The set of paths `expression` can name, or `null` when this file cannot work it out.
 *
 * `null` is a failure and never a skip: see the header. The cases it handles are exactly the
 * ones the tree uses — a literal, a template whose interpolations resolve, an identifier bound
 * to either, `join`/`resolve` over those, and anything whose resolution chain reaches
 * `mkdtempSync` or `tmpdir()`, which cannot be a repository path.
 */
function resolveDestination(
  expression: string,
  bindings: ReadonlyMap<string, string[]>,
  seen: ReadonlySet<string> = new Set(),
): string[] | null {
  const text = expression.trim().replace(/\s+as\s+const$/, "");
  if (text.length === 0) {
    return null;
  }
  if (/\bmkdtempSync\s*\(|\btmpdir\s*\(|\btmpdir\b/.test(text)) {
    return [OUTSIDE];
  }
  if (/^evidencePhase\s*\(/.test(text)) {
    // `evidencePhase` accepts one slash-free filename segment only.
    return ["capture-phase"];
  }

  const quoted = /^(["'])((?:[^\\]|\\.)*?)\1$/.exec(text);
  if (quoted) {
    return [(quoted[2] as string).replace(/\\(.)/g, "$1")];
  }

  if (text.startsWith("`") && text.endsWith("`") && text.length >= 2) {
    return resolveTemplate(text.slice(1, -1), bindings, seen);
  }

  const identifier = /^[A-Za-z_$][\w$]*$/.exec(text);
  if (identifier) {
    if (seen.has(text)) {
      return null;
    }
    const initialisers = bindings.get(text);
    if (!initialisers || initialisers.length === 0) {
      return null;
    }
    const next = new Set([...seen, text]);
    const all: string[] = [];
    for (const initialiser of initialisers) {
      const resolved = resolveDestination(initialiser, bindings, next);
      if (!resolved) {
        return null;
      }
      all.push(...resolved);
    }
    return all;
  }

  // An array of literals, which is how the two-destination shot files name their directories.
  if (text.startsWith("[") && text.endsWith("]")) {
    const inner = text.slice(1, -1);
    const parts = inner.split(",").map((part) => part.trim());
    const all: string[] = [];
    for (const part of parts) {
      if (part.length === 0) {
        continue;
      }
      const resolved = resolveDestination(part, bindings, seen);
      if (!resolved) {
        return null;
      }
      all.push(...resolved);
    }
    return all.length > 0 ? all : null;
  }

  const joined = /^(?:path\s*\.\s*)?(?:join|resolve)\s*\(([\s\S]*)\)$/.exec(text);
  if (joined) {
    const parts = splitTopLevel(joined[1] as string);
    const resolvedParts = parts.map((part) => resolveDestination(part, bindings, seen));
    /*
     * One part landing outside the checkout settles the whole join, and it is checked BEFORE
     * the unresolved parts, because a relative segment joined onto an `mkdtempSync` directory
     * is still in that directory whatever it turns out to be. `join(scratch, path)` in
     * `test/ciScopeFilter.test.ts` is exactly that shape: `scratch` is a temporary directory
     * and `path` is a function parameter nothing here can know.
     */
    if (resolvedParts.some((values) => values?.includes(OUTSIDE))) {
      return [OUTSIDE];
    }
    if (resolvedParts.some((values) => values === null)) {
      return null;
    }
    return crossJoin(resolvedParts as string[][], (values) => values.join("/"));
  }

  const wrapped = /^(?:dirname|basename)\s*\(([\s\S]*)\)$/.exec(text);
  if (wrapped) {
    const resolved = resolveDestination(wrapped[1] as string, bindings, seen);
    if (!resolved) {
      return null;
    }
    return resolved.includes(OUTSIDE)
      ? [OUTSIDE]
      : resolved.map((value) => path.dirname(value));
  }

  return null;
}

/** The interior of a template literal, resolved into the set of paths it can produce. */
function resolveTemplate(
  body: string,
  bindings: ReadonlyMap<string, string[]>,
  seen: ReadonlySet<string>,
): string[] | null {
  const pieces: string[][] = [];
  let at = 0;
  let literal = "";
  while (at < body.length) {
    if (body[at] === "\\") {
      literal += body[at + 1] ?? "";
      at += 2;
      continue;
    }
    if (body[at] === "$" && body[at + 1] === "{") {
      let depth = 1;
      let end = at + 2;
      while (end < body.length && depth > 0) {
        if (body[end] === "{") {
          depth += 1;
        } else if (body[end] === "}") {
          depth -= 1;
        }
        end += 1;
      }
      pieces.push([literal]);
      literal = "";
      const inner = body.slice(at + 2, end - 1);
      const resolved = resolveDestination(inner, bindings, seen);
      pieces.push(resolved ?? [ANY_LEAF]);
      at = end;
      continue;
    }
    literal += body[at];
    at += 1;
  }
  pieces.push([literal]);

  if (pieces.some((values) => values.includes(OUTSIDE))) {
    return [OUTSIDE];
  }

  /*
   * A hole this file could not resolve is tolerated only where it cannot move the file out of
   * the directory the literal skeleton names: after the last `/` any literal piece contributes.
   * A hole BEFORE that — `` `${dir}/${name}.png` `` with an unresolvable `dir` — would leave the
   * destination directory unknown, so the whole expression is unresolvable and fails.
   */
  const lastSlash = pieces.reduce(
    (found, values, index) => (values.some((v) => v.includes("/")) ? index : found),
    -1,
  );
  for (const [index, values] of pieces.entries()) {
    if (values.includes(ANY_LEAF) && index < lastSlash) {
      return null;
    }
  }
  return crossJoin(pieces, (values) =>
    values.map((value) => (value === ANY_LEAF ? "any-leaf" : value)).join(""),
  );
}

function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let from = 0;
  for (let at = 0; at < text.length; at += 1) {
    const c = text[at];
    if (c === "(" || c === "[" || c === "{") {
      depth += 1;
    } else if (c === ")" || c === "]" || c === "}") {
      depth -= 1;
    } else if (c === "," && depth === 0) {
      parts.push(text.slice(from, at));
      from = at + 1;
    }
  }
  parts.push(text.slice(from));
  return parts.map((part) => part.trim()).filter((part) => part.length > 0);
}

/** Every combination of one value from each piece, capped so a wide template cannot explode. */
function crossJoin(
  pieces: readonly string[][],
  combine: (values: string[]) => string,
): string[] {
  let built: string[][] = [[]];
  for (const values of pieces) {
    const next: string[][] = [];
    for (const prefix of built) {
      for (const value of values) {
        next.push([...prefix, value]);
      }
    }
    built = next.slice(0, 64);
  }
  return [...new Set(built.map(combine))];
}

/* -------------------------------------------------------------------------- */
/* Does git ignore it                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Which of `candidates` git ignores, asked of git rather than reimplemented.
 *
 * `.gitignore` here has entries whose subtleties are load-bearing and documented in place —
 * `node_modules` with no trailing slash, `**\/__screenshots__/` at any depth — so parsing it
 * again in this file would be a second implementation free to disagree with the first.
 */
function ignoredByGit(candidates: readonly string[]): Set<string> {
  const inside = candidates.filter((candidate) => !candidate.startsWith(OUTSIDE));
  if (inside.length === 0) {
    return new Set();
  }
  let listed = "";
  try {
    listed = execFileSync("git", ["check-ignore", "--stdin"], {
      cwd: ROOT,
      encoding: "utf8",
      input: `${inside.join("\n")}\n`,
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch (thrown) {
    /*
     * `check-ignore` exits **1** when none of the paths are ignored, which is an answer and not a
     * failure — but `execFileSync` throws on any non-zero status, so without this the whole file
     * would die at import with an opaque `Command failed` the moment the tree stopped having a
     * gitignored destination in it. Anything other than 1 (128 is a real fatal) still throws.
     */
    const failure = thrown as { status?: number; stdout?: string | Buffer };
    if (failure.status !== 1) {
      throw thrown;
    }
    listed = String(failure.stdout ?? "");
  }
  return new Set(listed.split("\n").filter((line) => line.length > 0));
}

/* -------------------------------------------------------------------------- */
/* Is the write behind a shot flag                                            */
/* -------------------------------------------------------------------------- */

/**
 * `const SHOTS = Boolean(import.meta.env.VITE_WINTER_SHOTS)` and friends, by variable name.
 *
 * A runtime/injection flag is not a capture opt-in merely because it is a `VITE_` variable.
 * The environment variable itself has to say that it records review/evidence output. Files
 * without an established flag use the repository-wide `VITE_CAPTURE_EVIDENCE`.
 */
function shotFlagsIn(bindings: ReadonlyMap<string, string[]>): Map<string, string> {
  const flags = new Map<string, string>();
  for (const [name, initialisers] of bindings) {
    for (const initialiser of initialisers) {
      const env = /import\s*\.\s*meta\s*\.\s*env\s*\.\s*(VITE_[A-Z0-9_]+)/.exec(
        initialiser,
      );
      if (
        env &&
        /\bBoolean\s*\(|={2,3}\s*["'](?:1|true|enabled)["']/.test(initialiser) &&
        /(?:SHOTS?|CAPTURE|EVIDENCE|RECORD|REVIEW|PERF|COMPARISON)/.test(env[1] as string)
      ) {
        flags.set(name, env[1] as string);
      }
    }
  }
  return flags;
}

interface Gate {
  /** The `VITE_*` variable the gate tests. */
  readonly flag: string;
  /** The construct it was found in, quoted into the failure and success messages. */
  readonly via: string;
}

/**
 * The parenthesis span that belongs to the block opening at `brace`, or null.
 *
 * Handles `f(x) {`, `f(x): Promise<void> {` and `(x) => {`, by walking back over whitespace, a
 * `=>` and a return-type annotation. Stops at a statement boundary so that a bare `{` block
 * cannot pick up the parentheses of whatever preceded it.
 */
function parenBefore(source: string, scan: Scanned, brace: number): Bracket | null {
  let at = brace - 1;
  while (at >= 0) {
    const c = source[at] as string;
    if (/\s/.test(c)) {
      at -= 1;
      continue;
    }
    if (c === ")") {
      return scan.brackets.find((span) => span.char === "(" && span.close === at) ?? null;
    }
    if (c === ";" || c === "{" || c === "}" || c === ",") {
      return null;
    }
    at -= 1;
  }
  return null;
}

/**
 * The shot flag standing between a plain run and `site`, or `null` if there is none.
 *
 * Three shapes, which are the three the tree uses:
 *
 *  1. an enclosing gated test — `test.runIf(SHOTS)(...)`, `test.skipIf(!SHOTS)(...)`, and the
 *     `.each` variants, including the ones written inside a `for` loop over viewports;
 *  2. an enclosing `if` whose condition tests the flag — `if (SHOTS && measured.length > 0)`;
 *  3. an enclosing helper function whose EVERY reference in the file is itself gated, which is
 *     how `keep`/`shoot`/`keepConclusion` are reached. Resolved as a fixed point, so a gated
 *     test calling a helper that calls the writer still counts.
 *
 * A helper with no reference at all is NOT gated. That would be this file losing the call
 * rather than the file being safe, and the two must not look alike.
 *
 * The condition has to name the flag POSITIVELY: `if (!SHOTS)` around a write is a gate held
 * the wrong way round, and reads identically to a regex that only looks for the name.
 */
function gateFor(
  source: string,
  scan: Scanned,
  flags: ReadonlyMap<string, string>,
  offset: number,
): Gate | null {
  if (flags.size === 0) {
    return null;
  }
  const names = [...flags.keys()];
  const positive = (condition: string) =>
    names.find((name) => new RegExp(`(^|[^!\\w$])${name}\\b`).test(condition));

  const enclosing = scan.brackets
    .filter((span) => span.open < offset && span.close > offset)
    .sort((a, b) => b.open - a.open);

  const helpers: string[] = [];
  for (const span of enclosing) {
    const head = source.slice(Math.max(0, span.open - 200), span.open);

    const gatedTest =
      /\b(?:test|it|describe)\s*\.\s*(runIf|skipIf)\s*\(([^)]*)\)\s*(?:\.\s*each\s*\([^)]*\)\s*)?$/.exec(
        head.replace(/\s*\(\s*$/, ""),
      );
    if (gatedTest) {
      const condition = gatedTest[2] as string;
      const inverted = gatedTest[1] === "skipIf";
      const flagName = inverted
        ? names.find((name) => new RegExp(`!\\s*${name}\\b`).test(condition))
        : positive(condition);
      if (flagName) {
        return {
          flag: flags.get(flagName) as string,
          via: `test.${gatedTest[1]}(${condition})`,
        };
      }
      const inlineEnv = /import\s*\.\s*meta\s*\.\s*env\s*\.\s*(VITE_[A-Z0-9_]+)/.exec(
        condition,
      );
      if (inlineEnv && !inverted) {
        return { flag: inlineEnv[1] as string, via: `test.runIf(${condition.trim()})` };
      }
    }

    if (span.char === "{") {
      /*
       * The construct that owns this block, found through the bracket structure rather than by
       * looking back a fixed number of characters. `winterCrisisAtlas`'s `photograph()` takes
       * four parameters over ten lines, so its signature runs past 200 characters and a fixed
       * window cannot see the word `function` at all — which had this file reporting its one
       * genuinely gated `keep()` as ungated.
       */
      const paren = parenBefore(source, scan, span.open);
      if (paren) {
        const preface = stripComments(
          source.slice(Math.max(0, paren.open - 120), paren.open),
        );
        if (/\b(?:if|while)\s*$/.test(preface)) {
          const condition = source.slice(paren.open, paren.close + 1);
          const flagName = positive(condition);
          if (flagName) {
            return { flag: flags.get(flagName) as string, via: `if ${condition.trim()}` };
          }
        }
        const name = declaredNameBefore(source, paren.open);
        if (name) {
          helpers.push(name);
        }
      }
    }
  }

  // Shape 3: every call of the innermost helper this write sits in must itself be gated.
  for (const helper of helpers) {
    const calls: number[] = [];
    const reference = new RegExp(`\\b${helper}\\s*\\(`, "g");
    let match: RegExpExecArray | null = reference.exec(source);
    for (; match !== null; match = reference.exec(source)) {
      const at = match.index;
      if (scan.code[at] !== 1) {
        continue;
      }
      const isDeclaration =
        /\b(?:async\s+)?function\s+$/.test(source.slice(Math.max(0, at - 20), at)) ||
        /\b(?:const|let|var)\s+$/.test(source.slice(Math.max(0, at - 20), at));
      if (isDeclaration) {
        continue;
      }
      calls.push(at);
    }
    if (calls.length === 0) {
      continue;
    }
    const gates = calls.map((call) => gateFor(source, scan, flags, call));
    const first = gates[0];
    if (first && gates.every((gate) => gate !== null)) {
      return { flag: first.flag, via: `${helper}(), called only from ${first.via}` };
    }
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* The sweep                                                                  */
/* -------------------------------------------------------------------------- */

interface Resolved {
  readonly site: WriteSite;
  readonly destinations: readonly string[] | null;
  readonly gate: Gate | null;
  readonly flags: readonly string[];
}

const UNBALANCED: string[] = [];
const ALL: Resolved[] = [];

for (const file of TEST_FILES) {
  const source = readFileSync(path.join(ROOT, file), "utf8");
  const scan = scanSource(source);
  if (!scan.balanced) {
    UNBALANCED.push(file);
    continue;
  }
  const bindings = bindingsIn(source, scan);
  const flags = shotFlagsIn(bindings);
  for (const site of writeSitesIn(file, source, scan)) {
    const base = path.posix.dirname(file);
    const raw = site.implicit
      ? [site.implicit]
      : resolveDestination(site.expression, bindings);
    const destinations =
      raw === null
        ? null
        : raw.map((value) => {
            if (value === OUTSIDE) {
              return OUTSIDE;
            }
            if (path.isAbsolute(value)) {
              const relative = path.relative(ROOT, value);
              return relative.startsWith("..") ? OUTSIDE : relative;
            }
            const from = site.base === "test-file" ? base : ".";
            const joined = path.posix.normalize(path.posix.join(from, value));
            return joined.startsWith("..") ? OUTSIDE : joined;
          });
    ALL.push({
      site,
      destinations,
      gate: gateFor(source, scan, flags, site.at),
      flags: [...flags.values()],
    });
  }
}

const RESOLVED = ALL.filter((entry): entry is Resolved & { destinations: string[] } =>
  Boolean(entry.destinations),
);
const IGNORED = ignoredByGit(RESOLVED.flatMap((entry) => entry.destinations ?? []));

/**
 * Every runtime evidence write that can land anywhere inside the checkout, ignored or not.
 *
 * This is derived from the write calls above. Snapshot pins are assertion references rather
 * than browser evidence, and writes rooted in `mkdtempSync`/`tmpdir()` are outside the checkout.
 */
const RUNTIME_EVIDENCE = RESOLVED.filter(
  (entry) =>
    !entry.site.mechanism.startsWith("toMatch") &&
    (entry.destinations ?? []).some((destination) => destination !== OUTSIDE),
);

function label(entry: Resolved): string {
  return `${entry.site.file}:${entry.site.line}`;
}

/** The suites the sweep found pinning a vitest snapshot, derived rather than declared. */
const PINNING: readonly string[] = ALL.filter(
  (entry) => entry.site.mechanism === "toMatchSnapshot",
).map((entry) => entry.site.file);

/** Runtime evidence destinations git tracks, derived from the actual write-call population. */
const TRACKED_EVIDENCE = RUNTIME_EVIDENCE.filter((entry) =>
  (entry.destinations ?? []).some(
    (destination) => destination !== OUTSIDE && !IGNORED.has(destination),
  ),
);

/** Runtime evidence destinations git ignores but a read-only run must still not create. */
const IGNORED_EVIDENCE = RUNTIME_EVIDENCE.filter((entry) =>
  (entry.destinations ?? []).some(
    (destination) => destination !== OUTSIDE && IGNORED.has(destination),
  ),
);

function trackedDestinations(entry: Resolved): string[] {
  return (entry.destinations ?? []).filter(
    (destination) => destination !== OUTSIDE && !IGNORED.has(destination),
  );
}

function ignoredDestinations(entry: Resolved): string[] {
  return (entry.destinations ?? []).filter(
    (destination) => destination !== OUTSIDE && IGNORED.has(destination),
  );
}

/* -------------------------------------------------------------------------- */
/* The floors, which say this sweep measured something and the RIGHT something */
/* -------------------------------------------------------------------------- */

/** Floors sit below the derived 207-site census; they are anti-vacuity, not pinned counts. */
const FILE_FLOOR = 500;
const WRITE_FLOOR = 200;
const WRITING_FILE_FLOOR = 120;
const EVIDENCE_WRITE_FLOOR = 180;
const EVIDENCE_FILE_FLOOR = 110;
const BROWSER_EVIDENCE_FILE_FLOOR = 100;
const COMMAND_WRITE_FLOOR = 70;
const SCREENSHOT_WRITE_FLOOR = 60;
const TRACKED_WRITE_FLOOR = 45;
const TRACKED_FILE_FLOOR = 25;
const TRACKED_DIRECTORY_FLOOR = 15;
const IGNORED_WRITE_FLOOR = 100;
const IGNORED_FILE_FLOOR = 70;
const IGNORED_DIRECTORY_FLOOR = 20;
const FALLBACK_FLAG_WRITE_FLOOR = 60;
const EXISTING_FLAG_WRITE_FLOOR = 50;
const DISTINCT_EXISTING_FLAG_FLOOR = 15;

/**
 * Runtime evidence writes that may occur with no capture flag, each by `file:line`.
 *
 * **Empty today**, and it is a live list rather than a pinned zero, because the machinery that
 * keeps an exception honest has to be able to run. Nothing in this tree needs an entry.
 *
 * An entry owes a reason on the line above it, and it is asserted in BOTH directions, per
 * `.cursor/rules/qa-verification.mdc`: an entry that stops writing evidence fails, so a
 * moved or deleted write cannot sit here exempting nothing; and an entry that acquires a gate
 * fails, so the list cannot go on excusing something it has stopped describing. Both were forced
 * false before this shipped, and both fail at the entry they were excusing.
 *
 * The list is also bounded below the population, so it cannot grow until it has swallowed the
 * thing it is an exception to.
 */
const MAY_WRITE_UNGATED: ReadonlySet<string> = new Set([]);

/**
 * The suites whose tracked write is a vitest SNAPSHOT, which genuinely cannot be flag-gated.
 *
 * A shot flag exists so that a committed file changes only deliberately. A `.snap` file is not
 * that kind of file: it is the assertion's own reference, and vitest writes it in exactly one
 * circumstance — the reference is absent — which is a state this repository never ships, and one
 * that `CI=true` turns into a failure rather than a write. Put `toMatchSnapshot` behind a flag
 * and a pin could never be created at all. So these fourteen owe the property no more than
 * `test/ciScopeFilter.test.ts` owes it for writing into `mkdtempSync`.
 *
 * **The residual, named rather than left to be found.** A local run whose reference is missing
 * still writes a `.snap`, and nothing here stops it. That is why this repository's work log
 * hashes all fourteen before and after every run that could move a pool; this list does not
 * replace that, it records where the boundary is.
 *
 * Keyed by FILE and not by `file:line`, because a snapshot assertion moves down its file every
 * time something is inserted above it and a line number would rot. Asserted as a set equality,
 * which fails whichever way the list and the tree come apart: a listed file that stops pinning a
 * snapshot fails, and — the direction that matters more — a NEW suite that starts pinning one
 * fails until it is listed. A snapshot pin here is a freeze gate over published item content, so
 * a thirteenth becoming a fourteenth is a thing to read rather than to absorb.
 */
const SNAPSHOT_PINS: readonly string[] = [
  // One per authored domain: the frozen practice pool's ids and content hashes.
  "packages/item-bank/src/d1.test.ts",
  "packages/item-bank/src/d10.test.ts",
  "packages/item-bank/src/d2.test.ts",
  "packages/item-bank/src/d3.test.ts",
  // D4's arrived last, on 2026-08-08: the other nine had pinned their pool from the start.
  "packages/item-bank/src/d4.test.ts",
  "packages/item-bank/src/d5.test.ts",
  "packages/item-bank/src/d6.test.ts",
  "packages/item-bank/src/d7.test.ts",
  "packages/item-bank/src/d8.test.ts",
  "packages/item-bank/src/d9.test.ts",
  // The interactive-widget pool.
  "packages/item-bank/src/interactive.test.ts",
  // The published ASSESSMENT pin, which is the genuinely immutable one.
  "packages/item-bank/src/product.test.ts",
  // D1's v1 template forms, and the walk's forked pool.
  "packages/item-bank/src/template.test.ts",
  "packages/item-bank/src/walk.test.ts",
];

describe("tests leave the checkout as they found it", () => {
  it("the scanner read every test file", () => {
    // A file whose brackets do not balance is a file this sweep cannot reason about, and
    // saying so is the difference between a gap and a silence.
    expect(UNBALANCED, "the scanner lost track in these files").toEqual([]);
    expect(TEST_FILES.length).toBeGreaterThanOrEqual(FILE_FLOOR);
  });

  it("the sweep found the writes", () => {
    expect(
      ALL.length,
      "no write sites at all: a mechanism regex stopped matching",
    ).toBeGreaterThanOrEqual(WRITE_FLOOR);
    expect(new Set(ALL.map((entry) => entry.site.file)).size).toBeGreaterThanOrEqual(
      WRITING_FILE_FLOOR,
    );
    /*
     * A census of the mechanisms actually in use, which fails whichever way it and the tree come
     * apart: one of the four silently ceasing to match is a failure rather than a smaller
     * population, and one of the three swept for and unused today — `commands.removeFile`,
     * `toMatchInlineSnapshot`, `toMatchFileSnapshot` — arriving is a failure too, so a first use
     * gets read rather than absorbed.
     */
    expect([...new Set(ALL.map((entry) => entry.site.mechanism))].sort()).toEqual([
      "commands.writeFile",
      "node:fs",
      "screenshot",
      "toMatchSnapshot",
    ]);
  });

  it("every destination resolves to a directory", () => {
    const unresolved = ALL.filter((entry) => entry.destinations === null).map(
      (entry) =>
        `${label(entry)} writes ${entry.site.expression || "(no path argument found)"}`,
    );
    expect(
      unresolved,
      "these destinations could not be resolved to a directory, so nothing below can say " +
        "whether they land in the tree. Name the directory as a literal, or teach " +
        "resolveDestination the shape",
    ).toEqual([]);
  });

  it("the sweep is looking at the writers that put files in the tree", () => {
    /*
     * THE COMPOSITION ASSERTION. Floors over the total alone would survive a mechanism regex,
     * destination classifier, or entire writer family silently disappearing.
     */
    expect(RUNTIME_EVIDENCE.length).toBeGreaterThanOrEqual(EVIDENCE_WRITE_FLOOR);
    expect(
      new Set(RUNTIME_EVIDENCE.map((entry) => entry.site.file)).size,
    ).toBeGreaterThanOrEqual(EVIDENCE_FILE_FLOOR);
    expect(
      new Set(
        RUNTIME_EVIDENCE.filter((entry) => entry.site.file.includes(".browser.test.")).map(
          (entry) => entry.site.file,
        ),
      ).size,
    ).toBeGreaterThanOrEqual(BROWSER_EVIDENCE_FILE_FLOOR);
    expect(
      RUNTIME_EVIDENCE.filter((entry) => entry.site.mechanism === "commands.writeFile")
        .length,
    ).toBeGreaterThanOrEqual(COMMAND_WRITE_FLOOR);
    expect(
      RUNTIME_EVIDENCE.filter((entry) => entry.site.mechanism === "screenshot").length,
    ).toBeGreaterThanOrEqual(SCREENSHOT_WRITE_FLOOR);

    expect(
      TRACKED_EVIDENCE.length,
      "no evidence write resolves onto a tracked path, so the classifier is answering " +
        "ignored to everything",
    ).toBeGreaterThanOrEqual(TRACKED_WRITE_FLOOR);
    expect(
      new Set(TRACKED_EVIDENCE.map((entry) => entry.site.file)).size,
    ).toBeGreaterThanOrEqual(TRACKED_FILE_FLOOR);
    expect(
      new Set(
        TRACKED_EVIDENCE.flatMap((entry) =>
          trackedDestinations(entry).map(path.posix.dirname),
        ),
      ).size,
    ).toBeGreaterThanOrEqual(TRACKED_DIRECTORY_FLOOR);

    expect(
      IGNORED_EVIDENCE.length,
      "no evidence write resolves onto an ignored path, so the widened half of the census is empty",
    ).toBeGreaterThanOrEqual(IGNORED_WRITE_FLOOR);
    expect(
      new Set(IGNORED_EVIDENCE.map((entry) => entry.site.file)).size,
    ).toBeGreaterThanOrEqual(IGNORED_FILE_FLOOR);
    expect(
      new Set(
        IGNORED_EVIDENCE.flatMap((entry) =>
          ignoredDestinations(entry).map(path.posix.dirname),
        ),
      ).size,
    ).toBeGreaterThanOrEqual(IGNORED_DIRECTORY_FLOOR);
  });

  it("uses the canonical fallback without replacing established suite capture flags", () => {
    const gates = RUNTIME_EVIDENCE.map((entry) => entry.gate).filter(
      (gate): gate is Gate => gate !== null,
    );
    const fallback = gates.filter((gate) => gate.flag === "VITE_CAPTURE_EVIDENCE");
    const established = gates.filter((gate) => gate.flag !== "VITE_CAPTURE_EVIDENCE");
    expect(fallback.length).toBeGreaterThanOrEqual(FALLBACK_FLAG_WRITE_FLOOR);
    expect(established.length).toBeGreaterThanOrEqual(EXISTING_FLAG_WRITE_FLOOR);
    expect(new Set(established.map((gate) => gate.flag)).size).toBeGreaterThanOrEqual(
      DISTINCT_EXISTING_FLAG_FLOOR,
    );
  });

  it("the snapshot pins are exactly the suites that pin a snapshot", () => {
    /*
     * The exemption, in both directions at once. A set equality rather than a containment check,
     * because containment holds trivially over an empty collection and the population here is
     * derived: `PINNING` is whatever the sweep found, so a `toMatchSnapshot` regex that stopped
     * matching would empty it and a subset assertion would sail through.
     */
    const pinning = [...new Set(PINNING)].sort();
    expect(
      pinning,
      "the declared snapshot pins and the suites that actually pin one have come apart. A new " +
        "snapshot pin is a freeze gate over published item content: add it to SNAPSHOT_PINS with " +
        "a line saying what it pins",
    ).toEqual([...SNAPSHOT_PINS].sort());
    expect(
      pinning.length,
      "no suite pins a snapshot, so the exemption excuses nothing",
    ).toBe(14);
  });

  it.each(RUNTIME_EVIDENCE.map((entry) => [label(entry), entry] as const))(
    "%s writes evidence only when an explicit capture flag says so",
    (_where, entry) => {
      const destinations = trackedDestinations(entry).join(", ");
      if (MAY_WRITE_UNGATED.has(label(entry))) {
        expect(
          entry.gate,
          `${label(entry)} is a declared exception but is gated`,
        ).toBeNull();
        return;
      }
      expect(
        entry.gate,
        `${label(entry)} writes ${destinations || entry.destinations?.join(", ")}, and nothing ` +
          `on the way to it tests an explicit VITE_ capture flag. Put only the evidence write ` +
          `behind the file's existing shot flag, or VITE_CAPTURE_EVIDENCE when it has none`,
      ).not.toBeNull();
    },
  );

  it.each(
    RUNTIME_EVIDENCE.filter((entry) => entry.gate).map(
      (entry) => [label(entry), entry] as const,
    ),
  )("%s names the flag it is gated on", (_where, entry) => {
    /*
     * The gate detector is not allowed to say "gated" without producing the `VITE_*` name it
     * found, and the name has to be one the file itself declares. A detector that had decayed
     * into a rubber stamp would have nothing to put here.
     */
    const gate = entry.gate as Gate;
    expect(gate.flag, `${label(entry)}: ${gate.via}`).toMatch(/^VITE_[A-Z0-9_]+$/);
    expect(
      entry.flags,
      `${label(entry)} is gated on a flag its own file does not declare`,
    ).toContain(gate.flag);
  });

  it("nothing is exempt merely by being forgotten", () => {
    // The forward direction: an entry that no longer names runtime evidence exempts nothing.
    const stale = [...MAY_WRITE_UNGATED].filter(
      (entry) => !RUNTIME_EVIDENCE.some((found) => label(found) === entry),
    );
    expect(stale, "these declared exceptions no longer write runtime evidence").toEqual([]);
    // And it cannot grow until it has swallowed the population it is an exception to.
    expect(
      MAY_WRITE_UNGATED.size,
      "a third of the evidence writes in this tree are excused, which is not an exception",
    ).toBeLessThan(Math.max(1, Math.ceil(RUNTIME_EVIDENCE.length / 3)));
  });
});
