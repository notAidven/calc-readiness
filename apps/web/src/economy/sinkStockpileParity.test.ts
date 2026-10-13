import { DRILL_PAID_SETS_PER_ERA, materialForEra } from "@cr/economy";
import { describe, expect, it, vi } from "vitest";

import { createCivicMaterialEconomy } from "../city/civicEconomy";
import { CURRENT_ERA_ID } from "../city/eraDressing";
import { createRoadSpendEconomy } from "../city/roadsEconomy";
import type {
  CivicPurchaseOutcome,
  EconomyClient,
  RepairOutcome,
  WalletView,
} from "./economyClient";

/**
 * ONE STOCKPILE, MANY SINKS — the guard that no two of them can spend the same material.
 *
 * ## Why this file exists rather than more cases in the decorators' own suites
 *
 * Since the gold-drop there is exactly one currency and every sink draws on it, and the
 * composition root stacks two decorators over the core, each netting a spend the ledger does
 * not hold. Every sink therefore has to be guarded against the NETTED balance in every
 * decorator, and the failure when one is not is silent: the sink reports the authoritative
 * stockpile, the player is shown material that is already spent, and the next purchase
 * spends it again.
 *
 * **That has now happened twice, both times the same way.** `repairRuin` arrived from the
 * crisis lane and `civicEconomy.ts` did not guard it. `purchaseCivicBuilding` arrived from
 * the economy lane and `civicEconomy.ts` did not implement it at all — measured, at the
 * 2026-07-30 merge: forwarded untouched it sold a second Longhouse out of a stockpile that
 * could not cover it and reported 160 to a player who had 80 (`civicEconomy.test.ts`).
 *
 * Both slipped past suites that were complete for the sinks they knew about. So the subject
 * here is not any sink, it is **the population**: a sweep whose members come from
 * `EconomyClient` itself, so a sink added tomorrow is inside it before anyone writes a case.
 *
 * **THE POPULATION HAS NOW SHRUNK TOO, AND THE DERIVATION HANDLED IT.** `purchaseCosmetic`
 * was a sink here until the 2026-08-03 shop sunset. Nothing about the sweep had to be
 * taught that: the method left `economyClient.ts`, so it left `SINKS`, and the both-ways
 * driver census went red at the driver it had left behind — which is the second direction
 * of that assertion doing exactly the job it was written for. What DID need editing are
 * the floors, which are size claims and cannot derive themselves.
 *
 * ## THE POPULATION IS DERIVED FROM THE INTERFACE'S SOURCE, NOT FROM A LIST OF FOUR
 *
 * A runtime object cannot be asked which of its methods spend, so the derivation reads
 * `economyClient.ts` and takes:
 *
 *   1. every `interface <X>Outcome` in it that declares a `spendable` field and does NOT
 *      declare `granted` — i.e. the outcomes of SPENDS rather than of grants; then
 *   2. every method on `interface EconomyClient` whose declared return is
 *      `Promise<` one of those `>`.
 *
 * Two filters over one real source, and the QA rule's own warning applies to it — *"a
 * derivation is at its most convincing when it is one clean filter over a real source, which
 * is also exactly what a too-narrow filter looks like"*. So the derivation is itself
 * asserted: the outcome set and the sink set are both floored, and the sink names are checked
 * to be exactly the methods the two decorators guard. A regex that silently matched nothing
 * would fail at the floors rather than sweep an empty population.
 *
 * ## AND IT ASSERTS THE PROPERTY, NOT TODAY'S MECHANICS
 *
 * The civic spend path is being replaced (`purchaseCivicBuilding` in the ledger, session
 * counter deleted). Nothing here reads a counter, a `netWallet`, or `applyMaterialSpend`'s
 * internals: every case drives the composed client's PUBLIC methods and asks the one question
 * that outlives the rewrite — given a netted balance that cannot cover a spend, is the spend
 * refused with nothing debited, and does the refusal report the balance the player can see?
 * That stays true when the ledger does the netting instead of a counter.
 */

/**
 * The interface's own source, read through Vite's `?raw` glob — the idiom
 * `lessons/revealReAsk.test.ts` uses for exactly this kind of source-derived population, and
 * the one that works under both vitest projects (a `node:fs` read off `import.meta.url` does
 * not: this project's `import.meta.url` is not a `file:` URL).
 */
const CLIENT_SOURCE = Object.values(
  import.meta.glob("./economyClient.ts", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>,
).join("\n");

/**
 * The interface's SPEND-outcome type names: an outcome carrying a `spendable` balance, minus
 * the grant outcome, which carries one too and is a credit rather than a debit.
 */
function deriveSpendOutcomeNames(source: string): readonly string[] {
  const names: string[] = [];
  const block = /export interface (\w*Outcome) \{([\s\S]*?)\n\}/g;
  for (const match of source.matchAll(block)) {
    const [, name = "", body = ""] = match;
    if (/\bspendable\b/.test(body) && !/\bgranted\b/.test(body)) {
      names.push(name);
    }
  }
  return names.sort();
}

/** Every `EconomyClient` method whose declared return is one of `outcomes`. */
function deriveSinkNames(source: string, outcomes: readonly string[]): readonly string[] {
  const iface = /export interface EconomyClient \{([\s\S]*?)\n\}/.exec(source)?.[1] ?? "";
  const names: string[] = [];
  const method = /^\s{2}(\w+)\([^)]*\):\s*Promise<(\w+)>;/gm;
  for (const match of iface.matchAll(method)) {
    const [, name = "", returned = ""] = match;
    if (outcomes.includes(returned)) {
      names.push(name);
    }
  }
  return names.sort();
}

const SPEND_OUTCOMES = deriveSpendOutcomeNames(CLIENT_SOURCE);
const SINKS = deriveSinkNames(CLIENT_SOURCE, SPEND_OUTCOMES);

/** Era one's material, so a fixture cannot be funded in a currency nothing spends. */
const SPENDABLE_MATERIAL = materialForEra(CURRENT_ERA_ID);

/**
 * A base economy reporting the AUTHORITATIVE stockpile from every sink, untouched — the core
 * knows nothing about a decorator's counter, so the netting is the only thing that can move
 * the number a case reads. An unguarded sink hands back the full balance, which is the defect.
 */
function fakeBase(spendable: number) {
  const wallet: WalletView = {
    materials: SPENDABLE_MATERIAL === null ? {} : { [SPENDABLE_MATERIAL.id]: spendable },
    spendable,
    spendableMaterial: SPENDABLE_MATERIAL,
  };
  const calls: string[] = [];
  const base: EconomyClient = {
    getWallet: async () => wallet,
    appliedEventIds: async () => [],
    purchaseCivicBuilding: vi.fn(async (): Promise<CivicPurchaseOutcome> => {
      calls.push("purchaseCivicBuilding");
      return {
        status: "spent",
        spendable: wallet.spendable,
        cost: 0,
        building: null,
      };
    }),
    repairRuin: vi.fn(async (): Promise<RepairOutcome> => {
      calls.push("repairRuin");
      return { status: "spent", spendable: wallet.spendable, cost: 0 };
    }),
    reportIslandFounded: async () => grant(),
    resetIslandWallet: async () => undefined,
    reportPracticeSetComplete: async () => ({
      ...grant(),
      eventId: "practice_complete:test",
      rewardEra: "prehistoric",
      groupKey: "practice_complete:test",
      rewardKind: "repeat_practice",
      paidSets: 0,
      setsRemaining: DRILL_PAID_SETS_PER_ERA,
      setsBound: DRILL_PAID_SETS_PER_ERA,
    }),
    reportLessonComplete: async () => grant(),
    reportInterleavedClear: async () => ({
      ...grant(),
      paidSets: 0,
      setsRemaining: DRILL_PAID_SETS_PER_ERA,
      setsBound: DRILL_PAID_SETS_PER_ERA,
    }),
    reportCivicBootstrap: async () => grant(),
  };
  return { base, calls };
}

function grant() {
  return { applied: false, materials: {}, grantedMaterials: {} };
}

/**
 * HOW EACH DERIVED SINK IS DRIVEN, and asserted in BOTH directions against the derived
 * population — the QA rule's shape for a list that must not go stale.
 *
 * A sink cannot be driven generically: each takes its own ask and states its cost in its own
 * field, so a caller has to be written per sink. That is exactly where a written-down list
 * would creep back in, so this one is held to the derivation:
 *
 *   - a DERIVED SINK WITH NO DRIVER FAILS, so the fifth sink cannot slip in unswept — the
 *     sweep goes red until someone writes its driver, which is the alarm `repairRuin` and
 *     `purchaseCivicBuilding` both failed to raise;
 *   - a DRIVER NAMING A METHOD THAT IS NO LONGER A SINK FAILS, so a renamed or retired sink
 *     cannot sit here for ever driving nothing and hiding that it drives nothing.
 *
 * `cost` is the material each driver asks for, so a case can set the netted balance one short
 * of it. `expectRefused` reads the outcome's own report rather than a shared shape, because
 * the three outcomes agree on `spendable` and on nothing else.
 */
const DRIVERS: Readonly<
  Record<
    string,
    {
      readonly cost: number;
      readonly call: (
        client: EconomyClient,
        cost: number,
      ) => Promise<{ spendable: number }>;
      readonly refused: (outcome: { spendable: number }) => boolean;
    }
  >
> = {
  purchaseCivicBuilding: {
    cost: 1,
    call: (client) =>
      client.purchaseCivicBuilding({
        placementId: "civic:longhouse:0",
        building: "prehistoric_longhouse",
      }),
    refused: (outcome) =>
      (outcome as CivicPurchaseOutcome).status === "insufficient_material",
  },
  repairRuin: {
    cost: 60,
    call: (client, cost) =>
      client.repairRuin({
        damageId: "d1",
        subjectKind: "building",
        subject: "NUM.S",
        cost,
      }),
    refused: (outcome) => (outcome as RepairOutcome).status === "insufficient_material",
  },
};

/**
 * THE DECORATORS IN THE COMPOSITION ROOT, each with the seam that records its spend.
 *
 * Both are swept, because the property is about the STACK: `App` composes
 * `createCivicMaterialEconomy(createRoadSpendEconomy(core, roads), civic, era)`, and a sink
 * unguarded in either layer is a hole. Each is exercised alone so a failure names the layer.
 */
const DECORATORS: readonly {
  readonly name: string;
  readonly wrap: (base: EconomyClient, spent: () => number) => EconomyClient;
}[] = [
  {
    name: "roadsEconomy",
    wrap: (base, spent) => createRoadSpendEconomy(base, spent),
  },
  {
    name: "civicEconomy",
    wrap: (base, spent) => createCivicMaterialEconomy(base, spent, CURRENT_ERA_ID),
  },
];

describe("the sink population is derived from EconomyClient, not written down", () => {
  it("finds the spend outcomes and the sinks, with floors under both", () => {
    // Floors, because two regexes over a source file are exactly the kind of derivation
    // that can quietly match nothing and sweep an empty population green. TWO since the
    // shop sunset took `purchaseCosmetic` / `PurchaseOutcome`, where it was three: a floor
    // is a size claim and cannot derive itself, so it is the one line a shrinking
    // population has to be told about.
    expect(SPEND_OUTCOMES.length).toBeGreaterThanOrEqual(2);
    expect(SINKS.length).toBeGreaterThanOrEqual(2);
    // COMPOSITION as well as size, because a floor of two is met by any two: these are the
    // two sinks that exist, and a third arriving must fail here rather than be swept.
    expect(SINKS).toEqual(["purchaseCivicBuilding", "repairRuin"]);
    // The grant outcome carries `spendable` too and is a CREDIT: it must not be read as a
    // sink, or the sweep would demand a refusal from an earn report.
    expect(SPEND_OUTCOMES).not.toContain("GrantOutcome");
    // Shape, not just size: the sinks are methods, distinct, and none is an earn report.
    expect(new Set(SINKS).size).toBe(SINKS.length);
    for (const sink of SINKS) {
      expect(sink.startsWith("report"), `${sink} is an earn report, not a sink`).toBe(
        false,
      );
    }
  });

  it("has a driver for every derived sink, and no driver for anything else", () => {
    // BOTH DIRECTIONS. The first half is the alarm the last two sinks failed to raise; the
    // second stops a retired sink leaving a driver behind that exercises nothing.
    expect([...SINKS].sort()).toEqual(Object.keys(DRIVERS).sort());
  });

  it("sweeps every decorator in the composition root", () => {
    expect(DECORATORS.length).toBeGreaterThanOrEqual(2);
  });

  it("no longer sweeps a cosmetic sink, because there is no cosmetic sink", () => {
    // The sunset, measured on the derivation rather than asserted about the tree: the
    // method and its outcome are gone from the interface, so they are gone from the two
    // sets this file sweeps. A `purchaseCosmetic` back on `EconomyClient` fails here AND
    // at the composition assertion above.
    expect(SINKS).not.toContain("purchaseCosmetic");
    expect(SPEND_OUTCOMES).not.toContain("PurchaseOutcome");
  });
});

for (const decorator of DECORATORS) {
  describe(`${decorator.name} — no sink can spend what another already took`, () => {
    for (const sink of SINKS) {
      const driver = DRIVERS[sink];

      it(`${sink} is implemented rather than left undefined`, () => {
        const { base } = fakeBase(1000);
        const client = decorator.wrap(base, () => 0);
        // A decorator that omits a sink does not "forward" it — the call site throws
        // `is not a function`. That was the state of `civicEconomy.purchaseCivicBuilding`
        // at this merge.
        expect(
          typeof (client as unknown as Record<string, unknown>)[sink],
          `${decorator.name} does not implement ${sink}`,
        ).toBe("function");
      });

      it(`${sink} is REFUSED when the netted balance cannot cover it`, async () => {
        if (driver === undefined) {
          throw new Error(`no driver for the derived sink ${sink}`);
        }
        // The authoritative stockpile covers the spend; the recorded spend takes it all, so
        // the netted balance is 0 and nothing is affordable.
        const { base, calls } = fakeBase(driver.cost + 500);
        const client = decorator.wrap(base, () => driver.cost + 500);
        const outcome = await driver.call(client, driver.cost);

        expect(driver.refused(outcome), `${sink} was allowed on an empty stockpile`).toBe(
          true,
        );
        // Fail-closed: the core is never reached, so nothing is debited...
        expect(calls, `${sink} reached the core on a refusal`).not.toContain(sink);
        // ...and the refusal reports the NETTED balance, which is the number the player can
        // actually see. Reporting the authoritative one is how a surface offers material
        // that is already spent.
        expect(outcome.spendable, `${sink} reported an un-netted balance`).toBe(0);
      });

      it(`${sink} is ALLOWED when the netted balance covers it`, async () => {
        if (driver === undefined) {
          throw new Error(`no driver for the derived sink ${sink}`);
        }
        // The other direction, so the refusal above cannot be satisfied by a decorator that
        // simply refuses everything — which is how a one-sided sweep passes over a sink
        // that has been broken shut rather than guarded.
        const { base, calls } = fakeBase(driver.cost + 500);
        const client = decorator.wrap(base, () => 0);
        const outcome = await driver.call(client, driver.cost);

        expect(driver.refused(outcome), `${sink} was refused on a full stockpile`).toBe(
          false,
        );
        expect(calls, `${sink} never reached the core`).toContain(sink);
      });
    }

    it("nets the wallet every sink reads, and never mints", async () => {
      const { base } = fakeBase(100);
      expect((await decorator.wrap(base, () => 40).getWallet()).spendable).toBe(60);
      // Clamped, not negative: a decorator that reported -50 would have every guard above
      // refusing correctly and the HUD showing nonsense.
      expect((await decorator.wrap(base, () => 9999).getWallet()).spendable).toBe(0);
      // Never above the authoritative figure, which is the no-minting half.
      expect((await decorator.wrap(base, () => 0).getWallet()).spendable).toBe(100);
    });
  });
}
