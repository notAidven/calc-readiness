# 2026-08-01: ten eras of vehicles, and what makes a city look inhabited

**Status: DESIGN RECORD and ART BRIEF. Nothing here is decided and no production code changes.**
Sections 2, 3 and 4 are proposals for the team lead; section 6 is a recommendation on two shipped
constants; section 7 names what needs Evan.

**Measured at `integration` `3b655728`.** Every figure below was read at that tip rather than
carried. Two open pull requests are read from the API rather than inferred:
#273 (`evan/city-population-happiness`,
tip `ce48c73a`) is **OPEN, `mergedAt: null`**, and
#298 is **CLOSED, `mergedAt: null`**.
Both facts change what this design can lean on; see section 5.3 and section 8.

**Scope.** What MOVES in the city and what makes it look LIVED IN, per era, for all ten. This
document does not touch `City_Art_Bible.md`, any era style guide, any civic catalogue, or any
`.ts` file.

**The reframe this replaces.** `2026-08-01-game-feel-mechanics-backlog.md` §6.2 carried the item as
*"Carts on the road network"*, scoped as wiring two unconsumed constants. The team lead rejected
that scoping:

> *"not the carts, those need to be designed. also do a design brief pass on cart-like vehicles for
> each era and other lifelike things for a given era"*

He is right that the engineering framing put the cart before the design. The backlog's own text is
the evidence: it recommended *"era one's vehicle is a handcart"* while era one's style guide bans the
wheel outright (see 2.1). A constant with a renderer attached would have shipped an anachronism.

---

## 0. Why per-era vehicle art is permitted, which is the first objection anyone will raise

**The objection.** The 2026-07-29 re-dressing ruling froze skill buildings on art-overhead grounds,
so a proposal for ten new per-era art assets looks like the thing that ruling just refused.

**The answer is that this ruling is precisely what permits it**, and the ruling says so in its own
words. `eras/2026-07-29-skill-building-rulings.md` §2.1 states the line, and states it as predictive
rather than as a list:

> **Per-era art is frozen where it multiplies with a catalogue and kept where it is one-per-era.**
> Anything added later is decided by asking which side of that line it falls on rather than by
> arguing from R3's wording.

That section's own table is the population: skill buildings are *"62 built, once each"* and are
frozen; civic buildings are *"~40, one look each"* and are frozen; the island, the advisor and the
road surface are *"one"* per era and *"ten"* across the run, and all three re-dress. The town hall is
*"one"* and re-themes, and §2.1 notes that the rule **explains** that exception rather than being
fitted to it: *"it is exactly why the hall could be excepted from R3 in the first place, being one
building rather than a catalogue."*

**A vehicle is one per era.** It multiplies with nothing: there is no catalogue of vehicles, no
learner action that buys one, and no node that owns one. Ten eras, ten looks, and section 5.2 gets
that down to **six distinct chassis** by sharing two families across five eras. So it lands in the
kept family beside the island, the roads and the advisor, and it is cheaper than any of the three.

**The same test is applied honestly to ambient life in section 3, and it refuses five proposals.**
Smoke per building, laundry per dwelling, market stalls, lit windows and per-door display panels all
multiply with the catalogue, and section 3 puts every one of them in the frozen family. That is what
makes the vehicle's exemption an argument rather than a preference: the test is being run, and it is
coming back "no" more often than "yes".

**Two further decided items say the same thing from the other direction.** D-ERA32 (era design §5.2a,
and the §16 row) rules that *"THE ISLAND CARRIES THE ERA; THE BUILDINGS CARRY THE LESSON"*, with the
load-bearing consequence that *"an era's identity has to be visible **in the ground**, because the
ground is the only large surface that changes at an advance."* A vehicle is on the ground, belongs to
nobody, and records nothing the learner earned, so it is the era's rather than the learner's.
D-ERA30's own amendment banner (era design §5.5) reaches the same conclusion for the road surface, in
the same sentence quoted above.

---

## 1. What ambient life ships today, measured

The lead asked for this before any proposal, and the answer is shorter than the specification.

**`Game_Visual_Design_Brief.md` §4.7 and `City_Art_Bible.md` §7 both specify the same five-item
list.** §4.7 reads: *"Procedural and cheap: ~4 slow drifting clouds, a crate bob on construction
sites, a gentle bob on the selected plot, and a few traffic dots + citizen drifters for scale.
**Everything non-essential freezes under reduced motion** — the city is fully legible static."*

**One of those five ships.** Measured by sweeping `useFrame(` over `apps/web/src`, which returns
thirteen non-test call sites:

| Specified in §4.7 | Ships at `3b655728` | Evidence |
| --- | --- | --- |
| ~4 drifting clouds | **No.** `palette.ts:174` declares a `cloud` colour and `:201` resolves it; a sweep for consumers of that field returns the declaration and the resolution and nothing else | `palette.ts:174`, `:201` |
| Crate bob on construction sites | **No.** A sweep for `crate` under `apps/web/src/city` returns nothing | sweep empty |
| Selected-plot bob | **No.** `GhostBuilding.tsx` animates on the frame loop (`:106`, `:177`) but for placement feedback, not an idle bob | `GhostBuilding.tsx` |
| Traffic dots | **No.** This is the subject of section 6 | `citizens-tuning.ts:168`, `:171` |
| Citizen drifters | **No** on `integration`. `Citizens.tsx` and `citizenRoutes.ts` exist only on #273, which is OPEN | `git ls-tree origin/evan/city-population-happiness` |

**The one thing that moves on the ordinary island is the gull flock**, and it is worth reading closely
because it is the precedent every proposal below inherits:

- **Five gulls** (`COUNT = 5`, `StarterIsland.tsx:1546`), each on its own elliptical loop.
- **Angular speed 0.13 to 0.25 rad/s** (`:1549`) on ground-track radii of **30 to 52.2u** (`:1553`,
  derived from `islandR` 30 and `seaR * 0.9` 52.2), so tangential speed runs **3.9 to 13.05 u/s**.
- **Altitude 34.5 to 51u** (`:1563`), which the comment calls *"well clear of buildings"*.
- **Every ground track sits outside the buildable disc on purpose**: *"the min radius keeps every
  ground-track OUTSIDE the buildable disc so a gull never wheels over the build area"*
  (`:1550-1552`).
- **Wing flap 2.4 to 3.6 rad/s** (`:1569`), and a vertical bob of 1.2 to 2.6u at 0.5 to 0.9 rad/s
  (`:1564-1565`).
- **Reduced motion holds a posed still frame**, seated before the first frame (`:1574`) and never
  updated (`:1588-1590`). It does not disappear.
- **All of it is procedural geometry in code.** Icosahedra for the body and head, a cone for the beak,
  and flat `ShapeGeometry` outlines for the wings and tail (`:1471-1495`).

**Two other things move, and neither is ambient.** Mastery stars bob at
`Math.sin(time * 1.6) * 0.16` and pulse at 3 rad/s when celebratory (`MasteryStars.tsx:166`, `:175`);
the town hall bounces once on a celebration token (`TownHall.tsx:101-113`). Both encode state, so
neither is decoration and neither is a precedent for ambient motion.

**Three more move only inside the Hard Winter crisis**: falling snow (`winterSnowfall.ts`), the flame
(`winterFire.ts`), and the drift of every smoke column on the board (`WinterGround.tsx:798-812`).
Section 3.1 leans on the third of those hard, because it is already the shape a frozen-family ambient
primitive has to take.

### 1a. The finding nobody has recorded: the gulls are era-blind

`StarterIsland` **does** take an era and **does** dress its ground from it: `eraId = CURRENT_ERA_ID`
at `:1608`, `islandGround(eraId)` at `:1625`. The line immediately after the ground is built passes
the flock two props, and neither is the era:

```tsx
<Birds layout={layout} reducedMotion={reducedMotion} />
```

That is `StarterIsland.tsx:1630`, and `buildBirds(layout, reduced)` at `:1541` takes no era either.
**So era one's gulls fly over era ten's lit deck**, and they will keep doing it after every other
per-era surface has advanced. This is the same class of gap D-ERA26, D-ERA28 and D-ERA30 were each
opened to close, described in era design §5.5 as *"a visible surface nothing owned, still wearing the
art it shipped with."*

It is also the cheapest item in this whole document to fix, and section 3.5 costs it.

---

## 2. The ten vehicles

**How to read the source column.** **TRANSCRIBED** means the era's own guide names the object and the
sentence is quoted. **RATIFIED** means the sentence is additionally in `eras/README.md`'s ten-era
ladder, which `apps/web/src/city/islandGround.ts:100-151` transcribes verbatim into code, so it is
authored data rather than prose. **INVENTED** means the guide is silent and the design is mine; every
invented entry says what constrains it and what it is invented against.

| Era | Vehicle | Traction | Cargo | Source |
| --- | --- | --- | --- | --- |
| **1** Prehistoric | **the hide sled** | One person, hauling | A corded hide bundle | **INVENTED inside an explicit ban** (2.1) |
| **2** Neolithic | **the grain sled** | One person, hauling | Lidded baskets and a sheaf | **TRANSCRIBED** (2.2) |
| **3** Bronze Age | **the ox cart** | One ox | Ore in baskets | **RATIFIED** (2.3) |
| **4** Classical | **the stone dray** | One ox | Sawn ashlar blocks | **TRANSCRIBED** (2.4) |
| **5** Medieval | **the barrel cart** | One horse | Barrels and corded sacks | **TRANSCRIBED** (2.5) |
| **6** Renaissance | **the carrying chair** | Two bearers | A passenger | **INVENTED against one sentence** (2.6) |
| **7** Industrial | **the rail wagon** | A saddle-tank engine | Crates and barrels on pallets | **TRANSCRIBED** (2.7) |
| **8** Atomic | **the delivery van** | Its own engine | Closed body, no visible load | **TRANSCRIBED** (2.8) |
| **9** Information | **the cargo cycle** | One rider | A clad front box | **TRANSCRIBED** (2.9) |
| **10** Cyberpunk | **the delivery drone** | Four rotors | A slung parcel | **TRANSCRIBED** (2.10) |

**Read down the traction column and it is the run's clearest single line.** One person hauling, then
an animal, then a machine, then a person again on a cycle, then nothing you can see. Era three is
where traction arrives and era eight is where the animal leaves, and both boundaries are the era
guides' own.

**One scoping decision, stated so it is not read as an omission.** The vehicle here is the **road**
vehicle. Every one of the ten guides already authors a per-era boat under its own *"Where boats
land"* heading (era one's is *"a small hide boat pulled up above the waterline"*,
`era-01-prehistoric/style-guide.md:673`; era ten's is *"an enclosed pontoon terminal under the
deck"*, `era-10-cyberpunk/style-guide.md:836`), those sentences are inside D-ERA26 and therefore
Evan's, and they are authored as **static**. Making a boat move is a separate proposal and this
document deliberately does not make it. Section 8 records it as an open question.

### 2.1 Era one, Prehistoric: the hide sled (INVENTED, inside an explicit ban)

**The guide does not say what era one's vehicle is. It says three times what it cannot be.**

> *"no coins, no money, no clock, no written records, no scales with a metal beam, **no wheeled
> cart**, no building above one storey."*
>
> (`era-01-prehistoric/style-guide.md:899`, §8b rule 2, which describes §2's absent list as *"a hard
> boundary, and it is the longest in the run"*)

> *"metallurgy, the wheel, or agriculture — the wheel and cultivated grain belong to era two."*
>
> (the same file, `:224`)

> *"**Where boats land.** A worn gravel slipway with a small hide boat pulled up above the
> waterline. That is the whole of it."*
>
> (the same file, `:673`)

**So era one's vehicle is invented, and it is invented inside a fence the guide built.** No wheel is
available; §2's four materials are rammed earth, timber, thatch and undressed stone (`:127-132`);
lashings are the only joint (`:151-152`); and the island's own props already include *"A lashed
drying rack"* (`:677`) and *"Drying racks: lashed timber A-frames, one with hides, one with fish, one
empty"* (`:862`). A sled of lashed poles with hide over it is that technology carrying something
instead of drying it.

**The form.** Two poles converging to a blunt point at the leading end, three cross-battens lashed
across them, a hide bundle corded down over the battens, hauled by one figure at the point. The nose
lifts and the tail drags, so the silhouette is **a wedge with a lump on it**, tilted, low.

**Its palette costs nothing, and this is the strongest single answer to the art-overhead objection.**
`StarterIsland.tsx:80-90` already exports `ERA_ONE_PROP_TONES`, described in its own docblock as
*"ERA ONE'S OWN PROPS, in era one's own tones"* and split out from the terrain palette precisely
because props are per-era authored content. It holds `timber: 0xa5825f`, `hide: 0xa9835c`,
`hideDark: 0x8a6845` and `cord: 0x6d5a41`. **The whole sled is in that table already.**

**What it must not resemble.**

| | the hide sled | separated by |
| --- | --- | --- |
| **The drying rack** on the same island (`:677`, `:862`, and rendered at `StarterIsland.tsx:998`) | Low, tilted, moving, one hide bundle **corded down flat** | **Posture.** The rack is two A-frames standing upright under a ridge pole with hides draped OVER it; the sled lies down and its load is lashed ON it |
| **Era two's grain sled** (2.2) | A framed wedge of poles, nose up, one soft bundle | **Weave and level.** Era two's is a flat woven panel running level, carrying round baskets |
| **Any cart** | **No wheel of any kind** | The era bans it in as many words. A modeller who adds a roller, a runner-disc or a pivot has broken §2 |

### 2.2 Era two, Neolithic: the grain sled (TRANSCRIBED)

**The sentence, and it is the clearest transcription in the ten:**

> *"**No cart anywhere near a field.** §4 gives this era **rotation and not transport**; the wheeled
> cart is era three's authored first. **Sheaves are carried on a back, dragged on a hurdle, or moved
> in baskets.**"*
>
> (`era-02-neolithic/style-guide.md:875-877`)

> *"**The wheel, precisely.** Era one reserves the wheel for this era along with cultivated grain,
> and this era should take only half of it: **rotation, not transport.** The potter's wheel and the
> turning quern belong here. The wheeled cart belongs to era three."*
>
> (the same file, `:303-306`)

**And the era has no draught animal**, which the guide states as the deeper constraint:

> *"the deeper constraint is that **this era authors no draught animal**. Its only livestock is
> `RAD.2`'s flock and the island's *penned corner … holding a few animals*, and the ox that once
> appeared here left with the threshing circle."*
>
> (the same file, `:866-868`)

**The form.** A flat brushwood hurdle panel dragged level, with two lidded baskets and one sheaf
corded on it. The era's props kit already builds hurdles: *"**Penning**: brushwood hurdle sections, a
stake-and-hurdle corner, a gate of lashed poles"* (`:1050-1051`), and its storage is *"pits with
woven lids at two diameters, a lidded clay jar"* (`:1046`). Nothing new is invented; two existing
props are put on the ground and moved.

**The one place it can be wider than era one's**, and it is measured. Era one's road tread is
`widthFactor: 0.42` (`roadSurfacing.ts:152`), so 1.68u across a 4u cell; era two's is
`widthFactor: 0.5` (`:243`), so 2.0u. A 1.9u-wide panel sits inside era two's tread and would
overhang era one's, which is one more reason the two are the same family with different plans.

### 2.3 Era three, Bronze Age: the ox cart (RATIFIED)

**This is the only vehicle in the run whose sentence is in code.** `islandGround.ts:114` transcribes
`eras/README.md`'s ladder row verbatim:

> *"**Traction and stone.** An animal that can pull a cart can pull an ard, so furrows run a plot's
> full length and the fields go straight — and the water grows a wall"*
>
> (`eras/README.md:528`, third column; the same string at `apps/web/src/city/islandGround.ts:114`)

The style guide adds the object, the props kit adds its states, and the island section adds its
trace:

> *"and **the first wheeled cart on the island** — era two took the wheel as rotation only, and this
> is the era that puts it under a load."* (`era-03-bronze-age/style-guide.md:181-183`)

> *"**The first wheeled cart**: a two-wheeled cart loaded, the same cart tipped and empty, and a
> spare wheel leaning against a wall."* (the same file, `:728-729`)

> *"**Cart ruts**, which no earlier island has, because the wheeled cart is this era's authored
> first."* (the same file, `:588-589`)

**The form.** Two wheels, a plank bed, a pair of shafts running forward to a single ox. The wheels are
**solid discs or crossbar discs**, never spoked, because §2 withholds iron and the guide's *"Nothing
that implies iron, mortar or the arch"* (`:185`) means no tyre and no fine section. Body in the era's
ochre mass hue with bronze fittings, which is the era's stated ornament: *"Everything decorative is a
piece of hardware doing a job — a strap, a boss, a stud, a cap on a beam end"* (`:171-173`).

**The cargo is ORE and not INGOTS, deliberately.** The props kit offers both: *"ingots stacked in a
lean-to, ore in baskets"* (`:719-720`). Ingots are the era's material and therefore its currency
(`packages/economy/src/materials.ts`), and a cart of currency crossing the island is exactly the
passive-generation read the lead ruled out (R6: *"we dont need the buildings to passively produce
income"*). **Ore in baskets is raw material going somewhere, which is a city working rather than a
city paying.** Section 4.4 makes that a rule.

### 2.4 Era four, Classical: the stone dray (TRANSCRIBED, with one inference flagged)

> *"**Visible technology, and the era is generous with it:** the treadwheel crane, the timber scaffold
> with its putlogs, arch centring, the lime-slaking pit, the plumb and the square, the surveyed line
> itself … and **the loaded cart on a paved street**."*
>
> (`era-04-classical/style-guide.md:227-231`)

> *"the **harbour mole** with its loaded carts"* (the same file, `:1190`, in the era's context
> palette)

> *"`POL.4`'s are **barrel-vault mouths you drive a cart into**, deep and shut behind"* (`:643`)

**The form.** Four wheels rather than two, **spoked**, on a low plank bed, behind one ox. Cargo is
sawn ashlar from the era's own context palette (*"the **stone yard** and its sawn blocks"*, `:1188`),
which is the material the whole era is about and is not its currency.

**One inference, flagged rather than smuggled.** Era four's guide names a cart and does not name the
animal in front of it. Era three's ratified ladder row supplies the arrival of traction and era five's
props kit supplies a horse (2.5), so **an ox carried forward from era three is inferred here** rather
than transcribed. If the era wants a mule or a pair, that is a one-word change and it is Evan's.

**What it must not resemble.** Era three's ox cart, which stands on the island permanently under
D-ERA11 and the re-dressing ruling. **They separate on wheel count and wheel section, never on
size:** two solid discs against four spoked wheels. Cargo reinforces it, ore baskets against squared
pale blocks, and the two cargoes differ in value as well as in shape.

### 2.5 Era five, Medieval: the barrel cart (TRANSCRIBED)

Era five names no cart in its visible-technology list, and its buildings and ground are built around
one:

> *"A tall stone-gabled barn with **opposed cart doors** in the long sides and a threshing bay between
> them"* … *"a **cart-wide slot** straight through the building with daylight on the far side"*
>
> (`era-05-medieval/style-guide.md:451`, `:456`)

> *"**Water and ground**: a well-head with a windlass and bucket, **a horse trough**, cobbled fans
> with a central gutter, **cart ruts through mud**, **a mounting block by a door**."*
>
> (the same file, `:919-920`, props kit)

**The horse trough and the mounting block are the transcription that matters**, because they are the
era's authored draught animal. Nothing else in the props kit implies traction, and both of those imply
a horse specifically.

**The form.** Two **tall** spoked wheels, a high open frame body, one horse. Cargo is *"barrels
standing and on their sides, corded sacks in a pile"* (`:917`).

**What it must not resemble.** The two carts already on the island. The separator is the **wheel
diameter relative to the body**, which is the one axis that reads at zoom-out: era three's discs are
small and heavy, era four's spoked wheels sit under a low bed, and era five's stand taller than the
bed they carry. That is the same *"break in the silhouette reads at any distance"* logic the guide
uses for its own roofs (`:215-216`).

### 2.6 Era six, Early Modern: the carrying chair (INVENTED, against one sentence)

**The guide is silent, and the silence is deliberate.** Era six's visible-technology paragraph is
instruments and nothing else: *"the plane table on its tripod, ranging rods in a bundle, the sundial,
a level and a long straightedge, dividers, the drawing weighted flat on a trestle, **the wooden model
of the finished building on a stand**, the timber centring under an arch, and the hoist working off a
scaffold. **This is the first era whose technology is for *deciding* rather than for lifting**"*
(`era-06-early-modern/style-guide.md:232-236`). Its props kit (`:1124-1145`) has no vehicle. **So era
six's vehicle is invented.**

**One sentence constrains it, and it is a strong one:**

> *"**Where boats land.** A **designed** landing: a symmetrical stone stair descending to the water
> between two pedestals, mooring rings rather than bollards, and a covered landing loggia. **Working
> cargo has been moved to a separate plainer wharf to one side, which is itself a Renaissance
> decision — the ceremonial arrival and the goods entrance are now different places.**"*
>
> (`era-06-early-modern/style-guide.md:717-720`)

**That sentence says era six's transport idea is the SEPARATION of ceremonial arrival from goods.**
The goods half is already standing: era five's barrel cart is frozen on the island and keeps working.
So era six's own vehicle should be the **arrival** half, because the goods half would be era five's
cart drawn twice.

**Recommended form: the carrying chair.** A small closed box on two long poles, one bearer at each
end, a passenger inside. It is the only vehicle after era two with no wheel, which makes it
unmistakable at any zoom; it is the calmest object in the run, moving at exactly a walking pace by
construction; and it needs no animal, which keeps the animal's arrival at era three and its departure
at era eight both clean.

**The alternative, and why it lost.** A **closed coach** on four wheels behind two horses is equally
period-correct and has the more familiar name. It was not recommended for three reasons: it is a
fourth four-wheeled cart in six eras, it is close to era eight's van in silhouette, and it reaches for
a pair of horses when no era in the run has authored more than one animal. **If the lead prefers the
coach, nothing else in this document moves**, and the family count in 5.2 stays at six chassis with a
different sixth.

**The name is flagged.** *Sedan chair* is the period term and it fails the recognisability rule that
turned `flint` into `stone` (R7), on the same test `eras/README.md:848-851` applies to buildings:
*"would a typical learner know what this building is without being told?"* **the carrying chair**
describes exactly what it is in words nobody has to look up. Section 6.3 records that a vehicle is
never announced, so this rule bites on the identifier a developer reads and not on a learner-facing
string, which is a weaker bite than a building name takes.

### 2.7 Era seven, Industrial: the rail wagon (TRANSCRIBED)

> *"**Transport ground**: rails let into setts, a **turntable**, a **weighbridge** with its plate
> flush in the paving and a small hut beside it, crates and barrels **on pallets**, **a loaded flat
> wagon**."*
>
> (`era-07-industrial/style-guide.md:730-732`, props kit)

> *"**Ground made hard.** Setts and engineering brick where wheels run, **iron rails let into the
> surface**, and cinder rolled flat everywhere else."*
>
> (the same file, `:153-154`)

> *"the steam crane on rails, the boiler and its chimney … **rails let into setts with a turntable at
> the junction**, the weighbridge, the water tank on its stage, gas lamps on standards, and **a plume
> of steam vented at low level**."*
>
> (the same file, `:187-192`)

**Era seven is the one era where the vehicle rides a course of the road rather than its tread**, and
D-ERA30 is what makes that possible. Era seven's own closure block rules the rail into the road tile:

> *"**Roads: rails LET INTO a single sett surface** … **One surface, with the rail and the kerb read
> as material and profile changes within it** rather than as separate slabs laid on top. It keeps
> everything a viewer needs to read — **a tram line is still obviously a tram line** — and it removes
> the geometry that breaks."*
>
> (the same file, `:1008-1013`)

**The form.** A low four-wheel flat wagon, crates and barrels corded on pallets, coupled behind a
**squat saddle-tank engine**. The engine is the one addition beyond the transcription, and it is
recommended rather than asserted: a wagon with nothing in front of it reads as parked, and era seven
is the only era whose guide authors a self-propelled thing (*"the steam crane on rails"*).

**Steam is permitted and glow is not.** The guide authors *"a plume of steam vented at low level"*
(`:190`) and then sets the trap explicitly: *"**NO EMISSIVE SURFACE, AND THIS IS THE TRAP.** … A wet,
black, puddled ground under gas lamps is **exactly** where an artist reaches for a warm glow pooling
on the setts … **The puddles hold the SKY, which is why they are authored that way**"* (`:609-615`).
**So the engine's firebox does not glow, its lamp does not pool, and its plume is pale grey against a
dark ground.**

### 2.8 Era eight, Atomic: the delivery van (TRANSCRIBED)

**Era eight is the one era where the shipped constant's name is correct**, which is worth saying
before section 6 renames it:

> *"two full-height roller doors and a canted apron with a fuel point on it, which is a motor garage
> exactly — and **this is the era of the car**"*
>
> (`era-08-atomic/style-guide.md:853-854`, quoting the reasoning the re-authored `LF.3` retired)

> *"the **vehicle depot** with its apron and fuel point — *(kept as a world setting after `LF.3` was
> re-authored: rule 1 makes a framing a fact about the era's world, and **the era of the car has
> vehicle aprons whether or not a skill building is one**)*"*
>
> (the same file, `:1032-1034`, the era's context palette)

> *"**Asphalt where vehicles run**, and **painted lines and hatching organising it**"* (`:602`)

**The form.** A small box van, not a saloon. Three reasons, and the first is measured. A box reads at
5.64 px/u (section 4.1) where a saloon's tapered roofline does not; the era's authored setting is a
**depot with an apron and a fuel point** rather than a driveway, so a working vehicle is the
era-correct one; and the era's *"Bicycle stands"* (`:775`) already imply the private half of its
traffic without anything having to be drawn for it.

**Its flank carries a painted band and a plain plate, and no legible word.** Era eight's ornament is
typography (*"**Lettering is the era's real ornamental language.** Confident sans capitals on a
fascia"*, `:169-171`), so lettering is the era-correct identifier. But at 5.64 px/u no word is legible
anyway, and a legible word would be a learner-visible string nobody owns. **A band and a plate get
the era's idiom without inventing copy.**

### 2.9 Era nine, Information: the cargo cycle (TRANSCRIBED, with the legibility objection answered)

> *"**Cycle docks**: a rank of matched stands with a small ticket post."*
>
> (`era-09-information/style-guide.md:815`, props kit; the same item at `:683` in the island's
> margins)

> *"Vehicle routes here are **the same unit paving in a different module and a different band**, flush
> with everything around them, level, kerbless in places and separated by tactile and colour changes
> rather than by height."*
>
> (the same file, `:690-692`)

**The era's transport idea is that transport has become a service and the private vehicle has
receded.** Its `hall` mass is *"the transit concourse"* (`:339`), its boat landing *"looks like a
transit stop rather than a harbour"* (`:675`), and its one vehicle-sized opening on a building is a
goods shutter at a gable end that the guide calls out as the only one (`:369`).

**The objection, and it is the strongest against any entry in this table.** A bicycle is a frame of
thin members. At the sizing floor in section 4.1 it is a scribble, and the lead's own constraint is
that *"a cart the size of three pixels that reads as a smudge is worse than no cart."*

**The answer is a rider and a box, not a different vehicle.** A **cargo cycle** is a lump on two
wheels: the front box is a solid mass roughly 0.8u cubed, the rider is a second mass above and behind
it, and the two together make one legible silhouette with the wheels reading as the gap under it. **The
frame never has to read; the box and the rider do.**

**The box is built out of the era's own enclosure idiom rather than invented.** The guide does not
author a cycle box, but its props kit authors the vocabulary one is made of twice over: *"matched clad
enclosures with hinged lids"* (`:816`) and *"a small clad box with a glazed face and no door on the
side you can see"* (`:822-823`). **A clad box with a hinged lid is era nine's answer to any container**,
which is why this is a transcription of the material and an invention of only the mounting.

**And it comes with a parked state for free.** The cycle dock is already an authored prop, so era
nine's ambient life includes a rank of the same object standing still, which is exactly the
*"lifelike"* read at zero extra geometry.

**What must NOT be drawn.** A service van. The era's whole habit is that servicing is hidden: its
`site` stage is *"A hoarded plot … a gate, and **a wheel wash**. You cannot see in"* (`:791`), and
`EL.4`'s plot holds *"**no tank, no bunded pad, no fence, no trailer, no dock apron** and no
planting"* (`:379-380`). A visible van would contradict the era in the one place it is most precise.

### 2.10 Era ten, Cyberpunk: the delivery drone (TRANSCRIBED)

> *"**Drone docks**: a deck-edge landing plate, a wall cradle, a parcel locker beneath."*
>
> (`era-10-cyberpunk/style-guide.md:970`, props kit)

> *"**Delivery drones docked on the deck edge.**"*
>
> (the same file, `:841`, the island's margins)

> *"a **flat launch-and-recovery deck** ringed by a low blast parapet, with **landing cradles in a
> rank** across it and **a wall of parked drones in an open rack** along the sheltered side"*
>
> (the same file, `:484-485`, `TRG.2`'s Drone Command)

**The form.** A small four-rotor frame, a flat dark composite body, a parcel slung under it, flying
**5 to 7u above the deck**: above a person, below any roofline, and nowhere near the 24u ceiling. One
emissive strip along its underside, which is the era's signature and its only bright material: *"**the
emissive edge** … Light is used as *trim*: a line along a parapet, a strip under a soffit … It is not
there to illuminate anything, and that is what makes it ornament rather than lighting"* (`:97-99`).

**It closes the run, and the closure is the argument for it.** Era one drags a load along the dirt;
era ten's load never touches the ground. And it solves era ten's legibility problem rather than
inheriting it: a thing in the air is read **against the sky**, where a thing on era ten's deck is read
against *"perforated deck panels, service hatches, puddles, and rubbish caught in a grating"*
(`:973-974`) plus stacked lit signage. **Era ten is the one era whose ground is too busy to carry a
vehicle, and it is the one era whose vehicle leaves it.**

**Its route is the lit seam, so the roads-buy-life reading survives.** Era ten's road relation is
*"**the road is the ground plus LIGHT**. A route is marked by **lit seams, edge strips and emissive
banding let into the deck**"* (`:848-849`). The drone flies the seam.

---

## 3. Ambient life, per era, with the multiplies test applied to each

**The test, stated once.** Per `eras/2026-07-29-skill-building-rulings.md` §2.1, per-era art is frozen
where it multiplies with a catalogue and kept where it is one-per-era. The population that multiplies
is **62 skill buildings** plus roughly **40 civic buildings** (§2.1's own table). So the question for
each proposal is: **does this attach to a building, or to the setting?**

**The result, up front. Five of the lead's seven named items land in the frozen family.**

| Proposal | Attaches to | Multiplies? | Ruling |
| --- | --- | --- | --- |
| **Smoke from a chimney** | a building | **YES**, ~102 buildings by 10 eras | **FROZEN.** One primitive, and it already exists (3.1) |
| **Laundry / drying** | a `dwelling` | **YES**, and `dwelling` recurs in nine rosters | **FROZEN as a building feature; KEPT as an island-margin prop**, which nine guides already author (3.2) |
| **Market stalls** | nothing, or a civic building | **YES**, and it collides with four bought Market types | **REFUSED** (3.3) |
| **Animals** | split | **Draught animal: NO**, it ships with the vehicle. **Loose livestock: NO**, it is island dressing | **KEPT**, and mostly already authored (3.4) |
| **Birds** | the sky | **NO**, one flock per era | **KEPT**, and it ships era-blind today (3.5) |
| **Water movement** | the lagoon | **NO**, one water per era | **KEPT**, and the cheapest item here (3.6) |
| **Lights coming on** | a building | **YES**, and it is separately banned in eras 7 and 8 and retired for buildings everywhere | **REFUSED for eras 1 to 9; era ten only** (3.7) |

**Two more the guides already author and nobody has listed.** Steam and vents (3.8) and the animated
display (3.9). The second is the one proposal in this document that could accidentally become a
progress readout, and 3.9 says why it must not.

### 3.1 Smoke from a chimney: FROZEN, and the primitive already ships

**Smoke is the trap.** A chimney is a building feature, so smoke-per-chimney is `catalogue × eras`,
which is the exact arithmetic §2.1 uses to freeze buildings. And it is not hypothetical: era six's hub
is authored with *"clustered chimneystacks standing well clear of the ridge in a rhythm, **smoking**"*,
and its own brief calls the stacks *"the whole replacement"* for a hearth that has moved to the wall
(`output/imagegen/era-06-early-modern-building-briefs/README.md`, brief #7). Ten eras of hubs want
that, and so does every dwelling in every era.

**The ruling: ONE smoke primitive, parameterised, and it already exists.**
`apps/web/src/city/three/winterFire.ts:334` is `buildSmokeColumn(seed: number, windDeg: number)`,
driven by two parameters and nothing else, and `WinterGround.tsx:798-812` drifts every column on the
board from one `useFrame`. It is already the shape a frozen-family primitive has to have.

**Where it may attach, and where it may not.**

- **MAY: the town hall**, which is the one building that re-themes (R3's sole exception), so ten hall
  smoke columns are one per era.
- **MAY: island props.** Era one's *"Hearths: a stone ring, a ring with a spit, **a ring with a smoke
  plume**"* (`era-01-prehistoric/style-guide.md:861`) and era two's *"the domed oven cold, the same
  oven with smoke"* (`era-02-neolithic/style-guide.md:1049`) are both already authored, both
  island-side, and both one per era.
- **MAY NOT: any skill or civic building.** Not because smoke is wrong on them, but because the first
  one licenses a hundred.

**One measured caution.** Era seven bans emissive outright (`:606-607`) and era eight bans *"emissive
surface of any kind"* (`:1023`), and `crises/README.md:113-121` records that emissive here *"does not
spill: the surface gets brighter and its surroundings do not change at all."* So smoke is smoke and
never a lit plume, in every era.

### 3.2 Laundry and drying: FROZEN on buildings, KEPT at the margins, and nine guides already author it

Laundry hangs off dwellings, and `dwelling` carries a node in nine of the ten rosters, so
laundry-per-dwelling multiplies. **But the thing the lead is asking for is already authored ten times,
in the island section of each guide, under "Signs of habitation at the margins".** Read as a run:

| Era | What already hangs or dries, authored | Where |
| --- | --- | --- |
| 1 | *"A lashed drying rack"*; *"Drying racks: lashed timber A-frames, one with hides, one with fish, one empty"* | `:677`, `:862` |
| 2 | *"Grain drying on racks"* | `era-02:833` |
| 3 | *"Charcoal heaps under matting"* | `era-03:723` |
| 4 | *"corded bales, sacks on a loading platform"* | `era-04:948` |
| 5 | *"**drying nets on frames**, a hurdle fence, a woodpile under a lean-to"* | `era-05:921` |
| 6 | *"citrus in terracotta pots, bay in tubs"*, since the era clips rather than hangs | `era-06:1138` |
| 7 | *"timber stacked and **stickered**, pallets of brick, slate on edge in bundles"* | `era-07:724-725` |
| 8 | *"clipped shrub blocks held by a kerb"*, and nothing hangs: the era is tidy by design | `era-08:778` |
| 9 | *"grasses in drifts, sedum on a podium top"* | `era-09:821` |
| 10 | *"**weed in the deck gaps**, the only unmanaged growth left on the island"* | `era-10:971-972` |

**So the proposal is not "add laundry". It is "give the already-authored hanging thing a slow sway".**
One motion function, applied to ten props that are already in ten guides, at zero new art. And the run
has a shape already: things hang in the early eras, get stacked in the middle ones, and stop moving
entirely in eight and nine, which is the same *"municipal tidiness"* arc era nine's guide draws for
its planting (`:667`).

**Two guides authorise no sway at all** (eight and nine), and that is correct rather than a gap. Era
eight is the era of *"painted lines and hatching organising it"* and era nine's ground is *"managed"*;
both should be still. **An ambient rule that does nothing in two of ten eras is the rule working.**

### 3.3 Market stalls: REFUSED

**Two independent reasons, and either is sufficient.**

1. **It multiplies, and it multiplies against a catalogue that already exists.** A market is a thing
   the player **buys**: era four has The Market, era five The Market Cross (*"a stepped stone base
   with a shaft and a small canopy … what the lanes converge on, and where a town does business"*,
   `era-05:923-924`), era six The Covered Market, era eight and beyond their own. Those are civic
   buildings, frozen at purchase under D-ERA11.
2. **A loose stall would compete with a bought building for the same read**, which is worse than art
   overhead. A player who has not bought The Covered Market would see market activity anyway, and a
   player who has would see it twice. The civic catalogue's whole argument (D-ERA24's three axes, four
   types per era) rests on a bought building being visibly what buys the thing.

**What is available instead, at no cost.** Every era's props kit already authors the market's furniture
as static dressing: era four's *"Statuary on plinths … a milestone, a boundary stone, a stepping-stone
crossing"* (`:951-954`), era five's market cross, era six's *"stone bench with moulded ends"*
(`:1140`). **Placing those is island dressing and is Evan's; animating them is not proposed.**

### 3.4 Animals: KEPT, and two thirds of it is already authored

**Split into two, because the two land on different sides of the test.**

**The draught animal is part of the vehicle** (section 2), so it is one per era and it costs nothing
beyond the vehicle. The run is: none in eras one and two (era two's guide is explicit, `:866-868`), an
**ox** in eras three and four, a **horse** in era five, none from era six on. **Two animal rigs for
the whole run.**

**Loose livestock is island dressing, and eight of the ten guides already say what it is or that there
is none.** Era two: *"A penned corner of scrub with a brushwood fence, holding a few animals — the
island's echo of `RAD.2`, and it should read as the same technology at a smaller size"* (`:837-839`).
Era three's fields are *"larger and more regular"* with dry-laid walls and *"Gateways have **stone
posts**"* (`:562-564`). Era four onward, the fields leave the island entirely, which
`eras/README.md:529` states as the era-four step: *"and the fields leave the island."*

**So the animal arc is already drawn and it is a good one:** penned animals in era two, working
animals in three to five, and then none, which is exactly the run's *"the last era with soil
underfoot"* line landing at era eight (`eras/README.md:533`). **Nothing new is proposed and nothing
needs to move.**

**One motion note.** A penned animal that walks needs a route, a fence test and a turn; a penned animal
that stands and swings its head needs one sine wave. **Take the second.** Section 4.3's rule covers
it.

### 3.5 Birds: KEPT, and the fix is a table row

**Birds pass the test cleanly**: one flock per era, ten in total, in the same family as the island and
the roads. **And they are the only ambient life that ships**, so this is the one entry that is a
correction rather than a proposal.

**The gap, measured at `StarterIsland.tsx:1630`** and set out in section 1a: the era reaches the ground
and does not reach the flock.

**What era-keying would buy, read off the guides' own water and sky.** The guides do not author birds
directly, but they author the surface birds sit over, and the run is already differentiated: era one's
*"Sparse and windblown"* margins (`:666`), era seven's *"Nearly absent"* vegetation with
*"**Soot-blackened survivors**"* (`:572-573`), era nine's *"reed and iris in the water margins"*
(`:666`), era ten's *"only unmanaged growth left"* (`:827-828`). **A soot-era flock is smaller and
darker; a reed-bed era's is larger and lower; era ten's is a handful over a lit channel.**

**The cheapest possible shape, and it is not ten rigs.** A `Partial<Record<EraId, ...>>` row of
**count, scale range, tone triple and altitude band**, in the same idiom as `ERA_ROAD_SURFACING`
(`roadSurfacing.ts:252`) and `ERA_ISLAND_GROUND` (`islandGround.ts:372`), both of which are `Partial`
with an authored fallback. One geometry, ten rows, and eight of the rows can be absent until somebody
authors them, exactly as the road surfacing's eight are today.

**One thing not proposed.** Changing the flight paths. The comment at `:1550-1552` records a real
decision (*"the min radius keeps every ground-track OUTSIDE the buildable disc so a gull never wheels
over the build area"*), and it should stay.

### 3.6 Water movement: KEPT, and it is the cheapest thing in this document

**Water passes the test at once**: one lagoon per era, ten in total, and D-ERA26 already names water as
the island's (*"terrain, shoreline, water treatment and vegetation are per-era art"*, era design §16's
D-ERA26 row).

**All ten guides already author the water, and the arc is explicit.** This is the run, quoted:

| Era | The water, authored | Amplitude implied |
| --- | --- | --- |
| 1 | *"calm, pale, shallow water — shallow enough near the edges to see the bottom"* (`:659`) | low |
| 2 | *"Pale and shallow at the edge as before, and now **worked for the first time**: fish traps in the shallows"* (`:826-827`) | low, plus static traps |
| 3 | *"the mole has made the harbour side **flat and dead** where the open side still moves … **the first era in which the water has two states**"* (`:580-583`) | **split**: zero inside, low outside |
| 4 | a stone harbour on two sides of the basin (`:761`) | low |
| 5 | *"a tide-mill wheel turning in a channel cut through the revetment"* (`:764-765`) | low, plus one turning wheel |
| 6 | *"Calm, dark, and used as a **mirror** — the design assumes reflection … **the only era in the run in which the water is part of a composition**"* (`:722-725`) | **zero** |
| 7 | *"**Dark, still and industrial.** Oily sheen, floating debris … The lock basin water is dead flat"* (`:584-586`) | **zero** |
| 8 | *"Rationalised and quiet. A **concrete wharf** with rubber fenders"* (`:632`) | low |
| 9 | *"**Managed and clear** … **Level is controlled, so the waterline is constant and there is no tide mark**"* (`:677-680`) | low, and **no tide line** |
| 10 | *"**Channelled and lit** … constrained into defined channels rather than lying in a basin"* (`:831-833`) | low, in channels |

**So the proposal is one function and ten numbers**, and three of the numbers are already stated as
zero by the guides themselves. Era six's mirror and era seven's dead flat are **not** an ambient-life
gap; they are two eras where the correct amount of motion is none, and the guides say so.

**How.** `buildSea` (`StarterIsland.tsx:543`) already carries a shallow-to-deep ramp in **per-vertex
colour**, which `crises/README.md:204-206` names as *"a real gradient tool and it costs nothing."* A
slow vertical displacement of the same vertices on the frame loop is the whole change, at one
`useFrame` and no new geometry.

### 3.7 Lights coming on: REFUSED for eras one to nine, era ten only

**Three independent refusals, and the first is that it was already retired.**

1. **The treatment does not exist and was deliberately not shipped.** `City_Art_Bible.md` §6's
   correction records that the *"Mastery glow bloom"* bullet *"named the retired gold body stage and a
   body-glow treatment that was never shipped — `masteryVisuals.ts:10` states there is no 'building
   comes alive' (lit-windows / body-glow) treatment."* `Game_Visual_Design_Brief.md` §4.4's correction
   says the same twice.
2. **It multiplies, and worse than smoke does**, because every window on every building is a
   candidate.
3. **Two eras ban it outright.** Era seven: *"every light is a flame in a glass"* and *"**NO EMISSIVE
   SURFACE, AND THIS IS THE TRAP**"* (`:202`, `:609`). Era eight: *"no emissive surface of any kind"*
   (`:1023`).

**The one place it is legitimate is era ten, and the crisis folder already ruled it there:**

> *"**Era ten is the one place where the light mechanic is buildable**, because it is subtractive:
> switching a building off is removing an emissive lift from a face, which is exactly what this
> renderer can do."*
>
> (`docs/superpowers/specs/crises/README.md:85-87`)

**So the ambient proposal for lights is: era ten only, subtractive, and on signage rather than on
windows.** Era ten's props kit already authors *"**Stacked signage**: lit plates, boxes and projecting
blades, **some dead and some flickering**"* (`:964-965`). A dead plate that comes on, or a flickering
one, is one material's emissive value moving on one prop, and *"some dead and some flickering"* is the
guide asking for it.

**And it must never key off anything.** Section 4.4's rules cover this: a light that comes on when a
learner finishes something is a progress readout, which BUILD 6 and INV-COS-1 both refuse.

### 3.8 Steam, vents and plumes: KEPT, and it is the smoke primitive again

Era seven authors *"a plume of steam vented at low level"* (`:190`); era ten authors *"**Steam vents
and gratings**: a floor grating with a plume, a wall vent, a stack cowl"* (`:968`) and *"Vents exhaling
steam"* (`:841`). **Both are island props, both are one per era, and both are the same
`buildSmokeColumn(seed, windDeg)` at a different tone and scale.** Nothing new.

### 3.9 The animated display: KEPT, with the one hard constraint in this section

**Two guides author moving numbers.** Era nine: *"**A small illuminated matrix panel on a totem
showing a number that changes**, which is era one's own tally prediction landing on schedule"*
(`:684-686`). Era ten: *"**Animated displays**, the era's tally descendant and one step past era one's
prediction: a scrolling figure, a climbing bar, a cycling panel, in three sizes"* (`:962-963`).

**The multiplies test splits this one down the middle.** Era nine's props kit puts display panels *"on
a bracket, on a totem, and recessed beside a door"* (`:810-811`). **The totem is a free-standing piece
of island dressing and is one per era; the bracket and the beside-a-door versions are building
features and multiply.** So: **the totem version only.**

**And the constraint, which is the sharpest in this section.** Era ten's own guide states it: *"Per
D-ERA8 it stays era ornament: an animated display is on buildings everywhere in this town, and **it
never displays a building's own lesson**"* (`:110-111`). Extend it by one clause, because the risk here
is not a rebus but a scoreboard:

> **A moving number may not be a number about the learner.** Not mastery, not a count of buildings, not
> a percentage, not a streak, not a time. `BrainLift_Game_Design.md:48` records what is refused in
> full: *"no score, currency, count or completion percentage of any kind … nothing keyed to speed or
> consecutive days (**INV-ERA-3**), nothing gating learning (**INV-COS-1**)."*

**The safe form is a number with no referent**: a cycling four-digit figure that means nothing, on a
totem, at the same rate whatever the learner is doing. A modeller can check it by asking what the
number counts. If there is an answer, it is wrong.

---

## 4. Sizing and motion: turning "calm, not bustling" into something a modeller can check

### 4.1 The camera, and the arithmetic every size below comes from

**Six measured facts.** `ISLAND_GRASS_RADIUS = 30`, `SEA_RADIUS = 58`, `GRID_CELL = 4`,
`BUILDABLE_RADIUS = 22` (`worldLayout.ts:26`, `:28`, `:35`, `:37`); `cameraDistance: radius * 2.3`, so
**69u** at default (`:533`); `fov: 32` (`CityScene.tsx:805`); and the dolly clamp
`minDistanceRatio: 0.5` with `maxDistanceRatio: 2.6` (`orbitCamera.ts:33`, `:41`), so **34.5u to
179.4u**.

Frustum height is `2 · d · tan(16°)`, which gives:

| Zoom | Distance | Frustum height | px/u at 1024x**580** | px/u at 1400x900 |
| --- | --- | --- | --- | --- |
| Full in, 0.5x | 34.5u | 19.79u | **29.31** | 45.49 |
| Default, 1.0x | 69.0u | 39.57u | **14.66** | 22.74 |
| Full out, 2.6x | 179.4u | 102.88u | **5.64** | 8.75 |

**The short viewport is the one that governs.** The repository's own QA rule requires spatial claims to
be taken at roughly 1024x580 rather than at a comfortable developer viewport, and the table shows why:
the same object is 5.64 px/u on one and 8.75 px/u on the other, a 55% difference in the size of
everything.

**So the sizing floor is: 5.64 px/u, at full zoom-out, on a 580px-tall viewport.**

### 4.2 How big

**The reference is the gull, because it is the only ambient object measured to read at this camera.**
Its wing outline spans `2 × 1.32 = 2.64u` at scale 1.0 and up to **3.96u** at the 1.5 top of its scale
range (`StarterIsland.tsx:1381`, `:1548`), which is **14.9 to 22.3 px** at the floor.

**Five numbers, and each has a reason that is not taste.**

| Dimension | Value | Why that number |
| --- | --- | --- |
| **Length along the route** | **2.6u to 3.4u** | The low end matches the gull's measured span, so it is at least as legible as the one ambient object that works. The high end keeps a vehicle inside one 4u cell, so it reads as being ON a tile rather than spanning two |
| **Width across the route** | **at most 2.4u** | Era one's **verge** is `widthFactor: 0.66`, so 2.64u (`roadSurfacing.ts:143`). A vehicle wider than that overhangs the road entirely. 2.4u leaves 0.12u of verge showing on each side |
| **Body width for the era-one and era-two sleds** | **at most 1.6u** (era one), **at most 1.9u** (era two) | Era one's **tread** is 1.68u and era two's is 2.0u (`:152`, `:243`). A dragged thing should sit in the tread it wore |
| **Height** | **at most 2.0u**, and the draught animal's withers **at most 1.6u** | Era one's Roundhouse renders at **4.821u** and its Lookout at **9.769u** (`era-01-prehistoric/style-guide.md:173-174`). 2.0u is under half the shortest building in the era that sets the run's floor, so a vehicle can never compete with a silhouette |
| **Era ten's flying height** | **5u to 7u above the deck** | Above a figure, below any roofline, and 17u clear of the `MAX_BUILD_HEIGHT` ceiling of 24 (`worldLayout.ts:269`) |

**And one shape rule that does more than all five numbers.** The Art Bible's own building rule is *"One
dominant shape + one accent, readable at maximum zoom-out"* (`Game_Visual_Design_Brief.md` §4.3).
Applied to a vehicle: **one solid mass, plus one thing that breaks its outline.** The mass is the body
or the cargo; the accent is the wheel gap, the animal's head, the pole, the rotor plane. At 5.64 px/u a
vehicle is roughly 16 by 11 px, and 16 by 11 px can carry exactly two ideas.

**No vehicle casts a shadow.** There is one shadow map from one direction
(`crises/README.md:187-190`), and the citizens design already rules that the crowd casts none
(`citizens-and-city-life-implementation-plan.md:162`). A moving shadow at 16px would be the most
expensive and least legible thing in the frame.

**Which leaves a contact question, and it splits.** For the nine ground vehicles, **the wheels or the
runners are the contact** and no decal is needed. For era ten's drone, **a small dark ellipse on the
deck is needed** or it is unlocatable in the air, and it should ride the derived clearance
`Roads.tsx:257-267` already computes above the road stack's top course rather than inventing a height.
That is one exception with one reason, and it is flagged for the lead in section 8.

### 4.3 How fast, and this is THE rule

> ## THE MOTION RULE
>
> **No moving thing in the city ever travels faster than a citizen walks.**
>
> `WALK_SPEED_UNITS_PER_SEC = 1.6` (`engines/game/src/citizens-tuning.ts:157-158`), documented in place
> as *"~one grid cell (`GRID_CELL = 4`) every 2.5s: legible at the fixed ~49-degree camera."* The design
> section it comes from words it as *"legible at the fixed ~49-degree camera **without looking
> hurried**"* (`2026-07-27-citizens-and-city-life-design.md:996`).
>
> **So the check is one inequality:** `vehicleSpeed <= WALK_SPEED_UNITS_PER_SEC`, for every era, and a
> unit test over the per-era table asserts it without a GPU.

**Why this rule and not a per-era number.** Four reasons, and the third is the one that matters.

1. **It is already the codebase's own calibration of "not hurried"**, measured against this exact
   camera, rather than a number invented for this document.
2. **It is one inequality**, so it survives ten eras without ten arguments.
3. **It deliberately inverts the real world, and the inversion is the whole point.** A cart is faster
   than a walker and a van is much faster. Under this rule era ten's drone is no faster than era one's
   sled, which is what stops the ten-era run reading as an **acceleration toward urgency**.
   `Game_Visual_Design_Brief.md` §2 bans urgency framing and §8 repeats it (*"Calm, warm,
   non-punishing, earned. No urgency"*), and a city whose traffic speeds up era by era is urgency built
   into the progression itself.
4. **It is checkable by a reviewer with a stopwatch.** At 1.6 u/s a vehicle crosses one 4u road tile in
   2.5 seconds. Anyone can count that.

**Recommended values, all at or under the ceiling:** **1.6 u/s** for the wheeled and flying eras
(three, four, five, seven, eight, nine, ten), **1.1 u/s** for the two dragged sleds and the carrying
chair, because a hauled load and two men with a chair are visibly working. **Nothing is faster than 1.6
and nothing is slower than 1.0**, below which an object reads as stuck.

**For comparison, the gulls run 3.9 to 13.05 u/s** (section 1). That is not a violation: they are
birds, they are 34.5u up, and they are outside the buildable disc. **The rule is about the city, not the
sky**, and the boundary is the one `:1550-1552` already draws.

### 4.4 Six more rules, each checkable

**R1. Constant velocity. No vehicle accelerates, brakes, stops, waits or queues.**
The pose function takes `t` and returns a pose, exactly as `poseBird(rig, t, reduced)` does
(`StarterIsland.tsx:1520`), and `t` appears only inside `sin`/`cos` and one linear term. Checkable by
reading the function: **if there is a velocity variable, an easing curve or a state machine, the rule is
broken.**

**This rule does two jobs at once, and the convergence is worth noticing.** A vehicle that stops at a
building looks like it is **delivering**, and R6 (*"we dont need the buildings to passively produce
income"*) refuses exactly that read. A vehicle that stops and starts looks **busy**, and §2's tone bans
refuse that. **The calm constraint and the economy constraint want the same rule.**

**R2. No two vehicles within 3 cells (12u) of each other on a shared route.**
A queue is the single strongest "busy city" signal available, and two carts nose to tail is a queue.
Checkable as a minimum-separation assertion over the derived positions at any `t`.

**R3. Cargo is raw material, never a counted unit and never currency.**
Ore in baskets, not stacked ingots (2.3). Sawn blocks, not silver (2.4). Barrels, not coins (2.5). No
sack carries a number, no crate carries a value, and no vehicle ever emits the `+1` token arc that
`City_Art_Bible.md` §6 reserves for a reward. **A cart must not look like it is producing income,
because it is not.**

**R4. Nothing keys off the learner.** The vehicle count is a pure function of the road-tile count and
the era. No clock, no session time, no mastery, no lesson state, no streak. **This is INV-ERA-3** (era
design `:204`: *"Nothing may key off study pace, absence, streaks, or elapsed time since the last
lesson"*), and the same document names its own test twice: *"INV-ERA-3 a widening of the existing
clock spy"* (`:2634`), and, at `:1749-1752`, the spy it means:
`engines/game/src/citizens-roster-invariants.test.ts:42`, *"does not read the clock, so an hour later
is the same city"*, which *"is the natural home for INV-ERA-3 and should be widened rather than
replaced."* The one permitted change is a direct
consequence of a player action on roads: laying tiles may add a vehicle and removing them may take one
away, because the player did that.

**R5. Reduced motion holds a posed still frame, and does not remove anything.**
Exactly as the gulls do: seated at `t = 0` before the first frame (`:1574`) and never updated
(`:1588-1590`). `crises/README.md:213-216` states the house rule: *"**Every one is gated on
`prefers-reduced-motion` and yours must be too**, holding a posed still frame rather than
disappearing."* A stationary drone in the air is a photograph of a flying drone, which is correct; a
missing drone is a hole in the picture.

**R6. Nothing ambient gates anything.** INV-COS-1 (`docs/Contracts.md:276`): *"no economy field is an
input to any progression decision."* A vehicle is not a click target, has no accessible name, is inside
the `aria-hidden` canvas, and carries no state a learner needs. It is the purest decoration in the
game, and that is what makes it safe.

### 4.5 How many, and the finding that changes the tuning conversation

`CARS_PER_ROAD_TILES = 8` and `MAX_CARS = 6` (`citizens-tuning.ts:168`, `:171`) mean the cap needs **48
road tiles**. Measured against the island the game actually has:

- **88 buildable cells** at radius 22. Derived by running `buildableCellCount`'s own algorithm
  (`packages/skill-graph/src/eras.ts:367-384`) at `LAND_GRID_CELL = 4`, and confirmed by era one's own
  civic file: *"the whole island is 88 tiles"* (`era-01-prehistoric/civic-buildings.md:207`).
- **23 cells go to era one's seven skill footprints.** From `NODE_FOOTPRINTS`
  (`worldLayout.ts:139-161`): `NUM.S` 2x2, `NUM.5` 2x2, `NUM.2` 2x2, `NUM.3` 1x1, `NUM.4` 1x2, `NUM.F`
  2x1, `town-hall` 3x2, summing to 4+4+4+1+2+2+6.
- **11 more go to one of each civic type.** From the era's own catalogue table
  (`civic-buildings.md:192-195`): The Smokehouse 2x1, The Family Lodge 2x2, The Campfire 2x2, The Spring
  1x1.
- **So 54 cells are left free**, which agrees with the same file's independent statement that *"only 13
  further 2×2 slots exist once the skill buildings are placed"* (`:207`).

**48 of 54 is 89%.** Reaching `MAX_CARS = 6` in era one means paving essentially every cell the island
has left. **The cap is unreachable in practice**, in exactly the way `MAX_RENDERED_CITIZENS = 48` is
(`citizens-tuning.ts:184`: *"It is unreachable on D1 in every build order"*).

**Which means the load-bearing number is the divisor and not the cap**, and nobody has said so. The
divisor decides whether the player ever sees a vehicle at all.

**Recommendation, flagged as a first guess.** `VEHICLES_PER_ROAD_TILES = 4`, so the first vehicle
arrives on a **four-tile road** (a short run between two buildings, which is the smallest network worth
looking at) and the cap of six needs **24 tiles**, or 44% of the 54 free cells. That is a network a
player who wants traffic can actually build. **This is arithmetic against era one's island and not a
measurement of play**, and it should be retuned against a real island rather than trusted.

**Zero roads means zero vehicles, and that is not a gate.** D-CIT7 rules that *"roads amplify, never
gate"*, and #273's own router enforces it for citizens (`citizenRoutes.ts`: *"A router that treated bare
ground as impassable would hand a cosmetic gold sink power over whether the city functions"*). A
vehicle is different in kind: it is not a person who has to get somewhere, it is **the visible
consequence of a spend**. So no road means no vehicle, and no learner is affected, because nothing a
vehicle does is progress. Someone will read D-CIT7 as requiring carts on bare ground; it does not, and a
cart in a field is worse than no cart.

---

## 5. These are geometry, not generated art

### 5.1 The statement, with the measurement behind it

**Nothing in section 2 or section 3 should be handed to an image generator, because there is nothing to
plug the output into.** `crises/README.md:123-131` measures it:

> *"`apps/web/public` holds exactly one folder and it is `audio`. The only texture in the entire
> renderer is a **`CanvasTexture` drawn procedurally in code** at `StarterIsland.tsx:670`, for the faint
> tile grid. A sweep of the sources for `TextureLoader`, `useTexture`, `<Environment`, `envMap`,
> `RGBELoader` and for `.png`, `.jpg` and `.webp` references returns **nothing**. **So an asset table
> full of PNGs is unbuildable.** If a designer hands back a bitmap there is literally nothing to plug it
> into."*

That section's own table gives six asset kinds, and **a vehicle is `Geometry`**: *"Procedural three.js
geometry assembled in code, flat-shaded, one hex per mesh"*, with the cited precedent
*"`StarterIsland.tsx`, `WinterGround.tsx`, `Roads.tsx`."*

**The gull is the exact precedent and it settles the question.** Five animated birds, wings, tails,
banking, flapping, all of it, and **no image was ever generated for any of it**: icosahedra, a cone and
flat `ShapeGeometry` outlines in 240 lines (`StarterIsland.tsx:1361-1603`). A vehicle at 2.6 to 3.4u is
the same class of object at the same camera, built the same way.

**Why a GLB is also the wrong answer here**, even though buildings are GLBs. A building's colour is
baked into its GLB by the Gridwork export and `faceTones()` is called by no renderer
(`crises/README.md:160-166`), so a GLB vehicle would freeze its era's palette into an exported binary.
Section 3.5's whole argument is that the per-era differences here are **table rows** (count, tone,
scale, altitude), and a table row cannot reach inside a GLB. **Procedural geometry driven by an
`EraId`-keyed table is the shape the rest of the per-era layer already has**, in `ERA_ROAD_SURFACING`
(`roadSurfacing.ts:252`), `ERA_ISLAND_GROUND` (`islandGround.ts:372`) and `ERA_GROUND_LADDER`
(`:100`).

**What a reviewer should get instead of a PNG.** A rendered plate at the fixed camera, which is what the
crisis reference packs are: SVG drawn by `tools/generate-winter-crisis-references.ps1` and rasterised
through the repository's own Playwright Chromium (`tools/rasterise-crisis-references.mjs`). That is a
tooling decision with a known cost and two known warts (`crises/README.md` §6a and §6b), and **this
document does not make it**. Section 8 records it.

### 5.2 The modeller's brief, in the house format's shape

**This is the house format applied to geometry**, matching
`output/imagegen/era-01-prehistoric-civic-buildings/README.md`: an asset table, a shared-direction block
with an explicit negative list, then per-asset entries carrying the required silhouette and the forms it
must not resemble. **It is not an image-generation brief**, for the reason in 5.1. Every per-era
silhouette and must-not-resemble is in section 2; this section is the table and the shared block, which
section 2 deliberately does not repeat.

#### The assets

| # | Asset | Kind | Era(s) | Chassis shared with | Distinct meshes |
| --- | --- | --- | --- | --- | --- |
| 1 | **The dragged sled** | Geometry | 1, 2 | each other | 1 frame, 2 decks (poles / woven panel), 2 cargo sets |
| 2 | **The animal cart** | Geometry | 3, 4, 5 | each other | 1 bed, 3 wheel sets (solid disc / low spoked / tall spoked), 3 cargo sets |
| 3 | **The draught animal** | Geometry | 3, 4, 5 | eras 3 and 4 share the ox | 2 (ox, horse) |
| 4 | **The carrying chair** | Geometry | 6 | nothing | 1 box, 2 poles, 2 bearers |
| 5 | **The rail wagon and engine** | Geometry | 7 | nothing | 2 |
| 6 | **The delivery van** | Geometry | 8 | nothing | 1 |
| 7 | **The cargo cycle** | Geometry | 9 | nothing | 1 frame, 1 box, 1 rider |
| 8 | **The delivery drone** | Geometry | 10 | nothing | 1 |
| 9 | **The hauling figure** | Geometry | 1, 2 | the chair's bearers, and #273's citizen mesh if it lands | 1 |

**Six distinct chassis for ten eras**, because eras one and two share one and eras three, four and five
share another. That is the arithmetic the art-overhead objection actually needs: **the island costs ten
looks and the vehicle costs six**, and the vehicle's are two orders of magnitude smaller than a
building's.

**One dependency named rather than assumed.** Asset 9 is a human figure. If #273 lands, its citizen mesh
is the right one and asset 9 disappears (`Citizens.tsx` on `origin/evan/city-population-happiness`).
#273 is **OPEN, `mergedAt: null`**, so at `3b655728` the tree has no human mesh at all and asset 9 is
real work. **Do not brief a bearer or a hauler before checking that PR's state again.**

#### Shared direction

*Read once. Every asset above inherits all of it.*

- **Procedural three.js geometry, flat-shaded, one hex per mesh.** `flatShading: true` on a
  `MeshStandardMaterial`, which `crises/README.md:208-209` names as the house style.
- **Three tone steps per surface under one key light**: top lightened 0.26, left the hue, right darkened
  0.28 (`City_Art_Bible.md` §2, `era-01-prehistoric/style-guide.md` §0 constraint 5). There are **four
  lights in the whole scene and all of them are global** (`crises/README.md:98-104`), so nothing can be
  lit locally and no asset may be described by light falling on it.
- **A vehicle takes its era's PROPS palette, never the era's body hue.** The body hue belongs to the
  buildings, and `City_Art_Bible.md` §1.2 has buildings differing by silhouette rather than by a second
  body colour, so a vehicle in the body hue disappears against the wall it passes; a vehicle in the
  ground tone disappears against the tread. Era one's prop tones already exist and already cover its
  sled (`StarterIsland.tsx:80-90`).
- **Every side must read.** The tilt is locked at 0.72 rad (about 48.75 degrees) and the azimuth orbits a
  full 360 degrees (`orbitCamera.ts:43`, `:45`), so there is no back face and no per-view art.
- **Silhouette first: one dominant mass plus one accent.** At the sizing floor a vehicle is about 16 by
  11 px (4.1, 4.2).
- **No shadow.** No asset here casts one (4.2).
- **Motion is the rule in 4.3 and the six rules in 4.4**, and every asset is posed by a pure function of
  `t`.

#### Negative list, explicit

- **No image texture of any kind, no bitmap, no `.png`, no environment map, no reflection.** There is no
  environment map, so *"Ice, chrome, water, polished metal and glass can be pale and faceted; they cannot
  be glassy"* (`crises/README.md:145-149`). Era eight's chrome trim and era ten's dark glass are
  **faceted and pale, or faceted and dark**, never glassy.
- **No glow, no bloom, no light spill, no pool on the ground.** There is no post-processing and enabling
  it means adding a dependency (`crises/README.md:106-111`). Emissive is available as a bright face up to
  about 1.35 and *"does not spill"* (`:113-121`). **Only era ten's drone takes an emissive strip**; eras
  seven and eight forbid emissive outright in their own guides.
- **No mastery gold `#FFB703` anywhere on any asset.** It is reserved for the mastery stars and UI
  (`era-01-prehistoric/style-guide.md` §0 constraint 4).
- **No CIVIC green and no BRICK red**, which are the correctness palette, and **no crisis amber**, which
  `crises/README.md` places outside the correctness palette on purpose for crisis markers.
- **No wheel of any kind in era one.** The era bans it in as many words (2.1).
- **No draught animal in eras one, two, or six through ten.** Era two states it (2.2); eras six onward
  author none.
- **No legible text, no number, no logotype, no dial, no gauge face.** The rasteriser draws no text, and
  D-ERA8 forbids an object symbolising a lesson. Era eight's van takes a painted band and a plain plate
  instead (2.8).
- **No cargo that reads as money.** R3 in 4.4.
- **No queue, no convoy, no vehicle stopped at a building, no unloading.** R1 and R2 in 4.4.
- **Nothing that reads as urgency**: no flashing, no siren, no hazard beacon on a moving thing, no dust
  plume, no speed line, and no lean into a turn beyond the gull's own constant bank.

### 5.3 One consequence of #273 being open

Section 5.2's asset 9 and section 8's item 10 both depend on that PR. **Read at the API rather than
inferred: #273 is OPEN with `mergedAt: null`**, and `git ls-tree` over
`origin/evan/city-population-happiness` (`ce48c73a`) finds `Citizens.tsx`, `citizenPlaces.ts` and
`citizenRoutes.ts`, none of which exists on `integration` at `3b655728`. So a brief that assumes a human
mesh or a route function is describing a branch and not the tree. **Re-check that PR's state before
acting on either.**

---

## 6. `MAX_CARS` and `CARS_PER_ROAD_TILES`: what happens to them

> **BUILT 2026-08-02, measured at `integration` `7a2c16a0`.** All five recommendations in §6.2 are
> now in the tree, plus era one's form from §2.1, the motion rule from §4.3, R1 / R2 / R4 / R5 / R6
> from §4.4, and the road-only walk §8 item 10 records as **owed rather than inherited**. The code is
> `engines/game/src/citizens-tuning.ts` (the two constants), `apps/web/src/city/eraVehicles.ts` (the
> per-era table, one row), `apps/web/src/city/vehicleRoutes.ts` (the walk, the budget, the pose) and
> `apps/web/src/city/three/Vehicles.tsx` (the geometry), mounted in `three/CityScene.tsx`.
>
> **§6.1's measurement below is therefore superseded and kept as the record of what was there
> before**: the two constants are no longer consumed by nothing. §6.2's names, its cap, its divisor of
> 4, its comments and its answer to Q7 all shipped as recommended, and nothing in §6.3 was done.
>
> **Two things the implementation decided that §6.2 did not, both recorded rather than assumed.**
> First, **R2 beats §4.5's arithmetic where they meet**: the count is `min(MAX_VEHICLES, tiles /
> VEHICLES_PER_ROAD_TILES)` *and* one vehicle per connected run, because an out-and-back run cannot
> hold two vehicles at a guaranteed separation at all and the arrangement that can is a convoy in
> lockstep. So the divisor decides when the first vehicle arrives and bounds the total, and the number
> of separate roads decides how many are on the island. Second, **the four authored tones were
> assigned by looking at a frame**: `hide` on the load photographs at a value step of 0.05 against the
> road's own tread, which is no step at all, so the masses take `hideDark` and `cord` and the poles
> take `timber`. See the docblock in `three/Vehicles.tsx`.
>
> **Nine eras still have no vehicle**, and §2.2 to §2.10 are still unbuilt: an era with no authored
> form renders nothing rather than borrowing era one's. §8's open decisions 1 to 7 are all still open,
> and decision 1 (*is a dragged sled right?*) now has something to look at.

### 6.1 What they are, measured at `3b655728`

```ts
/** One car per this many road tiles, so gold spent on roads buys visible life. */
export const CARS_PER_ROAD_TILES = 8;

/** A cap on cars, for the same reason citizens have one. */
export const MAX_CARS = 6;
```

That is `engines/game/src/citizens-tuning.ts:167-171`, verbatim.

**They are consumed by nothing.** `git grep` over every path except `docs/` and `work-log/` returns
**exactly one hit each**, and both are the definitions above. That sweep includes test files, so
`citizens-tuning.test.ts` does not assert on either. **The same sweep on
`origin/evan/city-population-happiness` (`ce48c73a`, #273, OPEN) returns the same two lines and nothing
else**, so the open PR does not consume them either.

**And the comment on the first one names a currency the game no longer has.** Gold is retired; a road
tile now costs the era's material out of the stockpile a civic building comes from
(`apps/web/src/city/roadsEconomy.ts:11-19`).

### 6.2 Five recommendations

**1. RENAME. `MAX_CARS` becomes `MAX_VEHICLES`, `CARS_PER_ROAD_TILES` becomes
`VEHICLES_PER_ROAD_TILES`.**

The reason is not that *car* is vague. It is that **`car` is correct for exactly one era of ten**, and
section 2.8 quotes the guide that makes it correct there: *"this is the era of the car"*
(`era-08-atomic/style-guide.md:854`). A constant named after one era will mislead in the other nine, and
it already has: the backlog recommended a **handcart** for era one, whose guide bans the wheel. **A name
that produced one anachronism in the only document that has used it is a name that will produce more.**
This is R7's rule (`flint` becomes `stone`), applied to an identifier.

**Keep the plural `TILES`.** The reading is *"one vehicle per this many road tiles"*, which is what the
existing name says. `2026-08-01-game-feel-mechanics-backlog.md:1004` recommends the singular
`VEHICLES_PER_ROAD_TILE`; that changes the reading, and it is not recommended here.

**2. KEEP the cap at 6, and change what it is FOR.** Section 4.5 shows it is unreachable in era one (48
tiles against 54 free cells), which is the same condition `MAX_RENDERED_CITIZENS = 48` is in and which
its own docblock treats as correct: *"a safety net that is routinely load-bearing is a design limit in
disguise"* (`citizens-tuning.ts:181-182`). So 6 is a safety net, its docblock should say so in those
words, and **it is not the number the design turns on.**

**3. LOWER the divisor to 4, flagged as a first guess.** Section 4.5 has the arithmetic. This is the
number that decides whether a player ever sees a vehicle, and at 8 the answer is close to never.

**4. FIX both comments.** The first names retired gold; the second says *"a cap on cars"* over a constant
that would be capping vehicles. Suggested:

```ts
/** One vehicle per this many road tiles, so material spent on roads buys visible life. */
export const VEHICLES_PER_ROAD_TILES = 4;

/**
 * A safety cap, in the same spirit as MAX_RENDERED_CITIZENS and unreachable for the same
 * reason: 6 vehicles needs 24 road tiles, against the ~54 cells era one leaves free after
 * its seven skill footprints and one of each civic type.
 */
export const MAX_VEHICLES = 6;
```

**5. ANSWER Q7: the budget is INDEPENDENT of the citizen budget.** The backlog's reason is right
(*"coupling the two budgets means a crowded island silently loses its traffic"*,
`2026-08-01-game-feel-mechanics-backlog.md:997-1000`) and section 4.5 adds a second: the vehicle count is
derived from **roads** and the citizen count from **mastery**, so coupling them would make a learning
event change the traffic, which is one inference away from the thing INV-ERA-3 exists to prevent.

### 6.3 Three things the rename does NOT do

**It does not add a per-era scalar.** The per-era vehicle is a **table row keyed by `EraId`**, in the
idiom `ERA_ROAD_SURFACING` (`roadSurfacing.ts:252`) and `ERA_ISLAND_GROUND` (`islandGround.ts:372`)
already use, both `Partial` with an authored fallback. **The two scalars stay in `citizens-tuning.ts`**
per D-CIT14, which that file states in place: *"consumed by the RENDER layer, but held here because
D-CIT14 puts ALL tuning in one table"* (`:153-154`).

**It does not make a vehicle learner-facing, so the recognisability rule bites more weakly than it does
on a building.** A building name enters the accessible name and is *"one line on a buy menu or one phrase
in an accessible name, heard once, by someone who cannot ask"* (`eras/README.md:857-859`). A vehicle is
inside the `aria-hidden` canvas, is not a click target, and has no announced name. **So the rule reaches
the code identifiers and the design vocabulary, and no learner-visible string.** That is why section 2.6
flags *the carrying chair* for the lead's eye without treating it as a blocker.

**It does not rename `ROAD_TILE_GOLD_COST`, and that is deliberate.** The road spend is still named for
the retired currency at `apps/web/src/city/roads.ts:34`, with `insufficient_gold` at `:110`. That defect
is **already reported and deliberately deferred**
(`work-log/gabe/2026-07-29-gold-retired-and-the-cap-stops-being-a-clock.md:7`) and **already measured at
62 references across 10 files**
(`work-log/gabe/2026-07-30-ten-era-economy-and-the-civic-ledger.md:170`). It is named here only because
**both identifiers name something the game no longer has, so whoever renames one should rename the other
in the same pass.** It is not re-reported as new.

---

## 7. Lanes: what is Gabe's, and what needs Evan

**The ruling.** `docs/Content_Authoring_Split.md` §11.1: *"**Staying with Gabe:** the city and its 3D
layer, the crises, the era model and progressions, the economy, persistence, the diagnostic, and CI /
tooling."* And, in the same section: *"**Nobody else's lane moves.** Evan keeps the design lane whole."*
Era design §18 gives the shape of Evan's half: *"Evan takes the city surface: the engine restructure from
neighborhoods to eras, land expansion, the two-class building model, the citizens retune, the trial
re-skin, the Chronicle, this design spec, and the per-era building descriptions."*

**And the era guides put the boundary at the road's edge, in a folder-wide rule.** Era two's guide states
it: *"the island owns the ground **between** the roads and states its **relation** to them; D-ERA30 owns
the road tile itself"* (`era-02-neolithic/style-guide.md:848-849`).

**So: a thing ON the road tile is Gabe's; a thing on the ground between the roads is Evan's.** That line
puts every proposal in this document somewhere, and here is where each lands.

| # | Proposal | Lane | Needs Evan? |
| --- | --- | --- | --- |
| 1 | **The ten vehicles' geometry, motion, sizing and tuning** | **Gabe.** They ride the road tile, they are the 3D layer, and the two constants are in `engines/game` | **No** |
| 2 | **The ten vehicles' FORM and per-era dressing** | **Evan's to approve.** Nine of the ten are transcribed from era style guides, which are in his lane, and two are invented (eras one and six) | **YES, and this is the main one.** Section 8 items 1 and 2 |
| 3 | **The draught animal** (ox, horse) | **Evan's to approve.** Era four's animal is inferred rather than transcribed (2.4) | **YES**, one word |
| 4 | **Smoke on the town hall** | **Evan's.** The hall is a building and the hub is his, per §18's *"per-era building descriptions"* | **YES** |
| 5 | **Smoke and steam on island props** | **Evan's.** Island props are the island's | **YES**, though every prop is already authored in his guides (3.1, 3.8) |
| 6 | **Sway on the already-authored drying and hanging props** | **Evan's** for what sways; **Gabe's** for the motion function | **YES**, for the ten-era list |
| 7 | **Birds: era-keying the existing flock** | **Gabe** to wire; **Evan** for the ten rows of count, tone, scale and altitude | **YES**, for the rows only. The wiring gap at `StarterIsland.tsx:1630` is Gabe's to close either way |
| 8 | **Water movement** | **Gabe** for the displacement function; **Evan** for the ten amplitudes, three of which his guides already state as zero | **YES**, for the amplitudes |
| 9 | **Era ten's signage coming on** | **Evan's**: the props are era ten's and the mechanic is `crises/README.md`'s | **YES** |
| 10 | **The animated display on a totem** | **Evan's** for the totem; **Gabe's** for the constraint in 3.9 that the number means nothing | **YES** |
| 11 | **Refusing market stalls** | Nobody's to build. Recorded so it is not proposed again | **No** |
| 12 | **The road-only route function** | **Gabe.** See section 8's item 10 | **No** |

**Read the column and the shape is clear: the mechanism is Gabe's and the ten looks are Evan's**, which
is the same division D-ERA30 already made for the road surface, where the courses are code and the
pigment is authored per era.

**Nothing in this document edits a file in Evan's lane.** No era style guide, no `City_Art_Bible.md`, no
civic catalogue.

---

## 8. Open decisions, and who owes them

**For the team lead.**

1. **Era one's vehicle is invented. Is a dragged sled right?** The guide bans the wheel and does not say
   what replaces it (2.1). This is the one entry with no source sentence to point at.
2. **Era six: the carrying chair or the coach?** The guide is silent and one sentence constrains both
   (2.6). The recommendation is the chair; the coach is a one-asset swap and nothing else moves.
3. **The motion rule: is "never faster than a citizen walks" accepted?** (4.3) It is the single sentence
   everything else in section 4 hangs off, and it deliberately makes era ten no faster than era one.
4. **The divisor: 4, or something else?** (4.5, 6.2 item 3) At the shipped 8 the player rarely sees a
   vehicle at all. The recommendation is arithmetic against era one's 88 cells and not a measurement of
   play.
5. **Does era ten's drone get a travelling contact ellipse?** (4.2) It is the one exception to the
   no-shadow rule, and the reason is that a flying thing with no mark under it is unlocatable.
6. **Is a rendered reference plate wanted before geometry is cut?** (5.1) The route is the crisis packs'
   SVG-plus-Chromium pipeline, not the image tool. This document does not decide it.

**For Evan.**

7. **The ten vehicle forms** (section 7 items 2 and 3), which is nine transcriptions to confirm and two
   inventions to accept or replace.
8. **Do the per-era boats move?** (section 2's scoping note) Ten *"Where boats land"* sentences author a
   boat each, all static, all inside D-ERA26. Making one move is a separate proposal and is not made
   here.
9. **The ten ambient rows**: bird count and tone, water amplitude, and what sways (section 7 items 6, 7,
   8).

**For whoever owns the citizens work.**

10. **The router.** The backlog said carts *"inherit the router … from #273"*
    (`2026-08-01-game-feel-mechanics-backlog.md:991-992`). **Checked at the tip, and that is not right.**
    `routeBetween` on `origin/evan/city-population-happiness` is a preference-weighted Dijkstra over the
    **whole walkable island** in which *"Stepping onto a road cell costs `ROAD_PREFERENCE_WEIGHT` and
    stepping onto bare ground costs 1"*, and it *"NEVER RETURNS NOTHING … An unreachable destination
    degrades to the direct line `[from, to]`."* Both properties are correct for a citizen and wrong for a
    vehicle: a vehicle that steps onto bare ground is a cart in a field, and a straight-line degradation
    is a cart cutting across a plot. **A vehicle needs a road-only walk**: the connected components of
    the road set, and a run along one of them. That is a different function in the same file's idiom, it
    is small (the road set is already a `Set<string>` and `roadNeighborMask` already walks the same
    four-neighbour order), and it is **owed rather than inherited**. Note also that at `3b655728` there
    is no reachability, connected-component, flood-fill or path function anywhere on `integration`
    (`2026-07-27-citizens-and-city-life-implementation-plan.md:197-198`), and #273 is OPEN.

---

## 9. What was measured, and what was not

**Re-measured at `3b655728` rather than carried from the backlog.** The two constants and their zero
consumers, on `integration` and on `origin/evan/city-population-happiness` both. The 88-cell island, by
running `buildableCellCount`'s algorithm rather than quoting it. The camera arithmetic, from the five
constants in 4.1. Era one's and era two's road course widths. The gull flock's thirteen parameters. The
thirteen `useFrame` call sites. The nine unauthored land budgets in `packages/skill-graph/src/eras.ts`.
Both PR states, from the API.

**Three claims in the backlog that did not survive re-checking, corrected here.**

1. *"era one's vehicle is a handcart"* (`:1003`). Era one's guide bans the wheeled cart
   (`era-01-prehistoric/style-guide.md:899`) and reserves the wheel for era two (`:224`), which reserves
   transport for era three (`era-02:305`).
2. *"it inherits the router … from #273"* (`:991-992`). Section 8 item 10 has the correction.
3. *"Citizens using roads is #273, complete"*
   (`work-log/gabe/2026-08-01-game-feel-backlog-and-the-research-that-outranks-it.md`, second finding).
   #273 is **OPEN, `mergedAt: null`**, so nothing of it is on `integration` and
   `apps/web/src/city/three/citizenRoutes.ts` does not exist at this tip.

**Not measured, and stated as such.**

- **No frame-budget measurement was taken.** The relevant precedent is `citizens-tuning.ts:187-189`,
  which argues that *"two instanced draws of a few dozen low-poly bodies is a few thousand triangles"*
  and that the scene's real costs are `dpr={[1, 2]}`, the shadow pass and the road layer. Six vehicles at
  a few hundred triangles each sits well inside that, but **the argument is inherited rather than
  re-run**, and D-CIT20's Chromebook floor has not been tested against anything here.
- **No screenshot was taken and none is claimed.** Every size in section 4.2 is arithmetic off five
  measured constants, and arithmetic about a box is not evidence about a rendered frame. **A spatial
  claim about a vehicle's legibility is unverified until somebody looks at one at 1024x580**, and no
  vehicle exists to look at.
- **The nine unauthored land budgets are why every cell figure is era one's.** `eras.ts` carries
  `UNAUTHORED_LAND` for nine of ten and `land: { status: "authored", buildable_radius: 22 }` for
  `prehistoric` alone (`:146`, plus nine `UNAUTHORED_LAND` rows). #298, which would have authored the
  other nine, is **CLOSED with `mergedAt: null`**. So 4.5's arithmetic describes era one's island and
  says nothing about a later, larger one.
- **Biome is vacuous over this change.** Section 10.

---

## 10. Biome, stated as vacuous

**Biome has no Markdown handler**, so a run over a docs-only diff checks nothing in this file.
`biome.json`'s `files.includes` (`:8-14`) also excludes `output/**`, `**/*.svg`, `**/*.dc.html` and one
JSON file, none of which is relevant here; the Markdown fact is what makes the run vacuous.

**It was run anyway, and Biome states the vacuity itself.** `@biomejs/biome` 2.5.4, over exactly the
two files this change adds:

```
$ npx @biomejs/biome check docs/superpowers/specs/2026-08-01-era-vehicles-and-city-life.md work-log/gabe/2026-08-01-era-vehicles-and-city-life.md
Checked 0 files in 2ms. No fixes applied.
check ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  × No files were processed in the specified paths.

  i Check your biome.json or biome.jsonc to ensure the paths are not ignored by the configuration.

  i These paths were provided but ignored:

  - docs/superpowers/specs/2026-08-01-era-vehicles-and-city-life.md
  - work-log/gabe/2026-08-01-era-vehicles-and-city-life.md

EXIT=1
```

`Checked 0 files`, both paths listed as ignored, and a non-zero exit for having been handed nothing it
can read. **A green `npm run lint` over the whole tree would have said exactly as little and would have
looked like a pass**, which is why this is reported as vacuous rather than as green.

**No test suite was run and that is deliberate.** This change adds two Markdown files, touches no code,
no content pack and no schema, so there is no suite whose result would mean anything about it. A green
run over an untouched tree is not evidence about a document.

---

## Related

- `docs/superpowers/specs/eras/2026-07-29-skill-building-rulings.md` §2.1: **the freeze line, which is
  what permits this.** Per-era art freezes where it multiplies with a catalogue and is kept where it is
  one-per-era. Read as binding; not amended here.
- `docs/superpowers/specs/eras/era-0N-*/style-guide.md`, all ten: every vehicle in section 2 and every
  ambient item in section 3 is quoted from these. **Binding, and none of them is edited.**
- `docs/superpowers/specs/City_Art_Bible.md` §2, §3, §6, §7: the three-tone model, the silhouette-first
  rule, the juice budget and the ambient-life list. **Binding; not amended.**
- `docs/Game_Visual_Design_Brief.md` §2, §4.3, §4.7, §4.11, §8: the tone bans, silhouette-first, the
  ambient-life specification section 1 measures against, the AVOID list and the hard constraints.
  **Binding; not amended.**
- `docs/superpowers/specs/2026-07-30-era-palette-ladder.md` §5: the ten body hues, which section 5.2
  rules a vehicle may **not** take.
- `docs/superpowers/specs/2026-07-27-era-progression-design.md` §5.2, §5.4, §5.5, §5.2a, §6.4a, §16:
  D-ERA26, D-ERA28, D-ERA30, D-ERA32, D-ERA33, and INV-ERA-3 at §204.
- `docs/Contracts.md` §276: INV-COS-1.
- `docs/superpowers/specs/crises/README.md`: **the measured renderer boundary and the six asset kinds**,
  stated there and nowhere else. Section 5.1 quotes it rather than paraphrasing.
- `docs/superpowers/specs/crisis-reference-packs/README.md` §1, §5, §6: the re-measured boundary, the
  plate conventions and the two rasteriser warts section 5.1 declines to inherit.
- `docs/superpowers/specs/2026-07-27-citizens-and-city-life-design.md` §8 and its implementation plan:
  where the two constants were designed, `WALK_SPEED_UNITS_PER_SEC`, and Q7.
- `docs/superpowers/specs/2026-08-01-game-feel-mechanics-backlog.md` §6.2: the item this replaces. Its
  three corrected claims are in section 9.
- `docs/Content_Authoring_Split.md` §11: the lane ruling section 7 reads.
- `output/imagegen/era-01-prehistoric-civic-buildings/README.md`: the house format section 5.2 matches.
