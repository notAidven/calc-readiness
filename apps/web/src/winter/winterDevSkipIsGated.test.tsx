import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isServerBacked } from "../api";
import { CitySurface } from "../city/CitySurface";
import { createCityDevSession } from "../city/citySession";
import { isDevPersistenceEnabled } from "../devPersistence/devSession";
import { faceTheWinter } from "../test/faceTheWinter";
import { HardWinterSurface } from "./HardWinterSurface";
import { WINTER_NODE_ORDER } from "./hardWinterItems";

/**
 * **THE DEV SKIP IS NOT ON THE SHIPPED SURFACE, AND THE GATE IS THE REPO'S OWN.**
 *
 * *"It is behind a flag"* and *"the flag works"* are two claims, and this file is the first one.
 * Nothing below passes the component's `enabled` prop: every assertion drives the DEFAULT, through
 * the real environment, so what is measured is what a browser would get.
 *
 * ## WHICH GATE, AND WHY THIS ONE
 *
 * `isDevPersistenceEnabled()`, which is `!isServerBacked(true)` — the dev-persistence gate that
 * already decides whether the browser-side dev session store may touch storage at all. Three
 * properties made it the right existing hatch rather than a new flag:
 *
 *  - **It is exactly "does this browser talk to the account service".** `docs/Deployment.md` bakes
 *    `VITE_DIAGNOSTIC_API_URL=/api/diagnostic` into the shipped SPA, so a real learner's build has
 *    it set, `apiBaseUrl()` is non-null, and the gate is false. That is the condition asserted below
 *    rather than described.
 *  - **Its answer is synchronous from the first frame.** It asks with `hasCognitoAuth = true`, the
 *    STRONGEST auth state, precisely so it never waits for the Cognito identity to resolve. A gate
 *    that resolved late would render this control for a few frames of a real signed-in session,
 *    which for a dev affordance is the whole defect.
 *  - **It errs safe.** An endpoint with a signed-out user still reports disabled.
 *
 * ## READ OUT OF A REAL PRODUCTION BUNDLE, once, because `vi.stubEnv` is a simulation
 *
 * These tests stub `import.meta.env`, which is the same read Vite INLINES at build time — so the
 * simulation is faithful, but it is still a simulation. Checked against the artefact instead, with
 * `VITE_DIAGNOSTIC_API_URL=/api/diagnostic npx vite build` as `docs/Deployment.md` prescribes:
 *
 *   api chunk:         `function e(){return`/api/diagnostic`.replace(/\/diagnostic\/?$/,``)}`
 *                      `function t(t){return t&&e()!==null}`
 *   devSession chunk:  `function g(){return!e(!0)}`
 *   surface chunk:     `function Ce({winter:e,pending:t,onSkipped:n,enabled:r=oe()}){...if(!r`
 *
 * The endpoint is a STRING LITERAL in the bundle, so `apiBaseUrl()` has no path that returns null,
 * `isServerBacked(true)` is unconditionally true, the gate is unconditionally false, and the
 * component returns null on its first render and every render after it. That is a static property
 * of the shipped artefact rather than a runtime coincidence.
 *
 * The build is NOT run from here: a test that shells out to `vite build` would be slow, would need
 * the artefact on disk, and would be measuring the bundler. What the suite holds is the behaviour;
 * the paragraph above is the one-off check of the thing the behaviour is a proxy for.
 *
 * ## WHY NOT `?winter`
 *
 * Because `?winter` is not a gate for this purpose in either direction. It does not keep a learner
 * out — `App.tsx` checks the query parameter with no `import.meta.env.DEV` beside it, unlike
 * `?mock` — and it would keep the control off the mount it exists for, since the frost, the
 * building damage and the outcome screen are wanted over the 3D island, which is the IN-CITY mount.
 * That mount is what the second test below walks to, through the doors a player uses.
 *
 * This paragraph used to name `?dev` beside `?mock` as a guarded route. Re-measured while
 * `WinterEntryChip` was gated: `isMockPreview()` is the ONLY query check in `App.tsx` with
 * `import.meta.env.DEV` beside it, and `?dev`, `?graph`, `?three`, `?interactive` and `?winter` are
 * all bare `has(...)` reads. The conclusion is unchanged and one example fewer supports it.
 */

/** The learner the surface plays as, so the mount reaches a board rather than a refusal. */
const allPractised = (): readonly string[] => WINTER_NODE_ORDER;

/** What `docs/Deployment.md` bakes into the shipped SPA. */
const DEPLOYED_API = "https://calc-readiness.example/api/diagnostic";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  localStorage.clear();
});

describe("the gate this control hangs on", () => {
  /**
   * THE PREMISE, measured rather than assumed. Everything below is about a predicate, so the
   * predicate's two answers are established first: without this, "the control is absent" and "the
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

describe("the skip control on a deployed build", () => {
  /**
   * BOTH DIRECTIONS, and the pair is the point.
   *
   * "Absent when the endpoint is configured" passes trivially for a control that was deleted, never
   * mounted, or mounted under a different name; "present when it is not" is what rules all three
   * out. Either assertion alone is satisfied by a component that has stopped reading the gate.
   */
  it("is absent with an API endpoint configured and present without one", async () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", DEPLOYED_API);
    const deployed = render(<HardWinterSurface readMasteredNodes={allPractised} />);
    expect(
      deployed.queryByTestId("hw-dev-skip"),
      "the dev skip control is on the surface a real learner is served",
    ).toBeNull();
    // The surface itself really rendered, so the absence above is an absence and not a blank mount.
    expect(
      deployed.getByRole("button", { name: /Reinforce a building/i }),
    ).toBeInTheDocument();
    deployed.unmount();

    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
    const local = render(<HardWinterSurface readMasteredNodes={allPractised} />);
    expect(
      local.queryByTestId("hw-dev-skip"),
      "the dev skip control is missing from a local build, so the test above proves nothing",
    ).not.toBeNull();
    // And it is a usable control rather than an empty shell: the ladder is what a press needs.
    expect(local.getByTestId("hw-dev-skip-resolve-strong")).toBeInTheDocument();
    expect(local.getByTestId("hw-dev-skip-runout-strong")).toBeInTheDocument();
  });

  /**
   * AND THE SAME THING THROUGH THE DOOR A LEARNER ACTUALLY USES.
   *
   * The test above mounts the winter's surface directly, which is a claim about a component. This
   * one walks the game's own crisis call, the advisor and "Face the winter" into the in-city mount,
   * which is the crisis a learner reaches — and it is the mount that matters most, because it is
   * the one nothing else gates: `?winter` is a query parameter anybody can type.
   *
   * ## WHY THIS NO LONGER WALKS THE ☰ MENU, and why that STRENGTHENS the claim
   *
   * It used to press the menu's Hard Winter chip, on the reasoning that the chip was *"deliberately
   * reachable below the crisis's own trigger"*. That was true when it was written and is now false
   * by ruling: **D-CRISIS-35 freezes the city of a player who does not enter a standing call**, and
   * an entry chip anybody could press at any time dissolved the freeze, so `WinterEntryChip` is
   * gated on the same `isDevPersistenceEnabled()` this file is about.
   *
   * So the old route could not survive here in either sense. Mechanically it is gone: with the
   * endpoint stubbed the chip renders nothing, which is the gate above doing its job. And it was
   * the wrong route for this test's own sentence — the chip is now the door a DEVELOPER uses, and
   * the door a LEARNER uses is the call the game raises by itself. The assertions below are
   * untouched; only the walk to them changed, and it changed toward the thing the title claims.
   */
  it("never appears in the crisis a learner walks into", async () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", DEPLOYED_API);
    const user = userEvent.setup();
    const session = createCityDevSession();

    render(
      <CitySurface
        enableCanvas={false}
        reducedMotion
        loadCity={session.load}
        onMoveTownHall={session.moveTownHall}
        onPlaceSkill={session.placeSkill}
        onMoveSkill={session.moveSkill}
        onDevAdvanceMastery={session.advanceMasteryDev}
        onDevLessonTaught={session.markLessonTaught}
        onDevSetStage={session.setStageDev}
        onOpenSurface={() => undefined}
      />,
    );

    await screen.findByRole("button", { name: "Build" });
    // Seed the state the call fires from, then clear the unlock moment that legitimately lands
    // in front of it (D-CRISIS-10 holds the crisis behind whatever got there first), exactly as
    // `city/crisisEntrySequence.test.tsx` does. The seed control is reachable here because this
    // mount passes the dev props directly. `App.tsx` supplies them only where
    // `isDevPersistenceEnabled()` is true — the same deployment-shape gate this file stubs the
    // endpoint to switch OFF, so on the real composition root these props would be absent in
    // exactly the environment asserted below. This comment cited the auth state until #373
    // re-keyed those props; see `city/devControlsAreNotAuthGated.test.tsx` for why auth stopped
    // being a usable proxy for "not a real learner".
    await user.click(screen.getByRole("button", { name: "Menu" }));
    await user.click(screen.getByTestId("dev-seed-crisis"));
    const unlocked = await waitFor(() => {
      const popup = document.querySelector<HTMLElement>(".building-unlocked");
      if (!popup) {
        throw new Error("the unlock popup never opened");
      }
      return popup;
    });
    await user.click(within(unlocked).getByRole("button", { name: "Close" }));
    // THE PRODUCTION PATH: the game calls the crisis and the advisor comes up by itself.
    await screen.findByTestId("crisis-call-advisor");
    await faceTheWinter(user);
    await screen.findByTestId("winter-in-city");
    // The encounter is really up and really playable, so the absence below is about a screen a
    // learner is looking at rather than about a mount that failed.
    expect(
      await screen.findByRole("button", { name: /Reinforce a building/i }),
    ).toBeVisible();

    expect(screen.queryByTestId("hw-dev-skip")).toBeNull();
    // Every handle it could be found by, because a control renamed out of one is still shipped.
    expect(document.querySelector(".hw-skip")).toBeNull();
    expect(screen.queryByText(/Skip the questions/i)).toBeNull();
    expect(screen.queryByText(/Dev only/i)).toBeNull();

    // Declaring and committing does not conjure it either: the per-round row is the one that comes
    // alive in the answering phase, which is the state a learner spends the most time in.
    // A reinforce needs a target where the pull-back this replaced needed none, so the building is
    // picked by its own `data-node` rather than by a coordinate: this runs over whatever board the
    // encounter deals.
    await user.click(screen.getByRole("button", { name: /Reinforce a building/i }));
    const anyBuilding = document.querySelector<HTMLElement>(".hw-grid [data-node]");
    if (anyBuilding === null) {
      throw new Error("no building is on the grid, so nothing can be reinforced");
    }
    await user.click(anyBuilding);
    await user.click(screen.getByRole("button", { name: /Commit and face 3 questions/i }));
    await screen.findByRole("heading", { name: /^Question 1 of 3$/ });
    expect(screen.queryByTestId("hw-dev-skip")).toBeNull();
    expect(document.querySelector(".hw-skip")).toBeNull();
  });
});
