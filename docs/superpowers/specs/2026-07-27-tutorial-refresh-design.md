# Tutorial Refresh: teaching the game the game actually is

Status: proposed → implemented on `evan/tutorial-refresh`.
Supersedes nothing. **Extends** `2026-07-24-demo-reel-coachmarks-design.md` (which
stays authoritative for the reel itself and for the reel → coach-marks hand-off).

## 1. Problem

The onboarding shipped on 2026-07-24, when the game was "place a building, do its
lesson, practice it, unlock the next one". Since then the game grew a second half:
an economy (XP + gold), a gold sink in roads, a cosmetics shop, a civic hub that
runs interleaved practice across skills, movable buildings, mastery stars, an
in-play unlock popup, and a soundtrack. The onboarding teaches none of it.

The failure mode is not that a learner is confused — most of these surfaces are
self-describing once opened. The failure mode is that **the surfaces are never
opened**, because nothing ever suggests they exist. Nobody discovers that Roads
is a tab inside the Build menu, or that finishing two practice sets turns the
Civic Center into a repeatable gold source, by clicking around a city-builder for
five minutes.

## 2. Decision: extend, do not build a second tutorial

There is already an onboarding, in two cooperating parts:

- **The demo reel** (`city/onboarding/`) — a framed, ~20 s, 4-beat "video" that
  auto-plays once on a first run, always skippable.
- **Contextual coach-marks** (`city/coachmarks/`) — an ordered list of one-line
  anchored hints, each shown once, selected by a pure `nextCoachMark(state, seen)`
  against live game state.

A second tutorial surface was considered and **rejected**. The coach-mark machine
is already exactly the right shape for this problem: its hints are data, its
selector is pure, its relevance predicates read live game state, and its
persistence is per-hint. "Teach a feature at the moment it becomes usable" is a
new row in a table, not a new system. Building a parallel surface would have
given the learner two things competing to interrupt them, and would have
duplicated the anchoring, placement, and dismissal work that already exists and
is already tested.

So: **the reel is unchanged, the coach-mark list grows, and one genuinely new
surface is added — an opt-in "How to play" panel** that exists to make the whole
thing re-viewable (see §6).

### 2.1 Why the reel gets no new beats

The obvious move is to add beats: an economy beat, a roads beat, a shop beat. It
is the wrong move. The reel's four beats run ~20 s; twelve would run a minute,
and a minute of video in front of a student who came to do maths is a minute of
hunting for the Skip button. Worse, it would be teaching gold before the learner
has any, and roads before there is anything to connect.

The reel's job is the **loop**: place → learn → build → unlock. That is the only
thing a learner cannot start without. It stays four beats.

## 3. Sequencing: what is up front, what is in context

**Up front (the reel, unchanged):** the core loop only.

| Beat | Teaches |
|---|---|
| `place` | Drop a building on an open plot. |
| `learn` | Click it to open the lesson. |
| `build` | Finish the lesson, then practice to build it up. |
| `unlock` | Completing it unlocks new buildings. |

**In context (coach-marks):** everything else, each hint gated on the state in
which its feature first becomes *usable and unguessable*.

The ordering below is the list order, and list order is priority — the controller
shows the first hint that is relevant and unseen. Two properties make this safe
to grow:

1. **Hints self-retire.** Every new hint's relevance includes "and the learner
   has not already done this", so a learner who finds Roads on their own never
   gets the roads hint at all. The tutorial shrinks for players who explore.
2. **Preconditions are staggered on purpose** so that no more than two hints
   ever become relevant at the same moment. Where a natural trigger would have
   collided with an existing one, the precondition was pushed one action later
   (`roads` waits for a second lesson's worth of gold; `move` waits for a third
   placed building) rather than being allowed to queue up behind it.

   **This has to hold on both entry paths, which is subtler than it looks.** A
   learner who tests out of the diagnostic arrives with several buildings already
   standing, so any precondition phrased as "once a second building is placed"
   staggers nothing for them — it is already true before they earn a coin. An
   earlier draft of the roads hint did exactly that and stacked three tooltips
   onto the test-out learner's first payout. Keying it on gold instead staggers
   both paths, since one lesson pays 15 gold and a short path costs 20. The test
   suite walks both paths and fails if any moment queues a third tooltip.

| # | id | Relevant when | Anchor | Teaches |
|---|---|---|---|---|
| 1 | `place` | nothing placed | Build button | place a building |
| 2 | `sound` | music on, ≥1 placed | Sound chip | music is playing, and where mute/volume live |
| 3 | `testedOut` | a placed building is built-but-unpracticed | Buildings | the test-out state, honestly |
| 4 | `learn` | placed, no lesson started | viewport | open the lesson |
| 5 | `build` | something mid lesson/practice | callout → viewport | finish + practice to build it |
| 6 | `economy` | gold > 0 | Shop chip → gold stat | gold and XP come from learning; gold buys looks and roads |
| 7 | `master` | one complete, not all | Buildings | mastery stars, and that mastery unlocks buildings |
| 8 | `roads` | a short path's worth of gold, no roads laid | Build button | Roads is a **tab inside Build**, and tiles cost gold |
| 9 | `roadRemove` | ≥1 road tile laid | viewport | click a tile to lift it; the refund is full |
| 10 | `interleaved` | ≥2 finished practice sets | Civic Center row → Buildings | the hub now mixes problems across those skills, and pays |
| 11 | `move` | ≥3 placed and one complete | Buildings | placed buildings can be moved |

### 3.1 Notes on specific beats

- **`sound` is second, not last.** Music is on by default and starts on the
  learner's first interaction. A game that starts playing music unasked owes the
  learner an immediate, visible sentence about where the off switch is — and a
  learner in a quiet classroom needs that sentence in the first ten seconds, not
  after they finish a lesson. It is gated on `≥1 placed` purely as proof that an
  interaction has happened (so the hint cannot claim music is playing before the
  autoplay gate has opened).
- **`testedOut` exists because the reel does not play for these learners.** When
  the diagnostic unlocks buildings, the reel is deliberately retired so
  `UnlockCelebration` owns that moment (unchanged from the 07-24 spec). Those
  learners land in a city with buildings already standing and no reel — so their
  first hint has to explain the state they are in. Its copy matches the honest
  test-out wording already shipped in `CitySurface`: the building went up without
  the lesson, and practice is what earns the stars.
- **`economy` folds gold's two sinks into one hint** rather than shipping
  separate `shop` and `roads-are-gold` hints. The cheapest cosmetic is 12 gold
  and one lesson pays 15, so a separate shop hint would have fired in the same
  instant as the economy hint. `roads` survives as its own later hint only
  because *where the Roads tab lives* is a genuinely unguessable fact; that it
  costs gold is a detail the same hint carries.
- **`master` absorbed what would have been a separate `stars` hint.** Both would
  have fired on the first completed building. One sentence carries both facts.
- **`roadRemove` teaches the click, not the refund.** The tile popup and the
  paint bar both already state the refund in full, in gold, on the button. The
  hint only has to say that clicking a paved tile is a thing you can do.
- **Nothing teaches the "new building unlocked" popup.** It is a modal with a
  headline and a "Build it" CTA; it teaches itself. Interrupting an interruption
  would be absurd.
- **Nothing teaches the 24-hour interleaved earning cap up front.** It is a rule
  a learner meets at most once, and when they meet it the HUD already says
  "Practice earning cap reached for now. Keep practicing — it still counts." A
  hint about it would be a hint about a wall most learners never touch.

## 4. Copy rules

Learner-facing building and skill names only, never `NUM.*` ids. The hub is the
**Civic Center**, and no *skill* building's name may be used for it. Since #148
the `NUM.S` skill building is **"City Bank"** — renamed there precisely to end its
collision with the hub — so that is the confusable name to guard. "Town Hall" is
guarded too, because it remains live in `NUM.S`'s lesson prose until that half of
the rename lands, which makes it the name most likely to creep back into copy.
The onboarding reel needs no attention here: it reads every building name through
`buildingName()`, so a rename reaches it for free. No emoji. One sentence, two at
most.
No claim the game cannot keep: the `roadRemove` hint says every coin comes back
because `roadRefund === roadCost`; the `economy` hint does not promise an amount.

## 5. Implementation changes

### 5.1 `coachmarks/coachMarksCore.ts`

- `CoachMarkId` grows to the eleven ids above.
- `CoachAnchor` grows by `sound`, `shop`, `economy`, `townhall`.
- `CoachState` grows the signals the new predicates need: `anyTestedOut`,
  `gold`, `roadTileCount`, `interleavedEligible`, `musicOn`.
- `CoachMarkDef` grows a `group` field (`"build" | "gold" | "practice" |
  "sound"`), used only by the How to play panel so its reference list is
  **generated from the hint list and cannot drift from it**.
- `CoachMarkDef` also grows an optional `reference` phrasing, for the three hints
  whose in-context wording reads wrong as a static rule. "Music is playing" is
  true at the moment the hint appears and merely presumptuous in a list, and "You
  tested out of a skill" is flatly false for a reader who did not — so the card
  reads them through `coachMarkReference(mark)`. Most hints need no second
  phrasing.
- `ROADS_HINT_MIN_GOLD` names the roads hint's gold threshold, with the
  sequencing reason (§3) attached to it rather than buried in the predicate.
- New: `COACH_SKIP_ALL_KEY = "cr.coach.skipAll"`, `hasSkippedCoachMarks()`,
  `skipAllCoachMarks()`, `resetCoachMarks()`. `loadSeenCoachMarks()` returns
  every id when the skip flag is set, so the pure selector needs no new argument.

### 5.2 `coachmarks/coachAnchorRegistry.ts` (new)

Three of the new anchors (`sound`, `shop`, `economy`) live in components `App`
mounts as **siblings** of `CitySurface` — `AudioSettings` and `EconomyHud` — so
`CitySurface` cannot hand `CoachMarks` a ref to them. Rather than drill refs up
through `App` and back down, a tiny module-scope registry lets a component
register itself:

```tsx
<button ref={useCoachAnchor("shop")} …>
```

It is a `useSyncExternalStore` source, so `CoachMarks` re-renders when an anchor
mounts or unmounts. `CoachMarks` resolves `anchors[name] ?? registry(name)`, so
the existing four ref-passed anchors and the existing tests are untouched.

### 5.3 `coachmarks/Tooltip.tsx`

Gains a secondary **"Skip tips"** action beside "Got it". Focus still lands on
"Got it"; `Escape` still means dismiss-this-one, not skip-everything.

It also stops taking focus unconditionally, which was a **latent bug this work
surfaced**. A coach-mark is a non-modal (`aria-modal="false"`) popover, but it
grabbed focus on every mount — so a hint that became current in the same commit
as some other dialog closing would steal focus away from the control that dialog
had just restored it to. That is exactly what closing How to play does, and it
made the panel's own focus restoration silently useless. The tooltip now takes
focus only when focus is **parked** (on the body, i.e. nowhere in particular),
which is the case in the moment the behaviour was designed for: the reel unmounts,
or a popup closes, and the hint is the next thing the learner meets. When it
declines, the hint is still visible and one Tab away.

### 5.4 `city/onboarding/HowToPlay.tsx` (new)

An opt-in `coc-popup` / `coc-card` panel, opened from a **"How to play"** button
in the ☰ Menu. It is the answer to "re-viewable", and it is also the safety net
for the learner who skipped everything. It contains:

- the four reel beats as a short "The loop" list;
- every coach-mark's copy, grouped by `group`, generated from `COACH_MARKS`;
- **"Watch the intro again"** — replays the reel;
- **"Show tips again"** — clears the seen flags and the skip flag.

It is opt-in on purpose. A reference card that nobody has to read is the only
honest way to make twelve features available without lecturing anybody.

### 5.5 `city/CitySurface.tsx`

- Derives the five new `CoachState` signals (`tested_out` from the view model,
  `goldAvailable` from the existing prop, `committedRoads.length`, the existing
  `interleavedEligible`, and `useMusicEnabled()`).
- Adds `townhall` to the anchor map (the roster's Civic Center row, falling back
  to the Buildings disclosure when the roster is closed).
- Holds `howToPlayOpen` and a `coachResetToken`; remounting `CoachMarks` on a
  bumped token is how "Show tips again" takes effect immediately.
- `demoActive` gains a `demoReplay` term so the reel can be re-watched after the
  first-run gate has closed.
- `coachActive` gains `!howToPlayOpen`.

## 6. Skip, replay, persistence

| | Skip | Replay | Persistence |
|---|---|---|---|
| Reel | Skip button, `Escape` | Menu → How to play → "Watch the intro again" | `cr.onboarding.demoSeen` |
| Coach-marks | "Got it" per hint, `Escape`, or **"Skip tips"** for all of them | Menu → How to play → "Show tips again" | `cr.coach.<id>` per hint, `cr.coach.skipAll` for the opt-out |

Persistence stays `localStorage` and stays non-destructive — the tutorial never
writes game state. Every read and write is `try`/`catch`ed, so a hardened school
profile with storage disabled degrades to "hints reappear next session" rather
than to a crash.

## 7. Accessibility

Inherited and preserved: coach-marks are labelled `role="dialog"` popovers with
`aria-modal="false"` (non-trapping, so the HUD behind stays operable), focus
lands on the primary action when a hint appears, `Escape` dismisses.

New work:

- The tooltip's second button is in the tab order after "Got it", so a keyboard
  user reaches skip-all without reaching for the mouse, and cannot hit it by
  accident when dismissing.
- A hint no longer steals focus from a control the learner is deliberately on
  (§5.3), so keyboard focus stays where the learner put it.
- How to play is a real modal: `aria-modal="true"`, labelled by its heading, a
  Tab focus trap (the `BuildingUnlockedPopup` pattern), `Escape` closes and
  returns focus to the Menu button that opened it.
- Every hint is text. Nothing in the tutorial is carried by colour, by icon, or
  by sound — including the hint *about* sound, which is why that one exists.
- The How to play list is real list markup with headings, so it is navigable by
  a screen reader rather than being one wall of prose.

## 8. Non-goals

- No change to the reel's beats, the diagnostic, seeding, the unlock rule,
  mastery, `UnlockCelebration`, or `BuildingUnlockedPopup`.
- No forced or gated tutorial. Every hint remains dismissible and every surface
  remains skippable — unchanged from the 07-24 spec's stance.
- No hint for the interleaved earning cap, the XP level ladder, the storm
  checkpoint, or the lighting/camera controls. The first two explain themselves
  when reached; the last two are conventions a city-builder player already has.
- The ☰ Menu's stale `CosmeticsPopover` placeholder ("nothing here is spendable
  yet") contradicts the live Shop, but it is not this branch's to fix — flagged,
  not changed.
