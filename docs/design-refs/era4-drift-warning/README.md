# Assets 1, 2 and 5, photographed

Four frames, all **1024x580**, all under `prefers-reduced-motion`, all uncropped, taken by
`apps/web/src/city/three/successionRulingShots.browser.test.tsx`:

```
VITE_SUCCESSION_RULING_SHOTS=1 npx vitest run --config vitest.browser.config.ts \
  apps/web/src/city/three/successionRulingShots.browser.test.tsx
```

| Frame | Asset | What it is for |
| --- | --- | --- |
| `01-hoist-waiting-forum` | 2 | The hoist standing over a plinth with its sling hanging empty and its block on the paving |
| `02-two-claimants-forum` | 1 and 3 | Both poses and both marks on one board, close enough to see them |
| `03-two-claimants-zoomed-out` | 1 | The squint test, at the end of the player's own zoom-out |
| `04-a-spend-seated-in-the-base-course` | 5 | A counter in the plinth of the district it bought |

---

## Asset 2: the hoist was the worst object on the island and a frame is what said so

**What it looked like before.** The lashing was `box(spread * 2.3, 0.22, 0.22)` — a 3.57-unit beam
laid across two of the three legs and pushed toward the camera — and the sling was two pixels of
`FIBRE` hanging in the wrong direction, because `side * theta` splays two runs *apart* going down.
So the frame showed a wide flat-bottomed loop under a long crossbar over a three-legged frame: read
at 1024x580, **crossed sticks lying over a plinth**. That is the *sacked city* confusion the sheet
calls this era's costliest, on the object it calls the crisis's most important.

Two things about that are worth keeping, because both were reasonable and both were wrong.

The beam had a real reason attached — *"so the apex has thickness against the sky rather than
resolving to a single pixel line at this camera"* — and the reason survives while the object does
not: a lashing binds three heads converging on one point, so it is sized to the bundle rather than
to the frame's spread. And the guard that catches it took two tries. *"Nothing reaches past the
footprint"* is the obvious assertion and it **passes**: the beam stuck 1.78 out of a frame whose
corner feet stand 1.94 from the axis, so it was inside the footprint and still read as fallen. What
is actually true of a standing hoist is narrower — *the only timber that goes out from the axis is a
leg* — and the beam fails that at 1.78 against 0.28.

**What `01` shows now.** A tripod standing clear over its plinth with a dark lashed head, two pale
runs converging from the head to a short bight, and the block on the paving 0.55 clear of the
plinth's foot with its chevron legible on its upward face. The sling hangs empty, which is the whole
of *waiting*: nothing is in it, and one cycle later the same block is up on the crown.

## Asset 1: both poses read at the shipped camera and not at the widest zoom

**`02` needed a new named board to be takeable at all.** Measured over the eight boards that
shipped, every one carried `figures=standing` and `marks=chevron` and nothing else — so asset 1's
silhouette pair and asset 3's shape pair could not be photographed together, and half of two assets
was unreachable in play. The reason is structural: a drift goes to whoever is strongest, the
tie-break at an opening board favours `standing`, and `spendFor` aims every card at the strongest
claimant. Standing takes the first district and is ahead for the rest of the crisis. `divided` is a
ninth board that secures a contest for the claimant who is not ahead.

**In `02` the two poses read apart.** The standing claimant is a narrow upright with a raised arm
clear of the body; the seated one is a wider, lower mass with a shin and a foot hanging past the
crown's front edge. Two different blobs, with colour ignored, which is the sheet's own test.

**In `03` they do not.** At the end of the player's own zoom-out each plinth carries a small dark
lump and the difference between the two is not reliably readable. The sheet says the silhouette
difference *"survives full zoom-out"*; at this camera it survives a long way out and not all the way.
Worth knowing rather than smoothing over, and the same limit the claim post's own frames found —
see `../era4-claim-post/README.md`.

**And `02` is the frame that found the layout defect.** It first came back with a chevron stone and a
ring stone standing in the same place, z-fighting, at three separate corners: two districts' claims
occupying one spot. Only the enclosure's *width* was bounded against the arc's spacing, and the depth
is what carries a run inward toward the middle of the forum where the arc is tightest. It had been
invisible for as long as every board carried one mark, because two stones in one place with the same
mark look like one stone. Both halves are bounded now and
`successionForum.test.ts` sweeps every authored board for it.

The stones are also **square to the paving** rather than to the run in these frames, which is the art
brief's own instruction — *"a stone squared to the run reads as a fence post, and a stone squared to
the paving reads as set into the floor"* — and it is the single change that most improved how the
enclosures read: in `02` they are a regular field of marked pads rather than a rotated scatter.

## Asset 5: the half of it the scene can say

`04` is a district the player paid for. The counter is seated in the plinth's **base course** — a
dark disc set in the pale step, on the corner the plinth faces — and never in the crown, because the
crown is the allegiance surface and a socket there would turn every bare plinth in the forum into a
prepared one waiting for a statue.

**It is a small statement and it reads as one.** The disc is about ten pixels and the 0.015 of
relief the ruling asks for is under a pixel at this camera, with the shadow it throws under a
77-degree key about a fifth of one — so out here the read is carried by the disc's own tone against
the stone rather than by its relief. That is why the counting board itself stays in the web lane:
`SuccessionSlab` makes the relief legible by displacing the counter's drawn shadow, which is the only
way 0.015 can be seen at all, and it sits beside the card prices the bank exists to be compared
against.

## Two things these frames say about things this does not touch

- **the hulls float above the sea.** Visible at the top of `03`: three timber hulls sit at `y = -0.2`
  over a water plane at `y = -1.4`, so they hang about half a unit clear of it. Pre-existing, and
  nothing in the six assets touches the port;
- **the boundary stones are numerous.** Eight per district over four districts is thirty-two marked
  pads, and at the widest zoom they are pale flecks. They read as deliberate markers now that each
  carries one legible mark, which is a change from the earlier frames, but the count is worth a look
  by somebody who owns the layout.
