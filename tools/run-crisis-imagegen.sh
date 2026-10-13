#!/usr/bin/env bash
# Fire a crisis scene sheet, pass by pass, in the order its variants require.
#
# The passes are not a convenience. Seventeen of the twenty-nine crisis frames
# are image-to-image from an anchor, and a variant conditions on the file the
# anchor pass actually returned - so running the sheet as one batch asks the
# generator to read images that do not exist yet. Era four proved what happens
# when families are generated independently: a sheet claiming three views of one
# building came back as three different buildings, one of them missing the era's
# only terracotta roof.
#
# Era six needs four passes because three of its variants derive from frame 6,
# which is itself a variant. Era nine needs three.
#
#   tools/run-crisis-imagegen.sh plague --dry-run
#   tools/run-crisis-imagegen.sh plague
#   tools/run-crisis-imagegen.sh intrusion
#
# Generation costs money. --dry-run prints each pass and its frame count and
# writes nothing.

set -euo pipefail

CRISIS="${1:-}"
DRY="${2:-}"

case "$CRISIS" in
  plague)    DIR="output/imagegen/era-06-plague-crisis-scenes" ;;
  intrusion) DIR="output/imagegen/era-09-intrusion-crisis-scenes" ;;
  *)
    echo "usage: $0 {plague|intrusion} [--dry-run]" >&2
    exit 2
    ;;
esac

SHEET="$DIR/imagegen-run-sheet.jsonl"
GEN="$HOME/.codex/skills/.system/imagegen/scripts/image_gen.py"

[ -f "$SHEET" ] || { echo "no run sheet at $SHEET" >&2; exit 1; }

if [ ! -f "$GEN" ] && [ "$DRY" != "--dry-run" ]; then
  echo "imagegen not found at $GEN" >&2
  echo "It lives in the agent-harness skill directory, not in this repo." >&2
  exit 1
fi

# tr -d '\r' because python on Windows prints CRLF, and a pass name carrying a
# trailing carriage return breaks the quoting when it is interpolated below.
PASSES=$(python -c "
import json, sys
rows = [json.loads(l) for l in open(r'$SHEET', encoding='utf-8') if l.strip()]
seen = []
for r in rows:
    if r['pass'] not in seen:
        seen.append(r['pass'])
print('\n'.join(seen))
" | tr -d '\r')

echo "$CRISIS: $(wc -l < "$SHEET") frames over $(echo "$PASSES" | wc -l) passes"
echo ""

for P in $PASSES; do
  SPLIT="$DIR/.pass-$P.jsonl"
  N=$(python -c "
import json
rows = [json.loads(l) for l in open(r'$SHEET', encoding='utf-8') if l.strip()]
keep = [r for r in rows if r['pass'] == '$P']
with open(r'$SPLIT', 'w', encoding='utf-8') as f:
    for r in keep:
        f.write(json.dumps(r) + '\n')
print(len(keep))
")

  if [ "$DRY" = "--dry-run" ]; then
    echo "  pass $P: $N frames (dry run, nothing generated)"
    rm -f "$SPLIT"
    continue
  fi

  echo "  pass $P: $N frames"
  python3 "$GEN" generate-batch --input "$SPLIT" --out-dir "$DIR" --concurrency 3
  rm -f "$SPLIT"
  echo "  pass $P done"
  echo ""
done

echo "$CRISIS complete. Frames are in $DIR"
