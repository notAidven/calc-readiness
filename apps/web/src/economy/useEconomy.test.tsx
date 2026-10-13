import {
  CAP,
  DRILL_PAID_SETS_PER_ERA,
  EARN,
  LESSON_GRANT_MASTERY_BAR,
  lessonCompleteEventId,
  lessonMaterialAmount,
} from "@cr/economy";
import { MASTERY_CORRECT_COUNT, masteryFromCorrectCount } from "@cr/mastery-service";
import type { PlacementEstimate } from "@cr/state-schema";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  type CityDevSession,
  createCityDevSession,
  D1_NODE_IDS,
} from "../city/citySession";
import { resetCityEra, setCityEra } from "../city/useCityEra";
import { BUILDABLE_RADIUS, defaultPlacements } from "../city/worldLayout";
import { createInMemoryEconomyClient, type InMemoryEconomyClient } from "./economySession";
import { useEconomy } from "./useEconomy";

/**
 * The adapter reads the LIVE era (`economySession.currentEra`), so every case here runs in
 * whichever era the city store holds — era one unless a case moves it. Reset after each, or
 * an era left behind becomes the era the next case silently measures.
 */
afterEach(resetCityEra);

/** One client per test, with a stable identity across renders (as the app wires it). */
function renderEconomy(
  client: InMemoryEconomyClient = createInMemoryEconomyClient(),
): ReturnType<typeof renderHook<ReturnType<typeof useEconomy>, unknown>> & {
  client: InMemoryEconomyClient;
} {
  return { ...renderHook(() => useEconomy(client)), client };
}

/** `reconcileProgress` is fire-and-forget; let its awaited reports land. */
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** Every D1 node passed by the diagnostic at the given estimate (3 = a robust pass). */
function allNodesAt(estimate: PlacementEstimate): Record<string, PlacementEstimate> {
  const byNode: Record<string, PlacementEstimate> = {};
  for (const nodeId of D1_NODE_IDS) {
    byNode[nodeId] = estimate;
  }
  return byNode;
}

/**
 * Drop every skill on a valid, hall-clear transform. The dev practice writers
 * (`advanceMasteryDev` / `setStageDev`) only apply to a PLACED node, so the practice
 * half of these tests has to lay the city out first.
 */
async function placeEverySkill(session: CityDevSession): Promise<void> {
  const { town_hall: hall } = await session.load();
  const layout = defaultPlacements([...D1_NODE_IDS], hall ? [hall] : [], BUILDABLE_RADIUS);
  for (const spot of layout) {
    await session.placeSkill(spot.nodeId, {
      col: spot.col,
      row: spot.row,
      rot: spot.rot,
    });
  }
}

/**
 * Row 2 of the earn table — a cleared interleaved session, the Town Hall's repeatable
 * path and the ONLY grant the anti-grind cap applies to. These run against the real
 * in-memory client so the cap is exercised through the same core the app uses.
 *
 * **PRACTICE PAYS THE ERA MATERIAL SINCE THE GOLD-DROP**, so the balance these read is
 * `wallet.spendable` (era one's stone) rather than `wallet.balances.gold`. That is not
 * only a field rename — practice income lands in the pool civic buildings are bought
 * from, which is what makes the cap load-bearing on progression. The `balances`
 * projection that sat beside it went with XP on 2026-08-03.
 */
describe("useEconomy — reporting a cleared interleaved session", () => {
  it("credits the era material, and the wallet reflects it", async () => {
    const { result } = renderEconomy();
    await waitFor(() => {
      expect(result.current.wallet).not.toBeNull();
    });
    const before = result.current.wallet?.spendable ?? 0;

    await act(async () => {
      await result.current.reportInterleavedClear({ sessionId: "session-1" });
    });

    expect(result.current.reward?.material ?? 0).toBeGreaterThan(0);
    expect(result.current.wallet?.spendable ?? 0).toBeGreaterThan(before);
    expect(result.current.message).toMatch(/from interleaved practice/i);
  });

  it("pays every set in full UP TO the era's bound, and forty rounds do not pay forty", async () => {
    // **THE DRILL BOUND, END TO END THROUGH THE REAL ADAPTER.** This assertion has now
    // read three ways, and the history is the point: it first said "stops paying at the
    // cap" against a 200-per-24h ceiling, then "forty rounds pay forty rounds' worth"
    // when that clock was sunset, and now says forty rounds pay TEN. The difference
    // between the first and the third is the whole of what "effort-keyed, not time-keyed"
    // buys — the old ceiling came back tomorrow, this one comes back an era later, and
    // `packages/economy/src/clockless.test.ts` measures that behaviourally.
    const { result, client } = renderEconomy();
    await waitFor(() => {
      expect(result.current.wallet).not.toBeNull();
    });

    const ROUNDS = 40;
    for (let round = 0; round < ROUNDS; round += 1) {
      await act(async () => {
        await result.current.reportInterleavedClear({ sessionId: `grind-${round}` });
      });
    }

    expect(result.current.wallet?.spendable).toBe(
      DRILL_PAID_SETS_PER_ERA * CAP.maxMaterial,
    );
    // A floor with a shape: the bound really did bite over this population, so the
    // equality above is not being satisfied by forty rounds that all happened to pay.
    expect(ROUNDS).toBeGreaterThan(DRILL_PAID_SETS_PER_ERA);
    expect(result.current.wallet?.spendable ?? 0).toBeLessThan(ROUNDS * CAP.maxMaterial);

    // **AND THE THIRTY UNPAID ROUNDS LEFT NO ROW AT ALL.** They credited XP until the
    // 2026-08-03 sunset, which is what made a bounded set a smaller reward rather than a
    // dead one; there is nothing left for them to credit, so the ledger holds exactly the
    // ten the allowance paid for and the last flash is the one from the tenth set.
    expect(client.snapshot().entries).toHaveLength(DRILL_PAID_SETS_PER_ERA);
  });

  it("SAYS how many paying sets are left, from the era's very first set", async () => {
    // **AN INVISIBLE BOUND IS THE FAILURE THE LEAD NAMED** ("a taper is not visible to
    // the player"), and a hard stop nobody is counted down to fails the same test. So the
    // remaining count rides on every payout rather than appearing at the end.
    const { result } = renderEconomy();
    await waitFor(() => {
      expect(result.current.wallet).not.toBeNull();
    });

    await act(async () => {
      await result.current.reportInterleavedClear({ sessionId: "first" });
    });
    expect(result.current.message).toMatch(
      new RegExp(`${DRILL_PAID_SETS_PER_ERA - 1} more paying sets in this era`, "i"),
    );

    // Walk to the last paying set: it announces itself as the last rather than counting
    // down to "0 more", which would read as though the set had not paid.
    for (let round = 1; round < DRILL_PAID_SETS_PER_ERA; round += 1) {
      await act(async () => {
        await result.current.reportInterleavedClear({ sessionId: `paid-${round}` });
      });
    }
    expect(result.current.message).toMatch(/last set this era pays/i);
    expect(result.current.message).toMatch(/earned/i);

    // And past it: the copy names what the learner still gets and what brings the
    // reward back. It must NOT read as the duplicate-report branch, which claims the
    // reward is already banked, and must not read as a failure.
    await act(async () => {
      await result.current.reportInterleavedClear({ sessionId: "over-the-bound" });
    });
    expect(result.current.message).toMatch(/paid out all/i);
    expect(result.current.message).toMatch(/next era/i);
    expect(result.current.message).not.toMatch(/already counted/i);
    expect(result.current.message).not.toMatch(/could not be recorded/i);
    // **AND IT NAMES NO XP**, which is what the sunset took out of the consolation. A
    // learner past the bound gets the streak and a fresh allowance next era, and the
    // copy must not promise a currency that no longer exists.
    expect(result.current.message).not.toMatch(/\bxp\b/i);
  });

  it("says the set was already counted when a session id repeats", async () => {
    // The one path left to the no-payout branch, and the reason its copy changed: a
    // repeat is a double-report of one set, not a throttle, so telling the learner to
    // come back tomorrow would name a ceiling that no longer exists.
    const { result } = renderEconomy();
    await waitFor(() => {
      expect(result.current.wallet).not.toBeNull();
    });
    await act(async () => {
      await result.current.reportInterleavedClear({ sessionId: "same-set" });
    });
    expect(result.current.message).toMatch(/from interleaved practice/i);

    await act(async () => {
      await result.current.reportInterleavedClear({ sessionId: "same-set" });
    });
    expect(result.current.message).toMatch(/already counted/i);
    expect(result.current.message).not.toMatch(/cap/i);
    // And it really did pay only once.
    expect(result.current.wallet?.spendable).toBe(CAP.maxMaterial);
  });

  it("is idempotent per session id, so a replayed round pays nothing twice", async () => {
    const { result } = renderEconomy();
    await waitFor(() => {
      expect(result.current.wallet).not.toBeNull();
    });

    await act(async () => {
      await result.current.reportInterleavedClear({ sessionId: "same" });
    });
    const afterFirst = result.current.wallet?.spendable ?? 0;

    await act(async () => {
      await result.current.reportInterleavedClear({ sessionId: "same" });
    });

    expect(result.current.wallet?.spendable ?? 0).toBe(afterFirst);
    // A floor: the first round must actually have paid, or "unchanged" is trivially
    // true over a wallet that never moved.
    expect(afterFirst).toBeGreaterThan(0);
  });
});

/**
 * Row 1 of the earn table — the lesson-completion grant, and specifically WHEN it
 * fires (issue #102). Testing out of a skill pre-builds its building to complete
 * without the learner answering an item, and row 1 used to pay for that: a learner
 * who tested out of all six D1 nodes collected the entire island's lesson gold up
 * front. The grant is RETIMED (not duplicated) onto practice completion, so the same
 * total arrives via the same event id, later.
 *
 * These run the REAL test-out write paths through `citySession` rather than
 * hand-built node states, so a change to either seed shows up here.
 */
describe("useEconomy — row 1 is timed to mastery practice, not test-out", () => {
  /**
   * What a finished D1 island is worth in lesson grants: the whole era-one material
   * total. It was that plus 120 XP until the sunset.
   *
   * The material side is `lessonMaterialAmount × the node count`, which is
   * `ERA_MATERIAL_TOTAL` by construction — the point of normalising the total is that
   * an era's income no longer depends on how many lessons it has.
   */
  const LESSON_MATERIAL = lessonMaterialAmount("prehistoric");
  const ALL_SIX_MATERIAL = LESSON_MATERIAL * D1_NODE_IDS.length;

  /** A learner who tested out of the whole island (the `seedFromPlacement` seed). */
  function testedOutOfEverything(): CityDevSession {
    const session = createCityDevSession();
    session.seedFromPlacement(allNodesAt(3), [...D1_NODE_IDS]);
    return session;
  }

  it("pays 0 material for testing out of all six D1 nodes", async () => {
    const session = testedOutOfEverything();
    const { result, client } = renderEconomy();
    await waitFor(() => {
      expect(result.current.wallet).not.toBeNull();
    });

    const load = await session.load();
    // Every DIAGNOSED node really is sitting at the test-out seam: complete, zero stars,
    // and no practice evidence. If this drifts, the assertion below stops meaning much.
    //
    // The population narrowed from `load.node_states` to the D1 rows when the session
    // began seeding the whole in-product registry (`CITY_NODE_IDS`). It is not a weaker
    // claim: the diagnostic passes six nodes and only those six reach the test-out seam, so
    // the other 56 rows are not-started and were never what this was about. The floor
    // keeps the sweep honest.
    const testedOut = load.node_states.filter((s) => D1_NODE_IDS.includes(s.node_id));
    expect(testedOut).toHaveLength(D1_NODE_IDS.length);
    expect(testedOut.length).toBe(6);
    for (const state of testedOut) {
      expect(state.completion_status).toBe("complete");
      expect(state.lesson_stage).toBe("done");
      expect(state.mastery).toBe(0);
      expect(state.last_practiced_at).toBeNull();
    }

    act(() => {
      result.current.reconcileProgress(load);
    });
    await settle();

    expect(result.current.wallet?.spendable).toBe(0);
    // Nothing was granted, so there is no reward toast to explain either.
    expect(result.current.reward).toBeNull();
    expect(await client.appliedEventIds()).toHaveLength(0);
  });

  it("pays nothing for the server-path pre-build either (placeSkill's test-out seam)", async () => {
    // The OTHER test-out write path: a passed-but-not-pre-seeded node is pre-built
    // to complete by `placeSkill` itself. It must be just as unpaid as the seed.
    const session = createCityDevSession();
    session.seedFromPlacement(allNodesAt(3), []);
    await placeEverySkill(session);

    const { result, client } = renderEconomy();
    await waitFor(() => {
      expect(result.current.wallet).not.toBeNull();
    });
    const load = await session.load();
    // The D1 rows, for the reason given in the test above: the diagnostic passes six nodes
    // and `placeSkill`'s test-out seam can only fire on one it passed.
    const preBuilt = load.node_states.filter((s) => D1_NODE_IDS.includes(s.node_id));
    expect(preBuilt).toHaveLength(6);
    expect(preBuilt.every((s) => s.completion_status === "complete")).toBe(true);
    expect(preBuilt.every((s) => s.last_practiced_at === null)).toBe(true);

    act(() => {
      result.current.reconcileProgress(load);
    });
    await settle();

    expect(result.current.wallet?.spendable).toBe(0);
    expect(await client.appliedEventIds()).toHaveLength(0);
  });

  it("pays the full 600 material once the six mastery practices are done", async () => {
    const session = testedOutOfEverything();
    await placeEverySkill(session);

    const { result, client } = renderEconomy();
    await waitFor(() => {
      expect(result.current.wallet).not.toBeNull();
    });

    // Test out first and reconcile, so this asserts the RETIMED payout rather than
    // a payout that merely happened to land on a fresh wallet.
    const testedOut = await session.load();
    act(() => {
      result.current.reconcileProgress(testedOut);
    });
    await settle();
    expect(result.current.wallet?.spendable).toBe(0);

    // Now do each node's mastery practice (the dev stand-in for the real lane).
    for (const nodeId of D1_NODE_IDS) {
      await session.advanceMasteryDev(nodeId, 2);
    }
    const practised = await session.load();
    act(() => {
      result.current.reconcileProgress(practised);
    });
    await settle();

    // THE MATERIAL is the row-1 fingerprint, and since the star row went with XP it is
    // the only fingerprint there is: no interleaved session ran, so every unit of stone
    // here is lesson-completion stone. Practice pays the same material, which is why "no
    // interleaved session ran" has to be part of the claim rather than left implicit.
    expect(result.current.wallet?.spendable).toBe(ALL_SIX_MATERIAL);
    expect(ALL_SIX_MATERIAL).toBe(600);
    // And it is row 1 by NAME, not just by amount.
    const applied = await client.appliedEventIds();
    for (const nodeId of D1_NODE_IDS) {
      expect(applied).toContain(lessonCompleteEventId(nodeId));
    }
  });

  it("pays NOTHING for a below-bar finish, then pays it EXACTLY ONCE on the re-run", async () => {
    // **THIS ASSERTION IS REVERSED, AND IT IS THE RULING.** It read "still pays a
    // below-bar finish, which a `mastery >= 2` trigger would have withheld", on the
    // reasoning that a learner who worked the set had done the lesson AND the practice.
    // The lead ruled the other way: currency rewards competence, not attendance, and
    // three of five is attendance. It also USED to be softened by XP — the star row fired
    // from mastery alone, so below-bar work was recognised in something — and the
    // 2026-08-03 sunset removed that softening. Below the bar now earns nothing at all,
    // until the re-run.
    //
    // The two halves are asserted TOGETHER on one learner rather than in two tests,
    // because the claim that makes the gate humane is not "below the bar pays nothing"
    // but "below the bar is NOT YET paid" — and only a single walk can show that the
    // same node, re-run to the bar, collects the full amount and collects it once.
    const session = createCityDevSession();
    session.seedFromPlacement(allNodesAt(0), []);
    await placeEverySkill(session);
    await session.setStageDev("NUM.S", "built");

    const { result, client } = renderEconomy();
    await waitFor(() => {
      expect(result.current.wallet).not.toBeNull();
    });
    const belowBar = await session.load();
    const built = belowBar.node_states.find((s) => s.node_id === "NUM.S");
    // The exact state the ruling is about: the practice set was WORKED (evidence
    // stamped, the building reads finished) and scored below four of five.
    expect(built?.mastery).toBe(1);
    expect(built?.lesson_stage).toBe("done");
    expect(built?.completion_status).toBe("complete");
    expect(built?.last_practiced_at).not.toBeNull();

    act(() => {
      result.current.reconcileProgress(belowBar);
    });
    await settle();

    // NO MATERIAL. Not clamped, not partial — the grant did not fire at all, so the
    // ledger holds no `lesson_complete` row to be topped up later.
    expect(result.current.wallet?.spendable).toBe(0);
    expect(await client.appliedEventIds()).not.toContain(lessonCompleteEventId("NUM.S"));
    // Nothing else moved either: the star row that used to credit XP here is gone, so
    // the ledger is genuinely empty rather than holding a consolation row.
    expect(client.snapshot().entries).toEqual([]);

    // **THE RE-RUN.** Practice sets are re-runnable and mastery is written as
    // `max(existing, evidenced)`, so working the set again to four of five raises the
    // node to the bar. The grant is re-derived from persisted state on the next city
    // load — not fired from a callback — so it arrives late and whole.
    await session.advanceMasteryDev("NUM.S", 2);
    const atBar = await session.load();
    expect(atBar.node_states.find((s) => s.node_id === "NUM.S")?.mastery).toBe(2);

    act(() => {
      result.current.reconcileProgress(atBar);
    });
    await settle();

    expect(result.current.wallet?.spendable).toBe(LESSON_MATERIAL);
    expect(await client.appliedEventIds()).toContain(lessonCompleteEventId("NUM.S"));

    // **AND EXACTLY ONCE.** The retiming must not pay twice, and the ledger's
    // idempotency on `event_id` is what makes that structural rather than incidental —
    // so reconciling the same state again (a refresh, a second city load) re-derives the
    // identical event and credits nothing further.
    act(() => {
      result.current.reconcileProgress(atBar);
    });
    await settle();
    act(() => {
      result.current.reconcileProgress(atBar);
    });
    await settle();

    expect(result.current.wallet?.spendable).toBe(LESSON_MATERIAL);
    const lessonRows = client
      .snapshot()
      .entries.filter((entry) => entry.event_id === lessonCompleteEventId("NUM.S"));
    expect(lessonRows.filter((row) => row.resource_type === "stone")).toHaveLength(1);
  });

  it("pays at every mastery AT the bar and none below it, swept rather than sampled", async () => {
    // The bar observed as behaviour across the whole mastery range rather than at one
    // value. This is what pins the MAPPING the gate is derived from:
    // `masteryFromCorrectCount` sends 5 of 5 to mastery 3, 4 of 5 to 2, and anything less
    // to 1, so "four of five correct" IS `mastery >= 2` — and the table below fails if
    // that mapping or the constant reading it ever move apart.
    const paid: Record<number, number> = {};
    for (const mastery of [0, 1, 2, 3] as const) {
      const session = createCityDevSession();
      session.seedFromPlacement(allNodesAt(0), []);
      await placeEverySkill(session);
      if (mastery > 0) {
        await session.advanceMasteryDev("NUM.S", mastery);
      }
      const load = await session.load();
      expect(load.node_states.find((s) => s.node_id === "NUM.S")?.mastery).toBe(mastery);

      const { result, unmount } = renderEconomy();
      await waitFor(() => {
        expect(result.current.wallet).not.toBeNull();
      });
      act(() => {
        result.current.reconcileProgress(load);
      });
      await settle();
      paid[mastery] = result.current.wallet?.spendable ?? 0;
      unmount();
    }

    expect(paid).toEqual({
      0: 0,
      1: 0,
      2: LESSON_MATERIAL,
      3: LESSON_MATERIAL,
    });
    // The bar the table is keyed on, so the two cannot be read for each other.
    expect(LESSON_GRANT_MASTERY_BAR).toBe(2);
    expect(masteryFromCorrectCount(MASTERY_CORRECT_COUNT)).toBe(LESSON_GRANT_MASTERY_BAR);
    expect(masteryFromCorrectCount(MASTERY_CORRECT_COUNT - 1)).toBeLessThan(
      LESSON_GRANT_MASTERY_BAR,
    );
    // And a floor: the paying half really did pay, so "0 below / material at" is not two
    // ways of writing zero.
    expect(LESSON_MATERIAL).toBeGreaterThan(0);
  });

  it("does not re-pay a tested-out node that already collected under the old timing", async () => {
    // THE #129 INTERACTION. The ledger now survives a refresh, so a grant paid by
    // the pre-fix behaviour is still on the books after this fix ships. When that
    // learner finally does the practice, row 1 re-derives — and must be absorbed by
    // idempotency on `event_id` rather than paying a second time.
    const stale = createInMemoryEconomyClient();
    await stale.reportLessonComplete({ nodeId: "NUM.S" });
    const carriedOver = stale.snapshot();
    expect(carriedOver.entries.length).toBeGreaterThan(0);

    const session = createCityDevSession();
    session.seedFromPlacement(allNodesAt(3), [...D1_NODE_IDS]);
    await placeEverySkill(session);
    await session.advanceMasteryDev("NUM.S", 2);

    const { result } = renderEconomy(createInMemoryEconomyClient(carriedOver));
    await waitFor(() => {
      expect(result.current.wallet).not.toBeNull();
    });
    // The wallet opens holding the early payout — it is NOT clawed back.
    expect(result.current.wallet?.spendable).toBe(LESSON_MATERIAL);

    const practised = await session.load();
    act(() => {
      result.current.reconcileProgress(practised);
    });
    await settle();

    // Paid once EVER, not once per timing rule: the total is still one lesson's
    // worth of stone, and the reward toast does not re-announce it.
    expect(result.current.wallet?.spendable).toBe(LESSON_MATERIAL);
    expect(result.current.reward?.material ?? 0).toBe(0);
  });
});

/**
 * **A FAILED GRANT MUST NOT BE SILENT** — the structural half of defect D-1
 * (`docs/superpowers/specs/2026-07-29-economy-measured-at-tip.md` §2.4).
 *
 * The colon in the Town Hall's session id was one wrong character, and it cost four
 * days because of what happened to the throw rather than because of the throw: every
 * method on this hook is `async`, so an exception inside the economy arrives at the
 * caller as a REJECTION, and both live call sites discarded theirs with a bare `void`.
 * Nothing was spoken, nothing logged, and the drill kept counting a streak it was no
 * longer paid for.
 *
 * So these assert the FUNNEL rather than the colon: an economy that throws for any
 * reason at all is reported through the same `message` the HUD already renders into its
 * `aria-live="polite"` region, and the promise the UI discards no longer rejects. That
 * is what makes `void` safe by construction at every call site instead of at the ones
 * somebody remembered.
 */
describe("useEconomy — an economy failure is spoken, never swallowed", () => {
  /** The real adapter with row 2 forced to reject, every other method untouched. */
  function interleavedAlwaysFails(): InMemoryEconomyClient {
    const real = createInMemoryEconomyClient();
    return {
      ...real,
      reportInterleavedClear: () => Promise.reject(new Error("economy is down")),
    };
  }

  /**
   * The real adapter whose row-1 report fails ONCE and then works — an economy that
   * recovers, which is the only shape under which "re-armed" means anything.
   */
  function lessonFailsOnce(): InMemoryEconomyClient {
    const real = createInMemoryEconomyClient();
    let failed = false;
    return {
      ...real,
      reportLessonComplete: (input) => {
        if (!failed) {
          failed = true;
          return Promise.reject(new Error("economy is down"));
        }
        return real.reportLessonComplete(input);
      },
    };
  }

  it("announces a round that could not be recorded, and does not reject", async () => {
    const { result } = renderEconomy(interleavedAlwaysFails());
    await waitFor(() => {
      expect(result.current.wallet).not.toBeNull();
    });

    // Not `.rejects`: the whole point is that awaiting this is safe, because the live
    // call site (`CitySurface`) discards the promise it gets back.
    await act(async () => {
      await result.current.reportInterleavedClear({ sessionId: "doomed-round" });
    });

    expect(result.current.message).toMatch(/could not be recorded/i);
    // And it must not read like a payout: no reward flash, and the copy never claims
    // the reward landed. A failure that announces "Earned…" is worse than silence.
    expect(result.current.reward).toBeNull();
    expect(result.current.message).not.toMatch(/earned/i);
    // Nor like the benign duplicate-report branch, which says the reward IS banked.
    expect(result.current.message).not.toMatch(/already counted/i);
  });

  it("announces a failed learning reconcile and re-arms it for the next load", async () => {
    // `reconcileProgress` returns void and fires an async IIFE, so its rejection had
    // nowhere to go at all — a strictly worse case than row 2's, which at least handed
    // the caller a promise to ignore.
    const session = createCityDevSession();
    session.seedFromPlacement(allNodesAt(0), []);
    await placeEverySkill(session);
    await session.advanceMasteryDev("NUM.S", 2);
    const load = await session.load();

    const { result } = renderEconomy(lessonFailsOnce());
    await waitFor(() => {
      expect(result.current.wallet).not.toBeNull();
    });

    act(() => {
      result.current.reconcileProgress(load);
    });
    await settle();

    expect(result.current.message).toMatch(/could not be recorded/i);
    expect(result.current.wallet?.spendable).toBe(0);

    // AND IT IS RE-ARMED, on the SAME hook and the SAME client — the only arrangement
    // under which this asserts anything. The fired set is optimistic (an event id is
    // recorded BEFORE its report is awaited), so without dropping the ledger prime the
    // failed node stays suppressed for the rest of the page view and the learner is
    // never paid even once the economy recovers. Here the economy has recovered, so the
    // second reconcile must pay in full.
    act(() => {
      result.current.reconcileProgress(load);
    });
    await settle();

    expect(result.current.wallet?.spendable).toBe(lessonMaterialAmount("prehistoric"));
    expect(result.current.message).toMatch(/from learning/i);
  });
});

/**
 * **THE WALLET IS ERA-SCOPED, SO AN ADVANCE IS A CHANGE TO THE READ MODEL.** Nothing is
 * earned or spent when the city turns the chapter, so without an era dependency the hook
 * had no reason to re-read and the HUD went on rendering the previous era's material and
 * count until the next grant happened to refresh it — on a fresh era, that is exactly the
 * payout the learner is watching the HUD for.
 */
describe("useEconomy — the wallet follows the era", () => {
  it("re-reads the wallet when the city advances, with nothing earned or spent", async () => {
    setCityEra("prehistoric");
    const client = createInMemoryEconomyClient();
    await client.reportLessonComplete({ nodeId: "NUM.S" });

    const { result } = renderEconomy(client);
    await waitFor(() => {
      expect(result.current.wallet).not.toBeNull();
    });
    expect(result.current.wallet?.spendableMaterial?.id).toBe("stone");
    expect(result.current.wallet?.spendable).toBe(lessonMaterialAmount("prehistoric"));

    const ledgerBefore = client.snapshot().entries.length;
    act(() => {
      setCityEra("neolithic");
    });

    await waitFor(() => {
      expect(result.current.wallet?.spendableMaterial?.id).toBe("grain");
    });
    // Era two's stockpile is empty and the era-one stone is still on the ledger: this is a
    // re-READ, not a conversion and not a write.
    expect(result.current.wallet?.spendable).toBe(0);
    expect(result.current.wallet?.materials).toEqual({
      stone: lessonMaterialAmount("prehistoric"),
    });
    expect(client.snapshot().entries).toHaveLength(ledgerBefore);
  });
});
