#!/usr/bin/env bash
#
# check-lesson-packs.sh : run the `author` skill's lesson-pack validator over every
# lesson domain, at the ERROR tier, and the `lesson-qa` skill's prose sweep over every
# surface a learner reads.
#
# This is the shared entry point for `npm run check:lessons` and for the lesson-pack
# step in .github/workflows/invariants.yml, so that the gate a human can run locally
# and the gate CI runs are the same gate. It mirrors how `check:graph` works: the
# validator itself is invoked directly, and package.json only aliases it.
#
# TWO GATES, because they judge different things. `validate-lesson-pack.mjs` judges a
# pack's STRUCTURE and TEACHING REGISTER. `scan-lesson-text.mjs` judges whether the
# strings a learner reads will RENDER, and carries the BANNED-PHRASE LEDGER: every
# sentence a reviewer has already had cut, each with the objection that cut it.
#
# The sweep was added here on 2026-08-04 because it ran in NO CI step at all -- it
# appeared nowhere in .github/, scripts/ or package.json -- so the whole ledger fired
# only when somebody remembered to invoke it by hand. A prose objection recorded in a
# list nothing runs is a prose objection nobody is enforcing, which is the exact defect
# the ledger exists to prevent, one level up. Measured clean product-wide at `e5d0627c`
# before wiring: 3191 learner-facing strings over 59 packs and 5768 prose-shaped runs
# over 353 widget files, zero findings.
#
# ERROR TIER ONLY. `--strict` is deliberately NOT passed and must not be added here.
# Under it the validator's warning tier fails the build, and that tier is advisory by
# design: its rules shortlist for a human rather than decide, so they are not a gate
# every content PR must clear. `.cursor/skills/author/reference.md` section 7 owns the
# per-rule reasoning, and is where to argue with this rather than here.
#
# Do NOT re-derive that decision from today's warning total, in either direction. This
# comment used to argue the same conclusion from a count -- that `--strict` "would fail
# three of the four domains" on inherited R14 subtitle-presence warnings -- and #201
# cleared every one of those on 2026-07-28, which made the sentence false without making
# the decision wrong. An empty tier is not a reason to promote it either. To learn where
# the tier stands, run the validator and read the count; do not read it off this comment.
# Warnings are still PRINTED, because advisory findings nobody sees are not advisory,
# they are absent.
#
# ONE INVOCATION PER DOMAIN, not one invocation over all of them. The validator's
# domain-level interaction-variety rules only run when it is given a single directory
# (`dirs.length === 1 && packs.length > 1` in its driver), so passing four domain
# directories to one process would silently switch those rules off and pool four
# domains' widget counts into one measurement.
#
# THE SWEEP REACHES ONLY THE PATHS ITS INVOCATION NAMES, which is the whole difficulty
# of wiring it and not a detail of it. The banned list matches learner prose wherever a
# sentence is authored -- a domain's packs, the widget copy, the worked-solution and
# CFU-figure copy, the answer-field copy, and the sentences AUTHORED WHOLE as quoted
# literals in a domain's item-bank source -- and an invocation opens only what it names.
# That gap has already produced a ledger entry certifying its own blind spot: two of D10's
# entries were written against prose whose surface is `packages/item-bank/src/d10`, so
# either sentence returning there would have had the sweep report OK.
#
# THE SHARED SURFACE IS NAMED AS A DIRECTORY, NOT AS A LIST OF FILES, and that is the
# substantive change here rather than an implementation preference. `SKILL.md` used to
# document seven paths, five of them under `apps/web/src/lessons`
# (`interactive`, `worked`, `cfuVariants.ts`, `answerFormat.ts`, `unreadableAnswer.ts`),
# and that list was found SHORT four separate times, by four rounds, each naming a surface
# the round before it did not have. Nothing about having named five makes the sixth
# visible, so a list written one path at a time keeps going stale -- and this script had
# fallen three paths behind the list itself, sweeping only `interactive`, so a green CI run
# was not evidence that the documented sweep passed.
#
# Measured at `3e3b2f54`, which is why the directory wins rather than a sixth file: the
# ten root-level files a brief had inventoried as the remaining gap held 274 prose-shaped
# runs, and sweeping the DIRECTORY turned up 307 runs across 23 files -- the inventory was
# itself 13 files short on the day it was written. `apps/web/src/lessons` reads 5491 runs
# over 408 files against `interactive`'s 3912 over 275, all of it clean, and rule 6 has
# been measured to report zero findings on ordinary TypeScript (the scanner's own header
# records the sweep over `apps/web/src`), so widening costs no false positives. A file
# landing beside `cfuVariants.ts` tomorrow is swept the day it lands.
#
# So each domain is swept over `content/lessons/<domain>` PLUS its
# `packages/item-bank/src/<domain>` sibling, and the lesson UI tree is swept once.
#
# ONE INVOCATION FOR THE LESSON UI TREE, not one per domain, and that is not a coverage
# reduction. Every rule in the sweep is a property of a single string, so what a run
# covers is the UNION of the paths named across all of its invocations, unlike the
# validator above, whose domain-level rules genuinely change with the directory count.
# Sweeping the shared files once rather than ten times is the same coverage for a tenth of
# the reading.
#
# THE FLOOR UNDER THAT INVOCATION IS LOAD-BEARING, and it is what makes the directory safe
# rather than merely convenient. Naming five paths bought one thing a directory does not:
# `statSync` exits 2 on a path that is gone, so renaming `cfuVariants.ts` used to fail the
# gate. Under a directory a rename is invisible -- the walk simply reads one file fewer and
# still reports OK. The floors below restore that, and they catch more than the old shape
# did: losing `interactive`, losing `worked` or losing every root-level file each fails
# them, where the old invocation could only notice a path it had been told to expect.
#
# A MISSING PATH MUST NOT SILENTLY REDUCE COVERAGE, and the three kinds of absence get
# three different answers, because they mean three different things:
#   - The SCANNER, the lesson UI root, or the item-bank root gone: fail CLOSED, exit 1.
#     These are fixed paths, so their absence means the gate has been moved or renamed,
#     never that content is mid-authoring.
#   - One domain's item-bank SIBLING absent: skip it, NAME it in the summary, and hold
#     the floor below. A `content/lessons/d11` that lands before its item bank does is a
#     legitimate intermediate state and not a content error -- the same judgement the
#     pack-count skip already makes one paragraph up.
#   - A domain with neither packs nor a sibling: nothing to sweep, named and skipped.
# The floors are what keep the second answer honest: a rename that removed EVERY
# sibling, or every domain, would otherwise sweep nothing and report the green it never
# earned.
#
# The domain list is DISCOVERED rather than hardcoded, so a new domain directory is
# gated the day it is added instead of escaping until someone remembers to extend a
# list.
#
# Exit 0 = every domain clean at the validator's error tier and clean under the prose
# sweep; 1 = at least one domain failed either gate, a gate was not found, or nothing
# was validated or swept at all.

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT" || exit 1

VALIDATOR=".cursor/skills/author/scripts/validate-lesson-pack.mjs"
SCANNER=".cursor/skills/lesson-qa/scripts/scan-lesson-text.mjs"
LESSON_ROOT="content/lessons"
ITEM_BANK_ROOT="packages/item-bank/src"
# The whole lesson UI tree, not `interactive` alone: see the directory-versus-file-list
# note in the header. `worked/`, `cfuVariants.ts`, `answerFormat.ts` and
# `unreadableAnswer.ts` are reached by this one path, as is every root-level file beside
# them and every file that lands there next.
LESSON_UI_ROOT="apps/web/src/lessons"

# FLOORS on the one invocation that sweeps a fixed tree, so a rename or a move inside it
# cannot quietly take a surface out of the sweep. They are floors and not pins: the tree
# grows without an edit here, and only shrinkage fails. Read at `3e3b2f54`, where the tree
# measured 5491 prose-shaped runs over 408 files -- these sit far enough below that a
# normal week does not touch them and near enough that losing the smallest of the three
# sub-surfaces (the 74 root-level files, 667 runs) still goes red.
MIN_LESSON_UI_FILES=380
MIN_LESSON_UI_RUNS=5000

# Fail CLOSED on a missing gate. `node` on an absent file already exits non-zero, but a
# gate that has been moved or deleted should say so rather than surface as a stack trace.
if [ ! -f "$VALIDATOR" ]; then
  echo "check-lesson-packs: validator not found at ${VALIDATOR}" >&2
  exit 1
fi
if [ ! -f "$SCANNER" ]; then
  echo "check-lesson-packs: prose scanner not found at ${SCANNER}" >&2
  exit 1
fi
if [ ! -d "$LESSON_ROOT" ]; then
  echo "check-lesson-packs: no lesson content directory at ${LESSON_ROOT}" >&2
  exit 1
fi
# Both fixed paths, so an absence here is a rename and not an authoring state. Without
# these two checks a moved directory would take a whole surface out of the sweep and the
# run would stay green, which is the failure mode the sweep itself is written against.
if [ ! -d "$ITEM_BANK_ROOT" ]; then
  echo "check-lesson-packs: no item-bank source directory at ${ITEM_BANK_ROOT}" >&2
  exit 1
fi
if [ ! -d "$LESSON_UI_ROOT" ]; then
  echo "check-lesson-packs: no lesson UI directory at ${LESSON_UI_ROOT}" >&2
  exit 1
fi

echo "Validating lesson packs at the ERROR tier (warnings are printed and are ADVISORY:"
echo "they do not fail this gate), and sweeping learner-facing prose over packs, the whole"
echo "lesson UI tree and item-bank literals. Interpreter: $(node --version)"

output="$(mktemp)"
trap 'rm -f "$output"' EXIT

validated=0
swept=0
siblings=0
failures=0
summary=""

for dir in "$LESSON_ROOT"/*/; do
  [ -d "$dir" ] || continue
  domain="$(basename "$dir")"

  # Count the packs first: the validator exits 2 ("no .json lesson packs found") on a
  # directory holding only a README, and a scaffolded-but-empty domain is not a content
  # error. Skipping is safe only because of the floor below, which refuses to report
  # success when NOTHING was validated.
  packs=0
  for pack in "$dir"*.json; do
    [ -f "$pack" ] && packs=$((packs + 1))
  done

  sibling="${ITEM_BANK_ROOT}/${domain}"

  echo
  if [ "$packs" -eq 0 ] && [ ! -d "$sibling" ]; then
    echo "==> ${domain}: no *.json packs and no ${sibling}, nothing to validate or sweep"
    summary="${summary}  ${domain}: no packs, no item-bank sibling, skipped"$'\n'
    continue
  fi
  echo "==> ${domain} (${packs} pack(s))"

  # --- the validator, ERROR tier ---
  if [ "$packs" -eq 0 ]; then
    echo "  validator: no *.json packs here, nothing to validate"
    validator_verdict="no packs, skipped"
  else
    node "$VALIDATOR" "$dir" >"$output" 2>&1
    status=$?
    cat "$output"
    validated=$((validated + 1))

    # Warnings and the error list both go to the validator's stderr, which is why the two
    # streams are merged above rather than one of them dropped.
    warnings="$(grep -c '^  warning: ' "$output" || true)"
    errors="$(sed -n 's/^FAIL: \([0-9][0-9]*\) error.*/\1/p' "$output")"
    [ -n "$errors" ] || errors=0

    if [ "$status" -eq 0 ]; then
      validator_verdict="${errors} error(s), ${warnings} warning(s) -> PASS"
    else
      failures=$((failures + 1))
      validator_verdict="${errors} error(s), ${warnings} warning(s) -> FAIL (exit ${status})"
    fi
  fi

  # --- the prose sweep, this domain's two of the three paths ---
  # An array, so a path is one argument whatever it holds, and so that the sibling can be
  # left out without the invocation growing a conditional string.
  scan_paths=("$dir")
  if [ -d "$sibling" ]; then
    scan_paths+=("$sibling")
    siblings=$((siblings + 1))
    sweep_scope="packs + ${sibling}"
  else
    # NAMED, not silent. This is the only absence the sweep tolerates, and a reader of the
    # summary has to be able to see that a surface went unread.
    sweep_scope="packs only, NO item-bank sibling at ${sibling}"
  fi

  node "$SCANNER" "${scan_paths[@]}" >"$output" 2>&1
  scan_status=$?
  cat "$output"
  swept=$((swept + 1))

  if [ "$scan_status" -eq 0 ]; then
    sweep_verdict="PASS"
  else
    failures=$((failures + 1))
    sweep_verdict="FAIL (exit ${scan_status})"
  fi

  summary="${summary}  ${domain}: ${packs} pack(s), ${validator_verdict}"$'\n'
  summary="${summary}    prose sweep (${sweep_scope}) -> ${sweep_verdict}"$'\n'
done

# --- the prose sweep, the shared lesson UI tree, once ---
echo
echo "==> lesson UI copy (${LESSON_UI_ROOT}, recursive)"
node "$SCANNER" "$LESSON_UI_ROOT" >"$output" 2>&1
widget_status=$?
cat "$output"
if [ "$widget_status" -eq 0 ]; then
  summary="${summary}  lesson UI copy: prose sweep -> PASS"$'\n'
else
  failures=$((failures + 1))
  summary="${summary}  lesson UI copy: prose sweep -> FAIL (exit ${widget_status})"$'\n'
fi

# What that invocation actually READ, taken off its own summary line rather than assumed.
# Both the OK and the FAIL line carry the two counts; a run that died before printing one
# leaves the variable empty, which floors to 0 and fails below, which is the right way
# round.
ui_runs="$(sed -n 's/.*and \([0-9][0-9]*\) prose-shaped run(s).*/\1/p' "$output" | head -n 1)"
ui_files="$(sed -n 's/.*across \([0-9][0-9]*\) widget file(s).*/\1/p' "$output" | head -n 1)"
[ -n "$ui_runs" ] || ui_runs=0
[ -n "$ui_files" ] || ui_files=0
summary="${summary}    read ${ui_runs} prose-shaped run(s) across ${ui_files} file(s)"$'\n'

echo
echo "Summary. Validator errors and prose findings fail this gate; warnings do not:"
printf '%s' "$summary"

# THE FLOORS. "every domain passed" is trivially true over zero domains, so a run that
# validated nothing, or swept nothing, has to fail rather than report a green it never
# earned. Each of the three counts is floored separately, because they can go to zero
# independently and any one of them at zero is a whole surface unread:
#   validated  no pack was put in front of the validator
#   swept      no domain was put in front of the prose sweep
#   siblings   every item-bank sibling was skipped, which is what a rename of a domain
#              directory or of the sibling naming scheme would look like from in here.
#              The per-domain skip is deliberately tolerant, so this is the assertion
#              that stops that tolerance from swallowing the entire item-bank path.
# Plus the two counts under the lesson UI tree, which are a different shape of the same
# argument and are the reason that surface can be named as a directory at all.
if [ "$validated" -eq 0 ]; then
  echo "check-lesson-packs: validated 0 domains under ${LESSON_ROOT}; refusing to pass an empty sweep." >&2
  exit 1
fi
if [ "$swept" -eq 0 ]; then
  echo "check-lesson-packs: swept 0 domains for banned prose; refusing to pass an empty sweep." >&2
  exit 1
fi
if [ "$siblings" -eq 0 ]; then
  echo "check-lesson-packs: no domain had an item-bank sibling under ${ITEM_BANK_ROOT}; the sweep's item-bank path read nothing." >&2
  exit 1
fi
# The lesson UI tree is swept by DIRECTORY, so a file moved out of it is not an error the
# scanner can raise -- it just reads one file fewer. These two are the only thing standing
# between that and a silent loss of a whole surface.
if [ "$ui_files" -lt "$MIN_LESSON_UI_FILES" ]; then
  echo "check-lesson-packs: the sweep over ${LESSON_UI_ROOT} read ${ui_files} file(s), below the floor of ${MIN_LESSON_UI_FILES}; a surface has been moved out of the tree or the walk is broken." >&2
  exit 1
fi
if [ "$ui_runs" -lt "$MIN_LESSON_UI_RUNS" ]; then
  echo "check-lesson-packs: the sweep over ${LESSON_UI_ROOT} read ${ui_runs} prose-shaped run(s), below the floor of ${MIN_LESSON_UI_RUNS}; a surface has been moved out of the tree or the walk is broken." >&2
  exit 1
fi

if [ "$failures" -ne 0 ]; then
  echo "check-lesson-packs: ${failures} check(s) failed across ${validated} validated and ${swept} swept domain(s)." >&2
  exit 1
fi

echo "check-lesson-packs: ${validated} domain(s) passed at the error tier; ${swept} domain(s) and the lesson UI tree passed the prose sweep (${siblings} item-bank sibling(s) read; ${ui_runs} prose-shaped run(s) across ${ui_files} file(s) under ${LESSON_UI_ROOT})."
