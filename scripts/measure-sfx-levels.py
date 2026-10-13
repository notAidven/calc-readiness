#!/usr/bin/env python3
"""How loud each shipped effect actually is at the level the game plays it.

WHY THIS EXISTS, AND WHY IT IS NOT `measure-sfx-audibility.py`. That script answers
"does a laptop speaker pass this sound at all", which is a question about SPECTRUM: a
file whose energy sits under 200 Hz is silent however loud it measures. This one answers
a question about LEVEL, which is independent and was left open by that sweep:
`ceremony-rebuild.ogg` passes the spectral floor at 3.11 / 4.02 dB of high-pass loss and
still radiates 19 dB under the two ceremony beats it fires between. No filter fixes that
and no filter detects it.

THE NUMBER IS RADIATED LOUDNESS, NOT FILE LOUDNESS. What a learner hears is the file
through the laptop's own roll-off, scaled by the per-sample `trim` in
`apps/web/src/audio/soundEffects.ts`. Two files at the same file loudness and different
trims are not equally loud, and two files at the same trim and different spectra are not
either. So the column that decides is

    radiated = K-weighted LUFS( high-pass(file, 200 Hz, 4-pole) ) + 20*log10(trim)

which reproduces the four figures the audibility sweep recorded to 0.01 dB.

THE LOUDNESS IS UNGATED AND WHOLE-FILE, for the reason that sweep gives: EBU R 128
integration needs a 400 ms block and gates against a relative threshold, and seven of
the nineteen samples have no gated figure at all -- six run shorter than 400 ms and
`ceremony-rebuild.ogg` lands on exactly 0.400 s -- so the gated number is absent for
exactly the files most in question. The ungated whole-file K-weighted loudness of
BS.1770-4 is defined at every duration, which is what makes the column comparable across
the set. Both are printed; only the first is comparable.

GROUPS, NOT ONE TARGET. These sounds are not meant to be equally loud -- a crowd
gathering should be bigger than a road tile going down -- so the report is grouped by
what can be heard alongside what, and the deviation printed is from the GROUP's median.
`test/sfxLevels.test.ts` derives those groups from the call sites and is the guard; this
script takes them as an argument so the two cannot drift apart silently.

Usage:
    python3 scripts/measure-sfx-levels.py                       # table, sorted by level
    python3 scripts/measure-sfx-levels.py --groups groups.json  # also per-group deviations
    python3 scripts/measure-sfx-levels.py --json out.json

Requires `ffmpeg`/`ffprobe` on PATH plus `numpy` and `scipy`. A measurement tool run by
hand, not part of the test run.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import subprocess
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from statistics import median

import numpy as np
from scipy import signal

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SFX_DIR = REPO_ROOT / "apps" / "web" / "public" / "audio" / "sfx"
CATALOG = REPO_ROOT / "apps" / "web" / "src" / "audio" / "soundEffects.ts"

# The same speaker model `measure-sfx-audibility.py` uses, so "radiated" means the same
# thing in both reports.
LAPTOP_CORNER_HZ = 200.0
LAPTOP_POLES = 4

# ITU-R BS.1770-4 K-weighting at 48 kHz: a high-shelf, then an RLB high-pass.
K_SHELF_B = np.array([1.53512485958697, -2.69169618940638, 1.19839281085285])
K_SHELF_A = np.array([1.0, -1.69065929318241, 0.73248077421585])
K_RLB_B = np.array([1.0, -2.0, 1.0])
K_RLB_A = np.array([1.0, -1.99004745483398, 0.99007225036621])


def run(cmd: list[str]) -> bytes:
    done = subprocess.run(cmd, capture_output=True, check=False)
    if done.returncode != 0:
        raise RuntimeError(f"{' '.join(cmd[:6])}... failed: {done.stderr.decode()[-800:]}")
    return done.stdout


def probe(path: Path) -> tuple[int, float]:
    out = run(
        [
            "ffprobe", "-v", "error", "-select_streams", "a:0",
            "-show_entries", "stream=channels:format=duration", "-of", "json", str(path),
        ]
    )
    parsed = json.loads(out)
    return int(parsed["streams"][0]["channels"]), float(parsed["format"]["duration"])


def decode(path: Path, filters: str | None = None) -> np.ndarray:
    """Decode to 48 kHz float PCM, shape (frames, channels). No normalisation anywhere.

    TRIMMED TO THE CONTAINER'S OWN DURATION, which is not cosmetic. `ffmpeg`'s raw PCM
    pipe does not honour the Ogg end-trim: it emits whole Vorbis blocks, so eleven of the
    nineteen effects come out the wrong length -- 128 frames short on ten of them and 952
    frames LONG on `road-remove.ogg`. Loudness is mean power, so the frame count is the
    denominator, and on a 0.07 s tick 952 frames of appended silence read as 1.17 dB
    quieter. (Measured: the disputed frames carry 0.00017% of the file's energy, and the
    whole disagreement is 10*log10(frames_ffmpeg / frames_container) to within 0.005 dB.)
    The container duration is the truth here -- `@wasm-audio-decoders/ogg-vorbis`, which
    `test/sfxLevels.test.ts` decodes with, reproduces it exactly on all nineteen files -- so
    the decode is cut or zero-padded to it.

    This does not disturb `measure-sfx-audibility.py`'s verdicts even where it shares the
    defect: peak loss, RMS loss and band shares are all RATIOS over one frame set, so the
    denominator cancels out of every one of them.
    """
    channels, seconds = probe(path)
    cmd = ["ffmpeg", "-v", "error", "-i", str(path)]
    if filters:
        cmd += ["-af", filters]
    cmd += ["-ar", "48000", "-ac", str(channels), "-f", "f32le", "-c:a", "pcm_f32le", "-"]
    raw = np.frombuffer(run(cmd), dtype="<f4").astype(np.float64)
    samples = raw[: len(raw) // channels * channels].reshape(-1, channels)
    want = round(seconds * 48000)
    if samples.shape[0] > want:
        return samples[:want]
    if samples.shape[0] < want:
        return np.vstack([samples, np.zeros((want - samples.shape[0], channels))])
    return samples


def highpass_arg(corner: float, poles: int) -> str:
    """`poles` as cascaded 2-pole sections, because ffmpeg's `highpass` caps at 2."""
    return ",".join([f"highpass=f={corner:g}:p=2"] * (poles // 2))


def k_weighted_lufs(samples: np.ndarray) -> float:
    """Whole-file K-weighted loudness, UNGATED. See the module docstring."""
    if samples.size == 0:
        return -float("inf")
    total = 0.0
    for channel in range(samples.shape[1]):
        y = signal.lfilter(K_SHELF_B, K_SHELF_A, samples[:, channel])
        y = signal.lfilter(K_RLB_B, K_RLB_A, y)
        total += float(np.mean(np.square(y)))  # G = 1.0 for L and R
    return -0.691 + 10.0 * math.log10(total) if total > 0 else -float("inf")


def ebur128_integrated(path: Path) -> float | None:
    """ffmpeg's own gated integrated loudness, or None where the file is too short."""
    done = subprocess.run(
        ["ffmpeg", "-v", "info", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"],
        capture_output=True,
        check=False,
    )
    match = re.search(r"^\s*I:\s*(-?[\d.]+|-inf)\s*LUFS", done.stderr.decode(errors="replace"), re.M)
    if match is None or match.group(1) == "-inf":
        return None
    value = float(match.group(1))
    # ffmpeg reports the -70 LUFS gate floor for anything below it, which for a 0.07 s
    # tick means "no block was long enough" rather than "this is silent".
    return None if value <= -70.0 else value


def trims() -> dict[str, float]:
    """Every sample's mix trim, read off the catalogue rather than written down here.

    The sanity check is against the catalogue's own `SfxName` union rather than against a
    count written here, because a count written here goes stale the moment the catalogue
    moves: it said twenty until `citizens-depart` left with the departures mechanic on
    2026-08-05, at which point it would have refused a correct parse of nineteen. The floor
    underneath it is what stops the comparison going vacuous, since two regexes that both
    match nothing agree perfectly.
    """
    source = CATALOG.read_text(encoding="utf8")
    found: dict[str, float] = {}
    for block in re.finditer(
        r'file:\s*"([^"]+)"[^}]*?trim:\s*([0-9.]+)', source, re.S
    ):
        found[block.group(1)] = float(block.group(2))
    union = re.search(r"export type SfxName =(.*?);", source, re.S)
    named = len(re.findall(r'"[a-z0-9-]+"', union.group(1))) if union else 0
    if named < 10:
        raise RuntimeError(f"only {named} names parsed out of {CATALOG}'s SfxName union")
    if len(found) < named:
        raise RuntimeError(
            f"only {len(found)} trims parsed out of {CATALOG} for {named} catalogued sounds"
        )
    return found


@dataclass
class Level:
    file: str
    sha256: str
    seconds: float
    trim: float
    trim_db: float
    file_lufs: float
    radiated_lufs: float
    gated_lufs: float | None
    peak_dbfs: float


def measure(path: Path, trim: float) -> Level:
    raw = decode(path)
    frames = raw.shape[0]
    filtered = decode(path, filters=highpass_arg(LAPTOP_CORNER_HZ, LAPTOP_POLES))
    trim_db = 20.0 * math.log10(trim)
    return Level(
        file=path.name,
        sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
        seconds=round(frames / 48000.0, 3),
        trim=trim,
        trim_db=round(trim_db, 2),
        file_lufs=round(k_weighted_lufs(raw), 2),
        radiated_lufs=round(k_weighted_lufs(filtered) + trim_db, 2),
        gated_lufs=ebur128_integrated(path),
        peak_dbfs=round(20.0 * math.log10(max(1e-12, float(np.max(np.abs(raw))))), 2),
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dir", default=str(DEFAULT_SFX_DIR))
    parser.add_argument("--groups", default=None, help='{"name": ["a.ogg", ...]} to report by group')
    parser.add_argument("--json", default=None)
    args = parser.parse_args()

    directory = Path(args.dir)
    trim_of = trims()
    # DERIVED from the directory, never a written-down list, for the reason the audibility
    # sweep gives: a sheet deciding which files get looked at is how three defects shipped.
    paths = sorted(p for p in directory.iterdir() if p.is_file())
    levels = [measure(path, trim_of.get(path.name, 1.0)) for path in paths]
    by_name = {level.file: level for level in levels}

    header = f"{'file':28} {'dur':>6} {'trim':>6} {'file LUFS':>10} {'radiated':>9} {'gated':>8}"
    print(header)
    print("-" * len(header))
    for level in sorted(levels, key=lambda entry: entry.radiated_lufs):
        gated = "  --  " if level.gated_lufs is None else f"{level.gated_lufs:6.1f}"
        print(
            f"{level.file:28} {level.seconds:6.2f} {level.trim:6.2f} "
            f"{level.file_lufs:10.1f} {level.radiated_lufs:9.1f} {gated:>8}"
        )

    spread = max(l.radiated_lufs for l in levels) - min(l.radiated_lufs for l in levels)
    print(f"\nradiated spread across the set: {spread:.1f} dB")

    if args.groups:
        groups: dict[str, list[str]] = json.loads(Path(args.groups).read_text(encoding="utf8"))
        for name, members in groups.items():
            present = [by_name[m] for m in members if m in by_name]
            if len(present) < 2:
                continue
            mid = median(level.radiated_lufs for level in present)
            print(f"\n{name}   median {mid:.1f} LUFS")
            for level in sorted(present, key=lambda entry: entry.radiated_lufs):
                print(
                    f"    {level.file:28} {level.radiated_lufs:7.1f}  "
                    f"{level.radiated_lufs - mid:+6.1f} vs median"
                )

    if args.json:
        Path(args.json).write_text(
            json.dumps([asdict(level) for level in levels], indent=2) + "\n", encoding="utf8"
        )
        print(f"\nwrote {args.json}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
