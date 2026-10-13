import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearCoachAnchors, setCoachAnchor } from "../coachmarks/coachAnchorRegistry";
import { CURRENT_ERA_ID } from "../eraDressing";
import { OnboardingAdvisor } from "./OnboardingAdvisor";
import {
  FIRST_BUILDING_TASK,
  hasSeenOnboardingAdvisor,
  ONBOARDING_ADVISOR_STEP_KEY,
  ONBOARDING_GATED_MOMENT,
  onboardingBriefingFor,
} from "./onboardingScript";

/**
 * **THE ONBOARDING ADVISOR AS A SURFACE: sequenced, resumable, skippable, never repeated, and
 * gated on a building the learner puts on their own island.**
 *
 * Those are the brief's own requirements and each one is a claim about behaviour rather than
 * about layout, so this is where they are held. The picture is
 * `advisorIsTheCrisisRegister.test.tsx`'s and the frames'; the copy is
 * `onboardingScript.test.ts`'s.
 *
 * **ONE MOMENT IS MOUNTED AND THE OTHERS ARE NOT IN THE DOM AT ALL.** That is asserted rather
 * than assumed, because it is the distinction the ask turns on: a collapsed accordion or a
 * scrolled column would satisfy "one section at a time" as a layout and miss it entirely as a
 * claim about what a learner is looking at.
 *
 * ## ⚑ THE GATE IS NOW THE CITY'S OWN PLACEMENT, AND THAT CHANGED WHAT THIS FILE DRIVES
 *
 * The product lead: *"they should actually have to place the building and not just drag a
 * house into a 2d box like what is the point of that bro."* So there is no board here to
 * press. What this component sees is a NUMBER — how many buildings the host has confirmed onto
 * the island — and the whole gate is "one more than there were when he started talking".
 *
 * The tests below drive that number through {@link harness}, which is exactly what
 * `CitySurface` does when `confirmPlacement` runs. That is the honest seam for a component
 * test: the placement itself belongs to the city and is driven end to end in
 * `CitySurface.onboarding.test.tsx` (through the real Build menu) and photographed in
 * `onboardingAdvisorShots.browser.test.tsx` (with a real pointer on the real canvas).
 *
 * ## ⚑ AND HALF OF THIS FILE IS ABOUT NOT TRAPPING ANYBODY
 *
 * A real placement is a longer road than a drag between two tiles, so every route past the
 * gate is driven here rather than argued for in a comment: the placement itself, "Place one
 * for me", the Build shortcut, Skip, Escape and Back.
 */

const BRIEFING = onboardingBriefingFor(CURRENT_ERA_ID);
const MOMENTS = BRIEFING.moments;
// From the FILTERED sequence, not `ONBOARDING_MOMENT_ORDER`: this file renders with no bay
// surface, so the raw authored order (which now has "bay" ahead of "place") and the walked
// sequence disagree by exactly the moments filtered out ahead of the gate.
const GATED_STEP = MOMENTS.findIndex((moment) => moment.id === ONBOARDING_GATED_MOMENT);
const VISITED_ACTIONS = {
  lessons: true,
  resources: true,
  civic: true,
  townhall: true,
  bay: true,
} as const;

/**
 * The component with a LIVE host behind it: a placement count that can be bumped, the two
 * flow booleans, and the two host callbacks.
 *
 * `placeOnTheIsland()` is the whole of what `CitySurface` reports when a placement is
 * confirmed, and `onPlaceForMe` is wired to it because that is what the host's own escape
 * hatch does — it performs a real placement, so the count goes up the same way.
 */
function harness({
  startAt = 0,
  onDone = vi.fn(),
}: {
  startAt?: number;
  onDone?: () => void;
} = {}) {
  const state = { count: startAt, menu: false, positioning: false };
  const onOpenBuildMenu = vi.fn(() => {
    state.menu = true;
    paint();
  });
  const placeOnTheIsland = () => {
    state.count += 1;
    state.menu = false;
    state.positioning = false;
    paint();
  };
  const onPlaceForMe = vi.fn(placeOnTheIsland);
  const view = render(node());
  function node() {
    return (
      <OnboardingAdvisor
        eraId={CURRENT_ERA_ID}
        placementCount={state.count}
        buildMenuOpen={state.menu}
        positioningOnIsland={state.positioning}
        actionVisits={VISITED_ACTIONS}
        onOpenBuildMenu={onOpenBuildMenu}
        onPlaceForMe={onPlaceForMe}
        onDone={onDone}
      />
    );
  }
  function paint() {
    view.rerender(node());
  }
  return {
    onDone,
    onOpenBuildMenu,
    onPlaceForMe,
    view,
    stage: screen.getByTestId("onboarding-advisor"),
    placeOnTheIsland,
    aimOnTheIsland: () => {
      state.menu = false;
      state.positioning = true;
      paint();
    },
    cancelAim: () => {
      state.positioning = false;
      paint();
    },
  };
}

function onScreen(): string | undefined {
  return screen.getByTestId("onboarding-advisor-moment").dataset.moment;
}

/** Walk to the gated moment, which is the only step Next will not simply pass. */
async function walkToTheGate(user: ReturnType<typeof userEvent.setup>) {
  for (let step = 0; step < GATED_STEP; step += 1) {
    await user.click(screen.getByTestId("onboarding-advisor-next"));
  }
  expect(onScreen()).toBe(ONBOARDING_GATED_MOMENT);
}

beforeEach(() => {
  localStorage.clear();
  clearCoachAnchors();
  document.body.removeAttribute("data-ob-stand-down");
});

describe("the sequence", () => {
  it("opens on the first moment and shows only that one", () => {
    // FLOOR: every "only one is mounted" assertion below is trivially true of a one-moment
    // sequence, so the sequence has to be long enough for the claim to have content. Seven,
    // not ten: "founding", "era" and "buildings" were all deliberately deleted.
    expect(MOMENTS.length).toBeGreaterThanOrEqual(8);
    const { stage } = harness();

    const first = MOMENTS[0];
    expect(onScreen()).toBe(first?.id);
    expect(screen.getByTestId("onboarding-advisor-lead")).toHaveTextContent(
      first?.lead ?? "",
    );
    expect(stage).toHaveTextContent(`Step 1 of ${MOMENTS.length}`);

    // AND THE OTHERS ARE NOT THERE. Read off the rendered text, so a hidden-but-mounted
    // section fails: `toHaveTextContent` sees a `display: none` subtree's text in jsdom.
    for (const later of MOMENTS.slice(1)) {
      expect(stage, `${later.id} is on screen with ${first?.id}`).not.toHaveTextContent(
        later.lead,
      );
      expect(stage).not.toHaveTextContent(later.body);
    }
    // Exactly one moment section in the document, whatever its state.
    expect(screen.getAllByTestId("onboarding-advisor-moment")).toHaveLength(1);
  });

  /**
   * **A MOMENT IS A SENTENCE, NOT A LIST, and no heading sits over it.**
   *
   * *"Avoid bullets where you can. The current screen is three bullets under a heading; it
   * reads as a specification rather than someone talking to you."* Both halves are asserted,
   * because deleting the bullets and keeping the heading would leave the label on the label.
   */
  it("draws prose with no bullets and no heading over it", () => {
    harness();
    const section = screen.getByTestId("onboarding-advisor-moment");
    expect(section.querySelector("ul, ol, li")).toBeNull();
    expect(section.querySelector("h1, h2, h3, h4, h5, h6")).toBeNull();
    // The section is still NAMED, which is what the heading was doing for a screen reader,
    // and the name is the moment's own title rather than a second string.
    expect(section).toHaveAccessibleName(MOMENTS[0]?.title ?? "");
    expect(screen.getByTestId("onboarding-advisor-body")).toHaveTextContent(
      MOMENTS[0]?.body ?? "",
    );
  });

  it("walks forward and back through every moment, replacing the one on screen", async () => {
    const user = userEvent.setup();
    const city = harness();

    for (const [index, moment] of MOMENTS.entries()) {
      expect(onScreen(), `step ${index + 1}`).toBe(moment.id);
      expect(screen.getByTestId("onboarding-advisor-lead")).toHaveTextContent(moment.lead);
      expect(screen.getByTestId("onboarding-advisor-body")).toHaveTextContent(moment.body);
      expect(screen.getAllByTestId("onboarding-advisor-moment")).toHaveLength(1);
      if (moment.id === ONBOARDING_GATED_MOMENT) {
        city.placeOnTheIsland();
      }
      if (index < MOMENTS.length - 1) {
        await user.click(screen.getByTestId("onboarding-advisor-next"));
      }
    }

    // Back walks the same ground in reverse, so the sequence is not one-way, and the gate
    // does not hold anybody going backwards either.
    for (let index = MOMENTS.length - 1; index > 0; index -= 1) {
      await user.click(screen.getByTestId("onboarding-advisor-back"));
      expect(onScreen()).toBe(MOMENTS[index - 1]?.id);
    }
    expect(screen.getByTestId("onboarding-advisor-back")).toBeDisabled();
  });

  it("holds Back back at the first moment rather than removing it", () => {
    // Disabled and not absent, so the row does not shift under the pointer between moments.
    harness();
    expect(screen.getByTestId("onboarding-advisor-back")).toBeInTheDocument();
    expect(screen.getByTestId("onboarding-advisor-back")).toBeDisabled();
  });

  it("names the last press's control after what it does", async () => {
    const user = userEvent.setup();
    const city = harness();
    // "Next" while there is more to read, and the primary action of the whole sequence on the
    // last moment. A dimmed Next at the end would leave the way out to be guessed at.
    expect(screen.getByTestId("onboarding-advisor-next")).toHaveTextContent("Next");
    for (let step = 0; step < MOMENTS.length - 1; step += 1) {
      if (onScreen() === ONBOARDING_GATED_MOMENT) {
        city.placeOnTheIsland();
      }
      await user.click(screen.getByTestId("onboarding-advisor-next"));
    }
    expect(screen.getByTestId("onboarding-advisor-next")).toHaveTextContent(
      "Start building",
    );
    expect(screen.getByTestId("onboarding-advisor-next")).toHaveAttribute(
      "aria-disabled",
      "false",
    );
  });
});

/* -------------------------------------------------------------------------- */
/* The gate                                                                    */
/* -------------------------------------------------------------------------- */

describe("placing the first building on the real island", () => {
  it("mounts the task on exactly one moment, with the imperative first", async () => {
    const user = userEvent.setup();
    harness();
    expect(screen.queryByTestId("ob-task")).toBeNull();
    await walkToTheGate(user);
    expect(screen.getByTestId("ob-task")).toBeInTheDocument();

    // The task line is the panel's FIRST child (`interactive-visuals` R24), above the control
    // that does it and never on the status line the next state overwrites.
    expect(screen.getByTestId("ob-task").firstElementChild).toHaveTextContent(
      FIRST_BUILDING_TASK.task,
    );
    // AND THERE IS NO BOARD. The two-tile drag surface is deleted rather than hidden, which is
    // the difference between "the learner places a building" and "the learner rehearses one".
    expect(screen.queryByTestId("ob-place")).toBeNull();
    expect(screen.queryByTestId("ob-place-house")).toBeNull();
    expect(screen.queryByTestId("ob-place-plot")).toBeNull();
  });

  /**
   * **THE STAGE HANDS THE SCREEN BACK, WHICH IS WHAT MAKES A REAL PLACEMENT POSSIBLE AT ALL.**
   *
   * `AdvisorStage` is `role="dialog"` + `aria-modal` over the whole viewport, and that is why
   * the first attempt built a board inside the bubble: nothing underneath could be clicked. So
   * this is the load-bearing assertion of the whole change, and it is asserted in BOTH
   * directions on one walk, because "it is not modal" is worthless without "and it was".
   */
  it("stands the stage down for the gated moment, and takes it back afterwards", async () => {
    const user = userEvent.setup();
    const city = harness();

    // BEFORE: a real modal, which is what every other moment is.
    expect(screen.getByTestId("onboarding-advisor")).toHaveAttribute("role", "dialog");
    expect(screen.getByTestId("onboarding-advisor")).toHaveAttribute("aria-modal", "true");
    expect(document.body.dataset.obStandDown).toBeUndefined();

    await walkToTheGate(user);
    const stood = screen.getByTestId("onboarding-advisor");
    expect(stood).toHaveAttribute("role", "group");
    expect(stood).not.toHaveAttribute("aria-modal");
    expect(stood.dataset.standingDown).toBe("true");
    // The attribute the stylesheet keys the pointer-transparency and the confirm bar's lift
    // off. Without it the one button that finishes a placement is painted behind him.
    expect(document.body.dataset.obStandDown).toBe("true");

    // AFTER: the building is down, so there is nothing left to reach past him and he takes
    // the screen back on the same frame.
    city.placeOnTheIsland();
    const back = screen.getByTestId("onboarding-advisor");
    expect(back).toHaveAttribute("role", "dialog");
    expect(back).toHaveAttribute("aria-modal", "true");
    expect(document.body.dataset.obStandDown).toBeUndefined();
  });

  it("holds Next until a building is on the island, and says why when it is pressed", async () => {
    const user = userEvent.setup();
    const city = harness();
    await walkToTheGate(user);

    const next = screen.getByTestId("onboarding-advisor-next");
    // `aria-disabled`, never `disabled`: it keeps its place in the tab order and answers a
    // press. A dead control on the first screen anybody sees explains nothing.
    expect(next).toHaveAttribute("aria-disabled", "true");
    expect(next).toBeEnabled();

    await user.click(next);
    expect(onScreen(), "a gated Next advanced anyway").toBe(ONBOARDING_GATED_MOMENT);
    expect(screen.getByTestId("ob-task-status")).toHaveTextContent(
      FIRST_BUILDING_TASK.nudge,
    );
    // And it puts the keyboard on the control that gets it done, so the next press does
    // something.
    expect(screen.getByTestId("ob-task-open-build")).toHaveFocus();

    city.placeOnTheIsland();
    expect(screen.getByTestId("onboarding-advisor-next")).toHaveAttribute(
      "aria-disabled",
      "false",
    );
    await user.click(screen.getByTestId("onboarding-advisor-next"));
    expect(onScreen()).not.toBe(ONBOARDING_GATED_MOMENT);
  });

  /**
   * **THE GATE IS BLIND TO HOW THE BUILDING GOT THERE, and that is the point of counting.**
   *
   * A learner who never reads the panel, finds the Build pill themselves and puts a Longhouse
   * down has done the thing. The tutorial has no widget of its own to be satisfied by, so
   * there is nothing here that can be satisfied WITHOUT the city changing.
   */
  it("opens on a placement the learner made without touching the panel", async () => {
    const user = userEvent.setup();
    const city = harness();
    await walkToTheGate(user);
    expect(screen.getByTestId("onboarding-advisor-next")).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    city.placeOnTheIsland();

    expect(screen.getByTestId("onboarding-advisor-next")).toHaveAttribute(
      "aria-disabled",
      "false",
    );
    expect(screen.getByTestId("ob-task-status")).toHaveTextContent(
      FIRST_BUILDING_TASK.done,
    );
    expect(screen.getByTestId("ob-task").dataset.placed).toBe("true");
    await user.click(screen.getByTestId("onboarding-advisor-next"));
    expect(onScreen()).not.toBe(ONBOARDING_GATED_MOMENT);
  });

  /**
   * **A CITY THAT ALREADY HAS BUILDINGS STILL OWES ONE.**
   *
   * First-run onboarding opens on a bare island, but How to play and the dev replay control
   * both reopen this sequence over a city that has been played, and a gate reading
   * `count > 0` would already be open there — the learner would walk past the one moment that
   * asks for something. The baseline is latched at the mount, so what is owed is one MORE.
   */
  it("asks for a NEW building when it replays over a city that already has some", async () => {
    const user = userEvent.setup();
    const city = harness({ startAt: 7 });
    await walkToTheGate(user);
    expect(screen.getByTestId("onboarding-advisor-next")).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    city.placeOnTheIsland();
    expect(screen.getByTestId("onboarding-advisor-next")).toHaveAttribute(
      "aria-disabled",
      "false",
    );
  });

  it("narrates the flow the learner is actually in", async () => {
    const user = userEvent.setup();
    const city = harness();
    await walkToTheGate(user);
    expect(screen.getByTestId("ob-task-status")).toHaveTextContent(
      FIRST_BUILDING_TASK.prompt,
    );

    // The shortcut opens the REAL Build menu, which is the host's own `openShop`.
    await user.click(screen.getByTestId("ob-task-open-build"));
    expect(city.onOpenBuildMenu).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("ob-task").dataset.stage).toBe("choosing");
    expect(screen.getByTestId("ob-task-status")).toHaveTextContent(
      FIRST_BUILDING_TASK.choosing,
    );

    city.aimOnTheIsland();
    expect(screen.getByTestId("ob-task").dataset.stage).toBe("positioning");
    expect(screen.getByTestId("ob-task-status")).toHaveTextContent(
      FIRST_BUILDING_TASK.positioning,
    );

    // BACKED OUT. Nothing is wrong and nothing is lost, and the line says so rather than
    // repeating the opening instruction at somebody who has plainly read it.
    city.cancelAim();
    expect(screen.getByTestId("ob-task").dataset.stage).toBe("idle");
    expect(screen.getByTestId("ob-task-status")).toHaveTextContent(
      FIRST_BUILDING_TASK.cancelled,
    );
  });

  /**
   * **THE WAY PAST IT, and it is on screen from the first frame of the moment.**
   *
   * *"A learner who cannot complete it is stuck at the front door of the demo. Make sure
   * there is always a way forward."* An escape that only appears after a failure is an escape
   * the learner who most needs it never finds, so this is present the moment the task is, and
   * it is honest about who did the placing.
   */
  it("offers to place one for the learner, from the first frame of the moment", async () => {
    const user = userEvent.setup();
    const city = harness();
    expect(screen.queryByTestId("onboarding-advisor-place-for-me")).toBeNull();
    await walkToTheGate(user);

    const bailOut = screen.getByTestId("onboarding-advisor-place-for-me");
    expect(bailOut).toHaveTextContent(FIRST_BUILDING_TASK.doItForMe);
    await user.click(bailOut);

    // IT WENT THROUGH THE HOST. The tutorial has no way of its own to put a building down, so
    // an escape hatch that satisfied the gate without calling this would be a gate that can
    // be opened without a placement.
    expect(city.onPlaceForMe).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("ob-task").dataset.placed).toBe("true");
    // It says what happened rather than crediting the learner with a placement they did not
    // make.
    expect(screen.getByTestId("ob-task-status")).toHaveTextContent(
      FIRST_BUILDING_TASK.doneForYou,
    );
    // The gate is open and the offer is gone, because there is nothing left to place.
    expect(screen.getByTestId("onboarding-advisor-next")).toHaveAttribute(
      "aria-disabled",
      "false",
    );
    expect(screen.queryByTestId("onboarding-advisor-place-for-me")).toBeNull();
    await user.click(screen.getByTestId("onboarding-advisor-next"));
    expect(onScreen()).not.toBe(ONBOARDING_GATED_MOMENT);
  });

  it("offers no escape hatch when there is no host behind it to place anything", () => {
    // A button that does nothing is worse than no button: the learner presses it and concludes
    // the game is broken. Standalone mounts (this file's own older harness, and the shots
    // suite's size measurement) have no host, so the offer is absent rather than inert.
    render(<OnboardingAdvisor eraId={CURRENT_ERA_ID} onDone={vi.fn()} />);
    expect(screen.queryByTestId("onboarding-advisor-place-for-me")).toBeNull();
  });

  it("remembers the placement when the learner walks back to it", async () => {
    const user = userEvent.setup();
    const city = harness();
    await walkToTheGate(user);
    city.placeOnTheIsland();
    await user.click(screen.getByTestId("onboarding-advisor-next"));
    await user.click(screen.getByTestId("onboarding-advisor-back"));

    // The panel unmounts with its moment, so a gate kept inside it would shut again behind
    // the learner: press Next, press Back, and the building they placed is forgotten.
    expect(onScreen()).toBe(ONBOARDING_GATED_MOMENT);
    expect(screen.getByTestId("ob-task").dataset.placed).toBe("true");
    expect(screen.getByTestId("onboarding-advisor-next")).toHaveAttribute(
      "aria-disabled",
      "false",
    );
  });

  it("never gates Skip, Escape or Back", async () => {
    const user = userEvent.setup();
    const city = harness();
    await walkToTheGate(user);

    // BACK, off the gated moment, with nothing placed.
    await user.click(screen.getByTestId("onboarding-advisor-back"));
    expect(onScreen()).not.toBe(ONBOARDING_GATED_MOMENT);
    await user.click(screen.getByTestId("onboarding-advisor-next"));

    // SKIP, one press, from the gated frame.
    await user.click(screen.getByTestId("onboarding-advisor-skip"));
    expect(city.onDone).toHaveBeenCalledWith("skipped");
  });

  it("Escape leaves from the gated moment too", async () => {
    const user = userEvent.setup();
    const city = harness();
    await walkToTheGate(user);
    await user.keyboard("{Escape}");
    expect(city.onDone).toHaveBeenCalledWith("skipped");
  });
});

/* -------------------------------------------------------------------------- */
/* The spotlight                                                               */
/* -------------------------------------------------------------------------- */

describe("the spotlight over the live HUD", () => {
  /**
   * The DOM half of *"whenever a concept is mentioned, highlight the corresponding
   * control"*. Whether the ring is VISIBLE is a spatial claim and jsdom cannot answer it;
   * that is `onboardingAdvisorShots.browser.test.tsx`'s, which photographs the ring over the
   * control at 1024x580. What is answerable here is that the right element is picked, that
   * the panel holding it is lifted, and that both are put back.
   */
  it("rings the control the moment names, and lifts the panel it lives in", async () => {
    const user = userEvent.setup();
    const panel = document.createElement("div");
    panel.className = "hud hud-dock";
    const build = document.createElement("button");
    panel.append(build);
    document.body.append(panel);
    setCoachAnchor("build", build);

    const city = harness();
    // Nothing on the opening moment: he is introducing himself.
    expect(screen.queryByTestId("onboarding-spotlight")).toBeNull();

    // Specifically a build-spotlight moment that is NOT the gate: "place" also spotlights
    // "build" but is the placement gate itself, whose stage stands down and rings the
    // control "live" (see the very next test) rather than the plain "true" this case is
    // about. "civic" is the other "build" spotlight and, with `VISITED_ACTIONS` marking it
    // already visited, is not gated in this harness.
    const buildStep = MOMENTS.findIndex(
      (moment) => moment.spotlight === "build" && moment.id !== ONBOARDING_GATED_MOMENT,
    );
    expect(buildStep, "no moment points at the Build menu").toBeGreaterThan(0);
    for (let step = 0; step < buildStep; step += 1) {
      // "civic" now sits past the placement gate ("place"), so the walk has to clear it
      // like any other pass-through of that moment.
      if (onScreen() === ONBOARDING_GATED_MOMENT) {
        city.placeOnTheIsland();
      }
      await user.click(screen.getByTestId("onboarding-advisor-next"));
    }

    const ring = screen.getByTestId("onboarding-spotlight");
    expect(ring).toHaveAttribute("data-anchor", "build");
    expect(ring).toHaveAttribute("aria-hidden", "true");
    expect(build.dataset.spotlit).toBe("true");
    // THE LIFT, which is the half that makes the ring worth drawing: the advisor's stage is
    // above the HUD, so a control that is not raised is behind the bubble talking about it.
    expect(panel.dataset.spotlit).toBe("true");

    // And it is put back when the sequence leaves the controls it lights, so nothing is left
    // lit behind him. Walked all the way to the end (or to "lessons", the next moment that
    // owns a live surface of its own).
    for (const moment of MOMENTS.slice(buildStep)) {
      if (moment.id === ONBOARDING_GATED_MOMENT) {
        city.placeOnTheIsland();
      }
      await user.click(screen.getByTestId("onboarding-advisor-next"));
      if (onScreen() === undefined || MOMENTS.at(-1)?.id === moment.id) {
        break;
      }
      if (screen.getByTestId("onboarding-advisor-moment").dataset.moment === "lessons") {
        break;
      }
    }
    expect(panel.dataset.spotlit).toBeUndefined();
    expect(build.dataset.spotlit).toBeUndefined();

    panel.remove();
  });

  /**
   * **THE ONE MOMENT WHOSE RING HAS TO LEAVE THE CONTROL CLICKABLE.**
   *
   * The lift normally carries `pointer-events: none` for its panel's children, because raising
   * a panel past an `aria-modal` dialogue would otherwise hand its buttons back the clicks the
   * dialogue is holding. On the placement moment there IS no modal and the ringed control is
   * the one the learner has just been told to press, so the attribute carries `"live"` and
   * `onboardingSpotlight.css` leaves the pointer alone.
   *
   * Both values are read on one walk, because `"live"` is only interesting against the
   * `"true"` it differs from.
   */
  it("hands the ringed control its clicks back on the moment the stage stands down", async () => {
    const user = userEvent.setup();
    const panel = document.createElement("div");
    panel.className = "hud hud-dock";
    const build = document.createElement("button");
    panel.append(build);
    document.body.append(panel);
    setCoachAnchor("build", build);

    harness();
    for (let step = 0; step < GATED_STEP; step += 1) {
      await user.click(screen.getByTestId("onboarding-advisor-next"));
      if (onScreen() !== ONBOARDING_GATED_MOMENT) {
        // The moment before the gate also rings Build, and it is modal, so the control is
        // deliberately not clickable there.
        expect(panel.dataset.spotlit).toBe("true");
      }
    }
    expect(onScreen()).toBe(ONBOARDING_GATED_MOMENT);
    expect(panel.dataset.spotlit).toBe("live");
    expect(build.dataset.spotlit).toBe("live");

    panel.remove();
  });

  it("goes dark once the learner is inside the flow it sent them to", async () => {
    // A ring round the Build pill is right at the start of the placement moment and wrong over
    // an open Build menu or a ghost on the grid, where the control it frames is covered by the
    // panel it sent the learner to.
    const user = userEvent.setup();
    const panel = document.createElement("div");
    panel.className = "hud hud-dock";
    const build = document.createElement("button");
    panel.append(build);
    document.body.append(panel);
    setCoachAnchor("build", build);

    const city = harness();
    await walkToTheGate(user);
    expect(screen.getByTestId("onboarding-spotlight")).toBeInTheDocument();

    await user.click(screen.getByTestId("ob-task-open-build"));
    expect(screen.queryByTestId("onboarding-spotlight")).toBeNull();

    city.aimOnTheIsland();
    expect(screen.queryByTestId("onboarding-spotlight")).toBeNull();

    panel.remove();
  });

  it("draws no ring when the control it names is not mounted", async () => {
    // The stockpile lives in `EconomyHud`, which a signed-out shell does not mount. A
    // spotlight with nothing to point at draws nothing rather than a ring at the origin.
    const user = userEvent.setup();
    const city = harness();
    const step = MOMENTS.findIndex((moment) => moment.spotlight === "economy");
    expect(step, "no moment points at the stockpile").toBeGreaterThan(0);
    for (let index = 0; index < step; index += 1) {
      if (onScreen() === ONBOARDING_GATED_MOMENT) {
        city.placeOnTheIsland();
      }
      await user.click(screen.getByTestId("onboarding-advisor-next"));
    }
    expect(onScreen()).toBe(MOMENTS[step]?.id);
    expect(screen.queryByTestId("onboarding-spotlight")).toBeNull();
  });
});

describe("resuming, and being seen exactly once", () => {
  it("writes the step it reaches, so closing the tab does not restart it", async () => {
    const user = userEvent.setup();
    harness();

    await user.click(screen.getByTestId("onboarding-advisor-next"));
    expect(localStorage.getItem(ONBOARDING_ADVISOR_STEP_KEY)).toBe("1");
    // Written on the ADVANCE and not on unmount, because a closing tab runs no cleanup worth
    // relying on. So the flag is already correct here, before anything is torn down.
    expect(hasSeenOnboardingAdvisor()).toBe(false);
  });

  it("opens on the moment the last visit reached, on its FIRST frame", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <OnboardingAdvisor eraId={CURRENT_ERA_ID} onDone={vi.fn()} />,
    );
    await user.click(screen.getByTestId("onboarding-advisor-next"));
    expect(onScreen()).toBe(MOMENTS[1]?.id);
    unmount();

    // A fresh mount, which is what a reopened tab is. The step is seeded as lazy initial
    // state, so moment two is what PAINTS: an effect-seeded version would show moment one
    // first and jump, which reads as a glitch and announces the wrong sentence on the way.
    harness();
    expect(onScreen()).toBe(MOMENTS[1]?.id);
    expect(screen.getByTestId("onboarding-advisor")).toHaveTextContent(
      `Step 2 of ${MOMENTS.length}`,
    );
  });

  it("reports walking the whole sequence, and remembers it", async () => {
    const user = userEvent.setup();
    const city = harness();

    for (let step = 0; step < MOMENTS.length; step += 1) {
      if (onScreen() === ONBOARDING_GATED_MOMENT) {
        city.placeOnTheIsland();
      }
      await user.click(screen.getByTestId("onboarding-advisor-next"));
    }
    // WALKED, which is what tells the host the retired hints have actually been said.
    expect(city.onDone).toHaveBeenCalledTimes(1);
    expect(city.onDone).toHaveBeenCalledWith("walked");
    expect(hasSeenOnboardingAdvisor()).toBe(true);
  });

  it("skips instantly from the first frame, and reports that it was skipped", async () => {
    const user = userEvent.setup();
    const city = harness();

    // ONE PRESS, on moment one, with nothing gated. Somebody demoing on Friday presses this.
    await user.click(screen.getByTestId("onboarding-advisor-skip"));
    expect(city.onDone).toHaveBeenCalledTimes(1);
    // SKIPPED, not walked: the learner has been told nothing, so the host leaves the
    // contextual hints in place as the fallback.
    expect(city.onDone).toHaveBeenCalledWith("skipped");
    // And it is still never repeated, which is the other half of the requirement.
    expect(hasSeenOnboardingAdvisor()).toBe(true);
  });

  it("Escape is the same way out as Skip", async () => {
    const user = userEvent.setup();
    const city = harness();

    await user.keyboard("{Escape}");
    expect(city.onDone).toHaveBeenCalledWith("skipped");
    expect(hasSeenOnboardingAdvisor()).toBe(true);
  });
});

describe("keyboard and screen reader", () => {
  it("is a modal dialogue named by a heading nothing draws", () => {
    // The crisis advisor's precedent exactly: a speech bubble with no title ribbon would leave
    // the dialog unnamed, so the title rides a visually-hidden heading.
    const { stage } = harness();
    expect(stage).toHaveAttribute("role", "dialog");
    expect(stage).toHaveAttribute("aria-modal", "true");
    expect(stage).toHaveAccessibleName(BRIEFING.title);
    const heading = within(stage).getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent(BRIEFING.title);
    expect(heading.className).toContain("visually-hidden");
  });

  it("opens with focus on Next, so the sequence walks from the keyboard alone", async () => {
    const user = userEvent.setup();
    harness();
    expect(screen.getByTestId("onboarding-advisor-next")).toHaveFocus();

    // Enter on the focused control advances, which is the whole claim.
    await user.keyboard("{Enter}");
    expect(onScreen()).toBe(MOMENTS[1]?.id);
  });

  it("traps Tab inside the dialogue, wrapping past the control that cannot take focus", async () => {
    const user = userEvent.setup();
    const city = harness();
    const back = screen.getByTestId("onboarding-advisor-back");
    const next = screen.getByTestId("onboarding-advisor-next");
    const skip = screen.getByTestId("onboarding-advisor-skip");

    /*
     * THE REPRODUCTION FOR `AdvisorStage`'s `trapBoundary`, and it is why the expected element
     * here is Next rather than Back.
     *
     * Back is the first control in the DOM and is DISABLED on moment one, so a trap that took
     * the raw first match for its boundary called `.focus()` on something that refuses it and
     * left focus on Skip: the dialogue did not leak, it stopped cycling. Remove the filter and
     * this line goes red with Skip still focused, which is the state it was written against.
     */
    expect(back).toBeDisabled();
    skip.focus();
    await user.tab();
    expect(next).toHaveFocus();

    await user.tab({ shift: true });
    expect(skip).toHaveFocus();

    // And once Back can take focus it is a boundary again, so the filter is about the disabled
    // state rather than about that button. Lands on "place", the placement gate, which is
    // deliberately NOT modal while ungated (`AdvisorStage`'s `modal={!standingDown}`) -- place
    // a building first so the trap under test is actually engaged here rather than on a
    // stage that has stood down and stopped trapping Tab at all.
    await user.click(next);
    expect(onScreen()).toBe(ONBOARDING_GATED_MOMENT);
    city.placeOnTheIsland();
    expect(screen.getByTestId("onboarding-advisor-back")).toBeEnabled();
    screen.getByTestId("onboarding-advisor-skip").focus();
    await user.tab();
    expect(screen.getByTestId("onboarding-advisor-back")).toHaveFocus();
  });

  /**
   * **AND THE TRAP LETS GO ON THE ONE MOMENT THAT IS NOT MODAL.**
   *
   * A learner driving from the keyboard has to be able to Tab out of the panel and into the
   * Build menu, which is what the placement moment is telling them to do. A trap that held
   * them inside a non-modal panel would be the keyboard route to the one gate that cannot be
   * passed any other way.
   */
  it("lets Tab out of the panel on the gated moment", async () => {
    const user = userEvent.setup();
    harness();
    // Something outside the stage for Tab to reach, appended AFTER the render so it is the
    // next thing in document order. It stands in for the Build pill.
    const outside = document.createElement("button");
    outside.textContent = "Build";
    document.body.append(outside);

    await walkToTheGate(user);
    const skip = screen.getByTestId("onboarding-advisor-skip");
    skip.focus();
    await user.tab();
    expect(skip, "Tab wrapped back inside a panel that is not modal").not.toHaveFocus();
    expect(outside).toHaveFocus();

    outside.remove();
  });

  it("announces each moment as it changes, without focus having to move", async () => {
    const user = userEvent.setup();
    harness();
    const live = screen
      .getByTestId("onboarding-advisor-moment")
      .closest("[aria-live]") as HTMLElement;
    expect(live).not.toBeNull();
    expect(live).toHaveAttribute("aria-live", "polite");

    // The region PERSISTS and the section inside it is keyed, so pressing Next replaces a
    // subtree inside a region that was already there and the change is announced. A region
    // that remounted with its contents would announce nothing.
    await user.click(screen.getByTestId("onboarding-advisor-next"));
    await waitFor(() => expect(onScreen()).toBe(MOMENTS[1]?.id));
    expect(screen.getByTestId("onboarding-advisor-moment").closest("[aria-live]")).toBe(
      live,
    );
  });

  it("says the step in words, and never only in the dots", () => {
    harness();
    const stage = screen.getByTestId("onboarding-advisor");
    expect(stage).toHaveTextContent(`Step 1 of ${MOMENTS.length}`);
    // The dots are decoration on top of that sentence: hidden from the reader, and differing
    // in fill AND size rather than in hue alone (`crisisCall.css` sets both).
    const dots = stage.querySelector(".crisis-call-dots");
    expect(dots).toHaveAttribute("aria-hidden", "true");
    expect(dots?.querySelectorAll(".crisis-call-dot")).toHaveLength(MOMENTS.length);
    expect(
      stage.querySelector('.crisis-call-dot[data-state="current"]'),
    ).toBeInTheDocument();
  });

  it("draws the figure as decoration, with the words carrying the meaning", () => {
    const { stage } = harness();
    const figure = stage.querySelector(".crisis-call-speech__figure");
    expect(figure).toHaveAttribute("aria-hidden", "true");
    // He is in the era's clothes, read off the rendered figure rather than off the briefing.
    expect(stage.querySelector<HTMLElement>(".oru-advisor")?.dataset.dress).toBe(
      CURRENT_ERA_ID,
    );
    // And who is speaking is in words, because the drawing is hidden from the reader.
    expect(stage).toHaveTextContent(`${BRIEFING.advisorName} says:`);
  });
});
