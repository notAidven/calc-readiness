# The storm roof bedded, and absent — 1024x580

Two frames, and they exist because **the merge of #465 into trunk had to combine two rulings about
the same cap** and neither of them is a claim a passing test can settle on its own:

- trunk (#426) — the cap is **hidden until it has been bedded** onto a measured roofline, because a
  cap left at its build origin is a gable through the base of the building it is protecting;
- #465 — the cap's **gable rise is derived from that same building's measured height**, because a
  rise taken off the plot alone put a 1.976u roof on a 1.828u Workshop.

The combined behaviour is *drawn once it is both bedded and sized*, so what a reader has to be able
to see is the cap present and correctly seated in one state and **absent** in the other.

Taken through the shipped renderer by
`apps/web/src/city/three/winterShieldAndThreat.browser.test.tsx`
(`VITE_WINTER_SHOTS=1 npx vitest run --config vitest.browser.config.ts <that file>`), at
**1024x580** — the lead's own short laptop window — under `reducedMotion`, at
`VILLAGE_CAMERA.polarAngle` with the winter rig's own lighting, sky and exposure. Copied to
`output/winter-storm-roof-bedding/` as well, so they open without checking a branch out.

| file | the subject lot's model |
| --- | --- |
| `01-model-resolved-cap-bedded-1024x580.png` | resolved: `NUM.S`'s GLB, 4.821u |
| `02-model-unresolved-cap-absent-1024x580.png` | unresolved: `PlacedBuilding`'s render-nothing arm |

**The left-hand lot is the same building unshielded and it is identical in both frames.** It is what
the camera is fitted to — the fit reads its box and the two lot centres, none of which the subject's
model touches — so nothing in the framing can move between the exposures. Two frames of one lot at
two framings would let a missing roof be a missing roof *or* a camera that had backed off.

## The honest read

**01, resolved.** The storm roof is on the roofline and not through it. The eave purlins sit at the
top of the Roundhouse's dome, the ridge stands proud above its apex, and the dome reads straight
through the open frame — which is #465's §2a, and it is why this can be photographed at all without
the building disappearing. Measured beside the picture, in the same test: the eaves are below the
model's top and within 1.5u of it. The gable is a fraction of THIS building, not of its plot:
`winterShieldSilhouette.browser.test.tsx` measures the crest at **+2.005u, 42% of NUM.S's own
4.821u**, and across all nineteen subjects 33% to 43%. With the rise flattened back to the plot the
same rig reports NUM.S at 82% and `RAD.2` at 372%.

**02, unresolved.** No cap. Nothing straddles the ground, nothing lies flat on the snow, and there
is no gable sunk to its eaves in a base — which is what #426's runner photographed and what the
`null` arm of `capBedOffset` exists to refuse.

**What IS still drawn on the unresolved lot, and it is not a defect:** the shield's **banking**, the
dark ring of earth and brush at the foot of the walls, plus the winter drifts. Trunk's ruling scopes
the hide to the CAP alone and deliberately so — the banking sits at ground level and needs no
roofline to be bedded onto, so it has nothing to wait for. A reviewer looking at frame 02 is
therefore looking at a banked, empty lot rather than at bare snow, and that is the shipped answer
rather than an artefact of this merge.

**Two other things in shot that are not the roof.** The mastery star row is drawn over the left lot
in both frames and over the right lot only in 01, because `PlacedBuilding` earns no stars without a
model; and the subject lot's own drifts are visible in both. Neither is this merge's subject.

## What a frame here cannot settle

The transition itself. Both pictures are steady states, and the interesting moment between them is
one or two frames long: the box resolves, the cap is bedded, the geometry is rebuilt at the derived
rise, and the cap is shown. `BuildingShield.tsx` keeps the cap hidden across the whole of that,
which is why 02 is the honest picture of every frame before the roof appears — but a still cannot
show that there is no flicker in the middle of it. That claim rests on the code and on
`dressingPlaced`, which waits for the cap to have been placed AND to have stopped moving between
two drawn frames.
