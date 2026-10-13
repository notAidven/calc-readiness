import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { isServerBacked } from "../api";
import { SessionProvider } from "../auth/SessionContext";
import { isDevPersistenceEnabled } from "../devPersistence/devSession";
import { DIAGNOSTIC_SKIP_RUNGS, DiagnosticDevSkip } from "./DiagnosticDevSkip";
import { DiagnosticRunner } from "./DiagnosticRunner";

/**
 * **THE DIAGNOSTIC'S DEV SKIP IS NOT ON THE SHIPPED SURFACE, AND THE GATE IS THE REPO'S OWN.**
 *
 * *"It is behind a flag"* and *"the flag works"* are two claims, and this file is the first.
 * Every mounted assertion drives the REAL ENVIRONMENT — `vi.stubEnv` on
 * `VITE_DIAGNOSTIC_API_URL`, the read Vite inlines at build time — so what is measured is what
 * a browser would get. **Nothing here can switch the control on any other way**, because
 * there is no other way: the component takes no override prop and reads the gate at render,
 * which is what makes it unroutable rather than merely defaulted (see its own header, and
 * `test/diagnosticDevSkipStaysDev.test.ts` for the sweep that keeps it that way).
 *
 * The stakes here are higher than for the winter's skip and worth naming: that control
 * resolves rounds of an unscored encounter, and this one ANSWERS A DIAGNOSTIC. Shipped past
 * its gate it would let a learner hand themselves a full test-out — twenty buildings and a
 * placement they never earned, written by the real scorer, so nothing downstream could tell.
 *
 * The gate is `isDevPersistenceEnabled()` = `!isServerBacked(true)`, i.e.
 * `VITE_DIAGNOSTIC_API_URL` unset. `winterDevSkipIsGated.test.tsx` carries the full argument
 * for why that existing predicate rather than a new flag — it is exactly "does this browser
 * talk to the account service", it answers synchronously from the first frame so the control
 * cannot flash, and it errs safe — plus the one-off read of a real production bundle
 * confirming the endpoint is a string literal there. None of that is restated.
 */

/** What `docs/Deployment.md` bakes into the shipped SPA. */
const DEPLOYED_API = "https://calc-readiness.example/api/diagnostic";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("the gate this control hangs on", () => {
  /**
   * THE PREMISE, measured rather than assumed. Without it, "the control is absent" and "the
   * environment stub did nothing" are indistinguishable.
   */
  it("is off on a deployed build and on in a local one", () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", DEPLOYED_API);
    expect(isServerBacked(true)).toBe(true);
    expect(isDevPersistenceEnabled()).toBe(false);

    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
    expect(isServerBacked(true)).toBe(false);
    expect(isDevPersistenceEnabled()).toBe(true);
  });
});

describe("the skip control on the diagnostic a learner is served", () => {
  /**
   * BOTH DIRECTIONS, and the pair is the point.
   *
   * "Absent when the endpoint is configured" passes trivially for a control that was
   * deleted, never mounted, or mounted under a different name; "present when it is not" is
   * what rules all three out. Either alone is satisfied by a component that has stopped
   * reading the gate.
   */
  it("is absent with an API endpoint configured and present without one", () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", DEPLOYED_API);
    const deployed = render(
      <SessionProvider>
        <DiagnosticRunner />
      </SessionProvider>,
    );
    expect(
      deployed.queryByTestId("dgx-dev-skip"),
      "the dev skip control is on the diagnostic a real learner is served",
    ).toBeNull();
    // The surface itself really rendered, so the absence above is an absence and not a
    // blank mount.
    expect(
      deployed.getByRole("button", { name: /start the diagnostic/i }),
    ).toBeInTheDocument();
    deployed.unmount();

    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
    const local = render(
      <SessionProvider>
        <DiagnosticRunner />
      </SessionProvider>,
    );
    expect(
      local.queryByTestId("dgx-dev-skip"),
      "the dev skip control is missing from a local build, so the test above proves nothing",
    ).not.toBeNull();
    // And it is a usable control rather than an empty shell: the ladder is what a press needs.
    for (const rung of DIAGNOSTIC_SKIP_RUNGS) {
      expect(local.getByTestId(`dgx-dev-skip-${rung.id}`)).toBeInTheDocument();
    }
  });

  /**
   * Every handle it could be found by, because a control renamed out of one is still shipped.
   */
  it("leaves no trace of itself on a deployed build", () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", DEPLOYED_API);
    render(
      <SessionProvider>
        <DiagnosticRunner />
      </SessionProvider>,
    );
    expect(document.querySelector(".dgx-skip")).toBeNull();
    expect(screen.queryByText(/Answer it for me/i)).toBeNull();
    expect(screen.queryByText(/Dev only/i)).toBeNull();
  });

  /**
   * THE OPPOSITE CLAIM: a rung is a real button wired to a real handler, rather than the
   * control being hidden. A component that had stopped rendering its ladder would satisfy
   * "absent on a deployed build" perfectly, so this is what rules that out.
   *
   * Mounted on a LOCAL build, through the same environment stub as everything above, because
   * that is the only door in — the component has no prop that can render it past its gate.
   * The `getByTestId` calls are the floor: a control that failed to mount fails here rather
   * than passing over an empty ladder.
   */
  it("offers a rung per accuracy, and each one names what it will do", () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
    const runs: string[] = [];
    render(
      <DiagnosticDevSkip
        midRun={false}
        busy={false}
        onRun={async (rung) => {
          runs.push(rung.id);
          return { itemsAsked: 23, purpose: "pre" };
        }}
      />,
    );
    expect(DIAGNOSTIC_SKIP_RUNGS.length).toBeGreaterThanOrEqual(4);
    for (const rung of DIAGNOSTIC_SKIP_RUNGS) {
      const button = screen.getByTestId(`dgx-dev-skip-${rung.id}`);
      expect(button.getAttribute("aria-label")).toContain(rung.describe);
      button.click();
    }
    expect(runs).toEqual(DIAGNOSTIC_SKIP_RUNGS.map((rung) => rung.id));
  });

  /**
   * The rungs are DETERMINISTIC and genuinely different from each other.
   *
   * A rate-based "half right" would make the interesting rung the one nobody can reproduce,
   * and the results table is the thing being photographed. Asserted rather than described,
   * because a `Math.random` slipped into `correctAt` would look identical from outside.
   */
  it("answers deterministically, and the four rungs disagree", () => {
    const shape = (rung: (typeof DIAGNOSTIC_SKIP_RUNGS)[number]) =>
      Array.from({ length: 12 }, (_unused, index) =>
        rung.correctAt(index) ? "1" : "0",
      ).join("");
    for (const rung of DIAGNOSTIC_SKIP_RUNGS) {
      expect(shape(rung), `${rung.id} is not deterministic`).toBe(shape(rung));
    }
    const shapes = DIAGNOSTIC_SKIP_RUNGS.map(shape);
    expect(new Set(shapes).size, `two rungs answer identically: ${shapes.join(" ")}`).toBe(
      DIAGNOSTIC_SKIP_RUNGS.length,
    );
    // And the ladder really spans the range, so "all right" and "all wrong" are reachable.
    expect(shapes).toContain("111111111111");
    expect(shapes).toContain("000000000000");
  });
});
