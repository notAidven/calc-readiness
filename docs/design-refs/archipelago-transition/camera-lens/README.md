# The ceremony's lens against the camera buttons — before and after

**Viewport: 1024x580, on the learner's own mount (`CitySurface`), not `?dev`.** Every frame here
was taken by `apps/web/src/city/three/ceremonyCameraLensFrames.browser.test.tsx` driving the real surface with the
archipelago flag on the way a learner turns it on — `?bay` on the address bar — with **motion on**,
and with the two dev panels hidden for the photograph. The frames were looked at.

## What the owner saw

> *"the island thing looks terrible."* An enormous flat tan/beige slab filling the middle of the
> frame, running from the top down past centre, with thin dark segmented lines down both its left
> and right edges, open blue water behind it, and the real city small and partly cut off along the
> bottom.

## The reproduction

Act two done (`kept: 2`), then the HUD's own **Zoom in** button. Nothing else — no drag, no wheel,
no pinch.

| frame | what it shows |
| --- | --- |
| `1024x580-before-01-act-two-untouched.png` | The sitting as the committed beat frames show it: the destination out of the haze, the causeway open across the water, the city along the bottom. This is the control. |
| `1024x580-before-02-after-four-zoom-in-presses.png` | Four presses. The causeway is already climbing the frame and the city is going off the bottom. |
| `1024x580-before-03-after-eight-zoom-in-presses.png` | **The defect.** Eight presses. The causeway fills the middle of the picture from the top edge down past the centre, its stakes reading as segmented lines down both edges, open water behind it, the city cut off along the bottom. This is the owner's description. |

## The cause

`CityScene`'s latch was written on `MapControls`' own `start` event, and its docblock argued the
case: *"`MapControls` fires `start` on a pointer-down, a wheel and a pinch and on nothing else."*
That is true, and it is a fact about `MapControls` where the claim had to be about the product. The
city also ships a five-button camera toolbar (`CameraControls`) and a keyboard map
(`cameraKeyIntent`), and both drive `applyCameraAction`, which moves the controls with a bare
`update()`. `update()` fires `change`, never `start`.

So the lens never learned the camera had moved, and went on re-fitting a box computed for a camera
eight zoom steps away from the one drawing the frame.

## After

The same presses, with the lens released off the camera itself
(`ceremonyCameraStand` / `ceremonyCameraMoved`).

| frame | what it shows |
| --- | --- |
| `1024x580-after-01-act-two-untouched.png` | Unchanged against `before-01`. The lens still composes the opening frame, because nothing moved. |
| `1024x580-after-02-after-four-zoom-in-presses.png` | Four presses: the player's own camera, at the resting frame. |
| `1024x580-after-03-after-eight-zoom-in-presses.png` | Eight presses: an ordinary close view of the city. The slab is gone. This is bit-for-bit the behaviour the wheel already gave, which is the point — the two input paths now agree. |
| `1024x580-after-04-after-four-zoom-out-presses.png` | Zoom out, the other direction of the same control. |
| `1024x580-after-05-after-four-rotate-left-presses.png` | **Rotate is deliberately unchanged.** Four presses of Rotate view left and the lens is still holding the departure's frame, drawn at the new heading. The lens is told the heading live, so an orbit leaves its arithmetic true; releasing here would drop a frame that works rather than repair one that does not. |
| `1024x580-after-06-mid-act-two-after-six-zoom-in-presses.png` | Mid-act-two (one answer in), six presses. The same repair part way through the beat, where the box is smallest and the old defect was worst. |

## The two controls, because the shipped ceremony is Friday's fallback

Neither of the ceremony's own frame guards moves the camera, so the repair cannot reach them —
but that is an argument, and both were run instead.

**`archipelagoBeats.browser.test.tsx`**, the four acts of this departure, at 1024x580 under
reduced motion, across the four act boundaries:

| | 01→02 | 02→03 | 03→04 | 04→05 |
| --- | --- | --- | --- | --- |
| this tip, before any of this landed | 453415 | 520475 | 5226 | 9115 |
| with the repair, same tip | 453415 | 520475 | 5226 | 9115 |
| with the repair, after a forward-merge of 26 commits | 453415 | 520481 | 10578 | 9115 |

The first pair is **bit-identical on all four**, which is the control that matters: same tree,
one change. After the forward-merge two are still identical, the second is out by 6px in 520k,
and `03→04` moves 5226 → 10578. That third figure is the one the guard's own docblock already
names: *"act three has measured 0.88% AND 1.77% on this tree, over runs whose committed frames
both plainly show the ring and the hall, so the figure moves by a factor of two for a reason
this file has not established."* 5226px is 0.88% and 10578px is 1.78% — the two documented
readings exactly, not a third one. All assertions pass at both tips.

**`eraAdvanceOnTheIsland.browser.test.tsx`**, the single-island ceremony #644 proved
pixel-equivalent to trunk's, run twice on the same machine minutes apart — once with the repair
and once with `CityScene.tsx` and `ceremonyFraming.ts` swapped for `origin/integration`'s:

| | 02-gathering | 03-expansion | 04-rebuild | 05-arrival |
| --- | --- | --- | --- | --- |
| trunk's camera lane | 87.97% | 88.30% | 0.95% | 1.39% |
| with the repair | 87.97% | 88.32% | 0.95% | 2.04% |

Two of the four bit-identical, the third out by two hundredths of a point. The fourth is the
figure #644's work log has already measured as unstable on one unchanged tree — *"two runs of
the same guard on the same tree came back 1.62% / 2.03% and then 0.95% / 1.39%, which
establishes that the two small figures are not stable to better than a factor of about 1.7"* —
and 1.39 against 2.04 is a factor of 1.47. Both runs pass all five assertions.

⚑ Both rows also differ from the figures committed in `docs/design-refs/era-advance-beats/`
(89.61 / 89.75 / 1.33 / 6.67). That gap belongs to `integration` and predates this branch;
#644's work log records it as *"a live finding that is not mine to fix"* and attributes it to
#636 making the island's cell grid ground. It is untouched here for the same reason.

## What is NOT here

The keyboard half of the same defect. `cameraKeyIntent` maps arrows/WASD, `+`/`-`, `Q`/`E` and `0`
onto the same `CameraAction`s and the same `applyCameraAction`, so it is the same code path and the
same repair — but the synthetic `keydown` this harness dispatches did not reach the viewport's
handler, so there is no photographed keyboard frame. The keyboard is covered by
`ceremonyCameraControls.test.ts`, which drives every member of the action union through the shipped
applier; it is not covered by a picture.
