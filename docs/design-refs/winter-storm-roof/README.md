# The storm roof, bare beside protected — era one, 1024x580

Seven frames, one per building the Hard Winter can lash a storm roof over in era one: the six
skill buildings and the hub. **Each frame is one exposure containing the same building twice** —
bare on the left, protected on the right — so there is no confound at all between the two halves:
same model, same camera, same instant, same light, one prop different.

Taken through the shipped renderer by
`apps/web/src/city/three/winterShieldSilhouette.browser.test.tsx`
(`VITE_WINTER_SHOTS=1 npx vitest run --config vitest.browser.config.ts <that file>`), at
**1024x580** — the lead's own short laptop window — under `reducedMotion`, at
`VILLAGE_CAMERA.polarAngle` and `azimuthAngle`, with the winter rig's own lighting, sky and
exposure. Copied to `output/winter-storm-roof/` as well, so they open without checking a branch
out.

| file | building |
| --- | --- |
| `num-s-bare-beside-protected-1024x580.png` | Assembly Hall, the Roundhouse |
| `num-f-bare-beside-protected-1024x580.png` | Store, the Hide Shed |
| `num-2-bare-beside-protected-1024x580.png` | Dwellings, the Hut Cluster |
| `num-3-bare-beside-protected-1024x580.png` | Workshop, the Tool Shelter |
| `num-4-bare-beside-protected-1024x580.png` | Commons, the Clearing |
| `num-5-bare-beside-protected-1024x580.png` | Tower, the Lookout |
| `town-hall-bare-beside-protected-1024x580.png` | Civic Center, the Stone Circle |

## Why the frame is wide, and why the subject is the building

`.cursor/rules/qa-verification.mdc`: *"A claim about what is visible BEHIND or AROUND an element
has to be framed to show the other thing. Cropped to the element that changed, a screenshot proves
nothing about occlusion: the element is the one part of the picture nobody doubts."* The claim here
is about the building under the roof, so the roof is deliberately not the subject and the camera is
pulled back past a tight fit to leave air and ground around both lots.

## What is in shot that is not the roof

- **The mastery stars are on**, three of them, empty at mastery 0. They ship, and where they sit is
  itself a fact worth seeing: on the protected side they ride above the **storm roof** rather than
  above the bare roofline, which is `PlacedBuilding`'s `dressedRef` doing its job.
- **The drifts are on**, banked at each building's foot in both halves.
- **No badge.** An unthreatened building carries nothing (`#388`), and these buildings are not being
  threatened in this fixture.
- **The background is nearly flat**, and that is the shipped winter and not a missing ground. Lit
  snow (`SNOW_LIT`) and the overcast sky (`SKY_OVERCAST`) resolve within a few values of each other
  through ACES at the winter exposure, so there is no horizon to see. The frames in
  `../frost-crust-silhouette/` were taken the same way and look the same way.

## An honest read of these seven

**The building is unmistakably present under the roof in all seven, and the roof is unmistakably a
roof in all seven.** What you see through the timbers is the thing that identifies each building:
the Roundhouse's thatched dome and its ribs; all four of the Hut Cluster's huts; the Tool Shelter's
own little pitched roof and its posts; the Clearing's tree, snow star and props; the Stone Circle's
ring and its standing stones; the Lookout's pitched cap, platform, splayed legs and ladder.

**The Lookout is the hardest case and it is worth saying so.** Its storm roof spans the plot while
the tower itself is narrow, so the roof is the largest single mass in that frame — more so than in
any other. It still reads as a roof rather than as scaffolding, because the ridge beam, the two
barge boards and the eave purlins draw a pitched outline, and the tower reads straight through it.
It is the frame a reviewer should look at first if they want to disagree with this work.

**Two shapes were changed on the strength of these frames rather than on any measurement**, and
both are recorded in `winterShield.ts`:

- the gable's rise came down from 0.62 of the building's own height to **0.42**. At 0.62 every
  survival bound passed and the roof still read as a cage around a hut rather than a roof on it;
- the rafter interval widened from 2.3u to **3.2u**. Crossed with two purlins per slope, five
  rafter pairs make a slope a grid, and a grid reads as scaffolding in front of a building.

Neither is visible in a ratio. The 0.62 roof measured *better* on two subjects than the 0.42 one
does — a taller gable puts more of its timber against the sky instead of against the building — so
a guard alone would have kept the worse-looking roof.

## What these frames are NOT

They are not the island. `winterCrisisAtlas.browser.test.tsx` photographs the shield in a real
Hard Winter with the crisis panel over it and neighbours around it; that is where "does this read
at the distance the game rests at" is answered. These answer one question — *can you still tell
which building that is once it is protected* — with the confounds removed.
