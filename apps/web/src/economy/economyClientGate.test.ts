import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createEconomyClient, isEconomyServerBacked } from "./economyClient";

/**
 * THE COMPOSITION ROOT'S OWN GUARD — the one thing in the economy lane that decides
 * which adapter a real user gets, and until this file the one thing nothing tested.
 *
 * ## Why this file exists rather than another `openEconomy` helper
 *
 * Three suites already open an economy by re-implementing `createEconomyClient`'s body
 * inline, each with a comment saying so (`economyMaterials.test.ts`,
 * `civicPurchasePath.test.ts`, `economyPersistence.test.ts`). They are good tests of the
 * ADAPTER and they are structurally incapable of catching a defect in the CHOICE of
 * adapter: change the real function's body and all three stay green, because none of
 * them calls it. That is the guard-population failure this repo has catalogued more than
 * a dozen times — a population scoped to the implementation the members share instead of
 * the behaviour that matters. Every test below calls the real
 * {@link createEconomyClient}, and that is the whole point of it.
 *
 * ## What is under test: WHEN the gate is asked, not just what it answers
 *
 * The defect these guard against is not a wrong predicate, it is a predicate answered
 * too early and never re-asked. `App` builds this client during its FIRST render, while
 * the Cognito identity is still resolving behind a lazy `import()`, so anything derived
 * from the live auth state reads `false` on that render — and, being behind a ref
 * null-check, is never re-evaluated. A module-scope store frozen at import time has the
 * same shape: the answer is fixed before the environment that decides it is known.
 *
 * The fix, and the precedent, is `isDevPersistenceEnabled`: ask
 * {@link isEconomyServerBacked} with the STRONGEST auth state, so the answer is
 * synchronous, stable from the first frame, and wrong only in the safe direction.
 */

/** A deployed API endpoint — the shape `docs/Deployment.md` §3 configures. */
const DEPLOYED_API = "https://api.example.test/api/diagnostic";

/** Keys the ECONOMY dev store owns; the city's sibling store uses another prefix. */
function economyStoreKeys(): string[] {
  return Object.keys(localStorage).filter((key) => key.startsWith("cr.devEconomy"));
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  localStorage.clear();
});

describe("createEconomyClient — the auth gate is the deployment shape, asked live", () => {
  /**
   * THE MEASUREMENT BEHIND THE FIX, pinned so the reasoning cannot be re-litigated from
   * memory. In a deployment that has an API endpoint the two asks DISAGREE, and the
   * disagreement is exactly the window `App`'s first render sits in.
   */
  it("the weak auth ask and the strong one disagree in a deployed app", () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", DEPLOYED_API);

    expect(isEconomyServerBacked(true)).toBe(true);
    expect(isEconomyServerBacked(false)).toBe(false);
  });

  /**
   * A signature with no auth argument is what makes the always-false flag UNPASSABLE
   * rather than merely unpassed. The argument was documented as ignored at its own
   * definition site and still reached every call site as `authedCity !== null`; deleting
   * it is the only version of this fix a future edit cannot undo by accident.
   */
  it("takes no auth argument, so a first-render auth flag cannot come back", () => {
    expect(createEconomyClient).toHaveLength(0);
  });

  /**
   * THE BEHAVIOURAL CASE, and the second of the two that were red.
   *
   * A deployed app must get NO browser-side writer of student state (Contracts §3 — the
   * Lambda is the only writer). Before this change the answer was not the composition
   * root's to give: the store was a module-scope singleton whose `enabled` was fixed
   * when its MODULE was imported, so a client built afterwards carried whatever the
   * environment had looked like at import. Driven here it wrote a signed-in learner's
   * ledger to `cr.devEconomy.v3.local`.
   *
   * STATED PRECISELY, because the failure is easy to over-claim: Vite inlines
   * `import.meta.env` at build time, so in a shipped bundle import time and call time
   * see the same endpoint and the frozen answer happens to be the right one. What the
   * freeze cost was not a wrong answer in production, it was an UNASKABLE gate — the
   * one decision this file exists to make, made somewhere the composition root could
   * not reach and no test could drive. That is the same shape as the live `[false]`
   * defect at the call site (see the sibling `.composition.` file), and it is why both
   * halves had to move: an answer that predates the question.
   */
  it("writes nothing to the browser store once the app is server-backed", async () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", DEPLOYED_API);
    expect(isEconomyServerBacked(true)).toBe(true);

    const client = createEconomyClient();
    await client.reportLessonComplete({ nodeId: "NUM.S" });
    await client.reportInterleavedClear({ sessionId: "round-1" });

    expect(economyStoreKeys()).toEqual([]);
  });

  /**
   * THE OTHER DIRECTION, and it is not decoration: the local `localStorage` path is how
   * the team QAs and it must survive this change untouched. With no API endpoint
   * configured — the default local and CI setup — the wallet still round-trips a reload,
   * which is issue #96's own guarantee.
   *
   * Calling the composition root twice on one browser IS the reload: the second call is
   * a new page view holding nothing but the bytes the first one left behind.
   */
  it("keeps the dev path: with no endpoint the wallet survives a reload", async () => {
    vi.stubEnv("VITE_DIAGNOSTIC_API_URL", "");
    expect(isEconomyServerBacked(true)).toBe(false);

    const first = createEconomyClient();
    await first.reportLessonComplete({ nodeId: "NUM.S" });
    const earned = (await first.getWallet()).spendable;
    expect(earned).toBeGreaterThan(0);

    const afterReload = createEconomyClient();

    expect((await afterReload.getWallet()).spendable).toBe(earned);
    expect(economyStoreKeys()).toHaveLength(1);
  });
});
