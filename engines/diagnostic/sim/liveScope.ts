/**
 * THE SCOPE THE LIVE DIAGNOSTIC ADMINISTERS, mirrored from `@cr/item-bank`'s
 * `DIAGNOSTIC_WALK_SCOPE`.
 *
 * The derivation lives in `@cr/item-bank`, which depends on `@cr/diagnostic` — importing
 * it from this directory would run that package edge backwards, which is why
 * `Diagnostic_11_Node_Scope_Measurement.md` §9's cross-package probes were never landed
 * here either. So the ids are written down, and
 * `test/diagnosticSimScopeMirror.test.ts` reads this file and fails if the list and the
 * live derivation come apart. A measurement reported against a stale scope is worse than
 * no measurement.
 *
 * It is a plain module rather than a constant inside one of the harnesses so that a
 * second harness can read it without also running the first one's suites. `students.ts`
 * is the same shape and the same reason.
 *
 * Kept in TEACHING ORDER, which is the order the live scope array is in, because
 * `resolveKnowledgeState` walks `state.scope` — so a mirror in a different order would be
 * measuring a very slightly different thing.
 *
 * **All sixty-two, and there is no horizon left to cut at.** `POL.5` was the last in-product
 * node with no authored content; authoring it made the seventh era fully servable, every era
 * behind it already was, and `placementHorizon` stops at the first era it cannot fully serve.
 * There is no such era, so the derived scope and the in-product set now coincide and this
 * mirror is the whole product in teaching order.
 */
export const WIDENED_SCOPE: readonly string[] = [
  "NUM.S",
  "NUM.F",
  "NUM.3",
  "POL.3",
  "FUN.6",
  "EL.6",
  "TRG.3",
  "TRG.8",
  "NUM.2",
  "NUM.5",
  "TRG.4",
  "NUM.4",
  "TRG.9",
  "EXP.1",
  "RAD.1",
  "LIN.1",
  "POL.1",
  "CG.1",
  "FUN.1",
  "TRG.1",
  "GEO.1",
  "RAD.2",
  "RAD.3",
  "LIN.3",
  "LIN.4",
  "LIN.5",
  "POL.2",
  "POL.4",
  "POL.5",
  "POL.6",
  "FUN.2",
  "FUN.4",
  "FUN.5",
  "FUN.7",
  "FUN.9",
  "LF.1",
  "EL.1",
  "TRG.2",
  "GEO.2",
  "RAD.4",
  "LIN.6",
  "POL.7",
  "RAT.1",
  "FUN.3",
  "FUN.8",
  "FUN.10",
  "LF.2",
  "EL.2",
  "EL.3",
  "TRG.5",
  "POL.8",
  "RAT.2",
  "RAT.3",
  "RAT.5",
  "RAT.6",
  "LF.3",
  "LF.4",
  "EL.4",
  "EL.5",
  "TRG.6",
  "TRG.7",
  "RAT.4",
];
