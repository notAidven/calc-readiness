import { REASON_INTERLEAVED } from "./constants";
import type { LedgerEntry, LedgerView, MaterialBalances, MaterialId } from "./types";

/**
 * Pure derivations over the append-only ledger. The ledger is the single source
 * of truth; balances are RECONSTRUCTED here (resource spec §5.3, §8.1-8.2) rather
 * than stored as separately-mutated numbers a client could invent.
 *
 * **NOTHING HERE READS AN INSTANT ANY MORE.** The rolling-cap window was the one
 * derivation that did, via `Date.parse(entry.created_at)`, and it went out with the
 * per-day cap. `created_at` is now written and never read — a record, not an input.
 *
 * **TWO DERIVATIONS WENT WITH THE SUNSET.** `computeBalances` projected the ledger's
 * non-material rows, which since the gold-drop meant XP and only XP, so with XP gone it
 * would return `{}` over every ledger ever written. `purchasedCosmeticIds` read
 * ownership off `cosmetic_id`, a column that no longer exists. Both were deleted rather
 * than kept as reads that always answer empty; {@link computeMaterialBalances} is now
 * the whole read model.
 */

/** Whether an event id has already been recorded (the idempotency check). */
export function hasEvent(view: LedgerView, eventId: string): boolean {
  return view.entries.some((entry) => entry.event_id === eventId);
}

/**
 * The era-material stockpiles: `balance = sum(grants) - sum(spends)`, per material.
 * SPARSE: only materials the ledger has actually touched appear.
 *
 * It used to open with `if (!isMaterialId(entry.resource_type)) continue;`, skipping the
 * XP rows that shared these entries. Every row is a material row now, so that line would
 * be a filter that can never exclude anything — the hollow shape a sunset leaves behind,
 * and dead weight a reader would take for a real distinction. The one place the
 * membership test still earns its keep is the persistence parser, where the input is a
 * stored blob rather than a typed row.
 */
export function computeMaterialBalances(view: LedgerView): MaterialBalances {
  const balances: Partial<Record<MaterialId, number>> = {};
  for (const entry of view.entries) {
    const sign = entry.kind === "grant" ? 1 : -1;
    balances[entry.resource_type] =
      (balances[entry.resource_type] ?? 0) + sign * entry.amount;
  }
  return balances;
}

/** The stockpile of one material (zero when the ledger has never touched it). */
export function materialBalanceOf(view: LedgerView, material: MaterialId): number {
  return computeMaterialBalances(view)[material] ?? 0;
}

/**
 * Sum of interleaved (row 2) GRANTS of one resource, over the WHOLE ledger.
 *
 * **`sumInterleavedInWindow` WAS HERE AND IS DELETED WITH THE ROLLING CAP** (team lead,
 * 2026-07-29: *"cap shouldn't be daily - it should be per-practice"*). It took a `nowMs`
 * and a `windowMs`, parsed each row's `created_at` with `Date.parse`, and summed only the
 * rows inside `[nowMs - windowMs, nowMs]`. That `Date.parse` was the last read of a
 * stored instant anywhere in this package, and it is what made a "patient" player able
 * to out-earn an engaged one.
 *
 * This unwindowed total is what replaces it, and it is deliberately NOT read by the cap —
 * a per-set bound has nothing to accumulate against. It exists because "how much has
 * practice paid in total" is a real question for the solvency reporting, and answering it
 * over every row is the form that cannot smuggle a window back in: there is no instant to
 * pass it.
 */
export function sumInterleavedGrants(view: LedgerView, resource: MaterialId): number {
  let total = 0;
  for (const entry of view.entries) {
    if (
      entry.kind === "grant" &&
      entry.resource_type === resource &&
      entry.reason_code === REASON_INTERLEAVED
    ) {
      total += entry.amount;
    }
  }
  return total;
}

/**
 * **HOW MANY DRILL SETS HAVE BEEN PAID IN `resource`** — the count
 * {@link DRILL_PAID_SETS_PER_ERA} bounds, and the only input that bound has.
 *
 * A ROW COUNT, not a sum, and the difference is the whole point: one paid set writes
 * exactly one material row, and a set worked PAST the bound writes an xp row and no
 * material row at all. So counting rows counts paid sets, and a set that paid nothing
 * cannot inflate the number that decides whether the next one pays.
 *
 * Passing a MATERIAL scopes it to that material's era, which is what makes the bound
 * per-era without anything storing an era: the era is recoverable from the resource id
 * (`eraOfMaterial`), so the ledger needs no new column and an era advance renews the
 * allowance for free.
 *
 * **IT READS NO INSTANT**, exactly like its sibling above, and for the same reason: the
 * bound is keyed on effort, so it must not be able to see anything a player could wait
 * for. `created_at` is written on these rows and is not read here.
 */
export function countInterleavedGrants(view: LedgerView, resource: MaterialId): number {
  let count = 0;
  for (const entry of view.entries) {
    if (
      entry.kind === "grant" &&
      entry.resource_type === resource &&
      entry.reason_code === REASON_INTERLEAVED
    ) {
      count += 1;
    }
  }
  return count;
}

/** Convenience: append rows to a view, returning a new (immutable) view. */
export function appendEntries(view: LedgerView, rows: readonly LedgerEntry[]): LedgerView {
  return { entries: [...view.entries, ...rows] };
}
