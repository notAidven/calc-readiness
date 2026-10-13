#!/usr/bin/env bash
# Demonstrated reds for the achievements guard. Each case injects ONE defect the guard
# claims to catch, runs the guard, prints the failing assertion, and reverts. A guard that
# has never been seen to fail is not evidence, and this is how these were seen to fail.
#
# Not a CI step: it mutates tracked sources. Run it by hand from the repo root.
set -uo pipefail
cd "$(dirname "$0")/.."

MODULE=apps/web/src/city/achievements.ts
DEV=apps/web/src/city/AchievementsDevPanel.tsx
CSS=apps/web/src/city/achievements.css
GUARD=test/achievementsAreNotAScore.test.ts
CONCLUSION=apps/web/src/winter/WinterConclusion.tsx

revert() { git checkout -- "$MODULE" "$DEV" "$CSS" "$CONCLUSION" 2>/dev/null; }
trap revert EXIT

run() {
  printf '\n================ %s ================\n' "$1"
  npx vitest run "$GUARD" 2>&1 |
    grep -E 'AssertionError|Tests +[0-9]|→' | head -8
  revert
}

# 1. THE DELEGATE'S OWN SCENARIO: the copy says "your first age" and the predicate counts
#    crises. Both links of the chain should break.
python3 - "$MODULE" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
s = s.replace("isEarned: (state) => state.agesBehind >= 1,",
              "isEarned: (state) => state.crisesRecorded >= 1,")
open(p, "w").write(s)
PY
run "1. the era row's predicate counts crises"

# 2. A THRESHOLD ABOVE ONE: "ten buildings" in its smallest form.
python3 - "$MODULE" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
s = s.replace("isEarned: (state) => state.crisesRecorded >= 1,",
              "isEarned: (state) => state.crisesRecorded >= 2,")
open(p, "w").write(s)
PY
run "2. a row that needs two of something"

# 3. NON-MONOTONE: an achievement a second winter takes away.
python3 - "$MODULE" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
s = s.replace("isEarned: (state) => state.crisesRecorded >= 1,",
              "isEarned: (state) => state.crisesRecorded === 1,")
open(p, "w").write(s)
PY
run "3. a row that is lost on the second crisis"

# 4. A NUMBER IN THE COPY.
python3 - "$MODULE" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
s = s.replace('earned: "Your first age is behind you.",',
              'earned: "Your first age is behind you, 1 of 10.",')
open(p, "w").write(s)
PY
run "4. a count in a line of copy"

# 5. RESTATING A SHIPPED ACKNOWLEDGEMENT, with a comma where its full stop was. THIS ONE
#    PASSED THE FIRST VERSION OF THE GUARD, which compared raw strings.
python3 - "$MODULE" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
s = s.replace('earned: "You kept learning with your city in ruins.",',
              'earned: "Your city is back on its feet, ruins and all.",')
open(p, "w").write(s)
PY
run "5. a line that restates the recovery acknowledgement"

# 5b. AND A PARTIAL RESTATEMENT, which no containment check can catch: most of the
#     acknowledgement's phrasing, ending somewhere else.
python3 - "$MODULE" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
s = s.replace('earned: "You kept learning with your city in ruins.",',
              'earned: "Your city is back on solid ground, ruins and all.",')
open(p, "w").write(s)
PY
run "5b. a line that borrows the acknowledgement's phrasing"

# 6. THE DEV CONTROL GAINS AN OVERRIDE PROP: #492's defect, in this feature, in the exact
#    shape `WinterDevSkip` carries it. `test/crisisDevSkipOverride.test.ts` should go red on
#    the same tree, because this control would then join its derived population.
python3 - "$DEV" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
s = s.replace("  readonly onForget: () => void;\n}",
              "  readonly onForget: () => void;\n  readonly enabled?: boolean;\n}")
s = s.replace("  onForget,\n}: {", "  onForget,\n  enabled = isDevPersistenceEnabled(),\n}: {")
s = s.replace("  if (!isDevPersistenceEnabled()) {", "  if (!enabled) {")
open(p, "w").write(s)
PY
printf '\n================ 6. the dev control declares an enabled prop ================\n'
npx vitest run "$GUARD" test/crisisDevSkipOverride.test.ts 2>&1 |
  grep -E 'AssertionError|Tests +[0-9]' | head -8
revert

# 7. A STYLESHEET RULE FOR A COMPLETION BAR.
python3 - "$CSS" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
s += "\n.achievements-progress { width: 50%; }\n"
open(p, "w").write(s)
PY
run "7. a progress bar in the stylesheet"

# 8. AN ACHIEVEMENT ON THE CRISIS CONCLUSION CARD, which is where an acknowledgement
#    already speaks.
python3 - "$CONCLUSION" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
s = s.replace('      <p className="hw-conclusion__eyebrow">The crisis is over</p>',
              '      <AchievementNote line="A crisis came, and your city is still standing." reducedMotion={false} />\n'
              '      <p className="hw-conclusion__eyebrow">The crisis is over</p>')
open(p, "w").write(s)
PY
run "8. an achievement rendered on the crisis conclusion"
