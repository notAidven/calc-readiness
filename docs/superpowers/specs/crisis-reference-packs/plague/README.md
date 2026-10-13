# Plague Crisis reference plates, era six

Six flat-shaded plates for era six's crisis, each settling a visual question that
`docs/superpowers/specs/2026-08-01-plague-crisis-art-brief.md` could not settle in prose. Open
`index.html` for the contact sheet.

**Six, and four of them are about one object.** Era six's crisis has no weather, no fire, no hostile
and no light instinct at all, so era one's atmosphere plates have almost nothing to do here. What it
has instead is **an edge as the thing the player acts on**, which nothing else in the four carries,
and an edge has more states than a cell does: it can be open, shut for a stated number of cycles,
carrying the outbreak, or a closure that has expired. **Four plates on the link is the honest count**,
and the wide master and the building states make six.

| Plate | The question it settles | Left to right, or as noted |
| --- | --- | --- |
| `01-wide-master` | What the whole scene reads as: a composed square with nobody in it | Warm-buff masses under dark slate/lead roofs, inlaid bands running door to door across the paving, one band notched, one shut by a barrier stone, a survey abandoned mid-measurement, a boat holding position outside |
| `02-link-in-the-floor-against-on-it` | **The most expensive confusion in the set**: era six's link against era seven's | **Left**: era six, an inlaid band flush in the paving, walkable, part of the floor. **Right**: era seven, a steam main raised on sleepers with a cut arrowhead, something you would not step on |
| `03-long-link-not-adjacency` | Whether "spread through movement" reads as different from "spread through adjacency" | One notched band running the width of the island between two buildings that do not touch, with two untouched buildings standing between them and no mark on either |
| `04-link-three-states` | Open, shut and carrying, side by side | **Left column, top to bottom**: open, suspended, carrying the outbreak. **Right column**: suspended for one cycle, for the whole outbreak, and a closure that has expired |
| `05-closure-duration-bands` | Whether a duration is countable on the board without a number | Barrier stone with **one band**, **two bands**, **a full collar**, and **no band** (expired) |
| `06-building-four-states` | The row that must not merge: infected and closed are different facts | **clean**, **infected** (a pedestal with a covered vessel at the threshold), **closed** (shutter plates and a barred door panel), **infected and closed** (both, separately readable) |

**Plate 06 has no ruin among its four, and that is the strongest statement in this pack.** Era six
has **no destructive verb at all**: nothing in its vocabulary removes a building, so there is no
implementation slip that could. The four states are what the whole crisis can do to a building.

## Do not hand-edit these files

**Every file here is generated**, including the PNGs, by
`tools/generate-winter-crisis-references.ps1`. An edit to an `.svg` is lost on the next run.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/generate-winter-crisis-references.ps1 -Pack plague
```

On Linux and macOS the PNG pass warns and skips, because `System.Drawing` is Windows-only from
.NET 6. Rasterise there with `node tools/rasterise-crisis-references.mjs plague`. **The PNGs
committed here are Chromium renders**; see `../README.md` section 6b.

## What these are not

Reference geometry for the crisis scene. **No mass here is a building design.** The generated
stand-ins carry era six's warm-buff body hue `#C7A48E` and dark slate/sheet-lead accent
`#596675`, so the crisis marks have something era-correct to sit on. Localized brick and pale
dressed-stone trim are omitted from these schematic masses; building design belongs to
`../../eras/era-06-early-modern/` and `City_Art_Bible.md`.

**One tone decision is worth naming, because the obvious choice was wrong.** The inlaid bands are
drawn in a **darker cut of the floor** (`#9A9890`) rather than in era six's slate/lead accent.
Cool metal against pale dressed stone reads as a thing lying **on** the floor, which is precisely era
seven's object, so using the era's own accent here would have undone plate 02 on every other plate.

---

# Image-generation prompt sheet

Prompts to run later from a seat with an image tool. **Paste the theme brief and the constraint list
first, then one scene prompt.**

## The theme brief

> A stylised low-fidelity isometric toy city on a small round island, seen from a fixed camera
> tilted about 49 degrees down, no horizon tilt. Flat-shaded low-poly forms: every surface is one
> solid colour with three tone steps per volume, top face lightened, left face the base hue, right
> face darkened. **No textures, no gradients, no glow, no bloom, no reflections, no
> depth-of-field.** One soft key light for the whole scene and no local light anywhere.
>
> This is the **Early Modern era**: a Northern town re-drawn to a measured drawing. Warm buff lime
> plaster walls, body hue `#C7A48E`, standing on **pale dressed-stone bases** with localized
> hand-made muted red-brown brick. Dark slate and sheet-lead domes and cupolas `#596675` laid in
> rolled bays with the seams running with the curve, a lantern at each crown. Pilasters at constant
> spacing, arcaded loggias of round-headed arches, glazed casements whose bars read as a grid. The
> floor is **geometric paving**: large dressed slabs in a deliberate pattern that continues across
> the whole open ground rather than stopping at each building, with dressed channels, drain grates,
> and setting-out lines cut into the stone. **The stone is clean, even where it is old**: no grime in
> the joints.
>
> An **outbreak** is running and the town has shut itself down. The light is **high thin overcast**:
> a neutral near-white key well down in intensity, high and flat so there is almost no shadow, a
> flat pale grey sky with barely any blue in it, and no haze, because everything is meant to be
> visible. The correct read is **a day nobody went out in**. **Not gloomy, not dark, not dusk.** Pale,
> even and empty is the mood, and it is more unsettling than dark would be.

## Constraints that bind every image

- **Nobody is in any frame.** No people, no carts, no animals, no smoke from any chimney. The
  emptiness is the whole atmosphere.
- **Nothing is dark, ruined, burnt or overgrown.** The outbreak is short, nothing is destroyed, and
  the gardeners are still alive. Hedges are clipped, gravel is raked, stucco is clean.
- **No painted plague cross on a door.** Every mark is **cut** into stone or is **a plate set over an
  opening**. A cross specifically may not be used at all: use a **single horizontal cut bar**.
- **No building is tinted to show infection or closure.** Both are **added objects**.
- **Lead is pale, faceted and flat**, never reflective. There is nothing to reflect.
- **Mastery gold `#FFB703` may not appear.**
- **No urgency framing, no alarm, no red.** The tone is calm and non-punishing.
- **Every side of every object must read**, because the camera orbits a full circle.

## The six scenes

**1. Wide master.** The whole island under a flat pale grey overcast: a geometrically paved square
with its pattern running unbroken across the open ground, three stucco buildings on rusticated bases,
two under lead domes with lanterns. Narrow bands are **inlaid flush into the paving**, running from
one building's threshold across the square to another's, in a slightly darker cut of the same stone.
One band carries a row of **small cut notches** along its length. Another is crossed at its midpoint
by **a plain dressed stone laid across it**. A surveyor's plane table stands on its tripod with
ranging rods still standing where they were set, abandoned mid-measurement. One timber hull holds
position out past the mole, not landing. Clipped hedging in geometric beds. Nobody present, nothing
moving, no shadows to speak of.

**2. Two link kinds, side by side.** Left half: two stucco buildings on a paved square joined by a
**narrow band inlaid flush into the paving**, level with the stone, something a person would walk
across without noticing. Right half: two soot-darkened industrial blocks joined by a **cast steam
main raised on timber sleepers**, standing clear of the ground, with a **cut arrowhead** on it giving
it a direction. Same light, same camera, same scale. The two must read as **opposite kinds of
object** at a glance: one is a path people take and the other is a thing that feeds something.

**3. One long link across the island.** A geometrically paved square with four stucco buildings on
it. A single **inlaid band carrying a row of cut notches** runs the full width of the island, from
the threshold of the leftmost building to the threshold of the rightmost. **The two buildings
standing between them are untouched and carry no mark at all**, and the band passes them without
touching either. Both end buildings carry **a low pedestal at the threshold with a covered vessel on
it**. The reading to land: the thing travelled between two buildings that are nowhere near each
other.

**4. Six inlaid bands, close.** Six short inlaid bands on a paved floor, in two columns of three.
Left column top to bottom: a band **flush and continuous**; a band **darker and recessed along its
length with a plain dressed stone laid across its midpoint**; a band **carrying a row of cut notches
end to end**. Right column: the same crossed band with **one raised band round the stone**, with **a
full collar round the stone**, and with **no band on the stone at all**. Same stone, same light, no
labels.

**5. Four barrier stones, close.** Four plain dressed stones, each laid across an inlaid band on a
paved floor, differing only in what is cut round them: **one raised band**, **two raised bands**, **a
full collar covering the whole height**, and **nothing**. The stones are low, squared and
unornamented, because the closure is administrative rather than physical: this is a decision made on
paper and enacted in the street, not a gate with hinges.

**6. Four buildings in a row.** Four identical stucco buildings on rusticated bases, on a paved
floor. The first is **as built**. The second has **a low pedestal at its threshold carrying a covered
vessel**. The third has **painted timber shutters closed and barred across every opening, plus a
barred panel over the door with a single horizontal cut bar on it**. The fourth has **both** the
threshold pedestal and the shutters. The fourth must read as carrying two separate facts rather than
one combined one.

## Related

- `../../2026-08-01-plague-crisis-art-brief.md`: the brief these plates belong to
- `../../crises/era-06-plague.md`: the merged presentation brief for era six
- `../README.md`: the shared mechanic inventory, propagation reading and pack conventions
- `../../eras/era-06-early-modern/style-guide.md`: era six's palette, geometric paving and props kit
