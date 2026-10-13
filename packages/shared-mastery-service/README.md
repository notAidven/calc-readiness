# @cr/mastery-service  (FROZEN interface)

**Owner: Anthony** (load-balanced: Gabe already carries diagnostic + three shared packages; and the lesson engine is this service's primary caller, so builder = main consumer). Interface is agreed all-hands Day 1; implementation is Anthony's behind it.

The ONE writer of `mastery`. Contracts sec4.1 + Mastery_Scoring_Spec.

Interface: `submitAssessmentEvidence({ student_id, context, node_id, responses[], evidence_id })`
- context is `"lesson" | "diagnostic-practice"` (NOT storm, the storm is checkpoint-only and never evidences mastery).
- Recompute correctness server-side, apply the 4/5 mastery rule (5-item set: 1xL1 + 2xL2 + 2xL3; hints count; reveal does not), update monotonically `max(existing, evidenced)`, idempotent on evidence_id.

**Status:** the frozen interface and deterministic mastery helpers exist in `src/index.ts`. The authenticated persistence/scoring implementation remains Anthony's lane work behind that interface.
