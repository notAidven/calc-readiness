# Era nine's crisis on the island, photographed

> Historical predecessor. The approved one-relay Cut-or-Restore renderer and current
> learner-surface frames live under `output/qa/era-09-intrusion-implementation/`.

Fifteen files: fourteen frames at **1024x580** and one `measured-1024x580.txt` recording the dolly
each was taken at. Taken by `apps/web/src/city/three/intrusionIslandShots.browser.test.tsx`, which is
off by default:

```bash
VITE_INTRUSION_ISLAND_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
  apps/web/src/city/three/intrusionIslandShots.browser.test.tsx
```

**Nothing here is cropped to its subject.** A frame is the whole viewport, because how a mark sits
among the buildings, the roads and the bare ground around it is part of the evidence, and a frame
cropped to the thing that changed is a frame of the one part nobody doubted.

## The viewport is half the evidence and so is the dolly

The camera rests at `46 * 2.3` = 105.8 over era nine's drawn island, which through the scene's own
1.4506x framing lens is **6.59 px per world unit**. The dolly runs 0.5x to 2.6x, so a world unit is
worth 13.18 px at the closest a player can get and 2.53 px at the furthest. Every frame's own dolly is
in `measured-1024x580.txt` rather than inferred from how many times a button was pressed, because the
scene settles the camera back inside its true limits after a press and the two need not agree.

## The frames

| # | what it is for | dolly |
| --- | --- | --- |
| 01 | the whole board in play: a doubled collar, a hedge, a flush collar, an unread panel, three floors open | rest |
| 02 | the same town after a wrong isolation, with every reading old. **The pair 01 exists to be read against** | rest |
| 03 | the five readings side by side. Unread, likely clear, clear, likely compromised, compromised | 0.5x |
| 04 | the same five gone stale, and a dark panel beside them. **Presence against absence** | 0.5x |
| 05 | the collar's four reliefs one placement square apart. **None against flush is the pair most likely to be lost** | 0.5x |
| 06 | the same four with a segment taken out of each, flush included | 0.5x |
| 07 | a closed cover beside a lifted one. The strongest pair in the folder | 0.5x |
| 08 | a proposed isolation and a committed one, on two buildings | 0.59x |
| 09 | looked and learned nothing, beside read without being opened. **Open question 7, which nothing in the folder draws** | 0.59x |
| 10 | the near end of the dolly, where the panel is the carrier | 0.5x |
| 11 | the far end, where it is not. The honest half | 2.6x |
| 12 | a town that is fine and is not fine | 0.84x |
| 13 | the unsolved ending: the pattern stays broken where the player did not finish | rest |
| 14 | **the sheet's 0.060 cut beside the derived 0.303.** The correction's own evidence | 0.5x |

## ⚑ The masses are a stand-in and the ground is not

The buildings are the shipped neutral built template, because era nine's GLBs do not exist. That is a
stand-in for the FABRIC and it is not a stand-in for the plot, the grid, the camera, the light or the
ground — which are the five things every claim here is about.

One consequence is worth stating before anybody reads a frame. Era nine's catalogue authors the
Condominium as *"the tallest of the four, close to the `MAX_BUILD_HEIGHT` ceiling"*, and its own
2026-07-29 amendment says heights are *"an ORDER, not world-unit figures"*, because every stage is
contain-fit to its plot by one uniform scale. The neutral template is roughly cubic, so a 1x1 plot
renders about 3.8 units tall rather than 22 — **so the sheet's shadow arithmetic, a Condominium laying
34.8 units of shadow, is an authoring aspiration and not what these frames show.** What they show is
what the shipped renderer draws today.

The other is the wall's colour. The stand-in's wall is the template's pale beige rather than era
nine's `BODY_CLAD`, so frame 08's proposal has MORE contrast here than it will on era nine's own
cladding. The arithmetic that matters is measured against `BODY_CLAD` in `intrusionScene.test.ts`.
