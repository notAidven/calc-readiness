# A civic building a crisis shut, in the city

Two frames of one city at **1024x580** under reduced motion, one mount, camera untouched
between them. Taken by `apps/web/src/city/suspendedCivicFrames.browser.test.tsx` over the real
`CitySurface`; `measured-1024x580.txt` holds the figures.

The viewport is named because it is half the evidence: these numbers and this layout resolve
differently on a taller screen, and a frame at a comfortable developer window would be exactly
as misleading as arithmetic.

| Frame | What it is |
| --- | --- |
| `1024x580-1-a-shuttered-civic-building.png` | An era-one city with six skills built, a Family Lodge and a Campfire bought, and the Lodge shut by a crisis. |
| `1024x580-2-the-same-city-reopened.png` | The same city at the same camera, one press of **Reopen for 20 stone** later. |

Measured across the pair: **livability 72 sustained while the Lodge is shut, 92 after it
reopens** — the Lodge's own 20, withheld and given back. The lift cost 20 stone.

> **⚑ RE-SHOT 2026-08-05 on the tree that carries this change beside
> #567, and every FIGURE came back
> the same.** `measured-1024x580.txt` is byte-identical across the re-take, which is the
> statement worth having: nothing about the caught-up crowd, and nothing in the trunk that
> landed between, moves what a shuttered building withholds.
>
> Both PNGs did change, and for reasons in neither lane:
> #566 removed the grid drawn over
> the island's middle and #604 rebuilt the dev hatch's moment list, so the older pair showed a
> grid the product no longer draws. They are replaced rather than kept, because a design ref of
> a surface that has changed is a picture of something else.
>
> The city here is an era-one city a learner BUILT, not a caught-up one — so #567's crowd is
> not in these frames by construction. How the two compose is asserted in
> `apps/web/src/city/caughtUpCityWithASuspension.test.ts` instead of photographed, because that
> claim is arithmetic (which capacity falls, by how much, and that the headcount does not)
> rather than spatial.

## What a player can see, and what they cannot

**They can see that a building is shut, and read what it is costing them.** Three channels
carry it and all three are in frame one:

- `SUSPENDED` above a roofline, on a dark plate that reads differently from the teal
  skill-name plates beside it. This is #502's channel — the slot that spells `FROZEN` /
  `SHIELDED` / `IN DANGER` / `SAFE` while a crisis is on — reused rather than invented.
- The **Crisis damage** panel on the right names *The Family Lodge*, says *"Shut, so the city
  is doing without 20 livability and 5 happiness. The building is still yours"*, and offers the
  lift at the catalogue's price. This is the reachable half: the canvas is `aria-hidden`, so a
  suspension a player could only see and only clear there would be invisible to a screen
  reader and unreachable from a keyboard.
- **City life** reads `72 sustained`, down from 92, which is the consequence itself.

Frame two is the control: no caption, no panel, and the figure back at 92.

## The honest limitation, which the frame is what made visible

**The caption does not visually attach to a building.** It anchors over the Lodge's measured
roofline exactly as every skill label anchors over its own, and in a settlement this dense that
is ambiguous at a glance — looking at frame one you can tell *a* building is shut and you have
to read the panel to learn *which*. That is the shipped behaviour of this channel rather than
something this change introduced (`Signed numbers` and `Order of operations` have the same
ambiguity in the same frame), and the per-building answer is a click away: the building's own
card now opens with *"A crisis has this one shut"* instead of quoting a figure the city has
stopped counting.

**And the building's own model is unchanged.** Era four's forum draws real shutters
(`three/successionScene.ts`'s `buildShutters`) and they are not reusable here: that builder
takes the openings of the mass it built as data, and the island's civic GLBs do not publish
theirs. A shutter treatment on the island's art is new art and is not in this change.

**The dev "Replay onboarding" card overlaps the panel's heading** in frame one — the `1 building
shut` line is clipped. That is a pre-existing dev overlay, not shipped chrome, and not this
change's.

## Regenerating them

Off by default, because a shadow-mapped scene left switched on in the browser suite starves an
animation-timing assertion in a different file rather than failing where it is
(`winter/winterZeroAccuracy.browser.test.tsx` records the finding).

```
VITE_WINTER_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
  apps/web/src/city/suspendedCivicFrames.browser.test.tsx
```

The run asserts the caption is on the right building **before** it keeps either frame, so a
photograph of an island with no caption on it is a failure here rather than something a
reviewer has to notice. It is also the only place `CityScene`'s pass-through to the label
overlay is exercised: strip `suspended={suspendedCivicIds}` from that file and this run reports
*"the island is drawing no SUSPENDED caption over the shuttered building"*.
