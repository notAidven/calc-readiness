# Era and crisis music: a shortlist for audition

**Date:** 2026-08-02
**Status:** shortlist. **Nothing was acquired, nothing was downloaded into the repository, and no
audio file is added by this change.** Candidate files were fetched to `/tmp` to be measured and
were not kept.
**Measured at:** `integration` `a71b25ce`. Every candidate measurement was taken on 2026-08-02
from the URL in its own row.
**Reads under:** `2026-08-01-era-and-crisis-music-brief.md`, treated as binding and not amended
here. Its sections are cited as §1, §2, §4 and so on.
**Audience:** the lead. **He is judging whether each candidate matches the theme and sounds good.
This document judges compliance with the brief, which is a different job**, and it says so at every
row where the two could be confused.

---

## 0. The fourteen slots, and the one thing this document cannot do

`apps/web/src/audio/eraMusic.ts` derives a slot per era and a slot per crisis; fourteen of them are
genuinely owed a track (`:344-359`, and `CREDITS.md:38-42` for the ids). Ten eras plus the four
crises in scope, which are eras 1, 4, 6 and 9 (`eraMusic.ts:207-256`):

| # | Slot id | Owed for |
| --- | --- | --- |
| 1 | `era-prehistoric` | Era 1 |
| 2 | `era-neolithic` | Era 2 |
| 3 | `era-bronze_age` | Era 3 |
| 4 | `era-classical` | Era 4 |
| 5 | `era-medieval` | Era 5 |
| 6 | `era-renaissance` | Era 6 |
| 7 | `era-industrial` | Era 7 |
| 8 | `era-atomic_age` | Era 8 |
| 9 | `era-information_age` | Era 9 |
| 10 | `era-cyberpunk` | Era 10 |
| 11 | `crisis-prehistoric` | The Hard Winter |
| 12 | `crisis-classical` | The Succession Crisis |
| 13 | `crisis-renaissance` | The Plague |
| 14 | `crisis-information_age` | The Intrusion |

**Result up front: candidates are proposed for 13 of the 14. The single named gap is
`era-neolithic`**, which is the slot §6.5 predicted would fail the open-source route, and §6 of this
document says what to generate instead.

**And the one thing this document cannot do.** I did not listen to a single candidate. §2's own
check is *"play the candidate ten times through with the tab in the background... if you can name
the moment you are waiting for, the track fails"*, and the brief is right that this is the property
that matters most and the only test that catches §2 property 1. **It cannot be mechanised and this
pass did not attempt it.** Every row below therefore carries a compliance argument and a set of
measurements, and none of them is an audition.

**How to read the evidence labels**, which appear on every claim that matters:

- **Measured** means I ran it on the file at that URL on 2026-08-02. The method is §1 below.
- **Quoted** means the author or the catalogue says so. Useful, and not verified by me.
- **Unverified** means it needs the lead's ear, and I say which question his ear has to answer.

---

## 1. What was measured, why each number is in the brief, and how the instruments were checked

Every figure below maps onto a clause, so a row can be checked against the brief rather than
against taste.

| Figure | The clause it answers |
| --- | --- |
| Duration | §2 property 3, *"aim above 90 seconds"*, plus each era's own **Length and loop** line |
| LRA, in LU | §2 property 4, *"a narrow dynamic range"*. Loudness range is the direct measurement of it |
| Integrated LUFS | §1.1 item 6, a crisis loop that is **louder** than the era loop it replaced |
| Tempo estimate | §4.0's band, *"roughly 60 to 100 beats per minute"*, and §5.2's crisis *"under 60"* |
| Repeat peak and its lag | §4 era 1, *"nothing repeats identically"*, against §4 era 2, *"nothing but repeating bars"* |
| Head and tail levels, fade over the last 4 s, leading silence | §2 property 5, the seam as **a file property and not a taste** |

**The instruments were checked before they were used, because a measurement nobody calibrated is
worth about as much as a guess.**

- **Duration** was validated against the committed record: `town-theme.mp3` measures 97.5 s and
  `a-new-town.mp3` 62.3 s, matching the 1:37 and 1:02 in `CREDITS.md:28-29`.
- **The licence reader** was validated in both directions, which matters more than it sounds,
  because a checker that always answers CC0 proves nothing. It returns `CC0` for the three assets
  `CREDITS.md` already logs as CC0 (`town-theme-rpg`, `a-new-town-rpg-theme`, `magic-town`) and
  `OGA-BY 3.0 + CC0` for "Feel good island", which is exactly the multi-licensed field that got
  that asset rejected at `CREDITS.md:13-17`. It reads the structured `License(s)` field on the
  asset's own page, per asset, which is the method that file requires.
- **The tempo estimator** was validated against synthetic click tracks at known tempo: 60, 72, 88
  and 100 bpm came back as 60.1, 71.8, 87.6 and 99.4. It also agrees with two authors who state a
  tempo: Incompetech's catalogue says 94 bpm for "Mandatory Overtime" and 78 for "Northern Glade",
  and the estimator returned 94.0 and 79.5.
- **The repeat measure** was validated against two synthetic controls of identical density: one
  identical bar repeated thirty times scores **0.972**, thirty bars that never repeat score
  **0.316**. The two shipped tracks sit at 0.505 and 0.455.

**One honest limit on the repeat measure, because it changes how a row should be read.** The number
is the highest self-similarity over musical spacings, and the lag it was found at is reported with
it. **A peak at a multi-second lag means a repeating bar or phrase** (Tribal, 0.628 at 4.8 s). **A
peak at the 0.46 s floor means only that the texture barely changes from moment to moment**, which
is what a sustained pad does and is not evidence of a repeating bar at all. Read the lag, not just
the number.

**The calibration baseline, which is what "narrow" and "quiet" mean in this repository.** Measured
on the two files in `apps/web/public/audio/music/`:

| File | Length | LUFS | LRA | Head 1 s | Tail 1 s | Last 100 ms |
| --- | --- | --- | --- | --- | --- | --- |
| `town-theme.mp3` (the house track) | 97.5 s | -13.0 | 4.1 | -18.3 dBFS | -24.2 dBFS | silent |
| `a-new-town.mp3` | 62.3 s | -15.6 | 4.5 | -16.6 dBFS | -47.7 dBFS | silent |

**Both shipped files end in digital silence, and the default also begins with 0.11 s of it.** That
is §2 property 5's warning about mp3 encoder delay and padding, measured in the tree: the house
track's loop is not a click, it is a short gap once per pass, and `a-new-town` additionally fades
16 dB over its last four seconds. **So the seam standard the shortlist is being held to is one the
shipped default does not meet**, which is worth knowing before a candidate is rejected for it.

---

## 2. Three findings that belong to whole sources rather than to rows

**Finding 1: 25 of the 26 Incompetech tracks measured end in a fade or in silence, and the one
exception fails the seam a different way.** The catalogue is production music written for video, not
game loops, so the fade is a property of the source rather than bad luck in my sample. Measured
examples: "Brittle Rille" drops 83.9 dB over its last four seconds, "Angevin" 74.2 dB, "Organic
Meditations One" 71.7 dB, "Cool Vibes" 69.7 dB, "Virtutes Instrumenti" 50.7 dB, and "Vibing Over
Venus", "Canon in D Major", "I Knew a Guy" and "Weight of Responsibility" simply end in silence.
**The exception is "That Zen Moment", which does not fade at all and instead sits 16 dB louder at its
tail than at its head**, so it needs a level match rather than a trim.
Several also carry leading silence to trim: "Light Awash" 6.1 s, "Tranquility" 4.1 s, "Weight of
Responsibility" 3.7 s, "Concentration" 2.1 s. **So every Kevin MacLeod candidate in this document
costs a loop edit on top of its licence obligation**, and that is stated once here rather than
argued again in each row.

**Finding 2: on OpenGameArt, the tracks that measure clean at the seam are very nearly the ones
that ship a dedicated loop file.** Measured clean, meaning no fade over the last four seconds and
head and tail within a few dB: `Loop_The_Old_Tower_Inn.wav`, `Loop_Market_Day.mp3`,
`sideways_city_loop.wav`, `empacotatron_loop.ogg`, `hush_hamlet_loop.wav`, plus a handful of
authors who trimmed the only file they published (Contemplation, Dark City, Cyberpunk Beauty,
Krakatoa, `greek instruments.ogg`, GrassLands Theme). **The practical rule for the search is
therefore to look for a `_loop` variant first**, because it is the cheapest available proxy for the
property §2 puts hardest to check.

**Finding 3: the size problem in §6.3 is real and it is not only mp3 bitrate.** Measured file sizes
among the candidates below run from 2.2 MB to 57.4 MB against the shipped default's 1,316,581 B, and
several are WAV or FLAC only, so **re-encoding is part of acquisition for nearly every row**. CC0
permits it silently. CC-BY does not: see §3 of this document for the one clause that bites.

---

## 3. The brief and the shipped player disagree about the crisis entry, and it changes what to buy

**§5.2's entry rule and the shipped player disagree, and the player won.** The brief: the crisis
track *"must cross-fade in rather than cut... A hard music cut is a startle event (section 1.1 item
4) delivered at the exact moment the crisis announces itself"*. The player, deliberately and with
its reasons written down: *"A crisis beginning: a hard cut, and the most defensible one in the
game"* (`apps/web/src/audio/music.ts:36-47`), and the module lists the two costs of a crossfade
that ruled it out. **This is not mine to resolve and I am not proposing that either side move.**

**It changes what to buy, though, and that is why it is here.** If the crisis arrives on a hard
cut, then the first moment of the crisis file is the startle risk, and that is a **shoppable,
measurable property**: prefer a crisis track whose opening second is quiet, because a soft entry is
the only defence against §1.1 item 4 that acquisition can supply. Measured first-second levels are
given for every crisis candidate below. Contemplation opens at -31.4 dBFS over its first second and
-83.1 dBFS over its first 100 ms, which is about as soft an entry as a file can have; "Frost in the
Northern Winter" opens at -24.7 dBFS with no lead-in at all.

---

## 4. §5 is still open, the code holds both readings, and candidates are given both ways

**Still open, and here is why that is a finding rather than an assumption.** §5.1 *recommends one
shared crisis track* and rules four out with reasons. The shipped code assumes the opposite:
*"Assumed: one per crisis, because the lead's sentence pairs crises with eras and the eras are
one-to-one"* (`eraMusic.ts:64-73`). The same comment then records that the cheaper reading needs no
change of shape: register one track in `MUSIC_TRACKS` and point the four rows' `standIn` at it.
**So the decision is genuinely unmade, it is cheap either way, and this document does not make it.**

**What each reading costs at acquisition, measured rather than argued:**

| Reading | Acquisitions | The constraint it imposes |
| --- | --- | --- |
| **One shared track** (§5.1's recommendation) | 1 | It must be **period-neutral**, because it plays under era one's percussion, era four's plucked strings, era six's consort and era nine's pads. That is the narrowing §5.1 warns about and it is the real cost |
| **One per crisis** (the code's assumption) | 4 | Each may take its era's colour, so the search is easier per track and four times as long. §5.1 rules this out; §7.2 also puts only the Hard Winter in stage one, so three of the four would be bought for eras with no land |

**Both are shortlisted below**, and the shared-track candidates are held to the period-neutrality
test while the per-crisis ones are not.

---

## 5. The shortlist, in §7's acquisition order

### Stage 0. §7.1's free question, and what I can and cannot settle

**§7.1 asks whether `town-theme.mp3` and `a-new-town.mp3` are really era five's and era six's
rather than era one's. I cannot settle it, because settling it requires listening.** What I can add
is that both are by cynicmusic, and that the author's own description of the house track is
*"Typical harps and recorders fare perfect for your RPG"* (quoted, from the asset page). **Harps and
recorders are era four's and era five's instrument lists, and era one's guide bans metal outright**,
so the question §7.1 poses is a live one and an hour of listening still stands to remove up to two
acquisitions from the fourteen.

**One correction to the brief's §0a, which was written before the selection code landed.** §0a says
the Hard Winter runs with the town theme underneath it *"because nothing switches"*. Switching now
exists. The winter still plays the town theme, but for a different and deliberate reason: an
unacquired crisis slot resolves to `ERA_STAND_IN`, which is *"whatever the era is playing"*
(`eraMusic.ts:117-119`, `:311-323`), and era one is itself standing in on the house track. **§7.2's
argument that the crisis track is the one whose absence is an active error survives the correction
unchanged**; only the mechanism is different.

---

### Stage 1, slot 1 of 14: the crisis track, shared reading

**The brief's entry.** §5.2 wants *"the same world with most of the parts taken out of it: slower,
lower, fewer, and still completely at rest harmonically"*, a low sustained bed with no identifiable
instrument, no percussion with a pulse, no countable pulse or one under 60, 120 to 240 seconds, and
period-neutral by requirement.

#### Candidate 1A. Contemplation, by Joth

- **Where:** <https://opengameart.org/content/contemplation-0>
- **Licence:** **CC0 1.0**, verified by reading the `License(s)` field on the asset page on
  2026-08-02. **No attribution obligation.** `CREDITS.md` records the author anyway, as it does for
  every CC0 row.
- **Why it complies.** The author's own description is *"No real melody or focus here, just
  ambience"* (quoted), which is §2 property 2's *texture over tune* stated by the person who made
  it, and property 1's *nothing may be an event* as far as a description can go. Measured, it is
  **13.8 LU quieter than the house track** (-26.8 LUFS against -13.0), which satisfies §1.1 item 6
  in the direction the brief cares about, and its self-similarity peak sits at the 0.46 s floor,
  meaning a slowly varying bed rather than a repeating bar. Its opening 100 ms measures -83.1 dBFS,
  so it survives the hard-cut entry in §3 above.
- **Length and loop.** 2:00 (120.1 s), which is the bottom of §5.2's 120 to 240 band. **Measured:
  no fade at all** (0.1 dB change over the last four seconds), head and tail within 3.5 dB
  (-31.4 and -27.9 dBFS), no trailing silence. **It needs no seam edit, and it is the only crisis
  candidate here that does not.** 2.4 MB at 160 kbps mp3, so a re-encode is optional rather than
  forced.
- **What the lead's ear has to decide (unverified).** Whether it is period-neutral. §5.1's whole
  cost is that one track sits under four eras, and "ambient" in a title tells you nothing about
  whether a listener can date the timbre. This is the question to hold it to.

#### Candidate 1B. Organic Meditations One, by Kevin MacLeod

- **Where:** <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Organic%20Meditations%20One.mp3>
  (catalogue entry via <https://incompetech.com/music/royalty-free/music.html>, ISRC USUAN1100760)
- **Licence:** **CC-BY 4.0.** Not public domain: the site's own FAQ answers *"Is this music
  Copyright Free? No. All of this music is copyrighted"* (read 2026-08-02). Attribution is the
  block Incompetech's own licence generator emits, and it must be reproduced in this shape:

  > "Organic Meditations One"
  > Kevin MacLeod (incompetech.com)
  > Licensed under Creative Commons: By Attribution 4.0
  > http://creativecommons.org/licenses/by/4.0/

  **Plus the clause §6.1 warns will be missed:** CC-BY 4.0 requires indicating that changes were
  made, and this track needs a loop trim and a re-encode, so `CREDITS.md` has to say so. MacLeod's
  FAQ separately grants the edit and waives his own notice for it (*"you can sing over, chop,
  splice, compress, lengthen... There is no need to mention if you cut and splice"*, quoted), which
  is generous but is not the licence text, so record the change anyway.
- **Why it complies.** Catalogue instruments are Strings, Bells, Percussion with **no tempo
  recorded**, which is §5.2's *"ideally no countable pulse at all"*, and a slow struck tone with a
  long decay over a sustained bed is that entry's instrument list almost verbatim. **Measured LRA
  3.6**, which is narrower than the house track's 4.1 and the strongest §2 property 4 reading among
  the crisis candidates. The author's description names its key, *"very calming piece in D Flat
  major"* (quoted), which matters for §7.5: it hands you the pitch centre to make a search criterion
  for the ten era tracks.
- **Length and loop.** 16:28 measured, so §2 property 3 is satisfied many times over and a learner
  would meet the seam roughly once a study session. **Needs an edit:** measured 1.29 s of leading
  silence and a 71.7 dB fade at the end. **Extra work, and it is the same edit every Incompetech row
  needs.** 39.5 MB at 320 kbps, so a re-encode is mandatory.
- **What the lead's ear has to decide (unverified).** Whether bells read as period-marking. §4 era 3
  reserves struck metal as its own signature, so a bell in the shared crisis track spends era three's
  idea in a track that plays under era one.

#### Candidate 1C. New Direction, by Kevin MacLeod

- **Where:** <https://incompetech.com/music/royalty-free/mp3-royaltyfree/New%20Direction.mp3>
  (ISRC USUAN1100677)
- **Licence:** **CC-BY 4.0**, same attribution block and same indicate-changes obligation as 1B.
- **Why it complies.** Catalogue instruments are **Synths, and nothing else**, with no tempo
  recorded. That is the most direct available answer to §5.2's *"a low sustained bed with no
  identifiable instrument in it"* and to the period-neutrality requirement that §5.1 says is the
  real cost of the shared reading: a plain synth bed cannot be dated by a listener, which is exactly
  why it can sit under all four eras.
- **Length and loop.** 11:19 measured. **Needs an edit:** 23.4 dB fade over the last four seconds
  and 0.11 s of leading silence. 27.2 MB, re-encode mandatory.
- **The objection to weigh, and it is mine rather than the lead's.** **Measured LRA 10.6**, which is
  two and a half times the house track's 4.1 and the widest loudness range of the three shared
  candidates. §2 property 4 wants no quiet passage followed by a loud one, and a 10.6 LU range over
  eleven minutes says there is one. **If that is audible at background level, it fails property 4 and
  the length does not compensate.**

**Also verified and available, not shortlisted:** "Drone in D" (CC-BY 4.0,
<https://incompetech.com/music/royalty-free/mp3-royaltyfree/Drone%20in%20D.mp3>, 21:22 measured,
LRA 5.9). **It is the one candidate that answers §7.5 by name**, since the pitch centre is in the
title, and §7.5 asks for exactly that decision before any era track is bought. It is held back
rather than shortlisted because the author's description is *"mostly a piano impromptu over a simple
drone"* (quoted): a piano is datable to era seven at the earliest, and an impromptu is an improvised
melodic line, so it is doubly wrong for a period-neutral bed that must not carry a tune. **If the
crisis splits at era one, it becomes a serious candidate for the other three.**

---

### Stage 1, slots 11 to 14: the crisis, four-track reading

Offered because §4 of this document leaves the question open. Every licence below was verified per
asset on 2026-08-02.

**`crisis-prehistoric`, the Hard Winter.** The brief's own slot text asks for *"cold, thin and
still: the frost takes the island a step at a time and nothing about it is a chase"*
(`eraMusic.ts:208-215`).

- **Winter Reflections, Kevin MacLeod. CC-BY 4.0.**
  <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Winter%20Reflections.mp3> (ISRC
  USUAN1100580). Synths only, no tempo recorded, and the author's note is that it was *"rendered on
  3 iPhones using the Bloom, Bebot, and Balls applications"* (quoted), which means generative
  material with no performance in it: no player to hear, therefore nothing to anticipate, which is
  §2 property 1 by construction. **2:22 measured (142.1 s), inside §5.2's band.** Needs an edit:
  26.3 dB fade. LRA 9.0 is the objection to weigh against §2 property 4.
- **Long Winter, Indieteur. CC0 1.0.** <https://opengameart.org/content/long-winter>. Quoted as
  *"an Ambient Instrumental Music suitable for sad winter-y kind of games"*. Measured 3:56, LUFS
  -15.0, **LRA 5.5**, and no end fade at all (0.1 dB over the last four seconds). **Needs one
  specific edit and it is worth naming: 3.02 s of leading silence, with the first second at -83.7
  dBFS.** Under a native `element.loop` that is a three-second hole once per pass, which is a
  larger version of the defect already measured in the house track.
- **Not proposed: Frost in the Northern Winter** (CC0, and §6.3 lists it). Measured **LRA 14.5**,
  the widest in this document, and the author's own genre is *"symphonic dark ambient / gothic"*
  (quoted). §1 is the ruling every entry is written under and gothic dark ambient is the register it
  exists to refuse. **Excluded on §1 and §2 property 4, not on licence.**

**`crisis-classical`, the Succession Crisis.** §1.3 records that this is *"the only one of the four
whose key goes UP"*, a hard white noon, and that *"nothing is wrong with the sky; something is wrong
with who is in charge"*.

- **Weight of Responsibility, Kevin MacLeod. CC-BY 4.0.**
  <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Weight%20of%20Responsibility.mp3>
  (ISRC USUAN1100014). Catalogue instruments: Horn, Trombone, Tuba, Trumpet, Cello, Viola, with
  **no tempo recorded** and the description *"Deliberate chorale sounding, free conducted. Evocative
  of a sense of nobility and weariness. Loopable."* (quoted). **A room of people deciding, and
  nothing destroyed: this is the closest thematic match in the whole search to a named crisis.**
  2:14 measured (134.9 s), inside §5.2's band. Needs an edit despite the author's "loopable": measured
  3.68 s of leading silence and silence at both ends. LRA 9.6 is the objection.
- **Organic Meditations Two, Kevin MacLeod. CC-BY 4.0.**
  <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Organic%20Meditations%20Two.mp3>
  (ISRC USUAN1100758). Tuba, French Horns, Marimba, no tempo, *"very calming piece in D Flat
  major"* (quoted). Measured
  **LRA 2.6, the narrowest reading in this document**, and LUFS -29.0, which is 16 LU below the
  house track. 15:55. Needs the usual edit: 1.58 s lead silence, 52.2 dB end fade.

**`crisis-renaissance`, the Plague.** §1.3: *"do not make it gloomy... Pale, even and empty is more
unsettling than dark"*, and the scene is the stillest of the four.

- **EmptyCity: Background Music, yd. CC0 1.0.**
  <https://opengameart.org/content/emptycity-background-music>. §6.3 already lists it and the reason
  holds: *"empty"* is era six's own word for its crisis. Measured 1:40 (100.0 s), LUFS -29.7,
  LRA 6.9. **Needs an edit, and the author's claim is contradicted by measurement:** the description
  says *"Dark soundtrack, loopable"* (quoted) but the file drops 20.1 dB over its last four seconds
  and ends at -70 dBFS. Also 20 s short of §5.2's band.
- **Wisps of Whorls, Kevin MacLeod. CC-BY 4.0.**
  <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Wisps%20of%20Whorls.mp3> (ISRC
  USUAN1200082). Electric piano and synths, no tempo, and the description is *"about as calming as
  you can get and still have some sound"* (quoted), which is a fair paraphrase of pale, even and
  empty. 14:16 measured, LRA 6.5. Needs a substantial edit: 1.42 s lead silence and a 47.6 dB fade.

**`crisis-information_age`, the Intrusion.** §1.3 warns that night is *"the trap in this preset"*,
and the slot text asks for *"low, watchful, electronic, and the only one of the four that may be
nearly beatless"* (`eraMusic.ts:246-251`).

- **New Direction** and **Tranquility**, both Kevin MacLeod, both **CC-BY 4.0**. New Direction as in
  candidate 1C. Tranquility:
  <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Tranquility.mp3>, synths only, no
  tempo, 16:27 measured, LRA 7.2, *"rendered on 4 iPhones"* (quoted). Both are beatless electronic
  beds, which is the slot's own request.
- **A caution about the slot text rather than about a candidate.** "Watchful" is a threat register:
  something is watching. §1.1 item 2 rules out the film language of *something is coming*, and §1.4
  says the instinct to add tension is the defect the brief exists to prevent. **Whichever track is
  chosen here, it should be auditioned against §1 and not against the word "watchful".**

---

### Stage 1, slot 2 of 14: `era-prehistoric`

**The brief's entry.** §4 era 1: *"several people making a sound together who have never agreed on a
grid, in a room with one fire in it"*. Signature move: **nothing repeats identically**, because era
one is the era before the mould. 60 to 72 bpm and deliberately not locked. 90 to 150 s. No metal, no
drone synthesiser, no melody you could whistle back, and no instrument that names a specific living
culture.

**This is the entry I expected to be unshoppable and it turned out to be the most measurable one in
the brief**, because "nothing repeats identically" is a property of the file. The controls put an
identically repeated bar at 0.972 and a never-repeating one at 0.316, so a candidate's repeat figure
is a direct reading on era one's signature move.

#### Candidate 2A. Ras Quarry, by Bobjt

- **Where:** <https://opengameart.org/content/ras-quarry> (file `ras_quarry.mp3`)
- **Licence:** **CC0 1.0**, verified on the asset page 2026-08-02. No obligation.
- **Why it complies.** **Measured repeat 0.406, the lowest of any era one candidate and close to the
  never-repeats control at 0.316.** That is era one's signature move measured rather than assumed,
  and it is the axis on which the obvious candidate below is weaker. Measured tempo puts its
  strongest in-band period at 71.8 bpm, the top of §4 era 1's 60 to 72. LRA 5.1. The author dedicates
  it *"to prehistoric ancient technological human civilization"* (quoted).
- **Length and loop.** 2:42 (162.6 s), above §4 era 1's 90 to 150 window rather than inside it,
  which is a surplus rather than a defect given §2 property 3. **Needs an edit:** 9.5 dB fade over
  the last four seconds. 3.3 MB at 160 kbps.
- **What the lead's ear has to decide (unverified).** The submission also ships `ras_quarry_piano.mp3`,
  so the main mix may contain a piano, which era one cannot have. **Listen for keyboard.**

#### Candidate 2B. Tribal, by Of Far Different Nature

- **Where:** <https://opengameart.org/content/tribal>
- **Licence:** **CC0 1.0**, verified on the asset page. Note for the record that this artist's
  itch.io catalogue is CC-BY 4.0 for the same material, which is the two-licences-one-artist trap
  §6.2 names; **the CC0 grant is the one on this page and this URL is the provenance to record.**
- **Why it complies, and where it does not.** Measured **LRA 2.7**, the narrowest of the era one
  candidates, and a strongest period of **66.3 bpm, dead centre of §4 era 1's 60 to 72**. Author's
  description: *"chilled tribal track"* (quoted). **The objection is the one §6.5 predicted, and it
  is now measured rather than suspected: repeat 0.628 at a 4.8 s lag**, which is a real repeating
  phrase, roughly twice the never-repeats control. §6.5's warning was that stock tribal drums are *"a
  looped identical pattern, which is era two's signature arriving four thousand years early"*. **This
  candidate is measurably closer to era two's property than era one's**, and that is the thing to
  listen for rather than whether it sounds good.
- **Length and loop.** 3:12 (192.2 s). **Needs an edit:** 19.6 dB fade and a silent last 100 ms.
  7.7 MB mp3 at 320 kbps, or a 33.9 MB WAV, so a re-encode is mandatory either way.

#### Candidate 2C. The Sky of our Ancestors, by Kevin MacLeod

- **Where:** <https://incompetech.com/music/royalty-free/mp3-royaltyfree/The%20Sky%20of%20our%20Ancestors.mp3>
  (ISRC USUAN1700056)
- **Licence:** **CC-BY 4.0**, attribution block and indicate-changes obligation as in candidate 1B.
- **Why it complies.** Catalogue instruments are **Drums and Flute, and nothing else**, which is §4
  era 1's kit with no additions to argue about: no metal, no synthesiser, no strings. Catalogue tempo
  54 bpm, which is below the entry's 60 to 72 but on the slow side rather than the fast one. Measured
  repeat 0.632 at an 8.9 s lag.
- **Length and loop.** 7:11 measured, which is the longest era one candidate by far. **Needs an
  edit**, and this one is not a simple fade: the last five seconds sit at -58 to -67 dBFS with the
  level moving in both directions, so the tail has to be cut at a chosen point rather than trimmed.
- **The objection to weigh.** **Measured LRA 14.0**, the second widest reading in this document.
  §2 property 4 is not a preference, and a 14 LU range behind arithmetic is the thing that makes a
  learner reach for the volume.

---

### Stage 1, slot 3 of 14: `era-neolithic`. **NO CANDIDATE. This is the named gap.**

**The brief predicted this exactly**, at §6.5 (*"era two's own vocabulary is close to empty:
`pastoral` returns 1, `harvest` returns 2, `farm` returns 4... the abundance is real and it is in
the wrong era"*) and at §7.2 (*"budget for this one going to generation"*). **Reproduced
independently on 2026-08-02 with the same facets:** `pastoral` returns 1, `harvest` 2, `farm` 4, and
`village` 24 against the brief's 23, both at the first-page cap. In addition, **`ostinato` returns
0**, and that is the search term closest to era two's actual signature move.

**Why each near-miss fails, named rather than padded into a shortlist.** §4 era 2 needs five things
at once: a metronomically steady 72 to 84 bpm, an identically repeated bar, pitched tuned wood or a
plucked string with **no metal**, 100 to 180 s, and a seam clean enough that this era is *"seamless
rather than merely acceptable"*.

| Closest found | Licence | What it has | The defect that rules it out |
| --- | --- | --- | --- |
| Minimalistic Flute & Strings Tune, Spring Spring (<https://opengameart.org/content/minimalistic-flute-strings-tune>) | CC0 1.0 | Measured repeat **0.776**, 3:14, only 3.1 dB of end taper | Measured 94.0 bpm at high confidence, **10 bpm above the band**, and LRA 8.0. Also no percussion grid, and era two's whole idea is the grid arriving |
| Short kalimba loop, extenz (<https://opengameart.org/content/short-kalimba-loop>) | CC0 1.0 | Measured repeat 0.741 at an 11.7 s lag, LRA 2.6, and a genuinely clean seam | **46.8 s**, half the length §2 property 3 wants. And a kalimba's tines are steel: §4 era 2 bans metal and §4 era 3 owns *"the run's first struck metal"*, so this spends era three's signature two eras early |
| Silver Flame, Kevin MacLeod (<https://incompetech.com/music/royalty-free/mp3-royaltyfree/Silver%20Flame.mp3>) | CC-BY 4.0 | Marimba and drums, which is the right instrument family with no metal, 6:35 | Catalogue tempo 54, **18 bpm below the band**, measured LRA 9.4, and it ends in silence |
| GrassLands Theme, DST (<https://opengameart.org/content/grasslands-theme>) | CC0 1.0 | §6.3 lists it under era two; measured clean seam and 2:44 | **The author's own description is *"a mild medieval openworld type music"*** (quoted). It is re-homed to era five below, which is §6.5's finding confirmed from the source rather than inferred |

**Recommendation: generate this one, and §7.2 already budgeted for it.** What I would prompt, and
why the catalogues came up short rather than merely thin: era two's signature is a *negative* of
what stock libraries sell. The pool is full of pastoral melody, and the entry wants the opposite of
melody, a bar that never varies. **No search facet can express "does not vary", so this is not a
search that was run badly; it is a search that cannot be expressed.**

> **Prompt sketch for era two.** A single two-bar figure on a tuned wooden bar instrument, marimba
> or wooden xylophone, repeated without variation for two and a half minutes at a steady 78 bpm. A
> hand drum on the grid, even accents, no fills and no crescendo. One low sustained tone underneath.
> No metal, no bells, no cymbals. No melody, no key change, no arrival, nothing that enters or
> leaves after the first bar. Loop-trimmed with matched start and end levels.

Record the four provenance facts §6.6 requires at generation time (tool and model version, plan
tier at that moment, date, prompt), because they cannot be reconstructed afterwards.

---

### Stage 2, slot 4 of 14: `era-bronze_age`

**The brief's entry.** §4 era 3: *"a steady piece you notice mainly at the moments where one section
is fastened to the next"*, with the run's first struck metal held to points. 76 to 88 bpm, weight
from register and note length. No iron or steel timbre, no anvil, no brass section, and **no
Middle-Eastern or Egyptian idiom**, which §6.5 warns the free pool will push hard toward.

**The pool is emptier than §6.5 measured.** Reproduced on 2026-08-02 with the music and CC0 facets:
`bronze` **0**, `lyre` **0**, `harbor` **0**, `gamelan` **0**, `gong` **1** (a game-over clip).
`bells` fills its page and is entirely fantasy, Christmas and winter material. **So era three has no
vocabulary of its own on OpenGameArt at all**, and both candidates below come from the struck-metal
side rather than the era side.

#### Candidate 4A. That Zen Moment, by Kevin MacLeod

- **Where:** <https://incompetech.com/music/royalty-free/mp3-royaltyfree/That%20Zen%20Moment.mp3>
  (ISRC USUAN2400001)
- **Licence:** **CC-BY 4.0**, attribution block and indicate-changes obligation as in 1B.
- **Why it complies.** Catalogue instruments are Strings and Bowl Drum, and the author explains:
  *"I picked up a round metal tongue drum from a local music store... thought the chords were
  beautiful"* (quoted). **A struck metal bowl is §4 era 3's instrument list verbatim** (*"a light
  gong, finger cymbals, a struck bowl"*), it is struck rather than sustained, and it is not iron,
  steel, anvil or brass. No tempo recorded, so nothing to breach the band with.
- **Length and loop.** 10:01 measured. **Measured: no end fade** (0.2 dB over the last four
  seconds), which is the exception to finding 1. **But the head is 16 dB quieter than the tail**
  (-46.4 against -30.7 dBFS), so a butt-join drops in level once per pass: **an edit, and a
  different one from the usual fade trim.** 12.0 MB at 160 kbps.
- **Unverified.** Whether it reads as a specific living culture. The title says Zen and a metal
  tongue drum is a contemporary instrument with a strong meditation association; §4 era 1's ban on
  naming a living culture is written for era one but the reasoning carries.

#### Candidate 4B. Organic Meditations One, by Kevin MacLeod

- **Where and licence:** as candidate 1B above. **CC-BY 4.0.**
- **Why it complies.** Strings, Bells and Percussion, LRA 3.6 measured, 16:28, in D flat major
  (quoted). Bells are the struck metal era three owns, and the *"very calming"* register is the
  weight-not-speed reading §1.2 asks for.
- **Length and loop.** As 1B: needs a 1.29 s head trim and a tail cut.
- **The honest note.** **This track appears twice in this document, for the crisis and for era
  three, and it cannot be both.** If the crisis takes it, era three has one candidate; if era three
  takes it, era three's struck metal is no longer distinct from the crisis bed underneath it, which
  is the clash §5.1 predicts. **Whichever way it goes, the other slot needs a different answer.**

**Not proposed, with reasons.** Both of §6.3's era three rows fail on instrumentation rather than on
the geography problem it flagged: **Ali Khan's Palace** is described by its author as *"a piano
theme"* (quoted), and era three cannot have a piano; **Desert Settlement** is described as *"Guitar
music"* (quoted), same objection. **Starlike** (CC0, <https://opengameart.org/content/starlike>) is
*"Bowl + Strings"* and therefore correct in kind, but it measures 42.5 s with a 12.1 dB fade, so it
is a loop to build rather than a track to buy.

---

### Stage 2, slot 5 of 14: `era-classical`

**The brief's entry.** §4 era 4: *"a fixed-length phrase repeated at an exactly constant spacing, so
that a listener asked how many there were could count them"*. Chamber-sized, plucked strings, soft
double reed, low bowed drone. 80 to 92 bpm, even and unhurried. **No orchestral strings in section,
no timpani, no fanfare brass, no rubato.**

#### Candidate 5A. Experimenting with Greek instrument samples, by Spring Spring

- **Where:** <https://opengameart.org/content/experimenting-with-greek-instrument-samples>, the file
  **`greek instruments.ogg`** specifically, not the `greek boss battle.ogg` in the same submission.
- **Licence:** **CC0 1.0**, verified on the asset page 2026-08-02.
- **Why it complies.** It is the nearest thing in the library to era four's instrument list, which
  §6.3 already noted, and the measurements support the row: **79.5 bpm, one step below the 80 to 92
  band**, LRA 7.0, repeat 0.623 at a 6.0 s lag, which is a phrase repeating at constant spacing and
  is era four's read stated as a number. Ogg rather than mp3, which §2 property 5 prefers because
  the padding is declared rather than baked in.
- **Length and loop.** 1:40 (100.9 s), inside §4 era 4's 120 to 200 only if extended, above §2's
  90 s floor as it stands. **Measured: no fade whatsoever (0.0 dB over the last four seconds), head
  and tail within 2.8 dB. No edit needed.** 2.3 MB.
- **Unverified.** The submission is an experiment with samples rather than a finished cue, so the
  question for the ear is whether it holds up as a track and not merely as an instrument demo.

#### Candidate 5B. Canon in D Major, by Kevin MacLeod

- **Where:** <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Canon%20in%20D%20Major.mp3>
  (ISRC USUAN1100301)
- **Licence:** **CC-BY 4.0.** Pachelbel's composition is public domain; **this recording is not**,
  and Incompetech's FAQ says so directly (*"some of the baroque and classical compositions are in the
  public domain; these recordings are not"*, quoted). That is the exact trap §6.2 flags for Musopen,
  arising here too, and the attribution block is therefore mandatory.
- **Why it complies, and it is the strongest brief-anchored argument in this document.** §4 era 4's
  read asks for a fixed-length phrase repeated at exactly constant spacing that a listener could
  count. **Pachelbel's Canon is a two-bar ground bass repeated without deviation for the length of
  the piece: it is the repeated bay, in sound, exactly as §3 asks (take the signature move, not the
  period instruments).** Catalogue tempo 80, the bottom of the band. Measured LRA 4.6, narrower than
  the house track's baseline.
- **Length and loop.** 5:55 measured. **Needs an edit:** it ends in silence. 11.9 MB.
- **The objection, and it is a direct hit on the entry's own must-not list.** The catalogue
  instruments are *"Orchestral - Bass, Violin, Harp"* with three violins. **§4 era 4 bans orchestral
  strings in section.** So the move is a perfect match and the instrumentation is a stated
  violation, and which of the two governs is the lead's call rather than mine. §3 of the brief is the
  argument for buying the move; the must-not line is the argument against.

**Not proposed: White Limestone** (CC0, §6.3's other era four row, and §6.3 liked it because an
extended cut suits a long loop). **The author's own description disqualifies it on §2 property 1:**
*"Pretty repetitious, so key changes periodically to break the monotony"* (quoted). A periodic key
change is the definition of a learnable event, and §5.2 bans key changes outright while §2 property
1 bans anything the ear can learn to expect. Measured, it also fades 24.9 dB and its LRA is 7.9 to
8.5 depending on the cut.

---

### Stage 2, slot 6 of 14: `era-medieval`

**The brief's entry.** §4 era 5: *"a piece whose accompaniment is plainly the skeleton of the tune
rather than a cushion under it, with a bell in it that rings occasionally and never on a beat you
expected"*. A drone plus an open fifth carries the whole piece. 84 to 96 bpm. **No tavern-jig idiom,
no drinking-song shape, no Renaissance-fair pastiche, no full carillon, no plainchant.**

#### Candidate 6A. GrassLands Theme, by DST

- **Where:** <https://opengameart.org/content/grasslands-theme>
- **Licence:** **CC0 1.0**, verified on the asset page 2026-08-02.
- **Why it belongs here rather than at era two.** §6.3 lists it as an era two candidate with the
  caveat that it came out of the landscape pool. **Settled from the source: the author's own
  description is "A mild medieval openworld type music"** (quoted). That is §6.5's finding confirmed,
  not inferred, and it converts a doubtful era two row into a plausible era five one. "Mild" is also
  the right direction for an entry whose bans are all about jollity.
- **Length and loop.** 2:44 (164.4 s), inside §4 era 5's 100 to 180. **Measured: 1.0 dB change over
  the last four seconds, head and tail within 2.9 dB, no trailing silence. Clean, no edit needed.**
  6.6 MB at 320 kbps mp3, so a re-encode is wanted for size alone.
- **The objection to weigh.** Measured strongest in-band period 55.6 bpm at low confidence, well
  under era five's 84 to 96. **If it is really that slow it is era five's tempo band missed by 30
  bpm**, and §3 forbids expressing era through tempo but §4 still gives each era a band.

#### Candidate 6B. Angevin, by Kevin MacLeod

- **Where:** <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Angevin.mp3> (ISRC
  USUAN1200110)
- **Licence:** **CC-BY 4.0**, attribution block and indicate-changes obligation as in 1B.
- **Why it complies.** Catalogue instruments are Flute, Lute, Choir and Percussion, catalogue tempo
  70, feel *"Calming, Dark, Mystical, Somber"*, and the description is *"sort of a slow Renaissance
  like piece of music"* (quoted). **Measured LRA 3.1**, which is narrower than the house track, and
  a measured 69.8 bpm confirming the catalogue. Slow and somber is the opposite end of the register
  from the jig and the drinking song that era five's must-not list is built to exclude.
- **Length and loop.** 4:40 measured. **Needs an edit:** 74.2 dB fade over the last four seconds,
  plus 0.31 s of leading silence. 11.2 MB.
- **Unverified, and it is a §4.0 question rather than a taste one.** The catalogue lists a **choir**.
  §4.0 bans lyrics and intelligible voice in every track, and §4 era 5 bans plainchant specifically
  because sung Latin is intelligible. **A wordless choir pad is admissible; anything with words is
  not.** This is the one thing to check before it can be recommended.

#### Candidate 6C. Medieval: The Old Tower Inn, by RandomMind

- **Where:** <https://opengameart.org/content/medieval-the-old-tower-inn>, the file
  **`Loop_The_Old_Tower_Inn.wav`**
- **Licence:** **CC0 1.0**, verified on the asset page.
- **Why it is here.** It ships a purpose-made loop variant, and it measures like one: **LRA 3.3,
  head and tail within 1.4 dB, 1.2 dB change over the last four seconds. No edit needed at the
  seam.** Measured strongest in-band period 57.4 bpm with an alternate at 86.1, so the tempo may
  well be inside era five's band.
- **Length and loop.** **50.0 s, and that is the problem.** §2 property 3 says treat anything under
  60 s as needing an unusually eventless surface to compensate, and 50 s means a learner meets the
  seam more than seventy times an hour. The full version is 1:45 but fades and ends in silence.
  WAV only at 8.8 MB, so an encode is required.
- **The objection.** The title is a tavern and §4 era 5's first must-not is the tavern-jig idiom.
  **The name is not the evidence, but it is the specific thing to listen for**, and if it is a jig
  the entry rules it out however clean the loop is.

---

### Stage 2, slot 7 of 14: `era-renaissance`

**The brief's entry.** §4 era 6: *"a piece whose second half answers its first half so exactly that
a listener could predict the answer, and is pleased rather than bored when it arrives"*. A small
consort, real voice-leading with independent lines, the run's first genuinely polyphonic texture.
76 to 92 bpm. **No large organ, no cathedral reverb, no sacred choral idiom, no Baroque virtuosity.**

**This is the best-covered slot in the search, and §6.5 was right about why: search by repertoire,
not by mood.** `renaissance` returns 3 results and one of them is an exact hit.

#### Candidate 7A. If my complaints could passions move, John Dowland 1597, rendered by Of Far Different Nature

- **Where:** <https://opengameart.org/content/historic-renaissance-music-from-1597-if-my-complaints-could-passions-move-by-john-dowland>
- **Licence:** **CC0 1.0**, verified on the asset page 2026-08-02. **The composition is public domain
  and the author released the recording as CC0 too**, which is the combination §6.2 says Musopen
  promises and rarely delivers cleanly.
- **Why it complies.** A period composition in a period texture, and measured **LRA 1.8, the
  narrowest reading of any candidate in this document**: §2 property 4 satisfied outright. Measured
  repeat 0.621 at a 13.1 s lag, a long phrase returning, which is the antecedent-and-consequent
  shape era six's read asks for. Instrumental, so §4.0's no-voice rule is met by a piece that was
  originally a song.
- **Length and loop.** 2:41 (161.5 s), inside §4 era 6's 120 to 200. **Needs an edit, and a big
  one:** 58.2 dB fade over the last four seconds. 6.5 MB at 320 kbps, re-encode wanted.
- **The objection, in the author's own words.** *"Instrumentation-wise my render is a little ahead
  of time and sounds more baroque"* (quoted). §4 era 6 bans Baroque virtuosity, and the ban is about
  display rather than timbre, so this is probably survivable. **It is the lead's ear that decides
  whether it reads as the drawing or as the display.**

#### Candidate 7B. Sinfonia Number 5, by Kevin MacLeod

- **Where:** <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Sinfonia%20Number%205.mp3>
  (ISRC USUAN1100673)
- **Licence:** **CC-BY 4.0.** Bach's composition is public domain, **this recording is not**, same
  as candidate 5B.
- **Why it complies.** It is a three-part invention, which means **three independent lines**, and
  §4 era 6's instrumentation asks for *"real voice-leading with independent lines, which is the first
  time in the run the texture is genuinely polyphonic"*. On a harpsichord alone: no large organ, no
  cathedral reverb, no choir. Catalogue tempo 71, just under the band. Measured LRA 2.5.
- **Length and loop.** 2:08 (128.4 s), inside the 120 to 200 band. **Needs an edit:** 28.0 dB fade
  and 0.29 s of leading silence. 5.1 MB.
- **The objection.** Bach is Baroque, not Renaissance, and the author's stated use was *"music for
  a 'stuffy aristocratic dinner party'"* (quoted). **§3 is the defence** (take the move, which is
  resolved symmetrical polyphony, not the period), and the counter-argument is that era six's own
  must-not names Baroque twice.

**Not proposed: The Lord's Court** (CC0, <https://opengameart.org/content/the-lords-court>). *"Dual
Harpsichords and a Viola"* (quoted) is era six's consort exactly, and it is listed here because that
is worth knowing, but it measures **38.6 s with a 48.0 dB fade**, which is a sketch rather than a
track. **If era six ends up generating, this is the instrumentation to prompt for.**

---

### Stage 2, slot 8 of 14: `era-industrial`

**The brief's entry.** §4 era 7: *"a piece with no middle: it could have started thirty seconds
earlier or later and nothing about it would be different"*. No introduction and no cadence. 88 to
100 bpm, machine-exact, the run's densest track and not its fastest. **Do not reach for a
synthesiser: era seven is iron and steam.** No steampunk whimsy, no klaxon, no accelerating machine
build.

#### Candidate 8A. Scaling Up, by Ruskerdax

- **Where:** <https://opengameart.org/content/scaling-up>
- **Licence:** **CC0 1.0**, verified on the asset page 2026-08-02. The author adds that it *"was
  created specifically to be released to the Public Domain on commission by a private patron"*
  (quoted), which is a cleaner provenance story than most.
- **Why it complies.** The description is the closest thing to era seven's own subject in the whole
  search: *"described variously as 'concentration music,' 'Sim City-like,' and 'an alternative to the
  Satisfactory music'"* (quoted). A factory game's background loop is precisely what §4 era 7
  describes, and "concentration music" is what §2 is asking for in the first place. Measured
  **86.1 bpm at high confidence**, two below the band's floor, LRA 5.1, repeat 0.536 at an 11.2 s lag.
- **Length and loop.** 4:33 (273.5 s), well above §4 era 7's 90 to 160. **Needs an edit:** 13.5 dB
  fade. FLAC only at 24.1 MB, so a re-encode is mandatory.
- **The objection, which the entry states in bold.** The instruments are *"a Hohner Pianet Model N,
  Arturia Minifreak, and Roland TB-303"* (quoted): two synthesisers and an electro-mechanical
  keyboard. **§4 era 7 says do not reach for a synthesiser, era seven is iron and steam.** The
  Pianet is at least a mechanical instrument; the TB-303 is not. **This is the row where the lead's
  ear and the brief are most likely to disagree, and the disagreement is legible in advance.**

#### Candidate 8B. Factory ambiance, by yd

- **Where:** <https://opengameart.org/content/factory-ambiance>
- **Licence:** **CC0 1.0**, verified on the asset page.
- **Why it complies.** §6.3 wondered whether it is ambience rather than music and whether that is a
  feature; measured, it behaves like era seven's signature move. **Repeat 0.758**, high and stable,
  which is *"the standard part repeated without limit"*, and a measured 84.7 bpm. Head and tail
  match within 0.7 dB, so it has no arrival to hide. Ogg at 2.5 MB, the smallest candidate here.
- **Length and loop.** 2:03 (123.0 s), inside the 90 to 160 band. **A partial edit:** the levels
  match but the last four seconds still taper 11.5 dB.
- **The objection.** Measured **LRA 9.5** against the house track's 4.1, and measured LUFS -24.3,
  which means it will need more gain to sit at the same level and will bring its dynamic range up
  with it. §2 property 4 is the risk.

#### Candidate 8C. Brittle Rille, by Kevin MacLeod

- **Where:** <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Brittle%20Rille.mp3>
  (ISRC USUAN1200047)
- **Licence:** **CC-BY 4.0**, attribution block and indicate-changes obligation as in 1B.
- **Why it complies.** Catalogue instruments are Bass, **Music Box** and Cello at **88 bpm, exactly
  the floor of era seven's band**, and the description is *"quirky rhythms, raw production"*
  (quoted). **A music box is a machine that plays a fixed part without expression**, which is §4
  era 7's signature move rendered as an instrument rather than as a style, and it is mechanical
  rather than electronic, which is what the entry asks for and what candidate 8A cannot offer.
  Measured LRA 2.8.
- **Length and loop.** 3:49 measured. **Needs an edit:** 83.9 dB fade, the largest in this document.
  9.2 MB.

---

### Stage 3, slot 9 of 14: `era-atomic_age`

**The brief's entry.** §4 era 8: *"a tune floating clear of the harmony that would explain it,
played by people who are completely relaxed about it"*. Vibraphone, light brushed kit, upright bass
walking gently, a Rhodes-like keyboard, one soft muted horn. **The run's one genuinely recorded
aesthetic.** 84 to 96 bpm. **No big-band swing, no lounge-exotica kitsch, no ironic mid-century
pastiche, no jazz solo, no atomic-age menace.**

**§6.5 called this the hardest slot and the CC0 measurements confirm it, but Incompetech rescues
it.** Reproduced on 2026-08-02: `mid century` returns **0** and `big band` returns **0** on
OpenGameArt with the music and CC0 facets. **And §6.3's own era eight row does not survive
inspection: "Bossa Nova" ships a single file named `8bit Bossa.mp3`**, an 8-bit chiptune, which
cannot satisfy an entry whose whole point is a recorded aesthetic.

#### Candidate 9A. Vibing Over Venus, by Kevin MacLeod

- **Where:** <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Vibing%20Over%20Venus.mp3>
  (ISRC USUAN2300005)
- **Licence:** **CC-BY 4.0**, attribution block and indicate-changes obligation as in 1B.
- **Why it complies.** Catalogue instruments are **Vibraphone, Bass, Drum kit, Percussion, Strings,
  Piano at 94 bpm**, feel *"Calm, Grooving, Relaxed"*. That is §4 era 8's instrument list and its
  84 to 96 band with almost nothing left over. Measured **LRA 3.2**, narrower than the house track,
  which is the single best §2 property 4 reading among the era eight candidates.
- **Length and loop.** 6:51 measured, so §2 property 3 is satisfied several times over. **Needs an
  edit:** it ends in silence. 8.2 MB at 160 kbps.
- **The objection, and it is §2 property 1's.** A seven-minute jazz piece with a vibraphone lead is
  where a **solo** lives, and §4 era 8 bans jazz solos while §2 property 1 bans any entry the ear can
  learn to expect. **The specific thing to listen for is a solo entry, not whether it sounds good.**
  The author's own framing is a radio show, *"relaxation hour here on Radio Kilimanjaro... Alice
  Goodworth on her vibraphone"* (quoted), which is a framing built around a featured player.

#### Candidate 9B. Cool Vibes, by Kevin MacLeod

- **Where:** <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Cool%20Vibes.mp3> (ISRC
  USUAN1100863)
- **Licence:** **CC-BY 4.0**, as above.
- **Why it complies.** *"A simple little slow trio for use in such things that require a slow jazz
  trio"* (quoted), instruments Vibes, Bass and Kit at **83 bpm**: era eight's trio with no strings
  and no piano to argue about, and one bpm under the band. Measured LRA 4.5, level with the house
  track's 4.5 on `a-new-town`.
- **Length and loop.** 3:38 measured. **Needs an edit:** 69.7 dB fade, ending in silence. Measured
  LUFS -29.6, an unusually quiet master, so it will need substantially more gain than the house
  track and that will raise its noise floor with it.
- **The objection, stated by the author in the catalogue.** *"Modulates at the midpoint"* (quoted).
  **That is a key change, which §5.2 bans outright and §2 property 1 rules out as the most learnable
  event there is**, and it is the same defect that rules out White Limestone at era four. It is
  shortlisted anyway because the instrumentation is otherwise exact and a midpoint modulation is
  editable: cut the first half and loop it.

#### Candidate 9C. I Knew a Guy, by Kevin MacLeod

- **Where:** <https://incompetech.com/music/royalty-free/mp3-royaltyfree/I%20Knew%20a%20Guy.mp3>
  (ISRC USUAN1100199)
- **Licence:** **CC-BY 4.0**, as above.
- **Why it complies.** *"Slow walking bass, drums follow along sparely, with a cool Vibe melody"*
  (quoted), instruments Kit, Bass, Vibes. **"Follow along sparely" is §1.2's fewer voices and more
  space**, and a walking bass that stays out of the way is what era eight asks for while banning one
  *"so busy it becomes the tune"*. Measured 74.9 bpm at high confidence, agreeing with the catalogue's
  75.
- **Length and loop.** 2:46 (167.0 s), inside §4 era 8's 100 to 180. **Needs an edit:** ends in
  silence. 6.0 MB.
- **The objection.** **75 bpm is 9 below era eight's band**, and §4 era 8 wants relaxed rather than
  slow, since era eight is *"the most optimistic track in the run"*.

**Also verified, and worth the lead's time if all three above fail on the recorded-aesthetic
question: Empty Stretch, Zane Little Music, CC0 1.0**
(<https://opengameart.org/content/empty-stretch>). Measured 2:20 (140.8 s), **LRA 4.0**, 2.9 dB
change over the last four seconds and head and tail within 1.9 dB, so it is one of the few
mechanically clean loops in the era eight space. The author's own inspiration is a PS2 soundtrack's
*"jazz-funk-fusion tunes"* (quoted), which is adjacent to era eight rather than in it, and measured
LUFS -12.2 makes it **louder than the house track**, which matters only if it is ever used under a
crisis.

---

### Stage 3, slot 10 of 14: `era-information_age`

**The brief's entry.** §4 era 9: *"a piece in which nothing sounds like a person playing an
instrument, and which is still warm rather than cold"*. **No audible hand anywhere.** 72 to 88 bpm
or no countable pulse. 120 to 240 s, and the entry explicitly says take the longest loop in the set
here. **No new-age or meditation idiom, no rain, no sleep-playlist piano, no evolving pad that
swells, no glitch, and nothing so characterless that it could be any era at all.**

#### Candidate 10A. Northern Glade, by Kevin MacLeod

- **Where:** <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Magic%20Scout%20-%20Nothern%20Glade.mp3>
  (catalogue title "Northern Glade", ISRC USUAN1800017)
- **Licence:** **CC-BY 4.0**, attribution block and indicate-changes obligation as in 1B.
- **Why it complies.** Catalogue instruments: **Synths, and nothing else**, which is era nine's *no
  audible hand* as an instrument list. Catalogue tempo **78, the centre of era nine's 72 to 88
  band**, and measured 79.5 at high confidence, so the pulse is real and inside the band rather than
  inferred from a catalogue field. Measured **LRA 3.6**, narrower than the house
  track. Feel *"Bright, Calming, Relaxed"*, which is the *warm rather than cold* half of the read.
- **Length and loop.** 5:15 measured. **Needs an edit:** 43.9 dB fade. 5.7 MB at 146 kbps, the
  lowest bitrate among the Incompetech rows, so check quality before re-encoding.
- **A note the lead may enjoy, and it is thematic rather than technical.** The author's description
  is *"are you sick of 'high pressure' games that 'keep score'? Yeah, me too. But I FIXED it! I made
  a game where literally nothing happens, and nothing matters!"* (quoted). That is the affect §1 is
  written to protect.

#### Candidate 10B. Concentration, by Kevin MacLeod

- **Where:** <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Concentration.mp3> (ISRC
  USUAN1700022)
- **Licence:** **CC-BY 4.0**, as above.
- **Why it complies.** Synths and electric piano, **no tempo recorded**, which era nine explicitly
  permits (*"or a pulse so soft it is not countable at all"*). **29:52 measured**, which is era
  nine's *"take it: it is the cheapest place in the run to buy the property section 2 wants most"*
  taken literally: at half an hour the seam is met roughly once a session and §2 property 1's
  anticipation problem has almost nowhere to attach.
- **Length and loop.** As above. **Needs an edit:** 2.1 s of leading silence and a 25.5 dB fade.
  57.4 MB at 256 kbps, so re-encoding is not optional.
- **The objections, both mine.** Measured **LRA 8.6**, more than twice the house track's 4.1, so §2
  property 4 is the risk. And an electric piano is a hand: §4 era 9 wants every performance gesture removed, and
  *"sleep-playlist piano"* is on the banned list. **Whether the EP reads as a played instrument is
  the question for the ear.**

#### Candidate 10C. Light Awash, by Kevin MacLeod

- **Where:** <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Light%20Awash.mp3> (ISRC
  USUAN1100175)
- **Licence:** **CC-BY 4.0**, as above.
- **Why it complies.** *"This is a 30 minute atmospheric piece done entirely with slow attack
  synths"* (quoted). **Slow attack means no startle event is physically available**, which is §1.1
  item 4 designed out at the source rather than reviewed for, and it is the strongest structural
  compliance argument of the three. Measured **LRA 5.3**, and 29:20.
- **Length and loop.** As above. **Needs an edit, the largest head trim here:** 6.12 s of leading
  silence plus a 27.6 dB fade. 42.4 MB at 193 kbps.
- **The objection.** §4 era 9 bans *"an evolving pad that swells (a swell is a riser)"*, and a
  thirty-minute atmospheric piece is the shape most likely to contain one. **Listen for the swell
  specifically.**

**Also verified: Etirwer, Kistol, CC0 1.0** (<https://opengameart.org/content/etirwer>), 2:10, LRA
3.5, and the author claims *"this track should repeat seamlessly with no clicks or errors"*
(quoted). **Measured, the claim does not hold as published: 21.1 dB of taper over the last four
seconds.** That is probably a reverb tail meant to overlap rather than a mistake, but under
`element.loop = true` (`music.ts:296`) nothing overlaps, so it dips once per pass. **A CC0 candidate
with a small, well-understood edit.**

**And the coherence option worth naming: Calm Relax 1 (Synthwave 421k), cynicmusic, CC0 1.0**
(<https://opengameart.org/content/calm-relax-1-synthwave-421k>), **by the same author as both
shipped tracks**, 7:54 measured. Held back rather than shortlisted: measured **LRA 13.2**, which is
three times the house track's and the second widest here, plus a 14.2 dB fade.

---

### Stage 3, slot 11 of 14: `era-cyberpunk`

**The brief's entry.** §4 era 10: *"a plain dark bed with a great deal attached to the outside of it,
and one thing in it you have heard before"*. Strip the bright details and what remains should be
almost nothing. 76 to 92 bpm and **explicitly not the fastest track in the game**. **No synthwave
nostalgia, no gated reverb snare, no 1980s arpeggio, no dystopian menace, no siren.**

**Read §7 of this document before buying here: half of this entry cannot be bought at all.**

#### Candidate 11A. Dark City, by cinameng

- **Where:** <https://opengameart.org/content/dark-city-0>
- **Licence:** **CC0 1.0**, verified on the asset page 2026-08-02.
- **Why it complies.** §6.3 shortlisted it because the title matches era ten's *"ordinary dark box"*
  better than the synthwave results do, and the measurements are the best in this slot: **LRA 1.9,
  the second narrowest of any candidate proposed here**, head and tail within 0.8 dB, **1.2 dB change over the
  last four seconds, no trailing silence.** It ships mp3 and WAV. Measured 95.7 bpm at moderate
  confidence, which is 4 above the entry's ceiling and worth checking, with a plausible alternate
  reading at 47.9.
- **Length and loop.** 2:00 (120.0 s), the floor of era ten's 120 to 200, and the only candidate in
  this slot inside that window. **No edit needed at the seam.** 4.8 MB mp3.
- **Unverified.** Whether it is synthwave. The pool is *"almost entirely synthwave"* per §6.5 and the
  facet cannot tell you; this is the one question the lead has to answer here.

#### Candidate 11B. Cyberpunk Beauty, by Tarush Singhal

- **Where:** <https://opengameart.org/content/cyberpunk-beauty>
- **Licence:** **CC0 1.0**, verified on the asset page.
- **Why it complies.** Measured **LRA 2.6**, head and tail within 2.3 dB, **0.2 dB change over the
  last four seconds**, and the author says *"loops well"* (quoted), which measurement supports.
  Strongest in-band period 61.5 bpm, so it is unlikely to be the fastest track in the game, which
  §3's ruling requires of era ten specifically.
- **Length and loop.** 1:33 (93.7 s), which clears §2's 90 s floor but is 26 s short of era ten's
  own 120 to 200 window. **No seam edit needed.** 2.2 MB.
- **The objection.** Measured **LUFS -9.1**, the hottest master among the era candidates, 3.9 LU
  above the house track. With LRA 2.6 that means heavy compression, which buys §2 property 4 and
  spends it on fatigue.

#### Candidate 11C. Mile-High Infraskyway, by Spring Spring

- **Where:** <https://opengameart.org/content/mile-high-infraskyway>
- **Licence:** **CC0 1.0**, verified on the asset page.
- **Why it complies.** The title is era ten's premise, *"a lit deck built on top of everything that
  came before"*, and it is the longest candidate in the slot at 4:31, measured, with head and tail
  within 0.7 dB and only 3.6 dB of taper. Strongest in-band period 99.4 bpm.
- **Length and loop.** 4:31 (272.0 s), above the window. **A small edit at most.** 4.3 MB, but at
  **125 kbps**, the lowest bitrate of any candidate here, so check for artefacts before accepting it.
- **The objection.** 99.4 bpm, if that is the real tempo, would make it the fastest track in the set,
  which §3 forbids for era ten by name.

---

## 6. The gap, stated plainly

**One slot of the fourteen has no candidate I am willing to propose: `era-neolithic`.** The reasons
are in stage 1 slot 3 above, with the four closest misses and the specific defect in each. It should
be generated, §7.2 already anticipated that, and a prompt sketch is given there.

**Three further slots have candidates but are honestly weak, and the lead should know which they
are before he spends time listening.**

- **`era-bronze_age`** has two candidates and both are CC-BY, both need edits, and **one of them is
  also proposed for the crisis and cannot serve both.** Era three's own vocabulary returns zero
  results on OpenGameArt: `bronze` 0, `lyre` 0, `harbor` 0, `gamelan` 0. **If the crisis takes
  Organic Meditations One, era three is effectively a second gap.**
- **`era-atomic_age`** has three candidates and all three are CC-BY, because the CC0 pool measured
  empty on this era's vocabulary and its one plausible CC0 row is a chiptune. **§6.5's prediction
  that this era most likely needs generation stands if the lead rejects CC-BY.**
- **`era-cyberpunk`** has three CC0 candidates, two of which need no seam edit at all, and **not one
  of them can satisfy the entry's signature move**, for the reason in §7 below. This is the slot
  where the shortlist is mechanically strongest and least able to deliver what the brief asked for.

---

## 7. What I could not shop from, and it is not all the same kind of problem

This is the first pass that has tried to buy from the brief, so it is also the first test of whether
the brief can be bought from. **Five entries are worth reporting: two cannot be shopped from as
written, one asks for a feeling with no property to search on, one looked unshoppable and turned out
to be the most measurable in the document, and one is a set-level constraint that no single candidate
can satisfy or fail.**

**Unshoppable by construction, and this one is definitive. §4 era 10's signature move is a
quotation:** *"one recognisable element from era one's track, retrofitted in. A struck stone, the
bone flute's three notes, the frame drum."* **No catalogue track can contain a quotation of a track
that has not been acquired yet.** So era ten's entry is half shoppable: a candidate can supply the
plain dark bed and the attached bright details, and **the closing move of the whole ten-era run is an
edit or a commission, not a purchase.** It should be planned as such, and it is one more reason
§7.4's advice to buy eras 8, 9 and 10 together is right.

**Unshoppable as written, and it contradicts another section. §4 era 3's signature move is
*"the seams are where the metal goes"***, one bright struck note at each structural junction. Two
problems. First, no catalogue exposes where a track's section boundaries are or what marks them, so
there is no query for it. Second, and more seriously, **a bright struck note at each structural
junction is exactly the learnable event §2 property 1 forbids**: *"anything the ear can learn to
expect becomes a metronome for the learner's attention"*. The entry half-anticipates this (*"it still
must not read as a stinger: one small bright note, not a hit"*), but the tension is real and it is
between two sections of the same document. **Somebody has to rule on which wins before era three is
bought or generated**, because the entry as written asks for a periodic event and §2 says a periodic
event is what makes a loop unbearable.

**A feeling with no musical property to search on. §4 era 9's last must-not is
*"nothing so characterless that it could be any era at all"***, and §6.5 admits the risk is *"a
track that is correct and characterless, which is harder to reject in review than a track that is
wrong, because there is nothing to point at"*. **I cannot shop against this and neither can anyone
else**: there is no facet, no measurement and no author description that distinguishes a
distinctive ambient pad from a generic one. What I did instead was measure the properties era nine
*can* be shopped against (synths only, no audible hand, tempo band, LRA, length) and hand the lead
three candidates plus the one question his ear can answer that no query can.

**Nearly unshoppable, but rescued by measurement, and worth recording because I expected the
opposite. §4 era 1's *"nothing repeats identically"*** sounds like the vaguest instruction in the
brief and turned out to be the most checkable: a two-control calibration turns it into a number, and
that number is what separates candidate 2A from candidate 2B above. **§4 era 2's converse is equally
checkable.** So the single largest audible step in the run, the era one to era two seam that §4
calls free, can be verified before purchase rather than after.

**Not unshoppable, but not a property of any candidate. §5.2's shared-element requirement** (the
crisis track shares a pitch centre with each era track) **and §7.5's instruction to fix that pitch
centre first** are set-level constraints. No single row can satisfy or fail them. **What helps is
that three of the candidates name their key**: "Drone in D", "Canon in D Major", and the two Organic
Meditations pieces in D flat major. **If the crisis track is chosen from those, §7.5's decision is
made by the purchase rather than deferred**, and D is the pitch centre two of them share.

---

## 8. Excluded candidates, and the reason in each case

**Nothing was excluded for being unlicensed, because nothing unlicensed got as far as a measurement.**
Every asset considered came from a source with a per-asset licence field (OpenGameArt) or a
site-wide Creative Commons grant (Incompetech), and both were read on 2026-08-02. **The exclusions
below are all on §1, §2 or the entries' own must-not lists.** **Eight of them are rows §6.3 listed**,
which is what a shopping pass is for: that table was explicitly search results with verified
licences and not recommendations, and this is the pass that checks them.

| Excluded | Licence status | Why |
| --- | --- | --- |
| Feel good island | `OGA-BY 3.0 + CC0`, verified | Not reconsidered here. §6.4 leaves the multi-licence question to the audio owner and this pass had no reason to reopen it |
| Spring's Pastorales | `CC-BY-SA 4.0 + CC-BY-SA 3.0 + CC0`, verified | Same reason, and §6.1 says avoid share-alike. Measured head-to-tail mismatch of 15.5 dB and 19.0 dB on two of the three movements anyway |
| Ambient Soundscape | `CC-BY 3.0 + CC0`, verified | Same reason. Measured LRA 13.3 and a 44.2 dB end fade |
| Gown of Brown | `OGA-BY 3.0 + CC0`, verified | Same reason. Measured LRA 12.1 |
| Cold Silence | CC0, verified | Author: *"rather unsettling to listen to"*. §1, on the author's own word |
| A Cold Wind | CC0, verified | Author: *"ideal for ghosts, spirits"*. §1, plus 43.1 s and a 48.2 dB fade |
| Derelict, The Ritual | CC0, verified | **MIDI only, no audio file to ship.** The Ritual also *"doubles the tempo"* mid-piece, which is §1.1 item 1 |
| Frost in the Northern Winter | CC0, verified | §6.3 lists it. Measured LRA 14.5 and the author's genre is *"symphonic dark ambient / gothic"*: §1 |
| Kokopelli's Labyrinth Theme, Thunderhead, Eastminster, Mystical Enigmatic, Hidden Wonders, Mystery Bazaar | CC0 and CC-BY, verified | Each names a specific living culture in its title, instruments or description. §4 era 1's ban, and §4 era 3's ban on importing a geography the guide never claims. Eastminster fails §1 twice over, since its own description promises *"an air of suspense and tension... as if a drama is about to unfold"* |
| Cinematic percussion loop | CC0, verified | 12.0 s, and taiko, so both the length rule and the culture rule |
| Wye | CC0, verified | Author: *"short suspense driven pad loop"*. §1.1 item 2 |
| Bleak Terminal | CC0, verified | Author's own setting is *"sci-fi/horror"*. §1 |
| Empacotatron | CC0, verified | Ships a genuinely clean 80 s loop, but the author calls it *"a high energy electronic bleep-bloopy beat for games where there's a lot of stuff going on"*. §4.0's *nothing urgent, ever* |
| Abandoned Steel Mill | CC0, verified | Clean 85 s loop, and the author calls it *"a very short, uninspired, and lazy track"* |
| Calm Ambient 2 (Synthwave 15k) | CC0, verified | Author: *"some annoying plucky sound that I wish wasn't there"* |
| Calm Ambient 3 (Lifewave 2k) | CC0, verified | Author: *"an uplifting piano melody"*. §4 era 9 bans sleep-playlist piano and any audible hand; measured LRA 12.0 |
| Ultralounge, Zazie, Hep Cats, Bossa Antigua | CC-BY 4.0 | Lounge-exotica kitsch and ironic mid-century pastiche, which §4 era 8 bans by name. Zazie also has voice: §4.0 |
| Bossa Nova | CC0, verified | §6.3's era eight row. The only file is `8bit Bossa.mp3`, a chiptune, and era eight's entry requires a recorded aesthetic |
| White Limestone | CC0, verified | §6.3's era four row. Author: *"key changes periodically to break the monotony"*. §2 property 1 and §5.2 |
| Ali Khan's Palace, Desert Settlement | CC0, verified | §6.3's era three rows. *"A piano theme"* and *"guitar music"* respectively, on the authors' own descriptions |
| Ambient Relaxing Loop, Underwater Ambient Pad | CC0, verified | Clean matched loops at 24.5 s and 16.7 s. Far under §2 property 3's floor |
| Harpsichord Flurry | CC0, verified | §6.3 flagged it and the flag holds: a flourish is what §4 era 6 bans |
| C64 Arbeau, NES Banchieri, NES Bach, Moog Bach | CC0, verified | Correct repertoire, chiptune and Moog renderings. §6.3 already treats these as evidence the repertoire exists rather than as candidates |

### 8.1 Every remaining §6.3 row, so none of the brief's own candidates is silently dropped

§6.3 listed **26** rows and said each still owed the §2 test before it could be proposed. The
shortlist and the exclusion table above account for seventeen of them. **These are the other nine,
with what the measurement said**, so the brief's table can be read through to a verdict rather than
left half-checked.

| §6.3 row | Measured on 2026-08-02 | Verdict |
| --- | --- | --- |
| Prehistoric Drum Loop | 5.7 s | **Confirmed unusable on length**, exactly as §6.3 says. Listed there because someone would find it, and they did |
| Lost in the meadows | `OGA-BY 3.0 + CC0`; 1:48, LUFS -30.5, LRA 10.1, 25.4 dB fade, 0.75 s lead silence | Excluded: multi-licence question is not this pass's to reopen, and the dynamic range fails §2 property 4 independently |
| Medieval: Exploration | CC0; 3:56, LRA 4.2, 1.12 s lead silence, 14.3 dB fade, 9.4 MB | **A viable fourth candidate for era five**, ranked below the three above only because it needs both a head trim and a tail cut |
| Hush Hamlet | CC0; ships `hush_hamlet_loop.wav` at 96.0 s, LRA 6.0, 11.2 dB residual taper, WAV only at 36.9 MB | **Viable for era five** with an encode and a taper fix. §6.3 was right that the dedicated loop variant is the property §2 asks for. The author's own scene is a town with a pub, so audition it against era five's tavern ban |
| Steampunk music | CC0; 2:08, LRA 8.7, 14.2 dB fade, FLAC at 25.1 MB | Excluded. §6.3 said verify it against era seven's ban on steampunk whimsy first; the name is the author's own and the LRA fails property 4 anyway |
| Catchy Swing | **Not measured** | Excluded on §6.3's own note, that "catchy" is the property §2 property 1 rules out. **Stated as unmeasured rather than implied to be checked** |
| Calm Ambient 1 (Synthwave 4k) | CC0, cynicmusic; 2:37, LRA 6.9, 0.64 s lead silence, 12.7 dB fade | **A viable era nine alternative**, and by the author of both shipped tracks, which is worth something for set coherence. Ranked below Northern Glade on LRA and on the tempo band |
| Global Resonance | CC0; 2:37, LRA 9.3, 16.4 dB fade | Excluded on §2 property 4 and the edit cost |
| T & T Free Cyberpunk Pack | CC0; three of nine files measured: "Caves" LUFS -7.0 and LRA 11.4 with 1.5 s of lead silence, "Anti Matter Magic" a 97.4 dB fade, "Currents" LUFS -6.2 with silence at both ends | Excluded: very hot masters and film-style fades. **Six of the nine files were not measured**, so this is a verdict on the three that were |

---

## 9. Ready-made `CREDITS.md` rows

`CREDITS.md:38-42` says a new track needs one row there and one in `MUSIC_TRACKS`. These are the rows
for the top CC0 pick in each slot whose published file needs no seam edit, in that file's own format,
with lengths measured and byte counts as published. Cyberpunk Beauty qualifies on the same test and
is left out only because Dark City is the stronger pick in the same slot. **Sizes are the published file, not a re-encode, so they will
change**; the re-encoded byte count is the one that belongs in the committed row.

| File | Track | Author | License | Source | Length | Size |
| --- | --- | --- | --- | --- | --- | --- |
| `crisis.mp3` | Contemplation | Joth | CC0 1.0 | <https://opengameart.org/content/contemplation-0> | 2:00 | 2,405,271 B as published |
| `era-classical.ogg` | Experimenting with Greek instrument samples (`greek instruments.ogg`) | Spring Spring | CC0 1.0 | <https://opengameart.org/content/experimenting-with-greek-instrument-samples> | 1:40 | 2,270,950 B as published |
| `era-medieval.mp3` | GrassLands Theme | DST | CC0 1.0 | <https://opengameart.org/content/grasslands-theme> | 2:44 | 6,576,546 B as published, re-encode |
| `era-cyberpunk.mp3` | Dark City | cinameng | CC0 1.0 | <https://opengameart.org/content/dark-city-0> | 2:00 | 4,800,260 B as published, re-encode |

**And the shape a CC-BY row needs, which is different and is where §6.1 says a project breaches
while believing it complied.** The attribution has to carry the creator, a link to the material, a
link to the licence, **and an indication that changes were made**:

| File | Track | Author | License | Source | Length | Size |
| --- | --- | --- | --- | --- | --- | --- |
| `era-atomic_age.mp3` | Vibing Over Venus | Kevin MacLeod (incompetech.com) | **CC-BY 4.0** (<http://creativecommons.org/licenses/by/4.0/>). **Loop-trimmed and re-encoded by us; the original is unmodified at the source URL.** ISRC USUAN2300005 | <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Vibing%20Over%20Venus.mp3> | 6:51 | 8,225,055 B as published, re-encode |

Incompetech's ISRC numbers are worth carrying into the row: the FAQ's stated purpose for them is
that *"if someone challenges your claim to use my music... you can respond with this number to show
where the track came from"* (quoted), which is provenance of exactly the kind `CREDITS.md:4-6`
exists to hold.

---

## 10. What this document does not decide

1. **Whether any candidate sounds good, or matches the theme.** That is the lead's call and it is
   the reason this is a shortlist. Nothing here was listened to.
2. **Whether the crisis is one track or four.** §4 above shows the question is genuinely open, in
   the brief and in the code, and gives candidates both ways.
3. **Whether CC-BY is acceptable.** **Three era slots (3, 8 and 9) and two crisis slots have their
   best candidate under CC-BY 4.0**, so this stops being a preference question: refusing CC-BY sends
   eras 3 and 8 to generation and leaves era 9 with Etirwer and a 21 dB taper. §6.1 says CC-BY is
   *"usable, with a real cost"*, and the cost is now itemised per row.
4. **Whether the two shipped tracks are re-homed to eras five and six.** §7.1 poses it, one hour of
   listening settles it, and it could remove two acquisitions.
5. **Whether the crisis entry cross-fades or cuts.** §3 above reports that the brief and the shipped
   player disagree; the buying consequence is stated, the resolution is not mine.
6. **Whether §4 era 3's metal-at-the-seam move survives §2 property 1.** §7 above reports the
   tension. It needs a ruling before era three is acquired or generated.
