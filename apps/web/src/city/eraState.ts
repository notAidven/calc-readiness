import { ERA_SEQUENCE, type EraId, eraNumber } from "@cr/skill-graph";

import { runtimeStorage } from "../storage/runtimeStorage";
import { CURRENT_ERA_ID } from "./eraDressing";

/**
 * THE ERA THE CITY IS STANDING IN — the minimum era state, and the only one.
 *
 * Authority: **D-ERA5** (the Town Hall upgrade is the chapter break) and **D-ET2**
 * (`docs/superpowers/specs/2026-07-29-era-trial-contract.md` §11.2 — the ceremony is the
 * hall rebuilding itself, and the advance is the moment the hall re-themes and the island,
 * roads and advisor re-dress).
 *
 * `eraDressing.ts` has said since it was written that *"there is no era STATE in the app
 * yet"* and that `CURRENT_ERA_ID` is *"the single seam where that state will land"*. This
 * module is that landing, and it is deliberately the smallest thing that can be one:
 * **a stored `EraId`, a default, and a setter.** No phase, no history, no trial record,
 * no unlock conditions.
 *
 * ## Why the surface is this small
 *
 * Three other lanes are working beside this one and were told to read this module rather
 * than define an era state of their own, so every field added here is a field four
 * surfaces have to agree about. The two things a caller ever needs are *which era is the
 * city wearing* and *move it on*, so those are the two things exported. Anything richer —
 * whether the unlock exam is eligible or in progress is derived at its own call site from
 * node states and the versioned exam record.
 *
 * ## What this is NOT, and the ruling that makes that deliberate
 *
 * **It is not a gate.** Nothing here consults mastery, the trial, or a checkpoint, and
 * `setEra` will move the city to any era in the sequence. The demo is a driven showcase,
 * so the advance is triggered by the ceremony completing and by the dev control, and there
 * is no unlock condition anywhere in this file. `INV-TRIAL-1` (a content-authoring failure
 * may never trap the learner in an era) is respected in the direction that matters: since
 * nothing here can refuse an advance, nothing here can trap anybody in one.
 *
 * ## `CURRENT_ERA_ID` is the DEFAULT, and is not repointed
 *
 * The seam's own docblock warns that **each call site has to be decided separately rather
 * than repointed as a set** — the live era is right for the hall, the ground, the roads
 * and the advisor, and wrong for a skill building's dressing, which is fixed at the era
 * the building was raised in. So this module imports `CURRENT_ERA_ID` as its DEFAULT and
 * leaves the constant exactly where it is, with its eleven existing call sites untouched.
 * The two that had to be decided for the advance to be visible are decided in
 * `eraDressing.ts` (the skill/hub split) and in `CitySurface.tsx` (the surface reads live
 * era state); every other one still reads era one, which is the correct answer for all of
 * them today and is a separate decision for whoever needs it to be otherwise.
 */

/**
 * The persisted key. Versioned (`.v1`) following `InfiniteDrill`'s `eraBestStreakKey`
 * precedent: if the stored shape ever stops being a bare era id, the key moves rather than
 * the reader learning to parse two shapes.
 */
export const ERA_STATE_STORAGE_KEY = "cr.city.era.v1";

/**
 * The era a city with no stored state stands in. Derived through `CURRENT_ERA_ID`, which
 * derives from `ERA_SEQUENCE[0]` and fails loud on an empty sequence — so era one is the
 * default because it is FIRST in the authored sequence (INV-ERA-5: order is array position
 * and nothing else), never because a literal says `"prehistoric"`.
 */
export const DEFAULT_ERA_ID: EraId = CURRENT_ERA_ID;

/** The storage surface this module needs. `localStorage` satisfies it. */
export interface EraStateStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * `localStorage` when there is one. Absent under SSR and in a bare unit test, and the
 * whole module degrades to era one rather than throwing — the city rendering the first
 * chapter is always a correct thing for it to do, where a throw at module scope is never
 * one.
 */
function defaultStorage(): EraStateStorage | null {
  return runtimeStorage();
}

/** Whether a string is an era in the authored sequence. Derived, never a literal list. */
export function isEraId(value: string): value is EraId {
  return ERA_SEQUENCE.some((era) => era.id === value);
}

/**
 * The era the city is standing in.
 *
 * **A stored value that is not in `ERA_SEQUENCE` reads as the default rather than
 * throwing**, and that is a departure from `eraBuildableRadius`'s fail-loud discipline
 * which is worth stating rather than leaving to be discovered. The two cases are not
 * alike: an unauthored land radius is a CONTENT gap, where a would-be plausible default
 * would make unauthored data look authored. This is a PERSISTED value from a previous
 * build of the app, so the failure it guards is a learner who reordered nothing and
 * renamed nothing arriving at a city that will not load. Era one is not a plausible
 * default here, it is the real floor of the sequence, and the alternative to reading it is
 * a blank screen.
 */
export function loadEraId(storage: EraStateStorage | null = defaultStorage()): EraId {
  const raw = storage?.getItem(ERA_STATE_STORAGE_KEY);
  return raw !== null && raw !== undefined && isEraId(raw) ? raw : DEFAULT_ERA_ID;
}

/** Store the era the city is standing in. */
export function saveEraId(
  eraId: EraId,
  storage: EraStateStorage | null = defaultStorage(),
): void {
  storage?.setItem(ERA_STATE_STORAGE_KEY, eraId);
}

/** Forget the stored era, so the city reads {@link DEFAULT_ERA_ID} again. */
export function clearEraId(storage: EraStateStorage | null = defaultStorage()): void {
  storage?.removeItem(ERA_STATE_STORAGE_KEY);
}

/**
 * The era after this one, or `null` at the end of the sequence.
 *
 * Read off `ERA_SEQUENCE` position, which is the only sanctioned way to walk the order
 * (INV-ERA-5 fact 1: no entry carries an ordinal that could drift from its position, and
 * fact 2: `EraId` is a slug, so there is nothing to parse or sort). `eraNumber` is that
 * derivation and throws on an unknown era, so this fails loud on a bad id rather than
 * returning `null` and reading as "the sequence ended here".
 */
export function nextEraId(eraId: EraId): EraId | null {
  return ERA_SEQUENCE[eraNumber(eraId)]?.id ?? null;
}

/** Whether there is an era after this one to advance into. */
export function hasNextEra(eraId: EraId): boolean {
  return nextEraId(eraId) !== null;
}
