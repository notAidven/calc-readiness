import type { DataApiExecutor } from "./data-api";

/**
 * The transaction-scoped lock shared by first-account writers.
 *
 * A diagnostic start and an Era 1 bootstrap are two answers to the same first-use decision.
 * They take this lock before recording either answer, so a concurrent device cannot inspect an
 * empty account while the other transaction is already becoming non-empty. PostgreSQL releases
 * the lock on commit or rollback; no row or migration is required.
 */
export const ACCOUNT_INITIALIZATION_LOCK_SQL =
  "select pg_advisory_xact_lock(hashtextextended(:sid::text, 0)) as account_initialization_lock";

/**
 * Serialize one account's first-use decision inside the caller's existing transaction.
 *
 * This must receive a transaction-scoped executor. On a root executor the statement's implicit
 * transaction ends immediately and the lock protects nothing after this call.
 */
export async function lockAccountInitialization(
  tx: DataApiExecutor,
  studentId: string,
): Promise<void> {
  await tx.query(ACCOUNT_INITIALIZATION_LOCK_SQL, { sid: studentId });
}
