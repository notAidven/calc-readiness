import {
  interleavedEventId,
  LESSON_GRANT_MASTERY_BAR,
  lessonCompleteEventId,
  type MaterialBalances,
} from "@cr/economy";
import { hasPracticeEvidence } from "@cr/game";
import type { Mastery, StudentNodeState } from "@cr/state-schema";
import { useCallback, useEffect, useRef, useState } from "react";

import type { CityLoad } from "../city/types";
import { useCityEra } from "../city/useCityEra";
import { useCompletionRewards } from "../rewards/CompletionRewardProvider";
import { materialGrantReward } from "../rewards/completionRewards";
import type {
  EconomyClient,
  GrantOutcome,
  InterleavedClearOutcome,
  InterleavedResponseEvidence,
  PracticeSetCompleteOutcome,
  WalletView,
} from "./economyClient";
import { materialWord } from "./materialWord";

/** A transient reward flash for the HUD (reduced-motion-aware in the component). */
export interface RewardFlash {
  readonly key: number;
  /** The era material credited. Was `gold` until the gold-drop retired that currency. */
  readonly material: number;
}

export interface UseEconomy {
  readonly wallet: WalletView | null;
  readonly reward: RewardFlash | null;
  /** Polite announcement text for an ARIA live region. */
  readonly message: string;
  /** One-way progression observer: derive + fire idempotent earn grants. */
  readonly reconcileProgress: (load: CityLoad) => void;
  /**
   * Commit one scored lesson-practice set through the economy's single selector.
   * Returns the authoritative transaction so Presenter progression can coalesce its
   * mastery row on the same group; null means the economy could not record it.
   */
  readonly reportPracticeSetComplete: (input: {
    evidenceId: string;
    nodeId: string;
    mastery: Mastery;
    struggleLevel?: number;
  }) => Promise<PracticeSetCompleteOutcome | null>;
  /**
   * Row 2 — report a cleared interleaved session (the Town Hall's repeatable path).
   * The economy decides the amount: a flat era-material payout, and the ONLY grant the
   * anti-grind cap applies to. That cap is PER COMPLETED SET, so every paying set
   * pays in full; a repeat of a session id already on the ledger credits nothing, which
   * is a normal outcome and not an error.
   *
   * **HOW MANY SETS PAY IS BOUNDED** (`DRILL_PAID_SETS_PER_ERA`), which is a separate
   * mechanism from the per-set cap: past the era's allowance a cleared set credits
   * nothing at all. It used to credit XP, and that softening went with the XP sunset —
   * so the learner being told the remaining count on every payout is now the whole of
   * what keeps the bound from being a surprise.
   */
  readonly reportInterleavedClear: (input: {
    sessionId: string;
    /** See `EconomyClient.reportInterleavedClear`. Absent pays the full rate. */
    struggleLevel?: number;
    responses?: readonly InterleavedResponseEvidence[];
  }) => Promise<void>;
  readonly refresh: () => Promise<void>;
  /**
   * The onboarding civic-bootstrap top-up: once per founded island, so a learner
   * reaching the civic-buildings tour step can place one immediately. The economy
   * decides the amount (the era's most expensive civic building) and idempotency, so
   * this is safe to call every time the tour moment is reached, not just the first.
   *
   * Takes no era argument on the SAME reasoning `reportInterleavedClear`'s dropped
   * `islandId` documents just above: the live era is this hook's own `eraId` (from
   * `useCityEra()`), so a caller supplying it would just be forwarding a value it read
   * off the same city the hook already watches.
   */
  readonly reportCivicBootstrap: () => Promise<void>;
}

/**
 * Total material across a sparse grant record. One number, because every reward
 * surface wants "how much did I just earn" and at most one era's material is ever
 * credited by a single grant — but summing rather than picking the first key means an
 * era-advance carry-forward (which credits two materials under one event) reads
 * correctly here instead of silently reporting half of itself.
 */
function totalMaterial(materials: MaterialBalances): number {
  return Object.values(materials).reduce((sum, amount) => sum + (amount ?? 0), 0);
}

/**
 * Derive the server-verified earn events implied by the current learning state.
 *
 * **IT DERIVED TWO ROWS AND NOW DERIVES ONE.** Row 3 emitted one event per mastery star
 * reached (1..mastery), crediting XP and, by design, no currency; the XP sunset
 * (2026-08-03) leaves it crediting nothing, so the derivation, the `StarEvent` shape and
 * the per-star round trip it drove are all gone. The stars themselves are untouched —
 * they are a mastery visual over the building, and were never what row 3 paid for.
 *
 * - ROW 1 (lesson complete): a node pays when it has CLEARED THE MASTERY BAR **and**
 *   there is PRACTICE EVIDENCE for it.
 *
 *   **THE BAR REPLACED A FINISHED UNION, AND THAT IS THE RULING: currency rewards
 *   competence, not attendance.** The old first half was
 *   `completion_status === "complete" || lesson_stage === "done" || mastery >= 2`, and
 *   the middle term is what made it an attendance payment — a learner who worked all
 *   five questions and scored three lands on `done`, so the full material grant paid
 *   for turning up. This is the bar's whole cost, and it is worth stating plainly now
 *   that row 3 is gone: below-bar work used to be recognised by the star row's XP, and
 *   there is nothing paying for it any more. What a learner below the bar keeps is that
 *   they are NOT YET PAID rather than excluded — see below.
 *
 *   **The bar is `mastery >= LESSON_GRANT_MASTERY_BAR`, and that constant is DERIVED
 *   rather than assumed.** `@cr/mastery-service` maps a scored five-slot set to a
 *   persisted mastery — 5 of 5 to 3, 4 of 5 to 2, anything less to 1 — so "four of five
 *   correct" IS `mastery >= 2`, and the constant reads
 *   `masteryFromCorrectCount(MASTERY_CORRECT_COUNT)` so a change to that rule moves this
 *   gate with it. The other two terms of the old union are gone for cause rather than by
 *   simplification: `completion_status` is ALSO written `"complete"` by the test-out
 *   seed at mastery 0, and `lesson_stage: "done"` is the attendance signal itself.
 *
 *   **`practiced` STAYS as a conjunct, and it is not redundant.** Its job is the
 *   **test-out seam (G4)** (issue #102; resource-model §6, test-out amendment §8.3):
 *   testing out pre-builds a node to `lesson_stage: "done"` /
 *   `completion_status: "complete"` before the learner has answered a single item, and
 *   that hole must stay closed. Both seeds leave `last_practiced_at` null
 *   (`citySession.ts` — `seedFromPlacement` and the `placeSkill` pre-build) while every
 *   write that touches practice stamps it. Today those seeds also leave `mastery: 0`, so
 *   the bar alone would catch them — which is exactly why dropping the conjunct would be
 *   the wrong call: it would make the seam's closure depend on a property of the SEED
 *   (that it does not pre-seed mastery) rather than on a property of the GATE, and the
 *   test-out amendment's own §8.1 note that "the practice still earns every star" is a
 *   promise about today's seed, not a guarantee about the next one. (A star is now a
 *   visual rather than a payout, so that note is about what the learner SEES.)
 *
 *   Practice evidence is still deliberately NOT read on its own: `setStageDev` stamps
 *   `last_practiced_at` even when forcing a node back to an empty `site`, so it is the
 *   bar that keeps a reset node from paying.
 *
 *   **A LEARNER BELOW THE BAR IS NOT PAID YET, NOT EXCLUDED.** Practice sets are
 *   re-runnable from the building menu, and `mastery-service` writes
 *   `max(existing, evidenced)`, so a re-run can only raise mastery. The RETIMING
 *   PRECEDENT is the one this function already set for the test-out seam: emit the grant
 *   LATER from this same derivation, same event id (`lesson_complete:{node_id}`), same
 *   amounts. It must never become an event fired from a practice-completion callback — a
 *   callback-fired grant is lost on refresh, and the persisted ledger (#96/#129) can
 *   dedupe a re-derived event but can never recover one that only existed inside the
 *   session that fired it. So this stays a pure function of PERSISTED node state, and
 *   crossing the bar on the fourth attempt pays exactly what crossing it on the first
 *   would have, exactly once.
 */
function deriveEarnEvents(nodeStates: readonly StudentNodeState[]): {
  lessonNodes: string[];
} {
  const lessonNodes: string[] = [];
  for (const state of nodeStates) {
    const clearedTheBar = state.mastery >= LESSON_GRANT_MASTERY_BAR;
    // Null ONLY on the two test-out seeds; every practice write stamps it. Shared
    // with the city's copy layer (`@cr/game` — `hasPracticeEvidence`) so "practiced"
    // cannot come to mean two different things in the economy and the UI (#103).
    const practiced = hasPracticeEvidence(state);
    if (clearedTheBar && practiced) {
      lessonNodes.push(state.node_id);
    }
  }
  return { lessonNodes };
}

/**
 * Bind an {@link EconomyClient} to React state for the HUD. Holds the wallet read model,
 * a transient reward flash, and a polite announcement, and exposes the one-way
 * progression reconciler wired to `CitySurface.onCityLoad`.
 *
 * It bound the SHOP too, until the shop was sunset on 2026-08-03: `inventory`, `purchase`
 * and `equip` were the three members that served it, and `getInventory` was the second
 * half of every refresh.
 */
export function useEconomy(client: EconomyClient): UseEconomy {
  const completionRewards = useCompletionRewards();
  const [wallet, setWallet] = useState<WalletView | null>(null);
  const [reward, setReward] = useState<RewardFlash | null>(null);
  const [message, setMessage] = useState("");
  // Earn events known to be applied already — SEEDED FROM THE LEDGER, not merely
  // accumulated this page view (see `primeFromLedger`). Idempotency is also enforced
  // in the core; this avoids redundant awaits/re-renders on every reload.
  const firedRef = useRef<Set<string>>(new Set());
  // The in-flight (or finished) ledger prime, tagged with the client it read, so a
  // swapped client re-primes instead of trusting the previous client's event ids.
  const primedRef = useRef<{ client: EconomyClient; done: Promise<void> } | null>(null);
  const rewardKeyRef = useRef(0);
  const mountedRef = useRef(true);
  /**
   * The era the city is standing in — read here for ONE reason: `spendable` and
   * `spendableMaterial` are era-scoped (`economySession.spendableOf`), so an advance
   * changes the answer to `getWallet()` without anything on the economy side happening.
   * Without this the HUD kept rendering the previous era's material and count until the
   * next grant happened to refresh it, which on a fresh era is the very payout the learner
   * is looking at the HUD to see.
   *
   * It belongs in this hook rather than at the composition root because this hook owns the
   * wallet read model; a host wiring `EconomyHud` and forgetting the effect would be a
   * silently stale wallet, and there is no reason for more than one host to remember it.
   */
  const eraId = useCityEra();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    const nextWallet = await client.getWallet();
    if (mountedRef.current) {
      setWallet(nextWallet);
    }
  }, [client]);

  /**
   * **THE ONE PLACE AN ECONOMY FAILURE BECOMES VISIBLE**, and the reason it is a
   * funnel rather than a handler per call site.
   *
   * Row 2 of the earn table shipped dead for four days because a throw inside the
   * economy became a rejected promise here — every method below is `async` — and the
   * call site discarded it with a bare `void`. Nothing was logged, nothing was spoken,
   * and the drill went on counting a streak it was no longer being paid for. The defect
   * was in one string; its INVISIBILITY was structural, and the structure is what this
   * closes.
   *
   * This hook is the single boundary every economy call from the UI crosses, and it
   * already owns the learner-visible channel (`message`, rendered into the HUD's
   * `aria-live="polite"` region). So catching HERE, rather than asking each `void`-ing
   * caller to remember a `.catch`, is what makes silence impossible by construction:
   * the promises these methods return no longer reject, so discarding one is safe, and
   * a failure is spoken wherever a success would have been.
   *
   * **Spoken, not thrown, and deliberately so.** A failed grant is a bug rather than a
   * learner-actionable state, but the learner is the one whose reward is missing, and
   * an honest "this did not land" is the difference between a lost payout and a lost
   * payout that looks like a paid one. Propagating instead would take the city surface
   * down over a reward, which is worse for the same learner.
   *
   * **A message is not a substitute for a guard.** Catching makes a failure visible; it
   * cannot make it noticed. What notices is an assertion that the money LANDED rather
   * than that the call was made — `city/interleavedPayoutSeam.test.tsx` for row 2, and
   * the two tests below for this funnel itself.
   */
  const speakFailure = useCallback((sentence: string) => {
    if (mountedRef.current) {
      setMessage(sentence);
    }
  }, []);

  // `eraId` is an intentional re-read trigger, in the same idiom as `CitySurface`'s
  // `reloadToken`: it is a REAL input to `getWallet()` and simply not a lexical one, since
  // the adapter reads the era itself (`economySession.currentEra`). So the rule is right
  // that nothing here mentions it and wrong that it can be dropped — dropping it leaves the
  // HUD on the previous era's material until some unrelated grant happens to refresh it,
  // which `useEconomy.test.tsx` fails on directly.
  // biome-ignore lint/correctness/useExhaustiveDependencies: eraId re-reads the era-scoped wallet; the era is read inside the adapter, not here.
  useEffect(() => {
    void refresh().catch(() => {
      speakFailure("Could not read your wallet just now. Nothing was charged.");
    });
  }, [refresh, speakFailure, eraId]);

  /**
   * Seed the already-fired set from the PERSISTED LEDGER before reconciling (#96).
   *
   * `reconcileProgress` runs on every city load and re-derives rows 1 and 3 from
   * learning state, which is fine for a ledger that outlives the page and wrong for
   * one that does not: with the ledger gone, every lesson and star "re-earned" while
   * the SPENDS stayed gone, so a refresh refunded gold, deleted the bought cosmetic,
   * and fired a full-total reward toast every single time. Asking the economy which
   * events it has already recorded makes the ledger — not learning state — the thing
   * that decides what is new. Read once per client and shared by every reconcile, so
   * concurrent loads cannot each replay the same events.
   */
  const primeFromLedger = useCallback((): Promise<void> => {
    if (primedRef.current?.client !== client) {
      firedRef.current = new Set();
      primedRef.current = {
        client,
        done: client
          .appliedEventIds()
          .then((ids) => {
            for (const id of ids) {
              firedRef.current.add(id);
            }
          })
          .catch(() => {
            // A failed read must not wedge reconciliation: the core is idempotent on
            // `event_id`, so the worst case is redundant no-op reports.
          }),
      };
    }
    return primedRef.current.done;
  }, [client]);

  const reconcileProgress = useCallback(
    (load: CityLoad) => {
      void (async () => {
        await primeFromLedger();
        // Row 1 is re-derived from learning state on every city load, so a failed
        // report here is recoverable: the next load re-derives it. What is NOT
        // recoverable is not knowing it failed, which is why the catch below speaks.
        const { lessonNodes } = deriveEarnEvents(load.node_states);
        let grantedMaterial = 0;

        for (const nodeId of lessonNodes) {
          const id = lessonCompleteEventId(nodeId);
          if (firedRef.current.has(id)) {
            continue;
          }
          firedRef.current.add(id);
          const outcome = await client.reportLessonComplete({ nodeId });
          if (outcome.applied) {
            grantedMaterial += totalMaterial(outcome.grantedMaterials);
          }
        }

        if (grantedMaterial > 0) {
          await refresh();
          if (mountedRef.current) {
            rewardKeyRef.current += 1;
            setReward({ key: rewardKeyRef.current, material: grantedMaterial });
            setMessage(`Earned ${grantedMaterial} ${materialWord(eraId)} from learning.`);
          }
        }
      })().catch(() => {
        // A partial reconcile is possible — an earlier node may already have paid — so
        // this says what is true of the batch rather than claiming nothing landed. The
        // event ids are idempotent, so the next city load retries whatever did not.
        speakFailure("Some learning rewards could not be recorded. Reload to try again.");
        // The fired set is optimistic (an id is added BEFORE its report), so a failed
        // report would otherwise be suppressed for the rest of this page view. Dropping
        // the prime makes the next load re-read the ledger and re-derive honestly.
        primedRef.current = null;
      });
    },
    // Stable identity (no `wallet` dep) so wiring it to CitySurface.onCityLoad does
    // not re-fire on every wallet change; the mount effect handles the first load.
    [client, primeFromLedger, refresh, speakFailure, eraId],
  );

  const reportInterleavedClear = useCallback(
    async (input: {
      sessionId: string;
      struggleLevel?: number;
      responses?: readonly InterleavedResponseEvidence[];
    }) => {
      let outcome: InterleavedClearOutcome;
      try {
        outcome = await client.reportInterleavedClear(input);
      } catch {
        // THE ROUND THAT PAID NOTHING NOW SAYS SO. This is the exact branch the colon
        // in the session id took for four days, in silence. A cleared round is real
        // work, so the copy names the missing reward rather than the internal cause.
        speakFailure(
          "That practice round could not be recorded, so its reward is not in the bank.",
        );
        return;
      }
      await refresh();
      if (!mountedRef.current) {
        return;
      }
      const material = totalMaterial(outcome.grantedMaterials);
      if (material === 0) {
        // **TWO DIFFERENT NOTHINGS, AND TELLING THEM APART IS NOW THIS BRANCH'S JOB.**
        //
        // Until the XP sunset a set past the era's drill bound still credited XP, so it
        // was an `applied` grant with a smaller reward and could not reach here at all;
        // the only way to a zero payout was replaying a session id the ledger already
        // held. Both now arrive identically — `applied: false`, nothing credited — so
        // `applied` can no longer decide the copy, and using it would tell a learner who
        // has spent the era's allowance that their set "was already counted", which is
        // false and unactionable.
        //
        // `setsRemaining` is the discriminator, and it is derived server-side from the
        // ledger rather than from anything this hook is tracking.
        setMessage(
          outcome.setsRemaining === 0
            ? // PAST THE BOUND. It names what brings the reward back, because "you have
              // reached a limit" with no way forward reads as a punishment. The drill
              // keeps running and the streak keeps counting either way.
              `This era's drill has paid out all ${outcome.setsBound} of its sets, so that round earned no ${materialWord(eraId)}. Practice still counts, and the next era brings a fresh mix and a fresh allowance.`
            : // A DOUBLE REPORT of one set, inside the allowance. This said "earning cap
              // reached" while the cap was a rolling 24h window; the cap is per completed
              // set now, so there is no throttle to have hit.
              "That practice set was already counted, and its reward is in the bank.",
        );
        return;
      }
      const eventId = interleavedEventId(input.sessionId);
      completionRewards.enqueue(
        materialGrantReward({
          id: eventId,
          groupKey: eventId,
          context: "Practice complete",
          grantedMaterials: outcome.grantedMaterials,
        }),
      );
      rewardKeyRef.current += 1;
      setReward({ key: rewardKeyRef.current, material });
      // **THE BOUND IS SAID ON EVERY PAID SET, NOT DISCOVERED AT THE LAST ONE.** The
      // lead's objection to a taper was that it is invisible to the player; a hard stop
      // the learner is not counted down to fails that same test, so the remaining count
      // rides on every payout from the era's first set. That was always true and it
      // matters more now: past the bound there is no consolation payout left to soften
      // the cliff, so the warning is the whole of the softening.
      setMessage(
        `Earned ${material} ${materialWord(eraId)} from interleaved practice. ${
          outcome.setsRemaining === 0
            ? `That is the last set this era pays ${materialWord(eraId)} for.`
            : `${outcome.setsRemaining} more paying ${
                outcome.setsRemaining === 1 ? "set" : "sets"
              } in this era.`
        }`,
      );
    },
    [client, completionRewards, refresh, speakFailure, eraId],
  );

  const reportPracticeSetComplete = useCallback(
    async (input: {
      evidenceId: string;
      nodeId: string;
      mastery: Mastery;
      struggleLevel?: number;
    }): Promise<PracticeSetCompleteOutcome | null> => {
      let outcome: PracticeSetCompleteOutcome;
      try {
        outcome = await client.reportPracticeSetComplete(input);
      } catch {
        speakFailure(
          "That completed practice set could not be recorded, so its reward is not in the bank.",
        );
        return null;
      }
      await refresh();
      if (!mountedRef.current) {
        return outcome;
      }
      if (outcome.rewardKind === "skill_completion") {
        // The transaction id is keyed by evidence for replay safety, while progression
        // reconciliation knows the skill event. Mark that semantic event locally so the
        // city refresh cannot issue a redundant report in this same render cycle.
        firedRef.current.add(lessonCompleteEventId(input.nodeId));
      }
      const material = totalMaterial(outcome.grantedMaterials);
      if (material === 0) {
        setMessage(
          outcome.setsRemaining === 0
            ? `This skill's era has paid out all ${outcome.setsBound} repeat sets, so that set earned no ${materialWord(outcome.rewardEra)}.`
            : "That practice set was already counted, and its reward is in the bank.",
        );
        return outcome;
      }
      completionRewards.enqueue(
        materialGrantReward({
          id: outcome.eventId,
          groupKey: outcome.groupKey,
          context: "Practice complete",
          grantedMaterials: outcome.grantedMaterials,
        }),
      );
      rewardKeyRef.current += 1;
      setReward({ key: rewardKeyRef.current, material });
      setMessage(
        outcome.rewardKind === "skill_completion"
          ? `Earned ${material} ${materialWord(outcome.rewardEra)} for completing this skill.`
          : `Earned ${material} ${materialWord(outcome.rewardEra)} from a completed practice set.`,
      );
      return outcome;
    },
    [client, completionRewards, refresh, speakFailure],
  );

  const reportCivicBootstrap = useCallback(async () => {
    let outcome: GrantOutcome;
    try {
      outcome = await client.reportCivicBootstrap({ eraId });
    } catch {
      // Silent by design if this happens: the tour still opens the Civic tab and shows
      // the learner what they can build, they just may not be able to afford it yet.
      // Nothing here is a learner-actionable failure the way a lost practice reward is.
      return;
    }
    if (!outcome.applied) {
      // Idempotent replay (a second tour pass, a remount) — already granted, nothing to
      // refresh.
      return;
    }
    // Silent top-up: the learner just gets to afford the civic building the tour is
    // about to point at, no reward toast or animation for it.
    await refresh();
  }, [client, refresh, eraId]);

  return {
    wallet,
    reward,
    message,
    reconcileProgress,
    reportPracticeSetComplete,
    reportInterleavedClear,
    reportCivicBootstrap,
    refresh,
  };
}
