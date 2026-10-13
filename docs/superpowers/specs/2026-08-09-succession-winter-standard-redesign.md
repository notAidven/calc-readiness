# Succession crisis: Winter-standard vertical slice

**Date:** 2026-08-09  
**Baseline:** `integration` at `cb60ef63`  
**Scope:** the learner's current city, from its existing crisis call through settlement and return

## The behavioral bar

The current Hard Winter earns its drama from eight observable behaviors, not from its old
specification:

1. The threatened city owns the frame; the controls occupy the margin.
2. The advisor introduces a threat already visible in the world.
3. One round asks for one consequential choice, stated in one sentence.
4. The threat has a visible leading edge and advances only after the learner acts.
5. A declared action previews on the world; the earned result then changes that same world.
6. Buildings visibly cross named states, with a shape and words as well as a tone.
7. The ending is a staged event over the resulting city, and the resulting damage remains visible.
8. Camera, restrained physical sound, live-region copy, reduced motion, and low-cost still
   fallbacks all report the same state.

The integrated Succession baseline misses the first, third, fourth, seventh, and most of the
eighth behaviors. Its procedural assets are sound, but the forum is a small static illustration
beside a scrolling control column. The warning block, statues, shutters, and port crane are too
small to carry the state; every camera frame is identical; the six repeated district cards
duplicate the world; both responses may be taken after one batch, so the apparent choice is not a
tradeoff; one generic thud fires when questions begin rather than when a civic action lands; and
settlement is another card in the same rail.

## Dramatic arc

### 1. Proclamation

Oru enters over the city already on screen. The roster is derived from its stable placed-building
ids, capped at seven, while transforms remain in the city renderer. The opening camera holds the
actual building cluster, Town Hall, roads, citizens, and the next ward's hoist in one frame.

### 2. Pressure

Each three-question batch is one turn of civic pressure. When the batch closes:

- the camera drives to the named ward;
- the warning block becomes the rival statue;
- a bought civic closes visibly when one anchors the ward; skill buildings and the Town Hall never
  lose capacity;
- a short world-anchored notice names the real building anchoring the ward;
- the next hoist appears at the next undecided ward;
- the rival crowd sound plays once for the civic event, never once per prop.

No transition advances on elapsed time.

### 3. Response

Accuracy still banks 0–3 influence. The learner makes **one response per batch**:

- **Rally the next ward** spends three influence and raises the learner's claimant there before the
  rival can take it.
- **Reopen the lost civic** spends one influence and removes the newest shutters, while its rival
  statue remains.

The proposal is shown on the city before commitment. Committing drives the camera to the target,
lands the material thud, changes the geometry, and closes the response for that batch. There are
two small mechanic changes: the current implementation permits both responses after one batch,
which turns the two-button treatment into an upgrade checklist rather than a decision; and Rally
moves from two influence to three so that only a perfect batch can answer the rival immediately.
Without that second change, the new one-response limit makes 2/3 and 3/3 strategically identical
and breaks the existing strictly-better accuracy ladder.

Unchanged: three questions per batch, influence earned by accuracy, the Reopen cost, no timer, no
mastery or progression writes, rival drift, reversible bought-civic suspension, and the existing
server-authoritative command/persistence shape. The learner roster is now a deterministic selection
of between two and seven actual stable placement ids rather than six authored stand-ins.

### 4. Settlement

When the last ward decides, the camera returns to the actual city overview. The crisis controls
leave and a civic roll-call names the verdict over the final markers beside the learner's own
buildings. No generic success language is used over a divided outcome.

The battle state persists the roster's actual placement ids. Before settlement, the city session is
untouched. On explicit Return, only losing members that are actual bought civics enter the existing
typed `suspended_civic` report and the city session re-reads; skill buildings and the Town Hall are
explicitly non-destructive. The settled marker layer remains on the same city and is reconstructed
from persisted battle state after reload.

## Scene grammar

- The existing city canvas remains full-bleed. A compact opaque civic rail sits over its left
  margin on wide screens and becomes a bottom sheet on phones.
- Only one ward carries a large state badge: the current target or the event that just landed.
- Allegiance remains non-color-first: standing/raised-arm claimant versus seated/forward-knee
  claimant, chevron versus ring, open versus shuttered openings, and explicit text.
- State-linked supporters make civic conflict legible at distance. Their count and side come from
  ward control; they are not ambient decoration.
- Camera movement follows only reducer events. It eases toward the affected ward, then holds.
- Repeated district cards become one compact roster track of up to seven real building names. Full
  spoken labels remain in the DOM.
- No bloom, glow, gradient wash, timer pulse, map fill, or autonomous conflict animation.

## Reduced motion and performance

- Reduced motion snaps to the same final camera and geometry states; it removes no information.
- New movement uses existing scene objects and one camera interpolation. No post-processing,
  textures, local lights, additional canvas, or per-frame React state.
- The procedural conflict layer is capped at seven markers and three supporters per decided ward.
  The city's GLBs are not duplicated.
- The phone layout preserves at least the upper third of the world and keeps the active control
  reachable in a bounded scroller.

## Review frames

At both `1024x580` and `390x580`, capture the full learner-facing surface at:

1. advisor opening and unobscured opening world;
2. first rival claim with the next ward threatened;
3. settlement at one end of the outcome range with final markers visible on the same city.

The frame must show the world around the changed object. A component crop or a box measurement is
not evidence for this redesign.
