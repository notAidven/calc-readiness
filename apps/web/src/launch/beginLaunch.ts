import type { EraId } from "@cr/skill-graph";

import type { CityLoad } from "../city/types";
import {
  type LaunchRecord,
  type LaunchStorage,
  readLaunchRecord,
  recordLaunchChoice,
} from "./launchRecord";
import { canonicalProgress, FIRST_ERA_ID, type LaunchChoice } from "./launchRoute";

/**
 * **THE READERLESS FALLBACK AND THE DEVICE CACHE.**
 *
 * Production Era 1 entry does not initialize here. `useAccountLaunch` waits for the authenticated
 * `POST /api/city/bootstrap`, rehydrates its canonical response, and only then writes the local
 * note. `beginEraOne` remains for the readerless test/local composition, where no server account
 * exists; `beginDiagnostic` records the diagnostic door as a device cache.
 *
 * ## What Era 1 initialises, and what it deliberately does not
 *
 * In that readerless composition it sets the standing era to the first authored era and nothing
 * else. The authenticated equivalent is the server bootstrap's `city_state.current_island`.
 *
 * It grants **nothing else**, and that is a ruling rather than a limitation:
 * `startAtEraOneGrantsNothing.test.tsx` exists because a learner who skipped the diagnostic has
 * had nothing measured about them, so a city that opened with skills mastered or buildings
 * standing would be recording a placement nobody sat.
 *
 * ## Why the guard is a conjunction
 *
 * The conjunction below remains defensive for its readerless callers, but it is not account
 * authority. Authenticated callers never reach it, and `resolveLaunchRoute` never reads the note.
 */

export interface BeginDeps {
  /** The verified Cognito subject. Notes are keyed by it; an empty subject writes nothing. */
  readonly subject: string;
  /** The account's canonical city, as `GET /api/city` returned it. */
  readonly city: CityLoad;
  /** The era seam (`city/useCityEra.ts`'s `setCityEra`), injected so this stays testable. */
  readonly setEra: (eraId: EraId) => void;
  /** Defaults to `runtimeStorage()`; injected by tests. */
  readonly storage?: LaunchStorage | null;
}

export interface BeginOutcome {
  /** The note now in force, which is the earlier one when this subject already had a door. */
  readonly record: LaunchRecord;
  /** Whether this call is the one that wrote the note. False on every later press. */
  readonly first: boolean;
  /** Whether this call moved the standing era. False whenever anything already exists. */
  readonly initialisedEra: boolean;
}

function begin(
  choice: LaunchChoice,
  { subject, storage }: Pick<BeginDeps, "subject" | "storage">,
): { record: LaunchRecord; first: boolean } {
  const first = readLaunchRecord(subject, storage) === null;
  return { record: recordLaunchChoice(subject, choice, storage), first };
}

/**
 * Start at Era 1: record the door once, and initialise the standing era once.
 *
 * Safe to call any number of times. The second call writes nothing and reports `first: false`,
 * which is what makes the press idempotent across a refresh, a re-mount, and a double click.
 */
export function beginEraOne(deps: BeginDeps): BeginOutcome {
  const { record, first } = begin("era-one", deps);
  const initialisedEra =
    first && FIRST_ERA_ID !== null && !canonicalProgress(deps.city).begun;
  if (initialisedEra) {
    deps.setEra(FIRST_ERA_ID as EraId);
  }
  return { record, first, initialisedEra };
}

/**
 * Take the diagnostic: record the door once and hand off to the real diagnostic flow.
 *
 * It initialises no era on purpose. The diagnostic's own hand-off (`handlePretestComplete` in
 * `App.tsx`) is what seeds a city from a placement, and a launch-time era write would be a second
 * opinion about where a learner starts before the walk that decides it has been taken.
 */
export function beginDiagnostic(deps: Omit<BeginDeps, "setEra" | "city">): BeginOutcome {
  const { record, first } = begin("diagnostic", deps);
  return { record, first, initialisedEra: false };
}
