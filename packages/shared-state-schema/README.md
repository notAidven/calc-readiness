# @cr/state-schema  (FROZEN, all-hands to change)

**Owner: Gabe** (structure/data-model). Types only; changes are an all-hands event.

The single definition of shared state types. Everyone imports from here; nobody redefines these shapes locally (silent divergence is worse than a merge conflict).

Owns (per Contracts sec1-2):
- `student_node_state` (placement_estimate, mastery, mastery_updated_at, completion_status, lesson_stage, last_practiced_at)
- immutable `assessment_administration` + `assessment_item_response`
- `neighborhood_state` (checkpoint_cleared)

Rules: mastery is `int 0-3`, monotonic, written ONLY by the mastery service. placement_estimate is diagnostic-only and immutable. Do not add a decay field (v1 is monotonic). Changing anything here is a deliberate all-hands event.

**Status:** the frozen TypeScript records and wire types exist in `src/index.ts`. No logic belongs here; future shape changes remain an all-hands event.
