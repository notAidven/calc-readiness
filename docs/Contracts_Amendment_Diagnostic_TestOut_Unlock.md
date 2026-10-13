# Contracts Amendment: Diagnostic Test-Out Unlock (proposed 2026-07-23 — RATIFIED 2026-07-26 · FOLDED 2026-07-26)

*__Status: RATIFIED 2026-07-26 — by Gabe, as diagnostic-lane owner and team tie-break. FOLDED into `docs/Contracts.md` on 2026-07-26__, the section this amendment's §3.1 names as the one it amends: the unlock rule, the mastery-0 completion, the "skips the lesson only" reading and the write boundary now live in **`docs/Contracts.md` §1.1**, with the §1 `placement_estimate` / `completion_status` field rows and the placement/mastery + completion invariants amended in place. **`docs/Contracts.md` is the normative source for the shipped rule; this document remains the rationale / detail record** — why inferred passes unlock too (§2), the invariant analysis (§3), the architecture boundary (§4), the UX (§5), the approval gate and exactly how it closed (§6), and the 2026-07-26 settlements (§8). It keeps the superseded text and the reasoning, and holds **no second copy of the rule**. **Where this document and `docs/Contracts.md` disagree about what ships, `docs/Contracts.md` wins.** Be precise about what the ratification rests on, because the §6 gate asked for two acks and got one. __Evan (construction/placement) ACK'D 2026-07-26__ (§6(c)), in the test-out/economy discussion that produced issues #102 and #103. __Anthony (mastery) did NOT ack.__ His signature was not given and is not recorded as given: the boxes in his lane — §6(b), and §6(d) which is jointly his — are carried by __Gabe's tie-break__, under the `OWNERS.md` "Cross-lane change policy (amended 2026-07-23)" precedent that a cross-lane change is __owner-gated rather than all-hands__, and the established practice in this repo that owner-approved cross-lane decisions taken in person do not additionally require an all-hands ack. So: __ratified on the owner's authority with one of two acks outstanding, not on two acks.__ Anything relying on Anthony's independent sign-off — in particular the production mastery-service completion trigger he owns (§4, §7) — should still get it from him. The tree is re-aligned to cite __this__ ratification and never the old "ratified by docs PR #36" claim, which was false when it was written and which the 2026-07-26 reconciliation correctly took down. This amends a __RATIFIED__ position: the `docs/Contracts.md` §1 placement/mastery invariants ("placement never pre-builds"; "placement and mastery … never equal by construction") and the placement→city mapping in the RATIFIED `docs/Contracts_Amendment_Adaptive_Diagnostic_v2.md` (§4.4 per-node placement; INV-DIAG-6/8). It is a __cross-lane change__ (it touches Evan's construction/placement-invariant reads and Anthony's mastery/completion lane), so per the `OWNERS.md` "Cross-lane change policy (amended 2026-07-23)" it needs the owning developers' explicit review + sign-off, documented in the PR description, the changing developer's work log, and here. Owner: __Gabe__ (diagnostic lane). Dated __2026-07-23__. Companion docs: `docs/Contracts.md` §1/§1.1/§3, `docs/Contracts_Amendment_Adaptive_Diagnostic_v2.md` §4.4, `docs/Mastery_Scoring_Spec.md` §5, `docs/Assessment_Scoring_Spec.md` §1.*

> **This fold closes the last of this amendment's paperwork. It does not mean everything is settled.**
> One item is still genuinely owed by another owner, is untouched by the fold, and must not be read as
> closed by it: **Anthony's agreement to the production mastery-service completion trigger** for
> tested-out nodes (§6(b)/§7 below, recorded outstanding in PR #106). In production the completion for
> a tested-out node must flow through the **mastery service he owns**; only the dev / in-memory session
> simulates it today (§4). That is an implementation commitment rather than a ratification gate — which
> is why it blocked neither the ratification nor this fold — and it **remains open**.

---

## 1. Summary & scope

We are correcting and expanding the diagnostic→building model. The change is a single, precise rule about which diagnostic outcomes let a student **place a building immediately without doing its lesson** ("test-out" / build-without-lesson).

### 1.1 Old model (now superseded)

As encoded across the ratified docs, **placement never pre-builds**: a `placement_estimate` — even a robust *measured* pass — only (a) seeded the initial city visual (the blueprint ghost, taller for higher placement) and (b) routed the node's **lesson entry point** (a high placement skipped teaching and dropped the student straight into the short "prove it" practice). The building was still earned **only** by practice evidence. Graph-**inferred** passes (downward closure over the prereq DAG) were treated even more conservatively — they seeded the ghost/placement but the student still had to complete the node's lesson. Net effect: no diagnostic outcome ever unlocked a finished building; everyone did the practice for every node.

### 1.2 New model (this amendment)

**Any node the diagnostic resolves as `passed` unlocks that node's building for immediate placement WITHOUT the lesson or practice.** A "pass" is a resolution status of `passed`, which is exactly `placement_estimate >= 2`. This includes **both**:

*(⚠ Read "without the lesson or practice" as a statement about what the **building** costs, not about what the learner has left to do. The building completes at **`mastery` 0**, and the practice remains the only route to mastery and its stars — so in progression terms **test-out skips the lesson only** (§8.1, §8.2, settled 2026-07-26). Normative text: `docs/Contracts.md` §1.1.)*

- **Measured passes** — the student answered the node's probe items correctly (robust `passed (measured)` → placement **3**; non-robust `passed (measured)` → placement **2**), **and**
- **Graph-inferred passes** — the student demonstrated a more advanced dependent skill, so the prerequisite is credited via conservative downward closure over the skill DAG (`passed (inferred)` → placement **2**).

Only nodes that **failed or were never resolved** still require the lesson: `failed` with partial ground → placement **1**, and hard-fail / pruned / unresolved → placement **0**. Both are below the bar and still route into the lesson (with placement 1 still permitted to skip teaching per the existing entry-point routing).

### 1.3 The unlock rule (one line)

*__FOLDED 2026-07-26 — normative text is now `docs/Contracts.md` §1.1.__ The line below is retained as the record of what was ratified and is no longer the operative statement; if it ever reads differently from §1.1, §1.1 is what ships.*

> **`placement_estimate >= 2` (resolution `passed`, measured or inferred) ⇒ build-without-lesson.** `placement_estimate <= 1` (`failed`/unresolved) ⇒ lesson still required.

This maps cleanly onto the RATIFIED placement scale (`Contracts_Amendment_Adaptive_Diagnostic_v2` §4.4): measured-robust = 3, measured-non-robust = 2, inferred = 2, partial-fail = 1, hard-fail/prune = 0. The 2-vs-1 boundary is exactly the passed/failed boundary, so the unlock rule needs no new field or threshold.

---

## 2. Rationale (why inferred passes unlock too)

Graph inference is **downward closure over the prerequisite DAG**: passing an advanced node implies mastery of its prerequisites (that is precisely what a prerequisite edge means, and it is why the walk credits the closure on a robust pass — `Contracts_Amendment_Adaptive_Diagnostic_v2` INV-DIAG-8). It is therefore **self-contradictory** — and poor UX — to (a) assert the student knows a prerequisite well enough to count it toward their readiness coverage, yet (b) force them through that prerequisite's full lesson anyway. If we trust the inference enough to score it (the ratified v2 metric already counts conservatively-inferred passes, INV-DIAG-2 revised), we trust it enough to skip the lesson. The safeguard is unchanged in spirit: inference only fires on a **robust, confirmed** pass of a dependent (INV-DIAG-8), and the student can always choose to review a building they were handed. *(⚠ Stale as of the 2026-07-26 probe-policy fold, and left in place as the rationale as it was written: INV-DIAG-8 is now **proportionate** — a pass whose prerequisite closure falls below a defined share of the scope may license inference on a single scorable item, while a large closure still requires a clean 2/2 and a borderline 2-of-3 never credits the closure at any size. The safeguard the argument leans on therefore still holds where it matters, but the words "robust, confirmed" no longer describe every inferring pass. Current text: `docs/Contracts_Amendment_Adaptive_Diagnostic_v2.md` §3.3. See also §3.2 below, which restates the same correction for the preserved-invariants list.)*

The prior "inferred seeds the ghost but you still do the lesson" stance was the conservative half-measure this amendment removes: it made the student redo work the instrument had already concluded they had, which is exactly the friction a readiness product should avoid.

---

## 3. Invariants this amends

### 3.1 Amended

*__FOLDED 2026-07-26.__ Both amendments below are now carried in the contract itself — the §1 `placement_estimate` and `completion_status` field rows and the placement/mastery + completion invariants are amended in place, and the rule is stated in **`docs/Contracts.md` §1.1**. What follows is retained as the record of what was changed and why. One §1 consequence the original list did not name was reconciled by the fold: `completion_status` was documented as "derived from `mastery >= 2`" with no exception, which a tested-out node (complete at `mastery` 0) contradicts, so §1 now enumerates both routes to `complete`.*

- **Contracts §1 — placement/mastery invariant (AMENDED).** The frozen text says `placement_estimate` "never auto-builds" and that placement and mastery are "DIFFERENT constructs and never equal by construction … nothing is pre-built." **Amend to:** a diagnostic **pass** (`placement_estimate >= 2`) now **does** pre-unlock/pre-build the node's building (build-without-lesson) for **passed nodes only**. Placement and mastery remain distinct *fields written by distinct owners* (the diagnostic never writes `mastery`; see §4), but a passed placement is no longer guaranteed to be "not built" — it is grounds for the building to be completed on placement. **Failed nodes (`placement_estimate <= 1`) still do NOT pre-build**; their buildings are still earned through the lesson. Be precise: this relaxation applies to passed nodes (>= 2) only.

- **Contracts_Amendment_Adaptive_Diagnostic_v2 §4.4 (AMENDED, downstream half).** §4.4 states "the practice is always the safeguard — a wrong inference just means the student does the practice." For **passed** nodes (>= 2) that safeguard is now *optional review*, not a required gate: a passed placement completes the building without the practice. The **placement-derivation** half of §4.4 (evidence → 0–3 seed) is unchanged; only the downstream "everyone still does the practice" consequence changes, and only for passed nodes.

### 3.2 Preserved (must remain true by construction)

- **INV-DIAG-1 (mastery firewall) — PRESERVED.** The diagnostic **engine** still writes **only** `placement_estimate`, never `mastery`, `completion_status`, or evidence. This amendment changes **downstream interpretation**, not the diagnostic's write surface (see §4).
- **INV-DIAG-6 / INV-DIAG-8 (fail-closed placement, conservative test-out) — PRESERVED in direction, restated in wording (2026-07-26).** Pruned and unresolved nodes resolve **not-ready** (placement 0), and uncertainty still resolves downward — that is the half this amendment depends on, and it is intact. *(⚠ The original sentence here read "no node is `passed` without a confirmed measured pass or a robust-pass-triggered inference", and **both halves are now untrue for low-consequence nodes**: under `docs/Contracts_Amendment_Diagnostic_Probe_Policy.md` §3.1/§3.2 a node whose decision cannot cascade is decided on a **single** item, so its pass is not "confirmed"; and inference now fires on the separate `infers` flag, which a single-item pass with a small closure sets without being `robust`. Read instead: **no node is `passed` without a measured pass adequately confirmed for its consequence, or an inference-licensed pass of a measured dependent.** The instrument is unchanged on every scope served to date — D1's confirm threshold rounds to 0, so everything there is still confirmed 2-of-3.)*
- **One mastery writer — PRESERVED.** `mastery` is still written in exactly one place (the mastery service). "Build-without-lesson" is realized by the mastery/city lane persisting completion for passed nodes (see §4), not by the diagnostic writing mastery.

---

## 4. Architecture boundary (what changes vs. what does NOT)

The change is a **downstream interpretation**, not an engine write-surface change:

- **Diagnostic engine (Gabe):** unchanged. It resolves the walk and writes **only** `placement_estimate` (+ the immutable assessment records). It does **not** write `mastery` or complete buildings. INV-DIAG-1 stands.
- **City / mastery lane (Evan reads placement + construction; Anthony owns mastery/completion):** **new responsibility.** On load, a node whose `placement_estimate >= 2` (passed) is treated as grounds to **unlock and complete that node's building on placement, skipping the lesson**. Failed nodes (0/1) still start unbuilt and require the lesson. Document this as the **`placement(passed >= 2) → build-without-lesson` mapping**, owned by the city/mastery lane, not the diagnostic engine.
- **Persistence.** In production, the actual mastery/completion persistence for a tested-out node still flows through the **mastery-service** (Anthony) — the mastery firewall and "one mastery writer" hold; a passed placement becomes a legitimate completion trigger the mastery lane honors, not a direct diagnostic write. In the **dev / in-memory** session, the city session simulates this (it may set the node complete on seed for passed placements).

Net: "diagnostic writes placement only" is intact; the new "passed placement completes the building without a lesson" behavior lives in the city/mastery lane.

---

## 5. UX to reflect

On **diagnostic exit**, show a **"You've unlocked N buildings!"** celebration, where **N = the count of PASSED nodes** (`placement_estimate >= 2`, i.e. measured **+** inferred passes). Those N buildings are **placeable immediately, without lessons**; the remaining nodes (placement 0/1) appear as blueprint ghosts / empty lots that still route into their lessons. The existing results screen already distinguishes **Measured** vs **Graph-inferred** placement seeds, so the popup is an additive summary over that same resolved set.

---

## 6. Approval checklist (ack gate — CLOSED 2026-07-26)

**How this gate closed, stated exactly.** Two boxes were signed by the owner they belong to — (a) and (e) by Gabe, (c) by Evan. The two that sit in Anthony's lane, (b) and (d), were **not** signed by Anthony; they are carried by **Gabe's tie-break** as diagnostic-lane owner under the `OWNERS.md` cross-lane policy. Each is marked below with which of the two it is, so no future reader mistakes a tie-break for an ack.

- [x] **(a) Unlock rule.** `placement_estimate >= 2` (passed, measured or inferred) ⇒ build-without-lesson; `<= 1` ⇒ lesson required. *(Gabe — diagnostic/placement semantics.)* — **RATIFIED by Gabe, 2026-07-26**, in his own lane. Consistent with probe-policy §3.5, which settled that a 2-of-3 pass clears the `>= 2` bar exactly as a robust pass does.
- [x] **(b) Mastery firewall intact.** Diagnostic engine still writes only `placement_estimate`; build-without-lesson persistence flows through the mastery service. *(Anthony — mastery lane.)* — **CARRIED BY GABE'S TIE-BREAK, 2026-07-26; NOT ack'd by Anthony.** The claim itself is verified against the code rather than taken on trust: the diagnostic engine writes only `placement_estimate`, and the completion for a tested-out node is written by the city/mastery lane (§4). What is unsigned is Anthony's agreement to own the production completion trigger, which §7 still routes to him.
- [x] **(c) Construction/placement invariant amended.** The city treats a passed placement as unlock+complete; failed nodes still build via the lesson; the "placement never pre-builds" reads/tests are updated in code. *(Evan — construction/placement lane.)* — **ACK'D by Evan, 2026-07-26** — a real ack from the owning developer, given in the test-out/economy discussion that produced issues #102 and #103. Note the completion is at **mastery 0**, not mastery 2; see §8.1.
- [x] **(d) Inferred parity.** Graph-inferred passes unlock identically to measured passes (both are placement 2). *(Gabe + Anthony.)* — **Gabe's half RATIFIED; Anthony's half CARRIED BY TIE-BREAK, 2026-07-26; NOT ack'd by Anthony.** Parity follows from §1.3: the unlock keys on `placement_estimate >= 2` and nothing downstream distinguishes an inferred 2 from a measured 2.
- [x] **(e) UX.** "You've unlocked N buildings!" on diagnostic exit, N = passed-node count. — **RATIFIED by Gabe, 2026-07-26** (diagnostic-exit summary is his per §7).

---

## 7. Ownership & rollout

**Gabe** owns this amendment, the placement semantics, and the diagnostic-exit summary of passed nodes. **Anthony** owns the mastery-service completion trigger for tested-out (passed) nodes and the production persistence path. **Evan** owns the city/construction reads that treat a passed placement as build-without-lesson (and the corresponding update to the "placement never pre-builds" construction reads/tests). This doc is **RATIFIED as of 2026-07-26** (Gabe, as diagnostic-lane owner and team tie-break; §6). **Evan ack'd 2026-07-26 (§6(c)); Anthony's ack was never given**, and the two boxes in his lane were carried by the tie-break rather than by his signature — so the one thing still genuinely owed by another owner is Anthony's agreement to the **production mastery-service completion trigger** above. That is an implementation commitment, not a further ratification gate: the amendment is ratified and the tree may describe it as ratified from today. No code changes ship with the ratification itself; it re-aligns the comments and docs that were reconciled down to PROPOSED on 2026-07-26 so they cite this ratification.

**Folded 2026-07-26.** The normative text now lives in `docs/Contracts.md` §1.1 and this document is the rationale / detail record; **`docs/Contracts.md` wins on conflict.**

**Three things this ratification and fold do not close, kept visible on purpose.** None of them blocked the fold.

1. **Anthony's agreement to the production mastery-service completion trigger** for tested-out nodes (§6(b) above) is **still owed**. It is implementation work rather than a ratification gate, and it is the one item genuinely owed by another owner — the boxes in his lane were carried by Gabe's tie-break, not by his signature.
2. **The opening-probe UX judgment** (`docs/Contracts_Amendment_Diagnostic_Probe_Policy.md` §8): the full-scope opening probe was **measured, not changed**, and the judgment it routes to Gabe is undecided. It ships nothing today.
3. **The validator's MST-rollback question** (`docs/Contracts_Amendment_Diagnostic_Probe_Policy.md` §9.2): also a recorded measured finding awaiting a decision, and also shipping nothing today.

---

## 8. Settled 2026-07-26 (not open questions — do not relitigate)

### 8.1 The diagnostic does not pre-seed mastery stars; the practice earns them

**Testing out completes the BUILDING at `mastery: 0` — zero of three stars.** It skips the lesson,
the CFU and the practice set; it does not hand over the evidenced quality those produce. A learner
who tests out of all six D1 nodes has six finished buildings and **no stars**, and earns each star
afterwards by practising the already-built skill.

This is **already what the code does** and needs no change: `seedFromPlacement` and the server-path
pre-build in `placeSkill` (`apps/web/src/city/citySession.ts`) both write
`{ mastery: 0, lesson_stage: "done", completion_status: "complete" }`, and the building derives
`complete` off `lesson_stage === "done"`, never off mastery. What was wrong was the prose: three
places still asserted `mastery: 2` (`citySession.ts` interface docstring, `engines/game/src/construction.ts`
blueprint comment, `work-log/gabe.md`), all corrected 2026-07-26. A reader who believed them would
conclude test-out already grants star XP.

Cross-references rather than restatements: `docs/Mastery_Scoring_Spec.md` §2 and §5 for what a star
means and who writes it; `docs/Contracts.md` §1 for the field ownership this does not disturb — the
diagnostic still writes only `placement_estimate` (INV-DIAG-1).

### 8.2 The progression model, stated explicitly

| Step | What the learner does | What the building does |
|---|---|---|
| 1 | Nothing yet | Empty lot (`not_started`) |
| 2 | Completes the **lesson** (teaching + CFU) | Empty lot → **construction** (`lesson_stage: "practice"`) |
| 3 | Completes the **mastery practice** | Construction → **finished** (`complete`, stars ride on top) |

**Test-out skips step 2 only.** It jumps a node straight to a finished building, but the *stars*
that step 3 produces are still unearned — which is exactly §8.1, stated as a sequence.

**Consequence: the storm's `mastery >= 2` gate is CORRECT and must not change.**
`isNeighborhoodReady` (`engines/game/src/neighborhood.ts`) requires every required node at
`mastery >= 2`, and **two readers have now read that as a bug** on the grounds that a tested-out
learner is blocked from the storm. They are not blocked — they are *not finished*. Test-out skipped
their lesson, not their practice, and the storm gates on mastery precisely because mastery is the
evidence that the practice happened. `docs/Mastery_Scoring_Spec.md` §5 is the authority for that
gate; this section records only why it survives the test-out amendment.

Note the gate keys on `mastery`, not on `completion_status` or the derived build stage — which is
what makes it correct here, since test-out moves those two and deliberately leaves mastery at 0.

### 8.3 Testing out does not pay directly

The lesson-completion gold grant is **retimed** to fire on practice completion; it is not
duplicated by a new compensatory grant, because the existing grant already fires on the test-out
seam today. The full decision, the corrected trigger (`last_practiced_at` plus the economy ledger's
own `hasEvent` as the paid-record, **not** `mastery >= 2`) and the sequencing constraints are
recorded in `docs/superpowers/specs/2026-07-25-resource-model-xp-gold-design.md` §6.

**Implementation is Evan's and is tracked in issue #102.** Not implemented here.
