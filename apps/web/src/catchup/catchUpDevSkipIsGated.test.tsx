import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CitySurface } from "../city/CitySurface";
import { createCityDevSession } from "../city/citySession";
import { isDevEraSkipEnabled } from "../city/eraSkipGuard";
import { CatchUpDevSkip } from "./CatchUpDevSkip";

/**
 * **THE CATCH-UP'S DEV HATCH IS NOT ON THE SHIPPED SURFACE, AND THE GATE IS THE REPO'S OWN.**
 *
 * *"It is behind a flag"* and *"the flag works"* are two claims, and this file is the first
 * one. `winterDevSkipIsGated.test.tsx`'s discipline, applied to a different gate, and the
 * difference is the interesting part.
 *
 * ## WHICH GATE, AND WHY IT IS `DevEraSkip`'s RATHER THAN `WinterDevSkip`'s
 *
 * {@link isDevEraSkipEnabled} — `env.DEV && env.MODE !== "test"`. `eraSkipGuard.ts` gives the
 * reason in its own words: Vitest reports `DEV` too, *"and the suite has to keep asserting what
 * a LEARNER sees — a dev control that rendered under Vitest would put two more buttons in every
 * menu assertion in `CitySurface.test.tsx`."* This control mounts inside `CitySurface`, so that
 * is exactly the hazard, where the winter's mounts inside a surface no learner-facing assertion
 * counts buttons on.
 *
 * **The consequence for this file is that the DEFAULT is off here**, which inverts
 * `winterDevSkipIsGated`'s shape: there the local build shows the control and the deployed one
 * hides it, and both are reachable by stubbing one variable. Here `MODE` is `"test"` under
 * Vitest whatever is stubbed, so the second direction is driven by stubbing `MODE` itself. Both
 * directions are asserted, because *"absent when gated"* passes trivially for a control that
 * was deleted, never mounted, or mounted under a different name.
 *
 * ## AND THE PRODUCTION BUILD DOES NOT SHIP THE CODE AT ALL
 *
 * The call site in `CitySurface.tsx` is a literal `import.meta.env.DEV &&`, which Vite replaces
 * statically, so a production build folds the branch away and the module is tree-shaken out.
 * That is `EraAdvanceDoor.tsx`'s second layer and `output/era-skip-prod-guard-check.mjs` is the
 * artefact check for it. The two layers are independent on purpose: this file is the first,
 * which stops the control appearing where the code is present.
 */

const DEPLOYED_API = "https://calc-readiness.example/api/diagnostic";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  localStorage.clear();
});

describe("the gate this control hangs on", () => {
  it("is off under Vitest and off on a production build, and on in a dev browser", () => {
    // THE PREMISE, measured rather than assumed. Without it "the control is absent" and "the
    // environment stub did nothing" are indistinguishable.
    expect(isDevEraSkipEnabled({ DEV: true, MODE: "test" })).toBe(false);
    expect(isDevEraSkipEnabled({ DEV: false, MODE: "production" })).toBe(false);
    expect(isDevEraSkipEnabled({ DEV: true, MODE: "development" })).toBe(true);
  });

  it("does not read the API endpoint, so a deployed local build cannot switch it on", () => {
    // The winter's control keys on `VITE_DIAGNOSTIC_API_URL`; this one deliberately does not,
    // and the assertion says so rather than the docblock alone: stubbing the endpoint either
    // way leaves this gate exactly where `MODE` put it.
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", DEPLOYED_API);
    expect(isDevEraSkipEnabled({ DEV: true, MODE: "development" })).toBe(true);
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
    expect(isDevEraSkipEnabled({ DEV: true, MODE: "test" })).toBe(false);
  });
});

describe("the control itself", () => {
  it("renders nothing when gated and a usable panel when not", () => {
    // BOTH DIRECTIONS, and the pair is the point. The `enabled` prop is driven here rather than
    // the environment, because this is a claim about the component; the claim about the DEFAULT
    // is the CitySurface test below, which passes no prop at all.
    const gated = render(<CatchUpDevSkip onEnter={() => undefined} enabled={false} />);
    expect(gated.queryByTestId("catchup-dev-skip")).toBeNull();
    gated.unmount();

    const open = render(<CatchUpDevSkip onEnter={() => undefined} enabled />);
    expect(open.getByTestId("catchup-dev-skip")).toBeInTheDocument();
    // A usable control rather than an empty shell: an era to place at, and a position to
    // enter at, are the two presses it exists for.
    expect(open.getByTestId("catchup-dev-skip-era-medieval")).toBeInTheDocument();
    expect(open.getByTestId("catchup-dev-skip-at-0")).toBeInTheDocument();
  });

  it("REFUSES a placement that hands nothing over, before the press rather than after", () => {
    // Era one hands nothing over, which is a real state and the ordinary answer at today's
    // D1-only diagnostic scope. A control that entered a walk with an empty plan would put a
    // blank surface over the island.
    //
    // It declines by DISABLING the row and saying so in the legend, which is better than
    // declining on the press: `winterDevSkip.css`'s own note is that four dim buttons with no
    // legend leave a reviewer guessing why the control is inert.
    const entered: unknown[] = [];
    const panel = render(
      <CatchUpDevSkip onEnter={(input) => entered.push(input)} enabled />,
    );
    fireEvent.click(panel.getByTestId("catchup-dev-skip-era-prehistoric"));
    const entry = panel.getByTestId("catchup-dev-skip-at-0");
    expect(entry).toBeDisabled();
    expect(panel.getByText(/hands nothing over/i)).toBeInTheDocument();
    fireEvent.click(entry);
    expect(entered).toEqual([]);

    // And it comes back: picking an age that DOES hand something over re-enables the row, so
    // the refusal above is about the placement rather than about a control that never works.
    fireEvent.click(panel.getByTestId("catchup-dev-skip-era-neolithic"));
    expect(panel.getByTestId("catchup-dev-skip-at-0")).not.toBeDisabled();
    fireEvent.click(panel.getByTestId("catchup-dev-skip-at-0"));
    expect(entered).toHaveLength(1);
  });

  it("hands out a placement seed and a position, which is what makes the demo repeatable", () => {
    const entered: {
      placementByNode: Readonly<Record<string, number>>;
      startAt: number;
    }[] = [];
    const panel = render(
      <CatchUpDevSkip onEnter={(input) => entered.push(input)} enabled />,
    );
    fireEvent.click(panel.getByTestId("catchup-dev-skip-era-medieval"));
    fireEvent.click(panel.getByTestId("catchup-dev-skip-at-2"));

    expect(entered).toHaveLength(1);
    expect(entered[0]?.startAt).toBe(2);
    // A REAL placement seed rather than a plan: every one of the four handed ages' nodes is in
    // it at the pass bar, so the era decision under a dev jump is the same conjunction over the
    // same evidence as under a real pretest.
    expect(Object.keys(entered[0]?.placementByNode ?? {})).toHaveLength(21);
    expect(new Set(Object.values(entered[0]?.placementByNode ?? {}))).toEqual(new Set([2]));

    // SEEDABLE: the same two presses again give byte-identical input, which is what "the demo
    // shows the same thing twice" needs.
    fireEvent.click(panel.getByTestId("catchup-dev-skip-at-2"));
    expect(entered[1]).toEqual(entered[0]);
  });
});

describe("on the city a learner is served", () => {
  it("does not expose the catch-up entry control even in a local development environment", async () => {
    // The component's old gate hid this in Vitest by default, which did not prove what a developer
    // saw at localhost. Drive the same environment a local Vite server supplies.
    vi.stubEnv("MODE", "development");
    const session = createCityDevSession();
    render(
      <CitySurface
        enableCanvas={false}
        reducedMotion
        loadCity={session.load}
        onMoveTownHall={session.moveTownHall}
        onPlaceSkill={session.placeSkill}
        onMoveSkill={session.moveSkill}
        onOpenSurface={() => undefined}
      />,
    );
    // The surface is really up, so the absences below are absences rather than a blank mount.
    expect(await screen.findByRole("button", { name: "Build" })).toBeInTheDocument();

    expect(screen.queryByTestId("catchup-dev-skip")).toBeNull();
    // Every handle it could be found by, because a control renamed out of one is still shipped.
    expect(document.querySelector(".catchup-skip")).toBeNull();
    expect(screen.queryByText(/Enter the catch-up/i)).toBeNull();
    /*
     * THE EYEBROW BY ITS OWN CLASS, AND NOT BY A TEXT SWEEP OF THE WHOLE SURFACE.
     *
     * *"Dev only, not on the learner build"* is the HOUSE eyebrow: `WinterDevSkip`,
     * `OnboardingDevReplay` and this control all print the same sentence, deliberately, because it
     * is the same promise. A `queryByText(/Dev only/i)` over the document was therefore never a
     * claim about the catch-up panel — it went red the moment a second, correctly gated dev control
     * appeared anywhere on the city surface, which `OnboardingDevReplay` did.
     *
     * Scoping it to `.catchup-skip__eyebrow` keeps what the line was written for — a panel renamed
     * out of its test id or its class is still caught by its own copy — and it is measured rather
     * than argued: with the three handles above removed and `<CatchUpDevSkip enabled />` rendered
     * into this surface, THIS line fails on its own, at *"expected <p
     * class="catchup-skip__eyebrow"></p> to be null"*. The eyebrow is inside the panel's own
     * stylesheet namespace, so it cannot be renamed out from under this.
     */
    expect(document.querySelector(".catchup-skip__eyebrow")).toBeNull();
  });

  it("mounts no catch-up at all when no placement was handed over", async () => {
    // The other half of "a learner's city is unchanged": the walk itself is absent, not just
    // the dev hatch. `pretestPlacement` is undefined here, which is every existing test
    // in the tree, so this is the assertion that none of them changed.
    const session = createCityDevSession();
    render(
      <CitySurface
        enableCanvas={false}
        reducedMotion
        loadCity={session.load}
        onMoveTownHall={session.moveTownHall}
        onPlaceSkill={session.placeSkill}
        onOpenSurface={() => undefined}
      />,
    );
    expect(await screen.findByRole("button", { name: "Build" })).toBeInTheDocument();
    expect(screen.queryByTestId("catchup-prompt")).toBeNull();
    expect(screen.queryByTestId("catchup-founding")).toBeNull();
    expect(screen.queryByTestId("catchup-stopped")).toBeNull();
  });

  it("MOUNTS the walk when a placement hands ages over, so the test above proves something", async () => {
    // The both-directions half. Without it, "no catch-up on a plain city" is satisfied by a
    // feature that never mounts anywhere.
    const session = createCityDevSession();
    render(
      <CitySurface
        enableCanvas={false}
        reducedMotion
        loadCity={session.load}
        onMoveTownHall={session.moveTownHall}
        onPlaceSkill={session.placeSkill}
        onOpenSurface={() => undefined}
        pretestPlacement={{
          "NUM.S": 2,
          "NUM.F": 2,
          "NUM.2": 2,
          "NUM.3": 2,
          "NUM.4": 2,
          "NUM.5": 3,
        }}
      />,
    );
    expect(await screen.findByRole("button", { name: "Build" })).toBeInTheDocument();
    // The diagnostic reward stands in front of the walk now that one placement feeds both, and
    // the catch-up yields to it (see `CitySurface`'s `catchUpOpen`). A learner presses through
    // it; so does this.
    fireEvent.click(screen.getByRole("button", { name: "Start building" }));
    const prompt = await screen.findByTestId("catchup-prompt");
    expect(prompt.getAttribute("data-era")).toBe("prehistoric");
    expect(prompt.getAttribute("data-total")).toBe("1");
    expect(screen.getByTestId("catchup-choose-stop_here")).toBeInTheDocument();
  });
});
