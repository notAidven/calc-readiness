/**
 * **THE DROP-IN REGISTRY: slot identifier to asset path, and nothing else.**
 *
 * This is the one file a music-procurement change touches. Landing a track is a row
 * here and a file in `public/audio/music/`; no component, no wiring, no player and no
 * selection code moves. `docs/superpowers/specs/2026-08-04-music-pipeline.md` is the
 * runbook, and `public/audio/CREDITS.md` carries the provenance row that the licence
 * rule makes non-negotiable.
 *
 * ## The slot identifiers are the fourteen from the generation prompts
 *
 * `era-<eraId>` for the ten eras and `crisis-<eraId>` for the four crises in scope, both
 * DERIVED in `eraMusic.ts` rather than written down anywhere, so there is no id here to
 * misspell into a permanent silent stand-in. The authoritative list is
 * `docs/superpowers/specs/2026-08-03-era-and-crisis-music-generation-prompts.md` (#515);
 * `musicSlots.test.ts` reads that document and requires the two to agree.
 *
 * ## Adding a track is one row
 *
 * ```ts
 * { id: "era-neolithic", title: "…", file: "music/era-neolithic.ogg",
 *   author: "Suno", license: "…", source: "…", seconds: 0, bytes: 0, note: "…" },
 * ```
 *
 * A slot with no row here plays its stand-in (`eraMusic.ts`), and a row whose FILE is
 * absent degrades to silence at the player rather than to an error (`music.ts`). Those
 * two together are what let the fourteen tracks land one at a time. **All fifteen slots
 * have now landed**, so no row that ships points at a missing file, and the second property
 * is measured rather than assumed: `test/musicAssetsAreRegistered.test.ts` requires every
 * row's file to exist and every committed file to have a row, in both directions. That is
 * the guard nobody had, and its absence is why the fourteen sat committed and inert.
 *
 * **The fifteenth slot is now filled, and the take is REAL.** `ceremony-advance` was
 * generated on 2026-08-05 and landed as `music/ceremony-advance.ogg`; it is a distinct file
 * from all fourteen and not one of them re-pointed. `eraToEraTransitionTrack.test.ts`
 * requires the bed to be a DISTINCT id from both ages at every seam, and
 * `test/eraTransitionTrackLedger.test.ts` fails if the registry, the directory, `CREDITS.md`
 * and the runbook stop agreeing about whether the take exists — in either direction, so this
 * row cannot be removed without the runbook's marker coming back.
 *
 * ## THE FIFTEEN GENERATED ROWS ARE CLEARED TO SHIP
 *
 * {@link SUNO_PRO_LICENCE} and {@link SUNO_PRO_LICENCE_2026_08_05} are why, and the split
 * between them is the point: the right rests on the plan that was active at the moment of
 * generation, it is **not** retroactive, and it carries no indemnification. The licensing
 * section of `public/audio/CREDITS.md` is the long form.
 */

export interface MusicTrack {
  /**
   * The slot this track fills: `era-<eraId>`, `crisis-<eraId>`, or a house track
   * belonging to no slot at all.
   */
  readonly id: string;
  /** Learner-facing name, used by the audio panel. */
  readonly title: string;
  /** Path under `public/audio/`. */
  readonly file: string;
  readonly author: string;
  readonly license: string;
  readonly source: string;
  readonly seconds: number;
  readonly bytes: number;
  /** Why this track was shortlisted, for whoever auditions the alternates. */
  readonly note: string;
}

/**
 * **THE LICENCE FIELD ALL FOURTEEN GENERATED TRACKS SHARE. CONFIRMED, AND IT IS TWO FACTS.**
 *
 * A generated track is not CC0, and what it *is* cannot be read off the file or off a URL.
 * `2026-08-01-era-and-crisis-music-brief.md` §6.6 established the structure and §F of the
 * prompts doc left it standing: **Suno's free tier grants non-commercial use only**, while
 * **Pro and Premier assign the output generated *"during the term of your paid-tier
 * subscription"*, and those rights survive cancellation**. So the right rests on which plan
 * was live at the moment of generation, plus the date, and that pair *"exists only at
 * generation time and cannot be reconstructed afterwards"*.
 *
 * **Both are now recorded. The product lead confirms an active Suno Pro subscription, and
 * the fourteen sources are dated 2026-08-04.** That makes them commercially usable, and
 * **it keeps them usable**: the assignment is scoped to output generated during the paid
 * term rather than conditioned on the term continuing, so it does not lapse if the
 * subscription does. **Attribution is not required on Pro.** These rows are credited
 * anyway, on the same principle `CREDITS.md` credits its CC0 assets under, which is that a
 * project unable to say where an asset came from cannot demonstrate it may use it.
 *
 * **THE DATE IS HERE BECAUSE IT IS THE HALF THAT ROTS.** Which plan somebody is on today is
 * a question anybody can answer today; which plan was live on the day a file was generated
 * is not recoverable from the file, from this repository, or from a later billing page. The
 * plan alone would leave a future reader unable to tell whether these fourteen predate the
 * subscription that covers them, so the two are written together and
 * `test/musicAssetsAreRegistered.test.ts` requires every date named here to be named in
 * `CREDITS.md` too.
 *
 * ## WHAT WHOEVER ADDS A SIXTEENTH NEEDS TO KNOW BEFORE THEY GENERATE
 *
 * **The right is not retroactive.** *"Upgrading later does not retroactively license a
 * free-tier track."* A track generated on the free tier stays non-commercial permanently and
 * the only repair is to generate it again while subscribed. That has to be read before
 * generating rather than after, which is why it is on the constant every new row will copy.
 *
 * **The permission is commercial; the copyright is not.** Suno offers **no indemnification**
 * on Pro, and its own terms warn that ownership of output does not guarantee
 * copyrightability. On §6.6's cited authorities a work generated entirely by a model has no
 * US copyright for anyone to hold, so what we have is permission to ship without a
 * defensible copyright and without a vendor standing behind it. The cost is **exclusivity**:
 * another product may ship something very close to these. Accepted for background music in a
 * study tool, and written down here rather than remembered.
 *
 * One shared constant rather than fourteen copies, because one plan on one date covers all
 * fourteen. If a later track is generated on a different plan or a different day it needs
 * its own string, not an edit to this one.
 */
export const SUNO_PRO_LICENCE =
  "Commercial licence per Suno's terms, assigned as generated on 2026-08-04 under an " +
  "active Suno Pro subscription. The grant is scoped to output generated during the paid " +
  "term and survives cancellation, so it does not lapse with the plan. Attribution is not " +
  "required on Pro. Suno offers no indemnification and US copyright does not vest in AI " +
  "output, so this is permission to ship rather than ownership and no exclusivity is " +
  "claimed. A track generated on the free tier is NOT covered and cannot be upgraded into " +
  "coverage; it has to be generated again while subscribed. See the licensing section of " +
  "public/audio/CREDITS.md.";

/**
 * **THE CEREMONY BED'S LICENCE, WHICH IS A DIFFERENT DAY AND THEREFORE A DIFFERENT STRING.**
 *
 * {@link SUNO_PRO_LICENCE} closes by saying that a track generated on a different plan or a
 * different day *"needs its own string, not an edit to this one"*. `ceremony-advance` was
 * generated on **2026-08-05**, the day after the batch of fourteen, so this is that string
 * and editing the date on the other constant would have been the error it warns about.
 *
 * Same plan, same terms, one day later. The plan is Suno Pro and the account holder confirms
 * it was active on both days; what cannot be reconstructed later is *which* day each file was
 * made, which is exactly why the two dates are kept apart rather than averaged into one
 * claim. `test/musicAssetsAreRegistered.test.ts` requires every date named in this file to
 * appear in `CREDITS.md`, so neither constant can drift away from the record a human reads.
 */
export const SUNO_PRO_LICENCE_2026_08_05 =
  "Commercial licence per Suno's terms, assigned as generated on 2026-08-05 under an " +
  "active Suno Pro subscription. The grant is scoped to output generated during the paid " +
  "term and survives cancellation, so it does not lapse with the plan. Attribution is not " +
  "required on Pro. Suno offers no indemnification and US copyright does not vest in AI " +
  "output, so this is permission to ship rather than ownership and no exclusivity is " +
  "claimed. A track generated on the free tier is NOT covered and cannot be upgraded into " +
  "coverage; it has to be generated again while subscribed. See the licensing section of " +
  "public/audio/CREDITS.md.";

/**
 * Where a generated track came from, which for a generation is **the prompt** and not a
 * URL to the audio.
 *
 * §G of the prompts doc names four facts that have to be captured at generation time. The
 * prompt is this one; the plan and the date are {@link SUNO_PRO_LICENCE}'s. Every row points
 * at the same sheet and **the slot to read there is the row's own `id`**, which is also the
 * `###` heading in §C and §E, so there is no per-row anchor to misspell.
 *
 * §G's fourth fact, the model version, was not recorded, and the per-generation Suno URLs
 * were not either. Neither is load-bearing for the licence, which turns on the plan and the
 * date; both are noted in `CREDITS.md` so that a reader can tell a gap from an omission.
 */
const PROMPT_SHEET =
  "https://github.com/notAidven/calc-readiness/blob/main/docs/superpowers/" +
  "specs/2026-08-03-era-and-crisis-music-generation-prompts.md";

/** What every generated row shares: one author, one licence, one prompt sheet. */
const GENERATED = {
  author: "Suno (generated)",
  license: SUNO_PRO_LICENCE,
  source: PROMPT_SHEET,
} as const;

/**
 * EVERY TRACK THAT SHIPS, in preference order.
 *
 * The two house tracks are CC0 (public domain), so neither carries an attribution
 * obligation; `CREDITS.md` records them anyway because a project that cannot say where a
 * file came from cannot prove it is allowed to use it. **A generated track is not CC0** and
 * its `license` field is {@link SUNO_PRO_LICENCE}, which is the same principle applied to a
 * grant that also asks for no attribution: credited because provenance is the point, not
 * because anything obliges it.
 *
 * **The two house tracks stay FIRST**, so that {@link trackById}'s fallback for an unknown
 * id is a CC0 file, and because `music.test.ts` reads entries zero and one as its two
 * known-good tracks. That is now a preference rather than a licence precaution: all
 * seventeen are cleared to ship.
 *
 * `seconds` and `bytes` are **measured from the committed file**, the duration from each
 * Ogg stream's last-page granule position divided by the 48 kHz sample rate (cross-checked
 * with `ffprobe`) and the size from `stat`. They are not the conversion script's report
 * recalled, and they are not estimates; `test/musicAssetsAreRegistered.test.ts` re-derives
 * both from the bytes on every run.
 *
 * Typed as a NON-EMPTY tuple so the first entry is statically guaranteed to exist —
 * that is what lets {@link trackById} fall back to it without a possibly-undefined
 * check, and it means deleting every track would be a compile error rather than a
 * soundtrack that silently resolves to nothing.
 */
export const MUSIC_TRACKS: readonly [MusicTrack, ...MusicTrack[]] = [
  /* ---------------------------------------------- house tracks, belonging to no slot */
  {
    id: "town-theme",
    title: "Town Theme",
    file: "music/town-theme.mp3",
    author: "cynicmusic (Pixelsphere)",
    license: "CC0 1.0",
    source: "https://opengameart.org/content/town-theme-rpg",
    seconds: 97,
    bytes: 1_316_581,
    note: "The default. The longest loop of the three, which matters most for a long session: at 97s the repeat is far enough apart that it recedes into ambience instead of nagging.",
  },
  {
    id: "a-new-town",
    title: "A New Town",
    file: "music/a-new-town.mp3",
    author: "cynicmusic (Pixelsphere)",
    license: "CC0 1.0",
    source: "https://opengameart.org/content/a-new-town-rpg-theme",
    seconds: 62,
    bytes: 766_291,
    note: "Sparser and about half the bytes. The better pick if the default still feels too present behind the maths; the shorter 62s loop is the trade.",
  },
  /* ------------------------------------------- the ten eras, in ERA_SEQUENCE order */
  {
    id: "era-prehistoric",
    title: "Prehistoric Era",
    file: "music/era-prehistoric.ogg",
    ...GENERATED,
    seconds: 149,
    bytes: 1_986_929,
    note: "Era one's signature is that nothing repeats identically, so the hand-made kit varies its figure instead of looping a bar. The only era with authored lessons, which makes this the track a learner hears longest.",
  },
  {
    id: "era-neolithic",
    title: "Neolithic Era",
    file: "music/era-neolithic.ogg",
    ...GENERATED,
    seconds: 160,
    bytes: 2_139_923,
    note: "Era two is where the loop is invented: a settled pulse where era one had none. The one slot the picks sheet recorded as genuinely empty in the free libraries, so generation was the primary route here rather than the fallback.",
  },
  {
    id: "era-bronze_age",
    title: "Bronze Age",
    file: "music/era-bronze_age.ogg",
    ...GENERATED,
    seconds: 139,
    bytes: 1_975_515,
    note: "Metal at the joint: the piece is otherwise plain and a single struck note marks each structural seam, which is era three's whole idea for the cost of one sound.",
  },
  {
    id: "era-classical",
    title: "Classical Era",
    file: "music/era-classical.ogg",
    ...GENERATED,
    seconds: 114,
    bytes: 1_529_585,
    note: "The module is countable, in phrases a listener could count without being asked to. The shortest of the fourteen, and one of the four takes that came back outside its slot's requested window: CREDITS.md names all four rather than the one.",
  },
  {
    id: "era-medieval",
    title: "Medieval Era",
    file: "music/era-medieval.ogg",
    ...GENERATED,
    seconds: 175,
    bytes: 2_452_156,
    note: "The structure is on the outside: modal, plucked and a little austere, with the joins left showing rather than smoothed over.",
  },
  {
    id: "era-renaissance",
    title: "Early Modern",
    file: "music/era-renaissance.ogg",
    ...GENERATED,
    seconds: 174,
    bytes: 2_481_507,
    note: "Symmetry as a system, which is why this is the first slot with real harmony under it: era six is the one that puts things in their place.",
  },
  {
    id: "era-industrial",
    title: "Industrial Era",
    file: "music/era-industrial.ogg",
    ...GENERATED,
    seconds: 193,
    bytes: 2_948_577,
    note: "Era seven has no natural end, which is the signature rather than a flaw: a mechanical figure that repeats without arriving anywhere.",
  },
  {
    id: "era-atomic_age",
    title: "Atomic Age",
    file: "music/era-atomic_age.ogg",
    ...GENERATED,
    seconds: 198,
    bytes: 2_583_105,
    note: "The melody carries no visible load: bright, optimistic and brisk, and deliberately not the fastest track in the game, because a soundtrack that accelerates across ten eras is urgency framing built into the structure.",
  },
  {
    id: "era-information_age",
    title: "Information Age",
    file: "music/era-information_age.ogg",
    ...GENERATED,
    seconds: 200,
    bytes: 2_776_772,
    note: "Era nine explains nothing about itself: a clean electronic pulse, low and steady, and never busy.",
  },
  {
    id: "era-cyberpunk",
    title: "Cyberpunk Era",
    file: "music/era-cyberpunk.ogg",
    ...GENERATED,
    seconds: 215,
    bytes: 3_201_516,
    note: "The ornament is attached and the box is plain. Synthetic and wide, the longest of the fourteen, and still quiet enough to work under.",
  },
  /* ------------------------- the four crises in scope, D-CRISIS-33's eras 1, 4, 6 and 9 */
  {
    id: "crisis-prehistoric",
    title: "The Hard Winter",
    file: "music/crisis-prehistoric.ogg",
    ...GENERATED,
    seconds: 205,
    bytes: 2_749_066,
    note: "The Hard Winter, and the only crisis a learner can reach today. Era one's kit thinned rather than a new kit, with no percussion driving forward, because the winter waits for the player and the music must not say otherwise.",
  },
  {
    id: "crisis-classical",
    title: "The Succession",
    file: "music/crisis-classical.ogg",
    ...GENERATED,
    seconds: 147,
    bytes: 2_079_531,
    note: "The Succession, era four's kit thinned. Serious rather than cold: a room of people deciding, with nothing destroyed and everything at stake.",
  },
  {
    id: "crisis-renaissance",
    title: "The Plague",
    file: "music/crisis-renaissance.ogg",
    ...GENERATED,
    seconds: 160,
    bytes: 2_280_929,
    note: "The Plague, era six's kit thinned. Sparse and echoing, a city with its people indoors.",
  },
  {
    id: "crisis-information_age",
    title: "The Intrusion",
    file: "music/crisis-information_age.ogg",
    ...GENERATED,
    seconds: 183,
    bytes: 2_649_289,
    note: "The Intrusion, era nine's kit thinned. The one of the four that is nearly beatless, which is what its brief asked for, and warm rather than cold because a dark scene would be a lie about that era.",
  },
  /* ----------------------------------- the fifteenth slot: the era-to-era transition bed */
  {
    id: "ceremony-advance",
    title: "The Advance",
    file: "music/ceremony-advance.ogg",
    ...GENERATED,
    license: SUNO_PRO_LICENCE_2026_08_05,
    seconds: 154,
    bytes: 1_835_473,
    note: "The one bed belonging to no age, under all nine era-to-era seams. Period-neutral on purpose: it may not sound like the age being left or the age being entered, because it plays across the join between them. Generated a day after the fourteen, which is why its licence constant is its own.",
  },
];

/**
 * The track a player plays before anything has selected one.
 *
 * **This used to be the one-line swap that chose the game's soundtrack, and it is not
 * that any more**: the era chooses, in `eraMusic.ts`. What is left is the value a
 * `createMusicPlayer` with no `trackId` starts on: a test, or the app-wide singleton
 * in the moment between module load and `useGameAudio`'s first reconcile.
 *
 * **That moment used to contain no swap, because era one resolved here too, and now it
 * does contain one.** Era one has its own track, so the singleton is constructed on the
 * house track and moves to `era-prehistoric` on the first reconcile. That costs nothing
 * and is inaudible, for a reason worth stating rather than trusting: `sync()` builds the
 * element on FIRST WANT and nothing wants until the gesture gate opens, so the swap
 * happens with `element === null`, which `setTrack` handles as a park with nothing to
 * park. No fade, no `play()`, and not one byte of the house track fetched.
 * `music.test.ts`'s *"fetches nothing when the era moves before the learner's first
 * click"* is that property, and `landedTracksPlay.test.ts` pins the swap itself so it
 * cannot become audible by accident.
 *
 * **No scene a learner can reach resolves here any more either.** All ten eras have their
 * own track, so `trackIdForEra` never reaches `eraMusic.ts`'s `HOUSE_STAND_IN`. This is now
 * the safety net for a row that is WITHDRAWN rather than the answer any era gives, which is
 * why it stays pointed at a CC0 file whose right to ship is settled.
 */
export const DEFAULT_TRACK_ID = "town-theme";

export function trackById(id: string): MusicTrack {
  return MUSIC_TRACKS.find((track) => track.id === id) ?? MUSIC_TRACKS[0];
}
