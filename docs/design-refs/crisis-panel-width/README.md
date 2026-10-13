# The Hard Winter crisis panel, sized to its content

The rendered evidence behind `--hw-side: min(470px, 50vw)` in
`apps/web/src/city/three/winter-in-city.css`, which narrowed the panel from half the screen.

## Why these are committed, when `__screenshots__/` is gitignored

`.gitignore` excludes `**/__screenshots__/` because what lands there is regenerated on every run
and is meaningless afterwards. These are the same pixels kept for the opposite reason: the panel's
width has been reported as fixed three times on arithmetic that was right while the screen was
still wrong, so the review of it turns on frames somebody looked at. A reviewer who cannot see
them is being asked to take the measurement on trust, which is the failure mode this whole change
is about. The cloud agent that produced them has no way to inline an image into a pull request.

## What each one is

Every frame is the real crisis panel over the real island, at the real camera, and the viewport is
in the filename because a frame whose viewport is unstated says nothing about anybody's screen.

| file | viewport | what it shows |
| --- | --- | --- |
| `runner-font-declare-920x800.png` | 920x800 | **DejaVu Sans forced.** The viewport and font that failed CI: the `50vw` clamp gives 460px here whatever the cap says, and the reinforce card's description now holds one line in it. |
| `runner-font-declare-1024x580.png` | 1024x580 | **DejaVu Sans forced.** The lead's window in the runner's font. |
| `after-declare-1024x580.png` | 1024x580 | The lead's window, declare step. |
| `after-aiming-1024x580.png` | 1024x580 | Declare with a cell aimed at, which is the panel's widest moment. |
| `after-question-1024x580.png` | 1024x580 | The answering step, the other step the panel changes shape for. |
| `after-declare-1024x507.png` | 1024x507 | The same window less its browser chrome, which is the box the panel is really laid out in. The declare step scrolls at this height at every width, the old one included. |
| `after-declare-1440x900.png` | 1440x900 | A roomy window, where the cap binds hardest and the island keeps 66% of the width. |

## Regenerating them

The first five and the last come from the suite:

```
VITE_WINTER_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
  apps/web/src/city/three/winterIslandVisible.browser.test.tsx
```

which writes to `apps/web/src/city/three/__screenshots__/winter-island/`. The two DejaVu frames
were taken with every font stack on the surface forced to `"DejaVu Sans"`, which is what
ubuntu-latest resolves `system-ui` to and what
`apps/web/src/city/three/crisisPanelFitsItsContent.browser.test.tsx` sizes the panel against.
