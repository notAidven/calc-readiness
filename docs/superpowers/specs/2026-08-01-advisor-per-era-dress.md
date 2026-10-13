# The advisor's per-era dress, all ten (2026-08-01)

**What this is.** The direction for what the advisor wears in each of the ten eras, and the
record of where each row came from. It is a **transcription document, not a design
document**: every one of the ten is taken from that era's own style guide, and this file
exists so that the mapping from a guide's paragraph to the parameters the character is drawn
from is written down somewhere a reviewer can check it.

**Why it was needed.** `D-ET8`
(`2026-07-29-era-trial-contract.md` §19.1) rules the end-of-era ceremony's first beat as
*"the citizens gather, scaffolding goes up on the town hall, and **the advisor changes
dress** — all three together."* What changed at an advance was his **register**, not his
appearance, and the reason recorded was that only two of the ten eras had an authored dress.

---

## 1. The premise was wrong, and correcting it is most of the work

**"Only two of the ten eras have an authored dress" was true of the CODE and false of the
DESIGN.** The two-row table it described is `ADVISOR_DRESS` in
`apps/web/src/city/ceremonyScenes.tsx`, a five-field palette record (`robe`, `trim`,
`carried`, `token`, `described`) that tinted a synthetic SVG advisor about twelve viewBox
units tall on the ceremony card. It was never the character.

Measured at `8be699f3`, **all ten style guides carry a `## The advisor (D-ERA28)` section**,
and every one of them has a dressing paragraph naming the garment, the materials it is made
of, the instrument that era's advisor carries, and where the costume sits in the era palette:

```
$ rg -n "^#{1,4} .*[Aa]dvisor" docs/superpowers/specs/eras/era-*/style-guide.md
era-01-prehistoric/style-guide.md:719:## 6c. The advisor — Oru (D-ERA28)
era-02-neolithic/style-guide.md:1293:## The advisor (D-ERA28)
era-03-bronze-age/style-guide.md:808:## The advisor (D-ERA28)
era-04-classical/style-guide.md:1092:## The advisor (D-ERA28)
era-05-medieval/style-guide.md:1050:## The advisor (D-ERA28)
era-06-early-modern/style-guide.md:1000:## The advisor (D-ERA28)
era-07-industrial/style-guide.md:847:## The advisor (D-ERA28)
era-08-atomic/style-guide.md:938:## The advisor (D-ERA28)
era-09-information/style-guide.md:988:## The advisor (D-ERA28)
era-10-cyberpunk/style-guide.md:1160:## The advisor (D-ERA28)
```

So this was **eight parameter sets to transcribe, not eight art assets to commission**, and
that is the single fact that decided the size of the job.

**Two stale findings are corrected by the same measurement, and neither is edited here
because neither is this change's to edit.** `docs/Content_Authoring_Split.md` §10.2 records
*"`rg -i advisor` over the ten style guides matches **era one alone**, so **nine eras owe an
advisor**"*, and `apps/web/src/city/eraDressing.ts` said *"none of the ten dressings is
drawn … the ten costumes are art authored outside this repo (D-ERA21)."* Both were true when
written; the guides have since been authored. The code comment is corrected in this change
because it is in the file being changed. **§10.2 is `Content_Authoring_Split.md`'s and is
owed a correction by whoever owns it** — its ownership half is Evan's design lane (§1.1).

---

## 2. What a dress is, in the code

`apps/web/src/lessons/OruAdvisorCharacter.tsx` is not an asset. It is roughly sixty
absolutely-positioned percentage-boxed `<div>`s with every colour written inline as a hex
literal. Before this change it took one prop, `mood`, and had no era input at all.

A costume is therefore a **parameter set**, and it is split in two:

| | Where it lives | What it holds |
| --- | --- | --- |
| **The person** | written into the component's markup | skin and its three tones, the eyes and their glint, the mouth, the tongue, the cheek shading |
| **The clothes** | `AdvisorDress`, one per era in `apps/web/src/city/advisorDress.ts` | garment, over-garment, headwear, footwear, the carried instrument, the era's one token and where it is worn, the motes in the air, face paint |

**That split is `D-ET9` drawn rather than asserted.** The ruling is *"one continuous advisor
for the whole run, re-themed per era. Not ten advisors,"* and the strongest form of it is a
costume with no field that could hold an identity. `AdvisorDress` has no `name`, no `role`
and no `voice`, and `advisorDress.test.ts` asserts that against both the ten rows and the
interface declaration.

### The three parts that carry the outline

`City_Art_Bible.md` §3 is silhouette-first, and the advisor is drawn at two very different
sizes — about 120px in the onboarding reel, `clamp(132px, 30vh, 232px)` over the island
during a crisis. A wardrobe separating only on colour is one figure at the smaller of the
two. So three of the dress's fields are **shape** rather than colour, and **every advance
moves at least two of the three**:

- **`head`** — nine forms. Hood, tied, squared, crop, veil, cloth, pinned, glasses, collar.
- **`over`** — seven forms. Cape, plain, mantle, gown, apron, coat, jacket.
- **`carried`** — ten, one per era, because each guide names its own and calls it *"the
  counterpart to Oru's staff"*. Three are poles and seven are held at the hand, so the run's
  tall vertical appears and disappears rather than only changing colour.

---

## 3. The ten, each with the sentence it came from

Every row below is **authored, not invented**. The "from the guide" column quotes the
dressing paragraph; the palette placement is that era's own body hue and accent, post-move,
from `2026-07-30-era-palette-ladder.md`.

### Era 1 — Prehistoric. A hide tunic and a stone hood

**Already authored in code, and used unchanged.** This is the costume `OruAdvisorCharacter`
carried inline before there was a second era, transcribed field for field and now serving as
the component's own default, so era one has exactly one definition and cannot drift.
`era-01-prehistoric/style-guide.md` §6c: a Prehistoric elder, hide tunic, shoulder cape,
stone hood with its notched teeth, a lashed timber staff with a thatch tuft and a stone
charm, ochre marks at the brow and cheeks, undressed-stone beads at the throat.

Outline: `hood` / `cape` / `staff`.

### Era 2 — Neolithic. A woven flax wrap and a fired-clay bead

**Already authored in code**, as one of the two rows of the old card table, and used. The
guide: *"A woven flax wrap — **woven**, which is the visible break from Oru's hide tunic and
the cheapest way to date the advance on a person — belted with a cord, over bare feet. A
**fired-clay** bead at the throat … She carries a **tally tablet of impressed clay** … held
flat in one hand; it is her counterpart to his staff. A shallow **winnowing basket** on her
hip. No stone hood, no charms."*

**The staff going away is the point of this row.** Era two is the first advance and whatever
it does sets the pattern, so the very first advance a learner meets changes the outline and
not only the palette. The guide also rules era one's ochre markings out in terms, so this is
the row where the face paint stops.

Outline: `tied` / `plain` / `tablet`.

### Era 3 — Bronze Age. A fringed cream mantle and a bronze hand balance

*"A long fringed wool mantle over one shoulder, in undyed cream, belted. A **bronze** pin at
the shoulder … At his belt a small **banded chest** of graded weights … He carries a **hand
balance** on a short trestle-pole, beam and pans of bronze … Hair and beard oiled and
squared off … No crown, no staff of rank, no gold."*

Bronze is the era's one metal note, so the pin, the beam and the pans are one value and the
patina accent `#7F8C6E` is its shadow. The balance's two pans hang and swing, which makes
the outline a T rather than a line, and is also the era's whole mathematics: what balances
what.

Outline: `squared` / `mantle` / `balance`.

### Era 4 — Classical. A lime-dusted exomis and a surveyor's groma

*"An undyed wool exomis — one shoulder bare, belted, knee-length … A **lime** dust that has
settled into the weave and pales the whole figure … A folded **wax tablet** and stylus at
the belt. He carries a **groma** across one shoulder: a cross-staff on a pole with four
plumb-lines hanging from its arms … A **terracotta**-red band at the hem is the era's one
strong colour."*

The pole comes back three eras after era one's went away, and it is a different pole: a
cross with four hanging lines rather than a plain vertical. Eras three and four are the only
pair sharing an over-garment form, and the balance against the groma is what keeps them
apart at any size.

Outline: `crop` / `mantle` / `groma`.

### Era 5 — Medieval. A lime-washed kirtle, a linen wimple and a chalked slate

*"A plain wool kirtle in the era's lime-washed **daub** off-white, over a darker underdress,
with a linen wimple and veil. A **leather** girdle carrying a purse, a set of scales folded
flat, and a **tally stick** notched down one edge — the tally is her counterpart to Oru's
staff, and it is a record rather than an ornament. She carries a small **chalked slate**
under one arm … A single band of **lead**-grey at the cuff. No fur, no jewellery, no chain
of office."*

The wimple and veil are the strongest headwear in the run: they widen the head, cover the
throat and sit square, so era five is identifiable from the outline alone.

Outline: `veil` / `plain` / `slate`.

### Era 6 — Early Modern. A stucco overgown, a linen head-cloth and a drawing board

*"A plain wool overgown in the **stucco** body hue over a darker underdress, sleeves pushed
back and tied at the elbow. A folded linen head-cloth rather than a jewelled coif — she
works outdoors. At her belt, a pair of **dividers** and a folded rule. She carries a
**drawing board** the size of a forearm, with a pinned sheet on it, and a **plumb line**
hangs from its corner and swings when she moves … **Lead**-grey ribbon at the cuff picks up
the domes. No gold anywhere, and nothing that glitters."*

The one era whose garment is its own body hue, on the guide's instruction.

Outline: `cloth` / `gown` / `board`.

### Era 7 — Industrial. A serge jacket, a drill apron and a ruled ledger

*"A dark serge work jacket over a high-necked blouse … Cotton drill apron with a long pocket
down the front holding a **folding rule** and calipers. A **brass**-cased pocket watch on a
chain, which is the era's one bright metal and the era's own obsession. She carries a
**ruled ledger** under one arm … **Soot** at the cuff and hem."*

Serge on soot-darkened brick is a dark figure on a dark island, so the unbleached apron panel
is the only thing separating her from the ground — which is the guide's own placement:
*"apron in the unbleached cotton that reads against the machine-made brick body hue."*

Outline: `pinned` / `apron` / `ledger`.

### Era 8 — Atomic. A lab coat, horn-rimmed glasses and a strip-chart clipboard

*"A white cotton lab coat, unbuttoned, over a plain shift dress in a muted period colour …
Horn-rimmed glasses pushed up when she is not reading. A **clipboard** with a **strip
chart** folded over it, the trace visible … A **slide rule** in the coat's breast pocket …
An **anodised aluminium** pen clip is the era's one bright metal note. No lanyard, no badge
reel."*

The glasses sit **above** the eyes, which is the guide's *"pushed up when she is not
reading"* and is also a rendering requirement: the `squint` pose swaps the eye pair, and a
rim drawn across the eyes would cover the one part of the face that carries the pose.

Outline: `glasses` / `coat` / `clipboard`.

### Era 9 — Information. A seamless merino crew-neck, a lanyard and a tablet

The guide calls this the hardest one to dress: *"§2 records that the era's real absence is
**visible hand-work of any kind** … and a character has to survive that without becoming a
mannequin. So: a fine merino crew-neck over plain trousers, everything **seamless-looking,
machine-finished, and utterly without a visible stitch, weave or wear mark**. Soft trainers.
A **lanyard** with a blank white card … He carries a **tablet**, held flat … **The one
deliberate exception is a paper coffee cup**, because a figure made entirely of finished
surfaces reads as an asset and not a person."*

Drawn as an absence: no binding at the cuff, no hem band, no fringe, no pattern. The coffee
cup is the only soft object on the figure.

Outline: `crop` / `plain` / `slab`.

### Era 10 — Cyberpunk. A high-collared technical jacket with one emissive trim line

*"A layered technical jacket with a high collar over a close-fitting base layer, cargo
trousers, boots with the strapping visible. The jacket carries **one emissive trim line**
along the shoulder seam and cuff — the era's signature move, light used as *trim* and never
as a surface … A **coiled patch cable** over one shoulder. They carry a **handheld field
meter** … **Retrofit is visible on the figure**: the jacket is newer than the boots, and one
panel of it is a different generation."*

**Never gold.** The guide states the limit itself, citing the Art Bible: *"An advisor who
glows the colour of a mastery star is a legibility bug, not a style choice."* The emissive
note is `#5FD0D8`, and `advisorDress.test.ts` sweeps the whole wardrobe for `#FFB703` rather
than trusting the sentence.

Outline: `collar` / `jacket` / `meter`.

---

## 4. Implemented versus owed

**All ten are implemented.** None is owed, and none is a placeholder. The one that came
closest to being deferred is era nine, whose brief is an absence rather than a garment; it is
drawn as one and the guide's coffee cup is what keeps it a person.

**Where the transcription had to make a call, and it did in four places.** Each is a
rendering decision rather than a design one, and each was made by looking at the frame:

1. **Era five's veil read as a helmet** in its first pass, because its crown started above
   the head's own top rather than on it and its cheek panels put more linen than face in the
   outline. Tightened; the guide's shape is unchanged.
2. **Eras four, five and six vanished into the parchment ground.** Their guides place the
   costume at or near `#ECE4D3` — era four's *"lime dust flattening it toward the parchment
   ground"*, era six's *"linen just off the parchment ground"* — and `#ECE4D3` is the ground
   the whole city is drawn on (`City_Art_Bible.md` §1). Each was moved one step off it and
   given an edge in a darker tone. **Silhouette-first wins over a palette note that erases
   the silhouette**, and this is recorded rather than done quietly because it is the one
   place the transcription departs from a literal reading.
3. **A mantle hem in the belt colour read as a plank the figure stood on.** It is a fringe
   now, which is era three's own word for it.
4. **Era ten's collar reached the shoulders and read as a scarf**, and on a figure that dark
   it swallowed the upper body. It stands beside and behind the neck instead.

**What is genuinely not delivered, named rather than implied.** The frames at §5 put eras
six and ten on a **grey island**, not on their own. That is not the costume: nine of the ten
eras carry `land: { status: "unauthored" }` under `D-ERA25`, so there is no era-six island to
photograph a costume against. The clash question is therefore answered against the ground
those eras actually render today, and it will need re-asking whenever a later era's terrain
is authored.

---

## 5. Where the evidence is

- `docs/design-refs/advisor-wardrobe/00-wardrobe-contact-sheet-1024x580.png` — all ten at
  the size the onboarding reel draws them, on the parchment ground.
- `docs/design-refs/advisor-wardrobe/{prehistoric,renaissance,cyberpunk}-crisis-1024x580.png`
  — three eras at crisis size on the live island, whole viewport, framed to show the
  surroundings.
- `docs/design-refs/advisor-wardrobe/measured-1024x580.txt` — measured off those frames.
- `apps/web/src/city/advisorDress.test.ts` — the guard, population derived from
  `ERA_SEQUENCE`.
- `apps/web/src/city/advisorWardrobeShots.browser.test.tsx` — the rendered-pixel guard and
  the frames.

## Related

- `2026-07-29-era-trial-contract.md` §19.1 (`D-ET8`), §19.2 (`D-ET9`)
- `2026-07-27-era-progression-design.md` (`D-ERA28`)
- `2026-07-30-era-palette-ladder.md` — the ten body hues and accents
- `City_Art_Bible.md` §1 (parchment), §1.3 (reserved gold), §2 (three-tone faces), §3
  (silhouette-first)
- `eras/era-0N-*/style-guide.md` — the ten dressing paragraphs, which are the source
