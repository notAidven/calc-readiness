import { parseCivicPlacementId } from "./civicIdentity";
import { REASON_BUILD_PREFIX, REASON_REPAIR_PREFIX } from "./constants";
import { buildEventId } from "./events";
import { hasEvent, materialBalanceOf } from "./ledger";
import {
  assertLedgerEntryInvariant,
  type LedgerEntry,
  type LedgerView,
  type MaterialId,
} from "./types";

/**
 * ATOMIC MATERIAL SPEND — **the only spend left**, and one of the two operations this
 * package keeps as a plain, pure, unit-tested function because getting it wrong is
 * expensive.
 *
 * It had a sibling, `spend.ts`'s `applySpend`, the atomic cosmetic purchase; that went
 * out with the shop on 2026-08-03 and this now carries every debit in the game. So the
 * three guarantees below are no longer one of two implementations of them:
 * - ATOMIC: on any rejection the balance is the ORIGINAL one and there are no rows,
 *   so an unaffordable placement leaves state completely untouched.
 * - IDEMPOTENT: the `event_id` is `build:<placement_id>`, so a replayed placement
 *   reports `already_spent` and changes nothing.
 * - NO NEW ROW FIELD: the SUBJECT travels in `reason_code` (`build:<placement_id>`),
 *   which is what the row invariant checks (design record §3).
 *
 * WHAT IT DOES NOT DO: it does not know what a civic building is, what it costs, or
 * what it provides. The caller supplies the cost, because the catalogue is Evan's
 * two-class building model and is out of this lane. INV-COS-4 still binds it: the cost
 * must be read from a server-side catalogue and never from a client payload. The `cost`
 * parameter here is that seam, not a client-supplied price.
 *
 * ## The second subject: REPAIR (`applyRepairSpend`)
 *
 * A crisis may leave a building unusable and ground scarred, and the failure floor
 * (team lead, 2026-07-30) is that all of it must be recoverable: *"crises can damage,
 * disable, scar, or reduce capacity, but they cannot undo mastery or permanently remove
 * an earned building."* Recovery is a material SPEND, which is why it lives here rather
 * than becoming a new mechanic — and why it is emphatically not a re-purchase. The
 * building was never removed, so there is nothing to buy back; what is bought is leaving
 * the ruined state.
 *
 * The two spends share `debitMaterial` below and differ in exactly one thing, their
 * subject: a build's subject is a placement (bought once, ever), a repair's is one RUIN
 * (paid once per ruin, and the same building may be ruined again later).
 */
export interface MaterialSpendInput {
  readonly studentId: string;
  /** Stable id of the thing being placed; makes the spend idempotent. */
  readonly placementId: string;
  readonly material: MaterialId;
  /** Read from a server-side catalogue, never from a client payload. */
  readonly cost: number;
  readonly nowMs: number;
}

export type MaterialSpendStatus =
  | "spent"
  | "already_spent"
  | "insufficient_material"
  | "invalid_cost";

export interface MaterialSpendResult {
  readonly status: MaterialSpendStatus;
  /** The material's stockpile AFTER a success; UNCHANGED on every rejection. */
  readonly balance: number;
  /** The single debit row to append; empty unless `status === "spent"`. */
  readonly rows: readonly LedgerEntry[];
}

/** `build:<placement_id>` — one spend per placement ever. */
export function buildEventIdFor(placementId: string): string {
  const civic = parseCivicPlacementId(placementId);
  if (civic !== null) {
    // Preserve the event bytes exactly while validating each delimiter-separated part.
    // Substituting a delimiter is not injective (`a:b` and `a-b` would collide).
    return buildEventId("build", placementId.split(":"));
  }
  return buildEventId("build", [placementId]);
}

/**
 * The whole of an atomic material debit, once its SUBJECT has been resolved to an event
 * id and a reason code.
 *
 * Extracted so the repair spend below is the build spend with a different subject rather
 * than a second implementation of the three guarantees. Those guarantees are the reason
 * this module exists, and two copies of them is exactly how one of them quietly stops
 * holding: `applyRepairSpend` would need its own balance read, its own replay check, its
 * own before-anything-is-recorded ordering, and its own row invariant call.
 */
function debitMaterial(
  view: LedgerView,
  input: {
    readonly studentId: string;
    readonly material: MaterialId;
    readonly cost: number;
    readonly nowMs: number;
    readonly eventId: string;
    readonly reasonCode: string;
  },
): MaterialSpendResult {
  const balance = materialBalanceOf(view, input.material);

  if (!Number.isFinite(input.cost) || input.cost <= 0 || !Number.isInteger(input.cost)) {
    return { status: "invalid_cost", balance, rows: [] };
  }

  if (hasEvent(view, input.eventId)) {
    return { status: "already_spent", balance, rows: [] };
  }

  // Verify the stockpile BEFORE recording anything; a shortfall leaves it untouched.
  if (balance < input.cost) {
    return { status: "insufficient_material", balance, rows: [] };
  }

  const row: LedgerEntry = {
    student_id: input.studentId,
    event_id: input.eventId,
    resource_type: input.material,
    kind: "spend",
    amount: input.cost,
    reason_code: input.reasonCode,
    created_at: new Date(input.nowMs).toISOString(),
  };
  assertLedgerEntryInvariant(row);

  return { status: "spent", balance: balance - input.cost, rows: [row] };
}

export function applyMaterialSpend(
  view: LedgerView,
  input: MaterialSpendInput,
): MaterialSpendResult {
  return debitMaterial(view, {
    studentId: input.studentId,
    material: input.material,
    cost: input.cost,
    nowMs: input.nowMs,
    eventId: buildEventIdFor(input.placementId),
    reasonCode: `${REASON_BUILD_PREFIX}${input.placementId}`,
  });
}

/* -------------------------------------------------------------------------- */
/*  Repair — putting crisis damage right                                       */
/* -------------------------------------------------------------------------- */

/**
 * WHAT WAS DAMAGED, as the three things a crisis is allowed to damage.
 *
 * The failure floor (team lead, 2026-07-30) permits a crisis to leave a building
 * unusable, ground scarred, capacity reduced or resources lost, and forbids it removing
 * an earned building or undoing mastery. So a repair's subject is never "a building the
 * player must buy back": it is a building they still own, a patch of ground they still
 * hold, or a civic building still standing with its contribution withheld — each of which
 * the crisis put into a state that costs material to leave.
 *
 * ## `civic` ARRIVED THIRD, AND ITS ABSENCE WAS A NARROW POPULATION RATHER THAN A RULING
 *
 * This read *"the two things"* until 2026-08-04, and `CrisisDamage` has always carried
 * three sets: `ruined_buildings`, `ruined_cells` and `suspended_civic`. The third had no
 * price, so it had no spend, so it had no kind — and `db/migrations/0004` nonetheless
 * minted `crisis_damage_subject` with all three members, noting of the civic one that *"it
 * lifts by other means, and no repair spend is keyed by it"*. That was true of the day it
 * was written and is not a rule: the product lead ruled on 2026-08-04 that a suspension is
 * paid off (*"paying makes sense just to keep the model consistent"*), so a spend is keyed
 * by it now and the enum the database already had is the one this type now mirrors again.
 *
 * A CIVIC SUBJECT IS THE ONE THAT CARRIES DELIMITERS. Placement ids are
 * `civic:<catalogue-id>:<sequence>` and `buildEventId` rejects a part holding a colon, so
 * {@link repairEventIdFor} splits it into its own parts exactly as {@link buildEventIdFor}
 * does — the event bytes are preserved and every delimiter-separated part is validated.
 * `db/migrations/0006_civic_placement_ids.sql` admits precisely that structured form.
 */
export type RepairSubjectKind = "building" | "ground" | "civic";

export interface RepairSpendInput {
  readonly studentId: string;
  /**
   * WHICH ROUND OF DAMAGE this repair settles — the part that makes the event id
   * unique per RUIN rather than per building.
   *
   * A building can be ruined, repaired, and ruined again by the next crisis, and both
   * repairs must be payable. Keyed on the building alone the second one would report
   * `already_spent` and the player would get a free repair — or, worse for them, a
   * building the surface believes is paid for and the ledger says nothing about.
   */
  readonly damageId: string;
  readonly subjectKind: RepairSubjectKind;
  /** The building's node id, or a ground cell's `"col,row"` key. */
  readonly subject: string;
  readonly material: MaterialId;
  /**
   * Read from an authored table, never from a client payload — the same rule
   * `applyMaterialSpend`'s `cost` carries, for the same reason (INV-COS-4). The two ruin
   * prices are the crisis's own (`HARD_WINTER.rebuild_cost_per_ruin`, 60 per ruined
   * building, and `HARD_WINTER.reclaim_cost_per_cell`, 3 per ruined cell); a `civic`
   * lift's is the CATALOGUE's, through {@link civicLiftSuspensionCost}, because a
   * suspension's subject is a building whose price this package already owns.
   */
  readonly cost: number;
  readonly nowMs: number;
}

/**
 * `repair:<damage_id>:<kind>:<subject>` — one spend per ruin ever.
 *
 * **A `civic` SUBJECT IS SPLIT INTO ITS PARTS AND NOTHING ELSE IS**, which is exactly how
 * `db/migrations/0006_civic_placement_ids.sql` scopes the same admission in SQL: a civic
 * subject matches `civic:<catalogue-id>:<sequence>`, and *"building and ground repair
 * subjects remain colon-free because each is one event-id part"*. Splitting every subject
 * would have LOOSENED the delimiter check for the two kinds that were already right —
 * `a:b` is a malformed node id and must go on throwing — so the widening is scoped to the
 * kind that needs it.
 *
 * The split preserves the event bytes and validates each delimiter-separated part, which
 * is {@link buildEventIdFor}'s own treatment of the same id for the same reason:
 * substituting a delimiter is not injective, so `a:b` and `a-b` would collide.
 */
export function repairEventIdFor(input: {
  readonly damageId: string;
  readonly subjectKind: RepairSubjectKind;
  readonly subject: string;
}): string {
  const subjectParts =
    input.subjectKind === "civic" ? input.subject.split(":") : [input.subject];
  return buildEventId("repair", [input.damageId, input.subjectKind, ...subjectParts]);
}

/**
 * **Put one piece of crisis damage right.** Atomic and idempotent on the same terms as
 * every other spend here: a rejection leaves the ledger untouched, and a replayed repair
 * of the same ruin reports `already_spent` and changes nothing.
 *
 * It knows nothing about what a ruin IS. Whether a building is ruined, and whether
 * clearing that state is legal, is game-side; this module answers only *may I afford it*
 * and *has this ruin already been paid for*. That is the same line `civicBuilding.ts`
 * draws — no grid, no collision, no coordinates — and it is why `subject` is an opaque
 * string rather than a cell.
 */
export function applyRepairSpend(
  view: LedgerView,
  input: RepairSpendInput,
): MaterialSpendResult {
  const eventId = repairEventIdFor(input);
  return debitMaterial(view, {
    studentId: input.studentId,
    material: input.material,
    cost: input.cost,
    nowMs: input.nowMs,
    eventId,
    // The subject travels in the reason code, exactly as a build's placement does, so a
    // repair needs no new row field either.
    reasonCode: `${REASON_REPAIR_PREFIX}${input.damageId}:${input.subjectKind}:${input.subject}`,
  });
}
