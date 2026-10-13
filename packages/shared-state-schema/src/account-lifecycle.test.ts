import { describe, expect, it } from "vitest";

import {
  ACCOUNT_DELETION_RECOVERY_DAYS,
  accountAccessEnabled,
  type LearnerAccountStatus,
} from "./index";

describe("the next-slice account lifecycle interface", () => {
  it("disables access immediately while preserving the 30-day recovery contract", () => {
    const statuses: readonly LearnerAccountStatus[] = ["active", "deletion_pending"];
    expect(statuses).toHaveLength(2);
    expect(accountAccessEnabled("active")).toBe(true);
    expect(accountAccessEnabled("deletion_pending")).toBe(false);
    expect(ACCOUNT_DELETION_RECOVERY_DAYS).toBe(30);
  });
});
