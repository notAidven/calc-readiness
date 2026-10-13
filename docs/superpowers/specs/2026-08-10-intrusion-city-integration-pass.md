# Intrusion: city integration implementation brief

**Date:** 2026-08-10
**Status:** implementation authority for this pass
**Baseline:** `origin/integration` at `b88bb0c7`, including merged PR #752

## Observed problem

The deployed `/demo?intrusion` response is the detached `RelayRoute` fixture, not the game:

- its accessible route label is `Intrusion fixture preview`;
- it mounts `RelaySurface`, zero canvases, zero `CitySurface`, and no city evidence;
- dismissing its announcement leaves the same fixture URL and a static relay diagram;
- the deployed document and assets were last modified at 15:40 UTC, after #752 merged;
- the current source registers `intrusion` as `destination: "page"` and returns that route before
  the title screen or city can mount.

The ordinary in-city mount is real, but its information hierarchy is still a dashboard. At
1024x580 a full-width masthead and 420px rail repeat a record meter, route table, two resource
cards, a rule card, a result card, and two action cards. At 390x580 the city is a 250px strip and
the primary actions begin below the viewport. The large red probe and route read as added game
markers rather than opened Information Age infrastructure.

## Product sentence

An invisible attack becomes legible because the city opens its own infrastructure: a cold
physical trace reaches one real building, the learner inspects it through a real three-question
batch, and the resulting isolation or restoration changes that building and route immediately.

## Interaction

One loop, using the existing relay reducer as the only mechanics authority:

1. **Inspect the trace.** The compact instrument names the active real building and offers one
   primary action.
2. **Choose the intervention.** At most two choices are shown: isolate the active intake, or use
   the one clean copy to restore the record. The existing engine preview remains authoritative.
3. **Answer three real questions.** Each checked answer closes or breaks one physical lock in the
   city before the batch resolves.
4. **See the consequence.** The reducer alone changes bands, covers, probe position, evidence age,
   copy use, and ending. One control advances to inspect the next trace.

No parallel score, target, spread, or damage model will be added to the UI. The active target is
the engine's `probe_index` projected onto deterministic real placements.

## Surface hierarchy

- The city stays full-screen and carries route, target, cover, evidence, atmosphere, and ending.
- One compact civic instrument sits at the lower right on laptop and along the bottom on phone.
- Its order is: threat/target, nine-cell record, current step, then the one or two available
  actions. Route details remain in an accessible summary, not a standing visual table.
- Round and clean-copy state are small secondary facts. The full-width crisis masthead, resource
  cards, persistent rule card, and score-ladder grid are removed.
- Copy uses concrete verbs: inspect, isolate, restore, held, gap, old reading. No security jargon,
  purchase language, or generic HUD labels.

At 1024x580 the instrument is at most 350px wide and the threatened settlement remains visible
around it. At 390x580 the opening city stage is at least 240px and the current target plus primary
action remain visible without scrolling. The question sheet may scroll internally while retaining
at least 180px of city.

## World treatment

- Replace the saturated route/probe treatment with the existing Information Age material table:
  dark service cuts, pale matrix faces, clad barriers, and hard white record bars.
- Lower route traces into the paving and break them into restrained directional segments.
- Put a dark service opening, lifted cover, and small evidence instrument beside each reached
  target. Unread targets retain a closed flush cover.
- Proposed isolation is an outline; committed isolation is a filled blanking assembly on the real
  building. Stale evidence keeps its bars and gains the existing physical cut.
- Motion is deterministic and action-triggered: trace emphasis, cover movement, answer locks, and
  probe relocation only. Reduced motion shows the same final carriers immediately.
- Keep the layer at or below 100 scene objects, add no post-processing, lights, textures, particles,
  frame-loop state, or requests.

## Route and state architecture

- Canonical `?intrusion` becomes a city destination. It seeds a disposable Information Age city
  with six deterministic era placements, the Town Hall, the Civic Archive Relay, midpoint mastery,
  and no pre-existing scar, then opens `RelayInCity` on the first ready render.
- The standalone bench moves to `?intrusion-fixture`, remains local/development-only, and is
  labelled `Intrusion fixture` everywhere.
- A versioned relay session stores only validated authoritative engine state. Refresh resumes an
  active or settled encounter; invalid or orphaned snapshots are discarded. Carry-back remains a
  city-session write and is idempotent by relay placement, so refresh cannot duplicate a record
  scar or attach one to a missing relay.

## Accessibility and verification

- Native buttons remain at least 44px with visible focus; cancel returns focus to its action.
- A polite status names each checked answer and current target. Probe movement/evidence aging and
  completion use an assertive status. The canvas remains decorative and the DOM summary carries
  the complete route state without relying on colour.
- Contrast uses existing tokens. Reduced motion removes transitions, not state.
- Acceptance requires failing-first route and resume reproductions, focused reducer/UI/browser
  tests, fixture isolation, duplicate/orphan damage checks, draw-call/object budget, typecheck,
  build, demo verification, and inspected whole frames at exactly 1024x580 and 390x580.
