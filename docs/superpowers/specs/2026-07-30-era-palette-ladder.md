# The era palette ladder, measured and widened (2026-07-30)

**What this is.** The ten era body hues, measured as a ladder rather than one era at a time,
and five of them moved. It exists because the team lead reported era two's generated art
reading flat against era one's, and because the number a teammate had offered as the
explanation turned out to be measuring the wrong thing — not wrongly, but in a condition the
player is never in.

**Era two's two values are Evan's**, authored in a separate lane on the same day and **held
fixed** while this ladder re-derived around them. That ordering was ruled rather than raced,
and **§5a** is where the collision, the values each lane proposed, and the re-derivation of
the four figures that depended on the moved hues are all recorded. Read §5a before §5's table
if the question is *why these values*; read §5 first if the question is *what separates*.

**Scope.** Documentation and colour values. No rendering work: nothing in `apps/web` changed
except one new test, and no renderer reads an era hue at all (see *§7 What the code holds*).

> ## ⚑ 2026-08-03 — ERA SIX MOVED TO A NORTHERN EARLY MODERN MATERIAL SET. §12 IS LIVE
>
> **The superseded `#D29F9F` dusty-rose pass is historical; the live body is warm buff
> `#C7A48E` under dark slate/sheet lead `#596675`.** Every earlier era-six figure in §5,
> §5a, §6 and §9 is a true record of its pass and a stale statement about the tree. Read
> **§12** for the current values. Era three's `#8A6E33` in §5's table was superseded the
> same way, by the patina green `#5F6D4E`.
>
> **Why it moved twice.** The 2026-07-30 pass separated era six from era four *on hue only*
> and kept era four's terracotta roof. The 2026-08-01 correction fixed that collision but
> made a dusty southern rose the dominant field on a Northern Early Modern set. §12 records
> the measured buff search, the retained two-channel guard and the four exact material values.

---

## 1. The requirement, in the lead's words, and why it is not a ΔE requirement

> *"the colour scheme should vary a bit in the new buildings — very difficult to distinguish
> old buildings from new."*

That is a stricter test than "the transition should feel like a change", and it is the one
that matters, because of a consequence of the re-dressing ruling that was never costed:
**buildings never re-dress, so the island accumulates every era's buildings permanently**
(`eras/README.md`: *"A building drawn in era N now has that look permanently … nothing gets a
second pass now"*). By era ten the city carries ten generations at once. They read as strata
only if the hues are far enough apart to see it **in situ** — two buildings on adjacent plots
— not in a swatch comparison.

**Three consequences shaped the measurement.**

1. **A ΔE between two hex values is a laboratory number.** The real condition is two
   buildings under `City_Art_Bible.md` §2's fixed three-tone face model, and shading
   compresses differences. §2 is measured below rather than assumed.
2. **The one-body-hue-per-era rule is the amplifier.** Every building in an era shares one
   body hue and differs only by silhouette. That rule is right and stays, but it means the
   *only* colour separating two eras' buildings is that single hue — there is no secondary
   variation to help, no per-building tint, no second body colour. **A normal palette can
   afford a weak step because something else carries the difference. This one cannot.** The
   ladder is load-bearing in a way a normal palette is not, and that is the strongest single
   argument for holding it to a floor.
3. **The early seams carry the most weight.** Era one to era two is the transition *every*
   player is guaranteed to meet. A player who reaches era nine has learned to read the city;
   a player at era two has not.

---

## 2. How adjacency was measured

Palettes were read from each era's own style guide, located **by heading text** rather than
section number: era one states its palette inside the numbered sequence at `## 4. Palette`,
and eras two to ten state theirs outside it at `## The era's palette (PROPOSED — D-ERA27)`.

Three quantities, all in CIE L\*a\*b\* (D65, sRGB):

| Quantity | Definition | Why |
| --- | --- | --- |
| **swatch ΔE76** | CIE76 between the two body hues | The laboratory number. What the teammate measured |
| **in-situ signal** | the *weakest* of the three corresponding-face deltas — top:top, left:left, right:right | Two buildings are lit identically, so a player compares like face with like. The weakest of the three is the one that lets them look the same |
| **shading noise** | the quieter of the two buildings' own one-step face deltas (top-to-left, left-to-right) | What "the same wall in a different light" already costs on screen |

The face tones are not invented here. `City_Art_Bible.md` §2 fixes them and `palette.ts`
implements them: **top = `lighten(hue, 0.26)`, left = `hue`, right = `darken(hue, 0.28)`.**

**Shading compresses the palette difference to about 71% of the swatch number**, and worst on
the top face — which is the face a three-quarter overhead camera sees most of. So the swatch
number systematically overstates what a player gets. Era one to era two measures ΔE76 10.1 as
a swatch and **7.2 as two roofs side by side.**

### Does the floor survive the real condition? Stated plainly

**Partly, and here is exactly how far the evidence goes.** The in-situ signal above is a
faithful model of the shading *arithmetic* — it is computed from the same `lighten`/`darken`
the renderer applies, on the same hues, so the compression figure is not an estimate. What it
does **not** capture: the baked elliptical contact shadow each plot draws, the parchment
ground the buildings sit on, the props and thatch and timber that break up a body surface,
and the fact that two buildings are different *shapes*, which helps. Those effects push in
both directions and this document does not model any of them.

**It could not be tested properly here.** Era two's generated art is the only art that exists
for any era in this repository and it is untracked; the tracked `output/imagegen/era-*/`
folders hold briefs, not images. So there is **no rendered side-by-side to screenshot**, and
nothing below should be read as "verified on screen". What is verified is the arithmetic of
the shading model over the stated hues, which is strictly better than the swatch number and
strictly worse than a screenshot. **The claim is that the ladder now clears a floor derived
from the renderer's own tone steps, not that a player has been observed telling two eras
apart.**

---

## 3. The floor, and why this one

**Floor: an era pair's in-situ signal must exceed the shading noise of the quieter of the two
buildings.**

Below that line, two buildings from different eras standing side by side differ **less than
two faces of a single building in either era**. The difference is then inside the variation
the renderer already puts on screen, so it reads as the key light rather than as a change of
material — which is precisely "very difficult to distinguish old buildings from new".

**Why not a number from a standard.** A JND threshold answers "can a human see this
difference", which is not the question. The question is whether a player *attributes* the
difference to a different age of building, and the competing explanation is always the light.
So the honest floor is the size of that competing explanation, which is a property of this
renderer and is measurable in it.

**Why not the biggest gap in the distribution.** Sorted, the nine shipped adjacent steps were
10.1, 11.2, 13.0, 14.2, 15.5, 26.1, 32.6, 35.2, 35.8 — bimodal, with the widest gap between
15.5 and 26.1. A floor of ~20 read straight off that gap fails five of nine seams and would
demand that the earth eras separate as far as the material-revolution eras do. The materials
forbid it: rammed earth, mud brick and mud brick in mass genuinely are near neighbours. A
floor that the material story cannot satisfy is not a floor, it is a wish.

**This floor weights the early seams hardest without being told to**, which is the property
that recommends it. Shading noise rises with chroma and with darkness, and the earth eras are
both: eras one, two and three are the three most chromatic bodies in the run (C\* 38.3, 32.2,
36.6), and after the moves below they carry floors of 15.2, 10.3 and 16.0 against 6.7 for era
four's limestone and 7.1 for era eight's concrete. **So the run's two highest seam floors are
era one → era two and era two → era three, at 10.28 each** — the two transitions every player
meets first are automatically the two hardest to pass. No hand-placed weight was needed.

**One honest weakness, named because it is gameable.** The floor is a ratio, so a hue could
"pass" by *desaturating* — shrinking the denominator — rather than by moving away. Two things
stop that here. Every seam's **absolute** in-situ signal is reported before and after and
every one of the nine rose or held; and the seam that matters most, era one to era two, is
additionally held against **era one's own shipped noise of 15.2**, which cannot be gamed
because era one does not move. Era one to era two clears it at 18.3 in situ and **25.24 as a
swatch**, against a swatch requirement of 15.2.

---

## 4. The ten-era ladder, before

Re-derived rather than trusted. **The teammate's two numbers reproduce exactly under CIE76:**
minimum 10.07 at era one → era two, maximum 35.82 at era seven → era eight. CIEDE2000 and
CIE94 give a different maximum (era nine → ten and era six → seven respectively), so CIE76 is
the formula that was used.

| Era | Material | Body hue | L\* | C\* | h° |
| --- | --- | --- | --- | --- | --- |
| 1 Prehistoric | terracotta, rammed earth | `#C98A5E` | 62.8 | 38.3 | 59.9 |
| 2 Neolithic | mud brick | `#B4714F` | 54.1 | 37.6 | 52.4 |
| 3 Bronze Age | mud-brick ochre | `#A8824E` | 56.9 | 34.5 | 76.3 |
| 4 Classical | dressed ashlar limestone | `#C4B79A` | 74.8 | 16.4 | 90.3 |
| 5 Medieval | lime-washed daub over stone | `#A99A85` | 64.4 | 13.2 | 81.2 |
| 6 Early Modern | warm stucco | `#CDBB9E` | 76.7 | 17.1 | 84.0 |
| 7 Industrial | soot-darkened brick | `#8E5F4E` | 44.9 | 24.4 | 45.8 |
| 8 Atomic | pale poured concrete | `#B9B5AC` | 73.8 | 5.1 | 92.3 |
| 9 Information | anodised grey-blue | `#96A1AB` | 65.7 | 6.8 | 254.4 |
| 10 Cyberpunk | dark composite panel | `#4A4E58` | 33.2 | 6.5 | 276.7 |

| Seam | swatch ΔE76 | in-situ signal | shading noise | verdict |
| --- | --- | --- | --- | --- |
| **1 → 2** | **10.07** ← min | 7.18 | 15.15 | **FAIL** |
| 2 → 3 | 15.48 | 10.99 | 15.33 | **FAIL** |
| 3 → 4 | 26.09 | 18.50 | 8.00 | pass |
| 4 → 5 | 11.17 | 8.48 | 8.00 | pass, margin +0.47 |
| 5 → 6 | 12.95 | 9.75 | 7.71 | pass |
| 6 → 7 | 35.22 | 25.12 | 7.71 | pass |
| **7 → 8** | **35.82** ← max | 25.00 | 7.13 | pass |
| 8 → 9 | 14.23 | 10.31 | 7.13 | pass |
| 9 → 10 | 32.63 | 22.85 | 9.22 | pass |

Two seams below the floor, and a third — era four to era five — passing by 0.47, which is at
the floor rather than above it.

### The finding the adjacent view could not produce

The island keeps every era's buildings, so **all 45 pairs stand side by side, not only the
nine adjacent ones.** Measured that way:

| Pair | Eras apart | in-situ signal | shading noise | |
| --- | --- | --- | --- | --- |
| **4 ↔ 6** | 2 | **2.07** | 7.71 | **the worst pair in the set** |
| 1 ↔ 2 | 1 | 7.18 | 15.15 | fail |
| 1 ↔ 3 | 2 | 8.82 | 15.15 | fail |
| 2 ↔ 3 | 1 | 10.99 | 15.33 | fail |
| 2 ↔ 7 | 5 | 11.59 | 13.87 | fail |

**Era four's dressed ashlar limestone and era six's warm stucco were ΔE76 2.7 apart** — 2.07
in situ. A Classical building and a Renaissance building on neighbouring plots were *the same
colour*, and under the permanent-build ruling they stay neighbours forever. That is five times
worse than the era one → two seam that prompted this work, and **the adjacent-only framing
structurally could not see it**, because eras four and six are not adjacent.

Era two ↔ era seven failing is the same class of defect wearing a rationale: era seven's hue
was chosen as *"era two's fired brick returned darkened"*, which made the two brick eras
relatives. Five eras apart, they were inside the shading noise of each other.

---

## 5. The ladder, after

Five hues moved: eras two, three, four, five and six. **Eras one, seven, eight, nine and ten
are untouched.** Era two's two values are **Evan's**, authored in a separate lane and held
fixed here rather than re-picked — see §5a, which is where the reconciliation is argued.

| Era | Material | Before | After | L\* | C\* | h° |
| --- | --- | --- | --- | --- | --- | --- |
| 1 Prehistoric | terracotta, rammed earth | `#C98A5E` | *unchanged* | 62.8 | 38.3 | 59.9 |
| 2 Neolithic | sun-dried brick, straw-tempered | `#B4714F` | **`#D9C288`** | 79.1 | 32.2 | 90.2 |
| 3 Bronze Age | mud-brick ochre | `#A8824E` | **`#8A6E33`** | 48.0 | 36.6 | 83.8 |
| 4 Classical | dressed ashlar limestone | `#C4B79A` | **`#D2C8AA`** | 80.7 | 16.3 | 95.0 |
| 5 Medieval | lime-washed daub over stone | `#A99A85` | **`#9D9C8C`** | 64.0 | 8.9 | 106.6 |
| 6 Early Modern | warm stucco | `#CDBB9E` | **`#E9C2A1`** | 81.0 | 23.7 | 67.2 |
| 7 Industrial | soot-darkened brick | `#8E5F4E` | *unchanged* | 44.9 | 24.4 | 45.8 |
| 8 Atomic | pale poured concrete | `#B9B5AC` | *unchanged* | 73.8 | 5.1 | 92.3 |
| 9 Information | anodised grey-blue | `#96A1AB` | *unchanged* | 65.7 | 6.8 | 254.4 |
| 10 Cyberpunk | dark composite panel | `#4A4E58` | *unchanged* | 33.2 | 6.5 | 276.7 |

| Seam | swatch: was → is | in-situ: was → is | floor | margin | verdict |
| --- | --- | --- | --- | --- | --- |
| 1 → 2 | 10.07 → **25.24** | 7.18 → **18.28** | 10.28 | +8.00 | **PASS** |
| 2 → 3 | 15.48 → **31.65** | 10.99 → **22.71** | 10.28 | +12.42 | **PASS** |
| 3 → 4 | 26.09 → 38.77 | 18.50 → 27.62 | 6.72 | +20.90 | PASS |
| 4 → 5 | 11.17 → **18.42** | 8.48 → **13.34** | 6.72 | +6.62 | **PASS** |
| 5 → 6 | 12.95 → **24.55** | 9.75 → **17.93** | 8.10 | +9.84 | **PASS** |
| 6 → 7 | 35.22 → 37.17 | 25.12 → 26.83 | 8.10 | +18.74 | PASS |
| 7 → 8 | 35.82 → 35.82 | 25.00 → 25.00 | 7.13 | +17.87 | PASS |
| 8 → 9 | 14.23 → 14.23 | 10.31 → 10.31 | 7.13 | +3.19 | PASS |
| 9 → 10 | 32.63 → 32.63 | 22.85 → 22.85 | 9.22 | +13.63 | PASS |

- **Nine of nine seams clear the floor.** Two failed before.
- **No seam got worse.** Four are numerically identical because both their eras are untouched;
  the other five rose. The smallest in-situ signal on the ladder went from **7.18 to 10.31**,
  and the smallest swatch step from 10.07 to 14.23.
- **All 45 pairs clear the floor.** The all-pairs minimum went from **2.07 to 7.76** and the
  count of pairs below their shading noise from **5 of 45 to 0 of 45**. Era four ↔ era six is
  2.07 → 8.39; era one ↔ era three is 8.82 → 16.07; era two ↔ era seven is 11.59 → 29.66.
- **The tightest four pairs left in the run**, since a floor is only interesting at its
  margin: era five ↔ era eight **+0.63**, era one ↔ era three **+0.92**, era four ↔ era six
  **+1.67**, era five ↔ era nine **+1.97**. Era two's tightest is era two ↔ era six at
  **+2.15**.

**One non-adjacent pair decreased**, and it is named rather than buried: era five ↔ era eight
went from 9.02 to 7.76 in situ. It stays above its floor of 7.13, and it is three eras apart.
It moved because era five was pulled toward neutral to get away from era four, and era eight's
concrete is the neutral one. **Nothing adjacent decreased.**

---

## 5a. Era two's two values are Evan's, and the ladder re-derived against them

**Two lanes proposed a body hue for era two on the same day.** This document's first draft
proposed **`#B4917C`**, era one's lightness at half its chroma. Evan's era-two redesign
(`a14955c`, 2026-07-30) proposed **`#D9C288`** with **`#A2503A`** for the accent, with its own
CIE76 derivation. **Both cannot be the era's body.** The ordering ruling was that this
ladder re-derives against Evan's two values rather than the reverse, and the reason is
**asymmetry of dependents, not seniority**: four figures recorded beside `#D9C288` rest on
hues this pass moves, whereas what rested on `#B4917C` was this pass's own ladder. Re-deriving
one ladder against fixed anchors costs less total staleness than invalidating four justified
figures, and it fails more visibly if it is got wrong.

### Which values actually collided, and which only looked like they did

Evan's note named eras two, three, five and six. Measured against what each lane's diff
actually writes, **exactly one era's values collide**:

| Era | This pass proposed | Evan's lane | Verdict |
| --- | --- | --- | --- |
| **2 body** | `#B4917C` | **`#D9C288`** | **Genuine conflict.** Two values for one field. Evan's is held |
| **2 accent** | *unchanged*, `#C2AE83` | **`#A2503A`** | **Genuine conflict.** Evan's is held — and see below, because it is the one the guard would not have caught |
| 3 | `#8A6E33` | *value untouched*; rationale prose rewritten | **No value conflict.** Evan's lane says so in as many words: *"the value `#A8824E` is UNCHANGED and is not this correction's to move"* |
| 5 | `#9D9C8C` | *guide not edited* | **No conflict.** One rejected-candidate figure cites the old value |
| 6 | `#E9C2A1` | *guide not edited* | **No conflict.** Three figures cite the old value |

So eras three, five and six were never a disagreement about a colour. They are **citations**
of hues this pass moves, and citations are re-derived rather than arbitrated. The four figures
are re-derived in the table two blocks down.

### Holding `#D9C288` fixed does not reopen the problem this pass exists to fix

That was the thing worth checking, because a hue adopted for another lane's reasons could
easily have failed the separation bar this document sets. **It does not — and on the seam the
team lead reported, it beats the value this pass had proposed:**

| | this pass's `#B4917C` | **Evan's `#D9C288`** |
| --- | --- | --- |
| era 1 → 2 swatch / in-situ | 19.28 / 13.00 | **25.24 / 18.28** |
| era 1 → 2 margin over floor | +1.54 | **+8.00** |
| era one's un-gameable swatch bar (15.15) | 19.28 | **25.24** |
| pairs below floor, of 45 | 0 | **0** |
| all-pairs minimum in situ | 7.76 | **7.76** |
| worst margin in the run | +0.62 (era 2 ↔ era 5) | **+0.63** (era 5 ↔ era 8) |
| chroma against era one's 38.3 ceiling | 19.0 | **32.2** |

The two are level on every whole-run figure and Evan's is materially better on the seam that
prompted the work. It also **removes** this pass's own tightest pair: `#B4917C` put era two
within +0.62 of era five, and `#D9C288` puts era two's closest neighbour at +2.15.

**The two values disagree about the material rather than about the arithmetic**, which is why
both could clear the same floor. `#B4917C` read the 2026-07-29 ruling's *"paler, greyer and
more matte"* as a **desaturation** of the fired value; `#D9C288` reads it as **the colour of a
straw-tempered brick**, which is paler by 25 L\* rather than by 9 and stays chromatic. Evan's
is the stronger material claim: a brick tempered half-and-half with chopped straw is the
colour of the straw, and it makes era two the first material in the run that is **part crop**,
which is the era's own premise arriving in the fabric.

### The accent, which is the one the guard would not have caught

`#D9C288` is Evan's *pair*, and taking only half of it would have shipped a combination he
measured and rejected. Against the new body, the shipped reed-thatch accent `#C2AE83` is ΔE76
**10.44** as a swatch and **7.69** in situ — **below era two's own shading noise of 10.28**,
so a fresh-straw roof over a straw-tempered wall would separate less than that wall's own two
faces. Fired clay `#A2503A` gives 47.84 and 34.39.

**The guard would have passed the bad pairing**, and that is reported rather than fixed by
widening it. `eraPaletteLadder.test.ts` holds an accent to `ΔE76 > 5` against its own body,
deliberately weaker than the pairwise floor, because era nine's guide says its body and accent
*"sit close together on purpose"* at 8.0. `#C2AE83` at 10.44 clears that bar. Raising it to
the in-situ floor would fail era nine for a documented design choice, so the bar stays and the
accent moved for the reason above. **An accent is a trim on one building rather than a second
building**, so the pairwise floor is not the right instrument for it — the number is quoted
here as a comparison, not as a verdict.

### Evan's four figures, re-derived

Every one of these cites a hue this pass moves. **None of them reverses**, and three get
larger:

| His recorded figure | Cited | Re-derived | What survives |
| --- | --- | --- | --- |
| era two ↔ era three, *"ΔE 23.72, of which 22.19 is lightness"* | 23.72 | **31.65**, of which 31.11 is lightness | The claim gets stronger and its shape is unchanged — it is still lightness doing nearly all the work |
| era one ↔ era three, the squeeze: *"only ΔE 12.50 apart … there is no room between them"* | 12.50 | **21.55** | **The premise is retired rather than restated.** The squeeze was real and is the reason `#D9C288` had to leave the segment; era three's move has since opened it. Recorded because the argument for the hue depends on the constraint having been real at the time |
| rejected *"cool the earth"* candidate `#948872` vs era five | 7.3 | **9.07** (in situ 6.50, floor 10.01) | Still a collision, so the rejection stands |
| era two's nearest neighbour, era six | 15.45 | **14.03** (in situ 10.24, floor 8.10) | **Era six is still the nearest neighbour**, and the pair still clears. The *comparison* he drew — *"5.7× the closest pair the run already ships, era four ↔ era six at 2.73"* — no longer works, because that pair is now 11.96 |

Two further figures in the same section move and are recorded for completeness: era two
against the parchment ground is unchanged at **25.72** (the ground did not move), but its
companions did — era four goes 17.54 → **12.37** and era six 16.23 → **18.44**. And *"it is
the palest body in the run at L\* 79.11 — 2.4 above era six"* is **no longer true**: eras four
and six are now 80.69 and 81.01, so era two is the **third** palest, by 1.58 and 1.90.

### Every one of those figures is a swatch number, and this pass's are not

**Flagged because it applies to both lanes and neither said it.** All four of the figures
above are plain CIE76 between two hex values, computed to the digit and reproducible — but a
swatch ΔE is not what a player gets. The renderer shades with three tones and no
post-processing (§2), which **compresses colour differences to a mean of 71.7% of the swatch
number across the nine reconciled seams**, and worst on the top face, which is the face a
three-quarter overhead camera sees most of. **This pass's method accounts for that and Evan's
figures do not**, which is not a criticism of them — it is the reason they are quoted with an
in-situ column beside them wherever the number decides something.

It matters most where a figure is close to a bar. Two examples from the four. His era two ↔
era six, quoted at *"ΔE 15.5"* as the nearest neighbour anywhere in the run, is **11.15 in
situ** at the values he measured and **10.24** at the ones that ship, against that pair's
floor of 8.10 — so the margin a player actually gets is **+2.15**, not the comfortably large
15 the swatch suggests. And his rejected `#948872` candidate, quoted at *"ΔE 7.3 from era
five"*, is **6.50 in situ** against a floor of 10.01, so the rejection is right and is in fact
**more** right than the swatch number showed. **No figure of his reverses under the in-situ
reading**, which is the useful part of having checked.

### Which of the other four moves are load-bearing under Evan's era two

Measured one move at a time, holding `#D9C288`, over all 45 pairs:

| Kept | pairs below floor | worst |
| --- | --- | --- |
| era two alone | 2 | era 1 ↔ 3 at −6.33, era 4 ↔ 6 at −5.63 |
| + era three | 1 | era 4 ↔ 6 at −5.63 |
| + era six | 1 | era 1 ↔ 3 at −6.33 |
| + eras three and six | **0** | +0.47 (era 4 ↔ 5) |
| + eras three, five and six | **0** | +0.63 |
| all four (**shipped here**) | **0** | +0.63 |

**Eras three and six carry the floor; eras four and five do not**, and they are kept for their
own material claims rather than smuggled in on the ladder's authority — era four to make
*"the first time the town is pale"* survive era two arriving pale (§6), and era five to lift
the era four → era five seam off **+0.47**, which was passing at the floor rather than above
it. Each guide states which of the two reasons applies to it. This mirrors the finding at §6's
era-four entry and is the same discipline: **do not credit the ladder to a change that did not
move it.**

---

## 6. Every hue moved, with its material justification

The material story governs the colour. A hue that stops matching its material is a worse
defect than a small ΔE, because the whole palette is derived from the materials lists. Each
move below is inside what the era's **own stated material** can be, and in four of the five
cases the guide had already written down the direction and not applied it.

### Era two — `#B4714F` → `#D9C288` — straw-tempered sun-dried brick

**Evan's value, held fixed. §5a is where it is argued; this entry records what the material
says.**

**The guide had already made this correction and then declined to apply it.** Era two's §2
gives the body to the **sun-dried** brick and confines fired clay to components — *"never a
whole wall"*. The 2026-07-29 closure ruling saw that the palette named *fired* brick,
described the difference in its own words — the sun-dried brick **"is paler, greyer and more
matte"** — and then ruled *"rename it and leave the hex alone"*. Those are three stated
differences from fired brick, and `#B4714F` carried none of them.

`#D9C288` is that sentence taken to the material rather than to the number: terracotta red is
what clay becomes **in a fire**, and a brick of dug clay heavily tempered with chopped straw
and dried in the sun is a **pale straw-buff** — paler (L\* 54.1 → 79.1), and matte by being
dusty rather than fired. It is the first building material in the run that is **part crop**,
which is the era's own premise (*"repetition is what agriculture actually feels like"*)
arriving in the fabric.

**Why this direction fixes the seam.** Era one's terracotta is a *vivid* rammed earth at C\*
38.3, and `#B4714F` sat at C\* 37.6 — the same saturation to within a hair, at nearly the same
hue angle. **That is why era one and era two were the closest pair in the run.** Era two now
separates on **lightness**, 16.3 L\* of a 25.24 total, which is the axis the run's warm
quadrant is not crowded on: eras one, three and seven all sit between L\* 44.9 and 62.9.

**The card it spends, stated because it is a real cost.** Era two is now **pale**, and era
four's rationale claimed *"the first time the town is pale, after three eras of earth"*. That
claim is narrowed in era four's own guide rather than left standing: era two reaches L\* 79.1
one era early, era three takes the town back down to 48.0, and **era four is the first era
where pale is the town's settled condition** rather than an interruption. Era eight keeps its
*"goes neutral for the first time"* card untouched — era two is C\* 32.2 against era eight's
5.1, which is nowhere near neutral.

### Era three — `#A8824E` → `#8A6E33` — mud-brick ochre in mass

**Its old rationale had lost its premise.** It read *"drier and browner than era two's **fired
red**"* — a hue defined against a neighbour that does not exist, since era two's body is
sun-dried and its hex has now moved too.

Re-derived from era three's own §2, which calls the body **"the ochre body"** and gives it
*"mud brick in mass … walls deep enough to corbel over"*: this is **yellow ochre in
quantity**, deeper and distinctly yellower than era two's pale straw-buff. The value is the
honest reading of §3's affect, which is **weight** — a wall four times the thickness of era
two's, with deep reveals and stepped corbels, is mostly self-shadow and reads darker.

**This is the era where the earth comes back**, which is the reading the reconciliation
makes available and the old one could not: era two's walls are its harvest, part clay and part
chopped straw, and era three's are the clay alone in mass. The 2 → 3 step is 31.65, of which
**31.11 is lightness**.

**It is load-bearing for the ladder rather than only for the material.** Era one ↔ era three
were 8.82 in situ against era one's own noise of 15.15 — two eras apart, so standing side by
side forever, and invisible to any adjacent-only view. Era three's move is what repairs that
(now 16.07), and no other move in this pass reaches it: see §5a's one-move-at-a-time table.

**Ceiling respected:** C\* 36.6, below era one's 38.3, so no era becomes more saturated than
the shipped terracotta and the guides' *"kept low-saturation"* still holds. Checked against
era three's own bronze patina accent `#7F8C6E`, which stays 27.6 away — an olive-drifting body
would have swallowed the accent that gives the era its name.

### Era four — `#C4B79A` → `#D2C8AA` — dressed ashlar limestone

**Made the era's own claim true — and it had to, because era two got to pale first.** *"The
first time the town is **pale**"* is that section's whole argument for the hue, and `#C4B79A`
sat at L\* 74.8, **within one L\* of era eight's neutral concrete at 73.8** and, once era two
became `#D9C288` at 79.1, *darker than the era three eras before it*. `#D2C8AA` is L\* 80.7,
genuinely the pale end of the run, and keeps the freshly-quarried warmth that separates
quarried limestone from era five's weathered wash and era eight's neutral concrete. It also
widens the seam to era five from 9.9 to 13.3 in situ.

**The claim itself is narrowed rather than rescued, and era four's guide carries the
narrowing.** Era two is pale one era early at L\* 79.1, so what era four can honestly claim is
that it is the first era where **pale is the town's settled condition** — era three drops back
to 48.0 in between. Era four leads era two by 1.58 L\*, and the two clear each other on chroma
rather than lightness: ΔE76 16.02, in situ 11.70 against a floor of 6.72.

**It does NOT repair the era four ↔ era six collision, and this is measured rather than
assumed.** One move at a time: era six's move alone lifts the pair from 2.07 to **9.11**,
which clears the floor; **era four's move alone lifts it to 3.43, which does not.** `#C4B79A`
and `#CDBB9E` are close enough that taking the paler of the two further pale barely separates
them — the repair had to come from era six turning warm. Both moves together give 8.39.
Recorded because the natural way to write this up is *"eras four and six both moved, so the
collision is fixed"*, and that would credit the wrong change.

**So era four's move is not load-bearing for the floor**, and §5a's table says so in the open:
with era two at `#D9C288`, holding era four at `#C4B79A` leaves no pair below its floor. It is
kept for the pale claim above, which is a claim about the era rather than about the ladder.

### Era five — `#A99A85` → `#9D9C8C` — lime-washed daub over stone

**Moved in the direction the paragraph already asked for.** *"Greyer and cooler than the
Classical limestone"* was the stated intent; `#A99A85` was greyer (C\* 13.2 against 16.4) but
its hue sat at 81°, **warmer** than the limestone's 90°. `#9D9C8C` is greyer still (C\* 8.9)
and genuinely cooler (107°) — a weathered lime wash rather than a quarried face.

**Floors respected on both sides.** Held **light** (L\* 64.0, essentially unchanged) because a
lime wash reads as a light surface — taking it to L\* 51 would have read grimy rather than
weathered, and a candidate that did was rejected. Held **warm of neutral** at C\* 8.9 against
era eight's 5.1, so era eight keeps *"neutral for the first time in the whole walk"*.

**Also not load-bearing for the floor, and it produces the run's tightest surviving pair.**
Holding era five at `#A99A85` leaves no pair below its floor (§5a). What the move buys is the
era four → era five seam, which was passing at **+0.47** — at the floor rather than above it —
and is now +6.62. What it costs is era five ↔ era eight, which drops from 9.02 to **7.76**
against a floor of 7.13: **+0.63, the smallest margin anywhere in the run.** Both directions
are stated because the seam it fixes and the pair it tightens are the same move.

### Era six — `#CDBB9E` → `#E9C2A1` — warm stucco

**"Warms back up from Medieval grey" was not happening.** The old value sat at hue 84° against
era four's 90° and C\* 17.1 against its 16.4 — a 6° turn and half a chroma point, which is not
a warming, and it is why the two were 2.7 apart. `#E9C2A1` is the sentence made real: hue 67°,
C\* 23.7, a warm applied lime plaster that is unmistakably **finish** rather than **stone**,
which is exactly the distinction the paragraph draws between stucco and era four's quarried
ashlar.

### The rule that was not weakened

**One body hue per era, and buildings differ by silhouette rather than by a second body
colour.** Every guide carries it and none of these changes touches it. Each era still names
exactly one body hue. What changed is which value that one hue takes.

**One accent moved and eight did not.** Era two's went from reed thatch `#C2AE83` to fired
clay `#A2503A`, for the reason in §5a — it is Evan's, and the shipped one sat below era two's
own shading noise against the new body. Every other accent is unchanged and each was
re-checked against its era's new body so an accent could not be swallowed by the move (ΔE76):
era two **47.8**, era three 27.6, era four 43.4, era five 32.4, era six 35.7, era seven 32.3,
era eight 22.1, era ten 54.4. Era nine's body and accent sit **8.0** apart, which is
**deliberate and pre-existing** — its guide says they *"sit close together on purpose"*.

---

## 7. What the code holds, so this is not half a fix

**`apps/web/src/city/palette.ts` does not hold era hues, and no renderer reads one.** Its
`DISTRICT_HUES` table is keyed by `DomainId` (`D1`…`D10`), which is the **retired per-district
axis** — `City_Art_Bible.md` §1.2, superseded by **D-ERA27** when hue became an era property.
`districtHue`, `bodyHueFor` and `buildingFaces` all take a `domain`, never an era.

**One value coincides and it is a coincidence the era-one guide already flags:** `D1` is
`0xc98a5e`, which is era one's terracotta. Era one's §4 says so in as many words — *"the same
hue the retired per-district table gave D1, which is a coincidence worth naming rather than
leaning on"*.

**So a documentation-and-values change is the whole fix, not half of it.** The era hues live
only in the ten style guides, the `output/imagegen/era-*/README.md` theme briefs and
`eras/README.md`'s cross-era contrast section, all updated here — including the guides' own
*"Contrast against the buildings"* landscape paragraphs, which restate the body hue a second
time and whose surrounding arguments were re-read rather than hex-substituted (era six's said
eras four and six sat *"a shade closer together"*, which this pass reverses). `palette.ts` is
untouched, which is correct: changing `DISTRICT_HUES` would repaint the shipped D1 city for a
reason that has nothing to do with eras.

**A guard now binds the two.** `test/eraPaletteLadder.test.ts` parses all ten
guides for their body hue and accent by heading text, recomputes the ladder, and asserts the
floor over **all 45 pairs**. It derives its population from the tree rather than restating a
list.

### The guard was measured, not argued

A test written green may be asserting nothing, so each assertion was forced red by injecting
the defect it exists for. **Fourteen injections, each applied to the committed tree and each
followed by `git checkout --` plus a `git status --porcelain` emptiness check**, so no result
below is measured over a tree still carrying the previous injection:

| Injected defect | Result |
| --- | --- |
| era two back to `#B4714F`, the value the lead reported as flat | **RED** — *"expected [ …(2) ] to deeply equal []"*, two pairs below floor |
| **era two to `#B4917C`, the value this pass first proposed** | **GREEN**, and that is the point — see §5a |
| **era two's accent back to reed thatch `#C2AE83`** | **GREEN**, and reported rather than fixed — see §5a |
| era three back to `#A8824E` (era one ↔ era three, two eras apart) | **RED** — pairwise floor |
| era four back to `#C4B79A` | **GREEN**, and correctly so — see below |
| era five back to `#A99A85` | **GREEN**, and correctly so — see below |
| era six back to `#CDBB9E`, recreating the era four ↔ era six collision | **RED** — pairwise floor |
| eras four **and** six both reverted together | **RED** — pairwise floor |
| era one adopts an era accent while staying in `NO_ERA_ACCENT` | **RED** — *"era-01-prehistoric has quietly adopted an era accent"* |
| era three loses its accent and is not a declared exception | **RED** — the accent-is-stated sweep |
| `NO_ERA_ACCENT` names a folder that does not exist | **RED** — *"era-00-does-not-exist is a declared exception that no longer exists"* |
| `palette.ts` `faceTones` lightens by 0.40 instead of 0.26 | **RED** — the tone-step binding |
| era one's palette heading renamed to `## 4. Colour` | **RED** — parse throws: *"This era would otherwise drop silently out of the ladder"* |
| the sweep narrowed to the nine adjacent seams, with era six reverted | **RED** — the composition assertion, and **only** that one |

**The four greens are reported rather than hidden, and each is a different kind of fact.**

- **`#B4917C` green** is the evidence behind §5a: the value this pass first proposed also
  clears every pair, so the choice between it and Evan's was not settled by the floor. Stating
  that is what makes the tie-break honest — it was decided on dependents, and a reader can
  check that claim because the alternative is on the record as passing.
- **The reed-thatch accent green is the guard's known limit**, named in §5a rather than
  patched over: an accent is held to `ΔE76 > 5` against its own body, not to the pairwise
  floor, because era nine's guide says its body and accent *"sit close together on purpose"*
  at 8.0. `#C2AE83` clears 5 at 10.44 and the guard is right not to fail it. **The reason the
  accent moved is stated as a measurement in the guide, not smuggled in as a guard change.**
- **Era four and era five green** because neither move is load-bearing for the floor once era
  two is `#D9C288`. Era six's move is what repairs era four ↔ era six (2.07 → 9.11 alone;
  era four's move alone reaches only 3.43), and reverting era six goes red. §5a's
  one-move-at-a-time table is the full version. Recorded because the natural way to write this
  up — *"five hues moved, so the ladder is fixed"* — would credit changes that did not move it.

**The last injection is the one worth keeping.** Narrowing the sweep to adjacent seams while
era six is reverted leaves **nine of ten assertions passing, including the floor itself** —
verbatim from the verbose run, *"no two eras' buildings differ by less than two faces of one
building ✓"* — while `4 ↔ 6` sits at 2.07 against a floor of 7.71. A guard scoped to adjacency
cannot see a two-era-apart collision at any threshold. Only *"measures every pair of eras, not
only adjacent ones"* fires. That is why the guard asserts the population's composition and not
merely a floor on its size.

---

## 8. What needs regenerating, and what it costs

**Era two's ten images.** Era two is the only era whose art has been generated, and **both** of
its values moved, so `output/imagegen/era-02-neolithic-building-briefs/`'s ten buildings —
five skill buildings, the hub, and four civics — need regenerating against body `#D9C288` and
accent `#A2503A`. **The team lead pays this cost and it is his call, so it is stated plainly
rather than assumed.** It is also unchanged by the reconciliation: the images owed a
regeneration under either candidate value, so choosing Evan's costs nothing extra.

**Is it worth it? Yes, and the reason is not the seam it was raised for.** Three things:

1. **The old value was wrong for the material regardless of the ladder.** Era two's own §2
   ruling recorded that the hex described fired brick and that the era's walls are sun-dried.
   The images were generated against a hue the era's materials table contradicts, so they
   would owe a regeneration even if every seam had passed.
2. **The re-scheme is regenerating them anyway.** Era two's identity is moving from brick to
   farmed land under a separate decision. That is a change to what the buildings *are*, not
   just their colour, so era two's ten images are already in the queue for another pass. **The
   marginal cost of the hue change is close to zero if the two land together**, and the two
   agree in direction more strongly under `#D9C288` than they did under the alternative: a
   straw-tempered brick is **the colour of the harvest**, which is what the re-scheme is
   putting on the ground.
3. **Not changing it does not save the regeneration, it wastes it.** Regenerating era two's
   art for the re-scheme against a hue that still reads as era one would produce a second set
   of images with the same defect the lead reported.

**Eras three, four, five and six cost nothing.** No art has been generated for any of them —
their `output/imagegen/` folders contain briefs only. Four of the five moves are free, and
they are where most of the repair is: era four ↔ era six alone was five times worse than era
one → era two.

**Era one did not move**, and did not need to. Its art stands.

---

## 9. Findings recorded rather than actioned

### Era two's squareness was not the problem, and that question is closed

The alternative hypothesis was that era two's flatness is about *shape* rather than hue — era
one is round poles and lashing with no square corners, era two is square corners and brick
courses — and that the brief under-specified it. **Checked, and then overtaken:** the lead has
since decided that era two's identity moves from brick to farmed land, so squareness was the
wrong signature to be arguing about. That work belongs to a separate agent and nothing here
touches it.

**What the check found, briefly, since it was done.** The squareness is stated *strongly* in
the theme brief's prose — *"square corners for the first time in the run"*, *"plans that close
into rectangles"*, *"ornament … becomes the course"* — but it is **not distributed to the
buildings**. Of era two's ten briefs, **two** are unambiguously square-cornered coursed
load-bearing brick (the Meeting House, The Village Houses). Three are round (the Stone Tower's
drum, the Bread Oven's dome, the Village Well's ring), two are post-and-thatch frames with
*"mostly roof and air rather than wall"* (the Potter's Kiln, the Shrine — which is the hub, and
whose brief says outright *"the course does not apply here, since there is no brick wall"*),
one is a fence (the Sheep Pen), and two are boxes whose brief-stated read is the lift rather
than the wall (the Seed House, The Granary). **An artist following those ten briefs faithfully
would not produce a square-and-coursed settlement**, so the prose was strong and the
distribution was not. This supports the re-scheme rather than a palette fix: the signature was
being asked to carry an era it was never spread across.

### Era two's four civics do mirror era one's, exactly

**Confirmed, and it is stronger than reported.** Era two's four civic buildings match era
one's **role for role**, at exactly double the cost *and* exactly double the capacity:

| Role | Era one | Plot | Cost | Era two | Plot | Cost |
| --- | --- | --- | --- | --- | --- | --- |
| food | The Smokehouse | 2×1 | 80 stone | The Granary | 2×1 | 160 grain |
| livability | The Family Lodge | 2×2 | 80 stone | The Village Houses | 2×2 | 160 grain |
| happiness | The Campfire | 2×2 | 100 stone | The Bread Oven | 2×2 | 200 grain |
| blend | The Spring | 1×1 | 120 stone | The Village Well | 1×1 | 240 grain |

Capacities double too: food ~20 → ~40, 20+5 → 40+10, 20 → 40, 10+10 → 20+20. **Every one of
the twelve numbers is exactly 2×**, and the four footprints are identical.

**It is the only era that mirrors era one this way, and the near-misses are worth naming so
the claim is not overstated.** Eras five and seven both carry the same *multiset* of
footprints as era one — {2×1, 2×2, 2×2, 1×1} — but they **permute the roles** (food takes the
2×2, housing takes the 2×1) and neither holds a constant cost ratio against era one. Era
three's food building is 1×2 against era one's 2×1 and its happiness building is 3×2. So era
two is the only era matching era one role-for-role.

**What varying the plot signature would take. Not done here.** The footprints are the frozen
part, but **not by `INV-ERA-1`** — and that is worth stating precisely, because `INV-ERA-1` is
cited more widely than it reaches. `worldLayout.ts`'s own header says it binds an era
**advance**: a building *"never changes the cells it occupies"*, so no advance may reshuffle a
layout the player arranged. It governs `NODE_FOOTPRINTS`, which is **skill-building** plots
keyed by node id. Era two's civics are not in it.

The civic footprints live in **`packages/economy/src/civicCatalogue.ts`**, as a `footprint:
{ width, depth }` on each definition. So varying era two's signature is a change to that file
plus era two's `civic-buildings.md`, and the constraints on it are:

- `INV-ERA-1` does not forbid it — no era-two civic has been *built* by a player against a
  frozen layout, and the rule binds advances rather than first values.
- **What does bind is `eras/README.md`'s own record of the reverted 2026-07-28 footprint
  change**, and it is the substantive obstacle: a model is contain-fit to its plot by one
  uniform scale, so shrinking a plot makes a building *shorter*, not more slender. `NUM.5` was
  moved to a single tile to make it read vertical and rendered half as tall at an unchanged
  width-to-height. **A footprint change buys shape only through how much of its plot a
  building fills**, so it is not a free lever.
- **Era two's ten briefs are written to the current plots** and each names its own. Four of
  them separate from a neighbour partly on plot — the Shrine from The Bread Oven on 3×2
  against 2×2, most explicitly.
- The costs are being varied by a separate agent, which addresses the 2× half. **The plot
  signature is untouched by that work and remains as measured above.**

### Era one states no era-level accent

Eras two to ten each state a body hue **and** an accent in a two-row table. **Era one states a
body hue and no era accent.** Its §4 gives permitted departures instead — thatch as *"a
desaturated straw"* with no hex, timber `#B08968`, cool grey stone footings with no hex — plus
the four answer-type trims, which §4 is explicit are *"not an era choice"* and persist across
all ten eras. So the accent ladder has nine values for ten eras and its first rung cannot be
measured. Recorded, not fixed: inventing an era-one accent is a design decision for whoever
owns era one, and the body-hue ladder is what the lead's report was about. For completeness
the eight measurable accent steps run 8.0 to 41.6 (ΔE76), with the minimum at era eight → era
nine — which is the same pair the era-nine guide says sits close together on purpose.

---

## 10. Two gates that do not cover this change, reported as such

**Biome is vacuous on Markdown, and this is its own output rather than an inference.** Run
against the files this change is mostly made of, it reports *"Checked 0 files"* and lists them
under *"These paths were provided but ignored"*, exiting 1 for having nothing to do. So no
linter read a word of the ten guides or this document. **Not a pass.**

**`npx tsc --build` does not type-check `test/`, and that is deliberate rather than an
oversight.** No project in the root solution's fourteen references includes `test/`, and the
reason is recorded in `packages/economy/tsconfig.json`: *"The repo ships no `@types/node`
(node built-ins live in `.mjs` scripts, not tsc-built TS), so they are excluded from tsc
typechecking and run under vitest's node runtime (esbuild)."* `test/eraPaletteLadder.test.ts`
reads files with `node:fs` and follows the same convention as the four `test/era*.test.ts`
sweeps beside it, so it is outside tsc by the same documented choice.

**Both were checked for vacuity rather than trusted.** `tsc --build` is load-bearing for the
files it does cover: a deliberate `const x: number = "not a number"` added to
`apps/web/src/city/palette.ts` makes it exit **2** with `TS2322`, so its zero is a real zero
for covered code and silence about `test/` rather than approval of it. The substitute evidence
for the new file is `npm run test:unit` (4931 passed, 2 skipped) plus file-scoped
`npx biome check test/eraPaletteLadder.test.ts`, which found formatting errors, was re-run
after `--write`, and now exits 0.

---

## 11. Reproducing the numbers

The measurement is a pure function of the ten stated hues and
`City_Art_Bible.md` §2's two tone steps. `test/eraPaletteLadder.test.ts` recomputes
it from the guides on every `npm run test:unit` and is the executable form. To rerun by hand:

```python
import math

LIGHTEN_TOP, DARKEN_RIGHT = 0.26, 0.28          # City_Art_Bible.md §2 / palette.ts faceTones

def lab(h):
    h = h.lstrip('#')
    r, g, b = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    f = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = f(r), f(g), f(b)
    x = (r * .4124564 + g * .3575761 + b * .1804375) / .95047
    y = (r * .2126729 + g * .7151522 + b * .0721750) / 1.0
    z = (r * .0193339 + g * .1191920 + b * .9503041) / 1.08883
    k = lambda t: t ** (1/3) if t > (6/29) ** 3 else t * (29/6) ** 2 / 3 + 4/29
    fx, fy, fz = k(x), k(y), k(z)
    return 116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)

de76 = lambda a, b: math.dist(lab(a), lab(b))

def mix(a, b, t):
    pair = lambda s: [int(s.lstrip('#')[i:i+2], 16) for i in (0, 2, 4)]
    return "#%02X%02X%02X" % tuple(
        max(0, min(255, round(p + (q - p) * t))) for p, q in zip(pair(a), pair(b)))

faces = lambda h: (mix(h, '#FFFFFF', LIGHTEN_TOP), h, mix(h, '#000000', DARKEN_RIGHT))
signal = lambda a, b: min(de76(x, y) for x, y in zip(faces(a), faces(b)))   # in situ
noise = lambda h: min(de76(faces(h)[0], h), de76(h, faces(h)[2]))           # same wall, other light

ERAS = ["#C98A5E", "#D9C288", "#8A6E33", "#D2C8AA", "#9D9C8C",
        "#E9C2A1", "#8E5F4E", "#B9B5AC", "#96A1AB", "#4A4E58"]

for i, (a, b) in enumerate(zip(ERAS, ERAS[1:]), start=1):
    s, n = signal(a, b), min(noise(a), noise(b))
    print(f"era {i}->{i+1}  swatch {de76(a, b):5.2f}  in-situ {s:5.2f}  "
          f"floor {n:5.2f}  {'PASS' if s >= n else 'FAIL'}")
```

---

## 12. Era six moved to a Northern Early Modern palette on 2026-08-03

**This section is the live statement of era six's palette.** Everything above it about era
six is a dated record of an earlier pass.

### 12.1 The current four-material system

| Material role | Hex | L\* | C\* | h° | Use |
| --- | --- | --- | --- | --- | --- |
| **Body: warm buff lime plaster** | `#C7A48E` | 69.9 | 18.9 | 59.5 | The dominant wall field |
| Localized hand-made muted red-brown brick | `#B1775A` | 55.4 | 31.7 | 52.4 | Gable edges, chimneys, bases or selected secondary façade areas; never dominant |
| Pale dressed-stone trim | `#D8CDB3` | 82.7 | 14.3 | 91.8 | Doors, windows, quoins, structural corners and plinths |
| **Accent: dark cool slate/sheet lead** | `#596675` | 42.6 | 10.1 | 262.6 | Every roof, dome, cupola and metal cap |

The ladder continues to track only the body and principal accent. Brick and dressed stone are
material roles inside the era, not new global palette dimensions. Terracotta survives only as a
small fired-clay object; no roof carries it.

### 12.2 Candidate search, not taste

The search used the guard's exact D65 sRGB → CIELAB conversion, three-face tone model and
two-channel verdict. A CIELAB grid over plausible warm bodies was converted back to quantized
sRGB, deduplicated, and checked against all nine other bodies. Each candidate had to:

1. clear every existing in-situ shading floor;
2. clear the adjacent/co-visible ΔE76 floors in `eraVisualDistinctness.test.ts`;
3. satisfy the unchanged two-channel rule against every chromatic body;
4. remain inside era one's chroma ceiling; and
5. separate from the pale ground and the dark roof without an exception.

The initially preferred ochre box — L\* 65.5–71.2, C\* 23.5–35.5, h 71–96° — yielded **zero**
passing quantized colors. The wider warm grid yielded candidates only at the buff/tan edge:
the heavily occupied 65–95° core could not clear every existing guard at this lightness and
chroma. The three finalists were:

| Candidate | L\* | C\* | h° | nearest body ΔE76 | minimum in-situ / floor | minimum two-channel margin | minimum visual-floor margin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **`#C7A48E` selected** | 69.9 | 18.9 | 59.5 | **15.3** | 1.18× | 1.01× | 1.04× |
| `#CBA992` | 71.7 | 18.8 | 61.5 | 13.8 | **1.30×** | **1.08×** | 1.06× |
| `#CEA992` | 71.9 | 19.8 | 59.1 | 14.5 | 1.37× | 1.01× | **1.14×** |

`#C7A48E` wins because it gives the wall the required darker read against Era 4 — **10.8
L\*** rather than 9 — and the strongest nearest-neighbour distance, while still clearing every
guard. It is warm buff rather than rose: green exceeds blue by 22 RGB steps, where the
superseded dusty pink had equal green and blue channels.

### 12.3 Selected body against every era body, the ground and the roof

The in-situ column is the current metric from `eraPaletteLadder.test.ts`: the weakest
corresponding-face ΔE76 under the fixed top/left/right tone model.

| Against | Hex | L\* | C\* | h° | ΔL\* | ΔC\* | ΔH\* | ΔE76 | in situ | floor | signal / floor | two-channel |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 Prehistoric | `#C98A5E` | 62.8 | 38.3 | 59.9 | 7.1 | **19.4** | 0.2 | 20.7 | 14.02 | 9.61 | 1.46× | **pass**, decisive chroma |
| 2 Neolithic | `#D9C288` | 79.1 | 32.2 | 90.2 | 9.2 | 13.3 | 13.0 | 20.8 | 15.09 | 9.61 | 1.57× | **pass**, two channels |
| 3 Bronze Age | `#5F6D4E` | 44.1 | 19.3 | 126.1 | 25.8 | 0.5 | 21.0 | 33.3 | 23.50 | 9.61 | 2.45× | **pass**, two channels |
| 4 Classical | `#D2C8AA` | 80.7 | 16.3 | 95.0 | **10.8** | 2.5 | **10.7** | 15.4 | 10.76 | 6.72 | 1.60× | **pass**, lightness + hue |
| 5 Medieval | `#9D9C8C` | 64.0 | 8.9 | 106.6 | 5.9 | 10.0 | 10.4 | 15.5 | 11.36 | 9.61 | 1.18× | n/a, near-neutral |
| 7 Industrial | `#8E5F4E` | 44.9 | 24.4 | 45.8 | **25.0** | 5.6 | 5.1 | 26.1 | 18.62 | 9.61 | 1.94× | **pass**, decisive lightness |
| 8 Atomic | `#B9B5AC` | 73.8 | 5.1 | 92.3 | 3.8 | **13.8** | 5.5 | 15.3 | 11.19 | 7.13 | 1.57× | n/a, near-neutral |
| 9 Information | `#96A1AB` | 65.7 | 6.8 | 254.4 | 4.2 | 12.1 | 22.4 | 25.8 | 18.96 | 9.22 | 2.06× | n/a, near-neutral |
| 10 Cyberpunk | `#4A4E58` | 33.2 | 6.5 | 276.7 | 36.8 | 12.4 | 20.9 | 44.1 | 31.27 | 9.61 | 3.26× | n/a, near-neutral |
| Early Modern ground | `#ECE4D3` | 90.8 | 9.3 | 90.9 | **20.9** | 9.6 | 7.2 | 24.1 | 17.35 | 3.28 | 5.29× | figure / ground |
| Early Modern roof | `#596675` | 42.6 | 10.1 | 262.6 | **27.3** | 8.7 | 27.1 | 39.4 | 28.33 | 9.61 | 2.95× | wall / roof |

The four named collision checks therefore separate by different channels: Era 2 by
lightness/chroma/hue, Era 4 by lightness and hue, Era 7 by decisive lightness, and Era 8 by
decisive chroma despite similar lightness.

### 12.4 Guard discipline

The two existing palette guards and all thresholds remain unchanged; no exception was added.
Before any live source changed, `eraPaletteLadder.test.ts` and
`eraVisualDistinctness.test.ts` were green at **22/22**, and the new targeted
`eraSixPaletteConsistency.test.ts` was run red: **4 failed**, naming the missing selected body,
the stale runtime advisor, eleven stale prompts and live dusty-pink occurrences. The new guard
derives the canonical PNG census from the JSONL outputs, floors it at eleven, and checks the
body/roof roles across nine live sources.

---

## Related

- `City_Art_Bible.md` §2 — the fixed three-tone face model the floor is derived from, and §1.2,
  the retired per-district hue axis.
- `apps/web/src/city/palette.ts` — `faceTones`, and `DISTRICT_HUES`, which is domain-keyed and
  holds no era hue.
- `test/eraPaletteLadder.test.ts` — the guard.
- `eras/README.md` — the re-dressing ruling that makes the island accumulate every era's
  buildings, and the reverted 2026-07-28 footprint change.
- `eras/era-0*/style-guide.md` — the ten palettes, stated at `## The era's palette` (eras two
  to ten) and `## 4. Palette` (era one).
- `packages/economy/src/civicCatalogue.ts` — where civic footprints and costs actually live.
