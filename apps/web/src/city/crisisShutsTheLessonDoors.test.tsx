import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { devSessionStore, withDevPersistence } from "../devPersistence/devSession";
import { faceTheWinter } from "../test/faceTheWinter";
import { CitySurface } from "./CitySurface";
import { type CityDevSession, createCityDevSession, D1_NODE_IDS } from "./citySession";
import { openBuiltShelf } from "./test/openBuiltShelf";

/**
 * **WHILE A CRISIS IS RUNNING, THE CITY'S OWN DOORS INTO A LESSON ARE SHUT.**
 *
 * The report was one door: *"a click on the island goes to the crisis and a click on a roster
 * row still opens a lesson popup underneath the crisis panel"* (#527's own list of what it
 * left open). The roster row was the instance. It was not the class.
 *
 * ## Why the island had a gate and nothing else did
 *
 * The island's `onSelect` checked the winter's published board and handed the click to the
 * crisis. That check is in the right place for the island, and it was the whole of what
 * existed: FOUR OTHER CONTROLS reach the same lesson popup through `openLessonPopup`, and two
 * more surfaces (the checkpoint and the build menu) are takeovers of their own. Measured at
 * `51c0a7d6`, before any fix, six of them were open:
 *
 *   a roster row opened a lesson popup while the crisis was running
 *   an unplaced roster row started a placement while the crisis was running
 *   the ready-to-build card started a placement while the crisis was running
 *   the roster's island-hub row opened the hub panel while the crisis was running
 *   the Build button opened the build menu while the crisis was running
 *   the town popover opened the storm encounter while the crisis was running
 *
 * A guard written for "the roster row" would have gone green over the other five, which is
 * exactly the shape `.cursor/rules/qa-verification.mdc` records: a population scoped to where
 * the mechanic was noticed rather than to what exhibits the behaviour.
 *
 * ## What this file measures, and in which direction
 *
 *  - **the doors, driven**: each control is pressed on a real city with a real winter running
 *    over it, and the assertion is about what is ON SCREEN afterwards rather than about which
 *    function was called. The press comes BEFORE the `disabled` check in every case, so a
 *    regression fails at the surface rather than at the attribute;
 *  - **the refusal is legible**: each of those controls is `disabled`, because a live control
 *    that swallows a press reads as broken and a greyed one reads as unavailable;
 *  - **the census**, over `CitySurface.tsx`'s own source, so a seventh door added tomorrow is
 *    not something this file has to be told about. The population is every statement in the
 *    file that opens one of the surfaces, derived by reading the source rather than by listing
 *    what is already known;
 *  - **the exceptions**, named, with the pair of assertions that makes an exemption provable:
 *    one that fails when a listed entry stops qualifying, one that fails when it quietly adopts
 *    the behaviour it was excused from.
 *
 * `crisisShutsTheLessonDoors.browser.test.tsx` carries the one exception that cannot be driven
 * here — the island's own click needs a live canvas to raycast against.
 */

/** A cell for each skill, clear of the hub's reserved block. Mirrors `ruinLessonAccess`. */
const CELL_FOR: Readonly<Record<string, { col: number; row: number }>> = {
  "NUM.S": { col: 2, row: 2 },
  "NUM.F": { col: 0, row: 3 },
  "NUM.2": { col: -3, row: 2 },
  "NUM.3": { col: 3, row: -2 },
  "NUM.4": { col: -3, row: -2 },
  "NUM.5": { col: 0, row: -3 },
};

let key = "";

beforeEach(() => {
  key = devSessionStore.storageKey();
  window.localStorage.removeItem(key);
});

afterEach(() => {
  window.localStorage.removeItem(key);
});

/**
 * Era one placed and mastered, through the session's own writes.
 *
 * `leaveUnplaced` holds the last N skills back so the roster draws an EMPTY row, which is the
 * other half of what a roster row does: a placed row opens a lesson, and an unplaced one breaks
 * ground on the island the crisis is being played on.
 */
async function aCity(leaveUnplaced = 0): Promise<CityDevSession> {
  const session = withDevPersistence(createCityDevSession(), devSessionStore);
  for (const nodeId of D1_NODE_IDS.slice(0, D1_NODE_IDS.length - leaveUnplaced)) {
    const cell = CELL_FOR[nodeId];
    if (!cell) {
      throw new Error(`no test cell for ${nodeId}`);
    }
    await session.placeSkill(nodeId, { ...cell, rot: 0 });
    await session.advanceMasteryDev(nodeId, 3);
  }
  devSessionStore.flush();
  return session;
}

let openedSurfaces: string[] = [];

function renderCity(session: CityDevSession) {
  openedSurfaces = [];
  return render(
    <CitySurface
      enableCanvas={false}
      reducedMotion
      loadCity={session.load}
      onPlaceSkill={session.placeSkill}
      onMoveSkill={session.moveSkill}
      onDevAdvanceMastery={session.advanceMasteryDev}
      onCarryCrisisDamage={session.recordCrisisDamage}
      onOpenSurface={(surface) => openedSurfaces.push(surface)}
    />,
  );
}

/** ☰ Menu → Hard Winter → the advisor's slides → "Face the winter". The player's own route. */
async function openTheWinter(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("button", { name: "Build" });
  await user.click(screen.getByRole("button", { name: "Menu" }));
  const others = screen.getByRole("navigation", { name: "Other places" });
  await user.click(within(others).getByRole("button", { name: /Hard Winter/i }));
  await faceTheWinter(user);
  return await screen.findByTestId("winter-in-city");
}

function q<T extends Element>(selector: string): T | null {
  return document.querySelector<T>(selector);
}

/* -------------------------------------------------------------------------- */
/* The doors, driven                                                          */
/* -------------------------------------------------------------------------- */

describe("a crisis shuts the city's doors into a lesson", () => {
  it("a placed roster row opens no lesson popup", async () => {
    const user = userEvent.setup();
    renderCity(await aCity());

    await openBuiltShelf(user);
    const row = q<HTMLButtonElement>('button.city-plot[data-node-id="NUM.S"]');
    expect(row, "the roster is not listing this city's buildings").not.toBeNull();

    await openTheWinter(user);

    // THE PRESS FIRST, and the surface assertion before the `disabled` one. Ordered rather
    // than incidental: `disabled` is a real defence in its own right, so a `disabled` check
    // ahead of the press would abort every one of these cases before the thing they are
    // actually about — what is on screen — had been looked at. Injecting both halves back out
    // of `CitySurface` fails HERE, with the sentence the defect was reported as.
    await user.click(row as HTMLButtonElement);
    expect(
      q(".building-callout"),
      "a roster row opened a lesson popup while the crisis was running",
    ).toBeNull();

    // AND THE REFUSAL IS LEGIBLE, which is the product half: a control that silently ignores a
    // press reads as broken, and this one says it is unavailable before it is pressed.
    expect(
      (row as HTMLButtonElement).disabled,
      "the roster row is still live during a crisis, so a press on it reads as broken",
    ).toBe(true);
  }, 120000);

  it("an unplaced roster row breaks no ground on the crisis's own board", async () => {
    const user = userEvent.setup();
    renderCity(await aCity(1));

    await openBuiltShelf(user);
    const row = q<HTMLButtonElement>('button.city-plot[data-empty="true"]');
    expect(row, "no unplaced roster row in this fixture").not.toBeNull();

    await openTheWinter(user);
    await user.click(row as HTMLButtonElement);

    // `CityScene` drops the winter's aim plane while a placement is up, so this is not a
    // cosmetic overlap: it would stop fires being placeable with nothing on screen saying why.
    expect(
      q(".hud-placement"),
      "an unplaced roster row started a placement while the crisis was running",
    ).toBeNull();
    expect(
      (row as HTMLButtonElement).disabled,
      "the unplaced roster row is still live during a crisis",
    ).toBe(true);
  }, 120000);

  it("the ready-to-build card breaks no ground", async () => {
    const user = userEvent.setup();
    renderCity(await aCity(1));

    // A SELECTION MADE BEFORE THE CRISIS, which is the only way this card is on screen during
    // one: it needs a selected, unplaced skill and no placement running. Starting a placement
    // and cancelling it leaves exactly that, and it is what a player who changed their mind
    // just before the winter arrived would be looking at.
    await openBuiltShelf(user);
    await user.click(q('button.city-plot[data-empty="true"]') as HTMLButtonElement);
    await user.keyboard("{Escape}");
    const card = await screen.findByRole("button", { name: /Build it/ });

    await openTheWinter(user);
    await user.click(card);
    expect(
      q(".hud-placement"),
      "the ready-to-build card started a placement while the crisis was running",
    ).toBeNull();
    expect(
      (card as HTMLButtonElement).disabled,
      "the ready-to-build card is still offering to break ground during a crisis",
    ).toBe(true);
  }, 120000);

  it("the roster's island-hub row opens no hub panel", async () => {
    const user = userEvent.setup();
    renderCity(await aCity());
    await openBuiltShelf(user);
    const hub = screen.getByTestId("town-hall-roster-entry") as HTMLButtonElement;
    await openTheWinter(user);
    await user.click(hub);
    expect(
      q('[data-testid="town-hall-panel"]'),
      "the roster's island-hub row opened the hub panel while the crisis was running",
    ).toBeNull();
    expect(hub.disabled, "the island-hub row is still live during a crisis").toBe(true);
  }, 120000);

  it("the Build button opens no build menu", async () => {
    const user = userEvent.setup();
    renderCity(await aCity());
    await screen.findByRole("button", { name: "Build" });
    await openTheWinter(user);
    const build = q<HTMLButtonElement>(".city-build-button");
    expect(build, "the dock is not drawing a Build button").not.toBeNull();
    await user.click(build as HTMLButtonElement);
    // Every placed building is a "Built" card in here, and activating one runs straight into
    // the lesson popup — so the menu is a door into a lesson and not only a shop.
    expect(
      q(".build-card[data-node-id]"),
      "the Build button opened the build menu while the crisis was running",
    ).toBeNull();
    expect(
      (build as HTMLButtonElement).disabled,
      "the Build button is still live during a crisis",
    ).toBe(true);
  }, 120000);

  it("the town status popover opens no checkpoint", async () => {
    const user = userEvent.setup();
    renderCity(await aCity());
    await screen.findByRole("button", { name: "Build" });
    await openTheWinter(user);
    await user.click(screen.getByRole("button", { name: /Open the town status/ }));
    const popover = q<HTMLElement>("#city-town-popover");
    expect(popover, "the town status popover did not open").not.toBeNull();
    const storm = within(popover as HTMLElement).getByRole("button");
    await user.click(storm);
    expect(
      screen.queryByText("Neighborhood checkpoint"),
      "the town popover opened the storm encounter while the crisis was running",
    ).toBeNull();
    expect(
      (storm as HTMLButtonElement).disabled,
      "the checkpoint entry is still live during a crisis",
    ).toBe(true);
  }, 120000);
});

/* -------------------------------------------------------------------------- */
/* The exceptions                                                             */
/* -------------------------------------------------------------------------- */

/**
 * **THE CONTROLS THAT MAY OPEN A LESSON AND STILL STAY LIVE THROUGH A CRISIS.**
 *
 * Declared rather than left out of the sweep, which is the whole point of naming them: a
 * control that legitimately stays live and a control that was forgotten look identical from
 * outside the guard, and the second one is how the roster row shipped. Each entry is asserted
 * BOTH ways — it is still on screen and still live, and it still does not put a lesson over the
 * crisis — so a deleted entry cannot sit here exempting nothing, and one that starts opening a
 * lesson cannot go on being excused by a list that has stopped describing it.
 */
const STAYS_LIVE_DURING_A_CRISIS: readonly { id: string; why: string; where: string }[] = [
  {
    id: "the ☰ Menu's other-places launcher",
    // It is a route change and not a surface over the island: the city unmounts and the crisis
    // goes with it, so nothing it opens can be underneath the crisis panel. Leaving has to stay
    // possible in any case — D-CRISIS-10's ruling that a learner may always walk away is why
    // "Not yet" and Escape are ungated on the briefing too.
    why: "it leaves the city rather than opening anything over it",
    where: "this file",
  },
  {
    id: "the 3D island's building click",
    // The island IS the crisis's board: a click on a building is how "Reinforce" is aimed. It
    // is the one control that must stay live and must NOT do what it does off a crisis, so its
    // pair of assertions needs a canvas to raycast against.
    why: "it is the crisis's own board, and the click is how an action is aimed",
    where: "crisisShutsTheLessonDoors.browser.test.tsx",
  },
];

describe("the exceptions stay live, and stay honest", () => {
  it("the other-places launcher is still on screen and still live during a crisis", async () => {
    const user = userEvent.setup();
    renderCity(await aCity());
    await openTheWinter(user);

    // DIRECTION ONE. A launcher that was removed, or that became disabled, would leave the
    // entry above exempting nothing at all — and would take away the way out of a city the
    // crisis has, which is the reason it is excused in the first place.
    await user.click(screen.getByRole("button", { name: "Menu" }));
    const others = screen.getByRole("navigation", { name: "Other places" });
    const lessons = within(others).getByRole("button", { name: /^Lessons$/ });
    expect(
      (lessons as HTMLButtonElement).disabled,
      "the launcher is disabled, so the exception excuses nothing",
    ).toBe(false);

    await user.click(lessons);
    expect(
      openedSurfaces,
      "the launcher did not ask for a surface, so it is not live",
    ).toEqual(["lessons"]);

    // DIRECTION TWO. It is excused because it LEAVES; a launcher that started rendering a
    // lesson over the city would be doing the very thing the list says it does not.
    for (const [what, selector] of [
      ["a lesson popup", ".building-callout"],
      ["the build menu", ".build-card[data-node-id]"],
      ["a placement ghost", ".hud-placement"],
    ] as const) {
      expect(
        q(selector),
        `the other-places launcher opened ${what} over the crisis`,
      ).toBeNull();
    }
  }, 120000);

  it("every declared exception names a control, a reason, and where it is measured", () => {
    // A list whose entries are blank is a list that excuses everything, and an entry with no
    // stated home is one nobody has to prove.
    for (const entry of STAYS_LIVE_DURING_A_CRISIS) {
      expect(entry.id.length, "an exception with no name").toBeGreaterThan(0);
      expect(entry.why.length, `${entry.id} is excused with no reason`).toBeGreaterThan(0);
      expect(
        entry.where.length,
        `${entry.id} does not say where its two assertions live`,
      ).toBeGreaterThan(0);
    }
    expect(new Set(STAYS_LIVE_DURING_A_CRISIS.map((e) => e.id)).size).toBe(
      STAYS_LIVE_DURING_A_CRISIS.length,
    );
  });
});

/* -------------------------------------------------------------------------- */
/* The census                                                                 */
/* -------------------------------------------------------------------------- */

// DEFAULTED rather than asserted non-null: a glob that stops resolving has to reach the
// assertion below as an empty population and FAIL there, saying so, instead of throwing a
// `TypeError` somewhere that reads like the harness rather than like the tree.
const CITY_SURFACE_SOURCE =
  (
    import.meta.glob(["./CitySurface.tsx"], {
      query: "?raw",
      import: "default",
      eager: true,
    }) as Record<string, string>
  )["./CitySurface.tsx"] ?? "";

/**
 * **THE STATE THAT PUTS A SURFACE OVER THE ISLAND, one entry per surface.**
 *
 * This is the population's definition, and it is stated in terms of what the player ENDS UP
 * LOOKING AT rather than in terms of `openLessonPopup`, which is where the defect came from:
 * `openLessonPopup` is one implementation shared by four controls, and scoping to it would
 * have left the checkpoint, the build menu and the placement ghost outside a guard whose whole
 * subject is "what can be on screen over a crisis".
 *
 * A surface can only appear if its state was set, so every statement that sets one of these to
 * an OPEN value is a door — wherever it lives, and whoever calls it.
 */
const SURFACE_STATE: Readonly<Record<string, string>> = {
  // The anchored popup: a building's lesson menu, the island hub's panel, a civic panel.
  setLessonPopupNodeId: "the anchored lesson popup",
  // The lesson host itself: teaching, the CFU, the practice set, the endless drill.
  setEnteredNodeId: "the lesson scene",
  // The island hub's interleaved drill, which is a lesson takeover of its own.
  setInterleavedOpen: "interleaved practice",
  // The neighbourhood checkpoint: a full-screen encounter of practice items.
  setStormOpen: "the storm checkpoint",
  // The build menu. Every placed building is a "Built" card in it, and activating one runs
  // into the lesson popup, so this is a door into a lesson and not only into a shop.
  setShopOpen: "the build menu",
  // The placement ghost, which takes the crisis's own aim plane away from it.
  setPlacement: "a placement over the island",
};

/** The gate, as a STATEMENT. A dependency-array mention is not a gate and must not read as one. */
const GATE = /if \(!?crisisHasTheIsland\)/;

/**
 * The source with comments and string literals blanked out, positions preserved.
 *
 * Paren-matching over raw source would be at the mercy of a bracket inside a sentence, and this
 * file is mostly sentences. Blanked rather than removed so every index below still points at the
 * same character of the original.
 */
function code(source: string): string {
  const out = source.split("");
  let at = 0;
  const blank = (from: number, to: number) => {
    for (let i = from; i < to && i < out.length; i += 1) {
      if (out[i] !== "\n") {
        out[i] = " ";
      }
    }
  };
  while (at < source.length) {
    const two = source.slice(at, at + 2);
    if (two === "//") {
      const end = source.indexOf("\n", at);
      const to = end === -1 ? source.length : end;
      blank(at, to);
      at = to;
    } else if (two === "/*") {
      const end = source.indexOf("*/", at + 2);
      const to = end === -1 ? source.length : end + 2;
      blank(at, to);
      at = to;
    } else if (source[at] === '"' || source[at] === "'" || source[at] === "`") {
      const quote = source[at];
      let i = at + 1;
      while (i < source.length && source[i] !== quote) {
        i += source[i] === "\\" ? 2 : 1;
      }
      blank(at, i + 1);
      at = i + 1;
    } else {
      at += 1;
    }
  }
  return out.join("");
}

/** Every `const NAME = useCallback(…)` in the file, with the span of the whole call. */
function callbackBlocks(source: string): { name: string; from: number; to: number }[] {
  const found: { name: string; from: number; to: number }[] = [];
  for (const match of source.matchAll(/const (\w+) = useCallback\(/g)) {
    const from = match.index ?? 0;
    let at = from + match[0].length;
    let depth = 1;
    while (at < source.length && depth > 0) {
      if (source[at] === "(") {
        depth += 1;
      } else if (source[at] === ")") {
        depth -= 1;
      }
      at += 1;
    }
    found.push({ name: match[1] as string, from, to: at });
  }
  return found;
}

/** A write that OPENS: not `null`, not `false`, and not the updater form a live one takes. */
function opensSomething(argument: string): boolean {
  return !/^\s*(null|false|\(current\))/.test(argument);
}

interface Door {
  /** The state it sets, so the census can be asked which surfaces it still reaches. */
  readonly setter: string;
  /** The `useCallback` it sits in, or `null` when it is loose in the render tree. */
  readonly handler: string | null;
  /** The line it is on, so a failure names something a reader can go and look at. */
  readonly line: number;
  /** The opening argument, so documented exceptions are structural rather than line-number based. */
  readonly argument: string;
}

const SOURCE_CODE = code(CITY_SURFACE_SOURCE);
const BLOCKS = callbackBlocks(SOURCE_CODE);

const DOORS: Door[] = (() => {
  const found: Door[] = [];
  for (const setter of Object.keys(SURFACE_STATE)) {
    for (const match of SOURCE_CODE.matchAll(new RegExp(`\\b${setter}\\(`, "g"))) {
      const at = match.index ?? 0;
      const argument = SOURCE_CODE.slice(at + match[0].length, at + match[0].length + 24);
      if (!opensSomething(argument)) {
        continue;
      }
      const block = BLOCKS.find((b) => at > b.from && at < b.to);
      found.push({
        setter,
        handler: block?.name ?? null,
        line: SOURCE_CODE.slice(0, at).split("\n").length,
        argument,
      });
    }
  }
  return found;
})();

/**
 * Loose doors: an opening write that is not inside a `useCallback`.
 *
 * There is one initialization-only exception, and the assertion is here rather than the fact
 * being assumed: a handler
 * written inline in the render tree is outside every block this census reads, so it would be a
 * door the census could not see — which is how a sweep goes quietly green over the thing it was
 * written for. The two celebration popups used to set `shopOpen` inline; they call `openShop`
 * now, which is why this list is empty.
 */
function isAllowedLooseDoor(door: Door): boolean {
  // Initial load restores a requested review fixture; it is not a user-triggered door.
  // Match the reason it is allowed, not its source line, which moves under unrelated edits.
  return (
    door.setter === "setLessonPopupNodeId" &&
    door.argument.trimStart().startsWith("initialOpenBuildingId")
  );
}

describe("the census: every door into a surface consults the crisis gate", () => {
  it("the census parsed the file rather than an empty string", () => {
    // `#193`'s failure mode: a population that has silently become empty reads exactly like a
    // population with nothing wrong in it.
    expect(
      CITY_SURFACE_SOURCE.length,
      "CitySurface.tsx did not load as raw",
    ).toBeGreaterThan(100_000);
    expect(
      BLOCKS.length,
      "the paren match found almost no useCallback, so the census is measuring a broken parse",
    ).toBeGreaterThanOrEqual(40);
  });

  it("the census found doors at all", () => {
    // THE FLOOR. Nine opening writes today. A floor rather than a count to maintain: a door
    // added needs no edit here, and a census that stops finding anything fails instead of
    // passing vacuously.
    expect(
      DOORS.length,
      `the census found ${DOORS.length} doors into a surface`,
    ).toBeGreaterThanOrEqual(9);
  });

  it.each(Object.entries(SURFACE_STATE).map(([setter, surface]) => [surface, setter]))(
    "the census still watches %s (%s)",
    (surface, setter) => {
      // THE SHAPE, WHICH A FLOOR CANNOT CONSTRAIN. Nine of anything satisfies a floor of nine,
      // including nine writes to the lesson popup alone — which is exactly the narrow reading
      // that produced the defect, since `openLessonPopup` was the layer everybody could see.
      // Each surface is its own case so that losing ONE of them fails at the one it lost,
      // rather than being absorbed by the others still being there.
      expect(
        DOORS.filter((door) => door.setter === setter).length,
        `the census found no door into ${surface} (${setter}), so it has stopped watching it`,
      ).toBeGreaterThanOrEqual(1);
    },
  );

  it("the doors are spread across handlers, rather than nine writes in one", () => {
    expect(
      new Set(DOORS.map((door) => door.handler)).size,
      "every door the census found is in one handler, so this is a one-caller sweep again",
    ).toBeGreaterThanOrEqual(8);
  });

  it.each(
    DOORS.filter((door) => door.handler !== null).map(
      (door) => [`${door.handler}:${door.line} (${door.setter})`, door] as const,
    ),
  )("%s consults the crisis gate", (_label, door) => {
    const block = BLOCKS.find((b) => b.name === door.handler);
    expect(
      block,
      `line ${door.line} opens ${SURFACE_STATE[door.setter]} outside every handler this ` +
        "census can read, so nothing here is checking it",
    ).toBeDefined();
    expect(
      SOURCE_CODE.slice((block as { from: number }).from, (block as { to: number }).to),
      `${door.handler} opens ${SURFACE_STATE[door.setter]} without asking whether a crisis ` +
        "has the island",
    ).toMatch(GATE);
  });

  it("no door sits outside a handler, where the census could not see it", () => {
    const unexpected = DOORS.filter(
      (door) => door.handler === null && !isAllowedLooseDoor(door),
    ).map((door) => `${door.setter} at line ${door.line}`);
    expect(unexpected).toEqual([]);
  });
});
