# Plague crisis: live-city redesign and wiring brief

**Date:** 2026-08-09
**Baseline:** `origin/integration` at `cb60ef63ce84e5c196fcb240308297a64dfcd38c`
**Review viewports:** 1024x580 and 390x580
**Status:** implementation brief

## Root cause and current flow

The `?plague` route mounts `PlagueSurface` directly inside an empty `.city-shell`. It never mounts
`CitySurface`, `CityCanvasHost`, or `CityScene`. The result is the reproduced frame: sky, a DOM Care
House illustration, and controls with no island.

The production city has a separate path:

1. `useCrisisCall` derives the era-six trigger from completed era nodes.
2. `CitySurface` opens Oru's briefing and sets `plagueInCity`.
3. `PlagueInCity` mounts `PlagueSurface`, receives state from `PlagueSession`, and builds a temporary
   Three.js layer at the Town Hall forecourt.
4. `CitySurface` passes that object to `CityScene` through `crisisGround` and swaps in
   `PLAGUE_LIGHT`.
5. `PlagueSurface` sends `choose_action` and `answer` events through the local or Aurora-backed
   session. The reducer updates patient and supply counts.
6. Exit only unmounts the layer. `plagueDamage` is empty, so the city receives no durable change.

That path is wired, but it is not a spatial crisis. The engine and registry explicitly declare no
route, no spread layer, and no world-space carrier. The scene therefore cannot show infection moving
through the player's city.

## Hard Winter quality checklist

The Plague slice is judged against these observable Winter behaviors:

1. The crisis route mounts a renderer, not an empty shell.
2. The scene uses the learner's placed buildings and current camera.
3. The crisis has a legible atmosphere and camera composition.
4. The threat has a spatial carrier and a readable leading state.
5. The player gets one simple, high-stakes choice at a time.
6. The pending choice is previewed on the island before it lands.
7. Every answer changes a visible register tied to that choice.
8. A committed intervention changes physical geometry immediately.
9. The threat advances only on an explicit player action.
10. Rounds escalate and the island records what moved.
11. The ending is a separate, decisive containment or loss state.
12. The result returns to the city through an explicit, honest persistence rule.
13. The DOM fully names the canvas state, and reduced motion preserves every fact.

At the baseline route, 3 of 13 are present: the choice is simple, answers have a countable register,
and the encounter is clockless. The route, spatial threat, city feedback, ending, and carry-back
presentation do not meet the checklist.

## Crisis arc

The outbreak is a fixed five-place, five-route topology mapped onto the Town Hall and four real skill
buildings. The graph is bounded and authored; it does not infer traffic, citizen schedules, or
probability.

Opening:

- One mapped building is infected.
- Its open connections make neighboring buildings exposed.
- All five places and all five routes are visible in the scene and in a DOM route list.

Each round:

1. Choose one intervention.
   - **Quarantine a route:** place a barrier across one infected-to-exposed connection.
   - **Send care:** protect one exposed building with a Care House station.
2. Answer three real practice questions.
   - Each verdict adds a filled or open cut to the pending intervention.
   - Accuracy sets the intervention's countable strength. The action still lands at zero right.
3. Inspect the committed barrier or care station.
4. Press **Let the night pass**. Only this event advances spread.
5. The engine moves infection over the currently open authored routes, records which route carried
   it, consumes care where it blocked a crossing, and expires one round of quarantine.

The first night can carry one route and the second can carry two, reusing the current tuning's
`incoming_by_round` escalation. The third round is the final containment decision.

Ending:

- **Contained:** no open route connects an infected place to a vulnerable place before the final
  night.
- **Lost:** the final night ends with a live infection route, or the outbreak has reached the loss
  threshold.

No person is shown sick, injured, or dead. Infection is a building and route state.

## World-state visual grammar

All status colors use the existing plague palette. Shape and text carry the same state without
color:

| State | Island geometry | DOM equivalent |
| --- | --- | --- |
| Clean | Authored building, no added mark | `Clear` |
| Exposed | Low open threshold frame | `Exposed through N open routes` |
| Infected | Pedestal and covered vessel at the threshold | `Infected` |
| Cared for | Care canopy, linen stack, and one to three countable posts | `Care strength N` |
| Open route | Continuous inlaid paving band | `Open` |
| Quarantined route | Raised barrier across a recessed band, with one to three collars | `Closed for N nights` |
| Carried last night | Cut notches along the inlay from source to destination | Named in the live result |
| Pending action | Outline geometry with verdict cuts | `Chosen; N of 3 secured` |

The Care House loggia stays at the Town Hall, but it is scene dressing and the origin of care. It is
not a replacement board.

## Camera and motion

- Desktop uses the existing city camera and a right-side crisis rail. The projection shifts the
  settlement into the free strip without changing the controls target or dolly.
- At 1024x580 the whole mapped network must remain visible, with the rail no wider than 400px.
- At 390x580 the controls become a bottom sheet no taller than 54vh. The upper frame must still show
  the city and the mapped network.
- Route notches may settle in source-to-target order after **Let the night pass**. No autonomous
  motion advances state.
- Reduced motion poses the final notches, barrier, and building state in one frame.

## Action feedback and resolution

- Choosing an action places its outline immediately.
- Every graded answer changes that outline's countable cuts, including an open cut for a miss.
- The third verdict commits solid geometry and opens a separate result panel.
- **Let the night pass** is the only spread control.
- A polite live region names every newly infected or protected building and every expired route.
- The conclusion covers the rail, not the island. The final city state remains visible behind it.

## Persistence and carry-back

The persisted crisis state records the graph, actions, answers, route closures, spread log, and
ending. It resumes exactly through the existing local and Aurora session authorities.

The city receives no ruin, scar, civic suspension, mastery, or progression write. This is the
existing Plague contract and remains intentional: temporary barriers and care stations clear on
exit. The conclusion must state that ordinary city use resumes and that no building or learning
progress was changed. A future durable consequence requires a separately approved
`CrisisDamageReport` contract; this slice does not fabricate one.

## Accessibility and reduced motion

- The canvas remains `aria-hidden`.
- A DOM network list names both ends and the open, quarantined, carried, exposed, infected, and
  cared-for states.
- Every route and eligible care target is keyboard reachable with a 44px minimum target.
- Status never relies on hue: silhouettes, cuts, collars, and words duplicate it.
- Focus moves from choice to question, result, advance, and conclusion in encounter order.
- `prefers-reduced-motion` and the city's reduced-motion override remove transitions but keep every
  state and every result.

## Performance budget

- One shared material per plague tone, disposed with the layer.
- At most five node markers, five route bands, fifteen answer cuts, fifteen route notches, and five
  intervention marks.
- No particles, post-processing, texture loads, per-citizen agents, timers, or random spread.
- No per-frame graph work. The layer rebuilds only when reducer state or mapped placement state
  changes.
- Target: under 100 plague meshes and under 2 ms CPU to build the layer on the review machine. The
  existing city draw calls and model assets remain unchanged.

## Smallest contract change

Replace patient and supply counters in `PlagueState` with the bounded authored graph, targeted
`quarantine` and `care` actions, a `resolved` phase, and an explicit `advance` event. Keep the
existing three questions, three rounds, deterministic reducer, optimistic revision, local/Aurora
session boundary, no-mastery rule, and empty `plagueDamage`.

The renderer receives a deterministic mapping from the graph's five role ids to the Town Hall and
four live placements. The engine does not import city layout or Three.js.
