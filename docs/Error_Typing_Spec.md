# Error-Typing Spec (v1)

> **Status: DEFERRED to post-MVP (team decision, 2026-07-20).** The whole error-typing capability — the per-node misconception vocabulary, distractor/item tagging, error-typed feedback, and routing/re-weighting — is **out of MVP scope**. Rationale: lessons are already per-node granular, and the adaptive diagnostic already localizes failures by routing down to test prerequisites in isolation, so within-node misconception typing adds little for the effort and cross-lane coupling it costs. The optional `misconception_tag` log field remains defined in Contracts (it is optional and harmless) so this capability can switch on later WITHOUT a schema change. No MVP authoring requirement to build or tag against a vocabulary. This spec is retained as the post-MVP design.

*How the product identifies WHAT kind of mistake a student made, not just that they were wrong. Two uses: (1) targeted in-the-moment feedback, and (2) smarter routing/re-weighting of practice. Spans two layers, the diagnostic (coarse, free from distractors) and the lesson (rich, the primary home), tied together by one shared misconception vocabulary and one log field. No em dashes.*

*(Term: a **node** is one measurable prerequisite skill, e.g. `RAT.1`; the atomic unit tested and taught. Misconceptions are scoped per node. Full definitions in PRD §1.5.)*

**Scope split up front (so nobody over-builds) — all post-MVP as of 2026-07-20:**
- **Deferred (was "MVP"):** misconception vocabulary per node + distractor tagging + item error-tags + in-the-moment targeted feedback. Deprioritized because granular per-node lessons + adaptive-diagnostic descent already localize failures; the authoring discipline and Gabe/Anthony vocabulary coupling are not worth it for the MVP.
- **Deferred (further out):** pattern-based routing and practice re-weighting. Needs threshold logic and remediation content to route TO.
- **Retained now:** only the optional `misconception_tag` log field in Contracts (nullable, feedback/analysis-only, never a mastery or metric input). Authors MAY attach a freeform tag, but nothing requires it. Everything above switches on later without a schema change.

---

## 0. The one idea that ties both layers together

**Every item carries misconception tags, and every wrong answer resolves to a misconception ID that gets logged.** How the resolution happens differs by item type, but the vocabulary and the log field are shared. That shared vocabulary is the ONLY coupling between the diagnostic lane (Gabe) and the lesson lane (Anthony): they agree the per-node misconception list, and both write the same `misconception_tag`. Nothing else couples.

---

## 1. Misconception vocabulary (the shared schema)

Each node owns a small, closed list of **named misconceptions**, the mistakes an author expects for that skill. This formalizes the "internal misconception tags" the node spine already gestured at (e.g. EXP.1's finer exponent rules).

```
misconception = {
  id:        "RAT.1.dropped_exclusion",   // node-scoped, stable
  node_id:   "RAT.1",
  label:     "Cancelled correctly but omitted the excluded value",
  short_feedback: "Right expression, but you lost where the original was undefined. What x makes the ORIGINAL denominator zero?"
}
```

Rules:
- Misconception IDs are **node-scoped and stable** (like node IDs; suffix, never renumber). They live with the node in the item-bank data (Gabe's lane owns the file, but the list is agreed with Anthony since lessons use it too).
- Keep the list **small and closed per node** (typically 3-6). This is a teaching tool, not an exhaustive taxonomy. An "other/uncategorized" bucket always exists so a wrong answer that matches no known misconception is still logged, just untyped.
- The vocabulary is **content, versioned like items** (a misconception edit is an item-version-style event, so old logged tags stay interpretable).

---

## 2. Diagnostic layer: error typing free from distractors

The diagnostic stays THIN (it is a placement instrument, ~2 items/node, MCQ-friendly, and must not become a 90-question wall). It does NOT route on error type and does NOT own detection logic. It contributes error data at **zero extra item cost** via distractor authoring:

- Each **distractor** (wrong MCQ option) is authored to represent one misconception ID (or "other").
- Picking that distractor IS the typed error. No constructed-response parsing, no extra items, no taxonomy logic in the diagnostic engine.
- The diagnostic logs the chosen distractor's `misconception_tag` to the response log.

Example (RAT.1):
```
Stem: Simplify (x^2 - 1)/(x - 1).
  A) x + 1                      -> misconception: RAT.1.dropped_exclusion
  B) x + 1, x != 1  [correct]
  C) x - 1                      -> misconception: RAT.1.bad_cancel
  D) 1/(x-1)                    -> misconception: RAT.1.cancelled_terms_not_factors
```

**What the diagnostic gets:** coarse, cheap misconception flags in the log ("this student dropped exclusions on the RAT.1 probe"). Useful signal for the inheritor's analysis and a light hint the lesson can pick up, but the diagnostic itself just places. This is the "worked into the diagnostic without thickening it" piece: it rides entirely on distractor-authoring discipline.

**Authoring requirement:** every diagnostic MCQ distractor must carry a `misconception_tag` (a node's ID or `other`). The authoring/CI check flags a diagnostic MCQ with untagged distractors.

---

## 3. Lesson layer: the primary home (detection + feedback + routing)

The lesson practice loop has what the diagnostic lacks: item volume (5+ per node), hints, reveals, and constructed-response. So it does the real work.

### 3.1 Detection (how a wrong answer becomes a misconception ID)
Per item, in priority order:
1. **MCQ / structured items:** the chosen distractor's tag (same as §2).
2. **Constructed-response items:** the checker's `reason_code` (Answer_Equivalence: `sign_error`, `not_simplified`, `missing_exclusion`, `wrong_representation`, ...) maps to a node misconception via a small per-node `reason_code -> misconception_id` table the author supplies. Where the mapping is ambiguous, it resolves to `other`.
3. **No match:** `other` (still logged; never silently dropped).

The item's `misconception_tag` set (authored) plus the checker's reason code are the inputs; the output is one resolved `misconception_id` per wrong attempt, logged.

### 3.2 Targeted feedback (MVP)
On a wrong answer, before/with the scaffolded hint, the lesson shows the misconception's `short_feedback` (from §1). This makes the PRD's existing "common-misconception popups" concrete: the popup content is keyed to the resolved misconception, not generic. Correct-answer popups can still surface the misconception a student *avoided* ("nice, a common slip here is dropping the excluded value").

### 3.3 Routing / re-weighting (STRETCH, post-MVP)
When a misconception recurs within a node's practice set past a threshold (default: the SAME `misconception_id` on **3+ items**), the lesson may:
- surface a targeted micro-explanation for that specific misconception, and/or
- re-weight the remaining/next practice items toward that misconception (draw more items tagged to it),

instead of the generic "you missed the bar, redo the set." This needs (a) enough tagged items per misconception to re-weight toward, and (b) the micro-explanation content, both real authoring work, so it is post-MVP. **Routing NEVER changes the mastery rule:** mastery is still 4/5 on the set (Mastery_Scoring_Spec); error typing shapes *what you see and practice next*, not whether you mastered the node.

---

## 4. Shared data (what gets logged, the connective tissue)

One field added to the append-only response log (Contracts): **`misconception_tag`** (a node misconception ID, or `other`, or null for correct answers). Both engines write it. That single column is the entire cross-lane contract for error data; the inheritor's later analysis reads it.

The item schema (Answer_Equivalence item definition) gains:
- `misconception_tags`: for MCQ, the per-distractor map; for constructed-response, the optional `reason_code -> misconception_id` table.

Nothing here touches mastery, placement, or the assessment metric. Error tags are diagnostic/feedback metadata, logged alongside correctness, never an input to the 4/5 mastery computation or the pre/post score.

---

## 5. What this deliberately does NOT do
- It does not make the diagnostic route on error type (diagnostic stays a thin placement instrument).
- It does not build an exhaustive misconception taxonomy (small closed per-node lists + an `other` bucket).
- It does not let error typing affect mastery or the marketed metric.
- It does not require constructed-response NLP; constructed-response typing rides on the checker's existing `reason_code`, and anything unmapped is `other`.

---

## 6. Invariants (authoring / CI)
1. Every node has a misconception vocabulary (may be just `other` for a node where typing is not worth it, but the field exists).
2. Every diagnostic MCQ distractor carries a `misconception_tag` (a valid node misconception ID or `other`).
3. Every `misconception_tag` written to the log references a defined misconception ID for that node (or `other`).
4. A `reason_code -> misconception_id` mapping references only defined IDs.
5. (Stretch) Routing thresholds reference misconceptions that have enough tagged items to re-weight toward.

---

## Status
**v1 for the MVP slice (vocabulary + distractor tags + feedback + logging), lockable now.** The routing/re-weighting slice is post-MVP and specced but not committed. Because the only shared surface is one log field + the item tag schema, turning routing on later needs no schema change.

## Locked decisions captured here
- One shared misconception vocabulary per node; the only coupling between the diagnostic and lesson lanes. *(This session.)*
- Diagnostic contributes error typing via tagged distractors only (no thickening, no routing). *(Gabe's instinct to involve the diagnostic, resolved cheaply.)*
- Lesson layer is the primary home: detection, targeted feedback (MVP), pattern routing (stretch).
- Error tags never affect mastery or the pre/post metric.
