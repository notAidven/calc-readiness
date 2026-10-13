# Intrusion Crisis reference plates, era nine

Six flat-shaded plates for era nine's crisis, each settling a visual question that
`docs/superpowers/specs/2026-08-01-intrusion-crisis-art-brief.md` could not settle in prose. Open
`index.html` for the contact sheet.

**Six, and three of them exist because this crisis is invisible.** Nothing burns, nothing arrives,
nothing falls over, and the town is exactly as immaculate as it was. So era one's hazard plates have
no subject, and what earns a plate instead is **information**: how a reading reads, how it reads at
two different zooms, and how a reading that has gone stale reads without being deleted.

| Plate | The question it settles | Left to right, or as noted |
| --- | --- | --- |
| `01-wide-master` | What an invisible crisis looks like at the fixed camera | An immaculate sealed town late in the day with its floor open in several places, temporary barriers round every opening, a lit panel by every door, collars on the duct markers |
| `02-lifted-cover-and-barrier` | Whether one lifted cover carries the crisis on its own | **Left**: a closed inspection cover, squared to the paving module and part of the pattern. **Right**: the same cover **lifted and leaning**, the void open, barriers round it |
| `03-status-panel-four-readings` | Whether four readings are countable in greyscale at the game's zoom | **unread** (a lit but blank matrix), **clear** (one segment), **likely compromised** (two, the second at half height), **compromised** (three, full height) |
| `04-two-distances` | Whether the same fact survives full zoom-out | The same compromised reading **near** (panel legible) and **far** (panel too small to count), with the **duct-marker collar** carrying it at both, and a clear building beside it for contrast |
| `05-stale-reading` | How a reading that no longer counts stays informative | **Left**: a live compromised reading, three segments, raised doubled collar. **Right**: the same reading gone stale, **a bar under the segments**, the face dropped to about half, **a cut notch across the collar** |
| `06-building-states` | Untouched against isolated, with no ruin between them | **clear**, **compromised but still working**, **isolated** (flush blanking panels in the curtain-wall module, a service isolation plate at the corner, **and its panel dark**) |

**The dark panel in plate 06 is the point of that plate.** In a town where every other panel is lit,
the one that is not is the strongest available statement, and it costs nothing: it is the absence of
an emissive lift rather than the addition of anything.

**The barriers in plates 01 and 02 are the era's own added clad panel**, rail `#8B959C` and posts
`#646B70`, which is the same material as the blanking plates in plate 06 and is authored once as
`$ERA9.Clad`. They were a rust orange until 2026-08-01, the warmest thing in any intrusion plate and
in contradiction with the two documents that rule this surface. **Ruled and measured at**
`../../2026-08-01-intrusion-crisis-art-brief.md` §3.2a: era nine's ground family runs -15 to -9 on
blue-minus-red and everything built or added to the town runs +6 to +41, so in this era warm means
floor, and a warm barrier said *floor* at the one object whose job is to say *this floor is open
here*. **The check on those two plates is that the dark void is the loudest thing on the paving**,
which it is by 0.342 of luminance against the floor. If the barrier takes your eye first, the tone
has crept back up.

**Plate 06 has no ruin.** Era nine's crisis suspends capacity and relocates a source; it destroys
nothing. Section 4 of the brief carries that as the row it is rather than leaving the gap.

## Do not hand-edit these files

**Every file here is generated**, including the PNGs, by
`tools/generate-winter-crisis-references.ps1`. An edit to an `.svg` is lost on the next run.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/generate-winter-crisis-references.ps1 -Pack intrusion
```

On Linux and macOS the PNG pass warns and skips, because `System.Drawing` is Windows-only from
.NET 6. Rasterise there with `node tools/rasterise-crisis-references.mjs intrusion`. **The PNGs
committed here are Chromium renders**; see `../README.md` section 6b.

## What these are not

Reference geometry for the crisis scene. **No mass here is a building design.** The masses are
stand-ins in era nine's body hue `#96A1AB` with its glass accent `#7FA0A8` and the shadow gap at the
ground line that the era's guide makes a rule, so the crisis marks have something era-correct to sit
on. Building design belongs to `../../eras/era-09-information/` and `City_Art_Bible.md`.

**Era nine's buildings are pale and faceted, not reflective, and that is not this pack's choice.**
The era's signature move is a sealed reflective skin showing *"a reflection of the sky and the next
building along"*, and there is no environment map and nothing to reflect. Era nine's own brief
records it, and these plates inherit the limitation rather than causing it.

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
> This is the **Information Age**: an era that hides its infrastructure. Unitised panels made in a
> factory and craned into place, body hue anodised grey-blue `#96A1AB`, glass accent `#7FA0A8` in the
> same family so the building has very little internal contrast, flat parapets, and **a shadow gap
> where the building meets the ground rather than a base**. The floor is **engineered paving on
> structure**: thousands of small precise units in banded patterns, laid over service voids rather
> than on soil, with **inspection covers squared to the module and aligned to the joints as part of
> the pattern**, tactile strips, flush drainage channels, and flush duct and fibre markers. Ground
> levels change by ramp. The paving is **grey-brown granite**, warmer and darker than the buildings.
> Planting is lush and layered and entirely artificial in fact: multi-stem trees in flush grilles,
> ornamental grasses in drifts.
>
> Something is **in the town's systems**. The light is **late, flat and colourless**: a neutral grey
> key well down in intensity, low and flat, long soft shadows across a precise floor, a flat cool
> grey sky slightly darker than a daytime one, and the world beyond the town indistinct. The
> buildings' own **small lit panels are the brightest things in the frame**, and they light nothing.
> The town is not damaged and not dirty. It is immaculate, and its floor is open in a dozen places.

## Constraints that bind every image

- **Nothing is lit locally.** The lit panels are **bright faces** and they cast no light on a wall,
  a floor or each other. **No night scene**: bright rectangles floating in blackness with no falloff
  read as broken rather than as atmospheric.
- **No emissive surface large enough to read as a lit plane.** No glowing paving band, no lit floor
  strip running a route, no wash of light across the ground. Panels are **small, few and never a
  surface that lights another surface.**
- **No screen content as a picture.** A panel shows **a countable row of lit segments**, one, two or
  three, never text, never a graph, never an icon.
- **The floor is solid and you cannot see down through it.** No grille, no grating, no gap. An
  inspection cover is a cover: closed, or lifted and leaning with the void beneath it dark.
- **No building is tinted to show its status.** Status is carried by **the panel, the ground collar,
  and added panels over openings**.
- **Nothing is glassy or reflective.** Glass and anodised panel are pale, faceted and flat.
- **No wilting, no damage, no dirt, no rubble.** The town is maintained perfectly throughout.
- **Mastery gold `#FFB703` may not appear.**
- **No urgency framing, no alarm, no red.** The tone is calm and non-punishing.
- **Nothing the town adds is warm, and no high-visibility site colour appears at all.** The barriers
  are the era's own clad panel `#8B959C` on posts `#646B70`: no orange, no yellow, no lime, no hazard
  stripe, no chevron, no reflective band, no cone, no tape and no netting. In era nine warm belongs
  to the floor and to nothing standing on it.
- **Every side of every object must read**, because the camera orbits a full circle.

## The six scenes

**1. Wide master.** The whole island late in a flat grey day: precise banded unit paving on
structure, three anodised grey-blue buildings with flat parapets and a dark shadow gap at the ground
line, lush planting in generous drifts. **Half a dozen inspection covers are lifted and leaning**,
their voids dark, each ringed by low temporary barriers in the town's own matched clad panel
`#8B959C` on posts `#646B70`, quieter than the dark voids beside them. **Flush duct
markers** set into the paving carry raised collars along the routes evidence was found on. **A small
lit panel stands beside each door**, showing a row of one, two or three lit segments. A small clad
pavilion has its door standing open on the side you can see. No people. Nothing broken.

**2. Two inspection covers, close.** Left: **a closed inspection cover** set flush into banded unit
paving, squared to the module and aligned with the joint lines so it reads as part of the pattern
rather than as something apologised for. Right: **the same cover lifted and leaning against the
paving beside its opening**, the void beneath it dark and solid-edged, low clad barriers standing
round the opening in the town's own panel `#8B959C` on posts `#646B70`, cooler than the floor and a
step down from it. The pattern of the floor is visibly **broken** at the second one, and that break
is the whole subject: **the dark void must take the eye before the barriers do.**

**3. Four lit panels on four walls, close.** Four identical anodised grey-blue buildings, each with a
**small illuminated matrix panel mounted on its wall beside the door**, in a dark bezel. The panels
differ only in what is lit: **nothing** (a lit but blank matrix); **one segment** at the left; **two
segments, the second only half the height of the first**; **three segments, all full height**. The
segments read as a countable row of small bright bars. **Nothing else about the four buildings
differs**, and the panels light nothing around them.

**4. The same reading near and far.** One large anodised building close to the camera with a lit
panel showing **three full-height segments** on its wall, and a **raised doubled collar** on a flush
duct marker in the paving in front of it. Behind it, two much smaller and more distant buildings of
the same type: one with the same three-segment panel now **too small to count**, its **doubled
collar still clearly raised** on the ground; the other with a one-segment panel and a **flush**
collar. The subject is that the ground marker carries the fact at the distance the wall panel stops
carrying it.

**5. A live reading and a stale one.** Two identical anodised buildings side by side. The left one:
a lit panel with **three full-height segments** bright against a dark bezel, and a **raised doubled
collar** on its duct marker. The right one: the **same three segments still showing**, at about half
the brightness, with **a horizontal bar drawn under the row**, and its duct-marker collar **still
raised but with a cut notch across it**. Nothing is blanked and nothing is deleted: the second
building still shows what it showed, marked as no longer current.

**6. Three buildings in a row.** Three identical anodised grey-blue buildings on banded unit paving.
The first is **as built**, with a one-segment lit panel and a flush duct-marker collar. The second is
**as built**, with a three-segment lit panel and a raised doubled collar: compromised and still
working. The third has **flush blanking panels set into the curtain-wall module over every opening**,
so it reads as sealed rather than as boarded, **a small angled service isolation plate with a single
cut bar at its front lower corner**, and **its panel dark and unlit**. It is not damaged and it is
not a ruin: it is switched out of the town.

## Related

- `../../2026-08-01-intrusion-crisis-art-brief.md`: the brief these plates belong to
- `../../crises/era-09-intrusion.md`: the merged presentation brief for era nine
- `../README.md`: the shared mechanic inventory, propagation reading and pack conventions
- `../../eras/era-09-information/style-guide.md`: era nine's palette, engineered paving and props kit
