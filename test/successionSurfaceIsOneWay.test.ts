/**
 * **NO SOURCE THAT DECIDES ANYTHING IN THE SUCCESSION CAN SEE WHERE A DISTRICT IS DRAWN.**
 *
 * The behaviour, stated before the population is written down: *a web-lane source that decides
 * something about this crisis* — whether a spend is legal, who a district would drift to, what a
 * plan would do, whether the dispute has settled.
 *
 * ## WHAT THIS ADDS OVER `successionPropagation.test.ts`, WHICH IS NOT NOTHING
 *
 * That sweep bans era one's model TOKENS — `col`, `row`, cell, `rim_depth`, adjacency — in any
 * source that names an allegiance, and it is the right guard for the defect it was written for:
 * era one's engine copied across with the nouns changed.
 *
 * It cannot catch the defect a SURFACE is exposed to, because a surface has to put a plinth
 * somewhere and none of those tokens is how it would. The forum is an arc: it has a bearing, a
 * sweep and a reach, and not one of those is on any banned list. A surface that decided which
 * district drifts by *"the one nearest the camera"*, or offered a card only for the district the
 * player last clicked ON THE GROUND, would pass that sweep clean and would have reintroduced
 * exactly the topology era four refuses.
 *
 * So this guard is about the ARROW rather than the vocabulary: the drift order decides where a
 * plinth is drawn, and nothing ever reads back the other way.
 *
 * ## THE POPULATION IS DERIVED FROM THE DECISION, NOT FROM THE DIRECTORY
 *
 * `.cursor/rules/qa-verification.mdc`: a population scoped by where a mechanic is IMPLEMENTED
 * when the claim is about a BEHAVIOUR is the ordinary way a guard here goes green over nothing.
 * A directory list would scope this to `apps/web/src/succession/`, and the file most able to
 * commit this defect is the one that already holds both halves — the scene component, which
 * lives somewhere else entirely.
 *
 * So the population is **every tracked non-test source under `apps/web/` whose CODE names one of
 * the engine's decision functions** ({@link DECIDES}). A module that calls the reducer, asks
 * whether a spend is refused, reads the standing blocks or computes the plan preview is a module
 * that decides; anything else is presentation, however succession-shaped its name.
 *
 * **And the complement is asserted rather than assumed.** A second population — every source that
 * names {@link STANDS} — is derived the same way, floored, and required to be DISJOINT from the
 * first. Two things follow that neither list gives alone: the guard is not green because nobody
 * draws a forum, and a file that grows a second half fails at the disjointness rather than
 * quietly qualifying for an exemption.
 *
 * Lives in `test/` for the reason `successionPropagation.test.ts` does: its subject is the
 * tracked file list rather than one workspace, and the web lane's jsdom harness cannot read
 * source with `node:fs`.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { posix } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

const repoRoot = resolveRepoRoot();

/**
 * **THE ENGINE FUNCTIONS THAT DECIDE SOMETHING**, each with what it decides.
 *
 * Named rather than derived from the module's exports, and the reason is that most of
 * `succession.ts` is not a decision: `successionBoards`, `successionSpendCost`,
 * `successionHoldings` and the tuning table are lookups and arithmetic, and a population that
 * swept them would put every label helper in this crisis under a rule about topology.
 *
 * What makes this list defensible is that it is closed at the source: `succession.ts` is the only
 * module that can change an allegiance, and these are the only exported functions in it that
 * read or move one. The floor and composition assertions below are what stop it silently
 * shrinking.
 */
const DECIDES: readonly { readonly symbol: string; readonly decides: string }[] = [
  { symbol: "successionReducer", decides: "every transition, including the rival action" },
  { symbol: "successionThreat", decides: "the one district the next batch threatens" },
  { symbol: "successionActionOffers", decides: "which of the two paid actions is legal" },
  {
    symbol: "successionMeaningfulChoice",
    decides: "whether two legal actions may be presented as a choice",
  },
  { symbol: "successionOutcome", decides: "the verdict" },
];

/** The layout module and the names it exports. A source naming one of these can see a place. */
const STANDS: readonly string[] = [
  "successionStands",
  "successionStandsById",
  "SUCCESSION_FORUM",
  "SuccessionForum",
  "SuccessionSpot",
  "SuccessionStand",
];

function isSource(path: string): boolean {
  const base = posix.basename(path);
  return /\.(ts|tsx)$/.test(base) && !/\.test\.(ts|tsx)$/.test(base);
}

function trackedWebSources(): string[] {
  return execFileSync("git", ["ls-files", "-z", "--", "apps/web/src"], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  })
    .split("\0")
    .filter((entry) => entry.length > 0)
    .filter(isSource);
}

/**
 * Blank out comments, keeping line numbers.
 *
 * The same stripper `successionPropagation.test.ts` uses and for the same reason: every module in
 * this population explains at length that it holds no position, so a sweep that read prose could
 * not survive its own documentation. **String literals are kept**, which is the conservative
 * direction — a name inside a string is usually prose and harmless to flag, where stripping
 * strings could hide a real dynamic import.
 */
function codeOnly(source: string): string[] {
  let inBlock = false;
  return source.split("\n").map((line) => {
    let out = "";
    let quote: string | null = null;
    let index = 0;

    while (index < line.length) {
      const char = line[index] as string;
      if (inBlock) {
        const end = line.indexOf("*/", index);
        if (end === -1) {
          break;
        }
        inBlock = false;
        index = end + 2;
        continue;
      }
      if (quote !== null) {
        out += char;
        if (char === "\\") {
          out += line[index + 1] ?? "";
          index += 2;
          continue;
        }
        if (char === quote) {
          quote = null;
        }
        index += 1;
        continue;
      }
      if (char === '"' || char === "'" || char === "`") {
        quote = char;
        out += char;
        index += 1;
        continue;
      }
      if (line.startsWith("//", index)) {
        break;
      }
      if (line.startsWith("/*", index)) {
        inBlock = true;
        index += 2;
        continue;
      }
      out += char;
      index += 1;
    }

    return out;
  });
}

function namesAny(code: readonly string[], symbols: readonly string[]): boolean {
  const pattern = new RegExp(`\\b(${symbols.join("|")})\\b`);
  return code.some((line) => pattern.test(line));
}

interface Source {
  readonly path: string;
  readonly code: readonly string[];
}

function webSources(): readonly Source[] {
  return trackedWebSources().map((path) => ({
    path,
    code: codeOnly(readFileSync(posix.join(repoRoot, path), "utf8")),
  }));
}

const DECISION_SYMBOLS = DECIDES.map((entry) => entry.symbol);

describe("the Succession's decisions cannot see the Succession's layout", () => {
  it("derives both populations from the tree, floored and with their shape asserted", () => {
    const sources = webSources();
    const deciders = sources.filter((source) => namesAny(source.code, DECISION_SYMBOLS));
    const drawers = sources.filter((source) => namesAny(source.code, STANDS));

    // FLOORS FIRST, because every assertion below passes trivially over an empty list.
    expect(
      deciders.length,
      `only ${deciders.length} web sources decide anything in this crisis`,
    ).toBeGreaterThanOrEqual(3);
    expect(
      drawers.length,
      "nothing draws a forum, so this guard is green over a crisis nobody renders",
    ).toBeGreaterThanOrEqual(2);

    // COMPOSITION, NOT ONLY SIZE. A floor of three is satisfied by three modules that all
    // happen to call the reducer while the projection every surface reads goes unswept.
    const paths = deciders.map((source) => source.path);
    expect(paths).toContain("apps/web/src/succession/successionView.ts");
    expect(paths).toContain("apps/web/src/succession/SuccessionSurface.tsx");
    expect(paths).toContain("apps/web/src/succession/successionScenarios.ts");

    // And the drawing half really is the scene plus the layout it comes from.
    const drawn = drawers.map((source) => source.path);
    expect(drawn).toContain("apps/web/src/succession/successionStands.ts");
    expect(drawn).toContain("apps/web/src/city/three/SuccessionIsland.tsx");
  });

  /**
   * **THE PROPERTY: the two populations are disjoint.**
   *
   * Not "the decision modules do not import the layout module", which a file could satisfy while
   * holding a private copy of the arc. Disjointness is the stronger claim and the one that stays
   * true under a refactor: a module either decides or it draws, and the day one does both,
   * somebody has to look at this line and say which half moves out.
   *
   * `SuccessionIsland.tsx` is the file this is really about. It is handed a projected board and a
   * set of stands and it puts one on the other — which is exactly the shape that could, in one
   * line, start deciding what to draw from where it landed.
   *
   * **MEASURED RATHER THAN ARGUED.** Add one line to `successionView.ts` —
   * `import { successionStands } from "./successionStands";` — and this reports *expected
   * [ 'apps/web/src/succession/successionView.ts' ] to deeply equal []*, at the surface's first
   * commit. Take it out and the file is green again. That is the injection this assertion is
   * worth having; without it, "the decisions cannot see the layout" is an argument.
   */
  it("no source both decides and can see a place", () => {
    const sources = webSources();
    const both = sources.filter(
      (source) => namesAny(source.code, DECISION_SYMBOLS) && namesAny(source.code, STANDS),
    );

    expect(
      both.map((source) => source.path),
      "a source that decides an allegiance can also see where a district is drawn, which is " +
        "the one way a screen position could feed back into the model era four refuses to " +
        "give one",
    ).toEqual([]);
  });

  /**
   * The layout module cannot be handed anything that decides.
   *
   * The other direction of the same arrow, and it is checkable at the signature: `successionStands`
   * takes district IDS and a forum. With a projected district in hand it could branch on an
   * allegiance and put a held district somewhere else, and nobody would notice for a year.
   */
  it("the layout module takes ids and a shape, and imports nothing from the engine", () => {
    const path = "apps/web/src/succession/successionStands.ts";
    const code = codeOnly(readFileSync(posix.join(repoRoot, path), "utf8")).join("\n");

    expect(code, `${path} imports the engine`).not.toMatch(/from\s+["']@cr\/game["']/);
    expect(code, `${path} imports the projection`).not.toMatch(/successionView/);
    // And it really is the module the rest of this file is about.
    expect(code).toMatch(/export function successionStands\(/);
    expect(code).toMatch(/districtIds: readonly string\[\]/);
  });

  /**
   * **THERE IS NO INVERSE, AND ITS ABSENCE IS THE THIRD LEG.**
   *
   * A one-way function with a lookup beside it is not one-way. This asserts that nothing in the
   * crisis maps a place back to a district: no `standAt`, no nearest-stand search, no hit test
   * that returns an id from a position. A pick names a district by carrying its ID, which is
   * what `SuccessionIsland` reads off `userData` and what the DOM board puts in `data-district`.
   */
  it("nothing maps a place back to a district", () => {
    const sources = webSources().filter((source) =>
      /succession/i.test(posix.basename(source.path)),
    );
    expect(sources.length).toBeGreaterThanOrEqual(6);

    const inverse = /\b(standAt|districtAt|nearestStand|nearestDistrict|districtNear)\b/;
    const found = sources
      .filter((source) => source.code.some((line) => inverse.test(line)))
      .map((source) => source.path);
    expect(
      found,
      "a place-to-district lookup is the inverse `successionStands.ts` promises not to have",
    ).toEqual([]);
  });

  /**
   * Both sweeps above pass by finding nothing, which is also exactly what they would look like
   * with a broken detector. This pins the detector against the shape of each defect, in both
   * directions, and pins the comment stripper with it.
   */
  it("detects the defect when one is present, and only then", () => {
    // Every decision symbol is genuinely matched...
    for (const entry of DECIDES) {
      expect(
        namesAny([`  const next = ${entry.symbol}(state, event);`], DECISION_SYMBOLS),
      ).toBe(true);
      expect(entry.decides.length).toBeGreaterThan(10);
    }
    for (const symbol of STANDS) {
      expect(namesAny([`  const stands = ${symbol};`], STANDS)).toBe(true);
    }

    // ...and a file doing BOTH is caught, which is the defect this guard is for.
    const defect = codeOnly(
      [
        'import { successionReducer } from "@cr/game";',
        'import { successionStands } from "./successionStands";',
        "export function decideFromTheArc(state, ids) {",
        "  const stands = successionStands(ids);",
        "  return successionReducer(state, { type: 'start_batch' });",
        "}",
      ].join("\n"),
    );
    expect(namesAny(defect, DECISION_SYMBOLS) && namesAny(defect, STANDS)).toBe(true);

    // ...while prose naming both is not, so a green run means something. Every line below is
    // quoted from a module in the population.
    const prose = codeOnly(
      [
        "/**",
        " * successionStands.ts holds where a district is drawn, and successionReducer decides",
        " * what it does. The two never meet.",
        " */",
        "const forum = 1; // successionStands, successionReducer",
      ].join("\n"),
    );
    expect(namesAny(prose, DECISION_SYMBOLS)).toBe(false);
    expect(namesAny(prose, STANDS)).toBe(false);
  });
});
