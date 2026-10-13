/**
 * The game's sound effects: nineteen short CC0 samples, served from `public/audio/sfx/`.
 *
 * WHY `public/` AND NOT AN `import`. The 3D models in `city/art/models/` are pulled in
 * with `import.meta.glob(..., { query: "?url" })`, which is right for them — they are
 * content the renderer cannot start without. Audio is the opposite: it is optional,
 * it is comparatively enormous, and a learner who never unmutes should never pay for a
 * single byte of it. Anything reachable from an `import` is a module in the graph and
 * costs a request map entry (and, for a data-URL-inlined small asset, real bundle
 * bytes). Files under `public/` are copied verbatim and fetched by URL at runtime, so
 * the effects cost the JS bundle NOTHING and cost the network only what is actually
 * played. See `public/audio/CREDITS.md` for the provenance of every file.
 *
 * Everything here is best-effort by construction. A missing file, a codec the browser
 * dislikes, a blocked autoplay attempt, a throttled audio device — each ends in a
 * swallowed rejection and silence, never a thrown error and never a console warning.
 * Sound in this app is decoration on top of feedback that is always also visible or
 * announced; it is never the only channel, so losing it costs the learner nothing.
 */

import { ERA_SEQUENCE, type EraId } from "@cr/skill-graph";

import { type AudioPrefs, audioPrefs, type GestureGate, gestureGate } from "./audioPrefs";

/**
 * The effects the game can play.
 *
 * The first six are the city's originals. The rest are
 * `docs/superpowers/specs/2026-08-03-sfx-picks-per-city-event.md`'s picks, one name per
 * event it swept out of the code, and its two deliberately empty rows (the ceremony's
 * `retheme` beat and the crisis conclusion) have no name here because they have no sound:
 * neither has a physical referent a search term could specify, and a whoosh standing in
 * for a meaning is worse than the silence.
 */
export type SfxName =
  | "place-building"
  | "road-lay"
  | "road-remove"
  | "mastery-star"
  | "building-unlocked"
  | "civic-purchase"
  | "answer-missed"
  | "crowd-gather"
  | "era-advance"
  | "crisis-call"
  | "crisis-commit"
  | "crisis-commit-late"
  | "frost-advance"
  | "fire-lit"
  | "building-frozen"
  | "thaw";

interface SfxSpec {
  readonly file: string;
  /**
   * A per-sample trim, applied on top of the master volume. The files come from six
   * different CC0 sources mastered at different levels — Kenney's impacts alone peak at
   * +2 dBFS — so a single volume would make the coins twice as loud as the road tap.
   *
   * The original six were equalised by ear. The fourteen added with the city's events
   * were equalised by MEASUREMENT, because nobody has heard them: each is set so that a
   * play at full slider lands near -9 dBFS peak, with the two dense beds (the crowd and
   * the fire) pulled further down than their peaks alone would ask for, since a bed at
   * the same peak as a transient is perceptually much the louder. That is a defensible
   * starting point and not an audition; a lead with ears should expect to move them.
   */
  readonly trim: number;
  /**
   * The floor on how often this sample may retrigger. Roads are the reason: a learner
   * rearranging a street hears `road-lay` dozens of times in a row, and without a floor
   * a fast sweep machine-guns it. A retrigger inside the window is dropped, not queued,
   * so the sound can never lag behind the action that caused it.
   */
  readonly minIntervalMs: number;
  /** How many elements to keep, so overlapping plays do not cut each other off. */
  readonly voices: number;
}

/**
 * Volumes are deliberately timid. The brief for this work was effects that stay
 * pleasant on the hundredth repetition, and the failure mode nobody forgives is a
 * game that is too loud on the first click.
 */
const CATALOG: Record<SfxName, SfxSpec> = {
  // A soft wooden drop as the building lands on the grid.
  "place-building": {
    file: "place-building.ogg",
    trim: 0.55,
    minIntervalMs: 80,
    voices: 2,
  },
  // The quietest sample in the set, and the most repeated one.
  "road-lay": { file: "road-lay.ogg", trim: 0.3, minIntervalMs: 70, voices: 3 },
  // Its counterpart: a short reverse tick for the tile coming back up.
  "road-remove": { file: "road-remove.ogg", trim: 0.35, minIntervalMs: 70, voices: 3 },
  // A plucked note per star. Short, because three can land close together.
  "mastery-star": { file: "mastery-star.ogg", trim: 0.5, minIntervalMs: 90, voices: 3 },
  // The only celebratory one, for the popup that interrupts the learner anyway.
  "building-unlocked": {
    file: "building-unlocked.ogg",
    trim: 0.5,
    minIntervalMs: 300,
    voices: 1,
  },

  /* ------------------------------------------------------------------------ */
  /* The city's own events                                                     */
  /*                                                                           */
  /* Every one of these is a DISCRETE event rather than a repeatable gesture,  */
  /* so each holds one voice and a floor at least as long as the sample. That  */
  /* is the whole of the anti-stacking story inside a sample: a second call    */
  /* inside the window is dropped, never queued and never layered, so a sound  */
  /* can no more overlap itself than the road tap can.                         */
  /* ------------------------------------------------------------------------ */

  // Small stones landing dry, for era one's worked stone leaving the stockpile.
  "civic-purchase": {
    file: "civic-purchase.ogg",
    trim: 0.27,
    minIntervalMs: 400,
    voices: 1,
  },
  // A soft plucked note, warm rather than a buzzer: this answers a wrong answer and a
  // missed ceremony check, and a game that scolds on either is the failure mode.
  // Two voices, because a learner working through a board can reveal twice in a breath.
  "answer-missed": { file: "answer-missed.ogg", trim: 0.5, minIntervalMs: 400, voices: 2 },
  // A crowd bed, for the ceremony gathering the city in. The longest sample in the set
  // and the one most obviously ruined by overlapping itself.
  "crowd-gather": { file: "crowd-gather.ogg", trim: 0.18, minIntervalMs: 5000, voices: 1 },
  // A struck temple bell, for the age turning. The longest thing the game celebrates
  // with, and it happens at most nine times in a whole run.
  "era-advance": { file: "era-advance.ogg", trim: 0.55, minIntervalMs: 2100, voices: 1 },
  // A dark low bell for the crisis announcing itself. Deliberately not shrill: the call
  // waits, and a sound that read as an alarm would make it an interruption.
  "crisis-call": { file: "crisis-call.ogg", trim: 0.27, minIntervalMs: 1000, voices: 1 },
  // A heavy material thud, for a crisis action committed. Timber early, iron late.
  "crisis-commit": {
    file: "crisis-commit.ogg",
    trim: 0.28,
    minIntervalMs: 400,
    voices: 1,
  },
  "crisis-commit-late": {
    file: "crisis-commit-late.ogg",
    trim: 0.29,
    minIntervalMs: 400,
    voices: 1,
  },
  // A granular crackle bed for the frost taking ground at the close of a round.
  "frost-advance": { file: "frost-advance.ogg", trim: 0.6, minIntervalMs: 1700, voices: 1 },
  // An ignition and its first pops, for a hearth that caught.
  "fire-lit": { file: "fire-lit.ogg", trim: 0.3, minIntervalMs: 1400, voices: 1 },
  // ONE dry crack, however many buildings the frost reached. The call site fires this
  // once per round off the engine's own round log rather than once per building; this
  // floor is the backstop under that, not the mechanism.
  "building-frozen": {
    file: "building-frozen.ogg",
    trim: 0.53,
    minIntervalMs: 400,
    voices: 1,
  },
  // One clean drip, for the winter letting go. Once per encounter.
  thaw: { file: "thaw.ogg", trim: 0.36, minIntervalMs: 1400, voices: 1 },
  // ⚑ `citizens-depart` STOOD HERE — a heavy door swung to, for a city that just lost
  // people, at -12.1 dBFS beside `answer-missed` because those two were the game's only
  // sounds for something going the wrong way. Departures were removed as a mechanic on
  // 2026-08-05 ("citizens do not leave"), so the spec, the `SfxName` and
  // `citizens-depart.ogg` are all gone. `cityEventSfx.test.ts` is why they had to go
  // together: a sample nothing plays is bytes a learner fetches for a sound the game
  // cannot make, and a spec naming a file nobody ships 404s in silence.
};

/**
 * **THE ERA LADDER, AND IT IS TWO RUNGS RATHER THAN TEN.**
 *
 * The crisis-commit thud names a material, so it varies from timber to iron. Other sounds
 * are era-neutral by their own physics and the music carries the period.
 *
 * The late rung costs no extra sourcing. Kenney's Impact Sounds is one CC0 download that
 * already holds `impactWood_*` through `impactMetal_*`, so the variation is a choice of
 * filename inside a pack that had to be fetched anyway.
 */
type LadderedSfx = "crisis-commit";

const MATERIAL_LADDER: Record<LadderedSfx, SfxName> = {
  "crisis-commit": "crisis-commit-late",
};

/**
 * The first era that builds in iron rather than timber. Named once; the set below is
 * DERIVED from `ERA_SEQUENCE` past it, so inserting or reordering an era moves the
 * boundary with the sequence instead of leaving a written-down list of six behind.
 */
const FIRST_IRON_ERA: EraId = "industrial";

const IRON_ERAS: ReadonlySet<EraId> = (() => {
  const at = ERA_SEQUENCE.findIndex((era) => era.id === FIRST_IRON_ERA);
  // `findIndex` answering -1 would make `slice` return the LAST era alone, which is a
  // wrong ladder that still typechecks and still plays a sound. Fail instead.
  if (at === -1) {
    throw new Error(`"${FIRST_IRON_ERA}" is not in ERA_SEQUENCE, so the era ladder has no
      boundary to split on.`);
  }
  return new Set(ERA_SEQUENCE.slice(at).map((era) => era.id));
})();

/** Which rung of a material sound this era strikes. */
export function eraMaterialSfx(sound: LadderedSfx, era: EraId): SfxName {
  return IRON_ERAS.has(era) ? MATERIAL_LADDER[sound] : sound;
}

/**
 * Every effect the game holds, read off the catalog rather than written down.
 *
 * Exported so a guard can sweep the whole set — the loudness ceiling, the anti-stacking
 * floors, the presence of a file on disk — and pick up a sample added later without
 * anybody remembering to add it to a list.
 */
export const SFX_NAMES: readonly SfxName[] = Object.keys(CATALOG) as SfxName[];

/** A `new Audio()`-shaped element, narrowed to what this module touches. */
export interface SfxElement {
  volume: number;
  currentTime: number;
  preload: string;
  play(): Promise<void> | void;
}

export interface SfxPlayerOptions {
  prefs?: AudioPrefs;
  gate?: GestureGate;
  /** Defaults to `new Audio(src)`. Injected so tests need no media stack. */
  createAudio?: (src: string) => SfxElement | null;
  /** Defaults to `document.visibilityState === "hidden"`. */
  isHidden?: () => boolean;
}

export interface SfxPlayer {
  play(name: SfxName): void;
  /**
   * Fetch and decode the samples ahead of the first play. Called once the learner has
   * interacted AND audio is actually audible, so a muted learner never triggers the
   * requests, and the first effect of the session is not the one that pays for the
   * round trip.
   */
  warm(): void;
}

/** Resolve a `public/` path against the configured Vite base, so a deploy under a
 *  sub-path keeps working without touching this module. */
export function audioAssetUrl(relative: string): string {
  const base = import.meta.env?.BASE_URL ?? "/";
  return `${base.endsWith("/") ? base : `${base}/`}audio/${relative}`;
}

function defaultCreateAudio(src: string): SfxElement | null {
  if (typeof Audio !== "function") {
    return null;
  }
  try {
    return new Audio(src);
  } catch {
    return null;
  }
}

export function createSfxPlayer(options: SfxPlayerOptions = {}): SfxPlayer {
  const prefs = options.prefs ?? audioPrefs;
  const gate = options.gate ?? gestureGate;
  const createAudio = options.createAudio ?? defaultCreateAudio;
  const isHidden =
    options.isHidden ??
    (() => typeof document !== "undefined" && document.visibilityState === "hidden");

  /** Round-robin voice pools, built on first use of each sample. */
  const pools = new Map<SfxName, { voices: SfxElement[]; next: number }>();
  const lastPlayedAt = new Map<SfxName, number>();

  function pool(name: SfxName): { voices: SfxElement[]; next: number } | null {
    const existing = pools.get(name);
    if (existing) {
      return existing;
    }
    const spec = CATALOG[name];
    const voices: SfxElement[] = [];
    for (let i = 0; i < spec.voices; i += 1) {
      const element = createAudio(audioAssetUrl(`sfx/${spec.file}`));
      if (element === null) {
        // No media support at all (jsdom, a locked-down embed). Give up on this
        // sample permanently rather than retrying a failing constructor per click.
        pools.set(name, { voices: [], next: 0 });
        return null;
      }
      element.preload = "auto";
      voices.push(element);
    }
    const created = { voices, next: 0 };
    pools.set(name, created);
    return created;
  }

  return {
    play(name) {
      // Ask the gate rather than the platform: an attempt before the first gesture is
      // what logs `NotAllowedError`, and there is nothing to hear either way.
      if (!gate.opened() || isHidden()) {
        return;
      }
      const gain = prefs.effectGain();
      if (gain <= 0) {
        return;
      }
      const spec = CATALOG[name];
      const now = Date.now();
      const previous = lastPlayedAt.get(name);
      if (previous !== undefined && now - previous < spec.minIntervalMs) {
        return;
      }
      const voices = pool(name);
      if (voices === null || voices.voices.length === 0) {
        return;
      }
      const element = voices.voices[voices.next];
      if (element === undefined) {
        return;
      }
      lastPlayedAt.set(name, now);
      voices.next = (voices.next + 1) % voices.voices.length;
      try {
        element.volume = Math.min(1, Math.max(0, gain * spec.trim));
        element.currentTime = 0;
        // `play()` rejects on a blocked autoplay policy and on a decode failure.
        // Both are expected, both are silent, neither is an error the learner can act
        // on — so the rejection is swallowed here rather than reaching the console.
        const started = element.play();
        if (started && typeof started.then === "function") {
          void started.catch(() => {});
        }
      } catch {
        // Same contract as the rejection above.
      }
    },
    warm() {
      if (prefs.effectGain() <= 0) {
        return;
      }
      // Constructing the element with a `src` and `preload = "auto"` is the whole
      // preload: the browser starts fetching on its own. There is deliberately no
      // `load()` call — it would be redundant (it RE-loads a resource already being
      // fetched) and jsdom reports it as an unimplemented method through its virtual
      // console, which no `try`/`catch` here can intercept. That would have printed a
      // stack trace per mounted test, which is precisely the console noise this
      // feature is supposed not to make.
      for (const name of SFX_NAMES) {
        pool(name);
      }
    },
  };
}

/** The app-wide effects player. */
export const sfxPlayer: SfxPlayer = createSfxPlayer();

/**
 * Play one effect. The single entry point the game calls; safe to call from anywhere,
 * including render paths and environments with no audio at all.
 */
export function playSfx(name: SfxName): void {
  sfxPlayer.play(name);
}
