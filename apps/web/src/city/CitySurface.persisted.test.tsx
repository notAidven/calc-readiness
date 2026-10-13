import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  createDevSessionStore,
  type DevSessionStorage,
  withDevPersistence,
} from "../devPersistence/devSession";
import { CitySurface } from "./CitySurface";
import { createCityDevSession } from "./citySession";
import { openBuiltShelf } from "./test/openBuiltShelf";

function memStorage(): DevSessionStorage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

function plotButton(nodeId: string): HTMLElement {
  const button = document.querySelector<HTMLElement>(
    `button.city-plot[data-node-id="${nodeId}"]`,
  );
  if (!button) {
    throw new Error(`No roster button for ${nodeId}`);
  }
  return button;
}

describe("CitySurface move on the PERSISTED (withDevPersistence) path", () => {
  it("moves a building through the wrapped session and the re-read reflects it", async () => {
    const user = userEvent.setup();
    const store = createDevSessionStore({
      storage: memStorage(),
      enabled: true,
      debounceMs: 0,
    });
    const session = withDevPersistence(createCityDevSession(), store);
    // The Town Hall is pre-seeded at the island centre; place the skill under test
    // clear of that centre block.
    await session.placeSkill("NUM.S", { col: 2, row: 0, rot: 0 });

    render(
      <CitySurface
        enableCanvas={false}
        loadCity={session.load}
        onMoveTownHall={session.moveTownHall}
        onPlaceSkill={session.placeSkill}
        onMoveSkill={session.moveSkill}
      />,
    );

    // Open the placed building's menu (roster path) and start a move.
    await openBuiltShelf(user);
    await user.click(plotButton("NUM.S"));
    const menu = await screen.findByRole("dialog");
    await user.click(within(menu).getByRole("button", { name: /Move building/i }));

    // Nudge one cell east, then drop it.
    const bar = await screen.findByRole("group", { name: /Moving/ });
    const drop = within(bar).getByRole("button", { name: /Drop here/ });
    drop.focus();
    await user.keyboard("{ArrowRight}");
    await user.click(drop);

    // The user's symptom: after "Drop here" the building must actually be at the
    // new cell — checked through the SAME wrapped session the app re-reads from.
    await waitFor(async () => {
      const placed = (await session.load()).placements?.find((p) => p.nodeId === "NUM.S");
      expect(placed).toMatchObject({ col: 3, row: 0 });
    });
  });
});
