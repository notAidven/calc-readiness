/**
 * The economy's core value types (pure, storage-agnostic). Nothing here imports a
 * DB row, a wire type, or a framework — the SAME shapes are reused by the
 * in-memory dev adapter and, later, the Aurora Lambda, so grant/spend semantics
 * can never drift between demo and production.
 *
 * FROZEN-PACKAGE NOTE: these types are deliberately LOCAL to `@cr/economy`. They
 * are NOT added to `@cr/state-schema` yet — that frozen, one-owner package is
 * unfrozen for economy wire types in a later, deliberately-gated phase (plan P3).
 */

import { SPEND_REASON_PREFIXES } from "./constants";

/**
 * The ten ERA MATERIALS (era design D-ERA13: "one spendable resource, era-themed").
 * These are ids only — WHICH era mints which, and whether it may be minted at all,
 * is `materials.ts`'s registry, where exactly one era is authored today.
 *
 * **THEY ARE NOW THE WHOLE OF THE ECONOMY'S VOCABULARY.** There used to be a second
 * union beside this one, `ResourceType`, whose only member was `xp`, and the pair had
 * to be kept disjoint because `applyGrant` iterates their concatenation. XP was sunset
 * on 2026-08-03 (team lead: *"sunset the cosmetic shop and xp systems completely - they
 * dont really have a role in our game"*), so a ledger row is denominated in a material
 * and there is nothing left for it to collide with. The disjointness guard went with
 * the union it was about rather than staying green over one set.
 *
 * EVERY NAME HERE IS RECOGNISABLE AT A GLANCE, which is a team-lead ruling
 * (2026-07-29) and not a stylistic preference. Two failure modes it rules out:
 *
 * - A SPECIMEN OF A FAMILIAR CATEGORY. Flint is a kind of stone, a florin is a kind
 *   of coin, an ingot is a shape metal comes in. Name the category, not the specimen.
 * - A UNIT OF MEASUREMENT RATHER THAN A THING. Kilowatt-hours and compute cycles
 *   measure a substance instead of being one. Name the substance, not its unit.
 *
 * These are therefore NO LONGER transcriptions of the ten `civic-buildings.md` §1
 * proposals; they are the lead's rule applied to Evan's identities. `materials.ts`
 * records which name is whose, and the design record carries the before/after table
 * and the eras whose documents are now stale.
 *
 * `gold` IS ERA FIVE'S, on the lead's own suggestion, and it is what the gold-drop
 * bought. While a currency held the word an era could not take it — `resource_type`
 * would have been ambiguous between a currency and a material on one shared ledger.
 *
 * It also completes the one ladder nobody has to be taught: **bronze, silver, gold**
 * across eras three, four and five.
 *
 * `coins` IS NOW A RETIRED WORD, not a live id — era five's previous value, itself
 * only ever a fallback for `gold` being unavailable. Kept readable in `materials.ts`'s
 * `renamed_from` and asserted there in both directions.
 */
export type MaterialId =
  | "stone"
  | "grain"
  | "bronze"
  | "silver"
  | "gold"
  | "gems"
  | "coal"
  | "electricity"
  | "silicon"
  | "data";

/** Value form of {@link MaterialId}, in era order. */
export const MATERIAL_IDS: readonly MaterialId[] = [
  "stone",
  "grain",
  "bronze",
  "silver",
  "gold",
  "gems",
  "coal",
  "electricity",
  "silicon",
  "data",
];

/**
 * Every resource a ledger row can be denominated in, in a stable order. `applyGrant`
 * iterates THIS, so row order in the ledger is deterministic, and the dev-persistence
 * parser derives its allow-list from it rather than keeping a hand-written copy that
 * can go stale.
 *
 * It is exactly {@link MATERIAL_IDS} now that XP is gone, and it is kept as its own
 * name because the two say different things: one is "the era materials", the other is
 * "what the ledger admits". A row in a resource that is not a material is the shape
 * this economy no longer has.
 */
export const ECONOMY_RESOURCES: readonly MaterialId[] = MATERIAL_IDS;

const MATERIAL_ID_SET: ReadonlySet<string> = new Set<string>(MATERIAL_IDS);

export function isMaterialId(value: unknown): value is MaterialId {
  return typeof value === "string" && MATERIAL_ID_SET.has(value);
}

/** Every ledger row is either a grant (credit) or a spend (debit); §8.2. */
export type EconomyTxnKind = "grant" | "spend";

/**
 * A material stockpile snapshot. SPARSE on purpose: at most one era's material is
 * live at a time, so an absent key means zero rather than "unknown". Read it
 * through `materialBalanceOf` to get the zero.
 */
export type MaterialBalances = Readonly<Partial<Record<MaterialId, number>>>;

/**
 * One append-only ledger row (resource spec §8.2). `amount` is always > 0; `kind`
 * carries the sign (`grant` adds, `spend` subtracts). The idempotency key is the
 * composite `(student_id, event_id, resource_type)` (D-R5): an era-advance
 * carry-forward writes a debit leg and a credit leg under one `event_id`.
 *
 * **A `cosmetic_id` COLUMN SAT HERE UNTIL 2026-08-03**, set on a cosmetic purchase and
 * null on every other row, with an invariant clause enforcing exactly that. Both went
 * out with the shop: with nothing to buy, the column would have been null on every row
 * ever written and the clause would have been an assertion over an empty population —
 * green, and measuring nothing. `db/migrations/0007_sunset_cosmetics_and_xp.sql` drops
 * the same column and the same two CHECKs from Aurora.
 */
export interface LedgerEntry {
  readonly student_id: string;
  readonly event_id: string;
  readonly resource_type: MaterialId;
  readonly kind: EconomyTxnKind;
  /** Always > 0; the sign is carried by `kind`. */
  readonly amount: number;
  /**
   * 'lesson_complete' | 'lesson_complete:<node_id>' | 'interleaved' | 'build:<placement_id>' |
   * 'repair:<damage_id>:<kind>:<subject>' | 'era_advance:<era_id>'.
   *
   * A material spend's SUBJECT travels here (and its identity in `event_id`), which
   * is why materials needed no new field on the row.
   */
  readonly reason_code: string;
  readonly created_at: string;
}

/**
 * The pure core's read model of prior state: the append-only ledger — the single
 * RECONSTRUCTABLE source of truth (`balance = sum(grants) - sum(spends)`, §5.3).
 * Conceptually one student's rows; the caller scopes it. Balances and the cap window
 * are DERIVED from these entries, so there is no separately-mutated balance the
 * client could invent (INV-COS-4).
 */
export interface LedgerView {
  readonly entries: readonly LedgerEntry[];
}

/** An empty starting view (a student who has earned/spent nothing). */
export const EMPTY_LEDGER_VIEW: LedgerView = { entries: [] };

/**
 * Fail-loud guard for the structural ledger invariants (mirrors the DB CHECKs in
 * resource spec §8.2). Keeps a malformed row from ever entering the ledger:
 * - An amount is a positive finite number.
 * - A `spend` must NAME ITS SUBJECT via a {@link SPEND_REASON_PREFIXES} reason.
 *
 * **TWO CLAUSES WENT WITH THE SUNSET, and neither could have been kept honestly.**
 * *"XP is never spendable"* quantified over `NON_SPENDABLE_RESOURCES`, a set whose
 * only member was xp; with xp gone the set is empty and the clause admits every row.
 * *"`cosmetic_id` is set iff the row is a cosmetic purchase"* guarded a column that no
 * longer exists. An assertion left standing over an emptied population is the failure
 * mode `.cursor/rules/qa-verification.mdc` names, so both were deleted rather than
 * left to report green.
 *
 * **THE MIDDLE CLAUSE IS WHAT SURVIVES, AND IT IS LOAD-BEARING.** It was added when
 * the `cosmetic_id` rule was re-keyed off the purchase prefix, because that re-keying
 * opened a real hole: a spend with a GRANT's reason code and no subject became a legal
 * row — material leaving the wallet for no stated reason. That hole is still open
 * without this clause, and the cosmetic rule is no longer there to catch it
 * incidentally, so it now carries the whole of what it used to share.
 */
export function assertLedgerEntryInvariant(entry: LedgerEntry): void {
  if (entry.amount <= 0 || !Number.isFinite(entry.amount)) {
    throw new Error(
      `economy ledger: amount must be a positive finite number (${entry.amount}).`,
    );
  }
  if (
    entry.kind === "spend" &&
    !SPEND_REASON_PREFIXES.some((prefix) => entry.reason_code.startsWith(prefix))
  ) {
    throw new Error(
      `economy ledger: a spend must name its subject — reason_code "${entry.reason_code}" ` +
        `is none of ${SPEND_REASON_PREFIXES.join(", ")}.`,
    );
  }
}
