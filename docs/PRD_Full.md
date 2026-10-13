Product Requirements Document: Calculus Readiness City-Builder
==============================================================

*Full PRD. A learning game that gets underprepared students ready for
Calculus I, built on a diagnostic-driven skill graph. 3.5-week build
target.*

1. Product Overview
-------------------

A **city-builder game** in which a student's city *is* their
calculus-readiness knowledge. A diagnostic places the student, building
an initial city that reflects what they already know, and they grow it
by learning, practicing, and defending it. The game is the product and
the engagement layer; underneath it runs a rigorous, skill-graph-based
diagnostic and remediation engine.

**North star:** a game that builds and measures **foundational
prerequisite readiness** for calculus, with a working pre/post
assessment pipeline. (The full 62-node product-target "calculus-ready" vision is the
roadmap; the shipped scope measures foundational-readiness gain, not
validated Calc-I outcomes. The product target was expanded from 48 to 61 in the
2026-07-24 coverage expansion and to 62 by the 2026-07-25 D2 QA append (RAD.4);
see §5.3.)

**Core loop:** Diagnose → Construct (learn) → Operate (practice) →
Defend (mastery gate / checkpoint) → expand. Spaced review and
`review_due` nudges are post-MVP backlog work; v1 mastery is monotonic.

1.5 Core Concepts (read this first)
-----------------------------------

The whole design is built from six terms. They are defined here once; every other section uses them as defined.

- **Node** = one measurable prerequisite skill, the atomic unit of the whole system. A node is small enough to test with a few items, teach in one lesson, and mark mastered or not (e.g. `RAT.1` = "simplify rational expressions, tracking excluded values"). Each node is simultaneously a diagnostic target, a routing target, and a building in the game. After the 2026-07-24 coverage expansion and the 2026-07-25 D2 QA append the full curated set is 62 CORE nodes and the product targets all 62 (extended is now empty); the MVP still builds 6 (all of Domain D1, depth-first). Nodes and their IDs are fixed in the skill-graph registry (`skill_graph.json`).

- **Prerequisite edge** = a directed dependency between two nodes: "A is a prerequisite of B" (A → B) means a student needs A before B is learnable. Edges drive diagnostic routing (where to send a student who fails) and the game's roads. They are NOT a topic ordering; they are a real dependency graph (a partial order that crosses domain boundaries).

- **Domain** = a presentation grouping of related nodes (10 total: Real Numbers, Exponents & Radicals, ... Trigonometry, and Geometry — the D10 domain added in the 2026-07-24 coverage expansion). In the game a domain is a **neighborhood**. Domains organize the UI and the diagnostic; they are not the unit of mastery (nodes are).

- **Lesson** = the per-node teaching+practice unit: **1 node = 1 lesson = 1 building** (all 1:1). Finishing a node's lesson builds exactly that node's building; a lesson never spans or builds multiple nodes.

- **Interaction archetype** = one reusable interactive lesson *template*. Several nodes' lessons can share an archetype when they have the same instructional core and differ only by entry point, difficulty, or one added step; a node needing a genuinely distinct interaction gets its own archetype. This is why node count and lesson-*build* count differ: the 6 MVP D1 nodes reuse ~3 archetypes; the 62-node product reuses ~45 lesson shells. Archetypes save *build effort and shared UI* and are **invisible to the student** (each node is still its own lesson + building); they are NOT a grouping the learner experiences. The authoritative node → archetype mapping is the registry field (`lesson_shell` today; renaming to `lesson_archetype`); the reuse reasoning is in Lesson_Cluster_Sketch.md. It does not reduce content — each node still needs its own items, tags, and mastery outcome.

- **Mastery** = a per-node state (0 to 3) confirmed by accuracy on that node's practice set (4 of 5 = mastered). It is measured per NODE, never per archetype or per domain. "Ready" in a domain means every in-scope node in it is mastered.

The through-line: **the node is the atom.** Diagnostics test nodes, edges connect nodes, mastery is per node, and each node gets taught by its own lesson (1 node = 1 lesson = 1 building). Domains are a grouping layered on top; interaction archetypes are a build-reuse template shared across lessons, not a student grouping.

2. User Persona
---------------

**"Maya," incoming STEM freshman, placed into (or nervous about)
Calculus I.** - Underprepared: shaky on prerequisite algebra/trig, not
on calculus itself. - Math-anxious; has been burned by timed tests and
walls of text. - Motivated but easily discouraged; abandons tools that
feel like a worksheet. - Has a rough sense she has "gaps" but can't name
them; she doesn't know *what* she doesn't know. - Wants: to feel
progress, to know exactly what to work on, and to walk into calculus not
feeling behind.

**Design implications from Maya:** the diagnostic must not be a
punishing 100-question wall (fatigue kills her before the game hooks
her); gaps must be shown as *actionable and non-shaming* (a building to
construct, not a red F); progress must be visible and rewarding.

3. User Story
-------------

> As an underprepared incoming calculus student, I take a short
> diagnostic that builds a city representing my current math knowledge:
> areas I'm strong in show tall blueprint outlines, ones I'm weak in
> start as empty lots under storm clouds. I learn by constructing buildings
> (lessons), practice by operating them, and prove mastery by clearing
> the storm over each neighborhood. As I go, the app shows me exactly
> which skills I have and which I still need, and by the end I can see a
> measured gain in my D1 arithmetic foundation. I've closed specific
> Real Numbers & Arithmetic gaps and can see exactly where I stand on the path to calculus, with
> the city as proof.

4. Game Structure
-----------------

**The city = the student's knowledge.** - **Math domains →
neighborhoods** (9 total) - **Skills (nodes) → buildings** -
**Construction level of a building → lesson-stage progress** (not a
separate content tier) - **Prerequisites → roads** connecting buildings
and neighborhoods - **Mastery gate → the storm** over each neighborhood

**Four stages of play:**

1.  **Diagnostic (onboarding).** Student takes the placement diagnostic;
    each question is tagged to a domain + skill (node). Result seeds the
    city: strong areas show **tall blueprint ghosts** (a preview + fast
    lane), weak areas show empty lots — but **nothing is pre-built**;
    every building is earned (placement ≠ mastery). A student who places
    high can **skip the teaching** (mini-lesson + worked examples) and
    enter directly at the node's 5-item **"prove it"** practice, but the
    building is still earned by that practice, and mastery is confirmed by
    the SAME single mechanism for everyone: the node's 5-item practice set
    at the mastery bar (Mastery_Scoring_Spec).
    *(⚠ **AMENDED 2026-07-23, RATIFIED 2026-07-26**, folded into
    `docs/Contracts.md` §1.1 — build-without-lesson / test-out; Evan
    ack'd 2026-07-26, Anthony did not (his lane's boxes were carried by
    Gabe's tie-break). "Nothing is pre-built" above
    now holds for **failed/unresolved** nodes only. A **passed** placement
    (`placement_estimate >= 2`, measured **or** graph-inferred) unlocks +
    completes that node's building **without** the lesson or the practice. It
    completes at **mastery 0** — zero stars — so "every building is earned" is
    still true of the STARS: the practice earns them afterwards. Failed nodes
    (0/1) still start as empty lots and route into the lesson. See
    `docs/Contracts_Amendment_Diagnostic_TestOut_Unlock.md` §1.3 and §8.)*
    There is no separate 3-item
    confirmation path (that would be a second mastery definition, which the
    spec forbids). A strong student simply clears the 5-item set quickly
    and un-hinted — building fast, not being handed a finished building.
    *(⚠ **AMENDED 2026-07-23, RATIFIED 2026-07-26** (Evan ack'd; Anthony did not), folded into `docs/Contracts.md` §1.1 — test-out / build-without-lesson:
    a node the diagnostic resolves as **passed** (`placement_estimate >= 2`,
    **measured OR graph-inferred**) now unlocks + completes its building
    immediately **without** the lesson/practice; only **failed/unresolved**
    nodes (placement 0/1) still do the lesson. So passed nodes CAN be handed
    as finished buildings. The diagnostic still writes only `placement_estimate`;
    the city/mastery lane completes on a passed placement. See
    `docs/Contracts_Amendment_Diagnostic_TestOut_Unlock.md`.)*

2.  **Construction (learning).** To build a building, the student goes
    through its lesson. Construction levels map to lesson stages: broke
    ground = lesson started → foundation = passed
    check-for-understanding → framing = working practice problems →
    complete = passed the building's mastery bar. Each building has its
    own **scripted advisor NPC** (a character delivering pre-authored
    guidance and hints, not a runtime-AI free-form tutor, consistent
    with the no-runtime-LLM decision).

3.  **Operation (practicing).** Completed buildings run "shifts":
    practice-problem sets that earn resources and confirm retention.
    **In v1 mastery is monotonic: completed buildings stay complete, there
    is NO decay** (per Contracts / Mastery_Scoring_Spec). A non-punitive
    `review_due` nudge (never lowers mastery) is a post-MVP addition. This is the
    spaced-repetition mechanic.

4.  **The storm (neighborhood checkpoint).** Each neighborhood starts
    under a storm. As its buildings complete (nodes mastered via lessons),
    it clears toward sunny. The **storm battle** is a climactic, time-bound
    mixed-retention game moment using mostly difficulty-2 and -3 questions
    (the game's stakes make the timer engaging, not test-anxiety-inducing:
    different context from a timed test). **The storm does NOT master
    nodes and is not a mastery evidence source** (per §8 and
    Mastery_Scoring_Spec): it can only be attempted once all the
    neighborhood's required nodes are ALREADY mastered through lessons, and
    beating it sets only the `neighborhood_checkpoint_cleared` flag (a
    progression/cosmetic marker). This keeps the game climax without turning
    each storm into a second full assessment.

5. Diagnostic & Skill-Graph Design
----------------------------------

### 5.1 What "ready" means

A **content-validity** claim, not a statistical prediction: passing =
the student has demonstrated the skills experts agree are prerequisite
to Calc I. Grounded in MDTP/ALEKS/OpenStax + math-fluent curation. We do
**not** claim a validated statistical prediction of course outcomes (no
outcome data, no specific target course). Optimized for **general**
calculus readiness.

### 5.2 Domain structure (10 domains)

Adopted from the MDTP Calculus Readiness framework (cross-checked
vs. ALEKS), with one documented deviation:
added Real Numbers/Arithmetic Fluency for the underprepared population. The
framework's Geometry strand was originally dropped; the **2026-07-24 coverage
expansion** reinstated it as **D10**, so this section's earlier "9 domains,
LOCKED / dropped standalone Geometry" wording is superseded.

1.  Real Numbers & Arithmetic · 2. Exponents & Radicals · 3. Linear
    Equations/Inequalities/Absolute Value · 4. Polynomials & Quadratics
    · 5. Rational Expressions · 6. Functions & Graphs · 7. Linear
    Functions · 8. Exponential & Logarithmic · 9. Trigonometry ·
    10. Geometry *(added 2026-07-24; see §5.3 D10)*

### 5.3 Node structure (62-node product target = the full CORE registry after the 2026-07-24 coverage expansion + the 2026-07-25 D2 QA append)

Nodes grounded in OpenStax section objectives (identified from source,
re-worded in our own language; OpenStax content never ships, and items
come from open banks + original authoring). Each node = one measurable
skill = one routing target = one lesson = one building; nodes reuse
interaction archetypes for build savings (registry field `lesson_shell`,
renaming to `lesson_archetype`: 62 nodes reuse ~45 lesson shells).

**Population note (counts must name their population, and the registry
`skill_graph.json` is authoritative).** After the **2026-07-24 coverage
expansion** the registry defines **62 CORE nodes** (all `active_mvp` /
`active_post_mvp`; the `secondary` and `extended` populations are now empty).
THIS product targets **all 62** (`product_scope` = mvp or target: 6 MVP + 56
target). The expansion (a) promoted the 9 formerly-`extended` nodes into product
target — EL.4, FUN.10, LF.4, LIN.5, LIN.6, POL.7, RAD.3, RAT.6, TRG.7 — (b)
flipped TRG.6 from `secondary` to an active target, and (c) appended 4 new
nodes: POL.8, TRG.9, and a new Geometry domain (D10) GEO.1/GEO.2 (61). The
**2026-07-25 D2 QA append** then added **RAD.4** (D2) under the same
additive-append protocol, closing D2's variable-radicand / `sqrt(x^2)=|x|` /
even-root-domain gap (62). So: 62 CORE in
the registry, all 62 in product target; **6 of those are the MVP (all of Domain
D1, depth-first).** (The list below enumerates the in-product nodes; if it and
the registry ever disagree, the registry wins.) The old bare "40-node",
"48-node", and "61-node" wordings are retired.
**★ = one of the 6 MVP nodes** (all in D1: NUM.S, NUM.F, NUM.2, NUM.3, NUM.4, NUM.5; built first, prereq-closed,
verified by the automated closure test against the registry). All other starred/product nodes below are Phase 2 (Days 13 to 24) product-target work, not MVP;
*(item-family)* = questions come in flavors with different upstream needs.

**D1: Real Numbers & Arithmetic (6)** - ★ NUM.S: Signed-number
arithmetic - ★ NUM.F: Fraction arithmetic - ★ NUM.2: Order of operations
- ★ NUM.3: Field properties (commutative, associative, distributive,
identity, inverse) - ★ NUM.4: Evaluate & simplify algebraic expressions
- ★ NUM.5: Ratios, rates, proportions, percents, units

**D2: Exponents & Radicals (5)** - ★ EXP.1: Exponent laws (evaluate &
simplify, incl. zero & negative exponents) - ★ RAD.1: Evaluate &
simplify roots - RAD.2: Combine radical terms; rationalize denominators -
RAD.3: Convert between fractional-exponent and radical form *(promoted from extended 2026-07-24)* -
RAD.4: Simplify radicals with variable radicands; `sqrt(x^2) = |x|`; even roots of negatives undefined over the reals *(new node, D2 QA pass 2026-07-25; items checker-gated)*

**D3: Linear Equations, Inequalities & Absolute Value (5)** - ★ LIN.1:
Solve one-variable linear equations - LIN.3: Rearrange a formula to isolate a variable - LIN.4: Solve linear & compound
inequalities; interval notation - LIN.5: Solve absolute-value equations *(promoted 2026-07-24; item gate cleared 2026-07-27)* - LIN.6: Solve absolute-value inequalities *(promoted 2026-07-24; item gate cleared 2026-07-27)*

**D4: Polynomials & Quadratics (6)** - ★ POL.1: Polynomial arithmetic
(add/subtract/multiply, FOIL) - ★ POL.2: Factoring (GCF, trinomials,
grouping, perfect squares, difference of squares) - POL.3: Solve
quadratics by factoring & square-root property *(item-family)* - POL.4:
Solve quadratics by completing the square & the quadratic formula -
POL.5: Graph quadratics (vertex, intercepts, min/max) - POL.6: Polynomial end behavior (degree & leading coefficient) - POL.7: Analyze polynomial graphs: real zeros, multiplicity, turning points *(promoted from extended 2026-07-24)* - POL.8: Polynomial long & synthetic division *(new 2026-07-24)*

**D5: Rational Expressions (6)** - ★ RAT.1: Simplify rational
expressions (track excluded values) - RAT.2: Multiply & divide rational
expressions - RAT.3: Add & subtract rational expressions - RAT.4: Simplify complex/nested rational expressions - RAT.5: Graph
& analyze rational functions (domain, asymptotes, holes, end behavior) - RAT.6: Solve rational equations; reject extraneous solutions *(promoted from extended 2026-07-24)*

**D6: Functions & Graphs (11)** - ★ CG.1: Coordinate plane (plot points,
intercepts, distance, midpoint) - ★ FUN.1: Function notation,
evaluation, vertical-line test - FUN.2: Domain & range - FUN.3: Piecewise functions (evaluate & graph) - FUN.4: Read
graph features (increasing/decreasing, extrema) - FUN.5: Average rate of
change - FUN.6: Difference quotient *(item-family)* - FUN.7: Composition
of functions - FUN.8: Inverse functions (incl. one-to-one) - FUN.9:
Transformations (shifts, reflections, stretches; even/odd) - FUN.10: Graph and interpret absolute-value functions *(promoted from extended 2026-07-24)*

**D7: Linear Functions (4)** - ★ LF.1: Slope as rate of change - LF.2:
Equations of lines (write, graph, parallel/perpendicular) - LF.3: Build a linear model from a description or data - LF.4: Solve a system of two linear equations (graphing, substitution, elimination) *(promoted from extended 2026-07-24)*

**D8: Exponential & Logarithmic (6)** - ★ EL.1: Evaluate exponential
functions (base e, compound interest) - EL.2: Graph exponential functions & transformations - EL.3: Logarithms: convert form,
evaluate common & natural logs - EL.4: Graph logarithmic functions; state domain *(promoted from extended 2026-07-24)* - EL.5: Logarithm properties
(product/quotient/power, expand/condense, change of base) - EL.6: Solve
exponential & logarithmic equations *(item-family)*

**D9: Trigonometry (9)** - ★ TRG.1: Angles & radians (convert,
coterminal) - ★ TRG.2: Right-triangle trig (special angles, cofunctions)
- TRG.3: Unit circle & reference angles - TRG.4: Six trig functions &
fundamental identities - TRG.5: Graph sine & cosine (amplitude, period,
phase shift) - TRG.6: Graph tangent & reciprocal functions *(promoted from secondary to active target 2026-07-24)* - TRG.7: Evaluate and compose inverse trig functions *(promoted from extended 2026-07-24)* - TRG.8: Solve trig equations *(item-family; post-MVP)* - TRG.9: Core trig identities: sum/difference & double-angle *(new 2026-07-24; items checker-gated)*

**D10: Geometry (2)** *(new domain, 2026-07-24 coverage expansion — presented as a new island; game/theme presentation is unassigned, pending Evan + Anthony)* - GEO.1: Pythagorean theorem, similar triangles & basic angle relationships *(new)* - GEO.2: Area, perimeter, volume & surface area of standard figures *(new)*

*(This enumerates all 62 in-product nodes; the 6 D1 nodes are the MVP set (starred), the rest are Phase 2 product-target work. The registry skill_graph.json is the authoritative list; if this and the registry disagree, the registry wins. After the 2026-07-24 coverage expansion the `extended` and `secondary` populations are empty; only retired/cut dead IDs are excluded and not listed here.)*

### 5.4 Prerequisite edges

Plain A→B dependency map drives **routing** (where to send a student who
fails) and the game's **roads**. No typed-edge schema, no hub list
(rejected as over-engineered). Four nodes are structurally item-family
(their questions come in flavors with different upstream needs):
**POL.3** (quadratic solving), **FUN.6** (difference quotient), **EL.6**
(solve exp/log), and **TRG.8** (solve trig equations). The first three are
the ones authored/verified in scope; TRG.8 is post-MVP, so the Day-1
authoring tasks reference the **3 in-scope** item-family breakdowns. The
registry (`skill_graph.json`) is authoritative on which nodes are
item-family. Full edge list in the companion edge doc; team verifies
in Week 1.

### 5.5 Diagnostic mechanics

-   **Static fixed-form with lightweight level-branching** on a manual
    **1--3 difficulty scale**. No IRT/calibration (documented as future
    work).
-   **\~2 items per node shown** (one difficulty-2, one difficulty-3),
    branching to skip/deepen when the signal is clear, which keeps
    onboarding tolerable for the anxious population. Item **bank holds
    \~4+/node** (enables parallel pre/post forms + variety).
-   The diagnostic **places** (sets each node's `placement_estimate` — the
    blueprint visuals + the lesson entry point); it does not confirm
    mastery, the practice problems do. *(⚠ **AMENDED 2026-07-23, RATIFIED 2026-07-26** (Evan ack'd; Anthony did not), folded into `docs/Contracts.md` §1.1:
    for a **passed** node (`placement_estimate >= 2`, measured or inferred)
    the building is now unlocked + completed on placement **without** the
    lesson/practice; the diagnostic still writes only `placement_estimate`
    and the mastery lane completes on the passed placement. Failed nodes
    (0/1) still confirm via practice. See
    `docs/Contracts_Amendment_Diagnostic_TestOut_Unlock.md`.)*
-   **Format:** multiple-choice acceptable in the diagnostic (guessing
    washes out under branching); constructed-response weighted in the
    lessons.
-   **Error typing from distractors (cheap):** each diagnostic MCQ
    distractor is authored to a specific node misconception, so a wrong
    pick logs a typed error at zero extra item cost. The diagnostic stays
    thin (it does not route on error type); it just emits coarse
    misconception flags to the log. Rich detection/routing lives in the
    lessons. See Error_Typing_Spec.

### 5.6 Readiness / cut-score rule (LOCKED, all-nodes)

-   **Node mastered** = mastery ≥ 2, i.e. ≥80% (4 of 5) correct on the
    node's practice set, which spans a difficulty mix by construction
    (scale 0--3; 3 = 100%/5-of-5, a cosmetic "gold" state, nothing is
    gated behind it). Difficulty tags shape the *composition* of the set,
    not a separate gate. Full rule in Mastery_Scoring_Spec.
-   **Readiness is SCOPED, not one global flag** (the readiness function
    takes an explicit population, so it never silently infers which set it
    counts):
    - **Foundational ready** = all **6 D1 MVP** nodes mastered. (The MVP
      claim: D1 Real Numbers & Arithmetic fluency, depth-first.)
    - **Product ready** = all **62 in-product** nodes mastered (6 mvp +
      56 target, after the 2026-07-24 coverage expansion and the 2026-07-25
      D2 QA append; was 48 = 6+42, then 61 = 6+55).
      This is the product's full "calculus-ready" claim; the 62 are the
      nodes the product treats as required.
    - The **`extended`** population is now **empty**: the 9 formerly-extended
      nodes (RAD.3, LIN.5, LIN.6, POL.7, RAT.6, FUN.10, LF.4, EL.4, TRG.7)
      were promoted into product target in the 2026-07-24 coverage expansion,
      and TRG.6 was promoted from `secondary`. Newly added POL.8, TRG.9, and
      the Geometry domain (GEO.1, GEO.2) are also in product target, as is
      RAD.4 (appended by the 2026-07-25 D2 QA pass). So the
      readiness scope grew from 48 to 62 CORE nodes.
-   **Domain ready** = every in-scope node in that domain mastered (no
    hub/leaf distinction, chosen for explainability). Scope is passed
    explicitly, e.g. `isReady(student, scope = "foundational" | "product")`;
    the registry `product_scope` field defines each population.
-   **Accepted consequence:** most students start "not ready"; "ready"
    is the finish state the game drives toward. Thresholds are
    expert-set, non-empirically-validated.

### 5.7 Difficulty tagging (LOCKED, feature-based)

Tag by what an item *structurally requires*, anchored to exemplars
(humans predict raw difficulty poorly): - **L1** single-step, clean
numbers · **L2** multi-step or one complication
(fraction/negative/method choice) · **L3** multi-step + a twist
(translation, non-standard form, combined sub-skills). - Authors tag by
matching against 2--3 anchor items per level. **Bank composition
\~1:2:1** (L1:L2:L3).

6. Lesson Design
----------------

Each building's lesson (the remediation unit): 1. **Mini-lesson** with
visuals and an **advisor NPC** narrating via interactive speech bubbles.
2. **Check-for-understanding** question (hint available); must pass
before practice. 3. **\~5 practice problems**, each with a
**request-hint button** giving guiding questions; problems vary context
(variable cues, no repetition). Interactive elements where appropriate
(draggables, sliders, graph plotting). 4. On wrong answers: **error-typed
feedback** (the wrong answer resolves to a specific node misconception,
which drives a targeted popup) plus scaffolding hints, escalating to a
full answer reveal only after hints are exhausted. 5. **Explanations +
misconception popups keyed to the resolved misconception** (not generic),
also surfaced on a correct answer to name the common slip the student
avoided. See Error_Typing_Spec. (Error typing is feedback/analysis only,
it never affects the mastery bar below.) 6. **Building mastery bar = 5 practice problems at 80%** (4 of 5;
hints count as correct, a full reveal counts as not-correct and needs a
fresh instance to recover the slot). 5 of 5 earns the cosmetic "gold"
state. See Mastery_Scoring_Spec for the deterministic rule.

**Learning-science guardrails:** no cognitive overloading, no
distracting visuals/text, constructed-response weighted (forces
retrieval, discourages answer-gaming), interleaving in review.

**Review / spacing (post-MVP):** v1 has NO decay; mastery is monotonic and
completed buildings stay complete. A post-MVP non-punitive `review_due`
nudge may surface most-missed concepts for optional interleaved review, but
it never lowers mastery. Independent review is encouraged up to a point,
then the app nudges the student onward (discourages unproductive
over-review).

7. Question Authoring
---------------------

-   **Seed** the initial bank from open-source materials (MyOpenMath /
    open textbooks); **AI generates** more using seeds as reference.
-   Every generated item goes through **two authoring steps**, both done
    by the team:
    1.  **Validate (solve-level):** factually correct, answer key valid,
        tests the intended node, unambiguous, and not too similar to
        existing items. Needs math fluency.
    2.  **Difficulty-tag (1--3):** apply the feature-based rubric
        (§5.7), matched against anchor items. Every item gets a
        difficulty tag at authoring.
-   What the team does **not** do: **empirically calibrate** difficulty
    (verifying via response data that a "level 2" behaves like one for
    real students). That's the cut IRT/calibration work, documented as
    future. So difficulty tags are assigned but not data-validated.
-   **Licensing:** open-source rendered items (e.g. MyOpenMath, CC BY)
    carry a re-share obligation → **the questions are not the moat; the
    game is.** Legal check before any commercial launch.
-   **Shared graphing component:** build ONE reusable graph widget
    early, since it amortizes across every graph-bearing lesson
    (quadratics, functions, transformations, sin/cos, rationals). Key
    feasibility lever.

8. Shared Data Contract (the integration seam)
----------------------------------------------

**The Contracts document is authoritative for the data model.** This section summarizes it; where they differ, Contracts wins.

Two distinct per-node values (do NOT conflate):
- **`placement_estimate`**: set by the diagnostic at onboarding (a ~2-item probe). Seeds the city visuals. Immutable after onboarding (the posttest does NOT overwrite it).
- **`mastery`**: **starts at 0**; confirmed only through demonstrated evidence (lessons and, post-MVP, standalone confirmation sets, NOT the storm). Drives "ready" and progression. Placement does NOT set mastery. *(⚠ **AMENDED 2026-07-23, RATIFIED 2026-07-26** (Evan ack'd; Anthony did not), folded into `docs/Contracts.md` §1.1: the diagnostic still never writes `mastery`, but a **passed** placement (`>= 2`, measured or inferred) is a completion trigger the mastery lane honors — build-without-lesson for passed nodes; failed nodes (0/1) still require the lesson. See `docs/Contracts_Amendment_Diagnostic_TestOut_Unlock.md`.)*

**One mastery writer.** A single **mastery service** is the only thing that writes `mastery`. **Lessons** (and post-MVP confirmation sets) **submit evidence** (`submitAssessmentEvidence`); the service recomputes correctness, applies the mastery-scoring rules, updates only nodes the evidence directly supports, idempotently, recording the evidence ID. **The storm is NOT an evidence source**: it is checkpoint-only, reading mastery and setting `neighborhood_checkpoint_cleared` once all required nodes are already mastered (see Mastery_Scoring_Spec Storm rule; this supersedes the earlier "storm submits evidence" framing). Mastery is monotonic: `mastery_new = max(existing, evidenced)`.

**The pre/post metric is NOT read from per-node state.** It is computed from immutable **`assessment_administration`** records (purpose = pre | post, fixed parallel forms) + **`assessment_item_response`** rows. Correctness is **recomputed server-side** from the raw answer + versioned key/equivalence-checker; the client-submitted `correct` is stored only as `client_correct` and is not authoritative. Report **aggregate** assessment gain, NOT per-node (~2 items/node is too noisy). At MVP the instrument is the 6 D1 nodes only, so the gain is a single aggregate D1 (foundational arithmetic-fluency) number; a 6-node instrument is small, so the claim is scoped and stated honestly as such. (Post-MVP, as more domains build, report overall + broad-strand, never per single-node domain.) See Assessment_Scoring_Spec §5.

`lesson_stage` and building-completion are derived so they can't contradict mastery (a storm can raise mastery without a lesson; completion reads mastery, not lesson_stage alone).

9. Architecture
---------------

*(Rendered diagrams in the companion Architecture doc; summary here.)*

### 9.1 Layers

-   **Client (web app):** three UIs (Diagnostic, Lesson, Game) + shared
    components: the **graphing widget** (SVG, lessons/diagnostic only),
    **math input + answer-space check**, and the **state client**.
-   **Core services:** three engines mapped to owners: **Diagnostic**
    (Gabe, writes `placement_estimate`, never mastery), **Lesson**
    (Anthony, **submits evidence** to the mastery service), and
    **Game/storm** (Evan, reads mastery + sets the checkpoint flag; does
    NOT submit mastery evidence). A single **mastery service** is the only
    mastery writer.
-   **Data stores:** the shared **student-state** object (§8), the
    static **skill graph** (62 CORE nodes in the registry after the 2026-07-24
    coverage expansion; 62-node product target; see §5.3), the **item bank**, and **auth/accounts**.
-   **Authoring pipeline (offline):** seed from open banks → AI-generate
    → team validate + difficulty-tag → into the bank. Never a runtime
    service.

### 9.2 Resolved tech decisions

-   **Rendering, per-surface & independent.** Graphs live only in
    lessons/diagnostic, so no shared rendering tech: game framework
    (React Three Fiber — React + three.js; originally scoped as
    PixiJS/Phaser) for the city, SVG for the graphing widget. They're
    different views, not one canvas.
-   **Backend, AWS-native (Aurora Postgres + Cognito, all data access
    through a Lambda).** Chosen for **auth + persistence** and relational
    fit: state is
    a `student_node_state` table keyed by (student\_id, node\_id), the
    readiness check is one SQL `GROUP BY ... HAVING`, and the
    raw-response log + inheritor analysis are naturally relational. **No
    realtime:** the game reads state **load-on-enter +
    refresh-on-explicit-event** (a single student on a single screen has
    no concurrent change to react to; realtime is off-roadmap).
    Per-student isolation is app-layer: the Lambda scopes every query
    to the `student_id` from the verified Cognito token — a
    least-privilege DB role, not row-level security.
    *(Originally Supabase, setup-free for the Week-1 deliverables — and
    Firebase before that, dropped once realtime proved irrelevant;
    migrated to an all-AWS footprint per mentor direction. Postgres
    still fits the queries and the team's comfort. See docs/Deployment.md.)*
-   **Scoring, client-graded + raw-response logging.** All grading is
    client-side (self-directed tool, no payoff to cheating, so no
    anti-cheat theater: no Cloud Function, no key-split). Grading logic
    isolated in one module for future portability. Integrity comes from
    an **append-only raw-response log** (a Postgres table in Aurora;
    fields incl. item+version, template params, form+version, key +
    equivalence-checker version, `client_correct` (non-authoritative),
    server-recomputed `correct`, context, form, attempt, timestamps,
    hints, time-on-item, idempotency key; INSERT-only, enforced
    app-layer — the Lambda is the sole DB writer). It serves three
    consumers with one pipe: the pre/post
    metric (computed server-side from immutable `assessment_administration`
    records, NOT from mutable per-node state), whoever inherits the
    project (deferred calibration is impossible retroactively without
    this data), and debugging. **The gain is reported as an aggregate
    (overall + broad-strand) score change, not per-node or single-node-domain gain** (~2
    items/node is too noisy for node-level claims), and we do NOT assume
    measurement error simply cancels across pre-minus-post (form
    differences, guessing, regression-to-mean, attrition don't auto-cancel).
    MVP builds the logging *pipe*; analysis is post-MVP.
-   **AI generation & infinite practice, offline + templates.** No
    runtime LLM. Static items are validated individually. **Infinite
    practice uses parameterized templates (AIG):** validate a template
    once, instantiate deterministically at runtime with bounded
    parameter ranges (constrained so every instance stays valid and
    on-difficulty). So the item bank holds two representations: **static
    validated items** and **parameterized templates**.
-   **Mobile, QR one-shot hand-off** (see §10), writes only its own
    lane, never mastery.

### 9.3 Parallel-work / merge safety

Three engines = three code lanes (rarely conflict). Conflicts come from
*shared files*, so: **anything touched by \>1 person gets its
interface/schema frozen early in its own small file; implementation
happens behind it.** Concretely: - **State schema** lives in ONE shared
module, locked Day 1, changed only by all-hands agreement (prevents
silent divergence, which is worse than a merge conflict). -
**Shared-component interfaces** (graphing widget, math input) ship as
frozen-API stubs Week 1; consumers build against the interface. - **Data
split fine-grained** (one file per node/domain for items; edges in a
separate file) so authoring never collides. - **Branch strategy:**
short-lived branches off a shared integration branch, merged daily-ish
(defuses the Week-3.5 big-merge risk).

10. Platform
------------

-   **Web application** (primary).
-   **Mobile work-upload: a QR one-shot hand-off, NOT a native app.** On
    desktop, "upload my work" shows a QR carrying a one-time session
    token; the student scans it, a single-purpose phone-browser page
    opens (no login), they snap a photo, it uploads against that
    session, desktop reflects it. No app store, no install, same web +
    AWS-native stack (Cognito + Lambda + S3). Chosen because app-store
    approval is incompatible with the 24-day sprint and install friction
    deters the target users.
    **Post-MVP**, but cheap enough it could sneak in.
-   **Accounts / auth / progress persistence:** required in v1.

11. Success Metric
------------------

**The success metric is the in-house parallel-form pre/post gain** (founder decision; full rationale in Assessment_Scoring_Spec §7a). Every product needs an objective metric and teaching-to-the-test is the universal condition of any test, so we use our own aligned instrument.

**A control group is required for any efficacy claim, but the team does NOT run it.** We build the pipeline that *makes* a controlled study possible (treatment/control assignment, immutable records, parallel forms, clean export); the actual control-vs-treatment study is run after handoff (there is no student cohort during the build, the team builds and hands off). A single-group pre/post drifts up ~0.25 to 0.5 SD from retest + regression to the mean regardless of learning, so until that controlled study runs, any gain we report is an **uncontrolled** within-instrument pre/post, honest as-is but not proven efficacy.

**The MVP ship deliverable is the pipeline working**: it administers a **pre** and a **post** on parallel forms, logs both immutably, and computes a reproducible **D1 foundational gain** on test input, and it is *capable* of a controlled comparison out of the box. Reported with n, means, attrition. External instruments and downstream course outcomes remain available as future evidence, not required for the core metric.

12. MVP Scope
-------------

**MVP = a credible FOUNDATIONAL-READINESS game, DEPTH-FIRST on ONE domain
(D1, Real Numbers & Arithmetic): a diagnostic, city, lessons, and pre/post
measurement pipeline all scoped to the 6 D1 nodes / 6 per-node lessons
(~3 interaction archetypes) + the full core loop, with a RICH D1 game layer.** Framed as tier 1 of the
62-node product-target calculus-readiness system (honest measurement,
ambitious framing).

**Why depth-first (mentor guidance):** depth over shallow breadth. One
fully-realized neighborhood is a stronger demo and a cleaner build than 9
thin ones. So the MVP narrows everything to D1, built out deep, rather than
spreading across all 10 domains. The other 9 domains are post-MVP. The full
62-node / 10-domain product (after the 2026-07-24 coverage expansion; the tenth
domain is the new Geometry island) remains the Day 13 to 24 goal (§15); only the MVP
scope narrowed.

**MVP node set (6, all of Domain D1, dependency-closed, verified):** - D1:
NUM.S, NUM.F, NUM.2, NUM.3, NUM.4, NUM.5. - Each is its own lesson
(**1 node = 1 lesson = 1 building**); they reuse **~3 interaction
archetypes** (L1 = NUM.S + NUM.F; L2 = NUM.2 + NUM.3 + NUM.4; L3 = NUM.5).
*(Closure holds within D1: NUM.4 depends on NUM.2/NUM.3, NUM.S/NUM.F are
foundational. The closure test is automated in CI, MVP count = 6, so the set
can't silently break as nodes are added.)*

**"Foundational readiness" is a distinct, honestly-claimed state**, now
scoped to D1 arithmetic fluency, not full calculus readiness. At MVP the
placement diagnostic **assesses only the 6 D1 nodes**; **only the D1
neighborhood is built at MVP, the other 8 are shown as locked/roadmap**
(never a dead-end "coming soon"). This keeps the diagnostic short for the
anxiety-sensitive population and lets the one built domain go deep. Expanded
placement and neighborhoods activate only as remediation is built post-MVP.
(See README 10a and Assessment_Scoring_Spec; the pre/post metric is likewise
the 6 D1 nodes.)

**Rich D1 game layer (pulled into the MVP because it goes deep on one
domain):** different question/answer types (per the `answer_type` taxonomy
in Answer_Equivalence_Spec) render as visually distinct BUILDING types
(numeric-answer, multiple-choice, constructed-response, etc.), and mastering
different item types yields different RESOURCES used to build and customize
the city. This makes the D1 city-builder deep and varied, not the thin
cosmetic-only version.

13. Roles
---------

-   **Evan (Game).** Owns the city-builder: rendering, construction
    stage, operation stage, storm battles, NPC integration, overall game
    feel. (No decay mechanic in v1: mastery is monotonic; a post-MVP
    `review_due` nudge is the only spacing surface.) The largest single
    surface; he wants it and can carry it.
-   **Gabe (Diagnostic & structure).** Owns the diagnostic engine, skill
    graph / node data, question curation + difficulty tagging, cut-score
    logic, and the two seam pieces between engine and game: the **shared
    graphing component** and the **diagnostic→city wiring**
    (infrastructure, not game-design, pulled off Evan's plate to de-risk
    the bottleneck).
-   **Anthony (Lessons & pedagogy).** Owns lesson builds,
    learning-science design, tutor/hint/scaffolding flow, review/spacing
    mechanic.
-   **Handoff:** Gabe hands Anthony validated + difficulty-tagged items;
    Anthony builds the lesson around them.
-   **All three, Day 1:** stand up the shared data contract together
    (the one thing nobody owns alone).

14. Decisions Already Locked (build inputs, NOT timeline work)
--------------------------------------------------------------

*Settled in design. The build starts from these; they are not tasks. The
only decision-work left is the prerequisite-edge math check.* - **Skill
graph:** 62-node target (post 2026-07-24 coverage expansion) + 6 MVP D1 nodes, depth-first (§5.3, §11). - **Data contract:**
per-node schema (§8); Week 1 *implements* it, doesn't re-debate it. -
**Diagnostic spec:** \~2 items/node, 1--3 rubric + anchoring, parallel
forms (§5.5, §5.7). - **Readiness rule:** scope-tagged all-nodes-mastered
(foundational = 6 D1 nodes; product = 62 in-product nodes; §5.6). -
**Sourcing + authoring flow** (§7), **per-node lesson definition of done**
(§6). - **Still open (real work, Day 1--2):** verify prerequisite edges
(team math-check) + confirm the 3 item-family breakdowns.

15. Timeline: Build Deliverables (aggressive; 7 days/week)
----------------------------------------------------------

*Two phases: **MVP DONE by Day 12**, then ranked expansion toward the **62-node product ceiling by Day 24** (raised from 48 in the 2026-07-24 coverage expansion; see §5.3). Pace is deliberately fast, but validation throughput determines achieved breadth; Day 24 ships a coherent product at whatever ranked-backlog depth is complete. Format: deliverable, \[owner\], (deadline).*

### PHASE 1: MVP (depth-first D1 foundational game, 6 nodes / 6 lessons, ~3 archetypes), DONE by Day 12

*The MVP is Domain D1 (Real Numbers & Arithmetic) only, built out deep. This is LESS content than the old 18-node plan; the freed capacity goes into DEPTH on D1 (rich building types, resources, deeper city), not breadth.*

**Days 1-2: Skeleton (most of this scaffold already exists).**
-   **Shared data contract + skill-graph registry wired in code**, per-node state read/writable; product reads `skill_graph.json`. **\[All\]** *(Day 1)*
-   **Prerequisite edges verified** (D1 first) + 3 item-family breakdowns confirmed. **\[Gabe\]** *(Day 1)*
-   **Answer-checker capability spike** run and a stack chosen (the one semantic blocker; gates item authoring). **\[Gabe\]** *(Day 2)*
-   **Auth + persistence** working; the **shared graphing component interface stub** is available. Full scored SVG implementation is Gabe-owned and must land before the first Phase-2 graph lesson. **\[Gabe\]** *(Day 2 stub)*
-   **Gate (Day 2):** three lanes building against frozen interfaces.

**Days 3-5: Core loop closed end to end.**
-   **Diagnostic** serves tagged items, writes `placement_estimate`, doubles as pretest, over the 6 D1 nodes. **\[Gabe\]** *(Day 4)*
-   **City** renders the D1 neighborhood + buildings + storm overlay from seeded state (other 8 neighborhoods locked/roadmap). **\[Evan\]** *(Day 3)*
-   **First per-node lesson end-to-end** (advisor → check → 5-item practice → mastery), + mastery service writing per-node mastery. **\[Anthony\]** *(Day 4)*
-   **Storm = checkpoint** working for the D1 neighborhood; construction stages advance. **\[Evan\]** *(Day 5)*
-   **Gate (Day 5):** diagnose → seeded city → complete one building → clear its storm, end to end.

**Days 6-9: D1 content + depth + measurement.**
-   **Item bank for the 6 D1 nodes** authored, validated, difficulty-tagged, parallel pre/post forms. **\[Gabe\]** *(Day 8)*
-   **All 6 D1 per-node lessons built** (all 6 D1 nodes remediable; reusing ~3 interaction archetypes). **\[Anthony\]** *(Day 9)*
-   **Rich D1 game layer:** question/answer types render as distinct building types + yield distinct resources (per Answer_Equivalence_Spec `answer_type`); deeper city mechanics. **\[Evan\]** *(Day 9)*
-   **Pre/post measurement pipeline live**, reproducibly computes a blueprint-matched D1 aggregate score difference on test input. **\[Gabe\]** *(Day 8)*
-   **D1 neighborhood fully playable**; advisor NPC hooked up. **\[Evan/Anthony\]** *(Day 9)* *(Misconception popups / error typing deferred post-MVP, 2026-07-20 — see Error_Typing_Spec / Post_MVP_Backlog.)*

**Days 10-12: Polish to MVP-complete.**
-   Full loop playable on the D1 neighborhood; rich building types + resources; error-typed feedback; light usability pass. **\[All\]** *(Day 11)*
-   **Gate (Day 12): MVP COMPLETE**, polished depth-first D1 foundational-readiness game, demoable end to end, measurement pipeline reproducibly computing a blueprint-matched D1 aggregate score difference on test input.

### PHASE 2: Ranked expansion toward the 62-node product ceiling by Day 24

**Days 13-20: Breadth to the 62-node product target (the other 9 domains, incl. the new Geometry island).**
-   **Remaining 56 product-target nodes across the other 9 domains** + their per-node lessons (reusing ~45 lesson shells total), authored + validated in calc-proximal priority order, pulling from the ranked backlog. **\[Anthony/Gabe\]** *(Day 20)*
-   **Diagnostic + city extended** to the full node set / all 10 neighborhoods as content lands. **\[Gabe/Evan\]** *(Day 20)*
-   **Richer game (cosmetic economy, richer storms/NPC feel)** layered on the working loop, extending the D1 building-type/resource model to the new domains. **\[Evan\]** *(rolling)*

**Days 21-24: Harden + ship.**
-   **Integration hardening** against the real shared data model. **\[All\]** *(Day 22)*
-   **Final content QA** (validation pass: correctness + non-similarity) + **usability passes** on the full build. **\[Gabe/Anthony\]** *(Day 23)*
-   **Demo build + walkthrough + handoff doc**. **\[All\]** *(Day 24)*
-   **FINAL GATE (Day 24): coherent ship at achieved breadth, demo, and handoff.** The 62-node build is the stretch ceiling; see `Post_MVP_Backlog.md` for floor/likely/ceiling ship states.

16. Outside the Day-12 MVP / Documented-Only
---------------------------------------------

-   The other 9 domains / 56 non-MVP product-target nodes + their lessons are excluded from the Day-12 MVP and pulled from the ranked Days 13-24 backlog (the 9 neighborhoods are locked/roadmap at MVP). *(Was "8 domains / 42 nodes"; superseded by the 2026-07-24 coverage expansion. Count from the registry, `packages/skill-graph/src/skill_graph.json`.)*
-   Full IRT adaptivity + calibration; pre/post gain on a common
    validated scale.
-   Randomized control-group validation (post-launch, requires ongoing
    ownership).
-   Mobile work-upload (QR one-shot hand-off) beyond a stub.
-   Decay/spacing tuning specifics.
-   TRG.8 lesson (in the readiness model, post-MVP build).

### 16.1 Roadmap vision: "Attacks = Calculus I" (future, beyond the 62-node product)

Endgame arc that extends the product past prerequisite readiness into calculus itself. Once a student's city (their built prerequisite skills) stands, actual **Calculus I concepts, limits, derivatives, integrals, arrive as ATTACKS** on the city, which the student defends against using the skills they have built. This turns "prerequisites mastered" into a launch point rather than the finish line. **Roadmap / future scope only**, documented so the endgame vision is not lost; no MVP build and beyond even the 62-node product target.

17. Key Risks
-------------

1.  **The seam / data contract (Week 1).** If fuzzy, Weeks 2--3 build
    against wrong assumptions. Highest-leverage thing to nail.
2.  **Lesson-build depth (Week 2).** The MVP is only 6 D1 lessons (~3 interaction archetypes), but built DEEP (rich building types, resources, deeper city mechanics), so the lift shifts from lesson count to per-domain depth. Full-product breadth (62 lessons / ~45 archetypes across 10 domains) is the Phase 2 lift.
3.  **Shared graphing component (Phase 2 critical path).** It does not block
    the D1 MVP, but every later graph-bearing lesson stalls without it. Build
    and spike it before those nodes are authored.
4.  **Validation throughput (ongoing).** Hand-validating AI-generated
    items competes with building; the quiet capacity sink.

18. Open (non-blocking) items
-----------------------------

-   (Resolved: no separate reduced-practice path; strong students clear the same 5-item set. Former 3-at-100% proposal dropped to keep one mastery mechanism.) Former open item, tune
    if needed).
-   Exact post-MVP review/decay timing and tuning.
-   **Resolved:** FUN.2 and all other Functions nodes remain outside the
    6-node D1 MVP; they enter through the ranked Phase-2 product backlog.
