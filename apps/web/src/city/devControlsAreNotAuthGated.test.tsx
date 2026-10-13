import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { CitySurface } from "./CitySurface";
import { type CityDevSession, createCityDevSession } from "./citySession";
import { BUILDABLE_RADIUS, findOpenCell, footprintFor, occupiedCells } from "./worldLayout";

/**
 * **THE DEVELOPER STAND-IN PANEL MUST NOT BE GATED ON AUTH STATE.**
 *
 * `App.tsx` withheld the three mastery stand-ins from a signed-in user
 * (`onDevAdvanceMastery={authedCity ? undefined : session.advanceMasteryDev}`), which was a
 * serviceable proxy for *"don't show stand-ins to a real learner"* only while anonymous play
 * existed. Sign-in is now required (ruling 2026-07-31), so `authedCity` is non-null for
 * everyone the day the wall ships — and the design record measured what that does by
 * rendering the real surface both ways:
 *
 * ```
 * SIGNED-OUT  devtools panel present: true      crisis seed control present: true
 * SIGNED-IN   devtools panel present: false     crisis seed control present: false
 * ```
 *
 * Every QA session, every screenshot and the whole era-two authoring loop runs on that
 * panel. The gate is now `isDevPersistenceEnabled()` — the deployment shape, which is the
 * same axis the dev persistence these controls drive already uses.
 *
 * ## Two halves, because it is two claims
 *
 * 1. **The panel really does hang off these props**, so withholding them is an outage and
 *    not a cosmetic change. Rendered, both ways, through the menu a person opens.
 * 2. **`App.tsx` no longer keys them on auth**, and neither does anything added beside them.
 *    The population is read off `CitySurface`'s own prop declarations rather than written
 *    down here, so a fourth dev control is inside this sweep the day it is declared.
 */

/**
 * The two sources as text. `import.meta.glob` with `?raw` rather than `node:fs`, which is
 * the house style for a source read in this lane and not a preference: the web project has
 * no node types, so a `readFileSync` version does not typecheck.
 */
const SOURCES = import.meta.glob("../{App,city/CitySurface}.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function sourceOf(suffix: string): string {
  const found = Object.entries(SOURCES).find(([path]) => path.endsWith(suffix));
  if (!found) {
    throw new Error(`the glob did not reach ${suffix} — this file would prove nothing`);
  }
  return found[1];
}

const APP_SOURCE = sourceOf("/App.tsx");
const SURFACE_SOURCE = sourceOf("/CitySurface.tsx");

/** The body of `interface <name>` in `source`, brace-walked so a nested type cannot end it. */
function interfaceBody(source: string, name: string): string {
  const open = source.indexOf(`interface ${name} {`);
  if (open === -1) {
    throw new Error(`no \`interface ${name}\` in the source read`);
  }
  let depth = 0;
  for (let i = source.indexOf("{", open); i < source.length; i += 1) {
    if (source[i] === "{") {
      depth += 1;
    } else if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(source.indexOf("{", open) + 1, i);
      }
    }
  }
  throw new Error(`\`interface ${name}\` is never closed`);
}

/**
 * Every `onDev…` prop `CitySurface` declares — the ones `App.tsx` is in a position to pass.
 * Derived from the source because the subject is "whatever dev controls exist", and a
 * written-down list would answer only for the ones somebody remembered.
 *
 * Read out of `CitySurfaceProps` specifically, not the whole file: `DevPanel` re-declares
 * `onDevSetStage` and adds `onDevSeedCrisis`, and those are the surface's INTERNAL wiring
 * rather than props `App` can reach.
 */
function devPropsOfCitySurface(): string[] {
  const props = new Set<string>();
  for (const match of interfaceBody(SURFACE_SOURCE, "CitySurfaceProps").matchAll(
    /^\s{2}(onDev\w+)\??:/gm,
  )) {
    if (match[1]) {
      props.add(match[1]);
    }
  }
  return [...props].sort();
}

/** The `<CitySurface …/>` element in `App.tsx`, as text. */
function citySurfaceElement(): string {
  const open = APP_SOURCE.indexOf("<CitySurface");
  expect(open, "no `<CitySurface` element in App.tsx").toBeGreaterThan(-1);
  let braceDepth = 0;
  for (let index = open; index < APP_SOURCE.length - 1; index += 1) {
    if (APP_SOURCE[index] === "{") {
      braceDepth += 1;
    } else if (APP_SOURCE[index] === "}") {
      braceDepth -= 1;
    } else if (
      braceDepth === 0 &&
      APP_SOURCE[index] === "/" &&
      APP_SOURCE[index + 1] === ">"
    ) {
      return APP_SOURCE.slice(open, index);
    }
  }
  throw new Error("the top-level `<CitySurface` element is never closed");
}

/** `prop -> the expression App passes for it`, for every dev prop it passes. */
function devPropExpressions(): Map<string, string> {
  const element = citySurfaceElement();
  const passed = new Map<string, string>();
  for (const prop of devPropsOfCitySurface()) {
    const match = new RegExp(`${prop}=\\{([^}]*)\\}`).exec(element);
    if (match?.[1]) {
      passed.set(prop, match[1].trim());
    }
  }
  return passed;
}

const DEV_PROPS = devPropsOfCitySurface();
const PASSED = devPropExpressions();

/** A session with three skills standing, so the panel has buildings to list. */
async function cityWithBuildings(): Promise<CityDevSession> {
  const session = createCityDevSession();
  for (const nodeId of ["NUM.S", "NUM.F", "NUM.2"]) {
    const load = await session.load();
    const occupants = [...(load.placements ?? [])];
    if (load.town_hall) {
      occupants.push(load.town_hall);
    }
    const spot = findOpenCell(
      footprintFor(nodeId),
      occupiedCells(occupants),
      BUILDABLE_RADIUS,
    );
    if (!spot) {
      throw new Error(`no open ground for ${nodeId}`);
    }
    await session.placeSkill(nodeId, spot);
  }
  return session;
}

/** Render the surface with the dev stand-ins either supplied or withheld. */
function renderCity(session: CityDevSession, devControlsEnabled: boolean) {
  return render(
    <CitySurface
      enableCanvas={false}
      reducedMotion
      loadCity={session.load}
      onPlaceSkill={session.placeSkill}
      onMoveSkill={session.moveSkill}
      onMoveTownHall={session.moveTownHall}
      onDevAdvanceMastery={devControlsEnabled ? session.advanceMasteryDev : undefined}
      onDevLessonTaught={devControlsEnabled ? session.markLessonTaught : undefined}
      onDevSetStage={devControlsEnabled ? session.setStageDev : undefined}
    />,
  );
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("button", { name: "Build" });
  await user.click(screen.getByRole("button", { name: "Menu" }));
}

describe("the whole developer panel hangs off the dev stand-in props", () => {
  it("renders the panel and the crisis seed control when they are supplied", async () => {
    const user = userEvent.setup();
    renderCity(await cityWithBuildings(), true);
    await openMenu(user);

    expect(screen.getByRole("heading", { name: /Simulate lessons/ })).toBeInTheDocument();
    expect(screen.getByTestId("dev-seed-crisis")).toBeInTheDocument();
  });

  it("loses both when they are withheld — which is the outage, measured", async () => {
    // The design record's `SIGNED-IN devtools panel present: false`, reproduced. Without
    // this case, the assertion above would be satisfied by a panel that always renders and
    // the re-key below would be guarding nothing.
    const user = userEvent.setup();
    renderCity(await cityWithBuildings(), false);
    await openMenu(user);

    expect(screen.queryByRole("heading", { name: /Simulate lessons/ })).toBeNull();
    expect(screen.queryByTestId("dev-seed-crisis")).toBeNull();
  });
});

describe("App does not gate a dev control on auth state", () => {
  it("derives a real population of dev controls", () => {
    // Floors on both derivations. Either regex silently ceasing to match would leave an
    // empty set that every check below would pass.
    expect(DEV_PROPS.length).toBeGreaterThanOrEqual(3);
    expect(DEV_PROPS).toEqual([
      "onDevAdvanceMastery",
      "onDevLessonTaught",
      "onDevSetStage",
    ]);
    expect(PASSED.size).toBe(DEV_PROPS.length);
  });

  it("keys none of them on `authedCity`", () => {
    for (const [prop, expression] of PASSED) {
      expect(
        expression,
        `\`${prop}\` is gated on auth state. Sign-in is required, so that withholds the ` +
          "whole Developer stand-in panel from the team — see this file's header",
      ).not.toMatch(/authedCity|hasCognitoAuth|studentId/);
    }
  });

  it("keys all of them on the SAME predicate", () => {
    // The panel needs any one of the three and the crisis seed control needs
    // `onDevAdvanceMastery` specifically, so two gates disagreeing is how the panel
    // half-disappears — a state harder to diagnose than losing it outright.
    const gates = new Set(
      [...PASSED.values()].map((expression) => expression.split("?")[0]?.trim()),
    );
    expect(gates.size).toBe(1);
    expect([...gates][0]).toBe("devControlsEnabled");
  });

  it("resolves that predicate from the deployment shape, not from a signed-in student", () => {
    // The identifier alone proves nothing: this pins what it is assigned FROM, which is the
    // whole content of the re-key. `isDevPersistenceEnabled()` is `!isServerBacked(true)`.
    expect(APP_SOURCE).toMatch(/const devControlsEnabled = isDevPersistenceEnabled\(\);/);
  });
});

/**
 * **A COMMENT NAMING A GATE IS A COPY OF THAT GATE, AND THERE IS NEVER ONE COPY.**
 *
 * Re-keying the props left three comments in this lane describing the old gate as the live
 * one, and only the first was noticed by hand: `CrisisSeedControl.tsx` (*"which `App.tsx`
 * withholds from a signed-in student"*), `winter/WinterEntryChip.tsx` (which cited the panel's
 * auth gate as the counter-example for its own choice of gate, so the re-key turned that foil
 * into a precedent), and `winter/winterDevSkipIsGated.test.tsx`. All three were true when
 * written and false the moment the props moved.
 *
 * A one-time sweep does not survive the next change, so the sweep is the guard. The
 * population is every source in the web lane, derived rather than listed, and the patterns are
 * the two shapes those three comments actually took: the old expression quoted verbatim, and
 * the "withholds it from a signed-in ___" paraphrase.
 *
 * ## What it does and does not catch, because a guard that oversells itself is worse than none
 *
 * The first pattern is the strong one: **any** comment that quotes the dead expression is
 * caught, wherever it is and whatever it says around it. The second is a literal phrase, so a
 * future stale comment worded differently would slip past — what this buys is that the exact
 * three phrasings that were wrong three times cannot come back, which is the whole of the
 * observed defect rather than a guess about it.
 *
 * It also disciplines the CORRECTIONS. Every one of the three fixed comments first cited the
 * dead expression verbatim to explain its own history, and this sweep rejected all three —
 * correctly, because three copies of a dead gate in the tree is how the next reader loses track
 * of which one is live. They now describe the old gate instead of reproducing it.
 *
 * ## Scoped to `apps/web/src`, and why that is the behaviour and not the implementation
 *
 * The gate lives here and so does everything that can describe it: no service, package or
 * engine can see `App.tsx`'s props. Design records under `docs/` are deliberately OUT — a
 * record quotes the state it was written against on purpose, and §11.3 of the persistence
 * design is marked RESOLVED with its analysis kept rather than rewritten, which would be
 * fiction.
 */
const WEB_SOURCES = import.meta.glob("../**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** The old gate, quoted. */
const QUOTES_THE_AUTH_GATE = /authedCity\s*\?\s*undefined/;

/** The same claim in prose, which is the form two of the three stale comments took. */
const SAYS_IT_IS_WITHHELD_FROM_THE_SIGNED_IN =
  /withh\w+\s+(?:them\s+|it\s+)?from a signed-in/i;

/**
 * The three sentences as they actually stood before `#373`, verbatim, as POSITIVE CONTROLS.
 *
 * The sweep below asserts the lane matches NOTHING, and an assertion that a set is empty is
 * satisfied just as well by a regex that has stopped matching anything at all — a typo in
 * either pattern would leave this file green over a lane full of stale comments. So each
 * pattern is separately shown to match the text it was written for, which is a claim about the
 * pattern rather than about the tree and does not go quiet when the tree is clean.
 *
 * **There is no exception list, and its absence is structural rather than an oversight.** The
 * one file that has to quote the dead gate is this one, and `import.meta.glob` excludes the
 * module doing the globbing — so this file cannot appear in its own population, and an
 * exception naming it would exempt nothing. Every other historical citation in the lane is
 * phrased to describe the old gate rather than reproduce it.
 */
const PRE_FIX_SENTENCES: readonly { where: string; text: string }[] = [
  {
    where: "city/CrisisSeedControl.tsx",
    text:
      "it is rendered exactly when the mastery stand-ins are, which `App.tsx` withholds " +
      "from a signed-in student.",
  },
  {
    where: "winter/winterDevSkipIsGated.test.tsx",
    text: "mount passes the dev props directly; `App.tsx` withholds them from a signed-in student.",
  },
  {
    where: "winter/WinterEntryChip.tsx",
    text:
      "The live-auth gate the Developer stand-in panel hangs on (`authedCity ? undefined : " +
      "...` in `App.tsx`) is null for the first frames of a real signed-in session",
  },
];

/**
 * `path -> source`, keyed relative to `apps/web/src`.
 *
 * Vite hands back keys relative to THIS file, and it normalises a sibling to `./Name.tsx`
 * rather than `../city/Name.tsx` — so a `./` key means "in this file's own directory", which
 * is `city/`. The floor case below asserts all three shapes resolved (`App.tsx`,
 * `city/CrisisSeedControl.tsx`, `winter/WinterEntryChip.tsx`), so a normalisation that broke
 * fails there rather than quietly emptying the sweep.
 */
function webLaneSources(): Map<string, string> {
  const sources = new Map<string, string>();
  for (const [path, source] of Object.entries(WEB_SOURCES)) {
    const relative = path.startsWith("./")
      ? `city/${path.slice(2)}`
      : path.replace(/^(?:\.\.\/)+/, "");
    sources.set(relative, source);
  }
  return sources;
}

const LANE = webLaneSources();
const OFFENDERS = [...LANE.entries()]
  .filter(
    ([, source]) =>
      QUOTES_THE_AUTH_GATE.test(source) ||
      SAYS_IT_IS_WITHHELD_FROM_THE_SIGNED_IN.test(source),
  )
  .map(([path]) => path)
  .sort();

describe("no comment in the web lane still describes the dev gate as auth-keyed", () => {
  it("sweeps a real population", () => {
    // A floor on the glob, and on the three files the fixed comments live in. The sweep's
    // conclusion is "nothing matched", which an empty population satisfies for free.
    expect(LANE.size).toBeGreaterThanOrEqual(100);
    expect(LANE.has("App.tsx")).toBe(true);
    expect(LANE.has("city/CrisisSeedControl.tsx")).toBe(true);
    expect(LANE.has("winter/WinterEntryChip.tsx")).toBe(true);
    expect(LANE.has("winter/winterDevSkipIsGated.test.tsx")).toBe(true);
  });

  it("uses patterns that match the sentences that were actually wrong", () => {
    // The positive control. Without it, "nothing matched" would also be the report from two
    // regexes that had stopped matching anything.
    expect(PRE_FIX_SENTENCES).toHaveLength(3);
    for (const { where, text } of PRE_FIX_SENTENCES) {
      expect(
        QUOTES_THE_AUTH_GATE.test(text) ||
          SAYS_IT_IS_WITHHELD_FROM_THE_SIGNED_IN.test(text),
        `neither pattern matches the sentence ${where} used to carry, so this sweep would ` +
          "not have caught the defect it exists for",
      ).toBe(true);
    }
    // Each pattern carries its own weight: one of them alone would leave a real form uncaught.
    expect(PRE_FIX_SENTENCES.filter((s) => QUOTES_THE_AUTH_GATE.test(s.text))).toHaveLength(
      1,
    );
    expect(
      PRE_FIX_SENTENCES.filter((s) => SAYS_IT_IS_WITHHELD_FROM_THE_SIGNED_IN.test(s.text)),
    ).toHaveLength(2);
  });

  it("finds none of it left in the lane", () => {
    expect(OFFENDERS).toEqual([]);
  });
});
