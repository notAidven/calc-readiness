import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { INTRUSION_SERVED_NODES } from "../intrusion/intrusionItems";
import { PlagueSurface } from "../plague/PlagueSurface";
import { PLAGUE_NODE_ORDER } from "../plague/plagueItems";
import { RelaySurface } from "../relay/RelaySurface";
import { SuccessionSurface } from "../succession/SuccessionSurface";
import {
  SUCCESSION_SCENARIOS,
  successionScenario,
} from "../succession/successionScenarios";
import { audioPrefs } from "./audioPrefs";
import { eraMaterialSfx } from "./soundEffects";
import { installSfxProbe } from "./testSfxProbe";

/**
 * **EVERY CRISIS SOUNDS ITS COMMIT, NOT ONLY THE TWO THE SOURCING SHEET NAMED.**
 *
 * The sheet lists the winter's and the plague's declaration sites for *"a crisis action is
 * committed"*, and both of those spell the transition `type: "declare"`. The intrusion and
 * the succession commit exactly the same way and call it `start_questions` and
 * `start_batch`, so a guard written to the sheet's two files would have been green over two
 * crises taking the player's decision in silence.
 *
 * `test/cityEventSfx.test.ts` owns the population argument: a crisis is an engine with an
 * `answering` phase, and all four have one. This file is the behavioural half — that each
 * surface really does make the sound on the press, and really does not while muted — and
 * `winter/hardWinterSfx.test.tsx` covers the fourth, where the commit shares a file with
 * five other events.
 *
 * ## The era ladder is asserted here rather than assumed
 *
 * Only two of the fourteen sounds vary by era, and this is one of them: the thud names a
 * material, and a material is timber early and iron late. Three of the four crises fall in
 * the timber half and the intrusion is in the information age, so it is the one that
 * exercises the late rung — which makes it the one that would have quietly played timber
 * had the ladder been wired the wrong way round.
 */

const probe = installSfxProbe();

afterAll(() => probe.restore());

beforeEach(() => {
  localStorage.clear();
  probe.reset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  localStorage.clear();
});

/** The file each era's rung resolves to, so nothing here transcribes a filename. */
function commitFile(era: Parameters<typeof eraMaterialSfx>[1]): string {
  return `${eraMaterialSfx("crisis-commit", era)}.ogg`;
}

describe("the plague", () => {
  async function open() {
    render(<PlagueSurface readMasteredNodes={() => PLAGUE_NODE_ORDER} />);
    await screen.findByTestId("pl-action-quarantine-market-care");
  }

  it("thuds once when the round action is committed", async () => {
    await open();
    probe.reset();

    fireEvent.click(screen.getByTestId("pl-action-quarantine-market-care"));

    // The renaissance builds in timber, so this is the ladder's early rung.
    await waitFor(() => expect(probe.played()).toEqual([commitFile("renaissance")]));
  });

  it("stays silent while muted", async () => {
    await open();
    probe.reset();
    audioPrefs.setMuted(true);

    fireEvent.click(screen.getByTestId("pl-action-quarantine-market-care"));

    await waitFor(() =>
      expect(screen.getByText(/Make this one count/)).toBeInTheDocument(),
    );
    expect(probe.played()).toEqual([]);
  });
});

describe("the intrusion", () => {
  function open() {
    render(
      <RelaySurface
        readDrawSet={() => ({ nodeIds: INTRUSION_SERVED_NODES, source: "practised" })}
      />,
    );
  }

  function armAndCommit(): void {
    fireEvent.click(screen.getByTestId("relay-inspect"));
    fireEvent.click(document.querySelector('[data-action="cut"]') as Element);
    fireEvent.click(screen.getByTestId("relay-commit"));
  }

  it("strikes IRON, because the information age does not build in timber", () => {
    open();
    probe.reset();

    fireEvent.click(screen.getByTestId("relay-inspect"));
    fireEvent.click(document.querySelector('[data-action="cut"]') as Element);
    expect(probe.played()).toEqual([]);

    fireEvent.click(screen.getByTestId("relay-commit"));

    expect(probe.played()).toEqual([commitFile("information_age")]);
    // And that is genuinely the OTHER rung, not the same file under another name. If the
    // ladder ever collapses to one sound this is the line that fails.
    expect(commitFile("information_age")).not.toBe(commitFile("prehistoric"));
  });

  it("stays silent while muted", () => {
    open();
    probe.reset();
    audioPrefs.setMuted(true);

    armAndCommit();

    expect(probe.played()).toEqual([]);
  });
});

describe("the succession", () => {
  function open(scenarioId: "announcement" | "correct-consequence" = "announcement") {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "/api/diagnostic");
    const scenario = SUCCESSION_SCENARIOS.find((candidate) => candidate.id === scenarioId);
    if (!scenario) {
      throw new Error("no succession scenario to open");
    }
    render(
      <SuccessionSurface
        initial={successionScenario(scenario.id).build()}
        drawSet={{ nodeIds: [], source: "practised" }}
        enableCanvas={false}
      />,
    );
  }

  it("thuds once when the chosen civic response lands", async () => {
    open("correct-consequence");
    await screen.findByTestId("sx-action-rally");
    probe.reset();

    fireEvent.click(screen.getByTestId("sx-action-rally"));
    await screen.findByTestId("sx-proposal");
    expect(probe.played()).toEqual([]);
    fireEvent.click(screen.getByTestId("sx-commit-action"));

    // The classical era builds in timber.
    await waitFor(() => expect(probe.played()).toEqual([commitFile("classical")]));
  });

  it("does not dress starting the questions as the civic commitment", async () => {
    open();
    probe.reset();

    fireEvent.click(screen.getByTestId("sx-answer-batch"));

    await screen.findByTestId("sx-batch");
    expect(probe.played()).toEqual([]);
  });

  it("stays silent while muted", async () => {
    open("correct-consequence");
    await screen.findByTestId("sx-action-rally");
    probe.reset();
    audioPrefs.setMuted(true);

    fireEvent.click(screen.getByTestId("sx-action-rally"));
    fireEvent.click(await screen.findByTestId("sx-commit-action"));

    await waitFor(() =>
      expect(screen.getByTestId("sx-district-shore").getAttribute("data-control")).toBe(
        "player",
      ),
    );
    expect(probe.played()).toEqual([]);
  });
});
