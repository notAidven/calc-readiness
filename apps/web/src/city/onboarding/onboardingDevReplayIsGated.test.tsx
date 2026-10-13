import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isServerBacked } from "../../api";
import { isDevPersistenceEnabled } from "../../devPersistence/devSession";
import { CitySurface } from "../CitySurface";
import { MOCK_NODE_STATES } from "../mockCity";
import type { CityLoad } from "../types";
import { ONBOARDING_ADVISOR_DONE_KEY } from "./onboardingScript";

/**
 * **THE ONBOARDING REPLAY CONTROL IS NOT ON THE SHIPPED SURFACE, AND THE GATE IS THE REPO'S.**
 *
 * *"It is behind a flag"* and *"the flag works"* are two claims, and this file is the second one.
 * Nothing below passes the component's `enabled` prop: every assertion drives the DEFAULT,
 * through the real environment, so what is measured is what a browser would get.
 *
 * It is `winter/winterDevSkipIsGated.test.tsx`'s shape and its reasoning, because it is the same
 * gate on a second control. Read that file for why `isDevPersistenceEnabled()` is the right
 * existing hatch rather than a new flag, including the one-off check of the property against a
 * real production bundle: the endpoint is a string literal there, so `isServerBacked(true)` is
 * unconditionally true, the gate is unconditionally false, and a gated component returns null on
 * its first render and every render after it.
 *
 * ## WHY IT MATTERS MORE HERE THAN IT LOOKS
 *
 * This control's whole function is to make a once-only surface play again, so a learner who could
 * reach it could be re-taught the tutorial on every visit. That is the opposite of the
 * requirement it was built beside.
 */

function emptyLoad(): Promise<CityLoad> {
  return Promise.resolve({ node_states: MOCK_NODE_STATES, placements: [] });
}

/** What `docs/Deployment.md` bakes into the shipped SPA. */
const DEPLOYED_API = "https://calc-readiness.example/api/diagnostic";

beforeEach(() => {
  localStorage.clear();
  // A returning learner, so the tutorial itself is not up and the only thing being looked for is
  // the control. It is also the state the control exists FOR.
  localStorage.setItem(ONBOARDING_ADVISOR_DONE_KEY, "true");
});

afterEach(() => {
  vi.unstubAllEnvs();
  localStorage.clear();
});

describe("the gate this control hangs on", () => {
  /**
   * THE PREMISE, measured rather than assumed. Without this, "the control is absent" and "the
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

describe("the city surface", () => {
  /**
   * BOTH ENVIRONMENTS, and the pair is the point.
   *
   * The replay control used to be mounted locally even though the city already has a learner-facing
   * “Ask me again” entry. It must now be absent from both the deployed and local city surfaces:
   * no local-only control may reset onboarding state.
   */
  it("does not expose onboarding replay controls in either deployed or local environments", async () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", DEPLOYED_API);
    const deployed = render(
      <CitySurface enableCanvas={false} enableOnboardingDemo loadCity={emptyLoad} />,
    );
    await screen.findByRole("button", { name: "Build" });
    expect(
      deployed.queryByTestId("ob-dev-replay"),
      "the onboarding replay control is on the surface a real learner is served",
    ).toBeNull();
    // Every handle it could be found by, because a control renamed out of one is still shipped.
    expect(document.querySelector(".ob-replay")).toBeNull();
    expect(deployed.queryByText(/Replay onboarding/i)).toBeNull();
    expect(deployed.queryByText(/Dev only/i)).toBeNull();
    deployed.unmount();

    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
    const local = render(
      <CitySurface enableCanvas={false} enableOnboardingDemo loadCity={emptyLoad} />,
    );
    await screen.findByRole("button", { name: "Build" });
    expect(
      local.queryByTestId("ob-dev-replay"),
      "the local city still exposes a button that can reset onboarding",
    ).toBeNull();
    expect(document.querySelector(".ob-replay")).toBeNull();
    expect(local.queryByText(/Replay onboarding/i)).toBeNull();
    expect(local.queryByText(/Dev only/i)).toBeNull();
  });
});
