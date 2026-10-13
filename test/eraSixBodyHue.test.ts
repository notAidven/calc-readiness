/**
 * **ERA SIX WEARS WARM-BUFF PLASTER UNDER DARK SLATE/LEAD ROOFS, EVERYWHERE.**
 *
 * The ruling is the lead's, dated 2026-08-03, and it is a ruling because the same change had
 * already been made once and had not reached everywhere. On 2026-08-01 era six's style guide
 * moved from warm stucco `#E9C2A1` with terracotta roofs to a dusty-rose pass with lead roofs,
 * then the final Northern Early Modern review selected warm buff `#C7A48E` under dark
 * slate/sheet lead `#596675`. The lead's report that era six *"looks extremely similar to era
 * four"* remains the defect this file exists to prevent, rather than a colour preference.
 * Era four's guide says its terracotta roof *"is what actually separates a building from the
 * ground"*, so era six was wearing a neighbouring era's identity device on its largest surface
 * at 0.32 L\* from that era's limestone. The re-pitch moved both channels because a move on one
 * is what produced the defect.
 *
 * **Four surfaces did not follow it and every one of them fed a picture**: the plate generator's
 * `$ERA6`, the six plates it draws, era six's crisis prompt sheet and run sheet, and the
 * advisor's overgown. The crisis sheet is the sharpest of the four — its fifteen frames have
 * never been run, so generating them on the old sheet would have re-created the exact collision
 * the re-pitch was made to fix, in art nobody had drawn yet.
 *
 * ## WHAT THE POPULATION IS, AND WHY IT IS NOT "THE CRISIS TONE TABLES"
 *
 * `.cursor/rules/qa-verification.mdc` asks that a guard's population be defined by who exhibits
 * the behaviour rather than by where it is implemented, and this defect is the reason that rule
 * is worth obeying here: **nothing in this population shares an implementation.** A PowerShell
 * hashtable, four flat-shaded SVGs, two JSONL prompt files, three prose sheets and a TypeScript
 * costume table import not one line from each other. What they have in common is the only thing
 * that matters — **each of them, on its own, can put era six in era four's clothes.** So the
 * question asked of each candidate was not "does it read `plague-tones.ts`" but "if this file
 * named the wrong colour, would a picture come back wrong", and everything that answers yes is
 * below.
 *
 * `test/crisisToneTables.test.ts` is the neighbour that scopes by the module suffix, correctly,
 * because its subject is *holding a crisis's material palette*. It would never have seen the
 * advisor, the run sheets or the prompt sheets, and the advisor is exactly where a wrong hue is
 * most visible: he is the one figure on screen the eye is already following.
 *
 * ## THE PIN, AND WHAT "DECLARED ONCE" CAN AND CANNOT MEAN HERE
 *
 * `apps/web/src/city/three/plague-tones.ts`'s `BODY_STUCCO` and `LEAD` are the declared values,
 * held to era six's own style guide, so the pin is a transcription rather than a fifth opinion.
 * Every other surface then has to EQUAL the pin. That is as far as "declared once" can go: a
 * prompt fed to an image tool has to contain a literal hex, a PowerShell palette cannot import
 * TypeScript, and an SVG is a file of fills. What this file buys is that all of those are
 * checked copies of one authority instead of five independent authorings, which is precisely
 * the arrangement that failed on 2026-08-01.
 *
 * ## ERA FOUR IS ASSERTED POSITIVELY, NOT LEFT ALONE
 *
 * Era four's terracotta is correct and is the thing era six was colliding with, so "no
 * terracotta anywhere" would be the wrong repair — it would fix the collision by deleting the
 * other side of it. `era four keeps its terracotta` below asserts `#B4674A` is still authored in
 * era four's guide, still in `$ERA4.Roof`, still `succession-tones.ts`'s `ROOF_TILE` and still
 * the era-four advisor's accent, so a sweep that over-reached fails here rather than shipping.
 */

import { readdirSync, readFileSync } from "node:fs";
import { posix } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

const repoRoot = resolveRepoRoot();

const GENERATOR = "tools/generate-winter-crisis-references.ps1";
const PIN = "apps/web/src/city/three/plague-tones.ts";
const PLAGUE_CSS = "apps/web/src/plague/plague.css";
const SUCCESSION_TONES = "apps/web/src/city/three/succession-tones.ts";
const ADVISOR_DRESS = "apps/web/src/city/advisorDress.ts";
const PLAGUE_PLATES = "docs/superpowers/specs/crisis-reference-packs/plague";
const ERA_SIX_GUIDE = "docs/superpowers/specs/eras/era-06-early-modern/style-guide.md";
const ERA_FOUR_GUIDE = "docs/superpowers/specs/eras/era-04-classical/style-guide.md";

/**
 * The three prose sheets, named rather than derived, because a `.md` name written in code is a
 * claim the CI scope filter has to honour (`test/ciScopeFilter.test.ts`) and a derived one
 * resolves to nothing. All three specify era six's materials to a human who then writes a
 * prompt, so they are upstream of the JSONL that reaches a generator and are in the population
 * for that reason rather than despite it.
 */
const CRISIS_SHEET = "output/imagegen/era-06-plague-crisis-scenes/README.md";
const BUILDING_SHEET = "output/imagegen/era-06-early-modern-building-briefs/README.md";
const PLATE_SHEET = "docs/superpowers/specs/crisis-reference-packs/plague/README.md";

function source(path: string): string {
  const text = readFileSync(posix.join(repoRoot, path), "utf8");
  // A floor, because every search below is meaningless over an empty read, and an empty read
  // would look exactly like unanimous compliance.
  expect(text.length, `${path} read empty`).toBeGreaterThan(400);
  return text;
}

const generator = source(GENERATOR);

/* -------------------------------------------------------------------------- */
/* The generator's own arithmetic                                             */
/* -------------------------------------------------------------------------- */

/**
 * .NET's `[Math]::Round(double)`, which is round-half-to-EVEN and not `Math.round`.
 *
 * **The trap is recorded because it has already been fallen into.** `crisisToneTables.test.ts`
 * was written with `Math.round` first and reported two tone tables as wrong when it was the port
 * that was: PowerShell rounds 196.5 down to 196 and JavaScript rounds it up to 197, so a one-unit
 * difference is the whole of it. The file that drew the plates is the one that decides, and
 * `the port of MixHex is the generator's and not JavaScript's` below proves this port on exactly
 * that half case rather than asserting it in a comment.
 */
function roundHalfToEven(value: number): number {
  const floor = Math.floor(value);
  if (value - floor !== 0.5) {
    return Math.round(value);
  }
  return floor % 2 === 0 ? floor : floor + 1;
}

/** `MixHex`, ported from the generator: per channel, round toward the target by `amount`. */
function mix(from: number, toward: number, amount: number): number {
  let out = 0;
  for (const shift of [16, 8, 0]) {
    const a = (from >> shift) & 0xff;
    const b = (toward >> shift) & 0xff;
    out |= Math.min(255, Math.max(0, roundHalfToEven(a + (b - a) * amount))) << shift;
  }
  return out >>> 0;
}

const darken = (hex: number, amount: number): number => mix(hex, 0x000000, amount);
const lighten = (hex: number, amount: number): number => mix(hex, 0xffffff, amount);
/** `FaceTop` and `FaceRight`: the Art Bible's shading model, as the generator spells it. */
const faceTop = (hex: number): number => lighten(hex, 0.26);
const faceRight = (hex: number): number => darken(hex, 0.28);

const hex = (value: number): string => `#${value.toString(16).padStart(6, "0")}`;
const parse = (value: string): number => Number.parseInt(value.replace("#", ""), 16);

/* -------------------------------------------------------------------------- */
/* Reading each surface in its own language                                   */
/* -------------------------------------------------------------------------- */

/** One `$ERAn` palette table's text, from its opening brace to its closing one. */
function eraTable(era: number): string {
  const start = generator.indexOf(`$ERA${era} = @{`);
  expect(start, `$ERA${era} has been renamed or removed`).toBeGreaterThan(-1);
  const end = generator.indexOf("\n}", start);
  expect(end, `$ERA${era}'s table is unterminated`).toBeGreaterThan(start);
  return generator.slice(start, end);
}

function eraRole(era: number, role: string): number {
  const found = new RegExp(`^\\s*${role}\\s*=\\s*"(#[0-9a-f]{6})"`, "m").exec(
    eraTable(era),
  );
  expect(found, `$ERA${era} no longer authors a ${role}`).not.toBeNull();
  return parse((found as RegExpExecArray)[1] as string);
}

/**
 * The `KEY: 0xrrggbb,` entries of a tone module, anchored at exactly two spaces of indentation
 * so a hex quoted inside a doc comment stays out of the parse. The same reader
 * `crisisToneTables.test.ts` uses, and it is pinned against both shapes below.
 */
function toneEntries(text: string): Map<string, number> {
  const found = new Map<string, number>();
  for (const match of text.matchAll(/^ {2}([A-Z][A-Z0-9_]*): (0x[0-9a-f]{6}),$/gm)) {
    found.set(match[1] as string, Number.parseInt((match[2] as string).slice(2), 16));
  }
  return found;
}

/**
 * A style guide's palette table row, read the way `eraPaletteLadder.test.ts` reads it: the live
 * table only, with every `>` amendment block dropped, so a guide can record what a hue USED to
 * be without this file mistaking the record for the ruling.
 */
function guideRole(path: string, role: "Body hue" | "Accent"): number {
  const live = source(path)
    .split("\n")
    .filter((line) => !line.trim().startsWith(">"))
    .join("\n");
  const found = new RegExp(
    `\\|\\s*\\*{0,2}${role}\\*{0,2}\\s*\\|[^|]*\\|\\s*\`(#[0-9A-Fa-f]{6})\`\\s*\\|`,
  ).exec(live);
  expect(found, `${path} states no ${role} in its palette table`).not.toBeNull();
  return parse(((found as RegExpExecArray)[1] as string).toLowerCase());
}

/** One era's row of `advisorDress.ts`, as `key: "#hex"` pairs plus its four motes. */
function advisorRow(era: string): { fields: Map<string, number>; motes: number[] } {
  const text = source(ADVISOR_DRESS);
  const start = text.indexOf(`\n  ${era}: {\n`);
  expect(start, `advisorDress.ts has no ${era} row`).toBeGreaterThan(-1);
  const end = text.indexOf("\n  },\n", start);
  expect(end, `${era}'s row is unterminated`).toBeGreaterThan(start);
  const row = text.slice(start, end);

  const fields = new Map<string, number>();
  for (const match of row.matchAll(/^ {4}(\w+): "(#[0-9A-Fa-f]{6})",$/gm)) {
    fields.set(match[1] as string, parse((match[2] as string).toLowerCase()));
  }
  const motes = [
    ...(/^ {4}motes: \[([^\]]+)\],$/m.exec(row)?.[1] ?? "").matchAll(
      /"(#[0-9A-Fa-f]{6})"/g,
    ),
  ].map((match) => parse((match[1] as string).toLowerCase()));
  return { fields, motes };
}

/** Every plate in the plague pack, and every distinct fill in each, derived from the directory. */
const plates = readdirSync(posix.join(repoRoot, PLAGUE_PLATES))
  .filter((name) => name.endsWith(".svg"))
  .sort();

const fillsByPlate = new Map<string, Set<number>>();
for (const plate of plates) {
  const found = new Set<number>();
  for (const match of source(posix.join(PLAGUE_PLATES, plate)).matchAll(
    /fill="(#[0-9a-fA-F]{6})"/g,
  )) {
    found.add(parse((match[1] as string).toLowerCase()));
  }
  fillsByPlate.set(plate, found);
}

const platesWith = (tone: number): string[] =>
  plates.filter((plate) => fillsByPlate.get(plate)?.has(tone));

/* -------------------------------------------------------------------------- */
/* The population                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Era six's imagegen surfaces, derived from the tree rather than listed: every `.jsonl` under an
 * `output/imagegen/era-06-*` directory. A third era-six brief joins this sweep by being saved,
 * which is the point — the crisis sheet's run sheet arrived three days after the building
 * briefs' and nobody widened anything.
 *
 * The `.md` sheets in those same directories are named at the top of this file instead; see the
 * reason there.
 */
const IMAGEGEN_ROOT = "output/imagegen";
const eraSixPromptData = readdirSync(posix.join(repoRoot, IMAGEGEN_ROOT), {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory() && entry.name.startsWith("era-06-"))
  .flatMap((entry) =>
    readdirSync(posix.join(repoRoot, IMAGEGEN_ROOT, entry.name))
      .filter((name) => name.endsWith(".jsonl"))
      .map((name) => posix.join(IMAGEGEN_ROOT, entry.name, name)),
  )
  .sort();

/**
 * **A MEMBER IS ERA SIX'S PART OF A FILE, NOT ALWAYS THE WHOLE FILE.**
 *
 * Two of these serve all ten eras: the plate generator holds `$ERA1`, `$ERA4`, `$ERA6` and
 * `$ERA9`, and `advisorDress.ts` holds ten costumes. Sweeping either whole would report era
 * four's own terracotta as an era-six defect — which is the repair this ruling must NOT make —
 * so each member carries a `scope` naming era six's slice of it, and everything else defaults to
 * the whole file. `a shared file is scoped to era six's part of it` asserts every scope is a
 * proper, non-empty subset that still contains era six's own marker, so a scope that silently
 * stopped matching would fail rather than excuse the file.
 *
 * The prose sheets are members on the same terms as the JSONL: a human reads the sheet and
 * writes the prompt, so a sheet that still says stucco is one regeneration away from putting it
 * back into a run sheet this guard had already cleaned.
 */
interface Surface {
  readonly path: string;
  readonly what: string;
  /** Era six's part of the file. Identity where the whole file is era six's. */
  readonly scope?: (text: string) => string;
  /** A string era six's slice must contain, so a scope that matched nothing fails. */
  readonly marker?: string;
}

const SURFACES: readonly Surface[] = [
  { path: PIN, what: "the pinned tone table era six's crisis reads its materials from" },
  { path: PLAGUE_CSS, what: "the live plague prototype's copied CSS palette" },
  {
    path: GENERATOR,
    what: "the plate generator's $ERA6 and the pack writer that draws the six plates",
    scope: (text) => {
      const table = text.slice(
        text.indexOf("$ERA6 = @{"),
        text.indexOf("\n}", text.indexOf("$ERA6 = @{")),
      );
      const writer = text.slice(
        text.indexOf("function Write-PlaguePack {"),
        text.indexOf("\n}\n", text.indexOf("function Write-PlaguePack {")),
      );
      return `${table}\n${writer}`;
    },
    marker: "$e = $ERA6",
  },
  {
    path: ADVISOR_DRESS,
    what: "the advisor's overgown, which is era six's body hue on a person",
    // From the doc comment that transcribes era six's guide, not just from the row: the comment
    // is where the record of the move lives and is as much era six's part of this file as the
    // hexes under it.
    scope: (text) => {
      const row = text.indexOf("\n  renaissance: {\n");
      return text.slice(text.lastIndexOf("\n  /**", row), text.indexOf("\n  },\n", row));
    },
    marker: 'id: "renaissance"',
  },
  { path: CRISIS_SHEET, what: "the fifteen crisis frame briefs" },
  { path: BUILDING_SHEET, what: "the eleven building concept briefs" },
  { path: PLATE_SHEET, what: "the plate pack's own theme brief and reading key" },
  ...eraSixPromptData.map((path) => ({ path, what: "prompt data fed to an image tool" })),
  ...plates.map((name) => ({
    path: posix.join(PLAGUE_PLATES, name),
    what: "a drawn reference plate",
  })),
];

/** Era six's part of one surface, with the record of the move taken back out of it. */
function specifyingText(surface: Surface): string {
  const scoped = (surface.scope ?? ((text: string) => text))(source(surface.path));
  const record = RECORDS_THE_MOVE.find((entry) => entry.path === surface.path);
  return record ? record.specifying(scoped) : scoped;
}

/**
 * The same text with blockquote markers and line breaks flattened, for the phrase searches.
 *
 * Written after the sweep found *"no terracotta anywhere"* split across a `>` continuation in
 * the plate pack's theme brief and read the second half as an unqualified mention. A prohibition
 * that wraps is still a prohibition, and a rule that cannot see that would push authors into
 * writing to the guard's line breaks.
 */
const flatten = (text: string): string => text.replace(/\n>?\s*/g, " ");

/** Both retired bodies, and every face tone the generator can derive from either one. */
const FIRST_RETIRED_BODY = 0xe9c2a1;
const RETIRED_PINK_BODY = 0xd29f9f;
const ERA_FOUR_ROOF = 0xb4674a;
const RETIRED_FACES = [FIRST_RETIRED_BODY, RETIRED_PINK_BODY].flatMap((body) => [
  body,
  faceTop(body),
  faceRight(body),
  darken(body, 0.4),
  darken(body, 0.54),
  darken(body, 0.62),
  lighten(body, 0.16),
]);

/**
 * **THE SURFACES THAT MAY STILL RECORD `#E9C2A1`, EACH WITH A REASON AND A BOUNDARY.**
 *
 * They RECORD the move rather than specify a colour, and a repository that deleted its
 * own record of why era six moved would be one re-pitch away from repeating the mistake. So
 * they are named rather than quietly skipped, and the list is asserted in both directions: an
 * entry that stops carrying the record fails, an unlisted surface that starts carrying the hue
 * fails, and — the direction that makes the exemption load-bearing rather than decorative — a
 * listed surface that carries it in a SPECIFYING position fails too.
 *
 * `boundary` is what "a specifying position" means in that file's own syntax. Move one mention
 * across it and the sweep goes red at the file it was excusing.
 */
const RECORDS_THE_MOVE: readonly {
  readonly path: string;
  readonly why: string;
  /** The part of the surface where the retired hue may NOT appear, sliced out of its scope. */
  readonly specifying: (text: string) => string;
  readonly boundary: string;
}[] = [
  {
    path: GENERATOR,
    why:
      "the comment on `$ERA6.Body` says what the value was and why it moved, which is what a " +
      "reader of a bare hashtable of hexes has no other way to find out",
    // The assignments only. A `Role = "#rrggbb"` line is the specifying position in PowerShell,
    // and everything else in the scope is a comment or a draw call.
    specifying: (text) =>
      text
        .split("\n")
        .filter((line) => /^\s*\w+\s*=\s*"#[0-9a-f]{6}"/.test(line))
        .join("\n"),
    boundary: "a palette assignment rather than a comment",
  },
  {
    path: ADVISOR_DRESS,
    why:
      "the ⚑ note on era six's row records that the overgown moved with the era and what the " +
      "underdress used to be, which is the derivation the value below is not free to drift off",
    // The costume's own fields. A `key: "#hex",` line is the specifying position here.
    specifying: (text) =>
      text
        .split("\n")
        .filter((line) => /^ {4}\w+: (?:"#[0-9A-Fa-f]{6}"|\[)/.test(line))
        .join("\n"),
    boundary: "a costume field rather than the ⚑ note above it",
  },
  {
    path: PIN,
    why:
      "its BODY_STUCCO entry carries the ruling that produced the value, including the hue it " +
      "replaced and the two-channel measurement against era four",
    // Doc comments only. A `  KEY: 0x...,` entry is the specifying position here, and it is the
    // same anchored shape `crisisToneTables.test.ts` parses a table with.
    specifying: (text) =>
      text
        .split("\n")
        .filter((line) => /^ {2}[A-Z][A-Z0-9_]*: 0x[0-9a-f]{6},$/.test(line))
        .join("\n"),
    boundary: "a tone entry rather than a doc comment",
  },
  {
    path: CRISIS_SHEET,
    why:
      "its owed list records item 0 as closed, and closing it means saying what it was closed " +
      "from; the ⚑ note above it does the same",
    // Everything before `## Owed to the lead` is the fifteen frame briefs and the shared
    // direction fed verbatim to a generator. The owed list after it is the record.
    specifying: (text) => text.slice(0, text.indexOf("\n## Owed to the lead")),
    boundary: "a frame brief rather than the owed list",
  },
];

/* -------------------------------------------------------------------------- */

describe("the pin is era six's own guide and not a fifth opinion", () => {
  it("holds the style guide's body hue, read off the live palette table", () => {
    const pinned = toneEntries(source(PIN)).get("BODY_STUCCO");
    expect(pinned, `${PIN} no longer declares a BODY_STUCCO`).toBeDefined();
    expect(hex(pinned as number)).toBe(hex(guideRole(ERA_SIX_GUIDE, "Body hue")));
  });

  it("reads a table and not a comment", () => {
    // The parser every assertion here rests on passes by finding things, which is also how it
    // would look broken into finding nothing. Both shapes pinned.
    expect([...toneEntries("  BODY_STUCCO: 0xc7a48e,\n")]).toEqual([
      ["BODY_STUCCO", 0xc7a48e],
    ]);
    expect([...toneEntries(" * changed from `#E9C2A1` and 0xe9c2a1 with it,\n")]).toEqual(
      [],
    );
  });

  it("makes lead the accent on every roof, which is the other half of the ruling", () => {
    // The roofs are why the body moved at all: era four's guide calls the terracotta roof the
    // thing that separates a building from the ground, and era six had adopted it. So the
    // accent's ROLE is asserted, not only its hex -- era six's palette row has to say the roofs.
    const accent = guideRole(ERA_SIX_GUIDE, "Accent");
    expect(hex(toneEntries(source(PIN)).get("LEAD") as number)).toBe(hex(accent));
    expect(hex(eraRole(6, "Lead"))).toBe(hex(accent));
    const row = /\|\s*Accent\s*\|([^|]*)\|/.exec(source(ERA_SIX_GUIDE))?.[1] ?? "";
    expect(row.toLowerCase()).toContain("roof");
  });

  it("has no roof-tile entry left in era six's tones", () => {
    // The deletion, asserted as a deletion. This table held era four's `#B4674A` under a
    // ROOF_TILE key, derived across eras, for as long as the frames said the tile carried over.
    const entries = toneEntries(source(PIN));
    expect([...entries.keys()]).not.toContain("ROOF_TILE");
    expect([...entries.values()].map(hex)).not.toContain(hex(ERA_FOUR_ROOF));
    // And a floor, so an emptied table could not pass this by holding nothing at all.
    expect(entries.size).toBeGreaterThanOrEqual(17);
  });

  it("is the port of MixHex the generator uses, on the half case that catches a bad one", () => {
    // NOT PEDANTRY, AND NOT ASSUMED. `Lighten(#596675, 0.5)` puts the green channel on 178.5,
    // where PowerShell rounds to even and JavaScript rounds up. The generator's answer is the
    // door bar this very file's pin holds, so a `Math.round` port disagrees with a shipped
    // value rather than with a comment.
    expect(hex(lighten(0x596675, 0.5))).toBe("#acb2ba");
    expect(hex(toneEntries(source(PIN)).get("DOOR_BAR") as number)).toBe("#acb2ba");
    // The naive port, so the assertion above is measured against the thing it rules out.
    expect(Math.round(0x66 + (0xff - 0x66) * 0.5)).toBe(179);
    expect(roundHalfToEven(0x66 + (0xff - 0x66) * 0.5)).toBe(178);
  });
});

describe("every surface that specifies era six's body hue carries the pin's value", () => {
  const pinned = toneEntries(source(PIN)).get("BODY_STUCCO") as number;

  it("sweeps a population derived from the tree, with floors under both halves", () => {
    // Floors first: every census below quantifies over these lists, so a directory walk that
    // came back short would read as unanimous compliance.
    expect(plates.length, `only ${plates.length} plates in ${PLAGUE_PLATES}`).toBe(6);
    expect(eraSixPromptData.length).toBeGreaterThanOrEqual(2);
    expect(eraSixPromptData).toContain(
      "output/imagegen/era-06-plague-crisis-scenes/imagegen-run-sheet.jsonl",
    );
    expect(SURFACES.length).toBeGreaterThanOrEqual(12);

    // COMPOSITION, not only size, because a floor constrains size and the claim here is shape:
    // this sweep is wider than any one lane. Strip out everything the crisis owns and there must
    // still be surfaces left -- the advisor and the building briefs -- since a population that
    // quietly narrowed back to the crisis would clear the floor above and miss the surface the
    // 2026-08-01 change was found sitting on furthest from it.
    const outsideTheCrisis = SURFACES.filter(
      ({ path }) => !path.includes("plague") && !path.includes("crisis"),
    );
    expect(outsideTheCrisis.map(({ path }) => path).sort()).toEqual([
      ADVISOR_DRESS,
      BUILDING_SHEET,
      "output/imagegen/era-06-early-modern-building-briefs/era06-early-modern-concepts.jsonl",
    ]);
  });

  it("scopes a shared file to era six's part of it, and to a real part", () => {
    // Two members are files serving all ten eras. A scope that stopped matching would slice to
    // nothing and excuse the file; a scope that matched everything would sweep era four's own
    // terracotta and report it as this era's defect. Both are failures and both are here.
    const scoped = SURFACES.filter((surface) => surface.scope !== undefined);
    expect(scoped.map((surface) => surface.path).sort()).toEqual(
      [ADVISOR_DRESS, GENERATOR].sort(),
    );
    for (const surface of scoped) {
      const whole = source(surface.path);
      const part = (surface.scope as (text: string) => string)(whole);
      expect(part.length, `${surface.path}: era six's slice is empty`).toBeGreaterThan(80);
      expect(part.length, `${surface.path}: the scope is the whole file`).toBeLessThan(
        whole.length,
      );
      expect(part, `${surface.path}: the slice is not era six's`).toContain(
        surface.marker as string,
      );
      // And the slice genuinely excludes the other eras, which is the whole reason it exists.
      expect(part.toLowerCase()).not.toContain(hex(ERA_FOUR_ROOF));
    }
  });

  it("hands the plague pack's masses the LEAD accent at every call site", () => {
    // `EraMass`'s own default accent is era four's `#b4674a`, so an era-six call that dropped
    // `-Accent` would draw terracotta roofs without any hex appearing anywhere near era six.
    // The one way this ruling can be undone without a colour being typed.
    const generatorSurface = SURFACES.find(
      (surface) => surface.path === GENERATOR,
    ) as Surface;
    const scope = generatorSurface.scope as (text: string) => string;
    const writer = scope(source(GENERATOR));
    const calls = [...writer.matchAll(/\$\(EraMass [^)]*\)/g)].map((match) => match[0]);
    const eraSix = calls.filter((call) => call.includes("-Body $e.Body"));
    expect(
      eraSix.length,
      "the plague pack draws no era-six masses at all",
    ).toBeGreaterThanOrEqual(12);
    expect(
      eraSix.filter((call) => !call.includes("-Accent $e.Lead")),
      "an era-six mass takes EraMass's default accent, which is era four's roof tile",
    ).toEqual([]);
    // The masses this filter leaves out are named, so it cannot pass by leaving everything out:
    // plate 02 draws ERA SEVEN's raised main beside era six's inlaid band on purpose, and its two
    // masses are the only ones in the pack whose body is a literal rather than `$e.Body`.
    const notEraSix = calls.filter((call) => !call.includes("-Body $e.Body"));
    expect(notEraSix).toHaveLength(2);
    for (const call of notEraSix) {
      expect(call, "an unaccounted mass in the plague pack").toContain('-Body "#a2867a"');
    }
  });

  it("names the pin's value and never the retired one, on every surface", () => {
    const offenders: string[] = [];
    let specifiesTheHue = 0;

    for (const surface of SURFACES) {
      const searched = specifyingText(surface).toLowerCase();
      expect(
        searched.length,
        `${surface.path}'s specifying half sliced to nothing, so this looked at no text`,
      ).toBeGreaterThan(0);

      for (const retired of RETIRED_FACES) {
        if (searched.includes(hex(retired))) {
          offenders.push(
            `${surface.path} (${surface.what}) still specifies ${hex(retired)}`,
          );
        }
      }
      // Era four's roof hex is a second failure and not the same one: a surface could move its
      // body to buff and go on asking for a terracotta roof, which is the half of the collision
      // era four's own guide calls the thing that separates a building from the ground.
      if (searched.includes(hex(ERA_FOUR_ROOF))) {
        offenders.push(
          `${surface.path} (${surface.what}) still specifies era four's roof tile`,
        );
      }
      if (searched.includes(hex(pinned))) {
        specifiesTheHue += 1;
      }
    }

    expect(offenders).toEqual([]);
    // A FLOOR UNDER THE CONTAINMENT, because "nobody names the retired hue" is true of a
    // population that names no hue at all. Twelve of the fourteen state the body outright; the
    // two that do not are the plates with no mass in them.
    expect(specifiesTheHue).toBeGreaterThanOrEqual(11);
  });

  it("draws the pin's three faces in every plate with a mass in it, and none of the old ones", () => {
    // The plates are the one surface where the value is not written down but SHADED, so the
    // check is the generator's own face model rather than a string search: a plate that had been
    // hand-edited to the right body and the wrong faces would pass a grep and fail here.
    const withMasses = plates.filter((plate) => fillsByPlate.get(plate)?.has(pinned));
    expect(
      withMasses.length,
      "no plague plate draws era six's body hue",
    ).toBeGreaterThanOrEqual(4);
    for (const plate of withMasses) {
      for (const face of [faceTop(pinned), faceRight(pinned)]) {
        expect(
          fillsByPlate.get(plate),
          `${plate} draws the body but not its ${hex(face)} face`,
        ).toContain(face);
      }
    }
    for (const retired of RETIRED_FACES) {
      expect(
        platesWith(retired),
        `${hex(retired)} is still drawn in the plague pack`,
      ).toEqual([]);
    }
  });

  it("dresses era six's advisor in the pin, with one visibly deeper underdress", () => {
    // The advisor is the most visible member of this population and the one furthest from the
    // crisis, which is why he was missed. His guide says "overgown in the warm-buff body hue,
    // underdress a deeper tone of the same", so the overgown is the pin and both lower fields
    // must agree on one darker support tone.
    const { fields, motes } = advisorRow("renaissance");
    const under = fields.get("garmentDeep") as number;
    const luminance = (tone: number): number =>
      (0.2126 * ((tone >> 16) & 0xff) +
        0.7152 * ((tone >> 8) & 0xff) +
        0.0722 * (tone & 0xff)) /
      255;
    expect(hex(fields.get("garment") as number)).toBe(hex(pinned));
    expect(hex(fields.get("overColour") as number)).toBe(hex(pinned));
    expect(hex(fields.get("leg") as number)).toBe(hex(under));
    expect(hex(fields.get("trim") as number)).toBe(hex(eraRole(6, "Lead")));
    expect(hex(fields.get("accent") as number)).toBe(hex(eraRole(6, "Lead")));
    expect(luminance(pinned) - luminance(under)).toBeGreaterThan(0.12);
    expect(luminance(under) / luminance(pinned)).toBeGreaterThan(0.65);
    expect(motes.map(hex)).toContain(hex(pinned));
    expect(motes.map(hex)).toContain(hex(eraRole(6, "Lead")));
    // Floor: an unparsed row would give an empty map and every `get` above would be undefined,
    // which `toBe` would catch -- but the motes are an array and an empty one contains nothing
    // to disagree with.
    expect(motes).toHaveLength(4);
    expect(fields.size).toBeGreaterThanOrEqual(12);
  });
});

describe("terracotta is an object in era six and never a roof", () => {
  it("gives no era-six surface a pan-and-cover tile", () => {
    // The material by name rather than by hex, because the frames said BOTH: "terracotta
    // pan-and-cover tile #B4674A on everything not domed". A sheet could drop the hex and keep
    // asking for the tile, and an image tool would happily oblige.
    const offenders: string[] = [];
    for (const surface of SURFACES) {
      if (flatten(specifyingText(surface)).toLowerCase().includes("pan-and-cover")) {
        offenders.push(
          `${surface.path} (${surface.what}) still asks for pan-and-cover tile`,
        );
      }
    }
    expect(offenders).toEqual([]);
  });

  it("writes terracotta only as a prohibition in the surfaces that mention it at all", () => {
    // Not a ban on the word: era six's guide keeps terracotta "as an OBJECT and never as a
    // SURFACE", and the prompts say so out loud in the era's own house style -- the building
    // briefs have carried "no terracotta" in all eleven prompts since they were written.
    const offenders: string[] = [];
    let prohibitions = 0;
    for (const surface of SURFACES) {
      for (const match of flatten(specifyingText(surface)).matchAll(
        /(.{0,4})terracotta/gi,
      )) {
        if (/\bno $/i.test(match[1] as string)) {
          prohibitions += 1;
        } else {
          offenders.push(`${surface.path} (${surface.what}): "${match[0]}"`);
        }
      }
    }
    expect(offenders).toEqual([]);
    // The floor that stops this passing over surfaces that stopped saying anything: era six's
    // prompts state the prohibition, and they are meant to go on stating it.
    expect(prohibitions).toBeGreaterThanOrEqual(15);
  });

  it("keeps the guide's own object exception, so the sweep did not ban the material", () => {
    // The other direction. Deleting terracotta from era six outright would take the Painters'
    // School roundels and the citrus pots with it, and that is not what was ruled.
    const guide = source(ERA_SIX_GUIDE).toLowerCase();
    expect(guide).toContain("terracotta survives in this era as an object");
    expect(guide).toContain("no roof, no wall and no paving is\n> terracotta");
  });
});

describe("the record of the move is kept, and kept out of the specifications", () => {
  it("has exactly the named exceptions, and each still carries the record", () => {
    // Direction one: a listed surface that stopped recording the move is excusing nothing and
    // would sit here forever hiding that fact -- which is also what a renamed or deleted file
    // looks like from outside this list.
    for (const entry of RECORDS_THE_MOVE) {
      const surface = SURFACES.find(
        (candidate) => candidate.path === entry.path,
      ) as Surface;
      expect(surface, `${entry.path} is excused from a sweep it is not in`).toBeDefined();
      const scoped = (surface.scope ?? ((text: string) => text))(source(entry.path));
      expect(
        scoped.toLowerCase(),
        `${entry.path} is excused because ${entry.why}, but era six's part of it no longer ` +
          `records the move at all`,
      ).toContain(hex(FIRST_RETIRED_BODY));
    }
    // And nothing outside the list may quietly become a second record.
    const excused = new Set(RECORDS_THE_MOVE.map((entry) => entry.path));
    for (const surface of SURFACES) {
      if (!excused.has(surface.path)) {
        expect(
          specifyingText(surface).toLowerCase(),
          `${surface.path} has started carrying the retired hue without a reason beside it`,
        ).not.toContain(hex(FIRST_RETIRED_BODY));
      }
    }
    // Direction two: the list may not grow until it has swallowed the population.
    expect(RECORDS_THE_MOVE.length).toBeLessThanOrEqual(4);
    expect(SURFACES.length - RECORDS_THE_MOVE.length).toBeGreaterThanOrEqual(10);
    // The boundary each entry draws is a real slice of a real member, not the whole of it: an
    // entry whose `specifying` returned everything would excuse nothing, and one that returned
    // nothing would excuse the member entirely.
    for (const entry of RECORDS_THE_MOVE) {
      const surface = SURFACES.find(
        (candidate) => candidate.path === entry.path,
      ) as Surface;
      const scoped = (surface.scope ?? ((text: string) => text))(source(entry.path));
      const specifying = entry.specifying(scoped);
      expect(specifying.length, `${entry.path}: ${entry.boundary}`).toBeGreaterThan(0);
      expect(specifying.length).toBeLessThan(scoped.length);
      // The record is in the half this sweep does NOT read, which is what makes the exemption
      // load-bearing rather than decorative: take the entry off the list and the sweep fails at
      // the member it was excusing, naming it.
      expect(specifying.toLowerCase()).not.toContain(hex(FIRST_RETIRED_BODY));
    }
  });
});

describe("era four keeps its terracotta, because it is era four's identity device", () => {
  it("still authors it in its own guide, its own palette and its own crisis tones", () => {
    // The over-reach this repair could have made, asserted so it fails here rather than
    // shipping: era six's collision is fixed by era six moving, never by era four giving up the
    // thing its guide calls "what actually separates a building from the ground".
    expect(hex(guideRole(ERA_FOUR_GUIDE, "Accent"))).toBe(hex(ERA_FOUR_ROOF));
    expect(hex(eraRole(4, "Roof"))).toBe(hex(ERA_FOUR_ROOF));
    expect(hex(guideRole(ERA_FOUR_GUIDE, "Body hue"))).toBe(hex(eraRole(4, "Body")));
    expect(hex(toneEntries(source(SUCCESSION_TONES)).get("ROOF_TILE") as number)).toBe(
      hex(ERA_FOUR_ROOF),
    );
    expect(hex(advisorRow("classical").fields.get("accent") as number)).toBe(
      hex(ERA_FOUR_ROOF),
    );
  });

  it("is a DIFFERENT era from era six on both channels the re-pitch moved", () => {
    // The property the whole ruling exists to produce, stated as a measurement rather than as a
    // colour opinion, so it survives either era being re-toned again. Era four's guide and era
    // six's must not agree about the wall, and era six's roof must not be era four's roof.
    const eraFourBody = guideRole(ERA_FOUR_GUIDE, "Body hue");
    const eraSixBody = guideRole(ERA_SIX_GUIDE, "Body hue");
    expect(hex(eraSixBody)).not.toBe(hex(eraFourBody));
    expect(hex(guideRole(ERA_SIX_GUIDE, "Accent"))).not.toBe(hex(ERA_FOUR_ROOF));
    // And it moved on LIGHTNESS as well as hue, which is the channel the 2026-07-30 pass left
    // tied at 0.32 L* and is why "looks extremely similar" survived a repair once already.
    // Weighted luminance, the convention the pin's own doc comment quotes.
    const luminance = (tone: number): number =>
      (0.2126 * ((tone >> 16) & 0xff) +
        0.7152 * ((tone >> 8) & 0xff) +
        0.0722 * (tone & 0xff)) /
      255;
    expect(
      Math.abs(luminance(eraSixBody) - luminance(eraFourBody)),
      "era six's wall is back within a hair of era four's on lightness",
    ).toBeGreaterThan(0.05);
  });
});
