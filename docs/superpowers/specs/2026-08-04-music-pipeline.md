# Suno track to shipped music: the pipeline

One track in, one file and one line of code out. Repeat fifteen times, in any order.
**All fifteen are done and registered, `ceremony-advance` included as of 2026-08-05.**
`2026-08-03-era-and-crisis-music-generation-prompts.md` is the prompt sheet and owns the
slot list; this is what to do with what comes back.

**One of the fifteen differs in exactly one place, and it is not this pipeline.**
`ceremony-advance` scores the era advance, so its prompt is §I rather than §B plus a slot
block. Everything here applies to it unchanged — the loudness target, the container, the
seamless-loop argument and the registry row are all the same as for the other fourteen. It is a
long bed that wraps, because an advance is answer-paced and runs three and a half to over ten
minutes.

**If you generated that slot against §I before 2026-08-04, regenerate it.** §I asked for a
40-to-55-second cue with a cadence, and it now asks for a 150-to-240-second bed that must not
resolve. Its head says what survives the change: the character, the register, the instrument
sense and the whole frequency map.

**GENERATED AND LANDED 2026-08-05: `ceremony-advance`.** All fifteen takes are now in
`apps/web/public/audio/music/`, this one included, and it is the slot the lead asked for by
name: *"there should be [a specific era transition song] for the era-to-era transitions for
better feel."* Until it landed, **an advance played the OUTGOING era's own ambient track for
its whole three-to-ten minutes** through `CEREMONY_MUSIC`'s stand-in; that placeholder is now
retired, and a seam plays a bed belonging to neither age.

The take was generated from §I, which is written for the bed, and normalised like the rest:
two-pass `loudnorm` to -20 LUFS with a -1.5 dBTP ceiling from a 48 kHz PCM source at
-15.1 LUFS, encoded Ogg Vorbis. It measures **-20.1 LUFS integrated over 153.6 s**, which is
inside §I's 150-240 second window. `test/eraTransitionTrackLedger.test.ts` fails whenever this
paragraph and the tree disagree, in either direction, so removing the registry row without
restoring the "still to generate" marker is not a way past it either.

## The five steps

1. **Generate.** Paste the shared block plus the slot's block from the prompt sheet.
2. **Download** the MP3.
3. **Convert.** From anywhere, in PowerShell:

   ```powershell
   pwsh tools/convert-suno-track.ps1 -Source "C:\Users\<user>\Downloads\Ashen River Rite.mp3" -Slot era-prehistoric -DryRun
   ```

   Drop `-DryRun` to write the file. The script prints the fifteen slot names if you run
   it with no arguments, and refuses a name that is not one of them. It reads that list
   out of the prompt sheet, so it cannot drift from it.

4. **Check the report.** It prints the loudness before and after, and whether `loudnorm`
   normalised **linearly** or fell back to **dynamic**. Linear is what you want; dynamic
   means it rode the gain, which pumps on a sustained bed. It also names how many non-audio
   streams it dropped — Suno embeds one MJPEG cover-art stream.
5. **Register it.** The script prints the exact row, with the real byte count and duration
   filled in. Paste it into `MUSIC_TRACKS` in `apps/web/src/audio/musicRegistry.ts`, and add
   the matching row to `apps/web/public/audio/CREDITS.md`. That is the whole change: no
   component, no wiring, no flag. **Do not stop after the file.** A committed file with no
   registry row is a track nothing will ever play, which is how all fourteen of the era and
   crisis takes sat inert once; `test/musicAssetsAreRegistered.test.ts` is what fails on it
   now, and it also requires the `CREDITS.md` row and re-derives the byte count and duration
   from the file. `apps/web/src/audio/landedTracksPlay.test.ts` is the other half: it requires
   the URL the player actually asks for to name a file that is really in the directory, so a
   row nobody reaches fails too.

The file it writes lands in `apps/web/public/audio/music/<slot>.ogg` already, so there is
nothing to move.

## What the conversion actually runs

Two ffmpeg passes over the source, then a third over the result to verify. The one that
does the work, with the measured values filled in by the first:

```
ffmpeg -hide_banner -nostats -y -i "<source>.mp3" \
  -map 0:a:0 -vn -map_metadata -1 \
  -af loudnorm=I=-20:TP=-1.5:LRA=7:measured_I=<>:measured_TP=<>:measured_LRA=<>:measured_thresh=<>:offset=<>:linear=true:print_format=summary \
  -ar 48000 -c:a libvorbis -q:a 4 apps/web/public/audio/music/<slot>.ogg
```

- **Two passes, not one.** Single-pass `loudnorm` is a dynamic normaliser — it rides the
  gain as it goes. On a bed with 1.7 LU of loudness range that is audible pumping across a
  study session. Measure-then-apply with `linear=true` is one static gain instead.
- **`-map 0:a:0 -vn`** takes the audio stream and nothing else, which is what drops the
  cover art. **`-map_metadata -1`** stops an ID3 frame carrying it back in as a tag.
- **`-ar 48000`** because `loudnorm` runs at 192 kHz internally; without this the output
  rate is whatever the filter graph last resampled to.

Every number is a variable at the top of the script, not a literal in that string.

## Why Ogg Vorbis and not MP3

**MP3 cannot loop seamlessly.** The format's encoder delay and padding are baked into the
decoded PCM, so `loop = true` puts a gap in every time round. Nothing at the player can fix
that; it is a property of the file. Vorbis has no such padding — Ogg's granule positions
give the decoder an exact sample count — so the loop is clean.

The alternatives, and why not:

- **Opus** is smaller and better per bit. Vorbis wins here on two practical grounds: the six
  sound effects already shipping in `public/audio/sfx/` are `.ogg`, so it adds no new decode
  path, and its `<audio>`-element support is the more uniform of the two. Revisit if size
  becomes the problem.
- **WAV** loops perfectly and costs about 88 MB for eight minutes. No.

**The one thing to check before the demo** is that the browser you are demoing in decodes
it. Chrome, Firefox and Edge do. Safari's Ogg support has historically been absent and has
moved recently, and this has not been tested there — so check it rather than trusting either
of us:

```js
document.createElement("audio").canPlayType('audio/ogg; codecs="vorbis"');
```

An empty string means no. The failure mode if it is no is silence in that slot, not a broken
game, because of the fallback below — but it is a silent demo, so check.

**Size.** `-q:a 4` is nominally about 128 kbps VBR, so roughly 7.7 MB for an eight-minute
track. Only the track the current scene resolves to is ever fetched, and nothing is fetched
before the learner's first click. Note that eight minutes is well over the 90–240 second
windows the prompt sheet asks for; a shorter take is a smaller download and loops just as
well.

## Why -20 LUFS

The track arrives at -13.1 LUFS. That is a foreground level — hotter than the ~-14 that
streaming services normalise to — and it has to sit under sound effects and advisor
dialogue instead. -20 LUFS is the usual place a game music bed sits, about 7 dB down from
where Suno hands it over.

What makes it right *here* rather than merely conventional: the runtime already scales music
to a third of the effect volume (`MUSIC_VOLUME_SCALE` in `audioPrefs.ts`, about -9.6 dB), and
the shipped effects are trimmed timid on top of that. So the asset is not the whole mix and
should not try to be. Normalising every track to -20 buys the thing a runtime slider cannot:
era two is not louder than era one.

Changing it means re-converting every track already landed, which is why it is
`$TargetLufs` at the top of the script.

## A slot with no file

**All fifteen have landed** — the ten eras, the four crises in scope and the advance bed — so
no shipped row points at a missing file. Both properties below hold whichever state a slot is
in, and they are what a bad deploy, a deleted file or a browser that will not decode Ogg
Vorbis lands on.

- **No registry row** → the slot plays its stand-in. An era borrows the house track; a
  crisis and the ceremony leave the era's music alone. `eraMusic.ts` argues all three. Today
  that is the six shelved crises, which are owed nothing: no era and no ceremony is in this
  state any more.
- **A row whose file is missing** → the player marks that track unplayable off the element's
  `error` event, stops rebuilding it, and writes one `console.debug` line. Silence in that
  slot, nothing thrown, nothing in the console as an error, and no retry per reconcile.

So the tracks can land one at a time and no slot blocks another — and fourteen landing at once
without a line of selection or player code moving is that claim cashed rather than rehearsed.
`musicSlots.test.ts`, `music.test.ts` and `ceremonyMusic.test.ts` hold both properties, the
third for the ceremony slot in particular, and
`test/musicAssetsAreRegistered.test.ts` is the one that fails if a file is committed with no
row, which is the failure that let all fourteen sit inert once already.

**A missing ceremony bed costs the ceremony its music and costs the advance nothing**, which is
worth stating because the ceremony is the one slot whose absence could plausibly have broken
something else. It cannot: the handover to the next age is the era store moving, not anything
the file does, so a ceremony whose asset 404s runs in silence and the new age still comes up at
the advance press. `ceremonyMusic.test.ts` asserts that pair.

## Licensing — CLOSED. Suno Pro, and read this before you generate

The two questions this section used to pose are answered, and the answer is recorded in
`apps/web/public/audio/CREDITS.md` under *"Generated music: Suno Pro, generated
2026-08-04"*, which is the long form. In short: **the fourteen were generated on 2026-08-04
under an active Suno Pro subscription**, confirmed by the account holder; **Pro grants
commercial use of output generated while subscribed and those rights survive cancellation**;
and **no attribution is required**.

**What that leaves for step 1 of the five, and it belongs at step 1 rather than step 5.** This
is live rather than historical: the ceremony bed is still owed a generation.

1. **The right is not retroactive.** A track generated on the free tier is non-commercial
   permanently, and upgrading afterwards does not reach back to it. The only repair is to
   generate it again while subscribed, which costs the whole take. **So check the
   subscription is live before you paste a prompt**, not before you ship.
2. **Write the plan and the date down before the tab closes.** They are §G's two
   load-bearing facts, they exist only at generation time, and the date is the one nobody can
   recover later.
3. **Reuse `SUNO_PRO_LICENCE`** from `apps/web/src/audio/musicRegistry.ts` for a track
   generated on the same plan on the same day. **A different plan or a different day needs
   its own string**, because that constant is a record of one plan on one date rather than a
   general statement about Suno.
4. **There is no indemnification on Pro**, and US copyright does not vest in AI output, so
   what a generated track carries is permission to ship rather than ownership. Accepted for
   background music here; `CREDITS.md` records the reasoning.

## What was and was not verified

The script was run end to end against a **synthetic stand-in** built to match the real
file's measured properties (480 s, MP3, 192 kbps, 48 kHz stereo, one embedded MJPEG stream,
-13.37 LUFS at 0.80 LU). It converted to Ogg Vorbis at **-20.04 LUFS**, `Normalization
Type: Linear`, loudness range unchanged, with the video stream gone. Run from the repository
root, from an unrelated directory, and with both relative and absolute source paths.

**The fourteen OUTPUTS have since been measured, which is a different claim.** All fourteen
committed files decode as 48 kHz stereo Ogg Vorbis and land within 0.2 dB of the -20 LUFS
target, with loudness ranges of 3.8 to 7.7 LU; `CREDITS.md` carries the per-file table and
`test/musicAssetsAreRegistered.test.ts` re-derives every size and duration from the bytes on
every run. **Four of the fourteen came back outside their slot's requested length window** —
`era-classical` short and `era-industrial`, `era-atomic_age` and `era-cyberpunk` long — which
`CREDITS.md` names individually rather than aggregating.

**Not verified:** whether each conversion normalised linearly or dynamically, because that
needs the loudness range of the SOURCE and the sources are on the owner's machine and were
never available here; how any of it sounds, which is what §2's tenth-pass test is for; and
Safari.
