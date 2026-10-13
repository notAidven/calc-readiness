import { runtimeStorage } from "../storage/runtimeStorage";
import type { LaunchChoice } from "./launchRoute";

/**
 * **WHICH DOOR THIS DEVICE WATCHED THIS ACCOUNT TAKE — a write-once cache, and nothing more.**
 *
 * ## Why a device note exists beside the server's own state
 *
 * The account's canonical city is the only launch authority and follows the learner to another
 * device. `POST /api/city/bootstrap` closes the empty-city window on the server. This note remains
 * useful for support and readerless tests, but `resolveLaunchRoute` deliberately never reads it.
 *
 * ## What it is NOT allowed to be
 *
 * It is **not progress or route authority**. Nothing here grants mastery, unlocks a node, founds
 * an island, moves an era, or decides whether the launcher appears. Clearing or forging it cannot
 * change the account's canonical answer.
 *
 * ## Keyed by the verified subject, and write-once
 *
 * Keyed by the Cognito `sub`, so a shared laptop cannot answer one learner's question with
 * another learner's note. Write-once, so pressing a door twice — or pressing the other one after
 * the first — cannot rewrite what happened; {@link recordLaunchChoice} returns the note that is
 * already there. That is what makes "initialise exactly once" a property of the store rather than
 * of the caller's discipline.
 *
 * Storage goes through `runtimeStorage()`, which namespaces every key under `cr.demo.` while the
 * exact `/demo` route is open. The ordinary route never runs there, and this note structurally
 * cannot land on an account key from a demo tab.
 */

/** Versioned, following `ERA_STATE_STORAGE_KEY`: a shape change moves the key, not the reader. */
export const LAUNCH_RECORD_PREFIX = "cr.launch.v1.";

export interface LaunchRecord {
  readonly choice: LaunchChoice;
  /** When the door was taken, for support and for nothing the product reads. */
  readonly at: string;
}

/** The subset of `localStorage` this module needs; `runtimeStorage()` satisfies it. */
export interface LaunchStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function launchRecordKey(subject: string): string {
  return `${LAUNCH_RECORD_PREFIX}${subject}`;
}

function storageFor(storage?: LaunchStorage | null): LaunchStorage | null {
  return storage === undefined ? runtimeStorage() : storage;
}

function isChoice(value: unknown): value is LaunchChoice {
  return value === "diagnostic" || value === "era-one";
}

/**
 * The note for this subject, or `null` when there is none.
 *
 * A note that does not parse, or whose choice is not one of the two doors, reads as absent: the
 * worst that costs is one extra question, where trusting a malformed blob would send a learner
 * through a door nobody chose.
 */
export function readLaunchRecord(
  subject: string,
  storage?: LaunchStorage | null,
): LaunchRecord | null {
  const store = storageFor(storage);
  if (!store || !subject) {
    return null;
  }
  try {
    const raw = store.getItem(launchRecordKey(subject));
    if (raw === null) {
      return null;
    }
    const parsed = JSON.parse(raw) as { choice?: unknown; at?: unknown };
    if (!isChoice(parsed.choice)) {
      return null;
    }
    return {
      choice: parsed.choice,
      at: typeof parsed.at === "string" ? parsed.at : "",
    };
  } catch {
    return null;
  }
}

/**
 * Record the door, once. Returns the note now in force, which is the EXISTING one when this
 * subject already has one — so a second press cannot overwrite the first, and the caller can
 * compare what it asked for against what it got to decide whether it is the first press.
 */
export function recordLaunchChoice(
  subject: string,
  choice: LaunchChoice,
  storage?: LaunchStorage | null,
  now: () => Date = () => new Date(),
): LaunchRecord {
  const existing = readLaunchRecord(subject, storage);
  if (existing !== null) {
    return existing;
  }
  const record: LaunchRecord = { choice, at: now().toISOString() };
  const store = storageFor(storage);
  if (store && subject) {
    try {
      store.setItem(launchRecordKey(subject), JSON.stringify(record));
    } catch {
      // A blocked or full store costs one repeated question and nothing else. It must not
      // stop the learner entering their city, which is what a throw here would do.
    }
  }
  return record;
}

/** Forget this device's note. Used when the account signs out, and by tests. */
export function forgetLaunchRecord(subject: string, storage?: LaunchStorage | null): void {
  const store = storageFor(storage);
  if (!store || !subject) {
    return;
  }
  try {
    store.removeItem(launchRecordKey(subject));
  } catch {
    // Nothing depends on the removal succeeding; see the module header.
  }
}
