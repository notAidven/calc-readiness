import { capRemaining } from "./cap";
import { isCappedReason } from "./constants";
import { computeMaterialBalances, hasEvent } from "./ledger";
import {
  assertLedgerEntryInvariant,
  ECONOMY_RESOURCES,
  type LedgerEntry,
  type LedgerView,
  type MaterialBalances,
  type MaterialId,
} from "./types";

/**
 * Idempotent grant of a SET of resources under one deterministic `event_id`
 * (resource spec §6, §8.5; D-R9). This is one of the two most bug-prone
 * operations in the whole economy, so it is a plain, pure, unit-tested function.
 *
 * Two guarantees:
 * - IDEMPOTENT: replaying a grant whose `event_id` is already in the ledger is a
 *   no-op (`applied: false`, no rows) — a grant can never double-credit.
 * - ATOMIC & MULTI-ROW: an era-advance carry-forward credits two materials under ONE
 *   `event_id`; the caller appends `rows` together or not at all.
 *
 * **THE MULTI-ROW SHAPE IS WHY THE LOOP ITERATES A DECLARED ORDER.** It walks
 * {@link ECONOMY_RESOURCES} rather than the caller's keys, so row order in the ledger
 * is a property of the package and not of whatever object literal a recipe built. That
 * used to carry a second load: the list was two unions concatenated, and an id present
 * in both would have been visited twice and written two rows for one key under one
 * `event_id`, breaking the `(student_id, event_id, resource_type)` key. There is one
 * union now, so the double-credit shape is gone with the second one.
 */
export interface GrantInput {
  readonly studentId: string;
  readonly eventId: string;
  /** 'lesson_complete' | 'interleaved' — decides capping (row 2 only). */
  readonly reasonCode: string;
  /**
   * Amount per material, each > 0. Absent/zero keys credit nothing, and an EMPTY
   * record is a legitimate input rather than a programming error: a drill set past the
   * era's bound, and a grant resolved in an era whose material nobody has authored,
   * both produce one. Such a grant writes no rows and reports `applied: false`.
   */
  readonly amounts: Partial<Record<MaterialId, number>>;
  readonly nowMs: number;
  /**
   * Force cap enforcement on/off. Defaults to the reason's rule
   * ({@link isCappedReason}: interleaved is capped, one-time grants are not).
   */
  readonly capped?: boolean;
}

export interface GrantResult {
  /** False iff the `event_id` was already recorded, or nothing was credited. */
  readonly applied: boolean;
  /** Material stockpiles AFTER applying this grant (post-cap). */
  readonly materials: MaterialBalances;
  /** Material actually credited by this grant (≤ requested, after any cap clamp). */
  readonly grantedMaterials: MaterialBalances;
  /** Rows to append to the ledger. Empty when `applied` is false. */
  readonly rows: readonly LedgerEntry[];
}

/**
 * Apply a grant to a ledger view, returning the rows to append + the resulting
 * balances. Never mutates the input. For a CAPPED reason (row 2), each resource's
 * amount is clamped to ONE PRACTICE SET's allowance, so a request for more than a set
 * is worth simply credits a set's worth — the one-time rows are never capped.
 *
 * The clamp was the rolling 24h remainder until 2026-07-29, and it is now a pure
 * function of the resource: it reads no history and no instant. See `cap.ts`.
 */
export function applyGrant(view: LedgerView, input: GrantInput): GrantResult {
  const materials = computeMaterialBalances(view);
  const noop: GrantResult = {
    applied: false,
    materials,
    grantedMaterials: {},
    rows: [],
  };

  if (hasEvent(view, input.eventId)) {
    return noop;
  }

  const capped = input.capped ?? isCappedReason(input.reasonCode);
  const rows: LedgerEntry[] = [];
  const grantedMaterials: Partial<Record<MaterialId, number>> = {};
  const nextMaterials: Partial<Record<MaterialId, number>> = { ...materials };

  for (const resource of ECONOMY_RESOURCES) {
    const requested = input.amounts[resource] ?? 0;
    if (requested <= 0) {
      continue;
    }
    // THE CLAMP READS NEITHER `view` NOR `input.nowMs`, which is the per-practice
    // ruling made structural: the allowance is one practice set's worth, so there is
    // no accumulation to measure and no window to be outside of. It took both while
    // the cap was per 24h.
    const amount = capped ? Math.min(requested, capRemaining(resource)) : requested;
    if (amount <= 0) {
      continue;
    }
    const row: LedgerEntry = {
      student_id: input.studentId,
      event_id: input.eventId,
      resource_type: resource,
      kind: "grant",
      amount,
      reason_code: input.reasonCode,
      created_at: new Date(input.nowMs).toISOString(),
    };
    assertLedgerEntryInvariant(row);
    rows.push(row);
    grantedMaterials[resource] = amount;
    nextMaterials[resource] = (nextMaterials[resource] ?? 0) + amount;
  }

  // A grant that credited nothing is reported as unapplied. Three inputs reach here:
  // a capped request clamped to zero, an era with no authored material, and — since
  // the XP sunset — a drill set past the era's paid bound, which used to still write
  // an xp row and so used to be `applied`. `useEconomy` reads `setsRemaining` rather
  // than `applied` to tell that last one from a double-reported set.
  if (rows.length === 0) {
    return noop;
  }

  return {
    applied: true,
    materials: nextMaterials,
    grantedMaterials,
    rows,
  };
}
