#!/usr/bin/env bash
#
# Regenerate the two sound effects that were processed for audibility.
#
# WHY. Both files, as published, put most of their energy below the range a laptop
# speaker reproduces, so a learner on a laptop heard little or nothing of them. The
# remedy is the one already used on `fire-lit.ogg`: a high-pass at 150 Hz, then a makeup
# gain that puts the peak back where the mix expects it, so the sample stays a drop-in
# replacement and no trim in `soundEffects.ts` has to move.
#
# `apps/web/public/audio/CREDITS.md` holds the measurements and the reasoning. This
# script exists so the difference from the CC0 source is reproducible rather than merely
# asserted: run it against a fresh download of the pack and you get the shipped bytes'
# audio back.
#
# The makeup gain is COMPUTED from the filtered peak rather than written down, so the
# target is "the peak the mix was trimmed against" rather than a magic number that would
# silently stop meaning that if the filter changed.
#
# Usage:
#   scripts/process-sfx-audibility.sh <path-to-kenney_impact-sounds/Audio> [outdir]
#
# The pack is Kenney's Impact Sounds 1.0, CC0:
#   https://kenney.nl/assets/impact-sounds
#
# Verify afterwards with:
#   python3 scripts/measure-sfx-audibility.py

set -euo pipefail

PACK="${1:-}"
OUT="${2:-apps/web/public/audio/sfx}"

if [[ -z "$PACK" || ! -d "$PACK" ]]; then
  echo "usage: $0 <path-to-kenney_impact-sounds/Audio> [outdir]" >&2
  exit 2
fi

# Two cascaded 2-pole sections: ffmpeg's `highpass` caps at 2 poles, and 4 is what the
# earlier fixes used. 24 dB/octave below 150 Hz.
HIGHPASS="highpass=f=150:p=2,highpass=f=150:p=2"

# Vorbis quality 3. Not a guess: `-q:a 3` on the pack's `impactWood_heavy_000.ogg`
# reproduces the shipped `crisis-commit.ogg` byte-for-byte in size (5,284 B), so it is
# what the rest of the directory was encoded at.
QUALITY=3

# Peak of the file each replaces, so the mix trim keeps meaning what it meant.
#
# `astats` rather than `volumedetect`: the latter rounds to 0.1 dB and measures through a
# 16-bit integer conversion, which is a coarse ruler to set a gain with.
peak_of() {
  ffmpeg -hide_banner -nostats -i "$1" \
    -af "$2,astats=measure_perchannel=none:measure_overall=Peak_level" -f null - 2>&1 |
    sed -n 's/.*Peak level dB: \(-\?[0-9.]*\).*/\1/p' | tail -1
}

process() {
  local source="$1" target="$2" want_peak="$3"
  local have makeup
  have="$(peak_of "$source" "$HIGHPASS")"
  makeup="$(python3 -c "print(f'{${want_peak} - (${have}):.3f}')")"
  echo "  ${source##*/} -> ${target##*/}: filtered peak ${have} dB, makeup ${makeup} dB"
  ffmpeg -y -v error -i "$source" \
    -af "${HIGHPASS},volume=${makeup}dB" \
    -c:a libvorbis -q:a "$QUALITY" "$target"
}

echo "high-passing at 150 Hz into $OUT"

# The crisis commit's TIMBER rung. Its published source was `impactWood_heavy_000.ogg`,
# and no filter could save that one: 99.0% of its energy sits below 200 Hz and 0.003%
# above 2 kHz, so there is no buried content for a high-pass to reveal, only a quieter
# version of the same inaudible thud. All five `impactWood_heavy_*` variants measure the
# same way. `impactWood_medium_000` is the same pack, the same material and the same
# intensity as the IRON rung it ladders against (`impactMetal_medium_000`), and it has
# the lowest radiated pitch of any variant that a laptop speaker can actually reproduce.
process "$PACK/impactWood_medium_000.ogg" "$OUT/crisis-commit.ogg" -0.91

# The ceremony's LATE rebuild strike. Same source as before, filtered: unlike the wood,
# the plate has real content above 200 Hz (its 400-500 Hz ring and a 2-12 kHz attack)
# under the sub-audible rumble, so the high-pass reveals the strike rather than removing
# it.
process "$PACK/impactPlate_heavy_000.ogg" "$OUT/ceremony-rebuild-late.ogg" -0.92

echo "done. verify with: python3 scripts/measure-sfx-audibility.py"
