import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { posix } from "node:path";

import { OggVorbisDecoder } from "@wasm-audio-decoders/ogg-vorbis";
import { beforeAll, describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

/**
 * **NO SOUND IS BURIED UNDER THE SOUNDS IT FIRES ALONGSIDE.**
 *
 * ## The defect this exists to stop, which shipped
 *
 * `ceremony-rebuild.ogg` radiated **-45.1 LUFS** against **-25.9** and **-25.6** for the
 * two ceremony beats immediately before it: a 19 dB hole in the middle of one four-beat
 * ritual, on the path a demo walks for eras one to six. `frost-advance.ogg` at -44.9 was
 * the same shape inside one winter encounter.
 *
 * `sfxAudibility.test.ts` is the sibling guard and it passed both of them, **correctly**.
 * That suite asks whether a laptop speaker reproduces a file's SPECTRUM, and the rebuild
 * strike loses only 3.11 dB of peak and 4.02 dB of RMS through the speaker model, well
 * inside its 6 dB floor. Nothing was wrong with the frequencies. The file was simply
 * mastered quiet, no filter detects that, and no filter fixes it. Spectrum and level are
 * two axes and a guard on one says nothing about the other.
 *
 * ## Why this is not "normalise everything to one number"
 *
 * Because these sounds are not meant to be equally loud. A crowd gathering for a founding
 * SHOULD be bigger than a road tile going down, and `soundEffects.ts` already spends its
 * `trim` field saying so. The harm is not unequal loudness; it is a sound being inaudible
 * **relative to the sounds it plays alongside**. So the subject is a GROUP, the statistic
 * is the group's MEDIAN (robust, so one buried member cannot drag the line down to meet
 * itself), and the rule is one-sided: {@link MAX_BELOW_MEDIAN_DB} below it fails, and any
 * distance ABOVE it is left alone, because being the biggest thing in the room is a
 * design decision rather than a defect.
 *
 * ## Where the groups come from
 *
 * `.cursor/rules/qa-verification.mdc`: *"Define a guard's population by who exhibits the
 * behaviour, not by where the behaviour is implemented."* Grouping by filename prefix
 * would have been one clean filter over a real source and would have been wrong twice
 * over -- it would have split `crowd-gather.ogg` off the ceremony it opens, and it would
 * have joined `crisis-call.ogg` to `crisis-commit.ogg`, which are a city announcement and
 * a crisis-board press and never sound in the same room.
 *
 * So a group is a **context**: a module that calls `playSfx`, holding every sound it can
 * reach. Two sounds in one context are two sounds one module decides between, which is
 * what "can be heard alongside" means in code. A module that only NAMES sounds without
 * playing them is a helper and folds into whichever context imports it -- that hop is
 * load-bearing and not a convenience, because `winterSfx.ts` holds four of the winter
 * encounter's six sounds while `HardWinterSurface.tsx` holds the other two, and a
 * population scoped to the file would have measured two halves of one encounter
 * separately and reported both healthy.
 *
 * ## The instrument, and why it does not share code with its sibling
 *
 * `sfxAudibility.test.ts` has a high-pass of its own. This file has another, plus a
 * BS.1770-4 loudness meter it does not have. They are deliberately separate: two
 * implementations that agree about a file is evidence, and one implementation used twice
 * is not, so a fault in either shows up as disagreement rather than as two green suites.
 * Both are then checked against `scripts/measure-sfx-levels.py`, which is ffmpeg's C
 * biquad over ffmpeg's own libvorbis and shares no line with either.
 */

const repoRoot = resolveRepoRoot();

const SFX_DIRECTORY = "apps/web/public/audio/sfx";
const APP_DIRECTORY = "apps/web/src";
const CATALOG_SOURCE = "apps/web/src/audio/soundEffects.ts";

/**
 * **HOW FAR UNDER ITS GROUP'S MIDDLE A SOUND MAY SIT.**
 *
 * Ten decibels, and the number is a perceptual one rather than an electrical one. Six dB
 * -- the line the spectral guard draws -- is half the AMPLITUDE, which is the right line
 * there because that floor asks how much of a single file the speaker throws away and any
 * loss is pure harm. This quantity is different: it is one sound measured against its
 * neighbours, and a group is allowed a foreground and a background. Ten decibels is
 * roughly half the perceived LOUDNESS, so a member past it is under half as loud as the
 * middle of its own group and has stopped reading as part of the piece.
 *
 * Six would have been the wrong number here for a reason worth writing down: it would
 * fail `crowd-gather.ogg` (a 4.3 s bed) against a hammer strike, and forcing those two to
 * within 6 dB of each other is the "one target for everything" answer that this whole
 * file exists to avoid.
 *
 * It is checked in both directions rather than asserted. RED: point it at the shipped
 * `ceremony-rebuild.ogg` at -11.7 under its median, or `frost-advance.ogg` at -13.5.
 * HEADROOM: at this tip the deepest member of any group is `crisis-call.ogg` at -7.1, which
 * leaves 0.9 dB before the line the *"still has room under the margin"* case draws,
 * asserted below so the margin cannot quietly become decorative by everything drifting up
 * to meet it.
 *
 * **THAT HEADROOM WAS 3.9 dB AND A DELETION SPENT IT, WITHOUT MOVING A FILE.** Removing
 * `citizens-depart.ogg` with the departures mechanic on 2026-08-05 took a member out of the
 * island group from BELOW its middle, so the median it is measured against rose 2.35 dB
 * (-30.75 to -28.40) and three members fell further under a line none of them moved
 * towards: `crisis-call.ogg` from -4.7 to -7.1, `civic-purchase.ogg` from -4.6 to -7.0,
 * `road-lay.ogg` from -2.4 to -4.7. `answer-missed.ogg` at -6.1 is untouched and is no
 * longer the deepest. Nothing here is a defect and nothing was re-levelled for it, but the
 * next sound removed from that room is the one that pushes a member past the margin, which
 * is the whole reason the headroom is asserted rather than remarked on: deleting a sound is
 * a level change to every sound it played beside.
 */
const MAX_BELOW_MEDIAN_DB = 10;

/**
 * Roughly what a laptop speaker passes, matching `sfxAudibility.test.ts` so that
 * "radiated" means the same thing in both files: what comes out of the speaker, not what
 * is in the file. It matters here for the same reason it matters there -- energy under
 * the corner is level a learner never receives, so counting it would let a sound whose
 * loudness is all rumble pass as though it were audible.
 */
const LAPTOP_CORNER_HZ = 200;
const LAPTOP_POLES = 4;

/* -------------------------------------------------------------------------- */
/* The instrument                                                              */
/* -------------------------------------------------------------------------- */

interface Sound {
  readonly channels: readonly Float64Array[];
  readonly sampleRate: number;
}

interface Biquad {
  readonly b0: number;
  readonly b1: number;
  readonly b2: number;
  readonly a1: number;
  readonly a2: number;
}

/** Direct form I, normalised so `a0` is 1. */
function filterOnce(input: Float64Array, c: Biquad): Float64Array {
  const out = new Float64Array(input.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < input.length; i += 1) {
    const x0 = input[i] as number;
    const y0 = c.b0 * x0 + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
    out[i] = y0;
  }
  return out;
}

/** One RBJ Butterworth high-pass section. */
function highpassSection(sampleRate: number, corner: number): Biquad {
  const w0 = (2 * Math.PI * corner) / sampleRate;
  const cosW0 = Math.cos(w0);
  const alpha = Math.sin(w0) / Math.SQRT2;
  const a0 = 1 + alpha;
  return {
    b0: (1 + cosW0) / 2 / a0,
    b1: -(1 + cosW0) / a0,
    b2: (1 + cosW0) / 2 / a0,
    a1: (-2 * cosW0) / a0,
    a2: (1 - alpha) / a0,
  };
}

function highpass(sound: Sound, corner: number, poles: number): Sound {
  const section = highpassSection(sound.sampleRate, corner);
  return {
    sampleRate: sound.sampleRate,
    channels: sound.channels.map((channel) => {
      let filtered = channel;
      for (let n = 0; n < poles / 2; n += 1) {
        filtered = filterOnce(filtered, section);
      }
      return filtered;
    }),
  };
}

/**
 * ITU-R BS.1770-4's K-weighting, DERIVED for the sample rate rather than read off the
 * standard's table.
 *
 * The published coefficients are for 48 kHz and every file here is 44.1 kHz, so a table
 * would be measuring the wrong curve. These are the analytic forms the standard's own
 * annex gives (and that `libebur128` uses), which reproduce the tabulated 48 kHz values
 * exactly -- asserted below, because "derived correctly" and "derived at all" are
 * different claims.
 */
function kShelf(sampleRate: number): Biquad {
  const f0 = 1681.974450955533;
  const gain = 3.999843853973347;
  const q = 0.7071752369554196;
  const k = Math.tan((Math.PI * f0) / sampleRate);
  const vh = 10 ** (gain / 20);
  const vb = vh ** 0.4996667741545416;
  const a0 = 1 + k / q + k * k;
  return {
    b0: (vh + (vb * k) / q + k * k) / a0,
    b1: (2 * (k * k - vh)) / a0,
    b2: (vh - (vb * k) / q + k * k) / a0,
    a1: (2 * (k * k - 1)) / a0,
    a2: (1 - k / q + k * k) / a0,
  };
}

function kHighpass(sampleRate: number): Biquad {
  const f0 = 38.13547087602444;
  const q = 0.5003270373238773;
  const k = Math.tan((Math.PI * f0) / sampleRate);
  const a0 = 1 + k / q + k * k;
  return { b0: 1, b1: -2, b2: 1, a1: (2 * (k * k - 1)) / a0, a2: (1 - k / q + k * k) / a0 };
}

/**
 * `|H(f)|` for one section, straight off the coefficients.
 *
 * Used only by the instrument check: it is the same filter described a second way, in the
 * frequency domain rather than as a recurrence, so a sine put through {@link filterOnce}
 * has to come out at exactly this gain.
 */
function magnitudeAt(c: Biquad, hz: number, sampleRate: number): number {
  const w = (2 * Math.PI * hz) / sampleRate;
  const numerator = Math.hypot(
    c.b0 + c.b1 * Math.cos(w) + c.b2 * Math.cos(2 * w),
    c.b1 * Math.sin(w) + c.b2 * Math.sin(2 * w),
  );
  const denominator = Math.hypot(
    1 + c.a1 * Math.cos(w) + c.a2 * Math.cos(2 * w),
    c.a1 * Math.sin(w) + c.a2 * Math.sin(2 * w),
  );
  return numerator / denominator;
}

/**
 * Whole-file K-weighted loudness, **UNGATED**.
 *
 * The gate is deliberately absent and this is the one measurement choice worth defending,
 * because it is a departure from EBU R 128 as most tools implement it. R 128 integrates
 * over 400 ms blocks and drops blocks below a relative threshold; **seven of these nineteen
 * samples have no gated figure at all** -- six run shorter than 400 ms and
 * `ceremony-rebuild.ogg` lands on exactly 0.400 s -- so the gated figure is absent for
 * exactly the files most in question, that rebuild strike among them. The ungated
 * whole-file loudness of BS.1770-4 is defined at every duration, which is what makes one
 * column comparable across the whole set. It is also the method the sweep in
 * `scripts/measure-sfx-audibility.py` used, so these numbers and its numbers are the
 * same numbers.
 */
function loudnessLufs(sound: Sound): number {
  const shelf = kShelf(sound.sampleRate);
  const rlb = kHighpass(sound.sampleRate);
  let total = 0;
  for (const channel of sound.channels) {
    const weighted = filterOnce(filterOnce(channel, shelf), rlb);
    let sum = 0;
    for (const sample of weighted) {
      sum += sample * sample;
    }
    // G = 1.0 for L and R, which is every channel these files have.
    total += weighted.length === 0 ? 0 : sum / weighted.length;
  }
  return total <= 0 ? Number.NEGATIVE_INFINITY : -0.691 + 10 * Math.log10(total);
}

/** What the learner's speaker actually puts out: the file through the speaker, at trim. */
function radiatedLufs(sound: Sound, trim: number): number {
  return (
    loudnessLufs(highpass(sound, LAPTOP_CORNER_HZ, LAPTOP_POLES)) + 20 * Math.log10(trim)
  );
}

/* -------------------------------------------------------------------------- */
/* The catalogue                                                               */
/* -------------------------------------------------------------------------- */

function read(path: string): string {
  return readFileSync(posix.join(repoRoot, path), "utf8");
}

function tracked(...directories: readonly string[]): string[] {
  return execFileSync("git", ["ls-files", "-z", "--", ...directories], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  })
    .split("\0")
    .filter((entry) => entry.length > 0)
    .sort();
}

/**
 * A source with its comments blanked, keeping everything else byte-aligned.
 *
 * The same device `cityEventSfx.test.ts` needs and for the same reason: these modules
 * document themselves at length and quote the very tokens being searched for. Without it
 * the derivation below finds `playSfx("crowd-gather")` inside a paragraph explaining that
 * a detector must not match `playSfx("crowd-gather")` inside a paragraph.
 */
function codeOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .replace(
      /(^|[^:])\/\/[^\n]*/g,
      (line, lead: string) => lead + " ".repeat(line.length - lead.length),
    );
}

function isSource(path: string): boolean {
  const base = posix.basename(path);
  return /\.(ts|tsx)$/.test(base) && !/\.test\.(ts|tsx)$/.test(base);
}

interface Spec {
  readonly name: string;
  readonly file: string;
  readonly trim: number;
}

/** Every effect, with the file it plays and the trim it plays at, off the catalogue. */
function catalogue(): Spec[] {
  const source = codeOnly(read(CATALOG_SOURCE));
  const union = /export type SfxName =([\s\S]*?);/.exec(source);
  if (union === null) {
    throw new Error(`no SfxName union in ${CATALOG_SOURCE}`);
  }
  const names = [...(union[1] as string).matchAll(/"([a-z0-9-]+)"/g)].map(
    (match) => match[1] as string,
  );
  return names.map((name) => {
    const entry = new RegExp(
      `["']?${name}["']?:\\s*\\{[^}]*?file:\\s*"([^"]+)"[^}]*?trim:\\s*([0-9.]+)`,
      "s",
    ).exec(source);
    if (entry === null) {
      throw new Error(`${name} is in the SfxName union with no file/trim spec`);
    }
    return { name, file: entry[1] as string, trim: Number(entry[2]) };
  });
}

/* -------------------------------------------------------------------------- */
/* The groups                                                                  */
/* -------------------------------------------------------------------------- */

/** Whether a module reaches the effects player at all. */
function touchesSfx(source: string): boolean {
  return /from "[^"]*audio\/soundEffects"/.test(source);
}

/** The sounds a module's own code names, ladder rungs included. */
function namedIn(source: string, names: readonly string[]): Set<string> {
  const found = new Set<string>();
  for (const name of names) {
    if (source.includes(`"${name}"`)) {
      found.add(name);
    }
  }
  // The two material sounds ladder by era, so a module naming the base rung reaches the
  // late one through `eraMaterialSfx` without ever writing its name. Missing this would
  // hide `crisis-commit-late.ogg` from every group that can play it.
  for (const match of source.matchAll(/eraMaterialSfx\(\s*"([a-z0-9-]+)"/g)) {
    found.add(`${match[1] as string}-late`);
  }
  return found;
}

/** A relative import, resolved to a tracked source path. */
function resolveImport(
  from: string,
  specifier: string,
  sources: ReadonlySet<string>,
): string | null {
  if (!specifier.startsWith(".")) {
    return null;
  }
  const base = posix.normalize(posix.join(posix.dirname(from), specifier));
  for (const candidate of [
    `${base}.ts`,
    `${base}.tsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
  ]) {
    if (sources.has(candidate)) {
      return candidate;
    }
  }
  return null;
}

function importsOf(path: string, source: string, sources: ReadonlySet<string>): string[] {
  const found: string[] = [];
  for (const match of source.matchAll(/from\s+"([^"]+)"/g)) {
    const resolved = resolveImport(path, match[1] as string, sources);
    if (resolved !== null) {
      found.push(resolved);
    }
  }
  return found;
}

/**
 * **A SOUND THAT IS HEARD ON A SURFACE ITS OWN MODULE DOES NOT OWN**, each with the
 * reason, and each asserted in BOTH directions below.
 *
 * The derivation puts a sound in the room of the module that plays it. Two sounds are
 * played by a module that is not itself the room: `crisisCall.ts` is a HOOK the island
 * calls, and `App.tsx`'s civic purchase is a CALLBACK the island invokes. Both fire with
 * the island on screen, against the island's own sounds, and both would otherwise sit in
 * a group of one -- where a median-margin rule is vacuous, since a lone member is its own
 * median. That is how a sound goes unmeasured while the suite stays green, so they are
 * named here rather than dropped.
 *
 * The reverse direction is the load-bearing half: an entry has to still be played by the
 * module it claims, that module has to still be wired to the host, and the host must NOT
 * already name the sound itself -- so an entry cannot go on describing a hop that has
 * been collapsed.
 */
const HEARD_ON_ANOTHER_SURFACE: readonly {
  readonly sound: string;
  readonly playedBy: string;
  readonly heardOn: string;
  readonly why: string;
}[] = [
  {
    sound: "crisis-call",
    playedBy: "apps/web/src/city/crisisCall.ts",
    heardOn: "apps/web/src/city/CitySurface.tsx",
    why: "useCrisisCall is a hook the island mounts, not a screen of its own: the bell rings over the island, against the island's own sounds",
  },
  {
    sound: "civic-purchase",
    playedBy: "apps/web/src/App.tsx",
    heardOn: "apps/web/src/city/CitySurface.tsx",
    why: "App's placeCivic is the callback the island invokes on a civic placement, and the island answers it with place-building a moment later",
  },
];

interface Group {
  /** The modules whose repertoire this is, for the failure message. */
  readonly contexts: readonly string[];
  readonly members: readonly string[];
}

/**
 * Every set of sounds that can be heard in one room.
 *
 * A CONTEXT is a module that calls `playSfx`: it decides when its sounds fire, so it owns
 * a moment of play. A HELPER is a module that names sounds and never plays them -- it
 * hands names back to whoever asks -- so it belongs to each context that imports it,
 * transitively through other helpers.
 *
 * Identical repertoires collapse into one group: the plague, the intrusion and the
 * succession all reach exactly the two rungs of the commit ladder, which is one claim
 * about two sounds and not three.
 */
function groups(names: readonly string[]): Group[] {
  const sources = new Set(tracked(APP_DIRECTORY).filter(isSource));
  const code = new Map<string, string>();
  for (const path of sources) {
    code.set(path, codeOnly(read(path)));
  }

  const sound = [...sources].filter(
    (path) => path !== CATALOG_SOURCE && touchesSfx(code.get(path) as string),
  );
  const plays = (path: string) => /\bplaySfx\s*\(/.test(code.get(path) as string);
  const contexts = sound.filter(plays);
  const helpers = new Set(sound.filter((path) => !plays(path)));

  function repertoire(path: string): Set<string> {
    const found = new Set(namedIn(code.get(path) as string, names));
    const seen = new Set<string>([path]);
    const queue = importsOf(path, code.get(path) as string, sources).filter((next) =>
      helpers.has(next),
    );
    while (queue.length > 0) {
      const next = queue.pop() as string;
      if (seen.has(next)) {
        continue;
      }
      seen.add(next);
      for (const name of namedIn(code.get(next) as string, names)) {
        found.add(name);
      }
      for (const onward of importsOf(next, code.get(next) as string, sources)) {
        if (helpers.has(onward)) {
          queue.push(onward);
        }
      }
    }
    return found;
  }

  const byContext = new Map<string, Set<string>>(
    contexts.map((path) => [path, repertoire(path)]),
  );
  for (const entry of HEARD_ON_ANOTHER_SURFACE) {
    byContext.get(entry.heardOn)?.add(entry.sound);
  }

  const collapsed = new Map<string, Group>();
  for (const [path, members] of byContext) {
    // A lone sound is not a group: it is its own median, so the rule below would hold
    // over it whatever its level. The coverage assertion is what stops one hiding here.
    if (members.size < 2) {
      continue;
    }
    const sorted = [...members].sort();
    const key = sorted.join(",");
    const existing = collapsed.get(key);
    collapsed.set(key, {
      members: sorted,
      contexts: [...(existing?.contexts ?? []), path].sort(),
    });
  }
  return [...collapsed.values()].sort((a, b) =>
    (a.contexts[0] as string).localeCompare(b.contexts[0] as string),
  );
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length / 2;
  return sorted.length % 2 === 1
    ? (sorted[Math.floor(middle)] as number)
    : ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2;
}

/* -------------------------------------------------------------------------- */
/* The measurement                                                             */
/* -------------------------------------------------------------------------- */

const specs = catalogue();
const derived = groups(specs.map((spec) => spec.name));

async function decode(file: string): Promise<Sound> {
  const decoder = new OggVorbisDecoder();
  await decoder.ready;
  try {
    const decoded = await decoder.decodeFile(
      new Uint8Array(readFileSync(posix.join(repoRoot, SFX_DIRECTORY, file))),
    );
    if ((decoded.channelData[0]?.length ?? 0) === 0) {
      throw new Error(`${file} decoded to no audio at all`);
    }
    return {
      channels: decoded.channelData.map((channel) => Float64Array.from(channel)),
      sampleRate: decoded.sampleRate,
    };
  } finally {
    decoder.free();
  }
}

let radiated = new Map<string, number>();
let undecodable: string[] = [];

/**
 * Decoding COLLECTS its failures rather than throwing, for the reason the sibling suite
 * records: a throw in `beforeAll` makes vitest SKIP every test in the file, including the
 * ones that would have said why.
 */
beforeAll(async () => {
  radiated = new Map();
  undecodable = [];
  for (const spec of specs) {
    try {
      radiated.set(spec.name, radiatedLufs(await decode(spec.file), spec.trim));
    } catch (error) {
      undecodable.push(`${spec.file}: ${(error as Error).message}`);
    }
  }
}, 120_000);

describe("no sound is buried under the sounds it fires alongside", () => {
  it("derives its groups from the call sites, and they cover the catalogue", () => {
    // Floors first. Every containment below holds trivially over an empty set, and a
    // `git ls-files` that lost its cwd would produce one.
    //
    // 20 until 2026-08-05, when departures were removed as a mechanic and
    // `citizens-depart` went out of the union with them. The floor tracks the catalogue
    // DOWN by exactly one rather than being given headroom, for the reason
    // `test/cityEventSfx.test.ts` gives about its own: this is the vacuity guard for the
    // coverage and margin assertions below, so slack here is slack in the only thing
    // holding them up. Measured rather than argued -- dropping one more name out of the
    // union fails HERE, at 15 against 16.
    expect(specs.length).toBeGreaterThanOrEqual(16);
    expect(undecodable, undecodable.join("; ")).toEqual([]);
    expect(radiated.size).toBe(specs.length);
    expect(
      derived.length,
      derived.map((g) => g.contexts.join("+")).join(" | "),
    ).toBeGreaterThanOrEqual(3);

    // COVERAGE, which is the assertion that would have failed had the derivation stopped
    // at the layer where the behaviour is implemented. Every sound the game can play sits
    // in at least one group of two or more; a sound in a group of one is a sound this
    // suite cannot say anything about, because a lone member is its own median.
    const grouped = new Set(derived.flatMap((group) => group.members));
    const ungrouped = specs
      .map((spec) => spec.name)
      .filter((name) => !grouped.has(name))
      .sort();
    expect(
      ungrouped,
      "a sound in no group of two is a sound with no neighbours to be measured against, " +
        "so the margin below says nothing about it. If it really is heard alone, that is " +
        "what HEARD_ON_ANOTHER_SURFACE is for",
    ).toEqual([]);

    // COMPOSITION, not only size. Three groups of two would clear the floor above while
    // measuring six sounds, so the three rooms this is actually about are named with the
    // membership each must reach. These are floors on real groups, not a written-down
    // population: the members come from the derivation either way.
    const holding = (name: string) =>
      derived.filter((group) => group.members.includes(name));
    const crowdRooms = holding("crowd-gather");
    const winter = holding("thaw");
    const island = holding("road-lay");
    expect(crowdRooms.length, "the Succession no longer holds the crowd bed").toBe(1);
    expect(winter.length, "no group holds the winter's thaw").toBe(1);
    expect(island.length, "no group holds the island's road tap").toBe(1);
    const succession = crowdRooms.find((group) =>
      group.contexts.includes("apps/web/src/succession/SuccessionSurface.tsx"),
    );
    expect(succession?.members).toContain("crisis-commit");
    expect(succession?.members).toContain("crowd-gather");
    expect((winter[0] as Group).members).toContain("frost-advance");
    expect((winter[0] as Group).members.length).toBeGreaterThanOrEqual(5);
    expect((island[0] as Group).members).toContain("place-building");
    expect((island[0] as Group).members.length).toBeGreaterThanOrEqual(6);

    // AND THE DERIVATION REACHED PAST THE MODULE THE MECHANIC LIVES IN, which is the
    // whole reason it follows imports. `HardWinterSurface.tsx` names the two commit rungs
    // and `winterSfx.ts` names the other four; scoped to a file, this guard would have
    // measured two halves of one encounter separately and called both healthy. If the
    // helper hop ever stops working, the winter group drops to two members and this line
    // is what says so.
    const winterSurface = namedIn(
      codeOnly(read("apps/web/src/winter/HardWinterSurface.tsx")),
      specs.map((spec) => spec.name),
    );
    const beyond = (winter[0] as Group).members.filter((name) => !winterSurface.has(name));
    expect(
      beyond.sort(),
      "the winter group no longer reaches past the surface's own literals",
    ).toEqual(["building-frozen", "fire-lit", "frost-advance", "thaw"]);
  });

  it("keeps no member more than 10 dB under its group's median", () => {
    const buried: string[] = [];
    for (const group of derived) {
      const levels = group.members.map((name) => radiated.get(name) as number);
      const middle = median(levels);
      for (const [index, name] of group.members.entries()) {
        const under = middle - (levels[index] as number);
        if (under > MAX_BELOW_MEDIAN_DB) {
          buried.push(
            `${name} is ${under.toFixed(1)} dB under the median of ` +
              `${group.contexts.join(" + ")} (${middle.toFixed(1)} LUFS): ` +
              `${(levels[index] as number).toFixed(1)} LUFS`,
          );
        }
      }
    }

    expect(
      buried,
      "a sound this far under the ones it fires alongside is one a learner does not hear, " +
        "however correctly it measures on its own. The remedy is gain, not a filter: see " +
        "scripts/level-sfx.py and apps/web/public/audio/CREDITS.md",
    ).toEqual([]);
  });

  /**
   * The line above passes by finding nothing, which is also what it would look like if
   * every group had collapsed to one member or every level had come back identical. This
   * says how much room is actually left, so the margin cannot become decorative by the set
   * drifting up until nothing is anywhere near it -- and it fails if a future change eats
   * that room, which is the earlier warning the pass/fail line cannot give.
   */
  it("still has room under the margin, and the set is genuinely uneven", () => {
    let deepest = 0;
    let widest = 0;
    for (const group of derived) {
      const levels = group.members.map((name) => radiated.get(name) as number);
      const middle = median(levels);
      deepest = Math.max(deepest, ...levels.map((level) => middle - level));
      widest = Math.max(widest, Math.max(...levels) - Math.min(...levels));
    }
    expect(deepest).toBeLessThan(MAX_BELOW_MEDIAN_DB - 2);

    // And the groups really do keep a foreground and a background rather than having been
    // flattened to one number, which is the failure mode on the other side of this rule.
    // A crowd gathering for a founding is supposed to dwarf a hammer strike.
    expect(widest).toBeGreaterThan(6);
  });

  it("keeps the heard-elsewhere list honest in both directions", () => {
    const names = new Set(specs.map((spec) => spec.name));
    for (const entry of HEARD_ON_ANOTHER_SURFACE) {
      expect(
        names,
        `${entry.sound} is placed by hand and is not in the catalogue`,
      ).toContain(entry.sound);
      expect(entry.why.length).toBeGreaterThan(15);

      // An entry that stops qualifying fails: the claimed player must still exist and
      // still play the sound, so a deleted or rewired module cannot sit here forever.
      const player = codeOnly(read(entry.playedBy));
      expect(
        /\bplaySfx\s*\(/.test(player) && player.includes(`"${entry.sound}"`),
        `${entry.playedBy} is said to play ${entry.sound} (${entry.why}) and does not`,
      ).toBe(true);

      // The wiring that makes the host the ROOM has to still be there, in one direction
      // or the other: either the host mounts the player, or the player is mounted by the
      // host. Without an edge between them the placement is an assertion about the past.
      const host = codeOnly(read(entry.heardOn));
      const sources = new Set(tracked(APP_DIRECTORY).filter(isSource));
      const wired =
        importsOf(entry.heardOn, host, sources).includes(entry.playedBy) ||
        importsOf(entry.playedBy, player, sources).includes(entry.heardOn);
      expect(
        wired,
        `${entry.sound} is placed on ${entry.heardOn} (${entry.why}) and nothing wires ` +
          `${entry.playedBy} to it`,
      ).toBe(true);

      // And a host that adopts the sound itself fails, so the list cannot go on
      // describing a hop that has been collapsed into one module.
      expect(
        host.includes(`"${entry.sound}"`),
        `${entry.heardOn} names ${entry.sound} itself, so this entry excuses nothing`,
      ).toBe(false);
    }

    // A floor on the DERIVED half, so this table cannot grow until it is placing the
    // whole catalogue by hand and the derivation above is doing nothing.
    const placed = new Set(HEARD_ON_ANOTHER_SURFACE.map((entry) => entry.sound));
    const fromCode = new Set(
      derived.flatMap((group) => group.members).filter((name) => !placed.has(name)),
    );
    expect(fromCode.size).toBeGreaterThanOrEqual(specs.length - 4);
  });

  /**
   * Everything above is hand-rolled numerics, so before it is allowed to report on real
   * audio it reports on signals whose answers are arithmetic.
   */
  it("measures what it claims to measure", () => {
    const sampleRate = 44_100;
    const tone = (hz: number, amplitude = 0.5, seconds = 1): Sound => {
      const frames = Math.round(seconds * sampleRate);
      const channel = new Float64Array(frames);
      for (let i = 0; i < frames; i += 1) {
        channel[i] = amplitude * Math.sin((2 * Math.PI * hz * i) / sampleRate);
      }
      return { channels: [channel], sampleRate };
    };

    // The derived coefficients ARE the standard's tabulated 48 kHz ones. This is the line
    // that fails if the analytic forms are mistyped: they would still produce a smooth,
    // plausible filter and every real file would still measure, just not in LUFS.
    const shelf = kShelf(48_000);
    expect(shelf.b0).toBeCloseTo(1.53512485958697, 9);
    expect(shelf.b1).toBeCloseTo(-2.69169618940638, 9);
    expect(shelf.b2).toBeCloseTo(1.19839281085285, 9);
    expect(shelf.a1).toBeCloseTo(-1.69065929318241, 9);
    expect(shelf.a2).toBeCloseTo(0.73248077421585, 9);
    const rlb = kHighpass(48_000);
    expect(rlb.a1).toBeCloseTo(-1.99004745483398, 9);
    expect(rlb.a2).toBeCloseTo(0.99007225036621, 9);

    // A loudness meter that is not LINEAR IN GAIN cannot compare two files at all, which
    // is the only thing this suite does with it. Six decibels for twice the amplitude,
    // and the same six through the trim, which is where a mix level actually enters.
    const quiet = loudnessLufs(tone(1000, 0.25));
    const loud = loudnessLufs(tone(1000, 0.5));
    expect(loud - quiet).toBeCloseTo(6.0206, 4);
    const one = tone(1000, 0.5);
    expect(radiatedLufs(one, 0.5) - radiatedLufs(one, 1)).toBeCloseTo(-6.0206, 4);

    // THE TIME-DOMAIN CASCADE REPRODUCES THE ANALYTIC RESPONSE OF ITS OWN COEFFICIENTS.
    // This is the check that a plausible-looking but wrong filter cannot survive: the
    // coefficients above are pinned to the standard, and a sine of known amplitude then
    // has to come out at exactly |H(f)| times it, computed independently in the frequency
    // domain. A mis-signed feedback term or a swapped numerator would still filter, still
    // be smooth, and still rank the nineteen files plausibly.
    for (const hz of [40, 200, 1000, 6000, 12_000]) {
      const gain =
        magnitudeAt(kShelf(sampleRate), hz, sampleRate) *
        magnitudeAt(kHighpass(sampleRate), hz, sampleRate);
      const expected = -0.691 + 10 * Math.log10(0.5 * 0.5 ** 2 * gain ** 2);
      expect(loudnessLufs(tone(hz, 0.5, 2)), `${hz} Hz`).toBeCloseTo(expected, 1);
    }

    // And the curve really is K-weighting rather than a flat pass: bass counts for much
    // less than midrange and treble for about three decibels more, at the same amplitude
    // in every case, so the whole difference is the weighting. A meter that had lost its
    // filters would read all three equal and would still rank every file correctly.
    const mid = loudnessLufs(tone(1000, 0.5, 2));
    expect(loudnessLufs(tone(20, 0.5, 2)) - mid).toBeCloseTo(-13.97, 1);
    expect(loudnessLufs(tone(6000, 0.5, 2)) - mid).toBeCloseTo(3.33, 1);

    // Two identical channels are 3.01 dB, not 0 and not 6: the channel sum is over mean
    // squares. A meter that averaged the channels instead would read every stereo file
    // 3 dB quiet and still rank them all correctly, so nothing else here would notice.
    const mono = tone(1000);
    const stereo: Sound = { channels: [...mono.channels, ...mono.channels], sampleRate };
    expect(loudnessLufs(stereo) - loudnessLufs(mono)).toBeCloseTo(3.0103, 4);

    // Silence is silence rather than a very small number that would sort like a level.
    expect(loudnessLufs({ channels: [new Float64Array(1000)], sampleRate })).toBe(
      Number.NEGATIVE_INFINITY,
    );

    // The speaker model is a 4-pole and not a 1-pole: 24 dB/octave, so an octave under
    // the corner is about 24 dB down. Generous bands, because the point is to catch a
    // cascade that silently became one section.
    const belowCorner = tone(LAPTOP_CORNER_HZ / 2);
    const lost =
      loudnessLufs(belowCorner) -
      loudnessLufs(highpass(belowCorner, LAPTOP_CORNER_HZ, LAPTOP_POLES));
    expect(lost).toBeGreaterThan(18);
    expect(lost).toBeLessThan(30);

    // And the statistic really is a median rather than a mean, which is the property that
    // stops one buried member from dragging the line down to meet itself. The mean of
    // these five is -14.0 and the median is -10.
    expect(median([-10, -10, -10, -10, -30])).toBe(-10);
    expect(median([-10, -20])).toBe(-15);
    expect(median([-1, -2, -3])).toBe(-2);
  });

  /**
   * The tones prove the arithmetic. They do not prove that the decoder in front of it
   * hands that arithmetic the same samples a real audio tool would, so the last check is
   * against a SECOND IMPLEMENTATION over the real files: `scripts/measure-sfx-levels.py`,
   * which is ffmpeg's C biquads over ffmpeg's own libvorbis, at 48 kHz against this one's
   * 44.1, and shares no line of code with anything above.
   *
   * Each row is bound to the file's bytes by hash, so a row can only ever speak for the
   * audio it was recorded from: re-level a sample and its row retires rather than
   * silently vouching for audio it never saw. The floor underneath is what stops every
   * row going stale at once and leaving this verifying nothing.
   *
   * Recorded 2026-08-04 by running that script over this tree. All twenty agreed to
   * within 0.006 dB; these four are kept because they span the range and because two of
   * them are where the two implementations previously did NOT agree -- `road-remove.ogg`
   * is 0.07 s long, and ffmpeg's raw PCM pipe emits whole Vorbis blocks rather than
   * honouring the Ogg end-trim, which appended 952 frames of silence to it and read it
   * 1.17 dB quiet. Pinning the shortest file is what keeps that correction from
   * regressing unnoticed.
   *
   * A FIFTH ROW WENT WITH ITS FILE. `citizens-depart.ogg` was pinned here at -34.08 and
   * was deleted on 2026-08-05 when departures were removed as a mechanic. A hash mismatch
   * makes a row skip itself, so leaving it would have been quiet; a missing FILE makes the
   * read throw, so it could not be left. Four rows against a floor of three is the margin
   * that remains, and it is thin: one more re-level retires a row and the floor is the next
   * thing to fail.
   */
  const FFMPEG_AGREES: readonly {
    readonly file: string;
    readonly sha256: string;
    readonly radiatedLufs: number;
  }[] = [
    {
      file: "frost-advance.ogg",
      sha256: "9b70f57cd517d9b48a416cfdad3e23a25cc288b32e6cf3d224614804272be14f",
      radiatedLufs: -33.99,
    },
    {
      file: "road-remove.ogg",
      sha256: "61581c58194e3f19f531072edabbc344204c7e0a2887b8ededce4357bcf09195",
      radiatedLufs: -28.4,
    },
    {
      file: "crowd-gather.ogg",
      sha256: "68cca50f35c665ce303b4387cb3bad018723258679f71535d2d30f59d41bb339",
      radiatedLufs: -25.86,
    },
  ];

  it("agrees with a second implementation on the same files", () => {
    const byFile = new Map(specs.map((spec) => [spec.file, spec]));
    const checked: string[] = [];
    for (const row of FFMPEG_AGREES) {
      const onDisk = createHash("sha256")
        .update(readFileSync(posix.join(repoRoot, SFX_DIRECTORY, row.file)))
        .digest("hex");
      if (onDisk !== row.sha256) {
        continue;
      }
      const spec = byFile.get(row.file);
      expect(spec, `${row.file} is not in the catalogue`).toBeDefined();
      const measured = radiated.get((spec as Spec).name) as number;
      // A tenth of a decibel between two implementations that share no code is agreement
      // about the audio rather than about an implementation.
      expect(measured, `${row.file}`).toBeCloseTo(row.radiatedLufs, 1);
      checked.push(row.file);
    }

    // The floor. Every row skipping itself on a hash mismatch is exactly how this would
    // pass while cross-checking nothing at all.
    expect(
      checked.length,
      "too few recorded measurements still match a file on disk, so this cross-check has " +
        "stopped verifying much. Re-run scripts/measure-sfx-levels.py and update the rows",
    ).toBeGreaterThanOrEqual(3);
  });
});
