import type {
  CivicBuildingDefinition,
  CivicPurchaseStatus,
  MaterialBalances,
  MaterialIdentity,
  MaterialSpendStatus,
  RepairSubjectKind,
} from "@cr/economy";
import type { EraId } from "@cr/skill-graph";
import type { Mastery } from "@cr/state-schema";

import type {
  IslandFoundingAuthority,
  IslandUnlockExamResponseOutcome,
  IslandUnlockExamResponseRequest,
} from "../city/islandUnlockAuthority";
import {
  createEconomyDevStore,
  loadEconomyDevSnapshot,
  withEconomyDevPersistence,
} from "../devPersistence/economyPersistence";
import { createInMemoryEconomyClient } from "./economySession";

/**
 * The economy client seam. Both adapters — the in-memory dev adapter
 * (`economySession.ts`) and, later, the `services/economy-api` Lambda — satisfy
 * this SAME interface and delegate all rule math to the one `@cr/economy` core, so
 * grant/spend semantics can never drift between the demo and production.
 *
 * The client NEVER invents balances (INV-COS-4): a purchase/grant returns
 * server-authoritative balances, and the earn "report" methods only tell the
 * economy that a server-verified progression event happened — the economy decides
 * the amounts.
 */

/**
 * Wallet read-out: the era-material stockpiles, and the one number every sink spends.
 *
 * **IT CARRIED TWO MORE FIELDS UNTIL 2026-08-03**: `balances` (the xp/gold projection)
 * and `xpLevel` (the derived level + rank title the HUD's meter drew). Both went with
 * the XP sunset, so `materials` and its `spendable` projection are the whole wallet.
 * This seam is where the material axis STOPS: rendering it is game-side consumption and
 * so Evan's per `OWNERS.md`, and era one §6 requires that readout to be in the DOM
 * because the canvas is `aria-hidden`.
 */
export interface WalletView {
  readonly materials: MaterialBalances;
  /**
   * **THE ONE SPENDABLE NUMBER: the current era's material stockpile.**
   *
   * Since the gold-drop there is exactly one currency, and every sink — civic
   * buildings, roads, crisis repair — draws on it. This field exists so a caller that just
   * wants "can I afford this" reads one number, the way it read `balances.gold`
   * before, rather than each surface re-deriving the era and indexing the sparse
   * `materials` record itself. Three surfaces doing that independently is how they
   * drift.
   *
   * `materials` is still the full picture and is still what a per-era readout wants.
   */
  readonly spendable: number;
  /** What `spendable` is denominated in, for a label. Null in an unauthored era. */
  readonly spendableMaterial: MaterialIdentity | null;
}

/** The outcome of an earn report (grant): the post-grant stockpiles. */
export interface GrantOutcome {
  readonly applied: boolean;
  /** Material stockpiles after the grant. */
  readonly materials: MaterialBalances;
  /** Material credited BY this grant — the era lump on a lesson completion. */
  readonly grantedMaterials: MaterialBalances;
}

/**
 * A cleared drill set's outcome: the grant, plus **where the learner now stands against
 * this era's drill bound** (`DRILL_PAID_SETS_PER_ERA`).
 *
 * The two extra fields exist so the UI can SAY the bound rather than let a learner
 * discover it by hitting it — the lead's stated objection to a taper was that it is
 * invisible, and a hard stop nobody is warned about fails the same test. They are
 * derived server-side from the ledger, like every other number crossing this seam, so a
 * client can neither invent them nor drift from the count the grant was decided on.
 */
export interface InterleavedClearOutcome extends GrantOutcome {
  /** Drill sets this era has paid material for, INCLUDING this one. */
  readonly paidSets: number;
  /** How many more this era will pay for. Zero once the bound is spent. */
  readonly setsRemaining: number;
  /** The bound itself, so copy never hardcodes it. */
  readonly setsBound: number;
}

/** One scored lesson-practice set's single selected economy transaction. */
export interface PracticeSetCompleteOutcome extends InterleavedClearOutcome {
  readonly eventId: string;
  /** The practised skill's era, which decides the credited material. */
  readonly rewardEra: EraId;
  /**
   * The first qualifying set coalesces with the skill-building event; repeats stand alone.
   * This can differ from `eventId`, whose job is durable idempotency for the scored set.
   */
  readonly groupKey: string;
  readonly rewardKind: "skill_completion" | "repeat_practice";
}

/** One raw answer the server can recompute; no client correctness flag crosses the seam. */
export interface InterleavedResponseEvidence {
  readonly itemVersionId: string;
  readonly rawAnswer: unknown;
}

/**
 * A repair's ask: WHICH RUIN, and what the crisis's own tuning table charges for it.
 *
 * `cost` is passed in rather than looked up because the price belongs to the CRISIS, not to
 * the economy: era one's two figures are authored in `hard-winter-tuning.ts` and derived
 * against each other. The rule INV-COS-4 actually cares about is that the price never comes
 * from a client PAYLOAD, and it does not — the caller reads it from
 * `hardWinterRepairPrices()`, the same seam `applyMaterialSpend`'s `cost` was left open for
 * a server-side catalogue.
 */
export interface RepairAsk {
  /** Which round of damage this settles; part of the idempotency key. */
  readonly damageId: string;
  readonly subjectKind: RepairSubjectKind;
  /** The building's node id, or a ground cell's `"col,row"` key. */
  readonly subject: string;
  readonly cost: number;
}

/**
 * The outcome of a repair spend: status + the (unchanged-on-rejection) spendable balance.
 *
 * There is no `repaired` field, and that is the seam holding: whether the RUIN is cleared is
 * the city session's business, and this reports only whether the material left the wallet.
 * `city/crisisRepair.ts` is the one place that joins them.
 */
export interface RepairOutcome {
  readonly status: MaterialSpendStatus | "era_material_unauthored";
  /** The era material's stockpile after the spend; UNCHANGED on a rejection. */
  readonly spendable: number;
  /** What it cost, on a spend that landed; 0 on every rejection. */
  readonly cost: number;
}

/**
 * **A civic building purchase ask: WHICH placement, and WHICH catalogue row.**
 *
 * This is the seam `civicEconomy.ts` names as missing — *"`@cr/economy` has the right
 * primitive for it, `applyMaterialSpend` ... What it does NOT have is a way to reach it:
 * `EconomyClient` exposes `purchaseCosmetic` and the three earn reports, and no material
 * spend at all."* (Both of the surfaces that sentence names are gone now — the cosmetic
 * purchase with the shop, row 3 with XP — so this IS the spend surface.) This is the way to reach it, and it goes through the LEDGER, so a
 * civic spend needs no session counter riding alongside it to survive a refresh.
 *
 * ## The two fields, and the three that are deliberately absent
 *
 * - `placementId` — **the idempotency key**, and the whole reason this shape beats a
 *   netted counter. A stable id for this one instance, minted once when the placement is
 *   created and reused on every retry; the ledger event is `build:<placement_id>`, so a
 *   double-click, a re-render or a replayed queue reports `already_spent` and debits
 *   nothing. It must contain no `:`, which is the id delimiter. Two placements of the
 *   same building type differ here and only here.
 * - `building` — the catalogue row's shipped `id` (`prehistoric_longhouse`), never its
 *   display name. Ids are stable across renames by design and four have been renamed
 *   already; a display name is not a key.
 *
 * **No `cost`** — the price is read from `CIVIC_CATALOGUE` inside the core, so a client
 * can never name its own (INV-COS-4). **No `material`** — the era decides it. **No
 * `era`** — the adapter knows which era the player is in; a caller that passed one could
 * buy an era-three building with era-one stone.
 */
export interface CivicPurchaseAsk {
  /** Stable id for this placement instance; the spend's idempotency key. */
  readonly placementId: string;
  /** The catalogue row's shipped `id`, e.g. `prehistoric_longhouse`. */
  readonly building: string;
}

/**
 * The outcome of a civic purchase: status + the (unchanged-on-rejection) spendable
 * balance + what it cost + what was bought.
 *
 * There is no `placed` field, and that is the seam holding — exactly as `RepairOutcome`
 * carries no `repaired`. Whether the building goes on the grid, and whether that
 * placement is legal, is the city's business; this reports only whether the material
 * left the wallet. Fail-closed: on any status but `spent`, `cost` is 0, `building` is
 * null, and the ledger is untouched.
 */
export interface CivicPurchaseOutcome {
  readonly status: CivicPurchaseStatus;
  /** The era material's stockpile after the spend; UNCHANGED on a rejection. */
  readonly spendable: number;
  /** What it cost at this era's scale; 0 on every rejection. */
  readonly cost: number;
  /** The catalogue row that was bought; null on every rejection. */
  readonly building: CivicBuildingDefinition | null;
}

export interface EconomyClient {
  /** The era-material stockpiles and the one spendable number. */
  getWallet(): Promise<WalletView>;
  /**
   * The `event_id`s already recorded in the ledger — i.e. the earn events that have
   * ALREADY been applied and must not be reported again.
   *
   * This is what makes progression reconciliation ledger-driven rather than
   * learning-state-driven (#96). `applyGrant` is idempotent on `event_id`, so a
   * replay was always harmless to BALANCES; what was not harmless was deciding
   * "already granted?" from an in-memory set that a refresh emptied. Reading the
   * answer back out of the ledger is the one form the server adapter can answer
   * too, so `useEconomy` needs no dev-only branch.
   */
  appliedEventIds(): Promise<readonly string[]>;
  /**
   * Atomic material spend PUTTING ONE PIECE OF CRISIS DAMAGE RIGHT. Fail-closed like a
   * purchase: the balance moves only on `spent`, and a replay of the same ruin reports
   * `already_spent` and changes nothing.
   *
   * It is a SPEND and not a grant, which is what keeps crisis recovery clear of the
   * no-passive-generation ruling: nothing here mints anything, no clock is read, and the
   * only way to fund it is the same way everything else is funded — completing lessons and
   * practice sets.
   */
  repairRuin(input: RepairAsk): Promise<RepairOutcome>;
  /**
   * **Atomic, LEDGER-BACKED material spend buying one civic building.** Fail-closed like
   * a repair: the balance moves only on `spent`, and a replay of the same
   * `placementId` reports `already_spent` and changes nothing.
   *
   * The price is read from `CIVIC_CATALOGUE` and the material from the era registry, so
   * neither can come from a caller (INV-COS-4). See {@link CivicPurchaseAsk} for exactly
   * what to pass and what not to.
   */
  purchaseCivicBuilding(input: CivicPurchaseAsk): Promise<CivicPurchaseOutcome>;
  /** One lesson's material advanced when a later island is founded; idempotent per era. */
  reportIslandFounded(input: {
    eraId: EraId;
    authority?: IslandFoundingAuthority;
  }): Promise<GrantOutcome>;
  /**
   * The onboarding civic-bootstrap top-up: once per founded island, sized to that
   * era's single most expensive civic building, so the tour's "Build" step hands the
   * learner a purchase they can actually make rather than one they're only told about.
   * Idempotent per era, same as {@link reportIslandFounded}.
   */
  reportCivicBootstrap(input: { eraId: EraId }): Promise<GrantOutcome>;
  /**
   * Account authority derives and atomically founds the inclusive diagnostic prefix.
   * Local sessions may omit this and commit the same canonical prefix in their bay session.
   */
  foundDiagnosticPrefix?(): Promise<{
    readonly unlockedEras: readonly EraId[];
    readonly destinationEra: EraId;
    readonly allMastered: boolean;
  }>;
  /** Account-only bounded request; the server grades and advances one exam response. */
  recordIslandExamResponse?(
    input: IslandUnlockExamResponseRequest & { readonly eraId: EraId },
  ): Promise<IslandUnlockExamResponseOutcome>;
  /** Account-only authoritative current-island pointer write. */
  landOnIsland?(input: { readonly eraId: EraId }): Promise<void>;
  /** Restore a reset island's material balance to that era's authored total. */
  resetIslandWallet(input: { eraId: EraId }): Promise<void>;

  /* ---- The internal grant surface: report a server-verified earn trigger. ---- */
  /**
   * One completed lesson-practice set, keyed by the mastery service's evidence id.
   *
   * The economy centrally selects the one-time skill-completion amount or the bounded
   * repeat-practice amount. Callers may not invoke both recipes, which prevents a first set
   * from double-awarding while allowing each genuinely new repeat set to earn.
   */
  reportPracticeSetComplete(input: {
    evidenceId: string;
    nodeId: string;
    mastery: Mastery;
    struggleLevel?: number;
  }): Promise<PracticeSetCompleteOutcome>;
  /** Row 1 — a node's lesson/building completed (the era material). Idempotent per node. */
  reportLessonComplete(input: { nodeId: string }): Promise<GrantOutcome>;
  /**
   * Row 2 — an interleaved session cleared (the era material; capped, and BOUNDED: only
   * the era's first `DRILL_PAID_SETS_PER_ERA` cleared sets pay).
   *
   * `reportStar` was row 3 and is gone with the XP sunset: a star paid XP and, by design,
   * no currency, so with XP retired the report would have credited nothing per star per
   * city load.
   *
   * The `islandId` this took was read by exactly one thing, the condition clock's
   * per-island restore timestamp, and went out with it. A required argument that
   * every caller computes and every adapter discards is the same defect as
   * `createEconomyClient`'s ignored `hasCognitoAuth` below, so it is removed rather
   * than left for the server adapter to inherit. **The bound does not reintroduce one:**
   * the count is a row count over the persisted ledger, so it reads no instant and a
   * caller supplies nothing new.
   */
  reportInterleavedClear(input: {
    sessionId: string;
    /**
     * How hard the learner was finding the skills this round mixed, in `[0, 1]`.
     * `interleavedPayout` reads between the drill's floor and ceiling on it, so a round of
     * skills already in hand pays less than one that fought back.
     *
     * **OPTIONAL, AND ABSENT MEANS THE FULL RATE** rather than the reduced one: a caller
     * with no reading has not shown the learner has mastered anything, and the taper is a
     * consequence of demonstrated command. It is why every surface that funds a wallet by
     * clearing sets is unaffected by the taper existing.
     *
     * A SCALAR, WHICH IS WHAT KEEPS INV-COS-1 INTACT. The economy is handed a number; it
     * never learns which skills produced it and never reaches back for them.
     */
    struggleLevel?: number;
    /**
     * Required by the authenticated adapter and optional only for the browser-local demo,
     * whose in-memory economy has no backend or login to verify against.
     */
    responses?: readonly InterleavedResponseEvidence[];
  }): Promise<InterleavedClearOutcome>;
}

/**
 * Whether the economy should be SERVER-BACKED — the same gate the city loader
 * reads (`api.ts` `isServerBacked`): BOTH a signed-in Cognito user AND a
 * configured API URL (resource spec §13). Exposed for when the server adapter
 * lands; today it only informs {@link createEconomyClient}.
 *
 * [Flag G2 — economy API topology/URL is an OPEN decision (plan §Gaps G2). The
 * recommendation is a separate Lambda behind the SAME `/api` origin, reusing this
 * gate; nothing about that is decided here.]
 */
export { isServerBacked as isEconomyServerBacked } from "../api";

/**
 * Build the economy client for the current environment. The server-backed economy
 * (`services/economy-api`) is a LATER phase (persistence plan Wave 2 G); until it
 * exists the in-memory core runs regardless of auth, so the full earn→spend→equip
 * loop is demonstrable with `npm run dev` and no backend — exactly like
 * `work-upload/store.ts`.
 *
 * The in-memory adapter is opened on — and saves itself back to — the DEV-ONLY
 * economy store (#96), the sibling of the city's `devSessionStore`. That store is
 * inert whenever the app could ever be server-backed, so this wiring adds no
 * browser-side writer of real student state; see `economyPersistence.ts`.
 *
 * ## THE GATE IS ASKED HERE, WITH THE STRONGEST AUTH STATE. Do not reintroduce a flag.
 *
 * This function used to take a `hasCognitoAuth` boolean that it ignored, and `App`
 * computed one anyway from `authedCity !== null`. That value is `null` on the first
 * render BY CONSTRUCTION — the Cognito identity resolves behind a lazy `import()` —
 * and the ref null-check around the call means it is never re-evaluated, so a
 * signed-in learner on a deployed build reached this line as `false`. Harmless while
 * the argument was unused, and "the entire economy lane silently does nothing for
 * 100% of users" the moment an adapter is gated on it.
 *
 * So the answer comes from {@link isEconomyServerBacked} asked with `true`, exactly
 * as `isDevPersistenceEnabled` does and for the same reason (`devSession.ts`): the
 * question is "could this app EVER be server-backed", which the deployment shape
 * answers synchronously, from the first frame, and wrong only in the safe direction.
 *
 * ONE ask, ONE answer, for both decisions this root makes — today the dev store's,
 * and, when the Lambda lands, which adapter to return:
 *
 * ```ts
 * if (serverBacked) return createServerEconomyClient();
 * ```
 *
 * Guarded by `economyClientGate.test.ts` (this function, driven) and
 * `economyClientGate.composition.test.tsx` (`App`'s call, driven). Both were red
 * before this change; the second still prints the old `[false]` if the flag returns.
 */
export function createEconomyClient(): EconomyClient {
  const store = createEconomyDevStore();
  return withEconomyDevPersistence(
    createInMemoryEconomyClient(loadEconomyDevSnapshot(store)),
    store,
  );
}
