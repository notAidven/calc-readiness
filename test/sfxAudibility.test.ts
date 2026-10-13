import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { posix } from "node:path";

import { OggVorbisDecoder } from "@wasm-audio-decoders/ogg-vorbis";
import { beforeAll, describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

/**
 * **EVERY SOUND THE GAME SHIPS IS ONE A LAPTOP SPEAKER CAN ACTUALLY REPRODUCE.**
 *
 * ## The defect this exists to stop, which shipped three times
 *
 * A sample can measure correctly, match its sourcing row in every word, and still be
 * silent in play, because a small laptop driver reproduces almost nothing below about
 * 200 Hz. Three files were found this way, each by accident and each by somebody doing
 * something else:
 *
 *  - `fire-whoosh`, 89% of its energy below 60 Hz, whose row promised *"a broadband roar
 *    to 17 kHz with pops"*. Caught before shipping.
 *  - the departing-citizens sample, 85% below 60 Hz, whose row said nothing about
 *    spectrum at all. Caught before shipping.
 *  - `ceremony-rebuild-late.ogg`, which SHIPPED, and sat in the tree unfixed.
 *
 * Three found by accident means the undetected population was unknown, which is what a
 * sweep answers and a guard keeps answered. The sweep that produced this file measured
 * all twenty effects and found a fourth: `crisis-commit.ogg` lost **15.6 dB of peak and
 * 17.0 dB of RMS** through the filter below, worse than any of the three above.
 *
 * ## Why the number is a filter loss and not a band share
 *
 * A band share says where a sound's energy IS. It does not say whether the sound
 * survives a speaker, and for a sub-half-second transient it is barely even well
 * defined: 20 Hz has a 50 ms period, so a 0.49 s file is ten cycles long and the "share
 * below 20 Hz" of `ceremony-rebuild-late` came out at 6.6%, 11.4% or 15.9% depending on
 * which perfectly ordinary estimator was used. A filter has no such freedom. Pass the
 * signal through what the speaker does and measure what is left.
 *
 * So the decisive floor is {@link MAX_LOSS_DB}: through a 4-pole high-pass at
 * {@link LAPTOP_CORNER_HZ}, a file may lose no more than 6 dB of peak and no more than 6
 * dB of RMS. Six decibels is half the amplitude — the point at which the speaker is
 * discarding more of the sound than it passes on. The evidence for where that line sits
 * is the earlier work's: the departing sample was condemned at 12.3 dB peak / 15.5 dB
 * RMS and accepted at 2.7 dB after processing, and `fire-lit.ogg` sits at 0.06 / 1.21.
 * Six is between the two bands with room on either side, and at this tip the worst
 * passing file is `road-remove.ogg` at 5.32 dB peak, which is the one to watch.
 *
 * ## And a second floor, for a second harm
 *
 * {@link MAX_SUB_60_PERCENT} is not a restatement of the first. A file can clear the
 * loss floor and still spend a third of itself on energy that no laptop, phone or tablet
 * radiates at all — which is bytes a learner downloads for nothing, and headroom taken
 * from the part of the sound they can hear, since the trim in `soundEffects.ts` is set
 * against a peak that inaudible content helped make. `ceremony-rebuild-late.ogg` was
 * exactly that: 2.82 dB of peak loss (a pass) over 36.9% of its energy below 60 Hz.
 *
 * ## The instrument is checked against signals with known answers
 *
 * A sweep that passes by finding nothing looks identical to a sweep whose detector is
 * broken. Everything below is hand-rolled numerics — a biquad cascade and a radix-2 FFT
 * — so before it is allowed to report on a real file it is made to report on synthetic
 * ones whose answers are arithmetic. See *"measures what it claims to measure"*.
 */

const repoRoot = resolveRepoRoot();

const AUDIO_DIRECTORY = "apps/web/public/audio";
const SFX_DIRECTORY = `${AUDIO_DIRECTORY}/sfx`;
const CATALOG_SOURCE = "apps/web/src/audio/soundEffects.ts";
const MUSIC_REGISTRY = "apps/web/src/audio/musicRegistry.ts";

/**
 * Roughly what a laptop speaker passes. Small drivers roll off harder than 24 dB/octave
 * below this, so the filter models less loss than the hardware imposes, not more.
 */
const LAPTOP_CORNER_HZ = 200;
const LAPTOP_POLES = 4;

/** Peak and RMS, in dB, that a file may lose through that filter. */
const MAX_LOSS_DB = 6;

/** Share of a file's energy allowed to sit below 60 Hz, where nothing small radiates. */
const MAX_SUB_60_PERCENT = 20;
const SUB_AUDIBLE_HZ = 60;

/* -------------------------------------------------------------------------- */
/* The instrument                                                              */
/* -------------------------------------------------------------------------- */

interface Sound {
  readonly channels: readonly Float32Array[];
  readonly sampleRate: number;
}

/**
 * One RBJ high-pass biquad, direct form I — the same transfer function `ffmpeg`'s
 * `highpass=f=…:p=2` applies, so the numbers here are comparable with the ones
 * `scripts/measure-sfx-audibility.py` prints and with the ones in `CREDITS.md`.
 */
function highpassOnce(
  input: Float32Array,
  sampleRate: number,
  corner: number,
): Float32Array {
  const w0 = (2 * Math.PI * corner) / sampleRate;
  const cosW0 = Math.cos(w0);
  const alpha = Math.sin(w0) / Math.SQRT2; // Q = 1/sqrt(2), Butterworth
  const a0 = 1 + alpha;
  const b0 = (1 + cosW0) / 2 / a0;
  const b1 = -(1 + cosW0) / a0;
  const b2 = b0;
  const a1 = (-2 * cosW0) / a0;
  const a2 = (1 - alpha) / a0;

  const out = new Float32Array(input.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < input.length; i += 1) {
    const x0 = input[i] as number;
    const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
    out[i] = y0;
  }
  return out;
}

/** `poles` of high-pass, as cascaded 2-pole sections. */
function highpass(sound: Sound, corner: number, poles: number): Sound {
  return {
    sampleRate: sound.sampleRate,
    channels: sound.channels.map((channel) => {
      let filtered = channel;
      for (let section = 0; section < poles / 2; section += 1) {
        filtered = highpassOnce(filtered, sound.sampleRate, corner);
      }
      return filtered;
    }),
  };
}

function toDb(amplitude: number): number {
  return amplitude <= 0 ? Number.NEGATIVE_INFINITY : 20 * Math.log10(amplitude);
}

function peakDb(sound: Sound): number {
  let peak = 0;
  for (const channel of sound.channels) {
    for (const sample of channel) {
      const magnitude = Math.abs(sample);
      if (magnitude > peak) {
        peak = magnitude;
      }
    }
  }
  return toDb(peak);
}

function rmsDb(sound: Sound): number {
  let sum = 0;
  let count = 0;
  for (const channel of sound.channels) {
    for (const sample of channel) {
      sum += sample * sample;
      count += 1;
    }
  }
  return count === 0 ? Number.NEGATIVE_INFINITY : toDb(Math.sqrt(sum / count));
}

/** In-place iterative radix-2 Cooley-Tukey. `re`/`im` must be a power-of-two length. */
function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j] as number, re[i] as number];
      [im[i], im[j]] = [im[j] as number, im[i] as number];
    }
  }
  for (let length = 2; length <= n; length <<= 1) {
    const angle = (-2 * Math.PI) / length;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);
    for (let start = 0; start < n; start += length) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < length / 2; k += 1) {
        const a = start + k;
        const b = a + length / 2;
        const bRe = (re[b] as number) * curRe - (im[b] as number) * curIm;
        const bIm = (re[b] as number) * curIm + (im[b] as number) * curRe;
        re[b] = (re[a] as number) - bRe;
        im[b] = (im[a] as number) - bIm;
        re[a] = (re[a] as number) + bRe;
        im[a] = (im[a] as number) + bIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

/**
 * The share of a sound's energy below `cutoff`, as a percentage.
 *
 * A rectangular window over the whole file, deliberately: the DFT of a finite signal is
 * an orthogonal decomposition of it, so a band's bin sum IS that band's share of the
 * energy (Parseval). A Hann window would weight the middle of the file, which is the
 * wrong thing to do to a sample whose entire point is a transient in its first 20 ms.
 */
function energyBelowPercent(sound: Sound, cutoff: number): number {
  const frames = sound.channels[0]?.length ?? 0;
  if (frames === 0) {
    return 0;
  }
  let size = 1;
  while (size < frames) {
    size <<= 1;
  }
  let total = 0;
  let below = 0;
  for (const channel of sound.channels) {
    const re = new Float64Array(size);
    const im = new Float64Array(size);
    re.set(channel);
    fft(re, im);
    for (let bin = 0; bin <= size / 2; bin += 1) {
      const power = (re[bin] as number) ** 2 + (im[bin] as number) ** 2;
      total += power;
      if ((bin * sound.sampleRate) / size < cutoff) {
        below += power;
      }
    }
  }
  return total === 0 ? 0 : (100 * below) / total;
}

/* -------------------------------------------------------------------------- */
/* The population                                                              */
/* -------------------------------------------------------------------------- */

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

function read(path: string): string {
  return readFileSync(posix.join(repoRoot, path), "utf8");
}

/**
 * A source with its comments blanked, keeping everything else byte-aligned. These modules
 * document themselves at length and quote the very tokens searched for below —
 * `musicRegistry.ts`'s "adding a track is one row" example is a complete `MusicTrack`
 * literal, `seconds: 0` and all, inside a block comment.
 */
function codeOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .replace(
      /(^|[^:])\/\/[^\n]*/g,
      (line, lead: string) => lead + " ".repeat(line.length - lead.length),
    );
}

/** Non-audio files that may sit in the tree beside the samples. */
function isAudio(path: string): boolean {
  return /\.(ogg|mp3|wav|m4a|flac)$/i.test(posix.basename(path));
}

/**
 * **WHAT IS NOT A DISCRETE EFFECT, DERIVED RATHER THAN LISTED.**
 *
 * The behavioural distinction the exemption rests on: a discrete effect is one short
 * event, so its whole content can sit under the speaker's range and the event is then
 * simply missing. A continuous track cannot go missing that way — it carries melody,
 * harmony and percussion across the spectrum, and its low end is the point rather than
 * ballast.
 *
 * **This used to be a written-down list of two paths and the list was the wrong shape.**
 * It named the two house `.mp3`s and required each to be REGISTERED in `MUSIC_TRACKS`,
 * which is a fact about the registry rather than about the sound. #601 then landed
 * fourteen generated era and crisis tracks in `music/` — 148 s each, none registered,
 * because registration is a later step in that pipeline. A two-entry list excuses none of
 * them, so all fourteen fell into the owed population, where this suite would have padded
 * a 6.5 M-frame FFT per channel per track to measure a soundtrack against a floor written
 * for a thud. `.cursor/rules/qa-verification.mdc`: *"define a guard's population by who
 * exhibits the behaviour, not by where the behaviour is implemented"* — and "is in the
 * registry" was the implementation.
 *
 * So the predicate is the behaviour: a file under `music/` that the effects catalogue does
 * not name is a track. What keeps that from becoming a hiding place is that it is
 * MEASURED and not declared — every excused file must be at least
 * {@link TRACK_MIN_SECONDS} long, read from the Ogg container or, for a file no Ogg parser
 * can read, from the duration its `MUSIC_TRACKS` row publishes. Both directions are
 * asserted in *"keeps the not-an-effect derivation honest in both directions"*:
 *
 *  - a short one-shot moved into `music/` to duck this sweep fails, by its own duration;
 *  - a file the effects catalogue names is never excused, wherever it sits;
 *  - a non-Ogg file with no registration row is not excused at all — it stays owed, and
 *    the Vorbis decoder then names it in `undecodable`.
 */
const TRACK_DIRECTORY = `${AUDIO_DIRECTORY}/music`;

/**
 * The shortest thing that counts as a continuous track. The two house loops are 62 s and
 * 97 s and the generated set is about 148 s each, while the longest discrete effect in
 * the game is `crowd-gather.ogg` at 4.27 s — so twenty seconds sits an order of magnitude
 * clear of both bands rather than splitting the difference between two neighbours.
 */
const TRACK_MIN_SECONDS = 20;

interface Measured {
  readonly path: string;
  readonly seconds: number;
  readonly peakLossDb: number;
  readonly rmsLossDb: number;
  readonly subAudiblePercent: number;
}

async function decode(path: string): Promise<Sound> {
  const decoder = new OggVorbisDecoder();
  await decoder.ready;
  try {
    const decoded = await decoder.decodeFile(
      new Uint8Array(readFileSync(posix.join(repoRoot, path))),
    );
    if (decoded.channelData.length === 0 || (decoded.channelData[0]?.length ?? 0) === 0) {
      throw new Error(`${path} decoded to no audio at all`);
    }
    return { channels: decoded.channelData, sampleRate: decoded.sampleRate };
  } finally {
    decoder.free();
  }
}

function measure(path: string, sound: Sound): Measured {
  const filtered = highpass(sound, LAPTOP_CORNER_HZ, LAPTOP_POLES);
  return {
    path,
    seconds: (sound.channels[0]?.length ?? 0) / sound.sampleRate,
    peakLossDb: peakDb(sound) - peakDb(filtered),
    rmsLossDb: rmsDb(sound) - rmsDb(filtered),
    subAudiblePercent: energyBelowPercent(sound, SUB_AUDIBLE_HZ),
  };
}

/**
 * How long an Ogg stream runs, WITHOUT decoding it: the granule position on its last
 * audio page is the sample index one past the end, so that over the identification
 * header's sample rate is the container's own duration.
 *
 * This exists so that excusing a 34 MB soundtrack from the sweep costs a tail read rather
 * than a full Vorbis decode and FFT. It is a hand-rolled container parse, so it is pinned
 * against the decoder over every shipped effect in *"reads a duration out of the container
 * that the decoder agrees with"* before it is trusted on anything it is the only reader of.
 */
function oggSeconds(path: string): number | null {
  const bytes = readFileSync(posix.join(repoRoot, path));
  const identity = bytes.indexOf(Buffer.from([0x01, 0x76, 0x6f, 0x72, 0x62, 0x69, 0x73]));
  if (identity < 0) {
    return null;
  }
  const sampleRate = bytes.readUInt32LE(identity + 12);
  if (sampleRate <= 0) {
    return null;
  }
  // Backwards for the last page whose granule position is not -1: a page carrying no
  // completed packet publishes 0xFFFF_FFFF_FFFF_FFFF and says nothing about duration.
  for (
    let at = bytes.lastIndexOf("OggS");
    at >= 0;
    at = bytes.lastIndexOf("OggS", at - 1)
  ) {
    const granule = bytes.readBigUInt64LE(at + 6);
    if (granule !== 0xffff_ffff_ffff_ffffn) {
      return Number(granule) / sampleRate;
    }
  }
  return null;
}

/** The duration a `MUSIC_TRACKS` row publishes for a file, or null if no row does. */
function registeredSeconds(path: string): number | null {
  const relative = path.replace(`${AUDIO_DIRECTORY}/`, "");
  const row = new RegExp(
    `\\{[^{}]*?file:\\s*"${relative.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^{}]*?\\}`,
    "s",
  ).exec(codeOnly(read(MUSIC_REGISTRY)));
  const seconds = row === null ? null : /seconds:\s*([0-9_]+)/.exec(row[0]);
  return seconds === null ? null : Number((seconds[1] as string).replace(/_/g, ""));
}

/** How long a file runs, by whichever reader can say: the container, else the registry. */
function publishedSeconds(path: string): number | null {
  return oggSeconds(path) ?? registeredSeconds(path);
}

/** Every audio file the app ships, and every one of them that owes the floors. */
const everyAudioFile = tracked(AUDIO_DIRECTORY).filter(isAudio);

/** Every basename the effects catalogue plays. A catalogued file is never a track. */
const catalogued = new Set(
  [...read(CATALOG_SOURCE).matchAll(/file:\s*"([^"]+)"/g)].map((match) =>
    posix.basename(match[1] as string),
  ),
);

function isTrackNotAnEffect(path: string): boolean {
  if (!path.startsWith(`${TRACK_DIRECTORY}/`) || catalogued.has(posix.basename(path))) {
    return false;
  }
  const seconds = publishedSeconds(path);
  return seconds !== null && seconds >= TRACK_MIN_SECONDS;
}

const excusedAsTracks = everyAudioFile.filter(isTrackNotAnEffect);
const excused = new Set(excusedAsTracks);
const owing = everyAudioFile.filter((path) => !excused.has(path));

let measurements: Measured[] = [];
let undecodable: string[] = [];

/**
 * Decoding COLLECTS its failures rather than throwing them.
 *
 * A throw here would be a `beforeAll` failure, and vitest reports that by SKIPPING every
 * test in the file — including the ones that would have said why. Injecting a stale entry
 * into the exception list proved it: the excused track fell back into the owing set, the
 * Vorbis decoder refused the MP3, and the run reported *"decoded to no audio at all"*
 * over five skipped tests instead of the one sentence naming the stale entry.
 */
beforeAll(async () => {
  measurements = [];
  undecodable = [];
  for (const path of owing) {
    try {
      measurements.push(measure(path, await decode(path)));
    } catch (error) {
      undecodable.push(`${path}: ${(error as Error).message}`);
    }
  }
}, 120_000);

describe("no effect ships that a laptop speaker cannot reproduce", () => {
  it("derives its population from the directory, and it is not empty", () => {
    // Floors first: every containment below holds trivially over an empty set, and a
    // `git ls-files` that lost its cwd would return one.
    expect(everyAudioFile.length, everyAudioFile.join(", ")).toBeGreaterThanOrEqual(22);
    expect(owing.length, owing.join(", ")).toBeGreaterThanOrEqual(16);

    // COMPOSITION, not only size, which is the half a floor cannot carry: sixteen of
    // anything satisfies a floor of sixteen, exemptions and rounding errors included. So
    // the claim that this sweep covers the effects the game actually ships is asserted as
    // a SET EQUALITY against the catalogue that plays them, in both directions at once —
    // a file in `sfx/` that nothing plays fails it, and a catalogue row whose file is
    // absent fails it. The count is a consequence rather than a constant.
    const wanted = [...read(CATALOG_SOURCE).matchAll(/file:\s*"([^"]+)"/g)]
      .map((match) => match[1] as string)
      .sort();
    const swept = owing
      .filter((path) => path.startsWith(`${SFX_DIRECTORY}/`))
      .map((path) => posix.basename(path))
      .sort();
    expect(wanted.length).toBeGreaterThanOrEqual(16);
    expect(swept).toEqual(wanted);

    // AND THE OWED POPULATION IS EXACTLY THAT SET, so a file excused as a track cannot
    // also be a catalogued effect and nothing owed sits outside the effects directory.
    // Without this the equality above is a claim about `sfx/` alone, and anything the
    // derivation wrongly OWED elsewhere would be measured against an effects floor in
    // silence.
    expect(owing.length, owing.join(", ")).toBe(swept.length);

    // And every one of them really was decoded, rather than skipped by a `continue` or
    // quietly dropped by a decoder that could not read it.
    expect(
      undecodable,
      "an audio file this guard could not read is a file it is not measuring. If it is " +
        "a soundtrack rather than an effect, it belongs under music/ with a duration this " +
        "suite can read: see the derivation above isTrackNotAnEffect",
    ).toEqual([]);
    expect(measurements.length).toBe(owing.length);
    for (const measured of measurements) {
      expect(measured.seconds, `${measured.path} decoded to nothing`).toBeGreaterThan(0.01);
    }
  });

  it("loses no more than 6 dB of peak or RMS through a 200 Hz high-pass", () => {
    const inaudible = measurements
      .filter((m) => m.peakLossDb > MAX_LOSS_DB || m.rmsLossDb > MAX_LOSS_DB)
      .map(
        (m) =>
          `${m.path}: -${m.peakLossDb.toFixed(2)} dB peak, -${m.rmsLossDb.toFixed(2)} dB RMS`,
      );

    expect(
      inaudible,
      "a sample a laptop speaker throws most of away is a sound the game cannot make, " +
        "however correctly it measures in every other respect. Re-source or high-pass " +
        "it: see apps/web/public/audio/CREDITS.md and scripts/process-sfx-audibility.sh",
    ).toEqual([]);
  });

  it("spends no more than a fifth of a file on energy nothing radiates", () => {
    const ballast = measurements
      .filter((m) => m.subAudiblePercent > MAX_SUB_60_PERCENT)
      .map(
        (m) => `${m.path}: ${m.subAudiblePercent.toFixed(1)}% below ${SUB_AUDIBLE_HZ} Hz`,
      );

    expect(
      ballast,
      "energy below 60 Hz is bytes the learner downloads for nothing and headroom taken " +
        "from the part of the sound they can hear, since the trim is set against a peak " +
        "that inaudible content helped make",
    ).toEqual([]);
  });

  it("keeps the not-an-effect derivation honest in both directions", () => {
    const catalog = read(CATALOG_SOURCE);

    // A floor on the OWED half, so the exemption cannot grow until it has swallowed the
    // population and this suite is asserting nothing over an empty set.
    expect(owing.length, owing.join(", ")).toBeGreaterThanOrEqual(16);

    // The exemption is load-bearing rather than decorative: it really is excusing
    // something, so the checks below are not passing over an empty list.
    expect(
      excusedAsTracks.length,
      "nothing is excused as a track, so this test proves nothing about the exemption",
    ).toBeGreaterThanOrEqual(2);

    for (const path of excusedAsTracks) {
      // THE LOAD-BEARING DIRECTION. A short one-shot dropped into `music/` to duck this
      // sweep fails here, on its own measured duration, whatever anybody has written down
      // about it. This is what the old two-entry list bought with a registry lookup and
      // could only ever say about files somebody had thought to register.
      const seconds = publishedSeconds(path);
      expect(
        seconds,
        `${path} is excused from the audibility sweep as a continuous track and no Ogg ` +
          "page or MUSIC_TRACKS row says how long it is",
      ).not.toBeNull();
      expect(
        seconds as number,
        `${path} is excused as a continuous track and runs ${(seconds as number).toFixed(2)} s. ` +
          `A discrete effect under ${TRACK_MIN_SECONDS} s owes the floors: catalogue it and ` +
          "put it in sfx/, or say why it is a track",
      ).toBeGreaterThanOrEqual(TRACK_MIN_SECONDS);

      // And the other direction: an effect cannot be excused by being moved into `music/`,
      // because the catalogue naming it disqualifies it wherever it sits. This is
      // asserted as well as being how `isTrackNotAnEffect` decides, so a later loosening
      // of that predicate fails here rather than quietly widening the exemption.
      expect(
        catalog.includes(posix.basename(path)),
        `${path} is excused as a track and the effects catalogue names it`,
      ).toBe(false);
    }

    // Every catalogued effect is OWED, which is the same claim from the other end: it is
    // what fails if the exemption ever starts reaching into the set it exists to exclude.
    for (const file of catalogued) {
      expect(
        excusedAsTracks.some((path) => posix.basename(path) === file),
        `${file} is played as an effect and something excused it as a track`,
      ).toBe(false);
    }
  });

  /**
   * {@link oggSeconds} is the only reader of the fourteen generated tracks, and it is a
   * hand-rolled container parse, so it is checked where a second reader exists: the
   * decoder already reports a frame count for every shipped effect, and the two have to
   * agree. A parser that returned a plausible but wrong number — the wrong endianness on
   * the granule position, or the sample rate read at the wrong offset — would still excuse
   * every soundtrack and would still look exactly like this test passing.
   */
  it("reads a duration out of the container that the decoder agrees with", () => {
    const checked: string[] = [];
    for (const measured of measurements) {
      if (!measured.path.endsWith(".ogg")) {
        continue;
      }
      const fromContainer = oggSeconds(measured.path);
      expect(
        fromContainer,
        `${measured.path} has no readable granule position`,
      ).not.toBeNull();
      // One millisecond. These files run from 0.07 s to 4.27 s, so a millisecond is
      // agreement about the audio rather than about a rounding convention.
      expect(fromContainer as number, measured.path).toBeCloseTo(measured.seconds, 3);
      checked.push(measured.path);
    }

    // The floor, because a `continue` that skipped every file is how this passes while
    // comparing nothing.
    expect(checked.length, checked.join(", ")).toBeGreaterThanOrEqual(16);

    // And it reads the tracks it is the only reader of, rather than returning null for
    // all of them and letting the exemption fall through to a registry row that the
    // generated set does not have.
    const readableTracks = excusedAsTracks.filter((path) => oggSeconds(path) !== null);
    expect(
      readableTracks.length,
      "no excused track's duration came from its container, so the parser above is " +
        "excusing nothing and the fourteen generated tracks are unmeasured either way",
    ).toBeGreaterThanOrEqual(14);
  });

  /**
   * The three assertions above pass by finding nothing, which is also exactly how they
   * would look if the biquad were returning its input or the FFT were returning zeros.
   * This pins the instrument against signals whose answers are arithmetic.
   */
  it("measures what it claims to measure", () => {
    const sampleRate = 44_100;
    const tone = (hz: number, seconds = 0.5): Sound => {
      const frames = Math.round(seconds * sampleRate);
      const channel = new Float32Array(frames);
      for (let i = 0; i < frames; i += 1) {
        channel[i] = 0.5 * Math.sin((2 * Math.PI * hz * i) / sampleRate);
      }
      return { channels: [channel], sampleRate };
    };

    // A 30 Hz tone is the defect in its purest form: inaudible on a laptop, and the
    // filter must throw essentially all of it away.
    const rumble = measure("30 Hz", tone(30));
    expect(rumble.subAudiblePercent).toBeGreaterThan(99);
    expect(rumble.peakLossDb).toBeGreaterThan(MAX_LOSS_DB);
    expect(rumble.rmsLossDb).toBeGreaterThan(30);

    // A 1 kHz tone is what a healthy sample looks like: the filter is transparent to it
    // and none of its energy is sub-audible. RMS is what carries the transparency claim,
    // two-sided and tight, because PEAK cannot be asserted that way — a high-pass fed a
    // signal that starts abruptly OVERSHOOTS for a few milliseconds, so a transparent
    // filter reads here as -0.66 dB of "loss" while the settled loss is 0.014 dB. That is
    // also why several shipped files measure a small negative peak loss; it is the filter
    // ringing at the onset, not the sound getting louder, and it is harmless either way
    // because the floor only ever cares which side of zero the loss is on.
    const clear = measure("1 kHz", tone(1000));
    expect(clear.subAudiblePercent).toBeLessThan(0.5);
    expect(clear.rmsLossDb).toBeLessThan(0.1);
    expect(clear.rmsLossDb).toBeGreaterThan(-0.1);
    expect(clear.peakLossDb).toBeLessThan(0.5);
    expect(clear.peakLossDb).toBeGreaterThan(-2);

    // The filter is a 4-pole and not a 1-pole: 24 dB/octave, so an octave below the
    // corner is about 24 dB down and two octaves about 48. Generous bands, because the
    // point is to catch a cascade that silently became one section, not to re-derive
    // Butterworth.
    const oneOctaveBelow = measure("100 Hz", tone(LAPTOP_CORNER_HZ / 2));
    expect(oneOctaveBelow.rmsLossDb).toBeGreaterThan(18);
    expect(oneOctaveBelow.rmsLossDb).toBeLessThan(30);

    // The band split is a real split and not "everything counts as low": a tone right
    // above the line lands above it, and one right below lands below.
    expect(energyBelowPercent(tone(55), SUB_AUDIBLE_HZ)).toBeGreaterThan(95);
    expect(energyBelowPercent(tone(70), SUB_AUDIBLE_HZ)).toBeLessThan(5);
  });

  /**
   * The tones above prove the arithmetic. They do not prove that the decoding path in
   * front of it hands that arithmetic the same samples a real audio tool would, so the
   * last check is against a SECOND IMPLEMENTATION over the real files:
   * `scripts/measure-sfx-audibility.py`, which is ffmpeg's C biquad over ffmpeg's own
   * libvorbis and shares no line of code with anything above.
   *
   * Each row is bound to the file's bytes by hash, so a row can only ever speak for the
   * audio it was recorded from: re-source a sample and its row stops applying rather than
   * failing for the wrong reason or, worse, silently vouching for audio it never saw. The
   * floor underneath is what stops every row going stale at once and leaving this
   * verifying nothing.
   *
   * Recorded 2026-08-04 by running that script over this tree. All twenty files agreed to
   * within 0.01 dB; these four are kept because they span the range — the two processed
   * files, the closest thing to a failure still shipping, and the one whose peak loss is
   * NEGATIVE because the filter overshoots at its onset.
   */
  const FFMPEG_AGREES: readonly {
    readonly file: string;
    readonly sha256: string;
    readonly peakLossDb: number;
    readonly rmsLossDb: number;
  }[] = [
    {
      file: "crisis-commit.ogg",
      sha256: "4dfc9248615d4ef926b821acec4c42ce71656fb499a1e0120100901707922384",
      peakLossDb: 2.98,
      rmsLossDb: 2.97,
    },
    {
      file: "road-remove.ogg",
      sha256: "61581c58194e3f19f531072edabbc344204c7e0a2887b8ededce4357bcf09195",
      peakLossDb: 5.32,
      rmsLossDb: 3.1,
    },
    {
      file: "crowd-gather.ogg",
      sha256: "68cca50f35c665ce303b4387cb3bad018723258679f71535d2d30f59d41bb339",
      peakLossDb: -1.54,
      rmsLossDb: 2.63,
    },
  ];

  it("agrees with a second implementation on the same files", () => {
    const checked: string[] = [];
    for (const row of FFMPEG_AGREES) {
      const path = `${SFX_DIRECTORY}/${row.file}`;
      const onDisk = createHash("sha256")
        .update(readFileSync(posix.join(repoRoot, path)))
        .digest("hex");
      if (onDisk !== row.sha256) {
        continue;
      }
      const measured = measurements.find((entry) => entry.path === path);
      expect(measured, `${path} is not in the swept population`).toBeDefined();
      // A tenth of a decibel between two implementations that share no code is
      // agreement about the audio rather than about an implementation.
      expect((measured as Measured).peakLossDb).toBeCloseTo(row.peakLossDb, 1);
      expect((measured as Measured).rmsLossDb).toBeCloseTo(row.rmsLossDb, 1);
      checked.push(row.file);
    }

    // The floor. Every row skipping itself on a hash mismatch is exactly how this test
    // would pass while cross-checking nothing at all.
    expect(
      checked.length,
      "no recorded measurement still matches a file on disk, so this cross-check " +
        "verified nothing. Re-run scripts/measure-sfx-audibility.py and update the rows",
    ).toBeGreaterThanOrEqual(2);
  });
});
