import type { EraId } from "@cr/skill-graph";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ArchipelagoOverview } from "./ArchipelagoOverview";
import { archipelagoView } from "./archipelagoView";
import { IslandCard } from "./IslandCard";
import { foundingLayout, type IslandRecord } from "./islandState";

const PREHISTORIC: IslandRecord = {
  eraId: "prehistoric",
  layout: foundingLayout(),
};
const NEOLITHIC: IslandRecord = {
  eraId: "neolithic",
  layout: foundingLayout(),
};

function mountCarousel(input: {
  readonly onReset?: (eraId: EraId) => void | Promise<void>;
  readonly standing?: "prehistoric" | "neolithic";
  readonly founded?: readonly IslandRecord[];
}) {
  return render(
    <ArchipelagoOverview
      nodeStates={[]}
      liveEraId={input.standing ?? "neolithic"}
      foundedIslands={input.founded ?? [PREHISTORIC, NEOLITHIC]}
      onEnterIsland={() => undefined}
      onSailTo={() => undefined}
      onResetIsland={input.onReset}
      onClose={() => undefined}
      enableCanvas={false}
      reducedMotion
    />,
  );
}

async function selectPastAndOpenOverflow(
  user: ReturnType<typeof userEvent.setup>,
): Promise<HTMLButtonElement> {
  await user.click(screen.getByTestId("archipelago-select-prehistoric"));
  const trigger = screen.getByRole("button", {
    name: "More island actions",
  }) as HTMLButtonElement;
  await user.click(trigger);
  return trigger;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("reset placement is overflow-only", () => {
  it("keeps reset out of the primary island card", () => {
    const island = archipelagoView({
      nodeStates: [],
      liveEraId: "neolithic",
    }).islands[0];
    if (!island) {
      throw new Error("the first island fixture disappeared");
    }
    render(
      <IslandCard
        island={island}
        onClose={() => undefined}
        onSail={() => undefined}
        onReset={() => undefined}
      />,
    );
    expect(screen.getByTestId("island-card-sail")).toBeTruthy();
    expect(
      screen.queryByRole("button", {
        name: /Reset (this|past) island/i,
      }),
    ).toBeNull();
  });

  it("offers Reset past island only in a separated destructive overflow section", async () => {
    const user = userEvent.setup();
    mountCarousel({ onReset: () => undefined });
    await selectPastAndOpenOverflow(user);

    const menu = screen.getByRole("menu", {
      name: "Island actions",
    });
    const reset = screen.getByRole("menuitem", {
      name: "Reset past island",
    });
    expect(menu).toContainElement(reset);
    expect(reset.closest(".archipelago-overflow-destructive")).not.toBeNull();
    expect(screen.getByTestId("archipelago-primary-action")).toHaveTextContent(
      "Sail to Prehistoric",
    );
    expect(screen.getByTestId("archipelago-primary-action")).not.toHaveTextContent(
      /Reset/i,
    );
  });
});

describe("reset confirmation behavior", () => {
  it("states the exact destructive scope and cancel returns focus to the overflow trigger", async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    mountCarousel({ onReset });
    const trigger = await selectPastAndOpenOverflow(user);
    await user.click(
      screen.getByRole("menuitem", {
        name: "Reset past island",
      }),
    );

    const confirmation = screen.getByRole("alertdialog", {
      name: "Reset past island?",
    });
    expect(confirmation).toHaveTextContent(/buildings, roads, spending and damage/i);
    expect(confirmation).toHaveTextContent(/Town Hall and learned progress remain/i);
    expect(
      screen.getByRole("button", {
        name: "Confirm reset past island",
      }),
    ).toHaveClass("archipelago-reset-confirm-danger");

    await user.click(screen.getByRole("button", { name: "Cancel reset" }));
    expect(onReset).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("runs the authoritative callback once and closes the confirmation", async () => {
    const user = userEvent.setup();
    const onReset = vi.fn(async () => undefined);
    mountCarousel({ onReset });
    const trigger = await selectPastAndOpenOverflow(user);
    await user.click(
      screen.getByRole("menuitem", {
        name: "Reset past island",
      }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Confirm reset past island",
      }),
    );

    await waitFor(() => expect(onReset).toHaveBeenCalledWith("prehistoric"));
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("Escape and click-away close deterministically", async () => {
    const user = userEvent.setup();
    mountCarousel({ onReset: () => undefined });
    const trigger = await selectPastAndOpenOverflow(user);

    fireEvent.keyDown(screen.getByRole("menu", { name: "Island actions" }), {
      key: "Escape",
    });
    expect(screen.queryByRole("menu")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(trigger));

    await user.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("menu")).toBeNull();

    await user.click(trigger);
    await user.click(
      screen.getByRole("menuitem", {
        name: "Reset past island",
      }),
    );
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    expect(screen.queryByRole("alertdialog")).toBeNull();

    await user.click(trigger);
    await user.click(
      screen.getByRole("menuitem", {
        name: "Reset past island",
      }),
    );
    fireEvent.click(
      document.querySelector(".archipelago-reset-confirm-backdrop") as HTMLButtonElement,
    );
    expect(screen.queryByRole("alertdialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});

describe("reset eligibility is authoritative and past-only", () => {
  it("omits reset without a callback, on standing, and on unfounded future islands", async () => {
    const user = userEvent.setup();
    const { unmount } = mountCarousel({});
    await user.click(screen.getByTestId("archipelago-select-prehistoric"));
    expect(
      screen.queryByRole("button", {
        name: "More island actions",
      }),
    ).toBeNull();
    unmount();

    mountCarousel({ onReset: () => undefined });
    expect(
      screen.queryByRole("button", {
        name: "More island actions",
      }),
    ).toBeNull();
    await user.click(screen.getByTestId("archipelago-select-bronze_age"));
    expect(
      screen.queryByRole("button", {
        name: "More island actions",
      }),
    ).toBeNull();
  });
});
