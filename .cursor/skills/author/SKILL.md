---
name: author
description: >-
  Authors a full, interactive, era-themed calc-readiness math lesson pack for
  one WHOLE era (every node `ERA_SEQUENCE` puts in it) as a single coherent
  chapter, matching the D1 structure: every teaching slide is three sections (short
  conceptual lecture, an optional text worked example that names its instance before
  walking it, gated interactive practice), one
  combining CFU, a 5-question practice set (1xL1 / 2xL2 / 2xL3, reshuffled and never
  re-serving the five just shown), and an infinite bank, with practice and bank
  QUESTIONS themselves widget-graded where the concept warrants.
  Use when the user asks to author, build, or theme a complete era's lessons (any
  era of the ten, or any node set) end to end, or to stand up a new per-domain
  lesson loader. The deliverable and the QA gate are ERA-LEVEL: complete a whole
  era (iterating node by node internally) before moving on, even though the files
  stay in the per-domain directories the toolchain reads. This skill is
  self-contained and does not defer to the lesson-planner agent.
disable-model-invocation: true
---

# Author a whole era

Author one WHOLE era (every node `ERA_SEQUENCE` puts in it, in
`packages/skill-graph/src/eras.ts`) as a single coherent, era-themed lesson pack.
The unit of delivery and the unit of QA are the era, not a single node. Iterate
node by node internally, but do not call the era done until the ERA-LEVEL gate in
Phase 7 passes.

**An era is a grouping over NODES, and nothing on disk is named after one.** Lesson
content still lives at `content/lessons/<domain>/<NODE>.json` and item pools still
live under `packages/item-bank/src/<domain>/`, because the loader, `LESSON_DOMAINS`,
the item bank and the validator are all domain-shaped and none of them reads an era.
Domains are NOT renumbered: D-ERA4's renumber is gated on the spec's O-2 and has not
happened. So there is no `content/lessons/renaissance/` to look for, and authoring an
era means authoring a node set that lands in **several domain directories at once**.
"Which era am I authoring?" below says how to find out which, and Phase 0 makes you
write the list down before you touch a file.

> **The game is one city advancing through ten eras, not ten islands.** Evan's
> `docs/superpowers/specs/2026-07-27-era-progression-design.md` (merged as #177,
> 2026-07-28) retires the island model wholesale and is the design authority for the
> world you are theming into; **`packages/skill-graph/src/eras.ts` (#180, same day) is
> the authored data** for which era holds which nodes. Read the spec's §6 for what a
> building may and may not be. Two things the spec does NOT do, and this skill is
> written around both: it says nothing about lesson theming (per-node framings,
> word-problem contexts, hues), and it names no era's buildings.
> Read "Which era am I authoring?" below before you write a line of prose.
>
> **`Island_Lesson_Themes_Design_Spec.md` is LEGACY as of 2026-07-29 and this skill no
> longer sends you to it for anything.** The owner ruled it "completely legacy … there
> is no such thing as multiple islands now". It used to be cited here as the lesson-side
> theming authority; that instruction is withdrawn. **The ERA FOLDERS inherit that job**
> (team lead, same day) — see "Where the framing authority is" below, which also records
> how much of it they carry today.

This skill stands alone. The repo also has a `.cursor/agents/lesson-planner.md`;
you do not defer to it. Everything you need is here and in `reference.md` /
`examples.md`.

Deep references (read on demand, one level deep):
- `reference.md` : full JSON schema, widget catalog + `{ onComplete }` contract, the
  shared answer mechanics every widget inherits (§2.1: success feedback, mute,
  `WidgetReveal`), the interaction-kind menu, registration table, item-bank layout,
  cfuChecker rules, the domain theming index (a pointer into the era and themes
  specs, not a copy of either), and a key-file index.
- `examples.md` : the D1 gold packs to imitate (annotated), plus rejected-versus
  -accepted prose from the D2 review for the rules that only make sense as a contrast.
- Cite these sibling project skills as you go: `lesson-katex`, `interactive-visuals`,
  `svg`, `practice-templates`, `practice-hints`, `worked-solution-svg`.

## Which era am I authoring?

**Do not answer this from memory or from this file. Ask the data.** The era node sets are
authored in **`packages/skill-graph/src/eras.ts`** (`ERA_SEQUENCE`, landed as #180 on
2026-07-28, closing the era spec's open item O-1). For an era's membership call
**`getEraNodes(eraId)`**, which IS your scope; for a node, `getEraOfNode(nodeId)`; for the
era's play position, `eraNumber(eraId)`. The spec fixes the era names, the order and the
intent; `ERA_SEQUENCE` is authoritative for **membership**, and its own header says so.

**No node set is copied into this skill, deliberately.** A copy goes stale, and this one
would have gone stale the same day it was written: #210 moved `POL.6`, `POL.7` and `RAT.5`
into Early Modern on 2026-07-28, hours after #180 authored the sets. Membership is
authored data and it will move again. Two further reasons not to key anything here by
domain:

- **`ERA_SEQUENCE` carries no domain at all.** Membership is over NODE ids, which are
  mnemonic and stable, so the era model is untouched by the domain renumber. A
  domain-keyed table here would be a second opinion about a relationship the data
  deliberately does not store.
- **The domain renumber still has not happened.** D-ERA4 is signed off and
  unimplemented; it permutes which content five `DomainId`s name, so a number written
  down today points somewhere else afterwards. `eras.ts` is immune. This file is not,
  which is exactly why it holds no numbers.

### An era is not a directory, and it is usually not one domain either

The counts below are a **reading at `c668d90`** and moved twice on 2026-07-28, so re-derive
them rather than quoting them: map every id in `getEraNodes(eraId)` through
`skill_graph.json`'s `domain` field and count. Over all 62 in-product nodes at that tip:

- **Seven domains sit wholly inside one era.** Those eras are one directory's worth of work
  and the motif question does not arise.
- **THREE domains SPAN eras**, so their nodes sit in different chapters of the city, and one
  of the three has authored lessons.
  - **Polynomials spans three.** Classical keeps expand, factor, solve and divide; `POL.5`
    needs `CG.1` and `FUN.1` outright and lands in the Industrial Era; `POL.6` and `POL.7`
    are graph-reading lessons and land in Early Modern with the plane.
  - **Rational Expressions spans two**, and this is the one to watch: `RAT.1` to `RAT.4`
    and `RAT.6` are Medieval, `RAT.5` (rational graphs, holes and asymptotes) is
    Early Modern. **Its lesson packs are authored** (`content/lessons/d5/`), so this is the
    first authored pack sitting on both sides of an era seam.
  - **Functions & Coordinate Geometry spans three:** `CG.1` in Early Modern, the
    function-as-machine nodes in the Industrial, the rate-and-graph-reading nodes in the
    Atomic Age.
- **Three eras hold more than one domain**, and Early Modern holds **four**: Geometry,
  `CG.1`, the two polynomial graph nodes and `RAT.5`. The Industrial holds Functions plus
  `POL.5`; the Atomic Age holds the rest of Functions plus Linear Functions.
- Node counts per era run 6, 5, 5, 5, 5, 6, 6, 9, 6, 9, every one inside the spec's 3-to-9
  pacing band, with the floor now 5 rather than 3.

**So the era you are authoring may reach into four `content/lessons/<domain>/` directories,
and it will not be obvious from the filenames that they are one deliverable.** That is the
single fact most likely to trip you: an author who goes looking for their era's directory
will not find one, and an author who authors only the directory they started in will ship
part of a chapter.

**What that means for you, practically.** The deliverable is the era; the TOOLCHAIN is
domain-shaped, and you run it once per directory your era touches:

- **Files go where they always went.** `content/lessons/<domain>/<NODE>.json` for the
  node's own domain, `packages/item-bank/src/<domain>/nodes/<NODE>/` for its items, and one
  `LESSON_DOMAINS` entry per domain directory (Phase 6). Never invent an era-keyed path,
  an era loader or an era registry entry; nothing reads one.
- **The validator runs per DIRECTORY, not per era**, so an era spanning four domains is
  four `--strict` runs, and each of them measures the whole directory including nodes that
  are not in your era. That matters for the domain-level variety rules (R11): the number
  the validator reports is a property of the directory, and the tally that answers the
  teaching bar is the one you take across your ERA. Do both; they are different questions
  and neither substitutes.
- **A gate you cannot run as one invocation is still one deliverable.** #212 records the
  same constraint and reads it the other way, as a reason the delivery unit must stay the
  domain, so the disagreement is worth naming rather than leaving for someone to discover:
  the constraint is real and it fixes HOW MANY TIMES each gate runs, not what is being
  delivered. The unit of work is a decision about what a reviewer should be handed, and the
  answer to that is a chapter, which is why Phase 7's coherence and prereq-order gates
  (items 1 to 3) are the era's and are read by a human across directories.
- **Prereq order is the era's, not the directory's.** Sequence the chapter by the
  prerequisite graph across the whole node set (Phase 1), because that is the order the
  learner meets it in. Two nodes from different domains can be adjacent in an era.

**Theming an era that spans domains is NOT settled, and raising it is no longer
hypothetical.** #180 set membership, #210 rebalanced it, and neither made a theming call:
how a chapter reads when its nodes carry two different registers and hue families is Evan's
and undecided. **Raise it rather than picking for him**, and note that `RAT.5` puts a live
authored pack on the seam where before #210 both split domains were unauthored. Do not
re-skin `RAT.5` toward Early Modern on your own initiative.

**Every era is Anthony's, and there is no seam to negotiate. RULED 2026-07-31.** The team
lead: *"anthony owns all the content now"* and *"all machinery related to lesson stuff is
his now"*, on the line **Anthony has the learning, Gabe has the game**.
**`docs/Content_Authoring_Split.md` §11 is the authority** and is not restated here.

That retires a whole class of instruction this section used to carry, so it is worth being
explicit about what is gone: **there are no jointly owned eras**, because there is no second
owner to hold one with; there is no other owner to agree a motif with in Phase 1; and there
is no "which nodes of this era are mine" line to write in a PR. Ownership is no longer keyed
to the domain, to the era, or to any other axis. §9.2's Ownership column, §9.3's two seams
and §10.4's un-splitting are all history there, and none of their counts is current.

**Two things survive the change and one of them is easy to lose.** *Authored work does not
change hands* is still true and still matters, but it now means what it says about HISTORY
rather than about a boundary: Gabe authored D2, D3 and D4, Anthony authored D1's lessons and
D5, D7, D8 and D10, and no ownership record reattributes a line of it. And the **coherence
obligation across an era is undiminished** — it was never really about the seam between two
owners, it was about the learner meeting one chapter, and a chapter can read as two authors'
work just as easily when both authors were the same person on different days.

**If Gabe authors a lesson, that is not drift and needs no reconciliation.** The lead is
playing a flex role and may take content work on capacity; what he does not do is decide
what gets authored or override a bar Anthony has set. §11.4 carries both halves. A change to
the lesson layer, the item bank, the checker or a validator now takes **Anthony's** review
under the cross-lane policy in `OWNERS.md`.

Where you refer to a domain in prose, a work log or a PR, name what it TEACHES
("Exponents & Radicals") rather than its number: the number is about to move and the
subject is not. Name an era by its name.

**What is authoritative about era buildings today, stated exactly.** The era spec fixes
the RULES and names no building:

- **Two classes** (§6). Skill buildings are earned 1:1 with lessons; civic buildings are
  bought. One skill building per node is unchanged from the island model.
- **A skill building never symbolises its skill** (D-ERA8). It is the ordinary
  architecture of its era with a lesson assigned to it, not a rebus for the mathematics.
  Symbolic buildings were tried and rejected; the shipped D1 six are the counter-example
  that works.
- **Skill building names are fixed, plain and era-neutral** (D-ERA9), **and this has
  LANDED — the caution that used to sit here is retired.** `D1_NODE_BUILDINGS`
  (`apps/web/src/city/buildingAssets.ts`) now reads Assembly Hall, Store, Dwellings,
  Workshop, Commons, Tower. The modern names the spec used as its example of period
  absurdity (City Bank, Public Library, Rowhouse Flats, Community School, Central Park,
  Clock Tower) are **gone from the code**; where they still appear in the era spec's §6.1
  and era one's §9 they are history, not the shipped set. What a learner reads is
  `"{stable}, {subtitle}"` per **D-ERA29**, and **all ten subtitle rows are ratified in
  their guides while TWO are wired** — `ERA_DRESSINGS` in
  `apps/web/src/city/eraDressing.ts` holds `prehistoric` (7 entries) and `neolithic` (6),
  measured at `1d9ef64` — so the other eight eras degrade to the stable name alone.
  Renaming is still Evan's lane, and a lesson should still not lean on a building name.
- **Footprints never change across eras** (D-ERA10), and **civic buildings freeze in the
  era they were built** (D-ERA11).

**THE GAP IS CLOSED, and this paragraph used to say the opposite.** **Every era's
buildings are now named in a landed document.** Each `docs/superpowers/specs/eras/era-NN-*/`
folder carries a **ratified subtitle row** — one proper-noun dressing per mass, all ten
ratified — and a `civic-buildings.md` whose four-column table names that era's **four
civic buildings** with their footprint, contribution and cost. **The 40 civic names are
measured at `1d9ef64`: 40 rows across the ten tables, all distinct**; `eras/README.md`
carries the same census over the skill dressings beside them and derives both from the
sources rather than listing them, so re-run it there rather than trusting a total here. So
the answer to *"what is my era's Store called?"* is in your era's guide, and the answer to
*"what does its granary cost?"* is in its `civic-buildings.md`.

> **⚑ CORRECTED 2026-07-30, and the sentence is quoted because it was load-bearing and
> false.** It read: *"**And here is the gap, flagged rather than filled.** No landed
> document names any era's buildings. D-ERA20/D-ERA21 make the per-era style guides and
> per-building identities the deliverable of Evan's lane, authored for art work outside
> this repo, and they are unwritten; §17 O-12 ('how many civic types each era's catalogue
> holds, and what they are') is open with Evan. … **If your era needs a building named, ask
> Evan; do not invent one, and do not infer one from a superseded island brief.**"*
>
> **Three of those clauses are now wrong.** The guides are written, not unwritten; **O-12
> is CLOSED — four types in every era** (era one's `civic-buildings.md` §3); and the
> ratified subtitle rows plus the ten catalogue tables do name the buildings. The
> ten guides were authored after this paragraph was measured, which is exactly the
> expiry `.cursor/rules/qa-verification.mdc` describes.
>
> **THE NARROWER CLAIM IS A DIFFERENT CLAIM AND IT IS ALSO NOT TRUE ANY MORE — measured
> rather than assumed.** *"Only era one's row is **wired into code**"* was the surviving
> half of this and is false at `1d9ef64`: `ERA_DRESSINGS` holds **two** rows, `prehistoric`
> (7 entries) and `neolithic` (6, transcribed verbatim from era two's ratified row). So the
> correct statement is **ten ratified, two wired**, and the eight unwired eras degrade to
> the stable name alone — which is designed behaviour, not a gap.
>
> **What survives is the instruction, with a better reason.** Do not invent a building
> name: not because nobody has decided one, but because **somebody has**, and it is in your
> era's folder. And do not take one from a superseded island brief — the eight per-domain
> briefs that carried building geometry were on PR #140, **closed unmerged on 2026-07-28**,
> so that content is not on `integration` and must not be cited.

*(A guide's §5 roster ALSO describes a dressing per node in running prose — the Classical
guide's roster calls `POL.2` "a stone yard", for instance — and that is **not** the
ratified name. D-ERA29 splits a display name into a stable era-neutral half and a per-era
**subtitle**, and the subtitle is the one in the guide's subtitle ROW. Take names from the
row and from the catalogue table; the running prose tells you what a building looks like.)*

### Where the framing authority is: the ERA FOLDER, which inherits the job

**Read this before Phase 1.** It names your source, and it tells you what that source does
not carry yet. Those are two different things and you need both.

**THE RULING (team lead, 2026-07-29), verbatim:** *"it's the same concept as before, just
with the theme of the era and its building. see docs/superpowers: there's folders for each
era. let's do a pass over each of these and make sure theyre up to standard."*

So **`docs/superpowers/specs/eras/era-NN-<name>/` is where lesson framing lives**, and it
inherits the job the themes spec used to hold. Read the folder for every era your nodes sit
in: the style guide's world (materials, structural language, visible technology, props kit,
island) and its `civic-buildings.md`.

**What the folders carry TODAY, measured rather than assumed, because it changes your job.**
The ruling is a direction of travel and the pass it asks for has not happened yet. At
2026-07-29 the ten folders carry **world, architecture and dressings**, not per-node
framings: `eras/README.md`'s "What each guide owes" enumerates materials, structural
language, roof and support forms, palette, ornament, visible technology, the signature
move, the island, the advisor and the subtitle row — every one of them art. Grepping the
twenty era documents (7,242 lines) for
`word.problem|framing|CFU|mini.lesson|prompt|context` returns 15 lines, 14 of which are the
word "framing" meaning timber framing or the visual brief's "no guilt framing" tone ban.
**Re-run that grep rather than trusting this paragraph** — the point of the ruling is that
the answer should change, and per-era readiness is tracked in
`docs/Evan_Design_Decisions_Consolidated.md`.

**The era's WORLD is your framing source; the era's BUILDING is not.** D-ERA8: a skill
building never symbolises its skill; it is ordinary architecture with a lesson assigned to
it, and symbolic buildings "produced rebuses, not buildings" (§6.1, §15). A Neolithic lesson
is set among grain stores and cleared fields. It is not set inside a rebus of exponent laws.

**Until your era's folder carries framings, this is the standard:**

1. **Take the world from your era's style guide.** Its materials, props kit, visible
   technology and island description set a register even where the dressing names are not
   ratified.
2. **Treat the "Explicitly absent" paragraph as a hard list.** It is load-bearing across the
   whole ten-era sequence — era one withholds metal precisely so era three can have it. A
   word-problem may not hand a Bronze Age learner a gas sensor, or a Classical learner a
   pane of window glass.
3. **Keep the framing plain and let the mathematics lead.** The D2 precedent and the safe
   default: the plain-language pass exists because forced theming made D2 unreadable, and
   Evan's own D2 brief keeps the setting in art and terrain deliberately. An everyday noun
   the era plausibly contains beats an invented period prop.
4. **A split domain is themed by its ERA, not by its domain** (team lead, 2026-07-29:
   *"if it's in medeival, it gets medieval themeing."*). Polynomials is Classical for
   `POL.1`-`POL.4` and `POL.8`, Early Modern for `POL.6` and `POL.7`, and Industrial for
   `POL.5`; each node takes its own era's theming. Never carry one domain's motif across an
   era seam.
5. **Write the motif down in the PR** as a proposal for Evan, naming the era folder you took
   it from. Do not invent a theme name, an era premise, or an advisor.
6. **Do not re-skin an authored pack** toward a framing you invented. D1, D2, D5, D7 and D8
   are authored, and `RAT.5` is already known to be themed to the wrong era under ruling 4
   — that re-theme is Anthony's, is tracked in
   `docs/Evan_Design_Decisions_Consolidated.md`, and is not a tidy-up for a passing author.

**ONE advisor for the whole run, re-themed per era** (`D-ET9`, the team lead, recorded
2026-07-30 at `docs/superpowers/specs/2026-07-29-era-trial-contract.md` §19.2: *"There is
one continuous advisor for the whole run, re-themed per era. Not ten advisors."*). His name
is **Oru** in every era (`era-01-prehistoric/style-guide.md` §6c) and he ships —
`OruAdvisorCharacter.tsx`, `AdvisorNpc.tsx`, and the demo reel. **All ten style guides carry
an advisor section** under `## The advisor (D-ERA28)`, each with a costume, four poses, a
palette placement and that era's register.

**THE VOICE IS PER-ERA AND YOU SHOULD USE IT.** The lead, the same day: *"the advisor's
prose should change across eras though — it's not just a static advisor."* What is
continuous is the name and the relationship with the learner; the appearance and the idiom
belong to the era. Oru in era four wears a harbour architect's clothes and speaks in a
harbour architect's idiom, and is still Oru. **So read your era's advisor section for the
register before writing lesson prose** — era four's lessons are authored in that register
deliberately and correctly — and **never rename him.**

> **⚑ CORRECTED 2026-07-30. This paragraph was wrong in three places and is quoted rather
> than overwritten.** It read: *"**Ten advisors, one per era** (team lead, 2026-07-29). Era
> one's is **Oru** … and he ships … **The other nine eras name no advisor in any
> document**: `rg -i advisor` over the ten style guides matches era one alone. … **Ask
> Evan; do not name one.**"*
>
> 1. ***"Ten advisors, one per era"*** — **retired by `D-ET9`.** It is one advisor in ten
>    dressings. The identity half of D-ERA28 is what moved; the per-era art is untouched.
> 2. ***"The other nine eras name no advisor in any document"*, and the grep offered as its
>    evidence** — **false, and it was false before `D-ET9` independently of it.** Nine
>    guides were authored after that grep was run on 2026-07-29, so `rg -i advisor` over the
>    ten now matches **all ten**. Re-run it: this file's own instruction is to trust the
>    grep over the prose, and this paragraph is what that instruction exists to protect
>    against. Those nine names are now **sunset** — `eras/README.md` carries the table.
> 3. ***"Ask Evan; do not name one"*** — **no longer describes a decision anyone is waiting
>    on.** The instruction not to invent an advisor survives and its reason inverts: there
>    is one advisor already named, not nine awaiting a ruling.
>
> **The three legacy persona names (a City Clerk, a Guild Master Artificer, a Town
> Foreman) are unaffected** and the sentence about them is kept: they are keyed to DOMAINS,
> live only in retired documents, and reach no lesson string. They were never candidates.

## Four locked design decisions (do not renegotiate)

1. **Interactivity reaches into practice + the infinite bank.** Practice-set and
   infinite-bank QUESTIONS must be genuinely interactive / widget-graded where the
   concept warrants, not typed-only. The general interactive-practice-item infra
   NOW EXISTS: `graph`, `number_line`, and `expr_builder` ship as answer-type
   modules (`packages/shared-components/src/interactive/modules/<type>/`, registered
   in `registry.ts`). So the pattern is to ADD a new answer-type module modeled on
   `number-line` (comparator + input widget + `index.ts` + registry), not to build
   the infra from scratch. See Phase 5.
2. **New widgets: build freely.** When no catalog widget fits, build a new React
   widget (follow `interactive-visuals` + `svg`). Prioritize variety and truest
   pedagogical fit over minimizing code.
3. **Granularity: whole era, era by era.** The authoring unit is one era = every node
   `ERA_SEQUENCE` puts in it. A full era is QA-able as a coherent unit, which is the
   whole reason for the rule: a reviewer reads a chapter the learner will actually play
   through, not fragments picked off a spine. Do not scatter across nodes, and finish an
   era before starting the next. **The era is a grouping over nodes, not a directory**:
   it may reach into as many as four `content/lessons/<domain>/` directories, and nothing
   in the authoring toolchain reads an era. "Which era am I authoring?" above carries both
   consequences. *(It used to carry a third — that on a jointly owned era your unit is your
   own nodes in it. **No era is jointly owned as of 2026-07-31**: all content is Anthony's,
   `docs/Content_Authoring_Split.md` §11.)*

   **The tooling cannot be handed an era, and that does not make the domain the unit.**
   The validator applies its domain-level variety rules only when handed a single
   directory, so an era cannot be validated in one invocation; #212 read that constraint
   as a reason to keep the domain as the delivery unit. It is a real constraint about
   invocations and this decision overrides that reading: every gate that can only see a
   directory is run once per directory (Phase 6, Phase 7 item 5), and the gates that
   define the deliverable, coherent theming and prerequisite order, are read across the
   era by a human because that is how the learner meets it.
4. **Standalone.** This skill is fully self-contained (its own phases + checklists).
   The one-line nod to lesson-planner above is the only acknowledgment needed.

## Locked defaults (encode every one)

- **Every teaching slide has three sections.** Section 1 is a short conceptual lecture (`mini_lesson[i]`). Section 2 is an optional read-only worked example (`worked_examples[i]`, a `{ prompt, steps }` object that names its instance above the moves — see `reference.md` §1). Section 3 is at least one gated interactive visual (`"gates": true`, `after === i`). Sections 1 and 2 are prose-only; section 3 is where the learner produces a result. The ONLY interactivity exceptions remain the end-of-lesson CFU and the practice / mastery-check questions.
- **No em-dashes (U+2014) anywhere**, learner-facing or in the skill/pack files
  themselves. Use commas, colons, or periods.
- **Structure mirrors D1:** themed slides (three sections each: lecture, optional worked example, gated visual) then one combining CFU then a 5-question practice set (mix 1xL1 / 2xL2 / 2xL3, reshuffled every attempt, never re-serving the five just shown) then the infinite bank.
- **One slide, one idea, and no wall of text.** Section 1 (`mini_lesson[i]`) runs **2-3 sentences** including the theme hook, and a fourth only where it is genuinely unavoidable (arithmetic moves to section 2, so the bubble carries the idea and nothing else). Past four, split into another slide. See R1 and R34 below.
- **Variety bar:** at least 3 distinct interaction archetypes per lesson; never
  reuse the same widget id twice in one lesson (unless pedagogically intentional,
  like the PEMDAS solver pair); at least one genuine build/manipulate archetype
  (not only tap-to-reveal); NEVER a `<select>` dropdown or MCQ-disguised-as-dropdown.
  Count KINDS across the whole era, not per slide: see R11.
- **Era theming** is story/skin ONLY. Quantities, `answer_key`, `accepted` forms, and
  representation/simplification stay identical. Frozen assessment items stay plain
  (theme at template-authoring time, never a silent re-freeze). One coherent motif
  per node. Math stays legible without the flavor (accessibility). **Two authorities, and
  they are the same lane:** `docs/superpowers/specs/2026-07-27-era-progression-design.md`
  owns the rules (which era, what a building may be, what the city is), and **your era's
  own folder** under `docs/superpowers/specs/eras/` owns the world you frame a lesson in.
  The themes spec is **LEGACY** as of 2026-07-29 and is not a source for anything. Read
  "Where the framing authority is" below before Phase 1 — it also says what the era
  folders do not carry yet. `reference.md` §6 indexes them and is an orientation pointer,
  NOT an authority.
- **Question sourcing:** original or MyOpenMath-INSPIRED (CC BY), NEVER
  verbatim-copied. Reword prompts; compute keys via `generate()`.
- **Same schema, additive only.** Use the frozen `LessonContent` shape
  (`apps/web/src/lessons/types.ts`). **Do not add new fields to shipped packs** until
  the player consumes them. `worked_examples` (section 2 of the three-section slide
  model) IS consumed and is documented in `reference.md` §1, so author it. A pack that
  omits it still teaches from one paragraph per slide, which stays valid; a pack that
  declares it is held to the tighter migrated lecture budget. A new domain needs its own per-domain loader module
  mirroring `apps/web/src/lessons/d1.ts` (`import.meta.glob` + a `NODE_ORDER` built
  from that domain's `skill_graph` nodes). Use D1 as a STRUCTURAL reference; do NOT
  copy its content.

## QA quality bar (hard requirements)

### Mechanics

- Multiple internal rounds / parameterized instances, never one hard-coded case.
- The learner must PRODUCE the result before `onComplete` fires (no premature
  auto-reveal).
- Cover the hard cases: sign flips, left-to-right vs precedence, reduced-fraction
  form, excluded values (whatever the domain's misconceptions are).
- Accessibility: `aria-live` status on interactive widgets; `aria-valuetext` on
  dynamic SVG controls (sliders / steppers).
- No em-dashes. No `<select>`.

### Teaching quality: R1 to R17

This is the half of the bar that structure alone does not buy, and it is the half
D2 failed on twice. Every rule below is Gabe's, stated in review on 2026-07-26 and
recorded here so no era has to rediscover it. The audience is a **remedial adult
who has met this material before and did not retain it**: they are not slow, they
are unconvinced.

**The bar runs R1 to R33.** R1 to R12 came out of the teaching reviews, R13 to R17 out
of the reviews that followed them, R18 to R26 out of the D2 QA rounds, and R27 to R33 out
of the QA loop of 2026-07-28; they are numbered in the order they were ruled on, not by
importance, and **a number is never reused and never reassigned**. `lesson-qa` cites them
by number and never restates them, so renumbering silently repoints every citation in it:
append, and never insert.

Each rule says where it is enforced. `validator` = a mechanical rule in
`scripts/validate-lesson-pack.mjs` (error tier, always fails); `validator (warn)` =
reported, and fails under `--strict`, which all new content must run clean;
`review` = Phase 7's review checklist, because no mechanical rule separates the good
case from the bad without false positives.

**R1. Text density.** At most 6 to 7 sentences of contiguous prose before something
breaks it up. Not a hard rule, a guideline, but the remedy is not negotiable:
**split it into another slide** (best), or interpose an interactive element. Prefer
granularity over long chunks that cover several ideas. One slide, one idea.

R34's migrated budget is TIGHTER and is the one to author against on a pack carrying
`worked_examples`: 2-3 sentences, 4 only where unavoidable. R1's 7 is what still holds the
unmigrated packs, which have nowhere but the bubble to put their arithmetic.
→ Phase 2 · validator (`mini_lesson[i]` sentence ceiling of 7; 4 on a migrated pack).

**R2. Scenarios belong to the FIRST slide.** Do not force a story onto every slide.
A scenario may be *retained* on a later slide when it genuinely flows, e.g. "now,
what if someone told you the town doubled in population, 4 different times?" leading
straight into the content. What is banned is the reflex of opening every slide with
a fresh vignette because "every lesson has a problem".
→ Phase 1, Phase 2 · review (see "why R2 is not mechanical" below).

**R3. The opening should MOTIVATE, not define.** Slide one poses a concrete problem
the learner can picture, then makes the mathematics the answer to it. The shape to
copy: *"A surveyor needs to know how long town square's side length is, but he only
knows its area. How would he go about finding this? This is where square roots come
in..."* Problem, question, seamless transition into the term. An opening that starts
"A square root asks: what number times itself gives you this?" has defined the term
before the learner had a reason to want it.
→ Phase 2 · `examples.md` "the opening motivates, it does not define" · review.

**R4. No meta-commentary about the lesson.** Teach the mathematics. Never narrate
the pedagogy, never tell the learner how to read the slide. Banned register, with
our own rejected lines as the examples: "That single motion is the whole idea of
this slide, so follow it and do not stop early", "start high and step down", "follow
along", "as we will see". The learner is reading a lesson, not a description of one.
→ Phase 2 · validator (ban-list) · anti-patterns.

**R5. Build the intuition BEFORE stating the rule.** Never hand over a procedure the
learner could not have arrived at themselves. Two rejected lines and what they should
have been:
- *"A negative exponent means one over that power"* is an assertion. The learner
  should instead keep stepping the exponent down, keep dividing by the base, and
  discover that continuing past zero **forces** the values to become fractions.
  Nobody decided it; it falls out.
- *"Find the largest perfect square"* is a black-boxed thought process. The learner
  should work out why a *square* factor is the useful thing to hunt for, and see for
  themselves that a smaller square leaves a second pass to make.
→ Phase 2 · `examples.md` "the rule is forced, not asserted" · review.

**R6. Define your terms.** Every technical term is introduced before it is used.
D2 used **base** throughout without ever saying what a base is. Introduce, in bold,
on first use: exponent, power, base, radical, radicand, index, coefficient, perfect
square, reciprocal, and whatever else your era leans on. A term the learner has
to infer is a term they will get wrong in practice.
→ Phase 2 · Phase 7 vocabulary sweep · review.

**R7. Register: not clipped, not verbose.** *"Same base, so add"* is almost too
punchy. Write *"They have the same base, so we can add their exponents."* Full
sentences, plain words, nothing ornamental, no telegraphese. Remedial adult, not a
child and not a hurry.
→ Phase 2 · review.

**R8. One instruction per task.** Never two lines telling the learner the same
thing. The systemic version of this defect is worth naming, because it looked like
21 separate authoring slips and was one structural mistake: the visual REGISTRY
`caption` restated each widget's own prompt, in all 21 D2 widgets. A caption earns
its place only when it says something the widget does not.
→ Phase 3, Phase 6 · validator (caption vs the slide's task sentence).

**R9. The task statement lives in the WIDGET, not the prose.** "Really important
guideline for all lessons." A sentence like "Your turn: decide which roots come out
whole" must not sit in the lesson text when a demo follows; fold it into the demo
itself so it is clear what is being used. And having folded it in, do not then say
it twice (R8). **This reverses this skill's own earlier advice** to end each
paragraph with a "Your turn: ..." lead-in, which is why the shipped D1 and D5 packs
are full of them.
→ Phase 2, Phase 3 · validator (warn: task statement / widget mechanics in prose).

**R10. Resets must re-parameterize.** On any "start over" affordance, the learner
redoes the question **with different numbers** before they can continue. A reset
that replays the same instance, or that leaves the gate already satisfied, is a
defect.
→ Phase 3 · per-node checklist.

**R11. Interaction variety is a requirement, not a nice-to-have.** Raised twice in
review: *"there's also variation in the kinds of interactive material, not just the
same interactive element reused in slightly different ways"* and *"the interactive
elements are ok, but could be a lot better in terms of variety, mix it up."* The
standard is concrete: **count distinct interaction KINDS across the ERA you are
authoring.** An era where most widgets are a text box or a chip tap fails, however
different the numbers are. The kinds available (pick across them, do not settle into two):

  type-a-value · tap-one-of-N · build-an-expression · sort-into-bins ·
  drag-onto-a-diagram · predict-then-check · tune-a-control-to-target ·
  matching pairs · sequencing steps · labelling a figure · filling a table ·
  spot-the-error-in-a-worked-line

  Anti-pattern, verbatim: **"just disguising multiple-choice questions via a
  drop-down is not true interaction."**
→ Phase 1, Phase 3, Phase 7 · validator (kind floor + per-kind share ceiling, measured
  per DIRECTORY and so not the same population as your era; warn on a lesson under 3
  kinds) · review (the validator counts id suffixes, which is a proxy; the twelve kinds
  above are the real list, the ERA is the population, and only a human can count either).

**R12. Gating must never trap.** Every open-ended question needs a reveal, because
"learners who get stuck just get cooked and it ruins their experience." The reveal
must **teach the step**, not print the answer: `WidgetReveal` makes that structural
by requiring a `why` prop alongside the answer. Revealing inside a lesson is FREE and
unpenalised (the lesson's job is to teach); a revealed **practice** slot still scores
nothing (`Mastery_Scoring_Spec` §4). **"Explain this another way" is NOT wanted**: it
was considered and rejected, so do not build it.
→ Phase 3 · `reference.md` §2.1 shared mechanics · review.

**R13. A hint names the rule and points; it does not substitute.** A hint arrives
BEFORE the attempt, so it may name the rule and say which part of the expression the
rule governs, and then it stops. No substituting the learner's values, no arithmetic,
no stating the sign, direction or shape of the result. The line that forced this rule
was shipped as a "Hint" on EXP.1: *"A power of a power multiplies the exponents, so
$(x^{2})^{3} = x^{6}$. That leaves the same base twice, so add the exponents:
$6 + (-8)$. The total is negative, so the power moves to the bottom of a fraction."*
That is a worked solution with everything but the typing done. Tiered hints escalate
**name the rule → point at the part it governs → work a DIFFERENT instance**, so the
learner still has to transfer even at the last tier.

Two things this rule does NOT touch. **Worked solutions and reveal passages are
supposed to substitute the numbers**; that is their whole job and they arrive after
the attempt. A sweep that applied "do not substitute" to them would gut them, which
is worse than the original defect. And **a hint may state a general consequence of the
rule** ("a square root times itself gives back the number inside it") because that is
the rule's content, not this instance's answer.

Two leaks that read as innocent and are not:
- **Asserting a property of the learner's instance.** *"The bottom number is a perfect
  square, so its root is a whole number"* does the diagnosis for them. Point at the
  check instead: *"check each half against the perfect squares you know."*
- **Branching the hint on the answer.** EXP.1's quotient shape served one hint when
  the net exponent was zero and another otherwise. Each branch read innocently, but
  WHICH branch arrived was the tell: only the zero case sent the learner to look up
  the zero-exponent rule, so being sent there announced the answer. Cover every case
  in one wording.
→ Phase 4, Phase 5 · validator (`hint_leaks_answer` in `item-bank/validate.ts` catches
  a hint containing the answer key; everything above is beyond it) · review.

**R14. Every slide carries a subtitle of three or four words, and a plain title is the
DEFAULT.** One heading per `mini_lesson` paragraph, in `slide_subtitles`, positionally
aligned. *"Powers of powers"*, *"Clearing the denominator"*: a tight noun phrase naming
the slide, not *"An exponent counts how many copies are multiplied"*. Do not pad to reach
four words. It is a real `<h2>` (`LessonSlideHeading`), so it is a screen-reader landmark
and the dev slide-stepper has something to show, not styled text.

**The question form is the exception and has to earn its place, which is a REVERSAL of
this rule's own earlier advice to prefer it.** Preferring the question made it the
default: 23 of D2's 31 subtitles were questions, every one defensible on its own, and #186
rewrote 15 of them to invert the split to 8 questions in 31. So write the plain title
unless a question is the natural thing to say at that point, which happens three ways and
no others: the slide opens a case the previous slide's rule does not obviously cover, it
poses a real either/or it then resolves, or its whole job is the noticing and a statement
would pre-empt it. `lesson-qa`'s reading pass carries the reviewer's version of that test,
including the two cheap tells (a question about a term the slide has not introduced was
manufactured, and a repeated opening formula is a formula) and the instruction to read the
whole pack's headings as a list rather than one at a time.

**A subtitle orients; it does not teach.** It answers "where am I?" and the prose answers
everything else, so the test is: **if a subtitle could be mistaken for the slide's
conclusion, it is too long.** That is also why a claim is wrong rather than merely wordy.
A claim states the very thing the learner is meant to notice, so on any slide built for
discovery it hands the answer over before they look: EXP.1's halving ladder ships as
*"Negative exponents"*, never *"A negative exponent is a reciprocal"*. Both a topic and a
question orient without pre-empting, which is what makes the short length natural rather
than a squeeze.

**This rule has REVERSED TWICE, so read the sequence before you propose a third.** It
first required a CLAIM (*"A negative exponent means divide"*) over a topic (*"Negative
exponents"*), on the grounds that a filing label earns nothing. That carried its own
refutation: it needed a carve-out for the six discovery slides, where a claim spoils the
slide, and once the exception is that large it is the rule. So the claim requirement went,
replaced by a preference for the short QUESTION form, which never had that problem. The
preference then produced its own defect one slide at a time, because a preference is a
default: #186 measured 74% questions and reversed it to the plain title above. What
survives both reversals, and is the durable content of the rule, is that **a subtitle must
not pre-empt the noticing.** A topic label does not, a question does not, and a claim does.
If you find yourself reasoning either that a topic label earns nothing or that a question
is the natural form, both of those are withdrawn rulings.

A subtitle is NOT the slide's opening line and must not be allowed to become it (see
R15). It says where you are; the opening says how you got here.
→ Phase 2 · validator (warn: presence; error: 4-word cap, em-dash, meta-commentary)
  · review (whether these are the right three or four words).

**R15. A slide opens by connecting, and raises its question before its claim.** The
first sentence reaches back to what the learner just did, and the slide poses its
question before delivering the answer to it. The line that forced this rule opened
EXP.1's eighth slide: *"A finished answer has no negative exponents left in it, and
getting there takes two steps."* Two defects in one sentence. "A finished answer"
arrives as a settled concept the pack never introduced, and the slide opens on a
CONCLUSION when the learner was never handed the question it answers. Ask *"how do you
know an answer is finished?"* first, and "finished" gets defined by the answer instead
of assumed.

There is a shortlisting tell for finding these by eye, and it is a REVIEWER's tool
rather than an authoring rule, so it lives in `lesson-qa`'s review pass.

**One shape of this IS mechanical now, and it is the shape a demonstrative makes.** A slide
whose FIRST WORD is a bare *That* / *This* / *These* / *Those* / *It* / *They* / *Such* points
at something the entry never names, so the learner arriving at the heading has nothing to
resolve it against. The instance: RAD.1's fourth slide opened *"That matters because a root
splits across a product"*, where "That" was the perfect square factor found on the slide
before. Name the thing (*"Finding a perfect square factor matters because ..."*) and the
slide stands on its own.

**Two passes read past that line, and the reason is worth keeping.** The reviewer's tell
above keys on a DEFINITE ARTICLE, and a bare demonstrative carries no article for it to see;
the R19 widening that followed was scoped to comma-fenced asides and correctly did not touch
it. So the mechanical rule is not a duplicate of the tell, it is the hole in it. It is a
WARNING, because reaching outside the entry is sometimes right: the previous slide's widget
may still be on screen holding the referent, and a subtitle that names the referent (rather
than the topic, which is what *"Splitting a root"* did) supplies one. A demonstrative
DETERMINER is deliberately not flagged: *"This rule splits ..."* at least names the class of
the thing, and *"This morning the builder ..."* is not pointing backwards at all.

This is at the seam BETWEEN slides and is a different defect from R16, which is
sentence to sentence WITHIN one. Fixing either does not discharge the other.
→ Phase 2 · validator (warn: a bare demonstrative in the FIRST WORD of a `mini_lesson`
  entry) · review (`lesson-qa`, the R15 article tell, for everything else).

**R16. Between paired or inverse ideas, the second one opens with a hinge.** When
consecutive sentences move between two halves of one idea, the connective leads. The
line that forced this rule: *"Division goes the other way and subtracts them, because
every copy on the bottom cancels one on top."* "Goes the other way" IS the turn, but
buried mid-sentence it reads as one more fact rather than as a signal to re-orient.
*"On the flip side, division subtracts them, because..."* puts the turn before the
content. **Vary the connective**; five slides opening "On the flip side" is its own
defect.

**Do not fix this by splitting the slide.** It was considered and rejected for the
exponent laws: multiplication and division are one idea seen from two directions, and
the entire payoff of division subtracting is that it inverts multiplication adding.
Splitting discards the symmetry that makes the second half memorable, which fixes the
rhythm by damaging the teaching. Split only when the slide ALSO busts the sentence cap
or needs its own interaction, in which case the split was owed anyway.
→ Phase 2 · review (no mechanical rule: see below).

**R17. An assembly widget names its OBJECTIVE, separately from its mechanic.** Two
lines, two jobs: `objective` says what is being built and how the learner will know it
is done, `prompt` says how to work the control. R9 put the task statement in the
widget and this is the half R9 did not ask for, which is how
`negative-exponent-order` shipped saying only *"Tap the line that comes next. Each one
has to rest on something already on the board."* Both sentences describe the control.
The four chips are a derivation of $2^{-3}$ and nothing said so, so QA read a good
proof as four shuffled lines.

- **Phrase the goal as the open question.** In an ordering widget the final step IS
  one of the chips on offer, so a goal restating it hands over the last tap.
- **The mechanic line shrinks accordingly.** "Each one has to rest on something
  already on the board" describes a constraint the widget already enforces by refusing
  a bad tap and saying why, so once a goal line exists that sentence is bloat.
- **It lives on the KIND, as a required prop**, not as prose in one widget, so every
  domain inherits it and `tsc` refuses a widget that forgets. **It is required on FIVE
  kinds today:** the three assembly kinds it started on (`OrderSteps`, `LabelParts`,
  `FillTable`) plus `SpotTheError` and `BinaryRowSort`, which #178 added. `MatchPairs`
  and `EstimateThenCheck` still do not carry it: their prompts already name what to
  find, because finding it IS the interaction. **`SpotTheError` used to be on that
  list and no longer is**, so do not restore the carve-out from an older reading:
  finding the wrong line names the target, and it turned out still to need a line
  saying what the learner is repairing it TO.
→ Phase 3 · types (required prop) · `widgetQaFixes.browser.test.tsx` (the two ways of
  satisfying the field while missing the point: pasting the mechanic in, printing an
  offered option in) · review.

### Teaching quality: R18 to R26

R1 to R17 came out of the D2 teaching reviews. These nine came out of the D2 QA rounds
that followed, and they are the same kind of rule: each one is a specific defect that
shipped, generalised exactly as far as the instance supports and no further. R18 to R20
are what a learner READS; R21 to R23 are what a WIDGET'S WORDS say; R24 to R26 are how a
widget BEHAVES. The last three are enforced by shared components and browser guards
rather than by the pack validator, which cannot see inside TSX.

**R18. An internal node id is never learner-visible.** *"Back in RAD.1 you pinned down
what a square root undoes"* shows the learner a string they have never seen and cannot
look up. Name the lesson, name its building, or describe the skill: *"back when you
pinned down what a square root undoes"* loses nothing. **The choice among the three is
per instance and is a judgement**: a building name is best when the learner has one
standing and can go click it, a lesson title when the reference is to the teaching, and
a description when neither is crisper than just saying the thing. #164 fixed two
instances by description. Note that the building name is the option most likely to
decay, because D-ERA9 puts every era-flavoured skill-building name on notice.
→ Phase 2 · validator (error: the literal node ids from `skill_graph.json`).

**R19. A parenthetical aside fenced with commas becomes parentheses, or is absorbed.**
*"recorded as $9/4$ square meters, a fraction rather than a whole number, and the
builder still needs a side length"* puts four commas in one sentence doing two different
jobs, list separator and bracket, with nothing telling the reader which is which. This
is largely a side effect of our own em-dash ban: the dash is the other natural
aside-bracket, so with it gone the commas absorb the work. Expect clusters wherever an
author wanted a dash.

Two calls the rule does NOT make, and both are yours:
- **Not every comma pair is an aside.** *"Multiply the base, then add the exponents"* is
  a sequence and must keep its comma. The validator's blocklist of clause words exists
  for exactly this and is the reliable half of the check.
- **Parentheses say "skippable".** So a load-bearing clarification is the wrong thing to
  bracket: absorb it into the sentence instead. If the reader needs it to follow the
  next line, putting it in parentheses tells them the opposite.
→ Phase 2 · validator (warn: a determiner-led, verbless noun phrase of at most 8 words
  between two commas) · review (parenthesise or absorb).

**R20. The word is "variable", never "letter".** A symbol standing for an unknown is a
variable; calling it a letter names its typography and says nothing about its job, and a
learner told it is a letter has been told nothing about why it is there.
→ Phase 2 · validator (warn, and warn-tier deliberately: a figure whose corners are
  labelled A, B and C is honestly about letters).

**R21. A label slot holds a TERM, not a description of one.** RAD.1's parts-labelling
widget offered *"what the symbol hands back"* as a name to drop onto a glyph. That is a
gloss of a term, not a term, so the learner practises recognising a paraphrase instead of
learning the word: the answer is **result**. The detection rule, which is what makes this
checkable by eye: **a name slot holding a multi-word phrase built around a verb is a
paraphrase.** "Hands back", "gets multiplied", "tells you how many" are all the tell. The
labels in a labelling widget are the vocabulary the lesson is teaching (R6), so a
paraphrase there does not merely read oddly, it teaches the wrong thing.

**It reaches every slot that NAMES a thing, not only a drop target**, and the recurrence is
what proved that needed saying: #196 found *"gives back"* heading a `FillTable` column one
node over, and a `FillTable` renders `headings` straight into `<th scope="col">`, so the
announced column name is the visible one. Settled as **result**, the same word as the
first time.
→ Phase 3 · review.

**R22. Sibling option labels must all answer the question the PROMPT asks.** RAD.2's
sorter named two of its three bins by their radicand and the third by what the radicand
DID: *"combines with nothing"* beside two bins named for a value. The prompt asked which
radicand each term carries, so two labels answered it and one answered a different
question, and the fix was `neither`. **This one cannot be regexed and there is no point
trying.** The check is a sentence a reviewer writes down: state what question the prompt
poses, then read every sibling label against it. A set of labels that are individually
accurate can still be an incoherent set, which is the whole defect.
→ Phase 3, Phase 7 · review.

**R23. Invented vocabulary is banned.** RAD.3 shipped a widget calling part of an
expression a *"crook"*. No source uses the word, so it is untransferable by construction:
the learner cannot look it up, cannot meet it again, and cannot use it to ask anyone a
question. Use the real term, and if the real term is too advanced for the reader, use
plain description rather than a coinage. This is R6's other half: R6 says define every
term you use, and R23 says the term has to be a real one first.
→ Phase 2, Phase 3 · review.

**R24. The task statement sits FIRST in the widget, above the controls.** R9 put the task
in the widget and R17 made it name the objective; this says WHERE it goes, which is the
half both of those left open and the half a learner actually trips on. The defect, on
RAD.4: reading top to bottom the learner met a round counter, an expression, a grey note
about the rule, four chips, and only then the sentence saying what the chips were for.
The task had been living in `.lesson-interactive__status`, which is the LAST child of
every widget because it is the `aria-live` region, **and which the first wrong move
overwrites with feedback**, so the task did not merely arrive late, it left. Use the
shared `WidgetTask` slot. The task must also ask for the same KIND of thing the controls
offer: *"tap the even part of 7"* over four chips that are all powers of $p$ is a task and
a control set that disagree about what an answer looks like.
→ Phase 3 · `widgetTask.tsx` · `widgetTaskOrder.browser.test.tsx` (asserts DOM ORDER, not
  presence, because presence is what the status line already had) · review.

**R25. A binary row must not collapse when the learner misses it.** A settled row keeps
BOTH options on screen, disabled and marked. Replacing them with a text verdict throws
away the comparison that was the teaching: *"$\sqrt{32}$ stays a radical"* only instructs
while it sits beside *"you said it comes out whole"*. It also makes an answered row
structurally unlike an unanswered one, so a finished row reads as broken rather than as
done. The explanation belongs in a note under the row it explains, not in the shared
status line.
→ Phase 3 · `interactive/kinds/BinaryRowSort.tsx` · `binaryRowMarks.browser.test.tsx` ·
  `interactive-visuals` · review.

**R26. The correctness palette is reserved, and a slot binding never uses hue.** `CIVIC`
green and `BRICK` red are the app's correctness channel and they report on the LEARNER'S
ACTION: green means their pick was right, red means it was not. That is the whole of what
they may say.

- **A standing mark that is not a verdict needs a third colour.** The right answer on a
  row the learner MISSED is not a verdict on anybody, because they did not pick it, so it
  takes `SIGNAL_DEEP` amber and leaves the correctness palette rather than borrowing the
  success end of it. Green there would credit a pick that was never made.
- **A non-colour carrier is always required.** Every state also names itself in its
  accessible name and in a glyph, and the learner's own pick is solid where a standing
  mark is dashed. No state is colour alone, ever.
- **The subject of the question stays ink.** Tinting the classified expression by the
  learner's correctness puts a third meaning on the same palette and makes a perfectly
  good $\sqrt{32}$ look like the thing that was wrong.
- **Binding a label to a slot uses weight, style or position, never hue.** A widget that
  colours matched pairs to show which goes with which has spent the correctness channel
  on bookkeeping, and the learner then reads a correct pick as a wrong one. This is the
  strict form of the older rule that option chips render in one neutral token: colour
  that marks the correct answer answers the question.
- **And the non-hue carrier has to be ABSOLUTE, not comparative.** #190's live-slot mark
  was a heavier stroke and an underline, both of which ask the learner to notice a
  difference between two adjacent objects. It inverted: by slot 3 the FINISHED template
  was drawn in `CIVIC` at lightness 0.42 and the live one in `LINE` at 0.78, so the idle
  box was the high-contrast object on the board while the guard's `2.75 > 1.5` passed
  throughout. The replacements are absolute: the entry row SAYS which slot it is filling,
  in words ending in the caption printed under that template, and the template not being
  filled is dimmed to a fixed `opacity`. Assert the threshold, never the ordering: a
  relative assertion passes on `1` against `0.99`, which is not a signal anybody can see.

**One live exception is recorded so a sweep does not "fix" it.** On `SpotTheError`, the
`given` and `repair` marks are BOTH `SIGNAL_DEEP` and both dashed, so hue and border style
separate neither and the only channel that does is each mark's caption text. That is why
`MARKS.given.caption` survived the badge deletion in R27 and why
`spotTheErrorPalette.browser.test.tsx` exists. If you adopt that kind, the caption is
load-bearing; if you write a new kind, do not reproduce the collision.
→ Phase 3 · `svgKit.tsx` tokens · `spotTheErrorPalette.browser.test.tsx`,
  `binaryRowMarks.browser.test.tsx`, `widgetActiveSlot.browser.test.tsx` ·
  `interactive-visuals` · review.

### Teaching quality: R27 to R33

These seven came out of the QA loop of 2026-07-28, and they are the same kind of rule as
R18 to R26: a specific defect that shipped, generalised exactly as far as the instance
supports. R27 to R29 are what a widget DOES with an answer; R30 and R31 are what it puts on
screen around one; R32 and R33 are words. **None of them is a validator rule**, and that is
deliberate rather than pending: each already has an enforcement point in a shared component
or a Chromium guard, which R17 established is the stronger place, and none of them measured
a shape a text rule could see.

**R27. A revealed answer is not labelled.** The reveal already paints the blank it filled:
amber, dashed where an answered blank is solid, tinted background, `font-weight: 700`,
`readOnly` on a box. A word on top of that is clutter, and it was a shared CSS
`content: "given"` on `[data-reveal-given]`, so one deletion covered all eight input
shapes. Two things make it wrong and not merely redundant:

- **It was never the accessible name.** `useRevealFill` reads the same flag the stage
  carries `inert` on, so a filled blank is on screen over exactly the window its own
  subtree is out of the accessibility tree: every one of the eight shapes computes to
  `ignored: inertElement` while filled, measured through Chromium's own accname
  implementation. Adding an `aria-label` there would be unreachable text. The carrier that
  survives the freeze is the reveal PASSAGE, which sits outside it and states the answer.
- **After R28 it is false.** A reveal on a board with other answers outstanding now hands
  the instance back, so the next click empties the slot and asks the learner for it. The
  badge called finished a value the learner is about to have to produce.

The one surviving visible `given` is `SpotTheError`'s mark caption, and it stays for the
reason recorded under R26: on that kind two marks share a hue and a border style and the
caption is the only channel between them. Do not read that as licence for a badge.
→ Phase 3 · `styles.css` (no `::after` on a filled blank) ·
  `widgetRevealFill.browser.test.tsx` (asserts computed `::after`/`::before` content is
  empty, because generated content is invisible to `value` and `textContent` and all 17
  fill tests passed with the badge in place) · review.

**R28. Feedback is scoped to the unit of WORK, not to the widget.** A verdict, a reveal and
a check button each report on one answer, and a widget holding several independent answers
owes several of each. Three instances shipped on one day, and they share almost no
machinery, which is why the rule is written here rather than in one component:

- **A verdict.** RAD.2's combine-radicals builder put four boxes and two roots behind one
  "Simplify". A learner with $\sqrt{24}$ right and $\sqrt{54}$ wrong got one red line about
  the pair, naming neither root, so the row they had earned read as part of the miss. Now
  each row has its own check button, its own verdict and a sentence about **that row's
  numbers**. 7 of 96 widgets had this shape; three were fixed in lane and four reported.
- **A reveal.** A reveal scoped to the whole figure spent every placement already made
  (R12 covers the reveal existing; this covers what it costs). The live predicate is
  `othersRemain`, read at the click: with other answers outstanding the passage offers the
  instance BACK beside the fresh one, and resolving nothing, so the explained answer is
  still the learner's to produce. `othersRemain` is FALSE on the last outstanding answer,
  because that answer IS the gate. **Every widget that renders a reveal owes the predicate,
  not only the ones built on a shared kind**: nineteen bespoke D2 widgets hold several
  answers at once through their own rounds, and eighteen of them were shipping the defect
  while the guard asked the seven kinds alone (#219).
- **A collapse.** R25 is this rule's first instance, ruled on before the class was
  visible: a settled binary row that replaces both options with a text verdict has scoped
  a row's feedback to the whole board, and thrown away the comparison that was the
  teaching along with it.

**The generalisation and its limit.** The rule is *two or more answers live at once whose
correctness is independently determined*. Two boxes expressing ONE value are not the shape
and must keep one verdict. And do not extract a kind for this on sight: 79 of 103 widget
files render their own copy-pasted status line, so what is shared is a MARK and its
vocabulary (`widgetPartVerdict.tsx`, in the shape of `WidgetTask`), not an archetype.
→ Phase 3 · `widgetPartVerdict.tsx` · `widgetFeedback.tsx` (`othersRemain`) ·
  `widgetRevealResume.browser.test.tsx` (the behaviour) ·
  `revealReAsk.test.ts` (which widgets are asked for it, and the two declared exceptions) ·
  review.

**R29. A recorded miss must not hold a finished board shut.** The gate turns on every part
being **CALLED**, not on every part being right first time. Getting one part wrong and then
finishing the rest correctly is a learner who has done the work; handing them a fresh board
makes them re-answer the parts they already had right in order to reach the one they did
not.

**Read the survey before you generalise this, because the obvious version of it is not what
was measured.** Across 103 widget files: **nothing in the tree is terminal**, no widget
ends an attempt on a miss, and `LinearModelRateExplore` only looks it. The real population
is **lock-on-wrong**: a widget that locks a part on a wrong tap and then reads that miss in
its gate, which was exactly 8 widgets, all carrying the identical
`const solved = complete && !missed`. Six of the seven shared kinds already forgave, so the
kind the report came from was the outlier rather than the rule.

- **Completing every part is still required**, and with the miss out of the gate that is
  now the whole of the anti-brute-force property, so assert it separately.
- **The miss stays visible.** Renaming `solved` to `clean` and leaving it driving the
  status line keeps the rendering byte-identical: the board still says a part was missed
  and points at the row that explains it, on the way past rather than instead of the way
  past.
- **The family is INCONSISTENT today and a learner meets both halves.** #207 moved the two
  D2 widgets; the other six are D1/D5/D7, and #201 rewrote their sentences in the opposite
  direction the same day. **Anthony has the ruling** — that was true when this was written
  because those six sat in his lane, and it is true now because *all* content is his
  (`docs/Content_Authoring_Split.md` §11, 2026-07-31). The instruction is unchanged: do not
  "fix" one of those six as a side effect of your era.
→ Phase 3 · `interactive/kinds/BinaryRowSort.tsx` ·
  `widgetMissedBoardGate.browser.test.tsx` · `interactive-visuals` · review.

**R30. An answer field advertises the shape the KEY has, and offers the keys that type it —
both derived from the answer key and not from a type label.** The answer field is where a
learner who is right on paper loses the attempt on notation, and that failure is
indistinguishable from not knowing the mathematics. **The rule covers three things, not
one**: the placeholder that names the notation, the durable note under the field that keeps
naming it once the placeholder has stood down, and the live preview that reads it back. The
three are one decision, because `MathAnswerColumn` renders the note and the preview together
and only when the notation dispatch hands the item a non-empty row, so an answer that reaches
no tag loses all three at once and shows a bare "Your answer" over a bar nothing on screen
mentions. Three
obligations:

- **Advertise the right SHAPE. The radical half of this is CLOSED, at `8f1d47e`
  (2026-07-29, an ancestor of `2814951`), and the finding it closes is kept here rather than
  deleted, because the reasoning is what generalised.** As recorded at `83a43d3`: the placeholder
  was chosen from `simplification`, a type label, so every `simplification:
  simplified_radical` item with a constant radicand got `RADICAL_PLACEHOLDER`, "a simplified
  radical: `5*sqrt(2)`", a coefficient times a radical — and **20 of the 55 instances
  carrying that line were keyed in a shape it does not advertise**, six of them a SUM of two
  radical terms (`4*sqrt(6)+3*sqrt(5)`) shown a single product, seven a radical over an
  integer (`sqrt(3)/3`). It also noted that #211 had landed the right seam and not taken it.
  `8f1d47e` took it: `radicalShape` reads the item's own key and `constant_radical` is now
  three tags with three lines over one shared row of keys. Confirm at your own tip before
  repeating either number.
- **Offer the keys the key needs, on the same reading.** The uncommitted work of 2026-07-30
  generalises `radicalShape`'s correction from the placeholder to the KEY ROW, for the
  shapes where a type or a profile says nothing about the notation the answer is written in:
  a `numeric` keyed `1/32` (`fraction_bar`), a `solution_set` keyed `{8/3}`
  (`solution_set_fraction`), an `expression` whose star the grader cannot read without
  (`implicit_product`), and the D5 two-field rational answer split four ways on its
  expression key. Measured over the served bank while the sweep was red: **105 items were
  keyed with a `/`, a `^` or a load-bearing `*` behind a bare field**. So the second half of
  the reading is that an answer TYPE is a weaker claim than an answer KEY — the no-keys
  policy for a plain numeric or a roster rests on the answer being typeable from a phone
  keyboard's first layer, which is true of an integer and false of a fraction bar.
  **The D5 residual is closed, and the shape of the fix is the lesson.** That field used to
  advertise one hard-coded line to all 140 of its items, so the 56 keyed as polynomials met an
  example naming a bar their answer must not contain — the one thing a learner there most needs
  not to be told, because the work is noticing the quotient cancels. It was carried honestly, as
  a tag exemption held to its reason in both directions rather than hidden by a "has no keys"
  filter, and carrying an exemption honestly is still worse than not needing one. The fix was
  not the per-field dispatch it seemed to need: the field asks `practicePlaceholder` per item
  like every other surface, the bar in the key picks the LINE as well as the row, and the
  exemption was **discharged** rather than reworded. What replaced it is the stronger claim —
  `answerKeypad.test.ts` ("splits the D5 pool by the bar in its own key, in the line and the row
  alike") asserts the two cohorts show DIFFERENT lines, fails in both directions, and pins the
  56/84 composition beside the counts.
- **Never advertise a form the grader rejects, and never advertise the answer.** `x^9` was
  picked as an exponent example because no served key uses 9, and it grades
  `invalid_input / unsupported_exponent` (`MAX_EXPONENT` is 8). Separately, six placeholders
  answered a served item outright, and the leak check has to GRADE rather than string-match
  to see it: a key of `{4}` is not the string `4`, and a bare `4` scores correct against it.
  The same rule binds a KEY: a key that types notation the item's own grader refuses is
  worse than no key, because the learner taps it and the attempt comes back
  `invalid_input`, which §12 of the equivalence spec scores as unanswered.

**The population the sweep owes is seven pools and every pack**: the six registered domain
pools plus the interactive one, **1,120 served items**, and all **31 authored lesson packs**
(`SERVED_ITEMS` and the `cfus` list in `answerKeypad.test.ts`; its sibling
`answerFormat.test.ts` sweeps the six domain pools without the interactive one). This list
is the thing a new domain gets left off, and it was left off twice: D3 and D8 each shipped a
pool, a loader and a `domains.ts` entry while every sweep in that file went on saying "all
five registered pools" and passing, with 350 served items outside the guard.

→ Phase 5 · `answerFormat.ts` (`answerNotation`, the one classifier; the placeholder and
  the notation row are each a condition-free switch over its result and their agreement is
  pinned over every served item) · `answerKeypad.test.ts` (both directions of the row: nothing
  it advertises is refused by the item's own grader, and nothing the item's own key uses is
  left unadvertised, with the exemptions named and held both ways) · `answerFormat.test.ts`
  (every advertised form graded through the real comparator, and every key-derived cohort
  censused) · `answerPlaceholderFit.browser.test.tsx` (every placeholder measured against
  the real field width, since a truncated placeholder teaches half a syntax) ·
  `mathAnswerColumn.browser.test.tsx` (that the note and the preview actually RENDER, in
  Chromium with the real stylesheet) · review.

**R31. A rendering trick must never produce a false mathematical statement.** Hiding part
of an expression to make room for a label leaves the REST of the expression on screen, and
what is left is read as the whole of it. Three shipped from `\phantom` in one node pair:

- `x^{\frac{\phantom{5}}{\phantom{4}}}` dropped both operands and kept the fraction BAR, so
  in superscript position it drew a short rule and the learner read `x` to the MINUS, which
  is what the previous node teaches.
- `\sqrt[\phantom{4}]{x}` dropped the index, and a radical with no index IS a square root,
  so the figure claimed index 4 on a square root beside its own text saying a square root
  has index 2.
- `\sqrt{\phantom{00}}` followed by a separate `49` drew the radicand OUTSIDE its own root
  sign, where the only reading available for the juxtaposition is a product.

**This class is invisible to every text-based assertion**, which is why it shipped and why
grepping will not find the next one: KaTeX renders `\phantom` in `transparent`, so the DOM,
the `textContent` and the MathML all still carry the digits and only the paint is missing.
The guard is `labelFigureWhole.browser.test.tsx`, which asserts on the PAINT over every
visual any lesson places, derived from `allLessons` at runtime with floors.

**The fix shape, and the one sanctioned exception.** State the expression WHOLE and quote
the parts after a "has"; the numbers appearing twice is the cost of the slot widths, not a
sloppy draft. Alignment phantoms (`\phantom{=}`) hide nothing that carries meaning and are
fine. The real exception turns on whether the hidden operand COULD have been set in place: a
hollow radical labelling an `<input>` is legitimate, because a form control cannot live
under a surd, and that is the only reason `combine-radicals-builder` passes the sweep.
→ Phase 3 · `labelFigureWhole.browser.test.tsx` · `svg` · `lesson-katex` · review.

**R32. A real technical term must be EARNED before it is used.** This is the third part of
the vocabulary rule and it is the one with a choice in it: R6 says define every term you
use, R23 says the term must be a real one first, and R32 covers the real term that arrives
undefined. **An invented word is deleted; a real unearned one is glossed OR avoided**, and
which of the two is a judgement about the surrounding material rather than about the word.

The measured instances, both in one pack: **"parity"** appeared once in learner prose across
five packs and was defined nowhere, and **"real number"** appeared three times, once in the
casual sense. Three tests decided each one:

- **Does the next interaction use the word?** The widget that slide mounts argues entirely
  in *"the index is odd"* / *"the index is even"* and never says "parity", so a gloss would
  have taught vocabulary the interaction then declines to use. Dropped, and the sentence
  rephrased to *"odd and even roots also differ in what they will accept"*, which is the
  concrete version the paragraph already speaks.
- **Would the gloss lean on a SECOND unearned term?** Glossing "parity" needs "index",
  which only a SIBLING node defines, and a sibling is not an ancestor: a learner can arrive
  without it. Swapping one unearned term for another is not a fix.
- **Does it recur across the curriculum, and does a graded item use it?** "Real number"
  does both, so the two technical uses stay undefined-but-assumed while the CASUAL one was
  reworded to *"an actual number"*. A term used once and abandoned is cheap to dodge; a term
  the item bank grades against must keep its wording.
→ Phase 1 vocabulary list · Phase 2 · Phase 7 review · `scan-lesson-text.mjs` ledger (the
  specific sentences, once cut) · review.

**R33. Copy after a miss does not lead with the penalty, and does not instruct on what
should have been done.** The rejected line, in full: *"One answer was wrong, so this set
does not count. On the next set, check each number against the perfect squares you know
before you tap."* It opens on the cost, and then coaches retrospectively about an attempt
that is over. Say what is true and where to look: name the miss on the way past rather than
instead of the way past, and point at the row that explains it.

**Do not generalise this past its scope, because the unscoped version fires on content the
bar requires.** "Do not instruct on what should have been done" reads as a ban on exactly
the wording R13 endorses for a HINT (*"check each half against the perfect squares you
know"*), and on the per-part note R28 requires. The difference is timing and addressee: a
hint arrives before the attempt, a per-part note explains the part it sits under, and this
rule is about a set-level verdict delivered after the fact. Only the third is banned.

**Quote the objection, not either replacement.** This copy moved twice on 2026-07-28: the
rejected line became *"A clean set is all four calls right. Let's go for a perfect one."*,
and R29 then made that one wrong too, because the board no longer holds the learner. Read
the widget.
→ Phase 3 · `widgetMissedBoardGate.browser.test.tsx` (asserts the board says the learner
  may carry on) · `scan-lesson-text.mjs` ledger · review.

**R34. Three sections per teaching slide: lecture, optional worked example, gated
practice.** Each slide index `i` authors up to three sequential parts before the CFU:

1. **Section 1 — Lecture** (`mini_lesson[i]`): **2-3 sentences total**, hook included, so
   at most one line of era/theme before the **conceptual** prose. No worked arithmetic; no
   step-by-step instance. A **fourth** sentence is allowed only where it is genuinely
   unavoidable, and say in review which slide needed it and why; a fifth is a defect,
   because at five the arithmetic is back in the bubble that section 2 now exists to hold.
   *(This supersedes the 4-6 target this rule shipped with: the budget is the ruling of
   2026-08-02, and 4-6 was written before any pack had a section 2 to move work into.)*
2. **Section 2 — Worked example** (`worked_examples[i]`): optional, and where it is authored
   it is a `{ prompt, steps }` object, text only. The **`prompt` is required**: at most 2
   sentences naming the instance the steps are about to work, rendered above them. It is
   what makes the card a worked example rather than four sentences of arithmetic, because
   steps with no question above them are a solution the learner has to run backwards to
   recover the problem from. State the instance only; the idea stays in section 1 and the
   result belongs in the last step. Then **2-6 steps**, one move per step, last step names
   the result, on the same step-array conventions as CFU/practice (`practice-hints`). Skip
   when the slide is purely definitional or section 3 alone demonstrates the idea, and say
   so with a `null` entry or by leaving it off the end. The array is aligned by POSITION
   with `mini_lesson`, so an entry never moves without the slide it belongs to.
3. **Section 3 — Interactive visual** (`visuals` with `after === i`, `gates: true`):
   the learner **produces** a result. Trim section 1 to a short hand-off; do not
   duplicate section 2's example verbatim in the widget (same defect class as CFU
   reuse and R8).

The player advances through sections 1→2→3, so `worked_examples` is authorable in shipped
packs. Migration is per PACK, not per domain: a pack that omits the field teaches from one
paragraph per slide and remains valid. D1 is migrated in the same change that wired the
player; the other eight domains stay one-paragraph slides and are held to R1's 7 instead.
→ validator rule 13 (`validate-lesson-pack.mjs`) on the packs that DECLARE the field: the
  shape, positional alignment with `mini_lesson`, a present prompt within 2 sentences, 2-6
  steps per entry, no em-dash and no meta-commentary in either, and that pack's lecture
  budget (5+ sentences an error, exactly 4 a warning). `MAX_SENTENCES = 7` still applies to
  unmigrated packs. Rule 13 also carries a population floor, so a green run over a tree where
  nothing has migrated, or where nothing names its instance, fails instead.
→ review, for everything a count cannot decide: whether a fourth sentence was genuinely
  unavoidable, whether the prompt names the instance the steps actually work rather than
  restating the slide, whether the steps follow one another, whether skipping section 2 was
  the right call on a given slide, and whether section 3 repeats section 2's instance.

### Why R2, R3, R5, R6 and R7 have no validator rule

They were tested as candidate rules against the six shipped D1 packs, the five D2
packs and the six D5 packs, and each one either fired on content that has been
praised or failed to fire on content that was rejected:
- **R2 (scenario placement).** The only portable mechanical proxy is a themed proper
  noun on a slide after the first. Across 67 shipped paragraphs and the 21 rewritten
  D2 paragraphs, the theme's proper noun (an island name, under the model that
  shipped) appears on slide 0 and nowhere else, while the
  later-slide scenarios that were actually rejected ("A crew builds a wall...", "The
  grain tower keeps its ledger...") carry no proper noun at all. Zero recall on the
  real defect.
- **R3, R5, R7.** Whether an opening motivates, whether an explanation earns its
  rule, and whether a sentence is pitched right are judgements about meaning. Any
  keyword proxy flags good prose.
- **R6 (define your terms).** Bold marks both a term introduction and ordinary
  emphasis, so "used but never bolded" reports 6 findings against D1 and 7 against
  D5, all of them wrong.

A validator rule that produces false positives is worse than no rule, so these five
are review-checklist items in Phase 7 instead. Read them before you submit; a human
has to.

### What R13 to R17 could and could not be made mechanical, and why

R14 and R17 ARE mechanical, and neither needed a heuristic to get there:
- **R14 (subtitles)** is checked because PRESENCE and LENGTH are both facts. Presence is a
  warning and not an error, because an error tier would have failed the sixteen shipped
  D1/D5/D7 packs the moment it landed, and those were not ours to rewrite. That is the
  reason it is a warning and it stays the reason, but read it as history rather than as a
  description of the tree: #201 gave every shipped pack subtitles on 2026-07-28, so the
  presence rule finds nothing today. The length cap IS an error, and can be, for a reason
  that never rested on a count: it only runs on a subtitle that EXISTS, so it could not
  retroactively fail a pack written before the field. It
  counts WORDS, not characters, because the rule is about words: an 80-character cap
  passed every one of the old D2 subtitles, one of which ran 14 words in 63 characters.
  What stays a judgement is whether a four-word heading is the RIGHT four words.
- **R17 (objective line)** is enforced by the TYPE, which is stronger than any validator
  rule and has no false-positive mode at all: `objective` is a required prop on the
  three assembly kinds, so a widget that omits it does not compile. Prefer this shape
  wherever a rule can be attached to a shared component instead of to content.

R13 and R16 are advisory, and R15 is now advisory only for the part of it that resists, for
three different reasons worth keeping apart:
- **R16 (leading hinges)** is the clearest no. The defect is a connective in the wrong
  POSITION, not a missing word: *"Division goes the other way and subtracts them"*
  contains its hinge and is still wrong, and *"On the flip side, division subtracts
  them"* contains the same words and is right. Any keyword proxy scores both alike, and
  a proxy for "these two sentences are about inverse ideas" is a semantic judgement.
- **R15 (opening connects, question before claim)** has a genuinely useful tell (an
  opening that introduces a term behind a definite article the pack never defined) and
  it earned its place by finding the second real instance. But it fires on plenty of
  good openings, so it belongs in a human's shortlisting pass, not in a gate. **One
  narrower shape came out of that tell's failure and IS gated**, at the warning tier: a
  bare demonstrative as the entry's FIRST WORD. That shape has what the article tell
  lacks. Its position is fixed rather than "near the opening", its trigger is a closed
  set of seven words, and its antecedent test is arithmetic rather than a judgement,
  because nothing inside the entry precedes token 1, so an anaphor there necessarily
  reaches outside the entry. What is still a judgement, and what keeps it off the error
  tier, is whether reaching outside is acceptable here: the previous slide's widget may
  hold the referent on screen. Measured across all sixteen shipped packs before landing:
  ONE finding, the reported instance, so it retroactively costs D1/D5/D7 nothing.
- **R13 (hints)** is the interesting one, because part of it already IS mechanical and
  the rest resists for a measurable reason. `hint_leaks_answer` in
  `item-bank/validate.ts` catches a hint containing the answer key, which is sound. The
  branch-on-the-answer leak looked mechanizable: sample a template many times, mask the
  numbers, and flag a hint whose SENTENCE changes with the params. Two things stopped
  it. Establishing zero false positives requires sampling every template in all four
  domains, and that sweep does not finish in a workable time here (a single domain's
  template self-validation already runs 30 to 40 seconds), so a rule of this shape could
  not sit in the gate even if it were sound. And it is not quite sound: a hint may
  legitimately interpolate a parameter that also appears in the prompt, so the masking
  has to decide which variation is innocent, which is where the false positives live.

### What R18 to R26 could and could not be made mechanical, and why

**R18 is the only new ERROR rule, and the reason is that it is a closed set rather than a
proxy.** It matches the literal node ids in `packages/skill-graph/src/skill_graph.json`
and nothing else, so the only string it can fire on is an internal identifier a learner
was shown, which is the defect by definition. Measured before landing: **zero findings
across all sixteen shipped D1/D2/D5/D7 packs**, by literal registry match and by the
looser `XX.N` shape alike, so it costs the packs that are not ours to rewrite nothing.
The registry lookup fails OPEN, like the caption rule, and prints a `note:` line when it
skips. A shape pattern would have been easier and would have brought a false-positive
mode along for free, as well as missing `FUN.10`, whose second digit defeats a trailing
word boundary.

**R19 and R20 are warnings because each has a real false-positive mode**, which is the
same standard that rejected R2's proxy:
- **R19 (comma asides)** SHORTLISTS. The shape it matches, a determiner-led verbless noun
  phrase between two commas, is the reliable half; the two calls it cannot make are
  whether the aside should become parentheses or be absorbed, and both are judgements
  about whether the reader needs it. Its blocklist of clause words is what keeps
  *"Multiply the base, then add the exponents"* out, and it is deliberately a blocklist
  rather than a part-of-speech tagger: Node built-ins only, and a wrong flag at warning
  tier still costs a reader's time.
- **R20 (variable, not letter)** fires on a Geometry slide that is honestly about the
  letters labelling a figure's corners. It also measured zero across the sixteen shipped
  packs, so it is a tripwire for new content rather than a cleanup of old.

**R21, R22 and R23 are review-only, and not for want of trying.** All three live in
widget TSX, which the pack validator does not parse, but that is the smaller obstacle.
The real one is that each is a judgement the shape cannot carry:
- **R21** has a usable tell ("a name slot holding a multi-word phrase built around a
  verb") but the tell is about MEANING: `result` is a term and *"what the symbol hands
  back"* is a gloss, and no pattern separates those from a legitimately multi-word term
  like *"perfect square"*.
- **R22** is the clearest no on the list. The property is COHERENCE ACROSS SIBLINGS
  against a question stated in a different string, and each label is individually
  well-formed. There is nothing local to match.
- **R23** would need a dictionary of the vocabulary that exists, which is the whole of
  mathematics, so any list is a list of the coinages we happen to have caught.

**R24, R25 and R26 are enforced by shared components and Chromium guards, which is
stronger than a validator rule and is the shape to prefer** (R17's lesson, applied
again). R24's `objective` is a required prop on five kinds, so `tsc` refuses a widget
built on one of them that forgets it, and `widgetTaskOrder.browser.test.tsx` asserts DOM
ORDER rather than presence, because presence is exactly what the overwritten status line
already had. R25
and R26 live in the kind, so adopting `BinaryRowSort` gets both. **Note the honest limit
on R25's reach**: the collapsing pattern has five copies which have already drifted, only
two of them collapse, and four of the five sat in another owner's lane when this was
measured, so the kind has one adopter today. *(The lane barrier is gone as of 2026-07-31 —
all content is Anthony's, `BinaryRowSort` included — so the reason those four stayed
unadopted no longer holds. Whether they adopt it is an authoring decision now rather than a
cross-lane one, and the count above is a measurement that has not been re-taken.)* The rule is written down here so the next adopter does not
re-derive it; it is not a claim that the codebase is uniform.

### What R27 to R33 could and could not be made mechanical, and why

**Not one of the seven added a validator rule, and the validator's tiers did not move: it
stands at eleven error rules and warnings A to F, and all four shipped domains report zero
errors and zero warnings, `--strict` included.** That is the outcome to want rather than a
gap, for two separate reasons.

**Five of the seven are enforced somewhere STRONGER than a text rule**, which is R17's
lesson applied a third time. R27's badge, R28's per-part verdict and resumable reveal, R29's
called-not-clean gate and R31's paint check all live in shared components with Chromium
guards over a population derived from the sources, so they hold for a widget nobody thought
about while writing them. R30 lives in `answerFormat.test.ts`, which grades every advertised
form through the real comparator, in `answerKeypad.test.ts`, which grades every advertised notation
against every item that would be offered it and reports every item whose own key uses
notation the field never names, in a fit test that measures every placeholder at the real
field width, and in `mathAnswerColumn.browser.test.tsx`, which is the only place the note and
the preview are shown to RENDER. A validator rule for any of these would be a weaker second opinion about
a property already asserted.

**Two are judgements, and the shapes that look mechanical are the ones that would fire on
good content.** R32's word list is the whole of mathematics minus what each pack has
already earned, so the check is "is this term earned HERE", which no list answers; a
ban-list of specific sentences is the mechanical half and already exists in
`scan-lesson-text.mjs`'s ledger, entry by entry, after each one is cut. R33 is the sharper
case and worth keeping as a worked example of the standard: the obvious rule ("do not tell
the learner what they should have done") was measured against R13 and fires on the hint
wording R13 endorses, which is content that has been praised rather than rejected. Scoping
it to a post-hoc set-level verdict makes it correct and also makes it unmatchable, because
"post-hoc" and "set-level" are facts about the widget's state machine and not about the
string. So R32 and R33 are review items, and a proposed regex for either should be measured
against a hint before it is proposed.

**Two guards worth knowing by name before you write a third**, because both catch a defect
whose whole nature is that reading cannot see it. `labelFigureWhole.browser.test.tsx`
asserts on rendered PAINT, since a `\phantom` leaves the digits in the DOM, the text content
and the MathML. `widgetRevealFill.browser.test.tsx` asserts on computed `::after` content,
since generated content is invisible to `value` and `textContent` and every one of its 17
tests passed with R27's badge in place.

**And read `.cursor/rules/qa-verification.mdc` before you write that third one.** The phrase
"over a population derived from the sources", used twice above, is the easy half to get right
and the wrong place to stop. That rule is always applied and owns how the population is
scoped: by every surface that exhibits the behaviour rather than by the layer where it
happens to be implemented, plus what a floor does and does not constrain, and how an
exception that some member legitimately needs is declared so that it cannot outlive its
reason. R28 is the case it is written from, so a guard for any of R27 to R33 is the kind of
guard most likely to repeat the mistake.

## Workflow

Copy this checklist and track it. Phases 1 to 6 iterate per node inside the
era; Phase 7 is the ERA-LEVEL gate that closes the whole era.

```
Era <name> author progress:
- [ ] Phase 0  Scope guard + prerequisites (era membership, directories, ownership)
- [ ] Phase 1  Plan the whole era (all nodes, one motif, archetypes, order)
- [ ] Phase 2  Mini-lesson JSON per node (every-slide-interactive)
- [ ] Phase 3  Interactive teaching widgets (reuse or build; QA mandates)
- [ ] Phase 4  CFU per node (themed, answer unchanged)
- [ ] Phase 5  Practice + infinite bank (interactive, prerequisite-infra note)
- [ ] Phase 6  Registration wiring (loader, registries, checkers) per DIRECTORY
- [ ] Phase 7  ERA-LEVEL QA / verification gate + per-node checklist
```

### Phase 0: Scope guard + prerequisites

1. **Take the scope from the data.** `getEraNodes(eraId)`
   (`packages/skill-graph/src/eras.ts`) is your node set; do not type one out. Then read
   `2026-07-27-era-progression-design.md` §6 for the building rules ("Which era am I
   authoring?" above covers both and flags what is missing).
2. **Write down the DIRECTORY MAP before anything else**, because nothing downstream
   derives it for you: map each node's `domain` from `skill_graph.json` and list the
   `content/lessons/<domain>/` and `packages/item-bank/src/<domain>/` directories your era
   touches. An era can touch four. Every per-directory obligation in Phase 6 and Phase 7
   is once per entry on that list.
3. **Ownership needs no per-node check any more: all content is Anthony's** (`docs/Content_Authoring_Split.md` §11, 2026-07-31). No era is jointly owned, so there is no half to name in the plan and no motif to agree with a second owner. What DID survive this step is the reason it existed — **the motif and the shared vocabulary still have to be settled before prose**, because a chapter can drift against itself; it is now one person's decision rather than a negotiation. If Gabe is authoring on capacity (the flex, §11.4), he is authoring under Anthony's ownership, so the bar and the motif are still Anthony's.
4. Then use `reference.md` §6 to find the register and hue of each domain your era touches,
   and whether its theming is SETTLED or still PROPOSED, and read the real row in the
   themes spec for everything you actually write: premise, per-node framings, motif. Never
   author from the index. If the theming is PROPOSED, confirm the WORLD with Evan (era
   premise, buildings, hue) before investing in prose, and note that **no era's buildings
   are named in any landed document**, so a building name is always a question for him
   rather than a lookup. An era spanning domains may pull two different registers and hues,
   which is a theming question for Evan and not yours to reconcile silently.
5. Note each node's `prereqs` and `lesson_shell`.
6. For each node, read `docs/Mastery_Scoring_Spec.md` (the 4-of-5 set rule, hints,
   reveals) and identify the checker category the node's answer forms need
   (`packages/item-bank/AUTHORING.md` §3 table). Only author an answer category the
   checker already clears.
7. If any node's practice/bank concept needs a NON-graph interactive answer, see
   the Phase 5 prerequisite before authoring those items.

### Phase 1: Plan the whole era

Produce a short plan before writing any JSON:
- All nodes in prerequisite order **across the whole era**, not grouped by directory (a
  later node's lesson may lean on an earlier node's skill; sequence the era so it reads as
  one chapter of the city's history rather than a pile of nodes). Two nodes from different
  domains can be adjacent, and the learner will meet them that way.
- One motif reused across every node (the themes spec's per-node framings). Since
  2026-07-31 that motif is **chosen** rather than agreed, because no era is jointly
  owned — but it is still settled before prose, and it is the owner's to settle even
  when someone else is authoring on capacity (§11.4 of the split doc).
- Per node: the mini-lesson slide outline (one idea per slide), the interaction
  archetype for each slide (aim for >= 3 distinct archetypes, at least one
  build/manipulate), the combining CFU, and the 5-slot practice shape.
- Cross-node consistency: shared vocabulary, advisor voice, and motif; no two
  nodes contradict the era's story. A term introduced in one domain's node and used in
  another's is the seam to check hardest, because no per-directory gate can see it.
- **The scenario budget (R2).** Write down, per node, the ONE scenario that opens
  slide 1 and what concrete problem it poses (R3). Then mark every later slide
  "no scenario" unless you can say in a sentence why a scenario there flows rather
  than intrudes. Planning this up front is what stops the every-slide vignette
  habit, which is much harder to unpick after the prose exists.
- **The vocabulary list (R6).** List every technical term the era will use and
  the slide that introduces each one. A term with no introducing slide is a bug in
  the plan, not something to patch later. **A term is earned or it is not used** (R32):
  mark each one as already-defined-upstream, defined-here, or avoided.
- **The interaction-kind budget (R11).** Tally the planned KINDS across the whole
  era against the twelve in R11 before you build anything. If the tally is
  mostly type-a-value and tap-one-of-N, redesign slides now: it is cheap here and
  expensive once the widgets exist.

### Phase 2: Mini-lesson JSON (per node)

Author `content/lessons/<domain>/<NODE>.json` to the `LessonContent` schema
(`reference.md` has the full shape). This phase is where R1 to R7 and R9 are won or
lost, so write the prose against them, not against a word count.

**Structure**
- One idea per `mini_lesson` paragraph. If a paragraph is teaching two things, it is
  two slides.
- **2-3 sentences per paragraph on a pack carrying `worked_examples` (R34)**, a fourth
  only where unavoidable; **6 to 7 on an unmigrated one (R1)**. Over that, split into
  another slide first; interposing an extra interactive element is the fallback. The
  validator errors at 5 on a migrated pack and at 8 otherwise.
- Pair EVERY paragraph index with at least one gating visual:
  `{ "after": <index>, "id": "<interactive-id>", "gates": true }`. `after` is the
  paragraph index the visual follows; a paragraph may hold more than one gating
  visual (all must complete before Next).

**How the prose has to teach**
- **Open by motivating, not defining (R3).** Slide 1 poses a concrete problem the
  learner can picture, asks the question it raises, and lets the mathematics arrive
  as the answer, with no seam. "This is where square roots come in..." is the hinge;
  a definition that arrives before the problem has nothing to attach to. See
  `examples.md`.
- **Keep the scenario on slide 1 (R2).** Later slides carry the mathematics. Bring
  the story back only where it genuinely bridges, e.g. "now, what if someone told
  you the town doubled in population, 4 different times?" straight into the content.
- **Earn every rule before you state it (R5).** Show the pattern, let the learner
  feel it force the conclusion, then name the rule as the short way to say what they
  just watched happen. Do not open a slide with the boxed rule and justify it after.
- **Introduce every term on first use (R6),** in bold, with the definition attached:
  "the number being multiplied is called the **base**". Check your Phase 1
  vocabulary list before you submit.
- **Write in full, plain sentences (R7).** "They have the same base, so we can add
  their exponents", not "Same base, so add". No ornament either.
- **Never narrate the lesson (R4).** No "the whole idea of this slide", no "follow
  along", no "as we will see". If a sentence is about the slide rather than about
  the mathematics, cut it.
- **No task statement in the prose (R9).** Do not end the paragraph with "Your turn:
  do X"; the widget states its own task. The paragraph ends when the teaching ends.
  (Shipped D1 and D5 packs violate this; they predate the rule. Do not copy them.)

**Mechanics**
- KaTeX math wrapped in `$...$` with JSON backslash escaping, per `lesson-katex`.
- No em-dashes; keep reading level low; math legible without the flavor.

### Phase 3: Interactive teaching widgets

For each slide's archetype: reuse a catalog widget when one truly fits, else BUILD
a new one (decision #2). Follow `interactive-visuals` for the component contract
and `svg` for the drawing. Every teaching widget must:
- Export `function <Name>({ onComplete }: { onComplete?: () => void })`, manage its
  own state, and call `onComplete?.()` exactly once when the learner reaches the
  correct final state (latch it).
- Make the learner PRODUCE the result (no premature auto-reveal); show an
  `aria-live` status; add `aria-valuetext` on any slider/stepper.
- Use theme tokens from `svgKit`; be keyboard-operable; render fine ungated on the
  review page (no `onComplete`). No `<select>`; no em-dashes.
- Use a DIFFERENT instance from the CFU's exact numbers.

**Own the task statement (R9 + R8).** The widget's status line states the task, once,
in the widget. The lesson prose does not restate it and the registry caption does not
restate it either (Phase 6). "It should be folded into the demo itself so that it is
clear what is being used." If a widget needs a caption to explain what it wants, the
fix is a better status line, not a caption.

**Reveals, so a stuck learner is never trapped (R12).** Every open-ended question in
a teaching widget offers `WidgetReveal` once the learner has actually attempted it.
The reveal teaches the step: `WidgetReveal` requires a `why` alongside the `answer`,
so an answer-only reveal will not compile. Inside a lesson this is free and carries
no penalty; a revealed practice slot is a different mechanism and still scores zero.
Do NOT build an "Explain this another way" affordance: it was proposed and rejected.
Calling convention and the full API: `reference.md` §2.1.

**Resets re-parameterize (R10).** Any "start over" / "try another" control hands the
learner the SAME question with DIFFERENT numbers, and clears the gate so the round
has to be completed again. Replaying the identical instance, or leaving `onComplete`
already latched after a reset, is a defect. Parameterize the round generator once and
have both the initial mount and the reset draw from it.

**Vary the KIND, not just the numbers (R11).** Before you copy an existing widget with
new values, check the era's running tally against the twelve kinds in R11. Two
widgets that both ask the learner to type a value into a box are one kind, whatever
the topic.

### Phase 4: CFU (per node)

One combining question that ties the node's slides together. Author to the
`LessonCfuSpec` shape:
- Use `check` (the shared form-independent checker) for value questions so
  equivalent forms pass; OMIT `check` and rely on the exact `accepted` list for
  form-sensitive questions (simplify, expand, lowest terms). See the cfuChecker
  rules in `reference.md`.
- Theme the prompt/hint in the era's world while keeping the quantities,
  `answer_key`, `accepted`, and representation/simplification IDENTICAL to the
  underlying math.
- Always provide `prompt`, non-empty `accepted`, and one `hint`.

**The check is one hint, then a reveal, then a DIFFERENT question.** A stuck learner
spends the advisor's single hint; a wrong attempt after that puts "Reveal answer" on
offer; taking it prints the answer, the reasoning and the worked solution, and then
re-asks another question of the same concept. Only a second reveal releases the lesson.
Two more required fields carry that, and `check:lessons` fails a pack missing either:

- **`worked_solution`**: ordered steps, one move per entry, KaTeX in `$...$`, ending on a
  step that NAMES the answer. Same component and same rules as the practice card's, so
  follow `.cursor/skills/practice-hints/SKILL.md`.
- **`variants`**: `{ template_id, count }`, where `count` includes the authored question.
  Name a pool template if one genuinely asks this question, and write a
  `CFU_ONLY_TEMPLATES` generator if none does; either way register a speller under the
  same `template_id` in `apps/web/src/lessons/cfuVariants.ts`. Judge the twin by the
  CONCEPT, not by the node: a template on the right node that omits the step the check is
  testing re-asks an easier question, which is the defect this field exists to fix.
  `reference.md` §5a has the full contract and the two assertions behind it.

**Every check reveals an SVG figure, on BOTH of its questions.** All 39 packs do today and
two guards hold it there, so a new pack owes one as well. Two more fields carry it:

- **`worked_solution_params`**: the authored question's reveal as an SVG figure instead of
  the step cards. Parameters for the registered visual, read off that visual's own
  destructured params. Only set it when the figure genuinely restates YOUR question: a
  diagram whose equation has a different shape, whose caption counts a different thing, or
  that performs a step your question does not permit teaches the wrong thing more
  convincingly than no diagram at all.
- **`worked_solution_template`**: OPTIONAL, and the answer when the re-ask's template would
  misstate the authored question. It names a different registered template for the authored
  figure alone; the re-ask is untouched. A sibling on the same node usually already draws the
  shape you need — LIN.1 takes `d3.lin1.both-sides.l2` for exactly that reason.

If the check draws from a `CFU_ONLY_TEMPLATES` generator, the registry holds no key for it and
BOTH questions fall through to the cards, so author the figure under the `cfu.` id per
`.cursor/skills/worked-solution-svg/SKILL.md`. A composite check's figure has to close on every
part of its answer, which `cfuFigureCoverage.test.tsx` reads back out of the render.
`reference.md` §5a has the four ways a borrowed figure lies and what each cost to fix.

### Phase 5: Practice set + infinite bank (interactive, decision #1)

Practice and infinite bank both draw from the node's item-bank practice pool
(`packages/item-bank/src/<domain>/...`), graded by the real checker.

**Interactive-practice-item infra (EXISTS: add a module, don't rebuild).** The
generalized infra is in place: `graph`, `number_line`, and `expr_builder` are
registered answer-type modules. To add a new NON-graph interactive answer type,
author a module under `packages/shared-components/src/interactive/modules/<type>/`
modeled on `number-line` (the reference module):
> A new `answer_type` = `comparator.ts` (a discriminated-union spec; `toWorkspace`
> strips every key value so the client holds an ANSWER-FREE workspace; a pure,
> deterministic, never-throws `compare`; a `validateSpec`) + an `InteractiveInput`
> widget (controlled, emits a structured payload, no self-grading, a11y) +
> `index.ts` assembling the `InteractiveAnswerModule` (`comparator_version =
> INTERACTIVE_CHECKER_VERSION`), then register it in `registry.ts` and add the type
> to the `AnswerType` union in `packages/shared-components/src/index.ts`.
Item-bank items reference it via `interactiveAnswer("<type>", spec)`; they grade at
`equivalence_checker_version = INTERACTIVE_CHECKER_VERSION` (2) through the interactive
or product checker, which dispatches the private `interactive_spec` to the module. If
no interactive answer type fits the concept, a text item stays typed-input against the
checker.

Author the practice pool (see `practice-templates`, `practice-hints`,
`worked-solution-svg`):
- Each practice template's `generate()` computes the key by real arithmetic
  (correct by construction), grader-safe keys, KaTeX prompts.
- 5-slot mix per node: 1xL1 / 2xL2 / 2xL3 (`PRACTICE_SET_SIZE` = 5). Reshuffled
  every attempt; the dedup set never re-serves the five just shown (the D1 session
  seeds `shownIds` with the opening five and each retry avoids them).
- 1 to 3 progressive hints (never leak the answer) + an ordered `worked_solution`
  steps array + a `WORKED_SOLUTION_VISUALS[template_id]` SVG driven by the same
  params.
- Add a `template_id`-keyed cross-skill NPC note only for a shape that genuinely
  needs another same-domain non-prereq node's skill (`practiceNotes.ts`).
- Infinite bank draws random items from THIS node across difficulties and grades
  with the same checker; no new authoring beyond the pool.

### Phase 6: Registration wiring

**Once per DIRECTORY on your Phase 0 map, not once per era.** The registry is domain-keyed
and there is no era entry to add anywhere; an era touching three domain directories needs
all three wired, and the one you did not notice is the one that ships unreachable.

Wire each domain in (table + details in `reference.md`):
- Per-domain loader module `apps/web/src/lessons/<domain>.ts` (mirror `d1.ts`:
  `import.meta.glob` over `content/lessons/<domain>/*.json` + a `NODE_ORDER` from
  the domain's `skill_graph` nodes).
- `apps/web/src/lessons/domains.ts`: add the domain's `LESSON_DOMAINS` entry (`id` =
  the `content/lessons/<id>/` folder name, a short `label`, the loader's `lessons` and
  `lessonByNode`, the item bank's `<D#>_PRACTICE_NODES`, and its practice source). This
  ONE entry is what makes the city lesson host, the `?dev` lesson list, the CFU checker,
  and `LessonPractice`'s default source all see the domain. Never add a per-domain host
  or a per-domain practice branch: those surfaces read the registry and must stay
  domain-agnostic. A loader with no registry entry is dead code, which is exactly how D2
  shipped fully authored and unreachable.
- `apps/web/src/lessons/visuals.tsx`: add each new widget import, its
  `LessonVisualId` union member, and its `REGISTRY` entry (the caption is Markdown,
  so its math goes in `$...$`). **The caption is optional, and the default is to
  omit it (R8).** A caption that restates the widget's own prompt puts two
  instructions on screen for one job; that single structural habit produced the
  duplicated-instruction finding in all 21 D2 widgets. Write a caption only when it
  says something the widget does not say for itself. The validator errors when a
  caption and its slide's task sentence overlap past 70% of their content words.
- `apps/web/src/lessons/workedSolutionVisuals.tsx`: register each practice
  template's params-driven worked-solution SVG.
- `apps/web/src/lessons/practiceNotes.ts`: cross-skill notes (only where earned).
- cfuChecker / practiceChecker: the CFU and practice item versions flow through
  the shared checker; confirm the domain's item versions register.

### Phase 7: ERA-LEVEL QA / verification gate

Do NOT finish until the whole era passes:
1. **All nodes present:** every id in `getEraNodes(eraId)` has a lesson pack in ITS OWN
   domain's directory, and every loader whose `NODE_ORDER` should list one does. Diff
   against the era membership, not against a directory listing: a directory can be
   complete while your era is not, and vice versa.
2. **Coherent theming:** one motif, consistent advisor voice, shared vocabulary
   across all nodes of the era; math legible without the flavor. This is the check the
   era unit exists for and the one no gate can run: read the chapter end to end in
   prerequisite order, crossing directories where the order crosses them.
3. **Prereq order:** the era reads in a sensible prerequisite order.
4. **Cross-node consistency:** no contradictions; no widget id reused across a
   single lesson except intentional pairs.
5. **Run the validator IN STRICT MODE, once per DIRECTORY your era touches:**
   `node .cursor/skills/author/scripts/validate-lesson-pack.mjs --strict content/lessons/<domain>`
   and fix every finding, warnings included. Errors always fail; warnings fail only
   under `--strict`. **New content has no excuse: it ships with zero errors and zero
   warnings**, and as of #201 the four shipped domains are at zero too, so there is no
   inherited noise left to hide a new finding in. Run the whole DIRECTORY, never
   individual files: the domain-level variety rules only run on a single-directory
   invocation. Note what the run does and does not tell you about your era: its variety
   figures are the DIRECTORY's, pooled over nodes from other eras, so a green run is not
   the R11 tally, which you take across your era by hand.
6. **REACHABILITY GATE (authored is not shipped):** an era is not done until a learner
   can get to every node of it. Confirm all four wiring points **for each directory on
   the Phase 0 map**, then prove them with the suite:
   - `LESSON_DOMAINS` (`apps/web/src/lessons/domains.ts`) has that domain's entry.
   - The city lesson host opens each node's lesson (its lookup reads that registry).
   - `practiceSourceForNode(<node>)` returns THAT domain's source, so the practice set
     and the infinite bank draw from its pool instead of throwing.
   - `cfuChecker` and the `?dev` lesson list cover the domain (both read the registry;
     open every node of your era from `?dev` once by hand).
   Then `npx vitest run --project web-reachability` must be GREEN. It fails when a
   `content/lessons/<id>/` folder has no registry entry, when a lesson resolves another
   domain's practice source, or when any lesson cannot build a gradable five-slot set.
   While that suite is red the content is dead code: do NOT report the era complete,
   do NOT tick Phase 7, and do NOT move to the next era.
7. **Run repo checks:** `npm run check` (and the item-bank suites,
   `npx vitest run packages/item-bank/src`) green; snapshots only re-pinned as an
   explicit, deliberate version event.

Then run the per-node checklist for EACH node:

```
Node <NODE> checklist:
- [ ] Every slide: section 1 lecture is conceptual (2-3 sentences, a 4th only where unavoidable and named in review); section 2 present or explicitly skipped; section 3 has >= 1 gating visual (after === index)
- [ ] Every authored section 2 names its instance: a `prompt` of at most 2 sentences saying WHICH instance the steps work, not a restatement of the slide and not the result
- [ ] Section 3 widget does not duplicate section 2's worked example verbatim (when section 2 is authored)
- [ ] >= 3 distinct interaction archetypes; no unintentional widget-id reuse
- [ ] >= 1 build/manipulate archetype (not only tap-to-reveal)
- [ ] Learner PRODUCES the result before onComplete; aria-live + aria-valuetext
- [ ] R10 every reset re-parameterizes AND re-gates (new numbers, gate cleared)
- [ ] R12 every open-ended step offers WidgetReveal, with a `why` that teaches it
- [ ] R9/R8 task stated ONCE, in the widget: not in the prose, not in the caption
- [ ] R24 that task is the widget's FIRST child, above the controls, and asks for the
      same KIND of thing the controls offer
- [ ] R21 every label slot holds a term, not a verb phrase glossing one
- [ ] R22 every sibling option label answers the question the prompt poses
- [ ] R25 no binary row collapses on a miss; both options stay, disabled and marked
- [ ] R26 correctness colours report only on the learner's pick; every state also
      carries a glyph or a name; slot binding uses weight or position, never hue, and
      every non-hue carrier is absolute rather than "heavier than the one beside it"
- [ ] R27 a reveal-filled blank carries no word saying it was given
- [ ] R28 every independently-correct answer has its own verdict, and a reveal on one of
      them hands the instance back instead of spending the board
- [ ] R29 the gate opens when every part has been CALLED; a recorded miss stays visible
      and does not hold a finished board shut
- [ ] R30 every answer field's placeholder matches the shape of the KEYS served behind
      it, advertises nothing the grader rejects, and answers no served item; every answer
      carrying `/`, `^`, `sqrt(`, `abs(` or a `*` its grader cannot read without also
      reaches a notation tag, so the field earns the notation note and the preview instead of
      a bare "Your answer" (run the sweep over its seven pools, 1,120 items and 31 packs)
- [ ] R31 nothing hidden for layout leaves a well-formed false statement on screen;
      checked by running the paint guard, never by grepping
- [ ] CFU present: prompt + non-empty accepted + hint; answer unchanged by theme
- [ ] CFU reveal complete: `worked_solution` steps whose last one names the answer, and a
      `variants` block whose template genuinely re-asks the same CONCEPT, with a speller
      reproducing the whole authored `accepted` list
- [ ] CFU figure on BOTH questions: `worked_solution_params` for the authored one (plus
      `worked_solution_template` if the re-ask's template would misstate it, or a new `cfu.`
      registry entry if it draws from a CFU-only generator), with the pack added to a
      population list in `cfuAuthoredFigure.test.tsx`
- [ ] Practice 5-slot 1xL1/2xL2/2xL3; reshuffle; no re-serve; 1-3 hints + worked_solution
- [ ] Hard cases covered (sign flips, precedence, reduced form, excluded values)
- [ ] No em-dashes; no <select>; one coherent motif; MyOpenMath policy honored
- [ ] Reachable: opens from ?dev, practice builds, web-reachability suite green
```

### The review checklist (the rules no validator can catch)

`--strict` green is necessary and not sufficient. Read the era's prose end to end
against this list before you call it done, and expect a human reviewer to do the same.
This is the list the D2 review actually failed on.

```
Era <name> teaching review:
- [ ] R2 every scenario sits on slide 1. Every later-slide scenario can be defended
      in one sentence as a bridge that flows, not a vignette added out of habit
- [ ] R3 every node's slide 1 poses a concrete problem FIRST and lets the term arrive
      as its answer. No lesson opens by defining a word
- [ ] R5 no rule is asserted before the learner could have arrived at it. Read each
      boxed rule and ask: did the preceding sentences force this, or announce it?
- [ ] R6 every technical term is introduced, in bold, before it is used. Diff the
      finished prose against the Phase 1 vocabulary list
- [ ] R7 read three paragraphs aloud. Nothing telegraphic, nothing ornamental,
      nothing that assumes retained knowledge the diagnostic did not test
- [ ] R11 tally the ERA's widgets against the twelve interaction kinds in R11, across
      every directory it touches. If two kinds cover most of them, it is not varied
      enough yet, whatever the per-directory validator run said
- [ ] R1 spot-check the longest three paragraphs: does each still teach ONE idea?
      (The validator counts sentences; it cannot count ideas)
- [ ] R19 for every aside the validator shortlisted, decide: parentheses, or absorbed
      into the sentence because the reader needs it to follow the next line
- [ ] R21 read every label slot in every labelling widget. A multi-word phrase built
      around a verb is a paraphrase of a term, not the term
- [ ] R22 for every set of sibling options, write down the question the prompt poses,
      then read each label against it. Individually accurate labels can be an
      incoherent set, and that is the defect
- [ ] R23 every technical word the era uses exists outside this repo. A coinage the
      learner cannot look up is untransferable however well it fits
- [ ] R32 every real term the era uses is earned where it is used: defined upstream,
      defined here, or avoided. Read the Phase 1 vocabulary list against the prose
- [ ] R33 read every sentence a learner meets after a miss. None opens with what it
      cost, and none instructs them on what they should have done instead
```

## Anti-patterns (reject on sight)

- A text-only or static-image-only teaching slide (every slide must be gated
  interactive).
- A `<select>` dropdown, or an MCQ disguised as a dropdown, anywhere. "Just
  disguising multiple-choice questions via a drop-down is not true interaction."
- An em-dash (U+2014) in any learner-facing string or in the pack/skill files.
- A widget that auto-reveals the answer before the learner produces it.
- One hard-coded instance instead of parameterized rounds.
- A "start over" that replays the same numbers, or that leaves the gate satisfied
  (R10).
- An open-ended widget step with no reveal, or a reveal that prints the answer with
  no reasoning (R12). An "Explain this another way" button: rejected, do not build it.
- Reusing the same widget id twice in one lesson without a pedagogical reason.
- Only tap-to-reveal widgets (no genuine build/manipulate archetype).
- An era whose widgets are mostly one or two interaction kinds, however varied the
  numbers (R11).
- A `mini_lesson` paragraph past 2 to 3 sentences on a pack carrying `worked_examples`
  (R34), past 6 to 7 on one that does not (R1), or one that teaches two ideas. Split the
  slide, or move the arithmetic into section 2.
- A scenario opening a slide other than the first, added because every slide "should
  have" one (R2).
- An opening that defines the term before posing the problem (R3).
- Any sentence about the slide rather than about the mathematics: "the whole idea of
  this slide", "follow along", "do not stop early", "as we will see" (R4).
- A rule asserted before the learner could have derived it, or a procedure given as
  a black box: "a negative exponent means one over that power", "find the largest
  perfect square" (R5).
- A technical term used before it is defined. **base** was the one that got us (R6).
- Telegraphese: "Same base, so add" (R7). Write the sentence.
- The same instruction in two places: prose and widget, or widget and caption (R8).
- A "Your turn: ..." task statement sitting in the lesson prose ahead of a demo (R9).
- An internal node id in anything a learner reads: "Back in RAD.1 you..." (R18).
- A parenthetical aside fenced with commas where the sentence already has commas doing
  list work: ", a fraction rather than a whole number," (R19).
- "Letter" for the symbol standing for an unknown. It is a **variable** (R20).
- A label slot holding a verb phrase instead of the term: "what the symbol hands back"
  where the answer is **result** (R21).
- A set of sibling option labels where one answers a different question from the rest:
  "combines with nothing" beside two bins named by their radicand (R22).
- A coined word for a real thing, so the learner cannot look it up or use it. "Crook"
  was the one that got us (R23).
- A widget whose task sentence arrives after the controls, or lives in the `aria-live`
  status line the first wrong move overwrites (R24).
- A binary row that replaces both options with a text verdict once answered, throwing
  away the comparison that was the teaching (R25).
- Green or red on anything but the learner's own pick; any state carried by colour
  alone; hue spent on binding a label to a slot (R26). A live-slot mark that is only
  heavier than its neighbour, so it inverts the day the neighbour changes colour (R26).
- A word beside a reveal-filled blank saying it was given, on top of the amber and the
  dashing that already say so (R27).
- One verdict, one check button or one reveal covering several independently-correct
  answers, so a learner who got one right is told "not quite" for the set (R28).
- A gate that stays shut on a finished board because one part was missed on the way
  (R29). Nothing in the tree is terminal; the defect is `complete && !missed`.
- A placeholder derived from a type label rather than from the served keys, or one
  advertising a form the grader refuses, or one that answers a served item (R30). Same
  rule for the KEY ROW and the preview that come with it: an answer carrying a bar, a
  caret or a non-droppable star over a bare field has lost all three at once, and a key
  that types notation its own grader refuses is worse than no key.
- A `\phantom` (or any hiding trick) that leaves a well-formed FALSE statement on
  screen: a bare fraction bar in a superscript, an indexless radical claiming an index,
  a radicand drawn outside its own root sign (R31). Grepping cannot see it.
- A real technical term used undefined because it sounded standard: "parity" once in a
  whole era, "real number" in the casual sense next to two technical ones (R32).
- Copy after a miss that opens on what it cost, or coaches the learner about the attempt
  that is already over (R33).
- A loader module with no importers, or any authored pack no surface can reach.
  One `LESSON_DOMAINS` entry, never a parallel per-domain host or practice branch.
- Re-wording an ALREADY-FROZEN assessment item (silent re-freeze). Theme at
  template authoring time instead.
- Copying a MyOpenMath (or any source) prompt verbatim.
- Changing quantities, `answer_key`, `accepted`, or representation to fit the theme.

## MyOpenMath policy

MyOpenMath content is CC BY. You may take INSPIRATION (problem shapes, contexts)
but must NEVER copy a prompt verbatim: reword every prompt in the era's voice
and compute the key via `generate()`. Keep attribution norms in mind (CC BY);
originality is the default.

## Reference skills (cite, do not depend on)

This skill is self-contained. When authoring a specific piece, read the matching
sibling skill: `lesson-katex` (math strings), `interactive-visuals` (widget
contract + gating, and the implementation side of R24 to R26), `svg`
(drawing/alignment), `practice-templates` (item-bank template pipeline),
`practice-hints` (hints + worked_solution steps), `worked-solution-svg`
(params-driven reveal SVG). None of them, and not `lesson-planner`, is a
prerequisite: they are deep-dives you pull in as needed.

### Where a rule about hints lives, and why it is not here twice

**R13 states the bar; `practice-hints` is the how-to.** Both talk about hints, and the
temptation is to read that as two sources of truth for one rule. It is not: R13 rules on
what a hint may SAY (name the rule, point at the part it governs, stop), and
`practice-hints` covers the item-bank mechanics of getting one written (the 1-to-3 count
and `hint_count_mismatch`, param-freedom, keeping every hint true for every draw, the
`worked_solution` steps array). The one line they share is *never leak the answer*, and
both point at the same `hint_leaks_answer` check rather than restating it, so there is
nothing to drift. **When you are writing a practice template's hints, open
`practice-hints` and read R13 for the bar it is written against.**

### The debt this section used to record is PAID

This section previously listed R13 to R16 review-pass wording as "owed to `lesson-qa`
once PR #130 lands", because that skill did not yet exist. **#130 merged 2026-07-27
(`d958e5a`), so the debt was payable and has been paid**: the four review-pass halves now
live in `lesson-qa`'s review pass, and the authoring rules stayed here, per that
section's own instruction. Nothing is duplicated. If you are looking for how a REVIEWER
checks R13 to R16, that is `lesson-qa`; if you are looking for what the rule requires
while you write, it is above.
