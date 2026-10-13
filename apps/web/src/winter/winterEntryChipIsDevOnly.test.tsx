import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isServerBacked } from "../api";
import { CitySurface } from "../city/CitySurface";
import { createCityDevSession } from "../city/citySession";
import { isDevPersistenceEnabled } from "../devPersistence/devSession";
import { faceTheWinter } from "../test/faceTheWinter";
import { WinterEntryChip } from "./WinterEntryChip";

/**
 * **THE ☰ MENU'S HARD WINTER CHIP IS DEV ONLY, AND THE CRISIS IS STILL REACHABLE WITHOUT IT.**
 *
 * ## The ruling this exists for
 *
 * **D-CRISIS-35** (the team lead, 2026-07-31): a player who is given a crisis call and does not
 * enter it has their CITY FROZEN — no building, no roads, no purchases — while lessons and practice
 * continue. The freeze is what creates the pressure to engage, and an ungated entry chip dissolved
 * it: a player who can open the crisis whenever they like is never a player sitting on a standing
 * call, so the state the freeze exists to make uncomfortable was not reachable. **The chip is kept
 * and gated rather than deleted**, because it is how the lead and QA reach the crisis at all.
 *
 * ## "It is behind a gate" and "the gate works" are two claims, and this file is the second
 *
 * Nothing here reads the component's source or asserts that a helper is called. Every assertion
 * DRIVES the predicate, in both directions, through the real environment — `vi.stubEnv` on
 * `VITE_DIAGNOSTIC_API_URL`, which is the read Vite inlines at build time. A gate asserted in one
 * direction only is satisfied by a chip that was deleted, renamed, or never rendered at all, and
 * the pairing below is what rules those out.
 *
 * ## Which gate, and the two precedents that disagree
 *
 * `isDevPersistenceEnabled()` — `!isServerBacked(true)`, i.e. `VITE_DIAGNOSTIC_API_URL` unset. The
 * argument is on `WinterEntryChip.tsx` and is summarised here because this is where it is measured:
 *
 *  - **`WinterDevSkip.tsx` uses this gate**, and it lives INSIDE the surface the chip opens. Two
 *    definitions of "dev" across one feature come apart on a preview deployment, where
 *    `import.meta.env.DEV` is already `false`: the entry would be compiled away while the skip
 *    control behind it still rendered.
 *  - **`audio/audioPrefs.ts` chose `import.meta.env.DEV`** and rejected a `?dev` query parameter.
 *    Its objection was to the PARAMETER, and that objection is shared rather than overruled —
 *    `?winter` is the local proof, a route whose comment says *"DEV ONLY"* while `App.tsx` reads
 *    `has("winter")` with no environment test beside it.
 *  - **What decides between the two environment signals is who has to keep reaching the crisis.**
 *    `import.meta.env.DEV` is the literal `false` in every `vite build` output, preview builds
 *    included, so gating the only entry on it would confine QA to a local dev server. This gate is
 *    false exactly when the SPA talks to the account service, which `docs/Deployment.md` bakes into
 *    the shipped build and a preview build leaves unset.
 *
 * ## The fourth test is the one that keeps this honest
 *
 * A gate that made the crisis unreachable would pass the first three. So the last one seeds a
 * standing call on a DEPLOYED build and walks the game's own advisor into the encounter, which is
 * the whole point of the ruling: what was removed is the shortcut, not the crisis.
 */

/** What `docs/Deployment.md` bakes into the shipped SPA. */
const DEPLOYED_API = "https://calc-readiness.example/api/diagnostic";

/** The city as `App.tsx` mounts it for a local session, dev stand-ins included. */
function renderCity(session: ReturnType<typeof createCityDevSession>) {
  return render(
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
}

/** Open the ☰ Menu and hand back the "Other places" row the chip belongs to. */
async function openOtherPlaces(
  user: ReturnType<typeof userEvent.setup>,
): Promise<HTMLElement> {
  await screen.findByRole("button", { name: "Build" });
  await user.click(screen.getByRole("button", { name: "Menu" }));
  return screen.getByRole("navigation", { name: "Other places" });
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  localStorage.clear();
});

describe("the gate the winter's entry chip hangs on", () => {
  /**
   * THE PREMISE, measured rather than assumed. Everything below turns on this predicate, so its
   * two answers are established first: without it, "the chip is absent" and "the environment stub
   * did nothing" are the same observation.
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

describe("the Hard Winter chip on a deployed build", () => {
  /**
   * THE COMPONENT, both directions. Rendered with no props, which is the navigating form, so this
   * covers the shape every mount other than `CitySurface` uses as well.
   */
  it("renders nothing with an API endpoint configured and a link without one", () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", DEPLOYED_API);
    const deployed = render(<WinterEntryChip />);
    expect(
      deployed.queryByRole("link", { name: /Hard Winter/i }),
      "the winter entry chip is on the surface a real learner is served",
    ).toBeNull();
    // Nothing at all, rather than an empty element that still occupies the menu row.
    expect(deployed.container).toBeEmptyDOMElement();
    deployed.unmount();

    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
    const local = render(<WinterEntryChip />);
    expect(
      local.queryByRole("link", { name: /Hard Winter/i }),
      "the chip is missing from a local build, so the assertion above proves nothing",
    ).not.toBeNull();
  });

  /**
   * AND THROUGH THE ☰ MENU, which is the mount the ruling is about.
   *
   * The row's other three chips are asserted present in BOTH directions, so the winter chip's
   * absence is an absence from a rendered menu rather than a menu that failed to open.
   */
  it("is absent from the ☰ Menu with an endpoint and present without one", async () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", DEPLOYED_API);
    const user = userEvent.setup();
    const deployed = renderCity(createCityDevSession());

    const others = await openOtherPlaces(user);
    expect(
      within(others).queryByRole("button", { name: /Hard Winter/i }),
      "a learner can still pick the crisis off the menu, which is what D-CRISIS-35 forbids",
    ).toBeNull();
    // The row really rendered, so the absence above is about a menu somebody is looking at.
    expect(within(others).getByRole("button", { name: /Diagnostic/i })).toBeVisible();
    expect(within(others).getByRole("button", { name: /Lessons/i })).toBeVisible();
    // Checker Lab used to be the third witness here, and it has joined the winter chip on the
    // other side of the same gate instead. It is a development fixture whose own copy says so,
    // and it was in this row on a learner's build until 2026-08-08; `EntryLauncher` now carries
    // the same `isDevPersistenceEnabled()` gate for it. Kept as an assertion rather than
    // deleted, because the two surfaces above are enough to prove the row rendered and this
    // line now proves something the file did not use to check.
    expect(within(others).queryByRole("button", { name: /Checker Lab/i })).toBeNull();
    // No link form hiding in the row either, and no snowflake left behind by a chip that
    // rendered its label but not its role.
    expect(within(others).queryByRole("link", { name: /Hard Winter/i })).toBeNull();
    expect(within(others).queryByText(/Hard Winter/i)).toBeNull();
    deployed.unmount();

    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
    renderCity(createCityDevSession());
    const localOthers = await openOtherPlaces(user);
    const chip = within(localOthers).queryByRole("button", { name: /Hard Winter/i });
    expect(
      chip,
      "the chip is gone from a local build too, so the assertions above prove nothing",
    ).not.toBeNull();
    // And the same the other way for Checker Lab, so its absence above is a gate rather than a
    // deletion — a chip that was simply removed would pass the line above and fail this one.
    expect(
      within(localOthers).queryByRole("button", { name: /Checker Lab/i }),
      "Checker Lab is gone from a local build too, so it was deleted rather than gated",
    ).not.toBeNull();
    // And it is the working control rather than a labelled stub: pressing it raises the
    // advisor, which is what makes it usable for the QA the ruling keeps it for.
    await user.click(chip as HTMLElement);
    expect(await screen.findByTestId("crisis-call-advisor")).toBeVisible();
  });

  /**
   * WHAT WAS REMOVED IS THE SHORTCUT, NOT THE CRISIS.
   *
   * D-CRISIS-35 freezes the city of a player who has a standing call, which is only coherent if
   * that player can still get in. So this seeds the call on a DEPLOYED build — no chip anywhere —
   * and walks the game's own advisor to the board.
   */
  it("leaves the game's own call able to reach the encounter without it", async () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", DEPLOYED_API);
    const user = userEvent.setup();
    const session = createCityDevSession();
    renderCity(session);

    const others = await openOtherPlaces(user);
    expect(within(others).queryByRole("button", { name: /Hard Winter/i })).toBeNull();

    // Seed the state the call fires from, then clear the unlock moment that legitimately lands
    // in front of it: D-CRISIS-10 holds the crisis behind whatever got there first.
    await user.click(screen.getByTestId("dev-seed-crisis"));
    const unlocked = await waitFor(() => {
      const popup = document.querySelector<HTMLElement>(".building-unlocked");
      if (!popup) {
        throw new Error("the unlock popup never opened");
      }
      return popup;
    });
    await user.click(within(unlocked).getByRole("button", { name: "Close" }));

    // The advisor arrives by itself, and "Face the winter" reaches the board.
    const advisor = await screen.findByTestId("crisis-call-advisor");
    expect(advisor).toHaveAccessibleName("The Hard Winter");
    await faceTheWinter(user);
    expect(await screen.findByTestId("winter-in-city")).toBeVisible();
  });
});
