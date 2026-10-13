import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CitySurface } from "./CitySurface";
import { type CityDevSession, createCityDevSession } from "./citySession";
import { civicTestPayment } from "./civicTestSupport";
import { CURRENT_ERA_ID } from "./eraDressing";
import {
  ONBOARDING_ADVISOR_STEP_KEY,
  onboardingBriefingFor,
  saveOnboardingAdvisorStep,
} from "./onboarding/onboardingScript";

const MOMENTS = onboardingBriefingFor(CURRENT_ERA_ID).moments;
const MOMENTS_WITH_BAY = onboardingBriefingFor(CURRENT_ERA_ID, { bay: true }).moments;

/**
 * `bay` must match whatever the render below it passes as `bayAvailable`: "bay" now sits
 * ahead of most other moments in the authored order, so a bay-less render's real index and
 * a bay-included one's disagree by one wherever bay would otherwise have taken a slot.
 */
function startAt(id: string, bay = false): void {
  const moments = bay ? MOMENTS_WITH_BAY : MOMENTS;
  const index = moments.findIndex((candidate) => candidate.id === id);
  expect(index, `the onboarding has no "${id}" moment`).toBeGreaterThanOrEqual(0);
  saveOnboardingAdvisorStep(index);
}

async function sessionWithSkill(): Promise<CityDevSession> {
  const session = createCityDevSession();
  await session.placeSkill("NUM.S", {
    col: -4,
    row: -3,
    rot: 0,
  });
  expect((await session.load()).placements).toHaveLength(1);
  return session;
}

beforeEach(() => {
  localStorage.clear();
});

describe("the onboarding visits the live game surfaces", () => {
  it("opens the placed skill building's real lesson entry without changing progress", async () => {
    const user = userEvent.setup();
    const session = await sessionWithSkill();
    const before = await session.load();
    startAt("lessons");

    render(
      <CitySurface
        enableCanvas={false}
        enableOnboardingDemo
        loadCity={session.load}
        onPlaceSkill={session.placeSkill}
      />,
    );
    await screen.findByTestId("onboarding-advisor");
    await user.click(screen.getByTestId("onboarding-action-lessons"));

    const startLesson = await screen.findByRole("button", { name: /Start lesson/ });
    const entry = startLesson.closest<HTMLElement>('[role="dialog"]');
    expect(entry, "the real building lesson entry did not open").not.toBeNull();
    expect(entry).toHaveTextContent(/Practice set/);
    expect(entry).toHaveTextContent(/Finish the lesson to unlock practice/);

    await user.click(within(entry as HTMLElement).getByRole("button", { name: "Close" }));
    expect(screen.getByTestId("onboarding-advisor-moment")).toHaveAttribute(
      "data-moment",
      "lessons",
    );
    expect(screen.getByTestId("onboarding-advisor-next")).toHaveAttribute(
      "aria-disabled",
      "false",
    );

    expect(await session.load()).toEqual(before);
  });

  it("does not clear the civic step on a mere visit, only on a real placement", async () => {
    const user = userEvent.setup();
    const session = createCityDevSession();
    startAt("civic");

    render(
      <CitySurface
        enableCanvas={false}
        enableOnboardingDemo
        loadCity={session.load}
        onPlaceCivic={(type, transform) =>
          session.placeCivic(type, transform, civicTestPayment(200))
        }
        materialAvailable={200}
        materialLabel="stone"
      />,
    );
    await screen.findByTestId("onboarding-advisor");
    await user.click(screen.getByTestId("onboarding-action-civic"));

    // Opens straight to the Civic tab (the civic-buildings tour step's "Open Build"
    // shortcut, not the Lessons default), so the dialog's own name is already the Civic
    // tab's heading and there is no tab left to click.
    const shop = await screen.findByRole("dialog", { name: /Buy a building for your people/ });
    expect(
      within(shop).getByRole("list", { name: "Civic buildings to buy" }),
    ).toBeInTheDocument();
    const civicCards = within(
      within(shop).getByRole("list", { name: "Civic buildings to buy" }),
    ).getAllByRole("button");
    expect(civicCards.length).toBeGreaterThan(0);
    for (const card of civicCards) {
      expect(card).toHaveTextContent(/stone/i);
    }

    // LOOKING IS NOT PLACING: closing the catalogue having only viewed it must NOT clear
    // the step — the real regression this test now guards, where Next used to unlock the
    // instant the Civic tab was on screen, before anything was built.
    await user.click(within(shop).getByRole("button", { name: "Close build menu" }));
    expect(screen.getByTestId("onboarding-advisor-moment")).toHaveAttribute(
      "data-moment",
      "civic",
    );
    expect(screen.getByTestId("onboarding-advisor-next")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect((await session.load()).civic).toEqual([]);

    // Now actually place one, through the real Build menu, the real card and the real
    // confirm bar — and only THAT clears the gate.
    await user.click(screen.getByTestId("onboarding-action-civic"));
    await user.click(await screen.findByTestId("civic-card-prehistoric_campfire"));
    const confirmBar = await screen.findByRole("group", { name: /Placing/ });
    await user.click(within(confirmBar).getByRole("button", { name: /Build here/ }));

    await waitFor(() => {
      expect(screen.getByTestId("onboarding-advisor-next")).toHaveAttribute(
        "aria-disabled",
        "false",
      );
    });
    expect((await session.load()).civic).toHaveLength(1);
  });

  it("opens the real Town Hall panel and its Review mistakes entry", async () => {
    const user = userEvent.setup();
    const session = createCityDevSession();
    startAt("townhall");

    render(
      <CitySurface enableCanvas={false} enableOnboardingDemo loadCity={session.load} />,
    );
    await screen.findByTestId("onboarding-advisor");
    await user.click(screen.getByTestId("onboarding-action-townhall"));

    const panel = await screen.findByTestId("town-hall-panel");
    expect(within(panel).getByTestId("town-hall-interleaved")).toHaveTextContent(
      "Review mistakes",
    );
    expect(panel).toHaveTextContent(/Questions you miss or skip are saved here/i);
    await user.click(within(panel).getByRole("button", { name: "Close" }));

    expect(screen.getByTestId("onboarding-advisor-moment")).toHaveAttribute(
      "data-moment",
      "townhall",
    );
    expect(screen.getByTestId("onboarding-advisor-next")).toHaveAttribute(
      "aria-disabled",
      "false",
    );
  });

  it("mounts the actual Bay, previews a locked island, and resumes without writes", async () => {
    const user = userEvent.setup();
    const session = createCityDevSession();
    const before = await session.load();
    const onSailIsland = vi.fn();
    const onUnlockIsland = vi.fn();
    startAt("bay", true);

    render(
      <CitySurface
        enableCanvas={false}
        enableOnboardingDemo
        bayAvailable
        loadCity={session.load}
        onSailIsland={onSailIsland}
        onUnlockIsland={onUnlockIsland}
      />,
    );
    await screen.findByTestId("onboarding-advisor");
    await user.click(screen.getByTestId("onboarding-action-bay"));

    // The Bay is a deliberately lazy chunk. Its first transform can exceed Testing Library's
    // one-second default on the deterministic single-worker Windows release path.
    const bay = await screen.findByTestId("archipelago-overview", {}, { timeout: 20_000 });
    expect(bay).toHaveAttribute("data-standing-era", CURRENT_ERA_ID);
    await user.click(within(bay).getByRole("button", { name: /Next island/ }));
    await waitFor(() => expect(bay).toHaveAttribute("data-selected-era", "neolithic"));
    expect(bay).toHaveAttribute("data-state", "closed");

    await user.click(
      within(bay).getByRole("button", {
        name: /Explore Neolithic terrain, camera only/,
      }),
    );
    expect(bay).toHaveAttribute("data-previewing", "true");
    expect(bay).toHaveTextContent(/No unlocking, building, settling, sailing, or saving/);
    await user.click(
      within(bay).getByRole("button", {
        name: /End preview, return to locked shore/,
      }),
    );
    await user.click(within(bay).getByRole("button", { name: "Return to tour" }));

    expect(screen.getByTestId("onboarding-advisor-moment")).toHaveAttribute(
      "data-moment",
      "bay",
    );
    expect(screen.getByTestId("onboarding-advisor-next")).toHaveAttribute(
      "aria-disabled",
      "false",
    );
    expect(localStorage.getItem(ONBOARDING_ADVISOR_STEP_KEY)).toBe(
      String(MOMENTS_WITH_BAY.findIndex((candidate) => candidate.id === "bay")),
    );
    expect(await session.load()).toEqual(before);
    expect(onSailIsland).not.toHaveBeenCalled();
    expect(onUnlockIsland).not.toHaveBeenCalled();
  });
});
