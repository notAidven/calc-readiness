#!/usr/bin/env node
/**
 * **THE INJECTION HARNESS FOR THE SUSPENDED-CIVIC CONSUMER.**
 *
 * A guard that has never been seen red is a guard nobody has measured
 * (`.cursor/rules/qa-verification.mdc`). This applies one defect at a time to the shipped
 * source, runs the suites that cover a city holding a suspension, records the first failure
 * message from each, restores the tree, and reports two things:
 *
 *  - **INERT injections** — a defect nothing caught. That is a hole in the suite whatever a
 *    green run says.
 *  - **BROKEN runs** — an injection that made a file unparseable takes its whole suite out,
 *    and every assertion in it goes MISSING rather than red. Missing is not red, so a run
 *    whose test count does not match the baseline is reported as `BROKEN` rather than as a
 *    success.
 *
 * Following `tools/intrusion-injections.mjs`, which is this repository's precedent and whose
 * header records what a first pass actually finds.
 *
 * ## Usage
 *
 *     node tools/suspended-civic-injections.mjs             # the whole pass
 *     node tools/suspended-civic-injections.mjs --only <id> # one injection
 *     node tools/suspended-civic-injections.mjs --list      # without running
 *
 * The tree is restored in a `finally` and on SIGINT. Verify with `git status` regardless.
 */

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const RUN_CEILING_MS = 180_000;

const CITIZENS = "apps/web/src/city/citizens.ts";
const SURFACE = "apps/web/src/city/CitySurface.tsx";
const LABELS = "apps/web/src/city/three/SkillLabels.tsx";
const SCENE = "apps/web/src/city/three/CityScene.tsx";
const REPAIR = "apps/web/src/city/crisisRepair.ts";
const SESSION = "apps/web/src/city/citySession.ts";
const CONSUMER = "apps/web/src/city/suspendedCivic.ts";
const APP = "apps/web/src/App.tsx";
const PLAGUE = "engines/game/src/plague.ts";
const WINTER = "engines/game/src/hard-winter.ts";
const PERSIST = "apps/web/src/devPersistence/devSession.ts";
const AGNOSTIC = "apps/web/src/city/suspendedCivicIsCrisisAgnostic.test.ts";

/** Every suite that claims something about a city holding a suspended civic building. */
const SUITES = [
  "apps/web/src/city/suspendedCivicReachesTheCity.test.tsx",
  "apps/web/src/city/suspendedCivicIsCrisisAgnostic.test.ts",
  "apps/web/src/city/suspendedCivicSuppression.test.ts",
  "apps/web/src/city/suspendedCivicPopup.test.tsx",
  "apps/web/src/city/suspensionLiftComposition.test.tsx",
  "apps/web/src/city/three/suspendedCaption.test.ts",
  "apps/web/src/city/crisisRepair.test.ts",
  "apps/web/src/devPersistence/movePersistence.test.ts",
];

/**
 * **THE ONE SEAM THIS PASS CANNOT REACH, named rather than left uncovered.**
 *
 * `CityScene`'s pass-through of `suspendedCivicIds` to `SkillLabels` is four optional props
 * long and is only exercised by a real mount, which lives in
 * `apps/web/src/city/suspendedCivicFrames.browser.test.tsx` — a shadow-mapped scene that is
 * off by default for the reason `winterZeroAccuracy.browser.test.tsx` records. Its injection
 * (`scene-passes-no-suspensions`) is therefore run against the BROWSER suite, by hand:
 *
 *     VITE_WINTER_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
 *       apps/web/src/city/suspendedCivicFrames.browser.test.tsx
 *
 * with the `suspended={suspendedCivicIds}` line removed from `CityScene`. Measured on
 * 2026-08-04 it reports *"the island is drawing no SUSPENDED caption over the shuttered
 * building"*, which is the caption's absence rather than a screenshot nobody looked at.
 */
const BROWSER_ONLY = new Set(["scene-passes-no-suspensions"]);

const INJECTIONS = [
  {
    id: "no-suppression",
    why: "the seam ignores the suspension set and every shuttered building goes on paying",
    file: CITIZENS,
    find: "        suspended.has(placed.nodeId)\n          ? { ...NO_CONTRIBUTION }\n          : {",
    replace: "        false\n          ? { ...NO_CONTRIBUTION }\n          : {",
  },
  {
    id: "surface-passes-no-suspensions",
    why: "the seam is right and the SURFACE never hands it the set — #527's shape exactly",
    file: SURFACE,
    find: "civic: civicContributionRowsOf(civicPlacements, suspendedCivic),",
    replace: "civic: civicContributionRowsOf(civicPlacements),",
  },
  {
    id: "suppression-keyed-by-catalogue-type",
    why: "the phantom free row and a bought Smokehouse are one TYPE, so a type-keyed match takes both",
    file: CITIZENS,
    find:
      "  const rows: CapacityContribution[] = [{ ...FREE_SMOKEHOUSE_CONTRIBUTION }];\n" +
      "  for (const placed of civic) {\n" +
      "    const row = parseCivicPlacementId(placed.nodeId)?.row;",
    replace:
      "  const shutTypes = new Set(\n" +
      "    [...suspended].map((id) => parseCivicPlacementId(id)?.row.id),\n" +
      "  );\n" +
      "  const rows: CapacityContribution[] = shutTypes.has(FREE_SMOKEHOUSE.id)\n" +
      "    ? [{ ...NO_CONTRIBUTION }]\n" +
      "    : [{ ...FREE_SMOKEHOUSE_CONTRIBUTION }];\n" +
      "  for (const placed of civic) {\n" +
      "    const row = parseCivicPlacementId(placed.nodeId)?.row;",
  },
  {
    id: "no-left-join",
    why: "a suspension naming a building this city does not hold is priced and shown anyway",
    file: CONSUMER,
    find: "    if (!standing.has(record.placement_id)) {\n      continue;\n    }",
    replace: "    if (false) {\n      continue;\n    }",
  },
  {
    id: "caption-dropped",
    why: "the capacity falls and nothing on the island says which building it fell for",
    file: LABELS,
    find:
      "      (crisis !== null && placement.nodeId === TOWN_HALL_ID) ||\n" +
      "      suspended.has(placement.nodeId);",
    replace: "      (crisis !== null && placement.nodeId === TOWN_HALL_ID);",
  },
  {
    id: "caption-loses-to-the-board",
    why: "a winter over a city with a suspension captions the shuttered building SAFE",
    file: LABELS,
    find:
      '  if (suspended.has(nodeId)) {\n    return "suspended";\n  }\n' +
      "  return crisis === null ? null : crisisLabelState(nodeId, crisis);",
    replace:
      "  if (crisis !== null) {\n    return crisisLabelState(nodeId, crisis);\n  }\n" +
      '  return suspended.has(nodeId) ? "suspended" : null;',
  },
  {
    id: "caption-not-a-status-plate",
    why: "the word is right and it is drawn as a quiet skill name rather than something to act on",
    file: LABELS,
    find: "    const tone = target.status === null ? STATUS_TONES.safe : STATUS_TONES[target.status];",
    replace:
      "    const tone = STATUS_TONES.safe;\n" +
      "    target = { ...target, status: null } as typeof target;",
  },
  {
    id: "scene-passes-no-suspensions",
    why: "the caption resolves and the scene never hands the set to the overlay",
    file: SCENE,
    find: "          suspended={suspendedCivicIds}",
    replace: "",
  },
  {
    id: "popup-still-quotes-a-figure-nobody-is-counting",
    why: "the building's own card reports what a standing one gives while this one gives nothing",
    file: SURFACE,
    find: '        <div className="civic-panel-body" data-suspended={suspended ? "true" : "false"}>',
    replace: '        <div className="civic-panel-body" data-suspended="false">',
  },
  {
    id: "price-is-the-winters-flat-one",
    why: "a lift is charged era one's rebuild price at every era, so nothing scales",
    file: REPAIR,
    find:
      '  if (target.kind === "civic") {\n' +
      "    const row = parseCivicPlacementId(target.placementId)?.row;\n" +
      "    return row === undefined ? 0 : civicLiftSuspensionCost(row, eraId);\n" +
      "  }",
    replace:
      '  if (target.kind === "civic") {\n    return hardWinterRepairPrices().per_building;\n  }',
  },
  {
    id: "price-guesses-an-unbacked-id",
    why: "a stand-in placement id no catalogue row backs is charged a price nobody authored",
    file: REPAIR,
    find: "    return row === undefined ? 0 : civicLiftSuspensionCost(row, eraId);",
    replace: "    return row === undefined ? 20 : civicLiftSuspensionCost(row, eraId);",
  },
  {
    id: "lift-clears-nothing",
    why: "the player pays and the shutters stay up",
    file: SESSION,
    find: "      crisisDamageValue = clearSuspendedCivic(crisisDamageValue, placementId);",
    replace: "",
  },
  {
    id: "app-lifts-in-a-different-city",
    why: "a clearCivic that compiles perfectly and resolves against a city nobody renders",
    file: APP,
    find: "          clearCivic: session.liftSuspendedCivic,",
    replace: "          clearCivic: createCityDevSession().liftSuspendedCivic,",
  },
  {
    id: "panel-hides-a-suspension",
    why: "the capacity falls, the island says SUSPENDED, and there is no reachable way to pay",
    file: SURFACE,
    find:
      "  if (\n    ruinedBuildings.length === 0 &&\n    ruinedCells.length === 0 &&\n" +
      "    suspensions.length === 0\n  ) {\n    return null;\n  }",
    replace:
      "  if (ruinedBuildings.length === 0 && ruinedCells.length === 0) {\n    return null;\n  }",
  },
  {
    id: "panel-does-not-say-what-is-withheld",
    why: "a shortfall with no cause is the thing a player reports as a bug",
    file: SURFACE,
    find: "                  Shut, so the city is doing without {withheldPhrase(row)}. The building is",
    replace: "                  Shut. The building is",
  },
  {
    id: "plague-starts-suspending",
    why: "a declared exception adopts the behaviour it was excused from",
    file: PLAGUE,
    find: "  return { ...NO_CRISIS_RUIN, suspended_civic: [] };",
    replace:
      '  return { ...NO_CRISIS_RUIN, suspended_civic: ["civic:medieval_chapel:0"] };',
  },
  {
    id: "winter-damage-renamed",
    why: "a declared exception stops existing and goes on exempting nothing",
    file: WINTER,
    find: "export function hardWinterDamage(state: HardWinterState): CrisisDamageReport {",
    replace:
      "export function hardWinterScarReport(state: HardWinterState): CrisisDamageReport {",
  },
  {
    id: "sweep-narrows-to-one-crisis",
    why: "the narrow-population failure itself: a guard scoped to era four, green over era nine",
    file: AGNOSTIC,
    find: '  ["era nine\'s Intrusion", intrusionReport],\n',
    replace: "",
    // Removing a source removes its three parameterised cases, so the run legitimately has
    // fewer tests than the baseline. Declared, so the BROKEN check stays a check on a file
    // that failed to parse rather than a false alarm about an injection that shrinks a loop.
    changesTestCount: true,
  },
  {
    id: "one-suspender-plus-three-excuses",
    why:
      "the shape a floor alone cannot refuse: the census still balances, the exceptions " +
      "still have reasons, and the sweep covers one crisis",
    file: AGNOSTIC,
    find: 'const CAN_SUSPEND: ReadonlySet<string> = new Set(["successionDamage", "intrusionDamage"]);',
    replace:
      'const CAN_SUSPEND: ReadonlySet<string> = new Set(["successionDamage"]);\n' +
      'const MOVED = ["intrusionDamage", { why: "a".repeat(50), report: intrusionReport }] as const;',
    extra: {
      find: "const NEVER_SUSPENDS: ReadonlyMap<\n  string,\n  { readonly why: string; readonly report: () => CrisisDamageReport }\n> = new Map([",
      replace:
        "const NEVER_SUSPENDS: ReadonlyMap<\n  string,\n  { readonly why: string; readonly report: () => CrisisDamageReport }\n> = new Map([\n  MOVED as unknown as [string, { why: string; report: () => CrisisDamageReport }],",
    },
    changesTestCount: true,
  },
  {
    id: "persistence-forwarder-drops-the-capture",
    why: "the lift is paid for and lost on the next reload",
    file: PERSIST,
    find:
      "    async liftSuspendedCivic(placementId) {\n" +
      "      const result = await session.liftSuspendedCivic(placementId);\n" +
      "      capture();\n" +
      "      return result;\n" +
      "    },",
    replace:
      "    async liftSuspendedCivic(placementId) {\n" +
      "      return await session.liftSuspendedCivic(placementId);\n" +
      "    },",
  },
];

function apply(injection) {
  const source = readFileSync(injection.file, "utf8");
  if (!source.includes(injection.find)) {
    throw new Error(`${injection.id}: the find text is not in ${injection.file}`);
  }
  let injected = source.replace(injection.find, injection.replace);
  if (injection.extra) {
    if (!injected.includes(injection.extra.find)) {
      throw new Error(`${injection.id}: the extra find text is not in ${injection.file}`);
    }
    injected = injected.replace(injection.extra.find, injection.extra.replace);
  }
  writeFileSync(injection.file, injected, "utf8");
  return () => writeFileSync(injection.file, source, "utf8");
}

function runSuites() {
  const result = spawnSync(
    "npx",
    [
      "vitest",
      "run",
      "--reporter=json",
      "--outputFile=/tmp/suspended-injection.json",
      ...SUITES,
    ],
    { encoding: "utf8", timeout: RUN_CEILING_MS, stdio: ["ignore", "pipe", "pipe"] },
  );
  if (result.error?.code === "ETIMEDOUT") {
    return { status: "HUNG", failures: [], total: 0 };
  }
  let report;
  try {
    report = JSON.parse(readFileSync("/tmp/suspended-injection.json", "utf8"));
  } catch {
    return { status: "BROKEN", failures: [], total: 0 };
  }
  const failures = [];
  let total = 0;
  for (const file of report.testResults ?? []) {
    for (const assertion of file.assertionResults ?? []) {
      total += 1;
      if (assertion.status === "failed") {
        failures.push({
          title: assertion.fullName ?? assertion.title,
          message: (assertion.failureMessages?.[0] ?? "").split("\n")[0]?.trim() ?? "",
        });
      }
    }
  }
  return { status: failures.length > 0 ? "RED" : "GREEN", failures, total };
}

const argv = process.argv.slice(2);
if (argv.includes("--list")) {
  for (const injection of INJECTIONS) {
    console.log(`${injection.id.padEnd(40)} ${injection.why}`);
  }
  process.exit(0);
}
const only = argv.includes("--only") ? argv[argv.indexOf("--only") + 1] : null;
const chosen = only
  ? INJECTIONS.filter((i) => i.id === only)
  : INJECTIONS.filter((i) => !BROWSER_ONLY.has(i.id));
if (chosen.length === 0) {
  console.error(`no injection "${only}"`);
  process.exit(1);
}

console.log("==> baseline");
const baseline = runSuites();
console.log(`    ${baseline.status}, ${baseline.total} tests`);
if (baseline.status !== "GREEN") {
  console.error("the baseline is not green; nothing below would be readable");
  for (const failure of baseline.failures) {
    console.error(`    ${failure.title}: ${failure.message}`);
  }
  process.exit(1);
}

const results = [];
for (const injection of chosen) {
  let restore = () => {};
  try {
    restore = apply(injection);
    process.on("SIGINT", restore);
    const run = runSuites();
    const shrank = run.total !== baseline.total && injection.changesTestCount !== true;
    const status =
      run.status === "GREEN"
        ? "INERT"
        : run.status === "RED" && shrank
          ? "BROKEN"
          : run.status;
    results.push({ id: injection.id, why: injection.why, ...run, status });
    console.log(`\n== ${injection.id} — ${status} (${run.failures.length} red)`);
    console.log(`   defect: ${injection.why}`);
    for (const failure of run.failures) {
      console.log(`   RED  ${failure.title}`);
      console.log(`        ${failure.message}`);
    }
  } finally {
    restore();
    process.off("SIGINT", restore);
  }
}

const inert = results.filter((r) => r.status !== "RED");
console.log(`\n==> ${results.length} injections, ${results.length - inert.length} red`);
if (inert.length > 0) {
  console.log("==> NOT RED (a defect nothing caught is a hole in the suite):");
  for (const result of inert) {
    console.log(`    ${result.status.padEnd(7)} ${result.id} — ${result.why}`);
  }
  process.exit(1);
}
