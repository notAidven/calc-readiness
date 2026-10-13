/**
 * PROVES THE CITY LIFE EXPLAINER GUARD BITES.
 *
 *   node scripts/qa/city-life-explainer-injections.mjs
 *
 * `.cursor/rules/qa-verification.mdc`: *"an assertion you add without a demonstrated red
 * is not evidence either, because a test written green may be asserting nothing."* Every
 * claim `apps/web/src/city/cityLifeExplainers.test.tsx` makes is a claim about a mechanic,
 * so each one gets that mechanic broken IN THE ENGINE OR THE CATALOGUE, the file run
 * exactly as it ships, and the verdict recorded. An injection that does not turn it red is
 * a finding rather than a pass, and is printed as NOT CAUGHT.
 *
 * WHY THE INJECTIONS ARE MOSTLY NOT IN THE PANEL. The defect this guard exists for is not
 * somebody editing the tooltip; it is somebody retuning the economy and leaving three
 * sentences behind describing the old one. So the injections are the retunes: a civic row
 * that stops sustaining, a mastery term that stops being twice the practice term, a road
 * tile worth two, an amenity that is no longer the biggest thing you can buy. Four
 * interaction injections are in the panel, because "it has to work as an interaction" is
 * the other half of the ask.
 *
 * Nothing is left behind: every injection is reverted, and the script checks each touched
 * file is byte-for-byte restored before it exits.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const TEST = "apps/web/src/city/cityLifeExplainers.test.tsx";

const PANEL = "apps/web/src/city/CityVitalityPanel.tsx";
const COPY = "apps/web/src/city/cityLifeExplainers.ts";
const VITALITY = "engines/game/src/city-vitality.ts";
const VITALITY_TUNING = "engines/game/src/city-vitality-tuning.ts";
const CITIZEN_TUNING = "engines/game/src/citizens-tuning.ts";
const CATALOGUE = "packages/economy/src/civicCatalogue.ts";

const injections = [
  /* ---- POPULATION -------------------------------------------------------- */
  {
    name: "mastering stops being worth twice what practising is",
    file: CITIZEN_TUNING,
    guards: "measures both terms through the call the HUD makes",
    find: "export const CITIZENS_PER_MASTERED_SKILL = 4;",
    replace: "export const CITIZENS_PER_MASTERED_SKILL = 3;",
  },
  {
    name: "a purchase starts bringing people (capacity feedback)",
    file: VITALITY,
    guards: "is right that buying a building brings nobody, over the whole catalogue",
    find: "  const population = citizenPopulation(input.ledger);",
    replace: "  const population = citizenPopulation(input.ledger) + input.civic.length;",
  },

  /* ---- LIVABILITY -------------------------------------------------------- */
  {
    name: "a bought row stops contributing the livability its card quotes",
    file: VITALITY,
    guards: "raises what the city sustains by exactly the figure the Build menu quotes",
    find: "    rows.push({\n      livability: contribution.livability,\n      happiness: contribution.happiness,\n    });",
    replace:
      "    rows.push({\n      livability: 0,\n      happiness: contribution.happiness,\n    });",
  },
  {
    name: "the dearest bought rows are repriced below what one mastery adds",
    file: CATALOGUE,
    guards:
      "is right that no single skill can add more ROOM than the era's largest bought row",
    /*
     * Era one's Smokehouse and Family Lodge BOTH sustain 20, which is exactly the room
     * mastering the Dwellings nets, so the era's largest is a tie and halving one of them
     * changes nothing. Measured: lowering the Smokehouse alone was NOT CAUGHT, correctly,
     * because the claim was still true. Both have to go for the lever to be the wrong one.
     */
    edits: [
      {
        find: '    "The Smokehouse",\n    "food",\n    2,\n    1,\n    80,\n    20,\n    0,',
        replace:
          '    "The Smokehouse",\n    "food",\n    2,\n    1,\n    80,\n    10,\n    0,',
      },
      {
        find: '    "The Family Lodge",\n    "dwelling",\n    2,\n    2,\n    80,\n    20,\n    5,',
        replace:
          '    "The Family Lodge",\n    "dwelling",\n    2,\n    2,\n    80,\n    10,\n    5,',
      },
    ],
  },
  {
    name: "livability starts gating arrivals",
    file: VITALITY,
    guards: "is right that the crowd arrives whether or not there is room",
    find: "  return {\n    population,\n    livability: { sustains: capacities.livability },",
    replace:
      "  return {\n    population: Math.min(population, capacities.livability),\n    livability: { sustains: capacities.livability },",
  },

  /* ---- HAPPINESS --------------------------------------------------------- */
  {
    name: "a skill building starts reaching more people than an amenity",
    file: VITALITY_TUNING,
    guards: "makes the amenity the largest single source of coverage in every era",
    find: "export const SKILL_HAPPINESS_BY_ROLE: Readonly<Record<CitizenRoleId, number>> = {\n  residence: 0,\n  school: 1,\n  civic: 2,\n};",
    replace:
      "export const SKILL_HAPPINESS_BY_ROLE: Readonly<Record<CitizenRoleId, number>> = {\n  residence: 0,\n  school: 1,\n  civic: 25,\n};",
  },
  {
    name: "an era's blend row overtakes its amenity",
    file: CATALOGUE,
    guards: "makes the amenity the largest single source of coverage in every era",
    find: '  row(\n    "prehistoric_storage_pit",\n    "prehistoric",\n    "stone",\n    "The Spring",\n    "blend",\n    1,\n    1,\n    120,\n    10,\n    10,\n  ),',
    replace:
      '  row(\n    "prehistoric_storage_pit",\n    "prehistoric",\n    "stone",\n    "The Spring",\n    "blend",\n    1,\n    1,\n    120,\n    10,\n    30,\n  ),',
  },
  {
    name: "a road tile is retuned to reach two",
    file: VITALITY_TUNING,
    guards: "is right that each road tile you lay reaches one more person",
    find: "export const ROAD_HAPPINESS_PER_TILE = 1;",
    replace: "export const ROAD_HAPPINESS_PER_TILE = 2;",
  },
  {
    name: "coverage stops being bounded by the crowd, so the row becomes a score",
    file: VITALITY,
    guards: "is right that the figure counts people rather than measuring a mood",
    find: "  const covered = Math.min(coverage, population);",
    replace: "  const covered = coverage;",
  },

  /* ---- The interaction ---------------------------------------------------- */
  {
    name: "the trigger becomes a hover-only span, unreachable from a keyboard",
    file: PANEL,
    guards: "puts each explanation in the DOM behind a keyboard-reachable trigger",
    find: '    <button\n      type="button"\n      className="hud-vitality-help"',
    replace: '    <span\n      className="hud-vitality-help"',
  },
  {
    name: "the bubble is rendered only while it is open",
    file: PANEL,
    guards: "puts each explanation in the DOM behind a keyboard-reachable trigger",
    find: "function RowExplainer({ stat, open }: { stat: CityLifeStat; open: CityLifeStat | null }) {\n  return (",
    replace:
      "function RowExplainer({ stat, open }: { stat: CityLifeStat; open: CityLifeStat | null }) {\n  if (open !== stat) {\n    return null;\n  }\n  return (",
  },
  {
    name: "Escape stops dismissing the bubble",
    file: PANEL,
    guards: "opens on hover, opens on focus, and Escape puts it away without moving focus",
    find: '          if (event.key === "Escape") {\n            event.stopPropagation();\n            setDismissed(asked);\n          }',
    replace:
      '          if (event.key === "Nothing") {\n            setDismissed(asked);\n          }',
  },
  {
    name: "a row loses its data-stat, so the panel and the table stop being one set",
    file: PANEL,
    guards: "censuses the RENDERED rows against the table, in both directions",
    find: '          data-testid="vitality-livability"\n          {...explainers.rowProps("livability")}',
    replace: '          data-testid="vitality-livability"',
  },

  /* ---- The craft rule ----------------------------------------------------- */
  {
    name: "an explanation grows a third sentence",
    file: COPY,
    guards: "keeps every explanation to two sentences at most",
    find: '    text: "Livability is how many people the city can sustain, and the crowd arrives whether or not there is room. Buying a civic building raises it, and the Build menu says how many more each one sustains.",',
    replace:
      '    text: "Livability is how many people the city can sustain, and the crowd arrives whether or not there is room. Buying a civic building raises it, and the Build menu says how many more each one sustains. There is more to say about this than fits in a hover.",',
  },
];

function runTests() {
  try {
    execFileSync("npx", ["vitest", "run", TEST], { encoding: "utf8", stdio: "pipe" });
    return { red: false, output: "" };
  } catch (error) {
    return { red: true, output: `${error.stdout ?? ""}${error.stderr ?? ""}` };
  }
}

function failingNames(output) {
  return [...output.matchAll(/^\s+×\s+(.+?)(?:\s+\d+ms)?$/gm)].map((m) => m[1].trim());
}

const touched = [...new Set(injections.map((injection) => injection.file))];
const originals = new Map(touched.map((file) => [file, readFileSync(file, "utf8")]));

console.log("Baseline (no injection) — must be GREEN:");
const baseline = runTests();
console.log(`  ${baseline.red ? "RED (unexpected!)" : "GREEN"}\n`);
if (baseline.red) {
  console.log(baseline.output.slice(-4000));
  process.exit(1);
}

const results = [];
for (const injection of injections) {
  const source = readFileSync(injection.file, "utf8");
  // One defect may need more than one edit: a tie for "the largest" is not broken by
  // lowering one side of it.
  const edits = injection.edits ?? [{ find: injection.find, replace: injection.replace }];
  let injected = source;
  for (const edit of edits) {
    injected = injected.includes(edit.find)
      ? injected.replace(edit.find, edit.replace)
      : injected;
  }
  if (edits.some((edit) => !source.includes(edit.find))) {
    results.push({ ...injection, verdict: "ANCHOR NOT FOUND" });
    console.log(`\n### ${injection.name}\n  ANCHOR NOT FOUND in ${injection.file}.`);
    continue;
  }

  writeFileSync(injection.file, injected);
  const run = runTests();
  writeFileSync(injection.file, source);

  const failed = failingNames(run.output);
  const verdict = run.red ? "CAUGHT" : "NOT CAUGHT";
  results.push({ ...injection, verdict, failed });

  console.log(`\n### ${injection.name}`);
  console.log(`  file    : ${injection.file}`);
  console.log(`  guard   : ${injection.guards}`);
  console.log(`  verdict : ${verdict}`);
  for (const name of failed) {
    console.log(`    - ${name}`);
  }
}

let restored = true;
for (const [file, original] of originals) {
  if (readFileSync(file, "utf8") !== original) {
    console.log(`\nNOT RESTORED: ${file}`);
    restored = false;
  }
}
console.log(`\nevery touched file restored byte-for-byte: ${restored ? "YES" : "NO"}`);
if (!restored) process.exit(1);

console.log("\nFinal confirmation run — must be GREEN:");
const final = runTests();
console.log(`  ${final.red ? "RED (unexpected!)" : "GREEN"}`);

const notCaught = results.filter((result) => result.verdict !== "CAUGHT");
console.log(
  `\n${results.length - notCaught.length}/${results.length} injections caught.` +
    (notCaught.length > 0
      ? ` NOT CAUGHT: ${notCaught.map((result) => result.name).join("; ")}`
      : ""),
);
if (notCaught.length > 0) process.exit(1);
