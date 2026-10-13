---
name: era-building-briefs
description: Generates an image-generation brief for one era's buildings — a short theme brief that summarises the era, then one description per building, covering the era's own skill buildings, the Town Hall hub and the four civic buildings. Reads that era's style-guide.md and civic-buildings.md so every name and constraint comes from the files rather than from memory. Use when asked to write, refresh or extend art briefs for an era's buildings, or to prepare prompts for output/imagegen/.
disable-model-invocation: true
---

# Era building briefs

Turns one era's two design documents into something an artist can generate from: **one theme
brief that fixes the era**, then **one description per building**.

**The theme brief is not garnish.** It is a short paragraph the artist reads once, and it
exists so that every building description below can inherit the era's materials, palette,
structural vocabulary and signature move instead of restating them. Write it first and keep
the building descriptions free of anything it already says.

## Scope: which buildings an era owes

| Class | Which ones | Where they are listed |
| --- | --- | --- |
| **Skill buildings** | **Only the era's OWN new nodes.** | `style-guide.md` roster table |
| **The hub** (`town-hall`) | **Always.** It is the one building that rethemes every era | `style-guide.md` masses section |
| **Civic buildings** | The four bought types | `civic-buildings.md` catalogue table |

**Do not brief the masses an era inherits.** Since the 2026-07-29 re-dressing ruling a skill
building is drawn once and keeps that look for the whole run, so era one's six are era one's
forever and no later era re-dresses them. A later guide's masses section still describes them,
and it is marked REFERENCE ONLY where it does — read it for shape language, never as a list of
things to draw. Era one is the exception that proves it: it introduces all six masses, so for
era one alone the masses section *is* the roster.

## Step 1 — find the sections by their heading TEXT, never by number

**The section numbers drift and the guides do not share them.** Era one runs §0 constraints,
§1 one line, §2 Materials, §3 Structural language, §4 Palette, §5 Ornament, §6 the masses, §7
construction stages, §8 props. **Eras two through ten drop §0, renumber Ornament to §4, pull
the palette out of the numbered sequence entirely, and land the masses at §5, the stages at §6
and the props at §7.** A skill that reaches for "§4 Palette" gets Ornament in nine guides out
of ten.

Glob the folder rather than guessing the slug: `docs/superpowers/specs/eras/era-NN-*/`.

| What the brief needs | Heading to search for |
| --- | --- |
| The era in one line, and its signature move | *The era in one line, and its signature move* |
| Materials, and the explicitly-absent list | *Materials* |
| How buildings stand up, and the height ranking | *Structural language* |
| Body hue and accent | *The era's palette* — or *Palette* in era one |
| Ornament level, and visible technology | *Ornament and visible technology* |
| Per-building detail, and how a pair separates | *The … masses, re-dressed* — or *dressed* in era one |
| This era's own nodes | *The skill buildings this era introduces* |
| The dressing names | *The subtitle row* |
| The four civics | `civic-buildings.md`, *The catalogue* / *catalogue: four types* |

## Step 2 — read era one's §0, whichever era you are briefing

`docs/superpowers/specs/eras/era-01-prehistoric/style-guide.md` **§0 "What this guide has to
produce, and what it must not break"** holds the hard constraints, and **era one is the only
guide that carries them** — the other nine inherit §0 by reference rather than restating it.
Read it every run. Each constraint there is enforced by code or by a ratified decision, so a
brief that breaks one gets rejected by a test or a reviewer rather than by taste.

**Four the brief itself has to respect, and each has a way of going wrong on paper:**

1. **Three-tone shading, one key light.** Top face lightened, the hue on the left, the right
   darkened — and **no runtime lights**. So a brief may not ask for a cast shadow, ambient
   occlusion, a specular highlight, rim light or a gradient, and may not describe a building
   by the light falling on it.
2. **Emitted light is an emissive surface inside that model, never a light added to the
   scene.** A fire, a forge mouth, a lit sign: the surface itself is bright and it lights
   nothing around it. `docs/superpowers/specs/eras/README.md` states this as the decided half
   of the one question still open across the folder.
3. **Footprints are frozen** (INV-ERA-1). Era one set all seven and no era may change which
   cells a building occupies. Take the plot from the guides and design to it. **Height follows
   from proportion, not from plot**: a model is contain-fit by one uniform scale, so the more
   slender of two neighbours is simply the taller one, and a smaller plot shrinks a model
   whole rather than making it look tall. State height as a **ranking** within the era, never
   as a world-unit target.
4. **A building is modelled at its finished stage.** The `built` model is what a brief
   describes — not the `site` or `construction` stage, and not a mastery variant, because
   mastery rides above the building as stars and there is no gilded version. Mastery gold
   `#FFB703` is reserved and may never appear on a body.

Carry the rest of §0 as read: the mesh fills 95% of its footprint span, the 24-unit ceiling,
**every side must read** because the camera orbits a full 360° and there is no hidden back,
silhouette first, **no rebuses** (a building never symbolises its lesson), and nothing carries
meaning by art alone.

## Step 3 — take every name from the files at run time

**Never carry a name in this skill, in a note, or in your head.** Dressing names, roster
dressings and civic names move, and they have moved several times in a single day. Read them
fresh on every run:

- **Mass dressings** — the *subtitle row* table, one proper noun per mass. Era one has no such
  table; its dressing names are the bolded names in its masses section.
- **This era's own nodes** — the roster table, which gives node id, mass, and a one-line
  statement of what the building is in this era.
- **The four civics** — the catalogue table for footprint and role, and the `###` subsection
  under it for the description and materials.

**If a rename is in flight**, use the new name and say plainly in the output that it is
pending and not yet merged, with the old name beside it so the artist can match the brief to
whatever the files say when they read it. Flag a name that is itself unresolved as
provisional, and name the alternative that was considered.

## Step 4 — write the theme brief

One short paragraph, plus a constraint list. It fixes, in this order: **what the era is in one
line**, its **signature move**, its **materials** (and the pointed absences), its **structural
vocabulary**, its **palette**, and its **ornament level**. Then the shading, emissive, footprint
and finished-stage constraints from Step 2, as a short list rather than prose.

Every building below inherits all of it. A building description that repeats the material list
has wasted the theme brief.

## Step 5 — write one description per building

Same shape for every building, so the artist can read them in any order:

- **The name**, with its node id or civic role, and a pending-rename flag if it has one.
- **Footprint** in cells, and what that plot means for the shape.
- **The silhouette in one sentence** — one dominant shape plus one accent, legible at full
  zoom-out.
- **How it stands up**, in the era's structural vocabulary.
- **Materials and ornament**, only from the era's own list.
- **Props** at its foot, from the era's props kit.
- **Its rank in the era's height order**, relative to named neighbours.
- **What it must not resemble.** Name the building it could be confused with and the axis that
  separates them — plan, scale, grain or props, and **never geometry**. Two buildings on one
  plot, and a roster building sharing a mass with a chain instance, both need this.

That last item is what made the era-one set work, and
`output/imagegen/era-01-prehistoric-civic-buildings/README.md` records it as part of what each
asset received: *the required silhouette and the explicit forms it must not resemble*.

## Where the output goes

**`output/imagegen/era-NN-slug-building-briefs/README.md`**, beside the art rather than in the
era folder.

Two reasons, and the first is a convention that would break. **An era folder holds exactly two
documents** — `style-guide.md` and `civic-buildings.md` — which `eras/README.md` states and all
ten folders currently keep. A brief is a third thing and does not belong there. And
`output/imagegen/` already holds per-era folders, each with a `README.md` describing the set
and the art beside it, which is where an artist already looks and where generated images land.

## Traps

- **Section numbers.** Covered in Step 1, and it is the easiest way to brief the wrong section.
- **A guide's own banners.** The guides carry REFERENCE ONLY, WITHDRAWN, CORRECTED and
  SUPERSEDED blocks in place rather than deleting the superseded text. Read the banner before
  the text under it; a withdrawn paragraph reads exactly like a live one.
- **The forward chains are predictions, not this era's buildings.** A masses section says what
  a mass *becomes* in later eras. None of it is drawn here.
- **Height in world units.** The guides from era two on deliberately give none. Do not invent
  one, and do not copy era one's figures forward.
- **The lesson never reaches the architecture.** D-ERA8: a skill building is ordinary
  architecture that happens to house a lesson, and its shape says nothing about the
  mathematics. No counting the courses, no rows in powers, no tally of sacks in the gable.
