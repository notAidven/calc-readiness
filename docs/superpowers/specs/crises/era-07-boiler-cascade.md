# The Boiler Cascade: design and asset brief

**Era:** 7, Industrial
**Date:** 2026-07-30
**Status:** brief, written before implementation. Nothing here is built.
**Measured at:** `origin/integration` `952a0983`.
**Audience:** a designer or modeller who will not read the code.
**Scope:** era seven's mid-era crisis, as it would render on the 3D island.

**This brief specifies presentation.** Mechanics are ruled in
`docs/superpowers/specs/2026-07-29-mid-era-crisis-design.md`. Section 12 flags what cannot be
rendered; section 13 asks rather than invents.

**One finding is reported rather than settled**, in section 7.1: the preview invariant and the
ordering axis pull against each other, and the resolution this brief draws is a design decision that
belongs to the lead.

---

## 0. The hard boundary

**Read `./README.md` first.** The three that bite on era seven:

1. **Nothing tints a building at runtime.** A failed machine cannot be drawn by cooling its colour.
   **The state carrier for this whole crisis is steam**, per section 3.3, and it works precisely
   because it needs no tint.
2. **No local light, no bloom, no post-processing.** A firebox glow, a shower of sparks, a red-hot
   pipe: all unbuildable as light. Section 12 lists them.
3. **No image textures.** No soot, no rust, no scorch. Era seven's dirt is in its material colours
   and its geometry, which is how the era's buildings are already authored.

## 0b. What is available

Procedural geometry; silhouette; flat colour per mesh and per-vertex colour; flat shading; emissive
as a bright face up to about 1.35; **`useFrame` animation gated on `prefers-reduced-motion`, which
this crisis leans on more than any other in the folder**; several hundred small meshes; the shared
ground-decal ladder; and the nine lighting numbers plus sky and fog.

---

## 1. The crisis, and what the player does

**The premise, in one line.** A boiler has failed and everything it feeds has stopped, and repairing
the wrong thing first wrecks it.

**The ritual: I diagnose and repair in order.** Era seven is the only crisis of the ten that asks an
**ordering** question, and the crisis spec spent the Industrial era on it deliberately: this is the
first era in the run with a **machine network**, a thing with upstream and downstream, so it is the
only era that can host the puzzle at all.

**The cadence: inspect freely, then answer to execute.** This is the crisis's most distinctive
property and it shapes the whole surface. **Era one makes you commit before you see the batch. Era
seven lets you examine the entire network first, for as long as you like, at no cost.** Those are
different games regardless of what the question is, and section 5 is built around it.

**Duration: solve it.** The network is restored when **no node is left in the failed state**. It also
ends when the **repair budget** is spent, and then it ends **unsolved with the damage standing**.

**The stake: a repair attempted downstream of a live fault burns out.** Not "produces little
benefit". **The action is spent and the node is damaged**, so that part of the network now needs two
repairs where it needed one. That difference is the whole ruling: a wasted action makes the wrong
order *inefficient*, and a compounding one makes it *wrong*.

**Entry.** After `ceil(n / 2)` of era seven's six nodes (`FUN.1`, `FUN.2`, `FUN.3`, `FUN.7`,
`FUN.8`, `POL.5`), which is **three**.

### 1.1 Era seven against era six, and the layer they share

The crisis spec put the Plague onto a link layer the Cascade also wants, so the two are **closer in
machinery and further apart in semantics** than any other pair. The danger is specific: **era six's
edges are a hazard the player wants to cut, and era seven's are a supply line the player wants
intact.** An identical visual language would invite a player to sever era seven's network.

**The answer, and era six's brief carries the same sentence:**

> **Era six's links are IN the floor. Era seven's are ON it.**
>
> Era six inlays a band in the paving, flat and walkable. **Era seven runs a steam main on low
> sleepers, raised, lagged, with cast arrow plates along it.** One is a path people take. The other
> is a thing that feeds something, and you would not step on it.

**Era seven's edges are read, never touched.** Its verb is repair and repair is aimed at a node. **So
era seven needs no edge hit-testing and no edge selection**, which is era six's alone. If era seven
builds the layer first it has no reason to make an edge clickable, and era six then has to retrofit
interaction into a render-only layer. **Build it selectable and directional whoever goes first.**

### 1.2 The directed half, which only era seven has

Era six's graph is undirected. **Era seven's is directed, and that direction is the entire axis**:
upstream feeds downstream, and fixing downstream of an unfixed upstream fixes nothing and wrecks the
thing you fixed.

**The direction marker is a cast arrow plate bolted to the pipe at regular intervals**, and it is era
seven's signature move applied to the crisis: **the standard part, repeated without limit.** The same
plate, forty times, along every run. A Renaissance elevation is a composition and has a middle; a
mill elevation is a rhythm and stops where the site does, and so does a steam main.

---

## 2. The atmosphere direction

**The requirement:** from a still frame with no UI, a player can tell the works have stopped.

**Era seven has the best inversion of the nine and it is free.** Every other crisis adds something to
the island: snow, smoke, raiders, ash. **Era seven's crisis takes something away.** A working
Industrial town is full of plumes, and a cascade failure means they go out. **A clean sky over era
seven is the wrongest thing that can happen to it.**

**The constraint:** era seven's floor in the ground ladder is setts and engineering brick laid to a
strict module, **iron rails let into the paving with turntables at the junctions**, cambered and
channelled, dark, with clinker and an ash tip. **None of that changes.**

### 2.1 The light

**The direction: the smoke has gone and the light is wrong for it.** Cold, clear and hard, which for
this era reads as abnormal.

| Lever | Era seven's day preset today | Cascade direction |
| --- | --- | --- |
| Key colour | `#FFF6E6` warm | **Cold and clean.** Era seven's warmth comes from its own combustion and there is none |
| Key intensity | 1.32 | **Up.** With the smoke gone, more light reaches the ground than this town has ever had, and it looks wrong |
| Key angle | Low and raking | **Low, and hard.** Long shadows off a mill elevation are the era's own best image |
| Hemisphere sky | `#CFE6F6` | Colder and cleaner |
| Hemisphere ground | `#C08F57` warm earth | **Cold dark.** The bounce off wet setts and clinker is neither warm nor bright |
| Hemisphere intensity | 0.95 | Down. Contrast is the point |
| Ambient | `#F5EFE2` at 0.30 | Down and cold |
| Rim | `#BFDCEF` at 0.48 | **Up.** Silhouette against a clear sky is what makes a dead chimney read as dead |
| Background (sky) | `#BFE1F2` clear blue | **A hard clean blue-grey.** For any other era this would be a nice day. Here it means nothing is burning |
| Fog colour | `#D6ECF7` | Clean and cool |
| Fog near and far | `radius x 3` to `radius x 20` | **Push both out.** Era seven's normal state should have haze; the crisis takes it away, and the far shore becoming visible is the tell |

**The read to check against: the town looks better and that is what is wrong with it.**

### 2.2 Ground

**Era seven's ground is already the most detailed of the ten and the crisis adds almost nothing to
it.** Two courses on the shared decal ladder:

- **Cold clinker**, where the ash tip has stopped being added to. A treatment on existing geometry.
- **Water lying in the channels.** The cambered setts are channelled for drainage; with the works
  stopped and nothing running warm, water stands. **A thin course in the channels, flat and dark**,
  which is one of the cheapest ways to say "nobody has been through here".

**The rails stay exactly as they are.** Era seven's iron rails let into the paving are the era's
single most identifying ground feature and **they are not the crisis's network.** Section 3.2 keeps
the steam mains and the rails visually apart on purpose.

**The reach question.** Under #298 era
seven's buildable radius is **55**, past the drawn grass at 30 and still inside the lagoon at 58.
Its 608 cells cover far more area than the drawn island has. **Both ground courses must clip to the
drawn island.**

### 2.3 Vegetation

**Era seven has almost none and the crisis leaves what there is alone.** This is the era whose
island is subordinated to moving goods, and a plant is not part of the story.

### 2.4 Water and shoreline

**One change and it is worth having:** era seven's works discharge into the water, and with the works
stopped **the discharge has stopped**. If the island draws a warm outfall plume or a stained band at
the shore in its normal state, **it goes**, and the water at that point reads the same as the water
everywhere else. **The absence of an industrial mark is the industrial crisis.**

Nothing else changes. There is no environment map, so the water is faceted with per-vertex colour and
it will not reflect the dead chimneys.

### 2.5 Signs of habitation at the margins

**A works that stopped between one motion and the next**, all from era seven's kit:

- **Every chimney is cold.** This is section 2.6's item and it is the loudest thing in the scene.
- **The steam crane stands on its rails with its jib loaded**, boiler cold. The kit has it.
- **Coal in a squared heap with the shovel still standing in it.** Nobody came to move it.
- **The printed ledger lying open on the counter**, and **the enamel plate by every door**, which is
  the era's own identifier and the thing the crisis's UI reuses (section 3.4).
- **The gas lamps are the one thing still working**, because they are not on the steam main. Era
  seven's kit is explicit that they are lit by flame and that **nothing glows without a flame in
  it**. **A town where the only working thing is the lamps is a precise industrial image** and it
  costs nothing.

### 2.6 Does anything move, and here it carries state

**Era seven is the one crisis in this folder where motion is a state carrier**, and the constraint
that every state must be readable in a single static frame is met by posing it.

- **Steam.** A live steam main **wisps at its bleed valves**; a dead one does not. A working machine
  **plumes at its stack**; a failed one does not. **This is the whole network state, drawn in the
  world, with no colour and no tint.** Section 3.3 works it through.
- **Under `prefers-reduced-motion` every wisp and plume holds a posed still**, which is a shape and
  is exactly as legible as the animated version. **The animation is polish; the shape is the state.**
- **Nothing else moves.** No workers, no carts, no wheels turning.
- **Nothing that moves may advance the encounter.**

### 2.7 The transition, in and out

**In:** the lighting numbers, the clean sky, the fog pushed out, the plumes going out one by one from
the failed boiler outward along the network. **That propagation is the entry animation and it is the
best one available to any crisis in this folder**, because it teaches the topology in the moment it
arrives.

**What never changes:** the buildings, the setts, the rails, the island's geometry, the shoreline.

**Out:** the plumes come back, in dependency order, from the source outward. **Same animation,
reversed**, and it is the clearest possible statement that the network is whole again.

**If the crisis ends unsolved**, the plumes come back only as far as the repaired part reaches, and
the rest of the town stays cold. **That is a permanent, legible, honest record of an unsolved
ending**, and it is worth more than any panel.

### 2.8 The read, in one sentence

*The same working town under a clean cold sky with every chimney out, water standing in the
channels, the coal heap untouched, and the gas lamps the only thing still lit.*

---

## 3. The hazard

### 3.1 The four questions the board must answer

1. **What has failed?**
2. **What feeds what?** The directed graph, visible at all times.
3. **Which runs are live and which are dead?** This is the ordering information and **it is the
   crisis**.
4. **How much repair is left?** The budget.

### 3.2 The network, drawn

**A steam main on low sleepers**, running from the boiler house to each machine it feeds, raised
clear of the setts, lagged, with **cast arrow plates bolted along it at regular intervals**.

| Element | Geometry | Why |
| --- | --- | --- |
| **The run** | A lagged pipe on sleepers, raised about half a unit off the setts | **On the floor, not in it**, which is what separates it from era six's inlaid links |
| **The direction** | **A cast arrow plate every few units**, identical, repeated | Era seven's signature move: the standard part without limit. It also means direction is readable from any part of a run rather than only at its ends |
| **A junction** | A **manifold block** where runs split | Era seven's kit has iron in the street; a manifold is that vocabulary |
| **The source** | The **boiler house**, with the largest stack | The one node with no upstream |

**The rails are not the network and must not be confused with it.** Era seven's rails are flush,
let into the setts, with turntables at their junctions. **The steam mains are raised, on sleepers,
with manifolds at theirs.** Flush against raised, turntable against manifold: two networks, one
island, no ambiguity.

### 3.3 Steam is the state carrier, and it is the best idea in this brief

**A live run wisps. A dead run does not.**

| State | What is drawn | Channels |
| --- | --- | --- |
| **Run live** | **A small steam wisp at each bleed valve** along its length, at intervals | Wisp geometry (posed under reduced motion), and the valve itself is standing geometry |
| **Run dead** | No wisps. **The bleed valves hang open**, which is a small geometry change at each one | Absence of wisp, plus open valve geometry |
| **Machine working** | **A plume at its stack**, and its enamel plate square in its bracket | Plume, plate |
| **Machine failed** | **No plume**, its **access panel swung open**, and its **relief lever standing up** | Absence of plume, panel silhouette, lever silhouette |
| **Machine burned out** | No plume, **a buckled casing panel and a lifted floor plate** | Silhouette damage, distinct from a failed machine's open panel |

**Why this is worth the effort.** The player's real question is *"is this node downstream of a live
fault?"*, and that question is answered by looking at whether the run into it is wisping. **The
information is in the world rather than in a legend**, it needs no colour, it survives full zoom-out
because plumes are tall, and it is era-correct: a steam system genuinely tells you it is live by
leaking.

**Failed against burned out must be separately readable**, because one costs one repair and the
other costs two. An open access panel is a machine somebody can work on; a buckled casing is a
machine somebody has already made worse.

### 3.4 The enamel plate, which the UI reuses

Era seven's kit carries **an enamel plate, white on dark, screwed to brickwork and carrying a number
rather than a name**, and notes that this is the first era where the identifier is **issued** rather
than made: the same plate on forty buildings, differing only in the number.

**The crisis takes that wholesale.** Every node in the network carries its plate, the rail lists
nodes by plate number, and the read-out panel names them the same way. **A player learns to read the
town by its plates**, which is exactly what the era's own fiction says the town does.

---

## 4. The player's own mark

**The repair.** Era seven's player has one verb and it is aimed at a node.

### 4.1 What a repair looks like

- **A working platform goes up against the machine**, using era seven's pole-scaffold and hoist
  vocabulary, with a **chain block hanging from the gantry**.
- **The access panel closes** and **the relief lever drops**.
- **A new enamel plate goes on**, square in its bracket. The era issues plates; a repaired machine
  gets a fresh one, and it is a small permanent record of what the player did.
- **Then the plume comes back**, but **only if the run into it is live**. That last clause is the
  crisis.

### 4.2 The burn-out, which needs to be unmistakable

A repair attempted downstream of a live fault burns out. **The board must show that the action
happened and made things worse**, in one legible beat:

- The scaffold goes up, the panel closes, **and no plume comes back**.
- **The casing buckles** and **a floor plate lifts**, which is the burned-out geometry from 3.3.
- **A short vent of steam from the wrong place**, once, on the player's own advance rather than on a
  timer.

**Under `prefers-reduced-motion` this is a single posed frame**: scaffold present, casing buckled, no
plume.

### 4.3 The budget

**The repair budget is earned from accuracy and it is finite.** Era seven's own tally descendant is
the **printed ledger, ruled in columns, bound, and lying open on a desk**, and that is the budget's
display: **ruled columns with entries in them.**

**Accuracy sizes how much repairing can be done, never whether repairing happens** (INV-CRISIS-4).

| Rung | What the ledger records |
| --- | --- |
| **1 right** | One repair entered |
| **2 right** | Two entered |
| **3 right** | Three entered |

**A burned-out node adds a repair to the work outstanding while the budget stays fixed**, which is
how the ruling makes order load-bearing. **The ledger must show both numbers**: repairs available,
and repairs outstanding. A player who cannot see those two numbers side by side cannot feel the
squeeze the whole mechanism exists to create.

### 4.4 The beat

**Repairs execute immediately.** Era seven is not era six: there is no batching and no cycle. The
player answers to execute, the work happens, and the network state updates. **The inspection phase
is where the time goes, and it costs nothing.**

---

## 5. The crisis surface

**Era seven's surface has an inspect mode that costs nothing, and that is the cadence made into a
layout.**

### 5.1 The two modes

| Mode | What the player is doing | What the rail shows |
| --- | --- | --- |
| **Inspecting** | Reading the network. **Free, unlimited, and reversible** | The works ledger: every node, its feed, its state. Selecting a node highlights its upstream chain on the board. **No commit control at all** |
| **Executing** | Choosing a node to repair, then answering | The repair card for the chosen node, the read-out panel, the commit control |

**The player moves between them freely until they commit.** Nothing is spent by looking, and the
surface should feel like it: no counters move, no warnings appear, nothing is disabled.

### 5.2 At 920

Two columns. **Island left, rail right at `min(430px, 42vw)`.**

Rail order:

1. **Header**: the crisis name, and the ledger's two numbers, **repairs available** and **repairs
   outstanding**.
2. **The works ledger**, which is the largest element in inspect mode. One row per node: **plate
   number**, name, state, and what feeds it.
3. **The repair card**, when a node is chosen.
4. **The read-out panel.**
5. **The commit control.**

### 5.3 At 460

Single column, **board first**. The board crops to the failed set and the runs into it.

**The works ledger collapses to a filtered list** showing failed and burned-out nodes only, with a
control to show the whole network. **A twelve-row table at 428 units is unreadable**, and the
filtered list is the one a player acts from anyway.

**The two ledger numbers never collapse.**

### 5.4 The hierarchy

**The board is the subject and the plumes are the read.** The ledger is a second view of the same
facts, for a player who wants to be certain, and for a screen reader, for whom it is the only view.

---

## 6. The option cards

**Era seven has one verb**, so what varies between cards is the **node**, exactly as era two's cards
vary by region.

### 6.1 The card

428 units wide, about 104 tall.

- **A 40 unit node glyph** on the left: **the node's own enamel plate with its number**, which makes
  every card visibly different without a single bespoke icon. **This is the cheapest identity system
  in the folder** and it comes free with the era's own fiction.
- **The node name**, its state at 14 units, and **what feeds it** at 13.
- **A cost zone** carrying **repairs this takes**, which is one for a failed node and two for a
  burned-out one.

### 6.2 The five states

| State | Treatment |
| --- | --- |
| **Idle** | 1-unit border in the rail's line colour |
| **Hover** | Border to 2, card lifts 1, **no colour change**, and **the node's whole upstream chain raises on the board**, from it back to the boiler house. **This is the single most useful hover in the folder**: it is the diagnosis, given for free, as the cadence requires |
| **Armed** | 3-unit border, corner flag with a check glyph, **Chosen**, `aria-pressed="true"` |
| **Unavailable** | **The reason replaces the ladder**: *"Already working."* or *"No repairs left."* `disabled`, `aria-describedby` |
| **Committed** | 6-unit diagonal hatch, declared line replacing the body |

### 6.3 What the card must not do

**It must not tell the player the answer.** See section 7.1: the card states the rule and the node's
feed, and the player works out whether the feed is live. **A card that said "this will burn out" would
delete the axis.**

---

## 7. The read-out panel

### 7.1 The finding: the preview invariant and the ordering axis pull against each other

**INV-CRISIS-10 says everything provisional is previewed before it is committed**, and gives the
reason: *"You never learn a cost by having already paid it."* **D-CRISIS-17 says a repair downstream
of a live fault burns out.** Put together naively, the preview would say *"this repair will burn
out"*, and **the ordering puzzle would evaporate**: the player would click each node until the
warning went away.

**This brief resolves it as follows, and the resolution is a design decision that belongs to the
lead** ([Q1](#13-open-questions)):

> **The cost is always stated. Whether it applies here is what the player works out.**
>
> The panel says, every time, on every node: *"A repair downstream of a live feed burns out. It costs
> the repair and the machine."* And it says what feeds this node, and it shows the chain back to the
> source on the board. **What it does not say is whether that chain is live.** The board says that,
> with steam, and reading the board is the skill.

**Why this satisfies both.** INV-CRISIS-10's actual requirement is that a player never discovers a
cost by paying it, and under this resolution the cost is stated before every single repair, in full,
in the panel. What is not handed over is the **diagnosis**, and the diagnosis is the axis
D-CRISIS-2 reserved the Industrial era to host.

**The alternative, recorded so it is not rediscovered:** show the warning outright and move the
puzzle elsewhere, for instance into a budget that forces the player to choose which of several valid
orders is cheapest. **That is a different crisis** and it should be chosen deliberately if it is
chosen.

### 7.2 The direction

- **Lead with what the repair restores**, by name and by count: *"This starts the Weaving Shed and
  the two machines it feeds."*
- **State the burn-out rule every time**, per 7.1.
- **Show the chain**, as a small directed diagram from the source to this node, with each link marked
  live or dead **using the same wisp glyph the board uses**. The panel is a second view of the board
  and should look like it.
- **Show the ledger arithmetic**: repairs available before and after, and repairs outstanding before
  and after. **On a burn-out that second number goes up**, and the player should have seen the shape
  of that risk before committing.
- **No dashed borders.**

### 7.3 The provisional register

**A proposed repair is a raised outline around the node's footprint** with a numeric badge giving the
rung. **The upstream chain is outlined rather than highlighted.** Committed repairs are scaffolds and
plates. As everywhere in this folder, provisional states frame and committed states fill.

---

## 8. Damage and consequence

### 8.1 The three machine states that persist

| State | What it is | What it costs |
| --- | --- | --- |
| **Failed** | The cascade stopped it | One repair |
| **Burned out** | A repair was attempted downstream of a live feed | **Two repairs**, and the geometry is distinct |
| **Repaired** | Working again | Nothing, and it carries a fresh enamel plate |

### 8.2 What an unsolved ending leaves

**The plumes come back only as far as the repaired part reaches.** A town half lit by steam and half
cold is the most legible unsolved ending in the folder, and it needs no marker, no panel and no
badge: the player can see exactly how far they got.

**Buildings left failed are *temporarily unusable*, which is a named permitted consequence**, and
their capacity is suspended until repaired. Nothing is removed and no mastery is touched.

### 8.3 Repair after the crisis

**A machine left failed can be repaired after the crisis at the authored price**, per D-CRISIS-12's
requirement that at least one viable recovery path must remain. **`materialForEra` returns `null` for
every era but `prehistoric`**, so era seven has no denominator yet and the price cannot be quoted
here.

### 8.4 The floor

Nothing is removed and no node is relocked. A failed machine is *"temporarily unusable"*, a named
permission, and **repair is the axis rather than a consequence**, which is what makes era seven pass
the floor check cleanly.

---

## 9. The copy

**Register: results, not purchase.** Era seven's exposure runs through the budget: *"three correct
answers buys three repairs"* is the sentence to avoid. **Repairs are entered in the ledger because
the answers earned them.**

- **Right:** *"3 right. Three repairs in the book."*
- **Wrong:** *"3 right. You can afford three repairs."*
- **Right, and a real cost:** *"This takes two repairs."* The ledger genuinely is spent.

**Plainer language matters here** because the mechanic is the most technical of the nine. The copy
should never use the word "upstream" or "downstream" without saying what feeds what in the same
sentence.

**Nothing mechanical will catch a regression.** The em-dash gate reads `*.json` under
`content/lessons/` only; the prose scanner that could read TSX is in no CI step at all.

### 9.1 Titles and standing text

| Where | String |
| --- | --- |
| Crisis name | **The Boiler Cascade** |
| Entry announcement, heading | **The works have stopped** |
| Entry announcement, body | A boiler has gone and everything it feeds has gone quiet with it. You can go down when you are ready. |
| Entry announcement, control | **Go down to the works** |
| Header | **{n} repairs in the book, {m} machines to fix** |
| Board label | The island. Machines, and the mains that feed them. |
| Ledger heading | **The works book** |
| Ledger row | Plate 14. Weaving Shed. Stopped. Fed from plate 3. |
| Inspect hint | Look at anything you like. Nothing here costs you until you commit to a repair. |
| Declare heading | **Choose what to repair** |
| Declare body | Pick a machine, then answer {n} questions. How many you get right sets how many repairs go in the book. |
| Commit control | **Send the gang** |

### 9.2 The cards

| Line | String |
| --- | --- |
| Repair, name | **Repair plate 14, the Weaving Shed** |
| Repair, state line | Stopped. Fed from plate 3. |
| Repair, burned-out state line | Wrecked. Fed from plate 3. |
| Cost zone, failed | Takes 1 repair |
| Cost zone, burned out | Takes 2 repairs |
| Ladder rung 1 | 1 right: one repair in the book |
| Ladder rung 2 | 2 right: two repairs |
| Ladder rung 3 | 3 right: three repairs |
| Unavailable, working | Already running. |
| Unavailable, no budget | No repairs left in the book. |
| Armed | **Chosen** |
| Committed | Gang sent here. |

### 9.3 The read-out panel

| Line | String |
| --- | --- |
| Heading | **Repairing plate 14, the Weaving Shed** |
| What it restores | This starts the Weaving Shed and the two machines it feeds. |
| The rule, always shown | A repair on a machine whose feed is dead will wreck it. That costs the repair and the machine. |
| The chain | Plate 14 is fed from plate 3, and plate 3 is fed from the boiler house. |
| Ledger before and after | 3 repairs in the book. 2 after this one. |
| Outstanding | 5 machines to fix. |
| The bet | You can see what feeds it. Whether that feed is live is on the board. |

### 9.4 The question panel, and the solution

**Every answered question shows the solution, right or wrong.**

| Element | String |
| --- | --- |
| Heading | **Question {i} of {n}** |
| Verdict, correct | **Right** |
| Verdict, wrong | **Not this time** |
| Solution heading | **How this one works** |
| Solution body | (the item's own authored worked solution, unchanged) |
| Move on | **Next question** |
| Last question | **See what went in the book** |

**Where it sits:** below the answer field, same panel, same position in both cases, field read-only,
verdict above the solution, **no retry control**.

### 9.5 Results and outcomes

| Case | String |
| --- | --- |
| Three right | 3 right. Three repairs in the book. |
| Two right | 2 right. Two repairs in the book. |
| One right | 1 right. One repair in the book. |
| None | 0 right. Nothing goes in the book this time. |
| Repair worked | Plate 14 is running. Steam is up on the two it feeds. |
| Burn-out | Plate 14 had no feed and it has wrecked itself. It takes two repairs now. |
| Cascade restored | **Steam is up across the works.** Everything is running. |
| Budget spent | **The book is empty.** Four machines are still cold, and they can be repaired later. |

**On the burn-out line.** It says what happened and what it now costs. It does not tell the player
they made a mistake, and it does not explain the rule again, because the rule was on the panel
before they committed.

---

## 10. Accessibility

**The canvas is `aria-hidden`; the DOM is the accessible surface.** **Era seven's works ledger is the
crisis for a screen-reader user**, and it must carry the whole graph, not a summary of it.

### 10.1 Non-colour carriers

| State | Colour | Non-colour carriers |
| --- | --- | --- |
| Run live | none | **Steam wisps at the bleed valves**, valve geometry closed, plus the ledger's feed column |
| Run dead | none | **No wisps, valves hanging open**, plus the ledger |
| Machine working | none | **Plume at the stack**, plate square in its bracket, ledger row |
| Machine failed | none | **No plume, access panel open, relief lever up**, ledger row |
| Machine burned out | none | **Buckled casing, lifted floor plate**, ledger row, and a doubled cost on its card |
| Direction of a run | none | **Cast arrow plates repeated along it**, plus the ledger's feed column |
| Proposed repair | outline | **Outline around the footprint**, chain outlined, plus the read-out panel |
| Card armed / unavailable / committed | border | Corner flag; reason text; diagonal hatch |
| Budget | none | **Ruled ledger columns with entries**, and two numbers in the header |

### 10.2 Accessible names

| Element | Name |
| --- | --- |
| Machine, working | `Plate 7, the Engine House. Running. Fed from the boiler house, and its feed is live.` |
| Machine, failed | `Plate 14, the Weaving Shed. Stopped. Fed from plate 3, and that feed is dead.` |
| Machine, burned out | `Plate 14, the Weaving Shed. Wrecked. It takes two repairs.` |
| Run | `The main from plate 3 to plate 14. Dead.` |
| Repair card | `Repair plate 14, the Weaving Shed. Stopped, fed from plate 3. Takes one repair. You have three in the book. A repair on a machine whose feed is dead will wreck it.` |
| Ledger header | `Three repairs in the book. Five machines to fix.` |
| Burn-out result | `Plate 14 had no feed and it has wrecked itself. It takes two repairs now.` |
| Solution block | `How this one works.` then the worked solution |

### 10.3 What a screen reader needs that the visuals carry implicitly

- **Whether a feed is live is carried by steam**, which is silent. **Every machine's accessible name
  must state whether its feed is live**, or the crisis is unplayable without sight. This is the
  single most important accessibility requirement in this brief.
- **The chain from a node back to the source** is a hover on the board. It must also be a sentence,
  and it belongs in the read-out panel, listing every plate in order.
- **The ledger's two numbers** carry the whole pressure of the mechanism and must be in the header
  region.
- **A burn-out changes the outstanding count**, and that change goes in an assertive live region,
  because it is the direct result of the player's own action.

---

## 11. The consolidated asset list

**25 items.** No entry is a bitmap.

### Atmosphere (6)

| # | Item | Kind |
| --- | --- | --- |
| A1 | Cascade lighting preset: nine numbers, key up and cold, fog pushed out | Treatment |
| A2 | Sky and fog preset: hard clean blue-grey, no haze | Treatment |
| A3 | Standing water in the channels | Geometry |
| A4 | Cold clinker treatment on the ash tip | Treatment |
| A5 | Stopped-works dressing: crane loaded and cold, shovel in the coal, ledger open | Geometry, from existing props |
| A6 | Island clip for the ground courses, so cells past radius 30 are not drawn | Treatment |

### The network (8)

| # | Item | Kind |
| --- | --- | --- |
| N1 | **Steam main on low sleepers, lagged, raised. The crisis's central object** | Geometry |
| N2 | **Cast arrow plate, repeated along every run.** The direction marker | Geometry |
| N3 | Manifold block at a junction | Geometry |
| N4 | Bleed valve, closed and open | Geometry x2 |
| N5 | **Steam wisp at a bleed valve, with its posed reduced-motion still** | Geometry + animation rig |
| N6 | **Stack plume, with its posed still** | Geometry + animation rig |
| N7 | Plume-out propagation for the entry, and its reverse for the exit | Animation rig |
| N8 | Proposed-repair outline and chain outline | Geometry |

### The machines (5)

| # | Item | Kind |
| --- | --- | --- |
| M1 | Failed state: access panel swung open, relief lever standing up | Geometry, per footprint |
| M2 | Burned-out state: buckled casing panel, lifted floor plate | Geometry, per footprint |
| M3 | Repair scaffold: pole scaffold with a chain block on the gantry | Geometry |
| M4 | Enamel plate, numbered, in its bracket | Geometry |
| M5 | Burn-out vent: one steam release from the wrong place, with its posed still | Animation rig |

### The UI (6)

| # | Item | Kind |
| --- | --- | --- |
| U1 | **The works ledger**, full at 920 and filtered at 460 | DOM |
| U2 | Repair card, with the node's enamel plate as its glyph, and its five states | DOM |
| U3 | Enamel plate glyph, numbered, for the card and the ledger | SVG |
| U4 | Chain diagram for the read-out panel, with live and dead marked by the wisp glyph | SVG |
| U5 | Ledger arithmetic display: available and outstanding, before and after | DOM |
| U6 | Question panel with the solution block, in both verdict cases | DOM |

**Counts by kind:** 14 geometry items or sets, 4 animation rigs, 2 SVG sets, 4 DOM designs, 3
treatments. **Build N1, N2 and N5 first.** The main, its arrows and its wisps are the crisis: with
those three the ordering puzzle is playable on the board with no UI at all.

---

## 12. Desirable, and genuinely unbuildable under the current renderer

1. **A firebox glowing through an open door.** Four global lights, no `pointLight`, no spill from
   emissive. An open firebox can be a bright emissive face and it will light nothing, which for a
   firebox is a bigger loss than for most things.
2. **Sparks and a shower of them at a burn-out.** Buildable as small meshes; **not buildable as
   light**. Sparks that do not glow are grey dots. **The brief uses a steam vent instead**, which
   works with the renderer rather than against it.
3. **A red-hot pipe.** Needs either a tint on existing geometry (no runtime path) or an emissive
   material swap (possible, and it will read as a bright pipe rather than as a hot one, with nothing
   around it changing).
4. **Bloom on anything.** `@react-three/postprocessing` is not a dependency.
5. **Soot accumulating on a building.** No image textures, no decal projection. Era seven's dirt is in
   its authored material colours.
6. **A steam haze at ground level that thickens near the works.** Fog is linear and distance-based
   only. There is no height fog and no scattering.
7. **A per-cell ground layer at era seven's authored radius, drawn today.** 608 cells at radius 55
   against a drawn grass radius of 30. A6 exists for this reason.
8. **Reflections in the standing water in the channels.** No environment map. The water course is a
   flat dark tone, which is all it needs to be.

---

## 13. Open questions

| # | Question | Owner | Why it blocks presentation |
| --- | --- | --- | --- |
| **Q1** | **Does the read-out panel warn that a specific repair will burn out, or only state the rule?** Section 7.1 works both readings through and draws the second, because the first deletes the ordering axis. **This is the most consequential open question in this brief.** | Team lead | It is the difference between a diagnosis puzzle and a click-until-the-warning-clears puzzle |
| **Q2** | **How big is the repair budget?** Carried in the crisis spec as **O-18** and **O-15**. A budget so tight that ending unsolved is the ordinary result is a different game from one where it is the price of a bad order. | Team lead, with whoever tunes it | The ledger shows two numbers and their relationship is the whole feel of the crisis |
| **Q3** | **Is burn-out capped?** O-15 asks whether the budget is sized against the worst plausible ordering or burn-out is capped. Under D-CRISIS-26 running out is an ending rather than an unwinnable board, so the dilemma is softer, and it is still a real choice. | Team lead | It decides whether a node can burn out twice, and therefore whether M2 needs a second stage |
| **Q4** | **How many nodes, and how deep is the chain?** A three-node chain has no puzzle in it. A twelve-node graph at 460 is unreadable. | Whoever authors era seven's content | It decides whether the ledger fits, whether the board reads, and whether the axis exists |
| **Q5** | **Does the network map onto the era's real buildings, or is it its own set?** Section 3 assumes the nodes are era seven's own buildings, which is what makes the enamel plates work. | Team lead | If the network is separate, every node needs its own model and the plate identity system does not apply |
| **Q6** | **Do failed machines suspend capacity during the crisis, or only after it?** Section 8.2 assumes during. | Team lead | It decides whether the capacity readout moves while the crisis runs, which is a visible thing on the city HUD |

---

## 14. References

- `docs/superpowers/specs/2026-07-29-mid-era-crisis-design.md`: D-CRISIS-2 (why the Industrial era
  hosts the ordering axis), D-CRISIS-17 (burn-out, and the finite repair budget), D-CRISIS-26 (the
  solve condition and the unsolved ending), section 5.9 (the shared edge primitive and the valence
  warning), section 5.7 (the three topologies), and INV-CRISIS-1, 3, 4, 10 and 16
- `docs/superpowers/specs/crises/README.md`: the shared boundary, carrier set, copy rules and
  per-era decal reach
- `docs/superpowers/specs/crises/era-06-plague.md`: the other half of the shared link layer, and the
  in-the-floor against on-the-floor separation
- `docs/superpowers/specs/eras/era-07-industrial/style-guide.md`: the standard part repeated without
  limit, the rails let into the paving, and the props kit including the enamel plate and the printed
  ledger
- `apps/web/src/city/three/WinterGround.tsx`: the decal ladder and the outline builder
- `engines/game/src/crisis-damage.ts`: `suspended_civic`
- #298: era seven's buildable radius of
  55
- #302: era one's brief
