# The ceremony's dev hatch is clickable — 1024x580

**Viewport: 1024x580, a live `npm run dev` server.** Named, because the whole claim is about
where two fixed panels land on one window.

## What was wrong

`CeremonyDevSkip` shipped in #511 with a full ladder and a *"play the next beat"* row, and its
gate has been guarded ever since by `ceremonyDevSkipIsGated.test.tsx` — in jsdom, where there is
no layout. *"The control is in the document"* was the strongest claim anybody had about it, and
it was true.

`CatchUpDevSkip` is `position: fixed; top: 10px; left: 10px; z-index: 65` and `CitySurface`
mounts it unconditionally in dev. `CeremonyDevSkip` was `position: fixed; top: 10px; left: 10px;
z-index: 65`. Equal z-index resolves by document order and the city's panel is later.

`before/measured-1024x580.txt`, hit-testing each control at its own centre on a running server:

```
  z=   65  10, 10, 252, 162        era-dev-skip
  z=   65  10, 10, 268, 243        catchup-dev-skip

  COVERED    era-dev-skip           <- catchup-dev-skip-era-bronze_age
  COVERED    era-dev-skip-fold      <- catchup-dev-skip-fold
  COVERED    era-dev-skip-next      <- catchup-dev-skip-era-neolithic
  COVERED    era-dev-skip-step      <- catchup-dev-skip-era-classical
  COVERED    era-dev-skip-top       <- catchup-dev-skip-era-renaissance
  COVERED    era-dev-skip-gathering <- catchup-dev-skip-era-industrial
  COVERED    era-dev-skip-expansion <- catchup-dev-skip-era-atomic_age
  COVERED    era-dev-skip-rebuild   <- catchup-dev-skip-era-information_age
  COVERED    era-dev-skip-retheme   <- catchup-dev-skip-era-cyberpunk
```

**9 of 9 unreachable.** Not obscured — Playwright refuses the press outright, at *"`<span
class="catchup-skip__score">8</span>` from `<aside class="catchup-skip">` … intercepts pointer
events"*. `before/ceremony-1024x580.png` is that frame: the panel in the corner is the catch-up's,
and the ceremony's is underneath it.

## What fixed it, and what did not

A bigger z-index alone did **nothing**, and the guard stayed red at all nine controls:
`.era-advance-stage` is `position: fixed; z-index: 30`, so it is a stacking context and 66
inside 30 still loses to 65 at the root. The panel now portals to `document.body`, where its
`z-index: 66` means what it says.

`ceremony-1024x580.png` and `measured-1024x580.txt` are the same measurement afterwards: **9 of
9 reachable**, and the one thing now covered is the catch-up hatch, which is a city control
underneath an `aria-modal` dialog and comes back the moment the ceremony closes.
`ceremonyHatchIsReachable.browser.test.tsx` asserts both halves at real layout.

## An unrelated collision found on the way, not fixed here

The same probe records the diagnostic summary's **"Back to city" button being unreachable**:
`.ob-replay` (`OnboardingDevReplay`) is `position: fixed; right: 10px; z-index: 65` and open by
default, and its chip lands on top of the button.

```
  "Back to city" {"button":[855,58,103,40],"replay":[808,68,206,164],
                  "atButtonCentre":"ob-replay__eyebrow","reachable":false}
```

Folding does not help: the eyebrow is outside the folded region. That is another lane's file and
another lane's surface, so it is reported rather than changed.

Regenerate with `npm run dev`, then

```bash
node scripts/qa/ceremony-hatch-occlusion.mjs http://localhost:5173 docs/design-refs/ceremony-hatch-reachable
```
