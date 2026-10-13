import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { canPlayCrisisIn, resolveCrisisEra } from "../winter/crisisEra";
import { WINTER_NODE_ORDER } from "../winter/hardWinterItems";
import { WinterRoute } from "../winter/WinterRoute";
import { advisorDressFor } from "./advisorDress";
import { hasPlayableCrisis } from "./crisisCall";
import { CitySurface } from "./CitySurface";
import { crisisBriefingForCity, forgetCrisisBriefingRead } from "./crisisCall";
import { CURRENT_ERA_ID } from "./eraDressing";
import { MOCK_NODE_STATES } from "./mockCity";
import { resetCityEra, setCityEra } from "./useCityEra";

/**
 * **THE ADVISOR IN FRONT OF THE WINTER WEARS THE ERA THE CITY IS STANDING IN, NOT THE ERA
 * WHOSE BOARD IT BORROWED.**
 *
 * `crisisBriefingForCity` resolves the board first (`resolveCrisisEra`, which falls back to
 * the earliest era whose winter is built) and then overrides the name and the costume with
 * the LIVE era's, off one `resolveEraAdvisor` call. The override is three tokens long:
 * `advisorDress: advisor.dress`. Take it out and the card puts era one's hide tunic and
 * stone hood on an advisor standing in era six, on the surface where he is largest on
 * screen.
 *
 * ## Why this file exists: the override shipped unguarded
 *
 * Measured, not assumed. During #385's merge resolution the author injected the exact defect
 * a bad merge of `crisisCall.ts` would produce — the briefing keeping the BOARD's costume
 * instead of taking the live era's — and ran the gates over it:
 *
 * ```
 * npm run typecheck    exit 0
 * npm run test:unit    302 files, 7229 tests, exit 0
 * npm run test:browser 135 files, 1700 tests, exit 0
 * ```
 *
 * Nothing in either suite moved. `advisorDress.test.ts` pins the ten costumes as data,
 * `eraAdvisor.test.tsx` drives the CEREMONY's costume in all ten eras, and `crisisCall.ts`'s
 * own suite reads the briefing's copy — so the wardrobe was covered, the ceremony was
 * covered, and the one surface whose costume depends on TWO eras at once was covered by
 * nobody.
 *
 * ## Era one is the degenerate case, so it is the control and never the guard
 *
 * In era one the board is the city's own age: `resolveCrisisEra("prehistoric").board` is
 * `"live"`, so the board's costume and the live era's are the same object and an assertion
 * there passes with the override deleted. That is exactly the shape of a green-over-nothing
 * guard, so every assertion that MEASURES the override runs at an era whose board is
 * borrowed, and era one appears only as the control that stops the drawn-costume assertion
 * being satisfied by a constant.
 *
 * ## Three layers, because the defect can enter at three heights
 *
 *  1. **The decision** — {@link crisisBriefingForCity} at every era whose board is borrowed,
 *     nine of them, against the two costumes that are actually in play there.
 *  2. **The drawing** — the two doors a player can meet the advisor through, mounted, with
 *     the costume read off the rendered figure rather than off the briefing.
 *  3. **The population** — every source in the app that draws, decides or carries a costume,
 *     derived from the tree and classified, so a NEW crisis surface that grows its own
 *     advisor cannot land outside the sweep by not importing any of this.
 */

/* -------------------------------------------------------------------------- */
/* The population, read off the tree                                           */
/* -------------------------------------------------------------------------- */

/**
 * Every non-test source in the web app, as text.
 *
 * `import.meta.glob` with `?raw` rather than `node:fs`, which is the house style for a source
 * read in this lane and not a preference: the web project has no node types, so a
 * `readFileSync` version does not typecheck (see `devControlsAreNotAuthGated.test.tsx`).
 *
 * The glob is the whole of `apps/web/src` on purpose. A path-shaped sweep — `city/**`, say —
 * would answer for where the crisis advisor lives TODAY, and the failure this file is written
 * against is a surface acquiring an advisor somewhere else.
 */
const SOURCES = import.meta.glob(["../**/*.{ts,tsx}", "!../**/*.test.{ts,tsx}"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/**
 * A glob key as a path under `apps/web/src`, so a failure names a file somebody can open.
 *
 * The glob is written from `city/`, so `./x.ts` is `city/x.ts` and `../winter/x.tsx` is
 * `winter/x.tsx`.
 */
function underSrc(globPath: string): string {
  return globPath.startsWith("./") ? `city/${globPath.slice(2)}` : globPath.slice(3);
}

const TREE: readonly (readonly [string, string])[] = Object.entries(SOURCES)
  .map(([path, source]) => [underSrc(path), source] as const)
  .sort(([left], [right]) => left.localeCompare(right));

function sourceOf(path: string): string {
  const found = TREE.find(([known]) => known === path);
  if (!found) {
    throw new Error(
      `the glob did not reach ${path}, so anything this file says about it is worthless`,
    );
  }
  return found[1];
}

/** A door: a surface that puts the crisis entry card, and so the advisor, on screen. */
const OPENS_THE_CARD = /<CrisisCallAdvisor\b/;

/** DRAWS a costume. `OruAdvisorCharacter` is the only component that paints one. */
const DRAWS_A_COSTUME = /<OruAdvisorCharacter\b/;

/** DECIDES a costume, by turning an era id into one. The two resolvers there are. */
const DECIDES_A_COSTUME = /\b(?:advisorDressFor|resolveEraAdvisor)\s*\(/;

/** CARRIES a costume as data: declares, stores or forwards an `AdvisorDress`. */
const CARRIES_A_COSTUME = /\bAdvisorDress\b/;

/**
 * HANDS A COSTUME ON: reads the `advisorDress` a briefing arrived with and passes it toward the
 * screen without deciding anything.
 *
 * **A FOURTH WAY OF BEING A COSTUME SITE, added when the presentation was extracted.** The
 * crisis card used to draw the figure itself, so `DRAWS_A_COSTUME` reached it; it now renders
 * `AdvisorSpeech` and hands `briefing.advisorDress` over, which made it match none of the three
 * patterns above and dropped it out of `COSTUME_SITES` entirely. That is the population
 * narrowing by an unrelated refactor, and it is precisely the shape
 * `.cursor/rules/qa-verification.mdc` warns about: the file whose costume depends on two eras at
 * once would have gone back to being covered by nobody.
 *
 * A MEMBER ACCESS rather than the bare identifier, deliberately. `\badvisorDress\b` matches the
 * property being DECLARED (`crisisCall.ts`, already in the sweep) and a comment mentioning the
 * word, so it would classify files on their prose. `.advisorDress` is a read of somebody else's
 * costume, which is exactly the behaviour: measured at this tip, it matches one file.
 */
const FORWARDS_A_COSTUME = /\.advisorDress\b/;

/**
 * TOUCHES THE CRISIS: resolves the borrowed board, or handles the briefing that carries the
 * costume across it. Deliberately narrower than the word "crisis" — six of the seven declared
 * exceptions below mention a crisis or the winter in their prose, and a prose match would
 * classify the wardrobe table as a crisis surface.
 */
const TOUCHES_THE_CRISIS =
  /\bresolveCrisisEra\s*\(|\bcrisisBriefingFor(?:City)?\s*\(|\bCrisisBriefing\b/;

/** The doors, derived. Two today: the city's ☰ Menu and the `?winter` route. */
const DOORS: readonly string[] = TREE.filter(([, source]) =>
  OPENS_THE_CARD.test(source),
).map(([path]) => path);

/**
 * EVERY PLACE A COSTUME CAN COME FROM, derived from the three ways a file can be involved
 * with one: it draws one, it decides one, or it holds one.
 *
 * This is the population scoped by the BEHAVIOUR rather than by the implementation. The
 * question is not *"where does the live-era override live"* — that is one function — but
 * *"what would have to be true of a surface for this defect to be possible there"*, and the
 * answer is that it puts a costume on screen while a crisis board is resolved behind it. A
 * surface can do that without importing a line of `crisisCall.ts`: `HardWinterSurface` draws
 * its own answer rows and could grow its own figure tomorrow. So the sweep starts from every
 * costume site in the app and classifies each one, instead of starting from the module the
 * override happens to sit in.
 */
const COSTUME_SITES: readonly string[] = TREE.filter(
  ([, source]) =>
    DRAWS_A_COSTUME.test(source) ||
    DECIDES_A_COSTUME.test(source) ||
    CARRIES_A_COSTUME.test(source) ||
    FORWARDS_A_COSTUME.test(source),
).map(([path]) => path);

/**
 * The costume sites that are PART OF THE CRISIS, and so owe the live era's clothes.
 *
 * Two, with different obligations, both discharged below: one decides the costume and is
 * driven at every era where the two candidate answers differ; one draws whatever it is handed
 * and is held to deciding nothing of its own.
 *
 * Declared rather than derived, and then checked against the tree in *"classifies by what the
 * tree says"*: a costume site that starts touching the crisis has to appear here, so the
 * exception list cannot absorb a new crisis surface by omission.
 */
const CRISIS_COSTUME_SITES: ReadonlySet<string> = new Set([
  // The decision. `crisisBriefingForCity` is the override; `crisisBriefingFor` beside it is
  // the board's-era builder it wraps, which is why one module holds both era answers.
  "city/crisisCall.ts",
  // The HAND-OFF. It takes a `CrisisBriefing` and passes `briefing.advisorDress` to the shared
  // stage, so its obligation is to resolve NOTHING for itself: a costume it looked up here
  // could be the board's again with the module above left untouched. It used to draw the figure
  // as well, and no longer does; see `FORWARDS_A_COSTUME` for why losing that did not lose it
  // from this sweep.
  "city/CrisisCallAdvisor.tsx",
]);

/**
 * The costume sites that legitimately owe nothing about a live era, each with its reason.
 *
 * Declared rather than omitted, which is the point of widening the population: a site that
 * does not owe the property and a site that forgot it look identical from outside the sweep,
 * and quietly leaving the first out of the population is how the second ships. The two
 * assertions below keep the list honest in both directions — an entry that stops holding a
 * costume fails, and an entry that adopts a crisis board without leaving the list fails.
 */
const NOT_A_CRISIS_SURFACE: ReadonlySet<string> = new Set([
  // The wardrobe itself: the ten-row table and `advisorDressFor`. It answers "what does era N
  // wear" and has no idea what anything is standing in, so the live-versus-board choice is its
  // callers' to make. Its own properties are `advisorDress.test.ts`'s.
  "city/advisorDress.ts",
  // `resolveEraAdvisor`: the one call that pairs a name with a costume, total over the ten
  // eras. Same reason as the table — one era in, one costume out, no board anywhere.
  "city/eraDressing.ts",
  // The onboarding reel. It passes no dress at all, so it draws the character's own default,
  // and it plays before there is a city, an era or a board.
  "city/onboarding/DemoReel.tsx",
  // THE SHARED ADVISOR PRESENTATION, which is where the figure is now actually painted for both
  // the crisis and first-run onboarding. It takes a dress as a prop and has no era, no board and
  // no resolver, so it is in no position to prefer one era's costume over another's: exactly the
  // reason `OruAdvisorCharacter` and `AdvisorNpc` are excused two entries down. Its callers are
  // the ones that owe the choice, and the crisis one is in the driven list above.
  "city/AdvisorStage.tsx",
  // First-run onboarding's content module. It resolves the LIVE era's advisor, which is the only
  // era in reach of it: onboarding has no borrowed board, because a board is a thing the winter
  // falls back to and the winter defers onboarding entirely.
  "city/onboarding/onboardingScript.ts",
  // The onboarding surface, which forwards the costume that module resolved. Same obligation as
  // the crisis card's and discharged by the same shape, and it is excused here rather than
  // driven because there is no second era it could be wrong about.
  "city/onboarding/OnboardingAdvisor.tsx",
  // The lesson NPC's bubble. It forwards whatever dress its caller hands it, no lesson caller
  // hands one, and the winter draws its own answer rows rather than mounting this.
  "lessons/AdvisorNpc.tsx",
  // The character. He paints the costume he is given and takes no era, so he is in no position
  // to prefer one era's over another's.
  "lessons/OruAdvisorCharacter.tsx",
  /*
   * ERA FOUR'S SUCCESSION, both halves, and the reason is the one thing that makes this crisis
   * structurally different from era one's rather than a second instance of it.
   *
   * The defect this whole file is about needs a BORROWED BOARD: era one's winter falls on the
   * player's own island whatever era they are standing in, so there are two candidate eras and
   * the costume has to be the live one. **The Succession has no such pair.** Its districts have
   * no position, so it cannot be laid over anybody's city and it is a page of its own on
   * `?succession` — era four's board, era four's forum, era four's advisor. There is no second
   * era in reach of it to be wrong about, which is `onboardingScript.ts`'s exemption arriving
   * by a different route.
   *
   * The day the Succession does grow an in-city mount it acquires the pair, and the second
   * direction below is what catches it: the mount would have to resolve a crisis era or take a
   * `CrisisBriefing`, and either fails here rather than passing quietly.
   */
  "succession/successionBriefing.ts",
  // The hand-off, which resolves nothing of its own: it takes a `SuccessionBriefing` and passes
  // `briefing.advisorDress` to the shared stage. Same shape as the crisis card's obligation and
  // exempt here for the same reason the module above is, rather than driven.
  "succession/SuccessionAdvisor.tsx",
]);

const DECLARED = [...CRISIS_COSTUME_SITES, ...NOT_A_CRISIS_SURFACE];

/* -------------------------------------------------------------------------- */
/* The eras where the two answers differ                                       */
/* -------------------------------------------------------------------------- */

interface BorrowedBoard {
  /** The era the city is standing in, whose costume the advisor owes. */
  readonly liveEraId: EraId;
  /** The era whose winter is actually played, whose costume he must not be wearing. */
  readonly boardEraId: EraId;
}

/**
 * THE ERAS WHERE THE DEFECT IS VISIBLE AT ALL: the ones whose board is borrowed.
 *
 * Filtered on `liveEraId !== boardEraId`, which is the condition for the two candidate
 * answers to exist. It is NOT also filtered on the two costumes differing: a member whose
 * costumes coincided would be an era this guard cannot speak for, and dropping it from the
 * population would exempt it by omission. So that is asserted per era instead, where it
 * fails loudly.
 *
 * Derived from `ERA_SEQUENCE` through `resolveCrisisEra` rather than written down, so the day
 * a second era's winter content lands the population shrinks by itself and the era the
 * rendered layer is driven at moves with it.
 */
const BORROWED_BOARD: readonly BorrowedBoard[] = ERA_SEQUENCE.map((era) => ({
  liveEraId: era.id,
  boardEraId: resolveCrisisEra(era.id).eraId,
})).filter(
  ({ liveEraId, boardEraId }) => liveEraId !== boardEraId && !hasPlayableCrisis(liveEraId),
);

/**
 * THE ERA THE RENDERED LAYER IS DRIVEN AT, and why it is this one.
 *
 * `BORROWED_BOARD[0]` is **era two, Neolithic**, and it is chosen for three reasons that all
 * point the same way:
 *
 *  - It is the FIRST era where the two answers differ. Era one is the degenerate case — its
 *    board is its own, so both answers are era one's and the assertion cannot fail there.
 *  - It is the era the report came from. `winterRouteAdvisor.test.tsx` records the lead's save
 *    as being in era two, which is the era the missing advisor was found in.
 *  - It is the costume with the largest silhouette break in the run. `advisorDress.ts` calls
 *    era two *"the row to get right"* because era one's full-height staff goes away, so a card
 *    that fell back to the board's costume is most visible precisely here.
 *
 * Read off the derived list rather than written as `"neolithic"`, so it cannot pin an era that
 * has stopped borrowing a board.
 */
const DRIVEN_AT = BORROWED_BOARD[0];

if (DRIVEN_AT === undefined) {
  throw new Error(
    "no era borrows another era's winter, so the live-era costume override has nothing to " +
      "override and this whole file would prove nothing",
  );
}

/* -------------------------------------------------------------------------- */
/* The doors, driven                                                           */
/* -------------------------------------------------------------------------- */

/** A door, mounted with the city standing in `liveEraId`, wound forward to the advisor. */
interface DrivenDoor {
  readonly path: string;
  readonly open: (liveEraId: EraId) => Promise<HTMLElement>;
}

const DRIVEN_DOORS: readonly DrivenDoor[] = [
  {
    // The `?winter` route, which is the door the encounter is demonstrated from. The card is
    // in front of the board from the first frame, so nothing has to be pressed.
    path: "winter/WinterRoute.tsx",
    open: async (liveEraId) => {
      setCityEra(liveEraId);
      render(<WinterRoute readMasteredNodes={() => WINTER_NODE_ORDER} />);
      return screen.findByTestId("crisis-call-advisor");
    },
  },
  {
    // The city, walked the way a player walks it: ☰ Menu, then the Hard Winter entry, which
    // reaches the encounter THROUGH this card rather than around it.
    path: "city/CitySurface.tsx",
    open: async (liveEraId) => {
      const user = userEvent.setup();
      setCityEra(liveEraId);
      render(
        <CitySurface
          enableCanvas={false}
          loadCity={() =>
            Promise.resolve({ node_states: MOCK_NODE_STATES, placements: [] })
          }
          onOpenSurface={() => undefined}
        />,
      );
      await screen.findByRole("button", { name: "Build" });
      await user.click(screen.getByRole("button", { name: "Menu" }));
      await user.click(await screen.findByRole("button", { name: /Hard Winter/i }));
      return screen.findByTestId("crisis-call-advisor");
    },
  },
];

/**
 * WHAT HE IS WEARING ON SCREEN — the costume id the figure was actually drawn with.
 *
 * `OruAdvisorCharacter` publishes `data-dress={dress.id}`, and `advisorDress.test.ts` pins
 * every row's `id` to its own era, so this attribute is the era whose clothes are on the
 * island. Read with `querySelector` because the figure is decorative and `aria-hidden`, which
 * is correct — the words carry the meaning — and puts it out of reach of a role query.
 */
function costumeOnScreen(advisor: HTMLElement): string {
  const figure = advisor.querySelector<HTMLElement>(".oru-advisor");
  if (!figure) {
    throw new Error(
      "the crisis card drew no advisor figure at all, so there is no costume to read",
    );
  }
  const drawn = figure.dataset.dress;
  if (drawn === undefined || drawn === "") {
    throw new Error("the advisor figure was drawn without a costume id to read");
  }
  return drawn;
}

const doorCases = DRIVEN_DOORS.map((door) => [door.path, door] as const);

beforeEach(() => {
  resetCityEra();
  forgetCrisisBriefingRead();
});

afterEach(() => {
  resetCityEra();
  forgetCrisisBriefingRead();
});

describe("the crisis advisor's costume is the live era's, not the borrowed board's", () => {
  it("sweeps every era whose board is borrowed, and none of the ones whose is not", () => {
    // FLOOR. Every assertion in the loop below holds trivially over an empty list, and the
    // list is derived, so a resolver that stopped falling back would leave this file green
    // over nothing.
    const playable = ERA_SEQUENCE.filter((era) => hasPlayableCrisis(era.id));
    expect(playable.map((era) => era.id)).toEqual([
      "prehistoric",
      "classical",
      "renaissance",
      "information_age",
    ]);
    expect(BORROWED_BOARD).toHaveLength(ERA_SEQUENCE.length - playable.length);

    // COMPOSITION, because a floor constrains size and not shape: nine of anything would
    // satisfy the line above. The population is exactly the eras with no playable winter of
    // their own, derived twice through different routes — `resolveCrisisEra`'s fallback above
    // and `canPlayCrisisIn` here — so the two have to agree.
    expect(new Set(BORROWED_BOARD.map(({ liveEraId }) => liveEraId))).toEqual(
      new Set(
        ERA_SEQUENCE.filter(
          (era) => !canPlayCrisisIn(era.id) && !hasPlayableCrisis(era.id),
        ).map((era) => era.id),
      ),
    );

    // AND ERA ONE IS OUT OF IT. The degenerate era is excluded by construction rather than
    // by anybody remembering to leave it out: its board is its own, so the two costumes are
    // one object and it can prove nothing about the override.
    expect(BORROWED_BOARD.map(({ liveEraId }) => liveEraId)).not.toContain(CURRENT_ERA_ID);
    expect(resolveCrisisEra(CURRENT_ERA_ID).board).toBe("live");

    // The era the rendered layer is driven at is era two or later, stated rather than left to
    // the reader to work out from the sequence.
    expect(
      ERA_SEQUENCE.findIndex((era) => era.id === DRIVEN_AT.liveEraId),
    ).toBeGreaterThanOrEqual(1);
  });

  it("hands every borrowed-board era the live era's clothes", () => {
    for (const { liveEraId, boardEraId } of BORROWED_BOARD) {
      // THE PREMISE, ASSERTED AND NOT ASSUMED: the two answers really are different objects
      // here. Without this line the loop would pass over an era whose costume happened to
      // equal the board's, which is era one's failure mode wearing another era's id.
      expect(advisorDressFor(liveEraId), liveEraId).not.toBe(advisorDressFor(boardEraId));

      const briefing = crisisBriefingForCity(liveEraId);
      expect(briefing, liveEraId).not.toBeNull();
      // ...and the board really is borrowed, which is what makes the costume a choice.
      expect(briefing?.eraId, liveEraId).toBe(boardEraId);

      // THE CLAIM. The same object `advisorDressFor` returns for the LIVE era, identity and
      // all, so a copy with one field edited would fail here too.
      expect(briefing?.advisorDress, liveEraId).toBe(advisorDressFor(liveEraId));
      expect(briefing?.advisorDress.id, liveEraId).toBe(liveEraId);
      expect(briefing?.advisorDress, liveEraId).not.toBe(advisorDressFor(boardEraId));
    }
  });

  it("hands the Care House era six's own clothes without borrowing the winter board", () => {
    const briefing = crisisBriefingForCity("renaissance");
    expect(briefing?.eraId).toBe("renaissance");
    expect(briefing?.advisorDress).toBe(advisorDressFor("renaissance"));
  });

  it.each(doorCases)(
    "%s draws him in the live era's costume where the board is borrowed",
    async (_path, door) => {
      const { liveEraId, boardEraId } = DRIVEN_AT;
      const advisor = await door.open(liveEraId);

      // Off the RENDERED figure, not off the briefing. The layer above proves the decision;
      // this proves the decision reaches the island, which is the half a card that stopped
      // passing `briefing.advisorDress` down would break with the module left correct.
      expect(costumeOnScreen(advisor)).toBe(liveEraId);
      expect(costumeOnScreen(advisor)).not.toBe(boardEraId);
    },
  );

  it.each(doorCases)(
    "%s draws era one's costume in era one, so the assertion above is not a constant",
    async (_path, door) => {
      // THE CONTROL, and only that. Era one's board is its own, so this case is green with
      // the override deleted and proves nothing about it — what it does prove is that the
      // assertion above tracks the era the city is standing in rather than pinning the one
      // costume this file happens to expect.
      const advisor = await door.open(CURRENT_ERA_ID);
      expect(costumeOnScreen(advisor)).toBe(CURRENT_ERA_ID);
    },
  );
});

describe("every costume site in the app is either driven or declared", () => {
  it("found both doors, and drives exactly the doors it found", () => {
    // FLOOR: an `it.each` over an empty list is a green run over nothing, and both door
    // cases above are `it.each`.
    expect(DOORS.length).toBeGreaterThanOrEqual(2);
    // COMPOSITION: a third door — another route, another surface that mounts the card — fails
    // here until it is driven, rather than being covered by the two that were.
    expect(new Set(DRIVEN_DOORS.map((door) => door.path))).toEqual(new Set(DOORS));
  });

  it("classifies every costume site in the tree, and claims none of them twice", () => {
    expect(COSTUME_SITES.length).toBeGreaterThanOrEqual(9);
    // Set equality both ways, so a new costume site is an unclassified one and fails, and a
    // declared entry that is no longer a costume site fails too.
    expect(new Set(COSTUME_SITES)).toEqual(new Set(DECLARED));
    expect(DECLARED.length).toBe(CRISIS_COSTUME_SITES.size + NOT_A_CRISIS_SURFACE.size);
    expect(
      [...CRISIS_COSTUME_SITES].filter((path) => NOT_A_CRISIS_SURFACE.has(path)),
    ).toEqual([]);
  });

  it("classifies by what the tree says, not by what the list says", () => {
    // The one line that stops the exception list being free-hand. Which sites are part of the
    // crisis is read off the sources — do they resolve a borrowed board, or handle the
    // briefing that carries a costume across one — and has to agree with the declaration
    // above. Park a new crisis surface in the exception list and this fails.
    expect(
      new Set(COSTUME_SITES.filter((path) => TOUCHES_THE_CRISIS.test(sourceOf(path)))),
    ).toEqual(CRISIS_COSTUME_SITES);
  });

  it.each(DECLARED)("%s is a declared entry that still holds a costume", (path) => {
    // The first direction. A renamed or deleted file, or one that stopped touching a costume,
    // would otherwise sit in its list forever, exempting nothing and hiding that it exempts
    // nothing.
    expect(COSTUME_SITES).toContain(path);
  });

  it.each([...NOT_A_CRISIS_SURFACE])(
    "%s has not quietly acquired a crisis board",
    (path) => {
      // The second direction. A file that starts resolving the borrowed board, or taking the
      // briefing that carries a costume across it, has adopted the property and has to leave
      // this list for the driven one — or the list goes on excusing something it has stopped
      // describing.
      expect(sourceOf(path)).not.toMatch(TOUCHES_THE_CRISIS);
    },
  );

  it("the card hands on the costume it is given, and the stage paints it, neither resolving one", () => {
    /*
     * `CrisisCallAdvisor`'s own obligation, and the reason it is in the driven list rather than
     * the exempt one. A lookup in EITHER half would be a second decision behind the first, free
     * to be the board's era again with `crisisCall.ts` left correct, so both halves are checked:
     * the card must hand the briefing's own dress on, and the stage it hands it to must paint
     * what it was given.
     *
     * It was one assertion over one file until the presentation was extracted. Splitting it in
     * two is what keeps the claim whole across that split: checking only the card would leave
     * the painting unguarded, and checking only the stage would leave the hand-off unguarded.
     */
    const card = sourceOf("city/CrisisCallAdvisor.tsx");
    expect(card).toMatch(FORWARDS_A_COSTUME);
    expect(card).not.toMatch(DECIDES_A_COSTUME);

    const stage = sourceOf("city/AdvisorStage.tsx");
    expect(stage).toMatch(DRAWS_A_COSTUME);
    expect(stage).not.toMatch(DECIDES_A_COSTUME);
    // And the card really does reach that stage, so the pair above is one path rather than two
    // unrelated files that each satisfy half a rule.
    expect(card).toMatch(/<AdvisorSpeech\b/);
  });
});
