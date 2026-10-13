import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AchievementNote } from "./AchievementNote";
import { AchievementsPanel } from "./AchievementsPanel";
import { ACHIEVEMENTS, achievementKey } from "./achievements";

/**
 * **WHAT THE TWO SURFACES ACTUALLY PUT ON SCREEN.**
 *
 * `test/achievementsAreNotAScore.test.ts` guards the DECLARATIONS: the copy, the axes, the
 * thresholds, the stylesheet. What it deliberately does not do is read a source for a
 * rendered number, because a regex cannot tell a rendered count from a loop bound and
 * `CitySurface` is full of the second. So the *"nothing is counted"* claim is made here,
 * against the rendered text, which is the thing the claim is actually about.
 *
 * The panel is rendered with a MIX of earned and unearned rows, because that is the state
 * every learner spends the whole game in and the state in which a completion percentage
 * would be tempting.
 */

/** What `docs/Deployment.md` bakes into the shipped SPA. */
const DEPLOYED_API = "https://calc-readiness.example/api/diagnostic";

/** The first row, earned; everything else not. */
function someEarned(): Set<string> {
  const first = ACHIEVEMENTS[0];
  if (first === undefined) {
    throw new Error("the table is empty");
  }
  return new Set([first.id]);
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  localStorage.clear();
});

describe("the list, with a mix of earned and unearned", () => {
  it("shows every row, marked, with the right sentence on each", () => {
    render(
      <AchievementsPanel
        earned={someEarned()}
        onDevFire={() => undefined}
        onDevForget={() => undefined}
        onClose={() => undefined}
      />,
    );

    const card = screen.getByTestId("achievements-panel");
    for (const achievement of ACHIEVEMENTS) {
      const row = card.querySelector<HTMLElement>(`[data-achievement="${achievement.id}"]`);
      if (row === null) {
        throw new Error(`${achievement.id} is not on the card`);
      }
      const earned = someEarned().has(achievement.id);
      expect(row.dataset.earned).toBe(String(earned));
      expect(row.textContent).toContain(earned ? achievement.earned : achievement.toEarn);
      // The other sentence is NOT also on the row, so an unearned entry is not the record
      // with a mark missing.
      expect(row.textContent).not.toContain(
        earned ? achievement.toEarn : achievement.earned,
      );
      // AND THE STATE IS IN WORDS, not only in a mark or a colour: `Earned` / `Not yet`
      // beside the sentence, so the card does not depend on seeing a tick.
      expect(row.textContent).toContain(earned ? "Earned" : "Not yet");
    }
  });

  /**
   * **THE ONE ASSERTION THIS FILE EXISTS FOR.**
   *
   * §5.6 of the game-feel backlog: *"the moment they are collected onto one surface they
   * become a set with a SIZE, and a set with a size has a completion percentage whether or
   * not anybody renders one."* The lead asked for the surface, so the answer is that nothing
   * on it is a number. Measured on the rendered text rather than argued from the source.
   */
  it("renders no count, no fraction, no percentage and no tier", () => {
    render(
      <AchievementsPanel
        earned={someEarned()}
        onDevFire={() => undefined}
        onDevForget={() => undefined}
        onClose={() => undefined}
      />,
    );
    const card = screen.getByTestId("achievements-panel");
    // The dev instrument names ids and is not the learner's card, so it is out of this
    // reading: it renders only where `isDevPersistenceEnabled()` is true, which is asserted
    // separately below.
    card.querySelector('[data-testid="ach-dev"]')?.remove();

    const shown = card.textContent ?? "";
    // The floor: the card really did render its rows, so the absences below mean something.
    expect(shown.length, "the card rendered nothing").toBeGreaterThan(120);
    for (const achievement of ACHIEVEMENTS) {
      expect(shown).toContain(
        someEarned().has(achievement.id) ? achievement.earned : achievement.toEarn,
      );
    }

    expect(shown, "a number is on the card").not.toMatch(/\d/);
    expect(shown, "a percentage is on the card").not.toMatch(/%/);
    expect(shown, "a score word is on the card").not.toMatch(
      /\b(total|points?|score|tier|rank|rarity|complete|completion|progress|of \w+ earned)\b/i,
    );
    // And no progress element, which is the same thing without any text in it.
    expect(card.querySelector("progress"), "a progress bar is on the card").toBeNull();
    expect(card.querySelector('[role="progressbar"]')).toBeNull();
  });

  it("closes on Escape and on its corner control", async () => {
    const user = userEvent.setup();
    const closed = vi.fn();
    render(
      <AchievementsPanel
        earned={new Set()}
        onDevFire={() => undefined}
        onDevForget={() => undefined}
        onClose={closed}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(closed).toHaveBeenCalledTimes(1);

    await user.keyboard("{Escape}");
    expect(closed).toHaveBeenCalledTimes(2);
  });
});

describe("the moment one is earned", () => {
  it("says the sentence, announces it politely, and carries no number", () => {
    const first = ACHIEVEMENTS[0];
    if (first === undefined) {
      throw new Error("the table is empty");
    }
    render(<AchievementNote line={first.earned} reducedMotion={false} />);

    const note = screen.getByTestId("city-achievement");
    expect(note.textContent).toContain(first.earned);
    // The eyebrow names what happened, because a bare sentence reads as one more of the
    // HUD's announcements.
    expect(note.textContent).toContain("Achievement earned");
    // A screen-reader user who missed the line missed the achievement, so the element is
    // the live region rather than depending on the surface's shared one.
    expect(note.getAttribute("aria-live")).toBe("polite");
    expect(note.textContent ?? "", "a number is in the moment").not.toMatch(/\d/);

    // It is not a dialog: it interrupts nothing and asks for nothing.
    expect(note.getAttribute("role")).toBeNull();
    expect(note.querySelector("button"), "the moment asks for a click").toBeNull();
  });

  it("reports its reduced-motion state so the rise can be held still", () => {
    const { rerender } = render(
      <AchievementNote line="A line about a city." reducedMotion />,
    );
    expect(screen.getByTestId("city-achievement").dataset.reducedMotion).toBe("true");
    rerender(<AchievementNote line="A line about a city." reducedMotion={false} />);
    expect(screen.getByTestId("city-achievement").dataset.reducedMotion).toBe("false");
  });
});

describe("the dev control inside the list", () => {
  /**
   * BOTH DIRECTIONS, and the pair is the point: *"absent when the endpoint is configured"*
   * passes trivially for a control that was deleted or renamed, and *"present when it is
   * not"* is what rules that out. Neither drives a prop, because there is none to drive.
   */
  it("is absent with an API endpoint configured and present without one", async () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", DEPLOYED_API);
    const deployed = render(
      <AchievementsPanel
        earned={new Set()}
        onDevFire={() => undefined}
        onDevForget={() => undefined}
        onClose={() => undefined}
      />,
    );
    expect(
      deployed.queryByTestId("ach-dev"),
      "the dev control is on the card a real learner is served",
    ).toBeNull();
    // The card itself really rendered, so the absence above is an absence.
    expect(deployed.getByRole("heading", { name: "Achievements" })).toBeInTheDocument();
    expect(deployed.queryByText(/Dev only/i)).toBeNull();
    deployed.unmount();

    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
    const local = render(
      <AchievementsPanel
        earned={new Set()}
        onDevFire={() => undefined}
        onDevForget={() => undefined}
        onClose={() => undefined}
      />,
    );
    expect(
      local.queryByTestId("ach-dev"),
      "the dev control is missing locally, so the test above proves nothing",
    ).not.toBeNull();
    // And it is usable rather than an empty shell: a button per row, plus the reset.
    for (const achievement of ACHIEVEMENTS) {
      expect(local.getByTestId(`ach-dev-fire-${achievement.id}`)).toBeInTheDocument();
    }
    expect(local.getByTestId("ach-dev-forget")).toBeInTheDocument();
  });

  it("hands the host each id to fire, and offers no button for one already earned", async () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
    const user = userEvent.setup();
    const fired: string[] = [];
    const forgot = vi.fn();
    const earned = someEarned();

    render(
      <AchievementsPanel
        earned={earned}
        onDevFire={(id) => fired.push(id)}
        onDevForget={forgot}
        onClose={() => undefined}
      />,
    );

    const panel = screen.getByTestId("ach-dev");
    for (const achievement of ACHIEVEMENTS) {
      const button = within(panel).getByTestId(`ach-dev-fire-${achievement.id}`);
      // An already-earned row has nothing to fire, and the button says so rather than
      // pretending a second press means anything.
      expect(button).toHaveProperty("disabled", earned.has(achievement.id));
    }

    const unearned = ACHIEVEMENTS.filter((achievement) => !earned.has(achievement.id));
    expect(unearned.length, "every row is already earned").toBeGreaterThan(0);
    const target = unearned[0];
    if (target === undefined) {
      throw new Error("no unearned row to fire");
    }
    await user.click(within(panel).getByTestId(`ach-dev-fire-${target.id}`));
    expect(fired).toEqual([target.id]);

    await user.click(within(panel).getByTestId("ach-dev-forget"));
    expect(forgot).toHaveBeenCalledTimes(1);
    // And it says which press it was, because a reset list looks exactly like a list that
    // was never earned.
    expect(screen.getByTestId("ach-dev-note").textContent).toMatch(/Forgot every one/);
  });

  /**
   * The keys it writes are the real ones. A dev control that wrote to its own namespace
   * would photograph a preview of the feature rather than the feature.
   */
  it("writes nothing itself, so the host owns the real key", async () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
    const user = userEvent.setup();
    const target = ACHIEVEMENTS[0];
    if (target === undefined) {
      throw new Error("the table is empty");
    }
    render(
      <AchievementsPanel
        earned={new Set()}
        onDevFire={() => undefined}
        onDevForget={() => undefined}
        onClose={() => undefined}
      />,
    );
    await user.click(screen.getByTestId(`ach-dev-fire-${target.id}`));
    expect(
      localStorage.getItem(achievementKey(target.id)),
      "the dev control wrote the earned flag itself, bypassing the host",
    ).toBeNull();
  });
});
