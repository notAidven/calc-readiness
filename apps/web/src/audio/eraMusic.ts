/**
 * WHICH TRACK PLAYS: the soundtrack's selection half, over two dimensions.
 *
 * `music.ts` owns the player and knows nothing about eras or crises. This module owns the
 * selection and knows nothing about playing. They meet in `useAudio.ts`, which resolves a
 * {@link MusicScene} and hands the player a track id every time it reconciles.
 *
 * ## THE SELECTION FUNCTION, IN ONE LINE
 *
 * `track = ceremony(advanceCeremony) ?? crisis(activeCrisisEra) ?? era(cityEra)`. **A
 * crisis outranks the era while it runs**, on the lead's ruling that *"each era has its own
 * track, and crises also have their own track"*, and **the era-advance ceremony outranks
 * both** — see the ceremony section below. Nothing else is an input: not mastery, not the
 * trial, not the time of day. See {@link trackIdForScene}.
 *
 * ## THE FIFTEENTH SLOT SCORES A MOMENT RATHER THAN A PLACE, AND IT IS STILL A LOOP
 *
 * {@link CEREMONY_SLOT_TRACK_ID} scores the era-advance ceremony, and it is **one track for
 * all ten advances** rather than one per era: it is the same ritual every time, and ten
 * variants would dilute exactly what makes it read as a ritual. So its id is a constant
 * here rather than derived from an era, which is the one place this module writes an id
 * down — because there is one of it, not ten, and nothing to key it by.
 *
 * **Why the slot exists at all.** Without it an era advance has to jump from one era's
 * track to the next at some moment, and there is no good moment: two unrelated period beds
 * crossfading while the learner is answering questions says nothing about the ritual
 * happening on screen. This slot's job is to BE that bridge — the outgoing age's music gives
 * way to it, it carries the whole crossing, and the incoming age arrives when the learner
 * does.
 *
 * ## THE SLOT WAS CANCELLED AND THEN REINSTATED, SO DO NOT REMOVE IT AGAIN QUIETLY
 *
 * #556 added this slot and merged. It was then cancelled, on a ruling that an advance should
 * simply keep playing the era's own track, and #605 implements that cancellation — but the
 * lead reversed himself while that PR was still an open draft: *"also i take back what i said
 * about there not being a specific era transition song - there should be for the era-to-era
 * transitions for better feel."* #605 was closed unmerged, so **the removal never reached
 * `integration` and there is nothing here to restore**; the reinstated ruling is the one this
 * module already implements.
 *
 * It is recorded here rather than left in a closed PR because the removal is still written
 * down in more than one open branch, and a closed PR is not something a merge conflict makes
 * anybody read. `eraToEraTransitionTrack.test.ts` is where a third reversal fails: it walks
 * all nine era-to-era seams and requires the bed to be a DISTINCT id from both the age being
 * left and the age being entered, so cancelling this again is a test to delete deliberately
 * rather than a slot to drop in passing.
 *
 * ## THIS WAS FIRST WRITTEN AS A CUE THAT RESOLVES, AND THAT WAS WRONG
 *
 * Recorded rather than quietly corrected, because the prompt sheet said the opposite in
 * capitals and a track may have been generated against it. The first version made this the
 * one file in the game that resolves: 40 to 55 seconds, an arc, a real cadence, and the
 * cadence was the handover — the incoming era's track came up when the cue ended.
 *
 * **The lead found the hole:** the transition music has to tolerate an answer-paced exam rather
 * than resolve on a fixed clock. The old length had been set against a retired catch-up timer.
 * **The advance is answer-paced and asks two checks per
 * node**, and at the rate the specs already use it runs **3.6 minutes at a five-node era to
 * 6.3 at a nine-node one on a flawless run, and past ten minutes with misses**
 * (`city/ceremonyLength.test.ts` measures it, and `2026-08-01-test-out-experience-review.md`
 * independently walks era one's advance at four minutes, twice). So a 48-second cue covered
 * about a fifth of the shortest possible advance and then handed over to the DESTINATION
 * era's music while the learner was still answering questions to earn that destination. The
 * music arrived before they did, and the handover mechanism is what made the error audible.
 *
 * ## SO IT IS A BED, AND THE CADENCE IS THE BELL
 *
 * A passage that cannot know its own length has three available shapes: write for the
 * longest case and fade, write it so it can skip ahead, or write it so **every moment is a
 * legitimate place to stop**. The first two are unavailable here — there is no longest case,
 * since a learner at 50% accuracy never finishes at all by `eraCeremony.ts`'s own ruling, and
 * skipping needs boundaries a generated file does not carry. So the third, which means a
 * loop.
 *
 * **What makes that cost nothing is that the ceremony's arrival is already scored.**
 * `era-advance.ogg` is a struck temple bell fired on the press that performs the advance —
 * measured, essentially a pure 1023 Hz tone with 97.5% of its energy in one octave band — and
 * it is the last sound of the occasion. **If the bell is the cadence, the music does not need
 * one.** So this slot keeps the arrival and gives up nothing: the bed is stoppable anywhere
 * because a bed has no arrival to miss, and the moment still resolves because an effect
 * resolves it, at exactly the right instant, deterministically.
 *
 * That is why a second resolving STING was refused rather than added as a sixteenth slot: the
 * instant already has a sound, and a musical cadence at 1 kHz would fight the one narrow band
 * the bell occupies.
 *
 * ## THE HANDOVER IS THE ERA MOVING, WHICH NEEDS NO MECHANISM AT ALL
 *
 * The bed plays while the city is still standing in the age the ceremony belongs to, and
 * stops the moment `setCityEra` moves it — which is the advance press, under the bell. See
 * {@link trackIdForScene}'s era-equality test, which is deliberately not an unmount test: the
 * store clearing and the era moving are two writes on one press, and keying off the era makes
 * the handover independent of which lands first. Keying off the unmount would produce a flash
 * of the OUTGOING age's music between the ceremony and the new one, on the ordering nobody
 * would have thought to check.
 *
 * **The catch-up's replayed foundings do NOT play it**, and that is `activeCeremony.ts`'s
 * ruling with `ceremonyMusicSkipsRecaps.test.tsx` behind it.
 *
 * ## ONE TRACK PER ERA, ONE TRACK PER CRISIS, AND FOURTEEN OF THE FIFTEEN ACQUIRED
 *
 * The mapping is **one-to-one by construction**. There is no grouping here, no era-band,
 * and no "everything else plays the default": every era names its own slot and every
 * crisis names its own, so nothing can be quietly folded in with a neighbour.
 *
 * What there is instead is a **stand-in**, declared per slot and derived rather than
 * asserted: a slot whose track id is not in {@link MUSIC_TRACKS} plays its
 * {@link TrackSlot.standIn} until the file arrives, and {@link standingInSlots} reports
 * exactly which ones those are by reading the shipped table. **Today that is seven of the
 * twenty-one**: the six crises D-CRISIS-33 shelved, which are owed nothing, and the one
 * ceremony bed, which is owed a take nobody has generated. **The other fourteen have
 * landed** — ten era tracks and the four crises in scope — so every era a learner can stand
 * in and every crisis they can enter plays its own music, and this module changes a great
 * deal of what a learner hears while changing not one line of code to do it. That is the
 * drop-in claim cashed rather than rehearsed.
 *
 * **The shortfall is a measurement, not a sentence.** {@link standingInSlots} reads
 * `MUSIC_TRACKS`, so a track that lands leaves the list on the run it is registered and one
 * withdrawn rejoins it; `eraMusic.test.ts` asserts the seven by composition rather than by
 * count, because a floor of seven is satisfied by the wrong seven.
 *
 * ## WHAT A PROCUREMENT PR TOUCHES: `musicRegistry.ts`, AND NOTHING ELSE
 *
 * **An era's or a crisis's track id is derived from the slot, never written down**:
 * `era-<eraId>` and `crisis-<eraId>`, from {@link eraSlotTrackId} and
 * {@link crisisSlotTrackId}. So there is no id there to misspell and no row to remember to
 * flip. The ceremony's is {@link CEREMONY_SLOT_TRACK_ID}, a constant for the reason given
 * above. Landing era two's music is one entry in `MUSIC_TRACKS`, which lives in
 * `musicRegistry.ts`:
 *
 * ```ts
 * { id: "era-neolithic", title: "…", file: "music/…", playback: "loop", author, license,
 *   source, seconds, bytes, note }
 * ```
 *
 * plus its row in `public/audio/CREDITS.md`, which the provenance rule requires of every
 * file and which is not negotiable. Nothing in this file, in the player, in the wiring or
 * in any component moves — **and that is now a fact rather than a forecast: fourteen tracks
 * landed at once and this file did not change a line of code.** `musicSlots.test.ts`
 * rehearses the drop-in once for each of the fifteen slots, and
 * `landedTracksPlay.test.ts` drives the shipped table through the real reconciler to show
 * that the fourteen are reached rather than merely tabulated.
 *
 * The ids those fifteen slots derive are required to match the generation prompts of
 * `2026-08-03-era-and-crisis-music-generation-prompts.md`, which `musicSlots.test.ts`
 * checks by reading that document rather than by copying its list.
 *
 * ## THE STAND-IN RULES, AND THE ONE THAT IS A DESIGN DECISION
 *
 * - **An era with no track of its own borrows the house track** ({@link HOUSE_STAND_IN},
 *   which is `DEFAULT_TRACK_ID`, so the one-word swap that used to choose the game's
 *   soundtrack still chooses what an unscored era would borrow). **No era is in that state
 *   any more**: all ten have landed, so this rule is now the answer for a row that is
 *   WITHDRAWN rather than one that has not arrived. It stays, and it stays pointed at a CC0
 *   file, because a fallback whose own right to ship is settled is what a fallback is for.
 * - **A crisis with no track of its own does not change the music at all**
 *   ({@link ERA_STAND_IN}). That is **the six crises D-CRISIS-33 shelved** and nothing else:
 *   the four in scope have their own tracks. **This is a decision and the alternative was
 *   real**: the second shipped track, `a-new-town`, could stand in so that a crisis is at
 *   least *distinguishable*. It is refused because it is a bright RPG town theme, and
 *   swapping to one when a crisis arrives is not a smaller version of crisis music,
 *   it is the wrong feeling shipped and then un-shipped later.
 *   `Game_Visual_Design_Brief.md` keeps celebration amplitude low and earned; the same
 *   restraint applies to dread. Overruling this is one edit: point a crisis row's
 *   `standIn` at `{ to: "track", trackId: "a-new-town" }`.
 * - **A CEREMONY with no cue of its own does not change the music either**
 *   ({@link ERA_STAND_IN} again, and {@link CEREMONY_MUSIC} carries it). That is what let the
 *   fifteenth slot ship empty for as long as it did without changing a single thing a learner
 *   heard at an advance: the era's music played straight through it and the new era's track
 *   came up at the advance press, which is exactly what it did before this slot existed. The
 *   stand-in is deliberately NOT the house track: an advance out of an era that HAS its own
 *   music would then drop to a generic RPG town theme for the length of the ceremony, which
 *   is a worse soundtrack than the one it replaced. **That hypothetical was every case**,
 *   since all ten eras have their own music, so the choice of stand-in stopped being
 *   theoretical the day the fourteen landed.
 *
 *   **THE STAND-IN IS NO LONGER REACHED, because the take landed on 2026-08-05.** While the
 *   slot was empty it played the outgoing era's ambient track through an advance, which is
 *   precisely the arrangement the lead reversed; that was the least-bad placeholder and never
 *   the feature. `music/ceremony-advance.ogg` is now committed and registered, so an advance
 *   plays a bed belonging to neither age, and the runbook's "STILL TO GENERATE" marker has
 *   been retired. `test/eraTransitionTrackLedger.test.ts` fails whenever the marker and the
 *   tree disagree in either direction, so the marker cannot come back without the row going.
 *
 *   **The stand-in stays in the code anyway, and is not dead.** It is the answer if the row
 *   is ever WITHDRAWN — a bad deploy, a deleted file, a slot-removing branch merged without
 *   reading — and the era's own track remains the right thing to fall back to for the reason
 *   above. What it must not become is the shipped behaviour again: the bed has to be
 *   period-neutral and distinct from both ages at every seam, which is what
 *   `eraToEraTransitionTrack.test.ts` measures, now over the shipped manifest as well as a
 *   synthesised one.
 *
 * ## ONE CRISIS TRACK OR ONE PER CRISIS
 *
 * **Assumed: one per crisis**, because the lead's sentence pairs crises with eras and the
 * eras are one-to-one. {@link CRISIS_MUSIC} is keyed by the era whose crisis it is, so the
 * four in scope (**eras 1, 4, 6 and 9**: the Hard Winter, the Succession Crisis, the
 * Plague and the Intrusion, per `2026-07-29-mid-era-crisis-design.md` D-CRISIS-33) each
 * name a distinct slot. **The assumption was then acted on**: four distinct takes were
 * generated and all four have landed, so this is the shipped reading rather than the
 * pending one. **The cheaper reading is still expressible with no change of shape**: to
 * ship one crisis track for all four, register it once in `MUSIC_TRACKS` and point the
 * four rows' `standIn` at it. Nothing about the selection, the player or the wiring cares
 * which of the two is chosen, and `eraMusic.test.ts` still rehearses that alternative.
 *
 * The record is total over every era rather than holding only the four, for the same
 * reason `ERA_MUSIC` is: a crisis added to an era later cannot then arrive with no answer,
 * and this module does not become a second, drifting copy of which eras are in scope.
 *
 * ## `INV-COS-1`: MUSIC GATES NOTHING
 *
 * The dependency runs one way. This module reads the era and whether a crisis is running,
 * to pick a filename. Nothing in the progression, the economy or the lesson layer reads it
 * back, and nothing here returns a value anything could gate on. `eraMusic.test.ts` pins
 * the direction of that edge over the tree rather than leaving it as a claim.
 */

import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";

import {
  DEFAULT_TRACK_ID,
  MUSIC_TRACKS,
  type MusicTrack,
  trackById,
} from "./musicRegistry";

/** What a slot borrows while the track it names has not been acquired. */
export type MusicStandIn =
  /** A shipped track, by id. */
  | { readonly to: "track"; readonly trackId: string }
  /**
   * Whatever the era is playing, so the music does not change. Meaningful for a crisis
   * slot and for the ceremony slot, both of which sit ON TOP of an era rather than
   * replacing which era the city is in; an era slot resolving to this would have nothing
   * to resolve to, which `eraMusic.test.ts` rules out rather than leaving to a reader.
   */
  | { readonly to: "era" };

export interface TrackSlot {
  /** What plays until this slot's own track ships. */
  readonly standIn: MusicStandIn;
  /**
   * THE STANDING ORDER FOR WHOEVER SOURCES IT. One sentence naming the moment the track
   * is for, so a procurement pass reads this file rather than re-deriving the brief from
   * the era rationales. It is the only per-slot content, which is the honest shape for a
   * feature whose whole remaining cost is acquisition.
   */
  readonly brief: string;
}

/** The house track an unscored ERA borrows. One word, and every unscored era follows. */
export const HOUSE_STAND_IN: MusicStandIn = { to: "track", trackId: DEFAULT_TRACK_ID };

/** An unscored CRISIS does not change the music. See the header for why, and for the
 *  alternative that was refused. */
export const ERA_STAND_IN: MusicStandIn = { to: "era" };

/**
 * The track id an era's own score would ship under. **Derived, never written down**, so
 * there is no id in the manifest to misspell into a permanent silent stand-in.
 */
export function eraSlotTrackId(eraId: EraId): string {
  return `era-${eraId}`;
}

/** The track id an era's crisis score would ship under. Derived, for the same reason. */
export function crisisSlotTrackId(eraId: EraId): string {
  return `crisis-${eraId}`;
}

/**
 * **THE FIFTEENTH SLOT. One cue for all ten era advances.**
 *
 * Written down rather than derived, and that is the honest shape: the other fourteen ids
 * are derived because there are ten of one and four of the other and a per-era key to
 * derive them from. There is exactly ONE ceremony cue, so there is nothing to key it by,
 * and a `ceremonySlotTrackId(eraId)` that ignored its argument would be a derivation in
 * name only — it would advertise ten slots and answer with one.
 *
 * **One rather than ten is the design and not a saving.** An era advance is the same ritual
 * at every one of the nine seams: the city gathers, the island makes room, the hall is
 * rebuilt, the age turns. Ten variants would spend nine acquisitions diluting the thing
 * that makes it read as a ritual, which is that a learner recognises it. This is
 * `2026-08-01-era-and-crisis-music-brief.md` §5.1's argument for one shared crisis track,
 * and unlike that one it is not overruled: the lead's *"each era has its own track"* is
 * about eras and crises, and the ceremony is neither.
 *
 * The name is `ceremony-`, matching the ceremony's own sound-effect family
 * (`ceremony-expansion`, `ceremony-rebuild`), with `-advance` for the whole ritual rather
 * than one of its beats. It is deliberately NOT `era-advance`: that is already the name of
 * the struck bell the advance press plays (`soundEffects.ts`), and an `era-` prefix would
 * also make this look like an eleventh era to every reader that parses the derived ids.
 */
export const CEREMONY_SLOT_TRACK_ID = "ceremony-advance";

/**
 * **THERE IS NO PER-SLOT PLAYBACK SETTING, and its absence is a decision worth recording**
 * because an earlier version of this module had one.
 *
 * While the ceremony slot was going to be a cue that resolves, this file carried a
 * `slotPlayback(): "loop" | "cue"` derivation and `MusicTrack` carried a required `playback`
 * field, and the player cleared `element.loop` and reported the file's end so the soundtrack
 * could hand over at the cadence. **All fifteen slots wrap now**, so a union with one
 * inhabited variant would be a decision that looks made and is not, and four mechanisms —
 * the field, the `ended` listener, `onTrackEnded`, and the spent-cue latch — would be
 * unreachable in a tree whose own `CREDITS.md` records what an unexercised sample cost last
 * time. They came out together. **`music.ts` is byte-identical to what #536 shipped**, and
 * this feature touches the player not at all.
 *
 * The requirement did not go away, it moved to where a guard can measure it rather than
 * declare it: `ceremonyMusic.test.ts` drives the real player over every slot in the manifest
 * and requires `element.loop`, so the ceremony slot cannot become an exception by accident.
 */

/**
 * EVERY ERA'S OWN TRACK. A **total** `Record<EraId, TrackSlot>`, so an eleventh era added
 * to `ERA_SEQUENCE` without a row does not typecheck. And because a compile error is not
 * something a test run reports, `eraMusic.test.ts` asserts the same totality as a census
 * against `ERA_SEQUENCE`, in both directions, with a floor under it. One-to-one mappings
 * are a bigger surface for an omission than a grouped map, which is why both guards exist
 * rather than one.
 *
 * Each brief is written from that era's own `rationale` in `packages/skill-graph/src/eras.ts`,
 * so the music and the curriculum describe the same chapter.
 */
export const ERA_MUSIC: Record<EraId, TrackSlot> = {
  prehistoric: {
    standIn: HOUSE_STAND_IN,
    brief:
      "Counting, tallying, sharing a kill. Sparse and hand-made: skin drums, a bone " +
      "flute, no harmony. The only era with authored lessons, so it is the track a " +
      "learner hears longest and the one to acquire first. What plays here today is the " +
      "shipped town theme, which is a fine loop and is not prehistoric.",
  },
  neolithic: {
    standIn: HOUSE_STAND_IN,
    brief:
      "First settlements and agriculture. Warm, pastoral, a settled pulse where era one " +
      "had none.",
  },
  bronze_age: {
    standIn: HOUSE_STAND_IN,
    brief: "Trade on a balance scale. Metal struck, a walking bass, the first melody.",
  },
  classical: {
    standIn: HOUSE_STAND_IN,
    brief: "Geometric algebra on a wax tablet. Lyre and reed, orderly, unhurried.",
  },
  medieval: {
    standIn: HOUSE_STAND_IN,
    brief: "Guild ledgers and tithes. Modal, plucked, a little austere.",
  },
  renaissance: {
    standIn: HOUSE_STAND_IN,
    brief:
      "Perspective, surveying, curves on axes. The first track with real harmony under " +
      "it, because this is the era that puts things in their place.",
  },
  industrial: {
    standIn: HOUSE_STAND_IN,
    brief: "A machine is input to output. Rhythmic, mechanical, repeating without nagging.",
  },
  atomic_age: {
    standIn: HOUSE_STAND_IN,
    brief: "The century that measured everything per hour. Bright, optimistic, brisk.",
  },
  information_age: {
    standIn: HOUSE_STAND_IN,
    brief: "Doubling transistors. Clean electronic pulse, low and steady, never busy.",
  },
  cyberpunk: {
    standIn: HOUSE_STAND_IN,
    brief:
      "Waves, signals, rendering. Synthetic and wide, and still quiet enough to work " +
      "under, which is the constraint every one of these inherits.",
  },
};

/**
 * EVERY ERA'S CRISIS TRACK, keyed by the era whose crisis it is.
 *
 * Total over `EraId` on purpose. Four crises are in scope (eras 1, 4, 6 and 9); the other
 * six were shelved by D-CRISIS-33 and their rows say so. Holding only the four would make
 * this a second copy of a scope decision that lives in another document and can move (it
 * already moved once, from eras 1 / 4 / 7 / 10), and a shelved era that came back would
 * arrive here with no answer at all.
 */
export const CRISIS_MUSIC: Record<EraId, TrackSlot> = {
  prehistoric: {
    standIn: ERA_STAND_IN,
    brief:
      "THE HARD WINTER, and the only crisis a learner can enter today, so it is the " +
      "crisis track to acquire first. Cold, thin and still: the frost takes the island a " +
      "step at a time and nothing about it is a chase. No percussion driving forward, " +
      "because the winter waits for the player and the music must not say otherwise.",
  },
  neolithic: {
    standIn: ERA_STAND_IN,
    brief: "No crisis in scope for this era (D-CRISIS-33 shelved it). No track owed.",
  },
  bronze_age: {
    standIn: ERA_STAND_IN,
    brief: "No crisis in scope for this era (D-CRISIS-33 shelved it). No track owed.",
  },
  classical: {
    standIn: ERA_STAND_IN,
    brief:
      "THE SUCCESSION CRISIS. Tense and political rather than cold: held strings, a room " +
      "of people deciding, nothing destroyed and everything at stake.",
  },
  medieval: {
    standIn: ERA_STAND_IN,
    brief: "No crisis in scope for this era (D-CRISIS-33 shelved it). No track owed.",
  },
  renaissance: {
    standIn: ERA_STAND_IN,
    brief: "THE PLAGUE. Emptied streets. Sparse, echoing, a city with its people indoors.",
  },
  industrial: {
    standIn: ERA_STAND_IN,
    brief: "No crisis in scope for this era (D-CRISIS-33 shelved it). No track owed.",
  },
  atomic_age: {
    standIn: ERA_STAND_IN,
    brief: "No crisis in scope for this era (D-CRISIS-33 shelved it). No track owed.",
  },
  information_age: {
    standIn: ERA_STAND_IN,
    brief:
      "THE INTRUSION. Something is in the system. Low, watchful, electronic, and the " +
      "only one of the four that may be nearly beatless.",
  },
  cyberpunk: {
    standIn: ERA_STAND_IN,
    brief: "No crisis in scope for this era (D-CRISIS-33 shelved it). No track owed.",
  },
};

/**
 * THE ERA-ADVANCE CEREMONY'S CUE. **One slot, no era key, and the only cue in the game.**
 *
 * Not a `Record<EraId, TrackSlot>` like the two above, and that is the shape the design
 * asks for rather than a shortcut: there is one ritual and one cue for it, so a record
 * would advertise ten sourcing decisions where there is one, and the "in scope / shelved"
 * drift the crisis record is total to prevent has no analogue here.
 */
export const CEREMONY_MUSIC: TrackSlot = {
  standIn: ERA_STAND_IN,
  brief:
    "THE ERA-ADVANCE CEREMONY. A BED, not a fanfare and not a cue: the advance is " +
    "answer-paced and runs 3.6 to over 10 minutes, so this plays and wraps for as long as " +
    "the learner takes and must not resolve — the struck bell at the advance press is the " +
    "cadence, and the music's job at that moment is to get out of its way. One track for " +
    "all ten advances, because it is the same ritual each time, which also makes it the " +
    "one slot that has to be PERIOD-NEUTRAL: it sits between every pair of era tracks. " +
    "150-240s. Leave room for the five effects wired to the beats — measured, they own " +
    "120-500 Hz (the crowd) and a narrow band at 1 kHz (the bell).",
};

/** Whether a track id names something that actually ships. */
export function isShippedTrack(trackId: string): boolean {
  return MUSIC_TRACKS.some((track) => track.id === trackId);
}

/**
 * THE ERA-ADVANCE CEREMONY, as far as the soundtrack is concerned. One field, so it could
 * have been an `EraId | null` on {@link MusicScene} — it is an object because the ceremony is
 * one of the three THINGS the selection reads, and flattening it would leave a bare era id
 * beside another bare era id, both nullable, distinguished only by their names.
 */
export interface CeremonyScene {
  /**
   * The era being LEFT — the one whose ceremony this is, which is also what
   * `EraAdvanceCeremony` is handed and what the store declares.
   *
   * **The bed plays only while the city is still standing in it**, which is what makes the
   * advance press the handover. See {@link trackIdForScene}.
   */
  readonly eraId: EraId;
}

/**
 * WHAT THE CITY IS SHOWING, as far as the soundtrack is concerned. Three fields, because
 * the selection has exactly three inputs.
 */
export interface MusicScene {
  /** The era the city is standing in. */
  readonly eraId: EraId;
  /**
   * The era whose CRISIS is running, or `null` when none is. The crisis's own era rather
   * than the live one, because `resolveCrisisEra` can pin the board to era one while the
   * city stands elsewhere (D-ERA25), and the music follows the board it is scoring.
   */
  readonly crisisEraId: EraId | null;
  /**
   * The era-advance ceremony in progress, or `null` when none is.
   *
   * Required rather than optional so every scene states it. A scene that could omit the
   * field would default to "no ceremony", which is the answer that hides the omission, and
   * the whole point of the slot is a moment nothing used to notice.
   */
  readonly ceremony: CeremonyScene | null;
}

/** A scene with no crisis and no ceremony, which is the city's ordinary state. */
export function eraScene(eraId: EraId): MusicScene {
  return { eraId, crisisEraId: null, ceremony: null };
}

/**
 * The track id an era plays with no crisis running.
 *
 * Fail-safe rather than fail-loud, which is the opposite of `eraBuildableRadius` and is
 * deliberate: an unauthored land radius is a content gap a plausible default would hide,
 * and this is the soundtrack, where the worst a wrong answer can do is play the wrong
 * file. Nothing here may be the reason the app throws.
 */
export function trackIdForEra(eraId: EraId): string {
  const own = eraSlotTrackId(eraId);
  if (isShippedTrack(own)) {
    return own;
  }
  const standIn = ERA_MUSIC[eraId]?.standIn;
  // An era slot standing in on "the era's track" would be circular, so it resolves to the
  // house track instead of recursing. The test rules the case out at the data.
  return standIn !== undefined && standIn.to === "track"
    ? standIn.trackId
    : DEFAULT_TRACK_ID;
}

/**
 * **THE SELECTION FUNCTION.** The ceremony wins while the city is still standing in the age
 * it belongs to; then a crisis while it runs; otherwise the era.
 *
 * **The ceremony outranks the crisis**, which needs saying because nothing in the product
 * puts the two together today: a mid-era crisis and an era advance are different phases,
 * and the advance only unlocks once every node of the era holds mastery two. The ordering
 * is a ruling for the case where they do overlap, and it goes this way because the ceremony
 * is the surface the learner is actually looking at — it is a full-screen modal, and a
 * crisis running behind it is not what is on screen.
 *
 * **`ceremony.eraId === scene.eraId` is the handover, and it is a deliberate choice of
 * trigger.** The bed plays while the city stands in the age being left, and stops the instant
 * `setCityEra` moves it, which is the advance press and is where the bell already is. The
 * obvious alternative — play it until the ceremony UNMOUNTS — is order-dependent and wrong on
 * one of the two orders: the press writes the era and takes the surface down, and if the
 * unmount's `setAdvanceCeremony(null)` reconciled first the soundtrack would crossfade back to
 * the OUTGOING age for a moment before crossfading on to the incoming one. Keying off the era
 * cannot express that state, so the ordering stops being something anybody has to know.
 *
 * A crisis with no track of its own resolves through {@link ERA_STAND_IN} to the LIVE
 * era's track, not the crisis's own era's, because the point of that stand-in is that the
 * music does not change and the music playing is the one the learner is standing in. **The
 * ceremony's stand-in resolves the same way and to the same place**, which is what makes
 * the empty fifteenth slot inaudible: with no bed acquired, an advance sounds exactly as it
 * did before the slot existed.
 */
export function trackIdForScene(scene: MusicScene): string {
  // Truthiness rather than `!== null`, because the field is required by the type and this
  // module's contract is that nothing in it may be the reason the app throws: a JavaScript
  // caller that omitted it would otherwise read `undefined.cueSpent` here, and "no ceremony"
  // is the right answer to give a scene that did not mention one.
  const ceremony = scene.ceremony;
  if (ceremony && ceremony.eraId === scene.eraId) {
    if (isShippedTrack(CEREMONY_SLOT_TRACK_ID)) {
      return CEREMONY_SLOT_TRACK_ID;
    }
    const standIn = CEREMONY_MUSIC.standIn;
    if (standIn.to === "track") {
      return standIn.trackId;
    }
    // Falls through to the crisis and then the era below, which is `ERA_STAND_IN` meaning
    // exactly what it says: the music does not change.
  }
  if (scene.crisisEraId === null) {
    return trackIdForEra(scene.eraId);
  }
  const own = crisisSlotTrackId(scene.crisisEraId);
  if (isShippedTrack(own)) {
    return own;
  }
  const standIn = CRISIS_MUSIC[scene.crisisEraId]?.standIn;
  return standIn !== undefined && standIn.to === "track"
    ? standIn.trackId
    : trackIdForEra(scene.eraId);
}

/** The resolved track for a scene, for a surface that wants to name it. */
export function trackForScene(scene: MusicScene): MusicTrack {
  return trackById(trackIdForScene(scene));
}

/** One slot of the manifest, named the way the census reports it. */
export interface MusicSlot {
  readonly kind: "era" | "crisis" | "ceremony";
  /**
   * The era this slot belongs to, or `null` for the one slot that belongs to all ten. A
   * nullable field rather than a fabricated era id, because "which era's ceremony cue is
   * this" has no answer and inventing `prehistoric` for it would make the census read as
   * if the other nine were missing one.
   */
  readonly eraId: EraId | null;
  /** The id this slot's own track would ship under. */
  readonly trackId: string;
  readonly slot: TrackSlot;
}

/**
 * EVERY SLOT IN THE MANIFEST: ten eras and ten crisis rows derived from `ERA_SEQUENCE` in
 * play order, then the one ceremony cue. So fifteen of these are slots a track is genuinely
 * owed for and six are the shelved crises, which is a fact about the crisis scope rather
 * than about this file.
 *
 * The ceremony comes LAST and outside the per-era walk, which is the shape of the thing:
 * it is not an eleventh era and not a fifth crisis, it is the one slot no era owns.
 */
export function musicSlots(): readonly MusicSlot[] {
  return [
    ...ERA_SEQUENCE.flatMap((era): MusicSlot[] => [
      {
        kind: "era",
        eraId: era.id,
        trackId: eraSlotTrackId(era.id),
        slot: ERA_MUSIC[era.id],
      },
      {
        kind: "crisis",
        eraId: era.id,
        trackId: crisisSlotTrackId(era.id),
        slot: CRISIS_MUSIC[era.id],
      },
    ]),
    {
      kind: "ceremony",
      eraId: null,
      trackId: CEREMONY_SLOT_TRACK_ID,
      slot: CEREMONY_MUSIC,
    },
  ];
}

/**
 * The slots whose own track has not been acquired, so they are borrowing.
 *
 * **Derived by reading `MUSIC_TRACKS`, never declared.** There is no `status` field to go
 * stale in either direction: a file that arrives leaves this list on the same run it is
 * registered, and a file that is withdrawn rejoins it. That is what let "the feature is
 * asset-blocked" be a measurement rather than a claim while it was true, and it is what
 * makes "fourteen of the fifteen have landed" one now, with no exemption list to maintain.
 * It reports **seven**: the six shelved crises and the ceremony bed.
 */
export function standingInSlots(): readonly MusicSlot[] {
  return musicSlots().filter((entry) => !isShippedTrack(entry.trackId));
}
