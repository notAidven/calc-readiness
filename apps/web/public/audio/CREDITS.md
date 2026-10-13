# Audio credits and licensing

Every audio file shipped with this app is listed here with its source, author, and
license. **Nothing goes in `public/audio/` without a row in this file.** If the
provenance of a file cannot be established, the file does not ship — we would rather
lose an effect than ship one we cannot prove we are allowed to use.

**Thirty-five files, and they no longer all have the same answer.** Twenty-one are **CC0 1.0
(public domain dedication)**, which imposes no attribution obligation at all; they are
credited anyway, for two reasons: a project that cannot say where an asset came from cannot
demonstrate that it is allowed to use it, and CC0 authors deserve the credit even where they
have waived the right to demand it.

**The other fourteen are Suno generations**, and they are the era and crisis soundtrack.
**They carry a commercial licence, not a public-domain dedication**, established by the two
facts recorded in
[Generated music: Suno Pro, generated 2026-08-04](#generated-music-suno-pro-generated-2026-08-04):
the plan that was active when they were generated, and the date. **Attribution is not
required** for any of the thirty-five files, then, on either route. Every one is credited
regardless, because the reason this file exists is the sentence above it and not an
obligation.

Verification method, which differs by source and now differs by *kind* of source:

- **The Kenney packs**: the license is the `License.txt` distributed inside each pack
  (quoted below).
- **The OpenGameArt tracks and the Freesound samples**: the structured `License(s)` field on
  each asset page, read per asset rather than inferred from a search filter — one
  otherwise-promising candidate ("Feel good island") was rejected precisely because that
  field turned out to carry OGA-BY 3.0 alongside CC0. All ten Freesound pages report
  `creativecommons.org/publicdomain/zero/1.0/` and nothing else: no CC-BY, no NonCommercial,
  none multi-licensed.
- **The generated tracks**: there is no page to read and no licence field to quote, because a
  generation's provenance is not a document about the file. It is a pair of facts about the
  moment it was made, and **the account holder is the only source for either.** Both are
  recorded from his confirmation; the section named above says what they establish and what
  they do not. What is verified *here*, mechanically, is the file rather than the right: every
  one of the fourteen was decoded and measured, and the *Length*, *Size* and *Measured
  loudness* columns below are those measurements.

## Music — `public/audio/music/`

### The two house tracks — CC0, and no scene resolves to either any more

Both are by the same author and both are CC0.

| File | Track | Author | License | Source | Length | Size |
| --- | --- | --- | --- | --- | --- | --- |
| `town-theme.mp3` | Town Theme (**the house track**) | cynicmusic (Pixelsphere) | CC0 1.0 | <https://opengameart.org/content/town-theme-rpg> | 1:37 | 1,316,581 B |
| `a-new-town.mp3` | A New Town | cynicmusic (Pixelsphere) | CC0 1.0 | <https://opengameart.org/content/a-new-town-rpg-theme> | 1:02 | 766,291 B |

**Neither belongs to an era, to a crisis or to the ceremony, and the code says so.** Both
were auditioned for a frontier-boomtown island before there were eras, and both are RPG town
themes. `DEFAULT_TRACK_ID` in `apps/web/src/audio/musicRegistry.ts` still names the first of
them as the **house track**, but the house track is now what an era borrows only if its own
row is **withdrawn**: all ten eras have their own file, so `trackIdForEra` never reaches the
stand-in and **no scene a learner can be in resolves to either of these two**.
`landedTracksPlay.test.ts` sweeps all 220 combinations of era, crisis and advance and
requires none of them to fetch either file. They stay for the same reason a fallback stays:
they are the two files in this directory whose right to ship is settled, which is exactly
what a fallback should be.

### The fifteen generated tracks — one per era, one per crisis in scope, one for the advance

**`standingInSlots()` in `apps/web/src/audio/eraMusic.ts` derives the shortfall by reading
`MUSIC_TRACKS` rather than a flag, and it now reports six**, down from twenty-one and from
the seven it reported while the ceremony bed was outstanding: the six crises D-CRISIS-33
shelved, none of which is owed a track. **Every slot that is owed a track now has one** — see
[the fifteenth slot](#the-fifteenth-slot-ceremony-advance-has-landed) below. That count is
asserted in `eraMusic.test.ts` by composition against the crisis registry's own in-scope list
rather than by number, so this paragraph cannot go stale without a test failing.

Shared by all fifteen rows, because there is one answer to each and not fifteen — **except
the licence, where `ceremony-advance` carries its own date**:

- **Author**: Suno (generated). The model version was **not recorded**, and unlike the plan
  and the date it is not load-bearing for the licence.
- **License**: **commercial licence per Suno's terms, assigned as generated on 2026-08-04
  under an active Suno Pro subscription** — except `ceremony-advance`, generated
  **2026-08-05** under the same plan and carrying its own constant for that reason. Both
  survive cancellation and require no attribution. See the section below for what that does
  and does not cover.
- **Source**: the prompt, archived per slot in
  `docs/superpowers/specs/2026-08-03-era-and-crisis-music-generation-prompts.md` — §C for
  the ten eras, §E for the four crises, §I for the ceremony bed, one `###` heading per slot
  named exactly as the *Slot* column below. The per-generation Suno URLs were **not
  recorded** either, and are not recoverable from the files.
- **Treatment**: `tools/convert-suno-track.ps1`, which is two-pass `loudnorm` to **-20
  LUFS** with `linear=true`, cover art dropped (`-map 0:a:0 -vn -map_metadata -1`), 48 kHz,
  Ogg Vorbis `-q:a 4`. Vorbis rather than MP3 because **MP3 cannot loop seamlessly**: its
  encoder delay and padding are baked into the decoded PCM, so `loop = true` puts a gap in
  every time round.

| File | Slot | Track | Length | Size | Measured loudness |
| --- | --- | --- | --- | --- | --- |
| `era-prehistoric.ogg` | Era 1 | Prehistoric Era | 2:29 | 1,986,929 B | -19.9 LUFS, 4.9 LU |
| `era-neolithic.ogg` | Era 2 | Neolithic Era | 2:40 | 2,139,923 B | -20.0 LUFS, 4.3 LU |
| `era-bronze_age.ogg` | Era 3 | Bronze Age | 2:19 | 1,975,515 B | -20.0 LUFS, 5.8 LU |
| `era-classical.ogg` | Era 4 | Classical Era | 1:54 | 1,529,585 B | -20.0 LUFS, 5.1 LU |
| `era-medieval.ogg` | Era 5 | Medieval Era | 2:55 | 2,452,156 B | -20.0 LUFS, 4.1 LU |
| `era-renaissance.ogg` | Era 6 | Early Modern | 2:54 | 2,481,507 B | -19.9 LUFS, 4.5 LU |
| `era-industrial.ogg` | Era 7 | Industrial Era | 3:13 | 2,948,577 B | -20.0 LUFS, 5.0 LU |
| `era-atomic_age.ogg` | Era 8 | Atomic Age | 3:18 | 2,583,105 B | -20.0 LUFS, 3.8 LU |
| `era-information_age.ogg` | Era 9 | Information Age | 3:20 | 2,776,772 B | -19.8 LUFS, 5.8 LU |
| `era-cyberpunk.ogg` | Era 10 | Cyberpunk Era | 3:35 | 3,201,516 B | -20.0 LUFS, 5.4 LU |
| `crisis-prehistoric.ogg` | Era 1's crisis | The Hard Winter | 3:25 | 2,749,066 B | -20.0 LUFS, 6.0 LU |
| `crisis-classical.ogg` | Era 4's crisis | The Succession | 2:27 | 2,079,531 B | -20.0 LUFS, 7.7 LU |
| `crisis-renaissance.ogg` | Era 6's crisis | The Plague | 2:40 | 2,280,929 B | -19.9 LUFS, 6.3 LU |
| `crisis-information_age.ogg` | Era 9's crisis | The Intrusion | 3:03 | 2,649,289 B | -19.9 LUFS, 6.5 LU |
| `ceremony-advance.ogg` | Every era-to-era advance | The Advance | 2:34 | 1,835,473 B | -20.1 LUFS, 9.1 LU |

**Every figure in those three right-hand columns was measured from the committed file, not
copied from the conversion report.** Size is `stat`; length is the Ogg granule position of
each file's last page divided by 48,000, cross-checked with `ffprobe`; loudness is
`ffmpeg -af ebur128` on the shipped bytes. All fifteen land within 0.2 dB of the -20 LUFS
target, which is the whole point of normalising them together: **era two is not louder than
era one**, and the bed that plays across the join between them is not louder than either.
`test/musicAssetsAreRegistered.test.ts` re-derives the size and the length from the files on
every run, so a re-converted track cannot keep an old row's numbers.

**The fifteenth row is the one with a different encoder setting, and it is worth saying
why.** The fourteen above are `-q:a 4` through `tools/convert-suno-track.ps1`; the ceremony
bed was encoded `-q:a 3` and came out at 95.6 kbps against the ~107 kbps the era beds ship
at. Its loudness range is also the widest here at 9.1 LU, against 3.8-7.7 for the fourteen —
which is what a bed that swells and recedes under a four-beat ceremony is supposed to do, and
not a normalisation fault: the integrated figure is -20.1 LUFS and the true peak is
-7.4 dBFS, comfortably inside the -1.5 dBTP ceiling the two-pass `loudnorm` was given.

Two things the measurements do **not** establish, said plainly rather than left to be
assumed. **Whether the normalisation was flat gain or compression** cannot be checked here:
that needs the loudness range *before* conversion, the sources are on the lead's machine and
were never available in this repository, and the conversion script's own report is the only
record of it. **How any of them sounds**, including §2 of the brief's tenth-pass test —
*play it ten times through in a background tab and if you can name the moment you are
waiting for, the track fails* — which no measurement can substitute for.

**Four lengths are outside their slot's window, not one.** Measured against the `Length:`
line in each slot's own `###` block in §C, and against §D's shared `Length: 120-240 seconds`
for all four crises:

| Slot | Asked for | Came back | |
| --- | --- | --- | --- |
| `era-classical` | 120-200 s, *"take the top of that window"* | **114 s** | 6 s short, and the shortest loop of the fourteen, so era four repeats most often |
| `era-industrial` | 90-160 s | **193 s** | 33 s over |
| `era-atomic_age` | 100-180 s | **198 s** | 18 s over |
| `era-cyberpunk` | 120-200 s | **215 s** | 15 s over |

All fourteen clear the shared block's absolute floor (*"never under 90 seconds"*), and the
three that ran long are long in the direction the runbook prefers, since a longer loop repeats
less. Recorded rather than fixed, because re-generating is the lead's call. The other ten,
including all four crises, are inside their windows.

### The fifteenth slot: `ceremony-advance` has LANDED

**The slot that was registered and empty from #556 until 2026-08-05 now has a real take**, so
an era-to-era advance plays a bed of its own instead of the **outgoing era's own ambient
track**, which is what `CEREMONY_MUSIC`'s stand-in gave it for as long as the slot was empty.
That was every advance in the game, so this is the last stand-in a learner could still hear.

The history is worth keeping, because it is why the slot is guarded so heavily: it was
cancelled on a ruling that an advance should simply keep the era's track, and **the lead then
reversed that cancellation** — *"there should be [a specific era transition song] for the
era-to-era transitions for better feel."* So **do not point this slot at one of the fourteen**
and do not delete it. `eraToEraTransitionTrack.test.ts` walks all nine seams and requires the
bed to be a DISTINCT id from both the age being left and the age being entered;
`test/eraTransitionTrackLedger.test.ts` fails whenever this file, the registry, the directory
and the runbook stop agreeing, in either direction — a row with no file and a file with no row
both turn it red.

**It was generated from §I of the prompt sheet**, which asks for a 150-240 second **bed that
wraps** rather than the 40-55 second cue the sheet originally asked for. At 154 s it is inside
that window, and it is the only slot in this file whose licence date is not 2026-08-04: see
the note below.

### Generated music: Suno Pro, generated 2026-08-04 and 2026-08-05

**Fourteen were generated on 2026-08-04 and `ceremony-advance` on 2026-08-05, both while an
active Suno Pro subscription was in force, confirmed by the account holder.** That is the
whole provenance, and it is two facts rather than a document, because a generation has no
asset page and no licence file to quote.

**Two dates rather than one, and they are deliberately not merged.** The grant is scoped to
output generated *during* the paid term, so the day each file was made is half of its basis —
and it is the half that cannot be reconstructed from the file, from this repository or from a
later billing page. Rounding both batches to a single date would be inventing a record for one
of them. `apps/web/src/audio/musicRegistry.ts` therefore carries two licence constants, and
`test/musicAssetsAreRegistered.test.ts` requires every date named there to be named here too.

| Fact | Record |
| --- | --- |
| The tool | **Suno**, confirmed by the account holder and by the pipeline this repository built for it |
| **The plan active at generation** | **Suno Pro**, confirmed by the account holder, on both days |
| **The generation date, the fourteen** | **2026-08-04**, the file date on all fourteen sources |
| **The generation date, `ceremony-advance`** | **2026-08-05**, one day later |
| The prompt | **Recorded** per slot in the prompts doc named above, `###` heading per slot |
| The model version | **Not recorded.** Not load-bearing: the grant turns on the plan and the date, neither of which the version affects |
| The per-generation Suno URLs | **Not recorded**, and not recoverable from the files. The prompt is cited instead |

**Why both of the bold rows, and not just the plan.** The right is scoped to *when* a track
was made, so the plan on its own establishes nothing: it would leave a future reader unable
to tell whether these fourteen predate the subscription that covers them. **The plan is the
easy half to recover and the date is the half that rots** — which plan the account is on is
answerable at any time, whereas which plan was live on a particular day is not readable from
the file, from this repository, or from a later billing page. So the two are recorded
together, and `test/musicAssetsAreRegistered.test.ts` requires the date here to be the same
string as the one in `apps/web/src/audio/musicRegistry.ts`, so the pair cannot drift apart.

**What Pro grants**, from §6.6 of
`docs/superpowers/specs/2026-08-01-era-and-crisis-music-brief.md`, which §F of the prompts
doc re-examined and left standing on exactly these points:

- **Commercial use of output generated while subscribed.** Suno *"assigns to you all of its
  right, title and interest in and to any Output owned by Suno and generated from Submissions
  made by you... during the term of your paid-tier subscription"*. Following the 2025 Warner
  settlement the framing moved from ownership to a perpetual commercial licence.
- **Rights that survive cancellation.** The grant is scoped to output generated *during* the
  paid term; it is not conditioned on the term continuing. **So these fourteen stay
  commercially usable even if the subscription lapses**, and nothing about them has to be
  re-bought, re-generated or re-checked if the plan ends. That is the difference between a
  licence and a rental, and it is why the date is worth recording rather than the renewal.
- **Attribution is not required.** Pro asks for no credit, so the rows above are not an
  attribution and satisfy no obligation. They exist for the reason at the top of this file: a
  project that cannot say where an asset came from cannot demonstrate it is allowed to use it.
  The CC0 rows are credited on the same principle, and neither route obliges it.

### Before you generate the ceremony bed, or replace one of these

Two properties of this grant are counter-intuitive enough to be worth stating, and both have
to be known *before* generating rather than discovered afterwards. This is not hypothetical:
the fifteenth generation is still owed.

- **The right is not retroactive, and there is no way to buy it later.** *"Upgrading later
  does not retroactively license a free-tier track."* A track generated on the free tier is
  non-commercial permanently, and paying afterwards does not reach back to it. The only
  repair is to **generate it again while subscribed**, which costs the whole take: the
  prompt is reusable, the output is not, and generators do not reproduce a previous result.
  **So confirm the subscription is live before generating, not before shipping.** Then write
  the plan and the date down while the tab is still open, per §G of the prompts doc.
- **Commercial permission is not a defensible copyright, and nobody is standing behind it.**
  Two limits, from different directions. **Suno offers no indemnification on Pro**, so if a
  third party ever claims one of these outputs, defending it is ours. And **US copyright does
  not vest in AI output**: human authorship is required and prompts alone are not authorship
  (*Thaler v. Perlmutter*, affirmed D.C. Cir. 18 March 2025, certiorari declined 2 March
  2026), and Suno's own terms carry the warning that ownership of output does not guarantee
  copyrightability. A vendor can only assign what it holds. What we have is **permission to
  ship without ownership**, and what that costs is **exclusivity**: another product may ship
  something very close to these fourteen. For background loops under arithmetic practice
  that is an accepted risk, taken knowingly by the product lead, and it is recorded here
  rather than remembered because the next person to read this file will not have been in the
  conversation.

`SUNO_PRO_LICENCE` in `apps/web/src/audio/musicRegistry.ts` is the `license` field on all
fourteen 2026-08-04 rows and carries both warnings, so a row copied from an existing one
arrives with them attached. **A track generated on a different plan or a different day needs
its own string rather than an edit to that one**, because the constant is a record of one plan
on one date and not a general statement about Suno.

**That rule has now been exercised rather than merely stated.** `ceremony-advance` was
generated a day later, so it carries `SUNO_PRO_LICENCE_2026_08_05` — same plan, same terms,
its own date. Editing the date on the original constant would have silently re-dated fourteen
files whose licence basis depends on it.

### What a new track has to do to be picked up

One row here and one row in `MUSIC_TRACKS` (`apps/web/src/audio/musicRegistry.ts`), under the
id the slot derives: `era-<eraId>` or `crisis-<eraId>`, so `era-neolithic`,
`crisis-prehistoric`, and so on for the ten eras and the four crises in scope (eras 1, 4, 6
and 9). The fifteenth id is not derived, because there is one of it: `ceremony-advance`.
Nothing else moves: no manifest row is edited, no flag is flipped, and no component or wiring
is touched. **Fourteen tracks landing at once is that claim cashed rather than rehearsed** —
`eraMusic.ts` did not change a line of code — and the provenance rule is the one part that is
not optional. `docs/superpowers/specs/2026-08-04-music-pipeline.md` is the runbook from Suno
download to registered track.

Three guards make the halves of a botched drop-in fail rather than go quiet:
`test/musicAssetsAreRegistered.test.ts` requires every committed file in `music/` to have a
registry row **and** a row in this file, in both directions, which is what catches a track
committed and left inert; `musicSlots.test.ts` requires every registry slot id to be one the
code derives, which is what catches `era-atomic` for `era-atomic_age`; and
`landedTracksPlay.test.ts` drives the real reconciler and requires the URL the player asks for
to name a file that is really in the directory, which is what catches a row nothing reaches.

**All fifteen loop, `ceremony-advance` included, and its row is the same shape as the fourteen
above.** That slot scores an era advance, which is answer-paced and runs
**three and a half to over ten minutes** — so it is a long bed that wraps rather than a short
cue that resolves, and the struck bell at the advance press (`era-advance.ogg`) is the only
cadence the occasion has.
`ceremonyMusic.test.ts` drives the shipped player over every slot and requires `element.loop`,
so nothing can become the exception by accident. An earlier version of this feature made that
slot a cue and gave `MusicTrack` a `playback` field to say so; the field is gone and the
player is unchanged from #536.

### The CC0 alternates, which nothing now needs

**Not shipped, but verified and available** if the house track is ever wanted back: "Magic
Town" (CC0 1.0, <https://opengameart.org/content/magic-town>, ~1.3 MB). Two further CC0
candidates were rejected on size rather than licence — "Seaside Village"
(<https://opengameart.org/content/seaside-village>) is a 12 MB FLAC with no
already-compressed release, and "Summers"
(<https://opengameart.org/content/summers>) is 3.5 MB at 160 kbps. These were auditioned
while every era borrowed one generic loop; the fourteen have made that question moot rather
than answered it, so the record stays.

## Sound effects — `public/audio/sfx/`

### The city's original five

All from Kenney's CC0 packs (<https://kenney.nl>), whose bundled `License.txt` reads:

> License: (Creative Commons Zero, CC0)
> <http://creativecommons.org/publicdomain/zero/1.0/>
> This content is free to use in personal, educational and commercial projects.

| File | Pack | Original filename | Length | Size |
| --- | --- | --- | --- | --- |
| `place-building.ogg` | Interface Sounds | `drop_002.ogg` | 0.19 s | 6,411 B |
| `road-lay.ogg` | UI Audio | `click3.ogg` | 0.09 s | 4,880 B |
| `road-remove.ogg` | Interface Sounds | `back_002.ogg` | 0.07 s | 7,029 B |
| `mastery-star.ogg` | Music Jingles | `jingles_PIZZI00.ogg` | 0.49 s | 10,382 B |
| `building-unlocked.ogg` | Music Jingles | `jingles_STEEL00.ogg` | 0.93 s | 15,691 B |

Pack pages: [Interface Sounds](https://kenney.nl/assets/interface-sounds) ·
[UI Audio](https://kenney.nl/assets/ui-audio) ·
[RPG Audio](https://kenney.nl/assets/rpg-audio) ·
[Music Jingles](https://kenney.nl/assets/music-jingles)

Kenney asks (but does not require) that projects credit "Kenney" or `www.kenney.nl`.
This file is that credit.

**`purchase.ogg` was a sixth and is gone.** It was RPG Audio's `handleCoins.ogg`, it fired
from the cosmetic shop, and #498 deleted the shop. From that merge until this one it sat in
the catalogue with no call site: 25 KB every unmuted learner fetched on their first click,
for a sound the game could no longer make. `test/cityEventSfx.test.ts` is the guard that
would have caught it, and it now fails on any sample nothing plays.

**`citizens-depart.ogg` went the same way on 2026-08-05, and it is the third time this
paragraph has been written.** It was Freesound 402466 (LampEight, *Door Close Heavy Wooden Slow
Quiet Seal Theatre*), 10,706 B, high-passed at 150 Hz and trimmed to 0.86 s, and it was a heavy
door swung to for a city that had just lost people. Departures were removed as a mechanic
entirely (*"citizens do not leave"*), so there is no event left for it to mark. The row went out
of the table with the file, because a provenance row for a sample the app does not ship is a
licence obligation recorded against nothing.

**`album-open.ogg` went the same way on 2026-08-04, and this time the guard is why it went
with the feature.** It was RPG Audio's `bookOpen.ogg`, 6,884 B, and it fired from the one
place in the game that made a sound on opening: the Album's ☰ Menu button. The lead cut the
Album, so the page turn had nothing left to turn — and because the sweep fails on a sample
nothing plays, deleting the surface and leaving the sound behind would have been red rather
than quiet. There is now **no panel in the game that speaks when it opens.**

### The city's own events

Thirteen files, one per sound in
`docs/superpowers/specs/2026-08-03-sfx-picks-per-city-event.md` that the game still has an
event for, plus one extra rung of the era ladder. The sheet named fourteen; its fourteenth
was the departing-citizens door, and departures went as a mechanic on 2026-08-05 (above).
**Every file was decoded and measured rather than taken from its title**, which is what the
*Treatment* column records.

| File | Source | Original | Author | Treatment | Length | Size |
| --- | --- | --- | --- | --- | --- | --- |
| `answer-missed.ogg` | Freesound 691805 | G4 soft — kalimba | hollandm | cut to 2.00 s | 2.00 s | 24,225 B |
| `building-frozen.ogg` | Freesound 262635 | Ice Crack 1 | j_p_higgins | **crack 1 of 2** | 0.30 s | 5,006 B |
| `civic-purchase.ogg` | Freesound 570970 | Gravel Drop 1 | dichardson | as published | 0.63 s | 14,039 B |
| `crisis-call.ogg` | Kenney Impact Sounds | `impactBell_heavy_002.ogg` | Kenney | as published | 0.70 s | 7,879 B |
| `crisis-commit-late.ogg` | Kenney Impact Sounds | `impactMetal_medium_000.ogg` | Kenney | as published | 0.27 s | 6,241 B |
| `crisis-commit.ogg` | Kenney Impact Sounds | `impactWood_medium_000.ogg` | Kenney | **re-sourced off the `heavy` variant, then high-passed at 150 Hz, +5.95 dB makeup** | 0.33 s | 5,910 B |
| `crowd-gather.ogg` | Freesound 340358 | Medium-Sized Crowd Background Noise | *(deleted account)* | as published | 4.27 s | 55,510 B |
| `era-advance.ogg` | Freesound 337048 | Bell at Daitokuji temple, Kyoto | shinephoenixstormcrow | as published | 2.00 s | 29,013 B |
| `fire-lit.ogg` | Freesound 244926 | fire-whoosh | hnhnh | **first 1.30 s, high-passed at 150 Hz** | 1.30 s | 21,152 B |
| `frost-advance.ogg` | Freesound 396447 | Freezing HZA | hz37 | **cut to 1.60 s, then re-levelled +10.91 dB** | 1.60 s | 17,962 B |
| `thaw.ogg` | Freesound 466559 | Water Drip | spanrucker | as published | 1.25 s | 18,319 B |

Freesound pages, in the same order as the rows above:
[691805](https://freesound.org/people/hollandm/sounds/691805/) ·
[262635](https://freesound.org/people/j_p_higgins/sounds/262635/) ·
[849840](https://freesound.org/people/JeffPearson/sounds/849840/) ·
[342542](https://freesound.org/people/sgrowe/sounds/342542/) ·
[570970](https://freesound.org/people/dichardson/sounds/570970/) ·
[340358](https://freesound.org/people/deleted_user_5205523/sounds/340358/) ·
[337048](https://freesound.org/people/shinephoenixstormcrow/sounds/337048/) ·
[244926](https://freesound.org/people/hnhnh/sounds/244926/) ·
[396447](https://freesound.org/people/hz37/sounds/396447/) ·
[466559](https://freesound.org/people/spanrucker/sounds/466559/)

**What is shipped is the CDN preview, not the original.** Freesound's originals need a free
account; the preview is what is publicly fetchable, and it is what was measured and encoded.

**One row's file is not what the sourcing sheet says it is.** `fire-whoosh` is described
there as *"a broadband roar to 17 kHz"*, and 89% of its energy sits below 60 Hz with its
strongest partials at 39 / 60 / 89 Hz and nothing at all above 12 kHz. The ignition and
pops are genuinely there; they are buried under a rumble a laptop speaker cannot reproduce,
so the shipped file is high-passed and reads as an ignition rather than as near-silence.
The two the sheet itself caught — a hammer that is three strikes and a crack that is two —
measured exactly as it said, and each ships as one.

**And a second row has the same defect, worse, which is why row 18 was measured before it
was wired rather than after.** The door's SHAPE is exactly what its row claims: 1.79 s
decoded, the loudest 10 ms frame at t=0.66 s (the row says *"soft contact at 0.65 s"*), and
610 ms from onset to that peak, which is a door swung to and emphatically *"not slammed"* —
a slam is a transient under 10 ms. What the row does not say is where the energy is. **85%
of it sits below 60 Hz and 57% below 20 Hz, which is beneath hearing**, the spectral centre
is 42 Hz, the strongest partials are 8 / 21 / 33 Hz, and there is nothing at all above
12 kHz. The *"rub"* is the worst of it: over 0–0.6 s, 91% of that segment is under 20 Hz
and under 2% is above 400 Hz, so the rub is not a rub in any band a person can hear.

Measured as a laptop speaker would pass it — a 4-pole high-pass at 200 Hz — the published
file loses **12.3 dB of peak and 15.5 dB of RMS**, landing at −51 dBFS RMS at this
sample's catalogue trim. It would have shipped as silence. Cut to its audible window and
high-passed at 150 Hz it loses 2.7 dB through the same filter instead, the spectral centre
moves from 42 Hz to 344 Hz, its strongest partials become the 174–294 Hz body of a wooden
door, and the contact — still the peak, still a 170 ms rise rather than a slam — arrives
0.20 s in rather than 0.65 s, which is also what stops the sound lagging the press that
caused it. **The row's prose was right about everything it described and silent about the
one thing that decided whether the file was usable**, which is the argument for measuring
every row rather than the ones a sheet flags.

### Every file here has been measured for audibility, and two of them failed

The two paragraphs above each caught an inaudible file by accident, and a third turned up
the same way — `ceremony-rebuild-late.ogg`, which had already shipped. Three accidents
means the number of undetected ones was simply unknown, so on **2026-08-04** every effect
in this directory was measured rather than sampled.
`scripts/measure-sfx-audibility.py` is that sweep and it
derives its list from this directory, because a sheet deciding which files to check is how
all three got through: every one of them matched its own prose in every respect except the
one that decided whether it could be heard.

**The sweep measured twenty files and nineteen of them are the ones still shipping**, which
is now the whole of the shipped set. Two of what it measured are gone: the Album's page turn
was cut with the Album the same day (see above), and `citizens-depart.ogg` went on
2026-08-05 when departures were removed as a mechanic. For a day in between there was a
twentieth shipped effect the sweep's branch had forked before and never saw — that door —
which is the case for deriving rather than counting: the directory answered while this
sentence was wrong.
`test/sfxAudibility.test.ts` re-derives the population from the directory and re-measures
every member on every run, so an effect added after this paragraph was written is measured
by the guard whether or not anybody thinks to update the number.

**The number that decides is not where a sound's energy sits, it is how much of the sound
survives a speaker.** For a sub-half-second transient the first question is barely even well
posed: 20 Hz has a 50 ms period, so `ceremony-rebuild-late.ogg` is ten cycles long and its
"share below 20 Hz" comes out at 6.6%, 11.4% or 15.9% depending on which ordinary estimator
is used. A filter has no such freedom. Each file is passed through a **4-pole high-pass at
200 Hz**, roughly what a laptop driver passes, and what is recorded is the peak and RMS it
loses. **Six decibels is the line**: half the amplitude, and the gap between the
departing-citizens sample condemned at 12.3 dB peak / 15.5 dB RMS and the same file accepted
at 2.7 dB once processed. That sample no longer ships — it went with the mechanic on
2026-08-05, above — but the evidence for where the line sits is still checkable, because
those bytes are in the history and the script that measured them takes a path. Eighteen of
the twenty it measured passed; the closest still shipping is `road-remove.ogg` at 5.32 dB
peak, which is the one to watch.

| | As it shipped | Now |
| --- | --- | --- |
| **`crisis-commit.ogg`** loss through the filter | 15.58 dB peak / 16.98 dB RMS | **2.98 / 2.97** |
| its energy below 60 Hz | 25.4% | **0.01%** |
| its spectral centre | 90 Hz | **261 Hz** |
| **`ceremony-rebuild-late.ogg`** loss through the filter | 2.82 dB peak / 5.02 dB RMS | **0.19 / 0.77** |
| its energy below 60 Hz | 36.9% | **0.02%** |
| its spectral centre | 471 Hz | **1,177 Hz** |

Every figure in that table is `scripts/measure-sfx-audibility.py` run over the two files'
own bytes, the shipped ones from this tree and the originals from `9bc6341` — so a reader
can reproduce the whole table and not only the right-hand column. The two band shares are
0.1 and 0.5 of a percentage point off the figures first recorded for them, which is the
end-trim correction below reaching a band share as well as a loudness: a share is a ratio
over a frame set and the frame set moved.

**`crisis-commit.ogg` is the one that could not be high-passed, which is why its source row
changed.** 99.0% of `impactWood_heavy_000.ogg`'s energy sits below 200 Hz and 0.003% of it
above 2 kHz, so unlike the whoosh there is nothing buried under the rumble for a filter to
uncover: high-passing it at 150 Hz and making the gain back up still loses 5.18 dB of peak
and 8.82 dB of RMS, a louder version of the same inaudible thud. All five
`impactWood_heavy_*` variants in the pack measure that way, so the family is the problem and
not the take. `impactWood_medium_000.ogg` is the same pack, the same material and the same
intensity as the IRON rung this sound ladders against (`impactMetal_medium_000.ogg`, which
ships as `crisis-commit-late.ogg`), and the `medium` takes are the lowest-pitched wood in
the pack that a laptop can reproduce at all, which is what "heavy" has to mean once the
sub-bass is gone. `_000` over `_002` because it high-passes to a lower centre (261 Hz
against 286), and because `_002` as published clears the loss floor by 0.02 dB, which is
not a margin. In the only terms that matter: at its unchanged trim the timber rung used to
radiate **16.2 dB quieter** than the iron rung it is supposed to pair with, and now
radiates 2.6 dB quieter.

**`ceremony-rebuild-late.ogg` kept its source and is not trimmed.** The plate has real
content above the rumble — a 400 to 500 Hz ring that is 38% of the shipped result, and an
attack whose 16.7% above 2 kHz reaches 12 kHz — so the high-pass reveals the strike instead
of removing it. Its spectral centre moves to 1,177 Hz because the bottom was deleted and not
because anything was pushed upward; a high-pass adds nothing anywhere. No trim, because the
reason to trim is that the useful part is buried in a tail or that the sound lags the press,
and this one's loudest 10 ms frame is at **t = 0.000 s**, with 88% of its energy inside the
first 50 ms before the filter and 96% after.

**No fix creates a new collision.** `era-advance.ogg` is a struck bell whose strongest
partial is 1,022.8 Hz, so the 900 to 1,200 Hz region is spoken for. Only the makeup gain can
raise anything, and measured in that region at mix trim the rebuild strike went from -54.5
to -52.0 dBFS against the bell's -41.6 dBFS, so it sits 10 dB under the bell where it sat 13
dB under before. The two are separate ceremony beats and never sound together in any case.
The other fix has 0.1% of its energy there. (One correction to the record while in there:
`era-advance.ogg` is NOT 97.5% inside one octave. Its 1,023 Hz fundamental holds 54% and a
partial at 2,592 Hz puts **45.6% above 2 kHz**, which three independent methods agree on to
within a percentage point.)

**Reproducing it.** `scripts/process-sfx-audibility.sh <pack>/Audio` regenerates both files
from a fresh CC0 download, computing the makeup gain rather than hardcoding it, so the
difference from the source is checkable and not merely asserted. The encode is `-q:a 3`,
which is not a guess: at that setting the pack's `impactWood_heavy_000.ogg` re-encodes to
5,284 B, exactly the byte count the old `crisis-commit.ogg` shipped at.

**And a guard, so this class cannot ship a fourth time.** `test/sfxAudibility.test.ts`
derives its population from this directory, decodes every file, and fails any that loses
more than 6 dB through that filter or spends more than a fifth of itself below 60 Hz. It was
watched red against both unfixed originals before it was believed.

### And a second sweep, for level, because passing that filter is not the same as being heard

The sweep above asks whether a laptop speaker reproduces a file's SPECTRUM. It left one
finding open and named it: **`ceremony-rebuild.ogg` radiated -45.1 LUFS against -25.9 and
-25.6 for the two ceremony beats immediately before it** — a 19 dB hole in the middle of
one four-beat ritual, on the path a demo walks for eras one to six — while **passing** the
spectral floor at 3.11 dB of peak loss and 4.02 of RMS against a limit of 6. That pass is
correct. Nothing is wrong with the frequencies; the file is mastered quiet. No filter
detects that and no filter fixes it. `frost-advance.ogg` at -44.9 was the same shape inside
one winter encounter.

**The number is RADIATED loudness**, not file loudness, and the distinction is the whole
measurement: what a learner hears is the file through the laptop's own roll-off, scaled by
the per-sample `trim` in `soundEffects.ts`. So

    radiated = K-weighted LUFS( high-pass(file, 200 Hz, 4-pole) ) + 20*log10(trim)

using the same ungated whole-file K-weighting the sweep above uses, for the same reason:
EBU R 128 integration needs a 400 ms block and **seven of the nineteen samples have no gated
figure at all** — six run shorter than 400 ms and `ceremony-rebuild.ogg` lands on exactly
0.400 s — so the gated figure is absent for exactly the files in question.
`scripts/measure-sfx-levels.py` is the tool and it reproduces all four figures quoted above
to 0.01 dB.

**One number for everything would have been the wrong fix.** These sounds are not meant to
be equally loud — a crowd gathering for a founding should dwarf a road tile going down, and
the `trim` column already spends itself saying so. The harm is a sound being inaudible
*relative to what it plays alongside*, so the subject is a group of sounds that share a
room. The rooms are derived from the call sites rather than from the filenames (which would
have split the crowd bed off the ceremony it opens, and joined `crisis-call` to
`crisis-commit`, a city announcement and a crisis-board press that never sound together):

| Room | What it is | Members |
| --- | --- | --- |
| `EraAdvanceCeremony.tsx` | one four-beat founding ritual, in sequence | crowd-gather, ceremony-expansion, ceremony-rebuild(-late), era-advance, answer-missed |
| `HardWinterSurface.tsx` + `winterSfx.ts` | one winter encounter | crisis-commit(-late), frost-advance, building-frozen, fire-lit, thaw |
| `CitySurface.tsx` + `crisisCall.ts` + `App.tsx` | the island during ordinary play | place-building, road-lay, road-remove, mastery-star, building-unlocked, civic-purchase, crisis-call |
| the three other crisis surfaces | the commit ladder alone | crisis-commit, crisis-commit-late |

**Two files moved, and only by gain.** Nothing was re-sourced, filtered, trimmed or
resampled: one `volume` filter and a re-encode at the directory's own `-q:a 3`.
`scripts/level-sfx.py` is that pass, and like `process-sfx-audibility.sh` it COMPUTES each
gain from a named sibling measured at run time rather than hardcoding it, so a second run
is a no-op and the target cannot quietly stop meaning what it meant.

| | radiated before | after | and why that target |
| --- | --- | --- | --- |
| `ceremony-rebuild.ogg` | **-45.15** | **-35.11** | 2.61 dB under its own iron rung `ceremony-rebuild-late.ogg` — the spacing the OTHER material ladder already carries after that rung was re-sourced. It had been 12.5 dB under. |
| `frost-advance.ogg` | **-44.90** | **-33.99** | 1.0 dB under `building-frozen.ogg`, the crack it is started alongside when a round closes. The crack must read on top of the bed; it had been 12.0 dB beneath it. |

**A third file was re-levelled and is no longer here.** The Album's `album-open.ogg` was
raised +6.93 dB to sit level with `road-lay.ogg`, and then the Album was cut and the file
went with it; there is nothing left in the tree for that row to describe. What survives it
is the target rule, which is why `scripts/level-sfx.py` no longer names it either.

**The trim would not have worked for either of the two, and that is a measurement rather
than a preference.** `trim` is an attenuator — the player writes `min(1, gain * trim)` onto
an `HTMLMediaElement.volume`, which is capped at 1 — so it can only make a sample quieter.
These two needed +10.04 and +10.91 dB on trims that already sit at 0.6, which would have
asked for 1.90 and 2.09. No code moved, and the converse case
is real and was left alone: `civic-purchase.ogg` peaks at **-0.40 dBFS**, so it has no
headroom for a file gain at all and could only ever be moved from its trim.

**Seventeen files were measured and left, which is the other half of the claim.** The
spread across the set narrows from **23.2 dB to 17.6 dB** and every remaining difference is
one somebody chose. `answer-missed.ogg` sits 6.1 dB under its ceremony's median, which is
deliberate — it answers a wrong answer and a game that scolds is the failure mode — and it
is the same note the lesson layer plays everywhere else, where it is tuned as the only sound
in the room. Above the median nothing was touched at all: being the biggest thing in the
room is a design decision, not a defect.

**⚑ DELETING A SOUND MOVES ITS ROOM, AND THE ISLAND'S ROOM MOVED.** `citizens-depart.ogg`
radiated -34.08 and was one of four island members below that room's middle, so taking it
out lifted the island's median from **-30.75 to -28.40** — 2.35 dB, without a single file
changing by a decibel. Three sounds are further under their room than they were:
`crisis-call.ogg` and `civic-purchase.ogg` at **7.1 and 7.0 dB** where they were 4.7 and
4.6, and `road-lay.ogg` at **4.7** where it was 2.4, still the most repeated sound in the
game and still put there on purpose. All three remain inside the 10 dB margin, and
`crisis-call.ogg` is now the deepest member of any group, which `answer-missed.ogg` was.
**What that costs is headroom rather than a verdict**: the margin `test/sfxLevels.test.ts`
asserts is still free — its own *"still has room under the margin"* case wants the deepest
member inside 8 dB — but the room left under it falls from **3.9 dB to 0.9**. Nothing here
is a defect and nothing was re-levelled for it, because the fix for a 7 dB gap is a gain on
a file somebody chose the level of; it is recorded because the next sound removed from that
room is the one that pushes a member past the line, and a shrinking margin is invisible in a
green run.

| file | radiated before | after | | file | radiated before | after |
| --- | --- | --- | --- | --- | --- | --- |
| `mastery-star.ogg` | -21.98 | -21.98 | | `ceremony-rebuild-late.ogg` | -32.60 | -32.60 |
| `building-unlocked.ogg` | -22.54 | -22.54 | | `building-frozen.ogg` | -32.90 | -32.90 |
| `place-building.ogg` | -22.72 | -22.72 | | `road-lay.ogg` | -33.10 | -33.10 |
| `ceremony-expansion.ogg` | -25.62 | -25.62 | | `frost-advance.ogg` | -44.90 | **-33.99** |
| `crowd-gather.ogg` | -25.86 | -25.86 | | `era-advance.ogg` | -34.24 | -34.24 |
| `road-remove.ogg` | -28.40 | -28.40 | | `ceremony-rebuild.ogg` | -45.15 | **-35.11** |
| `crisis-commit-late.ogg` | -29.48 | -29.48 | | `civic-purchase.ogg` | -35.38 | -35.38 |
| `thaw.ogg` | -30.34 | -30.34 | | `crisis-call.ogg` | -35.48 | -35.48 |
| `fire-lit.ogg` | -30.79 | -30.79 | | `answer-missed.ogg` | -39.54 | -39.54 |
| `crisis-commit.ogg` | -32.08 | -32.08 | | | | |

**Neither of the two files the spectral sweep fixed moves.** `crisis-commit.ogg` lands 0.6
dB under its winter median and `ceremony-rebuild-late.ogg` 0.8 dB ABOVE its ceremony
median, so both were already level with their rooms and neither was touched — their bytes,
and therefore the four SHA-256-pinned cross-check rows in `test/sfxAudibility.test.ts`, are
unchanged. All four audibility loss columns are identical to three decimals across all
nineteen files before and after this pass, which is what "gain only" means arithmetically: a
gain scales a file and its filtered copy by the same factor, so every ratio between them
cancels.

**And a guard, so this class cannot ship again either.** `test/sfxLevels.test.ts` derives
the rooms above from the call sites, decodes every file, and fails any member sitting more
than **10 dB** under its own room's median. Ten decibels is roughly half the perceived
loudness — the point at which a member stops reading as part of the piece. Six, the
spectral guard's line, would have been wrong here: that floor asks how much of one file a
speaker throws away, where any loss is harm, while this one compares neighbours, and a room
is allowed a foreground and a background. It was watched red one injection at a time,
including against the shipped `ceremony-rebuild.ogg` (*"11.7 dB under the median of
EraAdvanceCeremony.tsx"*) and against a `trim` change rather than a file change, since a
level defect can arrive from either side.

**One correction to the instrument, which does not move any verdict above.** `ffmpeg`'s raw
PCM pipe does not honour the Ogg end-trim: it emits whole Vorbis blocks, so **eleven of the
nineteen** files decode to the wrong length — 128 frames short on ten, and 952 frames LONG on
the 0.07 s `road-remove.ogg`. Loudness is mean power, so the frame count is the denominator
and that file read **1.17 dB quiet**. Both scripts now cut or zero-pad to the container's
own duration, which `@wasm-audio-decoders/ogg-vorbis` reproduces exactly on all nineteen, and
the two implementations now agree to **0.01 dB** on every file rather than 1.17 on one —
the widest gap is 0.008 dB, on `ceremony-rebuild-late.ogg`, against a script that publishes
to two decimal places.
No audibility VERDICT is affected: peak loss and RMS loss are ratios between a file and its
own filtered copy, so they are identical to two decimals before and after the correction.
Band shares are the one figure that does move, because a share is a ratio over a frame set
and the frame set is what changed — 0.1 and 0.5 of a percentage point on the two files whose
"as it shipped" shares are quoted above, neither of which crosses the 20% line in either
direction.
This paragraph read *"ten of the twenty … short on nine"* until the departing sample went,
and subtracting one from each would have given nine of nineteen. It was measured instead,
and the answer is eleven and ten: the same twelve-of-twenty holds at `684a7a9f`, before this
document's own re-levelling pass, so the sentence had already been two low on both halves
and the deletion accounts for exactly one of them. A count of files is as reproducible as a
loudness and is owed the same treatment.

**Row 4's uploader account is deleted.** CC0 is irrevocable so the licence is durable, but
the link is not, which is why the file was downloaded rather than merely cited. Freesound's
own search page renders the slug truncated (`deleted_user_52055`), and that form 404s.

**Two events have no sound and no file**, deliberately: the ceremony's `retheme` beat and
the crisis conclusion. Neither has a physical referent a search term could specify, so
everything auditioned for them was a whoosh standing in for a meaning. They are for
generation later.

## Not shipped as assets

Two sounds in the game are **synthesized** at runtime with the Web Audio API and have no
file and no license: the lesson layer's correct-answer chime
(`apps/web/src/lessons/lessonSound.ts`) and the city's skill-complete chime
(`apps/web/src/city/chime.ts`). They cost zero bytes, and they are the reason this
feature added no effect for "building completed" — one already existed.

## Total

| | Bytes |
| --- | --- |
| Music, the two house tracks | 2,082,872 |
| Music, the fourteen generated era and crisis tracks | 33,834,400 |
| Music, `ceremony-advance.ogg` | 1,835,473 |
| Effects (19 files) | 273,791 |
| **Total** (36 files) | **38,026,536** (36.26 MB) |

**The repository's audio grew about sixteen-fold**, from 2.25 MB to 36.26 MB, and all of it
is the fifteen generated tracks. None of it enters the JavaScript bundle: these are `public/`
files fetched by URL at runtime, and nothing is requested until the learner's first
interaction.

What a learner actually pulls, now that music is **on** by default:

| Case | Bytes |
| --- | --- |
| Page load, before any interaction | **0** |
| Default learner, after their first click | **2,260,720** (2.16 MB) — the 19 effects plus `era-prehistoric.ogg` |
| Learner who switches music off | **273,791** (267 KB) — the effects only |
| Muted learner | **0** — warming is skipped entirely while muted |
| Learner who reaches all ten eras, enters all four crises and advances at least once | **35,943,664** (34.28 MB) — the effects plus all fifteen |

**The first-click figure rose by 670,348 B (655 KB), from 1.52 MB to 2.16 MB**, because a new
learner now pulls era one's own 1.9 MB track instead of the 1.3 MB house theme. That is the
whole of what the default case changed, and `ceremony-advance` does not touch it: the bed is
fetched at the first era advance, which no first click reaches. **The 36.26 MB total is not
what anybody downloads**:
only the track the current scene resolves to is ever built, so the last row is the ceiling for
a learner who plays the entire ten-era run, reached one track at a time across hours, and no
learner reaches it in a session. **Neither house track is fetched at all any more**, since no
scene resolves to either.

**The effects figure grew from 68 KB when the city's own events got their sounds**, and the
arithmetic is worth stating rather than hiding: the directory held 69,787 B before that
batch — the original five plus the cosmetic shop's 25,394 B coin handle — and the fifteen
city-event samples added 240,104 B while that coin handle left, which came to 284,497 B; the
10,706 B departing-citizens door then left with its mechanic, which is the 273,791 B above.
The crowd bed is 55 KB of it on its own because it is 4.3 s of dense
ambience and the rest are under a second and a half. Against the 1.9 MB soundtrack that now
arrives by default it is a seventh of what a learner already pulls; against the effects-only
case it is four times what it was. Both numbers are here because the second is the one a
reader would be surprised by.

The alternate house track is never fetched at all now. **Per-era and per-crisis music does not
change that arithmetic, and the fourteen landing has not changed it either**: only the track
the current scene resolves to is ever built, so a learner pulls one track per era they reach
plus one per crisis they enter, never the whole set. What the fourteen changed is the *size* of
each of those fetches, from one 1.3 MB house theme reused everywhere to a 1.5 to 3.2 MB file
per scene, which is the last row of the table above. The one addition is that a crisis parks
the era's track rather than dropping it, so that returning from a crisis resumes it in place;
that holds at most two tracks in memory and fetches nothing extra. The crossfade between
scenes plays those same two elements for about a second and a half and fetches nothing extra
either. **A slot whose file will not load costs nothing and breaks nothing**: the player marks
it unplayable off the element's `error` event, writes one `console.debug` line, and that slot
is silent. That is the failure mode to expect in a browser whose Ogg Vorbis support is absent,
so **check Safari before demoing in it**:

```js
document.createElement("audio").canPlayType('audio/ogg; codecs="vorbis"');
```

An empty string means no, and it means silence in every one of the fourteen slots while the
game runs on unharmed.
