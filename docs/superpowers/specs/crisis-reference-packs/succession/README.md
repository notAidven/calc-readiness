# Succession Crisis reference plates, era four

Six flat-shaded plates for era four's crisis, each settling a visual question that
`docs/superpowers/specs/2026-08-01-succession-crisis-art-brief.md` could not settle in prose. Open
`index.html` for the contact sheet.

**Six rather than era one's six by coincidence, and the arithmetic is worth stating.** Era four has
no weather, no hazard object standing on the board, no per-cell ground layer and **no ruin state**,
so four of era one's plates have no subject here. What it does have instead is a **banked resource**
and a **four-state allegiance object**, which nothing else in the four carries. So three of era
one's plates are dropped and three new questions earn one.

| Plate | The question it settles | Left to right |
| --- | --- | --- |
| `01-wide-master` | What the whole scene reads as at the fixed camera under a hard white noon | Ships standing off, three masses on the paved floor, boundary runs, a statue on one plinth and not another, the crane stopped with a block in the air |
| `02-plinth-four-states` | Whether allegiance survives being carried by pose alone, at zoom | **bare** (neutral), **standing figure** (claimant one), **seated figure** (claimant two), **block in a sling under shear-legs** (contested) |
| `03-district-boundary-on-paving` | How a district edge reads without filling the district | Boundary stone with **no mark**, with a **cut chevron**, with a **cut ring**, with **both marks** |
| `04-drift-warning` | Whether a district about to decide is legible before it decides | A plinth with **nothing at its foot** (not drifting), a plinth with **a marked block waiting** (drifts next cycle), the same block **up in the sling** (the drift landing) |
| `05-civic-building-states` | Untouched, contested and claimed, side by side, with no ruin among them | **untouched**, **contested** (shutter plates between the bay columns, plus the corner tag), **claimed** (the claim plate on the wall) |
| `06-influence-counting-board` | Whether a banked resource is countable on the island rather than as a number | The ruled slab **empty**, **part filled**, **filled past its first row** |

**Plate 05 has three masses and not four on purpose.** Nothing in era four's crisis destroys
anything: `crisis-damage.ts` records era four's whole consequence in `suspended_civic`, and the
floor confines factions to civic buildings so a skill building is never claimed at all. **A ruin in
this plate would be a design decision the crisis has not taken.** Section 4 of the brief states it
as the row it is.

## Do not hand-edit these files

**Every file here is generated**, including the PNGs, by
`tools/generate-winter-crisis-references.ps1`. An edit to an `.svg` is lost on the next run.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/generate-winter-crisis-references.ps1 -Pack succession
```

On Linux and macOS the PNG pass warns and skips, because `System.Drawing` is Windows-only from
.NET 6. Rasterise there with `node tools/rasterise-crisis-references.mjs succession`. **The PNGs
committed here are Chromium renders**; see `../README.md` section 6b for why that matters and where
the two rasterisers disagree.

## What these are not

Reference geometry for the crisis scene: light, ground, propagation and aftermath. **No mass here is
a building design.** The masses are stand-ins in era four's body hue `#D2C8AA` with its terracotta
roof accent `#B4674A` and its kerb at the ground line, so the crisis marks have something
era-correct to sit on. Building design belongs to `../../eras/era-04-classical/` and
`City_Art_Bible.md`, and this pack writes none of it.

---

# Image-generation prompt sheet

Prompts to run later from a seat with an image tool. **Paste the theme brief and the constraint list
first, then one scene prompt.** Each scene stands alone once they are prepended.

## The theme brief

> A stylised low-fidelity isometric toy city on a small round island, seen from a fixed camera
> tilted about 49 degrees down, no perspective drama and no horizon tilt. Flat-shaded low-poly
> forms: every surface is one solid colour with three tone steps per volume, the top face lightened,
> the left face the base hue, the right face darkened. **No textures, no gradients, no glow, no
> bloom, no reflections, no depth-of-field.** One soft key light for the whole scene, and no local
> light source anywhere.
>
> This is the **Classical era**: a small port city of dressed ashlar limestone, body hue `#D2C8AA`,
> with terracotta pan-and-cover roofs `#B4674A`, repeated bays and colonnades, and a continuous
> **paved floor** of fitted stone laid to a regular bond with the joint lines running through,
> cambered and kerbed. Every building meets the floor with a dark kerb or coping.
>
> The city is in a **succession dispute**. The light is a **hard white noon**: cool near-white key
> raised close to overhead, short hard shadows, the sky bleached almost to white at the horizon, and
> haze pushed well back so everything is clearly visible. The mood is **order going brittle**, not
> weather arriving and not dread. Nothing is burning, nothing is broken, nobody is in the frame.

## Constraints that bind every image

- **Nothing is lit locally.** No brazier glow, no lamp pool, no light falling on a wall from an
  object. A bright surface is a bright surface and it illuminates nothing.
- **No building is tinted to show a faction.** Allegiance is carried by **added objects and by cut
  marks**, never by colour on a wall.
- **No painted or printed graphics anywhere**: no banners with devices, no chalked proclamations, no
  painted marks on the paving. Every mark is cut into stone.
- **Marble is pale and faceted, never polished.** There is nothing for a reflective surface to
  reflect.
- **Mastery gold `#FFB703` may not appear.** No gilding on anything, ever.
- **No crowds.** A political crisis with nobody in it is the deliberate reading: the city is drawn
  as **stopped work** rather than as a gathering.
- **No urgency framing.** No countdown, no alarm, no red warning language in the image. The tone is
  calm and non-punishing.
- **Every side of every object must read**, because the camera orbits a full circle. There is no
  front and no hidden back.

## The six scenes

**1. Wide master.** The whole island under a hard white noon: a paved floor with its joint lines
running through, three limestone masses with terracotta roofs standing on it, two or three timber
hulls holding position out past the harbour mouth with nothing being unloaded, a bare quay, a
treadwheel crane stopped mid-lift with a numbered stone block hanging still in its sling, and low
squared boundary stones set in a run along one of the paving's own joint lines. On one pedestal a
standing stone figure; on another a seated one; a third pedestal is bare. Short hard shadows, sky
bleached at the horizon, no haze, nobody present.

**2. Four pedestals in a row, close.** Four identical low limestone pedestals on the paved floor,
each carrying a different thing. The first is **bare**. The second carries a **standing stone
figure with one arm raised**, tall and narrow. The third carries a **seated stone figure**, wide and
low with a knee thrown forward. The fourth carries **a squared stone block hanging in a sling from
timber shear-legs**, not yet set down. Same stone, same light, same scale: the four must be told
apart by shape alone with no colour difference and no label.

**3. Four boundary stones, close.** Four low squared limestone boundary stones set into a paved
floor along a joint line, each with a different mark **cut into its top face**: nothing, a **cut
chevron**, a **cut ring**, and **both marks together**. The cuts are shallow relief with a shadow
line in them, not paint. The paving is unbroken and unfilled around every stone.

**4. Three pedestals and a waiting block.** Three limestone pedestals on the paved floor. The first
has **nothing at its foot**. The second has **a squared stone block resting on the paving at its
foot, with a cut ring on the block's top face, and timber shear-legs standing over it**. The third
has **the same block lifted in the sling**, above the pedestal and about to be set. The reading
should be immediate and need no caption: somebody is about to raise a statue here.

**5. Three civic buildings in a row.** Three limestone civic buildings of the same type on the paved
floor. The first is **as built**, open. The second is **shuttered**: squared timber boards set
between the columns of its own bay across every opening, a barred panel over the door, and a small
milestone-shaped stone marker at its front lower corner with a mark cut into it. The third is **as
built with a carved inscription panel on a bracket fixed to the wall beside its door**, cut with a
chevron. Nothing is broken, nothing is burnt, and none of the three is a ruin.

**6. Three counting boards.** Three marble slabs on the paved floor, each ruled into a shallow grid
of cells, each with a different number of round stone counters seated in the cells: **none**, **four
in one row**, and **enough to run past the first row**. Counters are the same stone as the slab, one
tone darker, seated flush in their cells so they read as counted rather than as scattered. No
numerals anywhere.

## Related

- `../../2026-08-01-succession-crisis-art-brief.md`: the brief these plates belong to
- `../../crises/era-04-succession-crisis.md`: the merged presentation brief for era four
- `../README.md`: the shared mechanic inventory, propagation reading and pack conventions
- `../../eras/era-04-classical/style-guide.md`: era four's palette, paved floor and props kit
