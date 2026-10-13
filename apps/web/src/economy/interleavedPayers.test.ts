import { describe, expect, it } from "vitest";

/**
 * **WHO CAN REPORT A CLEARED INTERLEAVED SET, AND WHICH ONE OF THEM INVENTS THE ID.**
 *
 * Row 2 is the only repeatable income in the game, and it shipped paying nothing because
 * the one surface that mints its `session_id` minted an id the event-id scheme rejects
 * (defect D-1 — `docs/superpowers/specs/2026-07-29-economy-measured-at-tip.md` §2.4, fixed
 * on 2026-07-30 and covered by `city/interleavedPayoutSeam.test.tsx`). That fix is a fact
 * about ONE call site. What was asserted nowhere is how many call sites there are, and a
 * defect class whose blast radius is "however many surfaces mint one of these" deserves a
 * census rather than a grep somebody ran once.
 *
 * ## The population is scoped by BEHAVIOUR, not by the component that implements it
 *
 * The behaviour is *handing the economy a cleared interleaved set*. That is deliberately
 * not "mounting the interleaved drill": `EraInfinitePractice` implements the whole mechanic
 * and reports nothing to anybody — it hands its host a running correct-answer count, and
 * the HOST decides what a round is worth. So the drill component is absent below,
 * correctly, and a second host that mounted it and paid out WOULD appear.
 *
 * The sweep is therefore over the whole app rather than over the directories a payer
 * "should" live in, for the reason `lessons/revealReAsk.test.ts` gives about its own
 * population: a path-shaped sweep loses exactly the surface that did not read the memo.
 *
 * ## Two claims, because they carry different risk
 *
 * A file that FORWARDS an id it was handed cannot reintroduce D-1; only a file that
 * CONSTRUCTS one can. So the census is asserted in both directions (a newcomer fails, and
 * a listed entry that leaves or stops existing fails), and the minter set is asserted
 * separately, derived from the same scan rather than read off the list.
 *
 * ## The second endless-practice surface, named rather than omitted
 *
 * `lessons/InfinitePractice.tsx` is the other endless drill, and it is off the path
 * because nobody ever wired it to an earn callback — not because anything stops it. That
 * makes the census's completeness rest on an accident, so the accident is written down
 * with the assertions that make it expire: the file has to still exist, still be an
 * endless drill, and still be off the path. Wiring it up is a product decision and is out
 * of scope here; NOTICING that it has been wired up is what this is for.
 */

/**
 * Every `.ts`/`.tsx` under `apps/web/src`, read as text. `import.meta.glob` rather than
 * `node:fs` is the house style for a source sweep here, and it is not a preference: this
 * project has no node types, so a `readFileSync` version does not typecheck
 * (`work-upload/workUploadInvariant.browser.test.tsx` says the same in one line).
 */
const SOURCES = import.meta.glob("../**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** Reporting any completed set that can select row 2, from either side of the seam. */
const ON_THE_ROW_TWO_PATH =
  /reportInterleavedClear|onInterleavedClear|reportPracticeSetComplete/;
const ON_LESSON_SET_PATH = /reportPracticeSetComplete/;

/**
 * WRITING a session id rather than passing one along: `sessionId:` followed by a string or
 * a template literal. A forwarder writes `sessionId` (shorthand) or `sessionId: string`
 * (a type), and neither opens a quote.
 */
const MINTS_A_SESSION_ID = /sessionId:\s*[`"']/;

type PathRole = "minter" | "wiring" | "funnel" | "contract" | "adapter" | "passthrough";

interface PathMember {
  /** Relative to `apps/web/src`. */
  readonly path: string;
  readonly role: PathRole;
  readonly why: string;
}

const ROW_TWO_PATH: readonly PathMember[] = [
  {
    path: "city/CitySurface.tsx",
    role: "contract",
    why: "legacy composition input retained for economy adapters; Review mistakes never calls it",
  },
  {
    path: "App.tsx",
    role: "wiring",
    why: "the one production composition — the city's report bound to useEconomy's",
  },
  {
    path: "economy/useEconomy.ts",
    role: "funnel",
    why: "catches a failed report and speaks it, so no economy failure is discarded",
  },
  {
    path: "economy/economyClient.ts",
    role: "contract",
    why: "declares the method and the bound-aware outcome both adapters return",
  },
  {
    path: "economy/economySession.ts",
    role: "adapter",
    why: "turns the reported set into the row-2 grant and counts the era's allowance",
  },
  {
    path: "economy/economyServerClient.ts",
    role: "adapter",
    why: "sends the same report to the persisted server ledger with the standing island era",
  },
  {
    path: "devPersistence/economyPersistence.ts",
    role: "passthrough",
    why: "decorator: forwards the report, then captures the ledger it wrote",
  },
  {
    path: "city/roadsEconomy.ts",
    role: "passthrough",
    why: "decorator: forwards the report untouched while overlaying road spend",
  },
  {
    path: "city/civicEconomy.ts",
    role: "passthrough",
    why: "decorator: forwards the report untouched while overlaying civic material spend",
  },
];

/**
 * This file's own directory under `apps/web/src`, derived from its module URL rather than
 * written down, because Vite reports a SIBLING as `./x.ts` and everything else as
 * `../dir/x.ts` — so folding the two forms needs to know which directory `./` means, and a
 * hardcoded answer would silently mislabel every sibling if this file ever moved.
 */
const SELF_DIR = import.meta.url
  .replace(/\/[^/]*$/, "")
  .replace(/^.*\/apps\/web\/src\/?/, "");

/** `../city/CitySurface.tsx` → `city/CitySurface.tsx`; `./useEconomy.ts` → `economy/…`. */
function relativeToSrc(globPath: string): string {
  return globPath.startsWith("../")
    ? globPath.slice("../".length)
    : `${SELF_DIR}/${globPath.replace(/^\.\//, "")}`;
}

const SWEPT = Object.entries(SOURCES).map(([path, text]) => ({
  path: relativeToSrc(path),
  text,
}));
const PRODUCTION = SWEPT.filter((file) => !/\.test\.tsx?$/.test(file.path));

const ON_PATH = PRODUCTION.filter((file) => ON_THE_ROW_TWO_PATH.test(file.text)).map(
  (file) => file.path,
);
const LESSON_SET_PATH = PRODUCTION.filter((file) => ON_LESSON_SET_PATH.test(file.text)).map(
  (file) => file.path,
);
const MINTERS = PRODUCTION.filter(
  (file) => ON_THE_ROW_TWO_PATH.test(file.text) && MINTS_A_SESSION_ID.test(file.text),
).map((file) => file.path);

function sourceOf(path: string): string {
  const found = PRODUCTION.find((file) => file.path === path);
  if (found === undefined) {
    throw new Error(`${path} no longer exists, so what is claimed about it below is void`);
  }
  return found.text;
}

describe("the row-2 earn path has exactly the surfaces it is documented to have", () => {
  it("swept the whole app, and swept production rather than tests", () => {
    // A sweep reading nothing is how a census like this passes while measuring nothing, so
    // the denominator is asserted before anything is claimed over it.
    expect(PRODUCTION.length).toBeGreaterThan(200);
    expect(PRODUCTION.some((file) => file.path === "App.tsx")).toBe(true);
    // THE `./` NORMALISATION, PROVEN RATHER THAN ASSUMED. Vite hands a SIBLING back in the
    // `./` form, so a wrong `SELF_DIR` would file every neighbour of this test under a name
    // no assertion below matches — and negative assertions all pass against a wrong name.
    // Three of the eight listed files are siblings, so this is load-bearing for the census.
    // (This test file cannot stand in for one: `import.meta.glob` never returns the module
    // that calls it.)
    expect(SWEPT.map((file) => file.path)).toContain("economy/useEconomy.ts");
    // AND THE TEST FILTER IS DOING WORK. This file names both patterns and the whole list,
    // so a sweep that kept tests in would find itself and agree with itself trivially.
    expect(SWEPT.some((file) => file.path.includes(".test."))).toBe(true);
    expect(PRODUCTION.some((file) => file.path.includes(".test."))).toBe(false);
  });

  it("is exactly the nine named files, and fails whichever way that comes apart", () => {
    // BOTH DIRECTIONS in one assertion. A new surface reporting cleared sets fails here and
    // has to be added with a role; a listed file that stops touching the path fails here
    // too, so no entry can sit in the list describing nothing.
    expect([...ON_PATH].sort()).toEqual([...ROW_TWO_PATH.map((m) => m.path)].sort());
  });

  it("keeps lesson-practice repeats on every layer of the centralized transaction path", () => {
    const expected = ROW_TWO_PATH.filter(
      (member) => member.path !== "city/CitySurface.tsx",
    ).map((member) => member.path);
    // Shape floor: the composition, hook, contract, two adapters, persistence and both
    // stockpile decorators are all represented. `CitySurface` is the one excluded member:
    // it observes practice through the receipt callback and never chooses an economy row.
    expect(expected).toHaveLength(8);
    expect([...LESSON_SET_PATH].sort()).toEqual([...expected].sort());
  });

  it("keeps every listed file real, so a rename cannot leave a stale entry", () => {
    for (const member of ROW_TWO_PATH) {
      expect(
        PRODUCTION.some((file) => file.path === member.path),
        `${member.path} is listed on the row-2 path but no longer exists`,
      ).toBe(true);
      expect(member.why.length, member.path).toBeGreaterThan(0);
    }
  });

  it("has no UI minter after the Town Hall became Review mistakes", () => {
    expect(MINTERS).toEqual([]);
    expect(ROW_TWO_PATH.filter((m) => m.role === "minter")).toEqual([]);
  });

  it("keeps the COMPOSITION of the path, not merely its size", () => {
    // A count of eight is satisfied by eight pass-through decorators. The shape is the
    // claim: something mints, something wires it to a host, something catches the failure,
    // something turns it into a grant, and the rest forward.
    expect([...new Set(ROW_TWO_PATH.map((member) => member.role))].sort()).toEqual([
      "adapter",
      "contract",
      "funnel",
      "passthrough",
      "wiring",
    ]);
    expect(ROW_TWO_PATH.filter((m) => m.role === "passthrough").length).toBeGreaterThan(1);
    expect(new Set(ROW_TWO_PATH.map((m) => m.path)).size).toBe(ROW_TWO_PATH.length);
  });
});

describe("the other endless-practice surface pays nothing, and that is an accident", () => {
  const INFINITE_PRACTICE = "lessons/InfinitePractice.tsx";
  const ERA_INFINITE_PRACTICE = "lessons/EraInfinitePractice.tsx";

  it("still exists and is still an endless drill", () => {
    // The half that makes the observation expire rather than rot: if this surface is gone
    // or is no longer a drill, the note below has stopped describing anything and somebody
    // should find that out before trusting it.
    expect(sourceOf(INFINITE_PRACTICE)).toMatch(/InfiniteDrill/);
    expect(sourceOf(ERA_INFINITE_PRACTICE)).toMatch(/InfiniteDrill/);
  });

  it("reports nothing to the economy, and neither does the era drill", () => {
    // NEITHER drill component is on the path, for the same reason and with different
    // consequences. `EraInfinitePractice` hands its host a correct-answer count and the
    // Town Hall turns that into money, which is the seam working as designed.
    // `InfinitePractice` hands its host nothing at all — it takes `nodeId` and `onExit` and
    // no earn callback — so a per-node drill can be ground forever for free.
    //
    // **Nothing PREVENTS it from paying.** It runs the same `InfiniteDrill` shell whose
    // `onCorrectAnswer` the era drill's payout is built on, so this is a wiring that was
    // never done rather than a wiring that was refused. If it is ever done, the census
    // above fails and this fails with it.
    expect(ON_THE_ROW_TWO_PATH.test(sourceOf(INFINITE_PRACTICE))).toBe(false);
    expect(ON_THE_ROW_TWO_PATH.test(sourceOf(ERA_INFINITE_PRACTICE))).toBe(false);
    expect(ON_PATH).not.toContain(INFINITE_PRACTICE);
    expect(ON_PATH).not.toContain(ERA_INFINITE_PRACTICE);
  });
});
