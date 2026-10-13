# @cr/components  (FROZEN interfaces)

**Owner: Gabe** (builds the graph widget + math input once; the docs assign these to Gabe). Consumers build against the frozen API.

Shared client interfaces consumed across lanes. Contracts sec4.2-4.4.
- **Graph widget** (SVG) - lessons/diagnostic only, never in the city canvas. `<GraphWidget mode spec onInteract onSubmit>`. Graph answers scored by the separate geometric comparator (Answer_Equivalence_Spec sec8), NOT checkAnswer.
- **Math input + `checkAnswer`** - returns `client_correct` (UX only); server recompute is authoritative. Signature takes `item_version_id` + `equivalence_checker_version`. Semantics in Answer_Equivalence_Spec (v0.8, freeze-blocked on the capability spike).
- **State client** - `getNodeState`, `getDomainStates`, `isReady(scope)`, no realtime (load-on-enter + refresh-on-event).

**Status:** the accessible `MathInput`, fail-closed checker registry, D1 checker candidate, and shared Node/Chromium golden fixtures exist in `src/`. The D1 candidate must still pass team grammar/fixture review before final lock. Gabe owns this implementation and the separately gated Phase-2 graph widget/comparator.
