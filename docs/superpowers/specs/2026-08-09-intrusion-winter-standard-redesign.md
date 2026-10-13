# Intrusion: Winter-standard city crisis redesign

**Date:** 2026-08-09  
**Status:** implementation brief  
**Baseline:** `origin/integration` at `cb60ef63`

## Problem

The shipped Intrusion is transparent over the city, but it does not happen to the city. One
small relay fixture changes while the island, buildings, people, camera, and weather remain
ordinary. At 390x580 the city is hidden completely. The rail repeats an abstract nine-band
meter, three rules, and two text cards; the world contributes neither the decision nor the
consequence.

Hard Winter's transferable standard is behavioral, not cosmetic:

1. the actual settlement is the board;
2. the threat has a visible position and advances only when the player acts;
3. the player's commitment is previewed on the world before it lands;
4. every answer produces immediate visible feedback, and the resolved batch changes the world;
5. buildings carry materially different threat, protection, damage, and loss states;
6. framing preserves the threatened settlement beside the controls;
7. escalation makes the next decision more urgent without adding rules;
8. the ending is a separate beat over the resulting city and names what persists;
9. sound reinforces a physical event and is never the only feedback;
10. reduced motion preserves the same state, spatial read, and consequence.

The current Intrusion scores **2/10**: it uses the real canvas and has a distinct ending. It
does not meet the other eight behaviors.

## Direction

The counterfeit feed becomes a single hard-edged probe moving between the learner's real
buildings. It is infrastructure, not cyber decoration: one segmented route, one directional
probe, no bloom, particles, code rain, or ambient random motion.

The existing Cut-or-Restore rules stay intact. Their city expression changes:

- **Cover the intakes** (`cut`): each correct answer closes one physical cover on the next
  exposed buildings. A fully covered city pins the probe; gaps let the feed reach the next hop.
- **Trace and restore** (`restore`): the one clean copy pushes a visible return pulse through
  the route, restores record bands, and then reopens the covers exactly as the engine already
  specifies.

The nine record bands remain the persistence/economy contract. The city view is a deterministic
projection of that state over the placements already on the island; it writes no mastery,
capacity, placement, road, or economy state.

## Dramatic arc

1. **Opening — breach.** The camera frames the real settlement in the space beside the rail.
   A solid probe occupies the first city hop. Every involved building has a small physical
   evidence plate; four are already crossed out to match the four overwritten bands.
2. **Commitment — intervention.** Arming Cover outlines the covers on real buildings. Arming
   Trace poses the clean-copy return pulse. Nothing advances until commitment.
3. **Answers — pressure.** Three lock marks surround the active probe. Each checked answer
   immediately resolves one mark as held or broken. This is visual feedback only; the engine
   still resolves once after all three questions.
4. **Round resolution — escalation.** Closed covers clamp onto buildings. If any feed gets
   through, the probe moves exactly one city hop and the earlier evidence plates become stale.
   The rail says the same event in one line. If nothing gets through, the probe stays pinned.
5. **Ending — contain or scar.** A whole record collapses the probe and leaves the route quiet.
   A partial record leaves crossed evidence plates on the actual relay as the existing durable
   scar. The conclusion is a distinct compact sheet over the visible city.

## World-state grammar

| State | World carrier | Text equivalent |
| --- | --- | --- |
| Probe location | directional solid probe above one real building | “Signal at …” |
| Exposed hop | open intake frame and upright evidence plate | “Exposed” |
| Covered hop | filled mechanical cover plus closed crossbar | “Covered” |
| Current evidence | upright bright plate with uncrossed bars | “Current” |
| Stale evidence | same bars retained, plate tilted/dimmed, diagonal cut | “Old reading” |
| Answer held | one closed lock around the probe | “Held” |
| Answer missed | one visibly broken lock | “Gap” |
| Contained | probe lowered and route unlit | “Signal contained” |
| Partial ending | crossed bands remain on the relay | exact dark-band count |

No state relies on hue. Shape, posture, fill, and words remain sufficient in greyscale.

## Evidence age and engine truth

The engine gains two explicit facts which the old anonymous meter could not express:

- `probe_index`: the current city hop;
- `evidence_epoch`: the age of the current reading set.

A resolved round with `bands_through > 0` advances the probe by one hop and increments the
evidence epoch. A round with no feed through changes neither. Round logs record before/after for
both fields. The route length remains a renderer input, so the engine stores an unbounded hop
index and the city projection clamps it to the placements that exist. These fields do not alter
scores, dark-band arithmetic, outcomes, or persistence.

## Layout, camera, and advisor

At widths above 720px the compact rail stays on the right and the crisis framing fits the
settlement into the remaining strip. The rail leads with the one-line pressure/status strip,
then the two direct actions; the standing three-rule block is removed.

At 390x580 the real island remains visible in a top stage of at least 180px. Controls become a
bottom sheet and scroll inside their own region. The advisor owns the announcement before this
surface; the active surface uses one terse operational line rather than another briefing.

## Motion, sound, accessibility

- Motion is deterministic and player-triggered. The probe eases only from the previous hop to
  the new one; the clean-copy pulse travels only after Restore; lock marks resolve on answers.
- `prefers-reduced-motion` poses every object at its destination immediately. No carrier
  disappears and no information is reduced.
- Existing crisis commit and answer feedback sounds are reused. No looping alarm is added.
- The canvas remains `aria-hidden`. A DOM route/evidence summary names the active building,
  covered count, stale count, answer locks, and probe movement in live regions.
- All controls remain keyboard reachable, at least 44px, and focus returns after cancellation.

## Performance limits

- At most six real city targets, one route segment per adjacent target, one probe, one
  evidence plate and at most three cover bars per target.
- No post-processing, runtime textures, local lights, shadows on small markers, particles, or
  per-frame React state.
- Reuse geometries/materials within the renderer; animate transforms only.
- The full six-target armed layer must stay at or below 100 scene objects and add no network
  requests.

## Acceptance

The implementation is accepted only with:

- observed-red guards for renderer presence, engine-to-world mapping, per-answer feedback,
  evidence aging, carry-back/no-write behavior, keyboard/focus, and reduced motion;
- full-surface frames for opening, escalation, intervention, and resolution at exactly
  1024x580 and 390x580 on the production in-city mount;
- a final honest score against the ten-point Winter checklist above.
