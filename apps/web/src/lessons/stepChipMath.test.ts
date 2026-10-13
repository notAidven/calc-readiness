/**
 * A chip that shows math shows it TYPESET.
 *
 * POL.3's ordering board dealt three of its four lines as `latex` and the fourth as `text`,
 * and `kinds/OrderSteps.tsx` branches on that field: `latex` goes through KaTeX, `text` is
 * dropped into a bare `<span>` and inherits `.lesson-sorter__chip { font-weight: 700 }`. So
 * "Either x - 5 = 0 or x + 9 = 0." shipped as bold prose beside three typeset expressions,
 * against the rule that every learner-visible math string is typeset.
 *
 * The population is every learner-visible CHIP, not every `OrderSteps` consumer. A chip here
 * is a visible-form key with a `spoken:` beside it, which is this codebase's marker for "this
 * is on screen and a screen reader has to say it": `OrderedStep`, `LabelParts`' terms,
 * `SpotTheError`'s lines and marks, `FillTable`'s options and the bespoke widgets' own chip
 * types all carry one, and none of them has to import anything to exhibit the defect. Scoping
 * to the `OrderSteps` abstraction would have swept eight files and left every widget writing
 * its own chip type outside the guard, which is the shape of `#219`: sharing an
 * implementation is a fact about the code, showing untypeset math is a fact about the
 * product, and the second is what this is about.
 *
 * The carriers are split by what the renderers DO with them, which is the only thing that
 * decides whether a learner sees typeset math. `text`, `caption`, `glyph`, `name` and `label`
 * are printed into a span or an SVG `<text>` as written (`{part.name}` in `LabelParts`,
 * `{pair.name}` in `MatchPairs`, `{bin.label}` in the sorters, `{row.label}` in the
 * walkthroughs); `latex` and `quantity` are handed to `InlineMath` / `SvgMath` and so are
 * typeset by construction.
 *
 * ONLY THE RAW HALF CAN FAIL, so only the raw half's size is worth a floor, and floors over
 * the union are worth nothing at all. That was this file's own defect on the way in: it
 * floored 477 chips, 409 legible, 76 files and 441 outside the ordering boards, every one of
 * those numbers carried by the 452 `latex` chips that cannot fail the check by construction,
 * while the set the check filters to had no floor under it whatever. Break `RAW_CARRIERS` and
 * all four floors stayed green over a check reading nothing. The floors below are over the
 * raw half, and `RAW_CARRIERS` is asserted carrier by carrier so a name that stops matching
 * the tree fails rather than silently narrowing the sweep.
 *
 * Scope, stated honestly: the carriers are derived from the tree rather than listed, so a NEW
 * visible-form key is inside the sweep on the day it is written. What is claimed is that the
 * derivation reaches 272 raw chips across 57 files, 265 of them outside the ordering boards
 * the defect was found in, and that all five of the keys it was found under are load-bearing.
 *
 * A carrier is raw or typeset by what some renderer DOES with it, which is why both ways of
 * handing a string to KaTeX are read and why a key holding its own fields is not a chip at
 * all. Getting either wrong is not a near miss: it reports a typeset string as prose, and
 * three rounds of that would train a reader to wave the check through.
 *
 * A sibling is read off the source: keys written on one line are one literal, and keys
 * written down a block are siblings when they share an indentation, which holds in a
 * biome-formatted file. If that ever stops holding the population collapses rather than
 * drifting, which is what the floors and the composition check below are for.
 */

import { describe, expect, it } from "vitest";

const WIDGET_SOURCES = import.meta.glob(
  ["./interactive/*.tsx", "./interactive/kinds/*.tsx"],
  {
    query: "?raw",
    import: "default",
    eager: true,
  },
) as Record<string, string>;

interface Chip {
  path: string;
  line: number;
  /** The key the visible form was written under. */
  carrier: string;
  /** `raw` is printed as written; `typeset` goes through KaTeX. */
  kind: "raw" | "typeset";
  /** Every string the visible form can take. A ternary offers more than one. */
  strings: readonly string[];
}

/**
 * The five raw carriers this file was written with, which the derived population has to keep.
 *
 * They are no longer the population — see {@link RAW_CARRIERS} — but they are the keys the
 * defect was actually found under, so a derivation that stops reaching one of them has gone
 * wrong however many others it finds.
 */
const RAW_CARRIERS_FOUND_UNDER = ["text", "caption", "glyph", "name", "label"] as const;
/** Handed to `InlineMath` / `SvgMath`, so math in one of these is typeset by construction. */
const TYPESET_CARRIERS = ["latex", "quantity"] as const;

/** Any object key, which is as much as a scan can tell before the classification below. */
const ANY_KEY = /\b([A-Za-z_$][\w$]*)\s*:/g;

const STRING_LITERAL = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;

/**
 * A typeset carrier in its PROP form, which is the third place one can be written.
 *
 * `HANDED_TO_KATEX` below reads both syntaxes a carrier can be handed to KaTeX through, on the
 * stated ground that "the value reaches KaTeX either way and only one of them was read". The
 * same is true one level down, of the string itself: `latex={`${a} + ${b}`}` sitting inside a
 * value is a string this file cannot call prose, whatever key that value sits under.
 *
 * `holdsItsOwnFields` already makes this argument for a STRUCTURE, in these words: the strings
 * "belong to the `latex="..."` of the JSX below them", so a container may not answer for them.
 * A ReactNode holding no keyed fields is the same claim with nothing for that rule to catch.
 * `fine: (<>That line is right: <InlineMath latex="3^{3} = 27" />.</>)` is a sentence whose
 * math its author DID typeset, and reading the prop's own value as prose under `fine` asks for
 * it to be typeset twice. Five such chips arrived across a merge, on the round that converted
 * `SpotTheError`'s `fine` from a string to a node so its arithmetic could go through KaTeX.
 */
const TYPESET_PROP = /(?:\b[A-Za-z$_]*latex|\bquantity)\s*=\s*\{?\s*$/i;

/**
 * Every key written beside a `spoken:` that holds a string a learner could be shown.
 *
 * `spoken:` is this codebase's marker for "this is on screen and a screen reader has to say
 * it", so the keys around one are the fields of a thing a learner sees. Filtered to the ones
 * holding a string literal, because those are the only ones this file can read at all: a
 * number, an array, a `SlotId` or a ReactNode carries no prose to check.
 *
 * Derived rather than listed, which is the whole point. The lists above are a classification
 * — whether a carrier is typeset is a fact about the RENDERER and cannot be read off the chip
 * — but a classification that also DEFINES the population cannot fail on the key nobody added
 * to it, and that is exactly the key a new widget ships its math under.
 */
const DISCOVERED_CARRIERS: readonly string[] = [
  ...new Set(
    Object.entries(WIDGET_SOURCES)
      .filter(([path]) => !path.includes(".test."))
      .flatMap(([, source]) => stringKeysBesideSpoken(source)),
  ),
].sort();

/**
 * Typeset by construction, read off the key rather than listed: `latex`, `quantity`, and the
 * per-stage forms a board writes down (`negLatex`, `startLatex`, `solvedLatex`), every one of
 * which is handed to `InlineMath` / `SvgMath` by the widget that declares it.
 */
function isTypesetKey(key: string): boolean {
  return (
    (TYPESET_CARRIERS as readonly string[]).includes(key) ||
    /latex$/i.test(key) ||
    /latex[A-Z]/.test(key)
  );
}

/**
 * The keys some renderer hands to KaTeX, which is the only thing that decides raw from
 * typeset and cannot be read off the key's name.
 *
 * `latex={row.lineOne}` is a typeset carrier under a name no list would have guessed. Read
 * across the whole corpus rather than per file, because the file that DECLARES a chip is
 * usually not the file that renders it: a widget writes `{ lineOne, spoken }` rows and the
 * shared kind under `kinds/` is where they meet `InlineMath`. Scoped to the declaring file
 * this returned 328 typeset strings as prose, every one of them a row handed to a kind.
 *
 * BOTH syntaxes, because the value reaches KaTeX either way and only one of them was read.
 * `DifferenceQuotientOrder` writes `ruleTex` and `expandedTex` into the same object and
 * interpolates both into KaTeX; `ruleTex` goes through a JSX prop, `latex={`f(x) = ${ruleTex}`}`,
 * and `expandedTex` through an object field, `latex: `= ${expandedTex}``. Reading only the prop
 * form called the first typeset and the second prose, which is a fact about which syntax an
 * author reached for and not about what the learner sees.
 */
const HANDED_TO_KATEX = (key: string): readonly RegExp[] => [
  // `latex={...key...}`: the JSX prop, whether bare or interpolated into a template.
  new RegExp(`latex=\\{[^\\n]*\\b${key}\\b`),
  // `latex: `...${key}...``: the object field a step or row is declared with.
  new RegExp(`latex:[^\\n]*\\$\\{[^}\\n]*\\b${key}\\b`),
];

const KATEX_KEYS: ReadonlySet<string> = new Set(
  DISCOVERED_CARRIERS.filter((key) =>
    Object.values(WIDGET_SOURCES).some((source) =>
      HANDED_TO_KATEX(key).some((form) => form.test(source)),
    ),
  ),
);

/**
 * Keys that hold a string and are still not a visible form, each with its reason.
 *
 * The corpus-wide reading above excuses a key some renderer typesets, and these are what is
 * left: strings that reach a learner through something other than being printed. Named,
 * because no scan can tell them from a carrier, and asserted both ways below so an entry
 * cannot sit here excusing a key the tree no longer has.
 *
 * They may not name one of the five in {@link RAW_CARRIERS_FOUND_UNDER}, which is asserted
 * too: this list is how the sweep would be narrowed if it were ever going to be.
 */
const NOT_SHOWN_AS_WRITTEN: readonly { key: string; why: string }[] = [
  {
    key: "refusal",
    why: "a ReactNode explaining a wrong pick, whose math its author has already put through InlineMath; the scan reads the JSX's own string literals",
  },
  {
    key: "accepted",
    why: "the ASCII grammar the answer field takes and grades, which is typed by the learner and never printed",
  },
  {
    key: "barsMiss",
    why: "the near-miss spellings RAD.4 compares a typed answer against, read at `round.barsMiss.includes(typed)` and never rendered",
  },
];

/**
 * Printed as written, so math in one of these reaches a learner as prose.
 *
 * The five the defect was found under are raw unconditionally: they are what this file is
 * for, and no derivation may quietly excuse one. Everything else discovered beside a
 * `spoken:` is raw unless some renderer typesets it or it is declared above, which is what
 * puts a key nobody has thought of yet inside the sweep on the day it is written.
 */
function isRawCarrier(key: string): boolean {
  if ((RAW_CARRIERS_FOUND_UNDER as readonly string[]).includes(key)) {
    return true;
  }
  return (
    !isTypesetKey(key) &&
    !KATEX_KEYS.has(key) &&
    !NOT_SHOWN_AS_WRITTEN.some((entry) => entry.key === key)
  );
}

const CARRIER = new RegExp(
  `\\b(${[...DISCOVERED_CARRIERS, ...TYPESET_CARRIERS].join("|")})\\s*:`,
  "g",
);

/**
 * What makes a string math rather than prose.
 *
 * The last one is the load-bearing case and the one that needs care: an operator BETWEEN two
 * operands, where an operand is a lone letter or a run of digits. Requiring the operands to
 * stand alone is what keeps "one-step" and "well-known" out of it, since "one" and "known"
 * are neither.
 */
const MATH_MARKERS: readonly RegExp[] = [
  /\\[a-zA-Z]+/,
  /\^/,
  /(?<![\w$])(?:\d+|[A-Za-z])\s*[+\-*/=<>]\s*(?:\d+|[A-Za-z])(?![\w$])/,
];

/**
 * An interpolated value stands in for whatever number it deals, and the string is read as the
 * runtime would read it: `"\u2713"` is a tick rather than a backslash followed by letters,
 * which is the difference between a check mark on a sorted row and a LaTeX command in prose.
 */
function carriesMath(text: string): boolean {
  const dealt = unescaped(text).replace(/\$\{[^}]*\}/g, "1");
  return MATH_MARKERS.some((marker) => marker.test(dealt));
}

const ESCAPES: Record<string, string> = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f" };

function unescaped(text: string): string {
  return text.replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|[\s\S])/g, (_, code: string) => {
    if (code.startsWith("u") || code.startsWith("x")) {
      return String.fromCodePoint(Number.parseInt(code.slice(1), 16));
    }
    return ESCAPES[code] ?? code;
  });
}

const CHIPS: readonly Chip[] = Object.entries(WIDGET_SOURCES)
  .filter(([path]) => !path.includes(".test."))
  .flatMap(([path, source]) => chipsIn(path, source));

const CHIP_FILES = new Set(CHIPS.map((chip) => chip.path));

/** The chips whose visible form is written out here, and so can be read at all. */
const LEGIBLE_CHIPS = CHIPS.filter((chip) => chip.strings.length > 0);

/**
 * The half the check can actually fail on, and so the half whose size means anything.
 * A typeset chip is typeset whatever it says, so it pads every count without ever being at
 * risk; floor these instead.
 */
const RAW_CHIPS = LEGIBLE_CHIPS.filter((chip) => chip.kind === "raw");

/** The keys the sweep actually reads, which is what the derivation above comes to. */
const RAW_CARRIERS: readonly string[] = [
  ...new Set(RAW_CHIPS.map((chip) => chip.carrier)),
].sort();

/** The eight boards built on the ordering kind, which is the layer the defect was found in. */
const ORDER_STEPS_FILES = new Set(
  Object.entries(WIDGET_SOURCES)
    .filter(([path, source]) => !path.includes(".test.") && source.includes("OrderSteps"))
    .map(([path]) => path),
);

/**
 * Floors, not counts to maintain.
 *
 * The sweep finds 2898 chips in 135 files today, 2480 of them with a visible form written out
 * where it can be read. Nothing here needs an edit when a widget is added; what these fail on
 * is a glob that stops resolving or a derivation that quietly stops matching.
 *
 * The RAW floors are the ones that keep the check honest, because the check reads nothing
 * else: 272 raw chips today across 57 files, 265 of them outside the ordering boards.
 * Converting a genuine prose chip to LaTeX is allowed to move these, which is what the
 * headroom is for; draining them is not.
 *
 * They were 430 / 380 / 60 and 38 / 12 / 34 when this file was written, against a tree with
 * 506 chips and 51 raw ones in it. The tree is six times that now, and a floor of 38 under a
 * population of 272 cannot fail on the partial collapse it exists for -- it only catches a
 * total one, which is the weaker half of what a floor is for. Raised to leave headroom for a
 * lane retiring a widget without leaving room for the derivation to quietly stop matching.
 */
const CHIP_FLOOR = 2400;
const LEGIBLE_CHIP_FLOOR = 2000;
const CHIP_FILE_FLOOR = 110;
const RAW_CHIP_FLOOR = 220;
const RAW_CHIP_FILE_FLOOR = 45;
const RAW_OUTSIDE_ORDER_STEPS_FLOOR = 210;
/** And under the derived key population, so a scan that stops matching fails rather than passes. */
const DISCOVERED_FLOOR = 70;

describe("a learner-visible chip never prints math as prose", () => {
  it("the sweep found the chips", () => {
    expect(CHIPS.length, "the chip derivation has stopped matching").toBeGreaterThanOrEqual(
      CHIP_FLOOR,
    );
    // A chip whose visible form is computed elsewhere is still a chip, but it is not one this
    // can read, so the floor that matters is over the ones it can.
    expect(
      LEGIBLE_CHIPS.length,
      "no chip's visible form could be read, so the check below is looking at nothing",
    ).toBeGreaterThanOrEqual(LEGIBLE_CHIP_FLOOR);
  });

  it("the chips come from across the widget tree", () => {
    expect(
      CHIP_FILES.size,
      "the chips all came from a handful of files, so the glob is not resolving",
    ).toBeGreaterThanOrEqual(CHIP_FILE_FLOOR);
  });

  // The check below reads the raw half and nothing else, so this is the floor that decides
  // whether it is looking at anything. Every count above it is carried by the typeset chips,
  // which are typeset by construction and can never fail: they can hold the union over 430
  // while this set is empty.
  it("the half that can fail is not empty", () => {
    expect(
      RAW_CHIPS.length,
      "no chip is printed as written, so the check below is filtering to nothing",
    ).toBeGreaterThanOrEqual(RAW_CHIP_FLOOR);
    expect(
      new Set(RAW_CHIPS.map((chip) => chip.path)).size,
      "the raw chips came from a handful of files, so the raw sweep has narrowed",
    ).toBeGreaterThanOrEqual(RAW_CHIP_FILE_FLOOR);
  });

  // The carrier population is derived from the same scan the chips are, so a carrier matching
  // nothing is no longer possible by construction and the old both-ways check over a hand
  // list has moved to the derivation test below. What is still worth asserting is that the
  // sweep is not funnelling through a handful of them.
  it("the raw chips come through many carriers, not one", () => {
    expect(
      new Set(RAW_CHIPS.map((chip) => chip.carrier)).size,
      "the raw chips all came through a couple of carriers, so the derived population is not being exercised",
    ).toBeGreaterThanOrEqual(RAW_CARRIERS_FOUND_UNDER.length);
  });

  // Its own claim, and its own test, because a floor constrains size and not shape: 38 raw
  // chips drawn entirely from the ordering boards would clear the floor above while checking
  // exactly the abstraction the defect was found in. This is the claim that the sweep reaches
  // the widgets that write their own chip type, and it has to be able to fail on its own.
  it("the sweep is wider than the ordering boards it was written for", () => {
    expect(
      RAW_CHIPS.filter((chip) => !ORDER_STEPS_FILES.has(chip.path)).length,
      "no raw chip outside the ordering boards is in the population, so this is a kind-shaped sweep",
    ).toBeGreaterThanOrEqual(RAW_OUTSIDE_ORDER_STEPS_FLOOR);
  });

  // The carrier list used to be named outright, and a named list cannot fail on the key
  // nobody added to it: a widget shipping its visible form under a new key would have been
  // outside the sweep, with every floor above still green. So the keys are read off the tree
  // and this is where an unaccounted one lands.
  it("the carrier population is derived, and still reaches the keys the defect was found under", () => {
    expect(
      DISCOVERED_CARRIERS.length,
      "no string-valued key was found beside a `spoken:`, so the derivation has stopped matching and the sweep is reading nothing",
    ).toBeGreaterThanOrEqual(DISCOVERED_FLOOR);
    // The direction the old shape could not fail in: a widget shipping its visible form under
    // a key nobody had added to a hand-written list was outside the sweep, with every floor
    // above still green. Derived, that key is in the population the moment it is written.
    expect(
      RAW_CARRIERS.length,
      "the derived raw population is no wider than the list it replaced, so the derivation is not doing its job",
    ).toBeGreaterThan(RAW_CARRIERS_FOUND_UNDER.length);
    // And the other direction: a derivation is at its most convincing when it is one clean
    // filter, which is also what a too-narrow filter looks like, so the keys the defect was
    // ACTUALLY found under are named and asserted present rather than assumed.
    expect(
      RAW_CARRIERS_FOUND_UNDER.filter((key) => !RAW_CARRIERS.includes(key)),
      "the derivation has stopped reaching a key this file's own defect was found under",
    ).toEqual([]);
    // The declared exceptions, both ways. An entry that stops appearing in the tree fails, so
    // it cannot sit here excusing nothing; and none of them may name one of the five, which is
    // the only way this list could narrow the sweep rather than describe it.
    expect(
      NOT_SHOWN_AS_WRITTEN.filter((entry) => !DISCOVERED_CARRIERS.includes(entry.key)),
      "a declared exception names a key that appears beside no `spoken:` in the tree",
    ).toEqual([]);
    expect(
      NOT_SHOWN_AS_WRITTEN.filter((entry) =>
        (RAW_CARRIERS_FOUND_UNDER as readonly string[]).includes(entry.key),
      ),
      "a declared exception would excuse one of the keys this file exists to read",
    ).toEqual([]);
  });

  it("every chip carrying math hands it to KaTeX", () => {
    const untypeset = RAW_CHIPS.filter((chip) => chip.strings.some(carriesMath)).map(
      (chip) =>
        `${chip.path}:${chip.line} prints math as prose under \`${chip.carrier}\`: ${chip.strings
          .filter(carriesMath)
          .map((each) => JSON.stringify(each))
          .join(" / ")}`,
    );
    expect(untypeset).toEqual([]);
  });
});

/**
 * Every visible-form key in `source` that has a `spoken:` beside it.
 *
 * Beside means one of two things, because a chip is written both ways here: on one line,
 * `{ id: "zero", latex: "0", spoken: "zero" }`, or down a block, in which case the sibling is
 * the key at the same indentation inside the same run of lines indented at least that far.
 * The one-line form is most of the population, and reading only the block form was how a
 * first cut of this sweep found 257 chips where there are three times as many.
 */
function chipsIn(path: string, source: string): Chip[] {
  const lines = source.split(/\r?\n/);
  const found: Chip[] = [];
  for (let at = 0; at < lines.length; at += 1) {
    const line = lines[at] ?? "";
    const indent = line.slice(0, line.length - line.trimStart().length);
    for (const key of line.matchAll(CARRIER)) {
      const from = (key.index ?? 0) + key[0].length;
      const inline = /\bspoken\s*:/.test(line);
      if (!inline) {
        // A key opening its own line, whose sibling is further down or further up the block.
        if (line.slice(0, key.index ?? 0).trim() !== "") {
          continue;
        }
        if (!hasSibling(lines, at, indent, "spoken")) {
          continue;
        }
      }
      const carrier = key[1] ?? "";
      const value = readValue(`${line.slice(from)}\n${deeperLines(lines, at, indent)}`);
      if (holdsItsOwnFields(value)) {
        continue;
      }
      found.push({
        path,
        line: at + 1,
        carrier,
        kind: isRawCarrier(carrier) ? "raw" : "typeset",
        strings: stringsIn(value),
      });
    }
  }
  return found;
}

/**
 * Every key written beside a `spoken:` in one source, by the same two readings `chipsIn` uses.
 *
 * Inline, every other key on a line that also holds a `spoken:`. Down a block, every key at
 * the `spoken:`'s own indentation inside the same run. `spoken` itself is dropped: it is the
 * marker rather than one of the things it marks.
 */
function stringKeysBesideSpoken(source: string): string[] {
  const lines = source.split(/\r?\n/);
  const found: string[] = [];
  for (let at = 0; at < lines.length; at += 1) {
    const line = lines[at] ?? "";
    const indent = line.slice(0, line.length - line.trimStart().length);
    for (const key of line.matchAll(ANY_KEY)) {
      const name = key[1] ?? "";
      if (name === "spoken") {
        continue;
      }
      // `const FACTORS: readonly { latex: string; spoken: string }[] = [` is a DECLARATION
      // whose type annotation happens to name `spoken`, not a chip written beside one. Left
      // in, the identifier joins the carrier population and drags the whole literal's strings
      // in under it.
      if (
        new RegExp(`^\\s*(const|let|var|interface|type|class)\\s+${name}\\b`).test(line)
      ) {
        continue;
      }
      const inline = /\bspoken\s*:/.test(line);
      if (!inline) {
        if (line.slice(0, key.index ?? 0).trim() !== "") {
          continue;
        }
        if (!hasSibling(lines, at, indent, "spoken")) {
          continue;
        }
      }
      const from = (key.index ?? 0) + key[0].length;
      const value = readValue(`${line.slice(from)}\n${deeperLines(lines, at, indent)}`);
      if (stringsIn(value).length === 0 || holdsItsOwnFields(value)) {
        continue;
      }
      found.push(name);
    }
  }
  return found;
}

function hasSibling(
  lines: readonly string[],
  at: number,
  indent: string,
  key: string,
): boolean {
  const sibling = new RegExp(`^${indent}${key}\\s*:`);
  for (const step of [-1, 1]) {
    for (let i = at + step; i >= 0 && i < lines.length; i += step) {
      const line = lines[i] ?? "";
      if (line.trim() === "") {
        continue;
      }
      const lead = line.length - line.trimStart().length;
      if (lead < indent.length) {
        break;
      }
      if (lead === indent.length && sibling.test(line)) {
        return true;
      }
    }
  }
  return false;
}

/** What a value written down the page can run on into: a ternary, or a wrapped string. */
function deeperLines(lines: readonly string[], at: number, indent: string): string {
  const chunk: string[] = [];
  for (let i = at + 1; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (line.trim() === "") {
      break;
    }
    const lead = line.length - line.trimStart().length;
    if (lead <= indent.length) {
      break;
    }
    chunk.push(line);
  }
  return chunk.join("\n");
}

/** One value, ending at the comma or the brace that closes it. */
function readValue(chunk: string): string {
  let at = 0;
  let depth = 0;
  while (at < chunk.length) {
    const ch = chunk[at] ?? "";
    if (ch === '"' || ch === "'" || ch === "`") {
      at = skipString(chunk, at);
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") {
      depth += 1;
    } else if (ch === ")" || ch === "]" || ch === "}") {
      if (depth === 0) {
        break;
      }
      depth -= 1;
    } else if (ch === "," && depth === 0) {
      break;
    }
    at += 1;
  }
  return chunk.slice(0, at);
}

/** The index just past the string opening at `at`, interpolations and escapes included. */
function skipString(chunk: string, at: number): number {
  const quote = chunk[at];
  let i = at + 1;
  while (i < chunk.length) {
    const ch = chunk[i];
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (quote === "`" && ch === "$" && chunk[i + 1] === "{") {
      let depth = 1;
      i += 2;
      while (i < chunk.length && depth > 0) {
        const inner = chunk[i];
        if (inner === "{") {
          depth += 1;
        } else if (inner === "}") {
          depth -= 1;
        } else if (inner === '"' || inner === "'" || inner === "`") {
          i = skipString(chunk, i);
          continue;
        }
        i += 1;
      }
      continue;
    }
    if (ch === quote) {
      return i + 1;
    }
    i += 1;
  }
  return chunk.length;
}

/**
 * A value holding its own keyed fields is a STRUCTURE, and a structure renders nothing.
 *
 * `rounds: [{ inputLatex: "x = 3", substitution: "10 - 4(3)", ... }]` sits beside a `spoken:`
 * at its board's own indentation, so the scan reaches it, and `readValue` then gathers every
 * string literal in the whole array under that one key. Those strings belong to `inputLatex`,
 * to `substitution` and to the `latex="..."` of the JSX below them, and each is typeset where
 * it is actually rendered -- `PiecewiseEvaluate` reported four of them as prose on the
 * strength of the container they were nested in.
 *
 * Nothing is excused by this. A nested field is judged as its OWN chip wherever it sits beside
 * a `spoken:`, by the same rule as everything else here; what stops is one key answering for
 * strings it never prints. An array of plain strings is still a visible form and still read,
 * because `formulas: ["6x + 1", ...]` holds no fields of its own.
 */
function holdsItsOwnFields(value: string): boolean {
  return /\{\s*[A-Za-z_$][\w$]*\s*:/.test(blankStrings(value));
}

/** The chunk with every string literal emptied, so a scan cannot match inside one. */
function blankStrings(chunk: string): string {
  let out = "";
  let at = 0;
  while (at < chunk.length) {
    const ch = chunk[at] ?? "";
    if (ch === '"' || ch === "'" || ch === "`") {
      const end = skipString(chunk, at);
      out += " ".repeat(end - at);
      at = end;
      continue;
    }
    out += ch;
    at += 1;
  }
  return out;
}

function stringsIn(chunk: string): string[] {
  const found: string[] = [];
  for (const match of chunk.matchAll(STRING_LITERAL)) {
    if (TYPESET_PROP.test(chunk.slice(0, match.index ?? 0))) {
      continue;
    }
    found.push(match[1] ?? match[2] ?? match[3] ?? "");
  }
  return found;
}
