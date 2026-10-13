# Hard Winter reference plates

Nine flat-shaded plates for era one's crisis, each settling a visual question era one's brief could
not settle in prose. Open `index.html` for the contact sheet.

**Plates 01 to 06 belong to `docs/superpowers/specs/2026-07-30-hard-winter-crisis-art-brief.md`.
Plates 07 to 09 were added 2026-08-01 and belong to
`docs/superpowers/specs/2026-08-01-hard-winter-art-brief-addendum.md`**, which covers three
mechanics that brief never designed: the fire's own states, its duration, and the protection ladder.

| Plate | The question it settles |
|---|---|
| `01-wide-master` | What the whole scene reads as at the fixed camera |
| `02-ground-treatment` | How frozen ground differs from ordinary ground |
| `03-frozen-water-boundary` | Where the ice stops and open water starts |
| `04-building-three-states` | Untouched, frosted and ruined, side by side |
| `05-fire-smoke-column` | What a lit hearth contributes, and how far it reads |
| `06-falling-snow-density` | How much snow is atmosphere and how much is noise |
| `07-fire-four-states` | The four states a hearth can be in, side by side. **Left to right**: proposed (ghosted hearth over ghosted held ground), declared and never caught (no ember, no smoke, no held ground), burning (flame, column, full held ground), burnt out (blackened stones, a wisp, the held ground closed over by frost) |
| `08-fire-duration-in-the-fuel` | Whether rounds remaining can be read off the fire's own mass rather than off a floating number. **Left to right**: three rounds of fuel, two, one, with the held ground identical in all three because duration is not width |
| `09-building-protection-states` | The five states a building can be in, and whether protection is distinguishable from frost and from ruin. **Left to right**: threatened and unprotected (a double chevron on a billboard above the roofline, in the ice front's own `#3c7fa0`), protected (a storm roof oversailing the wall, battens, a berm), a proposed shield (the same geometry ghosted), frosted at the middle stage, ruined (with the broken cross a lost building wears). **Re-drawn 2026-08-01**: the threat mark was an amber block at the building's front corner, and the lead ruled the plate to the code. See §5.1a of the addendum for why the blue is right |

## Do not hand-edit these files

**Every file here is generated**, including the PNGs, by
`tools/generate-winter-crisis-references.ps1`. An edit to an `.svg` is lost the next time anyone
runs it. Change the script and re-run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/generate-winter-crisis-references.ps1
```

The script draws the SVGs and rasterises them itself through `System.Drawing`, so it needs no
converter and no network. It writes to this directory, which it names at line 4.

Regeneration is byte-stable: the plates committed here reproduce with an identical hash, which is
how the move from the old repo-root location was verified. That property is worth keeping, because
it is what lets a reviewer trust the PNGs match the SVGs beside them rather than a stale render.

> ## ADDED 2026-08-01: two measurements about that byte-stability claim, and a mixture in this
> ## directory
>
> **The byte-stability held on Windows and on no other platform, and that is now fixed.**
> `Set-Content -Encoding UTF8` writes a BOM on Windows PowerShell 5.1 and no BOM on PowerShell 7,
> and appends the host's line terminator, so re-running the original script under pwsh 7 on Linux
> rewrote all six SVGs and this directory's `index.html`, differing in the BOM and the final
> terminator and in nothing else. The generator now writes those bytes explicitly, so the claim
> above is true everywhere; **verified by regenerating on Linux over the committed files, which come
> back byte-identical.**
>
> **The PNGs in this directory now come from two rasterisers, and the two disagree in one place.**
> `System.Drawing` is Windows-only from .NET 6, so plates 07 to 09 could not be rasterised through
> it and are **Chromium renders**. Plates 01 to 06 are the original `System.Drawing` renders and are
> untouched. The disagreement has one cause: SVG closes a `<polygon>`'s outline and
> `Graphics.DrawLines` does not, so **`05-fire-smoke-column.png` is an open zigzag ribbon and the
> same SVG in a browser is a closed leaf-shaped column.** `index.html` loads the SVG, so the
> contact sheet and the PNG show different smoke. The recommendation is to rasterise this whole pack
> through `tools/rasterise-crisis-references.mjs` and retire the `System.Drawing` path, which would
> make the PNGs agree with the SVGs; that is a change to these committed plates and was deliberately
> not made in the pass that added 07 to 09. See `../README.md` section 6.

## What these are not

Reference geometry for the crisis scene: light, ground, propagation and aftermath. **No building
here is a design.** The masses are stand-ins so the frost and the light have something to fall on,
and building design belongs to the era style guides and `City_Art_Bible.md`.
