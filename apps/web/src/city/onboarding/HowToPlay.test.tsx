import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  COACH_MARKS,
  coachGroupLabel,
  coachMarkReference,
} from "../coachmarks/coachMarksCore";
import { DEFAULT_ERA_ID } from "../eraState";
import { HowToPlay } from "./HowToPlay";
import { onboardingBriefingFor } from "./onboardingScript";

const MOMENTS = onboardingBriefingFor(DEFAULT_ERA_ID).moments;

function renderPanel(
  over: Partial<{
    onTalkToAdvisor: () => void;
    onWatchIntro: () => void;
    onShowTips: () => void;
    onClose: () => void;
  }> = {},
) {
  const props = {
    onTalkToAdvisor: vi.fn(),
    onWatchIntro: vi.fn(),
    onShowTips: vi.fn(),
    onClose: vi.fn(),
    ...over,
  };
  render(<HowToPlay eraId={DEFAULT_ERA_ID} {...props} />);
  return props;
}

describe("How to play panel", () => {
  /**
   * THE LOOP IS THE ADVISOR'S MOMENTS NOW, not the reel's four captions.
   *
   * Generated from `onboardingBriefingFor` for the same reason the tip list is generated
   * from `COACH_MARKS`: this card is the only surface where the whole game is described at
   * once, and a hand-written copy of the tutorial would go stale the first time a moment
   * was reworded. A FLOOR under it, because "every point is listed" is trivially true of no
   * points.
   */
  it("lists the advisor's moments as the core loop", () => {
    renderPanel();
    // Seven now: "founding" (net-points scoring slide), "era" (Island Unlock Exam) and
    // "buildings" (redundant with "place") were all deliberately deleted.
    expect(MOMENTS.length).toBeGreaterThanOrEqual(8);
    const panel = screen.getByTestId("how-to-play");
    const loop = within(panel).getByTestId("how-to-play-loop");
    for (const moment of MOMENTS) {
      const row = loop.querySelector(`[data-moment="${moment.id}"]`);
      expect(row, `${moment.id} is missing from the reference card`).not.toBeNull();
      // Its NAME and both of its sentences, so a moment reworded in the sequence cannot
      // leave this card describing the old game.
      expect(row?.textContent).toContain(moment.title);
      expect(row?.textContent).toContain(moment.lead);
      expect(row?.textContent).toContain(moment.body);
    }
  });

  it("lists EVERY coach-mark, so a learner who skipped the tips can still read them", () => {
    // Generated from COACH_MARKS on purpose: adding a hint must not be able to leave
    // this card behind, which is the only place the whole game is described at once.
    renderPanel();
    const panel = screen.getByTestId("how-to-play");
    for (const mark of COACH_MARKS) {
      expect(
        within(panel).getByText(coachMarkReference(mark, DEFAULT_ERA_ID)),
      ).toBeInTheDocument();
    }
  });

  it("states a momentary hint as a rule, not as a claim about the reader", () => {
    renderPanel();
    const panel = screen.getByTestId("how-to-play");
    // "Music is playing" is true when the hint appears and presumptuous in a list;
    // "You tested out of a skill" is flatly false for a reader who did not.
    expect(panel).not.toHaveTextContent("Music is playing");
    expect(panel).not.toHaveTextContent("You tested out of a skill");
    expect(panel).toHaveTextContent(/each have a switch|each has a switch/i);
    expect(panel).toHaveTextContent(/A skill you tested out of on the diagnostic/i);
  });

  it("groups the tips under real headings, in list markup", () => {
    renderPanel();
    const panel = screen.getByTestId("how-to-play");
    // Only the sections that actually have hints get a heading.
    const groups = new Set(COACH_MARKS.map((mark) => mark.group));
    for (const group of groups) {
      expect(
        within(panel).getByRole("heading", {
          name: coachGroupLabel(group, DEFAULT_ERA_ID),
        }),
      ).toBeInTheDocument();
    }
    // The loop is one row per moment now rather than a section per moment, so the card's
    // list items are every hint plus every moment and nothing else.
    expect(within(panel).getAllByRole("listitem").length).toBe(
      COACH_MARKS.length + MOMENTS.length,
    );
  });

  it("offers the three replay routes and reports them", async () => {
    const user = userEvent.setup();
    const { onTalkToAdvisor, onWatchIntro, onShowTips } = renderPanel();

    // The advisor's own route, which is what his closing line promises.
    await user.click(screen.getByTestId("how-to-play-advisor"));
    expect(onTalkToAdvisor).toHaveBeenCalledTimes(1);

    await user.click(screen.getByTestId("how-to-play-watch"));
    expect(onWatchIntro).toHaveBeenCalledTimes(1);

    await user.click(screen.getByTestId("how-to-play-tips"));
    expect(onShowTips).toHaveBeenCalledTimes(1);
  });

  it("names the advisor on his own replay button rather than hardcoding him", () => {
    renderPanel();
    // Derived from `resolveEraAdvisor` through the briefing, so a rename of the character
    // reaches this button instead of leaving it inviting a conversation with somebody who
    // has left. The name is asserted through the briefing for that reason.
    const name = onboardingBriefingFor(DEFAULT_ERA_ID).advisorName;
    expect(name.length).toBeGreaterThan(1);
    expect(screen.getByTestId("how-to-play-advisor")).toHaveTextContent(
      `Talk to ${name} again`,
    );
  });

  it("is a labelled modal that autofocuses its primary action", () => {
    renderPanel();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("How to play");
    expect(screen.getByTestId("how-to-play-advisor")).toHaveFocus();
  });

  it("closes on Escape and on the corner close", async () => {
    const user = userEvent.setup();
    const { onClose } = renderPanel();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("traps Tab inside the panel", async () => {
    const user = userEvent.setup();
    renderPanel();
    const close = screen.getByRole("button", { name: "Close" });
    const tips = screen.getByTestId("how-to-play-tips");

    // Focus starts on the advisor's replay route; the last control wraps to the first.
    tips.focus();
    await user.tab();
    expect(close).toHaveFocus();

    await user.tab({ shift: true });
    expect(tips).toHaveFocus();
  });
});
