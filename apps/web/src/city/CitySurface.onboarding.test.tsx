import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CitySurface } from "./CitySurface";
import { createCityDevSession } from "./citySession";
import { COACH_SKIP_ALL_KEY, coachMarkKey } from "./coachmarks/coachMarksCore";
import { CURRENT_ERA_ID } from "./eraDressing";
import {
  ONBOARDING_ADVISOR_DONE_KEY,
  ONBOARDING_MOMENT_ORDER,
  onboardingBriefingFor,
  onboardingTaughtCoachMarkIds,
  saveOnboardingAdvisorStep,
} from "./onboarding/onboardingScript";
import {
  markOnboardingDemoSeen,
  ONBOARDING_DEMO_SEEN_KEY,
} from "./onboarding/useDemoScript";
import type { CityLoad } from "./types";

/**
 * **FIRST-RUN ONBOARDING IS THE ADVISOR NOW, AND THE REEL IS THE REPLAY.**
 *
 * The team lead: *"the tool-tips that show at the start of the game are super dull and dont give
 * much information. start wiring up the stuff that would make the advisor display on screen like
 * he does for the crisis."*
 *
 * This file used to open with *"plays the framed reel on first entry"*. It does not any more, and
 * the change is the whole point rather than a detail: what a brand-new learner meets is
 * `OnboardingAdvisor`, in the crisis's own presentation, and `DemoReel` moved behind
 * `☰ Menu → How to play → Watch the intro again`. Both halves are asserted, because *"the advisor
 * plays"* and *"the reel no longer does"* are two claims and the second is the one that would
 * silently regress into two tutorials firing at once.
 *
 * ## THE HAND-OFF TO THE HINT LAYER DEPENDS ON HOW THE TUTORIAL ENDED
 *
 * A learner who WALKED the moments has been told how to place a building, so `place`, `learn` and
 * `build` are retired: the same instruction ninety seconds later in a duller voice is exactly the
 * complaint. A learner who SKIPPED has been told nothing, so those three still fire and the old
 * behaviour is what they get. Both are driven below, and the population of retired hints is read
 * from `ONBOARDING_TAUGHT_COACH_MARKS` rather than written here, so a fourth retirement joins
 * these assertions with no edit.
 */

/** A fresh, empty island load (the first-run shape the tutorial plays over). */
function emptyLoad(): Promise<CityLoad> {
  return createCityDevSession().load();
}

/** Longer than the longest reel beat, so one advance steps exactly one beat. */
const PAST_A_BEAT = 6500;

const MOMENTS = onboardingBriefingFor(CURRENT_ERA_ID).moments;
const RETIRED = onboardingTaughtCoachMarkIds();

/**
 * **PUT A BUILDING ON THE ISLAND THE WAY A LEARNER DOES: the Build menu, a card, the confirm
 * bar.**
 *
 * Three real controls, none of them the tutorial's. This is the whole of what the placement
 * gate now asks for, and it is driven here rather than through a widget the tutorial owns,
 * because the product lead's objection to what shipped was exactly that the widget was not the
 * city: *"they should actually have to place the building and not just drag a house into a 2d
 * box like what is the point of that bro."*
 *
 * The ghost is seeded onto a valid cell by `startPlacement`, so a learner who never drags is
 * confirming a spot the bar has already accepted. Aiming it is `CityScene`'s job and is not
 * reachable in jsdom, which has no layout and no canvas; the aim, the drag and the ring are
 * photographed with a real pointer in `onboardingAdvisorShots.browser.test.tsx`.
 */
async function openBuildAndChoose(user: ReturnType<typeof userEvent.setup>) {
  // The tutorial's own shortcut, which calls the host's `openShop` and nothing else. Used
  // rather than the Build pill because the pill sits inside the lifted HUD panel, whose
  // pointer-events jsdom does not model; the pill itself is pressed with a real pointer in
  // `onboardingAdvisorShots.browser.test.tsx`.
  await user.click(screen.getByTestId("ob-task-open-build"));
  const card = await waitFor(() => {
    const found = document.querySelector<HTMLButtonElement>(
      ".build-card:not([data-built]):not([data-locked]) .build-card-cta",
    );
    if (!found) {
      throw new Error("the Build menu has no placeable card in it");
    }
    return found;
  });
  await user.click(card);
  await screen.findByRole("button", { name: /Build here/ });
}

async function confirmOnTheIsland(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Build here/ }));
}

async function placeOnTheIsland(user: ReturnType<typeof userEvent.setup>) {
  await openBuildAndChoose(user);
  await confirmOnTheIsland(user);
}

/** Complete whichever non-destructive live-surface visit the current moment requires. */
async function completeGuidedVisit(user: ReturnType<typeof userEvent.setup>) {
  const moment = screen.getByTestId("onboarding-advisor-moment").dataset.moment;
  const action = screen.queryByTestId(`onboarding-action-${moment}`);
  if (!action) {
    return;
  }
  await user.click(action);
  if (moment === "lessons") {
    const lesson = await screen.findByRole("button", { name: /Start lesson/ });
    const dialog = lesson.closest<HTMLElement>('[role="dialog"]');
    await user.click(within(dialog as HTMLElement).getByRole("button", { name: "Close" }));
    return;
  }
  if (moment === "civic") {
    // Opens straight to the Civic tab (the civic-buildings step's own "Open Build"
    // shortcut), so the dialog's name is already the Civic tab's heading. The step only
    // clears on a REAL placement now (confirmPlacement's civic-success branch), not on
    // merely opening the catalogue, so the walk has to place one through the real card
    // and the real confirm bar.
    const shop = await screen.findByRole("dialog", { name: /Buy a building for your people/ });
    const card = within(shop).getAllByRole("button", { name: /stone/i })[0];
    await user.click(card as HTMLElement);
    const confirmBar = await screen.findByRole("group", { name: /Placing/ });
    await user.click(within(confirmBar).getByRole("button", { name: /Build here/ }));
    return;
  }
  if (moment === "townhall") {
    const panel = await screen.findByTestId("town-hall-panel");
    await user.click(within(panel).getByRole("button", { name: "Close" }));
    return;
  }
  if (moment === "bay") {
    const bay = await screen.findByTestId("archipelago-overview");
    await user.click(within(bay).getByRole("button", { name: /Next island/ }));
    await waitFor(() => expect(bay).toHaveAttribute("data-selected-era", "neolithic"));
    await user.click(within(bay).getByRole("button", { name: "Return to tour" }));
  }
}

/**
 * Press Next until the sequence ends, which is once per moment plus the real placement the one
 * gated moment asks for.
 */
async function walkTheMoments(user: ReturnType<typeof userEvent.setup>) {
  for (let step = 0; step < MOMENTS.length; step += 1) {
    if (screen.queryByTestId("ob-task-open-build")) {
      await placeOnTheIsland(user);
    }
    await completeGuidedVisit(user);
    await user.click(screen.getByTestId("onboarding-advisor-next"));
  }
}

describe("CitySurface — first-run onboarding is the advisor", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens the advisor over the island on first entry, and never the reel", async () => {
    render(<CitySurface enableCanvas={false} enableOnboardingDemo loadCity={emptyLoad} />);

    const stage = await screen.findByTestId("onboarding-advisor");
    expect(stage).toHaveAttribute("role", "dialog");
    expect(stage).toHaveAttribute("aria-modal", "true");
    // He is the era's advisor in the era's clothes, and the retired modern guide is nowhere in it.
    expect(stage.querySelector<HTMLElement>(".oru-advisor")?.dataset.dress).toBe(
      CURRENT_ERA_ID,
    );
    expect(stage.querySelector(".city-guide")).toBeNull();
    // THE SHOUT, which is the thing the caption bar could not be.
    expect(within(stage).getByTestId("onboarding-advisor-lead")).toHaveTextContent(
      MOMENTS[0]?.lead ?? "",
    );
    // AND THE REEL IS NOT PLAYING. The letterboxed video frame is what he replaced.
    expect(screen.queryByTestId("demo-reel")).toBeNull();
  });

  it("leaves the live HUD up behind him, unlike the reel", async () => {
    // A deliberate difference from the reel, which hid the HUD via `[data-demo]`. He says "Open
    // Build and drag a building onto an open plot", and the Build control being on screen while
    // he says it is half the sentence. Read off the attribute that does the hiding, plus the
    // control it would have hidden.
    render(<CitySurface enableCanvas={false} enableOnboardingDemo loadCity={emptyLoad} />);
    await screen.findByTestId("onboarding-advisor");

    expect(document.querySelector(".city-surface")).not.toHaveAttribute("data-demo");
    expect(screen.getByRole("button", { name: "Build" })).toBeInTheDocument();
  });

  it("rings the island a learner must use on the lesson beat", async () => {
    const lessonsStep = MOMENTS.findIndex((moment) => moment.id === "lessons");
    expect(lessonsStep, "the briefing no longer has a lessons moment").toBeGreaterThan(0);
    saveOnboardingAdvisorStep(lessonsStep);
    render(<CitySurface enableCanvas={false} enableOnboardingDemo loadCity={emptyLoad} />);

    const spotlight = await screen.findByTestId("onboarding-spotlight");
    const viewport = screen.getByTestId("city-viewport");
    const build = screen.getByRole("button", { name: "Build" });
    expect(spotlight).toHaveAttribute("data-anchor", "viewport");
    expect(viewport).toHaveAttribute("data-spotlit");
    expect(build).not.toHaveAttribute("data-spotlit");
  });

  it("walks the moments one at a time, then hands off with the hints it taught retired", async () => {
    const user = userEvent.setup();
    const session = createCityDevSession();
    render(
      <CitySurface
        enableCanvas={false}
        enableOnboardingDemo
        loadCity={session.load}
        onPlaceSkill={session.placeSkill}
      />,
    );
    await screen.findByTestId("onboarding-advisor");

    // Seven, not ten: "founding" (net-points scoring slide), "era" (Island Unlock
    // Exam) and "buildings" (redundant with "place") were all deliberately deleted.
    expect(MOMENTS.length).toBeGreaterThanOrEqual(8);
    for (const [index, moment] of MOMENTS.entries()) {
      expect(
        screen.getByTestId("onboarding-advisor-moment").dataset.moment,
        `step ${index + 1}`,
      ).toBe(moment.id);
      /*
       * ONE MOMENT SECTION IN THE WHOLE DOCUMENT, AND THIS LINE CAUGHT A REAL DEFECT.
       *
       * `CitySurface` remounts the advisor by `key` so the dev control can open it at a chosen
       * moment, and that key was `onboardingReplayToken`, whose first-run value is 0. A numeric
       * zero key on that conditionally-rendered child mounted the advisor twice: two live
       * instances side by side, the first frozen on moment one. It is invisible to a `getBy`
       * that happens to run before the second appears and invisible to the standalone component
       * suite, which passes no key at all. See the key's own comment in `CitySurface.tsx`.
       */
      expect(screen.getAllByTestId("onboarding-advisor-moment")).toHaveLength(1);
      // The one moment that asks for something back, done through the city's own Build menu.
      if (screen.queryByTestId("ob-task-open-build")) {
        await placeOnTheIsland(user);
      }
      await completeGuidedVisit(user);
      await user.click(screen.getByTestId("onboarding-advisor-next"));
    }

    // Past the last moment: the tutorial unmounts, remembers itself, and the city is what is
    // left. The learner's own step key is irrelevant afterwards; the done flag is what gates.
    await waitFor(() => expect(screen.queryByTestId("onboarding-advisor")).toBeNull());
    expect(localStorage.getItem(ONBOARDING_ADVISOR_DONE_KEY)).toBe("true");

    // THE RETIREMENT, read off storage per hint so a partial write fails.
    expect(RETIRED.length).toBeGreaterThanOrEqual(3);
    for (const id of RETIRED) {
      expect(localStorage.getItem(coachMarkKey(id)), id).toBe("true");
    }
    // AND NOTHING NAGS. Every retired hint is gone from the screen, which is the difference a
    // learner actually experiences: the tooltips that used to repeat him do not appear.
    for (const id of RETIRED) {
      expect(screen.queryByTestId(`coach-mark-${id}`), id).toBeNull();
    }
  });

  it("keeps the hints as the fallback for a learner who skipped", async () => {
    const user = userEvent.setup();
    render(<CitySurface enableCanvas={false} enableOnboardingDemo loadCity={emptyLoad} />);
    await screen.findByTestId("onboarding-advisor");

    // ONE PRESS, from the first frame, nothing gated.
    await user.click(screen.getByTestId("onboarding-advisor-skip"));
    await waitFor(() => expect(screen.queryByTestId("onboarding-advisor")).toBeNull());
    // Still never repeated...
    expect(localStorage.getItem(ONBOARDING_ADVISOR_DONE_KEY)).toBe("true");
    // ...and the hints are untouched, because nothing was taught. `place` is the one an empty
    // island calls for, so it is the one that comes up.
    for (const id of RETIRED) {
      expect(localStorage.getItem(coachMarkKey(id)), id).toBeNull();
    }
    const coach = await screen.findByTestId("coach-mark-place");
    expect(coach).toHaveTextContent(/drag a building/i);
    expect(coach).toHaveAttribute("data-anchor", "build");
  });

  it("resumes on the moment the last visit reached", async () => {
    // Closing the tab mid-tutorial must not restart it and must not strand it. The step key is
    // what a previous visit left behind.
    saveOnboardingAdvisorStep(1);
    render(<CitySurface enableCanvas={false} enableOnboardingDemo loadCity={emptyLoad} />);

    const stage = await screen.findByTestId("onboarding-advisor");
    expect(screen.getByTestId("onboarding-advisor-moment").dataset.moment).toBe(
      MOMENTS[1]?.id,
    );
    expect(stage).toHaveTextContent(`Step 2 of ${MOMENTS.length}`);
  });

  /**
   * **THE BAY BEAT IS TAUGHT WHERE THERE IS A BAY, AND THE HOST IS WHERE THAT IS DECIDED.**
   *
   * `onboardingScript.test.ts` proves the moment table withholds it; this proves the WIRING,
   * which is the half that would silently regress: `CitySurface` resolves the same
   * `bayAvailable` its own ☰ Menu row hangs off and hands it to the tour, so the sentence and
   * the door can never disagree.
   *
   * The bay beat sits second in the sequence (moved up from last so the learner gets the
   * whole-game framing before the moments that teach one island's mechanics), so its own
   * index reaches it directly with no gate in the way.
   * Both directions are driven in one test, because "the bay beat is there" is worth nothing
   * without "and here is the city where it is not".
   */
  it("teaches the bay only in a city that has one", async () => {
    saveOnboardingAdvisorStep(ONBOARDING_MOMENT_ORDER.indexOf("bay"));
    const bayCity = render(
      <CitySurface
        enableCanvas={false}
        enableOnboardingDemo
        loadCity={emptyLoad}
        bayAvailable
      />,
    );
    await screen.findByTestId("onboarding-advisor");
    expect(screen.getByTestId("onboarding-advisor-moment").dataset.moment).toBe("bay");
    // The instruction now hands the learner into the real navigator and names the return.
    expect(screen.getByTestId("onboarding-advisor-body")).toHaveTextContent(
      /Open the Bay.+Return to tour/i,
    );
    expect(document.body.textContent ?? "").not.toMatch(/Atlas|End preview|arrows?/i);
    // ...and the ring is on the ☰ Menu, which is the action the sentence names.
    expect(screen.getByTestId("onboarding-spotlight")).toHaveAttribute(
      "data-anchor",
      "menu",
    );
    bayCity.unmount();

    saveOnboardingAdvisorStep(99);
    render(
      <CitySurface
        enableCanvas={false}
        enableOnboardingDemo
        loadCity={emptyLoad}
        bayAvailable={false}
      />,
    );
    await screen.findByTestId("onboarding-advisor");
    expect(screen.getByTestId("onboarding-advisor-moment").dataset.moment).not.toBe("bay");
    expect(document.body.textContent ?? "").not.toMatch(/bay of islands|choose The bay/i);
  });

  it("does not play for a returning learner", async () => {
    localStorage.setItem(ONBOARDING_ADVISOR_DONE_KEY, "true");
    render(<CitySurface enableCanvas={false} enableOnboardingDemo loadCity={emptyLoad} />);

    await screen.findByRole("button", { name: "Build" });
    expect(screen.queryByTestId("onboarding-advisor")).toBeNull();
    expect(screen.queryByTestId("demo-reel")).toBeNull();
  });

  it("does not re-teach somebody who already saw the OLD reel", async () => {
    // The reel's flag is read alongside the advisor's at the mount, deliberately: a learner who
    // sat through the montage before this landed has been onboarded, and the honest reading of
    // "never repeated" covers the tutorial rather than covering this component.
    markOnboardingDemoSeen();
    render(<CitySurface enableCanvas={false} enableOnboardingDemo loadCity={emptyLoad} />);

    await screen.findByRole("button", { name: "Build" });
    expect(screen.queryByTestId("onboarding-advisor")).toBeNull();
  });

  it("stands down (and is retired) when the diagnostic unlocked buildings", async () => {
    render(
      <CitySurface
        enableCanvas={false}
        enableOnboardingDemo
        loadCity={emptyLoad}
        onPlaceSkill={vi.fn()}
        pretestPlacement={{ "NUM.F": 3, "NUM.S": 0 }}
      />,
    );

    // The unlock reward hand-off owns this moment, not the tutorial.
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(/tested out/i);
    expect(screen.queryByTestId("onboarding-advisor")).toBeNull();

    // **THE RETIREMENT IS AN EFFECT, SO IT IS WAITED FOR SEPARATELY.** `findByRole` resolves on
    // the DOM mutation that inserts the dialog, and the write runs in a passive `useEffect`
    // after that commit, so reading storage synchronously here sat in a gap that load decided.
    // See this file's history: that gap went red about one run in four. BOTH flags, because both
    // surfaces gate on their own and a learner who took this route should meet neither.
    await waitFor(() => {
      expect(localStorage.getItem(ONBOARDING_ADVISOR_DONE_KEY)).toBe("true");
      expect(localStorage.getItem(ONBOARDING_DEMO_SEEN_KEY)).toBe("true");
    });
  });

  /**
   * **THE GATE OPENS ON A REAL PLACEMENT AND ON NOTHING ELSE, driven through the city's own
   * three controls.**
   *
   * This is the assertion the whole 2026-08-05 change exists for. The product lead:
   * *"they should actually have to place the building and not just drag a house into a 2d box
   * like what is the point of that bro."* There are two halves and they fail differently, so
   * both are here:
   *
   *  1. **Before**, the gate is shut, the island is empty, and no widget on screen can satisfy
   *     it. The retired board's two tiles are asserted ABSENT, because a gate that could still
   *     be opened by a drag inside the bubble would pass every other assertion in this file.
   *  2. **After** the Build menu, a card and "Build here", the gate is open AND the learner's
   *     session has the building in it. The second clause is what makes this a placement
   *     rather than a state flag: the city they walk into afterwards is the city they built.
   */
  it("holds the gate until a building is confirmed onto the real island", async () => {
    const user = userEvent.setup();
    const session = createCityDevSession();
    render(
      <CitySurface
        enableCanvas={false}
        enableOnboardingDemo
        loadCity={session.load}
        onPlaceSkill={session.placeSkill}
      />,
    );
    await screen.findByTestId("onboarding-advisor");

    for (let step = 0; step < MOMENTS.length; step += 1) {
      if (screen.getByTestId("onboarding-advisor-moment").dataset.moment === "place") {
        break;
      }
      await user.click(screen.getByTestId("onboarding-advisor-next"));
    }
    expect(screen.getByTestId("onboarding-advisor-moment").dataset.moment).toBe("place");

    // ONE: shut, over an empty island, with no board anywhere that could open it.
    expect(screen.getByTestId("onboarding-advisor-next")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.queryByTestId("ob-place")).toBeNull();
    expect(screen.queryByTestId("ob-place-house")).toBeNull();
    expect((await session.load()).placements).toHaveLength(0);
    // Pressing it does not advance, and says what is owed.
    await user.click(screen.getByTestId("onboarding-advisor-next"));
    expect(screen.getByTestId("onboarding-advisor-moment").dataset.moment).toBe("place");

    // TWO: A GHOST IS NOT A BUILDING. Opening the menu and choosing a card puts a ghost on the
    // grid and writes nothing, so the gate has to stay shut until the confirm bar is pressed.
    // Without this the gate could be opened by a learner who changed their mind.
    await openBuildAndChoose(user);
    expect(
      screen.getByTestId("onboarding-advisor-next").getAttribute("aria-disabled"),
      "the gate opened while the building was still a ghost",
    ).toBe("true");
    expect((await session.load()).placements).toHaveLength(0);

    // THREE: confirmed, and the gate follows the city.
    await confirmOnTheIsland(user);
    await waitFor(() =>
      expect(
        screen.getByTestId("onboarding-advisor-next").getAttribute("aria-disabled"),
        "the gate stayed shut after a building was confirmed onto the island",
      ).toBe("false"),
    );
    const built = await session.load();
    expect(
      built.placements,
      "the gate opened without a building reaching the learner's city",
    ).toHaveLength(1);
    await user.click(screen.getByTestId("onboarding-advisor-next"));
    expect(screen.getByTestId("onboarding-advisor-moment").dataset.moment).not.toBe(
      "place",
    );
  });

  /**
   * **THE TUTORIAL WRITES THE ONE BUILDING THE LEARNER PLACED, AND NOTHING ELSE.**
   *
   * ## ⚑ THIS GUARD CHANGED ON 2026-08-05, and the change is the feature
   *
   * It used to read *"never mutates the city session while the tutorial runs or is skipped"*
   * and assert `placements` was empty and `onPlaceSkill` was never called. That was correct
   * while the placement moment was a board inside the speech bubble, and it is exactly the
   * property the product lead rejected: a tutorial that touches nothing is a tutorial in which
   * nothing the learner does is real.
   *
   * **What the guard was protecting still holds and is asserted below**, which is the point of
   * rewriting it rather than deleting it. The tutorial may not grant MASTERY, may not start or
   * finish a LESSON, and may not put down anything the learner did not put down. So the shape
   * is now an exact one rather than an absence: one placement, zero mastery, every lesson
   * still `not_started`, and `onDevAdvanceMastery` never called.
   *
   * And the skipped path is unchanged and is asserted separately: a learner who skips has
   * placed nothing, so their city is untouched in the original, literal sense.
   */
  it("writes the one building the learner placed, and grants nothing", async () => {
    const user = userEvent.setup();
    const session = createCityDevSession();
    const onDevAdvanceMastery = vi.fn();
    render(
      <CitySurface
        enableCanvas={false}
        enableOnboardingDemo
        loadCity={session.load}
        onPlaceSkill={session.placeSkill}
        onDevAdvanceMastery={onDevAdvanceMastery}
      />,
    );

    await screen.findByTestId("onboarding-advisor");
    await walkTheMoments(user);
    await waitFor(() => expect(screen.queryByTestId("onboarding-advisor")).toBeNull());

    const load = await session.load();
    // EXACTLY ONE, so a tutorial that seeded a city while it talked fails here just as loudly
    // as one that placed nothing.
    expect(load.placements).toHaveLength(1);
    // AND NOTHING WAS GRANTED. Walked rather than skipped, because walking is the path that
    // writes the most and so the one with the most to get wrong.
    expect(
      load.node_states.every(
        (state) => state.mastery === 0 && state.lesson_stage === "not_started",
      ),
    ).toBe(true);
    expect(onDevAdvanceMastery).not.toHaveBeenCalled();
  });

  it("touches nothing at all when the tutorial is skipped", async () => {
    const user = userEvent.setup();
    const session = createCityDevSession();
    const onPlaceSkill = vi.fn();
    render(
      <CitySurface
        enableCanvas={false}
        enableOnboardingDemo
        loadCity={session.load}
        onPlaceSkill={onPlaceSkill}
      />,
    );

    await screen.findByTestId("onboarding-advisor");
    await user.click(screen.getByTestId("onboarding-advisor-skip"));
    await waitFor(() => expect(screen.queryByTestId("onboarding-advisor")).toBeNull());

    const load = await session.load();
    expect(load.placements).toHaveLength(0);
    expect(onPlaceSkill).not.toHaveBeenCalled();
  });

  it("nothing about it runs on a timer", async () => {
    // The reel advanced itself on a ~20s budget and needed a Play/Pause pair to stop it. This
    // waits, which is the crisis's own rule and the reason that pair has no successor. Driven
    // with fake timers over more than the whole of the old reel's runtime.
    vi.useFakeTimers();
    render(<CitySurface enableCanvas={false} enableOnboardingDemo loadCity={emptyLoad} />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const first = screen.getByTestId("onboarding-advisor-moment").dataset.moment;
    act(() => vi.advanceTimersByTime(PAST_A_BEAT * (MOMENTS.length + 2)));
    expect(screen.getByTestId("onboarding-advisor-moment").dataset.moment).toBe(first);
    expect(screen.getByTestId("onboarding-advisor")).toBeInTheDocument();
  });
});

describe("CitySurface — How to play (three replay routes)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  /** Open the ☰ Menu and the How to play card from a returning learner's city. */
  async function openHowToPlay(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByRole("button", { name: "Menu" }));
    await user.click(screen.getByTestId("menu-how-to-play"));
    return screen.getByTestId("how-to-play");
  }

  /** A returning learner: the flag is set, so nothing plays by itself. */
  function returningLearner() {
    localStorage.setItem(ONBOARDING_ADVISOR_DONE_KEY, "true");
    markOnboardingDemoSeen();
    render(<CitySurface enableCanvas={false} enableOnboardingDemo loadCity={emptyLoad} />);
  }

  it("opens from the ☰ Menu for a learner who has already been onboarded", async () => {
    const user = userEvent.setup();
    returningLearner();

    const panel = await openHowToPlay(user);
    expect(panel).toHaveAttribute("aria-modal", "true");
    // All three replay routes, plus the loop and at least one contextual tip.
    expect(within(panel).getByTestId("how-to-play-advisor")).toBeInTheDocument();
    expect(within(panel).getByTestId("how-to-play-watch")).toBeInTheDocument();
    expect(within(panel).getByTestId("how-to-play-tips")).toBeInTheDocument();
    expect(panel).toHaveTextContent(/tab inside build/i);
  });

  it("brings the advisor back, which is what his closing line promises", async () => {
    const user = userEvent.setup();
    returningLearner();

    await openHowToPlay(user);
    expect(screen.queryByTestId("onboarding-advisor")).toBeNull();

    await user.click(screen.getByTestId("how-to-play-advisor"));
    // FROM THE BEGINNING, because somebody asking for the tutorial back wants the whole of it
    // rather than wherever they happened to stop.
    const stage = await screen.findByTestId("onboarding-advisor");
    expect(screen.getByTestId("onboarding-advisor-moment").dataset.moment).toBe(
      MOMENTS[0]?.id,
    );
    expect(stage).toHaveTextContent(`Step 1 of ${MOMENTS.length}`);
    expect(screen.queryByTestId("how-to-play")).toBeNull();

    // And skipping the replay returns to the live city rather than replaying forever.
    await user.click(screen.getByTestId("onboarding-advisor-skip"));
    await waitFor(() => expect(screen.queryByTestId("onboarding-advisor")).toBeNull());
  });

  it("still replays the reel, which is the montage the advisor cannot show", async () => {
    const user = userEvent.setup();
    returningLearner();

    await openHowToPlay(user);
    await user.click(screen.getByTestId("how-to-play-watch"));
    const reel = await screen.findByTestId("demo-reel");
    expect(within(reel).getByTestId("demo-reel-line")).toHaveTextContent(
      /drop a building/i,
    );

    await user.click(within(reel).getByRole("button", { name: "Skip" }));
    await waitFor(() => expect(screen.queryByTestId("demo-reel")).toBeNull());
  });

  it("brings the tips back after 'Skip tips' retired them", async () => {
    const user = userEvent.setup();
    returningLearner();

    // Turn the whole hint layer off from the hint itself.
    await user.click(await screen.findByRole("button", { name: "Skip tips" }));
    expect(localStorage.getItem(COACH_SKIP_ALL_KEY)).toBe("true");
    expect(screen.queryByTestId("coach-mark-place")).toBeNull();

    await openHowToPlay(user);
    await user.click(screen.getByTestId("how-to-play-tips"));

    // The panel closes and the hint the learner's current state calls for is back.
    await waitFor(() => expect(screen.queryByTestId("how-to-play")).toBeNull());
    expect(localStorage.getItem(COACH_SKIP_ALL_KEY)).toBeNull();
    expect(await screen.findByTestId("coach-mark-place")).toBeInTheDocument();
  });

  it("suppresses coach-marks while the panel is open, and restores focus on close", async () => {
    const user = userEvent.setup();
    returningLearner();

    expect(await screen.findByTestId("coach-mark-place")).toBeInTheDocument();
    await openHowToPlay(user);
    // One dialog at a time: a hint must not sit on top of the reference card.
    expect(screen.queryByTestId("coach-mark-place")).toBeNull();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByTestId("how-to-play")).toBeNull());
    expect(screen.getByRole("button", { name: "Menu" })).toHaveFocus();
  });
});
