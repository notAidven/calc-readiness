# The cart-puller, before and after

**Viewport 1024x580, `prefers-reduced-motion` on every component that takes it, era one,
day lighting.** The viewport is named because it is half the evidence: the same sled is
5.64 px/u at full zoom-out on a 580px-tall viewport against 8.75 on a 1400x900 one
(`2026-08-01-era-vehicles-and-city-life.md` §4.1), so a comfortable developer window makes
every figure here 55% bigger than the screen this is reviewed on.

Regenerate with `VITE_CART_SHOTS=1 npm run test:browser`
(`apps/web/src/city/three/cartPullerShots.browser.test.tsx`). The "before" frame was taken
by checking `apps/web/src/city/three/Vehicles.tsx` out of `integration` at `d857c0fe` and
running the same file, so the two frames differ in that one source and nothing else: same
island, same camera, same seed, same crowd.

## What the lead reported

> *"the person pulling the cart in era 1 doesnt actually look like the other people it
> looks corrupted: just use the same model as you do for hte normal people as you do for
> pulling the cart."*

## The frames

| File | What it is |
|---|---|
| `00-before-cart-puller-beside-the-crowd-1024x580.png` | The whole frame as it shipped. |
| `01-cart-puller-close-1024x580.png` | After, close on the sled, with the settlement behind it. |
| `02-cart-puller-beside-the-crowd-1024x580.png` | After, aimed between the sled and the Dwellings' doorstep, so the hauler and the island's largest resident crowd are in one picture at one camera. |
| `03-before-after-beside-a-citizen-3x.png` | The two frames cropped to the same region at 3x. **An ordinary citizen stands at the bottom of both crops**, which is what makes it a comparison rather than two portraits. |
| `04-before-after-the-figure-3x.png` | The figure itself, 3x. |

## What is in them

**Before.** The hauler is a near-black slab on two thin stalks with a small dark head: no
arms, no garment outline, and legs, torso and head all in `cord`, the darkest of era one's
four prop tones. It is also OFF THE GROUND. It hung off the sled group, which is tilted
nose-up and seated clear of the surface, and the hauler sits at the nose, so its feet came
out **0.374u above the road** — 29% of a person's standing height. Beside the citizen in
the bottom of the same crop, which is a tan flaring tunic under a terracotta head, it does
not read as a stylised person. It reads as a corrupted one.

**After.** The hauler is the citizen. Same body geometry, same head geometry, same era row
out of `citizenDress.ts`, feet on the road, leaning into the haul cord. In
`03-...-beside-a-citizen-3x.png` the two figures are the same size, the same silhouette and
the same two-tone cloth-over-skin, which is the whole of what was asked for.

**The ceremony crowd is not this PR's, and no longer needs to be.**
#475 landed the shared module,
the ceremony lens and the crowd's move onto the shared figure, all at 21:06:35Z. This work
is built on that module; the only thing it adds to it is `PERSON_SOLE_RADIUS`, which is the
leg's existing taper given a name so the hauler's forward lean can be grounded at any angle.

The measurement behind the picture is `apps/web/src/city/three/personFigureShared.test.ts`,
which compares the hauler's vertex buffers against the crowd's element for element rather
than comparing a height — the strongest available form of "the same model", and the one a
re-implementation cannot accidentally satisfy.
