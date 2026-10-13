# Music candidate shortlist: fourteen slots, shopped against the brief

**Date:** 2026-08-02
**Status:** shortlist for review. **Nothing was acquired, nothing was downloaded into the repository,
and nothing was generated.** URLs and metadata only.
**Measured at:** `integration` `7a2c16a0`.
**Reads under:** `docs/superpowers/specs/2026-08-01-era-and-crisis-music-brief.md`, treated as binding
and not restated. Section references below (§1, §2, §7.2 and so on) are to that brief.
**Audience:** the team lead, who judges theme fit and whether a track sounds good. This document does
the shortlisting and the compliance.

---

## 0. What I did, and the two things I did not do

**Fourteen slots are owed**, and the code names each one: `ERA_MUSIC` and `CRISIS_MUSIC` in
`apps/web/src/audio/eraMusic.ts:145` and `:207` are total over `EraId`, giving twenty rows of which
fourteen are genuinely owed a track — ten eras, plus the four crises in scope at eras 1, 4, 6 and 9
(`eraMusic.ts:340-343`). Two tracks ship. The selection code is done: `trackIdForScene` is
`crisis(activeCrisisEra) ?? era(cityEra)` (`eraMusic.ts:311-323`), a slot whose id is absent from
`MUSIC_TRACKS` resolves to its declared stand-in, and `standingInSlots()` derives the shortfall by
reading the shipped table rather than a flag (`:370`).

**I did not listen to anything.** Every fit argument below is made from the author's own description,
the catalogue's structured metadata, and measurements of the file. §2's ten-repetition test and §1's
serious-versus-threatening judgement are ear tests, and neither was run. Where a candidate's fit
turns on something only an ear settles, the entry says so.

**I did not download anything into the repository.** Page HTML was read over the network and audio
was probed in place over HTTP with `ffprobe` and `ffmpeg`, which stream the file and write nothing.
`git status` for `apps/web/public/audio/` is unchanged.

---

## 1. Headline

| | Count |
| --- | --- |
| Slots with the two or three candidates asked for | **12 of 14** |
| Slots with exactly one candidate | **1** (era 4 Classical) |
| Slots with **no candidate at all** | **1** (era 3 Bronze Age) |

**Two qualifications on that count, both of which can move it.**

It assumes §5.1's recommendation of **one shared crisis track**, whose shortlist of three covers all
four crisis slots at once. **If the lead overrules §5.1 and buys four**, the Succession crisis at era 4
has **no candidate** and the figure becomes 11 of 14 with two slots empty. §5's question is still open,
and the code has already assumed the answer §5.1 argues against: see section 3.

It also counts era 6's second candidate, `Angevin`, which fits era 5 equally well and which §3 will not
let both eras have. Era 5 has three others, so era 6 should get it — but **if it goes the other way,
era 6 drops to one.**

**Four findings worth the lead's time before the tables.**

1. **Era 3 Bronze Age is empty, and it is empty in both catalogues.** CC0 music searches for `bronze`,
   `gong`, `harbour`, `lyre` and `antiquity` return **zero usable results between them**, and the two
   candidates §6.3 named for era 3 are disqualified by their authors' own one-line descriptions
   ("Guitar music", "a piano theme") before anyone listens. This slot needs generating.
2. **Era 8 Atomic is no longer the hardest slot.** §6.5 predicted it would need generation because
   `mid century` and `big band` return zero on OpenGameArt. That holds, but Incompetech's catalogue
   exposes a structured `instruments` field, and querying it for vibraphone plus upright bass plus
   brushed kit returns era 8's instrument list **exactly**, in tempo, three times over. Era 8 has
   three candidates. They are CC-BY 4.0, not CC0.
3. **Era 10's signature move cannot be bought at any price.** §4's era 10 entry requires "one
   recognisable element from era one's track, retrofitted in". That asks for a track quoting a track
   nobody has chosen yet. No catalogue can supply it. See section 9.
4. **Most of the pool does not loop.** Fifty files were measured at both ends, including the two that
   ship. **Sixteen** end at the level they start at; the other thirty-four fade out, fade in, or sit in
   silence at both ends, and each needs an edit first. §2 property 5 called the seam "a file property
   and not a taste", and it is the most common defect in this pool by a wide margin.

---

## 2. How to read the evidence

Every row was established today by one of four methods, and each column below names which.

**Licence.** Read from the structured `License(s)` field on each OpenGameArt asset's own page, per
asset, which is the method `CREDITS.md:13-17` requires. Never inferred from the search facet. For
Incompetech the licence is **site-wide rather than per-asset**, and that is a real difference from
OpenGameArt: see section 2.2.

**URL resolves.** All 43 OpenGameArt asset pages cited here were requested individually and returned
`HTTP/2 200`; the nine Incompetech audio URLs and its catalogue, FAQ and licences pages returned
`HTTP/1.1 200`. Every audio file quoted below was then opened by `ffprobe` and returned a parsable
stream, which is a stronger check than a status code. **One derived URL did not resolve**, which is why
the rule is worth obeying rather than assuming: Incompetech's `Cottages` is filed under
`Magic Scout - Cottages.mp3` and the URL the title implies **404s**. Every Incompetech URL below is the
one that answered.

**Length and bitrate.** `ffprobe -show_entries format=duration,bit_rate,size`, read from the file over
HTTP. These are measurements of the shipped file, not the catalogue's claim, and in every Incompetech
case they agreed with the catalogue's stated length to the second.

**Loop seam.** A proxy, and it needs its limits stated. `ffmpeg -af volumedetect` over the **first 0.5
seconds** and, separately, the **last 0.5 seconds**, giving two mean levels. A wrap point joins the
last sample to the first, so if the two levels differ, the join steps audibly. Read it like this:

| Head vs tail | What it means | Work owed |
| --- | --- | --- |
| Within a few dB, both sounding | Level-matched join | **None measurable.** Still owes an ear: level says nothing about phase or harmony |
| Tail near silence (below about −75 dB) | Composed ending or fade-out | **A real edit.** The loop restarts out of a dead gap |
| Head near silence, tail sounding | Fade-in | **A real edit.** The level drops at the wrap |
| Both near silence | Padded at both ends | Trim. No click, but a dip and dead air each pass |

**What this proxy is not.** It cannot see a harmonic or rhythmic mismatch, so a level-matched track can
still lurch. It measures 0.5 seconds, so a slow four-second fade reads as matched. **It only ever
rules a candidate out, never in.**

### 2.1 The baseline, because a measurement with nothing to compare it to is a number

The two shipped tracks, measured on disk at this tip by the same method:

| File | Duration | Bitrate | Whole-file mean | Peak | head 0.5 s | tail 0.5 s |
| --- | --- | --- | --- | --- | --- | --- |
| `town-theme.mp3` (**the house track**) | 97.45 s | 108 kbps | −15.6 dB | −0.1 dB | **−20.8 dB** | **−32.9 dB** |
| `a-new-town.mp3` | 62.26 s | 98 kbps | −18.3 dB | 0.0 dB | −16.6 dB | −57.4 dB |

**Two things follow, and the first is a caution about my own metric.** The house track that has been
looping in production all along has a **12.1 dB step at its own wrap point**. So a step of that order
is evidently shippable, or it clicks and nobody has filed it; either way "needs an edit" below means
"worse than, or comparable to, what already ships", not "unusable". Anything with a tail near −91 dB
is in a different category, because that is digital silence and the restart is a hard event.

**The second is the encode budget.** The house track is 108 kbps and 1,316,581 B. Most candidates below
are 320 kbps and 5 to 12 MB. §6.3 already found this; the numbers here confirm it per file.
**Re-encoding is part of acquisition, not an afterthought**, and for the CC-BY rows it interacts with
the attribution obligation.

### 2.2 The licence positions, named exactly

**CC0 1.0 Universal (public domain dedication).** No obligation of any kind, irrevocable. Every CC0
row below is credited anyway, for the two reasons `CREDITS.md:8-11` already gives. The house columns are
`CREDITS.md:26-27`, and a filled-in row for one of the candidates below looks like this — the size and
length are the measured ones, the file name is whatever id the slot derives:

```markdown
| File | Track | Author | License | Source | Length | Size |
| --- | --- | --- | --- | --- | --- | --- |
| `era-01.mp3` | Alien Restaurant | Kevin MacLeod (incompetech.com) | CC-BY 4.0 | <https://incompetech.com/music/royalty-free/music.html> | 6:13 | 10,909,311 B |
```

**CC-BY 4.0, for every Incompetech row.** Attribution is **required**, and the author specifies the
wording. Read from `incompetech.com/music/royalty-free/faq.html` today, verbatim, with the line breaks
as he sets them:

```text
Title
Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0
https://creativecommons.org/licenses/by/4.0/
```

with "It is important that you replace the word Title with the Actual Title of the piece that you are
using!" and, on placement: "a credit needs to be placed such that a person who wants to know where the
music came from should have no difficulty in finding it". A row in `CREDITS.md` satisfies that.

**Three refinements to §6.1 that came out of reading the source, reported rather than assumed.**

- §6.1 warns that CC-BY 4.0's "indicate if changes were made" clause bites because every acquired
  track gets loop-trimmed and re-encoded. **The licensor's own position is more relaxed than the
  licence:** "Can I change your music? Yes, you can sing over, chop, splice, compress, lengthen, and
  add instruments to anything you like. You MUST make it clear in the credits which parts are yours,
  and which parts are mine. **There is no need to mention if you cut and splice.**" A loop trim and a
  re-encode are a cut and a compress. **Record the change anyway** — it costs one clause and this
  repository's standard is already stricter than the law (`CREDITS.md:5-6`) — but the obligation is
  softer than §6.1 feared, and that is worth knowing before it is used as a reason to prefer CC0.
- **Incompetech gives every track an ISRC**, and its FAQ says the number exists so that "if someone
  challenges your claim to use my music … you can respond with this number to show where the track
  came from". That is a provenance artefact of exactly the kind `CREDITS.md` exists to hold. **Capture
  the ISRC in the credit row** for any Incompetech track that ships. Each is given below.
- **Incompetech is explicitly not public domain**, confirming §6.2 word for word. Its FAQ, today: "Is
  this music Copyright Free? **No. All of this music is copyrighted.** Though some of the baroque and
  classical compositions are in the public domain; these recordings are not."

**One asset is licence-blocked and is therefore not a candidate**, however well it fits: see era 2.

---

## 3. §5's question is still open, and the code has already answered it the other way

The task asked me to check whether §5 is still open and to present candidates both ways if so. **It is
open, and there is a live disagreement in the tree about it.**

- **§5.1 recommends one shared crisis track** and rules four out with reasons rather than leaving it
  open: "**Do not split four ways under any circumstances**, because three of the four would be
  acquired for eras that have no land, no buildings and no player." It names one condition under which
  it becomes two, and one seam: era one against the rest.
- **`eraMusic.ts` assumes four.** Its header says so in terms: "**Assumed: one per crisis**, because
  the lead's sentence pairs crises with eras and the eras are one-to-one" (`eraMusic.ts:64-66`), and
  `CRISIS_MUSIC` gives each of the four in scope its own slot and its own sourcing brief.
- The code is not wrong to be shaped that way — its own header notes the cheaper reading needs no
  change of shape, since one track registered once and pointed at by four `standIn` rows expresses it
  (`:70-73`). **But the two documents a procurement pass reads disagree about how many tracks to buy**,
  and `eraMusic.ts:106-111` explicitly directs that pass to read the per-slot briefs there.

**So both are presented below.** Section 5 gives the shared, period-neutral shortlist that §5.1 asks
for. Section 5.2 gives what exists per crisis if the lead buys four, and names the slot that comes up
empty.

**A second conflict, smaller but sharper, and it is the one I would raise first.** `CRISIS_MUSIC`'s
brief for the Succession crisis reads "**Tense** and political rather than cold: held strings, a room
of people deciding" (`eraMusic.ts:226-228`). §1 of the brief bans exactly that: tension aimed at an
anxious learner during an event that already feels timed is "precisely the banned thing", and §1.4's
corollary is that an instinct toward more tension "is the defect the brief exists to prevent". A
procurement pass that follows the code comment will buy the thing the brief forbids. **The one
catalogue track that matches the code's wording is disqualified by the brief on the author's own
description**: Incompetech's `winter courtyard` is "a cold acoustic tune I think is suitable for a
troublesome cinematic scene or **tense conversation**" (CC0,
<https://opengameart.org/content/winter-courtyard>). That is not a coincidence; it is what shopping
from the code comment produces. Two other slot briefs pull the same way against §3's tempo ruling:
`atomic_age` asks for "**brisk**" and `neolithic` for a "settled pulse", where §3 rules that the set
"never expresses era through tempo".

---

## 4. Stage zero (§7.1): the two shipped tracks

**§7.1 asks whether `town-theme.mp3` and `a-new-town.mp3` are really era five's and era six's rather
than era one's, and says it needs a listening session. It still does — this is NOT DONE, and it is not
mine to close.** What I can add is the measurement, which bears on it in one narrow way:

Both are by **cynicmusic (Pixelsphere)**, both CC0. A third CC0 track by the same author,
`Calm Ambient 1 (Synthwave 4k)`, turns out to be era 9's strongest CC0 candidate (section 7). So if the
lead does re-home the shipped pair to the middle of the run, **three of the ten era slots would be
filled by one author**, which is a set-coherence question §3 does not address and which is worth
deciding deliberately rather than discovering.

The numbers are in section 2.1. The one that matters for §7.1 is that `a-new-town.mp3` is **62.26
seconds**, which is under §2's 60-second caution line by four seconds and well under its 90-second
target — so whichever era it is re-homed to, it is the weakest loop in the set on length alone.

---

## 5. Stage one (§7.2), item 1: the crisis track

§7.2 puts this first, because its absence is "the only track whose absence is currently an active
error rather than a gap": the Hard Winter runs with a cheerful RPG town theme under it.

**The constraint that drives the whole search is §5.1's period-neutrality**, and it is what most
candidates fail. One track has to sit under prehistoric percussion, plucked strings, a viol consort and
processed pads, so **no instrument that marks an era and no idiom anyone can date**. §5.2 then wants
slower and lower than every era track, no countable pulse, 120 to 240 seconds, and nothing on §5.2's
long "must not" list.

### 5.1 Shared, period-neutral: three candidates

**1. Contemplation** — the strongest fit to the brief's own words.

| | |
| --- | --- |
| URL | <https://opengameart.org/content/contemplation-0> (200) |
| Licence | **CC0 1.0**, read from the asset's `License(s)` field. **No attribution required**; credit it anyway per house rule |
| Author | Joth |
| File | `Contemplation.mp3`, 2,405,271 B, 160 kbps |
| Length | **120.06 s** (2:00), inside §5.2's 120-240 s window at its floor |
| Loop | head −42.1 dB, tail −27.9 dB. **A 14.2 dB step at the wrap, needs an edit** — comparable to the house track's own 12.1 dB, so this is ordinary work rather than a disqualification |

**Why it fits.** §5.2 asks for a read of "the same world with most of the parts taken out of it" and
§6.3 already noted that this title "names the affect section 5.2 wants and not the one it bans". It
survives §1 by construction of what it is not: no title, tag or description here points at threat,
which is the opposite of most of this pool (section 8 lists four crisis candidates whose own authors
describe them as unsettling, spooky or suspenseful). On §2 it is the only crisis candidate whose
bitrate is already near the house track's, so the re-encode is a trim rather than a rebuild.
**Unverified by ear:** whether it has a countable pulse, which §5.2 would rather it did not.

**2. Persistence** — the only candidate that ships a purpose-made loop, and the interesting one on §2.

| | |
| --- | --- |
| URL | <https://opengameart.org/content/persistence> (200) |
| Licence | **CC0 1.0**, per-asset field. No attribution required |
| Author | cinameng |
| Files | `persistence_0.mp3` 5,087,607 B, 320 kbps; and `persistence-loopshort_1.mp3` 2,297,729 B |
| Length | **127.19 s** (2:07) for the full track; the short variant is 57.44 s |
| Loop | Full: head −78.0 dB, tail −81.3 dB. **Both ends are near-silence**, so the join is silence to silence: no click, but a dip and dead air once a pass. Trim rather than crossfade. Short variant: head −44.3, tail −51.0 |

**Why it fits.** The author's whole description is "space ambient texture", and a texture with no
identifiable instrument is precisely §5.2's "assemblable from sounds that cannot be dated", which is
what buys the period-neutrality §5.1 says the shared track lives or dies by. §2's ranking wants texture
over tune first and length second, and this is the candidate that is explicitly a texture.
**Take the 127 s file, not the 57 s one**: §2 puts the short variant under the 60-second line.

**3. Somnium** — the length §5.2 actually asked for, at the cost of the worst seam.

| | |
| --- | --- |
| URL | <https://opengameart.org/content/somnium> (200) |
| Licence | **CC0 1.0**, per-asset field. No attribution required |
| Author | Adiutorium |
| File | `somnium.mp3`, 8,762,584 B, 320 kbps |
| Length | **219.06 s** (3:39), comfortably inside §5.2's window and the longest compliant crisis candidate |
| Loop | head −43.4 dB, tail **−91.0 dB**. **Ends in digital silence: a real edit, not a trim** |

**Why it fits.** §5.2 wants long "because a crisis is where a learner is most likely to be
concentrating hard, and a short loop is at its most intrusive exactly then", and at 3:39 this is the
only candidate that buys that without a 12 MB file. "A simple atmospheric music" is all the author
says, which is thin evidence of fit but also contains nothing that trips §1. **8.76 MB is 6.7× the
house track**, so the re-encode here is mandatory and substantial.

**Excluded on §1, each on its author's own words** — these are the four that would otherwise look like
crisis music: `cold-silence` ("rather unsettling to listen to"), `a-cold-wind` ("Ideal for ghosts,
spirits"), Incompetech's `Long note One` (feel: Dark, Intense, Suspenseful, Unnerving — and "just a
very long pad for use under dialog", which is otherwise exactly the shape §5.2 wants) and
`Spacial Harvest` ("Deep unsettling piece"). §1's claim that "crisis music" as a genre default is
threatening is not a theory: it is what the catalogue returns.

### 5.2 If the lead buys four instead of one

| Crisis | Era | Candidates | Verdict |
| --- | --- | --- | --- |
| **Hard Winter** | 1 | **Frost in the Northern Winter** (CC0, The Oracle, <https://opengameart.org/content/frost-in-the-northern-winter>, 200). `01_frost_in_the_northern_winter.flac`, 23,200,615 B, **exactly 312.000000 s** (5:12). FLAC only, so **an encode is mandatory before it is even auditionable at the right size**. The exact-integer duration is what a bar-trimmed master looks like, which is a signal and not proof | **1 candidate**, plus the three shared ones. This is the crisis that is built, so it is the only one where a period-specific track is defensible under §5.1's named exception |
| **Succession** | 4 | **None.** See section 3: the only near-match is disqualified by §1 for being what the code's own brief asked for | **EMPTY** |
| **Plague** | 6 | **EmptyCity** (CC0, yd, <https://opengameart.org/content/emptycity-background-music>, 200). `EmptyCity.ogg`, 2,021,058 B, 162 kbps, **100.0025 s**, head −29.4 / tail −66.8 dB → fades out, needs an edit. §6.3's point holds: "empty" is era six's own word for its crisis. **Village Ruins** (CC0, isaiah658, <https://opengameart.org/content/village-ruins>, 200), 128 kbps mp3, **143.9985 s**, head −23.3 / tail −81.3 dB → ends in silence. Its author describes "a small village destroyed by war", which is a different event from a plague and reads as period-specific | **2 candidates**, the first much the better |
| **Intrusion** | 9 | **Pondering the Cosmos** (CC0, Ruskerdax, <https://opengameart.org/content/pondering-the-cosmos>, 200), 12,310,011 B, 320 kbps, **307.75 s** (5:08), head −23.8 / tail −23.6 dB → **matched within 0.2 dB, the best seam measurement in the entire survey**. Its author calls it "a dark sci-fi track composed with old-school synthesizers", which locks it to era 9 and makes it useless as the shared track | **1 candidate**, and a good one, but only under the four-track reading |

**The arithmetic §5.1 gave is worth restating with today's numbers.** One shared track means one licence
check and one seam edit. Four means four of each, and 23.2 MB of FLAC to encode for a crisis at era one
alone. The four-track route also spends most of its budget on crises whose eras have no authored land:
see the correction below, which does not change that for eras 4, 6 and 9.

**One correction to the brief, because the tree moved under it.** §0a and §7 both rest on
`ERA_ISLAND_GROUND` holding **era one only**, measured at `3b655728` and cited there as
`islandGround.ts:372-374`. **At `7a2c16a0` that record holds two keys**, `prehistoric` and `neolithic`
(`apps/web/src/city/islandGround.ts:836-839`), and the file's own header now says "carried **era one
only** on that reasoning" in the past tense (`:46`). **So era two's land has been authored since the
brief was written.** That strengthens §7.2 rather than weakening it: era two's track is no longer being
bought ahead of its ground, and §7.3's rule — acquire an era's track when its land is authored — is now
satisfied for era two as well as era one. It also means the era one to era two seam §7.2 item 3 cares
most about can now be judged against two real ground palettes instead of one.

---

## 6. Stage one (§7.2), items 2 and 3: eras one and two

### Era 1: Prehistoric — three candidates

§4's entry wants struck and shaken things with no pitch centre, a flute of "at most three or four
notes", 60 to 72 bpm, nothing on a strict grid, and it bans "any instrument that names a specific
living culture". §6.5's warning is that `tribal` returns a healthy-looking 13 results and that "stock
tribal drums is a looped identical pattern, which is era two's signature arriving four thousand years
early".

**1. Alien Restaurant** — the best fit in the whole survey to any era entry, and it is CC-BY.

| | |
| --- | --- |
| URL | <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Alien%20Restaurant.mp3> (200). Catalogue: <https://incompetech.com/music/royalty-free/music.html> |
| Licence | **CC-BY 4.0.** Attribution **required**, in the author's specified form: "Alien Restaurant / Kevin MacLeod (incompetech.com) / Licensed under Creative Commons: By Attribution 4.0 / https://creativecommons.org/licenses/by/4.0/". ISRC `USUAN1100335` |
| Author | Kevin MacLeod |
| File | `Alien Restaurant.mp3`, 10,909,311 B, 234 kbps |
| Length | **372.79 s** (6:13) |
| Loop | head −28.8 dB, tail −27.4 dB. **Matched within 1.4 dB, and neither end is silent** — one of the sixteen files in fifty that end where they start |

**Why it fits.** The author's own description is the argument: "Non-real instrumentation written as
background music for a restaurant on another planet. **Tribal, primitive, evolved. 4-tone scale.**"
Three of era one's requirements land in one sentence. **The 4-tone scale is §4's "at most three or four
notes"**, arrived at independently. **"Non-real instrumentation" is how it dodges the living-culture
ban** — an invented palette cannot name a culture, which is the trap §6.5 says era one's
healthy-looking pool is full of. Catalogue `feel` is "Relaxed, Mystical", with no term from the threat
vocabulary, so it survives §1 on the metadata. On §2 it is texture-led background music by intent, 6:13
long, and it needs no seam edit. **Unverified by ear:** §4's "nothing repeats identically", which no
catalogue exposes — see section 9.

**2. Tribal** — the brief's own lead, verified and measured.

| | |
| --- | --- |
| URL | <https://opengameart.org/content/tribal> (200) |
| Licence | **CC0 1.0**, per-asset field. No attribution required. **Note the artist:** Of Far Different Nature releases as CC0 on OpenGameArt and CC-BY 4.0 on itch.io, so **the OpenGameArt copy is the one to take**, exactly as §6.2 warns |
| Author | Of Far Different Nature |
| File | `Of Far Different Nature - Tribal (CC0).mp3`, 7,692,496 B, 320 kbps (a 33.9 MB WAV is also offered) |
| Length | **192.19 s** (3:12) |
| Loop | head −13.5 dB, tail −68.6 dB. **Fades out: needs an edit**, and a 55 dB span is a full fade rather than a step |

**Why it fits.** "Chilled tribal track" is the author's whole description, and "chilled" is the useful
word: it is the one thing in era one's pool that claims low energy, which is what §4 asks for and what
an adventure-film cue would not claim. On §1 the risk here is not menace but §6.5's cliché, which is a
listening call. **Named honestly:** the title is the exact word §6.5 says will produce a pastiche, and
this is the candidate most likely to be accepted "because 13 looks healthy".

**3. Krakatoa** — the cleanest loop in the era, and short.

| | |
| --- | --- |
| URL | <https://opengameart.org/content/krakatoa> (200) |
| Licence | **CC0 1.0**, per-asset field. No attribution required |
| Author | Kistol |
| File | `Krakatoa_0.ogg`, 1,136,376 B, 126 kbps — **already at the house track's size and bitrate**, so no re-encode |
| Length | **exactly 72.000000 s** |
| Loop | head −16.9 dB, tail −16.9 dB. **Identical to one decimal place**, and the author states "This track should loop 'seamlessly' in your favourite media player when played on repeat" |

**Why it fits, and the two reasons it may not.** It is the only era-one candidate that is a
purpose-built loop at a shippable size, and §2 property 5 ranks the seam above almost everything. Ogg
is also the container §2 prefers, because the padding is declared rather than baked in. **Against it:
72 seconds is under §2's 90-second target**, and §2 is explicit that a short track needs "an unusually
eventless surface to compensate", which is an ear question. **And the title names a specific place** (a
volcano in Indonesia), which is the same class of error as the didgeridoo §4 bans by name; the risk is
that the music followed the title.

**Also verified, not shortlisted:** `duaio` (CC0, cinameng, <https://opengameart.org/content/duaio>,
200; 162.01 s, 6,480,456 B, 320 kbps, head −20.6 / tail −16.4 dB, no fade) is a legitimate fourth. Its
author calls it "**future** tribal drums", and "future" points at the processing era one bans.

### Era 2: Neolithic — two candidates, both CC-BY, and one licence-blocked

§4 wants the first pitched, tuned, repeatable thing — "a simple plucked string or a struck wooden bar
with a fixed pitch set" — on a real grid at 72 to 84 bpm, metronomically steady, with **nothing that
varies the repeated figure**, and no metal.

**§6.5 predicted this slot would fail the open-source route, and it does.** Searching CC0 music today:
`pastoral` returns one usable result, `harvest` two, and `ostinato` and `hand drum` **zero**. The
abundance is in `village`, which is fantasy-RPG town music and roughly era five. **There is no CC0
candidate for era two.** Both candidates below are CC-BY 4.0 from Incompetech, found by querying its
`instruments` field for the struck wooden bar era two actually asks for.

**1. Accralate** — the closest thing to era two's entry in either catalogue.

| | |
| --- | --- |
| URL | <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Accralate.mp3> (200) |
| Licence | **CC-BY 4.0.** Attribution required: "Accralate / Kevin MacLeod (incompetech.com) / Licensed under Creative Commons: By Attribution 4.0 / https://creativecommons.org/licenses/by/4.0/". ISRC `USUAN1100341` |
| Author | Kevin MacLeod |
| File | `Accralate.mp3`, 11,060,298 B, 290 kbps |
| Length | **305.37 s** (5:05) |
| Tempo | **78 bpm**, catalogue-stated — **inside era two's own 72-84 band**, not merely inside §4.0's 60-100 |
| Loop | head −27.6 dB, tail **−91.0 dB**. **Ends in digital silence: a real edit** |

**Why it fits.** Instrumentation is "**Percussion, Marimba**" and nothing else. A marimba is a struck
wooden bar with a fixed pitch set, which is §4's era-two instrument named almost literally, and the
absence of anything else on the list is what keeps era two thinner than era three. At 78 bpm it sits
where the entry asks. **It is also the strongest available answer to §3's warning** that "two adjacent
eras that are both quiet hand percussion is the identical defect in the identical place": marimba
against era one's untuned struck things is an audible step on a channel other than tempo. Catalogue
`feel` is "Grooving", which is the one term worth an ear here, because §4 warns that "steady is not the
same as driving".

**2. Cherry Blossom** — the same idea, shorter, at the wrong end of the band.

| | |
| --- | --- |
| URL | <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Cherry%20Blossom.mp3> (200) |
| Licence | **CC-BY 4.0**, wording as above with the title substituted |
| Author | Kevin MacLeod |
| File | `Cherry Blossom.mp3`, 5,297,320 B |
| Length | **129.80 s** (2:10) |
| Tempo | **100 bpm** — inside §4.0's global band **at its ceiling**, and 16 bpm above era two's own 72-84 |
| Loop | head −26.0 dB, tail **−91.0 dB**. **Ends in digital silence: a real edit** |

**Why it fits, and the two flags.** "Marimbas, Shakers" is era two's kit plus era one's shaker, and
`feel` is "Calming, Relaxed" with nothing from the threat vocabulary. Against it: **100 bpm is the top
of the whole set's range**, which §3 would rather era two did not own, and **the title names a
geography** the era's guide does not claim.

**Licence-blocked, and therefore not a candidate: Spring's Pastorales.** This is the best-measuring
era-two file found, and I am excluding it on provenance rather than on fit.

| | |
| --- | --- |
| URL | <https://opengameart.org/content/springs-pastorales> (200) |
| Licence field, read per asset | **`CC-BY-SA 4.0 + CC-BY-SA 3.0 + CC0`** |
| Best file | `spring_-_pastorale_iv_0.ogg`, 2,584,464 B, 144 kbps, **143.95 s**, head −36.9 / tail −39.0 dB → matched within 2.1 dB |

**Why it is blocked.** §6.4 reports that OpenGameArt's FAQ says "You must follow only one of the
licenses", so a multi-licensed asset offering CC0 is usable as CC0 — but it declines to act on that and
names the residual risk precisely: "where a submission bundles **several files**, the field can be the
union across files rather than a choice offered on each". **This asset bundles four files.** It is the
exact case §6.4 refused to resolve, and §6.4 rules that the call belongs to the audio owner and "not a
passing brief's". It is not mine either. **If the audio owner relaxes the standing rule, this becomes
era two's best candidate and the only one needing no seam edit.** Until then it is excluded.

By contrast, `lost-in-the-meadows` (CC0 + OGA-BY 3.0, HaelDB,
<https://opengameart.org/content/lost-in-the-meadows>, 200) carries the same pair over a **single
file** — 108.07 s FLAC — so §6.4's residual risk does not arise there and only the policy question
does. Its author's description, "very mellow piece that doesn't have too much direction", is not
evidence about era two's metronomic repetition either way.

**Rejected for era two and re-homed to era five: GrassLands Theme.** §6.3 flagged that it "came out of
the landscape pool rather than the agriculture pool" and asked for a check. Checked: **the author's own
description is "A mild _medieval_ openworld type music"** (CC0, DST,
<https://opengameart.org/content/grasslands-theme>, 200). It is not an era-two candidate on its own
author's word. It is a reasonable era-five one, and appears there.

---

## 7. Stage two (§7.3): eras three to seven

§7.3 says acquire an era's track when its land is authored and not before, so **nothing in this section
is urgent** and everything in it can be re-decided when the ground palette exists. It is presented so
the lead can see which slots will need generating when their turn comes.

**Read that rule against the correction at the end of section 5.2**: `ERA_ISLAND_GROUND` has gained era
two since the brief was measured, so the boundary between "buy it now" and "wait for the land" has moved
by one era. **Eras three to ten still have no authored ground**, so §7.3's ruling applies to every entry
below and to all of section 8.

### Era 3: Bronze Age — NO CANDIDATE

**This is the one empty era slot, and the emptiness is measured rather than inferred.** CC0 music
searches run today: `bronze` **0**, `gong` **0** (one game-over clip), `harbour` **0**, `lyre` **0**,
`antiquity` **0**. Incompetech's catalogue, filtered to §4.0's 60-100 bpm band and 120 seconds, returns
23 results for bells and chimes, of which every one in the top of the list carries `Dark`, `Eerie`,
`Unnerving` or `Somber` in its own `feel` field.

**Both candidates §6.3 named are disqualified by their authors' own descriptions, before any listening.**

| Candidate | Verified | Why it is out |
| --- | --- | --- |
| Desert Settlement (<https://opengameart.org/content/desert-settlement>, 200) | **CC0**, vitalezzz. 304.46 s, 12,178,354 B, 320 kbps. head −58.3 / tail −91.0 dB → fades in **and** out | The author's whole description is "**Guitar music**". Era 3's entry asks for struck metal, tuned wood and a double reed; a guitar is none of them. Plus §6.5's geography problem, which the title states outright |
| Ali Khan's Palace (<https://opengameart.org/content/ali-khans-palace>, 200) | **CC0**, Spring Spring. 189.39 s, 159 kbps, head −42.0 / tail −33.2 dB | The author's whole description is "**a piano theme**". A piano is an era 6-to-8 timbre, and the title names both a geography and a person, which is §6.5's error in its most literal form |

**The nearest near-miss, named so nobody re-finds it hopefully:** Incompetech's `Organic Meditations
One` (CC-BY 4.0; "Strings, Bells, Percussion"; `feel` Calming, Relaxed; D-flat major) has the struck
metal and none of the menace, but it runs **16 minutes 28 seconds** and is strings-led, and era 3's
entry wants the metal "held to points and small in area, exactly as the guide holds the metal on the
buildings".

**Recommendation: generate.** See section 10.

### Era 4: Classical — ONE candidate, which is fewer than asked for

**1. "greek instruments", from Experimenting with Greek instrument samples**

| | |
| --- | --- |
| URL | <https://opengameart.org/content/experimenting-with-greek-instrument-samples> (200) |
| Licence | **CC0 1.0**, per-asset field. No attribution required |
| Author | Spring Spring |
| File | `greek instruments_0.ogg`, 2,270,950 B, 180 kbps |
| Length | **100.94 s** |
| Loop | head −21.1 dB, tail −16.6 dB. **Within 4.5 dB and neither end is silent** — no fade, so a trim rather than a rebuild |

**Why it fits.** §6.3 called it "the nearest thing in the library to era four's instrument list" and
that holds: era 4 asks for plucked strings of the lyre family, a soft double reed and light frame
percussion, and a Greek sample palette is that list. It ends near the level it starts at, and at
2,270,950 B it is close enough to the house track that the encode is cheap.
**Two honest caveats.** It is explicitly a sketch — "I was experimenting with Greek instrument samples"
— rather than a finished cue. And **the sibling file in the same submission is "greek boss battle"**,
which is the orchestral-action register era 4 bans; the two share a palette, so the ban needs checking
against the file that ships, not the submission.

**Excluded, and it was §6.3's other lead: White Limestone** (CC0, Bobjt,
<https://opengameart.org/content/white-limestone>, 200). §6.3 liked it because an extended cut suits a
long loop, and the extended ogg is real: 186.32 s, 7,836,754 B, head −21.5 / tail −45.5 dB. **The
author's own description disqualifies it:** "3-chord jam with a **high-energy vibe**". Era 4's entry
asks for "even and unhurried", and §4.0's first constraint is "nothing urgent, ever". A three-chord jam
is also not "a fixed-length phrase repeated at an exactly constant spacing".

**Also excluded:** Incompetech's `Canon in D Major` (bpm 80, harp and strings, 355 s) and
`Canon in D for Two Renaissance Harps` (bpm 83, "Renaissance Harps", 340 s) both have the right
instrument and the right tempo, and both fail §2 property 2 at the first hurdle: **the melody is one of
the most recognisable in Western music**, so it is learnable on pass one and sung by pass three. §2
calls the melody filter "the single most useful filter to apply to a candidate list".

### Era 5: Medieval — three candidates, the healthiest slot in the run

§4 wants an audible skeletal frame rather than a pad, lute and vielle family, a soft reed, a tabor and
**one bell** that "strikes rather than shows", 84 to 96 bpm, and it asks that the bell **not** fall at
the loop point.

**1. Hush Hamlet** — the only asset in the survey that ships a purpose-built loop variant.

| | |
| --- | --- |
| URL | <https://opengameart.org/content/hush-hamlet> (200) |
| Licence | **CC0 1.0**, per-asset field. No attribution required |
| Author | Zane Little Music |
| Files | `hush_hamlet_loop_0.wav` 36,864,210 B (**take this one**); `hush_hamlet_0.wav` 51,909,010 B is the non-looping cut |
| Length | **exactly 96.000000 s** for the loop variant; 135.18 s for the full |
| Loop | **Not measurable by my proxy without decoding 36 MB, so this is unmeasured.** What is verified is that the author ships a file named `_loop`, and that its duration is an exact integer, which is what a bar-trimmed master looks like |

**Why it fits.** §2 property 5 asks for a file "loop-trimmed at the source" and this is the one asset
that supplies it. §6.3 spotted this and it is confirmed: the `_loop` variant exists and is 96.000000 s,
above §2's 90-second target. **The cost is the container:** WAV only at 36.9 MB, so it must be encoded
before it can even be auditioned at shipping quality, and CC0 permits that without qualification.
**Unverified:** the seam itself, and whether there is a bell and where it falls.

**2. Medieval: Exploration**

| | |
| --- | --- |
| URL | <https://opengameart.org/content/medieval-exploration> (200) |
| Licence | **CC0 1.0**, per-asset field. No attribution required |
| Author | RandomMind |
| File | `Exploration_0.mp3`, 9,446,112 B, 320 kbps |
| Length | **236.15 s** (3:56) |
| Loop | head **−91.0 dB**, tail −77.8 dB. **Silent at both ends: padded rather than faded.** Trim the silence and the join may be clean; leave it and every pass has dead air |

**Why it fits.** "My CC0 track for medieval themed game. Fits for menu and/or exploration" is the
author's whole claim, and a menu track is by intent something that repeats under attention, which is
§2's requirement stated from the other side. At 3:56 it is the longest CC0 candidate for the era.

**3. GrassLands Theme** — re-homed here from era 2 on the author's own description.

| | |
| --- | --- |
| URL | <https://opengameart.org/content/grasslands-theme> (200) |
| Licence | **CC0 1.0**, per-asset field. No attribution required |
| Author | DST |
| File | `DST-GrassLands.mp3`, 6,576,546 B, 320 kbps |
| Length | **164.36 s** (2:44) |
| Loop | head −26.0 dB, tail −20.5 dB. **Within 5.5 dB, neither end silent** — better than the house track's own seam |

**Why it fits.** "A mild **medieval** openworld type music", per its author. "Mild" is doing useful work
against §1, and an openworld bed is a texture rather than a set piece. This is also the era-five
candidate needing the least seam work.

**Excluded on provenance, and this one is worth the lead's attention: Medieval Theme** (CC0, Umplix,
<https://opengameart.org/content/medieval-theme>, 200). The licence field reads CC0, but the author's
own description says it was "**Made almost entirely out of Apple loops**". **A CC0 dedication on the
page does not establish the rights in the third-party loop library underneath it**, and
`CREDITS.md:5-6` is unambiguous about what to do with that: "If the provenance of a file cannot be
established, the file does not ship." Excluded, and it is excluded for the reason the house rule exists
rather than for anything about how it sounds.

### Era 6: Early Modern — ONE strong candidate and one borrowed second

**1. If my complaints could passions move (Dowland, 1597)** — still the best find in the search, and
now measured.

| | |
| --- | --- |
| URL | <https://opengameart.org/content/historic-renaissance-music-from-1597-if-my-complaints-could-passions-move-by-john-dowland> (200) |
| Licence | **CC0 1.0**, per-asset field, verified today. Composition is public domain; **the recording is separately CC0 by the renderer**, which is the combination §6.2 says Musopen promises and rarely delivers |
| Author | Of Far Different Nature, after John Dowland |
| File | `…If my Complaints Could Passions Move_0.mp3`, 6,460,674 B, 320 kbps |
| Length | **161.52 s** (2:42) |
| Loop | head −14.8 dB, tail **−90.3 dB**. **Ends in digital silence: a real edit.** A period piece has a final cadence, which is what era 6's own entry predicts of the idiom |

**Why it fits.** §6.5's conclusion was that "for eras 4, 5 and 6 the search should be by repertoire and
not by mood", and this is that conclusion paying off: an exact hit rather than an approximation. Era 6's
signature move is symmetry as a system, antecedent and consequent of equal length, and a 1597 Dowland
setting is that form natively. **The caveat is in the renderer's own words and it is exactly era six's
banned edge:** "instrumentation-wise my render is a little ahead of time and **sounds more baroque**".
Era 6's must-not list bans "Baroque virtuosity (this era is the drawing, not the display)". Whether a
Baroque-leaning instrumentation crosses that line is a listening call and it is the lead's.

**2. Angevin** — a genuine second, borrowed from era 5, and §3 forbids using it in both.

| | |
| --- | --- |
| URL | <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Angevin.mp3> (200) |
| Licence | **CC-BY 4.0.** Attribution required, wording as in section 2.2. ISRC `USUAN1200110` |
| Author | Kevin MacLeod |
| File | `Angevin.mp3`, 11,224,420 B |
| Length | **280.56 s** (4:40) |
| Tempo | **70 bpm** — inside §4.0's global band, **6 bpm below era 6's own 76-92** |
| Loop | head −21.7 dB, tail **−91.0 dB**. **Ends in digital silence: a real edit** |

**Why it fits, and the structural problem with it.** Instruments are "Flute, Lute, Choir, Percussion"
and the author calls it "**sort of a slow Renaissance like piece of music**", which is era 6's
repertoire claim and era 5's instrument list at the same time. **That is the problem.** It is
simultaneously the second-best answer for era 5 and for era 6, and §3 requires that "adjacent eras must
be tellable apart on a channel other than tempo". **Use it for one of the two, never both**, and be
aware that choosing it for either leaves the other with a single candidate. **A second flag:** the
"Choir" entry. §4.0 bans "no lyrics and no intelligible voice in any track" and era 5 bans plainchant
specifically; a wordless choir pad passes and a sung line does not, and only an ear can tell which this
is.

**Both of §6.3's other era-6 rows are confirmed as evidence rather than candidates.**
`c64-arbeau-belle-qui-tiens-ma-vie` (CC0, TheOuterLinux, 200) ships **only a `.tar.gz`**, is a C64
chiptune rendering, and its source is a 1588 SATB **vocal** setting. `nes-or-gameboy-banchieri-reg-1`
(CC0, TheOuterLinux, 200) ships **only a `.zip`**, is chiptune, and its author states "I set the tempo
to be 220BMP" — **more than double §4.0's ceiling**. `harpsichord-flurry` (CC0, Spring Spring, 200)
carries the flourish era 6 bans in its title and ships MIDI plus one ogg.

### Era 7: Industrial — three candidates

§4 wants struck metal and wood at machine regularity, no introduction and no cadence, "a piece with no
middle", 88 to 100 bpm, and it warns explicitly against reaching for a synthesiser and against anything
reading as "a production line under strain".

**1. Factory ambiance** — the best structural fit in the run after era one's.

| | |
| --- | --- |
| URL | <https://opengameart.org/content/factory-ambiance> (200) |
| Licence | **CC0 1.0**, per-asset field. No attribution required |
| Author | yd |
| File | `Factory.ogg`, 2,485,366 B, 162 kbps — **within 2× the house track**, so the encode is a trim |
| Length | **123.0005 s** (2:03) |
| Loop | head −46.8 dB, tail −41.8 dB. **Within 5 dB, both ends quiet but neither silent** |

**Why it fits.** §6.3 wondered whether this is "ambience rather than music, which for this era could be
a feature". **It is the feature.** Era 7's read is "a piece with no middle: it could have started thirty
seconds earlier or later and nothing about it would be different", and its loop note says the seam "is
genuinely free here, because a track with no arrival has no seam to hide". An ambience is that
specification. On §1 the author's framing is neutral — "background track for exploring some industria
complex" — with nothing about strain or alarm. **This is also the same author as EmptyCity**, the plague
crisis candidate, which is a small point in favour of set coherence if both ship.

**2. Cottages** (filed as `Magic Scout - Cottages`)

| | |
| --- | --- |
| URL | <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Magic%20Scout%20-%20Cottages.mp3> (200). **The obvious URL from the title 404s** — this is the one that answers |
| Licence | **CC-BY 4.0.** Attribution required, wording as in section 2.2. ISRC `USUAN1800014` |
| Author | Kevin MacLeod |
| File | `Magic Scout - Cottages.mp3`, 4,433,764 B |
| Length | **233.86 s** (3:54) |
| Tempo | **78 bpm** — inside §4.0's band, 10 below era 7's own 88-100 |
| Loop | head −14.6 dB, tail −16.6 dB. **Within 2.0 dB, neither end silent** — no edit measurable |

**Why it fits.** The author's description is unusually on-point for this entry: "You know the old
phrase 'as relaxing as a toaster'? They meant any electrical machine, really. I think if a toaster were
to make relaxing music this is it." That is era 7's mechanical regularity with §1's ban on menace
already applied, and `feel` is "Bright, Calming, Relaxed" with nothing from the threat vocabulary.
**The flag is the instrument list: "Synths".** Era 7's entry says "Do not reach for a synthesiser: era
seven is iron and steam". This candidate is the trade-off between that rule and the fact that nothing
made of iron and steam in either catalogue avoids the strain register.

**3. Factory**

| | |
| --- | --- |
| URL | <https://opengameart.org/content/factory-0> (200) |
| Licence | **CC0 1.0**, per-asset field. No attribution required |
| Author | tamesu |
| File | `factory_0.mp3`, 2,581,106 B, 192 kbps |
| Length | **107.55 s** |
| Loop | head −25.9 dB, tail −36.8 dB. **An 11 dB step, comparable to the house track's own 12.1 dB** |

**Why it fits, and the flag.** "Could be the theme of a game area with lots of machinery", author's
words, and the size and bitrate are already near shippable. **The submission includes a BeepBox
project file**, so it is a browser-synth composition — the same synthesiser objection as Cottages, with
less of the compensating description.

**Excluded:** `empacotatron` (CC0, 200) ships a dedicated `_loop` variant, which is the property §2
wants most, and is disqualified anyway by its author's own description: "A **high energy** electronic
bleep-bloopy beat for games where there's **a lot of stuff going on**". That is §4.0's "nothing urgent,
ever" twice over. `a-clockwork` (CC0, skrjablin, 200) is a clean 65.14 s loop the author calls
"Loopable" and "very electronic", and **65 s is below §2's 90-second target** in an era that has no
trouble supplying length. Incompetech's `Crusade - Heavy Industry` names **anvils** in its instrument
list, which era 7 bans by name, and carries `Driving, Epic` in its own feel field.

---

## 8. Stage three (§7.4): eras eight, nine and ten, as one job

§7.4 says buy these three together because they are the three §6.5 finds genuinely hard and the three
most likely to need generation, and generation is cheapest as a single paid month. **One of the three
turns out not to need it.**

### Era 8: Atomic — three candidates, and §6.5's prediction is half overturned

§4 wants vibraphone, a light brushed kit, an upright bass walking gently, a Rhodes-like keyboard and one
soft muted horn, 84 to 96 bpm, sincere rather than ironic, and it names this "the run's one genuinely
**recorded** aesthetic".

**§6.5's measurement stands and its conclusion does not.** `mid century` still returns **0** CC0 music
results and `big band` **0**. But those are mood searches, and Incompetech indexes **instruments**.
Querying its 1,442 pieces for vibraphone, vibes, Rhodes, upright bass, bossa and brushes inside
§4.0's tempo band returns **12**, several of which are era 8's instrument list verbatim. **Era 8 does
not need generating. It needs CC-BY.**

**1. Cool Vibes** — era 8's instrument list, exactly, at the right tempo.

| | |
| --- | --- |
| URL | <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Cool%20Vibes.mp3> (200) |
| Licence | **CC-BY 4.0.** Attribution required, wording as in section 2.2. ISRC `USUAN1100863` |
| Author | Kevin MacLeod |
| File | `Cool Vibes.mp3`, 8,737,561 B, 320 kbps |
| Length | **218.38 s** (3:38) |
| Tempo | **83 bpm**, one below era 8's 84-96 |
| Loop | head −24.2 dB, tail **−91.0 dB**. **Ends in digital silence: a real edit** |

**Why it fits.** Instruments are "**Vibes, Bass, Kit**" and nothing else, which is era 8's trio with
nothing extra to argue about, and the author's description is "a simple little slow trio for use in such
things that require a slow jazz trio". `feel` is "Calming, Relaxed". **The flag is in the same sentence
and it is a §2 property 1 problem, not a taste one: "Modulates at the midpoint."** A key change is
precisely the learnable event §2 ranks as the most important defect — "anything the ear can learn to
expect becomes a metronome for the learner's attention" — and era 8's must-not list bans no key change
explicitly, but §5.2's does and §2's reasoning applies to every entry. **This is the one candidate in
the survey I would flag as likely to fail the ten-repetition test on evidence rather than suspicion.**

**2. Vibing Over Venus** — the recorded aesthetic §6.5 said the free pool does not have.

| | |
| --- | --- |
| URL | <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Vibing%20Over%20Venus.mp3> (200) |
| Licence | **CC-BY 4.0.** Attribution required. Catalogue row carries the ISRC |
| Author | Kevin MacLeod |
| File | `Vibing Over Venus.mp3`, 8,225,055 B, 160 kbps |
| Length | **411.14 s** (6:51) — the longest era candidate in the survey |
| Tempo | **94 bpm**, **inside era 8's own 84-96 band** |
| Loop | head −21.9 dB, tail **−91.0 dB**. **Ends in digital silence: a real edit** |

**Why it fits.** "Vibraphone, Bass, Drum kit, Percussion, Strings, Piano", `feel` "Calm, Grooving,
Relaxed", and a description written as a late-night radio show that names itself "**the only all-live
music** … frequency on your radio dial". §6.5's objection to the whole era was that "era eight's sound
is a recording aesthetic and free game-music libraries are overwhelmingly synthesised". A live-tracked
vibes date is the answer to that objection, and this is the candidate that claims it. §2 also wants
length above 90 seconds and this has 6:51 of it. **The costs are both real:** 8.2 MB at 160 kbps means
the encode saves less than usual, and the "Strings, Piano" entries are two voices more than era 8's
chamber trio.

**3. BossaBossa**

| | |
| --- | --- |
| URL | <https://incompetech.com/music/royalty-free/mp3-royaltyfree/BossaBossa.mp3> (200) |
| Licence | **CC-BY 4.0.** Attribution required. ISRC `USUAN1600055` |
| Author | Kevin MacLeod |
| File | `BossaBossa.mp3`, 5,355,450 B, 256 kbps |
| Length | **167.29 s** (2:47) |
| Tempo | **77 bpm**, below era 8's band and inside §4.0's |
| Loop | head −21.7 dB, tail −83.3 dB. **Ends in near-silence: a real edit** |

**Why it fits.** "Piano, Bass, Drums, Guitar", `feel` "Calming, Grooving, Bright", and — unusually for
this pool — **no retro framing in the description at all**, which matters because era 8's must-not list
is mostly about irony. The bossa idiom is what §6.3 reached for and this is a straight instance of it
without the joke.

**Excluded, and the first one matters because §6.3 named it as era 8's closest match.**

| Candidate | Verified | Why it is out |
| --- | --- | --- |
| Bossa Nova (<https://opengameart.org/content/bossa-nova>, 200) | **CC0**, Joth. The file is named **`8bit Bossa.mp3`**, 1,196,325 B, 160 kbps, **59.61 s**, head −19.6 / tail −19.9 dB → a genuinely clean loop | Three independent failures. It is a **chiptune**, so it is the opposite of era 8's recorded aesthetic; at **59.61 s** it is under §2's 60-second floor by four tenths of a second; and it is framed as a joke — "For those lengthy **elevator** sequences in your game!" — where era 8's entry insists "era eight is sincere and the joke would be at the era's expense". **§6.3's best CC0 lead for era 8 is an 8-bit novelty under a minute long**, and that is the single clearest piece of evidence for §6.5's verdict on this era |
| Two Left Socks (<https://opengameart.org/content/two-left-socks>, 200) | **CC0**, congusbongus. 200.22 s, 4,833,155 B, 193 kbps, head −26.4 / tail −35.0 dB | "Bossa nova **elevator music**, for shopping screens, waiting scenes, or actual elevators" — the lounge-kitsch register era 8 bans by name. Also tracker-made, so synthesised |
| Bossa Antigua (Incompetech) | **CC-BY 4.0**, 283 s, bpm 70 | "Welcome to **my pad**. My favorite parts are the view of the beach, and this very groovy **orange shag-carpeting**" — space-age-bachelor-pad pastiche, banned by name in era 8's must-not list |
| Blue Intermission (<https://opengameart.org/content/blue-intermission>, 200) | **CC0**, congusbongus. 236.75 s | **51 kbps ogg** — below anything shippable, and head −14.5 / tail −78.5 dB. Made with MilkyTracker |

### Era 9: Information — three candidates, and §6.5's real risk is unresolved

§4 wants processed and resynthesised sources with every performance gesture removed, **no audible hand
anywhere**, 72 to 88 bpm or no countable pulse, the longest loop in the set, and it bans the new-age and
meditation idioms outright. §6.5's finding was that scarcity is not the problem: "the risk here is a
track that is correct and characterless, which is harder to reject in review than a track that is
wrong."

**That risk survives this search intact.** Everything below is licence-clean, length-compliant and
correct on instrumentation, and I cannot tell from any available metadata which of them has character.
**This is the slot where §2's ten-repetition test does the actual selecting**, and it has not been run.

**1. Calm Ambient 1 (Synthwave 4k)**

| | |
| --- | --- |
| URL | <https://opengameart.org/content/calm-ambient-1-synthwave-4k> (200) |
| Licence | **CC0 1.0**, per-asset field. No attribution required |
| Author | cynicmusic (Pixelsphere) — **the author of both shipped tracks** |
| File | `001_Synthwave_4k_0.mp3`, 6,322,668 B, 320 kbps |
| Length | **157.90 s** (2:38) |
| Loop | head −75.4 dB, tail −76.9 dB. **Matched, but matched at near-silence**: it fades in and out, so trim rather than crossfade |

**Why it fits, and the flag is §6.5's exact warning.** Pads and sustained chords with no performance
gesture is era 9's instruction, and this is CC0 at a shippable length. **But the author's own
description — "Let calm relaxing pads and a soothing chords take you on a journey!" — is the
characterless-calm register §6.5 predicted**, and era 9's must-not list bans "sleep-playlist" material.
See section 4 for the set-coherence question raised by a third cynicmusic track.

**2. New Direction** — the strongest fit to era 9's "nothing explains itself".

| | |
| --- | --- |
| URL | <https://incompetech.com/music/royalty-free/mp3-royaltyfree/New%20Direction.mp3> (200) |
| Licence | **CC-BY 4.0.** Attribution required, wording as in section 2.2 |
| Author | Kevin MacLeod |
| File | `New Direction.mp3`, 27,186,072 B |
| Length | **679.55 s** (11:20) |
| Loop | head −25.9 dB, tail −75.5 dB. **Fades out: a real edit** |

**Why it fits.** Instruments: "Synths". `feel`: "Calming". Description: "A calm ambient piece using the
'Trope' synth for iPhone and some miscellaneous Logic synths." Era 9's signature move is that "a
listener cannot say what any of it was played on", and a piece built from an iPhone generative synth is
that by construction — **there is no hand in it to hear**, which is the absence era 9 is about. §4 also
says era 9 "can afford the longest loop in the set. Take it: it is the cheapest place in the run to buy
the property section 2 wants most." At 11:20 this is the only candidate that takes that offer.
**The cost is 27.2 MB**, which is 20× the house track and by far the largest encode in the survey.

**3. Global Resonance**

| | |
| --- | --- |
| URL | <https://opengameart.org/content/global-resonance> (200) |
| Licence | **CC0 1.0**, per-asset field. No attribution required |
| Author | Eponasoft |
| File | `global_resonance.ogg`, 2,936,833 B, 149 kbps |
| Length | **157.37 s** (2:37) |
| Loop | head −35.9 dB, tail −51.6 dB. **A 16 dB step: an edit, slightly worse than the house track's** |

**Why it fits.** The nearest to shippable size in the era-9 pool, in the container §2 prefers. **The
honest problem is that its description says nothing about the music at all** — only that it was written
for an unfinished 2002 game and released as a result — so its fit is entirely unevidenced and rests on
an audition. Note that the same author's other track in this survey, `cold-silence`, is self-described
as "rather unsettling", which is weak evidence about the catalogue rather than about this file.

**Excluded:** `ambient-relaxing-loop` (CC0, isaiah658, 200) is **24.51 s** — head −21.8 / tail −21.7 dB,
a genuinely clean purpose-built loop, and far under any usable length; §2 treats under-60 as needing an
exceptional surface and this is under half of that. Incompetech's `Tranquility Base` is 18 minutes of
drone and its author's own word for it is "**meditative**", which era 9's must-not list bans by name,
before the 42 MB is considered.

### Era 10: Cyberpunk — three candidates, and the problem §6.5 named is not solved

§4 wants a plain dark near-static bed with bright details attached to the outside of it, 76 to 92 bpm
and **explicitly not the fastest track in the game**, and it bans synthwave nostalgia, dystopian menace,
sirens and any cyber-action driving beat. §6.5: "Finding a cyberpunk track is trivial. Finding one that
is not synthwave is the hard part, and the search facet cannot help."

**Confirmed: the facet cannot help, and neither can the metadata.** Incompetech's catalogue yields only
**four** results in band for the whole neon/cyber/glitch/dystopia vocabulary, and all four fail on their
own descriptions: `Robobozo` is "slightly **dystopian**", `Canon In D Interstellar Mix` is a recognisable
melody over a "glitch reggae trap beat", `Dream Catcher` is lo-fi glitch, and era 10 bans glitch by
name. **So all three candidates are CC0 from OpenGameArt, and none of them can be cleared of the
synthwave objection without listening.**

**1. Dark City** — the best seam measurement of any era candidate.

| | |
| --- | --- |
| URL | <https://opengameart.org/content/dark-city-0> (200) |
| Licence | **CC0 1.0**, per-asset field. No attribution required |
| Author | cinameng |
| File | `darkcity_1.mp3`, 4,800,260 B, 320 kbps |
| Length | **120.0065 s** (2:00) |
| Loop | head −18.3 dB, tail −18.3 dB. **Identical, and neither end is silent.** The author's own description is "short loop 2m", so the intent is a two-minute loop and the measurement agrees |

**Why it fits.** §6.3's instinct holds: the title matches era 10's "ordinary dark box with an
extraordinary amount attached to it" better than the synthwave results do, and era 10's signature move
is that "strip the bright details and what remains should be almost nothing". A track built as a
two-minute loop rather than a cue is also the shape §2 asks for. **Unverified:** whether the bed is
plain and the ornament attached, or bright all the way through, which is the whole of the synthwave
question.

**2. Cyberpunk Beauty**

| | |
| --- | --- |
| URL | <https://opengameart.org/content/cyberpunk-beauty> (200) |
| Licence | **CC0 1.0**, per-asset field. No attribution required |
| Author | Tarush Singhal |
| File | `cyberpunk.mp3`, 2,248,760 B, 192 kbps — **the closest to shippable size in the era** |
| Length | **93.70 s**, just over §2's 90-second target |
| Loop | head −10.7 dB, tail −8.6 dB. **Within 2.1 dB, no fade**, and the author states "loops well" |

**Why it fits, and the flag is a level rather than a genre.** A clean loop at a shippable size with the
author's own loop claim behind it. **But it is the loudest file in the survey by a wide margin:**
−10.7 dB in the first half-second against the house track's −20.8 dB, so it is roughly 10 dB hotter than
what the game currently plays. §2 property 4 wants a narrow dynamic range and §5.2 requires the crisis
track to be quieter than the era track it replaces; an era-10 track this hot makes that harder
everywhere. Made in FL Studio, per the author's offer of the project file.

**3. Currents, from the T & T Free Cyberpunk Pack**

| | |
| --- | --- |
| URL | <https://opengameart.org/content/t-t-free-cyberpunk-pack> (200) |
| Licence | **CC0 1.0**, per-asset field, covering **all nine tracks in the pack** — one verification for nine candidates, which is the cheapest licence work in the survey |
| Author | tricksntraps |
| File | `Currents.ogg`, 15,419,836 B, 448 kbps |
| Length | **275.46 s** (4:35) |
| Loop | head **−91.0 dB**, tail **−91.0 dB**. **Digital silence at both ends: padded, not faded.** Trim the padding and the join may be clean; ship it as-is and there is dead air twice a pass |

**Why it fits.** The pack is the only place in the survey where one licence check buys nine auditionable
tracks, and the remaining eight (`Anti Matter Magic`, `Caves`, `Experiment G`, `Simulation Unknown`,
`Space Collisions`, `Test Subject`, `Tribal Chaos`, `Wicked beast`) cost nothing further to try —
though the titles of the last two are the action register era 10 bans. `Currents` is the one whose title
suggests the near-static bed. **At 15.4 MB and 448 kbps the encode is substantial**, and §6.3's size
finding applies here more than anywhere.

---

## 9. Brief entries I could not shop from

The task asked whether the brief can be bought from, since it was written before anyone tried. **Mostly
yes: §4's instrumentation lists, tempo bands, length floors and must-not lists are all directly
usable, and the must-not lists in particular did most of the work in section 8 — four candidates were
eliminated by matching an author's own words against a banned item.** Six entries are a different
matter.

**1. Era 10's closing move is unshoppable in principle, not merely in practice.** §4 requires "one
recognisable element from era one's track, retrofitted in. A struck stone, the bone flute's three notes,
the frame drum." **That asks for a track that quotes a track nobody has chosen yet.** No catalogue can
supply it, no search can approximate it, and it cannot be checked against a candidate even after era
one ships. It is a generation-or-commission requirement, or an edit made to a bought track (layering
era one's sample onto era 10's bed, which CC0 permits and CC-BY permits with a note). **It is presented
in §4 as era 10's signature move**, so this needs an explicit decision rather than quiet omission.

**2. §7.5's pitch centre is half shoppable, and the half that works is an accident of one catalogue.**
§7.5 says pick the crisis track's pitch centre and "make it a search criterion for every era track
thereafter", and calls it "nearly free if it is specified first". **OpenGameArt exposes no key metadata
at all** — not a field, not a facet, not usually a mention. **Incompetech names keys in prose for some
tracks** ("drone in D", "D Flat major", "36 cents sharp of the key of F"), so the criterion is
*checkable* there but still not *searchable*. Across ten tracks bought from catalogues, a shared pitch
centre is effectively unobtainable without transposing, which is an edit. **Worth knowing before it is
treated as free.**

**3. Era 1's "nothing repeats identically" cannot be shopped, only rejected.** No catalogue indexes
whether a percussion figure varies. It survives as an audition criterion, which is what §6.5 already
implies when it says era one's difficulty "is not finding a track, it is finding one that is not a
cliché".

**4. Era 3's "the seams are where the metal goes" is unshoppable, and this is why era 3 is empty.** The
entry asks for a specific structural placement: a piece that is otherwise plain with a single bright
struck note at each structural junction. **Nothing is indexed by where its accents fall.** Combined with
the zero results for the era's whole vocabulary, era 3 is the one slot that is both unshoppable and
empty, and those two facts are the same fact.

**5. Era 4's "the module is countable" and era 6's "second half answers its first half so exactly that a
listener could predict the answer" are form properties**, and form is not a search facet anywhere.
§6.5's own answer to this is the right one and it worked: search by repertoire, not by mood. That is
exactly how era 6 got its one strong candidate, and it is why era 4 — whose repertoire mostly does not
survive as CC0 recordings — got one weak one.

**6. §2's decisive test is not a shopping criterion at all, by its own admission.** "Play the candidate
ten times through with the tab in the background while doing something else. If you can name the moment
you are waiting for, the track fails." §2 says this "is the only test in this brief that catches property
1, which is the property that matters most", and puts it at about fifteen minutes per candidate.
**There are 30 candidates below in this document. That is roughly seven and a half hours of listening**,
and it is the step between this shortlist and any acquisition. It cannot be delegated to metadata and I
have not done it.

---

## 10. Where I would generate, and what I would prompt

Per §6.6: **paid tier only**, because free tiers grant non-commercial use and an upgrade does not
license retroactively; **not MusicGen**, whose weights are CC-BY-NC 4.0 and therefore barred by the same
rule §6.1 applies to audio; and **capture the four provenance facts at generation time** — tool and
model version, plan tier active at that moment, date, and prompt — because §6.6 establishes they cannot
be reconstructed afterwards.

**One slot needs generation outright.**

**Era 3, Bronze Age.** The catalogues fell short in the most complete way available: zero results for
the era's entire vocabulary in CC0, and a bells-and-chimes pool in CC-BY whose every top entry is
self-described as dark, eerie or unnerving. What I would prompt, built from §4's era 3 entry rather than
from the word "bronze":

> Slow, patient instrumental loop at 80 bpm. Tuned wooden bars and a soft frame drum carry a plain,
> unhurried figure. At each phrase junction, one single bright struck bronze bell or small gong marks
> the join and then stops — one note, never a flourish, never a hit. A low double-reed line underneath,
> long note values. No iron, no anvil, no clanging, no brass section, no Middle Eastern or Egyptian
> scales or ornaments, no cinematic swell, no fanfare arpeggio, no melody you could whistle back. Warm,
> weighty, settled. No voices. Ends at the same level it starts.

**Two slots are thin and generation is the fallback rather than the recommendation.**

**Era 4, Classical** has one candidate and it is a sketch. If the lead rejects it, prompt for §4's
countable module directly: a chamber-sized ensemble of lyre-like plucked strings, a soft double reed and
light frame percussion, 86 bpm, a fixed-length phrase repeated at exactly constant spacing that never
elides, weight added by another repetition rather than a bigger sound, no orchestral strings, no
timpani, no rubato.

**Era 6, Early Modern** has one strong candidate whose renderer says it leans Baroque, and a second
borrowed from era 5 that §3 will not let it keep. If both fail, this is the cheapest slot in the run to
generate well, because the form is explicit: equal-length antecedent and consequent phrases for a small
consort of viols or lute in parts with a chamber organ, 84 bpm, nothing improvised, resolving exactly to
its opening.

**Era 2 is no longer a generation recommendation, with one condition.** §6.6 and §7.2 both flag era 2 as
the stage-one track most likely to need generation, and that was right about CC0 — there is no CC0
candidate. **But `Accralate` is a marimba-and-percussion track at 78 bpm, which is era 2's own band and
era 2's own instrument.** If CC-BY is acceptable, era 2 is filled and §7.2's warning to "budget for this
one going to generation" can be stood down. **If CC-BY is not acceptable, era 2 returns to the
generation list** and joins era 3 as a stage-one cost.

**Era 8 is off the generation list**, which is the largest single change this pass makes to §6.6's
recommendation. §6.6 named eras 8, 9 and 10 plus era 2 as the generation set. On today's evidence era 8
has three CC-BY candidates carrying its exact instrument list, era 9 has three, and era 10 has three; the
open question at eras 9 and 10 is character, which an audition settles and a generator does not
automatically improve.

---

## 11. Every candidate, in one table

Loop column: **clean** means head and tail are within about 5 dB with neither end silent; **step** means
a level jump comparable to or worse than the house track's own 12.1 dB; **edit** means an end in
silence; **trim** means silence or near-silence at both ends. Baseline for comparison:
`town-theme.mp3` is 97.45 s, 108 kbps, 1,316,581 B, step (−20.8 / −32.9 dB).

| Slot | Candidate | Licence | Length | Size | Loop |
| --- | --- | --- | --- | --- | --- |
| Crisis (shared) | Contemplation | CC0 | 120.06 s | 2,405,271 B | step (−42.1 / −27.9) |
| Crisis (shared) | Persistence | CC0 | 127.19 s | 5,087,607 B | trim (−78.0 / −81.3) |
| Crisis (shared) | Somnium | CC0 | 219.06 s | 8,762,584 B | edit (−43.4 / −91.0) |
| Crisis, era 1 only | Frost in the Northern Winter | CC0 | 312.000 s | 23,200,615 B (FLAC) | unmeasured; encode first |
| Crisis, era 4 only | **none** | — | — | — | — |
| Crisis, era 6 only | EmptyCity | CC0 | 100.0025 s | 2,021,058 B | edit (−29.4 / −66.8) |
| Crisis, era 6 only | Village Ruins | CC0 | 143.9985 s | 2,305,121 B | edit (−23.3 / −81.3) |
| Crisis, era 9 only | Pondering the Cosmos | CC0 | 307.75 s | 12,310,011 B | **clean (−23.8 / −23.6)** |
| Era 1 Prehistoric | Alien Restaurant | **CC-BY 4.0** | 372.79 s | 10,909,311 B | **clean (−28.8 / −27.4)** |
| Era 1 Prehistoric | Tribal | CC0 | 192.19 s | 7,692,496 B | edit (−13.5 / −68.6) |
| Era 1 Prehistoric | Krakatoa | CC0 | 72.000 s | 1,136,376 B | **clean (−16.9 / −16.9)**, under length |
| Era 2 Neolithic | Accralate | **CC-BY 4.0** | 305.37 s | 11,060,298 B | edit (−27.6 / −91.0) |
| Era 2 Neolithic | Cherry Blossom | **CC-BY 4.0** | 129.80 s | 5,297,320 B | edit (−26.0 / −91.0) |
| Era 2 Neolithic | Spring's Pastorales IV | **BLOCKED**, multi-licence | 143.95 s | 2,584,464 B | clean (−36.9 / −39.0) |
| Era 3 Bronze Age | **none** | — | — | — | — |
| Era 4 Classical | greek instruments | CC0 | 100.94 s | 2,270,950 B | **clean (−21.1 / −16.6)** |
| Era 5 Medieval | Hush Hamlet (`_loop`) | CC0 | 96.000 s | 36,864,210 B (WAV) | unmeasured; author ships a loop cut |
| Era 5 Medieval | Medieval: Exploration | CC0 | 236.15 s | 9,446,112 B | trim (−91.0 / −77.8) |
| Era 5 Medieval | GrassLands Theme | CC0 | 164.36 s | 6,576,546 B | **clean (−26.0 / −20.5)** |
| Era 6 Early Modern | Dowland 1597 | CC0 | 161.52 s | 6,460,674 B | edit (−14.8 / −90.3) |
| Era 6 Early Modern | Angevin (shared with era 5) | **CC-BY 4.0** | 280.56 s | 11,224,420 B | edit (−21.7 / −91.0) |
| Era 7 Industrial | Factory ambiance | CC0 | 123.0005 s | 2,485,366 B | **clean (−46.8 / −41.8)** |
| Era 7 Industrial | Cottages | **CC-BY 4.0** | 233.86 s | 4,433,764 B | **clean (−14.6 / −16.6)** |
| Era 7 Industrial | Factory | CC0 | 107.55 s | 2,581,106 B | step (−25.9 / −36.8) |
| Era 8 Atomic | Cool Vibes | **CC-BY 4.0** | 218.38 s | 8,737,561 B | edit (−24.2 / −91.0) |
| Era 8 Atomic | Vibing Over Venus | **CC-BY 4.0** | 411.14 s | 8,225,055 B | edit (−21.9 / −91.0) |
| Era 8 Atomic | BossaBossa | **CC-BY 4.0** | 167.29 s | 5,355,450 B | edit (−21.7 / −83.3) |
| Era 9 Information | Calm Ambient 1 | CC0 | 157.90 s | 6,322,668 B | trim (−75.4 / −76.9) |
| Era 9 Information | New Direction | **CC-BY 4.0** | 679.55 s | 27,186,072 B | edit (−25.9 / −75.5) |
| Era 9 Information | Global Resonance | CC0 | 157.37 s | 2,936,833 B | step (−35.9 / −51.6) |
| Era 10 Cyberpunk | Dark City | CC0 | 120.0065 s | 4,800,260 B | **clean (−18.3 / −18.3)** |
| Era 10 Cyberpunk | Cyberpunk Beauty | CC0 | 93.70 s | 2,248,760 B | **clean (−10.7 / −8.6)**, hot |
| Era 10 Cyberpunk | Currents (T&T pack) | CC0 | 275.46 s | 15,419,836 B | trim (−91.0 / −91.0) |

---

## 12. What this shortlist does not decide, and what it cannot claim

1. **Whether any of these sounds good, or is bearable at the tenth pass.** Nothing was listened to.
   §1's serious-versus-threatening judgement and §2's ten-repetition test are both unrun, and they are
   the two tests the brief itself calls decisive.
2. **Whether the two shipped tracks are era five's and six's.** §7.1's question is still open and still
   needs one listening session. **NOT DONE.**
3. **One crisis track or four.** §5.1 recommends one; `eraMusic.ts` assumes four. Section 3 presents
   both and names the empty slot the four-track reading creates.
4. **Whether CC-BY is acceptable at all.** Nine of the 30 candidates are CC-BY 4.0, and they include the
   only candidates for era 2 and era 8 and the best-measuring candidate for era 1. If the answer is
   CC0-only, three slots move to generation rather than one.
5. **Whether the standing rejection of multi-licensed OpenGameArt assets is relaxed.** §6.4 leaves that
   to the audio owner; it decides whether era 2's best-measuring file is a candidate.
6. **Two seam measurements are missing**, both because the file is uncompressed and the proxy would
   mean decoding tens of megabytes: `hush_hamlet_loop_0.wav` and
   `01_frost_in_the_northern_winter.flac`. Both have exact-integer durations, which is suggestive and is
   not a measurement of the seam.
7. **Every loop verdict here is a level comparison over half a second at each end.** It rules candidates
   out; it does not rule any in. A level-matched track can still lurch harmonically at the wrap, and no
   metadata anywhere will say so.
