import { ERA_SEQUENCE } from "@cr/skill-graph";

import type { CityLoad } from "../city/types";

/**
 * **WHICH DOOR AN AUTHENTICATED LEARNER TOOK, AND WHETHER THEY ARE STILL STANDING IN IT.**
 *
 * The ordinary route asks one question once: diagnostic first, or straight to Era 1. Asking
 * it again on the next refresh is not a cosmetic annoyance — the diagnostic's `start` is not
 * idempotent server-side (`docs/superpowers/specs/2026-08-07-production-backend-auth-persistence.md`
 * §2.4), so a launcher that reappears every load is a launcher that can mint a second
 * administration for the same learner. So the launcher is shown to somebody who has not begun,
 * and nobody else.
 *
 * This module is the decision and nothing else: pure, synchronous, and given the account's
 * canonical city read. It performs no storage or network access, so it can be exercised over
 * hand-built payloads.
 */

/** The two doors, as they are recorded. */
export type LaunchChoice = "diagnostic" | "era-one";

/**
 * What to draw once the account's city has been read.
 *
 * `resume` is the returning learner: they have begun, so the ordinary route puts them back in
 * their city rather than re-asking a question they answered.
 */
export type LaunchRoute = "launcher" | "resume";

/**
 * The era a first-time learner starts in, derived from the authored sequence rather than
 * written down. INV-ERA-5: order is array position and nothing else.
 */
export const FIRST_ERA_ID = ERA_SEQUENCE[0]?.id ?? null;

/**
 * **EVERY READING THAT MEANS "THIS ACCOUNT HAS BEGUN", each with the fact it is reading.**
 *
 * A list rather than one boolean expression, because the failure this guards against is a
 * reading being dropped: a learner whose only progress is the one signal that got removed is
 * shown the launcher again, and `beginEraOne` is then asked to initialise an account that is
 * already running. `launchRoute.test.ts` walks this array and requires each row to be
 * independently sufficient, so a row that stops reading fails at its own name.
 */
const BEGUN: readonly {
  readonly reason: string;
  readonly reads: (city: CityLoad) => boolean;
}[] = [
  {
    reason: "the server initialized this account",
    reads: (city) => city.launch_initialized === true,
  },
  {
    reason: "the diagnostic recorded a placement",
    // Immutable after the first pretest (Contracts amendment: diagnostic persistence), so
    // this is the one signal that cannot be undone by anything the learner does later.
    reads: (city) => city.node_states.some((node) => node.placement_estimate > 0),
  },
  {
    reason: "a skill has mastery on the account",
    reads: (city) => city.node_states.some((node) => node.mastery > 0),
  },
  {
    reason: "a lesson has been opened",
    reads: (city) => city.node_states.some((node) => node.lesson_stage !== "not_started"),
  },
  {
    reason: "a skill is marked complete",
    reads: (city) => city.node_states.some((node) => node.completion_status === "complete"),
  },
  {
    reason: "a skill building stands on the island",
    reads: (city) => (city.placements?.length ?? 0) > 0,
  },
  {
    reason: "a civic building has been bought",
    reads: (city) => (city.civic?.length ?? 0) > 0,
  },
  { reason: "roads have been laid", reads: (city) => (city.roads?.length ?? 0) > 0 },
  {
    reason: "material has been spent",
    reads: (city) =>
      (city.road_gold_spent ?? 0) > 0 || (city.civic_material_spent ?? 0) > 0,
  },
  {
    reason: "the city stands in a later era",
    reads: (city) =>
      city.current_island !== undefined && city.current_island !== FIRST_ERA_ID,
  },
  {
    reason: "more than one island has been founded",
    reads: (city) => (city.islands?.length ?? 0) > 1,
  },
  {
    reason: "the neighbourhood checkpoint is cleared",
    reads: (city) => city.neighborhood_state?.checkpoint_cleared === true,
  },
];

/**
 * Whether the account's canonical city shows any progression at all, and why.
 *
 * ⚑ **`town_hall` IS NOT ONE OF THE READINGS, and leaving it out is the fix rather than an
 * omission.** `city/apiCityLoad.ts` synthesises a hall onto every payload that has none
 * (`withSeededHub`), because the surface computes occupancy from the payload and a hall-less
 * city refuses the learner's first placement. So a brand-new account's read arrives with a
 * Town Hall already on it, and a "has a hall" reading would classify every first-time learner
 * as returning and they would never be offered the choice at all.
 */
export function canonicalProgress(city: CityLoad): {
  readonly begun: boolean;
  readonly reasons: readonly string[];
} {
  const reasons = BEGUN.filter((row) => row.reads(city)).map((row) => row.reason);
  return { begun: reasons.length > 0, reasons };
}

/** The readings, exported so the guard measures the shipped list rather than a copy of it. */
export const BEGUN_READINGS: readonly string[] = BEGUN.map((row) => row.reason);

/**
 * Where an authenticated learner goes once their city has been read.
 *
 * The account's canonical state is the only ground for `resume`. A local launch note may cache
 * which button this browser saw, but cannot decide whether another device initialized the
 * account or whether a failed request did anything.
 */
export function resolveLaunchRoute({ city }: { readonly city: CityLoad }): LaunchRoute {
  return canonicalProgress(city).begun ? "resume" : "launcher";
}
