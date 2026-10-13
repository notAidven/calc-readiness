# Game-feel mechanics backlog: what exists, what is missing, and what to build next

**A design and scoping record. No production code is changed by this document.**

**Every code claim below is measured at `ad212282`** (`integration` tip). Claims about PR #273
are measured at `aac2be48` on `evan/city-population-happiness`, and claims about PR #288 at
`263277fa` on `cursor/civic-purchase-ledger-wiring-4394`. **Both PRs were OPEN with a null
`mergedAt` when this was written**, so nothing either one contains is in the tree yet.

> **RE-POINTED TWICE, `e53bf9cd` to `66579e81` to `ad212282`, and no code measurement moved either
> time.** The tip advanced twice while this document was open, so the findings were re-checked rather
> than carried over.
>
> - **`e53bf9cd` to `66579e81` is #369 alone** (Hard Winter art reference plates plus one PowerShell
>   generator, 15 files, all additions under `docs/superpowers/specs/crisis-reference-packs/` and
>   `tools/`). *An earlier revision of this banner said `docs/design-refs/`, which was wrong;
>   corrected here against `git log --name-only c16f009f`.*
> - **`66579e81` to `ad212282` is #371** (merged 2026-08-01T18:11:03Z), which added
>   `docs/BrainLift_Game_Design.md` and `docs/Gamification_Research_And_Features.md` and **nothing
>   else**: `git diff --name-only 66579e81 ad212282` over `apps/`, `engines/`, `packages/` and `db/`
>   returns empty.
>
> `git diff --name-only e53bf9cd ad212282` over every code path cited below returns **empty**:
> `apps/web/src/audio/`, `apps/web/public/audio/`, `apps/web/src/city/`, `apps/web/src/economy/`,
> `engines/game/src/`, `packages/economy/src/`, `packages/skill-graph/src/`,
> `packages/shared-state-schema/src/` and `db/migrations/`. The three headline numbers were re-read at
> each tip: `NUM.2` still 10 built and 26 mastered (`citizens-tuning.ts:105`),
> `CARS_PER_ROAD_TILES = 8` and `MAX_CARS = 6` (`:168`, `:171`), and the track still binds at
> construction (`music.ts:148`).
>
> **Line citations into `docs/BrainLift_Game_Design.md` were re-derived at `ad212282` plus this
> branch's SPOV 2 amendment**, which itself shifted every line below 34 by fourteen. Anything quoting
> that file at a number from an earlier revision of this document is stale by exactly that amount.

The lead named seven mechanics and asked for more. **Two of the seven are owned by another agent
and are out of scope here: citizens gathering during the four-beat model, and the advisor
appearing on the island rather than as an in-text display.** They are referenced only where
something else depends on them.

---

## 0. The research, reconciled against the ranked set

**Two research documents, and the second supersedes the first.**

| Document | Status | Where |
| --- | --- | --- |
| `docs/BrainLift_Game_Design.md` | **CURRENT.** Four knowledge-tree categories, four SPOVs, and `## Feature recommendations for the city-builder (full set)` at line 307 | **On `integration`.** #371 merged 2026-08-01T18:11:03Z, merge commit `ad212282`, `mergedAt` read rather than inferred |
| `docs/Gamification_Research_And_Features.md` | **SUPERSEDED 2026-07-30** by the above, by its own first line | Same merge |

**An earlier revision of this document flagged every verdict as provisional**, because the ranked set
was unreadable and the superseded file named it as the successor holding the ranking. **The ranked set
has now been read and the flags are resolved below, one at a time.** Where the two documents differ,
both are shown, because the difference is itself evidence about how settled a recommendation is.

> **SPOV 2 was AMENDED on this branch, and that amendment is the reason §5 exists in its current
> form.** The team lead overruled the **badges** third of it on 2026-08-01 in one narrow place.
> **Points and leaderboards are untouched and still refused.** The amendment is in
> `docs/BrainLift_Game_Design.md` under SPOV 2 (`:34`), written there rather than only here because
> that is where the position it changes lives and because two other owners signed it. §5 is the design
> record the amendment points at.

**Four BrainLift files remain unreadable and are not guessed at:**
`BrainLift_Gamification_Category.md`, `BrainLift_Churn_Heterogeneity.md`,
`BrainLift_Draft_Integrated.md`, `BrainLift_Product_Diagnostic.md`. The last is named by the ranked
set itself as the companion holding the product, diagnostic and remedial-market case
(`BrainLift_Game_Design.md:3`, `:24`), so it is the one most likely to bear on anything here about
measurement. Nothing below rests on it.

### 0.1 Confirmed, changed, still provisional

**Confirmed, caveat dropped (5).**

| Verdict | Confirmation in the ranked set |
| --- | --- |
| Citizens using roads is **BUILD** | BUILD 1, *"The city IS the progress bar"*, on the same reasoning and now also on genre grounds (1.1) |
| Happiness gains apparent is **BUILD**, informational framing | BUILD 5, *"Every completion reads as 'here is what you can now do,' never 'you earned 50 coins'"* |
| Its guardrail: a shortfall reads as *"not yet"* | CAREFUL 11, wording unchanged, **but applied by analogy**: the ranked set states the rule for *locked content* and has no shortfall-specific rule. The supporting principle is BUILD 3's *"approach motivation"* and 1.4's *"take the approach half of the mechanism and refuse the punitive half"* |
| Streaks need mercy design | CAREFUL 9, unchanged guardrail, and *"Defer for MVP if in doubt"* is added |
| No public ranking | AVOID 12, and it now names the substitute: *"Use personal-progress dashboards instead"* |

**Changed (5), and what moved.**

1. **Achievements: from "not ranked" to refused, and then to RULED.** Two moves in one day. The
   ranked set turned the superseded file's silence into a refusal (SPOV 2), and **the lead then
   amended SPOV 2 to permit a narrow milestone form**, which is what §5 designs. The badges third
   moved; **points and leaderboards did not.**
2. **Narrative: promoted from `[MIXED]` flavour to BUILD.** The superseded file said narrative
   *"did NOT move motivational or cognitive outcomes"* and told us to treat it as flavour. The ranked
   set makes it **BUILD 8, White Hat narrative (learner-as-protagonist)**, and Sailer and Homner is
   now cited as finding *"adding game fiction"* to be one of two significant behavioural moderators
   (2.1). **This does not promote music or sound effects**, which are ambience rather than protagonist
   framing, and the ranked set says nothing about audio at all. **What it does promote is the copy
   audit** (§6.2), because BUILD 8 names *"'still building this skill' language"* outright.
3. **The timed-storm escape hatch is withdrawn.** The superseded file's AVOID 13 was timers on
   mastery tasks *"the one caveat is that our 'storm' is a game moment, not a test, so a timed storm
   can survive IF it is framed as low-stakes fun"*. The ranked set's **AVOID 13 is broader and carries
   no caveat**: *"Pressure-only Black Hat mechanics (urgency, public comparison, timers on mastery
   tasks)"*. Consequences measured in §8.3: **no live violation**, but the justification for keeping
   an existing timer field is gone.
4. **Endowed progress is withdrawn as a support.** It was BUILD 2 in the superseded file, with the
   *"19% to 34%"* completion figure, and this document cited it as one of two supports for the
   Chronicler. **It appears nowhere in the ranked set and neither does the figure.** It is *absent*
   rather than reversed, which is weaker than a reversal, so the Chronicler keeps its BUILD 1 support
   and loses its second leg (§6.1).
5. **Two superseded items vanished with no replacement:** *"Adaptive difficulty toward perceived
   progress"* (was CAREFUL 11) and *"Variable / random reward schedules"* (was AVOID 14). The second
   matters here, because this document used it as an achievement guardrail. **The ranked set does not
   discuss variable reward schedules anywhere**, so that guardrail no longer rests on research. **It
   is still banned**, by `docs/Game_Visual_Design_Brief.md:70-71` (*"loot-box / variable-reward
   gambling loops"*), which is a project constraint and not a research finding. §5.5 now cites the
   brief for it rather than the research.

**Still provisional (1), with the reason.**

- **Anything resting on Category 1 or Category 3.** The ranked set's own verification note is
  explicit: *"The Category 1 (city-building) and Category 3 (resource-loop) sources are game-design
  writing, not peer-reviewed; they are reliable as descriptions of genre patterns, not as efficacy
  evidence, and I have not independently re-verified them."* So carts and the genre-loop half of the
  Chronicler's case are **not provisional on an unread document any more; they are provisional on
  their own sourcing**, which is a better-understood kind of uncertainty and a permanent one. §0.3
  acts on it.

### 0.2 Verdict map against the ranked set

The ranked set's own definitions: *"BUILD = evidence backs it and it fits; CAREFUL = do it only with
the named guardrail; AVOID = evidence says it harms our population"*
(`BrainLift_Game_Design.md:309`; the ranked list itself is `:312-330`).

| Mechanic | Ranked-set verdict | Guardrail, where one is required |
| --- | --- | --- |
| Citizens using roads | **BUILD 1** | None owed. Already built in #273 |
| Happiness and livability gains made apparent | **BUILD 5** (informational framing) | **The shortfall wording.** Nearest rule is CAREFUL 11, *"'locked' must read as 'not yet,' not 'you failed'"*, which is about locked content and is applied here by analogy; the ranked set has no shortfall-specific guardrail |
| Building sound effects | **Unranked.** The ranked set says nothing about audio | None owed. Already built. Do not claim a learning benefit for it |
| Era-themed music | **Unranked**, same reason | None owed. **Note the change:** BUILD 8 promotes *narrative*, which is protagonist framing, not ambience, so it does not cover this |
| Achievements | **Not in the 15 ranked items. SPOV 2 refused them, and the lead AMENDED SPOV 2 on 2026-08-01 to permit one narrow form.** Points and leaderboards stay refused | **Seven, all binding**, in §5.4. The permitted form is a one-line milestone acknowledgement, and BUILD 2 is the guardrail most likely to be broken by accident |
| ~~The Chronicler~~ | ~~**BUILD 1**~~ ⚑ **CUT BY THE LEAD 2026-08-04** (§6.1). The research standing is not what changed: the archipelago's revisited island is the same visible-artifact mechanic, arrived at as a place rather than a panel | ~~None owed. Endowed-progress support withdrawn (§0.1)~~ |
| `review_due` spaced retrieval | **BUILD 4**, and **SPOV 4** is the team's own commitment to it | **It collides with `INV-ERA-3`.** §6.1. The collision got *sharper*, not softer |
| Carts on the roads | **Unranked.** Rests on Category 1, which the document flags as not efficacy evidence | None owed. Demoted in §1 for this reason |
| Growth-mindset copy audit | **BUILD 8** (*"'still building this skill' language"*) | None owed. **Promoted** from the superseded file's standalone item |
| Cooperative features | **BUILD 7** | Out of scope here. §6.3 |

**Three ranked items this backlog does not address at all**, and they are §0.4's subject: BUILD 2
(one unifying progress currency), BUILD 3 (cascading overlapping goals), BUILD 6 (restraint).

### 0.3 Confidence tags, and what they do to the order

**This is new information, and it changes the ordering.** The ranked set's sourcing is uneven in a
way the superseded file's flat `[STRONG]` / `[MIXED]` / `[WEAK]` tags did not expose, because the
unevenness is per *category* and every recommendation inherits its category's quality.

| Category | Sourcing | Consequence |
| --- | --- | --- |
| **4: retrieval and spacing** | **Strongest in the document.** Four peer-reviewed primaries with working links: Karpicke and Blunt 2011 (*Science*), Roediger and Karpicke 2006 (*Psychological Science*), Cepeda et al. 2006 (*Psychological Bulletin*), Rohrer and Taylor 2007 (*Instructional Science*) | `review_due` is the best-evidenced item in this backlog |
| **2: educational gamification** | **Strong core.** Sailer and Homner 2020, Bai/Hew/Huang 2020, Deci/Koestner/Ryan 1999, WestEd ST Math (ESSA Tier 2), all with links. Weaker at the edges: the Duolingo teardowns are vendor-reported and used *"only directionally"*, and the BJET autonomy study is *"cited secondhand"* | Informational framing and visible mastery are solid. Streak numbers are not |
| **2.6: features that hurt learning** | **Weakest sourcing in the document.** Both sources are *"(team-provided; locate DOI before quoting)"*, and the verification note repeats it | The evidence *against* badges is the least verified evidence in the document, which §5 states plainly |
| **1: city-building genre** and **3: resource loop** | **Not peer-reviewed.** *"game-design writing... reliable as descriptions of genre patterns, not as efficacy evidence"*, and not re-verified | Carts, and the genre half of the Chronicler's case |

**The order in §1 moved, and here is the honest account of why it needed to.** The previous ordering
was by *cost and unblockedness*, which put `review_due` last and carts third. Ranked by *evidence*
that is close to inverted: `review_due` rests on the single best-sourced category in the document
plus the team's own SPOV 4, and carts rest on the material the document itself declines to call
efficacy evidence. Two changes follow, and neither is a swap:

- **`review_due`'s decision moves to the top even though its implementation stays below the line.**
  The implementation really is blocked, on a ruling and on Anthony's schedule. **The ruling is not
  blocked on anything.** Separating them is what lets the highest-evidence item stop waiting on the
  lowest-cost thing in its path.
- **Carts drop below the copy audit.** The audit gained direct support (BUILD 8); carts did not gain
  any, and what they rest on is explicitly not efficacy evidence. Carts remain worth doing and are
  now honestly labelled the lowest-value item above the line rather than the third-highest.

### 0.4 What the ranked set carries that this document had missed

Three BUILD items with no counterpart in the superseded file and no coverage in this backlog. Named
rather than designed, because each is a structural recommendation rather than a mechanic, and two of
them bear on work already in flight.

1. **BUILD 2: one unifying progress currency (mastery).** *"Route streak, city growth, and any social
   layer off the single mastery signal, no parallel point systems."* This is the structural lesson
   from Duolingo's shared XP (2.1) and it is the sharpest new constraint in the document. **It cuts
   two ways here.** It is an argument *against* any achievement system that keeps its own score
   (§5). And it raises a question about the shipped HUD that is worth someone's attention: the
   always-on economy HUD displays **three** XP figures beside the material balance, a level and
   title, a progress meter, and *"N/M XP, N total"* (`apps/web/src/economy/EconomyHud.tsx:61-78`),
   while AVOID 14 permits XP only as *"a quiet substrate"*. **Reported as a question, not a
   violation:** XP is genuinely not a currency here and says so
   (`packages/economy/src/types.ts:23-30`), and whether two stats side by side makes one of them
   *"the headline"* is a judgement rather than a measurement.
2. **BUILD 3: cascading, overlapping goals powered by approach motivation.** *"Stagger node,
   neighborhood, and district goals so something is always nearly done."* The Zeigarnik pull *"kept
   in its approach form"* (1.4). The product already has the three tiers this asks for, node, era and
   run, so the recommendation is about **scheduling** them so they never resolve together. Nothing in
   this backlog addresses it, and it is the one ranked BUILD item that would change the shape of the
   loop rather than add a surface.
3. **BUILD 6: restraint, keep the game layer subordinate.** *"Progress markers never overshadow the
   math, and busywork is cut."* Paired with the new **AVOID 15, busywork and micromanagement for its
   own sake**, called *"the genre's #1 criticism and a direct working-memory tax on an anxious
   audience"*, and with SPOV 3, which puts it strongest: *"Busywork is not a game-design flaw, it is
   unmastered math wearing a costume, and for our audience it is lethal."* **This is a constraint on
   this entire document**, every item of which adds a game layer. It does not veto any of them: carts
   and the Chronicler add no clicks to the loop, and the attribution line and the copy audit add no
   surface at all. But it is the reason none of them should grow.

---

## 1. Recommended order

**Above the line: unblocked.**

1. **Skill buildings say what they give the city** (§4). The residual of the lead's happiness item
   after #273. Two surfaces that already exist gain one sentence each. **BUILD 5.**
2. **The first two crisis milestones** (§5). **RULED 2026-08-01**: the lead overruled SPOV 2's badges
   third. Two sentences on a beat that already exists, and one of the two predicates is already
   computed and drives nothing. It is above the line because it is now decided and small, not because
   it outranks item 1 on evidence.
3. **The music player learns to change tracks** (§2). One file. The whole engineering half of
   era-themed music, worth doing *before* the assets arrive rather than after.
4. **A growth-mindset copy audit** (§6.2). No new surface. **BUILD 8.**
5. **Carts on the road network** (§6.2). Two tuning constants that already exist and are consumed by
   nothing, in either tree. Lowest evidence of anything above the line, and honestly the least
   valuable; kept above the line only because it is nearly free.

**Below the line, and what would unblock each.**

6. **The remaining two milestones** (§5.5). Milestone 3 waits on nothing but judgement; milestone 4
   waits on the era advance ceremony, which another agent owns right now.
7. **Era-themed music assets** (§2). Blocked on acquiring eight to ten tracks. Not an engineering
   problem.
8. ~~**The Chronicler** (§6.1). Blocked on the persistence Wave 2 write path, which is live right now.~~
   ~~**BUILT AND MERGED 2026-08-01, hours after this line was written.** #393, `mergedAt`
   `2026-08-01T21:28:05Z`, merge commit `1c0a3113`, shipped as **the Album**. It did not wait
   for the write path in the end: §6.1 has the correction and the argument.~~ **This line stayed
   here for two days and cost a later agent a whole run**, which is the reason it is struck
   through rather than deleted. ⚑ **AND THE SURFACE WAS CUT ON 2026-08-04**, so the item is
   closed twice over: mis-sized, then delivered, then removed inside four days. §6.1's banner
   carries the ruling and what was kept out of it.
9. **`review_due` spaced retrieval** (§6.1). **PARKED, no owner and no date.** Put to the lead and
   answered *"not sure what the context/purpose of this is"*, which is a fair response to a mechanic
   that is unbuilt, post-MVP and in someone else's lane. The three options and the tradeoff on each
   stay recorded in §6.1 for whenever it is picked up. **Not advocated for further here.** The finding
   that it is the best-evidenced item in the research stands and is recorded; that is enough.

### 1.1 The leverage arguments

**Item 1 is the cheapest thing on this list and it makes the largest number in the game visible.**
`CITIZEN_NODE_CAPACITY` (`engines/game/src/citizens-tuning.ts:102-116`) gives `NUM.2` a residence
capacity of **10 when built and 26 when mastered**. Its own comment calls that jump *"the largest
single beat in the game"* (`:103-104`). Nothing in the product tells the player it happened, before
or after #273. One line on the skill popup and one clause in the completion announcement cover all
six era-one skill buildings at once, because they read the same table.

**Item 2 is two sentences, and half of it is already computed.** Milestone 1 is the lead's own example
and fires at crisis resolution. Milestone 2 fires when `isCrisisDamageClear`
(`engines/game/src/crisis-damage.ts:122`) first becomes true again after damage, and **that predicate
has no production consumer today**, so the event it marks is already known to the engine and told to
nobody. Both land on a beat the crisis conclusion already renders, so neither adds a surface. **§5.6
is the part to read before building it**, because the way this goes wrong is not the copy: it is
someone collecting the milestones onto one screen, which turns four sentences into a set with a size
and breaks BUILD 2.

**Item 3 inverts the usual order, and that is the point.** Era-themed music looks like a code task
and is almost entirely a procurement task. `MUSIC_TRACKS` is already a table
(`apps/web/src/audio/music.ts:59-82`) and the era store already exists and already drives every
other per-era surface (`apps/web/src/city/useCityEra.ts`). The single real code gap is that
`createMusicPlayer` resolves its track once, at construction (`music.ts:148`), so the shipped
singleton cannot change track at all. **Closing that gap costs one file and unblocks ten eras of
music the moment ten tracks exist.** Doing it first means the asset work has somewhere to land; the
alternative is ten tracks sitting in `public/audio/music/` with no way to select them.

**Item 5 is finished tuning waiting for a renderer nobody wrote.** `CARS_PER_ROAD_TILES = 8` and
`MAX_CARS = 6` (`citizens-tuning.ts:168`, `:171`) are exported, documented, and **consumed by nothing
in either tree**: measured by `git grep` over `integration` and over
`evan/city-population-happiness`, the only non-documentation hits are the definitions themselves.
The routing they would need also already exists on #273 (`three/citizenRoutes.ts`).

**Item 8's cost fell because of a ruling nobody made for its sake.** The era progression design
argues this itself at §11.3 (`docs/superpowers/specs/2026-07-27-era-progression-design.md:2057-2064`):
once skill buildings stopped re-dressing between eras, the only art that vanishes on an era advance
is one Town Hall. **A per-era snapshot therefore has to preserve one building rather than nine
cities.** It also makes the Chronicler the only place nine retired halls can ever be seen again.

**Item 9 has already paid for its expensive half, which is recorded and not argued.** Spaced
retrieval needs a record of when each skill was last practised, and `last_practiced_at` **ships
today**: it is in the migration (`db/migrations/0001_core_contracts.sql:35`), in the shared schema
(`packages/shared-state-schema/src/index.ts:29`), and written on every scored practice set. It is
read in exactly one place, and only as a boolean: `practiceEvidence` returns
`(state?.last_practiced_at ?? null) !== null` (`engines/game/src/practice-evidence.ts:24-26`). **The
timestamp is captured and its value is discarded.** Capture is the half that is hard to add
retroactively, and it is done. **The item is parked** (§6.1), so this is stated once as a fact for
whoever picks it up rather than as a case for scheduling it.

---

## 2. Era-themed music

**1. What exists today.** Two tracks, one selected by a constant, and no era awareness anywhere.

- `apps/web/public/audio/music/` holds `town-theme.mp3` and `a-new-town.mp3`. Both CC0 1.0, both by
  cynicmusic, provenance recorded in `apps/web/public/audio/CREDITS.md:25-28`.
- `MUSIC_TRACKS` (`apps/web/src/audio/music.ts:59-82`) is a typed non-empty tuple of the two.
- `DEFAULT_TRACK_ID` (`music.ts:88`) selects one. Its own docblock calls it *"the one-line swap"*.
- `createMusicPlayer` accepts a `trackId` option (`music.ts:112`), but the app-wide singleton passes
  none (`music.ts:242`) and **the track is resolved once at construction** (`music.ts:148`), outside
  the returned object. `stop()` drops the element and keeps the track (`music.ts:227-237`).
- The era seam that everything else re-dresses off already exists: `useCityEra()`
  (`apps/web/src/city/useCityEra.ts`) is a module-level `useSyncExternalStore` over `eraState.ts`,
  and `ERA_SEQUENCE` holds all ten eras (`packages/skill-graph/src/eras.ts:139-266`).
- Under the dev server music starts off: `MUSIC_MUTED_IN_DEV = true`
  (`apps/web/src/audio/audioPrefs.ts:106`). Reverting is one word. Worth knowing before anyone
  reports the soundtrack as broken while auditioning tracks.

**2. What is missing.**

- **Eight tracks**, if the target is one per era. Ten eras, two files.
- **A track-change path.** Because the track binds at construction, the player cannot switch. The
  shape that fits the existing module is a `setTrack(id)` that drops the element and lets the next
  `sync()` rebuild it, which is what `stop()` plus the lazy build in `sync()` already do for every
  other reason. Everything else is in place: `audioAssetUrl` resolves the path, `loop` and volume
  are re-applied per sync.
- **A crossfade decision.** Today there is deliberately no fade at all (`music.ts:24-28`), because a
  ramp would need either a timer or a gain node and the second reopens the autoplay problem the
  module closed. An era advance is the first moment a hard cut between two tracks is audible.

**3. Asset dependency.** **This mechanic is blocked on acquiring assets, not on engineering.** The
repository has 2 of the 10 tracks it needs, and the two it has are both RPG-town themed, which
serves roughly eras 4 to 6 and does not serve Prehistoric, Atomic Age, Information Age or
Cyberpunk. `CREDITS.md:30-35` records exactly one further verified CC0 candidate, *Magic Town*, and
two rejected on size. So the shortfall is seven or eight tracks with no identified source.

Two constraints the procurement inherits from the files that already ship, both from `CREDITS.md`:
**provenance or it does not ship** (`:1-6`), and **size is a real filter** (`:30-35` rejects a 12 MB
FLAC and a 3.5 MB MP3). Ten tracks at the current 1.0 MB average is about 10 MB of `public/`, and
only the current era's track is ever fetched, so the per-learner cost stays near today's 1.32 MB.

**4. Size, and what it collides with.** Code: **small**, one file plus its test. Assets: **the
whole job**. Collisions: **effectively none.** #273 does not touch `apps/web/src/audio/` or
`apps/web/public/audio/` at all: measured as an empty `git diff --name-only` between the tip and
`aac2be48` over both paths. #288 touches `audioPrefs.ts` in exactly one place and it is a **docblock
reference correction with no functional change** (`createDevSessionStore` becomes
`createEconomyDevStore` in a comment), so it cannot conflict with a change to `music.ts`. The
advisor and island re-dressing are per-era art on the same ladder (D-ERA28,
`2026-07-27-era-progression-design.md:883-950`), so the music assets should be commissioned or
sourced alongside them rather than as a separate errand.

**Lane: Gabe** (audio, the era model). No other owner's review is owed, which is part of why the code
half is cheap.

**Research standing: UNRANKED, and do not oversell it.** The ranked set says nothing about audio, and
the promotion of narrative to BUILD 8 does **not** reach music: BUILD 8 is *"learner-as-protagonist"*
quest framing, which is copy, not ambience. The superseded file's reading, that narrative and
world-building *"co-occurs with reduced anxiety"* and is therefore worth having as flavour, is the
strongest thing available and it is not in the current document. **Justify this as game feel, not as
learning.**

**5. Decisions the lead owes.**

- **Ten tracks, or fewer tracks shared across era groups?** *Recommendation: fewer.* Three or four
  tracks mapped to era groups gets most of the felt effect for a third of the procurement, and
  `MUSIC_TRACKS` plus a mapping table supports it with no extra machinery. Ten is the version to
  buy later if the three-track version lands well.
- **Hard cut or crossfade on an era advance?** *Recommendation: hard cut, at the ceremony's own
  beat.* The advance already has a ceremony that covers the seam, and a crossfade costs the
  autoplay simplicity the module was built around.
- **Does an era advance interrupt a track mid-loop, or finish the loop first?** *Recommendation:
  interrupt at the ceremony.* A learner who has just advanced should hear the new era immediately;
  that is the whole payoff.

---

## 3. Building sound effects

**1. What exists today. All six shipped effects are wired, plus two synthesized chimes.** The
question the brief asked, what is *wired* rather than what exists, has a clean answer: everything
is.

| Effect | Fired at |
| --- | --- |
| `place-building` | `apps/web/src/city/CitySurface.tsx:1428` |
| `road-lay` | `CitySurface.tsx:1664` |
| `road-remove` | `CitySurface.tsx:1602`, `:1635` |
| `purchase` | `apps/web/src/economy/Shop.tsx:271` |
| `mastery-star` | `CitySurface.tsx:1129` |
| `building-unlocked` | `CitySurface.tsx:1004` |

Plus two runtime-synthesized tones with no asset: the lesson correct-answer chime
(`apps/web/src/lessons/lessonSound.ts`) and the city skill-complete chime
(`apps/web/src/city/chime.ts:22`, called from `CitySurface.tsx:69` and fired on completion).
`CREDITS.md:63-69` records that the second is *"the reason this feature added no effect for
'building completed': one already existed."*

The catalog is per-sample tuned rather than one volume for all six
(`apps/web/src/audio/soundEffects.ts:57-80`): each entry carries a `trim`, a `minIntervalMs`
retrigger floor, and a voice count. Roads are the reason the floor exists (`:41-47`).

**2. What is missing.** Not much, and it is worth saying plainly: **this item did not need to be on
the list.** What a fresh ear would notice is absent:

- **No sound on an era advance or on a trial clear.** The two largest beats in the game are silent.
- **No sound for a civic purchase distinct from a cosmetic purchase.** #273 and #288 add a second
  kind of buying; both would land on `purchase`.
- **No sustained construction ambience.** `place-building` is a one-shot thud. There is no loop for
  a building mid-construction. Recommended against: it is the sound most likely to become
  irritating on the hundredth repetition, which is the standard `soundEffects.ts:52-56` sets.

**3. Asset dependency.** **Not blocked.** Kenney's CC0 packs already sourced six files and would
cover an era-advance flourish from the same `Music Jingles` pack `mastery-star` and
`building-unlocked` came from (`CREDITS.md:46-58`).

**4. Size and collisions.** **Trivial** per effect: one catalog row and one call site.
`CitySurface.tsx` is heavily rewritten by #273, so a new call site inside it should be stacked
behind #273 rather than raced against it.

**Lane: Gabe** (audio, the city). A lesson-side effect would be Anthony's and none is proposed.

**Research standing: UNRANKED**, exactly as for music. Sound is game feel here and nothing claims
otherwise.

**5. Decisions the lead owes.** One, and it is small.

- **Does an era advance get its own sound?** *Recommendation: yes, one sample, on the ceremony's
  arrival beat.* It is the biggest uncelebrated moment in the game and the celebration amplitude
  stays low, which `Game_Visual_Design_Brief.md:73` requires.

---

## 4. Citizens using roads, and making happiness gains apparent

These are one section because #273 answers most of both, and the residue is a single gap.

### 4.1 What exists today

**At the tip, the citizens engine is complete and nothing renders it.**

- `deriveCitizenRoster` (`engines/game/src/citizens.ts:165-294`) returns population, per-building
  occupancy, homes, the waiting crowd and `settled`. Pure, seeded, clockless.
- The population and capacity arithmetic is `engines/game/src/citizens-population.ts`; the tuning
  table is `engines/game/src/citizens-tuning.ts`.
- The web adapter is `cityCitizenRoster` (`apps/web/src/city/citizens.ts:55-95`). **Its only
  importer in the tree is its own test**, `apps/web/src/city/citizens.test.ts`, measured by grep
  over `apps/`, `engines/` and `packages/`. So the roster is derived by nothing the player can see.
- **Nothing can path.** There is no pathfinder anywhere at tip: no Dijkstra, no A\*, no BFS over the
  road grid. `apps/web/src/city/roads.ts` owns price, legality and auto-tiling and explicitly nothing
  else (`roads.ts:6-19`). `apps/web/src/city/three/` has 57 files and no citizen or vehicle layer.
- The HUD shows material, XP level and the shop, and no city state at all
  (`apps/web/src/economy/EconomyHud.tsx:33-89`).
- Happiness and livability **are computed and shown to nobody.** `deriveCapacities`
  (`packages/economy/src/capacity.ts:97-107`) and `capacityShortfall` (`:125-135`) have no
  non-test consumer outside their own package, and `civicCityCapacities`
  (`packages/economy/src/civicBuilding.ts:137-152`) has none outside its own test.

**PR #273 closes almost all of that.** Measured at `aac2be48`:

- `apps/web/src/city/three/Citizens.tsx` (638 lines) renders them, mounted at
  `three/CityScene.tsx:1090` with a `roadCells` prop at `:1094`.
- `apps/web/src/city/three/citizenRoutes.ts` (164 lines) is a uniform-cost search over the
  four-connected cell grid in which **a road cell costs `ROAD_PREFERENCE_WEIGHT` and bare ground
  costs 1** (`citizens-tuning.ts:165`, value `0.5`). Its own docblock states the mechanic exactly:
  *"traffic visibly follows the paths, and a citizen with no road anywhere near them still gets
  where they are going."* An unreachable destination degrades to a direct line, never a null.
- `engines/game/src/city-vitality.ts` (309 lines) plus `city-vitality-tuning.ts` (338) derive
  livability, happiness coverage, a band and the shortfalls, including `fromPaths`, the share of
  coverage that came from laid road tiles (`ROAD_HAPPINESS_PER_TILE = 1`,
  `city-vitality-tuning.ts:338`).
- `apps/web/src/city/CityVitalityPanel.tsx` is the always-on DOM readout: population, a threshold
  instrument for livability, a counting instrument for happiness coverage, and a three-band face.
- **Civic buildings are attributed per building.** The purchase card lists what a row provides
  (`CitySurface.tsx:5772-5807`), the placed building's click panel says *"N more people sustained"*
  and *"An amenity for N more"* (`CitySurface.tsx:4600`, `:4605`), and the same sentence is spoken
  (`apps/web/src/city/announcements.ts:314-317`, branch line numbers).

**So "citizens using roads" is done in #273, completely.** Proposing it would be duplicate work.

### 4.2 What is missing, after #273

**One gap, and it is precisely the lead's wording: the gains tied to *skill* buildings.** #273
attributes civic contributions per building and pools everything else.

- A skill building's residence capacity is real and per-node: `CITIZEN_NODE_CAPACITY`
  (`citizens-tuning.ts:102-116`) gives `NUM.2` 10 built and 26 mastered, `NUM.S` / `NUM.F` / `NUM.5`
  2 and 6, `NUM.3` and `NUM.4` zero homes and 8 and 12 daytime seats.
- A skill building's happiness contribution is real and per-role: `SKILL_HAPPINESS_BY_ROLE` on #273
  (`city-vitality-tuning.ts:284-288`) gives `residence` 0, `school` 1, `civic` 2.
- **Neither is stated on any per-building surface, and no surface states the delta at the moment it
  changes.** Grepping the #273 branch, the strings *"more people sustained"* and *"an amenity for"*
  appear only on the civic path. The skill popup does not carry a capacity line, and the completion
  announcement does not carry one either.

A second, smaller gap: **carts on the roads.** §6.2.

### 4.3 Asset dependency

**None.** Both halves are code and copy. #273's citizens are procedural geometry, not authored art.

### 4.4 Size, and what it collides with

**Citizens using roads: do not size it, it is #273's.** 264 files, +41,000 lines, open, based on
this exact tip.

**Skill-building attribution: small**, and it is a text change on two surfaces #273 already touches.
It **must be stacked behind #273** rather than landing on `integration` first: `CitySurface.tsx` is
where both surfaces live and #273 rewrites it heavily, so an independent edit is a guaranteed
conflict in the largest file in the app.

**The capacity reconciliation is the real collision, and it is upstream of the copy.** There are two
capacity ledgers and they do not meet. The code says so itself, at
`engines/game/src/citizens.ts:198-206`:

> *"`capacity` is `residenceCapacity`, a sum over SKILL NODES that no crisis may lower and that a
> purchased civic building adds nothing to. The capacity the ruling's lever moves is the economy's
> `livability`, and this function takes no economy input at all. Until those are reconciled the
> ruling cannot reach this line."*

Tracked as **O-20** in `docs/superpowers/specs/2026-07-29-mid-era-crisis-design.md`. The lead's
recorded leaning is that `residenceCapacity` becomes authoritative and gains the missing inputs.

**Lane: Gabe** (the city, the 3D layer, the economy), with one caveat that is a real cost: the
*surfaces* are `CitySurface.tsx` and `announcements.ts`, which #273 is rewriting, so this needs
**Evan's** awareness as the author of the code it lands on top of even though it lands in Gabe's
lane. The capacity **numbers** it would print are `engines/game`, which the `OWNERS.md` table still
records as Evan's row.

**A skill-building attribution survives that reconciliation, and a livability attribution does
not.** This is the reason to scope item 1 the way §1 scopes it. Under the lead's leaning,
`residenceCapacity` keeps every term it has and *gains* civic inputs, so *"this building houses 26
of your people"* stays true afterwards: the reconciliation adds terms to the pool rather than moving
`NUM.2` out of it. A sentence phrased against `livability.sustains` instead would be describing a
number that is about to change meaning. **So attribute the skill building's own contribution, and
leave the pooled total to the panel.**

### 4.5 Decisions the lead owes

- **Where does a skill building's capacity line go?** *Recommendation: on the building callout, in
  the same slot and the same words the civic panel uses.* Reusing `civicProvidesSentence`'s phrasing
  makes the two building classes legible as one system, and a learner who has read one has read
  both.
- **Is the gain announced at the moment it happens, or only inspectable on click?** *Recommendation:
  both, and the announcement is the more valuable half.* The mastery beat already fires a chime, a
  bounce and an announcement (`CitySurface.tsx:1084-1129`); adding a clause costs nothing and it is
  the only way the 10-to-26 jump is ever felt as an event. **The clause must be informational and
  not a reward**, which is BUILD 5 and the reason to write *"the Dwellings now house 26"* rather than
  *"+16 capacity earned"*. **BUILD 2 sharpens this:** phrase it against **mastery**, the one
  unifying signal, rather than introducing a second score the learner has to track.
- **O-20: which capacity bounds population?** Not this document's to decide, and it is the
  prerequisite for anything that surfaces `livability` as a *bound* rather than as a readout.
  *Recommendation: ratify the recorded leaning* (`residenceCapacity` authoritative, gaining civic
  inputs) *before anyone writes copy about livability*, because the copy is cheap and re-writing it
  after a model change is not.

---

## 5. Achievements: RULED, scoped and designed

**The lead ruled on 2026-08-01 and overruled the badges third of SPOV 2.** This section is the design
record his amendment points at. It has moved from *"blocked on the lead"* to *"ruled"*, and the
history of how it got there is kept in §5.2 because a reversal that hides the position it reversed is
not a record.

### 5.1 The ruling, its scope, and why the carve-out is principled

**The ruling, verbatim:** *"overruling spov - short achievements like 'You defeated your first
crisis!' literally cant hurt"*.

**What is permitted: a MILESTONE ACKNOWLEDGEMENT.** One short line, shown once, naming a thing the
player has just done.

> **⚠ THE SCOPE IS A READING OF HIS EXAMPLE, NOT OF HIS WORDS.** His sentence says *"short
> achievements"* and gives one instance, and the instance is a **one-off acknowledgement of a real
> in-game event the player caused**. That is the scope recorded here and in the SPOV 2 amendment, and
> it is stated as a reading so he can widen or narrow it in one line. **Getting it wrong is costly in
> both directions:** too narrow and he has not been given what he asked for, too wide and
> *"achievements are back on"* reopens the point-chasing and competition SPOV 2 was right to close.

**Why this is a principled carve-out rather than the lead overriding his own research.** Read what
SPOV 2 actually indicts: *"competition breeds anxiety and toxicity, and badges and points cause
extrinsic drift and reward-gaming that sacrifices real learning."* The objection is to **extrinsic
reward systems that displace intrinsic motivation, to competition, and to reward-gaming.** A single
line acknowledging something the player did for their own reasons is none of the three: **nothing to
collect, nothing to compare, nothing to farm.** It is closer to **BUILD 8**, White Hat narrative in
its learner-as-protagonist form, which the ranked set *promotes*, than to a badge.

**ST Math is not evidence against it.** SPOV 2 cites it for shipping none of the triad, which is a
fact about the triad. Nothing in the WestEd evaluation (2.4) tests milestone acknowledgement either
way.

**The counterweight is load-bearing here, not a caveat.** The badges refusal rested on subcategory
2.6, which is the **weakest-sourced material in the document**: both sources are marked
*"(team-provided; locate DOI before quoting)"* and the verification note repeats that they need
confirming against the primaries. **That is what makes this reversal cheap to justify:** it moves a
position that stood on a team commitment plus the document's shakiest citations, not one that stood
on its meta-analyses. **The other two thirds of SPOV 2 are not weakened by the same argument**, and
that asymmetry is the reason to hold them: competition is independently indicted by 2.4 and 2.5, and
points by AVOID 14.

### 5.2 What the research says, kept because the reversal needs its own record

**The 15 ranked items do not list achievements or badges in BUILD, CAREFUL or AVOID**
(`BrainLift_Game_Design.md:312-330`). **The document ruled on them anyway, in two places, and both
were against.**

1. **SPOV 2** (`:34`), signed by Gabriel Xiong, Evan Cabrera and Anthony Zheng (`:5-8`), now amended
   in its badges third only.
2. **Subcategory 2.6, *"Game features that hurt learning"***, in which badges are named by **both**
   sources: they *"give the illusion of promoting learning"* while driving *"shallow engagement"*
   (`:230-231`), and they *"shift students toward extrinsic reward collection, students may exploit
   shortcuts to farm rewards"* (`:239`).

**The superseded file's one favourable figure for badges is gone.** It gave badge-only `SMD ≈ 0.33`,
which appears nowhere in the ranked set. Recorded so nobody reintroduces it as support.

**Khan Academy is the nearest thing to a positive precedent** and it is a narrow one: 2.2 cites its
*"tiered mastery badges"* approvingly, but only for being *"deliberately kept in the background so
they do not overshadow the content"*. That is an argument about **restraint**, which is BUILD 6, and
it is the shape §5.5 builds to.

### 5.3 What exists today

**Nothing.** There is no achievement, badge or trophy system anywhere: grepping the tree for
`achievement`, `badge`, `trophy` and their capitalised forms returns only unrelated uses. The
matches in `apps/web/src/lessons/**` are widget-feedback badges, meaning the small correct-answer
marker; the matches in `apps/web/src/economy/Shop.tsx` and `styles.css` are the shop's *equipped*
badge; the matches in `docs/` are the word used in prose.

**The events a milestone would read are already computed, and two of them are computed and consumed
by nothing**, which is what makes this cheap:

- **`isCrisisDamageClear`** (`engines/game/src/crisis-damage.ts:122`), *"True when the city carries
  nothing a crisis did"*. **No production consumer** (measured in the unconsumed-export sweep).
- **`roster.settled`** (`engines/game/src/citizens.ts:291-292`), true when every node is mastered and
  nobody is waiting. **No consumer at all**, because the whole roster is unconsumed at tip (§4.1).
- **The append-only ledger with stable event ids** (`packages/economy/src/ledger.ts`), whose
  `hasEvent(view, eventId)` (`:23-25`) is the existing once-only check and whose `created_at` is
  *"written and never read: a record, not an input"* (`:18-21`). **A milestone must inherit that
  exactly** and read event ids rather than dates, which is also how it satisfies `INV-ERA-3`.
- Mastery is monotonic in v1 (`docs/MVP_Definition.md:32`), so a milestone over mastery can never be
  un-earned.

### 5.4 The seven guardrails, and how the design satisfies each

Non-negotiable, all seven, and each one is what rules out an obvious wrong version.

| Guardrail | Source | How the design satisfies it |
| --- | --- | --- |
| **No parallel point system** | **BUILD 2**, *"no parallel point systems"* | **The hardest one, and the one most likely to be violated by accident.** No score, currency, count, tier or completion percentage. No *"7 of 30"*. §5.6 is about this |
| **No ranking or comparison** | SPOV 2's untouched leaderboards third; **AVOID 12** | A milestone names only what *this* player did. There is no other learner in the sentence and no cohort to sit in |
| **No streak-loss guilt, no pass/fail urgency** | `Game_Visual_Design_Brief.md` §2 (`:70-71`) | **Every milestone fires on an event that has already happened.** A milestone that can be *missed* is a punishment wearing a reward's clothes, which is why §5.5 rejects the conditional ones by name |
| **No busywork** | **AVOID 15**; **SPOV 3** | Each one marks something the player did **for their own reasons**. Nothing is invented in order to be acknowledged, and nothing asks for an extra click |
| **Nothing gates learning** | **`INV-COS-1`** (`docs/Contracts.md:276`) | A milestone is a read. Nothing reads it back, so it cannot be an input to a lesson, a mastery, a trial or an era advance |
| **Nothing keys off study pace** | **`INV-ERA-3`** (`2026-07-27-era-progression-design.md:1726-1740`) | No milestone for speed and none for consecutive days. The ledger's `created_at` is not read, so this is structural rather than intended |
| **Short** | The lead's own word. His example is six words | One line, in the sentence-shaped copy the game already uses. **Anything needing a panel is not what he asked for**, which is why §5.6 rejects a screen |

### 5.5 The proposed set: four, and what makes each qualify

**Deliberately small.** The ranked set's own reasoning argues for this rather than for a long list:
BUILD 6 asks that the game layer stay subordinate, AVOID 15 forbids inventing things to mark, and the
superseded file's *"fades with novelty"* was the one honest thing it said about badges.

**The crisis is the first surface, because the lead's example is a crisis.** Milestones 1 and 2 land
there.

| # | Line | Fires on | What makes it qualify |
| --- | --- | --- | --- |
| 1 | *"You defeated your first crisis!"* | Crisis resolution, first time only | **The lead's own example, kept verbatim.** A real event with a real outcome that the player caused by playing it. Cannot be missed: it fires *after* the crisis is over |
| 2 | *"Your city is back on its feet."* | `isCrisisDamageClear` becoming true after damage, first time only | The player spent material to repair every scar, which is an allocation choice they made. **The predicate already exists and drives nothing** (`crisis-damage.ts:122`). Marks recovery rather than survival, which are genuinely different beats |
| 3 | *"Everyone here has a home."* | `roster.settled` becoming true, first time only | **D-CIT16 already designates this as the closing beat** and the citizens design wrote the *"this community is happy"* prompt for it. It responds to **how you built**, never to how fast you studied, so `INV-ERA-3` is satisfied by the predicate's own construction |
| 4 | *"Your first age is behind you."* | The first era advance | A real chapter break with a ceremony already attached. **⚠ Surface collision: the era advance ceremony is another agent's right now** (§5.7), so this one waits rather than racing them |

**Four near-misses, named because each one looks reasonable and fails a specific guardrail.** This
list is more useful than the four above, since it is what stops the set growing wrong.

- **"Survived a crisis without losing a building."** Fails the no-pass/fail guardrail. It is
  **conditional**, so it can be *missed*, and a milestone you failed to get is a punishment.
- **"Ten civic buildings built."** Fails **BUILD 2** and **AVOID 15**. A threshold on a count is a
  parallel score, and the count exists only to be crossed.
- **"Mastered a skill three days running."** Fails **`INV-ERA-3`** outright and brings streak-loss
  guilt with it.
- **"All 62 skills mastered."** Fails nothing, and is still rejected: it is the **game-completion
  ceremony's** beat and `2026-07-31-game-completion-ceremony-design.md` already owns it. A milestone
  line there would be a second, smaller version of an ending that is already designed.

### 5.6 How a milestone is surfaced without a parallel point system

**This is the constraint most likely to be violated by accident, so the surface is specified rather
than left to whoever builds it.**

**What it is: one line, once, where the event already announced itself.** The crisis conclusion
already renders a sheet (`apps/web/src/city/three/WinterInCity.tsx`, its conclusion element pinned by
`three/winterConclusionSheet.browser.test.tsx`), and the completion beats already announce themselves
politely through the live region (`CitySurface.tsx:1084-1129`). **A milestone is a sentence added to a
beat that exists**, not a new surface. That single decision satisfies four guardrails at once: no
panel, no clutter, no extra click, and nothing to navigate to.

**What makes it not a point system, stated as four prohibitions on the implementation:**

1. **No aggregate view.** There is no page, drawer or list that shows milestones together. **The
   moment they are collected onto one surface they become a set with a size**, and a set with a size
   has a completion percentage whether or not anyone renders one. This is the whole difference
   between a milestone and a badge, and it is why the previous revision's recommendation to put a
   record on the era timeline is **withdrawn** (§5.7).
2. **Nothing is counted.** No total, no *"N of M"*, no tier, no rarity, and no number anywhere in the
   copy except numbers that are part of the event itself.
3. **It is derived, never accumulated.** Whether a milestone has fired is a read over state that
   already exists (the ledger's event ids, `isCrisisDamageClear`, `roster.settled`, era state). **No
   new store, no earned-set to persist, no `milestones` array.** A stored set is a collection, and a
   collection invites a screen to show it.
4. **The once-only check is `hasEvent`-shaped, not a timestamp.** The ledger already answers *"has
   this happened before"* by event id (`ledger.ts:23-25`), and reusing that keeps `created_at`
   unread and `INV-ERA-3` structural.

**The honest limitation of prohibition 3**, since it is the one that will be argued with: a purely
derived milestone can fire again if the state it reads becomes false and then true. `isCrisisDamageClear`
is the live case, because a second crisis can re-damage a repaired city. **That is what the ledger
event id is for**, and it is the one piece of persistence a milestone legitimately needs: a
`milestone:<id>` row is not a collection, it is the same once-only idempotency the grants already use.

### 5.7 Decisions: what the ruling settled and what survives

**Settled by the ruling and the scoping. No longer questions.**

- ~~*Build it at all?*~~ **Ruled: yes.** The lead overruled SPOV 2's badges third.
- ~~*Does a record of what you have done count as a badge under SPOV 2?*~~ **Moot.** The scoping is
  narrower than a record: it is a line per event, and there is no record.
- ~~*Where does the record live?*~~ **Withdrawn, and this is a reversal of the previous revision's own
  recommendation.** That revision recommended a section of the era timeline. **§5.6 prohibition 1
  rules that out:** an aggregate surface makes a set with a size, which is the parallel point system
  BUILD 2 forbids. The previous recommendation was written before BUILD 2 was known and is wrong.
- ~~*Hidden until earned, or a visible list with locked entries?*~~ **Moot.** There is no list.
- ~~*Named or numbered?*~~ **Settled by the ruling's own example**, which is a plain English sentence.

**Three that survive, all small.**

1. **Is the proposed set right, and is four the number?** *Recommendation: ship 1 and 2 only, both on
   the crisis, and let 3 and 4 wait.* Two is enough to see whether the beat lands, milestone 1 is his
   own example, and milestone 2 is free because its predicate already exists and drives nothing. **If
   he wants a wider scope than one line per event, the SPOV 2 amendment banner is where he says so.**
2. **Does a milestone make a sound?** It is a beat, and §3 notes the two biggest beats in the game are
   silent. *Recommendation: no, not initially.* The crisis conclusion is already a loud moment, and
   `Game_Visual_Design_Brief.md:73` keeps celebration amplitude low and earned. Adding audio to a new
   mechanic on the same day it ships makes two things to evaluate instead of one.
3. **Who writes the copy?** Four sentences, and the game's copy is split by lane. *Recommendation:
   Gabe writes all four*, because every one of them names a **city** event and none touches a lesson.
   This is worth stating because it is what keeps the mechanic out of Anthony's lane entirely.

### 5.8 Size, collisions, lane

**Small**, which is a change from the previous revision's *"medium"*: §5.6 removed the surface, and
the surface was the size. What is left is four predicates, a `hasEvent` check and four sentences.

**Collisions: one, and it is a surface rather than a file.** Milestone 4 lands on the era advance
ceremony, which **the end-of-era progression agent owns right now**. Milestones 1 to 3 do not touch
it. `apps/web/src/city/EraTimeline.tsx` and `packages/skill-graph/src/eraTimeline.ts` are untouched by
#273, but that no longer matters, because §5.6 withdrew the recommendation to build there.

**Lane: Gabe** (the city, the crises, the era model, the economy). **Nothing here reaches Anthony's
lane**, provided every milestone is defined over city events and the ledger rather than over lesson or
practice state, which is decision 3's reason.

**Confirmation, since it is the thing most easily lost in a reversal: points and leaderboards remain
refused.** SPOV 2's amendment moves its badges third only. There is no score, no currency, no count,
no ranking and no comparison anywhere in this design, and AVOID 12 and AVOID 14 are untouched.

---

## 6. Own proposals

### 6.1 Promised but unbuilt

#### `review_due`, the spaced-retrieval nudge

> **PARKED 2026-08-01. Open ruling, no owner, no date.** Put to the lead and answered *"not sure what
> the context/purpose of this is"*, which is a reasonable response to a mechanic that is unbuilt,
> post-MVP and in another lane. **Nothing below is advocacy and no scheduling is proposed.** It is kept
> in full, at the same length, because the three options and the argument against the tempting
> compromise are exactly what a later reader would otherwise re-derive, and because the finding that
> its expensive half already ships is worth not losing. **It stays below the line until someone owns
> it.**

**The best-evidenced item in the research, and parked anyway.** It is BUILD 4, it is SPOV 4, and it
rests on the best-sourced category in the document. Recorded, not pressed.

**What the ranked set says.** **BUILD 4: *"Retrieval-and-spacing baked into the return-pull. The
reason to open the app tomorrow resurfaces an already-built skill for a light recall check at
expanding intervals."*** And **SPOV 4** goes further, making it the team's stated design thesis:
*"the 'reward' for mastering a building is being made to use that skill again later... our engagement
mechanic and our learning mechanic are the same mechanic, not a reward skin over a worksheet."*
Category 4 supplies four peer-reviewed primaries: retrieval beats restudy and the advantage **grows
with delay** (Roediger and Karpicke 2006), the optimal gap **widens with the retention horizon**
(Cepeda et al. 2006), and both hold **specifically for mathematics** (Rohrer and Taylor 2007).

**Promised in the repo, in three places.** `docs/Contracts.md:45` reserves `last_practiced_at` *"for
the post-MVP `review_due` nudge (no decay in v1)"*; `docs/Post_MVP_Backlog.md:49` is item 8;
`docs/MVP_Definition.md:32` puts it out of MVP scope.

**Why it is worth doing, in terms of what the player experiences.** A learner who mastered fractions
in era one and reaches era six has not touched fractions in hours of play, and nothing invites them
back. The experience it buys is a building that asks for a moment of attention and gives it back. It
is also the only item in this document that makes the learning stick rather than making the city
nicer, which is precisely SPOV 1's test: *"we treat every engagement mechanic as guilty until it is
shown to serve the mastery loop."*

**What exists today.** The capture. `last_practiced_at` is in the migration
(`db/migrations/0001_core_contracts.sql:35`) and the shared schema
(`packages/shared-state-schema/src/index.ts:29`), and is written on every scored set. It is read once
in the tree, as a boolean: `engines/game/src/practice-evidence.ts:24-26`. **The value is discarded.**
The revisit doors also already exist: `LessonMenu` renders an ungated lesson card beside two practice
cards, and it is already opened from two places.

**Size: medium. Lane: Anthony's** (`apps/web/src/lessons/**`, the item bank, the lesson validators),
which is a real part of its cost: it needs his review and his schedule, and it is the only proposal
here that does.

##### The collision, and it got sharper rather than softer

**`INV-ERA-3` / D-ERA14 (`2026-07-27-era-progression-design.md:1726-1740`) forbids, exhaustively,
anything keying off *study pace*, *absence or time-since-last-session*, *streaks*, and *elapsed
wall-clock time of any kind*.** BUILD 4 asks for *"expanding intervals"* and names the trigger as
*"the reason to open the app **tomorrow**"*. **That is more explicitly clock-bound than the
superseded file's phrasing was**, so re-reading against the ranked set widened the conflict instead of
closing it.

Two further tensions, both unchanged:

- `Post_MVP_Backlog.md:49` says *"light decay"*, and `MVP_Definition.md:32` plus
  `Game_Visual_Design_Brief.md:97-98` say mastery is monotonic with no decay. **Those cannot both
  hold.**
- The brief bans *"nagging badge/notification pressure"* (`:71`), and a nudge is the mechanic most at
  risk of becoming one.

##### The open ruling, with the tradeoff stated, for whenever this is picked up

**PARKED. This is the ruling the item waits on, left where it can be found rather than pressed.**

**It is a `BUILD`-ranked recommendation resting on the strongest evidence in the research,
colliding with a hard invariant of the era model. It is not resolvable by reading more evidence and
it is not this document's to settle.** Put plainly, the choice is:

| Option | What is gained | What is paid |
| --- | --- | --- |
| **A. `INV-ERA-3` binds the CITY only** *(recommended)* | The highest-evidence feature in the research becomes buildable. The city keeps every guarantee the invariant was written for | The invariant's text says *"nothing may key off... elapsed wall-clock time of any kind"* and would need a dated amendment narrowing its scope. Somebody later reading the narrowed rule must not read it as permission for the city |
| **B. `INV-ERA-3` binds the whole product** | Nothing to amend; the clockless posture is total and structurally simple | **`review_due` is dead**, and with it BUILD 4 and SPOV 4. The team's own stated design thesis becomes unbuildable, and `last_practiced_at` stays a boolean forever |
| **C. Spacing measured in play time, not wall-clock** | Honours the invariant's letter, since §8's own precedent is *"departures are measured in play time, never wall-clock"* | **The pedagogy is about elapsed time, not play time.** Cepeda et al. tie the optimal gap to the *retention horizon*; a learner who plays for six hours in one sitting would get "spaced" practice that is massed in every sense the research measures. This option looks like a compromise and gives up the mechanism |

**Recommendation: option A**, with three guardrails on the nudge, because the argument for A is that
`INV-ERA-3` sits in a section titled *"Happiness, population, and what the player can be blamed for"*
and both of its structural guarantees are about the city. The guardrails: it never touches happiness,
population or any city state; it never decays mastery, so the monotonic guarantee is untouched; and
**it counts offers rather than absences**, so a learner returning after a week sees an invitation and
not a reckoning. The third is CAREFUL 9's own *"compare-to-your-own-past... never catastrophize a
missed day"*, applied to a nudge instead of a streak.

**Option C is named because it is the compromise somebody will propose**, and it is worth having the
reason it fails written down before they do.

#### The Chronicler (D-ERA19 layer 4)

> **⚑⚑ CUT BY THE LEAD 2026-08-04, WITH THE TIMELINE. The item is closed, and not by being
> delivered.**
>
> `CityAlbum.tsx` and the ☰ Menu button are deleted. **`cityAlbumView.ts`'s reconstruction is
> kept**, because #568 §8.8 builds
> the archipelago's revisited island out of it: *"the album reconstructs each past era's
> composition from current placements; under the archipelago that reconstruction stops being a
> reconstruction."* So the surface is gone and the derivation is waiting on stage 3, which is
> unstarted.
>
> **Two things below are now wrong in the other direction and are worth reading as a pair.**
> This section mis-sized the item as *"medium, and it is blocked"* when it was small and
> unblocked; the banner under this one records that. What neither noticed is that the whole
> item was **provisional on a design decision that had not been taken** — the archipelago
> makes the surface redundant, and the archipelago proposal is dated three days after this
> section. Nothing here could have known that. It is recorded because a backlog entry's real
> risk is not mis-sizing, which costs a run; it is being right about the feature and wrong
> about whether the product still wants it, which costs the whole build.
>
> **⚑ BUILT AND MERGED 2026-08-01 AS THE ALBUM. EVERYTHING BELOW THIS BANNER DESCRIBES A TREE
> THAT NO LONGER EXISTS, and it is kept unedited because the sizing was wrong in an
> instructive way rather than because it is still true.**
>
> **#393**, `mergedAt` **`2026-08-01T21:28:05Z`**, merge commit **`1c0a3113`**, an ancestor of
> every tip since. `apps/web/src/city/cityAlbumView.ts` (the read model),
> `CityAlbum.tsx` (the surface), and one ☰ Menu button beside the Timeline. Read off `mergedAt`
> rather than inferred from a push.
>
> **THE BLOCKER WAS NOT REAL, and that is the correction worth carrying forward.** This section
> says the record *"has to survive a reload, so it needs the persistence Wave 2 write path"*.
> It does not, and #393's argument is short enough to restate: nothing is ever removed from a
> city, and every node belongs to exactly one era statically, **so filtering the CURRENT
> placement set by era IS the reconstruction of every past era's composition.** A snapshot
> would buy only two things the album deliberately does without — where a building stood before
> it was moved, and roads and crisis scars, neither of which can be placed in time at all.
> So the item was mis-sized as *"medium, and it is blocked"* when it was small and unblocked,
> and it sat below the line for a dependency it never had.
>
> **The three decisions this section put to the lead were all taken the way it recommended**:
> re-derive rather than snapshot (and more cheaply than recommended, since even the counts are
> not stored), a description with the retired hub as the one image per page, and the rename to
> **Album**.
>
> **A LATER AMENDMENT, 2026-08-03.** The album shipped reading skill placements only, so every
> BOUGHT quarter was dropped from it: a learner who had spent an era's stockpile opened their
> album and read that nothing had been raised. Corrected, on the same reconstruction argument —
> D-ERA11 freezes a civic building in the era it was bought and makes each era's catalogue
> exclusive to that era, so `civicPlacementEra` pins its era to its id exactly as
> `getEraOfNode` pins a skill building's. **No persistence was added for that either.**

**Promised, with a decision id, from the lead's own words.**
`docs/superpowers/specs/2026-07-27-era-progression-design.md:2007-2035` defines it: *"the chronicler
is a log of what your empire looked like at each era, and lets you basically see the progress."* The
document records that it is **defined, unbuilt and unowned**, and distinguishes it from two adjacent
surfaces: the era timeline is the syllabus and **ships** (`packages/skill-graph/src/eraTimeline.ts`,
`apps/web/src/city/EraTimeline.tsx`); the Chronicle is a door back into a skill and is **unbuilt**
and Evan's.

**Why it is worth doing, in terms of what the player experiences.** A learner who has reached era
five has built a city they can walk around, and they cannot see the city they had in era two,
because era two's city is buried inside a city that also holds eras three, four and five. The island
shows composition. Only a snapshot shows a *then*. The felt payoff is the one the lead named: you
open it and see how far you have come, in your own buildings rather than in a progress bar.

**Research standing: BUILD 1, on one leg rather than two.** Visible-artifact progress is *"the single
best-evidenced motivational feature"* (2.2, peer-reviewed: Bai/Hew/Huang and Sailer/Homner), and a
per-era record is that mechanic extended over time. **The second support was withdrawn:** this
document previously also cited endowed progress, which was BUILD 2 in the superseded file with a *"19%
to 34%"* figure, and **neither the item nor the figure appears in the ranked set**. The Zeigarnik
multi-timescale material (1.4) also supports it but is game-design writing rather than efficacy
evidence, so it is named and not leaned on. **Net: still BUILD, with a thinner case than previously
claimed.**

**What exists today.** The era store (`apps/web/src/city/useCityEra.ts`), the advance ceremony
(`apps/web/src/city/EraAdvanceCeremony.tsx`), the placement record
(`apps/web/src/city/citySession.ts`), and the era timeline as a precedent for the surface. What is
missing is the snapshot itself: something that records the city at an advance and can render it
back.

**Size: medium, and it is blocked.** The record has to survive a reload, so it needs the persistence
Wave 2 write path, which another agent is building right now. Attempting it before that lands means
either inventing a second store or building a Chronicler that forgets.

**Lane: Gabe** (the city, the era model, persistence). Rendering past *building* art would touch
Evan's design lane, which the second recommendation below avoids by design.

**Decisions the lead owes.**
- **Snapshot, or re-derive?** *Recommendation: snapshot the counts and the era, not the geometry.*
  A stored list of which buildings stood, at what stage, in which era is small, durable and
  survives every art change. Storing a scene is a hostage to every future layout edit.
- **Does it render a picture, or a description?** *Recommendation: a description first, with the
  retired Town Hall as the one image.* §11.3 argues the halls are the only art genuinely lost, so
  one hall per entry carries most of the feeling at a tenth of the cost.
- **Chronicler or Chronicle: which gets renamed?** The design record flags the two-letter collision
  and declines to resolve it (`:2032-2035`). *Recommendation: rename the Chronicler, because the
  Chronicle is Evan's and specced.* A plain name in this project's vocabulary would be something
  like **the city's Album**, which passes the `flint`-to-`stone` test that *Chronicler* does not.

#### Two smaller ones, named for completeness

- **The Chronicle (D-ERA19 layer 2), widened by the lead to offer both doors**
  (`2026-07-27-era-progression-design.md:2069-2110`). Unbuilt, **Evan's**, and the design record
  notes the two-door menu already ships as `LessonMenu`, so it needs a route rather than a surface.
  Not proposed here because it is not in Gabe's lane; named because it is the cheapest promised item
  in the whole sweep and it overlaps the Chronicler's entry point. **Worth noting against BUILD 4:**
  a Chronicle entry is a door back into a past skill, which is the *surface* a spaced-retrieval nudge
  would want to open. The two are cheaper together than apart.
- **`ENDGAME_ATTACK_SCENE`** (`engines/game/src/descriptors.ts:219-220`) exists as a typed seam with
  a literal `built: false`, and **O-14** asks whether the calculus-attack endgame becomes era ten's
  trial. Not proposed: it is a whole game mode, it is Evan's open question, and era ten is unauthored.

### 6.2 Genuinely new

Both are cases of existing machinery computing something the player never sees, which is the
cheapest kind of proposal there is.

#### A growth-mindset copy audit

**Promoted above carts by the ranked set.** BUILD 8 names it: *"White Hat narrative
(learner-as-protagonist). Quest framing, **'still building this skill' language**."* In the
superseded file this was a standalone BUILD item resting on the Yeager 2019 RCT, which the ranked set
does not cite; it now rests on 2.4's White Hat framing instead, which is a practitioner frame over a
peer-reviewed core by the document's own admission. **So the support changed shape while staying at
BUILD**, and the phrase the recommendation asks for is now quoted rather than paraphrased.

**Why it is worth doing, in terms of what the player experiences.** Every learner reads this copy, in
every session. It costs no new surface, and it is the cheapest way to act on BUILD 6's restraint,
since it improves the game layer by rewording it rather than by adding to it.

**What exists today, and it is mostly good.** The construction vocabulary is already correct:
`site`, `construction`, `built`, and a not-yet-built node reads as a lot rather than a failure.
`lessonActionLabel` is already state-sensitive across *Review lesson* / *Read lesson* / *Resume
lesson* / *Start lesson* (`apps/web/src/city/announcements.ts:293-310`), and it says *Read* rather
than *Review* for a tested-out node because the lesson is new material there. #273's happiness band
at the low end is *"Wants more to do"* rather than a rebuke, and its own comment records the
reasoning: *"Anger is a verdict, and this panel is forbidden from passing one."*

**What is missing.** A pass over the copy that is *not* on those two paths, against one question:
does this sentence describe a state or pass a verdict? The candidates worth reading are the era
trial's missed-skill wording, the crisis call copy, and the shortfall sentences #273 introduces. **I
did not audit them: that is the proposal, not a finding.** Sizing it as small is a claim about the
mechanism, not a claim that the copy is fine.

**Size: small. Lane: split**, which is its main cost: the city copy is Gabe's and the lesson copy is
Anthony's, so it is two reviews or two changes.

**Decision the lead owes.** **Is this worth a dedicated pass, or does it ride along with the next
copy change in each lane?** *Recommendation: a dedicated pass, once, because the value is in reading
all of it against one rule.* Spread across other work it becomes a preference nobody applies
consistently.

#### Carts on the road network

**Demoted to last above the line by the confidence tags, and the reason is worth stating.** Carts
rest entirely on Category 1, which the ranked set's own verification note calls *"game-design
writing, not peer-reviewed... reliable as descriptions of genre patterns, not as efficacy
evidence"* and which it has *"not independently re-verified"*. The ranked set does not list traffic,
vehicles or ambient life anywhere. **So this is game feel with no efficacy claim behind it, and it
stays above the line only because it is nearly free.**

**It survives the new AVOID 15 and BUILD 6, and it is worth checking why rather than assuming.**
AVOID 15 bans *"busywork / micromanagement for its own sake"* and BUILD 6 requires that *"progress
markers never overshadow the math"*. A cart adds **no click, no decision and no maintenance**: it is
a read-only consequence of a spend the player has already made. So it is decoration that costs the
learner no working memory, which is the specific thing SPOV 3 protects.

**Why it is worth doing, in terms of what the player experiences.** A road tile costs the era's
material, and since the gold-drop that is **the same stockpile a civic building is bought from**:
`roadsEconomy.ts:11-19` records that *"a road tile now costs material a civic building could have
used, which is exactly the tradeoff the single currency exists to create."* Today the player pays
that tradeoff for a texture change. After #273 they also get walking routes and a happiness
contribution. A cart moving along a road you paid for is the difference between a road that *looks*
used and a road that *is* used, and it is the clearest available answer to *"what did that stone
do"*.

**What exists today.** The tuning, finished and consumed by nothing. `CARS_PER_ROAD_TILES = 8` and
`MAX_CARS = 6` (`engines/game/src/citizens-tuning.ts:168`, `:171`), documented as *"one car per this
many road tiles, so gold spent on roads buys visible life"*, which is a comment written before the
gold-drop. Measured by `git grep` over both `integration` and `evan/city-population-happiness`:
**the only non-documentation occurrences are the two definitions.** The implementation plan has it as
task 6, phase P5, blocked on its own open question Q7 (whether the cart budget shares the citizen
budget).

**A related naming defect is already tracked and is NOT re-reported as new here.** The road spend is
still named for the retired currency (`ROAD_TILE_GOLD_COST` at `apps/web/src/city/roads.ts:34`,
`insufficient_gold` at `:110`, `roadGoldSpent`, `road_gold_spent`).
`work-log/gabe/2026-07-29-gold-retired-and-the-cap-stops-being-a-clock.md:7` reports it and states it
was deliberately not done, and `work-log/gabe/2026-07-30-ten-era-economy-and-the-civic-ledger.md:170`
measures it at 62 references across 10 files. It is named here only because **anyone renaming
`MAX_CARS` should do it in the same pass**: both are identifiers naming something the game no longer
has.

**Size: small**, and it inherits the router (`three/citizenRoutes.ts`) and the instancing pattern
from #273. **Stacked behind #273** by dependency, not merely by courtesy.

**Lane: Gabe** (the 3D layer).

**Decisions the lead owes.**
- **Q7: shared budget or independent?** *Recommendation: independent, at `MAX_CARS = 6`.* Six is
  small next to `MAX_RENDERED_CITIZENS = 48` (`citizens-tuning.ts:191`), and coupling the two
  budgets means a crowded island silently loses its traffic, which is the opposite of the intended
  reading.
- **What is it in era one?** *This is the decision that actually matters, and it is a naming
  decision.* Era one is Prehistoric; a *car* is absurd there, and the constant is called
  `MAX_CARS`. *Recommendation: the mechanic is "traffic" and era one's vehicle is a handcart*, with
  the constants renamed to `MAX_VEHICLES` / `VEHICLES_PER_ROAD_TILE` on the same rule that turned
  `flint` into `stone`. Per-era vehicle art would then be on the same asset ladder as the island and
  the advisor, **which makes the mechanic asset-blocked beyond era one** even though era one itself
  is not.

### 6.3 Research-endorsed, unowned, and out of scope here

**Cooperative and relatedness features are BUILD 7** in the ranked set: *"Shared city goals, co-op
neighborhood builds"*, on the grounds that relatedness is *"one of the needs gamification actually
moves"* and cooperation is *"the documented safe alternative to competition"* (2.4, 2.5). Sailer and
Homner add that **combining cooperation with competition** was one of only two significant behavioural
moderators (2.1), which is a finer-grained claim than *"cooperative only"* and is not acted on here.

**The tree has no seam for it whatsoever**: no multiplayer, no shared state, no class or cohort
model. It is the largest gap between what the ranked set recommends and what the product has, and it
is a product decision rather than a mechanic. Flagged, not designed.
**`docs/BrainLift_Gamification_Category.md` may bear on it** and could not be read, so nothing
further is claimed.

---

## 7. Already done, and did not need to be on the list

1. **Building sound effects.** All six shipped effects are wired, plus two synthesized chimes. §3
   has the call-site table.
2. **Citizens using roads.** Fully built in #273, including a road-preferring router. §4.1.
3. **Click a placed building to review its lesson.** The era progression design's §11.1 records
   this as broken for *"56 of the 62 nodes"*, because `resolveBuildingModel` returned `null` for an
   unmapped node and a group with no geometry is not a raycast target. **That is fixed at this
   tip**: `apps/web/src/city/buildingAssets.ts:54-63` records the change and names the two tests
   that hold it, `unmappedBuilding.test.ts` and `unmappedBuildingRenders.browser.test.tsx`. Every
   placed node now renders geometry and is clickable. **The art gap remains**: 6 of 62 nodes have
   authored GLBs and the rest fail closed to a shared neutral template, so *"its own building"* is
   still art-incomplete. But the affordance works, and §11.1 is stale on the part that matters.
4. ~~**The era timeline.** Shipped and mounted (`apps/web/src/city/EraTimeline.tsx`, opened at
   `CitySurface.tsx:3002`).~~ ⚑ **CUT BY THE LEAD 2026-08-04.** The panel is deleted;
   `eraTimelineView.ts` and `packages/skill-graph/src/eraTimeline.ts` are kept, because #568
   §8.8 makes the archipelago's overview screen out of exactly their inputs. **The warning in
   this entry held up and is worth keeping in front of anybody working the cut**: it was
   written because *"someone reading the lead's list might build a third one"*, and on
   2026-08-04 someone reading the lead's list could just as easily have CUT a third one. The
   Chronicle is Evan's and unbuilt, and it is not what the ruling meant.

---

## 8. Findings reported and deliberately not fixed

### 8.1 `equipCosmetic` is visually inert

`apps/web/src/economy/useEconomy.ts:439` calls it and the shop renders an *equipped* state, but **no
file under `apps/web/src/city/` reads the equipped map**: grepping `equipped` across the tree returns
the economy modules, the persistence store and the stylesheet, and no city consumer. So a purchased
cosmetic changes nothing on the island.

**The ranked set makes this worse than a cosmetic defect.** CAREFUL 10's guardrail is *"effort-
fauceted, cosmetic-drained"*, and the cosmetic drain is the half that does not work.

### 8.2 The economy satisfies half of CAREFUL 10's guardrail and violates the other half

**This is sharper than the superseded file allowed, because the new guardrail has two named terms.**
CAREFUL 10: *"effort-fauceted, cosmetic-drained, never gate learning, frame earning as competence
feedback"*, and Category 3 adds that the economy *"must never become pay-to-skip"*.

| Term | Status |
| --- | --- |
| **Effort-fauceted** | **SATISFIED, and deliberately.** The lead ruled out passive generation, so material arrives only on lesson completion and practice. 3.1 is explicit that *"a passive drip of currency rewards waiting instead of learning"*, which is exactly the ruling |
| **Never gate learning** | **SATISFIED structurally.** `INV-COS-1`, and `packages/economy/src/capacity.ts:46-48` records that a shortfall gates nothing and that *"Nothing in this file returns a boolean anything could gate on"* |
| **Cosmetic-drained** | **NOT SATISFIED.** #273 and #288 make the era material buy civic buildings that provide livability and happiness. That is a functional drain, not a cosmetic one |

**The third row is a divergence from a recommendation, not from a contract**, and it does not violate
`INV-COS-1` or become pay-to-skip, because capacity gates nothing and no amount of material buys
progress. But it is a deliberate departure from the current research's named guardrail and the lead
should know it is one. *Recommendation: no change to the economy. Amend the guardrail's reading
instead*, to something like *"cosmetic-or-non-gating-drained"*, because the shipped design honours the
guardrail's purpose (nothing bought buys progress) while failing its letter.

### 8.3 The timed-storm escape hatch is withdrawn, and there is no live violation

**The ranked set's AVOID 13 broadened and dropped a caveat this project could previously have relied
on** (§0.1). Measured rather than assumed:

- **The era trial has no timer.** `engines/game/src/era-trial.ts:40` mentions a timer only to note
  what the trial does *not* inherit: *"storm's soft timer"*.
- **The storm surface is unmounted.** `apps/web/src/city/storm/` holds five components, and
  `StormBattleScaffold`, `StormEntryScreen`, `StormResultScreen`, `useStormBattle` and
  `StormBattleRound` have **no non-test importer outside that directory**. The single hit outside it
  is a prose reference in a comment (`apps/web/src/city/announcements.ts:286`).
- **The timer field is still live in the engine.** `engines/game/src/storm.ts:150` consumes
  `stormSpeedBonusRatio` against a 90-second budget, and `work-log/evan.md:20` records this as
  **O-9**, with a recommendation to remove it.

**So nothing a learner can reach today violates AVOID 13.** What changed is the argument available to
O-9: under the superseded research a soft, bonus-only timer had an explicit escape hatch, and under
the ranked set it does not. *Recommendation: close O-9 by removing the field*, which is now the only
research-supported option and costs nothing, since the surface that would have used it is unmounted.

### 8.4 A question about XP's prominence, reported as a question

**BUILD 2** forbids *"parallel point systems"* and **AVOID 14** permits XP only as *"a quiet
substrate"*. The always-on economy HUD carries **three XP figures** beside the material balance: a
level and title, a progress meter, and *"N/M XP, N total"* (`apps/web/src/economy/EconomyHud.tsx:61-78`).

**Not asserted as a violation**, for two reasons: XP genuinely is not a currency here and the code
says so at length (`packages/economy/src/types.ts:23-30`, kept because *"it is the only PERMANENT
record of learning"*), and whether one of two side-by-side stats is *"the headline"* is a judgement
rather than a measurement. **Raised because BUILD 2 is new information and nobody has looked at the
HUD through it.**

---

## 9. Verification

- **Biome over a docs-only diff is VACUOUS and is reported as vacuous, not as a pass.** Biome has no
  Markdown handler, and it says so itself rather than being taken on trust: `npx biome check` over
  exactly the **three** files this branch touches reports **`Checked 0 files`** and `× No files were
  processed in the specified paths`, listing all three as *"provided but ignored"*. (The elapsed figure
  on that first line varies per run, so only the file count is quoted.) So the run measures nothing
  here and is not offered as evidence for anything.
- **No production code is changed**, so no test could fail or pass on account of this document. The
  only non-spec edit on this branch is the **SPOV 2 amendment** in `docs/BrainLift_Game_Design.md`,
  which is prose in a design document.
- **The tip moved twice and the findings were re-checked rather than carried over.** See the banner at
  the top: `e53bf9cd` to `66579e81` (#369) to `ad212282` (#371), with an empty diff over every cited
  code path at each step.
- **Every claim about #273 or #288 is marked as being about an open PR**, and both `mergedAt` values
  were read as null rather than inferred. **#371's `mergedAt` was read as `2026-08-01T18:11:03Z`**,
  which is why the research files are described as being on `integration` rather than on a branch.
- **Both research documents were read at `ad212282`**, and every line citation into
  `BrainLift_Game_Design.md` was re-derived after this branch's own amendment shifted them. Where the
  current and superseded documents differ, §0.1 names what moved rather than silently following the
  newer one.
- **The SPOV 2 amendment follows the repo's reversal convention**, the one `2026-07-27-citizens-and-city-life-design.md`
  §6 uses for D-CIT4: a dated banner, the superseded position quoted and kept unedited, the ruling
  verbatim, and an explicit statement of what did **not** change. It is written into the document that
  holds the position rather than only into this one, because two other owners signed it.
- **The four remaining unreadable files are unread, not guessed.** `BrainLift_Product_Diagnostic.md`
  is the one most likely to bear on anything here, since the ranked set names it as owning the
  measurement case; nothing above rests on it.
