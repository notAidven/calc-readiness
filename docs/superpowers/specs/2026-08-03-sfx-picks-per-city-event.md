# Sound effects: one pick per event, with the link and the licence

**Date:** 2026-08-03 · **Status:** a sourcing sheet, and **every row of it has since been built**.
**Reads under §3 of `2026-08-01-game-feel-mechanics-backlog.md`**, which ranks this **UNRANKED** —
*"Sound is game feel here and nothing claims otherwise"*. No row below should be justified as a
learning benefit.

> **2026-08-04: the status line above used to read *"Nothing was acquired, no audio file is added,
> and no call site is wired"*, and it stayed there through the pull request that acquired the files
> and wired the call sites.** #523
> (merged `2026-08-04T02:16:59Z`) shipped fifteen of the sixteen picks; row 18 was the one left, for
> want of a departure mechanic, and it is wired now — see **§Row 18** below, which also records why
> its readiness signal was worse than useless. **Nothing in the tables is edited**: they are a
> sourcing record measured at `df9fe3e7`, and their picks, licences and measurements are what they
> were. What changed is the two cells that made claims about the TREE rather than about a sample —
> row 18's call site, and this status line.

**Events measured at `integration` `df9fe3e7`.** Every licence was read from its own asset page or
its own bundled `License.txt`, never from a search filter. **Every candidate was downloaded and
opened**: duration, peak level, attack and decay, plus a rendered spectrogram that was looked at.
Nobody has *listened* to any of them; §Verification says what that leaves open.

> **RE-POINTED from `4b20f836` to `df9fe3e7` and every line citation was re-derived, not carried
> over.** #499 moved ten of them — every `playSfx` and chime call site in `CitySurface.tsx` by 22 to 32
> lines, both tablists by 56 — so the earlier numbers were stale and are corrected here. **No event
> appeared or disappeared** and the arithmetic is unchanged. `2026-08-03-music-picks-per-slot.md` is
> now **on `integration`** (#493 merged 2026-08-03T23:03:30Z, `mergedAt` read), so its three CC-BY rows
> are counted there rather than recalled.

**29 events exist and 7 of them sound.** Of the 22 silent ones, **16 have a verified candidate**
(14 distinct sounds — two are shared across a pair of events), **1 is already covered by an asset in
the tree**, **2 are owed a sound nothing found**, and **3 are deliberately silent**. The tables are
the enumeration, one row per event, so the arithmetic is checkable by counting them. **Every pick is
CC0 and the attribution column is empty on every row**, so nothing here introduces a credits
obligation — the constraint the music shortlist met and this one had to keep.

## The 7 that already sound, so nothing below re-proposes them

| Event | Fires at | Sound |
| --- | --- | --- |
| A building is placed | `CitySurface.tsx:2007`, `:2089` | `place-building.ogg` |
| A road tile is laid | `CitySurface.tsx:2329` | `road-lay.ogg` |
| A road tile comes up | `CitySurface.tsx:2267`, `:2300` | `road-remove.ogg` |
| A building unlocks | `CitySurface.tsx:1498` | `building-unlocked.ogg` |
| A mastery star lands | `CitySurface.tsx:1652` | `mastery-star.ogg` |
| A building completes | `CitySurface.tsx:1643` | `city/chime.ts`, synthesized |
| A lesson answer is right | `widgetFeedback.tsx:415` | `lessons/lessonSound.ts`, synthesized |

**Plus one orphan: `purchase.ogg` has no production call site at this tip.** §3 recorded it firing
from `Shop.tsx:271`; #498 (merged 2026-08-03T22:02:16Z, `mergedAt` read) sunset the cosmetic shop and
deleted that file. The sample is still in the catalog (`soundEffects.ts:70`), and `playSfx` is now
imported by exactly one non-test file in the app. **Repointing it at the civic purchase is free and
is not what row 1 recommends** — it is `handleCoins.ogg`, and era one spends worked stone.

## The picks

| Event | Fires at | Pick — click to listen | Artist | Licence | Attrib. | What it actually is |
| --- | --- | --- | --- | --- | --- | --- |
| 1. Material spent on a civic purchase | `App.tsx:860` | [Gravel Drop 1](https://freesound.org/people/dichardson/sounds/570970/) | dichardson | CC0 1.0 | none | 0.68 s. Eight small stones landing dry on hard ground, 5–18 kHz, no low end |
| 2. A lesson answer is graded **wrong** | `widgetFeedback.tsx:421` | [G4 soft — kalimba](https://freesound.org/people/hollandm/sounds/691805/) | hollandm | CC0 1.0 | none | One soft plucked note, harmonics from 390 Hz, decaying over 1.8 s. Warm, not a buzzer |
| 3. A ceremony answer is missed, and it pauses | `eraCeremony.ts:415` | *the same note as row 2* | hollandm | CC0 1.0 | none | Same file. The two events are one sound |
| 4. Ceremony beat 1, `gathering` | `eraCeremony.ts:97` | [Medium-Sized Crowd Background Noise](https://freesound.org/people/deleted_user_5205523/sounds/340358/) | *(deleted account)* | CC0 1.0 | none | 4.3 s. Dense speech bed 200 Hz–3 kHz, no single voice on top, seamless end to end |
| 5. Citizens gather onto the island | `ceremonyCrowd.ts:349` | *the same bed as row 4* | *(deleted account)* | CC0 1.0 | none | Same file. One crowd serves the ceremony and the arrival |
| 6. Ceremony beat 2, `expansion` | `eraCeremony.ts:104` | [shoveling-dirt](https://freesound.org/people/JeffPearson/sounds/849840/) | JeffPearson | CC0 1.0 | none | 0.68 s. One shovel stroke into loose soil, 200 Hz–5 kHz, peaking at 0.29 s |
| 7. Ceremony beat 3, `rebuild` | `eraCeremony.ts:110` | [Outside Hammer](https://freesound.org/people/sgrowe/sounds/342542/) | sgrowe | CC0 1.0 | none | **Three** strikes at 0.05 / 0.49 / 0.92 s, outdoors, each a dry broadband transient |
| 8. Ceremony beat 4, `retheme` | `eraCeremony.ts:116` | **— none —** | — | — | — | — |
| 9. The era advance completes | `EraAdvanceCeremony.tsx:566` | [Bell at Daitokuji temple, Kyoto](https://freesound.org/people/shinephoenixstormcrow/sounds/337048/) | shinephoenixstormcrow | CC0 1.0 | none | 2.0 s. A struck bell: full-band attack, then a clean ring on 1.2 / 2.6 / 5 kHz over 1.9 s |
| 10. The crisis call arrives | `CrisisCallAdvisor.tsx:154` | `impactBell_heavy_002.ogg` — [Kenney Impact Sounds](https://kenney.nl/assets/impact-sounds) | Kenney | CC0 1.0 | none | 0.70 s. Zero-attack low bell strike, 348 Hz centre, 270 ms ring. Dark, not shrill |
| 11. A crisis action is committed | `HardWinterSurface.tsx:540`, `PlagueSurface.tsx:208` | `impactWood_heavy_000.ogg` — [Kenney Impact Sounds](https://kenney.nl/assets/impact-sounds) | Kenney | CC0 1.0 | none | 0.31 s. Zero-attack heavy timber thud, 73% of its energy under 120 Hz |
| 12. A crisis round returns its verdict | `HardWinterSurface.tsx:609` | *the correct chime already in the tree* | — | — | — | No sourcing owed. See §Deliberately silent for why not a fanfare |
| 13. A crisis round closes and the frost advances | `HardWinterSurface.tsx:617`, `hard-winter.ts:1245` | [Freezing HZA](https://freesound.org/people/hz37/sounds/396447/) | hz37 | CC0 1.0 | none | 3.4 s. Granular crackle bed, 1–6 kHz, sparse transients throughout. A surface freezing |
| 14. Hard Winter: a fire is lit | `hard-winter.ts:355` | [fire-whoosh](https://freesound.org/people/hnhnh/sounds/244926/) | hnhnh | CC0 1.0 | none | 3.9 s. Sharp ignition at 0.1 s into a broadband roar to 17 kHz with pops, tailing from 3.1 s |
| 15. Hard Winter: a building is frozen | `BuildingFrostCrust.tsx:43`, `hard-winter.ts:503` | [Ice Crack 1](https://freesound.org/people/j_p_higgins/sounds/262635/) | j_p_higgins | CC0 1.0 | none | 1.1 s. **Two** dry cracks at 0.17 and 0.56 s, full band to 20 kHz, almost no tail |
| 16. Hard Winter: the thaw | `winter/thaw.ts:75` | [Water Drip](https://freesound.org/people/spanrucker/sounds/466559/) | spanrucker | CC0 1.0 | none | 1.3 s. One clean drip: broadband splash, then a rising 400–800 Hz bloop, then silence |
| 17. A crisis concludes | `WinterConclusion.tsx:277` and three siblings | **— none —** | — | — | — | — |
| 18. Citizens depart | `city/departuresSfx.ts`, off `CitySurface.tsx`'s vitality | [Door Close Heavy Wooden Slow Quiet](https://freesound.org/people/LampEight/sounds/402466/) | LampEight | CC0 1.0 | none | 1.8 s. A heavy door swung slowly to: rub, soft contact at 0.65 s, low seal settling. Not slammed. **Measured: 85% of its energy is under 60 Hz and 57% under 20 Hz — see §Row 18** |
| ~~19. The Album opens~~ | ~~`CityAlbum.tsx:252`~~ | ~~`bookOpen.ogg` — Kenney RPG Audio~~ | — | — | — | ⚑ **RETIRED 2026-08-04. The lead cut the Album, so the event it names cannot happen.** `album-open.ogg` was deleted with it rather than left in the catalogue: `test/cityEventSfx.test.ts` fails on any sample nothing plays, which is what turned "delete the surface" into "delete the sound" without anybody having to remember |
| 20. Any panel opens | build menu, How to play, Achievements, vitality, lesson popup | **silent, deliberately** | — | — | — | §Deliberately silent. **No longer has an exception** |
| 21. A tab changes | `CitySurface.tsx:5961`, `:6492` | **silent, deliberately** | — | — | — | §Deliberately silent |
| 22. A building is under construction | `constructionStages.ts:389` | **silent, deliberately** | — | — | — | §Deliberately silent |

## Row 18, and the readiness signal that outlived what it was pointing at

**Row 18 is in the tree and wired.** #500
merged at **`2026-08-04T15:20:10Z`** (`mergedAt` read, merge commit `9ac484bd`), so citizens can
leave, and the sound fires from `apps/web/src/city/departuresSfx.ts` off the vitality reading in
`CitySurface.tsx`.

**What this paragraph used to say, and why it is worth a section rather than a quiet edit.** It read
*"Row 18 is not in the tree yet"*, and it gave its readiness signal as *`city-vitality.ts:61` reads
"NOBODY LEAVES HERE"*. Every clause of that pointer rotted, and **it went on matching anyway**:

- the **line** moved, and no replacement number is written here on purpose — the call that
  actually wires the feature shifted from 331 to 343 during the branch that wrote this
  paragraph, which is how long a line citation lasts in this file;
- the **deferral** it named is over, answered by `city-departures.ts` rather than waived;
- the **string** survives, as a QUOTATION of the retired paragraph inside a comment that says in as
  many words that the objection was answered.

So a reader who ran the grep this document told them to run got a hit, and concluded the opposite of
the truth. A pointer made of a path, a line number and a quoted string has three independent ways to
go stale, and this one managed all three at once while still reporting green.

**The replacement is a behaviour and a test, not a better string.** Departures are wired exactly when
`deriveCityVitality` reports somebody leaving for a city that has earned it — which is what
`test/departuresAreWired.test.ts` asserts, by deriving an unhappy era-one city and reading
`departures.leaving` off the shipped call. Nothing in that can be satisfied by a comment. The three
structural facts behind it, for a reader who wants them, are that `deriveDepartures` is called by
`deriveCityVitality`, that `departures` is a required field of `CityVitality`, and that
`city-departures.ts` is exported from the package index; all three are asserted by importing and
running them rather than by matching source, so none of them carries a line number to lose.

**The pick was verified against this row's own description before it shipped, and the row was
incomplete in the way row 14's was.** The prose here is right about the shape — 1.79 s, the loudest
10 ms frame at t=0.66 s against *"soft contact at 0.65 s"*, and 610 ms from onset to that peak, so
genuinely *"not slammed"*. It says nothing about where the energy is, and **85% of it is below 60 Hz
with 57% below 20 Hz, which is beneath hearing**; the spectral centre is 42 Hz and there is nothing
above 12 kHz. Through a 200 Hz high-pass, roughly what a laptop speaker passes, the published file
loses **12.3 dB of peak**. It would have shipped as silence. `public/audio/CREDITS.md` records the
treatment that fixed it and the measurement either side.

## Where era matters, and where it does not

**Twelve of the fourteen distinct sounds are era-neutral by their own physics and need no variant at
all.** A crowd murmuring, soil turned, ice cracking, water dripping, a fire catching, a bell struck, a
door swung to, a plucked note and a book opening are the same events in `prehistoric` and in
`cyberpunk`. Era is carried by the music brief's tone ladder; nothing here should carry it twice.

**Two rungs, not ten, and only for the two that name a material** — row 7's hammer and row 11's timber
thud, joined by the building-completion beat that already chimes. Those really are timber and thatch
early and iron late, and **that costs no extra sourcing**:
[Kenney Impact Sounds](https://kenney.nl/assets/impact-sounds) is one CC0 download that already holds
the ladder, measured here rather than assumed.

| Rung | File | Measured |
| --- | --- | --- |
| Timber, `prehistoric`–`renaissance` | `impactWood_medium_000.ogg` | 0.33 s, centre 218 Hz, 92% of its energy in 120–400 Hz |
| Timber, heavier | `impactPlank_medium_000.ogg` | 0.78 s, centre 138 Hz, 59% under 120 Hz |
| Stone and pick | `impactMining_000.ogg` | 0.94 s, centre 168 Hz, 429 ms decay — a low strike with metal partials ringing at 5.5 and 7.5 kHz |
| Iron, `industrial`–`cyberpunk` | `impactMetal_medium_000.ogg` | 0.27 s, centre 1233 Hz, 84% in 400–1200 Hz |
| Iron, heavy plate | `impactPlate_heavy_000.ogg` | 0.49 s, centre 74 Hz, 279 ms decay |

So the era variation is a **choice of filename inside a pack already on disk**, not a second sourcing
job. Two rungs is the recommendation; five are there if the split ever earns it.

## Deliberately silent, which is a refusal and not a gap

**A game that clicks at every interaction is worse than one that is quiet.**

- **Every tab and every panel (rows 20, 21).** Two tablists — the era rail
  (`CitySurface.tsx:5961`) and the build categories (`:6492`) — plus the build menu, the lesson popup,
  How to play, Achievements and the vitality panel. A tab change tells the ear nothing the eye already
  has, and it is the interaction a learner performs most often.
  > **⚑ THE ONE EXCEPTION IS GONE, 2026-08-04.** This read *"the Album is the one exception, because
  > it is the only panel that is a place rather than a control: it is opened to look back at cities
  > that no longer exist."* The lead cut the Album, so **no panel in the game speaks when it opens**
  > and the refusal is now total. Worth reading before anybody re-adds one: the exception was argued
  > from the surface being a *place*, and the archipelago's revisited island is a place in a much
  > stronger sense than a panel of small plans ever was. That is an argument for a sound when stage 3
  > lands, not for restoring this one.
- **A building mid-construction (row 22).** §3 already recommends against a loop and the reason holds:
  it is *"the sound most likely to become irritating on the hundredth repetition"*, the standard
  `soundEffects.ts:52-56` sets. Not searched for.
- **A crisis round's verdict (row 12).** The correct chime exists, and a per-tier fanfare would make a
  graded outcome loud, which `Game_Visual_Design_Brief.md:72-73` refuses: *"Celebration amplitude
  stays low and earned."*
- **Applause anywhere.** [Small applause](https://freesound.org/people/Breviceps/sounds/462362/)
  (Breviceps, CC0) is a good 4.5 s recording of fifteen dry claps with no voices, **rejected on the
  brief rather than on quality**: applause frames a survived crisis as a reward.

## Notes, where a row needs one

- **Row 8, `retheme`, is genuinely empty and should be generated.** *"The ground, the water, what
  grows and the roads between. All of it turns now."* is a transformation with no physical referent,
  so the search term is not a specification and there was nothing to search *for*. Everything examined
  ([sweep.wav](https://freesound.org/people/reathance/sounds/503815/),
  [cloth flap](https://freesound.org/people/ssierra1202/sounds/391945/)) is a whoosh standing in for a
  meaning. **A generated long shimmer is the right answer.**
- **Row 17 is empty for that reason and one more.** There are four conclusions
  (`WinterConclusion.tsx:277`, `PlagueConclusion.tsx:46`, `SuccessionConclusion.tsx:41`,
  `IntrusionConclusion.tsx:51`) and a verdict has two directions. One sample cannot say both *held*
  and *lost* without becoming a grade.
- **Rows 4 and 5: the crowd's uploader account is deleted.** Durable in law — CC0 is irrevocable — and
  fragile as a link, so **download it before relying on it.** Second choice is
  [R08-32-Men and Women Talking](https://freesound.org/people/craigsmith/sounds/486181/) (craigsmith,
  CC0, 5.8 s), *not* recommended because individual words are audible and this game has no speech.
- **Row 7 is three strikes and row 15 is two cracks**, so both need one cut out; and rows 13 and 14
  run 3.4 s and 3.9 s, so the fire wants its first second and the frost wants cutting to the round
  transition's own length. Named because a lead auditioning them will hear a shape nobody asked for.
- **Row 9 is a derivative and its parent was checked rather than assumed.** The file is
  `131348__kaonaya__…_modified`; the parent is
  [Bell at Daitokuji temple, kyoto.wav](https://freesound.org/people/nahmandub/sounds/131348/) and
  **its own page reports CC0**, so the chain is clean. It is a specific instrument from a specific
  culture, worth one glance if era one's no-named-cultures rule is ever read as binding on sound as
  well as on music.
- **Three rejections worth recording, because each is a case where the title and the file disagree.**
  [Subzero Frost Loop](https://freesound.org/people/qubodup/sounds/844260/) (qubodup) measures as
  uniform broadband hiss and does not say *cold* unless something else says it first.
  [Wax seal](https://freesound.org/people/Cerise_Virtuelle/sounds/759526/) (Cerise_Virtuelle) was the
  obvious row 11 and carries −80 dBFS hiss across the whole band, besides not existing before the
  medieval era. [Deep Bell -Loop](https://freesound.org/people/tarane468/sounds/353911/) (tarane468)
  is titled as a bell and measures as a **drone** — partials at 110 / 220 / 330 Hz, no attack anywhere
  in 3.5 s. All three are CC0; none is what its name says.

## Verification

**Links: 28 checked, 24 resolved, 4 dead.** The 24 are the 21 this document links plus the CC0 deed
and the two Kenney ZIP URLs it quotes. **All four dead ones are deliberate controls and none is
cited**, because a checker that only ever answers 200 has proved nothing: a non-existent sound id, a
stale Kenney ZIP hash, a Freesound `/download/` URL, and the crowd bed's truncated author slug. **The
last two are the ones that matter.** A `/download/` URL returns **200 while redirecting to
`/home/login/`**, so status code alone calls it alive. And the truncated slug is not hypothetical: it
is the URL this pass first wrote down. Freesound's own search page renders `deleted_user_5205523` as
`deleted_user_52055`, that form 404s, and it would have shipped broken.

**Licences were read per asset, not carried forward.** **24 Freesound pages had their `License(s)`
field read on the page itself, and all 24 return `creativecommons.org/publicdomain/zero/1.0/` and
nothing else** — no CC-BY, no NonCommercial, no Sampling+, none multi-licensed. That covers the 19
this document links plus five examined and dropped. The Kenney licences are the `License.txt` bundled
inside each ZIP: *"License: (Creative Commons Zero, CC0) … Support us by crediting Kenney or
www.kenney.nl (this is not mandatory)"*. **So the attribution column is empty on every row** and
shipping any of it needs no credits screen — which is what the three CC-BY music rows would cost.

**Every file was opened, not merely linked: 42 of them**, 24 Freesound previews and 18 from the two
Kenney ZIPs. All 42 decoded to a parsable stream and **none is silence** — the quietest measured
anywhere peaks at −38.4 dBFS, and the quietest *recommended* file is `bookOpen.ogg` at −10.5. All 42
got a spectrogram and waveform, and **26 of those were looked at: all 19 files recommended anywhere
in this document, plus 7 examined and dropped.** That is where *"titled a bell, measures as a drone"*
and *"three strikes, not one"* came from, and neither is visible in a tag.

**Acquisition friction, measured.** Kenney ZIPs download with no account; **Freesound originals do
not**, which is what the third control demonstrates. What is publicly fetchable is the CDN preview
MP3, and that is what was probed, so **every duration and level above is the preview's** — the WAV
behind it needs a free account and may differ in level. Kenney's impacts measure at **+2 dBFS peak**,
which is why `soundEffects.ts` carries a per-sample `trim` and why every new row needs one.

**Not checked: whether any of it sounds right.** A spectrogram settles *what a file is*. Whether a
0.31 s timber thud reads as *decided* rather than *dropped*, and whether one crowd bed can play under
both a ceremony beat and a citizen arrival, are ear tests and remain unrun.

**`format:check` and `lint` are vacuous here and are not reported as a pass.** Biome says so itself
rather than being taken on trust: `npx biome check` over the one file this branch adds reports
**`Checked 0 files`** and `× No files were processed in the specified paths`, listing it as *"provided
but ignored"*. There is no Markdown handler, so the run measures nothing. No production code changed,
so no test could pass or fail on account of this document.

## Still owed

**As of 2026-08-03, which is what this table counts.** The sixteen candidates below have all been
acquired and wired since — fifteen by #523 and row 18 by the pull request that added §Row 18 — so
the *"Assets to acquire"* row is a record of what the sourcing found rather than a queue. **The
last row is the only one still live**, along with rows 8 and 17, which nothing has generated.

| | |
| --- | --- |
| Events found | **29** — 7 sounding, 22 silent |
| Silent events with a verified candidate | **16**, from **14** distinct sounds |
| Silent events covered by an asset already in the tree | **1** — the crisis round's verdict |
| Silent events deliberately left silent | **3** — every other panel, every tab, the construction loop |
| Rows still owed a sound | **2** — row 8 `retheme` and row 17 the crisis conclusion, both to generate |
| Assets to acquire | **11** Freesound files (free account needed) plus **3** files from **2** Kenney ZIPs (no account) |
| Blocked on nothing | every row above. No decision gates a download |
| Decisions the lead owes | ~~is the Album the one panel that speaks~~ **answered 2026-08-04 by cutting the Album, so no panel does**; two material rungs or five; do the four crisis conclusions share one sound or stay silent |
