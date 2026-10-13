# The demo console, and the ceremony hatch that was never broken

**All frames: 1024x580, reduced motion, live `npm run dev`, on the learner's own mount (`/`,
never `?dev`).** `?dev` gives the frame `size="full"`, which lifts the 90vh cap a learner gets,
so a spatial claim checked there understates what a learner loses. No frame here went through it.

`measured-1024x580.txt` is the run's own output: every box, every hit test, every press.
`output/demo-console-frames.mjs` is the script.

## What the lead reported, and what was actually true

> *"dont see this on qa"* — era four's Succession forum, told it had landed with #603
> *"the ceremony beats in the dev view make me actually work through the questions"*

**The ceremony's hatch was fine.** Measured from the state he was actually in — the sitting, with
a graded question on screen — twice, at two different tips:

| | at `684a7a9f` | at this branch's tip |
| --- | --- | --- |
| `era-dev-skip` in the DOM, visible | yes | yes |
| controls covered at their own centre | **0 of 7** | **0 of 8** |
| four presses of `play → …` | `beat_index` 0 → 1 → 2 → 3 → 4 | same |
| graded answers submitted | **0** | **0** |
| `localStorage` before vs after the walk | **byte-identical**, 1571 bytes | same |

Eight rather than seven because **#571 merged at `2026-08-05T16:15:04Z`** (`0167cf2e`, read off
`mergedAt` rather than inferred from the branch), adding `+1 check`. Every frame below is from
the second run, on the merged tree.

`05-the-hatch-over-a-graded-question` and `06-the-reveal-after-four-presses-and-no-answers` are
that pair. The second reads *"4 of 4 beats standing. 10 of 10 checks, none of them answered."*

**What was missing was the address.** `?era=classical` stands the city in era four and is named
on no surface; `?succession` opens the forum and `SuccessionEntryChip` — built to open it — was
mounted nowhere at all, along with the Plague's and the Intrusion's.

## The frames

| # | Frame | What it shows |
| --- | --- | --- |
| 01 | `cold-load-the-console-and-the-title-card` | The console at `10,10`, **216x348**, **12.7%** of the window. The title card is `x∈[232,792]`, so the **overlap is 0px²** — this is a frame of the SURFACE, not a crop of the panel, because the claim is about what is still visible around it. All **15 controls reachable at their own centres**. |
| 02 | `era-four-queued` | One press of `4`. The legend reads *"QUEUED: ERA 4 · CLASSICAL ERA"* and the URL is `?era=classical`. The console is still there, which is why it is on the title screen: `?era=` is read once at `App` mount, so it can only change by navigating, and navigating comes back here. |
| 03 | `the-city-standing-in-era-four` | **Start.** `cr.city.era.v1` is `classical`, the hall and pots are era four's, `Buildings 6/21`. Two presses from a cold load, zero graded answers. |
| 04 | `the-menu-with-every-crisis-chip` | The ☰ Menu with all four crisis chips mounted. **⚑ And the defect this frame caught:** at 1024x580 the popover is **406px tall over 1549px of content**, so its last rows are below the fold. It is `overflow-y: auto` and they are pressable after a scroll (`output/menu-popover-overflow.mjs`, and `output/menu-popover-overflow-1024x580.png` is the scrolled frame with all three new chips in view). Two of the five unreachable rows — `Checker Lab` and `Hard Winter` — predate this branch. |
| 05 | `the-hatch-over-a-graded-question` | *"Factor completely: $x^3 + 3x^2 + 6x + 18$"* with a **Check** button, and the `Play the beats` hatch clear in the corner above it. This is the picture the lead was looking at when he answered ten questions. |
| 06 | `the-reveal-after-four-presses-and-no-answers` | *"The Medieval Era begins"*, `Enter the Medieval Era`, and the hatch reading *"4 of 4 beats standing. 10 of 10 checks, none of them answered."* |
| 07 | `era-fours-succession-forum` | Era four's forum, reached from the ☰ Menu chip: Oru's briefing (*"The old ruler is dead and left no heir"*), `STEP 1 OF 5`, the district board behind it, and its own `Skip the questions` hatch top left. |

## `crises/` — all four routes opened cold

`crises/{winter,succession,plague,intrusion}-1024x580.png`, and `crises/measured-1024x580.txt`.
Every one of the four mounts a surface and carries a `Skip the questions` dev instrument — **and
they are in four different corners**, which is why they are framed rather than asserted:

| Route | Its skip panel |
| --- | --- |
| `?winter` | `x 774, y 10` — top right |
| `?succession` | `x 8, y 8` — top left |
| `?plague` | `x 748, y 8` — top right |
| `?intrusion` | `x 8, y 356` — lower left |

The runbook said *"top left, exactly like the ceremony's"* before this run. That was true of one
of the four.

## The #578 / #571 question

Three different things, and **the answer is that #571's hatch half was never redundant and #578
was never insufficient — they fix opposite directions, and neither is why the hatch was clickable
at `684a7a9f`.**

- **#578** (`c4e568fd`, merged `02:52:10Z`) stopped the panel *swallowing* clicks aimed at the
  island **beneath** it: `pointer-events: none` on the container, a rendered `<style>` opting the
  controls back in.
- **#571** (`0167cf2e`, merged `2026-08-05T16:15:04Z`) is the opposite direction — the panel's own
  controls being **covered by** `CatchUpDevSkip`, which pins the same `top: 10; left: 10;
  z-index: 65`. Orthogonal to #578, so #578 neither fixed it nor claimed to. It portals the panel
  to `document.body` at `HATCH_Z = 66`, because `.era-advance-stage` is a stacking context at 30
  and a z-index written inside it cannot outrank a sibling of the stage.
- **#539** (`8d560aee`) is the third thing, and it is why the collision was already unreachable
  through the product: `CitySurface.tsx` wraps `CatchUpDevSkip` in `{!ceremonyOpen && …}`, so the
  two panels are never mounted together in the app. #571's measurement is taken in
  `devPanelsPassClicksToTheIsland.browser.test.tsx`, which mounts both **deliberately** — its case
  is named *"the ceremony hatch and the catch-up hatch still collide, and the call site still
  parts them"*.

So at `684a7a9f` — a tree with #578 and #539 and without #571 — the hatch was already fully
clickable on the real surface: **0 of 7 covered**, measured at era one and again at era four,
from the opening card and from mid-question. #571's portal is defence against #539's condition
being deleted, which is a better thing for it to be than a repair, because it does not depend on
a condition three files away that nothing forces anyone to keep. Both are in the tree now and the
re-measurement is **0 of 8**.

**What the lead was actually reporting was `(d)`: present, clickable, working, undiscoverable.**
He pressed the big blue *Begin the ceremony* and started answering.
