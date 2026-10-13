import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CitySurface } from "./CitySurface";
import { createCityDevSession } from "./citySession";
import { d1LessonHost } from "./d1LessonHost";
import type { LessonHost } from "./lessonHost";

/**
 * **THE LESSON'S OWN WRITE-BACKS MUST NOT RIDE ON THE DEVELOPER STAND-IN PROPS.**
 *
 * `onLessonTaught` (CFU passed) and the practice-completion callback were delivered as
 * `onDevLessonTaught` and `onDevAdvanceMastery`, and `App.tsx` withholds those whenever
 * `isDevPersistenceEnabled()` is false — which is to say whenever `VITE_DIAGNOSTIC_API_URL`
 * is configured. So the two signals were withheld from exactly the deployments that have
 * somewhere to write to: a signed-in learner passed the check, the building stayed at
 * Foundation, the "Continue construction" callout never appeared, and the practice set (and
 * with it the work checker behind it) could not be opened at all. Reported from a real
 * localhost session against the sandbox, not inferred.
 *
 * `devControlsAreNotAuthGated.test.tsx` is this file's sibling and guards the other
 * direction — that the stand-ins stay OFFERED to the team. Neither implies the other, which
 * is why the props are now separate and why the census below is a set equality rather than a
 * pair of one-way checks: the defect is a prop landing on the wrong side of one predicate,
 * and both sides of that line have to be pinned or a prop can cross it unnoticed.
 *
 * ## Two claims, because they fail independently
 *
 * 1. **A surface mounted the way account mode mounts it — the real progression props, and no
 *    dev props at all — still advances the building.** Rendered through the menu a learner
 *    taps, with the negative control beside it, since "practice is enabled" is worth nothing
 *    from a mount where it was never disabled.
 * 2. **`App.tsx` gates the three `onDev…` props on `devControlsEnabled` and gates nothing
 *    else on it.** Derived from the element rather than written down, so a fourth callback
 *    added to the wrong side of the predicate is inside this sweep the day it is passed.
 */

/**
 * A host that finishes the lesson exactly as `AdvisorLesson` does at CFU-pass: fire the
 * Construction signal, then end the lesson. No teaching or CFU navigation, because the
 * subject here is the prop the signal travels on and not the lesson that sends it.
 */
const FINISH_HOST: LessonHost = {
  render: (ctx) => (
    <div role="dialog" aria-label="lesson">
      <button
        type="button"
        onClick={() => {
          ctx.onLessonTaught?.();
          ctx.onFinishLesson?.();
        }}
      >
        Finish lesson (test)
      </button>
    </div>
  ),
};

/**
 * Mount the surface as a SERVER-BACKED deployment mounts it: no `onDev…` prop of any kind,
 * so the Developer panel is genuinely absent, and the real progression pair supplied or
 * withheld as the case under test requires.
 */
async function renderAccountModeCity(
  progressionWired: boolean,
  host: LessonHost = FINISH_HOST,
) {
  const session = createCityDevSession();
  await session.placeSkill("NUM.3", { col: 2, row: 0, rot: 0 });
  render(
    <CitySurface
      enableCanvas={false}
      reducedMotion
      loadCity={session.load}
      lessonHost={host}
      {...(progressionWired
        ? {
            onLessonTaught: session.markLessonTaught,
            onPracticeComplete: session.advanceMasteryDev,
          }
        : {})}
    />,
  );
  return session;
}

type User = ReturnType<typeof userEvent.setup>;

async function openBuiltShelf(user: User): Promise<void> {
  await user.click(await screen.findByRole("button", { name: "Build" }));
  const shop = await screen.findByRole("dialog", { name: /Choose a skill to build/ });
  const built = within(shop).getByRole("button", { name: /^Built \d+\/\d+$/ });
  if (built.getAttribute("aria-expanded") !== "true") {
    await user.click(built);
  }
}

function plotButton(nodeId: string): HTMLElement {
  const button = document.querySelector<HTMLElement>(
    `button.city-plot[data-node-id="${nodeId}"]`,
  );
  if (!button) {
    throw new Error(`No roster button rendered for ${nodeId}`);
  }
  return button;
}

/** Open NUM.3's callout, run the lesson to CFU-pass, and hand back the reopened callout. */
async function finishLessonAndReopenCallout(user: User): Promise<HTMLElement> {
  await openBuiltShelf(user);
  await user.click(plotButton("NUM.3"));
  const callout = await screen.findByRole("dialog");
  await user.click(within(callout).getByRole("button", { name: /start lesson/i }));
  await user.click(await screen.findByRole("button", { name: /finish lesson \(test\)/i }));
  return screen.findByRole("dialog");
}

describe("a learner's lesson progresses on a surface with no developer controls", () => {
  it("offers no Developer panel at this mount, so the case is the deployed shape", async () => {
    // The premise the other two cases rest on. Without it, both could be passing on a mount
    // that quietly still has the stand-ins, which is the state this file exists to rule out.
    const user = userEvent.setup();
    await renderAccountModeCity(true);
    await screen.findByRole("button", { name: "Build" });
    await user.click(screen.getByRole("button", { name: "Menu" }));

    expect(screen.queryByRole("heading", { name: /Simulate lessons/ })).toBeNull();
    expect(screen.queryByTestId("dev-seed-crisis")).toBeNull();
  });

  it("advances to Construction and unlocks the practice set", async () => {
    const user = userEvent.setup();
    await renderAccountModeCity(true);
    const callout = await finishLessonAndReopenCallout(user);

    expect(within(callout).getByRole("button", { name: /Practice set/ })).toBeEnabled();
    expect(
      within(callout).getByRole("button", { name: /Infinite practice/ }),
    ).toBeEnabled();
  });

  it("keeps the lesson open until its promised progression write and refresh settle", async () => {
    let settleWrite: () => void = () => {
      throw new Error("the progression write was never started");
    };
    const write = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          settleWrite = resolve;
        }),
    );
    const awaitingHost: LessonHost = {
      render: (ctx) => (
        <div role="dialog" aria-label="lesson">
          <button
            type="button"
            onClick={() => {
              void (async () => {
                await ctx.onLessonTaught?.();
                ctx.onExit();
              })();
            }}
          >
            Finish after save (test)
          </button>
        </div>
      ),
    };
    const session = createCityDevSession();
    await session.placeSkill("NUM.3", { col: 2, row: 0, rot: 0 });
    render(
      <CitySurface
        enableCanvas={false}
        reducedMotion
        loadCity={session.load}
        lessonHost={awaitingHost}
        onLessonTaught={write}
      />,
    );
    const user = userEvent.setup();
    await openBuiltShelf(user);
    await user.click(plotButton("NUM.3"));
    const callout = await screen.findByRole("dialog");
    await user.click(within(callout).getByRole("button", { name: /start lesson/i }));
    await user.click(screen.getByRole("button", { name: "Finish after save (test)" }));

    expect(write).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog", { name: "lesson" })).toBeInTheDocument();
    settleWrite();
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "lesson" })).toBeNull(),
    );
    expect(screen.getByTestId("city-live-polite")).toHaveTextContent(
      /under construction now/i,
    );
  });

  it("offers the learner no developer skip inside the lesson it opens", async () => {
    /*
     * **THE COST OF UN-GATING, AND THE REASON THIS CASE IS HERE RATHER THAN IN THE HEADER.**
     *
     * `d1LessonHost` decides whether to offer *"Simulate completing this lesson (dev only)"*
     * and *"Skip to check (dev only)"* by asking whether a completion callback was supplied,
     * which was a sound proxy only while the dev panel was the sole supplier. Passing the
     * learner's own practice result — the whole point of the fix above — made it true for
     * everybody, so a signed-in learner opened a real lesson with a button offering to skip
     * it. That shipped past every assertion in this file and was caught in a screenshot; the
     * real host is mounted here so it cannot be caught that way twice.
     */
    const user = userEvent.setup();
    await renderAccountModeCity(true, d1LessonHost);
    await openBuiltShelf(user);
    await user.click(plotButton("NUM.3"));
    const callout = await screen.findByRole("dialog");
    await user.click(within(callout).getByRole("button", { name: /start lesson/i }));
    await screen.findByRole("button", { name: /back to city/i });

    // `queryAll`, because the defect offers TWO of these and the singular query answers a
    // "found multiple elements" error rather than the assertion's own message.
    expect(
      screen.queryAllByRole("button", { name: /dev only/i }).map((b) => b.textContent),
    ).toEqual([]);
  });

  it("stays at Foundation without the prop, which is the outage as it was reported", async () => {
    // The negative control, and the shape of the bug: same surface, same lesson, same
    // CFU-pass, and the practice set is unreachable because nothing carried the signal.
    const user = userEvent.setup();
    await renderAccountModeCity(false);
    const callout = await finishLessonAndReopenCallout(user);

    expect(within(callout).getByRole("button", { name: /Practice set/ })).toBeDisabled();
    expect(callout).toHaveTextContent(/Finish the lesson to unlock practice/i);
  });
});

/**
 * `App.tsx` as text. `import.meta.glob` with `?raw` rather than `node:fs`, which is the house
 * style for a source read in this lane and not a preference: the web project has no node
 * types, so a `readFileSync` version does not typecheck.
 */
const SOURCES = import.meta.glob("../App.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const APP_SOURCE = (() => {
  const found = Object.entries(SOURCES).find(([path]) => path.endsWith("/App.tsx"));
  if (!found) {
    throw new Error("the glob did not reach App.tsx — this file would prove nothing");
  }
  return found[1];
})();

/** The `<CitySurface …/>` element in `App.tsx`, as text. */
function citySurfaceElement(): string {
  const open = APP_SOURCE.indexOf("<CitySurface");
  if (open === -1) {
    throw new Error("no `<CitySurface` element in App.tsx");
  }
  // A prop before the progression callbacks now renders nested JSX and therefore contains
  // its own `/>`. `indexOf` stopped at that child, derived an empty callback population, and
  // the floor above correctly exposed the guard as measuring nothing. Close only on the
  // top-level marker of the CitySurface element.
  let braceDepth = 0;
  for (let index = open; index < APP_SOURCE.length - 1; index += 1) {
    if (APP_SOURCE[index] === "{") {
      braceDepth += 1;
    } else if (APP_SOURCE[index] === "}") {
      braceDepth -= 1;
    } else if (
      braceDepth === 0 &&
      APP_SOURCE[index] === "/" &&
      APP_SOURCE[index + 1] === ">"
    ) {
      return APP_SOURCE.slice(open, index);
    }
  }
  throw new Error("the top-level `<CitySurface` element is never closed");
}

/**
 * `prop -> the expression App passes for it`, for every `on…` callback on the element.
 *
 * Brace-walked rather than matched with `[^}]*`, because several of these expressions are
 * multi-line and contain object and template braces; a lazy match would truncate one and
 * silently drop whatever gate lived past the first `}`.
 */
function callbackExpressions(): Map<string, string> {
  const element = citySurfaceElement();
  const passed = new Map<string, string>();
  // The element may be nested in an inertable city layer. Whitespace is formatting, not part
  // of the callback contract; the floor below still fails if this walk stops matching.
  for (const match of element.matchAll(/^\s+(on[A-Z]\w*)=\{/gm)) {
    const name = match[1];
    if (name === undefined || match.index === undefined) {
      continue;
    }
    const start = element.indexOf("{", match.index);
    let depth = 0;
    for (let i = start; i < element.length; i += 1) {
      if (element[i] === "{") {
        depth += 1;
      } else if (element[i] === "}") {
        depth -= 1;
        if (depth === 0) {
          passed.set(name, element.slice(start + 1, i).trim());
          break;
        }
      }
    }
  }
  return passed;
}

const CALLBACKS = callbackExpressions();
const GATED = [...CALLBACKS]
  .filter(([, expression]) => expression.includes("devControlsEnabled"))
  .map(([prop]) => prop)
  .sort();

describe("App gates the stand-ins on the dev predicate and gates nothing else on it", () => {
  it("derives a real population of callbacks", () => {
    // A floor on the derivation. Every census below concludes something about a subset, and
    // an empty map satisfies all of them; this is what fails if the walk stops matching.
    expect(CALLBACKS.size).toBeGreaterThanOrEqual(15);
    for (const prop of ["onDevAdvanceMastery", "onLessonTaught", "onPracticeComplete"]) {
      expect(CALLBACKS.has(prop), `${prop} is not passed to CitySurface at all`).toBe(true);
    }
  });

  it("gates exactly the three developer stand-ins, and nothing else", () => {
    // Set equality, so it fails in both directions: a progression callback re-gated on the
    // dev predicate joins this list and fails here, and a stand-in un-gated leaves it and
    // fails here too — which is the sibling file's outage arriving from the other side.
    expect(GATED).toEqual(["onDevAdvanceMastery", "onDevLessonTaught", "onDevSetStage"]);
  });

  it("passes the two real progression callbacks unconditionally", () => {
    // The same claim from the other end, stated over the expression rather than the set: it
    // pins that these two carry a bare handler and not a conditional of ANY kind, so a gate
    // on some second predicate — a new flag, an auth check — is caught as well.
    for (const prop of ["onLessonTaught", "onPracticeComplete"]) {
      const expression = CALLBACKS.get(prop) ?? "";
      expect(expression).toMatch(/^session\.\w+$/);
    }
  });
});
