import { DIAGNOSTIC_WALK_SCOPE } from "@cr/item-bank";
import { getNodeOrThrow } from "@cr/skill-graph";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SessionProvider } from "../auth/SessionContext";
import { areaLede, DiagnosticRunner } from "./DiagnosticRunner";
import { skillDisplayName } from "./skillNames";

/**
 * **COMPRESSING THE RESULTS SCREEN MUST NOT MEAN LOSING ANYTHING FROM IT.**
 *
 * The lead asked for the sixty-two-card wall to become a summary of subject areas with the
 * skills *"via a drop down menu if the user wants to click it"*. That is a compression with an
 * obvious failure mode: a screen that summarises correctly and quietly drops skills out of the
 * detail would look right, count right, and be wrong about the one thing the disclosure exists
 * for. This file is the guard on that.
 *
 * ## THE POPULATION IS THE ADMINISTRATION, TAKEN FROM THE RUN
 *
 * `.cursor/rules/qa-verification.mdc`: scope a guard by the behaviour, not by where the
 * behaviour is implemented. The behaviour is *"this screen owes a row to every skill the
 * diagnostic placed"*, so the population is the placement the engine handed to
 * `onPretestComplete` — not a list written here, and not the areas the screen chose to draw,
 * which is the set a broken screen would agree with itself about.
 *
 * It is floored (an administration that placed nothing satisfies every containment assertion
 * below), and its COMPOSITION is asserted as well as its size: a floor of 62 is met by 62 of
 * anything, so all ten subject areas must be present and the specific skills that were
 * invisible on this screen before the instrument widened are named.
 *
 * ## AND THE RANGE, BECAUSE THIS SCREEN IS READ AT BOTH ENDS OF IT
 *
 * A summary that reads well at 17 of 62 can read badly at 0 or at 62, and both are ordinary:
 * a learner who aces the walk tests out of everything, and a learner who misses the first
 * questions is placed at the foundations everywhere. Both are driven here through the REAL
 * walk and the REAL scorer at the dev rungs, so the screens under test are placements the
 * engine produced rather than fixtures, and every assertion about what the screen says is made
 * against what the engine handed over rather than against a pinned number.
 */

/** The dev environment, which is the only thing that puts the scripted rungs on screen. */
function asDeveloper(): void {
  vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
}

interface RunResult {
  readonly user: UserEvent;
  /** Every node the administration placed, with its 0–3 seed. The population. */
  readonly placement: Record<string, number>;
}

/** Drive a whole administration at one rung and land on the results screen. */
async function runAt(rung: "ace" | "miss" | "mixed"): Promise<RunResult> {
  asDeveloper();
  const user = userEvent.setup();
  const onPretestComplete = vi.fn();
  render(
    <SessionProvider>
      <DiagnosticRunner onPretestComplete={onPretestComplete} />
    </SessionProvider>,
  );
  await user.click(screen.getByTestId(`dgx-dev-skip-${rung}`));
  await waitFor(
    () => expect(screen.getByText(/here's what we found/i)).toBeInTheDocument(),
    { timeout: 55_000 },
  );
  expect(onPretestComplete).toHaveBeenCalledTimes(1);
  return {
    user,
    placement: (onPretestComplete.mock.calls[0]?.[0] ?? {}) as Record<string, number>,
  };
}

/** Open every subject area, which is where the per-skill detail lives. */
async function openEveryArea(user: UserEvent): Promise<void> {
  const toggles = [...document.querySelectorAll<HTMLButtonElement>(".dgx-area__toggle")];
  expect(toggles.length, "the screen drew no subject areas at all").toBeGreaterThan(1);
  for (const toggle of toggles) {
    expect(toggle.getAttribute("aria-expanded"), "a closed area says it is open").toBe(
      "false",
    );
    await user.click(toggle);
  }
}

/** Every skill row now on screen, keyed by the node id its `data-node-id` carries. */
function shownSkills(): Map<string, { state: string; text: string }> {
  const found = new Map<string, { state: string; text: string }>();
  for (const row of document.querySelectorAll<HTMLElement>(".dgx-finding")) {
    const nodeId = row.getAttribute("data-node-id") ?? "";
    found.set(nodeId, {
      state: row.querySelector(".dgx-finding__state")?.textContent ?? "",
      text: row.textContent ?? "",
    });
  }
  return found;
}

function resultsText(): string {
  return document.querySelector(".dgx-results")?.textContent ?? "";
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("the results screen's per-skill detail", () => {
  it("has a real administration to be a detail of", () => {
    // THE FLOOR, first: every claim below is a containment claim, and containment holds
    // trivially over an empty administration. Composition too, because a floor constrains
    // size and not shape.
    expect(DIAGNOSTIC_WALK_SCOPE.length).toBeGreaterThanOrEqual(62);
    const domains = new Set(DIAGNOSTIC_WALK_SCOPE.map((id) => getNodeOrThrow(id).domain));
    expect(domains.size, `only ${[...domains].sort().join(", ")}`).toBe(10);
  });

  it("reaches every skill the administration placed, one row each, marked either way", {
    timeout: 90_000,
  }, async () => {
    const { user, placement } = await runAt("mixed");
    const administered = Object.keys(placement);

    // THE POPULATION, from the run rather than from a list here, with its floor and its
    // composition.
    expect(administered.length).toBeGreaterThanOrEqual(62);
    expect(
      new Set(administered.map((id) => getNodeOrThrow(id).domain)).size,
      "the administration did not span every subject area, so a screen that lost one could still pass",
    ).toBe(10);
    // The instances, not the class: geometry and trigonometry are the skills that could not
    // appear on this screen at all before the instrument widened.
    for (const nodeId of ["GEO.1", "GEO.2", "TRG.9", "POL.5"]) {
      expect(administered, `${nodeId} was not administered`).toContain(nodeId);
    }

    // Collapsed, the screen shows no per-skill rows: that is the compression.
    expect(document.querySelectorAll(".dgx-finding")).toHaveLength(0);

    await openEveryArea(user);
    const shown = shownSkills();
    const missing = administered.filter((nodeId) => !shown.has(nodeId));
    expect(
      missing,
      `${missing.length} placed skills have no row behind any disclosure: ${missing.join(", ")}`,
    ).toEqual([]);
    expect(shown.size, "the detail drew rows for skills nobody was placed on").toBe(
      administered.length,
    );

    // Each row carries the skill's NAME and exactly one of the two states, and the state
    // agrees with the placement the engine produced.
    for (const nodeId of administered) {
      const row = shown.get(nodeId);
      expect(row, `${nodeId} has no row`).toBeDefined();
      const mastered = (placement[nodeId] ?? 0) >= 2;
      expect(row?.state, `${nodeId} is marked ${row?.state}`).toBe(
        mastered ? "Mastered" : "Not mastered",
      );
      expect(row?.text, `${nodeId} shows a raw id instead of its name`).toContain(
        skillDisplayName(nodeId),
      );
    }
  });

  /**
   * **THE ABSENCE IS MEASURED WHERE EACH TIER WOULD HAVE SHOWN, not on one screen.**
   *
   * "The four tiers are gone" is a claim about the placement model, and a single run does not
   * exercise it: a `mixed` walk produces levels 0, 1 and 2 and no 3 at all, so an assertion
   * taken there is silent about the top tier. Measured at this tip, level 3 (a robust measured
   * pass, which used to read "Cleared it cleanly") appears in 9 of 62 nodes on an `ace` run and
   * in none of the other three rungs. Forcing a "Strong" label back onto level 3 reddens the
   * `ace` screen and leaves a `mixed`-only assertion green, which is how this test came to be
   * two runs instead of one.
   *
   * So both rungs run, their placements are required to cover all four levels between them,
   * and the absence is asserted on each screen.
   */
  it("shows the binary at every placement level the walk can produce", {
    timeout: 120_000,
  }, async () => {
    const levels = new Set<number>();
    for (const rung of ["mixed", "ace"] as const) {
      const { user, placement } = await runAt(rung);
      for (const level of Object.values(placement)) {
        levels.add(level);
      }
      await openEveryArea(user);

      // The meter is gone from the DOM, not merely hidden.
      expect(document.querySelector(".dgx-scale")).toBeNull();
      expect(document.querySelectorAll(".dgx-scale__pip")).toHaveLength(0);
      // And so are the labels it went with: "Strong" and "Cleared it cleanly" for a pass,
      // "Review" and "Start here" beneath it. A screen still saying any of them has not
      // collapsed to a binary.
      const text = resultsText();
      for (const gone of ["Strong", "Review", "Start here", "Cleared it cleanly"]) {
        expect(text, `the ${rung} results screen still says "${gone}"`).not.toContain(gone);
      }
      // Every row says exactly one of the two things, and says the one the placement means.
      const states = [...shownSkills().values()].map((row) => row.state);
      expect(states.filter((state) => state === "Mastered").length).toBe(
        Object.values(placement).filter((level) => level >= 2).length,
      );
      expect(
        states.filter((state) => state !== "Mastered" && state !== "Not mastered"),
      ).toEqual([]);
      cleanup();
    }
    // THE COMPOSITION: the two runs really did span the whole model, so the absence above
    // is an absence over all four tiers and not over the two that happened to turn up.
    expect(
      [...levels].sort(),
      "the two rungs did not produce all four placement levels, so this sweep did not reach every tier it claims is gone",
    ).toEqual([0, 1, 2, 3]);
  });

  it("keeps the tested-directly and inferred distinction, on the screen and per skill", {
    timeout: 90_000,
  }, async () => {
    const { user } = await runAt("mixed");
    // The split is stated once, above the fold, where it qualifies the counts beside it.
    const line = document.querySelector(".dgx-provenance")?.textContent ?? "";
    expect(line).toMatch(/We asked about \d+ of these skills directly/);
    expect(line).toContain("skill map");
    // BOTH DIRECTIONS of the inference are named. A learner who passed nothing still has
    // inferred skills, decided by a confirmed miss pruning the branch above them, and a
    // sentence that only said "a clean pass tests out the skills beneath it" was false to
    // them. That was found on the zero-of-62 frame rather than reasoned about.
    expect(line).toContain("passed and missed");

    await openEveryArea(user);
    const sources = [...document.querySelectorAll(".dgx-finding__source")];
    expect(sources.length, "no skill says how it was decided").toBe(
      document.querySelectorAll(".dgx-finding").length,
    );
    const kinds = new Set(sources.map((el) => el.getAttribute("data-source")));
    // A mixed walk decides some directly and infers the rest, so both markers are on the
    // screen: a version that had quietly stopped distinguishing them would show one.
    expect(kinds).toEqual(new Set(["measured", "inferred"]));
    for (const source of sources) {
      expect(source.textContent).toBe(
        source.getAttribute("data-source") === "measured" ? "tested" : "from the map",
      );
    }
  });
});

describe("the results screen at both ends of the range", () => {
  it("reads for a learner who tested out of everything", { timeout: 90_000 }, async () => {
    const { user, placement } = await runAt("ace");
    const total = Object.keys(placement).length;
    // The rung's own claim, checked before the copy is judged against it.
    expect(
      Object.values(placement).filter((level) => level >= 2).length,
      "acing the walk did not test out of everything, so this is not the top of the range",
    ).toBe(total);

    const areas = document.querySelectorAll(".dgx-area").length;
    expect(document.querySelector(".dgx-results__lede")?.textContent).toBe(
      `You tested out of all ${areas} subject areas. None of it is a grade.`,
    );
    const tally = document.querySelector(".dgx-tally")?.textContent ?? "";
    expect(tally).toContain(`${total} of ${total}skills mastered`);
    expect(tally).toContain(`${areas} of ${areas}subject areas tested out`);
    // Every area reads as cleared, and nothing on the screen tells the learner they are
    // still at the foundations of anything.
    expect(document.querySelectorAll('.dgx-area[data-standing="all"]')).toHaveLength(areas);
    expect(resultsText()).not.toContain("foundations");

    await openEveryArea(user);
    const states = [...shownSkills().values()].map((row) => row.state);
    expect(states).toHaveLength(total);
    expect(new Set(states)).toEqual(new Set(["Mastered"]));
  });

  it("reads for a learner who tested out of nothing", { timeout: 90_000 }, async () => {
    const { user, placement } = await runAt("miss");
    const total = Object.keys(placement).length;
    expect(
      Object.values(placement).filter((level) => level >= 2).length,
      "missing every question still tested out of something, so this is not the bottom of the range",
    ).toBe(0);

    const areas = document.querySelectorAll(".dgx-area").length;
    // The empty case says what happens next rather than counting what did not happen: "you
    // tested out of 0 of the 10 subject areas" is a scoreboard on a screen that promises it
    // is not one.
    expect(document.querySelector(".dgx-results__lede")?.textContent).toBe(
      `We start you at the foundations of all ${areas} subject areas. None of it is a grade.`,
    );
    expect(resultsText()).not.toContain("0 of 10 subject areas");
    const tally = document.querySelector(".dgx-tally")?.textContent ?? "";
    expect(tally).toContain(`0 of ${total}skills mastered`);
    expect(tally).toContain(`0 of ${areas}subject areas tested out`);
    expect(document.querySelectorAll('.dgx-area[data-standing="all"]')).toHaveLength(0);

    // AND THE DETAIL IS STILL ALL THERE, which is the half of this that a "nothing to show"
    // shortcut would drop: a learner at the foundations still gets every skill named.
    await openEveryArea(user);
    const shown = shownSkills();
    expect([...shown.keys()].sort()).toEqual(Object.keys(placement).sort());
    expect(new Set([...shown.values()].map((row) => row.state))).toEqual(
      new Set(["Not mastered"]),
    );
  });

  it("has a sentence for the middle of the range, which no rung produces", () => {
    // The fourth branch: several areas started, none finished. It is the shape most learners
    // will actually meet and it is unreachable from a scripted rung, so it is driven directly
    // rather than left as the one case nobody has read.
    expect(areaLede(0, 6, 10)).toBe(
      "You are part-way into 6 of the 10 subject areas. None of it is a grade.",
    );
    // And the three the runs above cover, pinned here too so all four branches are readable
    // in one place.
    expect(areaLede(10, 0, 10)).toBe(
      "You tested out of all 10 subject areas. None of it is a grade.",
    );
    expect(areaLede(3, 5, 10)).toBe(
      "You tested out of 3 of the 10 subject areas. None of it is a grade.",
    );
    expect(areaLede(0, 0, 10)).toBe(
      "We start you at the foundations of all 10 subject areas. None of it is a grade.",
    );
    // No branch opens on a negation, which `test/cityCopyRegister.test.ts` rules over every
    // learner-facing sentence in this app and which the empty case is the temptation for.
    for (const [cleared, started] of [
      [0, 0],
      [0, 6],
      [3, 5],
      [10, 0],
    ] as const) {
      expect(areaLede(cleared, started, 10)).not.toMatch(
        /^\s*(No|Not|Nothing|None|Never)\b/,
      );
    }
  });
});
