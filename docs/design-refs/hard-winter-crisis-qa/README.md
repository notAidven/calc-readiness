# The Hard Winter, after the lead's QA pass: statuses, no storm roof, and a loss announced

Three of the five items from the 2026-08-03 QA pass, photographed together because they are one
picture. All frames are **1024x580 under reduced motion**, taken through the shipped island
renderer by `apps/web/src/city/three/crisisQaFrames.browser.test.tsx`
(`VITE_WINTER_SHOTS=1 npm run test:browser`), with the crisis played through its own panel.

`composite-*` is the screen as the player gets it — the labels and the notice are DOM, so the
composite is the subject here. `island-*` is the same instant with the crisis mount hidden, kept
beside each because a canvas layer photographed under a full-screen overlay comes back stale and
having both is what tells a reader which layer they are looking at.

| frame | round | what it shows |
| --- | --- | --- |
| `01-round-one-statuses` | 1, on load | every label is already a status, before anything has happened |
| `02-shielded-and-in-danger` | 2 | SHIELDED, IN DANGER and the first FROZEN, with the singular notice |
| `03-frozen-and-the-notice` | 3 | four buildings lost, and the notice reporting the three that went together |

`measured-labels.txt` is the same run's read-out: the notice's exact words, and every building's
status and caption.

**RETAKEN 2026-08-04, AFTER THE FORWARD MERGE**, because the frames the branch first committed
predate #470, #475, #493, #496, #498 and #499 and one of those changes what is in the picture. #470
had landed a second DOM overlay above the roofline for a `SHIELDED` tag, and two things saying
SHIELDED over one building was the failure mode, so that overlay was retired at the merge and this
caption is the only channel left — see the hall below.

## Item 3 — the storm roof is gone

The lead: *"scrap the shield youre using completely - it doesnt need to have an actual shield over
it other than an indicator over it that says shielded."*

Compare the roundhouse under the SHIELDED label in `02` and `03` with the frame the same fixture
produced before the deletion: it was a brown A-frame with a stone berm under it, and nothing said
which building it was. It is now the roundhouse, with the word SHIELDED over it. The reinforce
preview went with the geometry — a ghost of a thing that is not drawn is nothing — so a candidate
building reads as an ordinary one and the declare card names it in words.

## Item 4 — the label is the status

Read straight off `03`: `SHIELDED`, `IN DANGER`, and `FROZEN` four times. No building is captioned
with its skill while the crisis is on. `01` is the same claim at the moment of entry, which is the
half a later frame cannot show: the swap is not something that happens when a building is hit, it
is the whole crisis.

The fourth state, `SAFE`, is visible in `02` on the hall — it is the complement, and it says only
that the frost does not reach that building when the round closes.

### The HALL is captioned, which it was not before the merge

`skillLabelTargets` derives its population from the skill graph, and the graph correctly excludes
the hall: the hall teaches nothing, so it earns no skill NAME. A status is a different claim. The
live board hands the hall to `createHardWinter` with everything else (`liveCityLayout`'s
`includes_hall`), the engine ruins and shields it through the same fields, and the frost takes it on
the same terms — so with the storm roof scrapped and #470's tag retired, a shielded hall would have
had **no on-screen indication at all**: `CRISIS_STATUSES` has no `shielded` badge, deliberately,
because a shield used to be geometry.

That is the hole #449 found once already, and for the same reason — every population in the tree was
copied from a file that correctly exempts the hub. So the caption's population is the board's while a
crisis is on (`captionableBuildings` in `CityScene`), and `measured-labels.txt` here reads
`town-hall: threatened — "IN DANGER"` at round three, with `SAFE` over the hub in `02`.

## Item 5 — a building freezing announces itself

`02` carries the singular — *"A building has frozen: Dwellings. It is lost for the rest of the
winter."* — and `03` the plural, *"3 buildings have frozen: Store, Workshop, Commons."* The notice
is about the round that just closed, which is why `03` says three while four buildings are in
ruins: the fourth went in an earlier round and `02` announced it then.

## What still does not read, looking at these frames

- **The dev overlay covers two labels.** Top right of every frame, the `DEV ONLY, NOT ON THE
  LEARNER BUILD` panel sits over a `FROZEN` and a `SAFE` caption. That panel is dev chrome and is
  not on the learner build, so it is not a defect in the labels; it is worth knowing before reading
  these compositions as design.
- **A threatened building carries the fact twice**, as the chevron badge on it and the IN DANGER
  caption above it. That is deliberate — the badge is the crisis's own vocabulary and the caption
  is the words — but at this camera the two are within about 40px of each other and it reads as one
  cluster rather than two channels. **Still not fixed at the merge, and here is what it would cost.**
  Read off `island-02`: `IN DANGER` at (770, 367) with its chevron at (770, ~400), and again at
  (948, 239) over a chevron at (948, ~272). The arithmetic behind that: the caption anchors at
  `STAR_BAND_TOP_ABOVE_ROOF + 1.6` = 5.245u over the measured roofline and the badge's band tops out
  at `CRISIS_BADGE_SLOT.margin + MARKER_SIZE / 2` = 3.65u, so there is 1.595u — about 16px at the
  crisis camera's 9.99px per world unit — of clear air between two boxes saying the same word. Two
  fixes were considered and both are more than a merge should carry:

  - **raise the caption during a crisis.** One constant, except that `SkillLabels` has no clamp and
    no flip, and its host is `overflow:hidden`. #470 measured the hub's tag landing with its top 51px
    ABOVE this very viewport at the resting dolly on a clustered board, which is why `placeTag`
    exists at all. Raising the anchor therefore means porting that clamp-and-flip into the caption
    layer first, and until it is ported the change trades a cluster for a caption cut in half;
  - **stand the badge down while its caption is legible**, which is the ruling's own answer: the
    channel holds one thing. The badge earns its place as the ZOOM-OUT channel — the caption fades
    past 1.35x the default dolly and the silhouette does not — so the honest version is "the badge
    appears where the caption has faded", and that needs the caption's per-frame zoom opacity inside
    `PlacedBuilding`'s subtree, which is another component's `useFrame`.

  Neither is a one-liner, and the shielded case in the same frame is not the same defect: `SHIELDED`
  at (595, 254) over a chevron at (595, ~287) is a shielded AND threatened building, where the two
  channels are saying two different things, which is what the split pair is for.
