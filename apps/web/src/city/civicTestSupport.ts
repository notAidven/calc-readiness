import { civicCatalogueRow } from "@cr/economy";

import type { CivicPayment } from "./citySession";

/** Lightweight payment seam for spatial/UI tests; ledger integration has its own real test. */
export function civicTestPayment(available: number): CivicPayment {
  let balance = available;
  const paid = new Set<string>();
  return async ({ placementId, building }) => {
    const row = civicCatalogueRow(building);
    if (row === null) {
      return {
        status: "unknown_building",
        spendable: balance,
        cost: 0,
        building: null,
      };
    }
    if (paid.has(placementId)) {
      return {
        status: "already_spent",
        spendable: balance,
        cost: 0,
        building: null,
      };
    }
    if (balance < row.cost) {
      return {
        status: "insufficient_material",
        spendable: balance,
        cost: 0,
        building: null,
      };
    }
    balance -= row.cost;
    paid.add(placementId);
    return {
      status: "spent",
      spendable: balance,
      cost: row.cost,
      building: row,
    };
  };
}
