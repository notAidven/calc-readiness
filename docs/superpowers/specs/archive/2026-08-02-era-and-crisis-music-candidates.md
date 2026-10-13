# Era and crisis music: the candidate shortlist

**Date:** 2026-08-02
**Status:** shortlist, for the team lead to judge. **Nothing was acquired, nothing was downloaded
into the repository, and no audio file is added by this change.** Every candidate below is a URL
and a set of measurements.
**Measured at:** `integration` `a71b25ce`. Repository claims carry a file and a line read at that
SHA; catalogue claims carry the date they were run, which is 2026-08-02.
**Governing document:** `docs/superpowers/specs/2026-08-01-era-and-crisis-music-brief.md`, read as
binding and **not** restated here. Section numbers below in the form "§4 era two" refer to it.

---

## 0. What this is, and the two things it deliberately is not

The brief is the specification. This is the first pass that tries to **buy** from it, and it
reports what the catalogues actually hold against what each entry actually asks for.

**It does not decide anything.** Theme fit and whether a track sounds good are the lead's, and so
is the §2 tenth-pass test, which is the one test in the brief that cannot be mechanised. What is
settled here is narrower and it is settled properly: **the licence, per asset**, and **the
measurable half of §1 and §2** — length, dynamic range, whether the wrap point is silent or steps
in level, whether there is a loudness startle, whether the loop crescendos, and a coarse pulse
estimate.

**Nobody listened to any of it.** That sentence is doing the same work as its counterpart at
§6.3's table head and it should be read the same way. A measurement is not an audition: it cannot
tell you whether a track is carried by a tune or by a texture (§2 property 2), whether the ear can
learn to expect something in it (§2 property 1), or whether a candidate reads as its era's
signature move rather than its period costume (§3). Where a candidate's risk is of that kind, the
entry says so and names what to listen for.

### 0.1 The method, and its self-check

**Licences** were read per asset, which is what `apps/web/public/audio/CREDITS.md:13-17` requires.
For OpenGameArt that is the structured `field-name-field-art-licenses` block on the asset's own
page. **The reader was self-checked against the committed record before it was used**: it returns
`CC0` for `town-theme-rpg`, `CC0` for `a-new-town-rpg-theme`, `CC0` for `magic-town` and
`OGA-BY 3.0 + CC0` for `feel-good-island`, which is exactly what `CREDITS.md:13-17` and `:26-29`
and `:44-49` already record, including the rejection.

**Measurements** came from `ffprobe` and `ffmpeg`'s `ebur128` filter plus a PCM decode, run on the
candidate file itself, downloaded to a scratch directory outside the repository. **That pipeline
was self-checked the same way**: `TownTheme.mp3` measures 1,316,581 B and 97.5 s, matching
`CREDITS.md:28` (1,316,581 B, 1:37) and `music.ts:101-102` (`seconds: 97`); `025_A_New_Town.mp3`
measures 766,291 B and 62.3 s, matching `CREDITS.md:29` and `music.ts:112-113`.

**What each number means, and what it does not.**

| Reported as | Is | Is not |
| --- | --- | --- |
| **Length** | Decoded duration, so it includes any silence the file carries | The musical length |
| **LRA** | EBU R128 loudness range in LU. §2 property 4 wants this narrow | A judgement about whether a quiet passage is intrusive |
| **Lead / tail silence** | Seconds at each end below the noise floor. **This is the §2 property 5 defect, measured** | Proof the rest of the file is seamless |
| **Seam level** | dB between the last 50 ms and the first 50 ms. Near zero means the wrap does not step | A guarantee the harmony resolves across the wrap |
| **Seam step** | Absolute sample difference across the wrap, normalised. **0.02 is the threshold used throughout**, and anything above it is treated as a click to be crossfaded out | Anything about musical continuity |
| **Drift** | Median loudness of the second half minus the first. Positive is a crescendo across the loop, which §5.2 bans outright | A judgement about arrangement |
| **Loudest 1 s** | dB above the median second. A large figure is a §1.1 item 4 startle candidate | A startle; it flags where to listen |
| **Pulse** | Onset-envelope autocorrelation. **A coarse estimate that octave-errors freely**, so read 176 bpm as "88 or 176" | A tempo. Where it disagrees with a published BPM, believe the publisher |

The pulse *strength* figure is the more useful of the pair: high means strongly gridded, low means
the estimator could not find a pulse, which is what §5.2 wants of the crisis and §4 era one wants
of era one.

---

## 1. The tree moved under the brief, and here is where it stands now

The brief was measured at `3b655728`, when nothing selected a second track. **That is no longer
true and it changes what "the shortfall" means.**

`apps/web/src/audio/eraMusic.ts` now holds a slot per era and a slot per crisis, resolves a scene
with `crisis(activeCrisisEra) ?? era(cityEra)` (`:311-323`), and derives each slot's track id
rather than writing it down (`:125-132`). `musicSlots()` returns twenty slots (`:344-359`),
`standingInSlots()` derives which ones are borrowing by reading `MUSIC_TRACKS` (`:370-372`), and
`eraMusic.test.ts:140-152` asserts that every scene resolves to a track that actually ships — which
is the assertion a slot pointing at a missing file runs into.

**So the fourteen are these ids, and a candidate is only useful if it can be registered under one
of them:**

| Stage | Slot | Track id |
| --- | --- | --- |
| One | Crisis, Hard Winter | `crisis-prehistoric` |
| One | Era 1 | `era-prehistoric` |
| One | Era 2 | `era-neolithic` |
| Two | Era 3 | `era-bronze_age` |
| Two | Era 4 | `era-classical` |
| Two | Era 5 | `era-medieval` |
| Two | Era 6 | `era-renaissance` |
| Two | Era 7 | `era-industrial` |
| Three | Era 8 | `era-atomic_age` |
| Three | Era 9 | `era-information_age` |
| Three | Era 10 | `era-cyberpunk` |
| With its era | Crisis, Succession | `crisis-classical` |
| With its era | Crisis, Plague | `crisis-renaissance` |
| With its era | Crisis, Intrusion | `crisis-information_age` |

The other six slots are the shelved crises (`eraMusic.ts:207-256`) and owe nothing.

### 1.1 §5 is still open, and the code is the reason it is still open

`eraMusic.ts:64-73` records the shape as **"Assumed: one per crisis"**, and immediately says the
other reading "is expressible with no change of shape". The brief's §5.1 recommends **one shared
track** and rules four out with reasons. **A recommendation in a brief and an assumption in a
module are not a decision**, and nothing in the tree records one being made, so this document
presents the crisis both ways: §2.1 shortlists a shared, period-neutral track, and §4 shortlists
per-crisis candidates for whichever of the four the lead wants separated.

**One measured note in favour of §5.1, which the brief could not have had.** The shared-track
search produced **three candidates, all three inside §5.2's 120–240 second band**. The four-way
search produced
**six across three slots and nothing at all for the fourth**, and of the six, four are ruled out on
length by their own entry (49 s, 82 s, 100 s and 105 s against a 120-second floor) before anyone
listens to them. That asymmetry is not about taste. A period-neutral bed with no events in it is a
thing free catalogues hold in quantity; "a room of people deciding, whose key goes up" is not a
thing anyone stocks.

### 1.2 The brief's own repository citations have drifted, and here is the mapping

`music.ts` and `eraMusic.ts` both landed after the brief was written, so **most of its audio-layer
line references no longer resolve.** Nothing in the brief is wrong; the file moved under it. Checked
at `a71b25ce`:

| The brief says | At this tip | What it is |
| --- | --- | --- |
| `music.ts:59-82` | `:93-116` | `MUSIC_TRACKS` |
| `music.ts:69` | `:103` | the 97-second note §2 property 3 quotes |
| `music.ts:80` | `:114` | the 62-second note |
| `music.ts:88` | `:128` | `DEFAULT_TRACK_ID` |
| `music.ts:189` | `:296` | `element.loop = true` |
| `music.ts:242` | `:364` | the app-wide player |
| `CREDITS.md:27-28` | `:28-29` | the two shipped rows |
| `CREDITS.md:30-35` | `:44-49` | the verified-but-unshipped candidate and the two size rejections |
| `eraDressing.ts:140`, `:171` | `:142`, `:173` | the two authored dressing rows |
| `eraDressing.ts:240`, `:251` | `:258`, `:269` | the two advisor rows |
| `islandGround.ts:372-374` | unchanged | `ERA_ISLAND_GROUND`, still one key |

Two claims in the brief that depend on those lines have also changed in substance, and both are
changes for the better: `MUSIC_TRACKS` is no longer *"the single selector"*, because `eraMusic.ts`
selects; and §0a's *"the Hard Winter runs today with `town-theme.mp3` still looping underneath it"*
is now true for a different reason. It is not that nothing switches — the switch exists and
`eraMusic.ts:117-119` deliberately makes an unscored crisis leave the music alone. **The tonal error
§0a names is still live, and it is now a decision with a stated rationale rather than a gap.**
Acquiring the crisis track is what retires it either way.

---

## 2. Stage one, per §7.2

### 2.1 The crisis track, shared — §7.2 item 1

**The entry is §5.2**: period-neutral, no countable pulse or under 60, no percussion with a pulse,
120 to 240 seconds, quieter and slower than the era track it replaces, and settled.

**A finding to read before the three candidates, because it is the reason there are only three.**
Searching a free catalogue for crisis music returns horror. Not as a tendency — as the category.
On OpenGameArt the CC0 music results for `drone` are led by `Abandon Hope`, `Downfall`,
`Overshadow` and `Dissonance Anthem`; on Incompetech, filtering the catalogue's own `description`
and `feel` fields for drone and pad material returns the seven-part `Ossuary` series ("at the
intersection of relaxation and horror"), `Ice Demon` ("hollow creepy background pad"), `Redletter`
("high strings crescendo and quickly cut") and `Spider Eyes` ("eerie soundscape… dissonant
non-percussive piano textures"). **Read those three descriptions against §1.1 and they name three of
its six devices between them in the vendor's own words**: a crescendo that cuts (item 2, the
unresolved riser), sustained dissonance (item 3) and the cut itself (item 4, the startle). The brief
predicted the instinct would be wrong; measured, the instinct is also what the catalogue is stocked
with, so the filter has to be applied to every result rather than trusted to the search.

---

**Candidate A — Contemplation, by Joth.** <https://opengameart.org/content/contemplation-0>

- **Licence: CC0 1.0**, read on the asset page 2026-08-02. No attribution obligation. Draft row:

  | File | Track | Author | License | Source | Length | Size |
  | --- | --- | --- | --- | --- | --- | --- |
  | `crisis.mp3` | Contemplation | Joth | CC0 1.0 | <https://opengameart.org/content/contemplation-0> | 2:00 | *re-encode first* |

- **Fit.** The author's own description is *"No real melody or focus here, just ambience"*, which is
  §2 property 2 stated by the person who made it. Nothing in the instrumentation dates it, so it
  clears §5.1's period-neutrality requirement — the constraint that narrows this search more than
  any other. Against §1: drift +1.9 dB, so it does not crescendo across the loop, and the loudest
  second sits only 7.0 dB over the median, so there is no obvious startle to find.
- **Measured.** 120.1 s · mp3 160 kbps · 2,405,271 B · LUFS −26.8 · LRA 6.8 · lead 0.16 s ·
  tail 0.0 s · seam +73.6 dB · step 0.0001 · pulse ~167 bpm at strength 0.499.
- **Loop: needs an edit, and a small one.** The 0.16 s of lead silence is what produces the 73.6 dB
  seam figure — the file ends at level and restarts from nothing, so it gaps once every two
  minutes. Trim the lead, re-encode to Ogg per §2 property 5. **Length is right first time**, which
  is rarer than it sounds.
- **Listen for.** The pulse estimator found periodicity at strength 0.499, the highest of the three.
  That may be a slow repeating figure rather than a beat, but §5.2 says no percussion with a pulse
  and this is the one candidate where the measurement cannot settle it.

**Candidate B — Global Resonance, by Eponasoft.**
<https://opengameart.org/content/global-resonance>

- **Licence: CC0 1.0**, read on the asset page 2026-08-02. The author's note is that the game it was
  written for was never finished, *"and thus this track is released into the public domain"*.
- **Fit.** Pulse strength 0.108 — the estimator essentially could not find a beat, which is §5.2's
  *"ideally no countable pulse at all"* measured rather than hoped for. Longest of the three at
  2:37, inside the 120–240 band. Offered as **Ogg**, which §2 property 5 explicitly prefers over
  mp3 because the padding is declared rather than baked in.
- **Measured.** 157.4 s · Ogg Vorbis 149 kbps · 2,936,833 B · LUFS −19.8 · LRA 9.3 · lead 0.0 s ·
  tail 0.14 s · seam −41.6 dB · step 0.0044 · pulse ~46 bpm at strength 0.108.
- **Loop: needs a small tail trim.** 0.14 s.
- **Against it.** LRA 9.3 is the widest of the three and §2 property 4 wants narrow; the quietest
  second sits 17.4 dB below the median, so there is a real hole in it. Whether that hole is "space"
  (§1.2 wants space) or "a passage the learner reaches for the volume during" is exactly the
  judgement a measurement cannot make.

**Candidate C — Station Drone 2, by Tozan.** <https://opengameart.org/content/station-drone-2>

- **Licence: CC0 1.0**, read on the asset page 2026-08-02.
- **Fit.** The weakest pulse of anything measured for this slot (strength 0.08) and the longest at
  3:10, so it is the candidate that best answers §5.2's *"long, because a crisis is where a learner
  is most likely to be concentrating hard"*. 1.4 MB as delivered, so it is also the only one that
  needs no size work.
- **Measured.** 190.6 s · Ogg Vorbis 61 kbps · 1,460,862 B · LUFS −30.3 · LRA 6.5 · lead 0.1 s ·
  tail 1.08 s · seam −51.7 dB · step 0.0 · pulse ~115 bpm at strength 0.08.
- **Loop: needs an edit at both ends.** 0.1 s lead and 1.08 s tail.
- **Two things against it, and the first is disqualifying if it is true.** The author describes it
  as a drone with *"strange sound effects"*. A sound effect inside a loop is a §1.1 item 4 startle
  and a §2 property 1 event at once, and it is the single most likely way this candidate fails.
  Someone has to listen for it. Second, at LUFS −30.3 it sits 17 dB below the shipped house track,
  so on the same volume slider it would be close to inaudible; it needs normalising toward −20 LUFS,
  which is fine under CC0 but is a second edit.

**The CC-BY alternates, listed because the crisis is the hardest slot and the pool is thin.** Two
Incompetech tracks clear §1 on their published metadata: **Immersed** (Piano and Strings, 64 bpm,
*"minimal and somewhat droney in parts, this has a beautiful calmness about it"*, 249.0 s, LRA 9.3)
and **Thunderbird** (Bass Flute, Synths, Percussion, published BPM **0** meaning no countable
pulse, feel *Somber, Relaxed, Mystical, Calming*, 361.6 s). Both are **CC BY 4.0** and both need a
multi-second tail cut (2.6 s and 4.26 s), so both trigger the indicate-changes obligation at §6.1.
`Immersed` also has a +3.5 dB second-half drift, which is a crescendo across the loop and is on
§5.2's must-not list. Attribution format is in §5.2 of this document.

### 2.2 Era 1, prehistoric — §7.2 item 2

**NOT SHORTLISTED. This is a named gap, and it is the most important one in the document, because
§7.2 makes it the anchor of the whole ladder.**

The brief predicted era one would be *"finding one that is not a cliché"* rather than finding one
at all. Measured, it is worse than that, and the reason is structural. **§4 era one's signature
move is that nothing repeats identically.** A game-music library sells loops. A loop is a bar that
repeats identically. So the property era one is defined by is the property the catalogue is
constitutionally unable to stock, and no search facet, tag or keyword expresses it. See §6 item 1.

The two least-bad results are recorded so nobody re-finds them and thinks they are new:

- **Tribal, by Of Far Different Nature** (<https://opengameart.org/content/tribal>, **CC0 1.0**) is
  the brief's own §6.3 row and it measures well on paper: 192.2 s, LRA 2.7, pulse ~66.7 bpm which is
  dead centre of era one's 60–72 band, 0.96 s tail to trim, 7.7 MB at 320 kbps to re-encode.
  **Two things stop it.** Its tags are `bush people`, `hoo`, `voice samples` and `hip hop`, and §4
  era one bans intelligible voice and bans any instrument that names a specific living culture; and
  its pulse strength is 0.477, meaning a firm grid, which is §4 era two's idea arriving four
  thousand years early — precisely the pastiche §3 exists to refuse.
- **Ras Quarry, by Bobjt** (<https://opengameart.org/content/ras-quarry>, **CC0 1.0**) has the
  cleanest wrap in the group — 162.5 s Ogg with no silence at either end, unlike `Tribal`, a −4.6 dB
  seam and a 0.004 step — and the author dedicates it to *"prehistoric ancient technological human
  civilization"*. But it is
  a synthesiser platformer theme with a beat, not struck and shaken things, and §4 era one bans
  drone synthesiser outright.

**Recommendation: generate era one.** See §7.

### 2.3 Era 2, neolithic — §7.2 item 3

**The brief's §6.5 count reproduced exactly on a fresh run**: CC0 music results on the first page
for `pastoral` = 1, `harvest` = 2, `farm` = 4, against `village` = 24. The abundance is real and it
is in the wrong era, as recorded.

**Candidate A — Krakatoa, by Kistol.** <https://opengameart.org/content/krakatoa>

- **Licence: CC0 1.0**, read on the asset page 2026-08-02. Draft row:

  | File | Track | Author | License | Source | Length | Size |
  | --- | --- | --- | --- | --- | --- | --- |
  | `era-neolithic.ogg` | Krakatoa | Kistol | CC0 1.0 | <https://opengameart.org/content/krakatoa> | 1:12 | 1,136,376 B |

- **Fit, and it is the strongest era-two argument found.** Marimba and percussion. §4 era two asks
  for era one's kit *plus the first pitched, tuned, repeatable thing*, and a marimba is exactly
  that; and the entry's whole point is that **era two is where the loop is invented**. The
  measurement supports it rather than merely permitting it: pulse strength 0.709, the most firmly
  gridded thing in the era-one and era-two pools, which is the era's statement rather than a defect.
- **Measured.** 72.0 s · Ogg Vorbis 126 kbps · 1,136,376 B · LUFS −15.9 · LRA 2.3 · lead 0.0 s ·
  tail 0.0 s · seam −11.0 dB · step 0.0023 · pulse ~120 bpm at strength 0.709.
- **Loop: clean as delivered, and the author's claim checks out.** He writes *"This track should
  loop 'seamlessly'"*; measured, there is no silence at either end and the sample step across the
  wrap is 0.0023, well below the click threshold. It is one of the very few files in this whole
  survey that needs no edit at all.
- **Two flags, both real.** 72 s is under §4.0's 90-second floor and well under era two's own
  100–180. And ~120 bpm is above §4.0's 60–100 band and far above era two's 72–84 — though the
  estimator octave-errors, so this may be a 60 bpm piece counted double, and the publisher gives no
  BPM to check against. It is also tagged `tribal`, so §7.2's rule applies with force: **it must be
  auditioned against era one's track and rejected if it does not separate audibly from it.**

**Candidate B — Slow Heat, by Kevin MacLeod.** Catalogue entry:
<https://incompetech.com/music/royalty-free/music.html> (filter to "Slow Heat"). Audio:
<https://incompetech.com/music/royalty-free/mp3-royaltyfree/Slow%20Heat.mp3>

- **Licence: CC BY 4.0.** Attribution is required and the author specifies its exact wording; see
  §5.2 of this document. Draft row:

  | File | Track | Author | License | Source | Length | Size |
  | --- | --- | --- | --- | --- | --- | --- |
  | `era-neolithic.ogg` | Slow Heat | Kevin MacLeod (incompetech.com) | **CC BY 4.0** — "Slow Heat" Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 4.0, <http://creativecommons.org/licenses/by/4.0/>. **Trimmed and re-encoded by us** | <https://incompetech.com/music/royalty-free/music.html> | 3:42 | *re-encode first* |

- **Fit.** Percussion and marimba only, published at 58 bpm, and the author describes it as *"very
  simple polyrhythms and polymelodies"* — a plain repeated figure with nothing decorative on it,
  which is §4 era two's *"the repetition is the point rather than a limitation"*. LRA 5.3.
- **Measured.** 222.5 s · mp3 320 kbps · 8,901,415 B · LUFS −22.0 · LRA 5.3 · lead 0.02 s ·
  tail 3.28 s · seam −107.5 dB · step 0.0 · pulse ~58 bpm at strength 0.491.
- **Loop: needs a real edit.** It fades to 3.28 s of digital silence, which is the standard shape of
  this catalogue (see §5.1). The edit is not a trim, it is cutting the fade and building a wrap
  point, and under CC BY 4.0 the result must say in `CREDITS.md` that changes were made.
- **Against it.** 58 bpm is under §4.0's 60–100 band and under era two's own 72–84 — it is slower
  than era one wants to be, which inverts the ladder at the one seam §3 says carries the most
  weight.

**Candidate C — Spring's Pastorales (movement IV), by Spring Spring.**
<https://opengameart.org/content/springs-pastorales>

- **Licence: read as `CC-BY-SA 4.0 + CC-BY-SA 3.0 + CC0`** on the asset page 2026-08-02. Under
  OpenGameArt's FAQ this is usable as CC0, which is the reading §6.4 sets out and explicitly leaves
  to the audio owner. **It is listed here as a candidate and flagged as a licence decision, not
  presented as a clean CC0.** If the standing rule holds unchanged, this row drops out.
- **Fit.** The `pastoral` search returns exactly one result and this is it. Movement IV is
  chiptune-and-sample folk with a steady figure under it; §4 era two wants a settled pulse where era
  one had none.
- **Measured** (movement IV). 144.0 s · Ogg Vorbis 144 kbps · 2,584,464 B · LUFS −15.5 · LRA 6.0 ·
  lead 0.0 s · tail 0.0 s · seam −4.8 dB · step 0.0043 · pulse ~100 bpm at strength 0.504.
- **Loop: clean as delivered.** No silence at either end, seam within 4.8 dB, no click. Movement II
  is also clean (147.5 s, seam −20.7 dB) but has a larger step at 0.014.
- **Against it.** The author's own note is *"Not real pastorales, but I had to call them
  something"*, so the pastoral read is a title rather than a property; and the licence question
  above has to be answered before it can ship.

**Excluded from era two, with reasons.** `GrassLands Theme`
(<https://opengameart.org/content/grasslands-theme>, CC0) is the brief's §6.3 row and it is
**era five in sound**: its tags are `Classical, bells, horn, medieval, overworld, strings` and the
author calls it *"a mild medieval openworld type music"*. That is §6.5's own finding confirmed on
the specific asset. `Lost in the meadows` (OGA-BY 3.0 + CC0) is FLAC only, ends in 4.0 s of
silence, and measures LUFS −30.5 with LRA 10.1.

---

## 3. Stage two, per §7.3 — one per era, when its land is authored

These are recorded now so the search does not have to be repeated, but §7.3 is explicit that
**nothing here should be bought before that era's land exists**, and none of these eras has an
authored ground row (`apps/web/src/city/islandGround.ts:372-374` holds one key).

### 3.1 Era 3, Bronze Age — `era-bronze_age`

**NOT SHORTLISTED. Named gap, and the least shoppable entry in the brief.** Fresh counts on
2026-08-02, CC0 music, first page: `bronze` = **0**, `harbor` = **0**, `trade` = **0**,
`merchant` = **0**, `singing bowl` = **0**, `gong` = **1** (a game-over sting). The two rows the
brief lists were measured and neither survives its own entry: `Desert Settlement` is 304.5 s of
post-apocalyptic acoustic-guitar music with 6.98 s of trailing silence, and `Ali Khan's Palace` is
a slow piano jazz theme with an 85.0 dB seam mismatch and a step of 0.0252. Both carry exactly the
imported geography §6.5 warns about, and neither has metal in it.

Two near-misses, for completeness rather than as candidates:

- **Merchants and Sea Salt, by NBJDLukasAbsolute**
  (<https://opengameart.org/content/merchants-and-sea-salt>, **CC0 1.0**). The only result in either
  catalogue that answers era three's *harbour*: *"A theme that sounds similar to a port-town"*.
  102.9 s, WAV only at 19,748,612 B so it must be encoded; seam is genuinely clean (no lead or tail
  silence, −8.4 dB, step 0.0206). **But its tags are `medieval, pirate, sail`**, so on the evidence
  available it is era five wearing a harbour, which is the same error as `GrassLands Theme`.
- **Relics of Past, by Centurion_of_war** (<https://opengameart.org/content/relics-of-past>,
  **CC0 1.0**), 72.0 s Ogg, clean seam, *"a small classical-ish music piece, using some odd
  instruments, for something like a temple or holy area"* — and the odd instrument is a sitar. Same
  geography problem, under half the required length.

**Recommendation: generate era three.** See §7.

### 3.2 Era 4, Classical — `era-classical`

Thin but not empty. `greek` returns 1, `lyre` returns 0, `antiquity` returns 0.

**Candidate A — Experimenting with Greek instrument samples (`greek instruments.ogg`), by Spring
Spring.** <https://opengameart.org/content/experimenting-with-greek-instrument-samples>

- **Licence: CC0 1.0**, read on the asset page 2026-08-02.
- **Fit.** The brief's own note stands: it is the nearest thing in the library to era four's
  instrument list. Plucked strings and reeds at chamber scale, which is what §4 era four asks for
  and specifically not orchestral. 100.9 s, LRA 7.0.
- **Measured.** 100.9 s · Ogg Vorbis 180 kbps · 2,270,950 B · LUFS −15.6 · LRA 7.0 · lead 0.0 s ·
  tail 0.0 s · seam +8.1 dB · **step 0.1456** · pulse ~79 bpm at strength 0.524.
- **Loop: needs an edit, and the edit is a crossfade rather than a trim.** There is no silence at
  either end, which is good, but the sample step across the wrap is 0.1456 — seven times the
  audible-click threshold of 0.02. It will tick once per pass until somebody crossfades the join.
- **Note.** The submission's other file, `greek boss battle.ogg`, is a battle cue and is out on §1.
  Take the pair as one licence verification and one usable file.

**Candidate B — Minimalistic Flute & Strings Tune, by Spring Spring.**
<https://opengameart.org/content/minimalistic-flute-strings-tune>

- **Licence: CC0 1.0**, read on the asset page 2026-08-02.
- **Fit.** Tagged `Minimalist, ensemble, flute, plucked, strings, loop`. §4 era four wants plucked
  strings, a soft double reed and light frame percussion marking the module, at 80–92 and unhurried;
  the measured pulse is ~94 bpm at strength 0.707, which is a firm, even module — era four's
  *"fixed-length phrase repeated at an exactly constant spacing"* is the one signature move in the
  set that a high pulse-strength reading is evidence **for**. Longest era-four candidate at 3:15.
- **Measured.** 194.6 s · Ogg Vorbis 153 kbps · 3,715,398 B · LUFS −20.0 · LRA 8.0 · lead 0.0 s ·
  tail 0.0 s · seam −4.4 dB · step 0.0407 · pulse ~94 bpm at strength 0.707.
- **Loop: needs a crossfade, not a trim.** There is no silence at either end and the level match is
  good at −4.4 dB, but the sample step is 0.0407 — twice the 0.02 threshold, so it will click.
- **Against it.** The tag list includes `davul`, a Turkish frame drum. That is not era four's
  geography and it is the same class of error §6.5 names for era three.

**No third candidate.** The CC-BY option is `Lamentation` (Kevin MacLeod, solo harp, 197.6 s,
61 bpm), and it is listed only to be rejected: the affect is grief, era four is *even and
unhurried*, its LRA is 9.2 with a +2.6 dB drift, and it ends in 6.68 s of silence.

### 3.3 Era 5, Medieval — `era-medieval`

**The best-served slot in the run.** Three candidates, all defensible.

**Candidate A — Hush Hamlet (`hush_hamlet_loop.wav`), by Zane Little Music.**
<https://opengameart.org/content/hush-hamlet>

- **Licence: CC0 1.0**, read on the asset page 2026-08-02. Draft row:

  | File | Track | Author | License | Source | Length | Size |
  | --- | --- | --- | --- | --- | --- | --- |
  | `era-medieval.ogg` | Hush Hamlet | Zane Little Music | CC0 1.0 | <https://opengameart.org/content/hush-hamlet> | 1:36 | *re-encode first* |

- **Fit.** *"A cozy little town theme. It's always quiet in Hush Hamlet."* Era five is a walled town
  and its energy is moderate; this is at the calm end of that.
- **Measured.** 96.0 s · WAV · 36,864,210 B · LUFS −17.3 · LRA 6.0 · lead 0.0 s · tail 0.0 s ·
  seam −16.5 dB · **step exactly 0.0** · pulse ~75 bpm at strength 0.294.
- **Loop: the cleanest seam measured anywhere in this survey.** The submission ships a dedicated
  `_loop` variant, which is the property §2 property 5 asks for, and the measurement confirms it
  rather than taking the filename's word: no silence at either end and a sample step of exactly
  zero. **It must be encoded** — 36.9 MB WAV becomes roughly 1.5 MB as Ogg — and CC0 permits that
  with no obligation.
- **Against it.** 75 bpm is under era five's 84–96. And it is a **town theme**, which is the same
  genre as both tracks already shipping, so it collides directly with §7.1's open question: if
  `town-theme.mp3` turns out to be era five's, this candidate is redundant. **Settle §7.1 before
  buying this one.**

**Candidate B — Thatched Villagers, by Kevin MacLeod.** Catalogue entry:
<https://incompetech.com/music/royalty-free/music.html> (filter to "Thatched Villagers").
Audio: <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Thatched%20Villagers.mp3>

- **Licence: CC BY 4.0**, attribution as §5.2.
- **Fit.** Guitar, Recorder, Percussion, Dulcimer — era five's plucked-and-piped family without a
  synthesiser in it. Published at 95 bpm, measured at ~94: **inside era five's 84–96 band**, which
  no other candidate for this slot manages. 4:05 is the longest, and §2 property 3 wants long.
- **Measured.** 245.2 s · mp3 320 kbps · 9,808,523 B · LUFS −12.4 · LRA 5.6 · lead 0.02 s ·
  tail 0.02 s · seam −3.2 dB · step 0.0 · pulse ~94 bpm at strength 0.661.
- **Loop: clean as delivered, and that is genuinely unusual for this source.** It is one of only
  **two** files out of twenty-four measured from this catalogue that carries no silence to trim
  (§5.1). No trim needed, so **no change is made and the CC-BY indicate-changes clause is not
  triggered** — except by the re-encode, which is a change and should be recorded anyway.
- **Against it.** Feel is published as *Bouncy, Bright*, and pulse strength 0.661 is a strong grid.
  §4 era five bans tavern-jig idiom and harvest-festival jollity by name. **This is the candidate
  most likely to fail on the ear**, and it is the one whose numbers are best.

**Candidate C — Village Consort, by Kevin MacLeod.** Catalogue entry:
<https://incompetech.com/music/royalty-free/music.html> (filter to "Village Consort").
Audio: <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Village%20Consort.mp3>

- **Licence: CC BY 4.0**, attribution as §5.2.
- **Fit.** Guitar, Recorders, Gemshorn, Drums at 95 bpm. The author says outright it is *"the kind
  of music we think they played back in the day"* and not authentic, which is honest and is also
  the warning: §3 says take the era's move, not its costume, and this is the costume.
- **Measured.** 214.8 s · mp3 256 kbps · 6,876,000 B · LUFS −9.3 · LRA 6.1 · lead 0.02 s ·
  tail 0.32 s · seam −47.3 dB · step 0.0001 · pulse strength 0.187.
- **Loop: needs a 0.32 s tail trim**, which is what the −47.3 dB seam figure is reporting.
- **Against it.** LUFS −9.3 is loud — 3.7 dB above the shipped house track — so it would arrive as
  a step up in level at the era boundary unless it is normalised.

**A gap inside a served slot, worth naming.** §4 era five asks for **one bell**, tolled, never on a
beat you expected, and placed away from the loop point. **No candidate has one.** That is an
arrangement instruction rather than a search term, and it is not buyable; see §6 item 2.

### 3.4 Era 6, Early Modern — `era-renaissance`

The brief's §6.5 conclusion — search by repertoire, not by mood — is correct and it is the reason
this slot works.

**Candidate A — "If my complaints could passions move" (Dowland, 1597), rendered by Of Far
Different Nature.**
<https://opengameart.org/content/historic-renaissance-music-from-1597-if-my-complaints-could-passions-move-by-john-dowland>

- **Licence: CC0 1.0**, read on the asset page 2026-08-02. The composition is public domain and the
  uploader dedicates **his own render** to CC0 as well, which is the combination §6.2 says Musopen
  promises and rarely delivers. Draft row:

  | File | Track | Author | License | Source | Length | Size |
  | --- | --- | --- | --- | --- | --- | --- |
  | `era-renaissance.ogg` | If my complaints could passions move (Dowland, 1597) | Of Far Different Nature, after John Dowland | CC0 1.0 | <https://opengameart.org/content/historic-renaissance-music-from-1597-if-my-complaints-could-passions-move-by-john-dowland> | 2:41 | *re-encode first* |

- **Fit, and it is the single best match in the document to its entry.** §4 era six wants a small
  consort with real voice-leading, antecedent and consequent phrases, and a piece that is *resolved
  before it begins*. A 1597 Dowland setting is that by construction rather than by resemblance.
- **Measured.** 161.5 s · mp3 320 kbps · 6,460,674 B · LUFS −11.7 · **LRA 1.8** · lead 0.02 s ·
  tail 3.12 s · seam −91.3 dB · step 0.0 · pulse strength 0.423.
- **LRA 1.8 is the second-narrowest of the 108 files measured that clear §4.0's 90-second floor**,
  the shipped tracks included, and the one ahead of it is a battle cue. §2 property 4 asks for
  exactly this and no shortlisted candidate reads better against it.
- **Loop: needs a real edit.** The render fades to 3.12 s of silence. Cut the fade, build the wrap,
  re-encode from 320 kbps. All permitted under CC0 with no obligation.

**Candidate B — Sinfonia Number 5, by Kevin MacLeod.** Catalogue entry:
<https://incompetech.com/music/royalty-free/music.html> (filter to "Sinfonia Number 5").
Audio: <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Sinfonia%20Number%205.mp3>

- **Licence: CC BY 4.0**, attribution as §5.2. Note the FAQ's own line: the compositions may be
  public domain but *"these recordings are not"*.
- **Fit.** Solo harpsichord, 71 bpm, Bach's three-part invention. §4 era six wants *the first time
  in the run the texture is genuinely polyphonic* with independent lines, and a three-part invention
  is precisely three independent lines and nothing else. The author's own framing — music for a
  *"stuffy aristocratic dinner party"* — is the register era six wants: composed, settled, nothing
  improvised.
- **Measured.** 128.4 s · mp3 320 kbps · 5,139,770 B · LUFS −14.3 · LRA 2.5 · lead 0.28 s ·
  tail 1.84 s · seam +20.6 dB · step 0.0 · pulse strength 0.159.
- **Loop: needs an edit at both ends**, 0.28 s and 1.84 s.
- **The argument against it is real and it is the lead's to settle.** It is Baroque, not
  Renaissance, and §4 era six bans *"Baroque virtuosity (this era is the drawing, not the display)"*.
  A plainly played invention is arguably the drawing rather than the display, but that is an
  argument, not a measurement. 128 s is also at the very bottom of era six's 120–200.

**Candidate C — Pavane (Fauré), arranged by Bobjt.**
<https://opengameart.org/content/pavane-faure>

- **Licence: read as `CC-BY 3.0 + CC0`** on the asset page 2026-08-02. Multi-licensed, so §6.4's
  open question applies exactly as it does to era two's candidate C.
- **Fit.** A pavane is a Renaissance dance form and the arrangement is chamber-scaled.
- **Measured.** 118.8 s · mp3 160 kbps · 2,380,716 B · LUFS −13.1 · LRA 6.7 · lead 0.02 s ·
  tail 0.02 s · seam −7.6 dB · step 0.0011 · pulse strength 0.204.
- **Loop: clean as delivered**, one of the few mp3s in the survey with no silence at either end.
- **Against it, twice.** Fauré wrote it in 1887 — the *form* is Renaissance and the *music* is
  Romantic, which is exactly the "period costume" §3 rules out, only in reverse. And the drift is
  −4.8 dB: the second half sits nearly 5 dB below the first, so the wrap steps **up** in level once
  per pass, which is audible even though the seam-level figure looks fine.

### 3.5 Era 7, Industrial — `era-industrial`

**Shortlisted with a caveat that applies to all three: every candidate is electronic, and §4 era
seven says do not reach for a synthesiser.** Nothing in either catalogue offers era seven's iron
and steam as struck metal and wood. Treat this slot as "served on structure, unserved on timbre".

**Candidate A — Factory ambiance, by yd.** <https://opengameart.org/content/factory-ambiance>

- **Licence: CC0 1.0**, read on the asset page 2026-08-02.
- **Fit.** *"Background track for exploring some industrial complex."* §4 era seven wants a piece
  with **no natural end** — no introduction, no cadence, begins and stops mid-pattern — and ambience
  is that by definition, which is the sense in which the brief's own note that it "may be ambience
  rather than music" is a feature.
- **Measured.** 123.0 s · Ogg Vorbis 162 kbps · 2,485,366 B · LUFS −24.3 · LRA 9.5 · lead 0.0 s ·
  tail 0.0 s · seam −2.1 dB · step 0.0131 · pulse ~100 bpm at strength 0.348.
- **Loop: clean as delivered.** No silence, seam within 2.1 dB, step below the click threshold.
- **Against it.** LRA 9.5 is the widest of the three and the quietest second sits 24.7 dB under the
  median, so there is a substantial hole. §4.0 asks for a silence budget — *at least one bar in
  which almost nothing happens* — so this may be the budget rather than a defect, but 24.7 dB is a
  lot and §2 property 4 is the competing rule.

**Candidate B — A Clockwork, by skrjablin.** <https://opengameart.org/content/a-clockwork>

- **Licence: CC0 1.0**, read on the asset page 2026-08-02. The author adds *"if you want to, I still
  appreciate if you credit me"* — appreciated, not required, and `CREDITS.md` credits CC0 authors
  anyway as a matter of house policy (`:8-11`).
- **Fit.** Pulse strength 0.692 at ~70 bpm: machine-exact repetition with no expression in it, which
  is era seven's *standard part repeated without limit*.
- **Measured.** 65.1 s · Ogg Vorbis 115 kbps · 933,435 B · LUFS −16.6 · LRA 3.7 · lead 0.0 s ·
  tail 0.0 s · seam −19.5 dB · step 0.0039 · pulse ~70 bpm at strength 0.692.
- **Loop: clean as delivered.**
- **Against it.** 65 s is well under §4.0's 90-second floor, and the author calls it *"not quite a
  chiptune, but very electronic in any case"* — which is the timbre caveat above, stated by him.

**Candidate C — Cottages, by Kevin MacLeod.** Catalogue entry:
<https://incompetech.com/music/royalty-free/music.html> (filter to "Cottages"; the catalogue title
is `Cottages` and the file is `Magic Scout - Cottages.mp3`, so attribute it as **Cottages**).
Audio: <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Magic%20Scout%20-%20Cottages.mp3>

- **Licence: CC BY 4.0**, attribution as §5.2 under the title **Cottages**.
- **Fit.** The author's description is the era-seven brief in a joke: *"You know the old phrase 'as
  relaxing as a toaster'? … if a toaster were to make relaxing music"*. A machine that is calm is
  precisely the problem §4 era seven sets, since the entry bans anything reading as a production
  line under strain. 78 bpm, 3:54, the longest of the three.
- **Measured.** 233.8 s · mp3 152 kbps · 4,433,764 B · LUFS −15.2 · LRA 3.5 · lead 0.0 s ·
  tail 0.14 s · seam −51.9 dB · step 0.0247 · pulse strength 0.575.
- **Loop: needs a 0.14 s tail trim** and then a check on the 0.0247 step.
- **Against it.** Synths again, and at 152 kbps it is the lowest-bitrate master offered by that
  catalogue for any track measured here.

---

## 4. The crisis, if it splits four ways rather than one

Presented because §5 is open (see §1.1). **One of the four slots has no candidate at all, and of the
six candidates the other three produce, four are shorter than §5.2's own floor.** That is the
strongest practical argument for §5.1 in the document, and it is arithmetic rather than opinion.

### 4.1 `crisis-prehistoric`, the Hard Winter — the only crisis a learner can enter today

- **Winter Wind, by wipics** (<https://opengameart.org/content/winter-wind>, **CC0 1.0**). 81.8 s ·
  mp3 192 kbps · 1,967,042 B · LUFS −13.3 · LRA 4.5 · tail 1.7 s to cut · seam −99.4 dB · step 0.0.
  A short companion cut (25.3 s) also exists. **For it**: narrow dynamic range, no drift, calm tags.
  **Against it**: 82 s is far under §5.2's 120–240; tagged `Christmas` and `bells`, and a bell in a
  crisis loop is the most learnable event available (§4 era five makes the same point about bells);
  and it is louder than several era candidates, which §1.1 item 6 rules out for a crisis.
- **Long Winter, by Indieteur** (<https://opengameart.org/content/long-winter>, **CC0 1.0**).
  236.6 s · mp3 248 kbps · LRA 5.5 · **lead 3.04 s and tail 8.62 s** · drift +0.3. Right length,
  right restraint, and the seam figure of −0.5 dB is an artefact of both ends being silent rather
  than a good match. **Against it**: the edit is substantial, and the author's own framing —
  *"suitable for sad winter-y kind of games"*, tags `depressing, lonely, sad` — sits close to the
  register §1 warns about. Serious, not sorrowful, is the line.

**Explicitly excluded, and it is the brief's own §6.3 row: Frost in the Northern Winter**
(<https://opengameart.org/content/frost-in-the-northern-winter>, CC0). The author files it as
*"symphonic dark ambient / gothic"* and tags it `Depressed, Mourning, gloomy, dark, dungeon synth`.
Measured, it is worse than the description: **LRA 14.5**, joint widest of the 126 OpenGameArt files
measured, and a **+4.5 dB second-half drift**, which is a crescendo across the loop and is on
§5.2's must-not list by name. It also ends in 10.54 s of silence. **This row should be struck from
the brief's table.**

**Also excluded: Village of Snow** (CC0, 128.0 s, clean seam) — **+5.3 dB drift**, so it crescendos
across every pass; only one file in the whole survey drifts harder. **Cold Silence** (CC0, 354.9 s)
— the author's own description is *"rather unsettling to listen to"* and the tags are
`scary, unsettling`.

### 4.2 `crisis-classical`, the Succession — NO CANDIDATE

Nothing found in either catalogue. The entry asks for *"held strings, a room of people deciding,
nothing destroyed and everything at stake"* against an art brief whose key **goes up** into a hard
white noon. Everything the search surfaces for that description is either thriller tension —
disqualified by §1.1 — or funereal, which is the wrong direction from a crisis whose own art brief
refuses gloom. **This is the cleanest gap in the document**: not a slot where the candidates were
weak, a slot where the search returned nothing to weigh. §7 recommends generating it and sketches
the prompt.

### 4.3 `crisis-renaissance`, the Plague

- **EmptyCity: Background Music, by yd**
  (<https://opengameart.org/content/emptycity-background-music>, **CC0 1.0**). 100.0 s · Ogg Vorbis
  162 kbps · 2,021,058 B · LUFS −29.7 · LRA 6.9 · tail 0.48 s to trim · drift −1.0. **For it**: the
  brief's note holds — *empty* is era six's own word for its crisis — and a −1.0 dB drift means it
  settles rather than lifts, which is §1.2's *"end a period lower than it started"*. **Against it**:
  100 s is under the 120–240 band; the tag list includes `horror`, `sneaking`, `spy` and
  `infiltration`, so it was written as a stealth cue and needs an ear against §1.1 item 3.
- **Town in ruins loop, by HaelDB** (<https://opengameart.org/content/town-in-ruins-loop>,
  **OGA-BY 3.0 + CC0**, so §6.4 applies). 48.9 s · Ogg · LUFS −28.9 · LRA 3.1 · no silence at either
  end · seam +1.7 dB · step 0.0005 · pulse strength 0.089. **The cleanest wrap of any crisis
  candidate**, with a pulse the estimator could barely find, and *"a nice town in ruins"* is the
  entry's own image. **Against it**: 49 s is under half §5.2's minimum, and §5.2 is emphatic that a
  short loop is at its most intrusive during a crisis. It would need doubling by edit first.

### 4.4 `crisis-information_age`, the Intrusion

- **Station Drone 2** — the same candidate as §2.1 C, and the best fit of the four-way set: low,
  beatless, electronic, 190.6 s. All the caveats there apply.
- **Searching, by yd** (<https://opengameart.org/content/searching>, **CC0 1.0**). 104.6 s · Ogg
  Vorbis 162 kbps · LUFS −14.8 · LRA 8.5 · lead 1.06 s and tail 2.16 s to cut. Tagged
  `drone, industrial, noise, robotic, warm` — *watchful* without being a threat cue, which is the
  entry's requirement. **Against it**: LRA 8.5 is wide and the quietest second is effectively
  silent, so the dynamic profile is uneven; and 105 s is under the band.

**Excluded: Bleak Terminal** — the author's own genre is *"sci-fi/horror"*, LRA 11.3, drift +2.6 dB.

---

## 5. Stage three, per §7.4 — eras 8, 9 and 10 as one job

### 5.1 The finding that decides how this stage is bought

**Incompetech rescues era eight, and it costs an edit as well as an attribution.** §6.5 predicted
era eight would be the hardest slot because `mid century` and `big band` both return zero on
OpenGameArt. Re-run on 2026-08-02: `mid century` **0**, `big band` **0**, `lounge` **2**, exactly as
recorded. And worse than that — the `bossa-nova` result that both `lounge` and the brief's §6.3 row
point at is **an 8-bit chiptune**. Its file is literally `8bit Bossa.mp3` and it runs 59.6 s. Era
eight's whole point is a *recorded* aesthetic, so that row is not a near-miss, it is the opposite of
the entry. Incompetech, by contrast, holds a genuine mid-century pool.

**But the catalogue has a systematic shape that changes the acquisition cost, and it is
measurable.** Counting a file as needing a trim when it carries 0.03 s or more of digital silence
at either end:

| | Files measured | Carry silence to trim | Tail is a fade of 1 s or more | Loop as delivered |
| --- | --- | --- | --- | --- |
| **OpenGameArt** | 126 | 75 (59 %) | 47 | **51 (40 %)** |
| **Incompetech** | 24 | 22 (91 %) | 20 | **2 (8 %)** |

The two Incompetech exceptions are `Local Forecast - Slower` and `Thatched Villagers`; the longest
fade measured is 9.3 s, on `Plaint`. These are production-music masters with fades on them, not
game loops, and that is a fact about what the catalogue is for rather than about any track in it.

So the trade is not simply "CC0 versus attribution". It is: **an OpenGameArt file is about five
times as likely to loop as delivered, and an Incompetech track is far more likely to be the right
piece of music.** For a CC-BY track the required edit then triggers §6.1's indicate-changes clause,
so the obligation and the editing cost arrive together.

**The mirror-image finding, which cuts the other way and is worth having.** Because Incompetech
masters end in silence, they almost never click at the wrap: **1 of 24 has a sample step above the
audible threshold, against 23 of 126 on OpenGameArt.** An OpenGameArt loop is likelier to need no
edit and likelier, when it does need one, to need a crossfade rather than a trim — which is the
harder of the two.

### 5.2 The Incompetech attribution, named exactly

The author specifies the wording and the catalogue page emits it per track. Verified on the FAQ and
the licences page on 2026-08-02:

```
"Title" Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0 License
http://creativecommons.org/licenses/by/4.0/
```

Four things about it that matter to this repository:

1. **The credit must be findable.** The FAQ's answer for games is a credits screen reachable from
   the settings menu. `CREDITS.md` is a repository file, not a learner-visible surface, so
   **shipping a CC-BY track means adding a credits surface to the app**, or it means the obligation
   is not met. That is a product change and it does not exist today. **It is the real cost of every
   CC-BY row in this document**, and it is larger than the licence text makes it look.
2. **Editing is permitted, and the author waives part of the notice.** The FAQ: *"you can sing over,
   chop, splice, compress, lengthen, and add instruments to anything you like… There is no need to
   mention if you cut and splice."* That is more permissive than CC BY 4.0's bare indicate-changes
   term, and it is the licensor saying so. **Record the change in `CREDITS.md` anyway**, per the
   repository's provenance-first standard, and note which rule was applied — the same treatment
   §6.4 recommends for multi-licensed assets.
3. **The provenance shape is weaker than OpenGameArt's and this should be said plainly.** The
   licence is stated per track on the catalogue page, but it is the *same* value for all 1,442
   tracks, generated from one field. There is no per-asset licence variation to read, so
   `CREDITS.md:13-17`'s "read per asset, never inferred from a search filter" is satisfied in form
   but not in substance. It is a site-level licence with a per-track rendering.
4. **It is explicitly not public domain.** The FAQ answers *"Is this music Copyright Free? No"* and
   adds that even the baroque and classical **recordings** are not, which is §6.2's row confirmed on
   the source.

### 5.3 Era 8, Atomic — `era-atomic_age`

All three are CC BY 4.0 and all three need a tail cut. **There is no CC0 candidate for this slot**,
which is the sharpest confirmation of §6.5 in the document.

**Candidate A — Cool Vibes.**
<https://incompetech.com/music/royalty-free/mp3-royaltyfree/Cool%20Vibes.mp3>

- **Licence: CC BY 4.0**, attribution as §5.2. Draft row:

  | File | Track | Author | License | Source | Length | Size |
  | --- | --- | --- | --- | --- | --- | --- |
  | `era-atomic_age.ogg` | Cool Vibes | Kevin MacLeod (incompetech.com) | **CC BY 4.0** — "Cool Vibes" Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 4.0, <http://creativecommons.org/licenses/by/4.0/>. **Trimmed, normalised and re-encoded by us** | <https://incompetech.com/music/royalty-free/music.html> | 3:38 | *re-encode first* |

- **Fit.** Published instruments are *Vibes, Bass, Kit* — that is era eight's instrument list
  verbatim, minus the muted horn. 83 bpm against the entry's 84–96. The author calls it *"a simple
  little slow trio for use in such things that require a slow jazz trio"*, and §4 era eight wants a
  line hanging above a harmony that never quite explains it, played by people who are relaxed.
- **Measured.** 218.4 s · mp3 320 kbps · 8,737,561 B · LUFS −29.6 · LRA 4.5 · lead 0.02 s ·
  tail 5.66 s · seam −90.3 dB · step 0.0 · pulse strength 0.319.
- **Loop: needs a real edit.** 5.66 s of trailing silence, so the fade has to be cut and a wrap
  built. It is also 16 dB quieter than the shipped house track and needs normalising.
- **Against it, and it is a §2 property 1 problem rather than a taste one.** The author writes
  *"Modulates at the midpoint"*. A key change is exactly the learnable event §2 puts first on its
  list — by the tenth pass the learner is waiting for it. **Either cut the loop to one side of the
  modulation, or take candidate B.**

**Candidate B — Backed Vibes (clean).**
<https://incompetech.com/music/royalty-free/mp3-royaltyfree/Backed%20Vibes%20Clean.mp3>

- **Licence: CC BY 4.0**, attribution as §5.2 under the title **Backed Vibes (clean)**.
- **Fit.** *Bass and Vibes only* — two voices, described by the author as *"cool background jazz
  sound"*. LRA 2.4 and pulse strength 0.128: narrow and barely gridded, which is the pair of
  readings §2 properties 2 and 4 most want. **The `(clean)` cut exists precisely because the other
  version has "additional mechanical clicks and beeping"**, so the variant choice here is not
  cosmetic: the other one carries §1.1 item 4 startles.
- **Measured.** 228.4 s · mp3 325 kbps · 9,277,779 B · LUFS −13.9 · **LRA 2.4** · lead 0.02 s ·
  tail 4.74 s · seam −104.4 dB · step 0.0 · pulse strength 0.128.
- **Loop: needs a 4.74 s tail cut and a built wrap.**
- **Against it.** Published at 103 bpm, above §4.0's 60–100 band and above era eight's 84–96.

**Candidate C — Bossa Antigua.**
<https://incompetech.com/music/royalty-free/mp3-royaltyfree/Bossa%20Antigua.mp3>

- **Licence: CC BY 4.0**, attribution as §5.2.
- **Fit.** Guitar, Bass, Drums at 70 bpm, 4:43 — the longest era-eight candidate, and §2 property 3
  wants long. The author's framing is unmistakably mid-century: *"Welcome to my pad… this very
  groovy orange shag-carpeting."* LRA 4.3, drift −0.2.
- **Measured.** 283.4 s · mp3 256 kbps · 9,069,455 B · LUFS −21.7 · LRA 4.3 · lead 0.42 s ·
  tail 2.08 s · seam −27.6 dB · step 0.0 · pulse ~70 bpm at strength 0.173.
- **Loop: needs an edit at both ends**, 0.42 s and 2.08 s.
- **Against it.** Bossa is Latin rather than American cool jazz, and §4 era eight bans
  lounge-exotica kitsch and ironic mid-century pastiche. The author's copy is a joke; whether the
  music is also a joke is the thing to listen for, because era eight is **sincere** and the joke
  would be at the era's expense.

**Excluded, named:** `Ultralounge` (*"a 1960s pad on the moon"* — space-age-bachelor-pad, banned by
name) and `Zazie` (has *Voice* and *Mouth Trumpet* in its instrument list, and §4.0 bans
intelligible voice in every track).

### 5.4 Era 9, Information — `era-information_age`

**Shortlisted, but read §6 item 4 first: this slot's real risk is not licensing and I could not
test for it.** §6.5 says era nine's danger is a track that is *correct and characterless*. That is a
judgement about whether a track has any identity at all, and no measurement I can run distinguishes
"calm and sealed" from "generic calm". All three below are correct. Whether any of them is
*anything* is the lead's call and is the whole question for this slot.

**Candidate A — First Light Particles, by Yoiyami.**
<https://opengameart.org/content/first-light-particles-%E2%80%93-cc0-atmospheric-pianoambient-track>

- **Licence: CC0 1.0**, read on the asset page 2026-08-02.
- **Fit.** The author's own feature list includes *"no groove, no percussion"* and *"slow emotional
  movement"*. §4 era nine wants low energy, a pulse so soft it is not countable, and the calmest
  track in the run.
- **Measured.** 131.7 s · WAV · 25,290,280 B · LUFS −20.6 · LRA 6.6 · lead 0.0 s · tail 0.0 s ·
  seam −31.3 dB · step 0.0042 · pulse strength 0.244.
- **Loop: clean as delivered**, and must be encoded from WAV.
- **Against it, and it is the entry's own axis.** It is *"soft shimmering piano"* — and §4 era nine's
  real absence is **visible hand-work of any kind**, with *"no audible hand anywhere"* stated as the
  requirement. A piano is an audible hand. This is the one candidate whose failure mode is the
  entry's central idea rather than a detail. 132 s is also short for the era the brief says can
  afford the longest loop in the set.

**Candidate B — Global Resonance, by Eponasoft.**
<https://opengameart.org/content/global-resonance>

- **Licence: CC0 1.0**. Measurements as §2.1 B.
- **Fit.** Processed, sustained, no identifiable performance gesture, 157.4 s, pulse strength 0.108.
  It fits era nine's *"a listener cannot say what any of it was played on"* better than it fits the
  crisis, because the crisis additionally wants period-neutrality and era nine wants sealed.
- **The collision, stated because it would otherwise be discovered late.** This is also a crisis
  candidate. **It cannot be both**: §5.2 requires the crisis track to be lower, slower, thinner and
  quieter than the era track it replaces, and a track cannot be quieter than itself. If it goes to
  era nine, the crisis loses a candidate and is down to two.

**Candidate C — Calm Ambient 1 (Synthwave 4k), by cynicmusic.**
<https://opengameart.org/content/calm-ambient-1-synthwave-4k>

- **Licence: CC0 1.0**, read on the asset page 2026-08-02.
- **Fit.** The brief's own §6.3 row. Pads and chords, no percussion, 157.9 s.
- **Measured.** 157.9 s · mp3 320 kbps · 6,322,668 B · LUFS −18.0 · LRA 6.9 · lead 0.74 s ·
  tail 3.34 s · seam +20.3 dB · step 0.0 · pulse strength 0.166.
- **Loop: needs a real edit at both ends**, 0.74 s and 3.34 s.
- **Against it, and it is a set-level objection rather than a track-level one.** cynicmusic is the
  author of **both tracks the game already ships** (`CREDITS.md:28-29`). Buying a third from the
  same composer for the era whose risk is characterlessness spends the acquisition without adding a
  voice to the set.

### 5.5 Era 10, Cyberpunk — `era-cyberpunk`

§6.5's volume finding holds and its shape finding does not, which makes the slot slightly harder
rather than easier. Re-run on 2026-08-02, `cyberpunk` returns 23 and `synthwave` 24 — both
effectively the page cap, as recorded. But the brief says *"the overlap between the two result sets
is heavy"*, and **measured, the two first pages are disjoint: zero shared results, 47 distinct
tracks across them.** So the retro pool is not the cyberpunk pool seen twice; it is a second pool of
the same size sitting next to it, and the idiom §4 era ten refuses is therefore even better stocked
than the brief thought. The three below were chosen for the *plain dark bed* rather than for the
ornament, which is what the entry asks and what the pool mostly refuses.

**Candidate A — Cyberpunk Beauty, by Tarush Singhal.**
<https://opengameart.org/content/cyberpunk-beauty>

- **Licence: CC0 1.0**, read on the asset page 2026-08-02.
- **Fit.** LRA 2.6, drift +1.6, and the tightest seam of the three.
- **Measured.** 93.7 s · mp3 192 kbps · 2,248,760 B · LUFS −9.1 · LRA 2.6 · lead 0.02 s ·
  tail 0.0 s · seam +5.7 dB · **step exactly 0.0** · pulse ~125 bpm at strength 0.301.
- **Loop: clean as delivered.** The author writes *"loops well"* and the measurement agrees — no
  silence at either end, a 5.7 dB level match and a sample step of zero.
- **Against it.** Tagged `heavy, kicks`, and §4 era ten bans a cyber-action driving beat by name.
  94 s clears §4.0's 90-second floor but is well under era ten's own 120–200. LUFS −9.1 is the
  loudest candidate in this document, 4 dB above the house track.

**Candidate B — Dark City, by cinameng.** <https://opengameart.org/content/dark-city-0>

- **Licence: CC0 1.0**, read on the asset page 2026-08-02.
- **Fit.** The brief's own note stands: the title matches era ten's *"ordinary dark box"* better than
  the synthwave results do. LRA 1.9, and the loudest second sits only 1.8 dB over the median while
  the quietest sits 1.6 dB under it — a 3.4 dB span across the whole file, which is §2 properties 1
  and 4 at once: there is nothing in it loud enough to become an event. Exactly 2:00.
- **Measured.** 120.0 s · mp3 320 kbps · 4,800,260 B · LUFS −17.5 · **LRA 1.9** · lead 0.04 s ·
  tail 0.0 s · seam +64.7 dB · step 0.0034 · pulse ~97 bpm at strength 0.336.
- **Loop: needs a 0.04 s lead trim.** The +64.7 dB seam figure is that encoder-delay silence and
  nothing else; the underlying material matches across the wrap.
- **Against it.** Tagged `Techno`. Whether the bed is plain with ornament attached, or bright all the
  way through (which §4 era ten says is the failure), is exactly what the numbers cannot answer.

**Candidate C — Music loop, strong, downtempo, seamless, by Nostromo.**
<https://opengameart.org/content/music-loop-strong-downtempo-seamless>

- **Licence: CC0 1.0**, read on the asset page 2026-08-02. The author adds *"No attribution
  needed"*, which matches.
- **Fit.** LRA 1.6, downtempo, near-static. Offered as both mp3 and WAV.
- **Measured** (mp3). 72.0 s · mp3 320 kbps · 2,881,897 B · LUFS −15.7 · **LRA 1.6** · lead 0.02 s ·
  tail 0.0 s · seam −13.3 dB · step 0.0 · pulse strength 0.48.
- **Loop: clean as delivered**, and the author's "seamless" claim checks out on both files.
- **Against it.** 72 s is under §4.0's 90-second floor and well under era ten's own 120–200; the
  source filename is `space_ranger_seamless_loop`, so it was written as science fiction rather than
  as a city.

**And the thing none of them can do.** §4 era ten's closing move is *one recognisable element from
era one's track, retrofitted in*. That element does not exist yet, and it could not exist in a
catalogue in any case. See §6 item 5.

---

## 6. Brief entries I could not shop from

The brief was written before anyone tried to buy from it. **Five of the things it asks for cannot be
searched on at all**, and in every case that is a property of the instruction rather than a gap in
the catalogues. None of this is a criticism: each one is a good compositional instruction. They are
simply not search terms, and two of the five are the *defining* property of their entry, which is
what decides whether that slot goes to procurement or to generation.

1. **Era 1: "nothing repeats identically."** The defining property is the *absence* of a repeating
   bar. No catalogue exposes it, no tag implies it, and the artefact a game-music library sells is a
   loop, which is a bar that repeats identically. `tribal` returning 13 CC0 results is therefore
   misleading in the specific way §6.5 warns: the pool is real and every member of it fails the
   entry's first sentence. **Unshoppable. Generate.**
2. **Era 5: "one bell, tolled, never on a beat you expected, and not at the loop point."** An
   arrangement instruction with a placement constraint. It is checkable on a finished track and it
   cannot be searched for. Era five has three good candidates and none of them has it, so this is
   an edit to commission rather than a reason to reject any of them.
3. **Era 3: "the seams are where the metal goes."** Same class, and worse, because it *is* the
   entry — remove it and era three has no signature move left. Combined with `bronze` = 0,
   `harbor` = 0 and `trade` = 0, this is the least shoppable entry in the document.
   **Unshoppable. Generate.**
4. **Era 9: "characterless is the real risk."** §6.5 states this precisely and it is right, and it
   is also the one risk that has no observable correlate. A characterless track and a sealed,
   deliberately anonymous track are the same file until somebody has an opinion. I can hand over
   three correct candidates; I cannot rank them on the axis that matters.
5. **Era 10: "one recognisable element from era one's track, retrofitted in."** Not a property a
   candidate can have, because it refers to a track that does not exist. It is a post-acquisition
   edit or a generation prompt, and it is worth saying so out loud because it means **era ten cannot
   be finished before era one is**, whatever §7.4's grouping implies about buying them separately.

**And one operational instruction that is shoppable in principle but not by search: §7.5's pitch
centre.** The section asks that the crisis track share a pitch centre with every era track and that
this be fixed before anything is bought. No catalogue exposes key, and I measured none. Doing it
means someone with an ear determining the pitch centre of eleven tracks — fourteen if the crisis
splits — and then using it as a filter, which is a real job that has not been scheduled and that
§7.5 says must happen first.

**A sixth, which is not a defect: §2's ten-pass test.** Fifteen minutes per candidate, and the brief
says so. Over the 32 candidates here that is about eight hours of listening, and it is the only test
that catches §2 property 1, which the brief ranks first. It is the lead's, and no part of this
document substitutes for it.

---

## 7. Where I would generate, and what I would prompt

**Three slots should go to generation and one more probably should.** In each case the reason is
that the catalogues fail the entry's *defining* property, not that they fail to be excellent.
Nothing was generated for this document.

| Slot | Why the catalogues fell short |
| --- | --- |
| **Era 1, prehistoric** | The entry's signature move is the absence of an identical repeat; a library's product is an identical repeat. Best CC0 result carries voice samples and a firm grid |
| **Era 3, Bronze Age** | Zero results on the era's own vocabulary; every near-miss imports a geography the style guide never names; the signature move is an arrangement instruction |
| **`crisis-classical`, Succession** | Nothing in either catalogue occupies the register; the genre default for "political tension" is the banned one |
| **Era 10, cyberpunk** (probably) | The pool is synthwave, which is ornament all the way through and the inverse of the entry; and the closing move cannot be bought at all |

**Prompts, sketched.** These are drafts for whoever runs the paid sitting §6.6 describes, and they
are written to the entry rather than to a genre, because a genre name is what produces the pastiche
§3 rules out.

- **Era 1.** *Slow, low-energy ensemble of untuned struck and shaken objects — frame drum, hollow
  log, stones, a rattle — plus a breathy end-blown flute using no more than four notes. Roughly 66
  bpm and deliberately not locked to a grid: no two bars of percussion identical, no downbeat to
  lean on, no melody, no metal, no synthesiser, no voice. One wordless sustained tone permitted. Two
  and a half minutes, no introduction, no ending, narrow dynamic range.*
- **Era 3.** *Plain, weighty, unhurried piece at about 82 bpm built from tuned wood and hand drums,
  with a single small bright struck-metal note — a bronze bell or a struck bowl — marking each
  structural junction and nothing else. The metal is held to points, never a texture. A double reed
  or plucked lyre carries a minimal line. Weight from low register and long note values, never from
  speed. No iron, no anvil, no brass, no Middle-Eastern or Egyptian scale, no fanfare. Three
  minutes.*
- **Crisis.** *A period-neutral bed with no identifiable instrument in it: a low sustain, one slow
  struck tone with a long decay, one held mid-register note. No countable pulse at all. Completely
  settled harmonically; the phrase resolves, late. No riser, no held dissonance, no sudden hit, no
  low drum, no choir, no crescendo across the piece, and it must end lower than it starts. Three
  minutes, no events, and quieter than a typical game background loop.*
- **Era 10.** *A dark, almost static low bed with small bright details attached on top — short lit
  blips, thin high edges, one sustained neon-like tone. Strip the bright details and almost nothing
  should remain. About 84 bpm and it must not be the fastest thing in the set. No synthwave
  nostalgia, no gated snare, no 1980s arpeggio, no driving beat, no siren, no dystopian menace.
  Three minutes.* Then commission the era-one quotation as an edit once era one exists, placed away
  from the wrap point.

**On route, and it is unchanged from §6.6.** Paid tier, one sitting, and record the four provenance
facts — tool and model version, plan tier active at that moment, generation date, prompt — before
the tab closes. `Meta MusicGen` remains barred: its weights are CC-BY-NC 4.0.

---

## 8. Everything excluded, and the sentence it fails

### 8.1 Excluded on content, with the rule each one breaks

Every row here was licence-verified and measured before it was dropped, so none of these is a
"probably wrong" — the reason is quoted from the asset or read off the file.

| Asset | Licence | Excluded because |
| --- | --- | --- |
| [Frost in the Northern Winter](https://opengameart.org/content/frost-in-the-northern-winter) | CC0 | Author's own genre is *"symphonic dark ambient / gothic"*; tags `Depressed, Mourning, gloomy`. Measured LRA 14.5 and **+4.5 dB drift**, a crescendo across the loop, which §5.2 bans by name |
| [Village of Snow](https://opengameart.org/content/village-of-snow) | CC0 | **+5.3 dB drift**, the largest measured. Crescendos across every pass |
| [Cold Silence](https://opengameart.org/content/cold-silence) | CC0 | Author: *"rather unsettling to listen to"*; tags `scary, unsettling`. §1 |
| [Bleak Terminal](https://opengameart.org/content/bleak-terminal) | CC0 | Author's own genre is *"sci-fi/horror"*. LRA 11.3, drift +2.6. §1 |
| [Hanging in the Black](https://opengameart.org/content/hanging-in-the-black) | CC0 | Author: *"It goes from peaceful meditation to battle in under 5 seconds."* §1.1 item 4, stated by the composer |
| [The Ritual](https://opengameart.org/content/the-ritual) | CC0 | Author: *"builds up until eventually reaching a fast-paced section in the middle that doubles the tempo"*. §1.1 item 1. Also `.mid` only |
| Ultralounge (Incompetech) | CC BY 4.0 | *"a 1960s pad on the moon"* — space-age-bachelor-pad, which §4 era eight bans by name |
| Zazie (Incompetech) | CC BY 4.0 | Instrument list includes *Voice* and *Mouth Trumpet*. §4.0 bans intelligible voice in every track |
| `greek boss battle.ogg` (in the Greek samples submission) | CC0 | A battle cue. §1. Its sibling file is shortlisted at §3.2 |
| [White Limestone](https://opengameart.org/content/white-limestone) | CC0 | The brief's §6.3 row for era 4. Author: *"3-chord jam with a **high-energy** vibe… key changes periodically to break the monotony"*, tagged `Battle, chase, epic`. A periodic key change is §2 property 1's learnable event and the energy is wrong for *even and unhurried*. Its seam is genuinely clean, which is the frustrating part |
| [GrassLands Theme](https://opengameart.org/content/grasslands-theme) | CC0 | The brief's §6.3 row for era 2. Tags `Classical, bells, horn, medieval, overworld, strings`; author calls it *"a mild medieval openworld type music"*. **It is era five in sound**, which is §6.5's own finding confirmed on the asset |
| [Bossa Nova](https://opengameart.org/content/bossa-nova) | CC0 | The brief's §6.3 row for era 8. The file is `8bit Bossa.mp3` and runs 59.6 s: **a chiptune**, where era eight's whole point is a recorded aesthetic |
| [Desert Settlement](https://opengameart.org/content/desert-settlement) | CC0 | The brief's §6.3 row for era 3. 304.5 s of post-apocalyptic acoustic-guitar music, 6.98 s trailing silence, no metal in it |
| [Ali Khan's Palace](https://opengameart.org/content/ali-khans-palace) | CC0 | The brief's §6.3 row for era 3. A slow piano jazz theme; 85.0 dB seam mismatch and a 0.0252 wrap step |
| [Lost in the meadows](https://opengameart.org/content/lost-in-the-meadows) | OGA-BY 3.0 + CC0 | FLAC only, 4.0 s trailing silence, LUFS −30.5, LRA 10.1 |
| [Ambient Relaxing Loop](https://opengameart.org/content/ambient-relaxing-loop) | CC0 | 24.5 s — a quarter of §4.0's floor — and tagged `Angel, chorus, heaven`, which §5.2 rules out for the crisis |
| [Heavenly Loop](https://opengameart.org/content/heavenly-loop) | CC0 | Measures beautifully — 33.7 s, LRA 1.5, no silence at either end — and is a **choir** pad, which §5.2 bans outright |
| [Prehistoric Drum Loop](https://opengameart.org/content/prehistoric-drum-loop) | CC0 | 5.7 s measured, confirming the brief's own note. Listed there so nobody re-finds it; listed here for the same reason |
| [Lamentation](https://incompetech.com/music/royalty-free/music.html) | CC BY 4.0 | Considered for era 4. Affect is grief where the entry wants *even and unhurried*; LRA 9.2, +2.6 drift, 6.68 s trailing silence |

### 8.2 Excluded because the asset has no audio to license

A different exclusion and worth naming so they are not re-found: **[The
Ritual](https://opengameart.org/content/the-ritual)** ships a `.mid` only, and the author says
there is no Ogg *"because the soundfont has potential copyright issues"* — the composition being
CC0 does not make a rendering of it CC0. **[Kokopelli's Labyrinth
Theme](https://opengameart.org/content/kokopellis-labyrinth-theme)** ships a `.zip`. The C64, NES
and OPL2 renderings of Renaissance and Baroque repertoire that §6.3 lists
([Arbeau](https://opengameart.org/content/c64-arbeau-belle-qui-tiens-ma-vie),
[Banchieri](https://opengameart.org/content/nes-or-gameboy-banchieri-reg-1),
[Buxtehude](https://opengameart.org/content/opl2-buxtehude-buxwv185),
[Bach BWV127](https://opengameart.org/content/moog-bach-bwv127)) distribute as `.tar.gz` or `.zip`
archives rather than as loose audio, so they need unpacking before they can be auditioned at all.
The brief already treats these as evidence that the repertoire exists rather than as candidates,
which remains the right reading.

### 8.3 Excluded on licence: none, and that is worth saying

**Nothing was dropped because its licence could not be established.** Both sources state a licence
that can be read and quoted, so §6.1's rule — *"if the provenance of a file cannot be established,
the file does not ship"* — never bit. What it did instead was shape which sources were worth
opening at all:

- **Musopen was not searched, deliberately.** §6.2 rates it *"more dangerous than it looks"* because
  the recordings carry separate copyrights on a site that does not verify uploads. Era six's
  repertoire problem was solved on OpenGameArt with a CC0 render instead, which is the outcome §6.5
  predicts, so the provenance burden was never worth taking on.
- **Free Music Archive and Pixabay were not searched.** §6.2 rules FMA's NC share a mandatory filter
  and rates the Pixabay Content License as *"a worse guarantee than CC0"* for a provenance-first
  repository. Neither slot needed them: every gap that remains is a gap in *what the music is*, not
  in where it could be bought, and a weaker licence does not solve that.
- **Four assets are flagged as multi-licensed** and are candidates only if §6.4's open question is
  answered in their favour: `Spring's Pastorales` (`CC-BY-SA 4.0 + CC-BY-SA 3.0 + CC0`),
  `Pavane Faure` (`CC-BY 3.0 + CC0`), `Town in ruins loop` (`OGA-BY 3.0 + CC0`) and
  `Lost in the meadows` (`OGA-BY 3.0 + CC0`). Each is listed with its full field, per §6.4's
  recording instruction.
- **Two assets have no audio to license**, which is a different exclusion worth naming so nobody
  re-finds them: `The Ritual` (<https://opengameart.org/content/the-ritual>) ships a `.mid` only,
  and the author states there is no Ogg *"because the soundfont has potential copyright issues"* —
  the composition is CC0 and a rendering of it would not be; `Kokopelli's Labyrinth Theme` ships a
  `.zip`. Both also fail on content: `The Ritual` *"builds up until eventually reaching a fast-paced
  section in the middle that doubles the tempo"*, which is §1.1 item 1 exactly.

---

## 9. Two measured asides that belong to somebody else's ticket

Recorded because they were found while measuring and would otherwise be lost.

**1. Both shipped tracks gap at their own loop point, and it is the §2 property 5 defect.**
`town-theme.mp3` carries 0.10 s of leading silence, so it ends at level and restarts from nothing:
a 74.0 dB step, once every 97 seconds, for the whole of a study session. `a-new-town.mp3` has the
mirror-image problem, 0.18 s of trailing silence and a −52.8 dB step. `music.ts:296` sets
`element.loop = true`, which is a gapless native loop of a file that is not gapless. This is exactly
the mp3 encoder-delay case §2 property 5 predicts, it is measurable at this tip, and **fixing it is
a re-encode of two existing files with no licence question attached**, because both are CC0.

Note the line number: the brief cites this as `music.ts:189` and it is `:296` at this tip. See §1.2
for the rest of that drift.

**2. `standingInSlots()` currently reports twenty and `CREDITS.md` says so too.** The count is
derived rather than declared (`eraMusic.ts:370-372`), so it is correct today and will stay correct.
Worth noting only that **fourteen of the twenty are owed a track and six are shelved crises**
(`eraMusic.ts:24-26`), and that a procurement PR landing one file moves the number by one on the
same run, which `eraMusic.test.ts:179-194` already proves.

---

## 10. Scoreboard

**The headline depends on which way §5 goes, so it is given both ways.**

| Reading of §5 | Slots owed | With two or more candidates | With none |
| --- | --- | --- | --- |
| **§5.1's recommendation**, one shared crisis track | 11 | **9** — the crisis, eras 2, 4, 5, 6, 7, 8, 9, 10 | **2** — era 1, era 3 |
| **One crisis track each**, as `eraMusic.ts` currently assumes | 14 | **11** — the nine above minus the shared crisis, plus `crisis-prehistoric`, `crisis-renaissance`, `crisis-information_age` | **3** — era 1, era 3, `crisis-classical` |

Era 4 reaches two rather than three, and under the four-way reading four of the eleven are held up
by candidates weak enough that the count flatters them. That thinness is itself the case §5.1 is
making.

The work behind it:

| | Count |
| --- | --- |
| Distinct OpenGameArt assets whose structured licence field was read per asset | **128** |
| Audio files decoded and measured | **150** — 126 OpenGameArt, 24 Incompetech |
| Candidates shortlisted | **32** (two of them serve two slots each and cannot serve both) |
| Assets excluded on content, each with the sentence it fails quoted | **19** (§8.1) |
| Assets with no loose audio file to license or audition | 6 (§8.2) |
| Assets excluded because their licence could not be established | **0** (§8.3) |
| Slots whose only candidates are **CC BY 4.0** | **1** — era 8 |
| Assets flagged as multi-licensed, pending §6.4 | 4 |

**And the edit each of the 32 needs, which is the second half of what was asked for.** Measured,
not estimated:

| What it needs | Count | Which |
| --- | --- | --- |
| **Nothing. Loops as delivered** | **11** | Krakatoa · Spring's Pastorales IV · Hush Hamlet · Thatched Villagers · Pavane Fauré · Factory ambiance · A Clockwork · Town in ruins loop · First Light Particles · Cyberpunk Beauty · Music loop downtempo |
| A trim under one second | 5 | Contemplation · Global Resonance · Village Consort · EmptyCity · Dark City |
| A crossfade at the wrap, no trim | 2 | Greek instruments · Minimalistic Flute & Strings |
| Both | 1 | Cottages |
| **A fade cut and a wrap built** | **13** | Station Drone 2 · Immersed · Thunderbird · Slow Heat · Dowland · Sinfonia Number 5 · Winter Wind · Long Winter · Searching · Cool Vibes · Backed Vibes (clean) · Bossa Antigua · Calm Ambient 1 |

**Seven of the thirteen in the bottom row are CC BY 4.0 — and that is seven of the ten CC-BY
candidates in the whole shortlist.** The licence obligation and the editing cost land on the same
tracks, which is §5.1 of this document restated as a count. Only one CC-BY candidate
(`Thatched Villagers`) needs no edit at all. Nearly all 32 additionally need re-encoding for size
or container, and under CC BY that is itself a change to record.

---

## 11. Appendix: the whole shortlist as `CREDITS.md` rows

One row per candidate per slot, in `apps/web/public/audio/CREDITS.md`'s own column order, so a
procurement PR can lift the row it needs. **34 rows over 32 distinct candidates**, because
`Global Resonance` and `Station Drone 2` each appear against two slots and neither can serve both.

Three things to change before pasting a row into `CREDITS.md`:

1. **The `Slot` column is not part of the house format.** It is here to say which `MUSIC_TRACKS` id
   the row would ship under; drop it and add the `File` column, which will be `music/<slot>.ogg`.
   `crisis-*` means the shared crisis track under §5.1's recommendation, which registers once and
   is pointed at by whichever crisis rows the lead wants it under.
2. **`Size as delivered` is the source file, not the shipped file.** Nearly every row needs
   re-encoding — the shipped default is 1,316,581 B and several of these are five to twenty-five
   times that — so the size in the committed row will be smaller and must be re-measured after
   encoding.
3. **`Edit owed` is not a `CREDITS.md` column either**, but for a CC BY 4.0 row it decides the
   `License` cell: anything other than "none" means the attribution must also indicate that changes
   were made, per §6.1. The CC0 rows carry no such obligation, and §5.2 above records why the
   author's own FAQ is more permissive than the bare licence term for the Incompetech rows.

| Slot | Track | Author | License | Source | Length | Size as delivered | Edit owed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `crisis-*` | Contemplation | Joth | CC0 1.0 | <https://opengameart.org/content/contemplation-0> | 2:00 | 2,405,271 B | trim 0.16 s lead |
| `crisis-*` | Global Resonance | Eponasoft | CC0 1.0 | <https://opengameart.org/content/global-resonance> | 2:37 | 2,936,833 B | trim 0.14 s tail |
| `crisis-*` | Station Drone 2 | Tozan | CC0 1.0 | <https://opengameart.org/content/station-drone-2> | 3:11 | 1,460,862 B | cut 1.08 s tail, normalise |
| `crisis-*` | Immersed | Kevin MacLeod (incompetech.com) | **CC BY 4.0** — "Immersed" Kevin MacLeod (incompetech.com), Creative Commons: By Attribution 4.0, <http://creativecommons.org/licenses/by/4.0/> | <https://incompetech.com/music/royalty-free/music.html> | 4:09 | 7,969,389 B | cut 2.6 s tail, build wrap |
| `crisis-*` | Thunderbird | Kevin MacLeod (incompetech.com) | **CC BY 4.0** — "Thunderbird" Kevin MacLeod (incompetech.com), Creative Commons: By Attribution 4.0, <http://creativecommons.org/licenses/by/4.0/> | <https://incompetech.com/music/royalty-free/music.html> | 6:02 | 11,573,856 B | cut 4.26 s tail, build wrap |
| `era-neolithic` | Krakatoa | Kistol | CC0 1.0 | <https://opengameart.org/content/krakatoa> | 1:12 | 1,136,376 B | none |
| `era-neolithic` | Slow Heat | Kevin MacLeod (incompetech.com) | **CC BY 4.0** — "Slow Heat" Kevin MacLeod (incompetech.com), Creative Commons: By Attribution 4.0, <http://creativecommons.org/licenses/by/4.0/> | <https://incompetech.com/music/royalty-free/music.html> | 3:42 | 8,901,415 B | cut 3.28 s tail, build wrap |
| `era-neolithic` | Spring's Pastorales IV | Spring Spring | CC-BY-SA 4.0 + CC-BY-SA 3.0 + CC0 — **taken as CC0 per §6.4** | <https://opengameart.org/content/springs-pastorales> | 2:24 | 2,584,464 B | none |
| `era-classical` | Experimenting with Greek instrument samples (`greek instruments.ogg`) | Spring Spring | CC0 1.0 | <https://opengameart.org/content/experimenting-with-greek-instrument-samples> | 1:41 | 2,270,950 B | crossfade the wrap |
| `era-classical` | Minimalistic Flute & Strings Tune | Spring Spring | CC0 1.0 | <https://opengameart.org/content/minimalistic-flute-strings-tune> | 3:15 | 3,715,398 B | crossfade the wrap |
| `era-medieval` | Hush Hamlet (`_loop` variant) | Zane Little Music | CC0 1.0 | <https://opengameart.org/content/hush-hamlet> | 1:36 | 36,864,210 B | none; encode from WAV |
| `era-medieval` | Thatched Villagers | Kevin MacLeod (incompetech.com) | **CC BY 4.0** — "Thatched Villagers" Kevin MacLeod (incompetech.com), Creative Commons: By Attribution 4.0, <http://creativecommons.org/licenses/by/4.0/> | <https://incompetech.com/music/royalty-free/music.html> | 4:05 | 9,808,523 B | none |
| `era-medieval` | Village Consort | Kevin MacLeod (incompetech.com) | **CC BY 4.0** — "Village Consort" Kevin MacLeod (incompetech.com), Creative Commons: By Attribution 4.0, <http://creativecommons.org/licenses/by/4.0/> | <https://incompetech.com/music/royalty-free/music.html> | 3:35 | 6,876,000 B | trim 0.32 s tail |
| `era-renaissance` | If my complaints could passions move (Dowland, 1597) | Of Far Different Nature, after John Dowland | CC0 1.0 | <https://opengameart.org/content/historic-renaissance-music-from-1597-if-my-complaints-could-passions-move-by-john-dowland> | 2:42 | 6,460,674 B | cut 3.12 s tail, build wrap |
| `era-renaissance` | Sinfonia Number 5 | Kevin MacLeod (incompetech.com) | **CC BY 4.0** — "Sinfonia Number 5" Kevin MacLeod (incompetech.com), Creative Commons: By Attribution 4.0, <http://creativecommons.org/licenses/by/4.0/> | <https://incompetech.com/music/royalty-free/music.html> | 2:08 | 5,139,770 B | cut 1.84 s tail, trim 0.28 s lead |
| `era-renaissance` | Pavane (Fauré) | Bobjt, after Gabriel Fauré | CC-BY 3.0 + CC0 — **taken as CC0 per §6.4** | <https://opengameart.org/content/pavane-faure> | 1:59 | 2,380,716 B | none |
| `era-industrial` | Factory ambiance | yd | CC0 1.0 | <https://opengameart.org/content/factory-ambiance> | 2:03 | 2,485,366 B | none |
| `era-industrial` | A Clockwork | skrjablin | CC0 1.0 | <https://opengameart.org/content/a-clockwork> | 1:05 | 933,435 B | none |
| `era-industrial` | Cottages | Kevin MacLeod (incompetech.com) | **CC BY 4.0** — "Cottages" Kevin MacLeod (incompetech.com), Creative Commons: By Attribution 4.0, <http://creativecommons.org/licenses/by/4.0/> | <https://incompetech.com/music/royalty-free/music.html> | 3:54 | 4,433,764 B | trim 0.14 s tail, crossfade |
| `era-atomic_age` | Cool Vibes | Kevin MacLeod (incompetech.com) | **CC BY 4.0** — "Cool Vibes" Kevin MacLeod (incompetech.com), Creative Commons: By Attribution 4.0, <http://creativecommons.org/licenses/by/4.0/> | <https://incompetech.com/music/royalty-free/music.html> | 3:38 | 8,737,561 B | cut 5.66 s tail, normalise |
| `era-atomic_age` | Backed Vibes (clean) | Kevin MacLeod (incompetech.com) | **CC BY 4.0** — "Backed Vibes (clean)" Kevin MacLeod (incompetech.com), Creative Commons: By Attribution 4.0, <http://creativecommons.org/licenses/by/4.0/> | <https://incompetech.com/music/royalty-free/music.html> | 3:48 | 9,277,779 B | cut 4.74 s tail, build wrap |
| `era-atomic_age` | Bossa Antigua | Kevin MacLeod (incompetech.com) | **CC BY 4.0** — "Bossa Antigua" Kevin MacLeod (incompetech.com), Creative Commons: By Attribution 4.0, <http://creativecommons.org/licenses/by/4.0/> | <https://incompetech.com/music/royalty-free/music.html> | 4:43 | 9,069,455 B | cut 2.08 s tail, trim 0.42 s lead |
| `era-information_age` | First Light Particles | Yoiyami | CC0 1.0 | <https://opengameart.org/content/first-light-particles-%E2%80%93-cc0-atmospheric-pianoambient-track> | 2:12 | 25,290,280 B | none; encode from WAV |
| `era-information_age` | Global Resonance | Eponasoft | CC0 1.0 | <https://opengameart.org/content/global-resonance> | 2:37 | 2,936,833 B | trim 0.14 s tail |
| `era-information_age` | Calm Ambient 1 (Synthwave 4k) | cynicmusic | CC0 1.0 | <https://opengameart.org/content/calm-ambient-1-synthwave-4k> | 2:38 | 6,322,668 B | cut 3.34 s tail, trim 0.74 s lead |
| `era-cyberpunk` | Cyberpunk Beauty | Tarush Singhal | CC0 1.0 | <https://opengameart.org/content/cyberpunk-beauty> | 1:34 | 2,248,760 B | none |
| `era-cyberpunk` | Dark City | cinameng | CC0 1.0 | <https://opengameart.org/content/dark-city-0> | 2:00 | 4,800,260 B | trim 0.04 s lead |
| `era-cyberpunk` | Music loop, strong, downtempo, seamless | Nostromo | CC0 1.0 | <https://opengameart.org/content/music-loop-strong-downtempo-seamless> | 1:12 | 2,881,897 B | none |
| `crisis-prehistoric` | Winter Wind | wipics | CC0 1.0 | <https://opengameart.org/content/winter-wind> | 1:22 | 1,967,042 B | cut 1.7 s tail, build wrap |
| `crisis-prehistoric` | Long Winter | Indieteur | CC0 1.0 | <https://opengameart.org/content/long-winter> | 3:57 | 7,343,066 B | cut 3.04 s lead and 8.62 s tail |
| `crisis-renaissance` | EmptyCity: Background Music | yd | CC0 1.0 | <https://opengameart.org/content/emptycity-background-music> | 1:40 | 2,021,058 B | trim 0.48 s tail |
| `crisis-renaissance` | Town in ruins loop | HaelDB | OGA-BY 3.0 + CC0 — **taken as CC0 per §6.4** | <https://opengameart.org/content/town-in-ruins-loop> | 0:49 | 955,642 B | none; too short as-is |
| `crisis-information_age` | Station Drone 2 | Tozan | CC0 1.0 | <https://opengameart.org/content/station-drone-2> | 3:11 | 1,460,862 B | cut 1.08 s tail, normalise |
| `crisis-information_age` | Searching | yd | CC0 1.0 | <https://opengameart.org/content/searching> | 1:45 | 2,113,188 B | cut 1.06 s lead and 2.16 s tail |

---

## 12. References

- `docs/superpowers/specs/2026-08-01-era-and-crisis-music-brief.md` — the specification. **Binding,
  not amended here.** §1 (serious is not threatening), §2 (the loop properties), §3 (signature move,
  not period instruments), §4 (the ten entries), §5 (one crisis track or four), §6 (sources and
  licensing), §7 (acquisition order)
- `apps/web/public/audio/CREDITS.md` — the provenance rule (`:4-6`), the per-asset verification
  method the licence reader was checked against (`:13-17`), the two shipped tracks (`:26-29`) and the
  row format every draft row above copies
- `apps/web/src/audio/eraMusic.ts` — the fourteen owed slots and the six shelved ones (`:24-26`),
  the derived ids (`:125-132`), the selection function (`:311-323`), the derived census (`:370-372`)
- `apps/web/src/audio/eraMusic.test.ts:140-152` — the assertion a slot pointing at a missing track
  runs into
- `apps/web/src/audio/music.ts` — the manifest a procurement PR adds one row to (`:93-116`), the
  length note (`:103`), the native loop (`:189`)
- `apps/web/src/city/islandGround.ts:372-374` — one authored era, which is why §7.3 stages the
  middle of the run
- Sources searched: [OpenGameArt](https://opengameart.org) advanced search, art type Music, licence
  facet CC0, run 2026-08-02; [Incompetech](https://incompetech.com/music/royalty-free/music.html),
  catalogue of 1,442 tracks with published instruments, length and BPM, read 2026-08-02, together
  with its [FAQ](https://incompetech.com/music/royalty-free/faq.html) and
  [licences page](https://incompetech.com/music/royalty-free/licenses/)
