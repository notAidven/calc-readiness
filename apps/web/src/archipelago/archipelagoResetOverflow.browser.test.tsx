import { afterEach, expect, test, vi } from "vitest";

import { type Harness, mount, waitFor } from "../lessons/testHarness";
import { ArchipelagoOverview } from "./ArchipelagoOverview";
import { foundingLayout } from "./islandState";

let harness: Harness | null = null;

afterEach(() => {
  harness?.cleanup();
  harness = null;
});

test("keeps overflow and destructive confirmation keyboard-sized in a browser", async () => {
  const onReset = vi.fn(async () => undefined);
  harness = mount(
    <div className="city-shell">
      <ArchipelagoOverview
        nodeStates={[]}
        liveEraId="neolithic"
        foundedIslands={[
          {
            eraId: "prehistoric",
            layout: foundingLayout(),
          },
          {
            eraId: "neolithic",
            layout: foundingLayout(),
          },
        ]}
        onEnterIsland={() => undefined}
        onSailTo={() => undefined}
        onResetIsland={onReset}
        onClose={() => undefined}
        enableCanvas={false}
        reducedMotion
      />
    </div>,
  );

  await waitFor(
    () => document.querySelector('[data-testid="archipelago-select-prehistoric"]') !== null,
    "the direct past-island selector did not mount",
  );
  document
    .querySelector<HTMLButtonElement>('[data-testid="archipelago-select-prehistoric"]')
    ?.click();
  await waitFor(
    () =>
      Array.from(document.querySelectorAll<HTMLButtonElement>("button")).some(
        (button) => button.getAttribute("aria-label") === "More island actions",
      ),
    "the eligible reset overflow trigger did not mount",
  );
  const trigger = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => button.getAttribute("aria-label") === "More island actions",
  );
  trigger?.click();
  await waitFor(
    () => document.querySelector('[role="menu"]') !== null,
    "the reset overflow menu did not open",
  );
  const reset = document.querySelector('[role="menuitem"]') as HTMLButtonElement;
  for (const [name, element] of [
    ["overflow trigger", trigger],
    ["Reset past island", reset],
  ] as const) {
    const box = element?.getBoundingClientRect();
    expect(box?.width ?? 0, `${name} width`).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0, `${name} height`).toBeGreaterThanOrEqual(44);
  }

  reset.click();
  await waitFor(
    () => document.querySelector('[role="alertdialog"]') !== null,
    "the destructive confirmation did not open",
  );
  const confirm = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => /Confirm reset past island/.test(button.textContent ?? ""),
  );
  const confirmBox = confirm?.getBoundingClientRect();
  expect(confirmBox?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(confirmBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  confirm?.click();
  await waitFor(
    () => onReset.mock.calls.length === 1,
    "the authoritative reset callback did not run",
  );
  expect(onReset).toHaveBeenCalledWith("prehistoric");
});
