# Era and crisis music: the generation prompts, one per slot

**Date:** 2026-08-03, extended 2026-08-04 with the fifteenth slot · **Status:** paste-ready.
**Nothing was generated, nothing was acquired, and no audio file is added by this change.**
**Reads under** `2026-08-01-era-and-crisis-music-brief.md`, binding and not amended. Every
constraint below is transcribed from it. Nothing here is a new design decision **except §I**, which
is a slot the brief does not contain and says so at its head. The two places something moved after
the brief was written — the crisis count and the generation route — are flagged in terms, at §D and
§F.
**Measured at** `integration` `df9fe3e7`; §I re-measured at `406f52a1` (after #529 and #532). Slot ids are
`eraMusic.ts`'s own, derived there from the era id (`:125-132`) except the ceremony's, which is a
constant because there is one of it.
**Audience:** whoever sits down at a generator. **You should not need to open the brief.**
**Unverified by construction:** no prompt below has been run through a generator, so none is known
to produce what it describes. §2's tenth-pass test is owed on every output, and §A says how to run it.

## Before you paste anything

1. **The route moved today and §6.6 is superseded in part. Stable Audio is out**, both rows, on a
   revenue test the section printed and never applied. **§F** has the detail and the surviving
   conclusion. Nothing in §A to §E depends on which tool is chosen.
2. **Fourteen slots, not eleven: one track per crisis.** The lead has ruled it, it is what
   `eraMusic.ts` already assumes, and it **overrides §5.1's recommendation of a single shared
   crisis track**. §D records the override and the one thing it changes musically, so nobody
   re-derives the old reading from §5.1.
3. **Fifteen slots, not fourteen: the era-advance ceremony has one.** **§I**. It is a long bed rather
   than a short cue, because an advance is answer-paced and runs **three and a half to over ten
   minutes** rather than being a one-off event. **§I said the opposite until 2026-08-04 and said it in
   capitals** — if a track was generated against the old ask it is not usable for this slot, and §I's
   head says why and what survives. Read that head before pasting, and do not paste §B with it.
4. **Four facts have to be written down at generation time or they are lost.** §G, one paragraph.

---

## §A. How to paste

**Every prompt is two blocks, and the shared one goes first.** The shared constraints are stated
once rather than fourteen times, so a paste is:

> **shared block** (§B for an era, §D for a crisis) **+ that slot's block** (§C or §E), in that
> order, into the same box.

**§I is the exception and it is one self-contained block.** §B's loop rules are right for it, but §B
is written for a track that scores a *place* and names no ceremony, so §I restates what it needs and
adds what §B has no reason to say. Pasting both would say some things twice and the wrong ones.

**The negative blocks work the same way**: shared negative + slot negative, into the tool's
negative field. **If the tool has no negative field**, append them to the end of the prompt behind
the word `Avoid:`.

**If the tool caps the prompt length**, the paragraph to keep is `STRUCTURE`. It is the property
generators get wrong by default and the one that costs the most to fix afterwards; era flavour that
comes out slightly wrong is still usable, and a track with an intro and a final chord is not.

**The negative lists are the brief's own `Must not` lines expanded into the synonyms a generator
answers to.** "No metal of any kind" becomes `metal, metallic percussion, bells, gongs, cymbals`;
"no startle event" becomes `stinger, sudden hit, stab`. Every entry traces back to a **Must not**
line, to §1.1's six devices, or to §2; the wording is wider than the brief's only because a
generator matches words rather than rules.

**The one thing to fill in.** Each block ends with a `Key:` line. §5.2 asks that a crisis track
share one element with the era track under it and §7.5 says a pitch centre is *"nearly free if it is
specified first and nearly impossible to retrofit"*, so **the four era/crisis pairs must be given
the same key**: `era-prehistoric` with `crisis-prehistoric`, `era-classical` with
`crisis-classical`, `era-renaissance` with `crisis-renaissance`, `era-information_age` with
`crisis-information_age`. Which key is free, and the other six eras are unconstrained.

**Then run §2's test on what comes back**, because no prompt can buy it: play the result ten times
through with the tab in the background while doing something else, and **if you can name the moment
you are waiting for, the track fails.** About fifteen minutes per candidate, and it is the only
test that catches the property that matters most.

### The fifteen slots

| Slot | Era | The signature move, in a phrase | BPM | Seconds |
| --- | --- | --- | --- | --- |
| `era-prehistoric` | 1 Prehistoric | Nothing repeats identically | 60–72 | 90–150 |
| `era-neolithic` | 2 Neolithic | The loop is invented | 72–84 | 100–180 |
| `era-bronze_age` | 3 Bronze Age | Metal at the joint | 76–88 | 100–180 |
| `era-classical` | 4 Classical | The module is countable | 80–92 | 120–200 |
| `era-medieval` | 5 Medieval | The structure is on the outside | 84–96 | 100–180 |
| `era-renaissance` | 6 Early Modern | Symmetry as a system | 76–92 | 120–200 |
| `era-industrial` | 7 Industrial | No natural end | 88–100 | 90–160 |
| `era-atomic_age` | 8 Atomic | The melody carries no visible load | 84–96 | 100–180 |
| `era-information_age` | 9 Information | Nothing explains itself | 72–88 | 120–240 |
| `era-cyberpunk` | 10 Cyberpunk | The ornament is attached, the box is plain | 76–92 | 120–200 |
| `crisis-prehistoric` | 1, Hard Winter | Era one's kit, thinned | under 60 or none | 120–240 |
| `crisis-classical` | 4, Succession | Era four's kit, thinned | under 60 or none | 120–240 |
| `crisis-renaissance` | 6, Plague | Era six's kit, thinned | under 60 or none | 120–240 |
| `crisis-information_age` | 9, Intrusion | Era nine's kit, thinned | under 60 or none | 120–240 |
| `ceremony-advance` | all ten | A bed under an advance that runs 3.6–10 min | 60–80 | **150–240** |

**Tempo is the one channel era is never expressed through.** The whole set sits inside 60 to 100
BPM, and **era ten must not be the fastest track in the game**. The obvious shape for ten era
tracks — slow and sparse at era one rising to fast and dense at era ten — is a ten-hour
accelerando whose endpoint is where a learner is most invested, and urgency framing built into the
structure of a soundtrack is banned at the product level.

**All fifteen loop, and §I is the row whose reason is different.** The fourteen score a PLACE and
loop because a place lasts. `ceremony-advance` scores a MOMENT and loops because that moment has no
knowable length: an era advance is answer-paced and runs three and a half to over ten minutes, so a
passage under it has to be stoppable at any instant. **§I said the opposite until 2026-08-04** and it
carries a warning at its head, because a track may have been generated against the old ask.

---

## §B. The shared block for all ten eras

Paste this first, then the slot's block from §C.

```text
Instrumental background music for a calm educational city-building game. It loops continuously
under arithmetic practice for long stretches, so it has to be pleasant to ignore and it must never
push the listener.

STRUCTURE, which matters more than anything else here. One sustained texture that holds from the
first second to the last. No intro. No build. No drop. No fill, no cymbal crash, no riser, no key
change, no solo entry, no crescendo across the track. No ending: do not resolve, do not slow down
at the end, do not fade out, do not land on a final chord. It should sound like something that was
already playing before the recording started and will keep going after it stops, so that the last
bar can butt straight onto the first with no audible seam. Nothing in it may be an event the ear
can learn to expect and wait for.

TEXTURE, NOT TUNE. Carried by a chord bed and a timbre rather than by a melody. No hook, nothing
whistleable, nothing a listener could sing back after hearing it ten times.

DYNAMICS. One narrow range from start to finish, with no quiet passage followed by a loud one.

TEMPO. Stay inside 60-100 BPM. The slot line below names a narrower band; treat it as a ceiling as
well as a target, and where the piece wants more energy buy it with density and register rather
than with speed.

VOICE. Fully instrumental. No lyrics, no singing, no chanting, no spoken or intelligible voice.

SPACE. Include at least one bar in which almost nothing happens.

LENGTH. Never under 90 seconds. The slot line names the target window.

Key: <one key, per "the one thing to fill in">
```

Shared negative, for all ten:

```text
intro, outro, ending, final chord, resolution, fade in, fade out, build-up, drop, riser, swell,
crescendo, decrescendo, key change, modulation, tempo change, accelerando, ritardando, fill, cymbal
crash, stinger, sudden hit, stab, solo, hook, catchy melody, singable melody, vocals, lyrics,
singing, chanting, choir, spoken word, wide dynamic range, sudden loud passage, urgency, tension,
countdown, ticking, clock, alarm, siren, trailer music, cinematic swell
```

---

## §C. The ten era slots

### `era-prehistoric` — Era 1, Prehistoric

```text
The signature move, and the piece is about this before it is about anything else: NOTHING REPEATS
IDENTICALLY. No two bars of the percussion are the same. There is no grid, no downbeat to lean on
and no fixed metre. Several people making a sound together who have never agreed on a pulse, in a
room with one fire in it.

Instruments: struck and shaken things with no pitch centre to defend. Frame drum, hollow log,
struck stones, a rattle, and a breathy end-blown flute or bone whistle carrying no more than three
or four notes. One wordless sustained voice-like tone is allowed if it never forms a melody.

Tempo: slow, 60-72 BPM, and deliberately not locked. Low energy.

Length: 90-150 seconds. Keep it uniformly ungridded right through the wrap point, which is what
makes this the most forgiving loop of the set: an ungridded texture has no bar line to expose.
```

```text
metal, metallic percussion, bells, gong, cymbals, chimes, drone synthesiser, synth pad, orchestral
strings, string section, whistleable melody, singable theme, chanting, intelligible voice,
didgeridoo, any instrument identified with a specific living culture, accelerating drum build,
stock tribal-drums cue, adventure-film primitive cue, strict grid, quantised loop, identical
repeating bar
```

> Stage one wants this second, after the crisis (§7.2), and **era ten quotes it**, so generate this
> slot before `era-cyberpunk`.

### `era-neolithic` — Era 2, Neolithic

```text
The signature move: THIS IS WHERE THE LOOP IS INVENTED. One short figure played over and over
without ever varying, and the repetition is the point rather than a limitation. A mould is filled a
hundred times and the hundred results are interchangeable. Vary nothing for interest: variation is
the one thing this era does not yet have.

Instruments: hand percussion on a real grid, plus the first pitched, tuned, repeatable thing — a
simple plucked string, or a struck wooden bar with a fixed pitch set. Grain shaker, hand drum, and
a low sustained tone underneath.

Tempo: 72-84 BPM and metronomically steady, which is itself the point. Low to moderate energy.
Steady is not the same as driving: keep the accents even so the pulse reads as patient work rather
than as marching.

Length: 100-180 seconds. A track built out of one identical repeated bar can be trimmed exactly, so
this one should be seamless rather than merely acceptable.
```

```text
metal, metallic percussion, bright cymbal, bell, chime, wheeled rhythm, galloping rhythm,
harvest-festival jollity, celebratory folk dance, folk fiddle, hurdy-gurdy, crescendo across the
loop, variation for interest, melodic development, fill, ornamentation, rubato, tempo drift
```

> **The only slot with no open-source candidate at all** (`2026-08-03-music-picks-per-slot.md:28`,
> `:91`), so this is the prompt most certain to be used.

### `era-bronze_age` — Era 3, Bronze Age

```text
The signature move: METAL AT THE JOINT. The piece is otherwise plain, and at each structural
junction a single bright struck note marks the join. That is the whole idea and it costs one sound:
a steady piece you notice mainly at the moments where one section is fastened to the next.

Instruments: tuned wood and hand drums, plus the first struck metal in the set — small bronze
bells, a light gong, finger cymbals, a struck bowl. Hold the metal to points and keep it small in
area; it marks joins and never carries the piece. A double reed or a lyre-like plucked string
carries whatever line there is.

Tempo: 76-88 BPM, weightier than a light dance. Moderate. The extra weight comes from register and
note length, never from speed.

Length: 100-180 seconds. The loop seam is this era's own signature, so the strike that marks the
wrap point is a feature rather than something to hide. It must still not read as a stinger: one
small bright note, not a hit.
```

```text
iron, steel, anvil, forge, clanging percussion, hammered metal, brass section, horns, fanfare,
arpeggio fanfare, Middle-Eastern idiom, Egyptian idiom, oud, duduk, darbuka, desert scoring,
cinematic ancient-epic swell, epic drums, choir
```

> The free-library pool imports a geography the era never claims (§6.5), and a generator will do the
> same on the word "bronze": the guide names a trading harbour and never a place.

### `era-classical` — Era 4, Classical

```text
The signature move: THE MODULE IS COUNTABLE. A fixed-length phrase repeated at exactly constant
spacing, so a listener asked how many there were could count them. The phrase length never elides
and never varies. Where the piece wants more weight it gets another repetition of the same phrase
and never a bigger sound.

Instruments: plucked strings (lyre-like, or a light harp), a soft double reed, a low bowed drone,
and light frame percussion marking the module. Chamber-sized and nothing orchestral: a colonnade is
one module repeated, not a mass of players.

Tempo: 80-92 BPM, even and unhurried. Moderate. The symmetry does the work.

Length: 120-200 seconds, and take the top of that window: length here is only a question of how
many repetitions, so it is the cheapest place in the set to buy a long loop.
```

```text
orchestral strings, string section, string ensemble, timpani, fanfare brass, horns, film-score
antiquity, sword-and-sandal epic, peplum score, dramatic pause, dramatic silence, rubato, expressive
tempo, march, martial rhythm, snare march, choir, epic swell
```

> The word "classical" fetches a string section and a dramatic pause, and this era bans both: it is a
> chamber-sized ensemble that was set out to a line.

### `era-medieval` — Era 5, Medieval

```text
The signature move: THE STRUCTURE IS ON THE OUTSIDE. The accompaniment is an audible skeletal frame
rather than a cushion under the tune — a drone plus an open fifth carries the whole piece and the
ear can hear exactly what is holding it up. Take the pattern away and the piece falls down.

Instruments: plucked and bowed strings of the lute and vielle family, a recorder or a soft
shawm-like reed, a tabor, and one bell. The bell strikes rather than shows: a single tolled note,
never a carillon melody, and never on a beat you expected.

Tempo: 84-96 BPM. Moderate, and busy in density rather than in tempo.

Length: 100-180 seconds. Place the bell so it does NOT fall at the loop point and does not recur on
a fixed count: a bell at the seam is the single most learnable event available in this whole set,
and a bell on a count is a clock.
```

```text
tavern jig, drinking song, sing-along, crumhorn comedy, Renaissance-fair pastiche, festival dance,
full carillon, bell peal, bell on a fixed count, tolling clock, plainchant, Gregorian chant, sung
Latin, choir, lute solo, minstrel melody, bagpipe drone reel
```

> §7.1's unanswered question — whether the two shipped RPG town themes are really era five's and
> era six's — could make this slot redundant, and one hour of listening settles it before a
> generation is spent.

### `era-renaissance` — Era 6, Early Modern

```text
The signature move: SYMMETRY AS A SYSTEM. Antecedent and consequent phrases of exactly equal
length, so the second half answers the first half so precisely that a listener could predict the
answer and is pleased rather than bored when it arrives. The piece was resolved before it began and
that is audible: nothing in it is improvised and nothing in it surprises.

Instruments: a small consort. Viols or a lute in parts, a chamber organ or a light harpsichord, a
recorder consort. Real voice-leading with independent lines, genuinely polyphonic rather than a pad
with a tune over it.

Tempo: 76-92 BPM. Moderate and calm. This should be the most settled track in the set, which is a
different thing from the slowest.

Length: 120-200 seconds. A symmetrical structure returns exactly to its opening, so the wrap point
is nearly free here; keep the return literal.
```

```text
large organ, pipe organ, cathedral reverb, church acoustic, sacred choral, mass setting, motet,
choir, modern neoclassical piano, ambient piano, harpsichord flourish, comic harpsichord, Baroque
virtuosity, fast runs, ornamented cadenza, asymmetrical phrase, unanswered phrase
```

> The code's slot id is `era-renaissance`; the brief titles the era **Early Modern**. Same slot.

### `era-industrial` — Era 7, Industrial

```text
The signature move: NO NATURAL END. Length, not composition. A piece with no middle — it could have
started thirty seconds earlier or later and nothing about it would be different. It begins
mid-pattern and stops mid-pattern, with no introduction anywhere and no cadence anywhere. A
standard part repeated without limit, stopping only where the site does.

Instruments: struck metal and wood at machine regularity, a low steady bellows-like sustain, a
plucked ostinato with no expression in it at all, and one long sustained note over the top. Do not
reach for a synthesiser: this is iron and steam, the last era before electricity, and it should
sound mechanical rather than electronic.

Tempo: 88-100 BPM, machine-exact, with no drift and no swing. This is the densest track in the set
and it must not be the fastest, so the density goes into subdivision rather than into speed.

Length: 90-160 seconds. A track with no arrival has no seam to hide, which makes this the easiest
loop in the set; do not give it one.
```

```text
steampunk whimsy, factory alarm, klaxon, whistle, train whistle, steam whistle, hissing accent,
venting steam accent, industrial distortion, industrial metal, noise, accelerating machine build,
machinery speeding up, machinery failing, production line under strain, sirens, alarm, dystopian
menace, epic percussion
```

> The word "industrial" fetches distortion and a klaxon; the era is machinery for moving and
> measuring, and a production line under strain is a threat cue in a plain wrapper.

### `era-atomic_age` — Era 8, Atomic

```text
The signature move: THE MELODY CARRIES NO VISIBLE LOAD. A line hangs above a harmony that never
quite explains it, and it is never resolved — the instinct will be to resolve it, so do not. Played
by people who are completely relaxed about it and who are certain the next fifty years will be
better than the last fifty.

Instruments: vibraphone, a light brushed kit, an upright bass walking gently, a clean electric
guitar or a Rhodes-like keyboard, and one soft muted horn. This is the set's one genuinely RECORDED
aesthetic: close-mic'd, warm, a little plate reverb, played rather than sequenced.

Tempo: 84-96 BPM, relaxed and swung only very slightly. Moderate. This should be the most
optimistic track in the set, and optimism is a matter of harmony rather than of speed.

Length: 100-180 seconds. This is the hardest loop in the set, because the idiom is built out of
phrases that have endings: there must be NO turnaround, NO ii-V back to the top and no cadence
anywhere near the wrap point.
```

```text
big-band swing, electro-swing, lounge exotica, kitsch, theremin, space-age bachelor pad,
retro-futurist novelty, ironic mid-century pastiche, cocktail jazz cliché, jazz solo, improvised
solo, busy walking bass, bass as the tune, turnaround, ii-V-I, final cadence, atomic-age menace,
Cold War dread, ominous strings
```

> §6.5's hardest era: `mid century` and `big band` both return **zero** CC0 results and the idiom is
> a recording aesthetic that free libraries do not hold, so this slot is the most likely of the ten
> to need generating.

### `era-information_age` — Era 9, Information

```text
The signature move: NOTHING EXPLAINS ITSELF. A listener cannot say what any of it was played on.
No audible hand anywhere — that absence is precisely what the era is about — and it is still warm
rather than cold.

Instruments: processed and resynthesised sources with every performance gesture removed. Soft pads,
a bell-like tone with the attack shaved off, a bass with no finger noise, a pulse with no velocity
variation. Nothing that sounds like a person playing an instrument, and nothing that sounds like a
sample of one.

Tempo: 72-88 BPM, or a pulse so soft that it is not countable at all. Low energy. This should be
the calmest track in the set.

Length: 120-240 seconds, and take the top of the window: the material is sustained, so this is the
cheapest place in the run to buy the length §2 wants most. Make it the longest of the ten era tracks.
```

```text
new-age, meditation music, spa music, healing music, rain, waves, water, wind chimes, birdsong,
nature sounds, sleep-playlist piano, ambient piano, evolving pad that swells, swelling pad,
ticking, data chatter, telemetry beeps, glitch, stutter, granular artefacts, arpeggiated synth,
sequenced arpeggio, countdown arpeggio, generic ambient wallpaper
```

> The named risk here is **a track that is correct and characterless**, which is harder to reject in
> review than one that is wrong, because there is nothing to point at.

### `era-cyberpunk` — Era 10, Cyberpunk

```text
The signature move: THE ORNAMENT IS ATTACHED AND THE BOX IS PLAIN. A dark, near-static low bed, and
above it a stack of small bright emissive details — short lit blips, thin high edges, one sustained
neon-like tone. Strip the bright details and what remains should be almost nothing. That is the
exact inverse of synthwave, which is bright all the way through.

Then the closing move, and it is the point of the whole track: ONE RECOGNISABLE ELEMENT FROM ERA
ONE'S TRACK, RETROFITTED IN. A struck stone, the bone flute's three or four notes, or the frame
drum, layered onto the deck as a texture. It is not doing its old job. Nothing on this island was
ever demolished and every material it ever used is still somewhere on it.

Tempo: 76-92 BPM, and explicitly NOT the fastest track in the set. Moderate energy carried by
density and brightness rather than by speed.

Length: 120-200 seconds. The near-static bed makes the seam easy; place the era-one element away
from the wrap point so it does not become the learnable event.
```

```text
synthwave, retrowave, outrun, 1980s nostalgia, gated reverb snare, 1980s arpeggio, dystopian
menace, distorted bass drop, bass drop, siren, alarm, cyber-action beat, driving beat, chase music,
rain and neon cliché, noir saxophone, vocal sample, processed vocal, glitch drop, aggressive
industrial, boss-fight energy
```

> The era-one quotation cannot come out of the same pass: generate `era-prehistoric` first and layer
> its element in by hand, or accept the generator's own approximation of it.

---

## §D. The shared block for all four crises

### The override, recorded so nobody re-derives §5.1

**The lead has ruled one track per crisis.** §5.1 recommended **one shared** crisis track and ruled
four out in terms — *"Do not split four ways under any circumstances"* — on three grounds, the first
of which it called a ruling rather than a preference: `D-CRISIS-19` says what differentiates a crisis
is the player ritual and not the music; the four are separated already on light, ground, propagation,
player verb and conclusion; and they sit at eras 1, 4, 6 and 9, so no learner meets two close enough
to hear the contrast. **The lead has overruled that in favour of one each**, which is also what the
code already assumes: `CRISIS_MUSIC` is keyed by the era whose crisis it is, and the four in scope
each name a distinct slot (`eraMusic.ts:15`, `:64-73`, `:207-256`). The decision that
`2026-08-03-music-picks-per-slot.md:13-17` recorded as unmade is now made, at fourteen.

**What the override costs, since §5.1 priced it.** Four licence verifications rather than one, four
loop-seam checks rather than one, and roughly 4 MB rather than 1. What it buys back is the channel
§5.1 gave up: each crisis can now sound like its own era.

**One thing changes musically, and it is the only thing.** §5.1 required the crisis track be
**period-neutral** — *"no instrument that marks an era, no idiom anyone can date"* — and that
requirement was a **consequence** of one track having to sit under four different eras' music, not
a property crisis music wants for its own sake. With one track per crisis it lapses, and the
brief's own preference takes over: §1.2 asks for *"the era's own material, altered rather than
replaced"*, so that the change reads as *this place under a different condition* rather than *a
different game*, and §5.2 asks that the crisis track share one element with the era track under it.
**So each of the four takes its own era's instrument list with most of the parts removed**, rather
than a dateless bed. Four tracks make that easier than one did, not harder — which is why the four
slot blocks in §E are four different prompts and not four copies of one.

**One correction to carry.** `eraMusic.ts`'s one-line per-slot briefs were written from the era
rationales rather than under §1, and one of them reads *"Tense and political"* (`:227`). **§1
governs**: serious is not the same as threatening, and the prompts below do not carry that word.

### The block

Paste this first, then the slot's block from §E.

```text
Instrumental background music for a calm educational city-building game. It replaces that era's own
loop while a crisis event runs. The listener is a learner who is anxious about mathematics and has
been burned by timed tests, so the one thing this music must never do is add pressure. SERIOUS IS
NOT THE SAME AS THREATENING. This is not danger music, not suspense and not a warning: it is the
same place under a different condition.

It is slower, thinner, lower and quieter than the era loop it replaces, and it stays tonally
settled throughout. Gravity is a function of mass rather than of speed, so: drop the register,
lengthen the note values, slow the rate at which the harmony changes, and above all TAKE VOICES
AWAY. Removing three parts out of five is the strongest available signal that the world has
changed, and it lowers the listener's arousal instead of raising it. Resolution still arrives and
arrives later; the cadence is never withheld. Phrases settle rather than lift, and each period ends
lower than it started.

STRUCTURE. One sustained texture with no events in it. No intro, no build, no riser, no crescendo,
no key change and no ending: do not resolve to a final chord and do not fade out. The last bar has
to butt onto the first with no audible seam. Begin very quietly and with no attack at the head of
the file, because this track is cross-faded in over one to two seconds and a hard entry would be a
startle at the exact moment the crisis announces itself.

NO PULSED PERCUSSION AT ALL. Ideally no countable pulse anywhere; if there is one it sits under 60
BPM. Nothing in the low register anywhere near the 60-100 BPM heartbeat band, because a low drum in
that band maps onto the body and is read as one.

Instruments: a low sustained bed, a slow struck tone with a long decay, one held mid-register note,
and the slot's own thinned material below. Fully instrumental, no voice of any kind.

Length: 120-240 seconds. Long, because this plays while the learner is concentrating hardest and a
short loop is at its most intrusive exactly then.

Key: <the same key as this crisis's era track, per "the one thing to fill in">
```

Shared negative, for all four. **It opens with §1.1's six devices in that section's own order**, so
each can be refused by name: acceleration in tempo or subdivision, the unresolved riser, dissonance
held open, the startle event, a low pulse in the heartbeat band, and a loop shorter or louder than
the era loop it replaced. A reviewer whose first instinct on hearing the result is "this needs more
tension" has just described the defect the list exists to prevent, and the correct response to "it
does not feel serious enough" is to take something away, never to add.

```text
accelerando, accelerating subdivision, doubling pulse, rushing, riser, rising pitch that never
lands, rising dynamic, held dissonance, sustained tritone, sustained minor second, unresolved
dissonance, stinger, sudden hit, stab, silence followed by a hit, low drum at 60-100 BPM,
heartbeat, pulsing bass drum, driving percussion, getting louder, getting faster, shorter loop,
tension, suspense, dread, menace, threat, danger, horror, dark ambient horror, action scoring,
orchestral action, trailer music, siren, alarm, klaxon, warning tone, ticking, clock, countdown,
breathing, whispering, choir, crescendo, key change, modulation, final cadence, fade out
```

---

## §E. The four crisis slots

### `crisis-prehistoric` — Era 1, the Hard Winter

```text
This is era one's own kit with most of it taken away. What is left: one slow struck stroke on a
frame drum or a stone with a long decay and a great deal of space after it, no more than one or two
held notes of the breathy end-blown flute or bone whistle, and one wordless sustained low tone
under them. Still ungridded, so no two intervals between strokes are the same, and much slower and
emptier than era one's own loop.

The condition is cold, thin and still. Overcast, not night: a blizzard at midday is bright and
shadowless, so nothing here is dark or nocturnal. The frost takes the island one step at a time and
nothing about it is a chase, so nothing drives forward and nothing is approaching.

No metal anywhere. Era one's world contains no metal at all and this crisis sits inside era one.
```

```text
metal, bells, gong, cymbal, chime, synthesiser, drone synth, orchestral strings, wind gust used as
an accent, storm swell, howling wind stab, driving percussion, drum build, strict grid, quantised
pulse, melody, chanting, voice, darkness, night, gloom, nocturnal, blizzard chase, survival-horror
cold
```

> **First of all fourteen** (§7.2): measured at this tip it resolves through `ERA_STAND_IN` to the
> house RPG town theme (`eraMusic.ts:117-119`, `music.ts:128`), so its absence is an active error.

### `crisis-classical` — Era 4, the Succession

```text
This is era four's own kit with most of it taken away. What is left: the low bowed drone, one
plucked string — lyre-like, or a light harp — sounding single long notes rather than the era's
counted phrase, and one held mid-register note. The light frame percussion that marked the module
is gone entirely, and era four's countable module survives only as a memory: the phrase still
exists but nothing counts it out any more.

The condition is a hard white noon with nothing hidden. Exposed, even, bleached and completely
still: almost nothing moves. Nothing has been destroyed and nothing is wrong with the weather —
something is wrong with who is in charge — so this is not stormy, not dark and not grieving. It is
the same room with the lights left on and almost nobody moving in it.
```

```text
orchestral strings, string section, string ensemble, tremolo strings, timpani, fanfare brass, brass
chorale, political-thriller score, court intrigue, film-score antiquity, sword-and-sandal epic,
march, martial rhythm, counted rhythm, rubato, storm, thunder, rain, weather, darkness, gloom,
lament, mourning, requiem, funeral
```

> §1.3's *"the only one of the four whose key goes UP"* is about **light, not pitch**: the track must
> not answer it by rising, which §1.2 rules out for every crisis.

### `crisis-renaissance` — Era 6, the Plague

```text
This is era six's own consort with most of its voices taken away: one or two lines where there were
four. A single viol or lute line, and a chamber organ holding long notes underneath it. The era's
symmetry survives and must survive — the phrase still answers itself and still resolves — but with
one voice where there was a consort, and later than it used to.

The condition is pale, even and empty, and DO NOT MAKE IT GLOOMY. A dark plague town is the obvious
move and it fights the era, which is pale stucco under lead. Pale, even and empty is more
unsettling than dark. This is the stillest of the four: nothing in the town moves at all, and the
only motion is outside it.
```

```text
dark, gloomy, gothic, sepulchral, requiem, dies irae, funeral march, death knell, plague bell
tolling on a count, sacred choral, mass setting, plainchant, Gregorian chant, sung Latin, choir,
large organ, pipe organ, cathedral reverb, Baroque virtuosity, harpsichord flourish, asymmetrical
answering phrase, withheld cadence, unresolved phrase, horror strings
```

> The requiem is the reflex in this slot and §1 forbids it; the era's own answer to a plague is pale
> rather than dark.

### `crisis-information_age` — Era 9, the Intrusion

```text
This is era nine's own palette with most of it taken away and the pulse removed entirely. What is
left: one soft processed pad in the low register, one bell-like tone with the attack shaved off
struck slowly with a very long decay, and one held mid-register note. No audible hand anywhere and
nothing that sounds like a person playing an instrument, which is the same absence the era itself
is about. This is the one of the four that may be nearly beatless, and it should be.

The condition is NOT night. A dark scene would be a lie about this era: it is a sealed, quiet place
of glass and panel, and a crisis here is a change of condition rather than a darkening. Keep it
warm rather than cold, and completely settled.
```

```text
glitch, stutter, granular artefacts, data chatter, telemetry beeps, computer alert, error tone,
digital alarm, notification sound, scanning sweep, radar ping, sonar, arpeggiated synth, sequenced
pulse, countdown arpeggio, ticking, cyber-thriller score, hacking montage, dark ambient horror,
drone dissonance, night, darkness, cold, new-age meditation, rain, waves, wind chimes, birdsong,
sleep-playlist piano, swelling pad
```

> *"Something is in the system"* fetches glitch, data chatter and an alert tone; **era nine's own
> Must not list bans the first two and §5.2's bans the third**, so that is the trap in this slot.

---

## §I. The era-advance ceremony: the fifteenth slot, and it is a BED

**Lettered `I` on purpose.** It was added a day after §A–§H and it sits here because this is where a
reader wants it, but `F`, `G` and `H` are cited by letter from `eraMusic.ts`, from
`2026-08-04-music-pipeline.md` and from inside this file, so renumbering them to make room would
break every one of those citations to save one letter.

**This slot is not in the brief, and that is stated rather than glossed.** Every other prompt here
transcribes `2026-08-01-era-and-crisis-music-brief.md`; the brief specifies ten era tracks plus
crisis music and contains no ceremony entry, because when it was written nothing in the code could
tell that a ceremony was running. So §I is written *under* the brief's rulings — §1's ban on urgency,
§4.6's low and earned celebration amplitude, §2's loop discipline — and the loop discipline applies
here in full.

### ⚠ THIS SECTION WAS WRONG UNTIL 2026-08-04 AND SAID SO IN CAPITALS

**If you generated a track against the previous §I, it is not usable for this slot. Regenerate.**

The previous version asked for a **cue**: 40 to 55 seconds, an arc, and — in capitals — *"It HAS an
arc and it MUST RESOLVE… Do not make it loopable."* Every one of those instructions is now inverted.
What is unchanged is the character, the register, the instrument sense, the tempo band and the whole
frequency map, so this is a **structural re-ask and not a fresh search**.

**The lead found the hole:** *"shouldn't the era transition music be longer, since the user still has
to work through problems to get through the stages? like it's not just a one-off event"*. He is
right. The error was a measurement one, and it is worth naming exactly so it is not repeated: the
length was set against the **catch-up founding**, which is the one four-beat sequence in the product
that has a clock, at an invented five seconds a question. **An era advance is answer-paced and has no
clock at all.**

### What an advance actually costs, measured

An advance asks **two correct answers per node** (`eraCeremony.ts`'s `CEREMONY_ITEMS_PER_NODE`), so
ten checks at a five-node era, twelve at a six and eighteen at a nine. At the rate the specs already
use — **twenty seconds per answered item**, which `2026-08-01-test-out-experience-review.md:527-533`
derives rather than invents and cross-checks against its own whole-test-out estimate — plus fifteen
seconds to read #529's opening screen:

| | Perfect run | At 90% | At 80% |
| --- | --- | --- | --- |
| Five-node era (10 checks) | **3.6 min** | 4.4 min | 5.8 min |
| Six-node era (12 checks) | **4.3 min** | 5.3 min | 6.9 min |
| Nine-node era (18 checks) | **6.3 min** | 7.8 min | **10.2 min** |

`apps/web/src/city/ceremonyLength.test.ts` computes that table from the shipped code, and the same
review record independently *walks* era one's advance twice and puts it at four minutes both times
(`:593`, `:625`). **A miss costs exactly what a correct answer gains** (D-ET11), so the accuracy
columns are floors, not estimates — D-ET13 also re-queues every missed node and the ceremony cannot
finish while the queue is non-empty. **A learner at 50% never finishes**, which `eraCeremony.ts` rules
is the design working.

So the old 48 seconds covered about **a fifth of the shortest possible advance**, then handed the
soundtrack to the *destination* era's music while the learner was still answering questions to earn
that destination. The music arrived before they did.

### Why it is a loop, and why that costs nothing here

A passage that cannot know its own length has three available shapes: write for the longest case and
fade it, write it so it can skip ahead, or **write it so every moment is a legitimate place to stop.**

- **Longest case:** there is none. A learner at 50% accuracy never finishes, and even bounding to 80%
  at a nine-node era is over ten minutes — a ten-minute generated piece that most learners hear a
  third of, and that a slow one still outruns.
- **Skip ahead:** needs section boundaries a generated file does not carry, and no way to ask for
  them.
- **Stoppable anywhere:** available, and it means a loop.

**A ceremony is not a montage, and this is where the two part company.** A montage has to *give up*
its promised arrival to become stoppable. This one gives up nothing, because **the ceremony's arrival
is already scored by a sound effect.** `era-advance.ogg` — a struck temple bell, fired on the press
that performs the advance, and the last thing the learner hears — is the cadence. **If the bell is
the cadence, the music does not need one.** So the bed keeps the whole arrival and pays nothing for
being stoppable, and its job at that moment is to get out of the bell's way.

**A separate resolving sting was considered and refused.** It would be a sixteenth slot for the same
instant the bell already occupies, and a musical cadence would have to be written around 1 kHz, which
is the one narrow band the bell owns (see the frequency table). One licence verification and one
generation for a redundancy that fights an existing sound.

### Length: 150 to 240 seconds, target 180

**Long, because it wraps rather than ends, and §2's loop rules now apply in full.** At 180 seconds a
five-node era's advance wraps roughly once, and a nine-node era's with misses wraps three times. The
floor is 150 because the shipped default is 97 seconds and `music.ts` notes that at 97 *"the repeat is
far enough apart that it recedes into ambience instead of nagging"* — this passage plays for two to
ten minutes at a stretch, so it wants more distance than that, not less. The ceiling is 240 to match
`era-information_age`'s, the longest window in the set, past which the generation gets harder and the
download grows for a passage most learners hear half of.

**The single most important instruction is now the opposite of the old one: it must NOT resolve.** A
cadence in this file recurs every three minutes under a ceremony, which is the most learnable event
the soundtrack could contain and the property §2 item 1 ranks above every other.

### One passage for all ten advances, which forces period neutrality

**Not one per era.** It is the same ritual at every seam, and ten variants would spend nine
acquisitions diluting the thing that makes a ritual read as one, which is recognition. §5.1 made this
argument for a single shared crisis track and the lead overruled it at §D — but the argument was
never about crises in particular, and here nobody has overruled it.

**The cost §5.1 priced is the cost here, unmitigated.** One passage has to sit between era one's
ungridded hand percussion and era two's grid, and between era nine's processed pads and era ten's lit
deck. So *"no instrument that marks an era, no idiom anyone can date"* — §5.1's period-neutrality
requirement — **applies to this slot with full force.** §D records that the requirement *lapsed* for
the crises once there were four of them, each free to take its own era's kit. There is one of these,
under ten eras, so it does not lapse.

### What the room already has in it, measured rather than assumed

Five sound effects are wired to this ceremony, and a dense mid-range bed would bury them. Each was
decoded and its energy distribution measured, so this is a frequency map rather than a guess:

| Effect | When | Length | Where its energy is |
| --- | --- | --- | --- |
| `crowd-gather.ogg` | act one opens | 4.27 s | **120–500 Hz holds 68%**; middle 90% spans 120 Hz–2.1 kHz; partials at 122 / 176 / 210 Hz |
| `ceremony-expansion.ogg` | act two opens | 0.65 s | 500 Hz–2 kHz holds 67%; partials at 423 / 488 / 533 Hz |
| `ceremony-rebuild.ogg` | act three opens | 0.40 s | **60–250 Hz holds 84%**; centroid 152 Hz |
| `ceremony-rebuild-late.ogg` | act three, eras 7–10 | 0.49 s | 20–120 Hz holds 66%; centroid 86 Hz |
| `era-advance.ogg` | the advance press | 2.00 s | **essentially a pure 1023 Hz tone** — 97.5% inside one octave band, middle 90% spans 1018–1024 Hz |

So: **keep 120–500 Hz thin, keep the weight out of 60–250 Hz, and leave a hole around 1 kHz.** That
last one matters more now than it did when this was a cue, because the bell is no longer *one* of the
resolutions — it is the only one, and a sustained tone anywhere near 1 kHz erases it. What is
genuinely free is **above about 2.5 kHz**, where none of the five holds more than 8% of its energy.

**This is #523's lesson applied before the fact rather than after.** That change found a fire effect
with 89% of its energy below 60 Hz, inaudible on a laptop, only after it shipped.

### `ceremony-advance` — the era-advance ceremony, all ten seams

**One block, and §B does NOT go with it.** §B is close to right for this slot now, but it is written
for a track that scores a *place* and it names no ceremony; pasting both would say some things twice
and the wrong ones.

```text
Instrumental background music for a calm educational city-building game. It plays during the
ceremony in which the city advances from one historical age to the next: the citizens gather, the
island is extended, the town hall is rebuilt, and the age turns. The listener earns each of those
four acts by answering arithmetic questions correctly, so this plays UNDER someone working, for
anywhere between three and ten minutes at a stretch.

STRUCTURE, which matters more than anything else here. One sustained texture that holds from the
first second to the last, and it LOOPS. No intro. No build. No drop. No fill, no cymbal crash, no
riser, no key change, no solo entry, no crescendo. NO ENDING AND NO RESOLUTION: do not write a
cadence, do not land on a final chord, do not slow down at the end and do not fade out. It has to be
able to stop at any moment without anything sounding unfinished, and the last bar has to butt
straight onto the first with no audible seam. Nothing in it may be an event the ear can learn to
expect and wait for.

CEREMONIAL BUT NOT ARRIVING. This should feel like a civic occasion in progress rather than a
victory: a procession that is still walking, a foundation being laid, work being done with care.
There is a real arrival at the end of this ceremony and it is not the music's job — a struck bell
marks it. So this piece is the ground the occasion stands on, and it never announces anything.

DIGNIFIED AND LOW-AMPLITUDE. The listener has earned this by doing arithmetic correctly, and the
product's rule is that celebration stays low and earned. It is not a fanfare, not a level-up sting
and not the end of a film. It must never add pressure: no urgency, no accelerando, no doubling
subdivision, no drum build, no held dissonance, nothing that reads as a clock.

PERIOD-NEUTRAL, and this is a hard requirement rather than a preference. The same passage plays at
all nine seams, so it sits between stone-age hand percussion and a synthetic city. Use nothing that
dates it: no instrument that belongs to one century, no idiom anyone could place.

TEXTURE, NOT TUNE. Carried by a chord bed and a timbre rather than by a melody. No hook, nothing
whistleable, nothing a listener could sing back after hearing it ten times. Instruments: a low
sustained bed with no identifiable instrument in it, one struck resonant tone with a long decay
recurring irregularly, a wordless open interval held above, and a slow deliberate pulse that could be
felt rather than counted. Three or four voices at most. Fully instrumental: no lyrics, no singing, no
chanting, no choir, no spoken or intelligible voice.

FREQUENCY. Leave the low mid-range mostly empty: keep 120-500 Hz thin and sparse, and keep the weight
out of 60-250 Hz, because a crowd and two hammer strikes already occupy those. Leave a clear hole from
about 900 Hz to 1200 Hz, because a struck bell at 1 kHz is the last sound of the ceremony and the
only thing that resolves it. Put brightness and detail above 2.5 kHz, which is empty.

DYNAMICS. One narrow range from start to finish, with no quiet passage followed by a loud one.

TEMPO. 60-80 BPM, steady, unhurried, and never speeding up.

SPACE. Include at least one bar in which almost nothing happens, and leave regular clear gaps so
that short sounds landing on top of it are still audible.

LENGTH. 150 to 240 seconds. Aim for 180. Longer is better here: this plays for minutes at a time and
a short loop is at its most intrusive exactly then.

Key: <one key, free; see "the one thing to fill in">
```

```text
ending, final chord, resolution, cadence, resolving cadence, outro, coda, fade out, fade in, intro,
build-up, drop, riser, swell, crescendo, decrescendo, key change, modulation, tempo change,
accelerando, ritardando, fill, cymbal crash, timpani roll, snare roll, drum build, stinger, sudden
hit, stab, solo, hook, catchy melody, singable melody, fanfare, triumphant fanfare, brass fanfare,
horns, trumpet, victory theme, level-up jingle, achievement sting, orchestral climax, epic
percussion, trailer music, cinematic swell, choir, chanting, singing, vocals, lyrics, spoken word,
church bell, temple bell, bell peal, carillon, gong, tubular bells, chimes, dense mid-range pad,
thick low-mid drone, wall of sound, harpsichord, lute, sitar, gamelan, bagpipes, tribal drums,
synthwave, chiptune, any dateable period idiom, wide dynamic range, sudden loud passage, urgency,
tension, dread, countdown, clock, ticking, alarm, siren
```

> **What happens at both ends of the range.** **A learner who takes ninety seconds** hears about half
> of one pass and then the bed crossfades out under the bell. Nothing is missing, because a bed has no
> arrival to miss — that is the whole property the loop buys. **A learner who takes ten minutes** hears
> it wrap three or four times, and it never goes silent, because a loop does not end. Neither case
> needs a decision at runtime, which is the test the shape had to pass.

> **The handover is the advance press.** The bed plays while the city is still standing in the age
> being left, and stops the instant that age moves — which is the same press that strikes the bell, so
> the bell covers the crossfade. `eraMusic.ts`'s `trackIdForScene` keys off the era rather than off the
> ceremony surface unmounting, deliberately: the press does both, and the other ordering would flash
> the outgoing age's music in between.

> **The catch-up walk's replayed foundings do NOT play this**, so do not length it against them. A
> replay is fourteen seconds after #532, against a passage of 150 to 240, so a declaring recap would
> play under 6% of it and then fade out — four or five times in a row. `city/activeCeremony.ts` carries
> the full argument, `audio/ceremonyMusicSkipsRecaps.test.tsx` is the guard, and §J's `catchup-montage`
> is the passage those seconds are actually owed.

> **The bell is the one collision worth naming twice.** `era-advance.ogg` is a struck temple bell at
> 1023 Hz and it is the last thing the learner hears. It is why bells, gongs and chimes are on the
> negative list even though a bell is the obvious instrument for a civic ceremony: the ceremony
> already has one, this passage's job is to leave room for it, and it is now the only cadence the
> occasion has.

---
## §F. The route: §6.6 is superseded in part, and Stable Audio is out

### What §6.6 concluded

It reached a conclusion rather than hedging, and it separated two questions that get conflated.

1. **May we ship generated music? Yes, conditionally, and the condition is the paid tier.** Every
   free tier it examined is non-commercial, and an upgrade does not reach backwards: a track
   generated on a free tier stays unshippable. It ruled **Meta MusicGen / AudioCraft out entirely**,
   which is the row it says will be got wrong — the code is MIT but the **weights are CC-BY-NC
   4.0**, and a model licence is a licence on everything the model produces in your hands. It put
   **Suno Pro/Premier**, **Udio paid**, **Stable Audio Pro** and **ElevenLabs Music paid** in the
   can-ship column — ElevenLabs with *"read the tier carefully"* against it, because self-serve
   plans reportedly exclude large studio games and require attribution — and **Stable Audio Open,
   self-hosted**, as the one free self-hosted route that was not barred.
2. **Would we own it? Almost certainly not, and it matters less than it sounds.** Human authorship
   is required, prompts alone are not authorship, and more than de minimis AI-generated material
   must be disclosed and disclaimed on registration. The product does not need to enforce a
   copyright in its background music; it needs **the right to ship**, which a paid tier grants. What
   non-ownership actually costs is **exclusivity** — another product may ship something very close —
   and for a background loop in a study tool that is acceptable and should be **recorded as a
   decision rather than discovered as a surprise**.
3. **The recommendation on route: open source first, generation as the fallback**, for the eras
   where CC0 measurably fails, which §6.5 puts at **eras 8, 9 and 10, plus era 2**. Era two is
   flagged as the awkward one because it is the only one of the four that stage one wants
   immediately. **For a batch, one month of one paid subscription**, done in one sitting, with the
   provenance facts written down before the tab closes.

### Two of its rows are now closed

**Stable Audio is out.** The Stability AI Community License terminates above **USD $1M in annual
revenue counted across affiliates in aggregate**, and this project sits inside a group well past
that threshold. Both Stable Audio rows go with it: the Pro row's commercial grant is the one that
requires an Enterprise licence above the same figure.

**§6.6 recorded the threshold and never applied it**, which is the specific way it went wrong
rather than a general unreliability. It printed *"A separate Enterprise licence is required above
USD $1M annual revenue"* on the Pro row (`:918`) and *"terminates above USD $1M annual revenue"* on
the Stable Audio Open row (`:921`), and returned **Can ship** for both. It never asked what this
project's revenue is, and it read the threshold as belonging to the project rather than to the
affiliate group.

**The consequence is larger than two rows, which is why this is flagged rather than written
around.** §6.6's own sentence — *"The free self-hosted route that looks cleanest is the one that is
flatly barred. `Stable Audio Open` is the self-hosted route that is not"* (`:927-929`) — no longer
holds. **Both self-hosted rows are now barred**, MusicGen by its non-commercial weights and Stable
Audio Open by the revenue test, so **§6.6's table now contains no free route at all**: every
surviving can-ship row is a paid subscription. That does not overturn its recommendation. It removes
the alternative to it, and one month of one paid subscription stops being the cheapest legal route
and becomes the only one.

**Treat §6.6 as superseded on the two Stable Audio rows and on the self-hosted paragraph, and
standing on everything else.** Its structure survives intact: free tiers cannot ship, MusicGen
cannot ship, rights are conditioned on the plan at the moment of generation, ownership is not
available and does not need to be, and open source comes first.

**The test to apply to whatever replaces it** is not "does this licence permit commercial use" but
**"does the permission survive this group's revenue, with affiliates counted in aggregate"**. That
question is asked nowhere in §6.6, and it is the one that closed the only free row it had.

### The two under consideration

**Neither appears anywhere in the brief.** Grepped over `docs/` at this tip, `AIVA` and `Soundraw`
return nothing outside this file, so §6.6 evaluated neither and what follows is a note for whoever
does rather than a verification.

- **AIVA Pro** offers **full copyright assignment**, and it is a **subscription rather than a model
  licence, so there is no revenue test to fail.** That is exactly the property Stability lost: the
  $1M threshold is a term of a *model* licence, and a per-seat subscription does not carry one.
- **Soundraw** grants a **perpetual licence on anything exported**, which softens §6.6's sharpest
  operational finding — the right does not lapse when the subscription does. It does not remove it,
  because the export still has to happen while the subscription is live, so §G's facts are still
  owed with the **export** date as the one that matters.

**§6.6's second question survives the vendor change intact, and this is worth saying because the
word "copyright" invites the opposite reading.** A vendor can assign only what it has. On §6.6's own
cited authorities — human authorship required, prompts alone not authorship — a track generated
entirely by a model has no US copyright for anyone to hold, so **AIVA's assignment should be read as
the right to ship plus whatever exclusivity the contract gives, and not as a copyright this project
would own.** §6.6's answer to question two is unchanged, and so is its finding that this is
acceptable here.

**Read the vendor's own terms page on the day of purchase and before any money moves.** That is
§6.6's own caveat, and it applies with more force now that the reason for this rewrite is a term
nobody re-read.

### Both differ materially from a plain text box

Established from each vendor's own documentation and from secondary reporting on 2026-08-03, which
is §6.6's evidence standard for generator behaviour and not §6.3's per-asset standard for licences.
**Neither is a text-to-music box** in the way Suno, Udio and Stable Audio are:

- **Soundraw takes no text prompt at all.** Its own account of its generator says it *"doesn't rely
  on text prompts"*: you set Length and Tempo, select Mood / Genre / Theme tags, include or exclude
  instruments, and edit the result in a Mixer. So the blocks above are **read rather than pasted** —
  the tempo band goes into the BPM control, the length window into Length, the instrument sentence
  into the include filter, and the negative block into the exclude filter and into what you decline
  to tag. **One thing then needs undoing by hand**: the Mixer builds intro / chorus / outro
  structure per section, which is the exact thing the loop rule forbids, so flatten the structure
  and delete the intro and the outro before exporting.
- **AIVA's text prompt affects the harmony only.** Its own helpdesk is explicit that text prompting
  *"only affects the harmony that will be used to generate your composition. It does not alter other
  musical elements, like the instruments or the arrangement"*, and it asks for Roman numerals rather
  than chord letters. Everything else is a style preset plus manual parameters: tempo, key, time
  signature, duration, instrumentation. So the **tempo, length and instrument lines are parameters
  rather than prose**, and only the harmonic sense of each slot goes in the box. Two properties in
  its favour: MIDI and stem export makes **loop-trimming at the source** (§2 property 5) an edit
  rather than a hope, and it is the cheapest way to satisfy **era ten's quotation of era one**,
  which needs one track's material inside another.

**The blocks above are written for a plain text box and are deliberately not tailored to either**,
because the tool is not chosen. Nothing in §A to §E depends on which one wins.

---

## §G. Four facts to capture at generation time, or they are lost

§6.6, unchanged by anything above, and the reason is that **provenance for a generated track is not
a URL**: it is a set of facts that exist only at generation time and cannot be reconstructed
afterwards. `CREDITS.md`'s row format has no place to put them, so it needs extending, and §6.6
proposes the extension in that file's own table idiom.

1. **The tool and the model version.**
2. **The plan tier active at that moment**, because the right is conditioned on the plan at the
   moment of generation — and, for a perpetual-on-export licence, at the moment of export.
3. **The generation date**, plus the export date where the two differ.
4. **The prompt.** This is why this file exists: §6.6's proposed provenance row points at a prompts
   file, so cite this file and the slot id — `2026-08-03-era-and-crisis-music-generation-prompts.md`,
   slot `era-atomic_age`.

And the provenance rule those rows sit under does not bend for a generated file: *"Nothing goes in
`public/audio/` without a row in this file. If the provenance of a file cannot be established, the
file does not ship."*

---

## §H. What this file does not decide

1. **Which tool.** §F reports the route and flags what closed; it does not pick between AIVA Pro and
   Soundraw, and the prompts are not tailored to either.
2. **Whether generation is used at all for the thirteen slots that have a candidate.**
   `2026-08-03-music-picks-per-slot.md` holds one pick per slot with a checked link and a verified
   licence, and **nobody has listened to any of them**. Only `era-neolithic` is recorded there as
   genuinely empty. These prompts are the fallback for every other slot and the primary route for
   that one. **`ceremony-advance` has no picks-sheet row at all**, because the sheet predates the
   slot; it is generation-first by default until somebody searches for it.
3. **The pitch centres.** §A names the four pairs that must match and leaves the key open, as §7.5
   does. **`ceremony-advance`'s key is free too, and there is an argument for pinning it that is not
   made here**: the cue plays between every pair of adjacent era tracks, so a shared pitch centre
   across the whole set would make nine handovers smoother than they will otherwise be. That is a
   set-level acquisition decision of the kind §7.5 owns, and it costs nothing while nothing is
   acquired.
4. **Whether CC-BY is acceptable**, which the picks sheet costs at a credits screen, and §7.1's hour
   of listening. Both are prior decisions and neither is a prompt question.
5. **Whether a crisis owes the same treatment.** A crisis begins and ends too, so the structural
   argument for a cue transfers, and it is deliberately not acted on here. The asymmetry that decides
   it is not the count but the ENTRY: §5.2 already rules that a crisis track must *"cross-fade in
   rather than cut"* over one to two seconds, and the four crisis loops therefore already own their
   own openings, where an era loop has no opening at all. What a crisis conclusion has and an era
   advance does not is a real moment with nothing under it — but the crisis conclusion is also one of
   the two events `sfx-picks-per-city-event.md` deliberately left with no sound, on the grounds that
   it has no physical referent, and the same objection applies to a cue for it. Scheduled rather than
   answered.

---

## References

- `docs/superpowers/specs/2026-08-01-era-and-crisis-music-brief.md`: the source of every constraint
  here. §1 and §1.1 for the crisis register and the six devices, §2 for loopability, §3 for the
  signature-move rule and the tempo ruling, §4.0 and §4 for the ten entries, §5.2 for the crisis
  entry, §6.6 for the route, §7.2 and §7.5 for the order
- `docs/superpowers/specs/2026-08-03-music-picks-per-slot.md`: one open-source pick per slot, none
  auditioned, and the one slot with none
- `apps/web/src/audio/eraMusic.ts`: the slot ids these headings use, the one-per-crisis assumption,
  the per-slot standing orders, and the ceremony slot §I is for — `CEREMONY_SLOT_TRACK_ID`,
  `CEREMONY_MUSIC` and `slotPlayback`, which is where loop-versus-cue is decided
- `apps/web/src/city/activeCeremony.ts`: why the catch-up's replayed foundings do not play §I's cue
- `apps/web/src/city/eraCeremony.ts` and `apps/web/src/catchup/foundingClock.ts`: the two durations
  §I's length window is checked against — two checks per node, and the 45.0–57.5 s founding budget
- `docs/Game_Visual_Design_Brief.md` `:50-73`: Maya, and the banned mechanics §1 is written under
- `apps/web/public/audio/CREDITS.md` `:5-6`: the provenance rule §G's rows sit under
