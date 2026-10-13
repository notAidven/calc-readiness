#!/usr/bin/env python3
"""Re-level the effects that sit far below the sounds they play alongside.

WHY, AND WHY IT IS NOT `process-sfx-audibility.sh`. That script fixes SPECTRUM: a file
whose energy is under 200 Hz is silent on a laptop however loud it measures, and the
remedy is a filter. This one fixes LEVEL, which is a different axis and needs a different
remedy. `ceremony-rebuild.ogg` clears every spectral floor -- 3.11 dB of peak loss and
4.02 dB of RMS loss through the laptop model, against a limit of 6 -- and still radiates
19 dB under the two ceremony beats it fires between. No filter detects that and no filter
fixes it. The file is simply too quiet.

GAIN ONLY. Nothing here re-sources, filters, trims or resamples. One `volume` filter and
a Vorbis re-encode at the directory's own `-q:a 3`.

WHY THE FILE'S GAIN AND NOT THE `trim` CONSTANT. The trim in `soundEffects.ts` is an
ATTENUATOR: the player computes `min(1, gain * trim)` onto an `HTMLMediaElement.volume`,
which is capped at 1, so a trim can only ever make a sample quieter. Both files here need
BOOST, and each already carries a trim of 0.6, so the trim route would need 1.90 and 2.09
-- neither of which exists. The instrument is the file. (The converse
case is real and is left alone: `civic-purchase.ogg` peaks at -0.40 dBFS, has no headroom
for a file gain at all, and could only be moved from its trim. It is inside its group's
margin, so it is not moved. See CREDITS.md.)

A THIRD TARGET IS GONE WITH ITS FILE. `album-open.ogg` was raised to sit level with
`road-lay.ogg`; #602 then cut the Album and deleted the sample, so the entry was removed
rather than left to `KeyError` on a file the measurement tool no longer reports.

EVERY TARGET IS ANCHORED ON A NAMED SIBLING, MEASURED AT RUN TIME rather than written
down, for the reason `process-sfx-audibility.sh` computes its makeup gain: a number
written down stops meaning what it meant the moment the thing it was derived from moves.
It also makes this script idempotent -- a second run measures the file it already wrote,
computes a gain of about zero, and skips rather than doubling.

Usage:
    python3 scripts/level-sfx.py --dry-run     # print the gains, write nothing
    python3 scripts/level-sfx.py

Verify afterwards with:
    python3 scripts/measure-sfx-levels.py
    python3 scripts/measure-sfx-audibility.py     # the spectral floors are gain-invariant
"""

from __future__ import annotations

import argparse
import json
import math
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SFX_DIR = REPO_ROOT / "apps" / "web" / "public" / "audio" / "sfx"
MEASURE = REPO_ROOT / "scripts" / "measure-sfx-levels.py"

# Vorbis quality 3, the same setting `process-sfx-audibility.sh` establishes: `-q:a 3` on
# the pack's `impactWood_heavy_000.ogg` reproduces the byte count `crisis-commit.ogg`
# shipped at, so it is what the rest of the directory was encoded at.
QUALITY = 3

# A re-encode is not free, so a file already within this of its target is left alone
# rather than run through libvorbis a second time for nothing.
SKIP_UNDER_DB = 0.25

# The loudest any file may peak after its gain. Every sample in the set already sits under
# 0 dBFS and several are within a decibel of it; this refuses rather than clips, because a
# clipped sample is a worse defect than the quiet one being fixed.
PEAK_CEILING_DBFS = -1.0

# How far the frost bed sits under the crack it carries. Deliberately small: the claim is
# only that the crack of a building being reached must read ON TOP of the frost advancing,
# both started in the same `roundClosingSfx` return with a voice each, not that the frost
# should be background.
BED_UNDER_ITS_CRACK_DB = 1.0


def measured() -> dict[str, dict]:
    """Every file's radiated loudness, from the one measurement tool."""
    out = subprocess.run(
        [sys.executable, str(MEASURE), "--json", "/dev/stdout"],
        capture_output=True,
        check=True,
    ).stdout.decode()
    # The tool prints a table before the JSON, so take the document and not the report.
    start = out.index("[\n")
    end = out.rindex("]\n") + 2
    return {entry["file"]: entry for entry in json.loads(out[start:end])}


def targets(now: dict[str, dict]) -> dict[str, tuple[float, str]]:
    """What each file being re-levelled should radiate, and the sibling that says so."""

    def radiated(name: str) -> float:
        return now[name]["radiated_lufs"]

    # The gap #563 deliberately left between the two rungs of the OTHER material ladder,
    # after re-sourcing the timber one. Timber under iron by this much is what a rung of
    # this game's material ladder is currently defined to sound like, so the rebuild
    # ladder is set to the same spacing rather than to a number invented here.
    rung_gap = radiated("crisis-commit-late.ogg") - radiated("crisis-commit.ogg")

    return {
        "ceremony-rebuild.ogg": (
            radiated("ceremony-rebuild-late.ogg") - rung_gap,
            f"{rung_gap:.2f} dB under its own iron rung, the spacing the crisis-commit "
            "ladder already carries",
        ),
        "frost-advance.ogg": (
            radiated("building-frozen.ogg") - BED_UNDER_ITS_CRACK_DB,
            f"{BED_UNDER_ITS_CRACK_DB:.2f} dB under building-frozen.ogg, the crack it is "
            "started alongside when a round closes",
        ),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    now = measured()
    plan = targets(now)
    for name, (target, why) in plan.items():
        entry = now[name]
        gain = target - entry["radiated_lufs"]
        print(f"{name}: {entry['radiated_lufs']:.2f} -> {target:.2f} LUFS ({gain:+.2f} dB)")
        print(f"    {why}")
        if abs(gain) < SKIP_UNDER_DB:
            print(f"    already there (under {SKIP_UNDER_DB} dB), left alone")
            continue
        peak_after = entry["peak_dbfs"] + gain
        if peak_after > PEAK_CEILING_DBFS:
            raise SystemExit(
                f"{name} would peak at {peak_after:.2f} dBFS, over the {PEAK_CEILING_DBFS} "
                "dBFS ceiling. Its level cannot come from the file; see the trim note in "
                "this script's docstring."
            )
        print(f"    peak {entry['peak_dbfs']:.2f} -> {peak_after:.2f} dBFS")
        if args.dry_run:
            continue
        path = SFX_DIR / name
        staged = path.with_suffix(".levelling.ogg")
        subprocess.run(
            ["ffmpeg", "-y", "-v", "error", "-i", str(path),
             "-af", f"volume={gain:.4f}dB", "-c:a", "libvorbis", "-q:a", str(QUALITY),
             str(staged)],
            check=True,
        )
        before = path.stat().st_size
        staged.replace(path)
        print(f"    wrote {path.name}: {before} -> {path.stat().st_size} B")

    print("\nverify with: python3 scripts/measure-sfx-levels.py")
    return 0


if __name__ == "__main__":
    sys.exit(math.floor(main()))
