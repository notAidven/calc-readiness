import type { PlacementEstimate } from "@cr/state-schema";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { PlacementSeed } from "../diagnostic/placementRosters";
import { type RewardBuilding, UnlockCelebration } from "./UnlockCelebration";

/** The island's roster, in teaching order, with resolved topic + building names. */
const ISLAND: readonly RewardBuilding[] = [
  { nodeId: "NUM.S", topic: "Signed numbers", building: "Assembly Hall" },
  { nodeId: "NUM.F", topic: "Fractions", building: "Store" },
  { nodeId: "NUM.2", topic: "Order of operations", building: "Dwellings" },
  { nodeId: "NUM.3", topic: "Field properties", building: "Workshop" },
  { nodeId: "NUM.4", topic: "Combining like terms", building: "Commons" },
  { nodeId: "NUM.5", topic: "Ratios and percents", building: "Tower" },
];

/**
 * A placement over this island's six, with `passing` at a robust pass. The headline reads
 * off THIS and not off the card arrays, so a case that wants the two to differ says so by
 * handing a placement over a different set — see `celebrationDenominator.test.tsx`, which
 * owns that claim over the real widened instrument.
 */
function placementOverIsland(passing: readonly string[]): PlacementSeed {
  const placement: Record<string, PlacementEstimate> = {};
  for (const card of ISLAND) {
    placement[card.nodeId] = passing.includes(card.nodeId) ? 3 : 0;
  }
  return placement;
}

/** Render the reward popup with a skip/learn split of the shared island set. */
function renderReward(
  over: {
    skips?: readonly RewardBuilding[];
    learns?: readonly RewardBuilding[];
    placement?: PlacementSeed;
    enableThumbnails?: boolean;
    reducedMotion?: boolean;
    onPlace?: () => void;
    onClose?: () => void;
  } = {},
) {
  const skips = over.skips ?? ISLAND.slice(0, 3);
  const learns = over.learns ?? ISLAND.slice(3);
  const placement = over.placement ?? placementOverIsland(skips.map((card) => card.nodeId));
  const onPlace = over.onPlace ?? vi.fn();
  const onClose = over.onClose ?? vi.fn();
  const result = render(
    <UnlockCelebration
      placement={placement}
      skips={skips}
      learns={learns}
      enableThumbnails={over.enableThumbnails ?? false}
      reducedMotion={over.reducedMotion ?? true}
      onPlace={onPlace}
      onClose={onClose}
    />,
  );
  return { ...result, onPlace, onClose };
}

describe("UnlockCelebration — diagnostic reward popup", () => {
  it("headlines the tested-out-of-administered summary and a free/to-learn sub-line", () => {
    renderReward();
    // The dialog is labelled by the headline, whose two numbers are both counts of the
    // PLACEMENT: three of the island's six passed and the placement covers six.
    const dialog = screen.getByRole("dialog", {
      name: /You tested out of 3 of 6 skills/i,
    });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    // The sub-line counts the card grids, so it names the island it is counting.
    expect(dialog).toHaveTextContent(/3\s*buildings free on this island/i);
    expect(dialog).toHaveTextContent(/3\s*to learn/i);
  });

  it("renders one gold skip card per tested-out skill with topic + building names", () => {
    renderReward();
    const list = screen.getByRole("list", { name: "Skills ready to build" });
    const cards = within(list).getAllByRole("listitem");
    expect(cards).toHaveLength(3);

    // Each skip card pairs the topic + building name with a gold "no lesson" badge.
    for (const item of ISLAND.slice(0, 3)) {
      const card = cards.find((el) => el.getAttribute("data-node-id") === item.nodeId);
      expect(card).toBeDefined();
      expect(card).toHaveAttribute("data-variant", "skip");
      expect(card).toHaveTextContent(item.topic);
      expect(card).toHaveTextContent(item.building);
      expect(within(card as HTMLElement).getByText("No lesson needed")).toBeInTheDocument();
      // The badge mark is a decorative SVG icon, not an emoji glyph.
      expect(
        (card as HTMLElement).querySelector(".reward-card__badge-icon svg"),
      ).not.toBeNull();
      expect(card).not.toHaveTextContent("✓");
    }
  });

  it("renders one learn card per remaining island skill with the finish-the-lesson badge", () => {
    renderReward();
    const list = screen.getByRole("list", { name: "Skills still to learn" });
    const cards = within(list).getAllByRole("listitem");
    expect(cards).toHaveLength(3);

    for (const item of ISLAND.slice(3)) {
      const card = cards.find((el) => el.getAttribute("data-node-id") === item.nodeId);
      expect(card).toBeDefined();
      expect(card).toHaveAttribute("data-variant", "learn");
      expect(card).toHaveTextContent(item.topic);
      expect(card).toHaveTextContent(item.building);
      expect(
        within(card as HTMLElement).getByText("Build by finishing its lesson"),
      ).toBeInTheDocument();
      // The learn badge is TEXT-ONLY now — no lesson/book icon (or any icon at all)
      // in the badge (the thumb's glyph fallback SVG is separate and unaffected).
      const badge = (card as HTMLElement).querySelector(".reward-card__badge");
      expect(badge?.querySelector(".reward-card__badge-icon")).toBeNull();
      expect(badge?.querySelector("svg")).toBeNull();
      expect(card).not.toHaveTextContent("📖");
    }
  });

  it("renders no emoji/dingbat glyphs anywhere in the popup", () => {
    renderReward();
    const text = screen.getByRole("dialog").textContent ?? "";
    // Badges use decorative SVG icons, not emoji. The only intentional non-ASCII
    // char is the "·" (U+00B7) subline separator, which is outside these ranges
    // (this catches the old "✓" at U+2713 and "📖" at U+1F4D6).
    expect(text).not.toMatch(/[\u2600-\u27BF\u2B00-\u2BFF\u{1F000}-\u{1FAFF}]/u);
  });

  it("hides the Still-to-learn section when every skill tested out", () => {
    renderReward({ skips: ISLAND, learns: [] });
    expect(screen.getByRole("dialog")).toHaveTextContent(
      /You tested out of 6 of 6 skills/i,
    );
    expect(screen.getByRole("list", { name: "Skills ready to build" })).toBeInTheDocument();
    // No learn section / list at all.
    expect(screen.queryByRole("list", { name: "Skills still to learn" })).toBeNull();
    expect(screen.queryByText("Still to learn")).toBeNull();
  });

  it("falls back to a building glyph (no live canvas) when thumbnails are disabled", () => {
    const { container } = renderReward({ enableThumbnails: false });
    // One glyph per card (3 skip + 3 learn), and no live WebGL canvas mounted.
    expect(container.querySelectorAll(".reward-card__glyph")).toHaveLength(6);
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("renders the decorative island backdrop (static gradient, no canvas) in headless", () => {
    const { container } = renderReward({ enableThumbnails: false });
    // The reward sits over the living-island backdrop scene — a decorative layer...
    const scene = container.querySelector(".unlock-reward-scene");
    expect(scene).not.toBeNull();
    expect(scene).toHaveAttribute("aria-hidden", "true");
    // ...which, with thumbnails/WebGL off, shows the static island gradient (no canvas).
    expect(container.querySelector(".unlock-reward-scene-fallback")).not.toBeNull();
    expect(container.querySelector("canvas")).toBeNull();
    // A soft contrast scrim sits between the island and the card.
    expect(container.querySelector(".unlock-reward-scrim")).not.toBeNull();
  });

  it("fires the primary CTA to open the build menu", async () => {
    const user = userEvent.setup();
    const { onPlace } = renderReward();
    const cta = screen.getByRole("button", { name: "Start building" });
    expect(cta).toHaveFocus();
    await user.click(cta);
    expect(onPlace).toHaveBeenCalledTimes(1);
  });

  it("dismisses on the corner ✕ and on Escape", async () => {
    const user = userEvent.setup();
    const { onClose } = renderReward();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
