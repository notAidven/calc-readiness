# The Hard Winter on the demo route

Eleven frames at **1024x580 under reduced motion** on a live `npm run dev`, answering three
questions about whether the demo route reaches the crisis and whether it can reach it by
accident. `docs/Demo_Era_Progression_Runbook.md` carries the presses; this is the evidence.

Regenerate with `output/crisis-demo-path-probe.mjs` and `output/crisis-reload-probe.mjs`.

## What the frames show

| file | what it settles |
| --- | --- |
| `01-after-diagnostic` | The city straight after the dev *All right* rung, and again eight seconds later. **`MASTERED 0/6`**, no crisis notice, no advisor, no winter board. The diagnostic's test-out writes a **placement**, not mastery, and mastery is what fires the crisis. |
| `02-menu-developer-panel` | The ☰ Menu's Developer stand-in panel, with **Seed the mid-era crisis** present and enabled, reading *"Places and masters this era's first 3 skills (NUM.S, NUM.F, NUM.2), which is where the crisis fires."* The trigger is derived and it says so. |
| `03-ceremony-played-no-crisis` | All four ceremony beats played through, still `MASTERED 0/6`, still nothing. **The ceremony demo cannot be ambushed by the crisis.** |
| `04-seeded-unlock-popup-first` | ⚑ Straight after the seed press. `MASTERED 3/6` — the trigger is crossed — and what is on screen is **"2 new buildings unlocked!"**, not the crisis. Mastering three skills completes three skills, and `CitySurface` puts `newlyUnlocked.length > 0` into the crisis hook's `deferred`. The call is **held, not lost**, which is `crisisCall.ts` working; it is also a press nobody had written down. |
| `05-crisis-called` | The popup dismissed, and Oru is on the island: *"Sire! The worst winter we have ever seen is upon us."* **STEP 1 OF 4**, *"Read all 4 steps first."*, **Face the winter greyed out** and **Not yet live**. |
| `06-crisis-deferred` | After *Not yet*: the standing notice, **"❄ The Hard Winter is waiting. It starts when you say so. Talk to Oru"**. |
| `07-ceremony-over-a-standing-call` | The ceremony open **with a call standing**. Notice count **0** — the ceremony is in the hook's `deferred` list, so a standing crisis cannot sit on top of the era progression. |
| `08-call-returns-after-the-ceremony` | The ceremony closed. Notice count **1**. The call was held, and it came back. |
| `09-winter-on-the-island` | *Face the winter* pressed after walking the four slides. The winter is on **the player's own island** — frost front, the buildings under snow, **Round 1 of 3**, the two actions — with the winter's own dev skip top right. |
| `10-after-a-reload` | ⚑ A reload with the city already at `MASTERED 3/6`. **Notice 0, advisor 0.** `useCrisisCall` fires on the TRANSITION and the first read only seeds a baseline, so a city that loads past the trigger is never called. Correct for a learner; a trap for a presenter who wanted a second run. |
| `11-menu-hard-winter-entry` | The way round it: ☰ Menu → **Hard Winter** raises the same advisor on demand, standing call or not. This entry is dev-gated on `isDevPersistenceEnabled()`. |

## Read together

The crisis and the ceremony are on **one continuous run** and neither can surprise the other.
Nothing on the demo route crosses the crisis trigger by itself, so the crisis has to be asked
for; and once asked for, it defers cleanly to the ceremony and returns afterwards.
