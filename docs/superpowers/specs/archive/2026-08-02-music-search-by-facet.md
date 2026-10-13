# Filling the music gaps by searching differently: facets, not era vocabulary

**Date:** 2026-08-02
**Status:** findings, for the lead. **Nothing was acquired, nothing was downloaded into the
repository, nothing was generated, and no audio file is added by this change.** Candidate audio was
streamed over HTTP by `ffprobe`/`ffmpeg`, which read and wrote nothing; `git status` for
`apps/web/public/audio/` is unchanged.
**Measured at:** `integration` `cef3e27d`, which is the tip **after** #443, #444 and #448 all
merged. Catalogue figures were run on 2026-08-02.
**Reads under:** `docs/superpowers/specs/2026-08-01-era-and-crisis-music-brief.md`, treated as
binding and not amended. Sections cited as §1, §4 era 3, §5.2 and so on.
**Reads against:** the three shortlists that already exist, so that nothing here re-finds and
re-rejects a track one of them already killed.

---

## 0. The instruction, and whether it holds

The lead:

> *"just search with different parameters. there's definitely something there. wherever there are
> gaps, just modify the search parameters."*

**Measured, he is right about four of the five slots and wrong about one, and the one he is wrong
about is the useful part of the answer.** Era 2 Neolithic survives a correctly-faceted search still
empty on CC0, and that is now a much stronger claim than it was, because the search that failed is
no longer a search anyone can improve by trying harder.

The headline, per slot:

| Slot | Before | After searching by facet | New candidates |
| --- | --- | --- | --- |
| **Era 3 Bronze Age** | two lists say empty, one has two weak CC-BY rows | **Filled, thinly.** One CC0 and one CC-BY | 2 |
| **Era 1 Prehistoric** | the three disagree; candidates are marginal | **Two new**, and one answers era one's hardest ban outright | 2 |
| **Era 2 Neolithic** | one list's only empty slot | **STILL EMPTY on CC0**, and the best CC-BY row is now disqualified too | 0 |
| **Era 4 Classical** | one candidate, called a sketch | **Two new**, one CC0 at exactly the right length | 2 |
| **`crisis-classical`, Succession** | two lists found nothing | **Three new.** The facet pool is 58 deep, not zero | 3 |

**Nobody has listened to anything — not in the three earlier lists, and not here.** §2's
ten-repetition test and §1's serious-versus-threatening judgement are ear tests. They are the two
tests the brief itself calls decisive, they cannot be mechanised, and this pass did not attempt
them. Every fit argument below is made from a structured catalogue field, the author's own words, or
a measurement of the file.

---

## 1. Why the gaps were an artefact, in one measurement

§3 of the brief says take the era's signature **move**, not its period instruments. The three
earlier lists searched era 3 for `bronze`, `gong`, `harbour`, `lyre` and `antiquity` — five period
nouns — and reported it empty. Re-run today on OpenGameArt with art type Music and licence CC0:

| Era 3 searched as a **period** | Results | Era 3 searched as **its instrument list** | Results |
| --- | --- | --- | --- |
| `bronze` | **0** | `bells` | **59** |
| `harbour` / `harbor` | **0** / **0** | `percussion` | **38** |
| `lyre` | **0** | `harp` | **26** |
| `antiquity` | **0** | `chimes` | **12** |
| `gamelan` | **0** | `marimba` | **7** |
| `trade` / `merchant` | **0** / **0** | `oboe` | **6** |
| `singing bowl` | **0** | `glockenspiel` | **5** |
| `gong` | **1**, a game-over clip | `xylophone` | **4** |

**The zeroes are real and they reproduce.** The point is not that the earlier searches were run
badly; it is that a catalogue indexes what a track is *made of* and not what century it evokes, so
querying the century returns the empty set no matter how many synonyms you try. Sweeping era 3's
whole instrument, texture and register vocabulary returns **96 distinct CC0 music assets** where its
period vocabulary returns one game-over sting.

That is the same move that filled Era 8: the third shortlist got era 8's trio by querying
instrumentation plus tempo band rather than "mid century". It generalises.

### 1.1 Two search **parameters** that were wrong everywhere, and both are one-line fixes

**`items_per_page` defaults to 24 and 144 is available.** All three lists worked under "the first
page caps at 24, so any figure reading 24 means at least 24"
(`2026-08-01-era-and-crisis-music-brief.md` §6.5). It is not a cap, it is a default. The advanced
search form offers 24, 48, 72, 96, 120 and 144. Measured on the same query today:

| Query | `items_per_page=24` | `items_per_page=144` |
| --- | --- | --- |
| `ambient`, CC0, Music | 25 results | **142 results** |

So every count in the three lists that reads 24 is an undercount of unknown size, and several
figures reported as page-capped are now countable: `ancient` is **37**, not 24; `trance` **56**;
`deep` **45**; `free time` **43**; `simple loop` **41**; `seamless` **36**. **The zeroes are
unaffected** — a query returning nothing at 24 returns nothing at 144 — which is why era 3's
period-noun result stands and era 3's instrument result changes.

**The advanced search also has a tag facet with boolean operators**, `field_art_tags_tid` plus
`field_art_tags_tid_op` set to `or`, `and` or `not`. None of the three lists used it. It is what
lets a query be an *intersection* of properties rather than a bag of words: `tags=[loop,
percussion] op=and` is a different question from `keys="loop percussion"`.

**Incompetech publishes its catalogue as one structured file.** `pieces.json`, **1,442 rows**, and
every row carries `instruments`, `bpm`, `feel`, `length`, `genre`, `description` and `isrc`. `feel`
is a **controlled vocabulary of 20 terms** — Dark, Grooving, Relaxed, Bright, Bouncy, Driving,
Calming, Mysterious, Intense, Eerie, Unnerving, Somber, Mystical, Uplifting, Humorous, Epic, Action,
Suspenseful, Aggressive, Calm — and `genre` is a closed list of 23. That means **§1 is directly
expressible as a query.** The threat register the brief spends a whole section naming is nine of
those twenty terms, and excluding them is a filter rather than a judgement. Every Incompetech figure
below has that filter applied.

---

## 2. What the three lists actually say, reconciled

The task brief describes era 3 as a slot "all three call empty". **Checked at `cef3e27d`, two of
the three call it empty and the third gives it two candidates.** The distinction matters, because it
changes which of my finds is new:

| Slot | `-shortlist.md` (#443) | `-candidates.md` (#444) | `-music-candidate-shortlist.md` (#448) |
| --- | --- | --- | --- |
| Era 3 | **2 candidates**, both CC-BY, "honestly weak", and "if the crisis takes Organic Meditations One, era three is effectively a second gap" (`:957-960`) | "**NOT SHORTLISTED. Named gap**" (`:355`) | "**NO CANDIDATE**" (`:498`) |
| Era 1 | 3 candidates (Ras Quarry, Tribal, Sky of our Ancestors) | "**NOT SHORTLISTED.** This is a named gap, and it is **the most important one in the document**" (`:239-240`) | 3 candidates (Alien Restaurant, Tribal, Krakatoa) |
| Era 2 | "**NO CANDIDATE. This is the named gap**" (`:439`) | 3 candidates (Krakatoa, Slow Heat, Spring's Pastorales IV) | 2 CC-BY (Accralate, Cherry Blossom) + 1 licence-blocked |
| Era 4 | 2 (greek instruments, Canon in D) | 2 (greek instruments, Minimalistic Flute & Strings) | **1**, "which is fewer than asked for" (`:521`) |
| Succession | 2 CC-BY (Weight of Responsibility, Organic Meditations Two) | "**NO CANDIDATE**" (`:627`) | "**EMPTY**" (`:314`) |

**All three lists were merged before this pass began**, #443 and #444 at 2026-08-02T21:41Z and #448
at 22:48Z, read from each PR's `mergedAt` rather than inferred. #448 was still open when I started
reading it and merged during the run, which is why this document is measured at `cef3e27d` rather
than at the SHA any of them were written against.

**Every candidate below was checked against all three exclusion tables before being proposed.**
Nothing here is a re-find.

---

## 3. Two findings against the earlier lists, before the slots

### 3.1 Era 2's one in-band candidate is disqualified by its own catalogue description

`-music-candidate-shortlist.md` calls **Accralate** "the closest thing to era two's entry in either
catalogue" and stands era 2 down from the generation list on the strength of it (`:418`, `:1054`).
Its argument is the instrument field, "Percussion, Marimba", and the published 78 bpm, which is
genuinely inside era 2's own 72-84 band.

**The `description` field on the same row, quoted in full, says:**

> African-inspired lazy drum ensemble. **Feel change in the middle; Tempo change near the end.** Lots
> of polyrhythms. This piece exhibits some phantom notes athat you hear, but don't really exist. Hard
> to explain. Batu, Conga, Marimba, Agogo, Cowbell, Clave.

Three separate disqualifications, none of them a matter of taste:

1. **"Tempo change near the end"** is §1.1 item 1, the first-named of the six devices that make
   music threatening — *"A tempo that climbs... **is a clock**"* — and era 2's entry asks for
   "**metronomically steady**", which it calls "itself the era's statement".
2. **"Feel change in the middle"** is §2 property 1's learnable event, the property the brief ranks
   above all others.
3. The instrument field is not the whole kit. The description names **Agogo** and **Cowbell**, both
   struck metal. §4 era 2's must-not opens "**No metal, no bright cymbal or bell**", and §4 era 3
   owns *"the run's first struck metal"*. Accralate spends era three's signature one era early, which
   is the same objection `-shortlist.md` used to reject the kalimba loop.

**So era 2's stand-down should be reversed and era 2 returns to the generation list.** This is not a
new search result; it is the second field on a row all three passes already had open.

### 3.2 Musical key *is* searchable on OpenGameArt, though thinly

Both #444 (`:932-937`) and #448 (`:984`) report that §7.5's pitch-centre criterion cannot be
shopped: *"OpenGameArt exposes no key metadata at all — not a field, not a facet, not usually a
mention."* Measured at `items_per_page=144`, CC0 + Music:

| Key term | As a **tag facet** | As **full text** |
| --- | --- | --- |
| `D major` | 0 | **21** |
| `A minor` | 1 | **20** |
| `dorian` | 4 | **14** |
| `D minor` | 1 | **10** |
| `C major` | 2 | 7 |
| `mixolydian` / `pentatonic` | 2 / 2 | 4 / 3 |

`waiting40` (CC0) is tagged `D dorian` outright. **The correction is narrow and worth having:** key
is not a structured field and it is not reliably present, so it cannot *enumerate* the pool the way
Incompetech's `bpm` can. But it is a real filter, so §7.5's instruction to fix a pitch centre first
and use it as a criterion is **partially executable rather than impossible**, and a shortlist of ten
to twenty per key is a usable starting set rather than nothing.

---

## 4. Method, and its self-check

**Licences were read per asset**, from the structured `License(s)` field on each OpenGameArt asset's
own page, which is the method `apps/web/public/audio/CREDITS.md:13-17` requires and never from a
search filter. **The reader was validated in both directions before it was used**, because a checker
that always answers CC0 proves nothing:

| Asset | Reader returned | Committed record |
| --- | --- | --- |
| `town-theme-rpg` | `CC0` | `CREDITS.md:28` |
| `a-new-town-rpg-theme` | `CC0` | `CREDITS.md:29` |
| `magic-town` | `CC0` | `CREDITS.md:45` |
| `feel-good-island` | **`OGA-BY 3.0 + CC0`** | `CREDITS.md:16-17`, the recorded rejection |
| `springs-pastorales` | **`CC-BY-SA 4.0 + CC-BY-SA 3.0 + CC0`** | brief §6.4 |

It returns a single licence for single-licensed assets and the full multi-licence field for both
assets already on record as multi-licensed, so it can distinguish the two cases rather than
defaulting to the answer I wanted.

**65 distinct OpenGameArt asset pages had their licence field read per asset in this pass.** Sixty
returned CC0; five are multi-licensed and therefore sit behind §6.4's open question, which belongs
to the audio owner and not to this document:

| Multi-licensed | Field |
| --- | --- |
| `ice-shine-bells` | `CC-BY 3.0 + CC0` |
| `repetitive-mixed-style-track` | `CC-BY 3.0 + CC0` |
| `mama-hedgehogs-theme` | `OGA-BY 3.0 + CC0` |
| `feel-good-island` | `OGA-BY 3.0 + CC0` |
| `springs-pastorales` | `CC-BY-SA 4.0 + CC-BY-SA 3.0 + CC0` |

**Incompetech's licence is site-wide, not per asset**, and that is a real difference from
OpenGameArt rather than a formality. Read on its FAQ today, verbatim: *"Is this music Copyright
Free? **No. All of this music is copyrighted.** Though some of the baroque and classical
compositions are in the public domain; **these recordings are not**."* Every Incompetech row below
is **CC-BY 4.0** and is marked as such.

**Measurements** are `ffprobe` for duration, bitrate and size, and `ffmpeg -af volumedetect` over
the first and last 0.5 seconds for the seam, which is the same proxy #448 used so the numbers are
comparable to its table. Calibrated against the two shipped files:

| Shipped file | Duration | Bitrate | Size | head 0.5 s | tail 0.5 s | Step |
| --- | --- | --- | --- | --- | --- | --- |
| `town-theme.mp3` (**the house track**) | 97.49 s | 108 kbps | 1,316,581 B | −20.8 dB | −30.9 dB | **10.1 dB** |
| `a-new-town.mp3` | 62.32 s | 98 kbps | 766,291 B | −16.6 dB | −55.9 dB | 39.3 dB |

**The house track that has been looping in production all along has a double-digit step at its own
wrap point.** So "needs a loop edit" below means *comparable to what already ships*, not *unusable*,
and no candidate is rejected for that alone. A tail at −91 dB is a different category, because that
is digital silence and the restart is a hard event rather than a step.

**What the seam proxy is not.** It is a level comparison over half a second. It cannot see a
harmonic or rhythmic mismatch, so a level-matched track can still lurch at the wrap. **It rules
candidates out; it never rules one in.**

---

## 5. Era 3, Bronze Age — the priority slot. **FILLED, THINLY: 1 CC0 + 1 CC-BY**

### The facets, derived from §4 era 3 before searching

The entry gives four properties that a catalogue can actually hold, and one that it cannot:

| The brief says | The facet |
| --- | --- |
| *"era two's tuned wood and drums, plus the run's first struck metal... **held to points and small in area**"* | The **body** is tuned wood plus hand drums; the metal is an **accent**. So query the body, not the metal — a metal-led track is the wrong shape |
| *"A double-reed or a lyre-like plucked string carries whatever line there is"* | instruments ∋ oboe / bassoon / shawm / reed, or harp / lute / zither / dulcimer |
| *"76 to 88"*, weight from *"register and note length, never from speed"* | `bpm` ∈ [76, 88], widening to §4.0's [60, 100] |
| *"100 to 180 seconds"* | duration ≥ 100 s |
| *"No iron or steel timbre, no anvil, no brass section, no Middle-Eastern or Egyptian idiom"* | instruments ∌ anvil / trumpet / trombone / tuba / horn / brass / timpani, and drop the nine threat feels |
| *"the seams are where the metal goes"* — one bright struck note at each structural junction | **Not a facet.** Nothing anywhere indexes where a track's accents fall. #444 and #448 both say so and they are right |

### What came back

**Incompetech, struck metal ∩ bpm 76-88 ∩ ≥100 s ∩ non-threat ∩ no banned timbre: 1 result**, and it
is a guitar-and-drum-kit combo. Widening the band to 60-100 or unpublished gives **11**, of which the
two viable ones are `That Zen Moment` and `Organic Meditations One` — **both already shortlisted by
#443**, so the metal facet is exhausted and #443 got there first.

Querying the **body** instead is what pays. Tuned wood ∩ bpm 76-88 ∩ ≥100 s ∩ non-threat gives 5;
widened, 17. And on OpenGameArt the instrument sweep gives **96 distinct CC0 assets** against the
period vocabulary's one.

### Candidates

**1. Ancient Temple, by yd — CC0, and the only CC0 candidate any pass has produced for this slot.**

| | |
| --- | --- |
| URL | <https://opengameart.org/content/ancient-temple-1> |
| **Licence** | **CC0**, read from the structured `License(s)` field on the asset page. **No attribution obligation** |
| Tags | `ancient, percussion, pipes, ruins, temple` |
| File | `ancient_temple.wav`, **106.00 s**, 1414 kbps, 18,736,804 B |
| Seam | head **−91.0 dB**, tail **−79.9 dB**. Silent at both ends: **padded, not faded.** Trim the padding and the join may be clean; ship as-is and there is dead air twice a pass |

**Why it fits.** Its tags are `percussion` and `pipes` and nothing else — that is era 3's hand-drum
body and its double-reed line, with no guitar, no piano and no brass to argue about, which is what
disqualified both of the brief's own §6.3 era-3 rows on their authors' own words. **106.00 s is
inside era 3's own 100-180 window** and above §2's 90-second floor, which no other era-3 candidate
in any pass manages on a CC0 licence. It was found on `pipes`, a two-result query that returns this
and one synth track, and on `ancient` at the lifted page size where it sits at position 37 — **it is
literally the result the 24-row default cut off.**

**Two things against it, both stated rather than buried.** It is **WAV only at 18.7 MB**, so an
encode is mandatory before it is even auditionable at shipping quality; CC0 permits that with no
obligation. And the author's own note is *"I have little experience with this style of instruments.
I would like to know what you think"*, which is a candid warning that this is an experiment rather
than a finished cue — the same caveat era 4's `greek instruments` carries. Worth recording on the
other side: *"I did not use any Apple Loops on this one"*, which is the exact provenance problem
that made #443 exclude `medieval-theme`.

**2. Kalimba Relaxation Music, by Kevin MacLeod — CC-BY 4.0.**

| | |
| --- | --- |
| URL | <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Kalimba%20Relaxation%20Music.mp3> |
| **Licence** | **CC-BY 4.0.** Attribution **required**, in the author's specified form. ISRC `USUAN1900039` |
| Catalogue | instruments **Kalimba, Synth**; `bpm` **0**, meaning no countable pulse published; feel **Calm, Calming, Relaxed** |
| File | **428.07 s** (7:08), 323 kbps, 17,257,632 B |
| Seam | head −17.8 dB, tail **−91.0 dB**. **Ends in digital silence: a real edit** |

**Why it fits, and it is an argument #443 half-made for me.** #443 rejected `Short kalimba loop`
*for era 2* on the ground that *"a kalimba's tines are steel: §4 era 2 bans metal and §4 era 3 owns
'the run's first struck metal', so this spends era three's signature two eras early"*. That
reasoning is a **re-homing instruction**: what makes a kalimba wrong for era 2 is exactly what makes
it right for era 3. A kalimba is a plucked metal tine over a wooden body — struck metal held to
points, small in area, over a wooden resonator — which is era 3's instrument brief rendered as a
single instrument. The feel field carries nothing from the threat vocabulary, and at 7:08 §2
property 3 is satisfied several times over.

**Against it.** The instrument list's second entry is **Synth**, and era 3 is meant to predate that
by nine eras; §4 era 3 does not ban a synthesiser by name the way era 7 does, so this is a judgement
rather than a rule, but it is the thing to listen for. And **the steel question cuts both ways** —
era 3's must-not opens "No iron or steel timbre", and whether a kalimba's soft bell-like attack
reads as steel timbre or as a struck bowl is an ear call and it is the lead's.

### Era 3, what I would not propose

`Kingdom of a Million Elephants under a White Parasol` (CC0, marimba and xylophone, 92.57 s) has the
**best seam measurement of any era-3 asset** at head −13.3 / tail −13.5 dB, within 0.2 dB. It is out
on its own tag list, which reads `asian, brass, faux asian`: brass is banned by name and "faux
asian" is §6.5's imported geography admitted by the uploader. `Hidden Temple` is out because its
author says "Egyptian statues", which era 3 bans by name. `Ice Shine Bells` is a 46 kbps ogg **and**
multi-licensed `CC-BY 3.0 + CC0`. `Besai Crystal Gardens 2` is tagged `Clangs`. `Sunflower Valley`
is a Spyro pastiche its author calls "upbeat". `Crystal Glades` is self-described "Creepy".

---

## 6. Era 1, Prehistoric — the lists disagree. **2 NEW CANDIDATES**

### The facets

Era 1's entry is unusually facetable, because its instrumentation is a **closed list** rather than a
suggestion, and the right query is therefore a **subset test** and not a keyword:

| The brief says | The facet |
| --- | --- |
| *"Struck and shaken things with no pitch centre to defend: frame drum, hollow log, stones, a rattle, a breathy end-blown flute"* | **Every** instrument named on the row must fall inside {drums, percussion, flute, whistle, shaker, rattle, log}. Not "contains a drum" — *contains nothing else* |
| *"No metal of any kind, no drone synthesiser, no orchestral strings"* | falls out of the subset test for free |
| *"roughly 60 to 72, and deliberately not locked"* | `bpm` ∈ [60,72] **or unpublished**, since an unpublished bpm is what an unlocked pulse looks like in this field |
| *"90 to 150 seconds"* | duration ≥ 90 s |
| *"no instrument that names a specific living culture"* | not a facet directly, but it **is** checkable against the description |
| *"nothing repeats identically"* | **Not a facet.** #443 turned it into a measurement instead, which is the better answer |

### What came back

**The subset test over all 1,442 Incompetech rows, at era one's own 60-72 band, ≥90 s, non-threat:
zero.** Widened to 50-100: **three, in the entire catalogue.** One of the three is `The Sky of our
Ancestors`, which #443 already has as candidate 2C. The other two are new.

That is a useful number in itself: era 1's pool is not "13 tribal results", it is **three rows that
contain nothing era 1 forbids**, and the gap between those two figures is exactly §6.5's warning
that the healthy-looking pool is full of things that fail the entry's first sentence.

### Candidates

**1. Lotus, by Kevin MacLeod — CC-BY 4.0, and it answers era one's hardest ban in the author's own
words.**

| | |
| --- | --- |
| URL | <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Lotus.mp3> |
| **Licence** | **CC-BY 4.0.** Attribution required. ISRC `USUAN1900019` |
| Catalogue | instruments **Drums** and nothing else; `bpm` **98**; feel **Calm, Grooving, Relaxed**; genre World |
| File | **328.31 s** (5:28), 320 kbps, 13,136,374 B |
| Seam | head −18.1 dB, tail **−91.0 dB**. **Ends in digital silence: a real edit** |

**Why it fits.** The author's whole description does two of era one's jobs in two sentences:

> A pan-world percussion track. **No melodies.** Could be Australian, could be Indian, could be
> African, could be Chinese, could be Hawaiian. Probably Guamish.

Era 1's must-not list contains *"no melody you could whistle back"* and *"no didgeridoo or **any
instrument that names a specific living culture**"*. §6.5 calls the second one era one's real
difficulty — *"its difficulty is not finding a track, it is finding one that is not a cliché"* — and
this is **the only track in either catalogue whose author addresses that constraint directly**,
by naming five cultures in order to disclaim all of them. "No melodies" is the other ban, stated by
the person who made it. The instrument list is one word long, which is §1.2's *fewer voices and more
space*, and the feel field carries nothing from the threat vocabulary.

**Against it, and it is the one real objection: 98 bpm.** That is 26 above era one's own 60-72 and
sits at the very top of §4.0's global 60-100. §3 rules that the set never expresses era through
tempo, and era one is meant to be the slow end. **This is the trade to put to the lead**: a track
that satisfies era one's two hardest *content* bans and misses its tempo band badly, against
`Tribal`, which sits at 66 bpm dead centre and which #443 measured at repeat 0.628 — *"measurably
closer to era two's property than era one's"*. Note also that this bpm is published rather than
estimated, so it is not an octave error.

**2. Grim League, by Kevin MacLeod — CC-BY 4.0. The weight reading, and shorter.**

| | |
| --- | --- |
| URL | <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Grim%20League.mp3> |
| **Licence** | **CC-BY 4.0.** Attribution required. ISRC `USUAN1100779` |
| Catalogue | instruments **Percussion** and nothing else; `bpm` **76**; feel **Somber** |
| File | **159.53 s** (2:39), 320 kbps, 6,383,406 B |
| Seam | head −20.8 dB, tail **−91.0 dB**. **Ends in digital silence: a real edit** |

**Why it fits.** An all-percussion ensemble with no pitched instrument at all, 159.53 s which is
inside era one's 90-150 window's upper reach and above §2's floor, and the author's own framing is
§1.2 almost verbatim: *"This all drum ensemble will convey **the gravity of the situation**...
Anything with **weight**."* §1.2's answer to "how do we sound serious without sounding threatening"
is *"Weight rather than speed. Gravity is a function of mass."*

**Against it.** The feel field is **Somber** alone, and the author's use cases are "Funeral, speech
about a battle plan". Era 1 is a settlement with a fire in it, not a funeral, so the affect may be
too grave — and 76 bpm is 4 above the band. **This is the second-choice row**, offered because era 1
is a slot where two of three lists disagreed about whether anything usable exists.

---

## 7. Era 2, Neolithic — **STILL EMPTY ON CC0. The different-parameters theory does not hold here.**

This is the slot where the answer is a finding rather than a candidate, and it is worth more than a
weak row would be.

### The facets

| The brief says | The facet |
| --- | --- |
| *"era one's kit plus the first **pitched, tuned, repeatable** thing: a simple plucked string or a struck wooden bar with a fixed pitch set"* | subset of {percussion, drums, shakers} ∪ {marimba, xylophone, balafon, wood, dulcimer, zither, harp, lute} |
| *"72 to 84 and **metronomically steady**"* | `bpm` ∈ [72, 84] |
| *"100 to 180 seconds"* | duration ≥ 100 s |
| *"**No metal**, no bright cymbal or bell"* | instruments ∌ any metal term — this is what makes the subset test, not a keyword, the right query |
| *"no harvest-festival jollity"* | drop feel `Bouncy` alongside the nine threat terms |
| *"nothing that varies the repeated figure"* | **Not a facet**, and #443 puts the reason best: *"No search facet can express 'does not vary', so this is not a search that was run badly; it is a search that cannot be expressed"* |

### What came back

**Incompetech, kit subset ∩ 72-84 ∩ ≥100 s ∩ non-threat: two rows in 1,442.** They are `Accralate`,
disqualified in section 3.1 above by its own description, and `Grim League`, which is a funeral
piece with no pitched instrument in it and is therefore era 1's row and not era 2's. **So era 2's
in-band CC-BY pool is now zero, where #448 read it as one.**

**On the CC0 side I enumerated the pool exhaustively rather than sampling it.** Every CC0 music
asset on OpenGameArt carrying any tuned-wood or mallet term — `marimba`, `xylophone`, `glockenspiel`,
`kalimba`, `balafon`, `vibraphone`, `celesta`, `dulcimer` — is **28 distinct assets**, and all 28
were licence-read and measured. Twenty-six have probeable audio. Ranked by duration, the ones that
clear §2's 90-second floor fail for reasons that are on the row:

| Asset | Duration | Why it is not era 2 |
| --- | --- | --- |
| `midi-pack-1` / `midi-pack-2` | 529.9 / 413.5 s | 18 and 46 kbps MIDI renderings |
| `crystal-glades` | 318.0 s | 51 kbps, and self-described "Creepy" |
| `slowly-running` | 300.6 s | "strings, **keys**, marimba" — a keyboard is not era 2's kit |
| `mama-hedgehogs-theme` | 264.2 s | **`OGA-BY 3.0 + CC0`**, so §6.4 applies |
| `pianoemo-12` | 197.8 s | piano, 44 kbps |
| `haydens-theme-simple-remix` | 171.9 s | glockenspiel and celesta — struck **metal**, banned by name |
| `jungle-simple-style-1` | 162.8 s | 39 kbps, unusable at any fit |
| `deliberate-concealment` | 157.0 s | tagged `Action, doom, shooter, spy, stealth`; 104/121 bpm |
| `hueys-theme-b` | 152.2 s | **best seam in the group** at head −13.8 / tail −18.3, and it is a `cute, cutesy, happy` character theme with piano and synth — jollity, and a tune |
| `flutenist-dance-3` | 116.4 s | tagged `jig, lively, medieval` — era 5, and a jig |
| `feel-good-island` | 112.6 s | the rejection already on record at `CREDITS.md:16-17` |
| `kingdom-of-a-million-elephants…` | 92.6 s | `brass`, `faux asian` |
| everything else | ≤ 85.3 s | under §2's floor; `krakatoa` at 72.0 s is the best of them and #444 already proposes it |

**So era 2 is empty on CC0 and empty in-band on CC-BY, and it is empty after being searched on the
facet its own entry states rather than on `pastoral`, `harvest` and `farm`.** That is a stronger
result than the three lists had, and it points the same way they did: **era 2 goes to generation**,
and #443's prompt sketch at `:466-470` is the one to use. The one thing I would add to that sketch,
from section 3.1: **write "no tempo change and no feel change anywhere in the piece" into the
prompt**, because the single best-matching track in the catalogue failed on exactly that.

---

## 8. Era 4, Classical — one sketch became three. **2 NEW CANDIDATES**

### The facets

| The brief says | The facet |
| --- | --- |
| *"Plucked strings (lyre-like, or a light harp), a soft double reed, a low bowed drone, light frame percussion"* | subset of {harp, lute, lyre, zither, dulcimer, oboe, english horn, bassoon, recorder, flute, percussion, drums, drone} |
| *"**Nothing orchestral**: this is a chamber-sized ensemble"* | the subset test again, which excludes "Orchestral - Bass, Violin, Harp" without a separate rule |
| *"No... timpani, no fanfare brass"* | falls out of the subset |
| *"80 to 92, even and unhurried"* | `bpm` ∈ [80, 92] |
| *"120 to 200 seconds"* | duration ≥ 120 s |
| *"a fixed-length phrase repeated at an exactly constant spacing"* | I tried this as a **form** facet — `ostinato`, `ground bass`, `passacaglia`, `chaconne` over the description field — and it returns **0** in band. The form names are not in the vocabulary these catalogues write in |

### What came back

**The chamber subset ∩ 80-92 ∩ ≥120 s ∩ non-threat: four rows in 1,442.** Three are renderings of
Pachelbel's Canon, which #448 already rejects on §2 property 2 — *"the melody is one of the most
recognisable in Western music"* — and that rejection stands. The fourth is new.

### Candidates

**1. Meadow Thoughts, by Alex McCulloch — CC0, solo harp, and the length is right first time.**

| | |
| --- | --- |
| URL | <https://opengameart.org/content/meadow-thoughts> |
| **Licence** | **CC0**, read from the structured `License(s)` field. **No attribution obligation** |
| Tags | `campfire, harp, meadow` |
| Author's whole description | *"Length: 2:29 Solo harp."* |
| File | `Meadow Thoughts.ogg`, **149.74 s**, 128 kbps, **2,396,007 B** |
| Seam | head −12.0 dB, tail −48.5 dB. A **36.5 dB step: needs an edit**, worse than the house track's 10.1 dB |

**Why it fits.** §4 era 4 asks for "plucked strings (lyre-like, or a **light harp**)" and insists the
ensemble be chamber-sized *"because a colonnade is one module repeated and **not a mass of
players**"*. **A solo harp is the smallest possible reading of that instruction**, and it is the only
CC0 asset in the pool that is one. **149.74 s sits inside era 4's own 120-200 window**, which #448's
single candidate does not — `greek instruments` is 100.94 s and reaches the window only if extended.
It is **Ogg**, the container §2 property 5 prefers because the padding is declared rather than baked
in, and at 2,396,007 B it is within twice the house track, so the re-encode is a trim rather than a
rebuild. It is not a sketch: the author states a finished length and an instrumentation and nothing
else.

**Against it.** The 36.5 dB step is the largest edit among the new CC0 rows here. **And nothing in
the metadata speaks to era 4's actual signature move** — whether the phrase length is fixed and
countable is exactly the property section 8's form facet could not find, so this candidate is
proposed on instrumentation, scale and length, and the move itself is unverified.

**2. Cello Suite #1 in G, Prelude (BWV 1007) on dulcimer, by Kevin MacLeod — CC-BY 4.0. The
countable module, bought as a form rather than as a period.**

| | |
| --- | --- |
| URL | <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Cello%20Suite%201%20in%20G%20-%20Prelude.mp3> |
| **Licence** | **CC-BY 4.0.** Attribution required. ISRC `USUAN1100298`. Bach's composition is public domain; **this recording is not**, per Incompetech's own FAQ |
| Catalogue | instruments **Dulcimer** and nothing else; `bpm` **88**, inside era 4's 80-92; feel **Bright, Calming, Relaxed** |
| File | **128.90 s** (2:08), 326 kbps, 5,248,689 B |
| Seam | head −18.3 dB, tail **−91.0 dB**. **Ends in digital silence: a real edit** |

**Why it fits, and it is the strongest §3 argument available for this slot.** §3 says take the
signature move, not the period instruments. Era 4's move is *"a single module counted along a wall"*
and its read is *"a fixed-length phrase repeated at an exactly constant spacing, so that a listener
asked how many there were could count them."* **The BWV 1007 prelude is one bar of broken-chord
figuration, at unvarying rhythmic spacing, one harmony per bar, for its entire length.** It is the
repeated bay in sound.

**And it survives the objection that killed the Canon rows.** #448 rejects them because the melody is
learnable on pass one; §2 property 2 says *"a track carried by a chord bed and a texture survives ten
passes. A track carried by a melody does not."* The BWV 1007 prelude has no singable line at all — it
is figuration over a harmonic scheme, which is a texture. **It also avoids the violation that made
#443's Canon row a coin-flip**: that row's catalogue instruments are "Orchestral - Bass, Violin,
Harp" with three violins, and §4 era 4 bans orchestral strings in section by name. This one is a
single dulcimer, which is a chamber-scaled struck-or-plucked string, and the entry asks for exactly
that scale.

**Two flags, and the first is not the one it looks like.** **Recognisability**: this prelude is
famous, and while it is not a tune the ear can sing, it may still be a piece the ear can *name*,
which is a milder version of the same problem. That is an ear call. **Period**: Bach is Baroque, not
classical antiquity, so buying this is buying §3's rule at full strength — the move over the costume
— and the lead should decide that deliberately rather than discover it. **Length**: 128.90 s clears
era 4's 120 s floor by nine seconds and nothing more.

---

## 9. `crisis-classical`, the Succession — two lists found nothing. **THE FACET POOL IS 58 DEEP**

### Why the earlier searches returned zero, which is the interesting part

#444 records: *"Everything the search surfaces for that description is either thriller tension —
disqualified by §1.1 — or funereal."* #448 records that the one catalogue track matching the code's
own wording, `winter courtyard`, is self-described as suiting a *"tense conversation"*, and says
"that is not a coincidence; it is what shopping from the code comment produces."

**Both are right, and both were searching the description.** `eraMusic.ts:227` asks for *"**Tense**
and political rather than cold: held strings, a room of people deciding"* — that is an **affect**,
and no catalogue is indexed by affect. Worse, §1 bans the affect: §1.4's corollary is that an
instinct toward more tension *"is the defect the brief exists to prevent"*. So the query was both
unsearchable and forbidden.

**The brief specifies this slot in musical properties, and those are all facets.** Every one of the
following comes from §5.2 or §1.3, and none from the code comment:

| The brief says | The facet |
| --- | --- |
| §5.2 *"Ideally no countable pulse at all, and if there is one, under 60"* | `bpm` **= 0** (unpublished, which is how this catalogue records a pulseless piece) **or** `bpm` < 60 |
| §5.2 *"120 to 240 seconds"* | duration window, applied strictly |
| §1.2 *"**Fewer voices and more space.** Thinning is the single strongest available signal"* | instrument-list length **≤ 3** |
| §1, the whole section | drop the nine threat feels, and drop genre **Horror** |
| §1.3 the Succession is *"the only one of the four whose **key goes UP**"*, a hard white noon, and its art brief refuses gloom | drop feel **Somber** as well, and prefer **Bright / Uplifting** — this is the facet that separates this crisis from the other three |
| §5.2 *"share **one element** with the era track it is replacing"* | instruments ∋ an era-4 element: plucked or bowed string, or a reed |
| §5.2 *"No percussion with a pulse"* | instruments ∌ kit, and check drums on the row |

### What came back

| Query | Results |
| --- | --- |
| Pulseless or <60 ∩ ≥120 s ∩ ≤3 voices ∩ non-threat ∩ not gloomy ∩ not Horror | **58** |
| Same, tightened to §5.2's own **120-240 s** window | **29** |
| Same, requiring an **era-4 shared element** | **12** |

**Fifty-eight, where two of three lists reported nothing.** The pool was never empty; it was
unreachable from the word "tense".

### Candidates

**1. Bathed in the Light, by Kevin MacLeod — CC-BY 4.0. §1.3's lighting preset, as a track.**

| | |
| --- | --- |
| URL | <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Bathed%20in%20the%20Light.mp3> |
| **Licence** | **CC-BY 4.0.** Attribution required. ISRC `USUAN1100308` |
| Catalogue | `bpm` **0** — no countable pulse; feel **Bright, Uplifting, Relaxed**; author's whole description *"Super light with some sweet cutting sounds. **Round, full, and slow.**"* |
| File | **166.06 s** (2:46), 326 kbps, 6,765,750 B |
| Seam | head −17.9 dB, tail **−91.0 dB**. **Ends in digital silence: a real edit** |

**Why it fits.** §1.3 is unambiguous that the Succession is the crisis that must not be dark: *"the
only one of the four whose key goes UP"*, *"a hard white noon"*, and *"Weather would be a lie about
the mechanic. Nothing is wrong with the sky; something is wrong with who is in charge."* Of the four
crises this is the one whose track has to be **bright and still at the same time**, which is a
combination the catalogue holds and which nobody queried for. `bpm 0` is §5.2's "ideally no countable
pulse at all" as a published value rather than an inference; **166.06 s sits inside §5.2's own
120-240 window**; and "slow" plus no pulse plus Bright/Uplifting is the whole specification.

**Against it.** The `instruments` field on this row is **blank**, so the instrumentation claim rests
on the description alone and the §5.2 shared-element requirement cannot be checked from metadata.
And *"sweet **cutting** sounds"* is the phrase to listen against — anything that cuts is a §1.1 item
4 startle risk, and this is the one thing an ear has to settle before it can be recommended.

**2. Virtutes Instrumenti, by Kevin MacLeod — CC-BY 4.0. Era 4's low bowed drone, named as such.**

| | |
| --- | --- |
| URL | <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Virtutes%20Instrumenti.mp3> |
| **Licence** | **CC-BY 4.0.** Attribution required. ISRC `USUAN1100801` |
| Catalogue | instruments **Viol, Drone**; `bpm` **56**, under §5.2's 60; feel Calming, Mystical, Somber, Uplifting; genre Classical |
| File | **262.06 s** (4:22), 320 kbps, 10,486,513 B |
| Seam | head **−91.0 dB**, tail **−91.0 dB**. Digital silence at both ends: **padded, not faded.** Trim rather than rebuild |

**Why it fits.** The instrument field is literally two words, **Viol** and **Drone**. §4 era 4's
instrumentation list contains *"a low bowed drone"*, so this is §5.2's shared-element requirement
satisfied by the catalogue's own field rather than by argument — the crisis track and the era track
under it would share a bowed string, which is what makes a crisis read as *this place under a
different condition*. Two voices is §1.2's thinning. 56 bpm is under §5.2's ceiling. And it is the
rare Incompetech row that is padded rather than faded, so the edit is a trim.

**Against it, and it is a real flag.** The author writes *"**Several faster and slower sections** are
available during this piece."* Tempo movement inside the loop is adjacent to §1.1 item 1, and even
where it is not an accelerando it is a §2 property 1 event. **This needs the ear before anything
else.** Second: *"Based on 11th century sacred music"* places it at era 5 rather than era 4, which
matters less under the four-track reading than it would for a shared track, but it does mean this
row is **unusable as the single period-neutral crisis track §5.1 recommends.** Note also that #443
measured a 50.7 dB end fade on this file with a different method; my window sees digital silence at
both ends. Both readings say the same thing — it does not loop as published.

**3. Facile, by Kevin MacLeod — CC-BY 4.0. The thinnest, and the one that resolves upward.**

| | |
| --- | --- |
| URL | <https://incompetech.com/music/royalty-free/mp3-royaltyfree/Facile.mp3> |
| **Licence** | **CC-BY 4.0.** Attribution required. ISRC `USUAN1100858` |
| Catalogue | instruments **Piano** alone; `bpm` **59**, one under §5.2's ceiling; feel **Calming, Relaxed** |
| File | **212.06 s** (3:32), 320 kbps, 8,484,683 B |
| Seam | head **−91.0 dB**, tail **−90.3 dB**. Padded at both ends: trim |

**Why it fits.** One instrument, 59 bpm, 212.06 s inside §5.2's window, and the author's own
sentence is *"Slow, deliberate piano solo — ending on a very satisfying **Tierce de Picardie**."* A
tierce de Picardie is a minor piece closing on a major chord: **resolution that arrives, and arrives
brighter than it started**, which is §1.2's *"Resolution still arrives, and arrives later"* married
to §1.3's refusal of gloom. It is the only row in the pool whose author names its cadence.

**Against it, and I would rank this third for one reason.** A piano is an era 6-to-8 timbre, so it
shares nothing with era 4's plucked-and-bowed palette and it fails §5.1's period-neutrality outright
— **this row only exists under the four-track reading.** And §5.2 wants "a low sustained bed"; a
piano is struck and decays, which is a different texture from the one the entry describes.

### Named, because its seam is the best in the pool and it still fails

**Truth in the Stones** (CC-BY 4.0, Drums and Harp, 54 bpm, **373.39 s**, head −33.6 / tail −39.7 dB
— **matched within 6.1 dB, the only Incompetech row I measured that does not end in silence**) has
the harp that would share an element with era 4, and its author's description is §5.2's harmonic
requirement in plain words: *"No crazy counterpoint. **No complicated harmonic structures.** Just a
simple simple thing."* **It is out on §5.2's flat prohibition — "No percussion with a pulse" — and
the row names Drums at a published 54 bpm.** Worth recording rather than dropping, because if that
rule is ever relaxed for the per-crisis reading this is the best-measuring crisis candidate anyone
has found.

**Rumination** (CC-BY 4.0, `bpm` 0, 172.15 s, feel Somber and Uplifting, *"unfolds like one's mind
coming to terms with **situations of gravity**"*) is a near miss on affect, and out because its
second instrument is **Orchestra**.

---

## 10. What is still empty, and what that means

**One slot of the five is still empty after being searched on the right facets: era 2, Neolithic.**
Section 7 gives the exhaustive enumeration rather than an assertion — 28 CC0 assets carrying any
tuned-wood term, all licence-read and all measured, none of them era 2's. **The different-parameters
theory does not hold for era 2**, and that is the finding the lead asked for: era 2 is not
under-searched, it is unstocked, and it should be generated.

**Era 3 is filled but thinly, and by exactly one CC0 asset**, which is a WAV needing an encode from
an author who says he was inexperienced with the instruments. **If the lead rejects `Ancient Temple`
on the ear, era 3 is CC-BY-only** and the choice is `Kalimba Relaxation Music` against #443's `That
Zen Moment` — and at that point generation is competitive, because #448's era-3 prompt at `:1033`
is already written and era 3's signature move cannot be bought from any catalogue at any licence.

**One thing no search fixes, and it is worth restating because three passes have now hit it.** Era
3's *"the seams are where the metal goes"*, era 5's *"one bell, never on a beat you expected"*, era
10's quotation of era one, era 4's countable module and era 2's *"nothing varies"* are all
**arrangement instructions**, and nothing anywhere indexes them. They are checkable on a finished
track and unsearchable on a catalogue. That is not a defect in the brief — they are good
compositional instructions — but it does mean the slots whose *defining* property is one of them
will always shortlist on their secondary properties, and the ear does the rest.

---

## 11. Licences, stated per candidate and not mixed silently

`CREDITS.md:4-6` sets the standing rule and `:8-11` records that **all eight files shipping today
are CC0**, deliberately. CC0 imposes no attribution obligation. **CC-BY 4.0 does, and there is no
learner-visible credits surface in the product today** — `CREDITS.md` is a repository file, and
Incompetech's FAQ asks that a credit be placed "such that a person who wants to know where the music
came from should have no difficulty in finding it". #444 puts this correctly at `:716-720`: **shipping
any CC-BY track means adding a credits screen, and that product change does not exist.**

| Slot | Candidate | Licence, read per asset | Source |
| --- | --- | --- | --- |
| Era 3 | **Ancient Temple** | **CC0** — no obligation | OpenGameArt, structured `License(s)` field |
| Era 3 | Kalimba Relaxation Music | **CC-BY 4.0** — attribution required, ISRC `USUAN1900039` | Incompetech, site-wide licence |
| Era 1 | Lotus | **CC-BY 4.0** — attribution required, ISRC `USUAN1900019` | Incompetech, site-wide licence |
| Era 1 | Grim League | **CC-BY 4.0** — attribution required, ISRC `USUAN1100779` | Incompetech, site-wide licence |
| Era 2 | *none* | — | — |
| Era 4 | **Meadow Thoughts** | **CC0** — no obligation | OpenGameArt, structured `License(s)` field |
| Era 4 | Cello Suite #1 in G, Prelude | **CC-BY 4.0** — attribution required, ISRC `USUAN1100298` | Incompetech, site-wide licence |
| Succession | Bathed in the Light | **CC-BY 4.0** — attribution required, ISRC `USUAN1100308` | Incompetech, site-wide licence |
| Succession | Virtutes Instrumenti | **CC-BY 4.0** — attribution required, ISRC `USUAN1100801` | Incompetech, site-wide licence |
| Succession | Facile | **CC-BY 4.0** — attribution required, ISRC `USUAN1100858` | Incompetech, site-wide licence |

**Two of nine are CC0, and both are the pick for their slot.** The rest are CC-BY 4.0, and the
honest summary is that **the facet search widened the CC-BY pool far more than it widened the CC0
pool**, because the facets that made it work — a structured `instruments` field, a published `bpm`,
a controlled `feel` vocabulary — are Incompetech's and OpenGameArt does not have them. That is a
finding about the two catalogues rather than about the music.

**If the answer is CC0-only**, this pass adds exactly two candidates: `Ancient Temple` for era 3 and
`Meadow Thoughts` for era 4. Era 1 keeps the rows #443 and #448 already gave it, era 2 goes to
generation, and **the Succession returns to empty.**

**No candidate above is multi-licensed.** The five multi-licensed assets found are listed in section
4 and are excluded here, because §6.4 leaves that call to the audio owner and this document is not
the place to make it.

---

## 12. What this does not decide, and what it cannot claim

1. **Whether any of these sounds good, or is bearable at the tenth pass.** **Nothing was listened
   to**, here or in any of the three earlier lists. §2's ten-repetition test at roughly fifteen
   minutes a candidate and §1's serious-versus-threatening judgement are both unrun, and the brief
   itself calls them the two decisive tests. Nine new candidates is about two and a quarter hours of
   ear time, on top of the seven and a half #448 already owes.
2. **Whether CC-BY is acceptable at all.** Seven of the nine candidates here are CC-BY 4.0, and
   answering no removes the Succession's whole shortlist and era 1's two new rows. That is a product
   decision about a credits surface, not a licensing preference.
3. **Whether era 3's `Ancient Temple` survives its author's own caveat.** He says he had "little
   experience with this style of instruments". That is an audition, not a metadata question.
4. **Whether era 4 buys the move or the period.** The BWV 1007 row is §3 applied at full strength.
   §3 is the argument for it; "Bach is not classical antiquity" is the argument against, and the
   brief does not settle it.
5. **Whether §5.2's "no percussion with a pulse" is absolute.** It costs the Succession the only
   crisis candidate in this pass with a matched seam. Somebody should rule rather than let it be
   rediscovered.
6. **Every seam verdict here is a level comparison over half a second at each end.** It rules
   candidates out; it does not rule any in. A level-matched track can still lurch harmonically at
   the wrap, and no metadata anywhere will say so.
7. **The count of 58 for the Succession is a facet count, not nine usable tracks.** Three are
   proposed. The rest were filtered on instrumentation, description or the fact that most of the
   pool is solo piano, which fails §5.2's period-neutrality and shares nothing with era 4.

---

## 13. References

- `docs/superpowers/specs/2026-08-01-era-and-crisis-music-brief.md` — the specification, binding and
  not amended. §1 (serious is not threatening) and §1.1's six devices, which section 1.1 above turns
  into a feel filter; §2 (the loop properties); §3 (the signature move, not the period instruments),
  which is the whole of this document's method; §4 (the ten entries, from which every facet table
  above is derived); §5.2 (the crisis entry); §6.4 (multi-licensing, left open); §7.5 (the pitch
  centre, corrected in section 3.2)
- `docs/superpowers/specs/2026-08-02-era-and-crisis-music-shortlist.md` (#443) — era 3's two CC-BY
  rows (`:957-960`), era 2 named as its one gap (`:439`), the kalimba re-homing argument this pass
  acts on (`:456`), and era 2's generation prompt (`:466-470`)
- `docs/superpowers/specs/2026-08-02-era-and-crisis-music-candidates.md` (#444) — era 1 and era 3 as
  named gaps (`:239`, `:355`), the Succession as "the cleanest gap in the document" (`:627-635`), the
  five unshoppable entries (`:902-942`), and the credits-surface cost of CC-BY (`:716-720`)
- `docs/superpowers/specs/2026-08-02-music-candidate-shortlist.md` (#448) — the instrumentation-plus-tempo
  method this pass generalises (`:60-64`), era 3's emptiness (`:498`), era 4's single candidate
  (`:521`), the Succession as empty (`:314`), the house track's own wrap step (`:120-124`), and
  era 3's generation prompt (`:1033`)
- `apps/web/public/audio/CREDITS.md` — the provenance rule (`:4-6`), the all-CC0 statement (`:8-11`),
  and the per-asset verification method the licence reader was validated against (`:13-17`)
- `apps/web/src/audio/eraMusic.ts:227` — the Succession slot's "Tense and political" brief, which
  section 9 declines to shop from
- Sources: [OpenGameArt advanced search](https://opengameart.org/art-search-advanced), art type
  Music, licence facet CC0, `items_per_page=144`, run 2026-08-02;
  [Incompetech](https://incompetech.com/music/royalty-free/music.html) and its structured catalogue
  `pieces.json` (1,442 rows), with its
  [FAQ](https://incompetech.com/music/royalty-free/faq.html) read the same day
