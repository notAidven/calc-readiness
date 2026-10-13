/**
 * **THE TEN ERA BODY HUES CLEAR THE SHADING FLOOR, IN SITU, FOR EVERY PAIR.**
 *
 * The era palettes are authored as prose in ten style guides. No code reads them —
 * `palette.ts`'s `DISTRICT_HUES` is keyed by `DomainId`, the retired per-district axis
 * (`City_Art_Bible.md` §1.2, superseded by D-ERA27), so an era hue lives only in its
 * guide. That makes the ladder a documentation invariant with nothing holding it, which
 * is what this file holds.
 *
 * ## What it is guarding against, and why a swatch ΔE is not it
 *
 * Under the re-dressing ruling (`eras/README.md`) a building never re-dresses, so the
 * island **accumulates every era's buildings permanently**. By era ten it carries ten
 * generations at once, and the team lead's report was that they do not separate: *"very
 * difficult to distinguish old buildings from new."*
 *
 * So the measured quantity is not a ΔE between two hex values. It is the separation two
 * buildings get **standing side by side under `City_Art_Bible.md` §2's fixed three-tone
 * face model**, which compresses differences to about 71% of the swatch number:
 *
 *  - **signal** — the weakest of the three corresponding-face deltas (top:top, left:left,
 *    right:right). Both buildings are lit identically, so a player compares like face with
 *    like, and the weakest of the three is the one that lets them look the same.
 *  - **floor** — the quieter of the two buildings' own one-step face deltas. Below it, two
 *    eras differ by less than two faces of a single building, so the difference reads as
 *    the key light rather than as a change of material.
 *
 * The floor is self-calibrating and that is the point: shading noise scales with chroma,
 * so era one and era two — the two most chromatic bodies — carry the highest floors in the
 * run (15.2 and 11.5 against era eight's 7.1). The seam every player is guaranteed to meet
 * is automatically the hardest to pass, with no hand-placed weight.
 *
 * Derivation, and the before/after tables:
 * `docs/superpowers/specs/2026-07-30-era-palette-ladder.md`.
 *
 * ## Scoped by the behaviour, not by the implementation
 *
 * `.cursor/rules/qa-verification.mdc` asks that a guard's population be defined by who
 * exhibits the behaviour. The behaviour here is *"a building of this era stands on the
 * island wearing one body hue"*, and every era does it — so the population is **every
 * era folder on disk**, read from the tree, and the assertions run over **all 45 pairs**
 * rather than the nine adjacent seams. That width is load-bearing rather than
 * defensive: the worst pair in the shipped set was **era four ↔ era six at 2.07**, two
 * eras apart, which an adjacent-only guard could not have seen at any threshold.
 *
 * Nothing is written down that the tree can supply. The era list, the hues and the
 * accents are all parsed; the two floors below stop the whole file passing over an empty
 * population; and `TONE_STEPS` is asserted against `palette.ts` itself, because every
 * number in here is computed from those two constants and a guard resting on a stale copy
 * of them would measure nothing.
 *
 * ## The one exception, asserted in both directions
 *
 * Era one states a body hue and **no era-level accent** — its §4 gives permitted
 * departures (thatch, timber, stone footings) and the four answer-type trims, which it is
 * explicit are *"not an era choice"*. That is a real exemption rather than an omission, so
 * it is named in `NO_ERA_ACCENT` and asserted both ways: a listed era that grows an accent
 * fails, and an unlisted era that loses one fails. Neither direction can go stale
 * silently.
 *
 * ## The second rule: no pair may be separated on ONE channel only
 *
 * The floor above is a single scalar, so it cannot see WHICH way two eras differ, and a
 * pair can clear it on one axis while being tied on the others. Both directions of that
 * have now been found in shipped values:
 *
 *  - **on lightness alone** — era two `#D9C288` against the superseded bronze ochre
 *    `#8A6E33` was ΔE76 31.65 *of which 31.11 was lightness*, 6.31° of hue apart, and this
 *    file scored it 2.2x the floor. The lead's words were *"the same colour at two
 *    brightnesses"*.
 *  - **on hue alone** — era four `#D2C8AA` against era six `#E9C2A1` was **ΔL\* 0.32**,
 *    hue 27.8° apart, and passed here at 1.25x the floor. The owner's words were that era
 *    six *"looks extremely similar to era four"*.
 *
 * So the rule is the general form of both: **a pair must be separated on two channels, or
 * decisively on one.** Separation is decomposed into the three orthogonal cylindrical
 * components of ΔE76 — ΔL\*, ΔC\* and CIE ΔH\* — which is a decomposition rather than a
 * weighting: ΔE76² = ΔL\*² + ΔC\*² + ΔH\*². ΔH\* rather than a hue ANGLE, because a hue
 * turn is only worth what its chroma can pay for it: era nine and era ten are 22° apart
 * and that is worth 2.6, while era three and era seven are 80° apart and that is worth 28.
 *
 * Both bars are stated against the pair's own shading floor, so they self-calibrate the
 * same way the rule above does, and both sit in the middle of a measured gap in the
 * shipped set rather than on a shipped value:
 *
 *  - `SECOND_CHANNEL_BAR` 1.25x — measured seconds either side of it are 1.09 (era four ↔
 *    era six, the reported defect) and 1.41 (era three ↔ era four).
 *  - `SINGLE_CHANNEL_ESCAPE` 2.0x — measured strongests either side are 1.78 (era one ↔
 *    era two, which passes on its second channel anyway) and 2.11 (era three ↔ era seven).
 *
 * ## Its population is the pairs that HAVE two channels to be separated on
 *
 * Four eras author a body that is deliberately near-neutral — era five's lime-wash (C\*
 * 8.9), era eight's poured concrete (5.1), era nine's anodised grey (6.8), era ten's dark
 * composite (6.5). Chroma is what pays for hue, so those four have **structurally
 * forfeited the hue channel**: at C\* 5 even a 180° reversal is worth about 10, and era
 * nine against era ten really is separated on lightness alone and cannot be otherwise.
 * Asking them for two channels asks for a channel their material does not have, so they
 * are named in `NEAR_NEUTRAL_BODIES` and the rule runs over the pairs where BOTH eras are
 * chromatic. Asserted both ways: a listed era that gains chroma fails, and an unlisted era
 * that loses it fails.
 *
 * `KNOWN_SINGLE_CHANNEL_PAIRS` is a different list and a weaker claim. Era one against era
 * seven is two fired-clay bodies 14° apart in hue, separated by ΔL\* 17.9 and ΔC\* 13.9 —
 * real amounts, which fail here only because era one's own chroma gives it the highest
 * shading floor in the run (13.87), so its second channel lands at 1.00x. It is **an open
 * finding rather than an exemption**: it is not era six's to move, and it is asserted both
 * ways so that it cannot sit here after somebody fixes it.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

const ERAS_DIR = "docs/superpowers/specs/eras";
const GUIDE_FILE = "style-guide.md";
const ART_BIBLE = "docs/superpowers/specs/City_Art_Bible.md";
const PALETTE_TS = "apps/web/src/city/palette.ts";

/**
 * `City_Art_Bible.md` §2's three-tone face model, which `palette.ts`'s `faceTones`
 * implements. Asserted against both, since the whole measurement is computed from them.
 */
const TONE_STEPS = { lightenTop: 0.26, darkenRight: 0.28 } as const;

/** Era one states a body hue and no era accent. See the header. */
const NO_ERA_ACCENT = ["era-01-prehistoric"] as const;

/**
 * C\* below which a body has no hue channel left to be separated on. It is placed in the
 * middle of the run's own gap — the four near-neutral bodies measure 5.1 to 8.9 and the
 * six chromatic ones 16.3 to 38.3 — so it is a cluster boundary rather than a cut.
 */
const CHROMATIC_BODY_FLOOR = 12;

/**
 * The four eras whose guides author a deliberately near-neutral body, each with the phrase
 * its palette row uses. They are outside the two-channel rule because chroma is what pays
 * for a hue difference and these have spent it. Asserted in both directions.
 */
const NEAR_NEUTRAL_BODIES: Readonly<Record<string, string>> = {
  "era-05-medieval": "Lime-washed daub over stone",
  "era-08-atomic": "Pale poured concrete",
  "era-09-information": "Anodised grey-blue",
  "era-10-cyberpunk": "Dark composite panel",
};

/** Multiples of the pair's own shading floor. Derived in the header. */
const SECOND_CHANNEL_BAR = 1.25;
const SINGLE_CHANNEL_ESCAPE = 2.0;

/**
 * Chromatic pairs that are single-channel today and are NOT this change's to move. An open
 * finding, not an excuse: each entry must still exist and still fail, so it cannot outlive
 * its own defect.
 */
const KNOWN_SINGLE_CHANNEL_PAIRS: readonly (readonly [string, string])[] = [
  ["era-01-prehistoric", "era-07-industrial"],
];

/** Floors under the derived population, so nothing here can pass over an empty set. */
const MIN_ERAS = 10;
const MIN_PAIRS = 45;
/** Six chromatic eras, so C(6,2). A floor, not a pin: a seventh only makes it larger. */
const MIN_CHROMATIC_ERAS = 6;
const MIN_CHROMATIC_PAIRS = 15;

const repoRoot = resolveRepoRoot();

interface EraPalette {
  readonly folder: string;
  readonly bodyHue: string;
  readonly accent: string | null;
}

/* -------------------------------------------------------------------------- */
/* Colour maths. CIE76 in L*a*b*, D65, sRGB.                                  */
/* -------------------------------------------------------------------------- */

function lab(hex: string): [number, number, number] {
  const raw = hex.replace("#", "");
  const channel = (offset: number) =>
    Number.parseInt(raw.slice(offset, offset + 2), 16) / 255;
  const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [r, g, b] = [linear(channel(0)), linear(channel(2)), linear(channel(4))];
  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
  const z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883;
  const f = (t: number) =>
    t > (6 / 29) ** 3 ? Math.cbrt(t) : (t * (29 / 6) ** 2) / 3 + 4 / 29;
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function deltaE76(a: string, b: string): number {
  const [la, aa, ba] = lab(a);
  const [lb, ab, bb] = lab(b);
  return Math.hypot(la - lb, aa - ab, ba - bb);
}

/** The same colour in cylindrical form: lightness, chroma, hue angle in degrees. */
function lch(hex: string): { L: number; C: number; h: number } {
  const [L, a, b] = lab(hex);
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  return { L, C: Math.hypot(a, b), h: h < 0 ? h + 360 : h };
}

/**
 * The three orthogonal components of ΔE76 between two bodies, largest first: |ΔL\*|,
 * |ΔC\*| and CIE ΔH\* = 2·√(C₁C₂)·sin(Δh/2). Their quadrature sum is ΔE76 exactly, which
 * is why this is a decomposition of the existing measurement rather than a second one.
 */
function channelSeparations(a: string, b: string): [number, number, number] {
  const [A, B] = [lch(a), lch(b)];
  const turn = Math.abs(A.h - B.h);
  const arc = turn > 180 ? 360 - turn : turn;
  const separations: [number, number, number] = [
    Math.abs(A.L - B.L),
    Math.abs(A.C - B.C),
    2 * Math.sqrt(A.C * B.C) * Math.sin((arc * Math.PI) / 360),
  ];
  return separations.sort((x, y) => y - x) as [number, number, number];
}

/**
 * Top light / left mid / right dark. This mirrors `palette.ts`'s `faceTones` — including
 * its `mix`, which rounds per channel — rather than importing it, because `@cr/web`
 * publishes no subpath exports and the repo-hygiene project is deliberately node-only.
 * The mirroring is not taken on trust: the suite below asserts both tone amounts against
 * `palette.ts`'s own source text and against `City_Art_Bible.md` §2.
 */
function faces(hex: string): [string, string, string] {
  const raw = hex.replace("#", "");
  const channels = [0, 2, 4].map((offset) =>
    Number.parseInt(raw.slice(offset, offset + 2), 16),
  );
  const blend = (toward: number, t: number) =>
    `#${channels
      .map((c) =>
        Math.max(0, Math.min(255, Math.round(c + (toward - c) * t)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")}`.toUpperCase();
  return [
    blend(255, TONE_STEPS.lightenTop),
    `#${raw.toUpperCase()}`,
    blend(0, TONE_STEPS.darkenRight),
  ];
}

/** In-situ separation: the weakest of the three corresponding-face deltas. */
function signal(a: string, b: string): number {
  const [aTop, aLeft, aRight] = faces(a);
  const [bTop, bLeft, bRight] = faces(b);
  return Math.min(deltaE76(aTop, bTop), deltaE76(aLeft, bLeft), deltaE76(aRight, bRight));
}

/** What "the same wall in a different light" already costs on this building. */
function shadingNoise(hex: string): number {
  const [top, left, right] = faces(hex);
  return Math.min(deltaE76(top, left), deltaE76(left, right));
}

/* -------------------------------------------------------------------------- */
/* Reading the guides                                                        */
/* -------------------------------------------------------------------------- */

function eraFolders(): string[] {
  return readdirSync(join(repoRoot, ERAS_DIR), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^era-\d\d-/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

/**
 * The palette section, found by HEADING TEXT rather than section number: era one states
 * its palette inside the numbered sequence (`## 4. Palette`) and eras two to ten state
 * theirs outside it (`## The era's palette (PROPOSED — D-ERA27)`). A section number would
 * find nine of ten.
 */
function paletteSection(folder: string, markdown: string): string {
  const lines = markdown.split("\n");
  const start = lines.findIndex((line) =>
    /^##\s+(\d+\.\s+)?(The era's p|P)alette\b/.test(line),
  );
  if (start < 0) {
    throw new Error(
      `${folder}/${GUIDE_FILE}: no heading matching "Palette" or "The era's palette". ` +
        `This era would otherwise drop silently out of the ladder.`,
    );
  }
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^##\s/.test(line));
  return (end < 0 ? rest : rest.slice(0, end)).join("\n");
}

/**
 * A hex the section states as this era's own body hue or accent. Both spellings are
 * accepted because the guides genuinely use two: a two-row table in eras two to ten, and
 * prose in era one. Any "CHANGED FROM" amendment block is stripped first, so a historical
 * value can be recorded in a guide without being mistaken for the live one.
 */
function readRole(folder: string, section: string, role: "body" | "accent"): string | null {
  const live = section
    .split("\n")
    .filter((line) => !line.trim().startsWith(">"))
    .join("\n");

  if (role === "body") {
    const row = live.match(
      /\|\s*\*\*Body hue\*\*\s*\|[^|]*\|\s*`(#[0-9A-Fa-f]{6})`\s*\|/,
    )?.[1];
    if (row) {
      return row.toUpperCase();
    }
    const prose = live.match(/body hue[^.`]*`(#[0-9A-Fa-f]{6})`/i)?.[1];
    if (prose) {
      return prose.toUpperCase();
    }
    throw new Error(
      `${folder}/${GUIDE_FILE}: palette section states no body hue. Every era wears one ` +
        `(one body hue per era), so this is a missing value rather than an exemption.`,
    );
  }

  const row = live.match(/\|\s*Accent\s*\|[^|]*\|\s*`(#[0-9A-Fa-f]{6})`\s*\|/)?.[1];
  return row ? row.toUpperCase() : null;
}

function readPalettes(): EraPalette[] {
  return eraFolders().map((folder) => {
    const markdown = readFileSync(join(repoRoot, ERAS_DIR, folder, GUIDE_FILE), "utf8");
    const section = paletteSection(folder, markdown);
    return {
      folder,
      bodyHue: readRole(folder, section, "body") as string,
      accent: readRole(folder, section, "accent"),
    };
  });
}

const palettes = readPalettes();

/**
 * The era at `index`, or a named failure. Era one is the ladder's fixed point — its own
 * shading noise is the absolute bar two cases below use — so an empty or short read of
 * the tree must say which era went missing rather than reading `undefined.bodyHue`.
 */
function eraAt(index: number): EraPalette {
  const palette = palettes[index];
  if (palette === undefined) {
    throw new Error(
      `the ladder read ${palettes.length} era folders and has no era ${index + 1}`,
    );
  }
  return palette;
}

const pairs = palettes.flatMap((from, index) =>
  palettes.slice(index + 1).map((to, offset) => ({ from, to, gap: offset + 1 })),
);

/** Read from the tree, not from `NEAR_NEUTRAL_BODIES`: the list is checked against this. */
const chromatic = palettes.filter((p) => lch(p.bodyHue).C >= CHROMATIC_BODY_FLOOR);
const chromaticPairs = pairs.filter(
  (pair) => chromatic.includes(pair.from) && chromatic.includes(pair.to),
);

function isKnownSingleChannel(from: string, to: string): boolean {
  return KNOWN_SINGLE_CHANNEL_PAIRS.some(
    ([a, b]) => (a === from && b === to) || (a === to && b === from),
  );
}

/** How a pair satisfies the two-channel rule, or `null` if it does not. */
function twoChannelVerdict(a: string, b: string) {
  const [strongest, second, weakest] = channelSeparations(a, b);
  const floor = Math.min(shadingNoise(a), shadingNoise(b));
  return {
    strongest,
    second,
    weakest,
    floor,
    passes:
      strongest >= SINGLE_CHANNEL_ESCAPE * floor || second >= SECOND_CHANNEL_BAR * floor,
  };
}

function describeVerdict(pair: { from: EraPalette; to: EraPalette }): string {
  const v = twoChannelVerdict(pair.from.bodyHue, pair.to.bodyHue);
  return (
    `${pair.from.folder} ~ ${pair.to.folder}: strongest channel ${v.strongest.toFixed(2)} ` +
    `(${(v.strongest / v.floor).toFixed(2)}x floor ${v.floor.toFixed(2)}, needs ` +
    `${SINGLE_CHANNEL_ESCAPE.toFixed(2)}x), second ${v.second.toFixed(2)} ` +
    `(${(v.second / v.floor).toFixed(2)}x, needs ${SECOND_CHANNEL_BAR.toFixed(2)}x), ` +
    `third ${v.weakest.toFixed(2)}`
  );
}

describe("era palette ladder: the population is derived from the tree", () => {
  it(`covers every era folder on disk, and there are at least ${MIN_ERAS}`, () => {
    expect(palettes.length).toBeGreaterThanOrEqual(MIN_ERAS);
    expect(palettes.map((p) => p.folder)).toEqual(eraFolders());
  });

  it(`measures every pair of eras, not only adjacent ones, and there are at least ${MIN_PAIRS}`, () => {
    // Composition, not just size: a floor on the count is satisfied by any 45 pairs, so
    // assert that MOST of them are non-adjacent. That is what would fail if this guard
    // were ever narrowed back to the nine seams.
    expect(pairs.length).toBeGreaterThanOrEqual(MIN_PAIRS);
    expect(pairs.length).toBe((palettes.length * (palettes.length - 1)) / 2);
    expect(pairs.filter((pair) => pair.gap > 1).length).toBeGreaterThanOrEqual(
      MIN_PAIRS - 9,
    );
  });

  it("states a distinct body hue for every era", () => {
    for (const { folder, bodyHue } of palettes) {
      expect(bodyHue, `${folder} body hue`).toMatch(/^#[0-9A-F]{6}$/);
    }
    expect(new Set(palettes.map((p) => p.bodyHue)).size).toBe(palettes.length);
  });
});

describe("era palette ladder: the shading model the floor is derived from", () => {
  it("matches City_Art_Bible.md §2", () => {
    const bible = readFileSync(join(repoRoot, ART_BIBLE), "utf8");
    expect(bible).toContain(`lighten(hue, ${TONE_STEPS.lightenTop})`);
    expect(bible).toContain(`darken(hue, ${TONE_STEPS.darkenRight})`);
  });

  it("matches palette.ts's faceTones, so nothing here is computed from a stale copy", () => {
    const source = readFileSync(join(repoRoot, PALETTE_TS), "utf8");
    const body = source.match(/export function faceTones\([^)]*\)[^{]*\{([\s\S]*?)\n\}/);
    expect(body, `${PALETTE_TS}: faceTones not found`).not.toBeNull();
    expect(body?.[1]).toContain(`lighten(base, ${TONE_STEPS.lightenTop})`);
    expect(body?.[1]).toContain(`darken(base, ${TONE_STEPS.darkenRight})`);
    // ...and that it is still top-light / left-mid / right-dark, which is the ordering the
    // corresponding-face comparison depends on.
    expect(body?.[1]).toMatch(/top:\s*lighten\(base,/);
    expect(body?.[1]).toMatch(/left:\s*base,/);
    expect(body?.[1]).toMatch(/right:\s*darken\(base,/);
  });
});

describe("era palette ladder: every pair of eras clears the shading floor in situ", () => {
  it("no two eras' buildings differ by less than two faces of one building", () => {
    const failures = pairs
      .map(({ from, to, gap }) => ({
        pair: `${from.folder} ~ ${to.folder}`,
        gap,
        signal: signal(from.bodyHue, to.bodyHue),
        floor: Math.min(shadingNoise(from.bodyHue), shadingNoise(to.bodyHue)),
      }))
      .filter((row) => row.signal < row.floor)
      .map(
        (row) =>
          `${row.pair} (${row.gap} apart): in-situ ${row.signal.toFixed(2)} < ` +
          `floor ${row.floor.toFixed(2)}`,
      );
    expect(failures).toEqual([]);
  });

  it("holds era one to era two against era ONE's floor, which cannot be gamed", () => {
    // The floor is a ratio, so a hue could pass by desaturating rather than by moving
    // away. Era one never moves, so its own shading noise is an absolute bar for the one
    // seam every player is guaranteed to meet. Measured on the WALL faces, where the
    // swatch difference is not compressed by the top face's lightening.
    const [one, two] = [eraAt(0), eraAt(1)];
    expect(one.folder).toBe("era-01-prehistoric");
    expect(deltaE76(one.bodyHue, two.bodyHue)).toBeGreaterThan(shadingNoise(one.bodyHue));
  });

  it("keeps every body hue at or below era one's saturation, per 'kept low-saturation'", () => {
    const chroma = (hex: string) => {
      const [, a, b] = lab(hex);
      return Math.hypot(a, b);
    };
    const ceiling = chroma(eraAt(0).bodyHue);
    for (const { folder, bodyHue } of palettes) {
      expect(
        chroma(bodyHue),
        `${folder} chroma against era one's ${ceiling.toFixed(1)}`,
      ).toBeLessThanOrEqual(ceiling + 0.5);
    }
  });
});

describe("era palette ladder: no pair is separated on one channel only", () => {
  it("scopes the rule to eras that HAVE a hue channel, both directions", () => {
    for (const [folder, material] of Object.entries(NEAR_NEUTRAL_BODIES)) {
      const era = palettes.find((p) => p.folder === folder);
      expect(
        era,
        `${folder} is a declared near-neutral body that no longer exists`,
      ).toBeDefined();
      expect(
        lch(era?.bodyHue as string).C,
        `${folder} ("${material}") is listed as near-neutral but has gained chroma, so it ` +
          `now has a hue channel and owes the two-channel rule`,
      ).toBeLessThan(CHROMATIC_BODY_FLOOR);
    }
    for (const { folder, bodyHue } of palettes) {
      if (folder in NEAR_NEUTRAL_BODIES) {
        continue;
      }
      expect(
        lch(bodyHue).C,
        `${folder} has gone near-neutral without being declared, so the rule below is ` +
          `silently asking it for a hue channel it no longer has`,
      ).toBeGreaterThanOrEqual(CHROMATIC_BODY_FLOOR);
    }
  });

  it(`runs over at least ${MIN_CHROMATIC_PAIRS} pairs, and the exemptions have not swallowed them`, () => {
    expect(chromatic.length).toBeGreaterThanOrEqual(MIN_CHROMATIC_ERAS);
    expect(chromaticPairs.length).toBeGreaterThanOrEqual(MIN_CHROMATIC_PAIRS);
    expect(chromaticPairs.length).toBe((chromatic.length * (chromatic.length - 1)) / 2);
    // Composition, not only size: the population held to the rule with no exception at all
    // must stay the great majority of it, or the lists have eaten the guard.
    const held = chromaticPairs.filter(
      (pair) => !isKnownSingleChannel(pair.from.folder, pair.to.folder),
    );
    expect(held.length).toBeGreaterThanOrEqual(MIN_CHROMATIC_PAIRS - 2);
  });

  it("holds every chromatic pair to two channels, or to one decisive one", () => {
    const failures = chromaticPairs
      .filter((pair) => !isKnownSingleChannel(pair.from.folder, pair.to.folder))
      .filter((pair) => !twoChannelVerdict(pair.from.bodyHue, pair.to.bodyHue).passes)
      .map(describeVerdict);
    expect(failures).toEqual([]);
  });

  it("keeps the known single-channel pairs honest: each still exists and still fails", () => {
    for (const [from, to] of KNOWN_SINGLE_CHANNEL_PAIRS) {
      const pair = chromaticPairs.find(
        (candidate) =>
          (candidate.from.folder === from && candidate.to.folder === to) ||
          (candidate.from.folder === to && candidate.to.folder === from),
      );
      expect(
        pair,
        `${from} ~ ${to} is recorded as a known single-channel pair but is no longer a ` +
          `chromatic pair on disk, so the entry is excusing nothing`,
      ).toBeDefined();
      if (pair === undefined) {
        continue;
      }
      expect(
        twoChannelVerdict(pair.from.bodyHue, pair.to.bodyHue).passes,
        `${from} ~ ${to} now satisfies the rule and must be struck from ` +
          `KNOWN_SINGLE_CHANNEL_PAIRS — ${describeVerdict(pair)}`,
      ).toBe(false);
    }
  });
});

describe("era palette ladder: accents", () => {
  it("is stated by every era except the named exception, which still exists", () => {
    for (const folder of NO_ERA_ACCENT) {
      const era = palettes.find((p) => p.folder === folder);
      expect(era, `${folder} is a declared exception that no longer exists`).toBeDefined();
      expect(era?.accent, `${folder} has quietly adopted an era accent`).toBeNull();
    }
    for (const { folder, accent } of palettes) {
      if ((NO_ERA_ACCENT as readonly string[]).includes(folder)) {
        continue;
      }
      expect(
        accent,
        `${folder} states no era accent and is not a declared exception`,
      ).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it("keeps each accent readable against its own era's body", () => {
    // Era nine's guide says its body and accent "sit close together on purpose", so the
    // bar is that an accent is not INDISTINGUISHABLE from the body it trims, which is a
    // weaker claim than the pairwise floor above and is asserted as such.
    for (const { folder, bodyHue, accent } of palettes) {
      if (accent === null) {
        continue;
      }
      expect(
        deltaE76(bodyHue, accent),
        `${folder} accent against its own body`,
      ).toBeGreaterThan(5);
    }
  });
});
