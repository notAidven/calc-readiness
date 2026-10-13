import { teachingOrder } from "@cr/skill-graph";
import type { PlacementEstimate, StudentNodeState } from "@cr/state-schema";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { PlacementSeed } from "../diagnostic/placementRosters";
import { materialWord } from "../economy/materialWord";
import { CompletionRewardProvider } from "../rewards/CompletionRewardProvider";
import { CitySurface } from "./CitySurface";
import { createCityDevSession, D1_NODE_IDS } from "./citySession";
import { DEFAULT_ERA_ID } from "./eraState";
import type { LessonHost } from "./lessonHost";
import { MOCK_NODE_STATES } from "./mockCity";
import { ROAD_TILE_GOLD_COST } from "./roads";
import { TOWN_HALL_ID } from "./townHall";
import type { CityLoad } from "./types";
import { BUILDABLE_RADIUS, defaultPlacements, type PlacedTransform } from "./worldLayout";

type User = ReturnType<typeof userEvent.setup>;

/**
 * A pretest placement over this island's roster with `passing` at a robust pass. The reward
 * screen's headline counts THIS rather than any roster, so these cases read "N of 6" because
 * the placement covers six — `celebrationDenominator.test.tsx` owns the widened case, where
 * the administration is larger than the island and the two numbers have to come apart.
 */
function placementPassing(passing: readonly string[]): PlacementSeed {
  const placement: Record<string, PlacementEstimate> = {};
  for (const nodeId of D1_NODE_IDS) {
    placement[nodeId] = passing.includes(nodeId) ? 3 : 0;
  }
  return placement;
}

/**
 * The roster button (semantic source of truth) for a skill, found by the stable
 * `data-node-id` hook. The visible label deliberately shows only learner-facing
 * names (the building name + its skill topic) — the internal `NUM.X` registry id
 * is kept out of the UI — so the label can no longer be used to locate a row.
 */
function plotButton(nodeId: string): HTMLElement {
  const button = document.querySelector<HTMLElement>(
    `button.city-plot[data-node-id="${nodeId}"]`,
  );
  if (!button) {
    throw new Error(`No roster button rendered for ${nodeId}`);
  }
  return button;
}

/** The always-present Build control — the ready signal and door to the Built shelf. */
function ready(): Promise<HTMLElement> {
  return screen.findByRole("button", { name: "Build" });
}

/** Open Build, then expand its Built subsection. */
async function openBuildings(user: User): Promise<void> {
  const build = await ready();
  let shop = screen.queryByRole("dialog", { name: /Choose a skill to build/ });
  if (!shop) {
    await user.click(build);
    shop = await screen.findByRole("dialog", { name: /Choose a skill to build/ });
  }
  const built = within(shop).getByRole("button", { name: /^Built \d+\/\d+$/ });
  if (built.getAttribute("aria-expanded") !== "true") {
    await user.click(built);
  }
}

/** Open the ☰ Menu (Survey/Lessons/Checker + Cosmetics + Dev). */
async function openMenu(user: User): Promise<void> {
  const button = screen.getByRole("button", { name: "Menu" });
  if (button.getAttribute("aria-expanded") !== "true") {
    await user.click(button);
  }
}

/** Open the top-left Town capsule popover (storm + reward preview). */
async function openTown(user: User): Promise<void> {
  const button = screen.getByRole("button", { name: /Foundations/ });
  if (button.getAttribute("aria-expanded") !== "true") {
    await user.click(button);
  }
}

const ALL_NODES = MOCK_NODE_STATES.map((state) => state.node_id);
/**
 * The Town Hall is the required first placement (spec D-TH1). Compute the hall AND
 * every skill together so they never overlap; the hall is listed first, so it lands
 * the centre-most plot (`defaultPlacements` sorts nearest-origin-first).
 */
const ALL_WITH_HALL = defaultPlacements([TOWN_HALL_ID, ...ALL_NODES], [], BUILDABLE_RADIUS);
/** The founded Town Hall placement for the full-city shapes. */
const TOWN_HALL_PLACEMENT: PlacedTransform | null =
  ALL_WITH_HALL.find((p) => p.nodeId === TOWN_HALL_ID) ?? null;
/** Free-form transforms for every skill (a spread, non-overlapping layout). */
const ALL_PLACED = ALL_WITH_HALL.filter((p) => p.nodeId !== TOWN_HALL_ID);

/** A pre-seeded-hall placement clear of the origin, for load-shape fixtures. */
const HALL_PLACEMENT: PlacedTransform = { nodeId: TOWN_HALL_ID, col: -1, row: 3, rot: 0 };

/** Skill placements + the founded hall for an arbitrary skill set (mutually clear). */
function placeWithHall(skillIds: readonly string[]): {
  placements: PlacedTransform[];
  town_hall: PlacedTransform | null;
} {
  const all = defaultPlacements([TOWN_HALL_ID, ...skillIds], [], BUILDABLE_RADIUS);
  return {
    placements: all.filter((p) => p.nodeId !== TOWN_HALL_ID),
    town_hall: all.find((p) => p.nodeId === TOWN_HALL_ID) ?? null,
  };
}

/** A fully-placed load (the founded hall + every skill), the full-city shape. */
function fullLoad(over: Partial<CityLoad> = {}): CityLoad {
  return {
    node_states: MOCK_NODE_STATES,
    placements: ALL_PLACED,
    town_hall: TOWN_HALL_PLACEMENT,
    ...over,
  };
}

function masteredLoad(): CityLoad {
  return {
    node_states: MOCK_NODE_STATES.map((state) => ({
      ...state,
      mastery: 2,
      lesson_stage: "done",
      completion_status: "complete",
    })) as StudentNodeState[],
    neighborhood_state: null,
    placements: ALL_PLACED,
    town_hall: TOWN_HALL_PLACEMENT,
  };
}

describe("CitySurface — 3D city shell", () => {
  it("keeps the keyboard-accessible DOM roster as the semantic source of truth", async () => {
    const user = userEvent.setup();
    render(<CitySurface enableCanvas={false} />);
    await openBuildings(user);

    // 3-step progression: the built variants collapse to one Complete stage, so
    // mastered (NUM.S), complete (NUM.F), and a below-bar finished practice (NUM.2)
    // all read "Complete" — the mastery quality shows as stars, not the state label.
    const expectations: [string, string][] = [
      ["NUM.S", "Complete"],
      ["NUM.F", "Complete"],
      ["NUM.2", "Complete"],
      ["NUM.3", "Under construction"],
      ["NUM.4", "Breaking ground"],
      ["NUM.5", "Not started"],
    ];
    for (const [nodeId, label] of expectations) {
      expect(plotButton(nodeId)).toHaveTextContent(label);
    }
  });

  it("renders the deterministic fallback backdrop when the canvas cannot mount", async () => {
    render(<CitySurface enableCanvas={false} />);
    await ready();
    expect(screen.getByTestId("city-backdrop")).toBeInTheDocument();
  });

  it("falls back to the DOM backdrop when WebGL is unavailable (canvas smoke)", async () => {
    // enableCanvas defaults true; jsdom has no WebGL, so the R3F canvas fails
    // closed to the static backdrop without loading three or crashing.
    render(<CitySurface />);
    await ready();
    expect(screen.getByTestId("city-backdrop")).toBeInTheDocument();
  });

  it("surfaces the descriptor-driven archetype in the roster and a lesson menu on click", async () => {
    const user = userEvent.setup();
    render(<CitySurface enableCanvas={false} />);
    await openBuildings(user);

    expect(plotButton("NUM.S")).toHaveAttribute("data-archetype", "numeric");
    expect(plotButton("NUM.3")).toHaveAttribute("data-archetype", "constructed_response");
    expect(plotButton("NUM.F")).toHaveAttribute("data-archetype", "numeric");

    // Clicking a placed building opens its lesson menu, titled by the building name
    // and its lesson (the diegetic detail the old callout carried).
    await user.click(plotButton("NUM.3"));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Workshop");
    expect(dialog).toHaveTextContent("Field properties / distributive");
  });

  it("renders a preview building when a node is not authoring-complete", async () => {
    const user = userEvent.setup();
    const loadCity = () =>
      Promise.resolve<CityLoad>(fullLoad({ authoring_complete: { "NUM.5": false } }));
    render(<CitySurface enableCanvas={false} loadCity={loadCity} />);
    await openBuildings(user);
    expect(plotButton("NUM.5")).toHaveTextContent("Preview");
  });

  it("shows no detail card on an empty island until a building is selected", async () => {
    const user = userEvent.setup();
    // An empty island: no placements → nothing is selected → no contextual card.
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={() => Promise.resolve({ node_states: MOCK_NODE_STATES, placements: [] })}
      />,
    );
    await ready();
    expect(screen.queryByRole("button", { name: "Build it" })).toBeNull();

    // Selecting (roving to) a skill reveals the contextual "Ready to build" card —
    // skills are placeable immediately (the pre-seeded hub imposes no gate).
    await openBuildings(user);
    plotButton("NUM.S").focus();
    await user.keyboard("{ArrowDown}");
    const detail = document.querySelector<HTMLElement>(".hud-detail .city-detail");
    expect(detail).not.toBeNull();
    expect(within(detail as HTMLElement).getByRole("button")).toHaveTextContent(/Build it/);
  });

  it("moves selection and focus between lots with the keyboard", async () => {
    const user = userEvent.setup();
    render(<CitySurface enableCanvas={false} />);
    await openBuildings(user);

    // Roving (arrow keys) SELECTS without opening the lesson popup — that's an
    // explicit activation (click / Enter). Selection moves focus + aria-pressed.
    plotButton("NUM.S").focus();
    await user.keyboard("{ArrowDown}");
    const second = plotButton("NUM.F");
    expect(second).toHaveFocus();
    expect(second).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("dialog", { name: /Choose a skill to build/ }),
    ).toBeInTheDocument();

    await user.keyboard("{End}");
    const last = plotButton("NUM.5");
    expect(last).toHaveFocus();
    expect(last).toHaveAttribute("aria-pressed", "true");
  });

  it("collapses Built on Escape, keeps Build open, and returns focus to its summary", async () => {
    const user = userEvent.setup();
    render(<CitySurface enableCanvas={false} />);
    await openBuildings(user);
    const shop = screen.getByRole("dialog", { name: /Choose a skill to build/ });
    const summary = within(shop).getByRole("button", { name: /^Built \d+\/\d+$/ });
    expect(summary).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");
    expect(summary).toHaveAttribute("aria-expanded", "false");
    expect(summary).toHaveFocus();
    expect(shop).toBeInTheDocument();
  });

  it("exposes a keyboard-focusable village viewport and a labelled camera toolbar", async () => {
    const user = userEvent.setup();
    render(<CitySurface enableCanvas={false} />);
    await ready();

    const viewport = screen.getByTestId("city-viewport");
    viewport.focus();
    expect(viewport).toHaveFocus();

    // Village camera keys (pan / zoom / recenter / orbit) are handled (no-op
    // without a live 3D camera) and never throw. Q/E orbit the azimuth.
    await user.keyboard("{ArrowRight}");
    await user.keyboard("{ArrowUp}");
    await user.keyboard("+");
    await user.keyboard("q");
    await user.keyboard("e");
    await user.keyboard("0");

    for (const label of [
      "Rotate view left",
      "Rotate view right",
      "Zoom in",
      "Recenter view",
      "Zoom out",
    ]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    await user.click(screen.getByRole("button", { name: "Rotate view left" }));
    await user.click(screen.getByRole("button", { name: "Zoom in" }));
  });

  it("cycles the runtime lighting LUT (day → night → colorblind) with an announcement", async () => {
    const user = userEvent.setup();
    const { container } = render(<CitySurface enableCanvas={false} />);
    await ready();

    const surface = container.querySelector(".city-surface");
    expect(surface).toHaveAttribute("data-palette", "day");
    expect(screen.queryByTestId("lighting-toggle")).toBeNull();
    expect(screen.queryByTestId("audio-settings")).toBeNull();

    await openMenu(user);
    const environment = screen.getByRole("region", { name: "Environment" });
    const toggle = within(environment).getByTestId("lighting-toggle");
    expect(within(environment).getByTestId("audio-settings")).toBeInTheDocument();
    expect(within(environment).getByText("Day")).toBeInTheDocument();
    expect(within(environment).getByText("Sound")).toBeInTheDocument();

    await user.click(toggle);
    expect(surface).toHaveAttribute("data-palette", "night");
    await user.click(toggle);
    expect(surface).toHaveAttribute("data-palette", "colorblind");
    await user.click(toggle);
    expect(surface).toHaveAttribute("data-palette", "day");

    const polite = screen.getByTestId("city-live-polite");
    await waitFor(() => expect(polite).toHaveTextContent(/Lighting theme set to Day/));
  });

  it("carries a reduced-motion flag through to the shell", async () => {
    const { container } = render(<CitySurface enableCanvas={false} reducedMotion />);
    await ready();
    expect(container.querySelector(".city-surface")).toHaveAttribute(
      "data-reduced-motion",
      "true",
    );
    expect(screen.getByTestId("city-viewport")).toBeInTheDocument();
  });

  it("shows the storm locked by default and ready once all six are mastered", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<CitySurface enableCanvas={false} />);
    await ready();
    await openTown(user);
    expect(screen.getByRole("button", { name: "Storm locked" })).toBeDisabled();
    unmount();

    const readyUser = userEvent.setup();
    render(
      <CitySurface enableCanvas={false} loadCity={() => Promise.resolve(masteredLoad())} />,
    );
    await ready();
    await openTown(readyUser);
    expect(screen.getByRole("button", { name: "Enter the storm" })).toBeEnabled();
  });

  it("builds a chosen skill via the build menu + free placement at an open cell", async () => {
    const user = userEvent.setup();
    const onPlaceSkill = vi.fn();
    // Town Hall founded + five skills already dropped; Tower (NUM.5) is still unplaced.
    const load: CityLoad = {
      node_states: MOCK_NODE_STATES,
      ...placeWithHall(["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.4"]),
    };
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={() => Promise.resolve(load)}
        onPlaceSkill={onPlaceSkill}
      />,
    );
    await ready();

    // Open the build menu (CoC hammer) and pick the only unplaced skill (Tower/NUM.5).
    await user.click(screen.getByRole("button", { name: "Build" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(/Choose a skill to build/);
    await user.click(within(dialog).getByRole("button", { name: /Tower/ }));

    // Placement mode: confirming builds NUM.5 at a sensible open grid transform.
    await user.click(await screen.findByRole("button", { name: /Build here/ }));
    await waitFor(() =>
      expect(onPlaceSkill).toHaveBeenCalledWith(
        "NUM.5",
        expect.objectContaining({
          nodeId: "NUM.5",
          col: expect.any(Number),
          row: expect.any(Number),
          rot: expect.any(Number),
        }),
      ),
    );
  });

  it("enters free placement (with a Rotate control) from the Buildings list's ready-to-build skill", async () => {
    const user = userEvent.setup();
    const onPlaceSkill = vi.fn();
    // Town Hall founded; Tower (NUM.5) unplaced, so its Buildings row reads "Ready".
    const load: CityLoad = {
      node_states: MOCK_NODE_STATES,
      ...placeWithHall(["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.4"]),
    };
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={() => Promise.resolve(load)}
        onPlaceSkill={onPlaceSkill}
      />,
    );
    await openBuildings(user);
    const tower = plotButton("NUM.5");
    expect(tower).toHaveTextContent(/Ready to build/);

    // Clicking the unplaced skill drops straight into free placement.
    await user.click(tower);
    const bar = await screen.findByRole("group", { name: /Placing Tower/ });
    expect(within(bar).getByRole("button", { name: /Rotate/ })).toBeInTheDocument();

    // Rotate, then build here — persists the rotation with the placement.
    await user.click(within(bar).getByRole("button", { name: /Rotate/ }));
    await user.click(within(bar).getByRole("button", { name: /Build here/ }));
    await waitFor(() =>
      expect(onPlaceSkill).toHaveBeenCalledWith(
        "NUM.5",
        expect.objectContaining({ nodeId: "NUM.5", rot: 1 }),
      ),
    );
  });

  it("places a building without auto-opening its lesson; a click opens it", async () => {
    const user = userEvent.setup();
    // A stateful loader so the placed skill persists across the post-build refresh
    // (mirrors the real session's place → re-read), letting us then click it. The
    // Town Hall is already founded so skills are placeable.
    const seeded = placeWithHall(["NUM.S", "NUM.F", "NUM.2", "NUM.3", "NUM.4"]);
    let placements = seeded.placements;
    const onPlaceSkill = vi.fn((_nodeId: string, transform: PlacedTransform) => {
      placements = [...placements, transform];
      return Promise.resolve();
    });
    const loadCity = () =>
      Promise.resolve<CityLoad>({
        node_states: MOCK_NODE_STATES,
        placements,
        town_hall: seeded.town_hall,
      });

    render(
      <CitySurface enableCanvas={false} loadCity={loadCity} onPlaceSkill={onPlaceSkill} />,
    );
    await ready();

    // Build the only unplaced skill (Tower / NUM.5) via the shop → placement.
    await user.click(screen.getByRole("button", { name: "Build" }));
    const shop = await screen.findByRole("dialog");
    await user.click(within(shop).getByRole("button", { name: /Tower/ }));
    await user.click(await screen.findByRole("button", { name: /Build here/ }));

    // The build persists and announces the placed Foundation…
    await waitFor(() =>
      expect(onPlaceSkill).toHaveBeenCalledWith(
        "NUM.5",
        expect.objectContaining({ nodeId: "NUM.5" }),
      ),
    );
    const polite = screen.getByTestId("city-live-polite");
    // Named the way the roster names it — never the raw `NUM.5`.
    await waitFor(() =>
      expect(polite).toHaveTextContent(/Placed Tower \(.*\)\. Its foundation is ready/i),
    );
    expect(polite).not.toHaveTextContent("NUM.5");

    // …but NO lesson opens automatically — placement drops the Foundation for EVERY
    // path (failed or tested-out); the learner clicks the building to start it.
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText(/Enter the NUM\.5 lesson/i)).toBeNull();

    // Clicking the now-placed Foundation building opens its lesson menu, whose
    // "Start lesson" card steps into the lesson (the click path).
    await openBuildings(user);
    await user.click(plotButton("NUM.5"));
    const popup = await screen.findByRole("dialog");
    expect(popup).toHaveTextContent("Tower");
    expect(
      within(popup).getByRole("button", { name: /start lesson/i }),
    ).toBeInTheDocument();
  });

  it("lists the build menu in teaching order and locks buildings behind prerequisites", async () => {
    const user = userEvent.setup();
    // The Town Hall is founded (so skills are placeable) but no skill is built yet, so
    // every dependent building is prerequisite-locked and only the D1 roots are buildable.
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={() =>
          Promise.resolve({
            node_states: MOCK_NODE_STATES,
            placements: [],
            town_hall: HALL_PLACEMENT,
          })
        }
      />,
    );
    await ready();

    await user.click(screen.getByRole("button", { name: "Build" }));
    const shop = await screen.findByRole("dialog");

    // Only the six skill cards appear (the pre-seeded hub is not placeable), in the
    // D1 teaching order derived from the skill-graph edges (foundations first).
    const row = within(shop).getByRole("list", { name: /in teaching order/i });
    const ctas = within(row).getAllByRole("button");
    expect(ctas.map((button) => button.getAttribute("data-node-id"))).toEqual([
      "NUM.S",
      "NUM.F",
      "NUM.3",
      "NUM.2",
      "NUM.5",
      "NUM.4",
    ]);
    const cta = (nodeId: string): HTMLElement => {
      const button = ctas.find((item) => item.getAttribute("data-node-id") === nodeId);
      if (!button) {
        throw new Error(`no build card for ${nodeId}`);
      }
      return button;
    };

    // The three roots (no prerequisites) start unlocked and buildable.
    for (const id of ["NUM.S", "NUM.F", "NUM.3"]) {
      expect(cta(id)).not.toHaveAttribute("aria-disabled");
      expect(cta(id)).toHaveTextContent(/Ready to build/);
    }

    // Dependents are locked, greyed (aria-disabled), and name the prereq buildings.
    expect(cta("NUM.5")).toHaveAttribute("aria-disabled", "true");
    expect(cta("NUM.5")).toHaveTextContent(/Complete Store first/);
    expect(cta("NUM.2")).toHaveTextContent(/Complete Assembly Hall and Store first/);
    expect(cta("NUM.4")).toHaveAttribute("aria-disabled", "true");

    // A locked card cannot be built — clicking it never enters placement.
    await user.click(cta("NUM.5"));
    expect(screen.queryByRole("button", { name: /Build here/i })).toBeNull();
    expect(
      within(shop).getByRole("heading", { name: /Choose a skill to build/ }),
    ).toBeInTheDocument();
  });

  it("unlocks a dependent build card once its prerequisite building is completed", async () => {
    const user = userEvent.setup();
    // Drive the REAL session: place Store (NUM.F) clear of the pre-seeded hub;
    // Tower (NUM.5) depends only on it, so NUM.5 is locked until NUM.F completes.
    const session = createCityDevSession();
    await session.placeSkill("NUM.F", { col: 2, row: 0, rot: 0 });

    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        onDevSetStage={session.setStageDev}
      />,
    );
    await ready();

    // The menu shows Tower locked behind Store.
    await user.click(screen.getByRole("button", { name: "Build" }));
    const lockedShop = await screen.findByRole("dialog");
    const lockedTower = within(lockedShop).getByRole("button", { name: /Tower/ });
    expect(lockedTower).toHaveAttribute("aria-disabled", "true");
    expect(lockedTower).toHaveTextContent(/Complete Store first/);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    // Complete Store via the dev stage-setter (→ Built).
    await openMenu(user);
    const stages = screen.getByRole("group", { name: /Set NUM\.F build stage/ });
    await user.click(within(stages).getByRole("button", { name: "Built" }));

    // That completion frees Tower, which raises the in-play unlock popup.
    // Dismiss it explicitly so the build menu is the only dialog under test.
    const unlockPopup = await screen.findByRole("dialog", {
      name: /New building unlocked/i,
    });
    await user.click(within(unlockPopup).getByRole("button", { name: "Close" }));
    await user.keyboard("{Escape}");

    // Reopen the menu: Tower is now unlocked (its prerequisite is complete).
    await user.click(screen.getByRole("button", { name: "Build" }));
    const unlockedShop = await screen.findByRole("dialog");
    await waitFor(() => {
      const tower = within(unlockedShop).getByRole("button", { name: /Tower/ });
      expect(tower).not.toHaveAttribute("aria-disabled");
      expect(tower).toHaveTextContent(/Ready to build/);
    });
  });

  it("celebrates in-play when finishing a building unlocks a dependent one", async () => {
    const user = userEvent.setup();
    // Store (NUM.F) placed clear of the pre-seeded hub; Tower (NUM.5)
    // depends only on it, so it stays locked until NUM.F is completed.
    const session = createCityDevSession();
    await session.placeSkill("NUM.F", { col: 2, row: 0, rot: 0 });

    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        onDevSetStage={session.setStageDev}
      />,
    );
    await ready();

    // Entry only seeds the locked baseline — a city that merely LOADS with locked
    // buildings must never fire the popup.
    expect(screen.queryByRole("dialog", { name: /unlocked/i })).toBeNull();

    await openMenu(user);
    const stages = screen.getByRole("group", { name: /Set NUM\.F build stage/ });
    await user.click(within(stages).getByRole("button", { name: "Built" }));

    // Completing the prerequisite announces the newly buildable building by name.
    const popup = await screen.findByRole("dialog", {
      name: /New building unlocked/i,
    });
    expect(within(popup).getByText("Tower")).toBeInTheDocument();

    // The CTA dismisses the popup and hands off to the build menu.
    await user.click(within(popup).getByRole("button", { name: "Build it" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: /New building unlocked/i })).toBeNull(),
    );
    expect(
      await screen.findByRole("heading", { name: /Choose a skill to build/ }),
    ).toBeInTheDocument();
  });

  it("keeps a placed building in the menu as a non-buildable Built card, alongside Ready and Locked", async () => {
    const user = userEvent.setup();
    // Only Store (NUM.F) is on the island. In the mock seed it is mastered
    // (complete), so it satisfies dependents' prerequisites while it itself shows as
    // Built. The rest are unbuilt: roots stay ready; still-gated skills stay locked.
    const load: CityLoad = {
      node_states: MOCK_NODE_STATES,
      ...placeWithHall(["NUM.F"]),
    };
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={() => Promise.resolve(load)}
        onPlaceSkill={vi.fn()}
      />,
    );
    await ready();

    await user.click(screen.getByRole("button", { name: "Build" }));
    const shop = await screen.findByRole("dialog");

    // Select cards by node id (locked hints name their prerequisite buildings, so
    // matching cards by accessible name alone is ambiguous).
    const row = within(shop).getByRole("list", { name: /in teaching order/i });
    const ctas = within(row).getAllByRole("button");
    const cta = (nodeId: string): HTMLElement => {
      const button = ctas.find((item) => item.getAttribute("data-node-id") === nodeId);
      if (!button) {
        throw new Error(`no build card for ${nodeId}`);
      }
      return button;
    };

    // BUILT — the placed building is STILL listed (never filtered out) and flagged
    // Built; it is not aria-disabled (a Built card opens its info callout).
    const library = cta("NUM.F");
    expect(library).toHaveTextContent(/Built/);
    expect(library).not.toHaveAttribute("aria-disabled");
    expect(library.closest(".build-card")).toHaveAttribute("data-built", "true");

    // READY — an unbuilt root with no prerequisites stays buildable.
    expect(cta("NUM.S")).toHaveTextContent(/Ready to build/);

    // LOCKED — a still-gated skill (needs the unbuilt Assembly Hall) stays locked.
    expect(cta("NUM.2")).toHaveAttribute("aria-disabled", "true");
    expect(cta("NUM.2")).toHaveTextContent(/Complete Assembly Hall first/);

    // Activating the Built card NEVER starts a placement (it can't be re-built) —
    // it opens that building's lesson menu instead. NUM.F is Complete below 3 stars
    // (mastered 2★), so its menu offers "Practice set" (earn stars) — enabled, past
    // Foundation — alongside the lesson + Infinite practice.
    await user.click(library);
    expect(screen.queryByRole("button", { name: /Build here/i })).toBeNull();
    const popup = await screen.findByRole("dialog");
    expect(popup).toHaveTextContent("Store");
    const practice = within(popup).getByRole("button", { name: /Practice set/ });
    expect(practice).toBeInTheDocument();
    expect(practice).toBeEnabled();
    expect(within(popup).getByRole("button", { name: /Infinite practice/ })).toBeEnabled();
  });

  it("keeps one Build control over a finished skill roster because Civic and Roads stay open", async () => {
    const user = userEvent.setup();
    // A fully-built city: every skill already on the island.
    render(
      <CitySurface
        enableCanvas={false}
        goldAvailable={200}
        loadCity={() => Promise.resolve(fullLoad())}
      />,
    );
    await ready();

    // Exact, permanently: the skill roster is finished, but the catalogue is not.
    const build = screen.getByRole("button", { name: "Build" });
    expect(build).toBeEnabled();
    await user.click(build);

    const shop = await screen.findByRole("dialog");
    const row = within(shop).getByRole("list", { name: /in teaching order/i });
    const ctas = within(row).getAllByRole("button");
    // Six cards: the built skills (the pre-seeded hub is not a placeable menu card).
    expect(ctas).toHaveLength(6);
    for (const cta of ctas) {
      expect(cta).toHaveTextContent(/Built/);
      expect(cta).not.toHaveAttribute("aria-disabled");
    }

    // Civic and Roads are still continuously available after the last skill building.
    const civic = within(shop).getByRole("tab", { name: "Civic" });
    const roads = within(shop).getByRole("tab", { name: "Roads" });
    expect(civic).not.toHaveAttribute("aria-disabled");
    expect(roads).not.toHaveAttribute("aria-disabled");
    await user.click(civic);
    expect(shop.querySelectorAll('[data-testid^="civic-card-"]').length).toBeGreaterThan(0);
    await user.click(roads);
    expect(shop.querySelector('button[data-node-id="roads"]')).toHaveTextContent(
      new RegExp(`${ROAD_TILE_GOLD_COST} ${materialWord(DEFAULT_ERA_ID)} per tile`),
    );
  });

  it("hosts the completed-building roster as a Built subsection inside the Build dialog", async () => {
    const user = userEvent.setup();
    render(
      <CitySurface enableCanvas={false} loadCity={() => Promise.resolve(fullLoad())} />,
    );
    await ready();

    expect(document.querySelector(".hud-buildings-toggle")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Build" }));
    const shop = await screen.findByRole("dialog", { name: "Choose a skill to build" });
    const built = within(shop).getByRole("button", { name: "Built 6/6" });
    expect(built).toHaveAttribute("aria-expanded", "false");
    await user.click(built);
    expect(within(shop).getByRole("group", { name: "Built" })).toContainElement(
      screen.getByTestId("town-hall-roster-entry"),
    );
    expect(within(shop).getByRole("tab", { name: "Civic" })).toBeVisible();
    expect(within(shop).getByRole("tab", { name: "Roads" })).toBeVisible();
  });

  it("tabs from the active category into Built and unwinds focus one layer at a time", async () => {
    const user = userEvent.setup();
    render(<CitySurface enableCanvas={false} />);
    await user.click(await ready());

    const shop = await screen.findByRole("dialog", { name: /Choose a skill to build/ });
    const lessons = within(shop).getByRole("tab", { name: "Lessons" });
    const built = within(shop).getByRole("button", { name: /^Built \d+\/\d+$/ });
    expect(lessons).toHaveFocus();

    await user.tab({ shift: true });
    expect(built).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(built).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("town-hall-roster-entry")).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(shop).toBeInTheDocument();
    expect(built).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: /Choose a skill to build/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Build" })).toHaveFocus();
  });

  it("celebrates a skill-complete transition (announces built + updates the roster)", async () => {
    const user = userEvent.setup();
    const states = MOCK_NODE_STATES.map((state) => ({ ...state }));
    const loadCity = () =>
      Promise.resolve<CityLoad>({
        node_states: states.map((state) => ({ ...state })),
        neighborhood_state: null,
        placements: ALL_PLACED,
      });
    const onDevAdvanceMastery = (nodeId: string) => {
      const state = states.find((item) => item.node_id === nodeId);
      if (state && state.mastery < 3) {
        state.mastery = (state.mastery + 1) as StudentNodeState["mastery"];
      }
      return Promise.resolve();
    };

    render(
      <CitySurface
        enableCanvas={false}
        loadCity={loadCity}
        onDevAdvanceMastery={onDevAdvanceMastery}
      />,
    );
    await openBuildings(user);
    // The dev stand-in now lives inside the ☰ Menu.
    await openMenu(user);

    // Placed skills in registry order minus maxed NUM.S: NUM.F, NUM.2, ...
    // NUM.2 seeds at mastery 1; one advance takes it to mastery 2 → complete.
    const advanceButtons = screen.getAllByRole("button", { name: "Advance mastery" });
    const num2Advance = advanceButtons[1];
    if (!num2Advance) {
      throw new Error("expected an Advance mastery button for NUM.2");
    }
    await user.click(num2Advance);

    await waitFor(() => expect(plotButton("NUM.2")).toHaveTextContent("Complete"));
    const polite = screen.getByTestId("city-live-polite");
    // The celebration names the skill that was completed and the building that got
    // built, not the `NUM.2` behind them.
    await waitFor(() =>
      expect(polite).toHaveTextContent(
        /Order of operations complete!.*Its building, Dwellings, is built/i,
      ),
    );
    expect(polite).not.toHaveTextContent("NUM.2");
  });

  it("forces a placed building's rendered stage from the dev stage control", async () => {
    const user = userEvent.setup();
    // Drive the REAL session so the surface exercises the true stage derivation.
    const session = createCityDevSession();
    await session.placeSkill("NUM.5", { col: 2, row: 0, rot: 0 });

    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        onDevSetStage={session.setStageDev}
      />,
    );
    await openBuildings(user);
    // The stage override lives inside the ☰ Menu dev panel.
    await openMenu(user);

    const stages = screen.getByRole("group", { name: /Set NUM\.5 build stage/ });

    // Built → the finished (Complete) building, marked active. (3-step: a finished
    // practice set completes construction; the built variants collapse to Complete.)
    await user.click(within(stages).getByRole("button", { name: "Built" }));
    await waitFor(() => expect(plotButton("NUM.5")).toHaveTextContent("Complete"));
    expect(within(stages).getByRole("button", { name: "Built" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Construction → mid-build; Site → back to an empty lot.
    await user.click(within(stages).getByRole("button", { name: "Construction" }));
    await waitFor(() =>
      expect(plotButton("NUM.5")).toHaveTextContent("Under construction"),
    );

    await user.click(within(stages).getByRole("button", { name: "Site" }));
    await waitFor(() => expect(plotButton("NUM.5")).toHaveTextContent("Not started"));
  });

  it("dev 'Simulate lesson' stops a building at Construction (scaffolding); 'Advance mastery' still completes it", async () => {
    const user = userEvent.setup();
    // Drive the REAL session so the surface exercises the true stage derivation.
    const session = createCityDevSession();
    await session.placeSkill("NUM.5", { col: 2, row: 0, rot: 0 });

    render(
      <CompletionRewardProvider reducedMotion>
        <CitySurface
          enableCanvas={false}
          loadCity={session.load}
          onDevLessonTaught={session.markLessonTaught}
          onDevAdvanceMastery={session.advanceMasteryDev}
        />
      </CompletionRewardProvider>,
    );
    await openBuildings(user);
    // The dev stand-in lives inside the ☰ Menu.
    await openMenu(user);

    // Freshly placed → Foundation: the lesson has not run, so it is "Not started".
    expect(plotButton("NUM.5")).toHaveTextContent("Not started");

    // "Simulate lesson" fires ONLY the lesson-taught transition (markLessonTaught):
    // Foundation → Construction (the scaffold), WITHOUT completing the building.
    await user.click(screen.getByRole("button", { name: "Simulate lesson" }));
    await waitFor(() =>
      expect(plotButton("NUM.5")).toHaveTextContent("Under construction"),
    );
    // It stops at the scaffold — it must NOT jump straight to Complete/mastery.
    expect(plotButton("NUM.5")).not.toHaveTextContent("Complete");
    const polite = screen.getByTestId("city-live-polite");
    await waitFor(() => expect(polite).toHaveTextContent(/under construction/i));

    // Monotonic: the lesson-taught step is done, so its control locks out (it must
    // never regress a scaffolded building back to Foundation).
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Lesson done" })).toBeDisabled(),
    );

    // The SEPARATE "Advance mastery" (practice) control still takes it further —
    // finishing practice completes the building (Construction → Complete).
    await user.click(screen.getByRole("button", { name: "Advance mastery" }));
    await waitFor(() => expect(plotButton("NUM.5")).toHaveTextContent("Complete"));
    const receipt = await screen.findByRole("alertdialog");
    expect(screen.getAllByRole("alertdialog")).toHaveLength(1);
    expect(within(receipt).getByText("Skill building complete")).toBeInTheDocument();
    expect(
      within(receipt).getByRole("heading", { name: "Tower is now complete" }),
    ).toBeInTheDocument();
    expect(within(receipt).getAllByRole("listitem").length).toBeGreaterThan(0);
  });

  it("makes no cosmetics claim in the menu or the town popover, and there is no Shop", async () => {
    const user = userEvent.setup();
    render(
      <CitySurface enableCanvas={false} loadCity={() => Promise.resolve(masteredLoad())} />,
    );
    await ready();

    // The ☰ Menu used to carry a "coming in the ranked expansion / nothing here is
    // spendable yet" preview above a "Coming soon" catalog. The interim cosmetic economy
    // then shipped, making every one of those claims false, and the section went. The
    // Shop chip that replaced it as the entry point was itself sunset on 2026-08-03, so
    // this now asserts that neither surface is there.
    await openMenu(user);
    expect(screen.queryByTestId("cosmetic-preview-earned")).toBeNull();
    expect(screen.queryByText(/ranked expansion/i)).toBeNull();
    expect(screen.queryByText(/spendable/i)).toBeNull();
    expect(screen.queryByText("Coming soon")).toBeNull();
    // How to play is what occupies the learner-facing half of the menu instead.
    expect(screen.getByTestId("menu-how-to-play")).toBeInTheDocument();

    // And the town popover no longer projects a per-mastered-node cosmetic grant. There
    // is nothing for it to project: mastery pays no currency and nothing is for sale.
    await user.click(screen.getByRole("button", { name: /Open the town status/ }));
    const popover = screen.getByLabelText("Town status");
    expect(popover).not.toHaveTextContent(/cosmetic reward/i);
    // The mastery count it DOES show is unaffected by dropping that stub.
    expect(screen.getByTestId("hud-meter")).toBeInTheDocument();
    expect(screen.getByTestId("town-capsule")).toHaveAccessibleName(
      /6 of 6 skills mastered/,
    );
  });

  it("opens an anchored, non-modal lesson menu (advisor NPC + three entry points) when a placed building is activated", async () => {
    const user = userEvent.setup();
    render(<CitySurface enableCanvas={false} />);
    await openBuildings(user);

    // Activating a PLACED building opens its accessible lesson menu.
    const trigger = plotButton("NUM.3");
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog");

    // It is the anchored, NON-blocking popup glued above the building (a dialog, but
    // NOT aria-modal — the scene tracks it above the building and the map stays
    // interactive), holding the SAME revisit menu the lesson itself lands on.
    expect(dialog).toHaveClass("building-callout");
    expect(dialog).not.toHaveAttribute("aria-modal");
    expect(dialog).toHaveTextContent("Workshop"); // building name (dialog label)
    // The lesson title stands in for the old NUM.X node-id label.
    expect(dialog).toHaveTextContent("Field properties / distributive");

    // It presents the three lesson entry points. NUM.3 is at the Construction stage
    // (past Foundation), so Practice + Infinite practice are unlocked.
    expect(within(dialog).getByRole("button", { name: /lesson/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /Practice set/ })).toBeEnabled();
    expect(within(dialog).getByRole("button", { name: /Infinite practice/ })).toBeEnabled();
  });

  it("switches the menu to another placed building without leaving a second popup open", async () => {
    const user = userEvent.setup();
    render(<CitySurface enableCanvas={false} />);
    await openBuildings(user);

    // Open the menu for the School…
    await user.click(plotButton("NUM.3"));
    const school = await screen.findByRole("dialog");
    expect(school).toHaveTextContent("Workshop");

    // …then activating a DIFFERENT placed building swaps the single menu to it.
    await openBuildings(user);
    await user.click(plotButton("NUM.5"));
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveTextContent("Tower"));
    expect(screen.getByRole("dialog")).not.toHaveTextContent("Workshop");
  });

  it("closes the lesson menu on Escape and restores focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<CitySurface enableCanvas={false} />);
    await openBuildings(user);

    const trigger = plotButton("NUM.3");
    await user.click(trigger);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Build" })).toHaveFocus();
  });

  it("opens the lesson menu and steps into the stubbed lesson, returning to the city", async () => {
    const user = userEvent.setup();
    const onStartLesson = vi.fn();
    render(<CitySurface enableCanvas={false} onStartLesson={onStartLesson} />);
    await openBuildings(user);

    // Clicking the placed Tower opens its lesson menu…
    await user.click(plotButton("NUM.5"));
    const popup = await screen.findByRole("dialog");
    expect(popup).toHaveTextContent("Tower");

    // …and the menu's lesson card steps into the stubbed (expanded) lesson.
    await user.click(within(popup).getByRole("button", { name: /Start lesson/ }));
    expect(onStartLesson).toHaveBeenCalledWith("NUM.5", "L3");
    const lesson = screen.getByRole("dialog");
    expect(lesson).toHaveTextContent(/The Tower lesson/);
    expect(lesson.textContent ?? "").not.toContain("NUM.5");
    // And it tells the learner the one thing they can act on rather than narrating the
    // team's integration schedule at them.
    expect(lesson).toHaveTextContent(/still being written/i);
    expect(lesson).toHaveTextContent(/mastery here is exactly as you left it/i);

    await user.click(screen.getByRole("button", { name: "Back to city" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("runs the storm as an in-world encounter reusing the checkpoint logic", async () => {
    const user = userEvent.setup();
    const onAttemptStorm = vi.fn();
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={() => Promise.resolve(masteredLoad())}
        onAttemptStorm={onAttemptStorm}
      />,
    );
    await ready();

    await openTown(user);
    await user.click(screen.getByRole("button", { name: "Enter the storm" }));
    await user.click(screen.getByRole("button", { name: "Face the storm" }));

    expect(onAttemptStorm).toHaveBeenCalledWith("D1");
    // The callback carries the domain id; the ANNOUNCEMENT carries the name.
    expect(screen.getByTestId("city-live-assertive")).toHaveTextContent(
      "Storm attempt started for the Real Numbers & Arithmetic neighborhood.",
    );
  });

  it("announces load and lot selection through live regions", async () => {
    const user = userEvent.setup();
    render(
      <CitySurface enableCanvas={false} loadCity={() => Promise.resolve(masteredLoad())} />,
    );
    await ready();

    const polite = screen.getByTestId("city-live-polite");
    await waitFor(() =>
      expect(polite).toHaveTextContent(/Real Numbers & Arithmetic neighborhood loaded/),
    );

    await openBuildings(user);
    await user.click(plotButton("NUM.2"));
    // The roster row reads "Dwellings / Order of operations"; so does the live
    // region now. Neither speaks the `NUM.2` the button only carries as a data hook.
    await waitFor(() =>
      expect(polite).toHaveTextContent(/Selected Dwellings \(Order of operations\)/),
    );
    expect(polite).not.toHaveTextContent("NUM.2");
  });

  it("opens secondary surfaces from the ☰ Menu", async () => {
    const user = userEvent.setup();
    const onOpenSurface = vi.fn();
    render(<CitySurface enableCanvas={false} onOpenSurface={onOpenSurface} />);
    await ready();

    await openMenu(user);
    await user.click(screen.getByRole("button", { name: "Diagnostic" }));
    expect(onOpenSurface).toHaveBeenCalledWith("diagnostic");
    await openMenu(user);
    await user.click(screen.getByRole("button", { name: "Lessons" }));
    expect(onOpenSurface).toHaveBeenCalledWith("lessons");
  });

  it("shows a retryable, fail-closed error fallback when loading fails", async () => {
    const user = userEvent.setup();
    const loadCity = vi.fn<() => Promise<CityLoad>>();
    loadCity.mockRejectedValueOnce(new Error("network down"));
    loadCity.mockResolvedValue(masteredLoad());

    render(<CitySurface enableCanvas={false} loadCity={loadCity} />);
    const error = await screen.findByTestId("city-error");
    expect(error).toHaveTextContent("network down");

    await user.click(screen.getByRole("button", { name: "Retry" }));
    await ready();
    expect(loadCity).toHaveBeenCalledTimes(2);
  });

  it("celebrates unlocked buildings and drops a tested-out one in already built (no lesson)", async () => {
    const user = userEvent.setup();
    const onPlaceSkill = vi.fn();
    // NUM.F tested out: pre-built Complete but at 0 stars (mastery 0); island empty.
    const load: CityLoad = {
      node_states: MOCK_NODE_STATES.map((state) =>
        state.node_id === "NUM.F"
          ? { ...state, mastery: 0, lesson_stage: "done", completion_status: "complete" }
          : state,
      ) as StudentNodeState[],
      placements: [],
      // The hall is founded so the tested-out skill can be placed after the reward.
      town_hall: HALL_PLACEMENT,
    };
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={() => Promise.resolve(load)}
        onPlaceSkill={onPlaceSkill}
        pretestPlacement={placementPassing(["NUM.F"])}
      />,
    );

    // The diagnostic reward screen greets the freshly seeded city: 1 of 6 tested out.
    const popup = await screen.findByRole("dialog");
    expect(popup).toHaveTextContent(/You tested out of 1 of 6 skills/i);

    // "Start building" opens the build menu with the unlocked skill ready.
    await user.click(within(popup).getByRole("button", { name: /start building/i }));
    const shop = await screen.findByRole("dialog");
    expect(shop).toHaveTextContent(/choose a skill to build/i);
    // Our overhauled build menu labels cards by building NAME, so target NUM.F's
    // card by its data-node-id (as the other build-menu tests do).
    const row = within(shop).getByRole("list", { name: /teaching order/i });
    const libraryCard = within(row)
      .getAllByRole("button")
      .find((button) => button.getAttribute("data-node-id") === "NUM.F");
    if (!libraryCard) {
      throw new Error("no build card for NUM.F");
    }
    await user.click(libraryCard);

    // Dropping the tested-out building builds it here…
    await user.click(await screen.findByRole("button", { name: /Build here/ }));
    await waitFor(() =>
      expect(onPlaceSkill).toHaveBeenCalledWith(
        "NUM.F",
        expect.objectContaining({ nodeId: "NUM.F" }),
      ),
    );

    // …and because it is already complete, its lesson does NOT auto-open.
    expect(screen.queryByText(/Enter the NUM\.F lesson/i)).toBeNull();
  });

  it("never credits a tested-out building with practice or a lesson it did not do (#103)", async () => {
    const user = userEvent.setup();
    // NUM.F tested out — the exact shape both test-out writers leave: Complete at
    // mastery 0 with NO practice evidence. NUM.S is left as the mock has it
    // (mastered 3★ WITH a practice stamp), the control for "really did the work".
    const load = fullLoad({
      node_states: MOCK_NODE_STATES.map((state) =>
        state.node_id === "NUM.F"
          ? {
              ...state,
              mastery: 0,
              lesson_stage: "done",
              completion_status: "complete",
              last_practiced_at: null,
            }
          : state,
      ) as StudentNodeState[],
    });
    render(<CitySurface enableCanvas={false} loadCity={() => Promise.resolve(load)} />);
    await ready();
    await openBuildings(user);

    // The roster row: still Complete (the building really is built), but the "4 of 5"
    // fragment — a score next to a Complete row — is gone.
    const testedOutRow = plotButton("NUM.F");
    expect(testedOutRow).toHaveTextContent("Complete");
    expect(testedOutRow).toHaveTextContent("Tested out");
    expect(testedOutRow).not.toHaveTextContent("4 of 5");

    // The practised, mastered row keeps its real performance.
    const practisedRow = plotButton("NUM.S");
    expect(practisedRow).toHaveTextContent("Complete");
    expect(practisedRow).toHaveTextContent("4 of 5");
    expect(practisedRow).not.toHaveTextContent("Tested out");

    // The building menu: the advisor no longer greets an unread lesson with "you've
    // already worked through this skill", and the lesson card says Read, not Reread.
    await user.click(testedOutRow);
    const dialog = await screen.findByRole("dialog");
    expect(dialog).not.toHaveTextContent(/already worked through this skill/i);
    expect(dialog).toHaveTextContent(/tested out of this one/i);
    expect(within(dialog).getByRole("button", { name: /Read lesson/ })).toBeInTheDocument();
    expect(dialog).toHaveTextContent("Read the full mini-lesson.");
    expect(dialog).not.toHaveTextContent("Reread the full mini-lesson.");
  });

  it("explains the storm lock in the same word as the counter that drives it (#103)", async () => {
    const user = userEvent.setup();
    // Every skill tested out: six Complete buildings at mastery 0. The capsule reads
    // 0/6 and the storm is locked — both correct, and they must not contradict the
    // roster by claiming the buildings are not complete.
    const load = fullLoad({
      node_states: MOCK_NODE_STATES.map((state) => ({
        ...state,
        mastery: 0,
        lesson_stage: "done",
        completion_status: "complete",
        last_practiced_at: null,
      })) as StudentNodeState[],
    });
    render(<CitySurface enableCanvas={false} loadCity={() => Promise.resolve(load)} />);
    await ready();

    // The capsule labels what its number measures, so "0/6" is not read as a denial
    // of the six Complete rows.
    const capsule = screen.getByRole("button", { name: /Foundations district/ });
    expect(capsule).toHaveTextContent("Mastered");
    expect(capsule).toHaveTextContent("0/6");
    expect(
      within(capsule).getByRole("progressbar", { name: "Skills mastered" }),
    ).toHaveAttribute("aria-valuenow", "0");
    expect(within(capsule).getByRole("progressbar")).toHaveAttribute("aria-valuemax", "6");

    await openTown(user);
    const popover = screen.getByRole("region", { name: "Town status" });
    expect(popover).toHaveTextContent(/all six skills are mastered/i);
    expect(popover).not.toHaveTextContent(/buildings are complete/i);
  });

  it("splits the diagnostic reward into a skip card per tested-out skill and a learn card per remaining island skill", async () => {
    const passing = ["NUM.S", "NUM.F", "NUM.2"];
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={() => Promise.resolve({ node_states: MOCK_NODE_STATES, placements: [] })}
        onPlaceSkill={vi.fn()}
        pretestPlacement={placementPassing(passing)}
      />,
    );
    const popup = await screen.findByRole("dialog");
    expect(popup).toHaveTextContent(/You tested out of 3 of 6 skills/i);

    // Section 1 — the three tested-out skills, each a gold "skip" card (no lesson).
    const skipList = within(popup).getByRole("list", { name: "Skills ready to build" });
    const skipCards = within(skipList).getAllByRole("listitem");
    expect(skipCards.map((el) => el.getAttribute("data-node-id"))).toEqual(
      teachingOrder(passing),
    );
    expect(within(skipList).getAllByText("No lesson needed")).toHaveLength(3);
    // Topic (skillNames) + building (buildingName) names both render on the card.
    expect(skipList).toHaveTextContent("Signed numbers");
    expect(skipList).toHaveTextContent("Assembly Hall");

    // Section 2 — the island's remaining buildings, each a muted "learn" card (build by
    // finishing its lesson). Both grids are in the build menu's TEACHING order rather than
    // the registry's, because they are now derived from the same roster it is — so the
    // expected order is derived here too instead of transcribed.
    const learnList = within(popup).getByRole("list", { name: "Skills still to learn" });
    const learnCards = within(learnList).getAllByRole("listitem");
    const remaining = D1_NODE_IDS.filter((nodeId) => !passing.includes(nodeId));
    expect(learnCards.map((el) => el.getAttribute("data-node-id"))).toEqual(
      teachingOrder(remaining),
    );
    expect(within(learnList).getAllByText("Build by finishing its lesson")).toHaveLength(3);
    expect(learnList).toHaveTextContent("Workshop");

    // The single primary CTA still opens the build menu.
    expect(
      within(popup).getByRole("button", { name: "Start building" }),
    ).toBeInTheDocument();
  });

  it("hides the Still-to-learn section when the diagnostic tested out every skill", async () => {
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={() => Promise.resolve({ node_states: MOCK_NODE_STATES, placements: [] })}
        onPlaceSkill={vi.fn()}
        pretestPlacement={placementPassing(D1_NODE_IDS)}
      />,
    );
    const popup = await screen.findByRole("dialog");
    expect(popup).toHaveTextContent(/You tested out of 6 of 6 skills/i);

    // All six are skips → six skip cards and NO "Still to learn" list.
    const skipList = within(popup).getByRole("list", { name: "Skills ready to build" });
    expect(within(skipList).getAllByRole("listitem")).toHaveLength(6);
    expect(within(popup).queryByRole("list", { name: "Skills still to learn" })).toBeNull();
  });

  it("dismisses the diagnostic reward to the city on the corner ✕", async () => {
    const user = userEvent.setup();
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={() => Promise.resolve({ node_states: MOCK_NODE_STATES, placements: [] })}
        onPlaceSkill={vi.fn()}
        pretestPlacement={placementPassing(["NUM.F"])}
      />,
    );
    const popup = await screen.findByRole("dialog");
    expect(popup).toHaveTextContent(/You tested out of 1 of 6 skills/i);

    await user.click(within(popup).getByRole("button", { name: "Close" }));
    // Dismissing drops the learner into the city (the reward dialog is gone).
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("routes the lesson menu by stage: Practice/Infinite resume the drill; Lesson opens teaching/review", async () => {
    const user = userEvent.setup();
    // A test lesson host that echoes the `resumePractice` / `resumeInfinite` context
    // flags, so we can assert HOW the menu enters the lesson without the full engine.
    const echoHost: LessonHost = {
      render: (ctx) => (
        <div role="dialog" aria-label="lesson echo">
          <span data-testid="lesson-resume">{String(ctx.resumePractice ?? false)}</span>
          <span data-testid="lesson-infinite">{String(ctx.resumeInfinite ?? false)}</span>
          <button type="button" onClick={ctx.onExit}>
            Close echo
          </button>
        </div>
      ),
    };
    // The mock's full spread: NUM.3 Construction (practice); NUM.F Complete at 2★,
    // NUM.S Complete at 3★; NUM.5 Foundation (not_started) — all placed on the island.
    const load: CityLoad = { node_states: MOCK_NODE_STATES, placements: ALL_PLACED };
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={() => Promise.resolve(load)}
        lessonHost={echoHost}
      />,
    );
    await openBuildings(user);

    // Construction building → "Practice set" → RESUMES the graded practice set.
    await user.click(plotButton("NUM.3"));
    const constructionPopup = await screen.findByRole("dialog");
    await user.click(
      within(constructionPopup).getByRole("button", { name: /Practice set/ }),
    );
    expect(screen.getByTestId("lesson-resume")).toHaveTextContent("true");
    expect(screen.getByTestId("lesson-infinite")).toHaveTextContent("false");
    await user.click(screen.getByRole("button", { name: "Close echo" }));

    // Construction building → "Infinite practice" → opens the endless drill directly.
    await openBuildings(user);
    await user.click(plotButton("NUM.3"));
    const infinitePopup = await screen.findByRole("dialog");
    await user.click(
      within(infinitePopup).getByRole("button", { name: /Infinite practice/ }),
    );
    expect(screen.getByTestId("lesson-infinite")).toHaveTextContent("true");
    expect(screen.getByTestId("lesson-resume")).toHaveTextContent("false");
    await user.click(screen.getByRole("button", { name: "Close echo" }));

    // Complete but sub-3★ (NUM.F, 2★) → "Practice set" → RESUMES practice to earn stars.
    await openBuildings(user);
    await user.click(plotButton("NUM.F"));
    const practicePopup = await screen.findByRole("dialog");
    await user.click(within(practicePopup).getByRole("button", { name: /Practice set/ }));
    expect(screen.getByTestId("lesson-resume")).toHaveTextContent("true");
    await user.click(screen.getByRole("button", { name: "Close echo" }));

    // Topped-out Complete (NUM.S, 3★) → "Review lesson" → does NOT resume practice.
    await openBuildings(user);
    await user.click(plotButton("NUM.S"));
    const reviewPopup = await screen.findByRole("dialog");
    await user.click(within(reviewPopup).getByRole("button", { name: /review lesson/i }));
    expect(screen.getByTestId("lesson-resume")).toHaveTextContent("false");
    await user.click(screen.getByRole("button", { name: "Close echo" }));

    // Foundation building → "Start lesson" → teaching (does NOT resume practice).
    await openBuildings(user);
    await user.click(plotButton("NUM.5"));
    const foundationPopup = await screen.findByRole("dialog");
    await user.click(
      within(foundationPopup).getByRole("button", { name: /start lesson/i }),
    );
    expect(screen.getByTestId("lesson-resume")).toHaveTextContent("false");
  });

  it("gates Practice + Infinite practice on a Foundation building, leading with the lesson", async () => {
    const user = userEvent.setup();
    const load: CityLoad = { node_states: MOCK_NODE_STATES, placements: ALL_PLACED };
    render(<CitySurface enableCanvas={false} loadCity={() => Promise.resolve(load)} />);
    await openBuildings(user);

    // NUM.5 is freshly placed (Foundation): the lesson leads (enabled + auto-focused)
    // while Practice + Infinite practice are gated (disabled) until the lesson is
    // finished.
    await user.click(plotButton("NUM.5"));
    const foundationPopup = await screen.findByRole("dialog");
    const lesson = within(foundationPopup).getByRole("button", { name: /Start lesson/ });
    expect(lesson).toBeEnabled();
    expect(lesson).toHaveFocus();
    expect(
      within(foundationPopup).getByRole("button", { name: /Practice set/ }),
    ).toBeDisabled();
    expect(
      within(foundationPopup).getByRole("button", { name: /Infinite practice/ }),
    ).toBeDisabled();
    expect(foundationPopup).toHaveTextContent(/Finish the lesson to unlock practice/i);
  });

  it("finishing the lesson returns to the building's callout in Construction (practice is the next step)", async () => {
    const user = userEvent.setup();
    // Drive the REAL session: NUM.3 (a root) placed at Foundation, clear of the hub.
    const session = createCityDevSession();
    await session.placeSkill("NUM.3", { col: 2, row: 0, rot: 0 });

    // A test lesson host that finishes the lesson exactly as AdvisorLesson does at
    // CFU-pass: fire the Construction signal (onLessonTaught) + end the lesson
    // (onFinishLesson) — no teaching/CFU navigation needed.
    const finishHost: LessonHost = {
      render: (ctx) => (
        <div role="dialog" aria-label="lesson">
          <button
            type="button"
            onClick={() => {
              ctx.onLessonTaught?.();
              ctx.onFinishLesson?.();
            }}
          >
            Finish lesson (test)
          </button>
        </div>
      ),
    };

    render(
      <CompletionRewardProvider reducedMotion>
        <CitySurface
          enableCanvas={false}
          loadCity={session.load}
          // `onLessonTaught` and NOT `onDevLessonTaught`: the two were one prop until the
          // account-mode fix, and the signal this case fires is the lesson's own. The dev
          // stand-in now only decides whether to offer the Developer panel, which this mount
          // does not want — see `lessonProgressionIsNotDevGated.test.tsx`.
          onLessonTaught={session.markLessonTaught}
          lessonHost={finishHost}
        />
      </CompletionRewardProvider>,
    );
    await openBuildings(user);

    // NUM.3 starts at Foundation → its menu offers "Start lesson".
    expect(plotButton("NUM.3")).toHaveTextContent("Not started");
    await user.click(plotButton("NUM.3"));
    const foundationPopup = await screen.findByRole("dialog");
    await user.click(
      within(foundationPopup).getByRole("button", { name: /start lesson/i }),
    );

    // Finishing the lesson BREAKS back to the building's menu — now Construction,
    // where "Practice set" (the graded set) is the explicit, now-unlocked next step.
    await user.click(
      await screen.findByRole("button", { name: /finish lesson \(test\)/i }),
    );
    const receipt = await screen.findByRole("alertdialog");
    expect(document.querySelector("[aria-label='lesson']")).toBeNull();
    expect(receipt).toHaveAttribute("data-context", "Lesson complete");
    expect(
      within(receipt).getByRole("heading", { name: "Lesson complete!" }),
    ).toBeInTheDocument();
    expect(receipt.querySelector('[data-kind="gain"], [data-kind="cost"]')).toBeNull();
    expect(receipt).not.toHaveTextContent(
      /mastery|stone|grain|population|livability|happiness/i,
    );
    await user.click(within(receipt).getByRole("button", { name: "Continue" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();

    const constructionPopup = await screen.findByRole("dialog");
    // The returned menu reflects Construction by unlocking Practice + Infinite practice.
    const practice = within(constructionPopup).getByRole("button", {
      name: /Practice set/,
    });
    expect(practice).toBeInTheDocument();
    expect(practice).toBeEnabled();
    expect(
      within(constructionPopup).getByRole("button", { name: /Infinite practice/ }),
    ).toBeEnabled();
  });

  it("enters move mode from the building menu; cancelling restores the original spot (no write)", async () => {
    const user = userEvent.setup();
    const onMoveSkill = vi.fn();
    // A fully-placed city so every building is relocatable from its menu.
    const load: CityLoad = { node_states: MOCK_NODE_STATES, placements: ALL_PLACED };
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={() => Promise.resolve(load)}
        onMoveSkill={onMoveSkill}
      />,
    );
    await openBuildings(user);

    // Open the placed School's menu and choose the separate "Move building" control.
    await user.click(plotButton("NUM.3"));
    const menu = await screen.findByRole("dialog");
    await user.click(within(menu).getByRole("button", { name: /Move building/i }));

    // Move mode reuses the placement bar, worded for a relocation: "Moving …" with a
    // "Drop here" confirm plus Rotate + Cancel (the same interactions as placement).
    const bar = await screen.findByRole("group", { name: /Moving Workshop/ });
    expect(within(bar).getByRole("button", { name: /Drop here/ })).toBeInTheDocument();
    expect(within(bar).getByRole("button", { name: /Rotate/ })).toBeInTheDocument();
    const startPolite = screen.getByTestId("city-live-polite");
    await waitFor(() => expect(startPolite).toHaveTextContent(/Moving Workshop/));

    // Cancel snaps it back: nothing is persisted (no move write) and the roster
    // still lists the building exactly as before.
    await user.click(within(bar).getByRole("button", { name: /Cancel/ }));
    await waitFor(() => expect(screen.queryByRole("group", { name: /Moving/ })).toBeNull());
    expect(onMoveSkill).not.toHaveBeenCalled();
    await waitFor(() => expect(startPolite).toHaveTextContent(/snapped back/i));

    await openBuildings(user);
    expect(plotButton("NUM.3")).toHaveTextContent("Under construction");
  });

  it("confirms a move, persisting the new transform via onMoveSkill (mastery untouched)", async () => {
    const user = userEvent.setup();
    const onMoveSkill = vi.fn().mockResolvedValue(undefined);
    // Only the School is on the island, so it has open ground to slide into (its
    // own footprint is ignored, so a one-cell nudge stays valid).
    const solo = defaultPlacements(["NUM.3"], [], BUILDABLE_RADIUS);
    const original = solo[0];
    if (!original) {
      throw new Error("expected a default placement for NUM.3");
    }
    const load: CityLoad = { node_states: MOCK_NODE_STATES, placements: solo };
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={() => Promise.resolve(load)}
        onMoveSkill={onMoveSkill}
      />,
    );
    await openBuildings(user);

    await user.click(plotButton("NUM.3"));
    const menu = await screen.findByRole("dialog");
    await user.click(within(menu).getByRole("button", { name: /Move building/i }));
    const bar = await screen.findByRole("group", { name: /Moving/ });

    // Nudge one cell east with the keyboard, then drop it — persisting the new
    // transform through onMoveSkill (the in-app move write).
    const drop = within(bar).getByRole("button", { name: /Drop here/ });
    drop.focus();
    await user.keyboard("{ArrowRight}");
    await user.click(drop);

    await waitFor(() =>
      expect(onMoveSkill).toHaveBeenCalledWith(
        "NUM.3",
        expect.objectContaining({
          nodeId: "NUM.3",
          col: original.col + 1,
          row: original.row,
          rot: original.rot,
        }),
      ),
    );
    // The confirmation is announced as purely spatial (progress/mastery unchanged).
    await waitFor(() =>
      expect(screen.getByTestId("city-live-polite")).toHaveTextContent(
        /Moved Workshop.*unchanged/i,
      ),
    );
  });
});

describe("CitySurface — the Town Hall (pre-seeded island hub, not a skill)", () => {
  /** All six skills not-started, the hub pre-seeded, so completion = 0 of 6. */
  const zeroComplete = (): CityLoad => ({
    node_states: MOCK_NODE_STATES.map((state) => ({
      ...state,
      mastery: 0,
      lesson_stage: "not_started",
      completion_status: "locked",
    })) as StudentNodeState[],
    placements: [],
    town_hall: HALL_PLACEMENT,
  });

  it("is present in the roster on a fresh island with no player action (pre-seeded)", async () => {
    const user = userEvent.setup();
    // The REAL session pre-seeds the hub at island open, before anything is placed.
    render(<CitySurface enableCanvas={false} loadCity={createCityDevSession().load} />);
    await ready();

    await openBuildings(user);
    expect(screen.getByRole("button", { name: "Built 0/6" })).toBeInTheDocument();
    const hub = screen.getByTestId("town-hall-roster-entry");
    expect(hub).toHaveTextContent("Town Hall");
    expect(hub).toHaveTextContent(/The island hub/);
  });

  it("lists only skills in the build menu (the pre-seeded hub is not placeable, no gate)", async () => {
    const user = userEvent.setup();
    render(
      <CitySurface enableCanvas={false} loadCity={() => Promise.resolve(zeroComplete())} />,
    );
    await ready();

    // The Build button opens the menu directly — there is no "Found Town Hall" step.
    await user.click(screen.getByRole("button", { name: "Build" }));
    const shop = await screen.findByRole("dialog");
    const row = within(shop).getByRole("list", { name: /in teaching order/i });
    const cards = within(row).getAllByRole("button");

    // The hub has NO build card (it is pre-seeded, not placeable).
    expect(cards.some((b) => b.getAttribute("data-node-id") === TOWN_HALL_ID)).toBe(false);

    // Every skill is immediately buildable — the first-placement gate is gone.
    const card = (nodeId: string): HTMLElement => {
      const button = cards.find((b) => b.getAttribute("data-node-id") === nodeId);
      if (!button) {
        throw new Error(`no build card for ${nodeId}`);
      }
      return button;
    };
    for (const id of ["NUM.S", "NUM.F", "NUM.3"]) {
      expect(card(id)).toHaveTextContent(/Ready to build/);
      expect(card(id)).not.toHaveAttribute("aria-disabled");
    }
  });

  it("exposes the pre-seeded hall as a distinct roster entry (not one of the six skills)", async () => {
    const user = userEvent.setup();
    render(
      <CitySurface enableCanvas={false} loadCity={() => Promise.resolve(fullLoad())} />,
    );
    await ready();

    await openBuildings(user);
    // The N/6 skill count never includes the hub.
    expect(screen.getByRole("button", { name: "Built 6/6" })).toBeInTheDocument();
    const hub = screen.getByTestId("town-hall-roster-entry");
    expect(hub).toHaveTextContent("Town Hall");
    expect(hub).toHaveTextContent(/The island hub/);
    // It is NOT one of the six skill plots (those carry a NUM.* data-node-id).
    expect(hub.getAttribute("data-node-id")).toBe(TOWN_HALL_ID);
  });

  it("opens the hub panel with island progress and a live Review mistakes entry (no lesson)", async () => {
    const user = userEvent.setup();
    // MOCK seed: 3 of 6 built, and those same three have a finished practice set
    // (mastery 1/2/3) — so there are three skills to mix and the entry is live.
    render(
      <CitySurface enableCanvas={false} loadCity={() => Promise.resolve(fullLoad())} />,
    );
    await ready();
    await openBuildings(user);
    await user.click(screen.getByTestId("town-hall-roster-entry"));

    const panel = await screen.findByTestId("town-hall-panel");
    expect(panel).toHaveTextContent(/3 of 6/);

    const interleaved = within(panel).getByTestId("town-hall-interleaved");
    expect(interleaved).not.toHaveAttribute("aria-disabled");
    expect(panel).toHaveTextContent(/Questions you miss or skip are saved here/i);

    // The hub panel is NOT the lesson menu — it never offers a lesson action.
    expect(within(panel).queryByRole("button", { name: /Start lesson/ })).toBeNull();
    // But it IS relocatable like any building.
    expect(
      within(panel).getByRole("button", { name: /Move building/ }),
    ).toBeInTheDocument();
  });

  it("announces a BLOCKED hub drop by name, never the raw sentinel id", async () => {
    const user = userEvent.setup();
    const onMoveTownHall = vi.fn();
    render(
      <CitySurface
        enableCanvas={false}
        loadCity={() => Promise.resolve(zeroComplete())}
        onMoveTownHall={onMoveTownHall}
      />,
    );
    await ready();
    await openBuildings(user);
    await user.click(screen.getByTestId("town-hall-roster-entry"));
    await user.click(
      within(await screen.findByTestId("town-hall-panel")).getByRole("button", {
        name: /Move building/,
      }),
    );

    // A quarter-turn makes the drop invalid where the hub sits: the `3×2` footprint
    // becomes `2×3`, pushing its deepest row off the buildable disc. The rotate
    // wording differs from the drop's, so the LAST announcement is unambiguously
    // the one confirmPlacement emits.
    const bar = await screen.findByRole("group", { name: /Moving Town Hall/ });
    await user.click(within(bar).getByRole("button", { name: /Rotate/ }));
    const polite = screen.getByTestId("city-live-polite");
    // The typed placement reason survives the positive "needs" framing: this rotation is
    // outside the island, so it asks for open ground before the blocked drop below.
    await waitFor(() =>
      expect(polite).toHaveTextContent(/rotated to .*Needs open ground/i),
    );

    // Enter on the map is the live route into a blocked confirm (the bar's "Drop
    // here" button is disabled while invalid, so it cannot get there).
    screen.getByTestId("city-viewport").focus();
    await user.keyboard("{Enter}");

    // The refusal names the hub. It used to read `buildingName(TOWN_HALL_ID)`, which
    // cannot resolve a non-`NUM.*` sentinel and fell back to the id — announcing the
    // literal "town-hall" to screen readers at exactly the moment a name matters.
    await waitFor(() => expect(polite).toHaveTextContent(/Town Hall: Needs open ground/i));
    expect(polite).not.toHaveTextContent(TOWN_HALL_ID);
    expect(onMoveTownHall).not.toHaveBeenCalled();
  });

  it("launches Review mistakes with a truthful empty state, and returns to the city", async () => {
    const user = userEvent.setup();
    render(
      <CitySurface enableCanvas={false} loadCity={() => Promise.resolve(fullLoad())} />,
    );
    await ready();
    await openBuildings(user);
    await user.click(screen.getByTestId("town-hall-roster-entry"));
    await user.click(
      within(await screen.findByTestId("town-hall-panel")).getByTestId(
        "town-hall-interleaved",
      ),
    );

    const scene = await screen.findByRole("dialog", { name: "Review mistakes" });
    expect(within(scene).getByTestId("review-mistakes-empty")).toHaveTextContent(
      /No mistakes to review yet/i,
    );
    expect(scene).toHaveTextContent(/Town Hall . island hub/);

    expect(screen.getByTestId("city-live-polite")).toHaveTextContent(
      /Review mistakes opened/i,
    );

    await user.click(
      within(scene).getAllByRole("button", { name: "Back to city" })[0] as HTMLElement,
    );
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Review mistakes" })).toBeNull();
    });
  });

  it("keeps Review mistakes available before any skill is practiced", async () => {
    const user = userEvent.setup();
    render(
      <CitySurface enableCanvas={false} loadCity={() => Promise.resolve(zeroComplete())} />,
    );
    await ready();
    await openBuildings(user);
    await user.click(screen.getByTestId("town-hall-roster-entry"));

    const panel = await screen.findByTestId("town-hall-panel");
    expect(panel).toHaveTextContent(/0 of 6/);
    const interleaved = within(panel).getByTestId("town-hall-interleaved");
    expect(interleaved).not.toHaveAttribute("aria-disabled");
    expect(panel).toHaveTextContent(/Questions you miss or skip are saved here/i);
    await user.click(interleaved);
    expect(
      await screen.findByRole("dialog", { name: "Review mistakes" }),
    ).toHaveTextContent(/No mistakes to review yet/i);
  });

  it("does not relabel prior-era mixed practice as current-era mistakes", async () => {
    const user = userEvent.setup();
    render(
      <CitySurface
        enableCanvas={false}
        eraId="neolithic"
        loadCity={() => Promise.resolve(masteredLoad())}
      />,
    );
    await ready();
    await openBuildings(user);
    await user.click(screen.getByTestId("town-hall-roster-entry"));

    const panel = await screen.findByTestId("town-hall-panel");
    const reason = panel.querySelector(".town-hall-panel-reason");
    expect(reason?.textContent).toMatch(/Questions you miss or skip are saved here/i);
    expect(reason?.textContent).not.toMatch(/mixes all/i);
    const interleaved = within(panel).getByTestId("town-hall-interleaved");
    expect(interleaved).not.toHaveAttribute("aria-disabled");
    await user.click(interleaved);
    expect(
      await screen.findByRole("dialog", { name: "Review mistakes" }),
    ).toHaveTextContent(/No mistakes to review yet/i);
  });

  it("keeps tested-out completion separate from the missed-item queue", async () => {
    const user = userEvent.setup();
    const testedOut = (): CityLoad => ({
      node_states: MOCK_NODE_STATES.map((state) => ({
        ...state,
        mastery: 0,
        lesson_stage: ["NUM.S", "NUM.F"].includes(state.node_id) ? "done" : "not_started",
        completion_status: ["NUM.S", "NUM.F"].includes(state.node_id)
          ? "complete"
          : "locked",
      })) as StudentNodeState[],
      placements: ALL_PLACED,
      town_hall: TOWN_HALL_PLACEMENT,
    });

    render(
      <CitySurface enableCanvas={false} loadCity={() => Promise.resolve(testedOut())} />,
    );
    await ready();
    await openBuildings(user);
    await user.click(screen.getByTestId("town-hall-roster-entry"));

    const panel = await screen.findByTestId("town-hall-panel");
    expect(panel).toHaveTextContent(/2 of 6/);
    expect(within(panel).getByTestId("town-hall-interleaved")).not.toHaveAttribute(
      "aria-disabled",
    );
    expect(panel).toHaveTextContent(/Questions you miss or skip are saved here/i);
  });

  /* ---------------------------------------------------------------------- */
  /* Roads: a tab inside the build menu, not a standalone dock button        */
  /* ---------------------------------------------------------------------- */

  /** Open the build menu and return its dialog. */
  async function openShop(user: User): Promise<HTMLElement> {
    await user.click(screen.getByRole("button", { name: "Build" }));
    return screen.findByRole("dialog");
  }

  /** The Roads card's CTA inside the open build menu (same hook as a skill card). */
  function roadsCard(shop: HTMLElement): HTMLElement {
    const button = shop.querySelector<HTMLElement>('button[data-node-id="roads"]');
    if (!button) {
      throw new Error("No Roads card rendered in the build menu");
    }
    return button;
  }

  it("carries Roads as a build-menu tab, with no standalone dock button", async () => {
    const user = userEvent.setup();
    render(
      <CitySurface enableCanvas={false} loadCity={() => Promise.resolve(fullLoad())} />,
    );
    await ready();

    // The dock is down to the ONE build entry point — the old Roads button is gone.
    expect(screen.queryByTestId("city-roads-button")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Roads$/ })).toBeNull();

    // Roads is a first-class, enabled member of the existing tab strip, and it is the
    // LAST of the three: the lead moved Civic ahead of it on 2026-08-04.
    const shop = await openShop(user);
    // SCOPED TO THE CATEGORY STRIP on 2026-07-31, because the dialog gained a second
    // tablist: the era rail sits under the categories and is tabs too, so an unscoped
    // `getAllByRole("tab")` census would read the two strips as one and this assertion
    // would have to be re-written every time a player advances an era. The population is
    // still every category and nothing is exempted from it — `aria-label="Build
    // categories"` names exactly the strip the sentence above is about — and the rail has
    // its own census in `buildMenuEraAxis.test.tsx`, which pins it to the eras the roster
    // has reached, in `ERA_SEQUENCE` order.
    const categories = within(shop).getByRole("tablist", { name: "Build categories" });
    const tabs = within(categories).getAllByRole("tab");
    /*
      THREE, IN THIS ORDER, AND NO "SOON" PIP ANYWHERE. Two changes are recorded here and
      both are the strip recording a ruling rather than an assertion being relaxed:

       - CIVIC LOST ITS PIP on 2026-07-29, when era one's catalogue was ruled
         (civic-buildings.md §7) and `citySession.placeCivic` began buying from it;
       - DECORATIONS AND DEFENCES LEFT ENTIRELY on 2026-08-04, on the lead's *"remove
         decorations and defenses from the option list"*. They were placeholders with no
         catalogue behind either of them, so nothing was cut but the two doors.

      The pip's absence is asserted through `textContent` rather than a separate query, so
      a tab that regrows one fails here as "DecorationsSoon" against "Decorations" instead
      of passing a name-only census. What replaces the old "…and a placeholder is still
      genuinely disabled, so `not disabled` means something" line is
      `buildMenuCategoriesAreLive.test.tsx`, which asks every category in this strip to
      open and shows its red by injection — because with the placeholders gone there is no
      disabled tab left here to make the negative assertion mean anything.
    */
    expect(tabs.map((tab) => tab.textContent)).toEqual(["Lessons", "Civic", "Roads"]);
    for (const label of ["Roads", "Civic"]) {
      const tab = within(shop).getByRole("tab", { name: label });
      expect(tab, label).not.toHaveAttribute("aria-disabled");
      expect(tab, label).toHaveAttribute("aria-selected", "false");
    }
  });

  it("shows the Roads tab's card without entering paint mode until the card is activated", async () => {
    const user = userEvent.setup();
    render(
      <CitySurface
        enableCanvas={false}
        goldAvailable={200}
        loadCity={() => Promise.resolve(fullLoad())}
      />,
    );
    await ready();
    const shop = await openShop(user);

    // Selecting the tab only SHOWS the roads card — the menu stays open (so the
    // player can browse or switch back) and no paint session has started yet.
    await user.click(within(shop).getByRole("tab", { name: "Roads" }));
    expect(within(shop).getByRole("tab", { name: "Roads" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(shop).toHaveTextContent(/Pave roads across the island/);
    expect(roadsCard(shop)).toHaveTextContent(
      new RegExp(`5 ${materialWord(DEFAULT_ERA_ID)} per tile`),
    );
    expect(screen.queryByTestId("road-paint-bar")).toBeNull();

    // Activating the card is the entry point: paint mode opens and the menu closes,
    // the same grammar a skill card uses to hand off to building placement.
    await user.click(roadsCard(shop));
    const bar = await screen.findByTestId("road-paint-bar");
    expect(bar).toHaveTextContent(/Laying roads/);
    expect(screen.queryByRole("dialog")).toBeNull();
    // …and the dock's build entry point steps aside while a road is being traced.
    expect(screen.queryByRole("button", { name: "Build" })).toBeNull();
  });

  it("switches back from Roads to Lessons without stranding the player in road mode", async () => {
    const user = userEvent.setup();
    render(
      <CitySurface enableCanvas={false} loadCity={() => Promise.resolve(fullLoad())} />,
    );
    await ready();
    const shop = await openShop(user);

    await user.click(within(shop).getByRole("tab", { name: "Roads" }));
    expect(within(shop).queryByRole("list", { name: /in teaching order/i })).toBeNull();

    // Back to Lessons: the building cards return and nothing road-related lingers.
    await user.click(within(shop).getByRole("tab", { name: "Lessons" }));
    expect(
      within(shop).getByRole("list", { name: /in teaching order/i }),
    ).toBeInTheDocument();
    expect(shop.querySelector('button[data-node-id="roads"]')).toBeNull();
    expect(shop).toHaveTextContent(/Choose a skill to build/);
    expect(screen.queryByTestId("road-paint-bar")).toBeNull();
  });

  it("flags an unaffordable wallet on the Roads card but still opens paint mode (erasing is free)", async () => {
    const user = userEvent.setup();
    render(
      <CitySurface
        enableCanvas={false}
        goldAvailable={0}
        loadCity={() => Promise.resolve(fullLoad())}
      />,
    );
    await ready();
    const shop = await openShop(user);
    await user.click(within(shop).getByRole("tab", { name: "Roads" }));

    // Honest, non-blocking: the card warns but is never disabled, because erasing
    // costs nothing and the paint bar remains the fail-closed authority on a spend.
    const card = roadsCard(shop);
    // The tag says what to DO about the shortfall rather than restating the price the
    // card already carries two lines up.
    expect(card).toHaveTextContent(/Practise a skill to earn enough for a tile/);
    expect(card).not.toHaveAttribute("aria-disabled");

    await user.click(card);
    const bar = await screen.findByTestId("road-paint-bar");
    expect(within(bar).getByRole("button", { name: /Erase/ })).toBeInTheDocument();
  });

  /**
   * Removal pays the same however it is triggered. The paint bar's ERASE is the
   * bulk gesture (and the keyboard's removal path); clicking a single tile on the
   * island is the precise one. Both call the same removal seam, so both refund
   * `ROAD_TILE_GOLD_COST` a tile — see `CitySurface.roadRemove.test.tsx` for the
   * per-tile popup half of the same bargain.
   */
  it("erases in bulk at exactly the same refund rate as removing one tile", async () => {
    const user = userEvent.setup();
    const session = createCityDevSession();
    const cells = [
      { col: 0, row: 3 },
      { col: 1, row: 3 },
    ];
    await session.layRoads(cells, 10_000);
    const spentBefore = session.roadGoldSpent();
    expect(spentBefore).toBe(2 * ROAD_TILE_GOLD_COST);

    render(
      <CitySurface
        enableCanvas={false}
        goldAvailable={100}
        loadCity={session.load}
        onRemoveRoads={session.removeRoads}
      />,
    );
    await ready();
    const shop = await openShop(user);
    await user.click(within(shop).getByRole("tab", { name: "Roads" }));
    await user.click(roadsCard(shop));
    const bar = await screen.findByTestId("road-paint-bar");

    // Switch to erase and sweep the two laid tiles with the keyboard.
    await user.click(within(bar).getByRole("button", { name: /Erase/ }));
    expect(screen.getByTestId("road-hint")).toHaveTextContent(/refunds every tile/i);
    screen.getByTestId("city-viewport").focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByTestId("road-cost")).toHaveTextContent(
      `+${2 * ROAD_TILE_GOLD_COST} ${materialWord(DEFAULT_ERA_ID)}`,
    );

    await user.keyboard("{Enter}");
    await waitFor(() =>
      expect(session.roadGoldSpent()).toBe(spentBefore - 2 * ROAD_TILE_GOLD_COST),
    );
    expect(screen.getByTestId("city-live-polite")).toHaveTextContent(
      `Removed 2 road tiles. ${2 * ROAD_TILE_GOLD_COST} ${materialWord(DEFAULT_ERA_ID)} refunded.`,
    );
    expect((await session.load()).roads).toHaveLength(0);
  });
});
