/**
 * **THE THREE CRISIS TONE TABLES SAY WHAT THE PLATE GENERATOR SAYS, AND EVERY DERIVED TONE IS
 * THE GENERATOR'S OWN ARITHMETIC.**
 *
 * The behaviour, stated before the population is written down: *a module that pins the material
 * palette one crisis's art is generated against.* Three exist —
 * `apps/web/src/city/three/succession-tones.ts`, `plague-tones.ts` and `intrusion-tones.ts` —
 * and each was written to close the same sentence, repeated in all three prompt sheets' owed
 * lists: *"There is no `plague-tones.ts` answering to `apps/web/src/city/three/winterTones.ts` …
 * so nothing pins any of them."*
 *
 * **A tone table that nothing checks closes that sentence in name only.** The values live in
 * three places at once — a prompt sheet's prose, the plate generator's `$ERAn` table, and now a
 * TypeScript table — and three copies of a number drift. So this file makes the copy in code the
 * one that has to agree, and derives what it compares against rather than restating it:
 *
 *  1. **Every role the generator authors is pinned at the same value.** The role set is parsed
 *     out of `$ERA4`, `$ERA6` and `$ERA9`, and the map from role to tone key is asserted as a
 *     CENSUS in both directions, so a role added to the generator with no home here fails, and a
 *     mapping entry pointing at a role the generator dropped fails too.
 *  2. **Every derived tone is recomputed.** A tone that a doc comment calls
 *     `Darken(Paving, 0.44)` is computed with the generator's own `MixHex` and compared, which is
 *     the same move `intrusionPlateTones.test.ts` makes for the barrier post rather than
 *     hardcoding it. A comment claiming an arithmetic relation is not evidence of one.
 *  3. **Every entry in all three tables is accounted for**, by exactly one of four routes: a
 *     generator role, a derivation, a literal the generator draws in one of its crisis
 *     primitives, or a tone the prompt sheet itself proposed. The fourth list is two entries
 *     long and both are asserted in both directions — named on their sheet, and drawn by no
 *     generator palette — because *"proposed here rather than looked up"* is a claim that can go
 *     stale in either direction once somebody authors a real value.
 *
 * ## WHY THE POPULATION IS THE `*-tones.ts` MODULES AND NOT EVERY FILE WITH A HEX IN IT
 *
 * `.cursor/rules/qa-verification.mdc` asks that a guard's population be defined by who exhibits
 * the behaviour rather than by where it is implemented. The behaviour is *holding a crisis's
 * material palette*, and it is exhibited by a module whose whole content is one, which is what
 * the `-tones.ts` suffix names. The population is read off the directory rather than listed, so
 * a fourth crisis's table joins this sweep by being saved.
 *
 * **`winterTones.ts` is in that directory and is deliberately NOT in this population**, which is
 * the one scoping decision here worth arguing. It is the precedent all three were written
 * against, but era one's pack is drawn by the generator's own winter primitives and there is no
 * `$ERA1` table for it to agree with, so rule 1 has nothing to say about it; its board-state
 * table is keyed in camelCase because a legend names those tones to the player; and it is
 * already swept, harder and by a guard that knows about geometry, in
 * `apps/web/src/city/three/winterGround.test.ts`. Including it would mean writing exceptions for
 * the one member that does not exhibit the behaviour, which is how an exemption list starts
 * swallowing a population. The suffix test below is exact rather than case-folded so that this
 * is a fact about the population and not an accident of a regex.
 */

import { readdirSync, readFileSync } from "node:fs";
import { posix } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

const repoRoot = resolveRepoRoot();
const GENERATOR = "tools/generate-winter-crisis-references.ps1";
const TONES_DIR = "apps/web/src/city/three";
const SUCCESSION_DECLARATION = posix.join(TONES_DIR, "crisis/succession.ts");

function source(path: string): string {
  const text = readFileSync(posix.join(repoRoot, path), "utf8");
  // A floor, because every `toContain` and every parse below is meaningless over an empty read.
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
 * **This is not pedantry and it was not assumed.** Written with `Math.round` first, this file
 * failed on exactly the two entries where a channel lands on a half — era six's door bar and era
 * nine's isolation bar, both `Lighten(x, 0.5)` — and reported the tone tables as wrong when it
 * was the port that was. PowerShell rounds 196.5 down to 196 and JavaScript rounds it up to 197,
 * so a one-unit difference is the whole of it, and the file that drew the plates is the one that
 * decides.
 */
function roundHalfToEven(value: number): number {
  const floor = Math.floor(value);
  const remainder = value - floor;
  if (remainder !== 0.5) {
    return Math.round(value);
  }
  return floor % 2 === 0 ? floor : floor + 1;
}

/**
 * `MixHex`, ported from the generator rather than approximated: per channel, round toward the
 * target by `amount`. Every face tone and every cut in the four packs is one of these, so a
 * tone table that claims a relation can be checked against the thing that drew the plates.
 */
function mix(from: number, toward: number, amount: number): number {
  let out = 0;
  for (const shift of [16, 8, 0]) {
    const a = (from >> shift) & 0xff;
    const b = (toward >> shift) & 0xff;
    const mixed = Math.min(255, Math.max(0, roundHalfToEven(a + (b - a) * amount)));
    out |= mixed << shift;
  }
  return out >>> 0;
}

const darken = (hex: number, amount: number): number => mix(hex, 0x000000, amount);
const lighten = (hex: number, amount: number): number => mix(hex, 0xffffff, amount);
/** `FaceRight`, which the generator defines as `Darken 0.28`. */
const faceRight = (hex: number): number => darken(hex, 0.28);

const hex = (value: number): string => `#${value.toString(16).padStart(6, "0")}`;

/* -------------------------------------------------------------------------- */
/* Reading a tone table                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The `KEY: 0xrrggbb,` entries of a tone module, keyed by name.
 *
 * Anchored at exactly two spaces of indentation, which is what keeps a hex quoted inside a doc
 * comment out of the parse: every comment line in these files starts with ` *`. Pinned against
 * both shapes in "the reader reads a table and not a comment" below.
 */
function toneEntries(text: string): Map<string, number> {
  const found = new Map<string, number>();
  for (const match of text.matchAll(/^ {2}([A-Z][A-Z0-9_]*): (0x[0-9a-f]{6}),$/gm)) {
    found.set(match[1] as string, Number.parseInt((match[2] as string).slice(2), 16));
  }
  return found;
}

/** The `$ERAn` palette table's roles, parsed out of the generator. */
function eraPalette(era: number): Map<string, number> {
  const start = generator.indexOf(`$ERA${era} = @{`);
  expect(start, `$ERA${era} has been renamed or removed`).toBeGreaterThan(-1);
  const end = generator.indexOf("\n}", start);
  expect(end, `$ERA${era}'s table is unterminated`).toBeGreaterThan(start);
  const table = generator.slice(start, end);
  const found = new Map<string, number>();
  for (const match of table.matchAll(/^\s*(\w+)\s*=\s*"#([0-9a-f]{6})"/gm)) {
    found.set(match[1] as string, Number.parseInt(match[2] as string, 16));
  }
  return found;
}

/**
 * The modules this sweep is about: every `*-tones.ts` in the city's three directory, read off
 * the filesystem so a fourth crisis's table is covered from the moment it is saved.
 */
const toneModules = readdirSync(posix.join(repoRoot, TONES_DIR))
  .filter((name) => name.endsWith("-tones.ts"))
  .sort();

const tables = new Map<string, Map<string, number>>();
const texts = new Map<string, string>();
for (const name of toneModules) {
  const text = source(posix.join(TONES_DIR, name));
  texts.set(name, text);
  tables.set(name, toneEntries(text));
}

const entriesOf = (name: string): Map<string, number> => {
  const found = tables.get(name);
  expect(found, `${name} parsed to no table`).toBeDefined();
  return found as Map<string, number>;
};

/* -------------------------------------------------------------------------- */
/* What each table owes                                                       */
/* -------------------------------------------------------------------------- */

/** One crisis: its module, its era's palette, and the four routes an entry may arrive by. */
interface CrisisTones {
  readonly module: string;
  readonly era: number;
  /** Generator role to the tone key or keys that must equal it. A census, both ways. */
  readonly fromPalette: Readonly<Record<string, readonly string[]>>;
  /** Tone key to a function of the table's own already-pinned values. */
  readonly derived: Readonly<Record<string, (tone: (key: string) => number) => number>>;
  /** Tone key to the literal the generator's own primitives draw, which the sweep looks for. */
  readonly fromGeneratorLiteral: Readonly<Record<string, string>>;
  /**
   * Tone key to the RUN SHEET that feeds it to a generator, for the entries no palette authors.
   *
   * Two, across three crises, and both are argued at length in their sheet's owed list. The claim
   * is asserted in both directions: no `$ERAn` may have started authoring the value, which is what
   * stops a proposal quietly outliving its own status, and where a run sheet is named it must
   * still carry the value it is about to feed.
   *
   * **`null` is not a skip.** Era four's marble was settled on 2026-08-02 and its run sheet was
   * written before that, so it still feeds *"pale faceted marble in the era's stone `#D2C8AA`"* --
   * the limestone body hue, which is the exact defect the settlement fixed. Recorded rather than
   * repaired, because era four's nineteen frames are delivered and re-running them is a different
   * job. The `null` is asserted too: if that run sheet ever starts naming the settled tone, this
   * entry has to be updated, so the divergence cannot be quietly fixed and leave a stale note here.
   *
   * **The prompt sheets themselves are deliberately not read**, which is a CI cost decision rather
   * than an oversight. `test/ciScopeFilter.test.ts` requires that any markdown a source opens be
   * classified as CODE by the workflow's scope filter, so reading either sheet would bill the full
   * gate set for every edit to a nine-hundred-line prose document -- the prose saving that rule
   * spends carefully. A run sheet is `.jsonl`, already non-inert, and it is the file that actually
   * reaches a generator, so it is the better subject in any case.
   */
  readonly proposedAndFedBy: Readonly<Record<string, string | null>>;
}

const CRISES: readonly CrisisTones[] = [
  {
    module: "succession-tones.ts",
    era: 4,
    fromPalette: {
      Body: ["LIMESTONE"],
      Roof: ["ROOF_TILE"],
      Floor: ["PAVING"],
      Deep: ["PAVING_DEEP"],
      Kerb: ["KERB"],
      Sky: ["SKY_NOON"],
      Haze: ["HAZE"],
      Water: ["WATER"],
    },
    derived: {
      FIGURE: (tone) => darken(tone("LIMESTONE"), 0.22),
      CUT_MARK: (tone) => darken(tone("LIMESTONE"), 0.44),
      COUNTER_TOP: (tone) => darken(tone("LIMESTONE"), 0.3),
      COUNTER_SIDE: (tone) => darken(tone("LIMESTONE"), 0.52),
      SLAB_RULING: (tone) => darken(tone("MARBLE"), 0.4),
      SHUTTER_TIMBER_DARK: (tone) => darken(tone("SHUTTER_TIMBER"), 0.22),
      CORNER_MARK: (tone) => lighten(tone("CORNER_MARKER"), 0.5),
    },
    fromGeneratorLiteral: {
      SHUTTER_TIMBER: '-Boarding "#9a8564"',
      CORNER_MARKER: '-Tag "#8c7a5e"',
    },
    proposedAndFedBy: {
      // Its run sheet predates the ruling and still feeds the limestone body hue; see the field.
      MARBLE: null,
    },
  },
  {
    module: "plague-tones.ts",
    era: 6,
    fromPalette: {
      Body: ["BODY_STUCCO"],
      Lead: ["LEAD", "DOOR_PANEL"],
      Inlay: ["INLAY"],
      Floor: ["PAVING", "VESSEL_PEDESTAL"],
      Deep: ["PAVING_DEEP"],
      Kerb: ["KERB"],
      Sky: ["SKY_OVERCAST"],
      Haze: ["HAZE"],
      Water: ["WATER"],
    },
    derived: {
      INLAY_SHUT: (tone) => darken(tone("INLAY"), 0.2),
      INLAY_NOTCH: (tone) => darken(tone("INLAY"), 0.34),
      BARRIER_BAND: (tone) => darken(tone("BARRIER_STONE"), 0.46),
      SHUTTER_TIMBER_DARK: (tone) => darken(tone("SHUTTER_TIMBER"), 0.22),
      DOOR_BAR: (tone) => lighten(tone("DOOR_PANEL"), 0.5),
      // This map held a sixth entry, `ROOF_TILE: () => eraPalette(4).get("Roof")` -- era four's
      // terracotta accent, reached across eras because era six's frames said the tile carried
      // over onto everything not domed. Era six's guide reversed that on 2026-08-01 and the lead
      // ruled the sheet into line on 2026-08-03, so era six's roofs are its own LEAD accent and
      // there is no era-four value left in this table to recompute. Recorded here rather than
      // deleted silently, because the route it used -- a derivation whose source is ANOTHER era's
      // palette -- is the one shape in this file that can carry a collision between two eras, and
      // the next person to want it should have to argue for it. `test/eraSixBodyHue.test.ts`
      // asserts era six's tones reach for no era-four hex at all.
    },
    fromGeneratorLiteral: {
      SHUTTER_TIMBER: '-Boarding "#7c6a55"',
      VESSEL: 'fill="#6f6256"',
    },
    proposedAndFedBy: {
      BARRIER_STONE: "output/imagegen/era-06-plague-crisis-scenes/imagegen-run-sheet.jsonl",
    },
  },
  {
    module: "intrusion-tones.ts",
    era: 9,
    fromPalette: {
      Body: ["BODY_CLAD"],
      Glass: ["GLASS"],
      Floor: ["PAVING"],
      Deep: ["PAVING_DEEP"],
      Kerb: ["KERB"],
      Sky: ["SKY_LATE"],
      Haze: ["HAZE"],
      Water: ["WATER"],
      // The ruling that `$ERA9.Clad` is authored once and handed to both primitives, held here
      // as well as in `intrusionPlateTones.test.ts`: a barrier rail and a blanking plate are the
      // same panel, and they were once two contradictory tones.
      Clad: ["BARRIER_RAIL", "BLANKING_PANEL"],
    },
    derived: {
      COVER: (tone) => darken(tone("PAVING"), 0.14),
      COVER_LIT: (tone) => lighten(tone("PAVING"), 0.22),
      COVER_EDGE: (tone) => darken(tone("PAVING"), 0.34),
      DUCT_MARKER: (tone) => darken(tone("PAVING"), 0.24),
      COLLAR: (tone) => darken(tone("PAVING"), 0.44),
      COLLAR_TOP: (tone) => lighten(tone("PAVING"), 0.3),
      BARRIER_POST: (tone) => faceRight(tone("BARRIER_RAIL")),
      ISOLATION_TRACE: (tone) => lighten(tone("ISOLATION_PLATE"), 0.5),
    },
    fromGeneratorLiteral: {
      PANEL_RIM: '"#5d686e"',
      PANEL_BEZEL: '"#464f55"',
      PANEL_FACE: '"#c3dae3"',
      PANEL_BAR: '"#f4fdff"',
      PANEL_FACE_STALE: '"#78878e"',
      PANEL_BAR_STALE: '"#9db0b7"',
      PANEL_STRIKE: 'fill="#39423f"',
      PANEL_RIM_DARK: '"#2f353a"',
      PANEL_BEZEL_DARK: '"#394045"',
      PANEL_FACE_DARK: '"#262b2f"',
      VOID: '$void = "#2c3236"',
      COLLAR_NOTCH: 'fill="#3d454a"',
      ISOLATION_PLATE: '-Tag "#4c565c"',
    },
    proposedAndFedBy: {},
  },
];

/** Mastery gold, reserved across every era and named in all three sheets' last ruling. */
const MASTERY_GOLD = 0xffb703;

describe("the crisis tone tables are a population read off the tree", () => {
  it("finds all three, and finds a table in each", () => {
    // Floors first: every census below quantifies over these, so an empty walk or an empty
    // parse would read as unanimous compliance.
    expect(toneModules).toEqual([
      "intrusion-tones.ts",
      "plague-tones.ts",
      "succession-tones.ts",
    ]);
    for (const crisis of CRISES) {
      expect(
        entriesOf(crisis.module).size,
        `${crisis.module} parsed to too few entries`,
      ).toBeGreaterThanOrEqual(17);
    }
  });

  it("keeps era one's table out of the population, and says which file holds it", () => {
    // The one scoping decision in this file, asserted rather than left in the header. Era one's
    // tones exist, they are in the same directory, and they are swept somewhere else.
    const directory = readdirSync(posix.join(repoRoot, TONES_DIR));
    expect(directory).toContain("winterTones.ts");
    expect(toneModules).not.toContain("winterTones.ts");
    expect(directory).toContain("winterGround.test.ts");
  });

  it("reads a table and not a comment", () => {
    // The parser is what every assertion below rests on, and it passes by finding things, which
    // is also how it would look if it had been broken into finding nothing. Both shapes pinned:
    // a real entry, and the same hex inside the doc comment that explains it.
    expect([...toneEntries("  PAVING: 0xa9a49a,\n")]).toEqual([["PAVING", 0xa9a49a]]);
    expect([...toneEntries(" * `Darken(Paving, 0.44)` gives 0x5f5c56,\n")]).toEqual([]);
    expect([...toneEntries("  paving: 0xa9a49a,\n")]).toEqual([]);
  });
});

describe("every tone the plate generator authors is pinned at the same value", () => {
  for (const crisis of CRISES) {
    const palette = eraPalette(crisis.era);
    const tones = entriesOf(crisis.module);

    it(`${crisis.module} covers every role in $ERA${crisis.era} and no role it dropped`, () => {
      // A census rather than a floor: a role added to the generator with nothing here to hold
      // it fails, and a mapping entry naming a role the generator no longer authors fails too.
      // Composition is the claim, so composition is what is asserted.
      expect([...palette.keys()].sort()).toEqual(Object.keys(crisis.fromPalette).sort());
      expect(palette.size).toBeGreaterThanOrEqual(8);
    });

    it(`${crisis.module} holds $ERA${crisis.era}'s own values`, () => {
      for (const [role, keys] of Object.entries(crisis.fromPalette)) {
        const authored = palette.get(role) as number;
        for (const key of keys) {
          expect(tones.has(key), `${crisis.module} has no ${key}`).toBe(true);
          expect(
            hex(tones.get(key) as number),
            `${crisis.module}'s ${key} has drifted from $ERA${crisis.era}.${role}`,
          ).toBe(hex(authored));
        }
      }
    });
  }
});

describe("every derived tone is the generator's own arithmetic and not a typed-in hex", () => {
  for (const crisis of CRISES) {
    const tones = entriesOf(crisis.module);
    const tone = (key: string): number => {
      expect(tones.has(key), `${crisis.module} has no ${key} to derive from`).toBe(true);
      return tones.get(key) as number;
    };

    it(`recomputes ${Object.keys(crisis.derived).length} tones in ${crisis.module}`, () => {
      // A floor under the loop, so a `derived` map emptied by an edit cannot pass by not
      // looking. Five is the smallest of the three as written, and it is era six's since
      // 2026-08-03: its sixth derivation was the cross-era terracotta roof, and the ruling that
      // deleted it took this map to exactly the floor rather than through it.
      expect(Object.keys(crisis.derived).length).toBeGreaterThanOrEqual(5);
      for (const [key, compute] of Object.entries(crisis.derived)) {
        expect(
          hex(tone(key)),
          `${crisis.module}'s ${key} is not what its own doc comment computes`,
        ).toBe(hex(compute(tone)));
      }
    });
  }
});

describe("every entry arrives by exactly one of the four routes", () => {
  for (const crisis of CRISES) {
    const tones = entriesOf(crisis.module);

    it(`accounts for all ${tones.size} entries of ${crisis.module}`, () => {
      const accounted = new Set<string>([
        ...Object.values(crisis.fromPalette).flat(),
        ...Object.keys(crisis.derived),
        ...Object.keys(crisis.fromGeneratorLiteral),
        ...Object.keys(crisis.proposedAndFedBy),
      ]);
      // Both directions. An entry nobody can source is the defect these files exist to stop, and
      // a route naming a key that has been renamed away is a route excusing nothing.
      expect(
        [...tones.keys()].filter((key) => !accounted.has(key)).sort(),
        `unsourced tones in ${crisis.module}`,
      ).toEqual([]);
      expect(
        [...accounted].filter((key) => !tones.has(key)).sort(),
        `${crisis.module} no longer holds a tone this sweep claims to source`,
      ).toEqual([]);
    });

    it(`finds ${crisis.module}'s generator literals in the generator`, () => {
      for (const [key, literal] of Object.entries(crisis.fromGeneratorLiteral)) {
        expect(
          generator,
          `${crisis.module}'s ${key} is not a literal the generator draws`,
        ).toContain(literal);
        expect(generator.toLowerCase()).toContain(hex(tones.get(key) as number));
      }
    });
  }

  it("has exactly two proposed tones across the three crises, and both are still proposals", () => {
    const proposals = CRISES.flatMap((crisis) =>
      Object.entries(crisis.proposedAndFedBy).map(
        ([key, runSheet]) => [crisis, key, runSheet] as const,
      ),
    );
    // A ceiling as well as a floor: this list is the one route with no source outside a prompt
    // sheet, so it is the route an unsourced value would be quietly filed under.
    expect(proposals.length).toBe(2);

    for (const [crisis, key, runSheet] of proposals) {
      const tone = entriesOf(crisis.module).get(key) as number;
      // The run sheet that will feed it still carries it -- or, where the entry is null, still
      // does not, which is the recorded divergence and is asserted so it cannot go stale either
      // way. Both directions of one claim rather than one direction of two.
      const eraFourRunSheet =
        "output/imagegen/era-04-succession-crisis-scenes/imagegen-run-sheet.jsonl";
      if (runSheet === null) {
        expect(
          source(eraFourRunSheet).toLowerCase(),
          `${eraFourRunSheet} now names ${key}, so the null entry recording that it does not is stale`,
        ).not.toContain(hex(tone));
      } else {
        expect(
          source(runSheet).toLowerCase(),
          `${runSheet} no longer feeds ${key}`,
        ).toContain(hex(tone));
      }
      // And it is still nobody else's. A `$ERAn` that started authoring this value would make the
      // proposal a lookup, and the doc comment saying "proposed here" would be wrong.
      for (const era of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
        const start = generator.indexOf(`$ERA${era} = @{`);
        if (start === -1) {
          continue;
        }
        const table = generator.slice(start, generator.indexOf("\n}", start));
        expect(
          table.toLowerCase(),
          `${key} is now authored in $ERA${era}, so it is a lookup rather than a proposal`,
        ).not.toContain(hex(tone));
      }
    }
  });
});

describe("the rules all three tables owe whatever is in them", () => {
  it("spends no mastery gold", () => {
    for (const crisis of CRISES) {
      const tones = entriesOf(crisis.module);
      expect(tones.size).toBeGreaterThan(0);
      for (const [key, tone] of tones) {
        expect(tone, `${crisis.module}'s ${key} is mastery gold`).not.toBe(MASTERY_GOLD);
      }
    }
  });

  it("imports nothing at all, so none of them can pull three into the city's first chunk", () => {
    // `winterTones.ts`'s header owns this rule: these modules are reachable from `CitySurface`'s
    // static import graph, and pulling `three` into it is the cost the lazy surface exists to
    // avoid. Era one needs a type-only import for its `satisfies`; these three need none, so the
    // stricter form is checkable here.
    for (const crisis of CRISES) {
      const text = texts.get(crisis.module) as string;
      expect(text, `${crisis.module} has grown an import`).not.toMatch(/^import\s/m);
    }
  });
});

describe("era four's tones carry no ground rung, because its carrier takes none", () => {
  const declaration = source(SUCCESSION_DECLARATION);

  it("reads the refusal off the declaration rather than assuming it", () => {
    // The premise. `propagation.ts`'s `carrierUsesGroundLadder` is false for exactly this
    // variant, so if era four's carrier ever became a `ground-course` the rule below would stop
    // being era four's rule and this is where that shows up.
    expect(declaration).toContain('kind: "standing-object"');
    expect(declaration).not.toContain('kind: "ground-course"');
  });

  it("holds a scene table and a mark table and no ground table", () => {
    // Era one's tones open with `WINTER_GROUND_TONES`, one entry per state the engine projects
    // onto the ground. Era four projects onto no ground at all — nothing fills a district, and
    // the crisis writes on the paving with objects — so a third table here would be a fill
    // arriving by the back door, against two of its sheet's own rulings.
    const text = texts.get("succession-tones.ts") as string;
    expect(text).toContain("export const SUCCESSION_SCENE_TONES");
    expect(text).toContain("export const SUCCESSION_MARK_TONES");
    expect(text).not.toContain("GROUND_TONES");
    expect([...text.matchAll(/^export const /gm)]).toHaveLength(2);
  });
});
