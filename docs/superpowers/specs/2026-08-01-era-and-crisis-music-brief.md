# Era and crisis music: a sourcing brief

**Date:** 2026-08-01
**Status:** brief. **Nothing was acquired, nothing was downloaded, and no audio file is added by this
change.**
**Measured at:** `integration` `3b655728`. Every repository claim below carries a file and a line
read at that SHA.
**Audience:** whoever procures the tracks, and whoever signs off the licences.
**Scope:** what each of the ten era tracks and the crisis track has to be, and where each might come
from.

---

## 0. The requirement, and what this document is not

The team lead, verbatim:

> each era has its own track, and crises also have their own track. there should be open-source that
> we can procure, but if not we can generate it using online software

So the target is **ten era tracks plus crisis music**, and the acquisition route is open source
first and generation second. This document is the specification that makes that acquisition
possible. It is **not** the player, **not** an acquisition, and **not** a decision about which
candidate ships.

**Three things it deliberately does not do.**

1. **It does not touch code.** A separate agent is building the ability to switch tracks. Nothing
   here depends on how that lands, and nothing here should be read as a design for it.
2. **It does not name a winner.** Section 6.3 lists candidates whose licences were verified per
   asset. **Not one of them was listened to**, and section 6.3 says so at the head of its own table,
   because a licence check is not an audition and the two are easy to confuse when they arrive in
   the same table.
3. **It does not invent a number it could measure.** Where a figure is a design instruction rather
   than a measurement, it is labelled as one.

---

## 0a. What the tree actually holds, measured

**Two tracks ship**, both CC0, both by the same author, both RPG town themes:
`apps/web/public/audio/music/town-theme.mp3` (1,316,581 B) and `a-new-town.mp3` (766,291 B), sizes
measured on disk at this tip and matching `apps/web/public/audio/CREDITS.md:27-28`. So against a
target of eleven the shortfall is **nine at minimum**, and the two that exist may not be era one's
(see section 7.1).

**One track can play at a time and nothing selects a second.** `MUSIC_TRACKS` is a two-entry tuple
(`apps/web/src/audio/music.ts:59-82`), `DEFAULT_TRACK_ID` is the single selector (`:88`), and
`createMusicPlayer` is called once at module scope with no `trackId` (`:242`). Grepped at this tip,
the only files referencing `musicPlayer` are `apps/web/src/audio/useAudio.ts`,
`apps/web/src/audio/AudioSettings.tsx` and the module's own test. **No city, era or crisis module
touches music at all.**

**The consequence is worth stating plainly because it is the strongest argument in section 7.** The
Hard Winter runs today with `town-theme.mp3` still looping underneath it. A cheerful RPG town theme
plays over a settlement the weather has shut down, and that is not a missing feature so much as an
active tonal error.

**Authored land is narrower than the briefing that produced this document assumed.** It said era one
and era two are the two eras with authored land and buildings. Measured:

| Surface | What is wired at `3b655728` |
| --- | --- |
| Island ground | **Era one only.** `ERA_ISLAND_GROUND` holds exactly one key, `prehistoric` (`apps/web/src/city/islandGround.ts:372-374`) |
| Building dressings | **Two rows**, `prehistoric` and `neolithic` (`apps/web/src/city/eraDressing.ts:140`, `:171`); the advisor table has the same two (`:240`, `:251`) |
| Generated building art | **None in the tree.** All ten `output/imagegen/era-*/` folders hold exactly one file, `README.md`. `2026-07-30-era-palette-ladder.md:83-86` records that era two's generated art exists but is untracked, and `:598-603` records that it owes a regeneration against the moved hue |

That correction makes section 7's staging argument stronger rather than weaker, which is why it is
reported here rather than left to be discovered.

---

## 1. The ruling every entry is written under: serious is not the same as threatening

`docs/Game_Visual_Design_Brief.md:68-73` bans, at the product level and not as a style preference:

> countdown/urgency timers framed as pass/fail, streak-loss guilt, artificial scarcity, loot-box /
> variable-reward gambling loops, "energy" gates, or nagging badge/notification pressure

and `:59-60` requires that nothing "flashes, nags, shames, or induces urgency". The audience is
Maya, who is "math-anxious, has been burned by timed tests" (`:50-55`).

**Music is the easiest place in the product to break that by accident**, and the reason is
structural rather than careless. Every other surface has to be looked at to do its work; music
reaches the learner whether or not they attend to it, it reaches them continuously, and it reaches
them through the channel that regulates arousal most directly. A visual mistake is noticed and
fixed. An audio mistake raises a learner's heart rate for forty minutes and nobody files it, because
nobody can point at it.

**And a crisis track is where the instinct is most wrong.** Asked for crisis music, the reflex is
tension, and tension aimed at an anxious learner during an event that already feels timed is
precisely the banned thing. So the hard design problem is not "how do we make a crisis sound
different" but "how do we make it sound **serious** without making it sound **threatening**", and
the rest of this section is the answer.

### 1.1 The six devices that make music threatening, named so they can be refused

Each is a mechanism rather than a genre, so each is checkable against a candidate.

1. **Acceleration, in tempo or in subdivision.** A tempo that climbs, or a pulse that splits from
   quarters into eighths into sixteenths, **is a clock**. `INV-CRISIS-1` makes every crisis clockless
   (`2026-07-29-mid-era-crisis-design.md:613`: "Nothing accrues or advances with wall-clock time"),
   and an audible accelerando would reintroduce through the speakers the exact thing four art briefs
   removed from the screen.
2. **The unresolved riser.** A pitch or a dynamic that climbs and never lands is the film language of
   "something is coming". It works by withholding, and withholding is what an anxious learner is
   already doing to themselves.
3. **Dissonance held open.** A tritone or a minor second sustained past the point where the ear
   expects a resolution. This does not have to be loud to work, which is what makes it slip past a
   volume-based review.
4. **The startle event.** A stinger, a sudden hit, a silence followed by a hit. This is screenshake
   for the ears, and `docs/Game_Visual_Design_Brief.md:73` already rules on the visual form of it.
5. **A low pulse in the heartbeat band.** A low drum at roughly 60 to 100 beats per minute maps onto
   the body and is read as one. It is the oldest device in horror scoring and it is the one most
   likely to arrive by accident, because it is also what "serious percussion" sounds like.
6. **A crisis loop that is shorter or louder than the era loop it replaced.** Repetition rate and
   volume are both attention signals. A crisis that gets louder and repeats faster is saying "attend
   to this now" in two channels at once.

### 1.2 What serious sounds like instead

**Weight rather than speed.** Gravity is a function of mass. Drop the register, lengthen the note
values, slow the rate at which the harmony changes. Nothing in that list is faster than what it
replaced.

**Fewer voices and more space.** Thinning is the single strongest available signal that the world has
changed, and it is the exact opposite of urgency. A crisis that removes three of its five parts has
announced itself unmistakably and has lowered the learner's arousal while doing it.

**The era's own material, altered rather than replaced.** If the crisis track shares its harmony or
its motif with the era track under it, the change reads as *this place under a different condition*
rather than *a different game*. That is `D-ERA32`'s logic carried into sound, and section 5 makes it
the core of the recommendation.

**Resolution still arrives, and arrives later.** The cadence is not withheld. The phrase is longer.
That is the difference between gravity and suspense, and it is a difference an editor can hear.

**The phrase settles rather than lifts.** End a period lower than it started.

### 1.3 The four crisis art briefs already solved this problem in light, and the answer transfers

This is not a new problem to this document. Four crisis art briefs each had to make a crisis legible
without making it frightening, each chose a lighting preset to do it, and **not one of them chose
darkness**.

| Crisis | Era | What the light does | Cited |
| --- | --- | --- | --- |
| Hard Winter | 1 | *"overcast, not night. A blizzard at midday is bright and shadowless"* | `2026-07-30-hard-winter-crisis-art-brief.md:268` |
| Succession | 4 | *"the only one of the four whose key goes UP"*, a hard white noon | `2026-08-01-succession-crisis-art-brief.md:123` |
| Plague | 6 | *"do not make it gloomy... Pale, even and empty is more unsettling than dark"* | `2026-08-01-plague-crisis-art-brief.md:121-124` |
| Intrusion | 9 | *"Why not night, and this is the trap in this preset"* | `2026-08-01-intrusion-crisis-art-brief.md:136` |

**Three of four pull the key down, one pushes it up, and all four leave the city completely
visible.** The transferable rule is that a crisis in this product is **a change of condition, not a
darkening**, and the learner is never told that something they cannot see is about to happen to
them. Era four's brief puts the reason in a sentence: *"Weather would be a lie about the mechanic.
Nothing is wrong with the sky; something is wrong with who is in charge"*
(`2026-08-01-succession-crisis-art-brief.md:127-131`).

Two more properties carry straight across. **The crisis scenes are still**: era six's is
*"the stillest of the four and its only motion is external"*
(`2026-08-01-plague-crisis-art-brief.md:93`), era four's is *"almost nothing, and that is the read"*
(`2026-08-01-succession-crisis-art-brief.md:335`). And **the copy rules already reject the register
this brief is warning about in prose**: `crises/README.md:288-315` bans framing the player's correct
answers as currency and requires plain language over narrating the stakes back at them. A track that
editorialises about the stakes is doing in sound what that ruling forbids in words.

### 1.4 The test, in one sentence a reviewer can apply

> **A crisis track is serious when it is slower, thinner and lower than the era track it replaced
> while staying tonally settled. It becomes threatening the moment it gets faster, denser, higher,
> or starts withholding a resolution it has taught the learner to expect.**

And the corollary, which is the thing to say out loud in review because it will be argued with:
**if a reviewer's first instinct on hearing the crisis track is "this needs more tension", that
instinct is the defect the brief exists to prevent.** The correct response to "it does not feel
serious enough" is to take something away, never to add.

---

## 2. What makes a loop bearable at the tenth repetition

This track plays behind arithmetic for a long time. **Whether a loop is good and whether a loop
survives its tenth pass are different questions**, and the second is the one that decides whether a
learner switches the music off. The six properties below are ordered by how much they matter, which
is not the order anyone reaches for.

1. **Nothing in it may be an event.** What becomes unbearable is not repetition, it is
   **anticipation**. A hook, a fill, a cymbal crash, a key change, a solo entry: anything the ear can
   learn to expect becomes a metronome for the learner's attention, and by the tenth pass they are
   counting bars instead of factoring. The module already knows this. `music.ts:69` says of the 97
   second default that *"the repeat is far enough apart that it recedes into ambience instead of
   nagging"*, which is the same observation reached from the length side.
2. **Texture over tune.** A track carried by a chord bed and a texture survives ten passes. A track
   carried by a melody does not, because a melody is learnable, and once it is learned the learner is
   singing it. This is the single most useful filter to apply to a candidate list, and it eliminates
   most game music immediately, which is a feature.
3. **Length, second and not first.** Longer is better, and the shipped pair proves the point is
   real: 97 seconds against 62, with the module's own note preferring the longer
   (`music.ts:69`, `:80`). But a long track with a hook is worse than a short track without one, so
   length is the second lever and never the first. **Aim above 90 seconds** and treat anything under
   60 as needing an unusually eventless surface to compensate.
4. **A narrow dynamic range.** No quiet passage followed by a loud one. The learner is doing
   arithmetic; anything that makes them reach for the volume has already interrupted them.
5. **An inaudible seam, which is a file property and not a taste.** `music.ts:189` sets
   `element.loop = true`, which is a native gapless loop, but only if the file's first and last
   samples meet. **An mp3 carries encoder delay and padding**, so a track that loops perfectly in an
   editor can still click once per pass in a browser. Two consequences for acquisition: the file must
   be **loop-trimmed at the source**, and where a candidate is offered in both, **Ogg Vorbis or Opus
   is the safer container** because the padding is declared rather than baked in. This is worth
   checking before a licence is, because a track that clicks is unusable at any licence.
6. **It must survive being ignored and it must survive being noticed.** Those pull in opposite
   directions, and the resolution is that it may be interesting **in texture** and must be
   uninteresting **in structure**.

**The check that can actually be run, and it is cheap.** Play the candidate ten times through with
the tab in the background while doing something else. **If you can name the moment you are waiting
for, the track fails.** That test takes about fifteen minutes per candidate and it is the only test
in this brief that catches property 1, which is the property that matters most.

---

## 3. The register: take the era's signature MOVE, not its period instruments

The buildings in this game are not historically reproduced, and the music must not be either. Era
one's guide is explicit that the tally motif is *"the era's decorative language, not a symbol of
arithmetic bolted onto each building"*
(`eras/era-01-prehistoric/style-guide.md:110-114`), and every guide picks **one structural idea** and
lets it organise everything rather than assembling a period costume.

**So the house rule for the music is the same rule.** Each era's track takes that era's own
**signature move** as its organising principle. The period instruments are a hint and never the
brief. A prehistoric track is not "tribal drums", it is a piece in which **nothing repeats
identically**, because era one is the era in which every piece was shaped to the place it went
(`eras/era-02-neolithic/style-guide.md:166-167`).

That mapping is what makes the ten tracks a **set** rather than ten stock cues, and it is the whole
of section 4's structure.

**One set-level ruling, and it is the one most likely to be got wrong.** The obvious shape for ten
era tracks is slow and sparse at era one rising to fast and dense at era ten. **That is a ten-hour
accelerando, and its endpoint is the era a learner reaches when they are most invested.** Speeding
up as a learner progresses is urgency framing built into the structure of the soundtrack, which
`docs/Game_Visual_Design_Brief.md:68-73` bans. So:

> **The set expresses era through density, register, timbre and harmonic language. It never
> expresses era through tempo.** Tempo stays inside one narrow band for all ten, and **era ten must
> not be the fastest track in the game.**

This mirrors what the palette ladder already does with colour: the ten hues move up and down in
lightness rather than brightening monotonically, and the ladder's own reasoning is that **the early
seams carry the most weight** because era one to era two is the transition every player is
guaranteed to meet (`2026-07-30-era-palette-ladder.md:45-48`). The same is true in sound, and the
same trap is available: era one and era two were the closest pair in the run because both were warm
earth at nearly the same saturation (`:406-411`). **Two adjacent eras that are both quiet hand
percussion is the identical defect in the identical place.**

---

## 4. The ten era entries

### 4.0 The constraints that apply to all ten, stated once

- **Nothing urgent, ever**, per section 1. This is not a crisis-only rule.
- **Tempo inside one band**, per section 3. The brief's own direction, offered as an instruction and
  not a measurement: keep the whole set inside roughly **60 to 100 beats per minute**, and where an
  era wants to feel faster, buy it with subdivision and density rather than with tempo.
- **No lyrics and no intelligible voice** in any track. A voice is language, and language competes
  directly with reading a word problem.
- **Loop rules from section 2 apply to every entry** and are not restated per era.
- **Above 90 seconds**, per section 2 property 3.
- **A silence budget.** Each track should contain at least one bar in which almost nothing happens,
  because a texture with no gaps has nowhere to recede to.
- **Adjacent eras must be tellable apart on a channel other than tempo**, per section 3.

### Era 1: Prehistoric

**Source.** *"a cluster of hand-built shelters on cleared earth, where every surface that can hold a
mark holds one"* (`eras/era-01-prehistoric/style-guide.md:105`). Signature move: the tally, and its
justification is that it is what these people carve on everything (`:109-114`). Structure: things
stand up *"by leaning and by being propped"*, with lashings at every joint (`:142-152`). Ornament:
*"very low, and structural"*; visible technology is fire, cordage and the lever, with *"nothing that
implies metallurgy, the wheel, or agriculture"* (`:218-225`).

**The read, in one sentence a listener can check against.** *Several people making a sound together
who have never agreed on a grid, in a room with one fire in it.*

**Instrumentation.** Struck and shaken things with no pitch centre to defend: frame drum, hollow log,
stones, a rattle, a breathy end-blown flute or a bone whistle carrying at most three or four notes.
One voice-like sustained tone is allowed provided it is wordless and does not form a melody.

**The signature move in sound: nothing repeats identically.** No two bars of the percussion are the
same, because era one is the era before the mould. This is also what keeps it out of stock "tribal
drums", which is a looped identical pattern and is therefore **era two's** idea arriving four
thousand years early.

**Tempo and energy.** Slow, roughly 60 to 72, and deliberately not locked. Low energy. There is no
downbeat to lean on because there is no grid.

**Length and loop.** 90 to 150 seconds. The seam is easy here: an ungridded percussion texture has no
bar line to expose, which makes era one the most forgiving track in the run to loop.

**Must not.** No metal of any kind, no drone synthesiser, no orchestral strings, no melody you could
whistle back, no chanting or intelligible voice, no didgeridoo or any instrument that names a
specific living culture, no accelerating drum build, no "primitive" cliché that would read as an
adventure-film cue, and nothing on a strict grid.

### Era 2: Neolithic

**Source.** *"a settlement that has started to work the land"* (`eras/era-02-neolithic/style-guide.md:111-112`).
Signature move: the worked land (`:114-121`). Building language: the moulded unit, where *"a mould is
filled a hundred times and the hundred results are interchangeable, so ornament stops being the notch
and becomes the course"* (`:165-173`), and the causation is stated the right way round:
*"Repetition is what agriculture actually feels like... so the mould is the field's habit carried
indoors"* (`:176-179`). Visible technology deliberately excludes metal (`:299-301`) and takes the
wheel as *"rotation, not transport"* (`:303-306`).

**The read.** *The same short figure played over and over without varying, and the repetition is the
point rather than a limitation.*

**Instrumentation.** Era one's kit plus the first **pitched, tuned, repeatable** thing: a simple
plucked string or a struck wooden bar with a fixed pitch set. Grain shaker, hand drum on a real
grid, a low sustained tone under it.

**The signature move in sound: this is where the loop is invented.** Era one has no repeating bar;
era two is nothing but repeating bars. That is the single largest audible step in the whole run, it
lands at the seam every player is guaranteed to meet, and it is free.

**Tempo and energy.** 72 to 84 and metronomically steady, which is itself the era's statement. Low
to moderate energy. Steady is not the same as driving: keep the accents even so the pulse reads as
patient work and not as marching.

**Length and loop.** 100 to 180 seconds. A track built out of an identical repeated bar can be
loop-trimmed exactly, so this era should be **seamless** rather than merely acceptable.

**Must not.** No metal, no bright cymbal or bell, no wheeled or galloping rhythm, no harvest-festival
jollity, no folk-fiddle idiom (that is roughly era five), no crescendo across the loop, and nothing
that varies the repeated figure for interest, because variation is the one thing this era does not
yet have.

### Era 3: Bronze Age

**Source.** *"a trading town that has learned to cast metal, and puts it wherever two things meet"*
(`eras/era-03-bronze-age/style-guide.md:63-64`). Signature move: **metal at the joint**, so
*"the joint is the decoration"* and a building is read by the points where its parts are fastened
(`:66-75`). Trade is the premise: tin *"comes from somewhere else, which is why the harbour... is the
era's real monument"* (`:77-82`). Ornament is *"the fitting"* and the era bans anything implying iron
(`:171-187`).

**The read.** *A steady piece you notice mainly at the moments where one section is fastened to the
next.*

**Instrumentation.** Era two's tuned wood and drums, plus the run's first **struck metal**: small
bronze bells, a light gong, finger cymbals, a struck bowl. Held to points and small in area, exactly
as the guide holds the metal on the buildings. A double-reed or a lyre-like plucked string carries
whatever line there is.

**The signature move in sound: the seams are where the metal goes.** The piece is otherwise plain,
and at each structural junction a single bright struck note marks the join. It is the era's whole
idea and it costs one sound.

**Tempo and energy.** 76 to 88, weightier than era two because era three's affect is mass
(`:122-133`). Moderate. The extra weight comes from register and note length, never from speed.

**Length and loop.** 100 to 180 seconds. **This era's loop seam is its own signature**, so the
strike that marks the wrap point is a feature rather than the thing to hide. It still must not read
as a stinger: one small bright note, not a hit.

**Must not.** No iron or steel timbre, no anvil, no forged or clanging percussion, no brass section,
no Middle-Eastern or Egyptian idiom (the guide names a trading harbour and never a place, and the
free-library pool will push hard in that direction: see section 6.5), no cinematic ancient-epic
swell, and no arpeggio that reads as a fanfare.

### Era 4: Classical

**Source.** *"a small port city built to a line, in cut stone, out of one bay repeated"*
(`eras/era-04-classical/style-guide.md:66`). Signature move: the repeated bay, which is
*"a single module counted along a wall"*, and the era passes the distance test because
*"a colonnade reads at distance because it is rhythm, and rhythm survives being small"* (`:68-81`).
The island *"stops being a place that grew and becomes a place that was set out"* (`:83-88`).
Ornament goes entirely into one system (`:193-205`).

**The read.** *A fixed-length phrase repeated at an exactly constant spacing, so that a listener
asked how many there were could count them.*

**Instrumentation.** Plucked strings (lyre-like, or a light harp), a soft double reed, a low bowed
drone, light frame percussion marking the module. Nothing orchestral: this is a chamber-sized
ensemble, because a colonnade is one module repeated and not a mass of players.

**The signature move in sound: the module is countable.** The phrase length is fixed and never
elides. Where the piece wants more weight it gets **another bay**, meaning another repetition of the
same phrase, and never a bigger sound. That is the guide's own rule for the buildings
(`:155-157`) applied literally.

**Tempo and energy.** 80 to 92, even and unhurried. Moderate. Symmetry does the work.

**Length and loop.** 120 to 200 seconds, and this is the era where a long loop is cheapest to build,
because the material is a repeated module and length is a matter of how many.

**Must not.** No orchestral strings in section, no timpani, no fanfare brass, no film-score
"antiquity" idiom, no sword-and-sandal epic, no dramatic pause before a phrase, no rubato (the era
was set out to a line), and no counted rhythm so strong it becomes a march.

### Era 5: Medieval

**Source.** *"a walled town crowded onto the previous city's stonework, wearing its timber frame on
the outside"* (`eras/era-05-medieval/style-guide.md:67-68`). Signature move: the frame drawn on the
elevation, where *"the pattern you see is the load path"* and *"take the pattern away and the
building falls down"* (`:70-81`). And the era hands the music its own instrument:
*"The bell is the era's public instrument, and it strikes rather than shows"* (`:218-223`).

**The read.** *A piece whose accompaniment is plainly the skeleton of the tune rather than a cushion
under it, with a bell in it that rings occasionally and never on a beat you expected.*

**Instrumentation.** Plucked and bowed strings of the lute and vielle family, a recorder or a
shawm-like reed kept soft, a tabor, and **one bell**. The bell is the era's public instrument, so it
belongs, but it strikes rather than shows: it is a single tolled note and never a carillon melody.

**The signature move in sound: the structure is on the outside.** The accompaniment is an audible,
skeletal frame rather than a pad. A drone plus an open fifth carries the whole piece and the ear can
hear exactly what is holding it up.

**Tempo and energy.** 84 to 96. Moderate. This is the busiest the run gets before era seven, and it
is busy in **density** rather than in tempo.

**Length and loop.** 100 to 180 seconds. Place the bell so it does **not** fall at the loop point,
because a bell at the seam is the single most learnable event in this whole set.

**Must not.** No tavern-jig idiom, no drinking-song sing-along shape, no crumhorn comedy, no
Renaissance-fair pastiche, no full carillon, no bell repeated on a fixed count (that is a clock, and
`INV-CRISIS-1` bans clocks in the crisis for reasons that apply just as well to a study session), and
no plainchant, because sung Latin is intelligible voice.

### Era 6: Early Modern

**Source.** *"the same town re-drawn to a measured drawing, in stucco under lead domes"*
(`eras/era-06-early-modern/style-guide.md:78`). Signature move: the drawing made physical, where
*"symmetry here is a system rather than a preference: a face that matches itself across a centre line
is the visible proof that the building was resolved before it was begun"* (`:80-93`). Ornament is
*"high for the first time, but it is all one system"* (`:180-186`).

**The read.** *A piece whose second half answers its first half so exactly that a listener could
predict the answer, and is pleased rather than bored when it arrives.*

**Instrumentation.** A small consort: viols or a lute in parts, a chamber organ or a light
harpsichord, a recorder consort. Real voice-leading with independent lines, which is the first time
in the run the texture is genuinely polyphonic.

**The signature move in sound: symmetry as a system.** Antecedent and consequent phrases of equal
length. The piece is resolved before it begins, and that is audible: nothing in it is improvised and
nothing surprises.

**Tempo and energy.** 76 to 92. Moderate and calm. Era six is the run's most composed era and its
track should be its most **settled**, which is a different thing from its slowest.

**Length and loop.** 120 to 200 seconds. A symmetrical structure returns exactly to its opening,
which makes this the second easiest era to loop cleanly after era two.

**Must not.** No large organ, no cathedral reverb, no sacred choral idiom, no modern
neoclassical piano, no harpsichord flourish used as a joke, no Baroque virtuosity (this era is the
drawing, not the display), and no phrase that answers itself asymmetrically.

### Era 7: Industrial

**Source.** *"a working town assembled from machine-made parts and dark with its own smoke"*
(`eras/era-07-industrial/style-guide.md:72`). Signature move: the standard part repeated without
limit, giving a building **no natural end**: *"A Renaissance elevation is a composition and has a
middle; a mill elevation is a rhythm and simply stops where the site does"*, so the read is
*"Length, not composition"* (`:74-88`). Ornament is *"low, and it is all in the repetition"*, and the
technology is *"machinery for moving and measuring"* (`:174-192`).

**The read.** *A piece with no middle: it could have started thirty seconds earlier or later and
nothing about it would be different.*

**Instrumentation.** Struck metal and wood at machine regularity, a low steady bellows-like sustain,
a plucked ostinato with no expression in it, one long sustained note over the top. Do not reach for a
synthesiser: era seven is iron and steam, and it is the last era before electricity that should sound
mechanical rather than electronic.

**The signature move in sound: no natural end.** No introduction and no cadence. The piece begins
mid-pattern and stops mid-pattern, which also makes it the **easiest loop in the whole run**, because
a track with no arrival has no seam to hide.

**Tempo and energy.** 88 to 100, machine-exact. Moderate to high **density**, still moderate energy.
This is the run's densest track and it must not be its fastest.

**Length and loop.** 90 to 160 seconds. The seam is genuinely free here.

**Must not.** No steampunk whimsy, no factory-alarm or klaxon, no hissing or venting sound used as an
accent, no industrial-music distortion, no accelerating machine build, no train-whistle, no
mechanical rhythm that speeds up (which is both an accelerando and a machine failing), and nothing
that reads as a production line under strain, because that is a threat cue in a plain wrapper.

### Era 8: Atomic

**Source.** *"a confident, cleaned-up town of poured concrete and thin flat planes, built by people
who are certain the next fifty years will be better than the last fifty"*
(`eras/era-08-atomic/style-guide.md:68-69`). Signature move: the thin flat plane, and
*"For the first time in the run a building's most memorable element carries no load you can see"*
(`:71-79`). Ornament is *"near zero, and the near-zero is itself the statement"*, with lettering
doing the identification (`:163-171`).

**The read.** *A tune floating clear of the harmony that would explain it, played by people who are
completely relaxed about it.*

**Instrumentation.** Vibraphone, a light brushed kit, an upright bass walking gently, a clean
electric guitar or a Rhodes-like keyboard, one soft muted horn. This is the run's one genuinely
**recorded** aesthetic: close, warm, a little plate reverb.

**The signature move in sound: the melody carries no visible load.** A line hangs above a harmony
that never quite explains it. The instinct will be to resolve it. Do not.

**Tempo and energy.** 84 to 96, relaxed and swung only very slightly. Moderate. Era eight is the
most **optimistic** track in the run and optimism is a matter of harmony, not of speed.

**Length and loop.** 100 to 180 seconds. **This is the run's hardest loop**, because the idiom is
built out of phrases with endings, so a candidate must be checked for a turnaround at the wrap point
before anything else.

**Must not.** No big-band swing, no lounge-exotica kitsch, no space-age-bachelor-pad theremin, no
retro-futurist novelty, no ironic mid-century pastiche (era eight is sincere and the joke would be at
the era's expense), no jazz solo, no walking bass so busy it becomes the tune, and no atomic-age
menace, because the era's own guide describes people who are **certain things will be better**.

### Era 9: Information

**Source.** *"a sealed, quiet town of glass and panel, with all of its machinery buried and nothing on
any wall to say how it was made"* (`eras/era-09-information/style-guide.md:78-79`). Signature move:
the sealed reflective skin, and *"This is the first era whose buildings do not explain themselves"*
(`:81-88`). Ornament is *"zero, and unlike era eight the zero is not a statement, it is an
assumption"*, and the era's paradox is that it is *"the most technological era so far and the one that
shows the least of it"* (`:179-193`). Its real absence is *"visible hand-work of any kind"*
(`:116-121`).

**The read.** *A piece in which nothing sounds like a person playing an instrument, and which is still
warm rather than cold.*

**Instrumentation.** Processed and resynthesised sources with every performance gesture removed. Soft
pads, a bell-like tone with the attack shaved off, a bass with no finger noise, a pulse with no
velocity variation. **No audible hand anywhere**, because that is precisely the absence the era is
about.

**The signature move in sound: nothing explains itself.** A listener cannot say what any of it was
played on. The era hides its machinery and the track hides its instruments, and that is the same
statement.

**Tempo and energy.** 72 to 88, or a pulse so soft it is not countable at all. Low energy. Era nine
is the calmest track in the run.

**Length and loop.** 120 to 240 seconds. Long is easy here because the material is sustained, and
this era can afford the longest loop in the set. Take it: it is the cheapest place in the run to buy
the property section 2 wants most.

**Must not.** No new-age or meditation idiom, no rain, waves, wind chimes or birdsong, no
sleep-playlist piano, no evolving pad that swells (a swell is a riser), no ticking or data-chatter
texture, no glitch or stutter, no arpeggiated synth that reads as a countdown, and nothing so
characterless that it could be any era at all. **That last one is this era's real risk and it is not
a licensing risk**: see section 6.5.

### Era 10: Cyberpunk

**Source.** *"a lit deck built on top of everything that came before, with nothing removed"*
(`eras/era-10-cyberpunk/style-guide.md:95`). Signature move: the emissive edge as **trim**, plus
retrofit as a way of building (`:97-104`). Ornament is *"high, for the first time since the
Renaissance, but none of it is architecture"*, over a massing as plain as era eight's:
*"an ordinary dark box with an extraordinary amount attached to it"* (`:190-193`). And the closing
ledger: nothing was demolished, and *"Every material the island ever used is still somewhere on it,
and none of them is doing its old job"* (`:126-137`).

**The read.** *A plain dark bed with a great deal attached to the outside of it, and one thing in it
you have heard before.*

**Instrumentation.** A dark, near-static low bed, and above it a stack of small bright emissive
details: short lit blips, thin high edges, a single sustained neon-like tone. **Then the closing
move: one recognisable element from era one's track, retrofitted in.** A struck stone, the bone
flute's three notes, the frame drum. It is not doing its old job; it is a texture layered onto a
deck.

**The signature move in sound: the ornament is attached and the box is plain.** Strip the bright
details and what remains should be almost nothing. That is the exact inverse of generic synthwave,
which is bright all the way through, and it is what stops era ten from becoming the one thing the
task warned about.

**Tempo and energy.** 76 to 92, and **explicitly not the fastest track in the game**, per section 3.
Moderate energy carried by density and brightness rather than by speed. This is the entry where the
tempo ruling will feel most wrong and where it matters most.

**Length and loop.** 120 to 200 seconds. The near-static bed makes the seam easy; place the era one
quotation away from the wrap point so it does not become the learnable event.

**Must not.** No synthwave nostalgia (era ten is not retro; it is built on top of everything), no
gated reverb snare, no 1980s arpeggio, no dystopian menace, no distorted bass drop, no siren or
alarm, no cyber-action driving beat, no rain-and-neon film cliché, no vocal sample however processed,
and nothing that makes the last era of the run feel like the most stressful place a learner has been.

---

## 5. The crisis: one track or four

Four crises are in scope, at eras 1, 4, 6 and 9 (`2026-07-29-mid-era-crisis-design.md:3` and
`D-CRISIS-33` at `:3395`), and one of the four is built (`:20-25`). They are deliberately different
from each other, and the lead's sentence is ambiguous between one shared crisis track and one each.

### 5.1 The recommendation: acquire ONE, and here is the cost

**Recommend one shared crisis track.** Three grounds, and the first is a ruling rather than a
preference.

1. **The design already says what differentiates a crisis, and it is not the music.** `D-CRISIS-19`:
   *"What differentiates the ten crises is the player ritual, specifically WHEN THE QUESTION HAPPENS,
   WHAT FOLLOWS IT, and HOW CONSEQUENCES RESOLVE, and not different variables under the same loop"*
   (`2026-07-29-mid-era-crisis-design.md:2110-2114`). Music is not part of any player ritual. Four
   tracks would spend four acquisitions differentiating on an axis the governing principle says is
   not the differentiator.
2. **A shared track is the correct meaning.** A crisis should feel like *the same kind of event
   recurring*, and one recurring track says that in a way four unrelated set pieces cannot. The
   lead's own instinct in the requirement is right, and the design supports it.
3. **The visual layer already separates the four, hard.** Four lighting presets (section 1.3), four
   ground treatments, four propagation visuals and four building-state treatments, each argued
   against the other three. Adding a fifth axis of separation to a set already separated on four is
   redundant, and the tracks would be the least legible of the five.

**And the four crises are unusually far apart in play**, which is the practical half. They sit at
eras 1, 4, 6 and 9, so no learner meets two of them close together. **The distinctness a second
crisis track buys is a contrast nobody is in a position to hear.**

**The cost, stated because it is real and it is not the obvious one.** The cost is not that the
crises sound alike. It is that **one track has to sit under four different eras' music**: era one's
prehistoric percussion, era four's plucked strings, era six's viol consort, era nine's processed
pads. **A crisis track with any strong period identity will clash three times out of four.** So the
shared track must be **period-neutral**, which is a genuine constraint and it narrows the search
considerably: no instrument that marks an era, no idiom anyone can date. That is one track's worth
of difficulty rather than four tracks' worth of procurement, and it is the better trade.

**The second cost, smaller.** The crisis gives up one channel of identity. It is affordable because
the four already separate on light, ground, propagation, player verb and conclusion.

**In bytes and in work**, against the shipped pair as the unit (1,316,581 B and 766,291 B measured on
disk, `CREDITS.md:27-28`): one track is roughly 1 MB against roughly 4 MB, one licence verification
against four, and one loop-seam check against four.

**The condition under which it becomes two, named now so it is not re-litigated.** If the shared
track cannot be made period-neutral without becoming characterless, split on **the one seam worth
paying for, which is era one against the rest**. Era one is the only crisis whose world contains no
stone, no metal and no glass, and it is the only crisis that is built. **Do not split four ways under
any circumstances**, because three of the four would be acquired for eras that have no land, no
buildings and no player.

### 5.2 The crisis entry

**Source.** Section 1 in full, plus the four art briefs' lighting decisions (section 1.3),
`INV-CRISIS-1`'s clockless rule (`2026-07-29-mid-era-crisis-design.md:613`), and the copy rules at
`crises/README.md:288-315`.

**The read, in one sentence a listener can check against.** *The same world with most of the parts
taken out of it: slower, lower, fewer, and still completely at rest harmonically.*

**Instrumentation.** Period-neutral by requirement. A low sustained bed with no identifiable
instrument in it, a slow struck tone with a long decay, one held mid-register note. **No percussion
with a pulse.** The whole track should be assemblable from sounds that cannot be dated, which is what
lets it sit under all four eras.

**Tempo and energy.** **Slower than every era track.** Ideally no countable pulse at all, and if
there is one, under 60. Low energy, and lower than the era track it replaces in every dimension at
once.

**Length and loop.** 120 to 240 seconds. Long, because a crisis is where a learner is most likely to
be concentrating hard, and a short loop is at its most intrusive exactly then. A bed with no events
loops trivially.

**The relationship to the era track under it, which is the design's whole idea.** The crisis track
should share **one element** with the era track it is replacing: a pitch centre, an interval, a
recognisable timbre. It is the same place under a different condition, and the art briefs are
unanimous on that point. Under a shared crisis track this is achievable cheaply: pick one pitch
centre for the crisis track and have each era track share it, which costs nothing at acquisition
time and is worth specifying **before** any era track is bought.

**Must not.** No accelerando or accelerating subdivision, no riser, no held dissonance, no stinger or
sudden hit, no low drum in the heartbeat band, no siren, alarm, klaxon or warning tone, no ticking,
no heartbeat, no breathing, no choir, no horror idiom, no orchestral action scoring, no crescendo
across the loop, no key change, and nothing louder or shorter than the era track it replaces.

**And the entry rule for the track itself, which is where a good crisis track can still go wrong.**
It must **cross-fade in** rather than cut. The art brief's own recommendation for the visual
transition is *"a short timed cross-fade on the lighting and the fog... about a third of a second"*
(`2026-07-30-hard-winter-crisis-art-brief.md:405-409`). A hard music cut is a startle event
(section 1.1 item 4) delivered at the exact moment the crisis announces itself, and it would undo the
whole of this section in a third of a second. Cross-fade in over one to two seconds, and out.

---

## 6. Where it comes from

### 6.1 Licence discipline, which is the part that matters

`CREDITS.md:5-6` sets the standing rule: *"Nothing goes in `public/audio/` without a row in this
file. If the provenance of a file cannot be established, the file does not ship."* And `:13-17`
records the verification method: read the structured licence field **per asset**, never inferred from
a search filter.

**CC0 and CC-BY are not interchangeable and the difference bites in a specific place here.**

| Licence | Obligation | Verdict for this product |
| --- | --- | --- |
| **CC0 1.0** | None at all. Irrevocable | **Preferred.** No obligation, no dependency, cannot be withdrawn |
| **CC-BY 4.0** | Creator name, link to the material, link to the licence, **and an indication that changes were made** | **Usable, with a real cost.** See below |
| **CC-BY-SA** | The above plus share-alike on adaptations | **Avoid.** A share-alike obligation on an adaptation is a licence-compatibility question this repository should not take on for background music |
| **OGA-BY 3.0** | Attribution under OpenGameArt's own terms | **Usable.** Where CC0 is offered alongside it, take CC0 |
| **Anything -NC** | Non-commercial only | **Unusable.** See below |
| **Pixabay Content License** | None, but platform-set and revocable | **Usable with a caveat.** See section 6.2 |

**The CC-BY clause that will be missed.** CC-BY 4.0 requires that you *"indicate if changes were
made"*. Section 2 recommends **loop-trimming and re-encoding** every acquired track, and both are
changes. So a CC-BY track that is loop-trimmed must say so in `CREDITS.md`, in the attribution
itself. That is a non-obvious obligation and it is one this project would otherwise breach while
believing it had complied.

**Why -NC is unusable even though this product sells nothing.** `docs/Game_Visual_Design_Brief.md:72`
says there are no real-money purchases *"of any kind, ever"*, which makes the -NC question look
arguable. It should not be argued. Creative Commons defines a commercial use as one *"primarily
intended for commercial advantage or monetary compensation"*, a shipped product's status can change
without the music being revisited, and this repository's own standard is already stricter than the
law: *"we would rather lose an effect than ship one we cannot prove we are allowed to use"*
(`CREDITS.md:5-6`). **Treat -NC as disqualifying and do not open the question.**

### 6.2 The named sources, with their licences

| Source | Licence | Assessment |
| --- | --- | --- |
| **[OpenGameArt.org](https://opengameart.org)** | Per asset: CC0, CC-BY 3.0, CC-BY 4.0, CC-BY-SA 3.0/4.0, OGA-BY 3.0, GPL | **The primary source, and the one already in use.** Every shipped music track came from here. Large CC0 music catalogue, searchable with a licence facet, and the licence is a structured per-asset field. Method in section 6.3 |
| **[Kenney](https://kenney.nl)** | CC0 1.0 | **Already in use for all six effects** (`CREDITS.md:39-53`). Effects and jingles only; **no long-form music**, so it does not help here |
| **[Incompetech](https://incompetech.com/music/royalty-free/)** (Kevin MacLeod) | **CC-BY 4.0**, with a paid Standard License to remove attribution | Very large, well-organised, genre-tagged catalogue and the single best-covered source for the middle eras. **Explicitly not public domain**: the site's own FAQ answers *"Is this music Copyright Free? No. All of this music is copyrighted"*, and even the baroque and classical **recordings** are not PD. Attribution format is specified by the author (title, "Kevin MacLeod", an incompetech.com link, and the CC BY 4.0 link) and must appear where a person can reasonably find it |
| **[Pixabay](https://pixabay.com/music/)** | **Pixabay Content License**, not CC0 | Commercial use permitted, no attribution required, but it is a **platform licence rather than a Creative Commons one**. Pixabay used CC0 until 9 January 2019 and then moved to its own terms, revised again in April 2023. Three consequences: it can change again, there is no indemnification, and contributors may register tracks with Content ID systems. **Usable, and a worse guarantee than CC0** for a repository whose rule is provenance-first |
| **[Musopen](https://musopen.org)** | Mixed: public domain, CC-BY, CC-BY-SA, and **CC-BY-NC and -ND, which are unusable** | The obvious answer for eras 4 to 6 and it is **more dangerous than it looks**. The compositions are public domain; **the recordings are separate copyrights** and carry their own licences. Musopen is user-uploaded and states it does not verify uploads. Wikimedia Commons' own guidance on Musopen files is that *"any files which do not list a specific performer should be treated with suspicion, as they may be copyright violations"*. **Viable only where a specific recording names its performer and states a usable licence**, which is a high provenance burden per track |
| **[Free Music Archive](https://freemusicarchive.org)** | Mixed, and **a large fraction is CC-BY-NC** | Named here because it will be suggested and because the NC share is high enough that a filter is mandatory rather than advisable |
| **itch.io music packs** | Per pack, commonly CC-BY 4.0 | A real source, and it carries a lesson worth more than the source. **Of Far Different Nature releases some tracks on OpenGameArt as CC0 while their entire itch.io catalogue is CC-BY 4.0** (their itch profile: *"All free assets I offer here on itch.io are licensed under CC BY 4.0"*). **The same artist, two licences, depending on where you got the file.** That is exactly why the per-asset rule at `CREDITS.md:13-17` exists |

### 6.3 Verified CC0 candidates, per era

> **Read this paragraph before the table.** Every licence below was verified by reading
> OpenGameArt's structured `field-name-field-art-licenses` field on that asset's own page on
> 2026-08-01, which is the method `CREDITS.md:13-17` requires. **The method was self-checked** by
> running it over the two shipped tracks and the one further candidate `CREDITS.md:30-35` already
> logs: `town-theme-rpg`, `a-new-town-rpg-theme` and `magic-town` all return `CC0`, which matches the
> committed record.
>
> **Nothing in this table was listened to.** The fit column is inferred from title, tags and the
> author's own description, and nothing else. **These are search results with verified licences, not
> recommendations**, and every one of them still owes the section 2 test before it can be proposed.

| Era | Candidate | URL | Licence field, verified | Note |
| --- | --- | --- | --- | --- |
| 1 Prehistoric | Tribal (Of Far Different Nature) | <https://opengameart.org/content/tribal> | **CC0** | Author's own description is *"chilled tribal track"*. mp3 7.7 MB, so it needs re-encoding |
| 1 Prehistoric | Prehistoric Drum Loop | <https://opengameart.org/content/prehistoric-drum-loop> | **CC0** | 6 seconds. **Far too short to be a track**, listed because it is the only asset in the library with era one's exact name on it and somebody will find it |
| 2 Neolithic | GrassLands Theme | <https://opengameart.org/content/grasslands-theme> | **CC0** | mp3 6.6 MB. **Came out of the landscape pool rather than the agriculture pool**, so check it against section 6.5's finding before shortlisting |
| 2 Neolithic | Lost in the meadows | <https://opengameart.org/content/lost-in-the-meadows> | **OGA-BY 3.0 + CC0** | Multi-licensed; usable as CC0, see section 6.4. Same caveat as the row above |
| 3 Bronze Age | Desert Settlement | <https://opengameart.org/content/desert-settlement> | **CC0** | mp3 12.2 MB. Carries the geography problem named in section 6.5 |
| 3 Bronze Age | Ali Khan's Palace | <https://opengameart.org/content/ali-khans-palace> | **CC0** | Same caveat |
| 4 Classical | Experimenting with Greek instrument samples | <https://opengameart.org/content/experimenting-with-greek-instrument-samples> | **CC0** | Two ogg files, 2.2 and 2.3 MB. The nearest thing in the library to era four's instrument list |
| 4 Classical | White Limestone | <https://opengameart.org/content/white-limestone> | **CC0** | Offered in six renderings including an extended mp3 at 3.7 MB and a short original. **A track offered in an extended cut is unusually well suited to a long loop** |
| 5 Medieval | Medieval: Exploration | <https://opengameart.org/content/medieval-exploration> | **CC0** | mp3 9.4 MB |
| 5 Medieval | Hush Hamlet | <https://opengameart.org/content/hush-hamlet> | **CC0** | Ships a dedicated `_loop` variant, which is the property section 2 asks for. WAV only, 36.9 MB, so it must be encoded |
| 6 Early Modern | If my complaints could passions move (Dowland, 1597) | <https://opengameart.org/content/historic-renaissance-music-from-1597-if-my-complaints-could-passions-move-by-john-dowland> | **CC0** | **The single best find in this search.** A period composition in a CC0 recording, which is the combination Musopen promises and rarely delivers cleanly. mp3 6.5 MB |
| 6 Early Modern | Arbeau, Belle qui tiens ma vie (C64 rendering) | <https://opengameart.org/content/c64-arbeau-belle-qui-tiens-ma-vie> | **CC0** | Correct repertoire, chiptune rendering. Listed as evidence that the repertoire is available rather than as a candidate |
| 6 Early Modern | Harpsichord Flurry | <https://opengameart.org/content/harpsichord-flurry> | **CC0** | The name suggests exactly the flourish era six's entry bans |
| 7 Industrial | Steampunk music | <https://opengameart.org/content/steampunk-music> | **CC0** | Named "steampunk", which era seven's entry bans as whimsy. Verify against that ban first |
| 7 Industrial | Factory ambiance | <https://opengameart.org/content/factory-ambiance> | **CC0** | May be ambience rather than music, which for this era could be a feature |
| 8 Atomic | Bossa Nova | <https://opengameart.org/content/bossa-nova> | **CC0** | The closest thing found to era eight's idiom, and see section 6.5 |
| 8 Atomic | Catchy Swing | <https://opengameart.org/content/catchy-swing> | **CC0** | "Catchy" is the property section 2 item 1 rules out |
| 9 Information | Calm Ambient 1 (Synthwave 4k) | <https://opengameart.org/content/calm-ambient-1-synthwave-4k> | **CC0** | |
| 9 Information | Ambient Relaxing Loop | <https://opengameart.org/content/ambient-relaxing-loop> | **CC0** | Offered as a loop |
| 9 Information | Global Resonance | <https://opengameart.org/content/global-resonance> | **CC0** | |
| 10 Cyberpunk | Cyberpunk Beauty | <https://opengameart.org/content/cyberpunk-beauty> | **CC0** | |
| 10 Cyberpunk | Dark City | <https://opengameart.org/content/dark-city-0> | **CC0** | The title matches era ten's *"ordinary dark box"* better than the synthwave results do |
| 10 Cyberpunk | T & T Free Cyberpunk Pack | <https://opengameart.org/content/t-t-free-cyberpunk-pack> | **CC0** | A pack, so several tracks under one verification |
| Crisis | Contemplation | <https://opengameart.org/content/contemplation-0> | **CC0** | The most promising crisis candidate found: the title names the affect section 5.2 wants and not the one it bans |
| Crisis | Frost in the Northern Winter | <https://opengameart.org/content/frost-in-the-northern-winter> | **CC0** | Era one specific, so it is a candidate only under the two-track split at section 5.1 |
| Crisis | EmptyCity: Background Music | <https://opengameart.org/content/emptycity-background-music> | **CC0** | *"Empty"* is era six's own word for its crisis (`2026-08-01-plague-crisis-art-brief.md:123`) |

**A size finding that applies to nearly every row.** The shipped default is 1,316,581 B
(`CREDITS.md:27-28`). Most candidates above are **three to ten times that**, and two earlier
candidates were rejected on exactly this ground rather than on licence (`CREDITS.md:30-35`: a 12 MB
FLAC and a 3.5 MB 160 kbps mp3). **So re-encoding is not optional, it is part of acquisition**, and
CC0 permits it without qualification. For a CC-BY track the same re-encode triggers the
indicate-changes obligation in section 6.1.

### 6.4 A finding about OpenGameArt multi-licensing, reported rather than acted on

`CREDITS.md:13-17` records that a promising candidate, "Feel good island", was **rejected** because
its licence field *"turned out to carry OGA-BY 3.0 alongside CC0"*.

**Verified at this tip: the field does read `OGA-BY 3.0 + CC0`, exactly as recorded.** But
OpenGameArt's own FAQ answers the question directly:

> Some artists have multiple licenses listed. Does that mean you need apply the rules of all licenses
> or can we pick the one license we prefer?
>
> **You must follow only one of the licenses.**

**So a multi-licensed asset offering CC0 is usable as CC0, and the earlier rejection was stricter
than OpenGameArt's own rule.** That widens the pool by a real amount: `lost-in-the-meadows` carries
the identical `OGA-BY 3.0 + CC0` pair, and `springs-pastorales` carries `CC-BY-SA 4.0 + CC-BY-SA 3.0
+ CC0`.

**Not acted on, and here is the honest reason.** There is a residual risk the FAQ does not address:
where a submission bundles **several files**, the field can be the union across files rather than a
choice offered on each. That is indistinguishable from outside without checking each file. **So the
recommendation stands as it is**: prefer single-CC0 assets, and where a multi-licensed asset is the
best fit, take it under CC0 and record in `CREDITS.md` both the full field and the FAQ's disjunctive
reading, so a later reader can see which rule was applied. **Whether to relax the standing rule is
the audio owner's call and not a passing brief's.**

### 6.5 Which eras are genuinely hard, and why

An even spread of optimism would be useless, so this section is deliberately uneven.

**How the counts below were taken.** OpenGameArt's advanced search, filtered to art type Music and
licence CC0, distinct `/content/` results on the first page of each query, run on 2026-08-01.
**The first page caps at 24**, so any figure reading 24 means "at least 24" and the comparison worth
making is against the zeroes and the single digits rather than between two 24s.

| Query | Distinct CC0 music results, first page |
| --- | --- |
| `mid century` | **0** |
| `big band` | **0** |
| `pastoral` | **1** |
| `lounge`, `harvest` | **2** |
| `renaissance`, `prehistoric` | 3 |
| `farm`, `primitive` | 4 |
| `baroque` | 12 |
| `tribal` | 13 |
| `desert`, `village` | 23 |
| `swing`, `ambient`, `calm`, `cyberpunk`, `synthwave`, `ancient`, `medieval`, `classical` | 24 each, which is the page cap |

**Hardest: era 8, Atomic.** `mid century` returns **zero** results. `big band` returns **zero**.
`lounge` returns two, one of which is `bossa-nova`. `swing` returns 24, and they are mostly modern
**electro-swing**,
which is a 2010s dance genre wearing a 1930s hat and is wrong for era eight in the specific way its
own guide warns about: era eight is **sincere**. And there is a second problem no search fixes.
Era eight's sound is a **recording** aesthetic (close-mic'd brass, brushed kit, plate reverb) and
free game-music libraries are overwhelmingly synthesised or sample-library based. **This is the era
most likely to need generation.**

**Hard for the opposite reason: era 9, Information.** The CC0 ambient pool is **large**. `ambient` and
`calm` each fill the first page. **So the problem is not scarcity, it is that everything found is
generic**, and era nine's own guide describes an era whose ornament level is
*"zero, and unlike era eight the zero is not a statement, it is an assumption"*
(`eras/era-09-information/style-guide.md:179-181`). A merely calm ambient track does not express
that; it just sounds like every other calm ambient track. **The risk here is a track that is correct
and characterless**, which is harder to reject in review than a track that is wrong, because there is
nothing to point at.

**Hard, and hard exactly as predicted: era 10, Cyberpunk.** `cyberpunk` and `synthwave` each fill the
first page, and the overlap between the two result sets is heavy: the pool is almost entirely
**synthwave**, a 1980s-retro genre. Era ten is not retro: it is *"a lit deck built on top of
everything that came before, with nothing removed"* (`eras/era-10-cyberpunk/style-guide.md:95`), and
its massing is *"an ordinary dark box with an extraordinary amount attached to it"* (`:190-193`).
Generic synthwave is ornament all the way through, which is the inverse of that. **Finding a
cyberpunk track is trivial. Finding one that is not synthwave is the hard part**, and the search
facet cannot help.

**Harder than the briefing assumed, and this is the finding that changes the plan: era 2,
Neolithic.** The task that produced this document said *"Prehistoric and Neolithic ambient music is
well covered by CC0 libraries"*. **Measured, that is half right.** Era two's own vocabulary is
close to empty: `pastoral` returns **1**, `harvest` returns **2**, `farm` returns **4**. What is
abundant is `village` at **23**, and the village pool is fantasy-RPG town music, which is roughly
**era five** in sound and is what the game already ships two of. **So the abundance is real and it is
in the wrong era.** Era two is the second track stage one wants (section 7.2) and it is the one most
likely to send that stage to generation.

**Moderately hard, for a reason worth naming: era 3, Bronze Age.** `ancient` fills the page and the
results are overwhelmingly medieval-fantasy rather than Bronze Age; what does return period-plausible
material is `desert` at **23**, and those results are tagged for a specific geography. Era three's
guide names a **trading town with a harbour** and never names a place
(`eras/era-03-bronze-age/style-guide.md:63-64`, `:77-82`). **The free-library pool will import a
geography the guide does not claim**, and a Middle-Eastern idiom on era three is the same class of
error as a didgeridoo on era one.

**Genuinely covered, and covered for the wrong reason: era 1.** `tribal` returns **13**, which is a
real pool and the largest for any early era. **But "tribal drums" is a stock library category**, and
stock tribal drums is a looped identical pattern, which is era two's signature arriving four thousand
years early and is precisely the pastiche section 3 rules out. **So era one's difficulty is not
finding a track, it is finding one that is not a cliché**, and it will be tempting to accept the
first plausible result because 13 looks healthy.

**Unexpectedly good news, and it is not about volume: era 6, Early Modern.** `renaissance` returns only
**3**. But one of the three is a **CC0 recording of a 1597 Dowland setting** (section 6.3), which is
an exact hit rather than an approximation, and `baroque` returns **12** more of the same kind of
thing. **The lesson is that for eras 4, 5 and 6 the search should be by repertoire and not by mood**:
the compositions are public domain, CC0 recordings of them exist, and a pool three deep containing
the right answer beats a pool of 24 containing none. Try that before generating anything for the
middle of the run.

### 6.6 The generation route, and whether generated music can legally ship

The lead named this route, so it is answered rather than hedged. **Two questions get conflated and
they have different answers.**

> **How the terms below were established, and the one place this section is weaker than section
> 6.3.** The licence field on an OpenGameArt asset was read on that asset's own page, per asset. The
> generator terms below were established from **secondary reporting of each vendor's terms of service
> and pricing as of 2026-08-01**, together with the primary licence text where it is published as a
> file (Meta's `LICENSE_weights` and Stability's Community License both are). **Vendor terms and
> prices change more often than a Creative Commons licence does, and Suno's changed materially after
> its 2025 Warner settlement**, so **read the vendor's own terms page on the day of purchase and
> before any money moves.** The structural findings below (free tiers are non-commercial, rights are
> conditioned on the plan at generation time, MusicGen's weights are non-commercial) are stable
> enough to plan around; the dollar figures are not.

#### Question one: may we ship it? **Yes, conditionally, and the condition is the paid tier.**

| Tool | Cost | What the terms grant | Verdict |
| --- | --- | --- | --- |
| **Suno**, free tier | $0 | *"lawful, internal, personal and non-commercial"* use only, with attribution to Suno. **Suno retains ownership**, and **upgrading later does not retroactively license a free-tier track** | **Cannot ship** |
| **Suno**, Pro / Premier | $10 / $30 per month | Suno *"assigns to you all of its right, title and interest in and to any Output owned by Suno and generated from Submissions made by you... during the term of your paid-tier subscription"*. Rights persist for tracks made while subscribed, even after cancelling. Following the 2025 Warner settlement the framing moved from ownership to a perpetual commercial licence | **Can ship** |
| **Udio**, paid | Subscription | Commercial rights, no attribution required. Free-tier commercial use is permitted in many cases **with a credit to Udio** | **Can ship** |
| **Stable Audio**, free | $0 | Personal, non-commercial only | **Cannot ship** |
| **Stable Audio**, Pro | ~$11.99 per month | Commercial rights under the Creator licence, **retained after cancellation** for tracks generated while subscribed. A separate Enterprise licence is required above **USD $1M annual revenue** | **Can ship** |
| **ElevenLabs Music**, paid | Subscription | Broad commercial use on paid tiers, **with tier-dependent exclusions**: self-serve plans reportedly exclude film, television, radio and large studio games without Enterprise, and self-serve plans require attribution | **Can ship, read the tier carefully** |
| **Meta MusicGen / AudioCraft**, self-hosted | $0 | **Code is MIT. The model weights are CC-BY-NC 4.0.** | **CANNOT SHIP.** See below |
| **Stable Audio Open**, self-hosted | $0 | Stability AI Community License permits commercial use, **requires registration** at stability.ai/community-license, and terminates above **USD $1M annual revenue** | **Can ship, with a registration step** |

**The MusicGen row is the one that will be got wrong**, and it is worth its own paragraph. It is
free, it is self-hostable, it needs no subscription, and it is the first thing an engineer reaches
for. **Its weights are CC-BY-NC 4.0**, which is the same non-commercial licence section 6.1 rules
disqualifying for audio assets, and the same reasoning applies with more force: a model licence is a
licence on everything the model produces in your hands. **The free self-hosted route that looks
cleanest is the one that is flatly barred.** `Stable Audio Open` is the self-hosted route that is
not.

#### Question two: would we own it? **Almost certainly not, and it matters less than it sounds.**

The US Copyright Office's position, unchanged and now settled at the appellate level: **human
authorship is required**, works generated entirely by AI are not copyrightable, and **prompts alone
do not constitute authorship**. That is the March 2023 registration guidance, restated in the Part 2
Copyrightability Report of 29 January 2025, and reinforced by *Thaler v. Perlmutter* (D.D.C. 2023,
affirmed D.C. Cir. 18 March 2025, certiorari declined 2 March 2026). More than de minimis
AI-generated material must be **disclosed and disclaimed** on registration, and failing to disclose
can void a registration after grant. Suno's own terms carry the warning that ownership does not
guarantee copyrightability.

**So the two answers are: you may ship it, and you probably cannot own it.**

**Why that is acceptable here, stated rather than assumed.** This product does not need to enforce a
copyright in its background music. It needs the **right to ship**, and a paid tier grants that. The
place non-ownership actually costs something is **exclusivity**: a generated era theme is not
exclusive, and another product may ship something very close to it. For a background loop in a study
tool that is an acceptable cost, and it should be recorded as a decision rather than discovered as a
surprise.

**Where it costs something real, and this one is a genuine operational burden.** The right is
**conditioned on the plan at the moment of generation**. Suno's assignment is scoped to output
generated *"during the term of your paid-tier subscription"*, and rights do not travel backwards from
an upgrade. **So provenance for a generated track is not a URL, it is a set of facts that exist only
at generation time and cannot be reconstructed afterwards.** `CREDITS.md`'s row format has no place
to put them, so it needs extending. Proposed, in that file's own table idiom:

```markdown
| File | Track | Author | License | Source | Length | Size |
| --- | --- | --- | --- | --- | --- | --- |
| `era-08.mp3` | Atomic Era | Generated (Suno v5, Pro plan) | Commercial licence per Suno ToS, assigned to us as generated 2026-08-14 under an active Pro subscription. Not copyrightable in the US: no exclusivity is claimed | Prompt archived at `docs/.../music-prompts.md#era-08` | 2:14 | 1,180,412 B |
```

Four facts must be captured **at generation time or they are lost**: the tool and model version, the
**plan tier active at that moment**, the generation date, and the prompt.

#### The recommendation on route

**Open source first, as the lead said, and the evidence supports him rather than merely permitting
him.** CC0 gives an irrevocable, obligation-free, subscription-free right, which is strictly better
than the best terms any generator offers. Generation is the fallback for the eras where CC0 measurably
fails, which section 6.5 puts at **eras 8, 9 and 10, plus era 2**.

**Era two is the awkward one and it should be flagged rather than folded in**, because it is the only
one of the four that stage one wants immediately (section 7.2). The other three sit at the far end of
the run behind eras nobody has authored. **So the practical shape is: try repertoire and adjacent
vocabulary for era two first, and if that fails, era two alone justifies the paid month early rather
than late.**

**For a batch, the cheapest legal route is one month of one paid subscription.** Roughly $10 to $30
buys every generated track with commercial rights that survive cancellation, at a fraction of the
cost of commissioning. **Do the generation in one sitting, on a paid plan, and write the four
provenance facts down before closing the tab.**

---

## 7. The acquisition order

Ten tracks is a lot of procurement and the product needs none of them all at once. Every era past
era two has no authored ground in code (`islandGround.ts:372-374`), and eight of the ten have no
dressing row (`eraDressing.ts:140`, `:171`). **Acquiring a track for an era whose land does not exist
freezes a decision before the era that would inform it has been authored.**

### 7.1 First, and before anything: settle what the two shipped tracks are

**This is free and it may remove an acquisition.** The two tracks that ship are RPG town themes
chosen for *"a frontier-boomtown island"* (`music.ts:4-5`). Neither was chosen for an era, and
neither is prehistoric. **A bright melodic town theme with metal in it is roughly era five or six in
sound**, and era one's guide bans metal outright (`eras/era-01-prehistoric/style-guide.md:134-136`).

**So the question to settle by listening, not by reading: are `town-theme.mp3` and `a-new-town.mp3`
era five's and era six's rather than era one's?** If they are, the shortfall drops from nine tracks
to seven and two of the middle eras are already done. **This is stated as a question because I did
not listen to either file**, and it is worth an hour before any procurement starts.

### 7.2 Stage one: three tracks

1. **The crisis track.** First, and the reason is that it is the only track whose absence is
   currently an active error rather than a gap. Section 0a: the Hard Winter plays with a cheerful
   town theme underneath it, because nothing switches. It is also **one track rather than four**
   (section 5.1), it is the **hardest track in the brief to get right** so it wants the most time,
   and the Hard Winter is the crisis that is built and demoed.
2. **Era one.** Every learner starts here, it is the only era with an authored island ground in code,
   and it is the **anchor of the whole ladder**: era one's island is described in its own guide as
   *"the ladder's floor"* that nine other sections are written against
   (`eras/era-01-prehistoric/style-guide.md:610-620`). Buy the anchor before anything measures itself
   against it.
3. **Era two.** The era one to era two seam is the transition **every player is guaranteed to meet**,
   and it is the seam that failed in the palette ladder (`2026-07-30-era-palette-ladder.md:45-48`,
   `:157`). It is also the run's largest free audible step, because it is where the loop is invented
   (section 4, era two). Acquire it **against** era one's track and reject anything that does not
   separate audibly from it.

   **Budget for this one going to generation.** Section 6.5 measures era two's own vocabulary at
   1, 2 and 4 results while the neighbouring `village` pool sits at 23 and is the wrong era. **This
   is the track in stage one most likely to fail the open-source route**, and it is worth knowing
   that before the search starts rather than after two days of it.

**Then stop.** Three tracks is a complete, shippable, coherent audio state: the two eras that exist,
plus the crisis that exists.

### 7.3 Stage two: one track per era, paired with that era's land

**Acquire an era's track when its land is authored, and not before.** The track is then chosen
against a real ground palette and real buildings rather than against a style guide alone, which is
the same discipline `2026-07-30-era-palette-ladder.md:622-627` applies to the art: eras three to six
*"cost nothing"* to change precisely because nothing has been generated for them yet. The music has
the same free option and should not spend it early.

**One thing to carry forward at each acquisition**: the new track must be tellable apart from the era
before it on a channel other than tempo (section 3), which is a two-track comparison and not a
whole-set audition.

### 7.4 Stage three: the three hard eras, together

**Eras 8, 9 and 10 should be acquired as one job**, whichever order their land lands in. They are the
three that section 6.5 finds genuinely hard, they are the three most likely to need generation, and
generation is cheapest as a single sitting on a single paid month (section 6.6). Acquiring them one
at a time would mean three subscriptions or three lapses.

### 7.5 The one thing to decide before any track is bought

Section 5.2 asks that the crisis track share **one element** with each era track it plays under. That
is nearly free if it is specified first and nearly impossible to retrofit. **Pick the crisis track's
pitch centre when the crisis track is acquired, in stage one, and make it a search criterion for
every era track thereafter.**

---

## 8. What this brief does not decide

1. **Which candidate ships, for any era.** Nothing was listened to. Section 6.3's table is search
   results with verified licences and it is explicitly not a recommendation.
2. **Whether the two shipped tracks are re-homed to eras five and six.** Section 7.1 poses it; it
   needs one listening session.
3. **Whether the standing rejection of OpenGameArt multi-licensed assets is relaxed.** Section 6.4
   reports that OpenGameArt's FAQ is more permissive than the repository's current practice, and
   leaves the call to the audio owner.
4. **Whether the crisis track ever becomes two.** Section 5.1 recommends one and names the single
   condition and the single seam under which it becomes two. **Four is ruled out with reasons rather
   than left open.**
5. **The generation prompts.** If generation is used, the prompts are assets and need a home, because
   the provenance record in section 6.6 references them.
6. **Per-track volume.** Music currently plays at *"a third of the effect volume"* (`music.ts:24-28`).
   Whether a crisis track needs its own gain, given that section 5.2 requires it be quieter than the
   era track, is a player question and belongs to whoever is building the switch.

---

## 9. References

- `docs/Game_Visual_Design_Brief.md` §2, at `:50-73`: Maya, the tone requirements and the banned
  mechanics. **The ruling section 1 is written under, read as binding and not amended here**
- `apps/web/public/audio/CREDITS.md`: the provenance rule (`:5-6`), the per-asset verification method
  (`:13-17`), the two shipped tracks (`:27-28`) and the further verified candidate plus two
  size-based rejections (`:30-35`). **The format section 6.6 extends**
- `apps/web/src/audio/music.ts`: the track list (`:59-82`), the length note (`:69`), the single
  selector (`:88`), the native loop (`:189`) and the gain rationale (`:24-28`)
- `docs/superpowers/specs/eras/era-0*/style-guide.md`: the ten eras' one-line reads, signature moves,
  materials and ornament sections, cited per entry in section 4
- `docs/superpowers/specs/2026-07-30-era-palette-ladder.md`: the ladder discipline section 3 borrows,
  the early-seam weighting (`:45-48`), the era one to era two collision (`:406-411`) and what is
  generated (`:83-86`, `:598-603`, `:622-627`)
- `docs/superpowers/specs/2026-07-29-mid-era-crisis-design.md`: the four in scope (`:3`, D-CRISIS-33
  at `:3395`), one built (`:20-25`), `INV-CRISIS-1` clockless (`:613`) and **D-CRISIS-19, the player
  ritual** (`:2110-2114`), which is section 5.1's first ground
- `docs/superpowers/specs/2026-07-30-hard-winter-crisis-art-brief.md`,
  `2026-08-01-succession-crisis-art-brief.md`, `2026-08-01-plague-crisis-art-brief.md`,
  `2026-08-01-intrusion-crisis-art-brief.md`: the four lighting decisions section 1.3 rests on, and
  the transition shape section 5.2 borrows
- `docs/superpowers/specs/crises/README.md` `:288-315`: the copy rules, which reject in prose the
  register section 1 warns about in sound
- `apps/web/src/city/islandGround.ts:372-374` and `apps/web/src/city/eraDressing.ts:140`, `:171`: what
  is actually authored, and therefore section 7's staging
- `output/imagegen/era-01-prehistoric-civic-buildings/README.md`: the house negative-list convention
  each entry's **Must not** line follows
