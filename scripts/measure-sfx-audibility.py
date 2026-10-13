#!/usr/bin/env python3
"""Measure every shipped sound effect, and how much of it a laptop speaker throws away.

WHY THIS EXISTS. Three samples have been found whose energy sits mostly below the range
a laptop speaker reproduces, which makes them effectively silent in play while measuring
and sounding exactly as their sourcing rows describe: `fire-whoosh` (89% below 60 Hz),
the departing-citizens sample (85% below 60 Hz), and `ceremony-rebuild-late.ogg` (21.4%
below 20 Hz), which shipped. All three were found by accident, by different people doing
something else, so the population of undetected ones was unknown. This script is what
turns that into a measured population instead of a guess.

THE AUDIBILITY NUMBER IS THE HIGH-PASS LOSS, not the band shares. A band share says
where a sound's energy is; it does not say whether the sound survives a speaker. So each
file is also passed through a 4-pole high-pass at 200 Hz -- roughly what a laptop
speaker passes -- and what is reported is how much PEAK and RMS it loses. That is the
number the earlier investigations condemned files on (the departing sample lost 12.3 dB
peak / 15.5 dB RMS; after processing, 2.7 dB), so it is the number kept here.

NARROWBAND NUMBERS, NEVER A PICTURE. `ffmpeg`'s `showspectrumpic` draws a bright
horizontal line at whatever frequency its axis tick lands on, and it reads convincingly
as a tone: one investigation chased a phantom 2 kHz tone until re-rendering with a
different frequency range moved the "tone" to 1678 Hz. Every claim this script makes
about content comes from a numeric spectrum.

Usage:
    python3 scripts/measure-sfx-audibility.py                    # measure, print report
    python3 scripts/measure-sfx-audibility.py --json out.json    # also write the manifest
    python3 scripts/measure-sfx-audibility.py --dir some/other/dir --files a.ogg b.ogg

Requires `ffmpeg`/`ffprobe` on PATH plus `numpy` and `scipy`. It is a measurement tool
run by hand, not part of the test run: the guard that keeps this class of defect from
shipping again is `test/sfxAudibility.test.ts`, which decodes the files itself.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import subprocess
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path

import numpy as np
from scipy import signal

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SFX_DIR = REPO_ROOT / "apps" / "web" / "public" / "audio" / "sfx"

# What a laptop speaker passes, as a filter. Two cascaded 2-pole Butterworth sections:
# -6 dB at the corner and 24 dB/octave below it. Small laptop drivers roll off harder
# than this below ~150 Hz, so it is a conservative model of the loss, not a pessimistic
# one.
LAPTOP_CORNER_HZ = 200.0
LAPTOP_POLES = 4

# The remedy, for comparison in the same run: the 150 Hz high-pass already used on
# `fire-lit.ogg` and on the departing-citizens sample.
REMEDY_CORNER_HZ = 150.0

BANDS: list[tuple[str, float, float]] = [
    ("below20", 0.0, 20.0),
    ("below60", 0.0, 60.0),
    ("b120_500", 120.0, 500.0),
    ("above2k", 2000.0, math.inf),
    # The bell's octave, so a high-passed file can be checked for walking into it.
    ("b900_1200", 900.0, 1200.0),
]


def run(cmd: list[str]) -> bytes:
    done = subprocess.run(cmd, capture_output=True, check=False)
    if done.returncode != 0:
        raise RuntimeError(f"{' '.join(cmd[:6])}... failed: {done.stderr.decode()[-800:]}")
    return done.stdout


def probe(path: Path) -> dict:
    out = run(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "a:0",
            "-show_entries",
            "stream=sample_rate,channels,codec_name,duration:format=duration",
            "-of",
            "json",
            str(path),
        ]
    )
    parsed = json.loads(out)
    stream = parsed["streams"][0]
    return {
        "codec": stream["codec_name"],
        "sample_rate": int(stream["sample_rate"]),
        "channels": int(stream["channels"]),
        "container_seconds": float(parsed["format"]["duration"]),
    }


def decode(path: Path, filters: str | None = None, rate: int | None = None) -> tuple[np.ndarray, int]:
    """Decode to float32 PCM, shape (frames, channels). No normalisation anywhere.

    TRIMMED TO THE CONTAINER'S OWN DURATION. `ffmpeg`'s raw PCM pipe does not honour the
    Ogg end-trim -- it emits whole Vorbis blocks -- so eleven of the nineteen effects come
    out the wrong length: 128 frames short on ten, and 952 frames LONG on `road-remove.ogg`.
    `@wasm-audio-decoders/ogg-vorbis` reproduces the container duration exactly on all
    nineteen, so the container is the truth and the decode is cut or zero-padded to it.

    NONE OF THIS SCRIPT'S VERDICTS MOVES, which is why the correction is safe to make
    here: the audibility floors are peak loss, RMS loss and band shares, and every one of
    those is a RATIO over one frame set, so the frame count cancels. What it does fix is
    the one ABSOLUTE column, `lufs_ungated`, whose denominator IS that frame count: on the
    0.07 s `road-remove.ogg` the untrimmed decode reads 1.17 dB quiet.
    """
    info = probe(path)
    sr = rate or info["sample_rate"]
    channels = info["channels"]
    cmd = ["ffmpeg", "-v", "error", "-i", str(path)]
    if filters:
        cmd += ["-af", filters]
    cmd += ["-ar", str(sr), "-ac", str(channels), "-f", "f32le", "-c:a", "pcm_f32le", "-"]
    raw = run(cmd)
    samples = np.frombuffer(raw, dtype="<f4").astype(np.float64)
    if channels > 1:
        samples = samples[: len(samples) // channels * channels].reshape(-1, channels)
    else:
        samples = samples.reshape(-1, 1)
    want = round(info["container_seconds"] * sr)
    if samples.shape[0] > want:
        samples = samples[:want]
    elif samples.shape[0] < want:
        samples = np.vstack([samples, np.zeros((want - samples.shape[0], channels))])
    return samples, sr


def highpass_filter_arg(corner: float, poles: int) -> str:
    """`poles` as cascaded 2-pole sections, because ffmpeg's `highpass` caps at 2."""
    if poles % 2 != 0:
        raise ValueError("cascade in 2-pole sections")
    return ",".join([f"highpass=f={corner:g}:p=2"] * (poles // 2))


def db(value: float) -> float:
    return -float("inf") if value <= 0 else 20.0 * math.log10(value)


def peak_and_rms(samples: np.ndarray) -> tuple[float, float]:
    if samples.size == 0:
        return -float("inf"), -float("inf")
    peak = float(np.max(np.abs(samples)))
    rms = float(np.sqrt(np.mean(np.square(samples))))
    return db(peak), db(rms)


# ITU-R BS.1770-4 K-weighting at 48 kHz: a high-shelf, then an RLB high-pass.
K_SHELF_B = np.array([1.53512485958697, -2.69169618940638, 1.19839281085285])
K_SHELF_A = np.array([1.0, -1.69065929318241, 0.73248077421585])
K_RLB_B = np.array([1.0, -2.0, 1.0])
K_RLB_A = np.array([1.0, -1.99004745483398, 0.99007225036621])


def k_weighted_lufs(path: Path) -> float:
    """Whole-file K-weighted loudness, UNGATED.

    Why not only `ebur128`'s integrated value: EBU integration needs a 400 ms block and
    gates against a relative threshold, and eleven of these samples are shorter than
    0.5 s, so the gated number is floored or absent for exactly the files most in
    question. This ungated whole-file loudness is defined for every duration, which is
    what makes the column comparable across the set. The gated value is reported beside
    it where it exists.
    """
    samples, _ = decode(path, rate=48000)
    if samples.size == 0:
        return -float("inf")
    total = 0.0
    for channel in range(samples.shape[1]):
        y = signal.lfilter(K_SHELF_B, K_SHELF_A, samples[:, channel])
        y = signal.lfilter(K_RLB_B, K_RLB_A, y)
        total += float(np.mean(np.square(y)))  # G = 1.0 for L and R
    if total <= 0:
        return -float("inf")
    return -0.691 + 10.0 * math.log10(total)


def ebur128_integrated(path: Path) -> float | None:
    """ffmpeg's own gated integrated loudness, or None where the file is too short."""
    done = subprocess.run(
        ["ffmpeg", "-v", "info", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"],
        capture_output=True,
        check=False,
    )
    text = done.stderr.decode(errors="replace")
    match = re.search(r"^\s*I:\s*(-?[\d.]+|-inf)\s*LUFS", text, re.MULTILINE)
    if match is None:
        return None
    if match.group(1) == "-inf":
        return None
    value = float(match.group(1))
    # ffmpeg reports the -70 LUFS gate floor for anything below it, which for a 0.07 s
    # tick means "no block was long enough" rather than "this is silent".
    return None if value <= -70.0 else value


def spectrum(samples: np.ndarray, sr: int) -> tuple[np.ndarray, np.ndarray]:
    """Exact energy-per-bin decomposition of the whole file, summed over channels.

    A rectangular window over the entire signal is used deliberately. The DFT of a
    finite signal is an orthogonal decomposition of it, so summing |X(f)|^2 over a band
    IS that band's share of the signal's energy (Parseval). A Hann window would weight
    the middle of the file, which is wrong for samples whose whole point is a transient
    in the first 20 ms.
    """
    mono_energy = None
    for channel in range(samples.shape[1]):
        spec = np.fft.rfft(samples[:, channel])
        power = np.square(np.abs(spec))
        mono_energy = power if mono_energy is None else mono_energy + power
    freqs = np.fft.rfftfreq(samples.shape[0], d=1.0 / sr)
    assert mono_energy is not None
    return freqs, mono_energy


def band_shares(freqs: np.ndarray, energy: np.ndarray) -> dict[str, float]:
    total = float(np.sum(energy))
    if total <= 0:
        return {name: 0.0 for name, _, _ in BANDS}
    shares = {}
    for name, low, high in BANDS:
        mask = (freqs >= low) & (freqs < high)
        shares[name] = 100.0 * float(np.sum(energy[mask])) / total
    return shares


def spectral_centroid(freqs: np.ndarray, energy: np.ndarray) -> float:
    total = float(np.sum(energy))
    if total <= 0:
        return 0.0
    return float(np.sum(freqs * energy)) / total


def dc_share(freqs: np.ndarray, energy: np.ndarray) -> float:
    total = float(np.sum(energy))
    return 0.0 if total <= 0 else 100.0 * float(energy[0]) / total


def strongest_partials(samples: np.ndarray, sr: int, count: int = 5) -> list[dict]:
    """Narrowband peaks from an averaged periodogram. Numbers, never a picture."""
    mono = np.mean(samples, axis=1)
    nperseg = min(len(mono), 16384)
    if nperseg < 64:
        return []
    freqs, psd = signal.welch(mono, fs=sr, nperseg=nperseg, noverlap=nperseg // 2)
    order = np.argsort(psd)[::-1]
    picked: list[dict] = []
    for index in order:
        hz = float(freqs[index])
        if any(abs(hz - p["hz"]) < 25.0 for p in picked):
            continue
        picked.append({"hz": round(hz, 1), "psd_db": round(10.0 * math.log10(psd[index] + 1e-30), 1)})
        if len(picked) >= count:
            break
    return picked


def onset_and_peak(samples: np.ndarray, sr: int) -> dict:
    """Where the loudest 10 ms frame sits, and how long the rise to it takes.

    A trim has to be checked against what the sound is FOR. `ceremony-rebuild-late` is a
    plate impact whose character is the strike; the departing sample's was a contact that
    must not read as a slam. Both claims are about this pair of numbers, so both get
    measured before and after rather than argued.
    """
    mono = np.abs(np.mean(samples, axis=1))
    if mono.size == 0:
        return {}
    frame = max(1, int(0.010 * sr))
    trimmed = mono[: mono.size // frame * frame].reshape(-1, frame)
    if trimmed.size == 0:
        return {}
    envelope = np.sqrt(np.mean(np.square(trimmed), axis=1))
    loudest = int(np.argmax(envelope))
    peak_at = loudest * frame / sr
    floor = float(np.max(envelope)) * 0.1
    above = np.nonzero(envelope >= floor)[0]
    onset_at = float(above[0]) * frame / sr if above.size else 0.0
    return {
        "peak_frame_s": round(peak_at, 3),
        "onset_s": round(onset_at, 3),
        "rise_ms": round(max(0.0, peak_at - onset_at) * 1000.0, 1),
    }


@dataclass
class Measurement:
    file: str
    sha256: str
    bytes: int
    codec: str
    sample_rate: int
    channels: int
    container_seconds: float
    decoded_seconds: float
    peak_dbfs: float
    rms_dbfs: float
    lufs_ungated: float
    lufs_integrated_gated: float | None
    centroid_hz: float
    dc_percent: float
    bands: dict[str, float] = field(default_factory=dict)
    partials: list[dict] = field(default_factory=list)
    envelope: dict = field(default_factory=dict)
    # The audibility pair: what a laptop speaker throws away.
    hp200_peak_loss_db: float = 0.0
    hp200_rms_loss_db: float = 0.0
    hp150_peak_loss_db: float = 0.0
    hp150_rms_loss_db: float = 0.0


def measure(path: Path) -> Measurement:
    info = probe(path)
    raw = path.read_bytes()
    samples, sr = decode(path)
    peak, rms = peak_and_rms(samples)

    filtered200, _ = decode(path, filters=highpass_filter_arg(LAPTOP_CORNER_HZ, LAPTOP_POLES))
    peak200, rms200 = peak_and_rms(filtered200)
    filtered150, _ = decode(path, filters=highpass_filter_arg(REMEDY_CORNER_HZ, LAPTOP_POLES))
    peak150, rms150 = peak_and_rms(filtered150)

    freqs, energy = spectrum(samples, sr)

    return Measurement(
        file=path.name,
        sha256=hashlib.sha256(raw).hexdigest(),
        bytes=len(raw),
        codec=info["codec"],
        sample_rate=sr,
        channels=info["channels"],
        container_seconds=round(info["container_seconds"], 3),
        decoded_seconds=round(samples.shape[0] / sr, 3),
        peak_dbfs=round(peak, 2),
        rms_dbfs=round(rms, 2),
        lufs_ungated=round(k_weighted_lufs(path), 2),
        lufs_integrated_gated=ebur128_integrated(path),
        centroid_hz=round(spectral_centroid(freqs, energy), 1),
        dc_percent=round(dc_share(freqs, energy), 3),
        bands={name: round(value, 3) for name, value in band_shares(freqs, energy).items()},
        partials=strongest_partials(samples, sr),
        envelope=onset_and_peak(samples, sr),
        hp200_peak_loss_db=round(peak - peak200, 2),
        hp200_rms_loss_db=round(rms - rms200, 2),
        hp150_peak_loss_db=round(peak - peak150, 2),
        hp150_rms_loss_db=round(rms - rms150, 2),
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dir", default=str(DEFAULT_SFX_DIR))
    parser.add_argument("--files", nargs="*", default=None, help="default: every file in --dir")
    parser.add_argument("--json", default=None, help="write the measurements here")
    args = parser.parse_args()

    directory = Path(args.dir)
    if args.files:
        paths = [directory / name if "/" not in name else Path(name) for name in args.files]
    else:
        # DERIVED from the directory, never a written-down list: the whole reason three
        # defective files went unnoticed is that a sheet decided which ones to check.
        paths = sorted(p for p in directory.iterdir() if p.is_file())

    measurements = [measure(path) for path in paths]

    header = (
        f"{'file':28} {'dur':>6} {'LUFS':>7} {'<20Hz':>7} {'<60Hz':>7} "
        f"{'120-500':>8} {'>2kHz':>7} {'centr':>8} {'HP200 pk':>9} {'HP200 rms':>10}"
    )
    print(header)
    print("-" * len(header))
    for m in measurements:
        print(
            f"{m.file:28} {m.decoded_seconds:6.2f} {m.lufs_ungated:7.1f} "
            f"{m.bands['below20']:6.1f}% {m.bands['below60']:6.1f}% "
            f"{m.bands['b120_500']:7.1f}% {m.bands['above2k']:6.1f}% "
            f"{m.centroid_hz:7.0f}  {m.hp200_peak_loss_db:8.2f} {m.hp200_rms_loss_db:9.2f}"
        )

    if args.json:
        Path(args.json).write_text(
            json.dumps([asdict(m) for m in measurements], indent=2) + "\n", encoding="utf8"
        )
        print(f"\nwrote {args.json}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
