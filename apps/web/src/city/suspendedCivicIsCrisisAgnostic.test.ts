import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { civicBuildingOrThrow } from "@cr/economy";
import {
  type CrisisDamageReport,
  createHardWinter,
  createPlague,
  createRelay,
  createSuccession,
  foldCrisisDamage,
  hardWinterDamage,
  NO_CRISIS_DAMAGE,
  plagueDamage,
  relayDamage,
  relayOutcome,
  SUCCESSION,
  successionBoardFor,
  successionDamage,
  successionReducer,
} from "@cr/game";
import { describe, expect, it } from "vitest";

import { civicContributionRowsOf } from "./citizens";
import { standingSuspensions, suspendedCivicIds } from "./suspendedCivic";
import type { PlacedTransform } from "./worldLayout";

/**
 * **THE CONSUMER IS SCOPED TO THE FIELD, NOT TO A CRISIS — measured over both writers and
 * over one that does not exist.**
 *
 * `CrisisDamage.suspended_civic` is written by era four's Succession and era nine's
 * Intrusion, and `crisis-damage.ts` named a third writer before either of them existed
 * (*"The Lost Herd — a crisis that does not exist yet — locks CIVIC CAPACITY rather than
 * ruining anything, and `suspended_civic` is the field that carries it"*). A guard scoped to
 * the Succession would go green over the Intrusion, which is the narrow-population failure
 * `.cursor/rules/qa-verification.mdc` documents at length: *"define a guard's population by
 * who exhibits the behaviour, not by where the behaviour is implemented"*.
 *
 * ## THE POPULATION IS BEHAVIOURAL AND DERIVED FROM SOURCE
 *
 * The question this file had to answer before writing a list down is *what would have to be
 * true of a module for this defect to be possible there*, and the answer is: **it can hand
 * the city a `CrisisDamageReport`**. That is a grep with one shape —
 * `): CrisisDamageReport` over `engines/game/src` — and it is the whole population, four
 * members today, derived rather than typed out.
 *
 * It is then partitioned, in both directions, into the two it exercises and the two that
 * legitimately cannot suspend anything. The exceptions are NAMED with reasons and each is
 * driven, because *"a member that does not owe it and a member that forgot it look identical
 * from outside the guard"*.
 *
 * ## AND A THIRD CRISIS IS COVERED WITHOUT BEING ADDED
 *
 * The behaviour claims below run over an ANONYMOUS report — a `CrisisDamageReport` written
 * by nothing at all, naming this city's own buildings. From the consumer's side that is
 * exactly what a fourth crisis's report is, so the automatic-coverage claim is measured
 * rather than promised. What a new writer WOULD change is the census, deliberately: it fails
 * until someone classifies the new module as a suspender or as an exception, which is the
 * classification being made on purpose rather than by omission.
 */

/* -------------------------------------------------------------------------- */
/* The city the reports are aimed at                                          */
/* -------------------------------------------------------------------------- */

const LODGE = civicBuildingOrThrow("prehistoric_longhouse");
const CAMPFIRE = civicBuildingOrThrow("prehistoric_campfire");

/**
 * Two bought buildings standing on an era-one island, as the city holds them.
 *
 * Placement ids are the real minted form, because that is the join: a crisis records an
 * opaque placement id and the city resolves it through `parseCivicPlacementId`.
 */
const STANDING: readonly PlacedTransform[] = [
  { nodeId: "civic:prehistoric_longhouse:0", col: 2, row: 2, rot: 0 },
  { nodeId: "civic:prehistoric_campfire:1", col: -3, row: 2, rot: 0 },
];

const SHUTTERED = STANDING[0]?.nodeId as string;
const ERA = "prehistoric" as const;

/**
 * **EVERY REPORT BELOW NAMES THIS CITY'S OWN BUILDINGS**, which is the shipped integration
 * and not a convenience.
 *
 * `SuccessionCivicPlan.placement_id` says so in terms: *"The authored boards below carry
 * stand-in ids. A caller with a real city passes its own districts to `createSuccession`,
 * exactly as a caller with a real city passes its own placements to `createHardWinter`."*
 * `IntrusionBuildingPlan.placement_id` says the same. So each crisis is opened over a board
 * built from `STANDING`, and what it reports is a real engine's real report about real
 * buildings.
 *
 * THE `type` FIELD IS A PLATE THE CRISIS SURFACE DRAWS AND THE CITY NEVER READS. Era four's
 * board wants one of its four classical types beside an era-one placement id here, and that
 * mismatch is the point rather than a flaw: the city resolves the catalogue row from the
 * PLACEMENT ID, so a crisis cannot tell it what a building is worth.
 */

/** Era four's Succession, hesitating at zero accuracy until every district has drifted. */
function successionReport(): CrisisDamageReport {
  const board = successionBoardFor(1);
  let state = createSuccession({
    board,
    districts: board.districts.map((district, index) =>
      index === 0
        ? {
            ...district,
            civic: { ...district.civic, placement_id: SHUTTERED },
          }
        : district,
    ),
  });
  // A cap rather than a rule: D-CRISIS-11 requires the crisis to terminate on its own, so a
  // play that hits this is a boundedness failure and the assertion below says so.
  for (let guard = 0; state.phase !== "settled" && guard < 8; guard += 1) {
    state = successionReducer(state, { type: "start_batch" });
    state = successionReducer(state, {
      type: "resolve_batch",
      correct: 0,
      asked: SUCCESSION.cycle.batch_size,
    });
    state = successionReducer(state, { type: "finish_response" });
  }
  expect(state.phase, "the Succession did not settle inside its own bound").toBe("settled");
  return successionDamage(state);
}

/**
 * **A REPORT FROM NO CRISIS AT ALL**, which is what the fourth writer's looks like from
 * here. Spelled as a literal on purpose: if this file had to name an engine to produce it,
 * the automatic-coverage claim would be about that engine.
 */
function anonymousReport(): CrisisDamageReport {
  return { buildings: [], cells: [], suspended_civic: [SHUTTERED] };
}

const SOURCES: ReadonlyMap<string, () => CrisisDamageReport> = new Map([
  ["era four's Succession", successionReport],
  ["a crisis that does not exist yet", anonymousReport],
]);

/* -------------------------------------------------------------------------- */
/* The behaviour, over every source of a suspension                           */
/* -------------------------------------------------------------------------- */

describe("a city holding a suspended civic building, whichever crisis shut it", () => {
  for (const [who, report] of SOURCES) {
    describe(who, () => {
      const damaged = () => foldCrisisDamage(NO_CRISIS_DAMAGE, report());

      it("records the suspension against a building the city is standing on", () => {
        const damage = damaged();
        // A FLOOR. Every claim below holds trivially over a report that suspended nothing,
        // and a play that stopped suspending is the likeliest way this fixture rots.
        expect(
          damage.suspended_civic.length,
          `${who} suspended nothing, so there is nothing for the city to withhold`,
        ).toBeGreaterThanOrEqual(1);
        expect(damage.suspended_civic.map((entry) => entry.placement_id)).toContain(
          SHUTTERED,
        );
        // …and D-CRISIS-7's floor on the city side: a suspension destroys nothing.
        expect(damage.ruined_buildings).toEqual([]);
        expect(damage.ruined_cells).toEqual([]);
      });

      it("withholds that building's livability and its happiness", () => {
        const suspended = suspendedCivicIds(damaged());
        const clear = civicContributionRowsOf(STANDING);
        const shut = civicContributionRowsOf(STANDING, suspended);

        const total = (rows: readonly { livability: number; happiness: number }[]) =>
          rows.reduce(
            (sum, row) => ({
              livability: sum.livability + row.livability,
              happiness: sum.happiness + row.happiness,
            }),
            { livability: 0, happiness: 0 },
          );

        expect(total(shut).livability).toBe(
          total(clear).livability - LODGE.provides.livability,
        );
        expect(total(shut).happiness).toBe(
          total(clear).happiness - LODGE.provides.happiness,
        );
        // THE ROW SURVIVES AND IS ZEROED rather than dropped, which is `@cr/economy`'s own
        // treatment of the same flag and keeps the row count a count of standing buildings.
        expect(shut).toHaveLength(clear.length);
        expect(shut).toContainEqual({ livability: 0, happiness: 0 });
      });

      it("names it, prices a lift, and leaves the building it never touched alone", () => {
        const rows = standingSuspensions(damaged(), STANDING, ERA);
        expect(rows.map((row) => row.placementId)).toEqual([SHUTTERED]);
        const shut = rows[0];
        expect(shut?.name).toBe(LODGE.name);
        expect(shut?.livability).toBe(LODGE.provides.livability);
        expect(shut?.happiness).toBe(LODGE.provides.happiness);
        expect(shut?.liftCost).toBeGreaterThan(0);
        // The damage id travels, because it is the spend's idempotency key.
        expect(shut?.damageId).toBe("d1");
        // The Campfire was never shut, so it is not in the list and is still contributing
        // its 20 happiness — asserted here so "withholds" cannot quietly mean "withholds
        // everything".
        expect(rows.map((row) => row.name)).not.toContain(CAMPFIRE.name);
      });
    });
  }

  /**
   * A suspension naming a placement this city does not hold withholds nothing, shows nothing
   * and prices nothing — which is the shipped state of both dev routes, where the authored
   * boards carry stand-in ids. Asserted so the left join is a decision rather than a
   * coincidence: the alternative, charging for a building nobody can see, is worse than
   * silence.
   *
   * **THE SUBJECT IS A WELL-FORMED ID FOR A BUILDING THAT IS NOT THERE**, and the first
   * draft of this case used a stand-in (`succession-harbour-grain-dock`) instead. That was
   * green for the wrong reason: an unparseable id is dropped by the catalogue lookup one
   * line further down, so removing the standing-set check changed nothing and the injection
   * came back INERT. Both are asserted now, and only the first can fail for the reason this
   * case is about.
   */
  it("is silent about a suspension naming a building this city does not hold", () => {
    const absent = "civic:prehistoric_longhouse:99";
    const damage = foldCrisisDamage(NO_CRISIS_DAMAGE, {
      buildings: [],
      cells: [],
      suspended_civic: [absent],
    });
    expect(damage.suspended_civic).toHaveLength(1);
    // A floor: the id really does resolve to a catalogue row, so the emptiness below is the
    // left join and not a parse failure.
    expect(
      standingSuspensions(damage, [{ nodeId: absent, col: 0, row: 0, rot: 0 }], ERA),
    ).toHaveLength(1);
    expect(standingSuspensions(damage, STANDING, ERA)).toEqual([]);
    expect(civicContributionRowsOf(STANDING, suspendedCivicIds(damage))).toEqual(
      civicContributionRowsOf(STANDING),
    );
  });

  /** …and a stand-in id no catalogue row backs is dropped too, by the lookup rather than the join. */
  it("is silent about a suspension naming no catalogue row at all", () => {
    const damage = foldCrisisDamage(NO_CRISIS_DAMAGE, {
      buildings: [],
      cells: [],
      suspended_civic: ["succession-harbour-grain-dock"],
    });
    expect(
      standingSuspensions(
        damage,
        [{ nodeId: "succession-harbour-grain-dock", col: 0, row: 0, rot: 0 }],
        ERA,
      ),
    ).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */
/* The census: who can write the field, derived and partitioned both ways     */
/* -------------------------------------------------------------------------- */

/**
 * Every engine module that can hand the city a `CrisisDamageReport`, read off the tracked
 * source rather than listed here.
 *
 * ONE SHAPE, `): CrisisDamageReport`, because a report has to be RETURNED to reach the city;
 * a module that merely mentions the type (`crisis-damage.ts` defines it) cannot produce one.
 */
function crisisesThatReportDamage(): ReadonlyMap<string, string> {
  const tracked = execFileSync("git", ["ls-files", "-z", "--", "engines/game/src"], {
    encoding: "utf8",
  })
    .split("\0")
    .filter((path) => path.endsWith(".ts") && !path.endsWith(".test.ts"));
  const found = new Map<string, string>();
  for (const path of tracked) {
    const source = readFileSync(path, "utf8");
    for (const match of source.matchAll(
      /export function (\w+)\([^)]*\): CrisisDamageReport/g,
    )) {
      found.set(match[1] as string, path);
    }
  }
  return found;
}

/** The two that can, each exercised above through its own engine. */
const CAN_SUSPEND: ReadonlySet<string> = new Set(["successionDamage"]);

/**
 * **THE TWO THAT LEGITIMATELY CANNOT, each with its reason and each DRIVEN.**
 *
 * A crisis that cannot suspend anything and a crisis that forgot to look identical from
 * outside this file, so neither is quietly left out of the population: both are named, both
 * are called over a real state, and both directions fail.
 */
const NEVER_SUSPENDS: ReadonlyMap<
  string,
  { readonly why: string; readonly report: () => CrisisDamageReport }
> = new Map([
  [
    "relayDamage",
    {
      why:
        "era nine leaves an overwritten public record, not a suspension. Its visible scar " +
        "withholds no livability or happiness and is verified by answering three questions",
      report: () => relayDamage(relayOutcome(createRelay()), SHUTTERED),
    },
  ],
  [
    "plagueDamage",
    {
      why:
        "era six is the only crisis of the ten that leaves NO trace once it is over " +
        "(D-CRISIS-8 §5.10). Its capacity hold lifts with the outbreak and is reported as " +
        "`PlagueCapacityHold` instead, so a durable suspension would be the trace it is " +
        "ruled not to leave",
      report: () => plagueDamage(createPlague({})),
    },
  ],
  [
    "hardWinterDamage",
    {
      why:
        "era one RUINS and does not suspend. Its report has no `suspended_civic` at all, " +
        "and the two things it can leave behind — ruined buildings and scarred ground — " +
        "are both repaired through their own prices",
      report: () => hardWinterDamage(createHardWinter({ era: "prehistoric" })),
    },
  ],
]);

describe("the population of crises that could suspend a civic building", () => {
  it("is derived from the source and partitioned in both directions", () => {
    const reporters = crisisesThatReportDamage();
    // A FLOOR under the derivation. A regex that has stopped matching would make every set
    // comparison below trivially satisfiable, which is how a census measures nothing.
    expect(
      reporters.size,
      "no crisis was found reporting damage, so the sweep is over an empty set",
    ).toBeGreaterThanOrEqual(4);
    expect(new Set(reporters.keys())).toEqual(
      new Set([...CAN_SUSPEND, ...NEVER_SUSPENDS.keys()]),
    );
    // …and nothing is claimed as both, so an exception cannot also be counted as covered.
    for (const name of CAN_SUSPEND) {
      expect(NEVER_SUSPENDS.has(name), `${name} is both suspender and exception`).toBe(
        false,
      );
    }
    // THE COMPOSITION, not only the size. A floor of four is satisfied by one suspender and
    // three excuses, which is the shape this guard exists to refuse: the claim is that the
    // sweep really does cover MORE THAN ONE crisis, so it is asserted where it can fail.
    expect(CAN_SUSPEND.size).toBe(1);
    // Every crisis exercised above is one of them, and every one of them is exercised —
    // so a suspender cannot be classified as covered and then never played.
    expect(SOURCES.size).toBe(CAN_SUSPEND.size + 1);
  });

  it("keeps each exception honest: it still exists, and it still cannot suspend", () => {
    const reporters = crisisesThatReportDamage();
    for (const [name, exception] of NEVER_SUSPENDS) {
      // BACKWARD: a renamed or deleted crisis cannot sit in this list forever exempting
      // nothing and hiding that it exempts nothing.
      expect(
        reporters.has(name),
        `${name} is a declared exception that no longer reports crisis damage`,
      ).toBe(true);
      expect(exception.why.length).toBeGreaterThan(40);
      // FORWARD: an exception that quietly starts suspending fails here and has to be moved
      // into the played list rather than going on being excused.
      const suspended = exception.report().suspended_civic ?? [];
      expect(
        suspended,
        `${name} is excused from the suspension sweep and has started writing one`,
      ).toEqual([]);
    }
  });
});
