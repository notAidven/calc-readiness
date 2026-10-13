# Era 4 Void-First Classical Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ten Era 4 concept-art briefs and canonical images with the approved void-first Hellenistic/Roman port-city set, while preserving every frozen product, footprint, height, palette, camera, and runtime contract.

**Architecture:** The approved design record is the source of truth. Reconcile the two Era 4 product guides first, derive one marked-up README prompt source from them, derive the ten-line JSONL mechanically from that README, and hold the chain with a repository-level prompt-contract guard whose population comes from the spec's canonical census in both directions. Generate and review only in `tmp/imagegen/era-04-void-first-*`, then replace the complete canonical directory as one rollback-safe directory swap after all ten candidates pass.

**Tech Stack:** Markdown, JSON Lines, TypeScript/Vitest repository guards, Python 3.11+ with Pillow 11.x for deterministic image inspection/contact sheets, SHA-256 manifests, and Cursor's built-in image generator.

## Global Constraints

- The authority order is exactly: approved design record → Era 4 style guide → Era 4 civic guide → image-generation README → JSONL.
- Preserve every node ID, civic ID, display name, stable name, subtitle, mass, civic role, capacity contribution, price, acquisition rule, and skill/civic footprint.
- Preserve `INV-ERA-1`; every designed court, apron, lane, pool, or quay is authored geometry and the complete asset still fills 95% of its footprint span.
- Preserve the relative height order exactly: `classical_apartment_block`, `classical_baths`, `POL.3`, `town-hall`, `POL.1`/`POL.8` in one low workshop band, `classical_public_granary`, `POL.4`, `classical_fountain`, `POL.2`.
- `POL.1` may have marginally higher eaves than `POL.8`, but both remain in the same low workshop band; `POL.2` remains the shortest roofed Era 4 building; `classical_fountain` remains above `POL.2` and below `POL.4`.
- Preserve full 360° readability, every existing anti-rebus constraint, the finished `built` stage, body hue `#D2C8AA`, roof hue `#B4674A`, parchment ground `#ECE4D3`, the three-tone lighting convention, the approximately 49° tilt/45° azimuth camera, and current plot dimensions.
- Era 4 is void-first in plan and massing. Colour, glass, inscriptions, fine ornament, props, and labels may never be the only separator.
- Measure plan percentage top-down inside the frozen footprint, including authored ground, court, lane, pool and quay geometry.
- `Open-to-sky` means one continuous plan region with no roof, bridge, balcony or upper floor above it; an adjacent colonnade does not reduce that area.
- `Shallow roof` means eaves-to-crown/ridge rise no greater than 25% of the supporting wall height; `deep vault mouth` means visible reveal depth at least half the mouth width.
- `Broad hipped roof` means one roof covers more than half the plot and slopes on three or four sides.
- `Regular multi-storey façade` means at least three complete opening rows share bay centres across at least three-quarters of one elevation.
- `Narrow high-rise` means visible wall height exceeds the short façade width; only `classical_apartment_block` may satisfy it.
- Seven named plots must show a continuous functional open-to-sky region covering at least one-third of plan: `POL.1`, `POL.2`, `POL.8`, `town-hall`, `classical_public_granary`, `classical_baths`, and `classical_fountain`.
- Every exposed Era 4 support row is freestanding columns under a straight entablature. Every visible arch is a deep vault mouth, apse, niche, or aqueduct element, never a shallow decorative arcade screen.
- Era 4 has zero broad hipped roofs, exterior domes, drums, lanterns, cupolas, turrets, regular chimney rhythms, and uninterrupted regular three-storey façades.
- The JSONL has exactly ten non-empty lines, one per canonical output, no duplicate or directory-bearing `out`, and every row has exactly `out`, `size`, `quality`, `use_case`, and `prompt`, with `size: "1024x1024"`, `quality: "high"`, and `use_case: "stylized-concept"`.
- Every prompt asks for one finished low-poly isometric building, one view, one continuous plot, no label/comparison/variant sheet, and states positive form before prohibitions; every prohibition gives its legal alternative in the same sentence.
- Candidate generation and all review evidence live only under `tmp/imagegen/era-04-void-first-*`. Inside the canonical folder, never create a `-v2`, `-final`, `-new`, `copy`, backup, numbered alternative, second canonical folder, or mixed old/new set; temporary rejected rounds preserve exact canonical basenames inside evidence-only subdirectories.
- Use Cursor's built-in image generator. Do not use an API key, image-generation CLI, batch API, or local image model.
- The final blind-sort population is exactly 21 images: ten Era 4 and eleven Era 6, shuffled with seed `era04-era06-void-first-v1`; RGB and grayscale sheets use the identical order, whole-image 128×128 tiles, and no identifying label inside a tile.
- Two independent reviewers must each score 21/21 on both RGB and grayscale sheets before installation, then repeat 21/21 on both sheets rebuilt from installed canonical files.
- All six aggregate rules must pass: skyline, open-versus-enclosed, roof geometry, structural system, street wall, and blind sort.
- Runtime spatial verification remains exactly: **Runtime 1024×580 city-frame verification: NOT DONE — Era 4 and Era 6 per-node runtime art is not wired.**
- Do not wire runtime assets, change runtime placement/contain-fit logic, author `site` or `construction` stages, redesign another era, start a development server, or edit project coordination records.
- Generated-PNG tracking policy does not change. Do not stage or commit generated binaries without separate explicit authorization.
- Every commit step below is conditional on explicit execution-time commit authorization. This plan itself grants no commit authorization.
- Before any authorized commit, inspect `git diff --cached --name-only`; if the staged set contains any path outside that step's exact `git add` list, stop rather than including concurrent work.

---

## File and Responsibility Map

### Persistent files to modify or create

- Modify `docs/superpowers/specs/eras/era-04-classical/style-guide.md:64-278,282-376,493-747,1263-1357`
  - Owns the era-wide ancient structural grammar, the five skill-building forms, the hub form, frozen plots, anti-rebus rules, and complete relative height order.
  - Leave palette lines 892-949, construction-stage lines 953-983, advisor/lesson content, IDs, names, and nonvisual contracts unchanged.
- Modify `docs/superpowers/specs/eras/era-04-classical/civic-buildings.md:110-136,138-235`
  - Owns the four civic forms. Change only visual prose; preserve catalogue lines 51-108 and all economy/acquisition prose.
- Replace `output/imagegen/era-04-classical-building-briefs/README.md:1-1359`
  - Becomes the concise, authoritative image-generation handoff, with shared clauses and exactly ten marked canonical prompt bodies.
- Replace `output/imagegen/era-04-classical-building-briefs/era04-classical-concepts.jsonl:1-10`
  - Mechanical projection of the README's shared clauses and ten prompt bodies; exactly ten generation jobs.
- Create `test/era04VoidFirstPromptContract.test.ts`
  - Derives the canonical population from approved-design section 5, proves README/JSONL bidirectional equality, checks shared/per-building contracts, and contains four mutation tests that prove the guard fails.
- Replace together, only after acceptance, these ten canonical Era 4 images:
  - `output/imagegen/era-04-classical-building-briefs/pol-1-stonecutters-shop.png`
  - `output/imagegen/era-04-classical-building-briefs/pol-2-barracks.png`
  - `output/imagegen/era-04-classical-building-briefs/pol-3-customs-house.png`
  - `output/imagegen/era-04-classical-building-briefs/pol-4-wine-cellars.png`
  - `output/imagegen/era-04-classical-building-briefs/pol-8-surveyors-shop.png`
  - `output/imagegen/era-04-classical-building-briefs/townhall-classical-senate-house.png`
  - `output/imagegen/era-04-classical-building-briefs/civic-grain-dock.png`
  - `output/imagegen/era-04-classical-building-briefs/civic-cottages.png`
  - `output/imagegen/era-04-classical-building-briefs/civic-baths.png`
  - `output/imagegen/era-04-classical-building-briefs/civic-fountain.png`

### Temporary implementation/evidence files; never commit

- Create `tmp/imagegen/era-04-void-first-review/build_contact_sheets.py`
  - Validates the 10+11 population, dimensions, hashes, deterministic order, whole-image 128×128 tiles, and matching RGB/grayscale order.
- Create `tmp/imagegen/era-04-void-first-prompts/build.py`
  - Extracts the README's marked source blocks, builds the JSONL, and supports a nonwriting `--check`.
- Create `tmp/imagegen/era-04-void-first-review/validate_assets.py`
  - Validates candidate/canonical names, 1024×1024 dimensions, nonempty SHA-256 values, duplicate hashes, and baseline replacement.
- Create `tmp/imagegen/era-04-void-first-review/score_reviews.py`
  - Validates complete blind answer files and scores both reviewers without exposing the answer key.
- Create `tmp/imagegen/era-04-void-first-candidates/`
  - Holds one current candidate per canonical basename and selective replacement generations; never holds alternate filename suffixes.
- Create `tmp/imagegen/era-04-void-first-review/`
  - Holds baseline/candidate/installed sheets, manifests, sealed keys, reviewer answers, and the numbered report.
- Create `tmp/imagegen/era-04-void-first-install/`
  - Holds the complete staged canonical directory and, during the swap only, the all-ten rollback directory.

### Read-only references and comparison inputs

- `docs/superpowers/specs/2026-08-02-era-04-void-first-classical-design.md:98-158,162-287,291-517,521-569,573-620,624-712,716-796`
  - Approved scope/frozen contracts, shared grammar, ten-building census, collisions, canonical policy, acceptance, rollout, and redo/rollback.
- `test/eraPaletteLadder.test.ts:111-171,272-371,404-595`
  - Existing pattern for tree-derived populations, count floors, composition assertions, and bidirectional exceptions.
- `test/eraVisualDistinctness.test.ts:196-229,259-373,375-452`
  - Existing pattern for behavior-scoped populations, registry/folder bijection, floors, and shape assertions.
- `vitest.config.ts:76-82` and `test/support/repoRoot.ts:94-116`
  - The new root test is collected by the `repo-hygiene` project and resolves the checkout through the repository's portable helper.
- `biome.json:7-14`
  - `output/**` is excluded, so Biome can validate the new TypeScript guard but cannot certify README/JSONL content.
- `tmp/imagegen/era06_build.py:343-366,723-830`
  - Existing prompt assembly, exact-key validation, duplicate-output check, contradiction scan, and nonzero failure exit.
- `tmp/imagegen/era-04-pilot/sheets.py:13-28,47-80`
  - Existing Era 4 basename order and Pillow contact-sheet pattern; reference only.
- `tmp/imagegen/era-04-regen/contact_sheet.py:21-32,53-82`
  - Existing all-ten comparison pattern; reference only.
- `output/imagegen/era-06-early-modern-building-briefs/era06-early-modern-concepts.jsonl:1-11`
  - Canonical Era 6 comparison census. Do not edit it.
- Eleven read-only Era 6 PNGs, in JSONL order:
  - `geo-1-observatory.png`
  - `pol-7-lecture-theatre.png`
  - `geo-2-drawing-office.png`
  - `pol-6-printing-house.png`
  - `cg-1-mapmakers-house.png`
  - `rat-5-cannon-tower.png`
  - `townhall-early-modern-city-hall.png`
  - `civic-covered-market.png`
  - `civic-merchant-houses.png`
  - `civic-town-square.png`
  - `civic-painters-school.png`

No existing `*imagegen*.test.*` file covers this contract; the new root guard is the
first automated prompt-census boundary and follows the repository-hygiene patterns above.

## Task 1: Freeze Baseline Evidence and Add the Red Prompt Guard

**Files:**
- Create: `tmp/imagegen/era-04-void-first-review/build_contact_sheets.py`
- Create: baseline evidence under `tmp/imagegen/era-04-void-first-review/`
- Create: `test/era04VoidFirstPromptContract.test.ts`
- Read: approved spec, current README/JSONL, ten current Era 4 PNGs, eleven Era 6 PNGs

**Interfaces:**
- Consumes: the two canonical JSONL files and their image folders.
- Produces: deterministic sheet builder CLI and `validatePromptContract(specSource, readmeSource, jsonlSource): string[]`.

- [ ] **Step 1: Create only the approved temporary roots**

Run:

```bash
mkdir -p tmp/imagegen/era-04-void-first-review \
  tmp/imagegen/era-04-void-first-candidates \
  tmp/imagegen/era-04-void-first-prompts \
  tmp/imagegen/era-04-void-first-install
```

Expected: exit 0; no path under the canonical image folder is changed.

- [ ] **Step 2: Add the deterministic whole-population sheet builder**

Create `tmp/imagegen/era-04-void-first-review/build_contact_sheets.py` with:

```python
#!/usr/bin/env python3
"""Build deterministic unlabeled Era 4/Era 6 review sheets."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[3]
ERA4_JSONL = ROOT / (
    "output/imagegen/era-04-classical-building-briefs/"
    "era04-classical-concepts.jsonl"
)
ERA6_DIR = ROOT / "output/imagegen/era-06-early-modern-building-briefs"
ERA6_JSONL = ERA6_DIR / "era06-early-modern-concepts.jsonl"
SEED = "era04-era06-void-first-v1"
TILE = 128
LABEL_HEIGHT = 20
GAP = 12
COLS = 7
BACKGROUND = (236, 228, 211)
INK = (43, 39, 34)


def read_outs(path: Path) -> list[str]:
    rows = [
        json.loads(line)
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    outs = [row["out"] for row in rows]
    if len(outs) != len(set(outs)):
        raise ValueError(f"{path}: duplicate out values")
    return outs


def sha256(path: Path) -> str:
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if not digest or set(digest) == {"0"}:
        raise ValueError(f"{path}: empty SHA-256")
    return digest


def font() -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in (
        Path("/System/Library/Fonts/Supplemental/Arial.ttf"),
        Path("/System/Library/Fonts/Helvetica.ttc"),
    ):
        if path.exists():
            return ImageFont.truetype(path, 13)
    return ImageFont.load_default()


def contained_rgb(path: Path) -> Image.Image:
    with Image.open(path) as source:
        if source.size != (1024, 1024):
            raise ValueError(f"{path}: expected 1024x1024, got {source.size}")
        image = source.convert("RGB")
    fitted = ImageOps.contain(image, (TILE, TILE), Image.Resampling.LANCZOS)
    tile = Image.new("RGB", (TILE, TILE), BACKGROUND)
    tile.paste(fitted, ((TILE - fitted.width) // 2, (TILE - fitted.height) // 2))
    return tile


def population(era4_dir: Path) -> list[dict[str, object]]:
    era4_outs = read_outs(ERA4_JSONL)
    era6_outs = read_outs(ERA6_JSONL)
    if len(era4_outs) != 10 or len(era6_outs) != 11:
        raise ValueError(
            f"expected Era 4=10 and Era 6=11, got {len(era4_outs)} and {len(era6_outs)}"
        )
    entries: list[dict[str, object]] = []
    for era, directory, names in (
        ("Era 4", era4_dir, era4_outs),
        ("Era 6", ERA6_DIR, era6_outs),
    ):
        for name in names:
            path = directory / name
            if not path.is_file():
                raise FileNotFoundError(path)
            with Image.open(path) as image:
                size = list(image.size)
            entries.append(
                {
                    "era": era,
                    "filename": name,
                    "path": path,
                    "sha256": sha256(path),
                    "size": size,
                }
            )
    if len(entries) != 21:
        raise ValueError(f"expected 21 images, got {len(entries)}")
    seed_int = int.from_bytes(hashlib.sha256(SEED.encode("utf-8")).digest(), "big")
    ordered = sorted(entries, key=lambda row: f"{row['era']}/{row['filename']}")
    random.Random(seed_int).shuffle(ordered)
    return ordered


def build_sheet(
    entries: list[dict[str, object]],
    grayscale: bool,
) -> Image.Image:
    rows = math.ceil(len(entries) / COLS)
    cell_height = LABEL_HEIGHT + TILE
    width = GAP + COLS * (TILE + GAP)
    height = GAP + rows * (cell_height + GAP)
    sheet = Image.new("RGB", (width, height), BACKGROUND)
    draw = ImageDraw.Draw(sheet)
    label_font = font()
    for index, entry in enumerate(entries, start=1):
        row, col = divmod(index - 1, COLS)
        x = GAP + col * (TILE + GAP)
        y = GAP + row * (cell_height + GAP)
        draw.text((x + TILE // 2, y + LABEL_HEIGHT // 2), str(index), fill=INK,
                  font=label_font, anchor="mm")
        tile = contained_rgb(entry["path"])
        if grayscale:
            tile = ImageOps.grayscale(tile).convert("RGB")
        sheet.paste(tile, (x, y + LABEL_HEIGHT))
    return sheet


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--era4-dir", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, required=True)
    parser.add_argument("--prefix", required=True)
    args = parser.parse_args()

    era4_dir = args.era4_dir.resolve()
    out_dir = args.out_dir.resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    entries = population(era4_dir)

    rgb_path = out_dir / f"{args.prefix}-rgb.png"
    gray_path = out_dir / f"{args.prefix}-grayscale.png"
    key_path = out_dir / f"{args.prefix}-answer-key.json"
    manifest_path = out_dir / f"{args.prefix}-sources.json"
    era4_hash_path = out_dir / f"{args.prefix}-era04-sha256.txt"
    era4_sheet_path = out_dir / f"{args.prefix}-era04-contact-sheet.png"

    build_sheet(entries, grayscale=False).save(rgb_path)
    build_sheet(entries, grayscale=True).save(gray_path)
    build_sheet(
        [entry for entry in entries if entry["era"] == "Era 4"],
        grayscale=False,
    ).save(era4_sheet_path)
    key = [
        {
            "tile": index,
            "era": entry["era"],
            "filename": entry["filename"],
        }
        for index, entry in enumerate(entries, start=1)
    ]
    key_path.write_text(json.dumps(key, indent=2) + "\n", encoding="utf-8")
    serializable = [
        {key: value for key, value in entry.items() if key != "path"}
        for entry in entries
    ]
    manifest_path.write_text(
        json.dumps(serializable, indent=2) + "\n",
        encoding="utf-8",
    )
    era4_lines = sorted(
        f"{entry['sha256']}  {entry['filename']}"
        for entry in entries
        if entry["era"] == "Era 4"
    )
    era4_hash_path.write_text("\n".join(era4_lines) + "\n", encoding="utf-8")

    print(f"population: 21 (Era 4=10, Era 6=11)")
    print(f"seed: {SEED}; tile: {TILE}x{TILE}; order: identical")
    print(f"wrote {rgb_path}")
    print(f"wrote {gray_path}")
    print(f"wrote {key_path}")
    print(f"wrote {manifest_path}")
    print(f"wrote {era4_hash_path}")
    print(f"wrote {era4_sheet_path}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Capture the current baseline before changing any guide, prompt, or image**

Run:

```bash
python3 tmp/imagegen/era-04-void-first-review/build_contact_sheets.py \
  --era4-dir output/imagegen/era-04-classical-building-briefs \
  --out-dir tmp/imagegen/era-04-void-first-review \
  --prefix baseline
```

Expected:

```text
population: 21 (Era 4=10, Era 6=11)
seed: era04-era06-void-first-v1; tile: 128x128; order: identical
wrote .../baseline-rgb.png
wrote .../baseline-grayscale.png
wrote .../baseline-answer-key.json
wrote .../baseline-sources.json
wrote .../baseline-era04-sha256.txt
wrote .../baseline-era04-contact-sheet.png
```

Open and inspect both uncropped 21-image baseline sheets and the Era 4-only baseline
contact sheet. Confirm the two mixed sheets contain 21 tiles in identical number order,
the Era 4-only sheet preserves all ten current concepts, and the manifest contains
exactly ten Era 4 hashes and eleven Era 6 hashes. This is baseline evidence, not
acceptance evidence.

- [ ] **Step 4: Add the behavior-scoped prompt-contract guard**

Create `test/era04VoidFirstPromptContract.test.ts` with:

```typescript
import { basename, join } from "node:path";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { resolveRepoRoot } from "./support/repoRoot";

/**
 * The guarded behavior is "one generation job exists for every approved canonical
 * Era 4 concept output." The population therefore comes from design section 5, not
 * from whichever JSONL rows or PNG files happen to exist. README, JSONL and the
 * per-output rule map are each checked against that source in both directions, with
 * a ten-member floor and an explicit 5 skill + 1 hub + 4 civic composition check.
 */
const ROOT = resolveRepoRoot();
const SPEC_PATH =
  "docs/superpowers/specs/2026-08-02-era-04-void-first-classical-design.md";
const README_PATH = "output/imagegen/era-04-classical-building-briefs/README.md";
const JSONL_PATH =
  "output/imagegen/era-04-classical-building-briefs/era04-classical-concepts.jsonl";
const MIN_CANONICAL_OUTPUTS = 10;

interface CensusEntry {
  readonly order: number;
  readonly id: string;
  readonly out: string;
}

interface PromptRow {
  readonly out: string;
  readonly size: string;
  readonly quality: string;
  readonly use_case: string;
  readonly prompt: string;
}

interface ReadmePrompt {
  readonly order: number;
  readonly out: string;
  readonly body: string;
}

const REQUIRED_KEYS = ["out", "prompt", "quality", "size", "use_case"] as const;

const SHARED_POSITIVE = [
  "One finished low-poly isometric building, one view, one continuous plot, no labels, no comparison panel, and no variant sheet.",
  "Use the locked three-quarter overhead camera at approximately 49° tilt and 45° azimuth, show the whole plot, and preserve the named plot dimensions.",
  "The building plus its authored court, apron, lane, pool, or quay fills 95% of the footprint span.",
  "Read the silhouette, plan, roof, structural system, and 128 px thumbnail detail before material or props.",
  "Freestanding columns carry straight entablatures, while every arch is a deep structural vault mouth, apse, niche, or aqueduct element.",
] as const;

const SHARED_RENDERING = [
  "Pale ashlar or stucco and terracotta tile are secondary identifiers; the massing must remain legible in grayscale.",
  "Render the finished built stage in matte pale ashlar or stucco #D2C8AA, terracotta roof tile #B4674A where the named roof exists, and flat parchment ground #ECE4D3.",
  "Use three flat tone steps per surface under one key direction, with no gradient, and author a legible rear, both ends, and both long sides for the full 360-degree orbit.",
] as const;

const SHARED_PROHIBITIONS = [
  "Do not use a broad hipped palazzo roof; use only the building's named narrow bar, lean-to, split ridge, vault jacket, or no roof.",
  "Do not use a rusticated ground-storey band, applied pilaster grid, deep bracketed palazzo cornice, or regular glazed window grid; use pale load-bearing ancient masonry, unglazed voids, shutters, grilles, freestanding columns, and thick vaults instead.",
  "Do not use an exterior dome, drum, lantern, cupola, turret, or regular chimney rhythm; make monumentality with width, vault mass, open courts, and the one irregular dwelling stack instead.",
  "Do not use exposed Medieval timber framing, pointed arches, buttresses, jetties, steep roofs, spires, machine-made units, structural iron, sawtooth roofs, industrial chimneys, or soot; use dressed masonry, shallow ancient roofs, hand-built timber roof structures, and clean three-tone surfaces instead.",
  "Do not use legible or pseudo-legible text, numerals, glyphs, mathematical diagrams, or lesson rebuses; use unmarked architectural form and irregular non-diagrammatic props instead.",
] as const;

const FORBIDDEN_SHARED_CLAUSE = "Do not use freestanding columns.";
const BROAD_HIP_DOME_REGRESSION =
  "Use one broad hipped roof and an exterior dome to crown the plot.";

const REQUIRED_BY_OUTPUT: Readonly<Record<string, readonly string[]>> = {
  "pol-1-stonecutters-shop.png": [
    "Rear roofed strip: 33% of the plot; continuous front work court: 67% open to sky.",
    "One shallow terracotta shed roof slopes from the rear wall to the straight front entablature; no ridge crosses the plot.",
    "Thumbnail read: the open work court is larger than the roofed strip and work crosses the column line.",
    "Keep the open stoa workshop instead of a full-depth box, arch arcade, hip roof, pilaster façade, temple cella, fire, or rectangular block array.",
  ],
  "pol-2-barracks.png": [
    "Cell range and veranda: 45% of the long plot; bare drill strip: 55% open to sky.",
    "One low terracotta gable covers only the one-room-deep cell bar and ends at one terminal officers' room.",
    "Thumbnail read: one line of square-headed doors faces a drill strip wider than the cells and veranda.",
    "Keep the single low contubernia bar instead of a round arcade, second storey, second cell row, returning wing, paved drill grid, gate tower, parapet, crenellation, or pediment.",
  ],
  "pol-3-customs-house.png": [
    "A raised narrow nave runs to one half-round apse, with both lower open aisles exposed and a shallow entrance forecourt.",
    "The roof is one narrow nave pitch, two lower aisle lean-tos, and one half-conical apse roof.",
    "Thumbnail read: clerestory stripe, both lower open aisles, and terminal apse survive together.",
    "Keep the broad axial open forum basilica instead of a palace façade, dome, drum, lantern, rusticated storey, regular glazing, palazzo cornice, tall closed entrance wall, or blank rear.",
  ],
  "pol-4-wine-cellars.png": [
    "Four adjacent half-sunken storage chambers occupy 70% of the long plot; the loading lane occupies 30%.",
    "Terracotta follows the four barrel-vault crowns independently, with no continuous gable, hip, or ridge.",
    "Thumbnail read: the oblique view exposes vault depth and thick cross-walls, with a reveal at least half the mouth width.",
    "Keep four deep load-bearing cellae instead of a thin arcade, freestanding arcade piers, upper storey, continuous pitched cap, window grid, open goods display, four-sided bay arrangement, or isolated fifth bay.",
  ],
  "pol-8-surveyors-shop.png": [
    "L-shaped rooms and portico occupy at most 45% of the plot; the setting-out court occupies at least 55% open to sky.",
    "Two shallow terracotta lean-tos meet at the L's internal corner and never span the court.",
    "Thumbnail read: the L and its two street-open court sides remain clear without a groma or any prop.",
    "Keep the open groma court instead of a compact square block, hip roof, applied pilasters, regular windows, rusticated base, deep cornice, bilateral symmetry, coordinate axes, quadrants, tick marks, or regular paving grid.",
  ],
  "townhall-classical-senate-house.png": [
    "The rear Curia occupies 35% of the plot; the curved stepped Comitium apron occupies 65% open to sky.",
    "One shallow terracotta gable covers only the rear hall, and the entrance porch is no deeper than one bay.",
    "Thumbnail read: the curved step bank and central visible hearth form one civic composition.",
    "Keep the rear Curia and open assembly apron instead of a four-sided peristyle, rectangular piazza, fountain, statue, cupola, tower, multi-storey palazzo front, rusticated base, chimney rhythm, or roofed centre.",
  ],
  "civic-grain-dock.png": [
    "Two parallel storage bars each occupy 30% of the plot; the street-to-quay loading lane occupies 40% open to sky.",
    "Two independent low terracotta gables leave a full-width strip of open sky between them.",
    "Thumbnail read: daylight crosses the central lane and both vent bands remain visible below the raised floors.",
    "Keep the twin-bar horreum and quay lane instead of a monolithic block, hip roof, upper storey, decorative arcade, regular window grid, deep cornice, open gap beneath the whole floor, or single broad façade.",
  ],
  "civic-cottages.png": [
    "Two unequal three- and four-storey wings are split by an open stair and lightwell notch.",
    "Two offset low-pitched terracotta roofs end at unequal elevations and never close the strip with one cornice.",
    "Thumbnail read: open sky cuts through the mass and the wings end at visibly different heights.",
    "Keep the irregular notched insula instead of a symmetric façade grid, level palazzo cornice, rusticated ground band, hip roof, sealed slab, central carriage arch, dome, or repeated identical balconies.",
  ],
  "civic-baths.png": [
    "Three transverse frigidarium vault bays occupy the rear half; the open palaestra and natatio occupy at least 40% of the plot.",
    "Three tile-jacketed transverse vault crowns and low service lean-tos form the roof, with no hemispherical exterior roof.",
    "Thumbnail read: three transverse vault shoulders and the large open pool and exercise court survive together.",
    "Keep the axial thermae campus instead of any exterior dome, drum, lantern, single long barrel roof, Renaissance loggia screen, palace façade, broad hip, regular window grid, or chimney stack.",
  ],
  "civic-fountain.png": [
    "The solid three-niche water wall and attached trough occupy 25% of the plot; the public apron occupies 75% open to sky.",
    "The asset has no roof, and the water-wall top sits above the Barracks ridge and below the Wine Cellars vault crowns.",
    "Thumbnail read: channel, wall, three outlets, trough, and overflow form one continuous water path.",
    "Keep the aqueduct-terminal water wall instead of a freestanding tiered basin, statue, loggia, radial or geometric piazza paving, roof, windlass, floating pipe, or tree-carried height.",
  ],
};

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function canonicalCensus(source: string): CensusEntry[] {
  const start = source.indexOf("## 5. Canonical per-building redesign");
  const end = source.indexOf("\n---\n\n## 6. Collision checks", start);
  if (start < 0 || end < 0) {
    throw new Error(`${SPEC_PATH}: canonical section boundaries not found`);
  }
  const section = `${source.slice(start, end)}\n### 5.999 END`;
  const blocks = [
    ...section.matchAll(
      /^### 5\.(\d+) `([^`]+)`[^\n]*\n([\s\S]*?)(?=^### 5\.\d+)/gm,
    ),
  ];
  return blocks.map((match) => {
    const out = match[3]?.match(/canonical output `([^`]+\.png)`/)?.[1];
    if (!out) {
      throw new Error(`${SPEC_PATH}: ${match[2]} has no canonical output`);
    }
    return { order: Number(match[1]), id: match[2] as string, out };
  });
}

function markedText(source: string, name: string): string {
  const startMarker = `<!-- ${name}:start -->`;
  const endMarker = `<!-- ${name}:end -->`;
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) {
    throw new Error(`${README_PATH}: missing ${name} markers`);
  }
  const block = source.slice(start + startMarker.length, end);
  const fenced = block.match(/```text\n([\s\S]*?)\n```/);
  if (!fenced?.[1]) {
    throw new Error(`${README_PATH}: ${name} has no text fence`);
  }
  return normalize(fenced[1]);
}

function readmePrompts(source: string): {
  readonly sharedPositive: string;
  readonly sharedRendering: string;
  readonly sharedProhibitions: string;
  readonly prompts: readonly ReadmePrompt[];
} {
  const start = source.indexOf("## Canonical prompt census");
  const end = source.indexOf("\n## Built-in image-generator handoff", start);
  if (start < 0 || end < 0) {
    throw new Error(`${README_PATH}: canonical prompt census boundaries not found`);
  }
  const section = source.slice(start, end);
  const prompts = [
    ...section.matchAll(
      /^### (\d+)\. `([^`]+\.png)`\n\n```text\n([\s\S]*?)\n```/gm,
    ),
  ].map((match) => ({
    order: Number(match[1]),
    out: match[2] as string,
    body: normalize(match[3] as string),
  }));
  return {
    sharedPositive: markedText(source, "shared-positive"),
    sharedRendering: markedText(source, "shared-rendering"),
    sharedProhibitions: markedText(source, "shared-prohibitions"),
    prompts,
  };
}

function parseJsonl(source: string): PromptRow[] {
  return source
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line, index) => {
      try {
        return JSON.parse(line) as PromptRow;
      } catch (error) {
        throw new Error(`${JSONL_PATH}:${index + 1}: ${String(error)}`);
      }
    });
}

function sorted(values: Iterable<string>): string[] {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function validatePromptContract(
  specSource: string,
  readmeSource: string,
  jsonlSource: string,
): string[] {
  const errors: string[] = [];
  let census: CensusEntry[];
  let sourcePrompts: ReturnType<typeof readmePrompts>;
  let rows: PromptRow[];
  try {
    census = canonicalCensus(specSource);
    sourcePrompts = readmePrompts(readmeSource);
    rows = parseJsonl(jsonlSource);
  } catch (error) {
    return [String(error)];
  }

  const canonicalOuts = census.map((entry) => entry.out);
  const canonicalSet = new Set(canonicalOuts);
  const readmeOuts = sourcePrompts.prompts.map((entry) => entry.out);
  const jsonOuts = rows.map((row) => row.out);
  const ruleOuts = Object.keys(REQUIRED_BY_OUTPUT);

  if (census.length < MIN_CANONICAL_OUTPUTS) {
    errors.push(`canonical census floor: ${census.length} < ${MIN_CANONICAL_OUTPUTS}`);
  }
  if (census.length !== 10) errors.push(`canonical census: expected 10, got ${census.length}`);
  if (new Set(census.map((entry) => entry.id)).size !== census.length) {
    errors.push("canonical census: duplicate ids");
  }
  if (canonicalSet.size !== census.length) {
    errors.push("canonical census: duplicate outputs");
  }
  const skills = census.filter((entry) => entry.id.startsWith("POL."));
  const hubs = census.filter((entry) => entry.id === "town-hall");
  const civics = census.filter((entry) => entry.id.startsWith("classical_"));
  if (skills.length !== 5 || hubs.length !== 1 || civics.length !== 4) {
    errors.push(
      `canonical composition: skill=${skills.length}, hub=${hubs.length}, civic=${civics.length}`,
    );
  }
  if (census.map((entry) => entry.order).join(",") !== "1,2,3,4,5,6,7,8,9,10") {
    errors.push("canonical composition: section 5 order is not 1 through 10");
  }

  for (const [label, actual] of [
    ["README", readmeOuts],
    ["JSONL", jsonOuts],
    ["rule map", ruleOuts],
  ] as const) {
    const missing = canonicalOuts.filter((out) => !actual.includes(out));
    const extra = actual.filter((out) => !canonicalSet.has(out));
    if (missing.length > 0) errors.push(`${label}: missing canonical outputs: ${missing.join(", ")}`);
    if (extra.length > 0) errors.push(`${label}: extra outputs: ${extra.join(", ")}`);
  }
  if (sorted(readmeOuts).join("\n") !== sorted(canonicalOuts).join("\n")) {
    errors.push("README and canonical census differ bidirectionally");
  }
  if (readmeOuts.join("\n") !== canonicalOuts.join("\n")) {
    errors.push("README prompt order differs from approved section 5");
  }
  if (sorted(jsonOuts).join("\n") !== sorted(canonicalOuts).join("\n")) {
    errors.push("JSONL and canonical census differ bidirectionally");
  }
  if (jsonOuts.join("\n") !== canonicalOuts.join("\n")) {
    errors.push("JSONL prompt order differs from approved section 5");
  }
  if (sorted(ruleOuts).join("\n") !== sorted(canonicalOuts).join("\n")) {
    errors.push("per-output rules and canonical census differ bidirectionally");
  }
  if (rows.length !== 10) errors.push(`JSONL: expected 10 rows, got ${rows.length}`);
  if (new Set(jsonOuts).size !== jsonOuts.length) errors.push("JSONL: duplicate out values");

  const readmeByOut = new Map(sourcePrompts.prompts.map((entry) => [entry.out, entry]));
  for (const row of rows) {
    const keys = Object.keys(row).sort();
    if (keys.join("\n") !== [...REQUIRED_KEYS].sort().join("\n")) {
      errors.push(`${row.out}: keys are ${keys.join(", ")}`);
    }
    if (row.size !== "1024x1024") errors.push(`${row.out}: size is ${row.size}`);
    if (row.quality !== "high") errors.push(`${row.out}: quality is ${row.quality}`);
    if (row.use_case !== "stylized-concept") {
      errors.push(`${row.out}: use_case is ${row.use_case}`);
    }
    if (basename(row.out) !== row.out || row.out.includes("/") || row.out.includes("\\")) {
      errors.push(`${row.out}: out must be a canonical basename`);
    }

    const readmePrompt = readmeByOut.get(row.out);
    if (readmePrompt) {
      const expected = normalize(
        `${sourcePrompts.sharedPositive} ${readmePrompt.body} ` +
          `${sourcePrompts.sharedRendering} ${sourcePrompts.sharedProhibitions}`,
      );
      if (normalize(row.prompt) !== expected) {
        errors.push(`${row.out}: JSONL prompt does not derive exactly from README`);
      }
    }

    for (const clause of SHARED_POSITIVE) {
      if (!row.prompt.includes(clause)) {
        errors.push(`${row.out}: missing shared positive clause: ${clause}`);
      }
    }
    for (const clause of SHARED_RENDERING) {
      if (!row.prompt.includes(clause)) {
        errors.push(`${row.out}: missing shared rendering clause: ${clause}`);
      }
    }
    for (const clause of SHARED_PROHIBITIONS) {
      if (!row.prompt.includes(clause)) {
        errors.push(`${row.out}: missing shared prohibition: ${clause}`);
      }
    }
    const lastPositive = Math.max(
      ...[...SHARED_POSITIVE, ...SHARED_RENDERING].map((clause) =>
        row.prompt.indexOf(clause),
      ),
    );
    const firstProhibition = Math.min(
      ...SHARED_PROHIBITIONS.map((clause) => row.prompt.indexOf(clause)),
    );
    if (lastPositive < 0 || firstProhibition < 0 || lastPositive > firstProhibition) {
      errors.push(`${row.out}: positive shared form must precede shared prohibitions`);
    }
    for (const required of REQUIRED_BY_OUTPUT[row.out] ?? []) {
      if (!row.prompt.includes(required)) {
        errors.push(`${row.out}: missing per-building contract: ${required}`);
      }
    }
    const prohibitionSentences = normalize(row.prompt)
      .split(/(?<=[.!?])\s+/)
      .filter((sentence) => /^(?:Do not|Never|No )\b/.test(sentence));
    for (const sentence of prohibitionSentences) {
      if (!/;[^.]*\b(?:use|make|keep)\b/i.test(sentence)) {
        errors.push(
          `${row.out}: prohibition does not name its legal alternative: ${sentence}`,
        );
      }
    }
    if (/\buse\b[^.]{0,100}\bbroad hipped roof\b/i.test(row.prompt)) {
      errors.push(`${row.out}: positively authorizes a broad hipped roof`);
    }
    if (/\buse\b[^.]{0,100}\bexterior dome\b/i.test(row.prompt)) {
      errors.push(`${row.out}: positively authorizes an exterior dome`);
    }
  }

  const forbiddenSharedCount = rows.filter((row) =>
    row.prompt.includes(FORBIDDEN_SHARED_CLAUSE),
  ).length;
  if (forbiddenSharedCount === rows.length && rows.length > 0) {
    errors.push(`forbidden shared clause: ${FORBIDDEN_SHARED_CLAUSE}`);
  } else if (forbiddenSharedCount > 0) {
    errors.push(
      `forbidden clause appears in ${forbiddenSharedCount} prompts: ${FORBIDDEN_SHARED_CLAUSE}`,
    );
  }
  return errors;
}

function encodeRows(rows: readonly PromptRow[]): string {
  return `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`;
}

function validMutationFixture(): {
  readonly readme: string;
  readonly rows: readonly PromptRow[];
} {
  const census = canonicalCensus(specSource);
  const sharedPositive = SHARED_POSITIVE.join(" ");
  const sharedRendering = SHARED_RENDERING.join(" ");
  const sharedProhibitions = SHARED_PROHIBITIONS.join(" ");
  const promptBlocks = census
    .map((entry) => {
      const body = (REQUIRED_BY_OUTPUT[entry.out] ?? []).join(" ");
      return `### ${entry.order}. \`${entry.out}\`\n\n\`\`\`text\n${body}\n\`\`\``;
    })
    .join("\n\n");
  const readme = [
    "# Valid mutation fixture",
    "",
    "<!-- shared-positive:start -->",
    "```text",
    sharedPositive,
    "```",
    "<!-- shared-positive:end -->",
    "",
    "## Canonical prompt census",
    "",
    promptBlocks,
    "",
    "<!-- shared-rendering:start -->",
    "```text",
    sharedRendering,
    "```",
    "<!-- shared-rendering:end -->",
    "",
    "<!-- shared-prohibitions:start -->",
    "```text",
    sharedProhibitions,
    "```",
    "<!-- shared-prohibitions:end -->",
    "",
    "## Built-in image-generator handoff",
  ].join("\n");
  const rows = census.map((entry) => {
    const body = (REQUIRED_BY_OUTPUT[entry.out] ?? []).join(" ");
    return {
      out: entry.out,
      size: "1024x1024",
      quality: "high",
      use_case: "stylized-concept",
      prompt: `${sharedPositive} ${body} ${sharedRendering} ${sharedProhibitions}`,
    };
  });
  expect(validatePromptContract(specSource, readme, encodeRows(rows))).toEqual([]);
  return { readme, rows };
}

const specSource = readFileSync(join(ROOT, SPEC_PATH), "utf8");
const readmeSource = readFileSync(join(ROOT, README_PATH), "utf8");
const jsonlSource = readFileSync(join(ROOT, JSONL_PATH), "utf8");

describe("Era 4 void-first prompt contract", () => {
  it("derives a ten-building 5+1+4 population from approved section 5", () => {
    const census = canonicalCensus(specSource);
    expect(census.length).toBeGreaterThanOrEqual(MIN_CANONICAL_OUTPUTS);
    expect(census).toHaveLength(10);
    expect(census.filter((entry) => entry.id.startsWith("POL."))).toHaveLength(5);
    expect(census.filter((entry) => entry.id === "town-hall")).toHaveLength(1);
    expect(census.filter((entry) => entry.id.startsWith("classical_"))).toHaveLength(4);
  });

  it("keeps README and JSONL exactly on the approved bidirectional contract", () => {
    expect(validatePromptContract(specSource, readmeSource, jsonlSource)).toEqual([]);
  });

  it("fails if one canonical building disappears", () => {
    const fixture = validMutationFixture();
    const errors = validatePromptContract(
      specSource,
      fixture.readme,
      encodeRows(fixture.rows.slice(0, -1)),
    );
    expect(errors.some((error) => error.includes("missing canonical outputs"))).toBe(true);
  });

  it("fails if two jobs write the same canonical output", () => {
    const fixture = validMutationFixture();
    const duplicate = fixture.rows.map((row, index) =>
      index === fixture.rows.length - 1
        ? { ...row, out: fixture.rows[0]?.out as string }
        : row,
    );
    const errors = validatePromptContract(specSource, fixture.readme, encodeRows(duplicate));
    expect(errors).toContain("JSONL: duplicate out values");
  });

  it("fails if a forbidden clause enters the shared grammar", () => {
    const fixture = validMutationFixture();
    const changedReadme = fixture.readme.replace(
      "\n```\n<!-- shared-positive:end -->",
      ` ${FORBIDDEN_SHARED_CLAUSE}\n\`\`\`\n<!-- shared-positive:end -->`,
    );
    const rows = fixture.rows.map((row) => ({
      ...row,
      prompt: `${row.prompt} ${FORBIDDEN_SHARED_CLAUSE}`,
    }));
    const errors = validatePromptContract(specSource, changedReadme, encodeRows(rows));
    expect(errors).toContain(`forbidden shared clause: ${FORBIDDEN_SHARED_CLAUSE}`);
    expect(
      errors.some((error) => error.includes("does not name its legal alternative")),
    ).toBe(true);
  });

  it("fails a broad-hip and exterior-dome regression", () => {
    const fixture = validMutationFixture();
    const firstOut = canonicalCensus(specSource)[0]?.out as string;
    const insertionPoint = REQUIRED_BY_OUTPUT[firstOut]?.[0] as string;
    const changedReadme = fixture.readme.replace(
      insertionPoint,
      `${insertionPoint} ${BROAD_HIP_DOME_REGRESSION}`,
    );
    const rows = fixture.rows.map((row) =>
      row.out === firstOut
        ? { ...row, prompt: `${row.prompt} ${BROAD_HIP_DOME_REGRESSION}` }
        : row,
    );
    const errors = validatePromptContract(specSource, changedReadme, encodeRows(rows));
    expect(errors.some((error) => error.includes("broad hipped roof"))).toBe(true);
    expect(errors.some((error) => error.includes("exterior dome"))).toBe(true);
  });
});
```

- [ ] **Step 5: Run the new guard and preserve the expected red**

Run:

```bash
npx vitest run test/era04VoidFirstPromptContract.test.ts
```

Expected: one test file fails; the section-5 census and four mutation tests pass, while `keeps README and JSONL exactly on the approved bidirectional contract` fails because the current README has no marked shared blocks/census and the current JSONL carries the superseded wall-first prompts. If the live-contract test passes before any prompt rewrite, stop: the guard is not measuring the intended behavior.

- [ ] **Step 6: Review the baseline and red guard as one gate**

Evidence required:

1. `baseline-era04-sha256.txt` has ten distinct lines.
2. `baseline-sources.json` has 21 entries with `size: [1024, 1024]`.
3. RGB and grayscale baseline sheets visibly use the same numbered order.
4. Removing a JSONL row, duplicating an `out`, adding the forbidden shared clause, and authorizing the broad hip/exterior dome all fail in their named tests.

Do not commit this intentional-red state. The guard and rewritten JSONL are committed together after Task 5 is green.

## Task 2: Reconcile the Era 4 Style Guide

**Files:**
- Modify: `docs/superpowers/specs/eras/era-04-classical/style-guide.md:64-278,282-376,493-747,1263-1357`
- Read: approved spec sections 2-6
- Test: `test/era04VoidFirstPromptContract.test.ts` remains intentionally red until Task 5

**Interfaces:**
- Consumes: frozen IDs, plots, palette, camera, anti-rebus rules, and height order from the approved spec.
- Produces: the upstream skill/hub visual contract from which the README may derive.

- [ ] **Step 1: Add a superseding live-direction banner after the scope line**

Insert after current line 9:

```markdown
> ## ⚑ AMENDED 2026-08-02 — VOID-FIRST CLASSICAL ARCHITECTURE IS THE LIVE DIRECTION
>
> The approved direction is a Roman Mediterranean port city with a Hellenistic
> public-space inheritance. Open courts, quays, stoas, freestanding colonnades and deep
> structural vaults carry the plots; narrow bars, lean-tos, split ridges and vault
> jackets carry the roofs. The change is massing and plan, not palette.
>
> Every ID, mass, plot, name, subtitle, price, contribution, acquisition rule, camera,
> three-tone material treatment and relative-height position below remains frozen. Where
> older live prose describes a compact hipped box, a thin arcade screen, a four-sided
> peristyle hub or an exterior bath dome, the canonical forms in §5 and in
> `../../2026-08-02-era-04-void-first-classical-design.md` supersede that prose.
```

- [ ] **Step 2: Replace §1's live era sentence and signature-move prose**

Use this exact live text, retaining historical material only where it is clearly marked as history:

```markdown
## 1. The era in one line, and its signature move

**One line:** a Roman Mediterranean port city whose institutions stand around usable
open space.

**The signature move — the load-bearing void.** A court, quay, lane, pool or assembly
apron is not leftover ground around a building. It is the functional centre of the
institution, and the roofed mass is arranged as narrow bars, lean-tos, split ridges or
vault jackets beside it. Seven of the ten canonical plots devote at least one-third of
their plan to one continuous open-to-sky region.

**The elevation follows the plan.** Open rows are freestanding round stone columns
carrying a straight entablature. An arch is a deep load-bearing vault mouth, apse, niche
or aqueduct element. A thin decorative arcade screen beneath a shallow roof is not this
era's grammar. Monumentality comes from width, vault mass and civic open space, not from
a crown.

**The skyline is low and horizontal except for one irregular dwelling stack.** There is
no exterior dome, drum, lantern, cupola, turret or regular chimney rhythm. The one narrow
high-rise is The Cottages, split into unequal wings by an open lightwell notch.

**The tally descendant remains the carved inscription in the era's wider world**, but
concept images carry no legible or pseudo-legible text, numeral, glyph or mathematical
diagram. Architecture must identify each building without a written label.
```

- [ ] **Step 3: Reconcile §2 materials without changing the palette**

Replace the live four-row material table and the paragraph immediately below it with:

```markdown
| Material | Read | Notes for modelling |
| --- | --- | --- |
| **Dressed ashlar limestone, laid in lime mortar** | The primary pale body and the mass of walls, piers, vaults and water works | Fine level joints; thick where a vault or retaining wall carries load. Marble remains an accent only |
| **Terracotta roof tile** | The accent on every roofed element | Pan-and-cover tile follows narrow gables, sheds, lean-tos, half-conical apses and individual vault crowns. It never becomes one broad hipped cap over a square or wide plot |
| **Lime plaster and stucco** | Upper masonry and cheaper walls | One close-to-body-hue surface over rubble or brick; never a rusticated ground-storey band or a regular applied pilaster grid |
| **Timber roof structure** | Trusses, shed framing, galleries and shallow portico roofs | Hand-built and visible where honest; never an exposed Medieval timber-frame wall pattern |

**Openings are unglazed voids, shutters or grilles.** Open structural rows are
freestanding columns under straight entablatures. Deep arches carry vaults, apses,
niches or aqueduct work. No broad hipped palazzo roof, rusticated base band, deep
bracketed palazzo cornice, regular glazed window grid, exterior dome, drum, lantern,
cupola, turret or regular chimney rhythm appears anywhere in the canonical set.
```

Keep `#D2C8AA`, `#B4674A`, `#ECE4D3`, the existing historical material amendments, and the concealed hand-forged tie clarification unchanged.

- [ ] **Step 4: Replace §3's live structural and height contract**

Use:

```markdown
## 3. Structural language

**Era four is void-first.** The institution is organised around a continuous functional
open-to-sky court, apron, lane, pool or quay wherever the canonical brief names one.
Authored ground is part of the mesh, and building plus authored void fills 95% of the
frozen footprint span.

- **Freestanding stoa row:** round stone columns carry one straight entablature and a
  shallow timber roof. A short return may define an edge but never close a court.
- **Narrow roofed bar:** one-room-deep cells, storage or workshop space lines one edge
  while most of the plot remains visibly open.
- **Split mass:** two bars or unequal wings preserve a continuous sky cut between them.
- **Deep vault:** thick masonry cross-walls and piers carry barrel or groin vaults whose
  mouths expose real depth. A screen of thin arches is not structural enough.
- **Civic landscape:** solid steps, quays, pools, lanes and water walls are architecture,
  not props or accidental padding.
- **Full orbit:** both sides, both ends and the rear remain legible under the 360° orbit;
  no canonical thumbnail depends on a decorated front hiding a blank back.

**Roof geometry is exact per building.** Shallow means eaves-to-crown rise no greater
than 25% of the supporting wall height. No Era 4 image uses one broad hip over a square
or wide plot, or one cap over an entire 2×2 or 3×2 plot.

**Height remains a ranking, never a world-unit target. Tallest first:** The Cottages;
The Baths; the Custom's House; the Senate House; the Stonecutters' Shop and the
Surveyor's Shop in one low workshop band; The Grain Dock; the Wine Cellars; The
Fountain; the Barracks. The Stonecutters' Shop may have marginally higher eaves than the
Surveyor's Shop, but neither leaves that shared band. The Fountain's water wall, not a
tree, stands above the Barracks ridge and below the Wine Cellars vault crowns.
```

- [ ] **Step 5: Replace §4's live ornament/technology boundary and add collision boundaries**

Use:

```markdown
## 4. Ornament and visible technology

**Ornament remains moderate and subordinate to plan, section and load path.** Column,
capital, straight entablature, moulded coping, vault reveal and cornice profile may
describe structure. Applied pilaster grids, rusticated storey bands, deep bracketed
palazzo cornices, regular glazed window grids and fine surface narratives belong outside
this set.

**Visible technology is civic infrastructure:** the quay and raised floor, vent band,
deep cella, external stair and gallery, water channel, three-niche water wall, pool,
overflow and solid stepped assembly apron. Props may reinforce a read, but no canonical
building depends on a groma, statue, inscription, goods display or tree for its identity.

**Every prohibition carries the ancient alternative.** Use a narrow bar or lean-to
instead of a broad hip; a deep vault or apse instead of a thin arcade screen; an
irregular notched insula instead of a regular palazzo wall; width and open courts instead
of a dome or cupola; unglazed voids, shutters and grilles instead of a glass grid.

### Collision boundaries

- Against the Bronze Age, use mortared ashlar, true freestanding stone colonnades,
  clerestory plus apse, four deep vault mouths, the notched four-storey insula, or three
  transverse vault shoulders plus a 40% court. Colour alone never discharges a collision.
- Against the Medieval era, keep zero pointed arches, buttresses, exposed timber-frame
  walls, jetties, steep roof-dominant elevations, spires and end-on street gables.
- Against the Renaissance, keep freestanding columns under straight entablatures, deep
  structural arches, zero broad hips/crowns, one irregular high point, functional open
  space and zero uninterrupted regular three-storey street walls.
```

- [ ] **Step 6: Replace the five live roster descriptions at current lines 300-306**

Keep node, lesson, and mass columns byte-for-byte unchanged; use these descriptions:

```markdown
| POL.1 | Add/subtract/multiply polynomials (FOIL, multivariable) | `workshop` | An open stoa workshop: rear roofed strip, two-thirds front work court, one straight freestanding colonnade |
| POL.2 | Factor polynomials (GCF, trinomials, grouping, perfect squares, diff. of squares) | `yard` | A one-room-deep contubernia range beside a wider bare drill strip, with one terminal officers' room |
| POL.3 | Solve quadratics by factoring and the square-root property | `hall` | An open forum basilica: raised nave, two lower open aisles, terminal apse and shallow forecourt |
| POL.4 | Solve quadratics by completing the square and the quadratic formula | `store` | Four half-sunken deep barrel-vaulted wine cellae beside a loading lane |
| POL.8 | Polynomial long & synthetic division | `workshop` | A groma court with L-shaped rooms and portico on two adjacent edges, open to two streets |
```

- [ ] **Step 7: Replace the live node/hub form paragraphs in §5**

Under the existing `Hall`, `Store`, `Workshop`, `Yard`, and `Landmark` headings, make the canonical live paragraphs exactly:

```markdown
**`POL.3` — open forum basilica.** A raised narrow nave runs to a half-round apse.
Lower open aisles expose the nave along both long sides, and a shallow entrance
forecourt separates approach from hall. Two internal column rows carry the clerestory;
outer aisle columns carry straight entablatures. One narrow nave roof, two lower
lean-tos and one half-conical apse roof preserve the stepped section. At 128 px the
clerestory stripe, both open aisles and apse must survive together.
**Historical basis:** approved design H2's long forum basilica and H3's Roman civic
basilica.

**`POL.4` — half-sunken horreum cellae.** Four adjacent deep chambers occupy 70% of
the long plot and a loading lane occupies 30%. Their floors sit below the lane. Thick
cross-walls carry four barrel vaults, and terracotta follows each crown independently.
The oblique orbit exposes a reveal at least half as deep as each mouth is wide. Keep a
single row of four; never return the bays around a square or add an isolated fifth bay.
**Historical basis:** approved design H5's storage cellae and H3's structural barrel
vault.

**`POL.1` — open stoa workshop.** A roofed rear strip occupies one-third of the plot
and a continuous work court occupies the front two-thirds. One straight freestanding
colonnade marks their boundary; any return is no more than one bay. A shallow shed roof
falls from rear load-bearing wall to front entablature. Work crosses the column line, so
the open court remains visibly larger than the roofed strip without relying on props.
**Historical basis:** approved design H1's commercial stoa and H3's working portico.

**`POL.8` — groma court.** L-shaped rooms and portico occupy no more than 45% along
two adjacent edges. At least 55% remains one open setting-out court with two complete
sides open to the street. Load-bearing rear walls and freestanding columns carry two
shallow lean-tos meeting at the internal corner. The L must read without a groma,
coordinate axes, quadrants, ticks or a regular paving grid.
**Historical basis:** approved design H1's stoa-framed civic space and H3's forum and
portico vocabulary.

**`POL.2` — contubernia range and drill strip.** The one-room-deep cell range and
veranda occupy 45% along one edge of the long 2×1 plot; a bare open drill strip occupies
55%. One terminal officers' room ends the bar. Short freestanding columns carry a
straight veranda beam before square-headed doors. One low gable covers only the cell
bar. One line of doors and never a second row preserves the anti-rebus contract.
**Historical basis:** approved design H4's contubernia blocks and terminal officers'
rooms.

**`town-hall` — rear Curia and open Comitium.** A simple load-bearing council hall
occupies the rear 35% of the 3×2 plot. A broad curved bank of solid assembly steps and
open apron occupies the front 65%. The public hearth stands on axis between lowest step
and hall entrance. One shallow gable covers only the rear hall; a straight-column
entrance porch is no deeper than one bay. The curved steps and visible hearth, not a
peristyle ring, carry the thumbnail.
**Historical basis:** approved design H8's Curia and stepped Senate chamber and H3's
connected Forum landscape.
```

Delete or move into clearly marked history any live sentence that still assigns these nodes a full-depth shop box, round arcade barracks, closed basilica façade, continuous Wine Cellars roof, compact hipped Surveyor's Shop, or four-sided peristyle hub.

- [ ] **Step 8: Reconcile the authored checklist and footprint closure**

Replace the live checklist's structural/roof bullets and the five-node closure summary with:

```markdown
- [x] **Structural language** — void-first courts, lanes, quays, pools and aprons;
  freestanding columns under straight entablatures; deep load-bearing vaults and apses.
- [x] **Roof and support forms** — narrow gables, sheds, lean-tos, split ridges,
  half-conical apses, independent vault jackets and no roof where the canonical form is
  open; zero broad hips and zero exterior domes or crowns.
- [x] **Canonical skill/hub forms** — `POL.1` open stoa, `POL.2` contubernia bar,
  `POL.3` open forum basilica, `POL.4` half-sunken cellae, `POL.8` L-shaped groma court,
  and the rear-Curia/open-Comitium hub.

**Footprints remain frozen.** `POL.1` and `POL.8` keep the square 2×2 plot; `POL.2`
keeps the long 2×1 plot; `POL.3` keeps the square 2×2 plot; `POL.4` keeps the long 2×1
plot; the hub keeps 3×2. The authored court, lane or apron is inside that existing plot
and participates in the 95% span; no form is made void-first by shrinking it into
accidental padding.
```

- [ ] **Step 9: Read the rewritten guide against approved sections 2-6**

Evidence checklist:

1. Scope/non-goals and frozen contracts: PASS only if IDs, masses, plots, names, palette, camera, stages, and height order are unchanged.
2. Shared grammar: PASS only if open-to-sky regions, straight entablatures, deep arches, low skyline, broad-hip ban, and crown ban are explicit.
3. Five skill buildings plus hub: PASS only if each current live paragraph matches its section-5 approved archetype.
4. Collision checks: PASS only if Bronze/Medieval/Renaissance separators are structural and grayscale-safe.
5. Prose quality: re-read the live text against the original objection that palette/detail cannot separate Era 4 from Era 6.

- [ ] **Step 10: Commit only with explicit execution-time authorization**

If and only if authorization is granted:

```bash
git add docs/superpowers/specs/eras/era-04-classical/style-guide.md
git commit -m "$(cat <<'EOF'
docs: make Classical architecture void-first
EOF
)"
```

Expected if authorized: one documentation-only commit. Otherwise skip this step.

## Task 3: Reconcile the Four Civic Building Contracts

**Files:**
- Modify: `docs/superpowers/specs/eras/era-04-classical/civic-buildings.md:110-136,138-235`
- Read: approved spec sections 2.3, 5.7-5.10, and 8.2

**Interfaces:**
- Consumes: unchanged civic catalogue/economy and the style guide's shared void-first grammar.
- Produces: exact Grain Dock, Cottages, Baths, and Fountain product forms for the README.

- [ ] **Step 1: Add a superseding visual-only amendment above the four entries**

Insert immediately before `### The Grain Dock`:

```markdown
> ## ⚑ AMENDED 2026-08-02 — THE FOUR CIVIC FORMS ARE VOID-FIRST
>
> This amendment changes visual prose only. The 2×2 / 1×2 / 3×2 / 1×1 footprints,
> food/livability/happiness contributions, 560 / 840 / 880 / 1,120 silver prices,
> acquisition rules, names and relative height order do not move.
>
> The live forms are a twin-bar horreum opening to a quay lane, an unequal notched
> insula, a three-bay transverse-vault thermae campus around an open palaestra/natatio,
> and an aqueduct-terminal water wall with a public apron. The prior broad granary hip,
> clean palazzo slab, exterior bath dome and miniature fountain piazza are superseded.
```

In the older amendment at current lines 131-136, add one sentence after the historical low-dome ruling:

```markdown
**Superseded for the canonical concept set on 2026-08-02:** the Baths retain low
apsidal hot rooms internally, but no hemispherical roof becomes an exterior dome; three
transverse frigidarium vault shoulders own the exterior silhouette.
```

- [ ] **Step 2: Replace the Grain Dock visual entry**

Use:

```markdown
### The Grain Dock *(2×2, food)*

Two parallel storage bars each occupy 30% of the plot. A straight open loading lane
runs through the central 40% from street to quay, so daylight crosses the compound.
Each bar stands on a solid vented sleeper wall and carries its own raised timber floor.
Two independent low terracotta gables leave a full-width strip of open sky between them.
Thick load-bearing storage walls and timber trusses carry the bars; the lane, quay edge
and vent bands are part of the asset.

**Thumbnail contract:** the through-lane and both vent bands survive together.
**Keep the twin-bar horreum and quay lane instead of** a monolithic block, hip roof,
upper storey, decorative arcade, regular window grid, deep cornice, open gap under the
whole floor or one broad façade.

*Materials:* ashlar and lime stucco over brick, terracotta tile, timber raised floors.
**Height: third of the four** — below the workshop band and above the Wine Cellars.
**Historical basis:** approved design H5's raised horreum floors, cellae, ramps and
courtyard/corridor storage plans.
```

- [ ] **Step 3: Replace the Cottages visual entry**

Use:

```markdown
### The Cottages *(1×2, livability)*

An Ostian insula of two visibly unequal wings fills the long strip. One wing is three
storeys and the other four. An open stair/lightwell notch cuts between them; external
stone stairs and shallow timber galleries wrap that notch. Shops face the short street
end. Two offset low-pitched terracotta roofs stop at unequal elevations, with no single
roof or level cornice closing the whole strip.

**Thumbnail contract:** open sky cuts through the mass and both wing heights remain
different. **Keep the irregular notched insula instead of** a symmetric façade grid,
level palazzo cornice, rusticated ground band, hip roof, sealed slab, central carriage
arch, dome or repeated identical balconies.

*Materials:* load-bearing lower masonry, lime stucco over lighter upper brick, timber
floors and galleries, terracotta tile. **Height: tallest of the four and of Era 4.**
**Historical basis:** approved design H6's multi-storey insulae, shop fronts, light
courts and documented four-storey examples.
```

- [ ] **Step 4: Replace the Baths visual entry**

Use:

```markdown
### The Baths *(3×2, happiness)*

An axial thermae campus fills the plot. Three transverse groin-vaulted frigidarium bays
occupy the rear half, carried on heavy masonry piers. Lower apsidal hot rooms sit along
one side and remain below the frigidarium shoulders. An open palaestra and natatio
occupy at least 40% of the whole plan and remain open on the approach side.

Three tile-jacketed transverse vault crowns and low service lean-tos form the exterior
roof. No hemispherical roof, caldarium cap or other dome appears outside. The pool,
exercise court and three vault shoulders are one composition.

**Thumbnail contract:** all three transverse shoulders and the large open court survive
together. **Keep the axial thermae campus instead of** any exterior dome, drum, lantern,
single long barrel roof, Renaissance loggia screen, palace façade, broad hip, regular
window grid or chimney stack.

*Materials:* mortared masonry vaulting, ashlar, lime stucco, marble accents,
terracotta tile and mosaic. **Height: second of the four.**
**Historical basis:** approved design H7's palaestrae, transverse-vaulted frigidarium
and natatio, plus H2's open exercise court and adjoining bath rooms.
```

- [ ] **Step 5: Replace the Fountain visual entry**

Use:

```markdown
### The Fountain *(1×1, blend)*

A solid three-niche water wall and attached long trough occupy the rear 25% of the
plot. A continuous public apron occupies the front 75%. A gravity-fed channel enters
the wall, divides to three deep outlets, fills the trough and exits through one cut
overflow channel. The asset has no roof.

In footprint-normalized thumbnails the water-wall top stands visibly above the
Barracks ridge and below the Wine Cellars vault crowns. The wall, not a tree or prop,
carries that height.

**Thumbnail contract:** channel, wall, three outlets, trough and overflow read as one
continuous water path. **Keep the aqueduct-terminal water wall instead of** a
freestanding tiered basin, statue, loggia, radial/geometric piazza paving, roof,
windlass, floating pipe or tree-carried height.

*Materials:* ashlar, marble trough lip, terracotta channel lining and a concealed or
wall-fixed fitting where needed. **Height: above the Barracks and below the Wine
Cellars.**
**Historical basis:** approved design H3's aqueduct-fed Roman city and engineered
public-water system.
```

- [ ] **Step 6: Verify that only visual prose moved**

Run:

```bash
git diff -- docs/superpowers/specs/eras/era-04-classical/civic-buildings.md
```

Expected: the catalogue still states Grain Dock 2×2/560, Cottages 1×2/840, Baths 3×2/880, Fountain 1×1/1,120, with unchanged contributions and acquisition rules. Only the superseding visual amendment and four visual entries differ.

- [ ] **Step 7: Commit only with explicit execution-time authorization**

If and only if authorization is granted:

```bash
git add docs/superpowers/specs/eras/era-04-classical/civic-buildings.md
git commit -m "$(cat <<'EOF'
docs: reconcile Classical civic forms
EOF
)"
```

Expected if authorized: one civic-guide documentation commit. Otherwise skip this step.

## Task 4: Rewrite the Canonical Image-Generation README

**Files:**
- Replace: `output/imagegen/era-04-classical-building-briefs/README.md:1-1359`
- Read: reconciled style/civic guides and approved spec sections 4, 5, 7, 8, and 10
- Test: `test/era04VoidFirstPromptContract.test.ts`

**Interfaces:**
- Consumes: upstream product contracts from Tasks 2-3.
- Produces: `shared-positive`, `shared-rendering`, `shared-prohibitions`, and ten ordered prompt bodies parsed by Task 5's builder.

- [ ] **Step 1: Replace the README with this complete source**

````markdown
# Era 04 — Void-first Classical building briefs

This folder is the sole canonical location for Era 4's ten final concept PNGs, this
README, and `era04-classical-concepts.jsonl`.

## Authority and scope

Read in this order:

1. `docs/superpowers/specs/2026-08-02-era-04-void-first-classical-design.md`
2. `docs/superpowers/specs/eras/era-04-classical/style-guide.md`
3. `docs/superpowers/specs/eras/era-04-classical/civic-buildings.md`
4. this README
5. `era04-classical-concepts.jsonl`

Era 4 is a Roman Mediterranean port city with a Hellenistic public-space inheritance.
Courts, quays, stoas, freestanding colonnades and deep structural vaults dominate its
plots. The distinction from the Renaissance is massing and plan, and must survive
grayscale at 128 px.

The implementation changes visual prose and the ten finished concept images only. IDs,
names, masses, roles, prices, contributions, acquisition rules, footprints, relative
height positions, body/roof hues, camera, lighting convention, runtime placement and
construction stages remain unchanged.

## Frozen contracts

- Every plot keeps its existing dimensions and includes the designed court, apron, lane,
  pool or quay inside the asset.
- Building plus authored open region fills 95% of the footprint span.
- Tallest first: The Cottages, The Baths, the Custom's House, the Senate House, the
  Stonecutters' Shop and Surveyor's Shop in one low workshop band, The Grain Dock, the
  Wine Cellars, The Fountain, the Barracks.
- The Stonecutters' Shop may have marginally higher eaves than the Surveyor's Shop.
- The Fountain's water wall sits above the Barracks ridge and below the Wine Cellars
  vault crowns.
- Every side reads during the full 360° orbit.
- All anti-rebus constraints remain binding.

## Shared positive prompt source

<!-- shared-positive:start -->
```text
One finished low-poly isometric building, one view, one continuous plot, no labels, no comparison panel, and no variant sheet. Use the locked three-quarter overhead camera at approximately 49° tilt and 45° azimuth, show the whole plot, and preserve the named plot dimensions. The building plus its authored court, apron, lane, pool, or quay fills 95% of the footprint span. Read the silhouette, plan, roof, structural system, and 128 px thumbnail detail before material or props. Freestanding columns carry straight entablatures, while every arch is a deep structural vault mouth, apse, niche, or aqueduct element.
```
<!-- shared-positive:end -->

## Canonical prompt census

The ten headings below are the complete canonical census and JSONL order. Assembly is
shared-positive, one building body, shared-rendering, then shared-prohibitions.

### 1. `pol-1-stonecutters-shop.png`

```text
The Stonecutters' Shop, POL.1 workshop, preserves its 2×2 plot and low workshop-band height. Rear roofed strip: 33% of the plot; continuous front work court: 67% open to sky. One straight row of freestanding round stone columns carries the front entablature, with a short return of at most one bay so the court never becomes a temple front. One shallow terracotta shed roof slopes from the rear wall to the straight front entablature; no ridge crosses the plot. The rear wall carries the back of the roof and the court remains the working floor. Thumbnail read: the open work court is larger than the roofed strip and work crosses the column line. Keep part-worked blocks unequal and scattered so they never form a rectangular array. Keep the open stoa workshop instead of a full-depth box, arch arcade, hip roof, pilaster façade, temple cella, fire, or rectangular block array.
```

### 2. `pol-2-barracks.png`

```text
The Barracks, POL.2 yard, preserves its long 2×1 plot and remains the shortest roofed Era 4 building. Cell range and veranda: 45% of the long plot; bare drill strip: 55% open to sky. One low terracotta gable covers only the one-room-deep cell bar and ends at one terminal officers' room. A row of short freestanding round columns carries one straight veranda beam before square-headed doors. Thumbnail read: one line of square-headed doors faces a drill strip wider than the cells and veranda. Keep the drill strip bare and the cells varied in occupancy so the node never forms an area-model grid. Keep the single low contubernia bar instead of a round arcade, second storey, second cell row, returning wing, paved drill grid, gate tower, parapet, crenellation, or pediment.
```

### 3. `pol-3-customs-house.png`

```text
The Custom's House, POL.3 hall, preserves its 2×2 plot and third-place height. A raised narrow nave runs to one half-round apse, with both lower open aisles exposed and a shallow entrance forecourt. Two internal column rows carry the clerestory walls and the outer aisle columns carry straight entablatures; the apse is thick load-bearing masonry. The roof is one narrow nave pitch, two lower aisle lean-tos, and one half-conical apse roof. The building is broad and axial rather than a compact cube, and all four sides remain finished. Thumbnail read: clerestory stripe, both lower open aisles, and terminal apse survive together. Keep the broad axial open forum basilica instead of a palace façade, dome, drum, lantern, rusticated storey, regular glazing, palazzo cornice, tall closed entrance wall, or blank rear.
```

### 4. `pol-4-wine-cellars.png`

```text
The Wine Cellars, POL.4 store, preserves its long 2×1 plot and stays below the Grain Dock and above the Fountain. Four adjacent half-sunken storage chambers occupy 70% of the long plot; the loading lane occupies 30%. Thick masonry cross-walls carry four true barrel vaults, with chamber floors below the lane and vault crowns rising from a low retaining terrace. Terracotta follows the four barrel-vault crowns independently, with no continuous gable, hip, or ridge. Thumbnail read: the oblique view exposes vault depth and thick cross-walls, with a reveal at least half the mouth width. Keep the bays in one line and keep goods behind the deep mouths so the form is cellae rather than a market screen. Keep four deep load-bearing cellae instead of a thin arcade, freestanding arcade piers, upper storey, continuous pitched cap, window grid, open goods display, four-sided bay arrangement, or isolated fifth bay.
```

### 5. `pol-8-surveyors-shop.png`

```text
The Surveyor's Shop, POL.8 workshop, preserves its 2×2 plot and shares the low workshop band with POL.1. L-shaped rooms and portico occupy at most 45% of the plot; the setting-out court occupies at least 55% open to sky. Load-bearing rear walls line two adjacent edges and freestanding round columns under straight entablatures define the court side, while two complete court sides remain open to streets. Two shallow terracotta lean-tos meet at the L's internal corner and never span the court. Thumbnail read: the L and its two street-open court sides remain clear without a groma or any prop. Keep any rods irregularly racked as tools and keep paving non-gridded so neither becomes a mathematical diagram. Keep the open groma court instead of a compact square block, hip roof, applied pilasters, regular windows, rusticated base, deep cornice, bilateral symmetry, coordinate axes, quadrants, tick marks, or regular paving grid.
```

### 6. `townhall-classical-senate-house.png`

```text
The Senate House, town-hall hub, preserves its broad 3×2 plot and is monumental by width rather than a crown. The rear Curia occupies 35% of the plot; the curved stepped Comitium apron occupies 65% open to sky. Solid masonry steps curve across the apron and a visible public hearth stands on the centre axis between the lowest step and the hall entrance. One shallow terracotta gable covers only the rear hall, and the entrance porch is no deeper than one bay. Load-bearing Curia walls and a timber truss carry the hall while freestanding round columns under one straight entablature carry the small porch. Thumbnail read: the curved step bank and central visible hearth form one civic composition. Keep the rear Curia and open assembly apron instead of a four-sided peristyle, rectangular piazza, fountain, statue, cupola, tower, multi-storey palazzo front, rusticated base, chimney rhythm, or roofed centre.
```

### 7. `civic-grain-dock.png`

```text
The Grain Dock, classical_public_granary food civic, preserves its 2×2 plot and sits below the workshop band and above the Wine Cellars. Two parallel storage bars each occupy 30% of the plot; the street-to-quay loading lane occupies 40% open to sky. Thick load-bearing walls carry raised timber floors over solid vented sleeper walls, and the quay edge and lane are authored parts of the asset. Two independent low terracotta gables leave a full-width strip of open sky between them. Thumbnail read: daylight crosses the central lane and both vent bands remain visible below the raised floors. Keep the lane clear from street to quay and keep the vent bands solid beneath each bar. Keep the twin-bar horreum and quay lane instead of a monolithic block, hip roof, upper storey, decorative arcade, regular window grid, deep cornice, open gap beneath the whole floor, or single broad façade.
```

### 8. `civic-cottages.png`

```text
The Cottages, classical_apartment_block dwelling civic, preserves its narrow 1×2 plot and remains the only narrow high-rise and the tallest Era 4 building. Two unequal three- and four-storey wings are split by an open stair and lightwell notch. Shops face the short street end, while external stone stair flights and shallow timber galleries wrap the notch. Two offset low-pitched terracotta roofs end at unequal elevations and never close the strip with one cornice. Lower walls are load-bearing masonry and upper floors are lighter masonry on timber floors. Thumbnail read: open sky cuts through the mass and the wings end at visibly different heights. Keep the irregular notched insula instead of a symmetric façade grid, level palazzo cornice, rusticated ground band, hip roof, sealed slab, central carriage arch, dome, or repeated identical balconies.
```

### 9. `civic-baths.png`

```text
The Baths, classical_baths amenity civic, preserves its 3×2 plot and remains second in Era 4's height order. Three transverse frigidarium vault bays occupy the rear half; the open palaestra and natatio occupy at least 40% of the plot. Heavy masonry piers carry the three groin-vaulted bays, while lower apsidal hot rooms sit along one side and remain below the frigidarium shoulders. The approach side of the court remains open. Three tile-jacketed transverse vault crowns and low service lean-tos form the roof, with no hemispherical exterior roof. Thumbnail read: three transverse vault shoulders and the large open pool and exercise court survive together. Keep any hot-room half-domes contained below the shoulders so the exterior skyline stays uncrowned. Keep the axial thermae campus instead of any exterior dome, drum, lantern, single long barrel roof, Renaissance loggia screen, palace façade, broad hip, regular window grid, or chimney stack.
```

### 10. `civic-fountain.png`

```text
The Fountain, classical_fountain blend civic, preserves its 1×1 plot and remains above the Barracks and below the Wine Cellars. The solid three-niche water wall and attached trough occupy 25% of the plot; the public apron occupies 75% open to sky. A gravity-fed channel enters the wall, divides to three deep outlets, fills one long trough, and exits through a cut overflow channel. The asset has no roof, and the water-wall top sits above the Barracks ridge and below the Wine Cellars vault crowns. Thumbnail read: channel, wall, three outlets, trough, and overflow form one continuous water path. Keep the wall fixed to the channel and trough, with the apron open and irregularly paved. Keep the aqueduct-terminal water wall instead of a freestanding tiered basin, statue, loggia, radial or geometric piazza paving, roof, windlass, floating pipe, or tree-carried height.
```

## Shared rendering prompt source

<!-- shared-rendering:start -->
```text
Pale ashlar or stucco and terracotta tile are secondary identifiers; the massing must remain legible in grayscale. Render the finished built stage in matte pale ashlar or stucco #D2C8AA, terracotta roof tile #B4674A where the named roof exists, and flat parchment ground #ECE4D3. Use three flat tone steps per surface under one key direction, with no gradient, and author a legible rear, both ends, and both long sides for the full 360-degree orbit.
```
<!-- shared-rendering:end -->

## Shared prohibition prompt source

<!-- shared-prohibitions:start -->
```text
Do not use a broad hipped palazzo roof; use only the building's named narrow bar, lean-to, split ridge, vault jacket, or no roof. Do not use a rusticated ground-storey band, applied pilaster grid, deep bracketed palazzo cornice, or regular glazed window grid; use pale load-bearing ancient masonry, unglazed voids, shutters, grilles, freestanding columns, and thick vaults instead. Do not use an exterior dome, drum, lantern, cupola, turret, or regular chimney rhythm; make monumentality with width, vault mass, open courts, and the one irregular dwelling stack instead. Do not use exposed Medieval timber framing, pointed arches, buttresses, jetties, steep roofs, spires, machine-made units, structural iron, sawtooth roofs, industrial chimneys, or soot; use dressed masonry, shallow ancient roofs, hand-built timber roof structures, and clean three-tone surfaces instead. Do not use legible or pseudo-legible text, numerals, glyphs, mathematical diagrams, or lesson rebuses; use unmarked architectural form and irregular non-diagrammatic props instead. Do not add cast shadows, ambient occlusion, specular highlights, rim lights, gradients, or emissive spill; use the fixed three-tone surface treatment and self-contained emissive geometry only where the named hearth requires it.
```
<!-- shared-prohibitions:end -->

## Built-in image-generator handoff

`era04-classical-concepts.jsonl` is generated from the three marked source groups above.
For each JSONL row, call Cursor's built-in image generator with:

- `description`: the row's complete `prompt`
- `filename`: the row's exact canonical `out` basename
- `aspect_ratio`: `1:1`
- `reference_image_paths`: omitted

Save every returned file under
`tmp/imagegen/era-04-void-first-candidates/` with that exact basename. Do not call an
image-generation API or CLI, and do not write a generated file into this canonical
folder before the complete candidate set passes.

## Canonical and review policy

- Candidate generation lives under `tmp/imagegen/era-04-void-first-candidates/` and
  review evidence under `tmp/imagegen/era-04-void-first-review/`.
- A Cursor-delivered asset may transport a generated image but is never authoritative.
- Exactly ten candidate basenames must match the census above in both directions.
- Each candidate must be 1024×1024 and have a nonempty, nonduplicate SHA-256.
- Review uses all ten candidates plus the eleven canonical Era 6 comparison images.
- RGB and mechanical grayscale sheets use seed `era04-era06-void-first-v1`, identical
  order and whole-image 128×128 tiles.
- Two independent reviewers each owe 21/21 on both sheets.
- Install all ten together only after per-building, aggregate and blind-sort passes.
- Never create `-v2`, `-final`, `-new`, `copy`, numbered alternatives, a second
  canonical folder or a mixed old/new canonical set.
- After installation, rebuild from canonical paths and repeat the full blind review.
- One or two isolated failures permit selective prompt revision and replacement.
- Three or more failures, a shared grammar defect, a failed skyline/open/roof/structure
  rule, or grayscale failure on more than one image requires regeneration of all ten.
- After two failed revisions of the same binary rule for one building, stop; do not make
  a third blind rerender.
- Runtime 1024×580 city-frame verification remains NOT DONE because per-node runtime art
  is not wired.
- Generated-PNG tracking policy does not change; tracking or committing binaries needs
  separate explicit authorization.
````

- [ ] **Step 2: Re-read the README in authority order**

Verify each downstream statement against the approved spec and both reconciled guides. In particular, inspect every percentage, roof treatment, height relation, thumbnail read, and regression alternative rather than relying on the prompt guard to assess prose quality.

- [ ] **Step 3: Run the guard at the intermediate state**

Run:

```bash
npx vitest run test/era04VoidFirstPromptContract.test.ts
```

Expected: the README markers and ten-output census are now readable, all four mutation tests pass, and the live-contract test still fails because the old JSONL does not exactly derive from the new README and lacks the new shared/per-building clauses.

- [ ] **Step 4: Commit only with explicit execution-time authorization**

If and only if authorization is granted:

```bash
git add output/imagegen/era-04-classical-building-briefs/README.md
git commit -m "$(cat <<'EOF'
docs: rewrite Era 4 image briefs
EOF
)"
```

Expected if authorized: one README-only commit. Otherwise skip this step.

## Task 5: Derive the Ten-Line JSONL and Turn the Guard Green

**Files:**
- Create: `tmp/imagegen/era-04-void-first-prompts/build.py`
- Replace: `output/imagegen/era-04-classical-building-briefs/era04-classical-concepts.jsonl:1-10`
- Format/Test: `test/era04VoidFirstPromptContract.test.ts`

**Interfaces:**
- Consumes: marked README source and approved section-5 canonical outputs.
- Produces: exactly ten `PromptRow` JSON objects whose prompts equal `shared positive + body + shared rendering + shared prohibitions`.

- [ ] **Step 1: Add the deterministic README-to-JSONL builder**

Create `tmp/imagegen/era-04-void-first-prompts/build.py` with:

```python
#!/usr/bin/env python3
"""Derive Era 4's canonical JSONL from the marked README prompt source."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SPEC = ROOT / "docs/superpowers/specs/2026-08-02-era-04-void-first-classical-design.md"
README = ROOT / "output/imagegen/era-04-classical-building-briefs/README.md"
OUT = ROOT / (
    "output/imagegen/era-04-classical-building-briefs/"
    "era04-classical-concepts.jsonl"
)


def normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def marked_text(source: str, name: str) -> str:
    start_marker = f"<!-- {name}:start -->"
    end_marker = f"<!-- {name}:end -->"
    start = source.find(start_marker)
    end = source.find(end_marker, start + len(start_marker))
    if start < 0 or end < 0:
        raise ValueError(f"{README}: missing {name} markers")
    block = source[start + len(start_marker):end]
    match = re.search(r"```text\n([\s\S]*?)\n```", block)
    if not match:
        raise ValueError(f"{README}: {name} has no text fence")
    return normalize(match.group(1))


def canonical_outs(spec_source: str) -> list[str]:
    heading = "## 5. Canonical per-building redesign"
    next_heading = "\n---\n\n## 6. Collision checks"
    start = spec_source.find(heading)
    end = spec_source.find(next_heading, start)
    if start < 0 or end < 0:
        raise ValueError(f"{SPEC}: canonical section boundaries not found")
    section = spec_source[start:end]
    blocks = re.findall(
        r"^### 5\.(\d+) `([^`]+)`[^\n]*\n([\s\S]*?)(?=^### 5\.\d+|\Z)",
        section,
        flags=re.MULTILINE,
    )
    outs: list[str] = []
    for order, building_id, body in blocks:
        match = re.search(r"canonical output `([^`]+\.png)`", body)
        if not match:
            raise ValueError(f"{SPEC}: {order} {building_id} has no canonical output")
        outs.append(match.group(1))
    return outs


def readme_bodies(readme_source: str) -> list[tuple[int, str, str]]:
    start = readme_source.find("## Canonical prompt census")
    end = readme_source.find("\n## Built-in image-generator handoff", start)
    if start < 0 or end < 0:
        raise ValueError(f"{README}: canonical prompt census boundaries not found")
    section = readme_source[start:end]
    matches = re.findall(
        r"^### (\d+)\. `([^`]+\.png)`\n\n```text\n([\s\S]*?)\n```",
        section,
        flags=re.MULTILINE,
    )
    return [(int(order), out, normalize(body)) for order, out, body in matches]


def build() -> list[dict[str, str]]:
    spec_source = SPEC.read_text(encoding="utf-8")
    readme_source = README.read_text(encoding="utf-8")
    positive = marked_text(readme_source, "shared-positive")
    rendering = marked_text(readme_source, "shared-rendering")
    prohibitions = marked_text(readme_source, "shared-prohibitions")
    bodies = readme_bodies(readme_source)
    expected_outs = canonical_outs(spec_source)

    if len(expected_outs) != 10 or len(set(expected_outs)) != 10:
        raise ValueError(
            f"approved census must have 10 distinct outputs, got {len(expected_outs)}"
        )
    if [order for order, _out, _body in bodies] != list(range(1, 11)):
        raise ValueError("README prompt order must be exactly 1 through 10")
    readme_outs = [out for _order, out, _body in bodies]
    if readme_outs != expected_outs:
        raise ValueError(
            "README outputs differ from approved section 5:\n"
            f"README: {readme_outs}\nSPEC: {expected_outs}"
        )

    rows = [
        {
            "out": out,
            "size": "1024x1024",
            "quality": "high",
            "use_case": "stylized-concept",
            "prompt": normalize(f"{positive} {body} {rendering} {prohibitions}"),
        }
        for _order, out, body in bodies
    ]
    if len({row["out"] for row in rows}) != len(rows):
        raise ValueError("duplicate out values")
    return rows


def encoded(rows: list[dict[str, str]]) -> str:
    return "".join(
        json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n"
        for row in rows
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--check",
        action="store_true",
        help="validate that the canonical JSONL already equals the README projection",
    )
    args = parser.parse_args()
    rows = build()
    rendered = encoded(rows)
    if args.check:
        current = OUT.read_text(encoding="utf-8")
        if current != rendered:
            raise SystemExit(
                f"{OUT} is stale: run {Path(__file__).relative_to(ROOT)} without --check"
            )
        print("validated 10 lines, 10 distinct outputs; canonical JSONL is current")
        return
    OUT.write_text(rendered, encoding="utf-8")
    print(f"wrote {OUT} (10 lines, 10 distinct outputs)")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Generate the canonical JSONL**

Run:

```bash
python3 tmp/imagegen/era-04-void-first-prompts/build.py
```

Expected:

```text
wrote .../era04-classical-concepts.jsonl (10 lines, 10 distinct outputs)
```

- [ ] **Step 3: Format the TypeScript guard**

Run:

```bash
npx biome check --write test/era04VoidFirstPromptContract.test.ts
```

Expected: one file checked; any formatting changes are confined to the new test.

- [ ] **Step 4: Run the prompt contract green**

Run:

```bash
npx vitest run test/era04VoidFirstPromptContract.test.ts
```

Expected:

```text
Test Files  1 passed (1)
Tests       6 passed (6)
```

The live contract and all four mutation tests must pass. A green live contract with any mutation test failing is not acceptance.

- [ ] **Step 5: Run the builder's nonwriting validation**

Run:

```bash
python3 tmp/imagegen/era-04-void-first-prompts/build.py --check
```

Expected:

```text
validated 10 lines, 10 distinct outputs; canonical JSONL is current
```

- [ ] **Step 6: Inspect the literal JSONL census before spending generation cost**

Run:

```bash
python3 - <<'PY'
import json
from pathlib import Path

path = Path(
    "output/imagegen/era-04-classical-building-briefs/"
    "era04-classical-concepts.jsonl"
)
rows = [json.loads(line) for line in path.read_text().splitlines() if line.strip()]
print(f"lines={len(rows)} distinct_out={len({row['out'] for row in rows})}")
for index, row in enumerate(rows, 1):
    print(index, row["out"], row["size"], row["quality"], row["use_case"])
PY
```

Expected: `lines=10 distinct_out=10`, followed by the ten canonical basenames in approved section-5 order, each with `1024x1024 high stylized-concept`.

- [ ] **Step 7: Commit the guard and JSONL only with explicit execution-time authorization**

If and only if authorization is granted:

```bash
git add test/era04VoidFirstPromptContract.test.ts \
  output/imagegen/era-04-classical-building-briefs/era04-classical-concepts.jsonl
git commit -m "$(cat <<'EOF'
test: guard Era 4 void-first prompts
EOF
)"
```

Expected if authorized: one green test/prompt commit. Do not add either temporary builder. Otherwise skip this step.

## Task 6: Generate and Validate All Ten Temporary Candidates

**Files:**
- Create: `tmp/imagegen/era-04-void-first-review/validate_assets.py`
- Create: ten PNGs under `tmp/imagegen/era-04-void-first-candidates/current/`
- Read only: canonical Era 4 images and canonical JSONL

**Interfaces:**
- Consumes: the ten validated JSONL rows and baseline hash manifest.
- Produces: one exact-basename 1024×1024 candidate per row and `candidate-manifest.json`.

- [ ] **Step 1: Prove canonical images still equal the frozen baseline**

Run:

```bash
python3 - <<'PY'
import hashlib
from pathlib import Path

folder = Path("output/imagegen/era-04-classical-building-briefs")
manifest = Path(
    "tmp/imagegen/era-04-void-first-review/baseline-era04-sha256.txt"
)
expected = {
    name: digest
    for digest, name in (
        line.split("  ", 1)
        for line in manifest.read_text().splitlines()
        if line.strip()
    )
}
actual = {
    name: hashlib.sha256((folder / name).read_bytes()).hexdigest()
    for name in expected
}
assert actual == expected, "canonical Era 4 images changed before candidate generation"
print("canonical matches baseline: 10/10")
PY
```

Expected: `canonical matches baseline: 10/10`.

- [ ] **Step 2: Add candidate validation**

Create `tmp/imagegen/era-04-void-first-review/validate_assets.py` with:

```python
#!/usr/bin/env python3
"""Validate an exact Era 4 image set against JSONL and an optional baseline."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image


def sha256(path: Path) -> str:
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if not digest or set(digest) == {"0"}:
        raise ValueError(f"{path}: empty SHA-256")
    return digest


def expected_outs(path: Path) -> list[str]:
    rows = [
        json.loads(line)
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    outs = [row["out"] for row in rows]
    if len(outs) != 10 or len(set(outs)) != 10:
        raise ValueError(f"{path}: expected 10 distinct out values")
    if any(Path(out).name != out for out in outs):
        raise ValueError(f"{path}: every out must be a basename")
    return outs


def baseline_hashes(path: Path | None) -> dict[str, str]:
    if path is None:
        return {}
    return {
        name: digest
        for digest, name in (
            line.split("  ", 1)
            for line in path.read_text(encoding="utf-8").splitlines()
            if line.strip()
        )
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--images-dir", type=Path, required=True)
    parser.add_argument("--jsonl", type=Path, required=True)
    parser.add_argument("--baseline", type=Path)
    parser.add_argument("--manifest", type=Path, required=True)
    args = parser.parse_args()

    names = expected_outs(args.jsonl)
    actual_names = sorted(path.name for path in args.images_dir.glob("*.png"))
    if actual_names != sorted(names):
        missing = sorted(set(names) - set(actual_names))
        extra = sorted(set(actual_names) - set(names))
        raise ValueError(f"image census mismatch; missing={missing}; extra={extra}")

    baseline = baseline_hashes(args.baseline)
    rows: list[dict[str, object]] = []
    for name in names:
        path = args.images_dir / name
        with Image.open(path) as image:
            size = image.size
            mode = image.mode
            image.verify()
        if size != (1024, 1024):
            raise ValueError(f"{name}: expected 1024x1024, got {size}")
        digest = sha256(path)
        if name in baseline and digest == baseline[name]:
            raise ValueError(f"{name}: candidate is byte-identical to baseline")
        rows.append(
            {
                "out": name,
                "size": [1024, 1024],
                "mode": mode,
                "sha256": digest,
            }
        )

    hashes = [row["sha256"] for row in rows]
    if len(set(hashes)) != len(hashes):
        raise ValueError("two candidate outputs are byte-identical")
    args.manifest.parent.mkdir(parents=True, exist_ok=True)
    args.manifest.write_text(json.dumps(rows, indent=2) + "\n", encoding="utf-8")
    print("validated 10 files, 10 names, 1024x1024, 10 unique nonbaseline hashes")
    print(f"wrote {args.manifest}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Prepare one current candidate slot per canonical basename**

Run:

```bash
python3 - <<'PY'
from pathlib import Path

current = Path("tmp/imagegen/era-04-void-first-candidates/current")
rejected = Path("tmp/imagegen/era-04-void-first-candidates/rejected")
current.mkdir(parents=True, exist_ok=True)
rejected.mkdir(parents=True, exist_ok=True)
assert not any(current.iterdir()), (
    "current candidate folder is not empty; preserve or inspect that evidence "
    "before beginning a new run"
)
print("current candidate folder is empty")
PY
```

Expected: `current candidate folder is empty`. No prior evidence is deleted and canonical art is untouched.

- [ ] **Step 4: Generate all ten with Cursor's built-in image generator**

For each JSONL row in lines 1 through 10, in order:

1. Read that single row.
2. Invoke the built-in image generator exactly as:

```typescript
GenerateImage({
  description: row.prompt,
  filename: row.out,
  aspect_ratio: "1:1",
});
```

3. Do not provide reference images.
4. Record the file path returned by the built-in tool.
5. Move that returned file, without re-encoding it, to
   `tmp/imagegen/era-04-void-first-candidates/current/` plus the exact `out` basename.
6. Confirm the destination exists before invoking the next row.

Do not invent unsupported tool arguments for `quality` or `use_case`; those values remain
validated JSONL contract metadata, while candidate validation proves the returned file is
1024×1024.

The ten required calls, in order, use:

1. `pol-1-stonecutters-shop.png`
2. `pol-2-barracks.png`
3. `pol-3-customs-house.png`
4. `pol-4-wine-cellars.png`
5. `pol-8-surveyors-shop.png`
6. `townhall-classical-senate-house.png`
7. `civic-grain-dock.png`
8. `civic-cottages.png`
9. `civic-baths.png`
10. `civic-fountain.png`

Do not invoke an image-generation command, API, SDK, or batch service. Do not put any returned image in the canonical folder.

- [ ] **Step 5: Validate the complete candidate set**

Run:

```bash
python3 tmp/imagegen/era-04-void-first-review/validate_assets.py \
  --images-dir tmp/imagegen/era-04-void-first-candidates/current \
  --jsonl output/imagegen/era-04-classical-building-briefs/era04-classical-concepts.jsonl \
  --baseline tmp/imagegen/era-04-void-first-review/baseline-era04-sha256.txt \
  --manifest tmp/imagegen/era-04-void-first-review/candidate-manifest.json
```

Expected:

```text
validated 10 files, 10 names, 1024x1024, 10 unique nonbaseline hashes
wrote .../candidate-manifest.json
```

Any missing image, extra PNG, wrong dimensions, duplicate hash, baseline-identical result, or directory-bearing filename blocks review.

- [ ] **Step 6: Confirm no canonical file changed**

Repeat Task 6 Step 1. Expected: `canonical matches baseline: 10/10`.

There is no commit in this task. Temporary candidates, validators, manifests, and generated images remain uncommitted.

## Task 7: Build Candidate Sheets and Perform the Ten-Item Form Review

**Files:**
- Create: `tmp/imagegen/era-04-void-first-review/candidate-rgb.png`
- Create: `tmp/imagegen/era-04-void-first-review/candidate-grayscale.png`
- Create: `tmp/imagegen/era-04-void-first-review/candidate-answer-key.json`
- Create: `tmp/imagegen/era-04-void-first-review/candidate-sources.json`
- Create: `tmp/imagegen/era-04-void-first-review/candidate-era04-contact-sheet.png`
- Create: `tmp/imagegen/era-04-void-first-review/review-report.md`

**Interfaces:**
- Consumes: validated current candidates plus the eleven read-only Era 6 images.
- Produces: deterministic whole-population sheets and the report that later receives blind classifications and aggregate verdicts.

- [ ] **Step 1: Build the candidate RGB and grayscale sheets**

Run:

```bash
python3 tmp/imagegen/era-04-void-first-review/build_contact_sheets.py \
  --era4-dir tmp/imagegen/era-04-void-first-candidates/current \
  --out-dir tmp/imagegen/era-04-void-first-review \
  --prefix candidate
```

Expected:

```text
population: 21 (Era 4=10, Era 6=11)
seed: era04-era06-void-first-v1; tile: 128x128; order: identical
wrote .../candidate-rgb.png
wrote .../candidate-grayscale.png
wrote .../candidate-answer-key.json
wrote .../candidate-sources.json
wrote .../candidate-era04-sha256.txt
wrote .../candidate-era04-contact-sheet.png
```

Open both full sheets. Confirm every numbered tile is visible at 128×128, no image is cropped tighter than its source, no era/name/role/filename appears inside a tile, and tile numbers match between sheets.

- [ ] **Step 2: Create the report with explicit `NOT DONE` defaults**

Create `tmp/imagegen/era-04-void-first-review/review-report.md` with:

```markdown
# Era 4 void-first Classical concept-art verification

**Population:** ten Era 4 candidates plus eleven Era 6 comparison images.
**Seed:** `era04-era06-void-first-v1`
**Tile contract:** whole-image 128×128; identical RGB/grayscale order; no identifying
label inside a tile.

## Per-building report

1. **POL.1 — the Stonecutters' Shop**
   - Evidence type: uncropped 1024×1024 candidate plus its RGB and mechanical-grayscale 128×128 tiles.
   - Silhouette and plan: **NOT DONE**
   - Roof treatment: **NOT DONE**
   - Structural system: **NOT DONE**
   - Required thumbnail detail: **NOT DONE**
   - Regression bans (full-depth box; arch arcade; hip roof; applied-pilaster façade; temple cella; fire; rectangular block array): **NOT DONE**
   - Colour-sheet classification, both reviewers: **NOT DONE**
   - Grayscale-sheet classification, both reviewers: **NOT DONE**

2. **POL.2 — the Barracks**
   - Evidence type: uncropped 1024×1024 candidate plus its RGB and mechanical-grayscale 128×128 tiles.
   - Silhouette and plan: **NOT DONE**
   - Roof treatment: **NOT DONE**
   - Structural system: **NOT DONE**
   - Required thumbnail detail: **NOT DONE**
   - Regression bans (round arcade; second storey; second cell row; returning wing; paved drill grid; gate tower; parapet; crenellation; pediment): **NOT DONE**
   - Colour-sheet classification, both reviewers: **NOT DONE**
   - Grayscale-sheet classification, both reviewers: **NOT DONE**

3. **POL.3 — the Custom's House**
   - Evidence type: uncropped 1024×1024 candidate plus its RGB and mechanical-grayscale 128×128 tiles.
   - Silhouette and plan: **NOT DONE**
   - Roof treatment: **NOT DONE**
   - Structural system: **NOT DONE**
   - Required thumbnail detail: **NOT DONE**
   - Regression bans (palace façade; dome; drum; lantern; rusticated storey; regular glazed window grid; deep palazzo cornice; tall closed entrance wall; blank rear): **NOT DONE**
   - Colour-sheet classification, both reviewers: **NOT DONE**
   - Grayscale-sheet classification, both reviewers: **NOT DONE**

4. **POL.4 — the Wine Cellars**
   - Evidence type: uncropped 1024×1024 candidate plus its RGB and mechanical-grayscale 128×128 tiles.
   - Silhouette and plan: **NOT DONE**
   - Roof treatment: **NOT DONE**
   - Structural system: **NOT DONE**
   - Required thumbnail detail: **NOT DONE**
   - Regression bans (thin arcade; freestanding arcade piers; upper storey; continuous pitched cap; window grid; open goods display; four-sided bay arrangement; isolated fifth bay): **NOT DONE**
   - Colour-sheet classification, both reviewers: **NOT DONE**
   - Grayscale-sheet classification, both reviewers: **NOT DONE**

5. **POL.8 — the Surveyor's Shop**
   - Evidence type: uncropped 1024×1024 candidate plus its RGB and mechanical-grayscale 128×128 tiles.
   - Silhouette and plan: **NOT DONE**
   - Roof treatment: **NOT DONE**
   - Structural system: **NOT DONE**
   - Required thumbnail detail: **NOT DONE**
   - Regression bans (compact square block; hip roof; applied-pilaster rhythm; regular window grid; rusticated base; deep cornice; full bilateral symmetry; coordinate axes; quadrants; tick marks; regular paving grid): **NOT DONE**
   - Colour-sheet classification, both reviewers: **NOT DONE**
   - Grayscale-sheet classification, both reviewers: **NOT DONE**

6. **town-hall — the Senate House**
   - Evidence type: uncropped 1024×1024 candidate plus its RGB and mechanical-grayscale 128×128 tiles.
   - Silhouette and plan: **NOT DONE**
   - Roof treatment: **NOT DONE**
   - Structural system: **NOT DONE**
   - Required thumbnail detail: **NOT DONE**
   - Regression bans (four-sided peristyle; formal rectangular piazza; fountain; statue; cupola; tower; multi-storey palazzo front; rusticated base; chimney rhythm; roofed centre): **NOT DONE**
   - Colour-sheet classification, both reviewers: **NOT DONE**
   - Grayscale-sheet classification, both reviewers: **NOT DONE**

7. **classical_public_granary — The Grain Dock**
   - Evidence type: uncropped 1024×1024 candidate plus its RGB and mechanical-grayscale 128×128 tiles.
   - Silhouette and plan: **NOT DONE**
   - Roof treatment: **NOT DONE**
   - Structural system: **NOT DONE**
   - Required thumbnail detail: **NOT DONE**
   - Regression bans (monolithic block; hip roof; upper storey; decorative arcade; regular window grid; deep cornice; open gap beneath the whole floor; single broad façade): **NOT DONE**
   - Colour-sheet classification, both reviewers: **NOT DONE**
   - Grayscale-sheet classification, both reviewers: **NOT DONE**

8. **classical_apartment_block — The Cottages**
   - Evidence type: uncropped 1024×1024 candidate plus its RGB and mechanical-grayscale 128×128 tiles.
   - Silhouette and plan: **NOT DONE**
   - Roof treatment: **NOT DONE**
   - Structural system: **NOT DONE**
   - Required thumbnail detail: **NOT DONE**
   - Regression bans (symmetric façade grid; level palazzo cornice; rusticated ground band; hip roof; sealed slab; central carriage arch; dome; repeated identical balconies): **NOT DONE**
   - Colour-sheet classification, both reviewers: **NOT DONE**
   - Grayscale-sheet classification, both reviewers: **NOT DONE**

9. **classical_baths — The Baths**
   - Evidence type: uncropped 1024×1024 candidate plus its RGB and mechanical-grayscale 128×128 tiles.
   - Silhouette and plan: **NOT DONE**
   - Roof treatment: **NOT DONE**
   - Structural system: **NOT DONE**
   - Required thumbnail detail: **NOT DONE**
   - Regression bans (exterior dome of any kind; drum; lantern; single long barrel roof; Renaissance loggia screen; palace façade; broad hip; regular window grid; chimney stack): **NOT DONE**
   - Colour-sheet classification, both reviewers: **NOT DONE**
   - Grayscale-sheet classification, both reviewers: **NOT DONE**

10. **classical_fountain — The Fountain**
    - Evidence type: uncropped 1024×1024 candidate plus its RGB and mechanical-grayscale 128×128 tiles.
    - Silhouette and plan: **NOT DONE**
    - Roof treatment: **NOT DONE**
    - Structural system: **NOT DONE**
    - Required thumbnail detail: **NOT DONE**
    - Regression bans (freestanding tiered basin; statue; loggia; radial/geometric piazza paving; roof; windlass; floating pipe; tree-carried height): **NOT DONE**
    - Colour-sheet classification, both reviewers: **NOT DONE**
    - Grayscale-sheet classification, both reviewers: **NOT DONE**

## Aggregate six-rule report

1. **Skyline rule:** **NOT DONE**
   - Era 4 must have exactly one narrow high-rise, zero exterior domes/drums/lanterns/cupolas/turrets/regular chimney rhythms; Era 6 must retain two full domes with lanterns and one City Hall cupola/chimney crown.
2. **Open-versus-enclosed rule:** **NOT DONE**
   - The seven named Era 4 plots must each show at least one-third continuous functional open-to-sky plan; no more than three Era 6 plots may meet the same threshold.
3. **Roof-geometry rule:** **NOT DONE**
   - Era 4 must have zero broad hips, zero whole-plot caps over 2×2/3×2 plots, and every exact section-5 roof treatment.
4. **Structural-system rule:** **NOT DONE**
   - Every exposed Era 4 support row must be freestanding columns under a straight entablature; every visible arch must be a deep vault, apse, niche or aqueduct element.
5. **Street-wall rule:** **NOT DONE**
   - Era 4 must have zero uninterrupted regular three-storey façades; its one tall dwelling must be notched/unequal; Era 6 must visibly retain at least three regular wall-first multi-storey blocks.
6. **Blind-sort rule:** **NOT DONE**
   - Both independent reviewers must score 21/21 on RGB and 21/21 on grayscale.

> **Runtime 1024×580 city-frame verification: NOT DONE — Era 4 and Era 6 per-node
> runtime art is not wired.**

The runtime item is future-only and does not certify or block this concept-art unit.
```

- [ ] **Step 3: Review each building at both evidence scales**

For each numbered item, inspect:

1. the full uncropped 1024×1024 candidate;
2. its 128×128 RGB tile in the complete 21-image sheet;
3. its same-position 128×128 grayscale tile;
4. every surface exposed by the single isometric view.

Change each of the first five fields from `NOT DONE` to `PASS` or `FAIL`, with one concise evidence sentence. Do not fill either blind-classification field yet. A prompt clause or dimension does not prove a rendered form; the image itself is the evidence.

The one-view concept cannot prove hidden-side behavior under a 360° runtime orbit. Keep
that requirement in the guide/prompt contract, but do not report the unseen sides as
visually verified by this unit.

- [ ] **Step 4: Apply the form-review gate**

The candidate set advances only if every building has `PASS` for:

- silhouette and plan;
- roof treatment;
- structural system;
- required thumbnail detail;
- every named regression ban.

If any field fails, proceed to Task 8. If all fifty form fields pass, proceed to Task 9.

There is no commit in this task; the sheets and report are temporary evidence.

## Task 8: Apply the Bounded Redo Rules

**Files:**
- Conditionally modify: `output/imagegen/era-04-classical-building-briefs/README.md`
- Conditionally regenerate: `output/imagegen/era-04-classical-building-briefs/era04-classical-concepts.jsonl`
- Conditionally replace: exact-basename PNGs under `tmp/imagegen/era-04-void-first-candidates/current/`
- Record: `tmp/imagegen/era-04-void-first-review/revision-ledger.json`

**Interfaces:**
- Consumes: named `FAIL` fields from the candidate report or later blind/aggregate review.
- Produces: a newly validated complete current candidate set, or a documented stop.

- [ ] **Step 1: Record every failure before changing a prompt**

Create `revision-ledger.json` with an empty JSON array:

```json
[]
```

For every failed building, append an object conforming to this exact type:

```typescript
interface RevisionEntry {
  readonly round: 1 | 2;
  readonly out:
    | "pol-1-stonecutters-shop.png"
    | "pol-2-barracks.png"
    | "pol-3-customs-house.png"
    | "pol-4-wine-cellars.png"
    | "pol-8-surveyors-shop.png"
    | "townhall-classical-senate-house.png"
    | "civic-grain-dock.png"
    | "civic-cottages.png"
    | "civic-baths.png"
    | "civic-fountain.png";
  readonly binary_rule:
    | "silhouette-plan"
    | "roof-geometry"
    | "structural-system"
    | "thumbnail-read"
    | "regression-ban"
    | "blind-sort";
  readonly observed_failure: string;
  readonly legal_alternative: string;
  readonly scope: "selective" | "shared-all-ten";
}
```

`observed_failure` quotes what the rendered frame shows; `legal_alternative` quotes the corresponding approved section-5 requirement. Reject any entry that changes an ID, name, role, mass, footprint, price, contribution, relative height position, palette, camera, or contain-fit rule.

- [ ] **Step 2: Choose exactly one redo branch**

Use the following decision table without discretion:

**Selective branch:** use only when one or two Era 4 images fail and every field for the other eight or nine buildings is `PASS`.

1. Keep every passing image in `current/`.
2. Move each failed image, preserving its canonical basename, into
   `tmp/imagegen/era-04-void-first-candidates/rejected/round-01/` for the first
   prompt revision or `round-02/` for the second.
3. Revise only the failed building's README prompt-body sentence, naming the observed failure and legal alternative in the same sentence.
4. Regenerate the JSONL with `build.py`; run `build.py --check` and all six prompt-contract tests.
5. Use the built-in image generator once for each failed canonical basename and place the returned replacement back in `current/`.
6. Validate all ten, not only the replacements.
7. Rebuild both full 21-image sheets.
8. Repeat both reviewers' entire RGB and grayscale classifications if blind review had already begun. A prior pass does not transfer to a changed sheet.

**Shared all-ten branch:** use when any one of these exact conditions occurs:

- three or more Era 4 images are misclassified by either reviewer;
- any Era 4 image gains a broad hip, exterior dome, Renaissance palazzo façade, or shallow arcade screen from a shared prompt clause;
- the open-versus-enclosed, skyline, roof-geometry, or structural-system aggregate rule fails;
- colour passes but grayscale fails for more than one image.

For the shared branch:

1. Move all ten current images together to `rejected/round-01/` for the first shared
   prompt revision or `rejected/round-02/` for the second, preserving canonical
   basenames.
2. Revise the shared README source clause that caused the failure.
3. Regenerate and validate the JSONL.
4. Generate all ten again with the built-in image tool.
5. Validate all ten names/dimensions/hashes.
6. Rebuild both complete sheets and repeat every per-building, aggregate, and blind review.

- [ ] **Step 3: Enforce the two-revision stop**

Before each built-in generation call, count prior ledger entries for the same `out` and `binary_rule`.

- First failed revision: one replacement generation is allowed.
- Second failed revision: one second replacement generation is allowed.
- If that second replacement fails the same binary rule, stop image generation and return to the approved design record.
- There is no third blind rerender.

Record the stop in the report as `FAIL`, not `NOT DONE`, and do not install.

- [ ] **Step 4: Enforce contract-violation stop**

Stop immediately if satisfying the art appears to require changing an ID, display name, mass, role, footprint, price, contribution, relative height position, palette, camera, runtime placement, or contain-fit rule. These are non-goals, not alternate redo strategies.

- [ ] **Step 5: Re-run the complete candidate gate after every redo**

Run, in order:

```bash
python3 tmp/imagegen/era-04-void-first-prompts/build.py --check
npx vitest run test/era04VoidFirstPromptContract.test.ts
python3 tmp/imagegen/era-04-void-first-review/validate_assets.py \
  --images-dir tmp/imagegen/era-04-void-first-candidates/current \
  --jsonl output/imagegen/era-04-classical-building-briefs/era04-classical-concepts.jsonl \
  --baseline tmp/imagegen/era-04-void-first-review/baseline-era04-sha256.txt \
  --manifest tmp/imagegen/era-04-void-first-review/candidate-manifest.json
python3 tmp/imagegen/era-04-void-first-review/build_contact_sheets.py \
  --era4-dir tmp/imagegen/era-04-void-first-candidates/current \
  --out-dir tmp/imagegen/era-04-void-first-review \
  --prefix candidate
```

Expected: prompt builder current; one test file/six tests pass; ten files validate; sheets report 21 images and the fixed seed.

- [ ] **Step 6: Commit prompt corrections only with explicit execution-time authorization**

After the corrected candidate set passes, and only if authorization is granted:

```bash
git add output/imagegen/era-04-classical-building-briefs/README.md \
  output/imagegen/era-04-classical-building-briefs/era04-classical-concepts.jsonl
git commit -m "$(cat <<'EOF'
fix: tighten Era 4 concept prompts
EOF
)"
```

Expected if authorized: source prompt changes only. Never stage temporary candidates or evidence. Otherwise skip this step.

## Task 9: Run Two Independent Blind Sorts and the Six Aggregate Rules

**Files:**
- Create: `tmp/imagegen/era-04-void-first-review/score_reviews.py`
- Create: four blind answer files under `tmp/imagegen/era-04-void-first-review/blind/`
- Update: `tmp/imagegen/era-04-void-first-review/review-report.md`

**Interfaces:**
- Consumes: candidate RGB/grayscale sheets, sealed candidate answer key, and two independent reviewers.
- Produces: four complete scored classifications and final candidate-stage aggregate verdicts.

- [ ] **Step 1: Add the blind-answer scorer**

Create `tmp/imagegen/era-04-void-first-review/score_reviews.py` with:

```python
#!/usr/bin/env python3
"""Score complete blind Era 4/Era 6 tile classifications."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

EXPECTED_LABELS = {
    "reviewer-a-rgb",
    "reviewer-a-grayscale",
    "reviewer-b-rgb",
    "reviewer-b-grayscale",
}
VALID_ERAS = {"Era 4", "Era 6"}


def parse_answer_arg(value: str) -> tuple[str, Path]:
    label, separator, raw_path = value.partition("=")
    if not separator:
        raise argparse.ArgumentTypeError("answer must be label=path")
    return label, Path(raw_path)


def read_answers(path: Path) -> dict[int, str]:
    rows = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(rows, list) or len(rows) != 21:
        raise ValueError(f"{path}: expected an array of 21 answers")
    answers: dict[int, str] = {}
    for row in rows:
        if set(row) != {"tile", "era"}:
            raise ValueError(f"{path}: each answer needs exactly tile and era")
        tile = row["tile"]
        era = row["era"]
        if not isinstance(tile, int) or tile < 1 or tile > 21:
            raise ValueError(f"{path}: invalid tile {tile}")
        if era not in VALID_ERAS:
            raise ValueError(f"{path}: invalid era {era!r}")
        if tile in answers:
            raise ValueError(f"{path}: duplicate tile {tile}")
        answers[tile] = era
    if set(answers) != set(range(1, 22)):
        raise ValueError(f"{path}: answers must cover tiles 1 through 21")
    return answers


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--key", type=Path, required=True)
    parser.add_argument(
        "--answer",
        action="append",
        type=parse_answer_arg,
        required=True,
    )
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    supplied = dict(args.answer)
    if len(args.answer) != 4 or len(supplied) != 4 or set(supplied) != EXPECTED_LABELS:
        raise ValueError(
            f"answer labels must be {sorted(EXPECTED_LABELS)}, got {sorted(supplied)}"
        )
    key_rows = json.loads(args.key.read_text(encoding="utf-8"))
    if len(key_rows) != 21:
        raise ValueError(f"{args.key}: expected 21 key rows")
    key = {row["tile"]: row["era"] for row in key_rows}
    if set(key) != set(range(1, 22)):
        raise ValueError(f"{args.key}: key must cover tiles 1 through 21")

    results: list[dict[str, object]] = []
    all_pass = True
    for label in sorted(EXPECTED_LABELS):
        answers = read_answers(supplied[label])
        misses = [
            {
                "tile": tile,
                "expected": key[tile],
                "actual": answers[tile],
            }
            for tile in range(1, 22)
            if answers[tile] != key[tile]
        ]
        score = 21 - len(misses)
        passed = score == 21
        all_pass = all_pass and passed
        results.append(
            {
                "label": label,
                "score": score,
                "total": 21,
                "passed": passed,
                "misses": misses,
            }
        )
        print(f"{label}: {score}/21 {'PASS' if passed else 'FAIL'}")

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")
    if not all_pass:
        raise SystemExit("blind-sort gate failed")
    print("blind-sort gate: 21/21 on all four classifications")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Collect reviewer A without exposing the key**

Give reviewer A only `candidate-rgb.png` and this instruction:

```text
Classify every numbered tile as exactly "Era 4" or "Era 6". Return one JSON array
of 21 objects, each with exactly {"tile": number, "era": "Era 4" or "Era 6"},
in tile order. Do not include confidence, filenames, building names, or explanations.
```

Save the locked response to `blind/reviewer-a-rgb.json`. Then give reviewer A only `candidate-grayscale.png` with the same instruction and save `blind/reviewer-a-grayscale.json`. Do not show reviewer A the answer key or reviewer B's answers.

- [ ] **Step 3: Collect reviewer B independently**

Repeat Step 2 with a different reviewer who has not seen reviewer A's answers. Save `blind/reviewer-b-rgb.json` and `blind/reviewer-b-grayscale.json`. Do not show reviewer B the answer key or reviewer A's answers.

- [ ] **Step 4: Score only after all four answer files are locked**

Run:

```bash
python3 tmp/imagegen/era-04-void-first-review/score_reviews.py \
  --key tmp/imagegen/era-04-void-first-review/candidate-answer-key.json \
  --answer reviewer-a-rgb=tmp/imagegen/era-04-void-first-review/blind/reviewer-a-rgb.json \
  --answer reviewer-a-grayscale=tmp/imagegen/era-04-void-first-review/blind/reviewer-a-grayscale.json \
  --answer reviewer-b-rgb=tmp/imagegen/era-04-void-first-review/blind/reviewer-b-rgb.json \
  --answer reviewer-b-grayscale=tmp/imagegen/era-04-void-first-review/blind/reviewer-b-grayscale.json \
  --out tmp/imagegen/era-04-void-first-review/candidate-blind-scores.json
```

Expected:

```text
reviewer-a-grayscale: 21/21 PASS
reviewer-a-rgb: 21/21 PASS
reviewer-b-grayscale: 21/21 PASS
reviewer-b-rgb: 21/21 PASS
blind-sort gate: 21/21 on all four classifications
```

One wrong tile is a failed blind-sort rule. If the miss is an Era 4 tile, apply Task 8's exact selective/shared criteria. If the miss is only an Era 6 tile, stop and report the blind-sort failure; Era 6 redesign is outside this unit.

- [ ] **Step 5: Fill both classification fields for all ten Era 4 report items**

Using the sealed key and four answer files after scoring:

- set a building's colour field to `PASS` only if both reviewers classified its RGB tile correctly;
- set its grayscale field to `PASS` only if both reviewers classified its grayscale tile correctly;
- otherwise set the field to `FAIL` and name reviewer/tile evidence.

With the required four 21/21 scores, all twenty classification fields become `PASS`.
Copy these four scorer lines verbatim into the report:

```text
reviewer-a-rgb: 21/21 PASS
reviewer-a-grayscale: 21/21 PASS
reviewer-b-rgb: 21/21 PASS
reviewer-b-grayscale: 21/21 PASS
```

- [ ] **Step 6: Evaluate the six aggregate rules in order**

Use the uncropped candidate sources plus both full 21-image sheets:

1. **Skyline:** count one and only one Era 4 narrow high-rise; count zero Era 4 exterior domes/drums/lanterns/cupolas/turrets/regular chimney rhythms; verify Era 6 still visibly has the two domed halls and City Hall crown.
2. **Open-versus-enclosed:** inspect the seven named Era 4 plots for one continuous functional open region at least one-third of plan, and count no more than three Era 6 plots meeting the same threshold.
3. **Roof geometry:** inspect all ten Era 4 roofs against their exact section-5 treatment; reject any broad hip or one cap spanning a whole 2×2/3×2 plot.
4. **Structural system:** inspect every exposed Era 4 support row and visible arch; reject any shallow arcade screen.
5. **Street wall:** verify zero uninterrupted regular three-storey Era 4 façades, the notched unequal dwelling, and at least three visibly regular wall-first Era 6 multi-storey blocks.
6. **Blind sort:** copy the four exact 21/21 scores from `candidate-blind-scores.json`.

Change each aggregate verdict to `PASS` or `FAIL` and add one evidence sentence. Any `NOT DONE` prevents installation.

- [ ] **Step 7: Apply the candidate acceptance gate**

Advance only when:

- all seventy per-building fields are `PASS`;
- all six aggregate rules are `PASS`;
- both reviewers are 21/21 on both sheets;
- the runtime line remains the required future-only `NOT DONE`.

There is no commit in this task; reviewer answers, keys, scores, and report remain temporary evidence.

## Task 10: Stage and Install the Complete Canonical Set

**Files:**
- Create: `tmp/imagegen/era-04-void-first-review/install_set.py`
- Create/move during swap: `tmp/imagegen/era-04-void-first-install/staged-canonical/`
- Move during swap: `tmp/imagegen/era-04-void-first-install/rollback-canonical/`
- Replace as one directory set: `output/imagegen/era-04-classical-building-briefs/`

**Interfaces:**
- Consumes: accepted current candidates, canonical README/JSONL, candidate manifest, and fully passing report.
- Produces: one canonical directory containing the same README/JSONL and all ten accepted PNGs, with the prior complete directory available for all-ten rollback.

- [ ] **Step 1: Add a rollback-safe whole-directory installer**

Create `tmp/imagegen/era-04-void-first-review/install_set.py` with:

```python
#!/usr/bin/env python3
"""Prepare and swap the complete Era 4 canonical image directory."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
from pathlib import Path

CANONICAL_NAME = "era-04-classical-building-briefs"
README_NAME = "README.md"
JSONL_NAME = "era04-classical-concepts.jsonl"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_outs(jsonl: Path) -> list[str]:
    rows = [
        json.loads(line)
        for line in jsonl.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    outs = [row["out"] for row in rows]
    if len(outs) != 10 or len(set(outs)) != 10:
        raise ValueError("canonical JSONL must name 10 distinct outputs")
    if any(Path(out).name != out for out in outs):
        raise ValueError("every canonical out must be a basename")
    return outs


def exact_files(directory: Path, names: list[str]) -> None:
    allowed = {README_NAME, JSONL_NAME, *names}
    actual = {path.name for path in directory.iterdir() if path.is_file()}
    if actual != allowed:
        raise ValueError(
            f"{directory}: file census mismatch; "
            f"missing={sorted(allowed - actual)} extra={sorted(actual - allowed)}"
        )
    unexpected_dirs = [path.name for path in directory.iterdir() if path.is_dir()]
    if unexpected_dirs:
        raise ValueError(f"{directory}: unexpected subdirectories {unexpected_dirs}")


def manifest(directory: Path, names: list[str]) -> dict[str, str]:
    exact_files(directory, names)
    return {
        name: sha256(directory / name)
        for name in [README_NAME, JSONL_NAME, *names]
    }


def prepare(
    canonical: Path,
    candidates: Path,
    install_root: Path,
    manifest_path: Path,
) -> None:
    stage = install_root / "staged-canonical"
    rollback = install_root / "rollback-canonical"
    if stage.exists() or rollback.exists():
        raise ValueError(
            "staged-canonical or rollback-canonical already exists; inspect the prior "
            "attempt instead of overwriting evidence"
        )
    names = read_outs(canonical / JSONL_NAME)
    exact_files(canonical, names)
    candidate_names = {path.name for path in candidates.glob("*.png")}
    if candidate_names != set(names):
        raise ValueError(
            f"candidate census mismatch; missing={sorted(set(names) - candidate_names)} "
            f"extra={sorted(candidate_names - set(names))}"
        )
    install_root.mkdir(parents=True, exist_ok=True)
    stage.mkdir()
    shutil.copy2(canonical / README_NAME, stage / README_NAME)
    shutil.copy2(canonical / JSONL_NAME, stage / JSONL_NAME)
    for name in names:
        shutil.copy2(candidates / name, stage / name)
    stage_manifest = manifest(stage, names)
    candidate_hashes = {name: sha256(candidates / name) for name in names}
    for name in names:
        if stage_manifest[name] != candidate_hashes[name]:
            raise ValueError(f"{name}: staged bytes differ from accepted candidate")
    record = {
        "canonical": str(canonical),
        "stage": str(stage),
        "rollback": str(rollback),
        "files": stage_manifest,
    }
    manifest_path.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    print("prepared complete staged directory: 10 PNGs + README + JSONL")
    print(f"wrote {manifest_path}")


def install(
    canonical: Path,
    install_root: Path,
    manifest_path: Path,
) -> None:
    stage = install_root / "staged-canonical"
    rollback = install_root / "rollback-canonical"
    if not stage.is_dir():
        raise ValueError("staged-canonical is missing")
    if rollback.exists():
        raise ValueError("rollback-canonical already exists")
    record = json.loads(manifest_path.read_text(encoding="utf-8"))
    names = read_outs(stage / JSONL_NAME)
    current_manifest = manifest(stage, names)
    if current_manifest != record["files"]:
        raise ValueError("staged directory changed after acceptance")
    if canonical.parent.resolve() != (install_root.parents[2] / "output/imagegen").resolve():
        raise ValueError("canonical path is not the Era 4 output/imagegen directory")

    os.replace(canonical, rollback)
    try:
        os.replace(stage, canonical)
    except BaseException:
        os.replace(rollback, canonical)
        raise
    print("installed complete ten-image set")
    print(f"prior complete directory retained at {rollback}")


def main() -> None:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)
    for name in ("prepare", "install"):
        command = subparsers.add_parser(name)
        command.add_argument("--canonical", type=Path, required=True)
        command.add_argument("--install-root", type=Path, required=True)
        command.add_argument("--manifest", type=Path, required=True)
        if name == "prepare":
            command.add_argument("--candidates", type=Path, required=True)
    args = parser.parse_args()

    canonical = args.canonical.resolve()
    install_root = args.install_root.resolve()
    manifest_path = args.manifest.resolve()
    if canonical.name != CANONICAL_NAME:
        raise ValueError(f"canonical directory must be named {CANONICAL_NAME}")
    if args.command == "prepare":
        prepare(canonical, args.candidates.resolve(), install_root, manifest_path)
    else:
        install(canonical, install_root, manifest_path)


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Re-run every pre-install gate**

Run:

```bash
python3 tmp/imagegen/era-04-void-first-prompts/build.py --check
npx vitest run test/era04VoidFirstPromptContract.test.ts
python3 tmp/imagegen/era-04-void-first-review/validate_assets.py \
  --images-dir tmp/imagegen/era-04-void-first-candidates/current \
  --jsonl output/imagegen/era-04-classical-building-briefs/era04-classical-concepts.jsonl \
  --baseline tmp/imagegen/era-04-void-first-review/baseline-era04-sha256.txt \
  --manifest tmp/imagegen/era-04-void-first-review/candidate-manifest.json
```

Expected: builder current; six tests pass; ten accepted candidates validate. Read `review-report.md` and confirm all candidate fields/rules are `PASS` except the required runtime `NOT DONE`.

- [ ] **Step 3: Prepare the complete staged directory without touching canonical art**

Run:

```bash
python3 tmp/imagegen/era-04-void-first-review/install_set.py prepare \
  --canonical output/imagegen/era-04-classical-building-briefs \
  --candidates tmp/imagegen/era-04-void-first-candidates/current \
  --install-root tmp/imagegen/era-04-void-first-install \
  --manifest tmp/imagegen/era-04-void-first-review/install-manifest.json
```

Expected:

```text
prepared complete staged directory: 10 PNGs + README + JSONL
wrote .../install-manifest.json
```

Inspect the manifest: 12 exact file entries, no alternate basename, and each staged PNG hash equals its accepted candidate hash.

- [ ] **Step 4: Install by whole-directory swap**

Run:

```bash
python3 tmp/imagegen/era-04-void-first-review/install_set.py install \
  --canonical output/imagegen/era-04-classical-building-briefs \
  --install-root tmp/imagegen/era-04-void-first-install \
  --manifest tmp/imagegen/era-04-void-first-review/install-manifest.json
```

Expected:

```text
installed complete ten-image set
prior complete directory retained at .../rollback-canonical
```

At no point is a partial old/new image mixture present in the canonical directory. Do not remove the rollback directory until Task 11 passes.

- [ ] **Step 5: Validate the installed canonical directory immediately**

Run:

```bash
python3 tmp/imagegen/era-04-void-first-review/validate_assets.py \
  --images-dir output/imagegen/era-04-classical-building-briefs \
  --jsonl output/imagegen/era-04-classical-building-briefs/era04-classical-concepts.jsonl \
  --baseline tmp/imagegen/era-04-void-first-review/baseline-era04-sha256.txt \
  --manifest tmp/imagegen/era-04-void-first-review/installed-manifest.json
```

Expected: ten exact canonical names, 1024×1024, ten unique hashes, and every installed PNG differs from its baseline counterpart.

Do not commit generated binaries. Separate explicit authorization is required even if other source commits were authorized.

## Task 11: Rebuild and Re-review From Installed Canonical Paths

**Files:**
- Create: installed sheets/key/manifest under `tmp/imagegen/era-04-void-first-review/`
- Create: four new installed blind answer files under `installed-blind/`
- Update: `tmp/imagegen/era-04-void-first-review/review-report.md`
- Conditionally modify: temporary `install_set.py` to expose all-ten rollback

**Interfaces:**
- Consumes: the newly installed canonical directory.
- Produces: current-path hash equality, rebuilt sheets, a second independent four-file blind gate, and rollback or acceptance.

- [ ] **Step 1: Prove every installed PNG is the accepted candidate byte-for-byte**

Run:

```bash
python3 - <<'PY'
import json
from pathlib import Path

candidate = {
    row["out"]: row["sha256"]
    for row in json.loads(
        Path(
            "tmp/imagegen/era-04-void-first-review/candidate-manifest.json"
        ).read_text()
    )
}
installed = {
    row["out"]: row["sha256"]
    for row in json.loads(
        Path(
            "tmp/imagegen/era-04-void-first-review/installed-manifest.json"
        ).read_text()
    )
}
assert installed == candidate, "installed set differs from accepted candidate set"
print("installed hashes equal accepted candidates: 10/10")
PY
```

Expected: `installed hashes equal accepted candidates: 10/10`.

- [ ] **Step 2: Rebuild both sheets from canonical paths**

Run:

```bash
python3 tmp/imagegen/era-04-void-first-review/build_contact_sheets.py \
  --era4-dir output/imagegen/era-04-classical-building-briefs \
  --out-dir tmp/imagegen/era-04-void-first-review \
  --prefix installed
```

Expected: 21 images, fixed seed, 128×128, identical order, and six `installed-*` outputs including the ten-image Era 4 contact sheet.

- [ ] **Step 3: Prove deterministic candidate/installed sheet equality**

Run:

```bash
python3 - <<'PY'
import hashlib
from pathlib import Path

folder = Path("tmp/imagegen/era-04-void-first-review")
for mode in ("rgb", "grayscale"):
    candidate = hashlib.sha256((folder / f"candidate-{mode}.png").read_bytes()).hexdigest()
    installed = hashlib.sha256((folder / f"installed-{mode}.png").read_bytes()).hexdigest()
    assert candidate == installed, f"{mode} sheet changed after installation"
    print(f"{mode}: installed sheet equals accepted candidate sheet")
PY
```

Expected:

```text
rgb: installed sheet equals accepted candidate sheet
grayscale: installed sheet equals accepted candidate sheet
```

Hash equality does not replace the required second blind review; it proves the review is looking at the installed bytes.

- [ ] **Step 4: Repeat blind review with two fresh independent reviewers**

Give the fresh reviewers only `installed-rgb.png` and then `installed-grayscale.png`, using Task 9's exact JSON-answer instruction. Save:

- `installed-blind/reviewer-a-rgb.json`
- `installed-blind/reviewer-a-grayscale.json`
- `installed-blind/reviewer-b-rgb.json`
- `installed-blind/reviewer-b-grayscale.json`

Neither reviewer sees `installed-answer-key.json`, candidate-stage answers, or the other reviewer's answers.

- [ ] **Step 5: Score the installed classifications**

Run:

```bash
python3 tmp/imagegen/era-04-void-first-review/score_reviews.py \
  --key tmp/imagegen/era-04-void-first-review/installed-answer-key.json \
  --answer reviewer-a-rgb=tmp/imagegen/era-04-void-first-review/installed-blind/reviewer-a-rgb.json \
  --answer reviewer-a-grayscale=tmp/imagegen/era-04-void-first-review/installed-blind/reviewer-a-grayscale.json \
  --answer reviewer-b-rgb=tmp/imagegen/era-04-void-first-review/installed-blind/reviewer-b-rgb.json \
  --answer reviewer-b-grayscale=tmp/imagegen/era-04-void-first-review/installed-blind/reviewer-b-grayscale.json \
  --out tmp/imagegen/era-04-void-first-review/installed-blind-scores.json
```

Expected: all four classifications report `21/21 PASS`, followed by the all-four gate line.

- [ ] **Step 6: Repeat current-path form and aggregate review**

Open the installed individual PNGs and both installed sheets. For each numbered building, add an installed-path evidence sentence that names:

- the canonical source path;
- equality with its accepted candidate hash;
- the rendered plan/silhouette, roof, structure, thumbnail detail and regression-ban verdict;
- both installed RGB and grayscale reviewer verdicts.

Repeat all six aggregate rules against installed sheets. Candidate-stage verdicts do not certify installation.

- [ ] **Step 7: Add an all-ten rollback command before deciding**

Add this function to `install_set.py`:

```python
def rollback(canonical: Path, install_root: Path) -> None:
    prior = install_root / "rollback-canonical"
    failed = install_root / "failed-installed"
    if not prior.is_dir():
        raise ValueError("rollback-canonical is missing")
    if failed.exists():
        raise ValueError("failed-installed already exists")
    os.replace(canonical, failed)
    try:
        os.replace(prior, canonical)
    except BaseException:
        os.replace(failed, canonical)
        raise
    print("restored the complete prior canonical directory")
    print(f"failed installed set retained at {failed}")
```

Replace the existing command-loop and final dispatch with:

```python
for name in ("prepare", "install", "rollback"):
    command = subparsers.add_parser(name)
    command.add_argument("--canonical", type=Path, required=True)
    command.add_argument("--install-root", type=Path, required=True)
    command.add_argument("--manifest", type=Path, required=True)
    if name == "prepare":
        command.add_argument("--candidates", type=Path, required=True)

if args.command == "prepare":
    prepare(canonical, args.candidates.resolve(), install_root, manifest_path)
elif args.command == "install":
    install(canonical, install_root, manifest_path)
else:
    rollback(canonical, install_root)
```

- [ ] **Step 8: Roll back all ten together if any installed-path gate fails**

Run only on failure:

```bash
python3 tmp/imagegen/era-04-void-first-review/install_set.py rollback \
  --canonical output/imagegen/era-04-classical-building-briefs \
  --install-root tmp/imagegen/era-04-void-first-install \
  --manifest tmp/imagegen/era-04-void-first-review/install-manifest.json
```

Expected: the complete prior canonical directory is restored and the failed installed set moves wholly under temporary evidence. Then:

1. validate that all ten restored hashes equal `baseline-era04-sha256.txt`;
2. move any noncanonical duplicate out of the canonical folder into the failed temporary directory;
3. correct and re-review the complete candidate set before another installation;
4. never restore only one image.

- [ ] **Step 9: Remove the prior rollback directory only after every installed gate passes**

After current-path ten-item review, all six aggregate rules, hash equality and all four 21/21 blind classifications pass:

```bash
python3 - <<'PY'
import shutil
from pathlib import Path

path = Path(
    "tmp/imagegen/era-04-void-first-install/rollback-canonical"
).resolve()
expected = (
    Path("tmp/imagegen/era-04-void-first-install").resolve()
    / "rollback-canonical"
)
assert path == expected and path.is_dir()
shutil.rmtree(path)
print("removed verified prior rollback directory")
PY
```

Expected: only the installed canonical directory remains authoritative; temporary candidates and sheets remain evidence, not alternate canonical sources.

Do not commit generated binaries without separate explicit authorization.

## Task 12: Run Final Validation and Close the Numbered Report

**Files:**
- Verify: both Era 4 guides, README, JSONL, prompt guard, ten canonical PNGs
- Finalize: `tmp/imagegen/era-04-void-first-review/review-report.md`
- Read only: installed sheets, manifests, keys, and blind scores

**Interfaces:**
- Consumes: installed, re-reviewed canonical set and all evidence.
- Produces: exact source/tool validation output and a complete item-by-item report with only the required runtime `NOT DONE`.

- [ ] **Step 1: Run source formatting and type validation**

Run:

```bash
npx biome check test/era04VoidFirstPromptContract.test.ts
npm run typecheck
```

Expected: Biome reports the new test checked with no diagnostics; TypeScript exits 0. Markdown and `output/**` are outside Biome's meaningful coverage, so do not cite the Biome result as evidence about guide/README/JSONL prose.

- [ ] **Step 2: Run targeted and full unit tests**

Run:

```bash
npx vitest run test/era04VoidFirstPromptContract.test.ts
npm run test:unit
```

Expected: targeted result is one file and six passing tests; the full unit suite exits 0 with no failed test file.

- [ ] **Step 3: Run canonical prompt and image validation**

Run:

```bash
python3 tmp/imagegen/era-04-void-first-prompts/build.py --check
python3 tmp/imagegen/era-04-void-first-review/validate_assets.py \
  --images-dir output/imagegen/era-04-classical-building-briefs \
  --jsonl output/imagegen/era-04-classical-building-briefs/era04-classical-concepts.jsonl \
  --baseline tmp/imagegen/era-04-void-first-review/baseline-era04-sha256.txt \
  --manifest tmp/imagegen/era-04-void-first-review/final-canonical-manifest.json
```

Expected:

```text
validated 10 lines, 10 distinct outputs; canonical JSONL is current
validated 10 files, 10 names, 1024x1024, 10 unique nonbaseline hashes
wrote .../final-canonical-manifest.json
```

- [ ] **Step 4: Re-run the installed blind scorer**

Run Task 11 Step 5 again, unchanged.

Expected: all four installed classifications are 21/21 and the all-four gate passes.

- [ ] **Step 5: Check exact source-file whitespace and final newlines**

Run:

```bash
python3 - <<'PY'
from pathlib import Path

paths = [
    Path("docs/superpowers/specs/eras/era-04-classical/style-guide.md"),
    Path("docs/superpowers/specs/eras/era-04-classical/civic-buildings.md"),
    Path("output/imagegen/era-04-classical-building-briefs/README.md"),
    Path(
        "output/imagegen/era-04-classical-building-briefs/"
        "era04-classical-concepts.jsonl"
    ),
    Path("test/era04VoidFirstPromptContract.test.ts"),
]
for path in paths:
    source = path.read_text(encoding="utf-8")
    assert source.endswith("\n"), f"{path}: missing final newline"
    trailing = [
        number
        for number, line in enumerate(source.splitlines(), 1)
        if line.endswith((" ", "\t"))
    ]
    assert not trailing, f"{path}: trailing whitespace on lines {trailing}"
print("source whitespace: 5/5 PASS")
PY
```

Expected: `source whitespace: 5/5 PASS`.

- [ ] **Step 6: Complete the report and assert its shape**

For each of the ten numbered items, retain the evidence type before the verdict and ensure all seven fields are `PASS`, with installed-path evidence. Then retain all six aggregate rules as `PASS`, the four exact installed blind scores, candidate/installed manifest paths, and the exact runtime line.

Run:

```bash
python3 - <<'PY'
from pathlib import Path

path = Path("tmp/imagegen/era-04-void-first-review/review-report.md")
source = path.read_text(encoding="utf-8")
assert source.count("Evidence type:") == 10
assert source.count("## Aggregate six-rule report") == 1
assert ": **NOT DONE**" not in source
assert "**FAIL**" not in source
assert source.count(": **PASS**") >= 76
required = (
    "**Runtime 1024×580 city-frame verification: NOT DONE — Era 4 and Era 6 "
    "per-node runtime art is not wired.**"
)
normalized = " ".join(
    line.removeprefix("> ").strip()
    for line in source.splitlines()
)
assert required in normalized
for score in (
    "reviewer-a-rgb: 21/21 PASS",
    "reviewer-a-grayscale: 21/21 PASS",
    "reviewer-b-rgb: 21/21 PASS",
    "reviewer-b-grayscale: 21/21 PASS",
):
    assert score in source
print("final report shape: 10 items, 6 rules, 4 perfect scores, runtime NOT DONE")
PY
```

Expected:

```text
final report shape: 10 items, 6 rules, 4 perfect scores, runtime NOT DONE
```

The runtime line is not a skipped concept-art check. It is the explicit future-only gate because runtime GLBs are not wired; no runtime frame is captured in this unit.

- [ ] **Step 7: Audit scope without disturbing concurrent work**

Run:

```bash
git status --short -- \
  docs/superpowers/specs/eras/era-04-classical/style-guide.md \
  docs/superpowers/specs/eras/era-04-classical/civic-buildings.md \
  output/imagegen/era-04-classical-building-briefs/README.md \
  output/imagegen/era-04-classical-building-briefs/era04-classical-concepts.jsonl \
  output/imagegen/era-04-classical-building-briefs/pol-1-stonecutters-shop.png \
  output/imagegen/era-04-classical-building-briefs/pol-2-barracks.png \
  output/imagegen/era-04-classical-building-briefs/pol-3-customs-house.png \
  output/imagegen/era-04-classical-building-briefs/pol-4-wine-cellars.png \
  output/imagegen/era-04-classical-building-briefs/pol-8-surveyors-shop.png \
  output/imagegen/era-04-classical-building-briefs/townhall-classical-senate-house.png \
  output/imagegen/era-04-classical-building-briefs/civic-grain-dock.png \
  output/imagegen/era-04-classical-building-briefs/civic-cottages.png \
  output/imagegen/era-04-classical-building-briefs/civic-baths.png \
  output/imagegen/era-04-classical-building-briefs/civic-fountain.png \
  test/era04VoidFirstPromptContract.test.ts
```

Expected: only the files authorized by this plan appear in the scoped status. Do not infer repository-wide cleanliness from this scoped command.

- [ ] **Step 8: Commit source files only with explicit execution-time authorization**

If earlier source commits were skipped and explicit authorization is now granted:

```bash
git add \
  docs/superpowers/specs/eras/era-04-classical/style-guide.md \
  docs/superpowers/specs/eras/era-04-classical/civic-buildings.md \
  output/imagegen/era-04-classical-building-briefs/README.md \
  output/imagegen/era-04-classical-building-briefs/era04-classical-concepts.jsonl \
  test/era04VoidFirstPromptContract.test.ts
git diff --cached --check
git commit -m "$(cat <<'EOF'
feat: establish void-first Classical concept art
EOF
)"
```

Expected if authorized: one source-only commit and a successful staged whitespace check. Do not add generated PNGs, temporary candidates, scripts, sheets, answer keys, scores, or reports without their own explicit authorization. Otherwise skip this step.

- [ ] **Step 9: Do not push or merge**

This plan authorizes neither operation. Report the final source commit SHA only if an authorized commit was actually created.

## Spec-to-Task Coverage

- Decision/problem and grayscale massing distinction: Global Constraints; Tasks 2, 4, 7, 9.
- Scope, non-goals, frozen contracts and complete height order: Global Constraints; Tasks 2-3.
- Era-wide measurement vocabulary and six aggregate properties: Tasks 2, 4, 7, 9, 12.
- Ten shared prompt rules and legal alternatives: Tasks 1, 4, 5.
- Complete five-skill/one-hub/four-civic census: Tasks 1-5, with one canonical row per output.
- Cross-era collision checks: Task 2 collision boundaries; Task 9 21-image review.
- Authority order, exact JSONL census and canonical-folder policy: Tasks 4-6 and 10.
- Deterministic 21-image RGB/grayscale evidence and two independent reviewers: Tasks 1, 7, 9, 11.
- Numbered per-building report, six-rule report and runtime future gate: Tasks 7, 9, 11, 12.
- Rollout order, selective/all-ten redo, two-revision stop and all-ten rollback: Tasks 1-12 in order; Tasks 8, 10, 11 explicitly.
- Unresolved design questions: none are reopened by this plan.

## Plan Self-Review

1. **Spec coverage:** PASS — every approved section maps to a named task above.
2. **Unfinished-marker scan:** PASS — every authored step contains concrete prose, code, command, decision rule, or runtime evidence source.
3. **Change-snippet completeness:** PASS — the guard and all temporary scripts are complete; guide/README replacements contain exact source text.
4. **Name/type/path consistency:** PASS — canonical basenames, `PromptRow`, README markers, builder paths, sheet prefixes and report paths agree across tasks.
5. **Census/rule completeness:** PASS — five skills, one hub and four civics are present; skyline, open-versus-enclosed, roof geometry, structural system, street wall and blind sort are all gated.
6. **Scope:** PASS — this is one implementation plan for the approved Era 4 documentation, prompts, concept images and evidence; runtime wiring and unrelated work remain outside it.

## Execution Handoff

Plan execution has two permitted modes after separate authorization:

1. **Subagent-Driven (recommended)** — use `superpowers:subagent-driven-development`, one fresh worker per task with review between tasks.
2. **Inline Execution** — use `superpowers:executing-plans`, execute in batches with review checkpoints.

No execution, commit, push, or merge is authorized by this plan.
