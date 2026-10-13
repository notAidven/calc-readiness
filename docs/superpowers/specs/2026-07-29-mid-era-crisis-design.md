# Mid-era crises — FOUR ship, ten are designed, and what era one rules for all of them

**Status: FOUR crises are in scope — eras 1, 4, 6 and 9 — and the other six are SHELVED.**
**The design is RULED for all ten; ONE of the four is built.** Recorded 2026-07-29, grounded
against `integration` at `bc27f02`. Reviewer: `Anthony`.

> **The title and the two lines above said *"the ten"* and *"the design is RULED for all ten;
> ONE of the ten is built"* until 2026-07-31, when the team lead cut the spine to four
> (**D-CRISIS-31**). Corrected in place rather than left to contradict the amendment, because
> a status line is what a reader trusts before reading anything else. The word *ten* survives
> where it is still true: ten crises are DESIGNED, and §3, §5.20 and §7 keep all ten because
> **D-CRISIS-32 shelves the six rather than cancelling them.**
>
> **The SET in the status line then moved once more the same day, from 1 / 4 / 7 / 10 to
> 1 / 4 / 6 / 9 (D-CRISIS-33).** It is corrected in place for the same reason. **The count did
> not move and neither did anything else about the shape of the ruling** — still four crises,
> still one per selected era, still ten end-of-era progressions. Only the membership changed:
> eras **7** and **10** left, eras **6** and **9** arrived.

**One crisis exists.** The Hard Winter (era one) is a working prototype reached at
`?winter`, running over a snapshot of the player's real city that it cannot write back.
The other nine are designs on paper with no code, no tuning numbers and, for eight of the
nine, no authored land to stand on. **Nothing in this document should be read as
describing ten built encounters**, and §1 states the built/unbuilt line before anything
else for that reason.

**This document does not invent tuning numbers.** Era one's numbers are real, were
measured, and are quoted with their source. The other nine have none, and every place one
would go says so rather than guessing.

> ## AMENDED 2026-07-29, during authoring — the Lost Herd's stake mechanism
>
> **D-CRISIS-5** was first circulated as a *proposal to evaluate*: that the Lost Herd's
> stake should land on capacity rather than on population. The team lead then **ruled** a
> sharper version of it, and the distinction he drew is the load-bearing part: *the
> settlement does not lose population, it loses the ability to support population.*
> D-CRISIS-5 below is the ruled form. The weaker proposal is recorded here rather than
> deleted, because the difference between "population falls" and "capacity becomes
> unavailable" is exactly the difference between breaking `D-CIT2` and not (§5.5).

> ## AMENDED 2026-07-29, during authoring — the failure floor is RULED, not open
>
> This document was briefed to record "whether any crisis can genuinely cost an era's
> progress" as the **largest open question**. The team lead has since **ruled it**, and it
> is carried as **D-CRISIS-7** with its own permitted-consequence list rather than as an
> open item. The open-questions table keeps the row, marked resolved, so the number is
> never reused and a later reader does not re-open it (§11, **O-2**).
>
> The ruling also settles a question this document raised on its own account — whether
> era one's permanent damage and era two's repairable damage were a deliberate
> divergence. **They are not a divergence; damage is repairable across the board.** What
> the recheck found instead is a **documentation defect in era one**, where the prose and
> the constants disagree about permanence. It is reported at §6 and not fixed here.

> ## AMENDED 2026-07-30 — three propagation crises, three topologies
>
> Grounded against `integration` at `769f704`; the body above was grounded at `bc27f02`
> and every claim this amendment leans on was re-read at the newer tip.
>
> **The question put to the team lead was whether the Great Fire (5) and the Plague (6)
> overlap too much.** They are adjacent eras and both were specced as *"something spreads
> through adjacency, intervene to contain it"*, so a player would meet the same mental
> model twice running. Behind it sat the larger version of the same risk: with era seven's
> Boiler Cascade, eras **five, six and seven** were all propagation in some form.
>
> **He ruled it, and it is carried as D-CRISIS-8** (§5, with the analysis at §5.7–5.11) —
> the two crises separate on two axes at once, and the three propagation crises are given
> three different topologies. **The Plague no longer spreads through adjacency**, and this
> document said several times that it did. Those sentences are corrected in place rather
> than left to contradict the amendment; **§5.11 lists every one**, with what it was and
> what it now says. The correction is not cosmetic: it moves the Plague
> off a capability it shared with the Great Fire and onto one it shares with the Boiler
> Cascade, which changes §9 and changes where era six wants to sit in a build order.

> ## AMENDED 2026-07-30 — the remaining structure is RULED: entry, duration, failure, the question pool, three stakes mechanisms, and the ten player rituals
>
> Grounded against `integration` at `6abf299`. The body above was grounded at `bc27f02`
> and the D-CRISIS-8 amendment at `769f704`; **every claim this amendment leans on was
> re-read at `6abf299`**, and where an older section's finding has expired the expiry is
> reported rather than the finding repeated (§5.19, §9's second staleness note).
>
> **What landed.** The team lead has settled the structure that D-CRISIS-1 through
> D-CRISIS-8 left open, and it is carried as **D-CRISIS-9 through D-CRISIS-23** (§5, with
> the analysis at §5.12–§5.21). Seven groups: **entry** (when the crisis fires, and that
> the player chooses when to answer it), **duration** (three shapes, and none of the ten is
> unbounded), **failure and recovery** (a recovery-cost bound, and "genuine attempt" given
> an operational definition), **the question pool** (a three-era window sampled
> bucket-first, with a no-repeat record), **three stakes mechanisms** for the three crises
> that lacked one, **the ten player rituals** and the governing principle behind them, and
> **three narrower rulings** at §5.21.
>
> **The governing principle is the most quotable thing in this amendment and it belongs at
> the front.** D-CRISIS-1 says a crisis is differentiated by the *kind of decision* it
> asks. **D-CRISIS-19 says what actually delivers that differentiation in play: the player
> ritual** — *when the question happens, what follows it, and how consequences resolve* —
> **and not different variables under the same loop.** Ten crises that all asked "answer a
> batch, then place a thing" would satisfy D-CRISIS-1 on paper and be one encounter in the
> hand.
>
> **One inherited invariant is narrowed by this amendment, and it is narrowed in place.**
> **INV-CRISIS-8 said the crisis samples *cumulatively*** — over every node the learner has
> reached — and D-CRISIS-14's window is the current era plus the previous two, which from
> era four onward is strictly less than that. The invariant is corrected where it stands
> rather than left to contradict the ruling, and **§5.16 lists every sentence that moved,
> with what it was and what it now says**. The same section reports a **documentation
> defect**: two code docblocks still state the cumulative-scaling claim in the form the
> ruling has just retired, and no code is changed here.

> ## AMENDED 2026-07-30, later the same day — four rulings that land ON D-CRISIS-9..23
>
> Grounded against `integration` at `f7269e4`, **with the amendment above merged**. The
> sequencing note comes first, because it is why these four are written the way they are.
>
> **They amend D-CRISIS-9, D-CRISIS-11, D-CRISIS-13 and D-CRISIS-15, and they were authored
> against `4f879bb`, when none of those decisions was in this file.** All fifteen of
> D-CRISIS-9 through D-CRISIS-23 were still open in
> **#279**, so each ruling below
> was drafted against that pull request's *diff* and carried an explicit warning that it must
> not land first. **#279 merged as `dcbf963` at 17:25:34Z**, ahead of this amendment, so the
> warning is discharged: **the anchors are in this file, and every one of the four has been
> re-read against the merged text** rather than left resting on the diff it was drafted from.
>
> **Two habits survive from having been written that way, and both are deliberate.** Each
> ruling **quotes the anchor it amends**, so it argues rather than points — which is worth
> more now that a reader can check the quotation against the section above it. And the
> numbering **picks up where #279 stopped**: **D-CRISIS-24..27**, **§5.22–§5.27** and
> **O-17..O-19**, which read contiguously instead of leaving the gap they would have left had
> the order gone the other way.
>
> **What the four are.** A **wording ratification** that makes the entry trigger a formula
> instead of an English sentence and moves no number (D-CRISIS-24); **an accuracy BAND**
> where D-CRISIS-13 had a single figure that no longer exists (D-CRISIS-25); **a finite
> action budget** for the three solve-it crises, so each can end **unsolved** with the damage
> standing (D-CRISIS-26); and **fewer rounds in era one** (D-CRISIS-27).
>
> **One of the four is now DONE rather than owed, and that is the merge's doing.**
> D-CRISIS-24 was drafted as a ratification whose two edits belonged to whoever landed #279.
> #279 landed with **both sites still leading with the ambiguous word**, so **the two edits
> are made here**, and §5.22 records what each said before rather than changing them quietly.
>
> **Two of the four report something against the brief that produced them**, which is the
> part worth reading. D-CRISIS-24 found that #279's *body* already stated the formula, so the
> ruling was narrower than it was scoped. And D-CRISIS-27 found that the sampling vacuity it
> was partly offered as a fix for **is not a function of the round count at all** and survives
> the cut, measured at this tip; the pacing argument is the lead's own and stands without it.
>
> **No code is changed and no tuning number is invented**, which §1 already requires.
> D-CRISIS-27 makes a shipped, measured calibration wrong and deliberately does not replace
> it: the re-tune is **O-17**, named with its scope, because there is a demo tomorrow and
> the Hard Winter is what is being demoed.

> ## AMENDED 2026-07-31 — a crisis MAY take population, by taking capacity; and era two may share era nine's cadence
>
> Grounded against `integration` at `03d5a2b9`, which is the tip. Every code claim in this
> amendment was measured at that SHA rather than read, and the measurements are printed in
> §5.28–§5.31 so a later reader can tell an argument from a number.
>
> **The ruling, in the lead's words, and the narrower of two things he said.** Asked whether
> a mid-era crisis may take population given that D-CIT2 rules population a pure function of
> learning state, he first offered the wide version — *"it doesn't have to be a pure function
> of learner state in that it can't be modified at all by any non-learning lever"* — and then
> gave the model that is actually carried here:
>
> > *"I think people leave because there's a reduction of the capacity (so it goes back to
> > the capacity problem anyways), but they'll come back if you increase capacity via the
> > civic buildings."*
>
> **The second form is narrower and it is the one ruled**, as **D-CRISIS-28**. The crisis does
> not reduce population; it reduces **capacity**, population is bounded by capacity, and the
> overflow leaves. Restore capacity by buying civic buildings and the overflow returns. So
> D-CIT2 survives almost intact — population is still driven by learning state, and what the
> crisis attacks is the **ceiling**, which was always allowed to bind.
>
> **This OVERRULES §5.6's headroom cap**, which this document recommended twice and which
> two open questions were resting on. The recommendation was: cap a crisis's capacity penalty
> at the available headroom so no citizen is ever displaced. The lead has now said plainly
> that people leaving is fine provided they come back, so the cap is not needed and its cost
> — a containment move the player needs being refused, which is O-9's collision with
> INV-CRISIS-3 — is not paid. §5.6 keeps its old text with a dated note beside it.
>
> **The framing rule in D-CRISIS-5 relaxes with it.** That ruling forbids describing the
> stake as *"population falls"*. Under D-CRISIS-28 population **does** fall, so the ban is
> narrowed rather than kept: what is still forbidden is *"population falls and stays down"*,
> because the reversibility is the whole of what makes it inside the failure floor.
>
> **What this amendment closes.** **O-4** (does a crisis-induced shortfall feed the era
> design's departure path) is **resolved** — yes, that is now the intended mechanism rather
> than a leak. **O-9**'s headroom half is resolved for all four capacity crises; its
> era-six-specific half survives and is restated. Era two's brief carries **Q4** and **Q5**
> on this; §5.31 records what they now say, and that brief is not edited here (it is open on
> #307 under review).
>
> **What this amendment OPENS, and it is the expensive part.** The ruling needs `waiting`
> keyed on the capacity a civic building moves, and in the tree it is keyed on a different
> one. **There are two disjoint capacity ledgers in the code** and the crisis writes to the
> one that bounds nothing. That is **O-20**, and it is a wiring decision rather than new
> population machinery. **No code is changed here**, per §1 and because the citizens and
> economy surfaces have work in flight
> (#273, open, `mergedAt: null`).
>
> **The second ruling, recorded and not acted on.** The lead is comfortable with era two and
> era nine sharing a cadence — *"they're so far apart that it's fine"* — which is
> **D-CRISIS-29**. It relaxes the separation era two's brief was drawn to protect. It does
> **not** repeal D-CRISIS-22, so era two's brief keeps its Q1; §5.30 says why.

> ## AMENDED 2026-07-31, later the same day — THE SPINE IS CUT TO FOUR: eras 1, 4, 7 and 10. The other six are SHELVED, not cancelled, and all ten eras keep an end-of-era progression
>
> Grounded against `integration` at `2a484b1b`, which is the tip. Every code claim below was
> measured at that SHA and the measurements are printed at §5.36 and §5.38, so a later reader
> can tell an argument from a number.
>
> **The ruling, in the lead's words.**
>
> > *"on the crisis design, i think eras 1/4/7/10 makes sense, and there will always be a
> > persistent end-of-era progression"*
>
> and, separately,
>
> > *"hard winter is an era 1 crisis"*
>
> **So: four crises, at eras 1, 4, 7 and 10; the Hard Winter is era one's; and every one of
> the ten eras keeps a persistent end-of-era progression.** It is carried as **D-CRISIS-31**,
> and **it supersedes one-crisis-per-era wherever this document or any other asserted it.**
> §5.38 lists every site that did, including the ones outside this file.
>
> **The six now out of scope are SHELVED, not cancelled — D-CRISIS-32.** The Lost Herd (2), the
> Raid (3), the Great Fire (5), the Plague (6), Missile Alert (8) and Intrusion (9) keep their
> axes, their rituals, their cadences, their stakes mechanisms, their terminal conditions and
> their floor checks, everywhere this document states them. **Nothing about the six is deleted**,
> because their designs are work already paid for and a later reader must be able to pick one up
> without re-deriving it. Each is marked **DEFERRED 2026-07-31** where it stands.
>
> **What is NOT cut, and it is the half a reader skims past.** All ten eras keep an end-of-era
> progression. That is the trial (`2026-07-27-era-progression-design.md` **D-ERA16**,
> `2026-07-29-era-trial-contract.md` **D-ET3**), and the ruling *confirms* it rather than
> changing it — so the cut removes six encounters from the run and removes **no** era's ending.
>
> **The justification is a cost asymmetry, and §5.35 measures it against this document's own §9
> rather than asserting it.** Four crises is four *bespoke* mechanics: D-CRISIS-19 makes the
> player ritual the unit of difference and D-CRISIS-21 reserves repeated area placement to the
> Hard Winter alone, so there is little to reuse between them. Measured at §9's capability table,
> the position is sharper than that argument: **under the cut, not one engine capability in that
> table is shared by two of the four surviving crises.** Ten progressions, by contrast, is *one*
> mechanic with ten dressings, and the dressings are already committed by rulings made this week.
>
> **Three consequences are recorded rather than left to be inferred**, at §5.35 (the cost
> asymmetry), §5.36 (era one's thin-pool fallback is now a permanent structural dependency, not a
> patch) and §5.37 (the Hard Winter is the first crisis any player meets, so it does tutorial duty
> and its instructional copy cannot be trimmed to nothing).
>
> **One question is OPENED and deliberately NOT decided.** A reservation was put to the lead about
> **era ten** and he has not answered it: the reach curve is steep, so an era-ten crisis is the
> most expensive per player who arrives at it, and era ten's *progression* already serves as the
> game's ending ceremony. That is **O-22**, attributed and dated. **The ruling is 1/4/7/10 and that
> is what ships until he says otherwise.**
>
> **No code is changed here**, per §1. Two code-side residues are named as open items instead:
> `midEraCrisisCall` reports a standing call for **all ten** eras, measured (**O-23**), and the six
> shelved briefs sit in an open pull request this document must not silently orphan (**O-24**).

> ## AMENDED 2026-07-31, later still — THE SET MOVES: eras 1 / 4 / **6** / **9**. Boiler Cascade and Robot Uprising are shelved; Plague and Intrusion come off the shelf
>
> Grounded against `integration` at `db2b18c2`, **with D-CRISIS-31 and D-CRISIS-32 merged** —
> #345 merged at
> **`2026-07-31T20:23:37Z`**, read from the API rather than inferred, so the amendment above is in
> the tree and this one lands on merged text rather than on a diff.
>
> **The base moved once while this was being written, and every measurement below was re-taken
> rather than carried across.** This amendment was authored against `1b3f985f` and thirteen commits
> landed on `integration` before it was pushed, arriving as `db2b18c2`. **The merge touched none of
> the five documents this amendment edits, and neither `packages/skill-graph/src/eras.ts` nor
> `docs/superpowers/specs/eras/`** — it is D10 lesson and figure work — **but that was checked
> rather than assumed, and the measurements were re-run at the newer tip anyway**: the era node
> counts and every window and trigger in §5.12 and §5.36, the zero-`crisis` count under `eras/`, the
> absence of `docs/superpowers/specs/crises/`, and both pull-request merge states. **All of them
> reproduce, and the SHAs quoted throughout this amendment are the tip they were re-taken at.**
>
> **This AMENDS D-CRISIS-31 and D-CRISIS-32 and repeals neither.** It is carried as
> **D-CRISIS-33** (§5, with the analysis at §5.39–§5.41). **Everything about the shape of the
> earlier ruling survives: still four crises, still one per selected era, and still a persistent
> end-of-era progression in all ten eras.** The progression side is untouched — D-ERA16 and D-ET3
> are confirmed by D-CRISIS-31 and are not reached by this amendment at all. **What moved is the
> membership**, and only that:
>
> | Era | Crisis | Axis it owns | Was |
> | --- | --- | --- | --- |
> | 1 Prehistoric | **Hard Winter** | **Area** | in scope — unchanged, and still the only built one |
> | 4 Classical | **Succession Crisis** | **Allegiance** | in scope — unchanged |
> | 6 Early Modern | **Plague** | **Topology** | *shelved* → **IN SCOPE** |
> | 9 Information | **Intrusion** | **Uncertainty** | *shelved* → **IN SCOPE** |
> | 7 Industrial | ~~Boiler Cascade~~ | Ordering | in scope → **SHELVED** |
> | 10 Cyberpunk | ~~Robot Uprising~~ | Denial | in scope → **SHELVED** |
>
> **Two reasons, and both are recorded because they answer different objections.**
>
> **The lead's, and it is the one that carries the fiction.** *"plague feels the most on theme"*.
> Era six is **Early Modern (Northern Renaissance)**, so a plague is historically resonant there
> in a way no other
> placement of that hazard would be — it makes the fiction stronger rather than merely surviving
> the move. **That is a positive argument for era six and not a consolation for losing era seven**,
> which matters because the cost argument below would be satisfied by any cheap crisis and this one
> is not interchangeable.
>
> **The cost one, which was put to this document as arithmetic and is CORRECTED here rather than
> repeated.** The brief that produced this amendment reasoned from a summary of §5.35 and asked to
> be checked. It was right about the direction and wrong in three specifics, and §5.39 re-derives
> §9's *"Needed by"* column over {1, 4, 6, 9} the way §5.35 did over {1, 4, 7, 10}. **The headline
> is that §5.35's own finding INVERTS.** Under the old set not one §9 capability was shared by two
> of the four. Under the new set **three rows are shared by three of the four** — all three
> capacity-locking rows, needed by eras 4, 6 and 9 alike — so the economies of scale the earlier
> amendment reported as destroyed are largely restored. **The honest saving is smaller than the
> brief claimed and the sharing is larger**, and §5.39 gives both numbers with the rows behind
> them.
>
> **What genuinely leaves the plan is three rows, not two.** Mobile agents with pathing, the
> directed dependency graph, **and the switchable power network** — the third was in the brief's
> prose and missing from its conclusion. **One row arrives that the old set did not carry**: hidden
> state, unknown status of a visible thing, which is era nine's. Net, the union of unbuilt engine
> capabilities goes from **eleven to nine**.
>
> **D-CRISIS-32's reserved-axis list INVERTS, and getting it wrong would have contradicted
> D-CRISIS-1 outright.** Topology and Uncertainty come **off** the reserved list because eras six
> and nine now ship; **Ordering and Denial go on** because eras seven and ten do not. §5.40 records
> a defect in the brief's own statement of this and why it is not adopted: the brief asked for
> *Information-gathering* to come off, and **Information-gathering is era TWO's axis** — the Lost
> Herd's, still shelved. Era nine's axis is **Uncertainty**. Taking the brief's list literally would
> have released a shelved crisis's axis while continuing to forbid Intrusion from taking its own.
>
> **Six open questions change state and two of them swap places**, which is the part a later reader
> is most likely to get from a summary and get backwards. **O-22 is RESOLVED** — it asked whether
> era ten should have a crisis at all, and it does not; the question is kept with its resolution
> rather than deleted, and era ten's ending is carried by its progression plus the game-completion
> ceremony, so nothing is lost there. **O-15 goes DORMANT with the Boiler Cascade** rather than
> being answered or deleted. **O-16 wakes with Intrusion and inherits O-15's old title** as the
> sharpest live unbuilt-design gap. **O-9 and O-10 wake with the Plague.** **O-18 narrows to era
> nine** instead of era seven.
>
> **Two placement arguments are deliberately NOT deleted, because a future un-shelving needs them.**
> **D-CRISIS-2** placed the Boiler Cascade at era seven on the grounds that the Industrial era is
> the first with a machine network, and that is still true and still where it goes **if it is ever
> built**. **D-CRISIS-23** placed the Robot Uprising at era ten because the inversion premise only
> reads after nine eras of the opposite, so if it returns it returns there. Neither reasoning is
> touched; both rows gain a scope marker and keep every word.
>
> **No code is changed here**, per §1. **O-23 is unaffected in kind and its SET has changed**:
> `midEraCrisisCall` still reports a standing call for all ten eras, and the four it should
> eventually be reconciled against are now 1, 4, 6 and 9.

> ## AMENDED 2026-07-31, and this one answers O-13 — AN UNANSWERED CALL FREEZES THE CITY AND NEVER THE LEARNING
>
> Grounded against `integration` at `de43b481`, which is the tip, **with D-CRISIS-34 merged**
> (#356). Every code claim in this
> amendment was measured at that SHA rather than read, and the measurements are printed at
> §5.43b and §5.43c so a later reader can tell an argument from a number.
>
> **The ruling, from the team lead, 2026-07-31.** A player who is given a crisis call and does
> not enter the crisis **cannot do anything in their city** — no building of any kind, no road
> laying, no civic purchases, no moving of placed buildings. **The city is frozen until they
> enter the crisis.** And **learning is NOT frozen**: lessons and practice continue normally
> throughout. It is carried as **D-CRISIS-35** (§5, with the analysis at §5.43–§5.43d).
>
> **This CLOSES O-13**, which D-CRISIS-34 had sharpened the evening before without being able
> to answer, and it closes it at the level O-13 said the answer had to come from — **the game**,
> not the crisis. §5.42b is what established that, and it is upheld rather than superseded: the
> drift mechanism structurally cannot reach a player who never entered, so no ruling about what
> happens *inside* era four's crisis could ever have answered a question about the doorstep.
>
> **The two players are now separately answered and the document says so where either might be
> read for the other.** A player who **enters and never commits** loses the neutral districts to
> drift and the crisis ends decided against them (§5.42c, D-CRISIS-34's outcome clause,
> untouched here). A player who **never enters at all** freezes their city and keeps their
> lessons (§5.43). **Collapsing the two is the mistake O-13 was originally written making**, so
> §5.43a states the distinction rather than leaving it to be inferred from two adjacent
> sections.
>
> **A third clause travels with the ruling because the ruling creates the need for it.** A modal
> crisis that cannot be entered or completed would leave a player permanently stuck with no way
> out, and the lead ruled the valve is a **RELEASE GATE AT AUTHORING TIME** rather than an
> in-game escape hatch: a check that fails if a crisis era cannot compose a playable crisis, so
> such a state can never ship. **It is recorded as a requirement and deliberately not built**
> (§5.43c names precisely what it must assert), per §1.
>
> **Three consequences are traced rather than left to be inferred**, and two of them correct the
> brief that produced this amendment rather than repeating it.
>
> - **Era advancement does NOT follow from the freeze, and it is ruled separately for that
>   reason** (§5.43b). The brief reasoned that a player cannot advance an era with an unanswered
>   crisis *since they cannot build*. **That derivation fails**: `2026-07-27-era-progression-design.md`
>   **D-ERA5** gates the advance on **mastery plus the trial** and on nothing else, and neither is
>   a build action — so a frozen player could master the rest of the era, pass its trial and
>   **advance out from under the crisis**, which would make the era advance a documented exit
>   from the freeze. The conclusion the brief wanted is right and its reason is not, so the gate
>   on era advancement is **stated as its own clause**.
> - **An automatic crisis call is a hard PREREQUISITE, and the brief understated what is
>   missing** (§5.43c). The brief believed nothing triggers a crisis automatically. Measured:
>   something does — `useCrisisCall` fires on the mastery crossing — but it is **session-local
>   and transition-only**, so a learner who loads a city already past the trigger is called by
>   nothing at all, which is pinned by a test. **What the freeze needs is not an automatic call
>   but a DURABLE one**, and the difference is the whole of the risk.
> - **The preview-node trap is a SEPARATE hazard and this gate would not catch it** (§5.43d).
>   `2026-07-29-era-trial-contract.md` §14's chain runs through nodes that can never be
>   *mastered*, and a crisis draws its pool from *mastered* nodes only — so such a node is
>   silently absent from the crisis pool, the crisis composes, and the gate passes over a learner
>   who is trapped anyway. They are siblings under **INV-TRIAL-1**, they compound under a modal
>   crisis, and neither one's assertions reach the other's failure.
>
> **No code is changed here**, per §1, and no tuning number is invented: the ruling sets a
> modality and a gate, not a magnitude.

---

## 1. What is built, and what is not

> **NARROWED 2026-07-31 by D-CRISIS-31.** *"The other nine"* below is the population this
> section was written over and it is kept, because every claim in it is still true of all nine.
> **In scope it is now "the other three"** — eras 4, 7 and 10 — and the six shelved crises are
> unbuilt for the same reasons plus one more, which is that nobody is going to build them.
> The land dependency at the foot of this section is the sharper reading after the cut: of the
> three unbuilt crises still in scope, **all three** stand on unauthored ground.
>
> **RE-POINTED 2026-07-31 by D-CRISIS-33: the three unbuilt crises in scope are eras 4, 6 and 9.**
> The count is unchanged and so is every claim above — **all three still stand on unauthored
> ground**, because `eras.test.ts` pins the authored set to `["prehistoric"]` alone and eras six
> and nine are as unauthored as eras seven and ten were. **The land dependency is therefore
> untouched by the set change**, which is worth saying plainly: nothing about this amendment moves
> a crisis onto ground that exists.

| | Era one — Hard Winter | The other nine |
| --- | --- | --- |
| Engine | `engines/game/src/hard-winter.ts`, `hard-winter-tuning.ts` | none |
| Surface | `apps/web/src/winter/`, reached at `?winter` and from the city menu | none |
| Tests | `hard-winter.test.ts`, `hard-winter-invariants.test.ts`, `hard-winter-layouts.test.ts`, `test/hardWinterClockless.test.ts`, four surface/browser files | none |
| Tuning numbers | authored, measured, and quoted below | **none, and none are invented here** |
| Authored land | `prehistoric`, radius 22, 88 cells | **one of nine** (era two onward are `unauthored`) |

**The prototype's own boundaries, from the code rather than from a summary.** It writes no
mastery and gates no progression — both are carried as the literal type `false` on
`HardWinterOutcome` (`writes_mastery: false`, `gates_progression: false`) rather than as a
comment. It pays nothing: `hardWinterPayoutFor` returns a *descriptor*, and
`packages/economy` is untouched. It cannot damage the city: `liveCitySandbox.test.tsx`
captures the saved blob, plays a whole winter to the end including a pull-back that ruins
ground and every remaining round at zero accuracy so that buildings become ruins, and
compares the raw string **byte for byte** afterwards.

> **AMENDED 2026-08-01.** That clause counted the rounds ("five rounds of zero accuracy")
> until a `HARD_WINTER.rounds: 4` ruling made it false; the count was reversed the same day
> and is five again, so the sentence would have been correct either way by accident. The
> number is gone regardless, because the test derives it from the tuning table and it never
> belonged in the prose. **What did ship that day is `HARD_WINTER.damage.ruin_at: 2`**, which
> changes what this passage's "buildings become ruins" costs: one cold round is now a whole
> building, so a zero-accuracy winter ruins every one of them rather than leaving the
> settlement's heart standing and scarred. See `hard-winter-tuning.ts`'s `damage.ruin_at`.

**Eight of the nine cannot be built today even if someone wanted to.** `hardWinterIsland`
opens with `eraBuildableRadius(eraId)`, which throws for every era but the first:

> Era `"${eraId}"` has no authored buildable radius yet: per D-ERA25 the radius is per-era
> data, authored when that era's buildings are designed. Later eras may stay unauthored
> indefinitely, so this is not an open decision to wait on.

`eras.test.ts` pins that composition directly — `expect(authored.map((era) => era.id)).toEqual(["prehistoric"])`
and `expect(unauthored).toHaveLength(9)`. A crisis is fought over ground, and nine eras
have no ground authored. That is a **content** dependency, not an engine one, and it sits
ahead of every capability in §9.

---

## 2. The organising principle — each crisis changes the KIND of decision

**D-CRISIS-1 (RULED): a crisis is differentiated by the kind of decision it asks, never
by the hazard that asks it. Ten reskins of an advancing front would be one encounter
shipped ten times.**

This is the reason the list in §3 looks the way it does, and it is the rule that has to be
quotable later, because the pressure on a list like this is always toward collapse: two
crises that both spread through adjacency look, to someone tidying up, like one crisis with
two coats of paint. They are not, if the *question* differs.

**That sentence stopped being hypothetical the day after it was written.** The collapse it
describes was raised against eras five and six specifically, and the answer — **D-CRISIS-8**
(§5) — went further than D-CRISIS-1 strictly required: it kept the questions distinct *and*
separated what the two hazards propagate along, so the two crises no longer share even the
hazard shape. Read D-CRISIS-8 as the worked example of this section.

Era one is the worked example of why the axis is the unit of design rather than the
hazard. The Hard Winter's hazard is a frost front, but the encounter is not "a front
advances". It is **where do I spend protection** — three actions that are three different
answers to a spreading threat (hold an area, harden one thing, give ground to buy
resilience everywhere else), against a board where a fire "reaches a building or two and
never a region". Change the front to a flood and nothing about the decision moves. Change
the decision to "which of these do I repair first" and you have a different encounter over
the same front.

So each of the ten below is given its axis **explicitly and in one line**, and the axis is
the thing that must stay distinct. Two crises may share a hazard shape; no two may share
an axis.

---

## 3. The ten, and the axis each one owns

> **SCOPE COLUMN ADDED 2026-07-31 (D-CRISIS-31, D-CRISIS-32).** The table keeps all ten rows.
> **Four are in scope; six are shelved and every one of their designs stays exactly as written**,
> because D-CRISIS-32 defers them rather than cancelling them. Read the `Scope` column before
> quoting a row: an axis that is shelved is still ruled and still reserved — nothing in the four
> may take it — and it is not going to be built.
>
> **SCOPE COLUMN RE-POINTED 2026-07-31 by D-CRISIS-33.** Four rows changed value and six did not.
> **Eras 6 and 9 are now IN SCOPE; eras 7 and 10 are now SHELVED.** The column's meaning is
> unchanged and so is the count. **The reservation rule reads off this column and therefore
> inverted with it** — see §5.40, and D-CRISIS-32's own clause, which is amended there rather than
> here.

| Era | Crisis | The decision it asks | The axis it owns | Built | Scope |
| --- | --- | --- | --- | --- | --- |
| 1 Prehistoric | **Hard Winter** | Where do I spend protection? | **Area** — allocating a limited protective footprint over ground | **yes** | **IN SCOPE** |
| 2 Neolithic | **The Lost Herd** | Where do I look? | **Information-gathering under a search budget** | no | *SHELVED 2026-07-31* |
| 3 Bronze Age | **The Raid** | Where do I block? | **Interception** — placing against a moving agent on a known route | no | *SHELVED 2026-07-31* |
| 4 Classical | **Succession Crisis** | Who do I back? | **Allegiance** — spending banked influence to hold, contest or sway | no | **IN SCOPE** |
| 5 Medieval | **The Great Fire** | What do I pull down? | **Sacrifice** — the cost of the answer is your own buildings | no | *SHELVED 2026-07-31* |
| 6 Early Modern | **Plague** | What do I shut down, and for how long? | **Topology** — severing connections, not defending places | no | **IN SCOPE 2026-07-31 (D-CRISIS-33)** |
| 7 Industrial | **Boiler Cascade** | What do I fix first? | **Ordering** — dependency order, where the wrong first fix fixes nothing | no | *SHELVED 2026-07-31 (D-CRISIS-33)* |
| 8 Atomic | **Missile Alert** | What do I save? | **Triage against a schedule** — several arrivals, different turns | no | *SHELVED 2026-07-31* |
| 9 Information | **Intrusion** | What do I spend on finding out? | **Uncertainty** — paying for information rather than for effect | no | **IN SCOPE 2026-07-31 (D-CRISIS-33)** |
| 10 Cyberpunk | **Robot Uprising** | What do I switch off? | **Denial** — removing the thing that attracts the threat | no | *SHELVED 2026-07-31 (D-CRISIS-33); **O-22**, which was open against this row, is RESOLVED by the shelving* |

**The four in scope own four different axes and that is not a coincidence worth ignoring** —
Area, Allegiance, Ordering and Denial were chosen from the ten by the lead, and they are four
of the most mutually unlike rows in the table. **The three near-collisions below all fall
outside the surviving set or collapse to one member of it**, which is the same fact §5.35
measures on the engine side: the cut removed the overlap and it removed the reuse with it.

> **CORRECTED 2026-07-31 by D-CRISIS-33, and the second sentence of the paragraph above no longer
> holds.** The four axes in scope are now **Area (1), Allegiance (4), Topology (6) and Uncertainty
> (9)**. They are still four different axes — D-CRISIS-1 is satisfied by the new set exactly as it
> was by the old — but **the claim that the near-collisions all fall outside the surviving set is
> now false, and the engine-side claim beside it is false too.** Two of the three collisions below
> now have a member in scope, and §5.39 measures that three §9 capability rows are shared by three
> of the four. **The overlap came back with the set**, and that is the honest reading: the lead's
> original picked four maximally unlike crises, and this one picks four that are still distinct on
> axis while sharing real machinery. Distinctness is a D-CRISIS-1 property and sharing is a §9
> property, and the two were only ever coupled by which four were chosen.

**This table is the decision each crisis asks; it is not the whole of what makes them
different.** Added 2026-07-30: **D-CRISIS-19** rules that what a player actually
experiences as difference is the **ritual** — when the question happens, what follows it,
and how consequences resolve. The axis column above and the ritual are two views of one
design and both have to stay distinct. §5.20 carries the ten ritual identities and the
seven cadences, and the two tables are meant to be read side by side. §5.12 rules **when**
each crisis fires and §5.13 rules **how long** it lasts.

**The three near-collisions, and why each survives as distinct.** These are written down
because they are the ones a later simplification would target.

- **Raid (3), Missile Alert (8) and Robot Uprising (10) all have things moving at you.**
  The Raid is *interception*: the route is visible and you place against it. Missile Alert
  is *triage*: you cannot stop everything and the arrivals are staggered, so the question
  is which target is worth an interceptor. The Robot Uprising is *denial*: you do not
  block or intercept at all, you remove what the hostiles are walking toward. Three
  different verbs against one hazard shape. **After D-CRISIS-31 only the Robot Uprising is in
  scope**, so this trio no longer needs a shared hazard kept distinct in play — but the
  distinction is what the two shelved designs are, so it stays. **After D-CRISIS-33 the trio is
  shelved ENTIRELY**, era ten having joined eras three and eight, so nothing that moves at the
  player survives in the shipping set at all. The distinction is now what *three* shelved designs
  are, and it stays for three reasons instead of two.
- **Great Fire (5) and Plague (6) both spread from a source to what is connected to it.**
  *This bullet originally read "both spread neighbour to neighbour", and that is no longer
  true of the Plague — see D-CRISIS-8.* The two are now separated on **two** axes rather
  than one. **What the spread follows:** the Fire moves strictly through *tile adjacency*
  and the Plague moves through *human movement*, along authored links between the
  buildings people use, which need not touch. **What the player sacrifices:** the Fire's
  answer is *spatial and permanent* — you demolish your own buildings to make a gap, and
  they are still damaged when the crisis ends. The Plague's answer is *temporary and
  destroys nothing* — you close a gathering place or suspend a route, and the capacity
  comes back. The Fire costs you structures; the Plague costs you access. **Both are SHELVED
  after D-CRISIS-31**, so the adjacency risk this bullet and §5.20's caution were written against
  cannot arise in the shipping run at all. The separation is kept in full because it is the two
  designs; if either is ever picked up it is picked up already separated. **After D-CRISIS-33 the
  pair collapses to ONE member and it is the Plague** — era six ships and era five does not — so
  the adjacency risk still cannot arise, now for the ordinary reason rather than because both
  halves left. **The separation is load-bearing again in one direction:** era six is being built
  against this bullet's description of it, so *"the Plague moves through human movement and not
  through tile adjacency"* is now a constraint on a crisis somebody will implement rather than a
  note between two shelved designs.
- **Boiler Cascade (7) and Plague (6) both propagate from a source, and now along a
  drawn link.** The Plague's graph is undirected, its edges are *human movement*, and the
  question is which edge to cut. The Cascade's graph is **directed**, its edges are
  *machine dependencies*, and the question is which node to repair *first*, because
  repairing downstream of an unfixed upstream fixes nothing. Ordering is the axis and only
  a directed graph can host it — see D-CRISIS-2. **These two are the pair most worth
  watching**, because D-CRISIS-8 deliberately moved the Plague onto a link layer the
  Cascade also wants: they are now closer in *machinery* than they were, and further apart
  in *semantics*. §9 records why sharing the machinery is the right trade anyway. **After
  D-CRISIS-31 only the Boiler Cascade is in scope, which retires the trade rather than settling
  it**: the link layer has one customer again, so era seven pays for it alone. §5.35 measures
  that this happened to every shared row in §9 and not only to this one. **After D-CRISIS-33 the
  surviving member is the OTHER one**: era six ships and era seven does not, so the link layer and
  the propagation rule over it still have exactly one customer and it is now the Plague. **The
  trade stays retired and the customer transfers**, which is the distinction §5.39 insists on —
  nothing was reused here, a single-customer row simply changed which crisis its one customer is.
  **One asymmetry survives the transfer and is worth carrying forward:** §5.9 found that era six
  alone needs its edges **selectable** and era seven alone needs them **directed**. Under this set
  the shipping requirement is selectable and undirected, so §5.8's *"build the direction flag up
  front"* is now advice about a shelved crisis — worth following only if era seven's un-shelving is
  thought likely.

---

## 4. What era one establishes, and all ten inherit

Derived from the implementation, with the enforcement site for each. These are numbered so
a later design can be checked against them rather than argued with.

**INV-CRISIS-1 — clockless.** Nothing accrues or advances with wall-clock time. A round
advances on an event and on nothing else. Enforced twice and deliberately not once:
`test/hardWinterClockless.test.ts` sweeps a *derived* population — every non-test source
in the winter engine and in the winter's playable surface, with the engine side closed
over its own relative imports — for `setInterval`, `setTimeout`, `Date.now`, `new Date`,
`performance.now`, `requestAnimationFrame` and `Math.random`. Separately,
`hard-winter-invariants.test.ts` folds a whole winter twice with `Date.now` moved a day
between and asserts not merely that the results match but that the clock was **never
consulted**. Upstream: **INV-ERA-3** forbids anything keyed to elapsed wall-clock time
outright; the resource model's §5.1 forbids passive accrual.

**INV-CRISIS-2 — no passive generation.** No building produces anything over time; the
payout exists only because an encounter was completed. `HARD_WINTER.payout`'s own comment:
*"NOTHING here is a passive source — the payout exists only because an encounter was
completed, which is exactly the distinction the resource design draws."*

**INV-CRISIS-3 — no dead ends, in both halves.** An illegal choice costs nothing: the
surface disables the control and `hardWinterReducer` returns *the same state object* for
an out-of-phase event, so "a refusal is never a consequence" is checkable by identity and
not only by value. And no board is unwinnable: `hard-winter-layouts.test.ts` carries one
witnessed full-accuracy plan per layout that saves everything **and gives up no ground**,
asserted by set equality both ways so a new layout cannot join without a witness. There is
also no losing outcome to reach — `HardWinterOutcome` has no `lost` and no `failed`, and
says why: *"A losable encounter would be the first dead end in a codebase that has
carefully avoided them."*

**INV-CRISIS-4 — the action economy comes from accuracy, and accuracy sizes the action
rather than deciding whether it happens.** `winterTierFor` maps a batch to one of four
rungs; the tuning table maps the rung to a magnitude. At the bottom rung a fire is still
lit, still in the state and still in the log, warding nothing — `radius_by_tier.none` is
`null`, which is *"what 'accuracy decides the magnitude, not whether it happens' looks
like at the bottom of the ladder."*

**INV-CRISIS-5 — you declare before you answer.** The commitment is locked the moment it
is made: *"committing before you know how you will do is what makes the round a gamble
rather than a score."* The reducer ignores a `declare` in any phase but `declaring`.

**INV-CRISIS-6 — consequences persist as ruins, never as deletions.** A ruined building is
a **state**, not a removal: *"they are a distinct state, not a deletion, so the building is
still there, still carries its lesson, and can be rebuilt."* Chromium asserts the product
half of that — a ruin's cell is still a `<button>`, *"still on the board and still a
control, so its lesson is still reachable"* — and the prototype's work log records that a
deleted ruin fails four tests.

**INV-CRISIS-7 — the crisis writes no mastery and gates no progression.** Carried as the
literal type `false` on the outcome. The reason is not squeamishness: *"A learner
answering under pressure with a declared action riding on it may underperform relative to
calm practice, so the winter's answers are graded honestly and then thrown away."*
Grading is real — `hardWinterItems.ts` routes through `practiceChecker`, the same global
versioned checker the lesson surfaces install — and the verdict is used to size a bonfire
and discarded.

**INV-CRISIS-8 — the crisis samples a WINDOW; the era trial covers one era exhaustively.**
*This invariant read "the crisis samples cumulatively" until 2026-07-30. D-CRISIS-14 has
since bounded the draw to a three-era window, so the heading and four sentences below were
corrected in place; §5.16 lists each one.* This is the constraint the lead described as
"the crisis tests PAST knowledge while the trial tests PRESENT", and **the code
substantially agrees, with two corrections worth making — one about which nodes, and one
about how much of the draw is past at all.** The trial is coverage:
`ERA_TRIAL_ITEMS_PER_NODE` slots for *every* node of the era, because it reports which
skills were missed and *"a sampled gate could only ever name the skills it happened to
draw."* Era one's crisis samples across `masteredNodeIds`, which its own code calls *"the
CUMULATIVE set — every node the learner has reached so far."*

**Correction one — the draw is not restricted to prior eras.** It includes the nodes of
the current era the learner has already got to. In era one, where there is no prior era,
the crisis draws entirely from era one's reached nodes.

**Correction two — the draw is bounded, and the past/present split has softened.** Under
**D-CRISIS-14** the window is the **current era plus the previous two**, weighted
**40/35/25**, so from era four onward the crisis is no longer drawing over everything
known: era one is out of era four's window entirely. And at 40% current era the crisis is
**60/40 past-to-present rather than all-past**. The softening is deliberate and is argued
at §5.15 — a crisis drawing only on older eras would feel disconnected from the chapter the
player is standing in.

**The distinction the lead is protecting survives both corrections intact**, because it
never rested on the crisis being *purely* past. The two encounters are not redundant: one
is a **wide shallow draw across a three-era window** and the other is an **exhaustive pass
over one era**, and 60/40 is still clearly distinct from a trial that is 100% present. What
does *not* survive is the subsidiary claim this invariant used to close on — that this is
*"the single rule that lets one mechanic scale from era one to era ten without a rule
change."* **D-CRISIS-14 carries two named per-era exceptions** (era one at 100% of its own
mastered nodes, era two at 40/60), so the mechanic now scales with two rule changes rather
than none. Both are exceptions to the *weights*, not to the shape of the draw, and §5.15
records why neither can be avoided.

**INV-CRISIS-9 — a short batch is refused, never served smaller.** The tier is a ratio of
what was asked, so a two-item batch would resolve `strong` at two correct instead of
three: *"Serving fewer would not shorten the round, it would widen every bonfire."*

**INV-CRISIS-10 — everything provisional is previewed before it is committed.** You never
learn a cost by having already paid it. Era one previews both the gain (`hardWinterFirePreview`
— all three tier footprints nested on the board, each clipped to the real island, with the
buildings each would reach) and the loss (`hardWinterAbandonPreview` — the ring, the
buildings that go with it, and the reclaim bill). The two provisional states are drawn in
deliberately different registers *"because confusing them would invert the decision."*

**INV-CRISIS-11 — the encounter is a pure fold over its event list.** Replayable
end-to-end; the caller supplies the RNG with **no `Math.random` fallback**, which is a
deliberate departure from the era trial and the storm because *"a default would be the one
path in the whole encounter nobody could replay."*

**INV-CRISIS-12 — identical accuracy must be able to reach different outcomes.** The
design's own success test, asserted with a gap of at least three buildings between two
plans that both score 2 of 3 in every round: *"if two learners who answer exactly the same
number of questions correctly cannot reach different endings, the mechanic is a quiz in a
costume."*

**INV-CRISIS-13 — the crisis plays over a snapshot it cannot write back.** Structural, not
promised: the engine is a pure reducer with no session handle, and the sandbox property is
measured byte-for-byte over the raw saved string.

**INV-CRISIS-14 — one tuning table, and the tests pin relationships rather than digits.**
Every magnitude lives in one file, never as a literal inside a rule. *"Change a digit and
the suite should stay green; change a relationship and it should not."*

**INV-CRISIS-15 — a number tuned against one board is not a tuned number.** The player
chooses the layout, so era one ships three and measures across all of them, dealt by a
seeded shuffled cycle so every layout is played before any repeats. See §8, where the
*real* board turned out to be a fourth shape nobody had measured.

**INV-CRISIS-16 — never hue alone.** Every state carries at least two independent
non-colour channels (a score digit and a stroke weight; a hatch and a cross). Asserted in
real Chromium against computed styles, because *"a class name is not a picture."*

**INV-CRISIS-17 — the era's land must be authored, or the crisis fails loud.** Per
**D-ERA25**; see §1. A crisis cannot be quietly pointed at an era whose ground nobody has
designed.

---

## 5. The rulings

### D-CRISIS-2 (RULED) — the Industrial crisis is the Boiler Cascade, not a Factory Revolt

**A Factory Revolt was considered and is declined.** Two independent collisions, either of
which alone would be sufficient:

1. **It duplicates an axis three ways.** A revolt is hostiles walking at your buildings,
   which is the Raid's hazard and the Robot Uprising's hazard. Three crises of ten sharing
   one hazard shape is the exact failure D-CRISIS-1 exists to prevent, and it is worse than
   two because the middle one has no distinguishing verb left to claim.
2. **It sits directly beside the Plague** as a second "a source spreads through the
   settlement" puzzle, one era later. *This read "a source infects its neighbours" as
   first written; the Plague is no longer a neighbour-spread crisis (D-CRISIS-8) and the
   wording is corrected. **The argument survives and is stronger under D-CRISIS-8, not
   weaker.*** Eras five, six and seven are already three consecutive propagation crises
   held apart only by having three different topologies; a Factory Revolt would have put
   a fourth spreading hazard into that same stretch with no fourth topology left to give
   it.

**And the positive argument is stronger than the negative one.** The Industrial era is the
first era in the sequence with a **machine network** — a thing that has upstream and
downstream. It is therefore the **only** era that can host a **dependency-order repair**
puzzle, where fixing the wrong thing first fixes nothing. An axis that only one era can
host should be spent in that era. No other crisis in the ten asks an ordering question.

### D-CRISIS-3 (RULED) — Missile Alert stays clockless

**"Arrival times" means turns or completed answers. Never real-time seconds.** There is no
exception for the crisis whose fiction most strongly suggests a countdown.

This is not a new constraint, it is INV-CRISIS-1 applied to the case that will tempt
somebody. Era one is clockless by design with tests that assert it directly, and the two
grounds are both about this crisis specifically: a mechanic that advances on a wall clock
is farmable by idling, and it cannot be tested without a fake clock. A missile timer is
also the precise shape `docs/Game_Visual_Design_Brief.md` bans — a countdown framed as
pass/fail — for an audience this product is explicitly built around.

The staggered arrivals that make the triage axis work are **fully expressible in turns**,
and are the more legible reading anyway: "this one lands in two rounds" is a fact a player
can plan against, where "this one lands in eleven seconds" is a fact they can only react
to.

### D-CRISIS-4 (RULED) — the Succession Crisis gets influence tokens

**Correct answers earn visible influence, which the player spends to secure buildings,
cancel rival claims, or sway neutral districts.**

The reason is a consistency argument across the ten. Every other crisis converts a right
answer into a **concrete action** — a fire of a particular radius, a search party, an
interceptor, a repair. Without a concrete currency, the Classical crisis would be the one
where doing the mathematics affects the outcome only abstractly, which is the failure
INV-CRISIS-12 is written against: if accuracy does not visibly buy something placed on a
board, two learners with identical accuracy cannot reach different endings for reasons they
can see.

**This is a genuine departure from era one's shape and should be recorded as one.** In the
Hard Winter, accuracy *sizes an action already declared* and nothing is banked — the tier
is spent the instant it is earned. Influence is **banked and spent later**, which makes it
the first crisis-scoped resource in the ten. Two consequences follow and are not yet
specified: whether unspent influence survives the crisis (it should not, or it becomes a
passive store and brushes INV-CRISIS-2), and whether banking weakens INV-CRISIS-5's
declare-before-you-answer gamble, since a player who can save is a player who can wait for
certainty. **No numbers are set here.**

> **BOTH CONSEQUENCES ARE NOW SPECIFIED, on two different dates and by two different
> routes.** The second was narrowed on 2026-07-30 by **D-CRISIS-16**: under neutral drift
> waiting is no longer free, so banking buys flexibility at a price rather than certainty
> outright. The first is ruled on 2026-07-31 as a consequence of **D-CRISIS-34** — **unspent
> influence survives BETWEEN CYCLES and evaporates AT THE END OF THE CRISIS** (§5.42a).
> **The leaning in the parenthesis above is upheld and is now the ruled half**: influence is
> crisis-scoped, so INV-CRISIS-2's ban on a passive store is what ends it with its crisis.
> **What the parenthesis did not anticipate is the between-cycles half**, which is the half
> that makes *banked* true of this currency at all — and it only became derivable once
> D-CRISIS-34 fixed what a cycle is.

### D-CRISIS-5 (RULED, and AMENDED 2026-07-31 by D-CRISIS-28) — the Lost Herd's stake lands on capacity, not on population

> **AMENDED 2026-07-31.** The mechanism below is unchanged and is now ruled for four
> crises rather than one: **the crisis writes to capacity and never to population.** What
> is amended is the CONSEQUENCE this section drew from that, and the amendment is kept
> beside the original because the difference is a whole product behaviour.
>
> - **What this section says:** *"What is explicitly NOT lost: earned learning progress,
>   and population itself."*
> - **What D-CRISIS-28 says:** population **is** lost, as the arithmetic consequence of the
>   ceiling falling below it, and it **returns** when capacity is restored. The lead:
>   *"people leave because there's a reduction of the capacity […] but they'll come back if
>   you increase capacity via the civic buildings."*
>
> D-CIT2 is not breached by that, and the reason is worth stating precisely rather than
> assumed: population is still a pure function of learning state *as a headcount*, and what
> the crisis moves is which of those people are **housed**. The forbidden loop D-CIT2 exists
> to prevent runs the other way — capacity feeding *arrivals* — and taking capacity to zero
> still provably cannot summon or delete a single arrival (§5.5's measurement stands
> unaltered).
>
> **The framing rule below is narrowed, not kept.** *"Never as population falls"* was
> written when population could not fall. It now can, so the rule that replaces it is:
> **never as population falls and stays down.** Describe the departure and describe the
> return in the same breath; a departure with no legible return is the punitive version,
> which is what era progression's own **O-7** already says gates the D-CIT6 reversal being
> shippable.

**The settlement does not lose population. It loses the ability to support population.**

That sentence is the ruling, and the distinction it turns on is the whole of it. **It is
also the sentence D-CRISIS-28 relaxes** — the first half is now false and the second half
is still the mechanism.

**The mechanism.** **Departure events.** Each failed search step or missed threshold causes
one. Families leave, and some existing **livability or happiness capacity becomes
unavailable**. It may surface as any of the following — these are options, not a fixed set:

- a house becoming vacant or boarded up;
- a civic building losing part of its capacity;
- a temporary capacity penalty attached to the settlement;
- several capacity slots locked until rebuilt or restored.

**What is explicitly NOT lost: earned learning progress, and population itself.**
Population remains derived from learning state exactly as `D-CIT2` requires.

**The recovery structure.** A successful partial recovery prevents the *next* departure
event. A full recovery ends the crisis. Any capacity already lost **remains afterwards as
a concrete rebuilding consequence**.

**The crisis question, in the lead's words:** *"Where do I search before families abandon
the settlement and its capacity collapses?"*

**The framing language is part of the ruling.** Describe the stake as **families leaving
behind vacant homes and weakened civic capacity**, never as *"population falls"*. The
wording is doing real work: "population falls" is the reading that breaks `D-CIT2`, and
"capacity is unavailable" is the one that does not.

#### 5.5 The three constraints this preserves, verified against the code

The ruling claims three properties. Each is checked here against the tree rather than
restated.

**(a) Population stays derived from learning state.** `D-CIT2`, quoted in full from
`2026-07-27-citizens-and-city-life-design.md` §5:

> **D-CIT2 (DECIDED): population is a pure function of learning state. No time-based
> trickle, no capacity-driven arrivals.** There is exactly one dial, and it is un-gameable:
> you cannot wait for people and you cannot farm them by building houses.
>
> - **No clock.** Nothing accrues while the tab is open. Two loads of the same state
>   produce the same city [...]
> - **No feedback from capacity.** Housing does **not** attract residents. Building a
>   second terrace would not summon anyone; it would only house people the learning already
>   brought. This is the property that keeps the crowd honest as a readout.

**The verification is stronger than a reading of the prose, because the forbidden loop is
already pinned by a test.** `citizens-population.ts` derives population from the building
ledger alone, and `citizens-invariants.test.ts` asserts the independence directly in a
block named *"capacity never gates arrivals (D-CIT2's forbidden loop)"*:

> it("keeps population identical under any capacity table, including an all-zero one")

So the *mechanical* claim is not merely consistent with D-CIT2 — it is the property D-CIT2
is enforced by. **Taking capacity to zero provably cannot move population.** A crisis whose
only write is to capacity therefore cannot reach population by the direct path, and that
is measured rather than argued. §5.6 covers the *indirect* path, which is where the real
risk is.

**(b) Nothing depends on passive time or waiting.** Departures are triggered by failed
search steps, not by elapsed anything, which is INV-CRISIS-1 and is the same shape as
D-CRISIS-3. This is also **stricter than the era progression design currently permits** —
see §5.6 — and the stricter reading is the correct one for a crisis.

**(c) The consequence bites despite there being no production stream to reduce.** Verified
from both directions. From the ruling, `2026-07-29-era-resource-model-design.md` §5.1:

> **Every unit of every resource is earned by a learner completing a lesson or completing a
> practice set. There are exactly those two channels, and there is never a third.**
>
> - **Buildings are not sources.** No building has a production rate, a yield, an output, or
>   a storage cap to fill. Nothing accrues to a building, and nothing is collected from one.

And the lead, verbatim, recorded there: *"i think there shouldn't be a generation economy
to begin with honestly - just resources on lesson completion and completing practices make
more sense. we dont need the buildings to passively produce income"*

From the code: `packages/economy/src/capacity.ts` carries no rate, no yield and no tick —
`deriveCapacities` is a sum over building contributions, and its docblock states *"A
CAPACITY IS A DERIVED READOUT, NEVER A RESOURCE [...] There is no capacity balance, no
capacity ledger row, and no way to spend livability."*

**So there is genuinely no future output for a smaller settlement to forgo, and that is
precisely why capacity is the right place for the stake.** In a game with production, the
punishment for losing people is the output they would have produced. This game has no
output, so the only thing population is *for* is being supported — livability and happiness
exist to serve it. Removing the ability to support people is therefore the only stake
available that is felt at all, and it is felt as **something you must rebuild** rather than
as a rate that has been reduced. The absence of a generation economy is not an obstacle
that the ruling works around; it is the reason the ruling is correct.

#### 5.6 Two constraints the ruling meets, and one interaction it does not yet settle

Three further findings from the code that bear on the implementation. The first two are
satisfied by the ruling as written and are recorded so an implementer does not undo them.
The third is a real unresolved interaction between two ruled documents and is carried to
§11 as **O-4**.

**The word "leaving" cannot become a citizen state, and the ruling does not need it to.**
`citizens.ts` states: *"NO STATE IN THIS UNION EXPRESSES HARM, and there is no attribute a
future contributor could set to make a citizen worse off (D-CIT6). Nobody starves, sickens,
riots, **leaves**, or dies; `waiting` is patient, not suffering."* This is enforced in the
type — `citizens-roster-invariants.test.ts` has a block named *"no harm state (D-CIT6,
enforced in the type)"* whose exhaustive switch **fails to compile** if a member is added,
and whose banned-substring list contains the literal string `"leaving"`. The obvious
implementation of "families leave" — mark some citizens as leaving — therefore does not
compile against a shipped guard. **The ruling's framing already avoids this**: the
departure is expressed as capacity becoming unavailable and as homes standing vacant, which
is a fact about buildings, not a state on a person. Recorded because the guard is easy to
meet and easy to trip.

**The capacity penalty must consume headroom, not occupied capacity.** `citizens.ts`
houses the lowest `min(population, capacity)` indices and derives its no-eviction guarantee
structurally from capacity being monotone: *"Because capacity is monotone (mastery is
monotone, placement is monotone) and population only grows by appending higher indices, a
citizen who was housed is STILL housed."* A crisis that lowers capacity **below current
population** breaks the premise of that argument, and citizens who were housed become
`waiting`. The existing no-eviction sweep quantifies over *learning advances* only, so it
would stay green while the product behaviour changed — a guard scoped to the mechanism
rather than to the behaviour. **The clean resolution, and the one this document
recommends:** cap the crisis penalty at the available headroom, so a departure event can
only ever consume capacity that nobody is currently using. That is also the reading that
matches the fiction — a family leaves, *their* home stands empty — and it satisfies the
no-eviction guarantee by construction rather than by tuning.

> **OVERRULED 2026-07-31 by D-CRISIS-28 — the headroom cap is not adopted.** The paragraph
> above is left standing because two open questions were resting on its recommendation and a
> reader needs to see which way the decision went. Three of its four claims survive intact;
> only the recommendation is dead.
>
> - **The diagnosis is CORRECT and is now the design.** A crisis that lowers capacity below
>   population does move housed citizens into `waiting`, and the lead has ruled that this is
>   what should happen. Measured at `03d5a2b9` rather than predicted: a capacity-only cut of
>   16 on a settled island takes it from `population=44 capacity=44 housed=44 waiting=0` to
>   `population=44 capacity=28 housed=28 waiting=16`, with **no throw, no clamp, and nobody
>   deleted from the roster** (§5.28).
> - **The claim about the guard is CORRECT, and it was worth measuring because it is the
>   load-bearing one.** With that defect live, `citizens-roster-invariants.test.ts` reports
>   **8 passed, 0 failed** — including its own *"keeps every housed citizen housed"* — and
>   the whole citizens and solvency set reports **65 passed across 8 files** (§5.29).
> - **The fiction argument survives and now cuts the other way.** *A family leaves, their
>   home stands empty* is one honest picture; *a home is lost, so the family that lived in it
>   has nowhere to go* is the other, and it is the one the lead's word **"leave"** describes.
> - **The recommendation is OVERRULED**, and what it would have cost is why. Capping the
>   penalty at headroom means a crisis can be **refused** — O-9's collision with
>   INV-CRISIS-3, where a containment move the player needs is declined and the board stops
>   progressing toward its own terminal condition. The cap bought a monotonicity premise and
>   sold a winnability guarantee. D-CRISIS-28 keeps the guarantee and pays for the premise by
>   amending it (`citizens.ts`, and the citizens design's AMENDMENT 3).

**The unsettled interaction: `INV-ERA-4` and the shortfall-to-departure link.** Two things
in `2026-07-27-era-progression-design.md` bear on this and pull in different directions
from the citizens design.

- Its **2026-07-27 amendment banner** reverses D-CIT6 in part: *"**What is reversed:** 'no
  number goes down' and 'no citizen ever leaves'. Population is no longer monotone in
  learning state, and the departure path is a real one."* So departures are already a ruled
  concept, and the Lost Herd is reusing existing vocabulary rather than inventing it —
  which is what §2 asks of it. But that document's departures are **driven by a capacity
  shortfall** and **measured in play time** (§8: *"roughly one per ten minutes of play,
  after a ten-minute grace period"*). If that link is ever implemented as written, a crisis
  that cuts livability creates a shortfall, and the shortfall produces departures, and
  population falls — by a second-order path, arriving at exactly the outcome D-CRISIS-5's
  framing exists to prevent. The headroom cap above closes this too, which is a second
  independent argument for it.

  > **RESOLVED 2026-07-31 by D-CRISIS-28 — the second-order path is the FIRST-ORDER
  > mechanism now.** This bullet reads the shortfall-to-departure link as a leak to be
  > closed. The lead has ruled it is the design: a crisis cuts capacity, the shortfall is
  > real, and people leave. Two things about the era design's version of it are **not**
  > carried over, and both matter to an implementer. Its departures are metered *"roughly
  > one per ten minutes of play, after a ten-minute grace period"* — **the metering is not
  > ruled** (O-21), and the ruled part is a state comparison rather than a rate, which is
  > the reading INV-CRISIS-1 and the clockless roster already require. And its reversal
  > banner puts the trigger in **happiness** (*"unhappy citizens leave"*); D-CRISIS-28 puts
  > it in **livability**, which is the capacity a civic building buys and the capacity
  > `civicCityCapacities` already withholds when a placement is suspended.
- **INV-ERA-4 / D-ERA15**: *"the game never manufactures a shortfall the player could not
  have prevented"*, elaborated as *"A shortfall therefore only ever originates in an
  allocation choice."* A crisis-induced shortfall does not originate in an allocation
  choice; it originates in a failed search step. **The defensible reading is that a failed
  search step *is* a preventable choice** — the player chose where to look, with the
  information in hand, and INV-CRISIS-3 guarantees they always had a legal and better
  move available. That reading holds only as long as no-dead-ends holds, which ties
  INV-ERA-4's satisfaction to a constraint already inherited. It should be stated in
  D-ERA15's own terms by whoever owns that document rather than assumed here.

### D-CRISIS-6 (DECLINED, recorded so it is not re-proposed) — the earthquake's prepare-before-impact mechanic is not restored

**Considered and declined.** Hard Winter already covers advance preparation, and covers it
as its entire premise rather than as a phase: every action in era one is taken **before**
the frost arrives at the thing it protects, the first frost advance happens at the end of
round one *"so round one is a real decision and not a cutscene"*, and INV-CRISIS-5 makes
the commitment binding before the batch is even seen. A prepare-before-impact crisis would
be era one's axis with a different hazard painted on it, which is D-CRISIS-1's stated
failure mode.

### D-CRISIS-7 (RULED) — the failure floor

> **Crises can damage, disable, scar, or reduce capacity, but they cannot undo mastery or
> permanently remove an earned building.**

**Permitted consequences.** Buildings become temporarily unusable; civic capacity is
reduced; structures need repairs; districts gain visible scars; resources are lost; the
player begins the next era at a disadvantage; optional upgrades are delayed.

**Always preserved.** Completed lessons, earned skill buildings, unlocked eras, permanent
city history.

**The floor, in the lead's words:** *"You survive, but the city carries the consequences."*
Not *"you lose the era."*

**This is a design constraint on all nine unbuilt crises, not a description of era one.**
Any crisis whose stakes reach mastery, an earned skill building, an unlocked era or city
history is **out of bounds by construction** and does not need to be argued about on its
merits. §7 rechecks all ten against it.

**It also settles the repairability question across the board: crisis damage is
repairable.** The apparent divergence between era one's permanent damage and era two's
restorable capacity does not exist — see §6, which finds that era one's own constants
already say repairable and only its prose says otherwise.

**D-CRISIS-5 is inside the permitted list, and the two rulings agree.** Locked capacity
restored through later event-driven actions is *"civic capacity is reduced"* plus
*"structures need repairs"*, both named permissions, and the Lost Herd explicitly preserves
learning progress and population. Stated here so a reader does not have to check.

### D-CRISIS-8 (RULED) — the Great Fire and the Plague separate on two axes, and the three propagation crises get three topologies

**The two crises separate on TWO axes at once: what the propagation follows, and what the
player sacrifices.**

Either axis alone would be a thin separation — a player can be forgiven for not noticing
that one graph is undirected and another is not. Both together is a different encounter,
because the second axis is the one the player *feels*: era five ends with a hole in the
city and a bill, era six ends with the city intact and a memory of having closed it.

#### The Great Fire (era five) — *what do I destroy to stop the flames?*

- Fire spreads **only through adjacent buildings** — strictly tile-based.
- The player **demolishes buildings** to create firebreaks.
- Destroyed buildings **remain damaged after the crisis**.
- Recovery costs materials or rebuilding actions.
- The player is sacrificing **structures**.

#### Plague (era six) — *what do I shut down, and for how long?*

- Buildings become infected **through use or shared routes, not tile adjacency**.
- The player **closes gathering places, quarantines buildings, and suspends routes**.
- Closed buildings **temporarily lose their livability or happiness capacity**.
- **Nothing is destroyed.** Capacity returns when the outbreak ends.
- The player is sacrificing **access and capacity**.

#### The contrast, in the lead's words

- **Fire:** permanent physical loss to contain a visible grid threat.
- **Plague:** temporary social shutdown to manage a partly hidden movement network.

#### The implementation, and simplicity is a CONSTRAINT on it rather than a preference

The spread-through-use version is the ruled one, and it is ruled **with a bound attached**:
give each active public building **a few visible links** to the places its residents
visit. Plague travels along those links. Fire stays strictly tile-based.

> **"A few visible links" is the whole of it.** This is a constraint, not a suggestion.
> The lead named simplicity as a **condition of choosing this version** — the
> spread-through-use design was selected *because* it could be done with a handful of
> drawn lines, so an implementation that needs more than that has not implemented the
> ruling, it has replaced it.

**Do not let this grow into a simulation.** The failure mode is specific and worth naming
so it can be recognised early: no commuter agents, no per-citizen itineraries, no
trip volumes, no schedules, no exposure counters, no probability of transmission per
visit. A link either exists or does not; it is either open or suspended. Anything that
requires the player to reason about *how much* traffic a link carries has crossed the
line. Note also that INV-CRISIS-1 already forbids the most tempting version of the
over-build — links that vary with elapsed time are out on clocklessness grounds before
they are out on simplicity grounds.

**Two of the lead's sentences need reconciling, and the reconciliation is load-bearing.**
The contrast calls the movement network *"partly hidden"* while the implementation calls
the links *"visible"*. Both are ruled, so neither can simply be dropped. The reading that
makes both sentences true is that **the links are visible and the infection travelling
along them is not** — you can see the network and cannot see everywhere the disease has
already reached. That is the era-nine kind of hidden state ("unknown status of a visible
thing"), not the era-two kind ("unknown location"), and §9 already keeps those two apart
as different machinery. The alternative reading — that some links are themselves unknown
until used — is *not* ruled and is carried as **O-10**.

#### 5.7 The three topologies — the durable rule, and the one a future reader actually needs

The per-era detail above will be re-derived by whoever builds each crisis. **This table is
the part that must survive them**, because it is the only thing standing between the
middle third of the game and one puzzle played three times.

| Crisis | Propagation follows |
| --- | --- |
| **Great Fire (5)** | **adjacency** — tiles touching tiles |
| **Plague (6)** | **human movement** — links between buildings people use |
| **Boiler Cascade (7)** | **machine dependencies** — downstream failure through a network |

**This is what stops three consecutive eras being one puzzle.** Eras five, six and seven
are all "something spreads, contain it". Nothing else separates them at the level a player
perceives: not the fiction, not the hazard shape, not the fact that all three ask you to
intervene in a spreading process. What separates them is that the player has to learn a
**different structure** to reason about each one — where things physically touch, where
people go, and what feeds what.

**A future change to any of the three must preserve the distinction.** Three concrete
violations, so the rule is checkable rather than admired:

1. **Giving the Great Fire a link layer** — for example, letting fire jump between
   buildings connected by a road or a route. Fire and Plague then run on the same
   structure and era five has nothing left of its own but the sacrifice axis.
2. **Deriving the Plague's links from tile positions** — the obvious shortcut when nobody
   has authored a visit list yet, and it silently turns the Plague back into the Fire.
   Links must come from *who visits where*, and buildings joined by a link need not be
   near each other. That two linked buildings can sit on opposite sides of the settlement
   is the whole point of the topology, not an incidental property of it.
3. **Making the Cascade undirected** — which removes the only structure that can host an
   ordering question, and is already ruled against for an independent reason in
   D-CRISIS-2.

**Only the first of those three would look like a simplification to the person making it**,
which is why it is written down here rather than left to reviewer instinct.

#### 5.8 Consequence one — the Plague's build cost changed, and so should its place in the build order

**Under this ruling the Plague needs three things**, checked against §9's capabilities list
rather than asserted:

| What it needs | §9's row before this amendment | Status at `769f704` |
| --- | --- | --- |
| **Capacity locking** — a penalty term that suspends part of a building's contribution | *"Repair: restoring locked capacity"*, listed as needed by **2 only** | **Does not exist.** `deriveCapacities` is still a pure sum over contributions with no penalty term and no restore path — re-read at this tip, and the §9 row's own wording is still accurate |
| **A visible link layer** — drawn building-to-building edges | Folded into *"Undirected adjacency graph over buildings"*, needed by **5, 6** | **Does not exist**, and the row was **wrong**: it put the Plague on the Fire's structure. Split in §9 by this amendment |
| **Its own spread rule** — a walk that carries infection along those edges | **No row at all.** §9 listed the graphs and never the traversal over them | **Does not exist.** Added as a row by this amendment; era one's `winterSpreadSteps` orthogonal flood over *cells* is the nearest thing that does |

**The first of those is shared with era two, the second with era seven, and only the third
is the Plague's alone.** That is the whole scheduling story, and it cuts both ways hard:

- **Built early, the Plague is the most machinery-dependent crisis of the ten.** Three
  distinct systems have to exist before it can be played at all, and at that point in the
  schedule it pays for all three. No other crisis in the ten needs three.
- **Built after eras two and seven, it is nearly free.** Era two has already paid for the
  capacity penalty term; era seven has already paid for the link layer and for a walk over
  it. What remains is an edge set authored from visit lists, a flag turning the walk
  undirected, and an infection rule — a re-parameterisation of machinery that is already
  standing, not a new system.

**This does not contradict §9's finding that the Succession Crisis is the most expensive of
the nine, and the two claims are about different things.** Era four's two systems (faction
ownership, banked currency) are **single-use**: no other crisis wants them, so era four
costs the same wherever it is scheduled. Era six's three are **all shared**, so its cost
swings from the highest in the ten to almost nothing depending only on order. **Era four is
the most expensive crisis; era six is the most schedule-sensitive one.** Both facts belong
to O-3.

**The recommended order, and the one trap in it.** Repair first, as §9 already argues, then
era two, then era seven, then era six. But **shipping in era order puts six before seven**,
and a player meets era six first, so the realistic schedule is the one where **era six pays
for the link layer and era seven inherits it**. That is fine — provided whoever builds it
**builds the direction flag up front**. A link layer scoped as "undirected lines, because
that is all the Plague needs" is a layer era seven has to reopen and re-specify, and
directionality is cheap to design in and expensive to retrofit into hit-testing, routing
and the preview.

#### 5.9 Consequence two — can the link layer be shared with the Boiler Cascade?

**Evaluated, not assumed. The verdict is yes, with one asymmetry that must be scoped in
from the start.**

The question is whether the Plague's human-movement links and the Cascade's machine
dependencies are the same rendering primitive with different semantics. They are, and the
reason is that the **expensive** parts are identical while the parts that differ are
parameters:

**What the shared primitive is** — an *edge layer over buildings*:

- routing a line between two building anchors across the board without occluding either;
- hit-testing a thin diagonal target so an edge can be pointed at;
- per-edge visual state in **at least two independent non-colour channels**, which is
  INV-CRISIS-16 and applies to an edge exactly as it applies to a cell;
- a **direction flag** with a marker for the directed case;
- a reachability walk from a source, which is what both eras' previews are made of —
  INV-CRISIS-10 requires the player to see what an action *would* reach before committing,
  and "what does this reach from here" is one function for both.

**What era six supplies on top:** an undirected edge set authored from *which places these
residents visit*; the infection rule; node states (open/closed, healthy/infected); the
temporary-capacity semantics; and **edge selection as a player verb**, because suspending a
route is a click on a line.

**What era seven supplies on top:** a directed edge set derived from *machine dependency*;
the downstream-failure rule; node states (working/failed/repaired); and node selection
only.

**The asymmetry, and it is the thing to scope in early: only era six's player verb acts on
an edge.** Era seven's verb is *repair*, and repair is aimed at a node — its edges are
read, never touched. So edge hit-testing and edge selection are era six's alone. If era
seven builds the layer first (which §5.8 argues it should not), it has no reason to make an
edge clickable, and era six then has to retrofit interaction into a render-only layer. **A
layer built for either era should be built with edges selectable and directional, or the
second era pays twice.**

**The one genuine objection, and why sharing still wins.** The semantics are not merely
different, they are **opposite in valence**: the Plague's edges are a hazard vector the
player wants to *cut*, and the Cascade's are a supply line the player wants *intact*. An
identical visual language across the two eras would invite the player to read era seven's
network as something to sever — the correct move in era six and the destructive one in era
seven. **This does not defeat sharing; it adds a parameter.** The two eras need visibly
different edge treatments, which is a styling axis over one implementation rather than a
second implementation. **The spec already contains the precedent for exactly this
mistake**, one level down: INV-CRISIS-10 records that era one draws its gain preview and
its loss preview in *"deliberately different registers"* because *"confusing them would
invert the decision."* The same sentence applies verbatim to two networks whose edges mean
opposite things.

**And the negative half of the verdict, which matters as much: era five must NOT be on this
layer.** The Fire's adjacency is *derived from tile positions* and is never drawn as a
link; it needs a cell-neighbour lookup, which era one's frost flood already substantially
is, and no edge rendering whatsoever. Putting the Fire onto the edge layer would be the
cheapest-looking unification available to a future tidier and it is violation (1) of §5.7.
**§9 therefore keeps the Fire on a different row from the other two on purpose**, and the
separation is load-bearing rather than an artefact of how the table was written.

#### 5.10 The floor check, and how the Plague's capacity differs from the Lost Herd's

**Does the Plague's capacity suspension sit inside the failure floor? Yes, and by the
floor's own wording rather than by a reading of its spirit.** D-CRISIS-7's permitted list
is quoted in §5 above; the Plague matches **two of its named permissions verbatim** —
*"buildings become temporarily unusable"* is precisely what a quarantined building is, and
*"civic capacity is reduced"* is precisely what a closure does. Nothing new has to be
permitted for era six.

**The "always preserved" half is not merely satisfied, it is unreachable.** That list is
*completed lessons, earned skill buildings, unlocked eras, permanent city history*. Under
D-CRISIS-8 the Plague **destroys nothing** — it has no destructive verb at all — so unlike
the Great Fire, the Raid and the Missile Alert, there is no implementation slip that could
remove a building, because there is no removal in its vocabulary to slip with. **Of the ten,
the Plague now sits furthest inside the floor.**

**A structural confirmation stronger than the prose, verified at `769f704`.**
`packages/economy/src/capacity.ts`:

> INV-COS-1 still holds over all of it: **a shortfall gates nothing** — not a lesson, not
> mastery, not the trial, not the era advance. A hungry city is a management problem.
> Nothing in this file returns a boolean anything could gate on.

and `capacity.test.ts` pins the shape rather than the intent, in a test named *"never
returns anything shaped like a gate (INV-COS-1)"* which asserts that no field of a
shortfall report is a boolean. **So a capacity suspension cannot reach mastery or an era
advance by any path the code permits.** That is measured, not argued.

**§7's warning about the Plague still stands, and now has a compiled guard behind it.** §7
calls the Plague *"the crisis most likely to breach the floor by accident"* because the
natural implementation of a plague is that population falls. D-CRISIS-8 does not remove
that temptation — it narrows the surface to exactly one hole, and **that hole is already
nailed shut in the type system.** `engines/game/src/citizens.ts`, re-read at this tip:

> NO STATE IN THIS UNION EXPRESSES HARM [...] Nobody starves, **sickens**, riots, leaves,
> or dies; `waiting` is patient, not suffering.

and `citizens-roster-invariants.test.ts` carries the banned-substring list
`["homeless", "unhoused", "failing", "sick", "leaving"]` over an exhaustive switch whose
own comment reads *"a future contributor cannot add `sick`, `angry`, or `leaving` without
arriving here first"* — and the switch **fails to compile** if a member is added. **The
obvious era-six implementation, a `sick` citizen state, does not compile, and a description
containing the word fails a shipped assertion.** This is the same guard, and the same
shape of finding, that §5.6 recorded for era two's *"leaving"*. It is the single most
useful thing to hand an era-six implementer, and like era two's, the ruling's framing
already avoids it: infection is a state on a **building**, never on a person.

**How the two capacity crises differ, now that both land on capacity.** D-CRISIS-5 and
D-CRISIS-8 both take their stake out of livability and happiness, so the spec owes a reader
the difference. There are four, and the first is the load-bearing one:

| | **Lost Herd (2)** | **Plague (6)** |
| --- | --- | --- |
| **What triggers it** | A **failed search step** or a missed threshold. Capacity loss is the *consequence of failing* | The **player's own containment choice**. Capacity loss is the *price of the answer*, not a punishment for a wrong one |
| **How it ends** | A repair action later, at a cost. It *"remains afterwards as a concrete rebuilding consequence"* | It **lifts when the outbreak ends**. No bill, no action |
| **After the crisis** | Persists into the next era | Gone |
| **What it means** | The settlement **loses** the ability to support people | The settlement **withholds** an ability it still has |

**That difference is real and it is why the two need the same machinery for one half and
different machinery for the other.** Both need the missing penalty term on
`deriveCapacities`. Only era two needs the restore to be a purchasable action; era six's
restore is a consequence of resolving the crisis, which is strictly the cheaper of the two.
It also means the Plague is **the only crisis of the ten that leaves no trace once it is
over** — every other permitted consequence in D-CRISIS-7 outlives its crisis. Whether that
is intended or whether era six wants some residue is carried as **O-10**.

**One interaction the ruling does not settle, and it is inherited from §5.6.** That section
recommends capping a crisis's capacity penalty at the settlement's available **headroom**,
so a penalty can only ever consume capacity nobody is using and the no-eviction guarantee
in `citizens.ts` survives by construction. Applied to the Plague the recommendation
collides with itself: a closure the player *needs* to make to contain the outbreak might
exceed the headroom and be refused, and INV-CRISIS-3's second half forbids a board that
cannot be won. Carried as **O-9**, with the argument on both sides recorded there.

#### 5.11 Every place this document described the Plague as adjacency-spread, and what it now says

Swept and corrected, so the document does not contradict its own amendment. Listed rather
than silently fixed, because a reader who remembers the old wording needs to know it was
deliberate.

| § | Was | Now |
| --- | --- | --- |
| **§3**, near-collisions | *"**Great Fire (5) and Plague (6) both spread neighbour to neighbour.**"* | Rewritten to *"both spread from a source to what is connected to it"*, with the two separating axes spelled out and the old sentence quoted as superseded |
| **§3**, near-collisions | Cascade/Plague bullet described the graphs but not their **edges** | Extended: the Plague's edges are *human movement*, the Cascade's are *machine dependencies*, and the pair is flagged as now closer in machinery and further apart in semantics |
| **§3**, the ten table | Era six's decision read *"Where do I cut the chain?"* | *"What do I shut down, and for how long?"* — the lead's own question, which adds a **duration** the old wording did not carry |
| **§5**, D-CRISIS-2 | a second **"a source infects its neighbours"** puzzle | a second **"a source spreads through the settlement"** puzzle. The decline argument survives and is **stronger** under D-CRISIS-8, and that is stated in place |
| **§7**, entry 6 | *"**Spread runs through adjacency and gathering places.**"* | Rewritten to the link topology, with the floor check and the capacity distinction added |
| **§8**, tuning | The Plague was named as one of three crises *"whose axes depend most directly on buildings being far enough apart"* | Corrected — the Plague's axis is now **independent of physical spacing**, which changes what it must be tuned against |
| **§9**, capabilities | *"Undirected adjacency graph over buildings \| 5, 6"* | **Split.** Tile adjacency (5) and the link layer (6, 7) are different rows, plus a new propagation-rule row and era six added to capacity locking |

**Two things were checked and deliberately left alone.** §2's *"two crises that both spread
through adjacency look, to someone tidying up, like one crisis with two coats of paint"* is
a **general** statement of D-CRISIS-1 and remains true as written; a pointer to D-CRISIS-8
as its worked example was added rather than the sentence changed. And §3's axis column for
era six, *"Topology — severing connections, not defending places"*, was already correct
under this ruling and is the one place the document never said adjacency.

### D-CRISIS-9 (RULED) — the crisis fires after `ceil(n / 2)` of that era's own nodes, which is what "the median, rounded up" means

**Not a fixed node index, and not a fraction of the era. The trigger is derived from the
era's own size**, so an era that gains or loses a node moves its own crisis and no table
needs editing.

**The arithmetic is `ceil(n / 2)` and the lead's worked examples are what fix it.** An era of
five or six nodes fires after **3**; an era of nine fires after **5**. Written down because
*"the median, rounded up"* read literally on an **even** count gives 3.5 → **4**, and that
reading would move the four six-node eras — **one, six, seven and nine** — off the trigger
the lead named. The odd counts agree under either reading, so the ambiguity is invisible in
five of the ten and changes four of the rest. Three of the lead's own statements select
`ceil(n / 2)` against it: *five or six → 3*, *nine → 5*, and *eight of the ten fire at three*.
**An implementer should code `ceil(n / 2)` and not the English sentence.**

#### 5.12 The trigger, against the shipped era table

Derived from `packages/skill-graph/src/eras.ts:139-261` at `6abf299` rather than from the
brief, because the whole point of a size-derived trigger is that it tracks a table that
moves:

| Era | Nodes | Fires after |
| --- | --: | --: |
| 1 Prehistoric | 6 | **3** |
| 2 Neolithic | 5 | **3** |
| 3 Bronze Age | 5 | **3** |
| 4 Classical | 5 | **3** |
| 5 Medieval | 5 | **3** |
| 6 Early Modern | 6 | **3** |
| 7 Industrial | 6 | **3** |
| 8 Atomic Age | **9** | **5** |
| 9 Information Age | 6 | **3** |
| 10 Cyberpunk | **9** | **5** |

**Eight of the ten fire at three, and only eras eight and ten differ** — which is the
lead's claim, and it reproduces exactly. The node counts sum to 62, matching the
sixty-two-node figure §8 already quotes. `ERA_MIN_NODES` is 3 and `ERA_MAX_NODES` is 9
(`eras.ts:264-265`), so the trigger's range is bounded at **2 to 5** by the pacing band
whatever future authoring does, and there is no era size that could put the crisis at the
very first node.

**Era one's figure is the one that matters today**, because era one is the only era with
authored items: **3 of its 6 nodes are mastered at the trigger**, which is the number
D-CRISIS-14's era-one exception is sized against.

> **NARROWED 2026-07-31 by D-CRISIS-31, and the arithmetic is untouched.** The table above is
> derived from `ERA_SEQUENCE` and stays whole: `ceil(n / 2)` answers for every era whether or
> not that era has a crisis, and `crisisTriggerForNodeCount` is deliberately exported so it can
> be tested at counts no era holds. **What changes is which rows describe a crisis anyone will
> meet.** In scope: **era 1 fires after 3** (of 6), **era 4 after 3** (of 5), **era 7 after 3**
> (of 6) and **era 10 after 5** (of 9). So *"eight of the ten fire at three"* is still the
> lead's claim about the table and is no longer a claim about the game: **three of the four fire
> at three, and era ten is the one that differs.** The 62-node sum and the 2-to-5 bound are
> facts about `eras.ts` and are unaffected. **`midEraCrisisCall` still reports a standing call
> for all ten eras — measured, and carried as O-23.**
>
> **RE-DERIVED 2026-07-31 by D-CRISIS-33, over `eras.ts` at `db2b18c2`, and the result is cleaner
> than the set it replaces.** In scope: **era 1 fires after 3** (of 6), **era 4 after 3** (of 5),
> **era 6 after 3** (of 6) and **era 9 after 3** (of 6). **All four fire at three.** Era ten was
> the only member of the old set that differed, and shelving it removes the exception — so *"eight
> of the ten fire at three"* remains the lead's claim about the table, and the claim about the game
> is now simply **the crisis always fires after three of the era's own nodes**. That is worth
> knowing before anything is tuned: a pacing intuition formed on era one transfers to all three
> unbuilt crises without adjustment, which was not true when era ten was in the set. The arithmetic
> itself is untouched, `crisisTriggerForNodeCount` still answers for counts no era holds, and
> **O-23 is unaffected in kind.**

### D-CRISIS-10 (RULED) — the crisis announces itself, and the player chooses when to answer the call

**Unexpected, but never an interruption.** The crisis arrives without warning and then
waits. A player who is mid-lesson finishes the lesson.

**The reasoning is the ruling and should not be summarised away.** *A crisis sprung on
someone mid-thought is hostile; a crisis you choose to face is a decision.* Those are two
different products built out of the same content. The first one takes a learner who was
three steps into a worked solution and spends their attention without asking, which is a
cost the encounter did not earn and cannot repay. The second one puts the decision to enter
inside the same frame as every decision the crisis then asks.

**This is also the only entry model consistent with the constraints already inherited.**
Three of them, and each independently rules out the interrupt:

- **INV-CRISIS-1 (clockless).** An interrupt has to fire *at* some moment. Anything that
  fires at a moment is either keyed to a clock, which is forbidden outright, or keyed to an
  event — and if it is keyed to an event, the honest design is to let the player see the
  announcement and pick their own moment, because the alternative is an event-keyed
  interrupt that feels like a clock to the person it happens to.
- **INV-CRISIS-3 (no dead ends), whose first half is that a refusal is never a
  consequence.** Era one enforces it by identity: `hardWinterReducer` returns *the same
  state object* for an out-of-phase event. A crisis that interrupted a lesson would make
  *not being ready* into a consequence, which is the same defect one level up.
- **INV-CRISIS-10 (everything provisional is previewed before it is committed).** An
  announcement the player can inspect before accepting is that discipline applied to the
  encounter as a whole rather than to the actions inside it. You never learn what a crisis
  costs by having already entered it.

**What is not settled: whether the call can be left unanswered indefinitely.** The
announcement waits, and nothing here says whether era advancement waits with it. Carried as
**O-13**, and it is a real hole rather than a detail — see §5.13, whose whole claim is that
no crisis is unbounded, which is a claim about a crisis in progress and not about one on the
doorstep.

> **SETTLED 2026-07-31 by the team lead — see D-CRISIS-35 (§5.43). The call can be left
> unanswered indefinitely and it COSTS THE WHOLE CITY while it is.** The announcement still
> waits, exactly as this section rules; what is now decided is what the player may do while it
> waits, and the answer is **nothing in the city and everything in the lessons**. No building of
> any kind, no road laying, no civic purchases, no moving of placed buildings, until they enter.
> **Era advancement waits with it**, which is the half this section named and left open — and it
> is ruled as its own clause rather than derived from the freeze, because the advance is gated on
> mastery plus the trial and neither is a build action (§5.43b).
>
> **Every word of this section survives, and one reading of its title does not.** *The crisis
> announces itself and the player chooses when to answer the call* is still true and is still the
> product: the crisis never interrupts, a player mid-lesson still finishes the lesson, and the
> moment of entry is still theirs to pick. **What is no longer true is the stronger reading — that
> the choice includes never.** *When* is the player's; *whether* is not.
>
> **The three constraints this section leans on are unharmed, and the third is why the freeze
> could be ruled at all.** **INV-CRISIS-1**: the freeze is keyed on a standing call and released
> by entry, so it reads no clock and expires on no timer — a frozen city stays frozen for as long
> as the player likes, at no rising cost. **INV-CRISIS-3**: a refusal is still never a
> consequence, because the freeze is not a consequence of refusing but the state the call puts
> the city in, and the exit is always available and always the same one action. **INV-CRISIS-10**:
> the terms are still previewed before they are accepted — the freeze does not close the advisor's
> card, so *you never learn what a crisis costs by having already entered it* holds unchanged.

### D-CRISIS-11 (RULED) — three duration shapes, and NO crisis is unbounded

**Every one of the ten ends, and each ends for one of exactly three reasons.**

#### 5.13 The three shapes, and which crisis takes which

| Shape | Crises | What ends it |
| --- | --- | --- |
| **Survive until it ends** | **Hard Winter** (1), **Missile Alert** (8) | A genuine fixed length. Winter is a season; the counters reach zero |
| **Supply-exhaustion terminated** | **Great Fire** (5), **Plague** (6), **Raid** (3), **Robot Uprising** (10) | The threat has a finite quantity and ends when it is spent |
| **Solve it** | **Lost Herd** (2), **Succession** (4), **Boiler Cascade** (7), **Intrusion** (9) | A state the player brings about |

> **NARROWED 2026-07-31 by D-CRISIS-31.** All ten keep their shape, because a shelved crisis
> whose duration is unruled is a crisis somebody has to re-derive. **In the shipping set the
> three shapes are lopsided and that is worth knowing before anything is built:** *survive until
> it ends* holds **era 1 alone** (era 8 is shelved), *supply-exhaustion terminated* holds **era
> 10 alone** (eras 5, 6 and 3 are shelved), and *solve it* holds **eras 4 and 7** (eras 2 and 9
> are shelved). So the surviving four are one of each shape plus one — which is a variety
> argument the ruling gets for free, and a reason the four were picked well. **The two
> unstated solve conditions, O-15 and O-16, split across the line:** era seven's is in scope and
> era nine's is shelved, so **O-15 is live and O-16 is deferred with its crisis.**
>
> **RE-POINTED 2026-07-31 by D-CRISIS-33, and the shape of the finding survives the set change
> exactly.** *Survive until it ends* still holds **era 1 alone** (era 8 remains shelved);
> *supply-exhaustion terminated* now holds **era 6 alone** (eras 5, 3 and now 10 are shelved); and
> *solve it* now holds **eras 4 and 9** (eras 2 and now 7 are shelved). **So the surviving four are
> still one of each shape plus one**, and the variety argument the earlier note called free is free
> again — which is a real check on the new set rather than a restatement, because nothing about the
> lead's reasons for it was about duration shapes.
>
> **The two unstated solve conditions SWAP SIDES, and this is the one consequence a summary will
> get backwards.** Era seven's is now shelved and era nine's is now in scope, so **O-15 goes DORMANT
> and O-16 is live.** O-16 inherits what O-15 held: it is now the sharpest live gap in an unbuilt
> in-scope design, and its own row already calls the boundedness argument it asks for *"the hardest
> single piece of analysis owed"* — which was a reason to keep it while it slept and is now a
> reason to schedule it. **Era six's terminal condition is stated** (*no infected building has an
> active link to a clean one*), so the supply-exhaustion member of the shipping set arrives with its
> exit already ruled.

**The supply-exhaustion terminal conditions, stated rather than implied**, because "it runs
out" is not a specification:

- **Great Fire** — when **no burning building has an unburnt neighbour**. Tile adjacency, per
  D-CRISIS-8.
- **Plague** — when **no infected building has an active link to a clean one**. The link
  layer, per D-CRISIS-8. Note this makes *suspending routes* a way to shorten the crisis
  and not merely to limit it, which is a sharper reading of era six's *"and for how long?"*
  than O-10 currently records.
- **Raid** — when raiders are **defeated, diverted, or reach their objective**. Three
  endings, and the third is an ending rather than a loss (INV-CRISIS-3 has no `lost`
  outcome to reach); §7's caveat applies, so an objective reached must scar or loot, never
  delete.
- **Robot Uprising** — when **every robot is trapped or destroyed, or the city is dark**.
  The second clause is the era-ten inversion (D-CRISIS-23) doubling as a terminal
  condition, and it too must be an ending with consequences rather than a failure.

**Succession's terminal condition is supplied by its own stakes mechanism:** the crisis
settles **when no district remains neutral** (D-CRISIS-16). That is the cleanest of the
four solve-it endings because the mechanism that creates the pressure is the same one that
guarantees the end. **The Lost Herd's** is already ruled — *"A full recovery ends the
crisis"* (D-CRISIS-5).

**Two of the four solve-it crises have no stated solve condition: the Boiler Cascade and
Intrusion.** Their category is ruled and their exit is not, which is exactly the gap a
section claiming boundedness cannot leave open. They are not invented here. Carried as
**O-15** and **O-16**.

**"No crisis is unbounded" and INV-CRISIS-3 are the same guarantee from opposite sides, and
recording both is not redundancy.** INV-CRISIS-3 says *no board is unwinnable* — from any
state a legal, better move exists. This says *no board is unendable* — from any state, play
terminates. Neither implies the other. A crisis could be winnable at every step and still
never finish, if the threat regenerates as fast as it is contained; and a crisis could
terminate reliably and still have states with nothing worth doing. **The pair is what makes
"you survive, but the city carries the consequences" (D-CRISIS-7) a sentence about every
crisis rather than an aspiration**, because *survive* presupposes an end and *the city
carries* presupposes something left to carry it.

**Where the two interact is the place to watch**, and it is not hypothetical: **O-9**
already records the collision for era six, where capping closures at available headroom
protects the citizens invariant and may refuse a containment move the player needs, risking
the unwinnable board. The boundedness claim adds a second edge to the same question — a
refused closure also means an infected building keeps an active link, so the crisis does not
progress toward its own terminal condition either. **O-9 is now a boundedness question as
well as a winnability one**, and that is recorded there.

### D-CRISIS-12 (RULED) — the recovery-cost bound

> **For a player making a genuine attempt, the maximum plausible crisis recovery cost must
> not exceed the resources normally earnable before era advancement.**

**The lead corrected his own wording while ruling it, and the correction is the load-bearing
part.** He first said *income*, then replaced it with **"resources still earnable through
normal remaining play"** — because **there is no income.** This is not a stylistic
preference: the first version names a quantity this game does not have, and a bound
denominated in a nonexistent quantity is unmeasurable.

**Why the correction was necessary, from the two places that forbid the first reading.**
INV-CRISIS-2 says no building produces anything over time. The resource model's §5.1 is
blunter: *"Every unit of every resource is earned by a learner completing a lesson or
completing a practice set. There are exactly those two channels, and there is never a
third"*, and *"Buildings are not sources. No building has a production rate, a yield, an
output, or a storage cap to fill."* So there is no stream for a recovery bill to be compared
against. **What there is instead is a finite quantity of remaining work** — the lessons and
practice sets left between the trigger and the era advance. That makes the bound a
**counting** claim rather than a rate claim, and counting claims are testable.

**And it is already measured for era one, in exactly that currency.**
`apps/web/src/city/crisisRepairRecovery.test.ts` — new since this document's §9 was written,
read at `6abf299` — prices the whole recovery in **practice sets**:

```ts
const setsForABuilding = prices.per_building / EARN.interleaved.material;
expect(setsForABuilding).toBe(6);
// a whole rim band of scarred ground (era one's shoreline is 28 cells)
expect((28 * prices.per_cell) / EARN.interleaved.material).toBeLessThanOrEqual(10);
```

Six practice sets per ruined building (60 material against `EARN.interleaved.material` = 10),
and under nine sets for a whole 28-cell shoreline band. **Neither figure is written into the
test** — both are derived from the shipped prices, so a retune moves the arithmetic instead
of failing for the wrong reason. That file's header states the property in the lead's own
shape: *"A PLAYER WITH NO MATERIAL AND A RUINED CITY IS NEVER STUCK"*, resting on two
measured facts rather than on prose — a refused repair is atomic so trying is free, and a
ruin is a state and not a removal, so the practice that pays for the repair is still
reachable.

**One caveat, and it is why this bound must be re-measured per era rather than inherited.**
Those figures are era one's, in era one's material, and `materialForEra` returns `null` for
every era whose `ERA_MATERIALS` entry is `proposed` — only `prehistoric` is `authored`. So
**nine of the ten eras have no denominator for this bound yet.** The rule is ruled, the
arithmetic is authored for one era, and §1's "no tuning numbers are invented here" applies to
the rest.

#### The protected floor is D-CRISIS-7, with exactly one addition

**The floor the lead restated while ruling the above is D-CRISIS-7 and is not a second
ruling**, recorded so a reader does not take a restatement for one: *mastery and unlocked
nodes cannot be lost; earned skill buildings cannot be permanently deleted; crises may damage
buildings, lock capacity, consume resources, or leave scars.* Every clause maps onto
D-CRISIS-7's permitted or always-preserved list.

**One clause is genuinely an addition and earns its own line: at least one viable recovery
path must remain.** D-CRISIS-7 forbade permanent loss; it never said a *route back* had to
exist, and §9 records why that gap mattered — *"a floor that says damage is never permanent
is only true if something can undo it — at present nothing can."* This clause closes the gap
as a design constraint rather than leaving it as an observation.

**Both halves are now enforced structurally at the tip, which they were not when D-CRISIS-7
was written.** `engines/game/src/crisis-damage.ts` is new since §9's staleness note and is
*"that ruling expressed as a TYPE"*: *"Every field below names something a crisis is allowed
to do, and the shape has no field for anything it is not — there is no `removed_buildings`,
no `lost_mastery`, no `relocked_nodes`, and adding one would be a visible change to this file
rather than a quiet write somewhere downstream."* The recovery half is a named test block —
*"every kind of damage the shape can hold can be CLEARED again"* — so the viable-path clause
is measured over the whole damage shape rather than argued per crisis. §5.19 records what
else that file changes about §9.

### D-CRISIS-13 (RULED) — "genuine attempt", operationally defined

**The bound above is meaningless without a definition of the player it protects, and the
definition is a simulation rather than a sentiment: simulate players around the minimum
passing accuracy, choosing legal, non-deliberately-destructive actions.**

Two exclusions, and both directions matter:

- **Do not balance around perfect play.** A bound that only holds for an optimal planner
  protects nobody, because the risk being guarded against is precisely that *ordinary* play
  falls off a cliff while the optimum stays reachable.
- **Do not protect someone selecting the worst action every time.** A bound that holds
  against deliberate self-sabotage is either unreachable or has priced every consequence out
  of the game.

#### 5.14 The precedent, and the reusable part of it

**`engines/game/src/hard-winter-layouts.test.ts` already does this, and it is machinery to
reuse rather than a shape to imitate.** Read at `6abf299`. Five pieces, in the order a second
crisis would need them:

1. **The legal-action enumerator.** `legalActions(state)` builds every candidate on the
   board — a fire on any land cell, a reinforce of any building, abandon — and filters them
   through `canDeclareWinterAction`. **"Legal" is delegated to the engine's own predicate
   rather than restated in the test**, which is what stops the simulated player and the real
   player diverging as the rules change.
2. **The competent-player policy, whose docblock is the specification.**
   `greedySurvivors(layout, correct)` is one-round lookahead: try every legal action, keep the
   one that leaves the settlement in the best shape after the frost moves. Its own comment
   says why it is deliberately weak — *"Deliberately not a full search. The bound this policy
   is used for is 'a competent player is never left with nothing', and a perfect planner would
   prove nothing about that — the whole risk of a shrunken fire is that ordinary play falls
   off a cliff while the optimum stays reachable."* **That sentence is this ruling's first
   exclusion, already written down in the tree.**
3. **The accuracy sweep, with a floor under it.** The test *"leaves a competent player
   something on every layout, from one right answer up"* runs the policy at
   `correct ∈ [1, 2, 3]` over every authored layout, asserts at least two buildings survive
   each time, and closes with `expect(measured).toBe(winterLayouts().length * 3)` so a sweep
   that quietly stopped measuring fails. **This is what "measures what each authored layout
   reaches at each accuracy" means concretely**, and the ladder it walks is the whole ladder:
   at `batch_size` 3 the tiers are 3/3 `strong`, 2/3 `steady`, 1/3 `weak`, 0/3 `none`.
4. **The random-legal floor, as a second bracket.** `randomSurvivors(layout, correct, plays)`
   plays random-but-legal actions over seeded plays and reports mean and max. With the greedy
   policy that is **two brackets, and neither of them is an adversary** — the ruling's second
   exclusion, expressed as an absence: there is no worst-action policy in the file, and the
   absence is deliberate.
5. **The net-of-both-bills readout.** `netMaterial(state)` returns
   `payout.material - outcome.recovery_cost` as one number. **That is D-CRISIS-12's arithmetic
   already implemented** — earned minus owed, in the era's own material.

**"The minimum passing accuracy" has no single live value in this product, which is a finding
rather than an obstacle.** The phrase is borrowed from the *gates*, because the crisis itself
has **no pass bar at all** — INV-CRISIS-3 records that `HardWinterOutcome` has no `lost` and
no `failed`, and INV-CRISIS-7 that it writes no mastery. Checked at `6abf299`, the gates do
not agree on a number either:

| Candidate | Value | State |
| --- | --- | --- |
| `STORM_CLEAR_RATIO` | **0.8** | Live. *"The clear threshold — the fixed rule the student already understands"* |
| `ERA_TRIAL_CLEAR_RATIO` | 0.8, aliased to the above | **Superseded in design, not yet in code.** `D-ET4` rules that *"you cannot half-transform a town hall"*, so the trial requires **every node answered correctly** — the trial contract records the 80% rule as *"OVERTURNS"*-ed and the pass rule as *"superseded in design by D-ET4 and not yet in code"* |
| Mastery gate | `mastery >= 2` per node | Live, and not an accuracy at all |
| The crisis's own ladder | 3/3, 2/3, 1/3, 0/3 | Live, and deliberately **not** a bar: *"accuracy decides the magnitude, not whether it happens"* (INV-CRISIS-4) |

**So the definition cannot be anchored to a constant, and era one's precedent shows it does
not need to be: it sweeps the band rather than picking a point, and starts at 1 of 3 — below
every candidate above.** Sweeping is not merely stronger than picking here, it is **the only
form available** while the gates disagree, and it needs no number authored to be operational.
Recorded this way deliberately: citing `ERA_TRIAL_CLEAR_RATIO` as *the* minimum passing
accuracy would have been citing a decision another document has already overturned.

**THE WARNING THAT COMES WITH THE PRECEDENT — a policy measures only what its objective
prices.** This is the most transferable thing in that file and it is a finding rather than a
technique. The greedy policy found the abandon exploit, and the reason it found it is the
reason a copy of it could easily find nothing. `standing(state)` is the objective it climbs:

```ts
return alive.length * 10_000 + headroom * 100 + (88 - state.frozen.length);
```

**It never counts ruined ground.** So a player climbing it discovered
`SURVIVORS_ONLY_EXPLOIT` — the file's own words: *"A greedy player who thinks one round ahead
and counts only buildings opened with this at EVERY accuracy from one right answer in three
upward, saved all six, and gave up 72 of 88 cells for nothing. Removing abandoning from that
player's options dropped them to three buildings. So the action was worth +3 buildings and
cost zero."*

**Read that carefully, because it cuts against the obvious lesson.** The policy was not
deliberately destructive; it was maximising survival, which is what a genuine attempt looks
like. It was destructive **anyway**, because the destruction was free *in its objective*. The
exploit was not a flaw in the policy — it was the policy correctly reporting that the game
did not charge for ground.

**The consequence for D-CRISIS-12 is direct, and naming it in advance is the point: a
recovery-cost bound simulated by a policy whose objective ignores recovery cost measures
nothing, and will report green.** That is the failure mode
`.cursor/rules/qa-verification.mdc` exists for, arriving through the front door — the sweep
runs, the population is derived, the floor is asserted, and the quantity the whole exercise is
about is absent from the score. **A policy used to bound a recovery bill must carry the
recovery bill in its objective**, and `netMaterial`'s `payout.material - recovery_cost` is
exactly that number.

**Era one's fix is also the model for what "maximum plausible cost" should be measured
against.** The exploit was **priced, not deleted**: both plans still run, and *"the compact
board is not free any more"* asserts the gap between two routes to the same six buildings —
the exploit earns 72 and owes 216 for a net of −144, the honest route earns 96 and owes
nothing, and the difference is pinned at exactly 240. Beside it, *"still makes trading land
for buildings correct when the answers are not there"* asserts that at one right answer in
three the destructive trade is **still the better call**, because a price that made a
legitimate desperate move wrong would be a deletion wearing a bill.

### D-CRISIS-14 (RULED) — the question pool is a three-era window, sampled bucket-first

**The window is the current era plus the previous two.** Sampled **bucket-first, then a skill
within the bucket** — never uniformly across eligible nodes.

| Bucket | Share |
| --- | --: |
| The **current** era's mastered nodes | **40%** |
| The **previous** era | **35%** |
| **Two eras back** | **25%** |

**Two eras are exceptions, and both are exceptions to the weights rather than to the shape of
the draw.**

- **Era two** has only one era behind it: **40% current, 60% era one.** The two older buckets
  collapse into one and keep their combined weight.
- **Era one has no previous era at all**, so **Hard Winter draws 100% from era one's own
  mastered nodes** — three of six at the trigger (D-CRISIS-9). **This has to be written down
  rather than derived**, because a general implementation of "current plus the previous two"
  hands era one a **60% share of nothing** and a 40% share of three nodes. **The arithmetic
  does not fail** — it yields a short draw, and INV-CRISIS-9 **refuses** a short draw rather
  than serving it smaller. So the only built crisis in the game stops being playable, and it
  stops through a rounding path rather than through an error anyone would see.

#### 5.15 Why bucket-first, and why the softening is deliberate

**Bucket-first is not a stylistic choice about sampling; it is the only way the weights mean
anything, because era sizes differ by nearly a factor of two.** Node counts run 5, 6 and 9
(§5.12). Drawing uniformly across every eligible node lets **size** set the mix, and the
distortion is not marginal. Two worked cases, from the shipped counts at `6abf299`:

| Era | Window (nodes eligible) | Uniform across nodes | **Ruled** |
| --- | --- | --- | --- |
| **10** Cyberpunk | 5 mastered of 9, era 9's 6, era 8's **9** | current **25%**, era 9 **30%**, era 8 **45%** | 40 / 35 / **25** |
| **8** Atomic Age | 5 mastered of 9, era 7's 6, era 6's 6 | current **29%**, era 7 **35%**, era 6 **35%** | 40 / 35 / **25** |

**Era ten is the case that makes the ruling necessary.** Under a uniform draw, era eight —
two eras back, the oldest bucket — would take **45%** of the crisis, nearly double its ruled
share and more than the era the player is actually standing in, **for no reason except that
it has nine nodes.** Bucket-first makes the mix a design decision; uniform sampling makes it
an accident of authoring.

**A second consequence worth having: bucket-first is stable under authoring.** Adding a node
to era eight changes which skills that bucket can offer and does not change how much of the
crisis it owns. Under a uniform draw, every era's crisis mix shifts whenever any era in its
window gains a lesson.

**One question the buckets do not obviously answer, and the code answers it.** Only the
current-era bucket is qualified *"mastered"*. For the two older buckets the qualifier is
redundant rather than missing: `ERA_TRIAL_MASTERY_GATE = 2` means the era trial *"unlocks
only after every node already holds mastery 2"*, and a completed era is one whose trial was
cleared, so **every node of a previous era is mastered by construction**. "Previous era" and
"previous era's mastered nodes" name the same set, and an implementer does not need a ruling
to pick between them.

#### The softening is deliberate, and the reason is not a compromise

**At 40% current era the crisis is 60/40 past-to-present, not all-past.** That is a real move
away from the framing this document opened with, and the lead's reason for it is a design
argument rather than a concession: **a crisis drawing only on older eras would feel
disconnected from the chapter the player is standing in.** A learner three nodes into the
Renaissance meeting a crisis that asks exclusively about the Bronze Age is being tested on
someone else's chapter in the middle of their own.

**It remains clearly distinct from the era trial, which is the property the original framing
existed to protect.** The trial is **100% present** and **exhaustive** — every node of the
era, because it reports which skills were missed. The crisis is **60/40 and sampled** across
three eras. Those are not the same encounter, and 60/40 is not close to 100%. **What the
softening costs is a slogan, not a distinction**, and §5.16 is the sweep that makes sure the
slogan does not outlive it.

#### 5.16 Every place this document stated the harder past/present split, and what it now says

Swept and corrected in place, on the convention §5.11 established for D-CRISIS-8. Listed
rather than silently fixed, because a reader who remembers the old wording needs to know the
change was deliberate.

| § | Was | Now |
| --- | --- | --- |
| **§4**, INV-CRISIS-8 heading | *"the crisis samples **cumulatively**; the era trial covers"* | *"the crisis samples a **WINDOW**; the era trial covers one era exhaustively"* |
| **§4**, INV-CRISIS-8 body | *"the code substantially agrees, with **one correction** worth making"* | **two** corrections — the second being that the draw is bounded and 60/40 rather than all-past |
| **§4**, INV-CRISIS-8 body | *"one is a wide shallow draw over **everything known**"* | *"a wide shallow draw across a **three-era window**"* |
| **§4**, INV-CRISIS-8 closing | *"This is also the **single rule** that lets one mechanic scale from era one to era ten **without a rule change**."* | Retired and replaced in place: D-CRISIS-14 carries **two named per-era exceptions**, so the mechanic scales with two rule changes rather than none. Both are exceptions to the weights, not to the shape of the draw |
| **§3**, the ten table | Gave each crisis its decision and axis and said nothing about what differentiates them in play | A pointer added to **D-CRISIS-19** and §5.20 — the axis and the ritual are two views of one design and both must stay distinct |

**Three things were checked and deliberately left alone.** INV-CRISIS-8's *purpose* — that
the crisis and the trial are not redundant — is untouched and is restated rather than
weakened. The **era-coverage** half of it never moved: the trial is still exhaustive over one
era, and `ERA_TRIAL_ITEMS_PER_NODE`'s *"a sampled gate could only ever name the skills it
happened to draw"* is the reason and still holds. And **era one's own behaviour is unchanged**
by the window: its window is era one, so the ruling reproduces what the prototype already
does.

**DEFECT REPORT — two code docblocks still state the retired claim.** Reported, not fixed;
no code is changed by this document. Both say the cumulative draw is what makes the mechanic
scale without a rule change, which is precisely the sentence D-CRISIS-14 retires:

- `engines/game/src/hard-winter.ts` (`composeHardWinterBatch`): *"`masteredNodeIds` is the
  CUMULATIVE set — every node the learner has reached so far [...] **This is the one thing
  that makes the same mechanic scale across ten eras without a rule change**: era one's
  crisis is small because the learner knows little, era eight's is wide."*
- `apps/web/src/winter/hardWinterItems.ts` (`WINTER_NODE_ORDER`): *"The batch draws
  CUMULATIVELY from a prefix of this — **which is the one thing that lets the same encounter
  scale from era one's six nodes to era eight's nine without a rule change**."*

**Neither is wrong about era one and both are now wrong about era eight**, which is the era
they each chose as their example: era eight's window under D-CRISIS-14 is eras six, seven and
eight, so its draw is **not** every node reached. This is the same shape of defect as §6 —
prose describing a behaviour the rules no longer specify — and it is the same remedy: the
narrow correction is to the scaling claim, not to the description of era one's prefix draw,
which is accurate. Carried as **O-11**.

### D-CRISIS-15 (RULED) — a no-repeat record, and it is the record the practice scheduler is missing

**The rule: a crisis does not re-ask one skill while others in its window go untouched.**
Without it a three-era window is a claim about *eligibility* and not about what a player
actually meets. The gap is sizeable rather than theoretical: era five's window holds thirteen
eligible nodes (three mastered of its own, plus eras three and four entire) against era one's
eighteen questions, so an unconstrained draw can spend a whole crisis on a handful of skills
and never ask the rest.

#### 5.17 Two consequences, and the first is a build decision rather than an observation

**(a) THIS IS THE SAME MACHINERY THE PRACTICE SCHEDULER IS MISSING. Build it once and both
get it, rather than letting the crisis grow a private version.**

**Verified at `6abf299`, not carried over.** `docs/superpowers/specs/2026-07-29-economy-measured-at-tip.md`
§6 measured this at `189690f`, which is an ancestor of this tip; `git diff 189690f..6abf299`
touches **nothing** in `packages/item-bank` and nothing in the practice session or the drill's
persistence, and each claim was then re-read directly rather than inferred from the diff:

| Claim | At `6abf299` |
| --- | --- |
| `buildRandomizedSetByShape` starts a fresh `seen` on every call | **Confirmed.** `const seen = new Set<string>();` at `packages/item-bank/src/practiceSelect.ts:139` |
| Nothing persists served items across sessions | **Confirmed.** No `practicePersistence.ts`, no `servedIds` parameter and no `cr.devPractice` store exist anywhere in the tree. The only `servedItemCount` is `engines/diagnostic/src/walk.ts:307`, an in-memory probe budget on one `WalkState` |
| The endless drill has no memory either | **Confirmed.** `createInterleavedScheduler` keeps only `lastItemByNode` and `lastNodeId` (`infiniteScheduler.ts:88-89`, `:119-120`), is built in a `useMemo` per mount (`EraInfinitePractice.tsx:100-101`), and the only thing `InfiniteDrill` writes to `localStorage` is the best streak |

**One correction to the claim as briefed, and it changes what gets built.** `seen` is **not** a
served-item record and lengthening its life would not produce one. It holds **answer variety
keys** (`practiceSelect.ts:61-68`) and exists for a different defect — the same *answer*
arriving twice in one five-slot set from two different cells, which was measured at 9.1% of
EXP.1 sets, 19.7% of NUM.5 and 25.1% of RAT.6 before it was added. Persisting *it* across
sessions would suppress **answers**, not items. The economy measurement says so directly:
*"A cross-session fix wants a new record of served `item_version_id`s, not a longer life for
this one."* **So the shared thing to build is a new record**, and §6.5 of that document already
scopes it — a sibling dev store keyed `cr.devPractice.v1.<user>`, `Record<nodeId, string[]>`,
~38 KB worst case against a ~5 MB budget, threaded as `servedIds?: ReadonlySet<string>`
through `buildRandomizedSetByShape` and `drawSpreadByShape`.

**What the practice side gets, quantified rather than asserted.** The same measurement puts
the wasted distinct practice at **26–54%** depending on the node, with the realised uplift
from perfect memory at **1.08× at two sessions rising to ~1.43× at six**. It also names the
over-claim to avoid: *"Quadrupling distinct practice needs authoring, not memory. The most
memory can do is recover the 26–54% the random draw currently wastes — real, worth having,
and not the headline claimed."* **The crisis should be recorded as a second consumer of a
modest, real win, not as the justification for a large one.**

**THE CONSTRAINT THE SHARED RECORD MUST CARRY, and it is not optional for the crisis: the
no-repeat record is a PREFERENCE, never a CONSTRAINT.** `drawSpreadByShape` already works this
way and says why — *"an instance whose answer is unseen is preferred; if every remaining
instance of that shape repeats an answer, the head is taken anyway, so this can never cost a
slot"* — and the economy doc's scoping note insists the fix keep it. **For the crisis this is
load-bearing rather than tidy**, because two inherited invariants make a hard constraint
unsafe:

- **INV-CRISIS-9** — a short batch is **refused, never served smaller**. A no-repeat rule
  strict enough to exhaust a thin window would not produce a smaller batch, it would produce
  **no batch**, mid-crisis.
- **INV-CRISIS-3** — no board is unwinnable, and a refused batch is a round the player cannot
  play. A rule that can deadlock a round is a dead end reached through the question pool
  rather than through the board.

**Two shuffled-cycle-over-a-bag implementations already exist in this tree, which is the
concrete form of "build it once".** `winterLayoutFor` deals layouts from a seeded shuffled
cycle so that *"every block of `layouts.length` encounters plays every layout exactly once"*,
and `createInterleavedScheduler` keeps a bag of node ids so *"every node in the pool appears
once per shuffled cycle before any node repeats"*, swapping the first slot when a cycle
boundary would repeat a skill. **The crisis's skill-level no-repeat rule is that same bag**,
one level up from the item record — so building it fresh would make three copies of one
mechanism in one repository. `createInterleavedScheduler`'s is the closer fit of the two and is
the one to reuse.

**And era one's draw has no cross-round memory at all today, which is the gap this rule
fills.** `winterBatchFor` seeds per `(encounter, round)` and `composeHardWinterBatch` shuffles
each node's candidates afresh on every call, so round four can re-ask round one's item. The
docblock is explicit that this is the current anti-memorisation story and nothing more:
*"Fresh draws per round are still the anti-memorisation rule; they come from varying the seed,
not from leaving it to chance."* Varying a seed makes a draw unpredictable; it does not make it
non-repeating.

**One thing an implementer needs and this ruling does not settle: whether the rule's unit is
the item or the skill.** The wording is skill-level — *"does not re-ask one skill"* — and in
era one that is **vacuous**, measured rather than guessed: `rounds: 6` and `batch_size: 3` give
18 questions, the trigger leaves **3** mastered nodes, and `composeHardWinterBatch`
round-robins the mastered nodes so **every batch of three already touches all three skills.**
A skill-level rule cannot bite in the only era with authored items; it starts biting at era
two, whose window holds nine nodes. **An item-level record bites everywhere and is also the
one the practice side needs.** Carried as **O-12**.

**(b) THE PAST/PRESENT SPLIT HAS SOFTENED AND THE SPEC NO LONGER CLAIMS THE HARDER VERSION.**
Ruled above, argued at §5.15, and every amended sentence is listed at §5.16 with a defect
report for the two code docblocks that still carry the retired claim.

### D-CRISIS-16, D-CRISIS-17, D-CRISIS-18 (RULED) — three stakes mechanisms, one per crisis that lacked one

**Each of the three punishes the thing that previously had no cost.** All three sit inside
D-CRISIS-7's protected floor and all three are recoverable.

#### 5.18 The three, and what each one charges for

**D-CRISIS-16 — Succession: neutral districts drift toward whoever is winning.** Each cycle
the player does not commit, an **undecided district picks a side on its own, and it picks the
currently strongest faction.** So waiting compounds against you: the longer you hold influence
back, the stronger the position you will eventually have to buy against.

- **What it charges for is HESITATION, not error**, and that distinction is why it is the right
  mechanism for era four rather than a generic penalty. Error already has a home in every
  crisis — accuracy sizes the action (INV-CRISIS-4). Nothing anywhere else in the ten charges
  for *declining to act*, and era four is the crisis whose axis is allegiance, where refusing
  to choose is the characteristic mistake.
- **It supplies §5.13's terminal condition for free**, which is the strongest argument for it:
  the crisis settles when **no district is neutral**, and drift is the process that guarantees
  the settling. A mechanism that creates the pressure and bounds the encounter is one design
  doing two jobs.
- **It also answers half of O-6.** D-CRISIS-4 recorded a worry about influence being banked —
  *"whether banking weakens INV-CRISIS-5's declare-before-you-answer gamble, since a player who
  can save is a player who can wait for certainty."* **Under drift, waiting is no longer free**,
  so banking buys flexibility at a price instead of buying certainty outright. The worry is
  narrowed to its remaining half — whether unspent influence survives the crisis — and O-6 is
  updated to say so.
- **A "CYCLE" MUST ADVANCE ON PLAYER ACTIONS AND NEVER ON ELAPSED TIME.** This is not a caution,
  it is INV-CRISIS-1 applied to the one mechanism in this amendment that invites a timer, in
  exactly the way D-CRISIS-3 applied it to Missile Alert. Everything here is clockless and two
  derived-population sweeps assert it: `packages/economy/src/clockless.test.ts`, whose own
  header reasons about scoping *"by the behaviour, not by the implementation"* and which
  proves it can see a clock read before trusting that it finds none, and
  `test/hardWinterClockless.test.ts`, which sweeps the winter engine's whole import closure
  and carries a self-test — *"detects a clock read when one is present, and only then."* **A
  drift keyed to elapsed time would also be farmable by idling and untestable without a fake
  clock**, which are the two grounds D-CRISIS-3 already ruled on.
- **What "a player action" means is not settled.** If any action advances a cycle, opening a
  menu costs a district; if only an answered batch does, hesitation between batches is free
  and the mechanism does not bite. Carried as **O-14**. — ***SETTLED 2026-07-31 by
  D-CRISIS-34: a cycle is an ANSWERED QUESTION BATCH*** (§5.42). The bullet's own worry about
  the batch reading is answered by what the choice buys rather than dismissed: hesitation
  between batches is free only in the sense that nothing happens while nothing is done, and
  what the batch unit secures is that **earning influence and losing ground are the same
  act**, so no player can accumulate without the board moving against them. **Two adjacent
  rows move with it and they move differently** — **O-6 is RESOLVED BY CONSEQUENCE** (§5.42a),
  and **O-13 is NOT**, because a player who never answers the call answers no batch and so
  drifts no district (§5.42b).

**D-CRISIS-17 — Boiler Cascade: a repair attempted downstream of a live fault BURNS OUT.**

- **Not "produces little benefit". The action is spent AND the node is damaged**, so that
  section now needs **two** repairs where it needed one. The difference between a wasted action
  and a compounding one is the whole ruling: a wasted action makes the wrong order
  *inefficient*, and a compounding one makes it *wrong*.
- **It is thematically exact rather than bolted on** — running a machine with no feed wrecks
  it. The mechanism is what the fiction already says happens.
- **And it is what makes the axis real.** D-CRISIS-2 spent the Industrial era on **ordering**
  on the grounds that it is *"the only era that can host a dependency-order repair puzzle,
  where fixing the wrong thing first fixes nothing."* Without a cost, "fixes nothing" means the
  player loses a turn and learns the dependency — repair order is then merely **efficient**.
  With burn-out, order is **load-bearing**, which is what D-CRISIS-2 bought the era for.
- **Pair it with a finite repair budget earned from accuracy**, which is INV-CRISIS-4 in era
  seven's vocabulary: accuracy sizes how much repairing you can do, never whether repairing
  happens at all.
- **The budget and the burn-out interact in a way that needs a ruling before it is built.** A
  burned-out node adds a repair while the budget is finite, so a player who probes downstream
  early can face more repairs than budget. INV-CRISIS-3 forbids the board that cannot be won,
  which means either the budget must be sized against the worst plausible ordering or burn-out
  must be capped. Carried as **O-15**, together with the crisis's missing terminal condition.

**D-CRISIS-18 — Intrusion: a wrong isolation costs the clean building's capacity AND the source
relocates.**

- **You lose two things at once**, and pairing them is the ruling: the building's **function**
  goes, and your accumulated **evidence goes stale**. Either one on its own would be a fine —
  payable, absorbable, forgettable. Together they mean a wrong isolation leaves you **further
  from the answer than before you acted**, which no single-cost version achieves.
- **It converts "am I sure enough to act" from a feeling into the actual decision.** That
  sentence is what era nine's axis has always claimed to be — *"paying for information rather
  than for effect"* (§3) — and D-CRISIS-18 is the first thing in the design that **charges**
  for it. Before this the player could isolate on a hunch and, at worst, learn something.
- **The consequence to state plainly: acting early becomes how you lose.** Era nine is the only
  crisis of the ten where the characteristic mistake is *impatience* rather than
  misallocation, and this mechanism is what makes that true.
- **It sits inside the floor by the same reading §7 already gives era nine**: a building whose
  capacity is lost is *"temporarily unusable"*, a named D-CRISIS-7 permission, and relocation
  moves hidden state rather than removing anything.
- **Termination needs care and does not have a ruling.** If the source relocates on every wrong
  isolation, a player who keeps guessing keeps resetting the board, and §5.13's boundedness
  claim needs an argument that the crisis still ends. Carried as **O-16** with the missing solve
  condition.

**All three land on capacity or on actions and none on the always-preserved list**, so
D-CRISIS-7 needs nothing new permitted for any of them. Two of the three want the **capacity
penalty term** §9 records as missing — era nine's isolation cost and era four's contested
districts both suspend a building's contribution — which moves that row from two crises
(2, 6) to four. §9's table is updated accordingly.

#### 5.19 Findings elsewhere in this document that expired before this amendment was written

**Re-read at `6abf299` rather than repeated.** Three earlier findings this amendment leans on
had moved, and two of them moved in the direction that makes a ruling above *possible* — so
carrying them forward unchecked would have argued against the amendment using facts that had
stopped being true.

**1. `CrisisDamage.suspended_civic` exists, so capacity locking is now half-shipped.** §9's
staleness note re-verified at `769f704` that *"`deriveCapacities` at this tip is still a bare
sum over contributions with no penalty term and no restore path"*. **That half is still exactly
true** — `packages/economy/src/capacity.ts:97-107` is a two-accumulator loop and nothing more.
**But the other half has landed:** `engines/game/src/crisis-damage.ts` carries
`suspended_civic` as *"the field that carries it, so that crisis needs no new state and no
second migration"*, it is **persisted and parsed** (`devSession.ts:282`, `:298`), and
`crisis-damage.test.ts` pins it in a case named *"carries the Lost Herd's locked capacity
without a second migration"*. **Nothing reads it into a capacity, though** — grepped at this
tip, `suspended_civic` has no consumer outside the damage module, its persistence and its
tests. So the honest state of that §9 row is: **the durable record exists and survives a
reload; the derivation that would make it mean anything does not.** That lowers the cost for
all four crises that now want the penalty term, and §9's row is amended to say so rather than
left claiming the whole capability is absent.

**2. The economy measurement's headline finding is stale, and D-CRISIS-12 depends on it being
stale.** At `189690f` that document reported *"practice is 0% of era income today"* — the Town
Hall drill built a session id containing a colon, `assertPart` rejects a colon in an event-id
part, and `interleavedGrant` threw before a ledger row existed. **At `6abf299` the id is
colon-free** (`CitySurface.tsx:2037` and `:2068`) and
`apps/web/src/city/interleavedPayoutSeam.test.tsx` — **added** in this range — drives the
city's own minted id through the real grant path, in a case named *"keeps a minted id
ACCEPTABLE to the event-id scheme, not merely distinct"*. **This matters directly rather than
incidentally.** Of the resource model's two channels, lesson completion is **one-time** and
practice is the **repeatable** one, so a player who has finished an era's lessons and owes a
recovery bill has only practice left to pay it with. That is exactly the loop
`crisisRepairRecovery.test.ts` walks, and it is why D-CRISIS-12's *"resources still earnable
through normal remaining play"* would have been a near-empty quantity had the drill still paid
nothing.

**3. `ERA_TRIAL_CLEAR_RATIO` is superseded in design.** Recorded at §5.14, where it would
otherwise have been cited as the product's minimum passing accuracy. `D-ET4` rules that the
trial requires every node answered correctly; the trial contract itself records the pass rule
as *"superseded in design by D-ET4 and not yet in code"*.

### D-CRISIS-19 (RULED) — what differentiates the crises is the PLAYER RITUAL

> **What differentiates the ten crises is the player ritual — specifically WHEN THE QUESTION
> HAPPENS, WHAT FOLLOWS IT, and HOW CONSEQUENCES RESOLVE — and not different variables under
> the same loop.**

**This is the lead's insight and it is the governing principle of the whole design, so it is
stated here rather than left to be inferred from the ten process descriptions it came out of.**
It is the operational half of D-CRISIS-1. D-CRISIS-1 says a crisis is differentiated by the
*kind of decision* it asks; this says what actually delivers that difference to a player's
hands. **Ten crises that all asked "answer a batch, then place a thing" would satisfy
D-CRISIS-1 on paper** — the decisions would be "where to protect", "where to block", "what to
pull down", genuinely different axes — **and be one encounter in the hand**, because the player
would perform an identical ritual ten times with the noun changed.

**The three clauses are a checklist and each one has a worked failure.** *When the question
happens* — era seven lets you inspect the whole network before answering, era one makes you
commit before you see the batch (INV-CRISIS-5), and those are different games regardless of
what the question is. *What follows it* — era one turns a verdict into a magnitude, era four
turns it into a token you keep, era nine turns it into the **quality of an answer** rather than
the size of an effect. *How consequences resolve* — immediately, at the end of a cycle, or all
at once after several are queued.

**The register in §10 records this as a ruling and not as commentary**, because it is the thing
a future simplification will breach without noticing: unifying two crises' *cadence* while
leaving their axes distinct looks like tidying and is the failure this principle names.

#### 5.20 The ten ritual identities, and the seven cadences

**The identities — "In this crisis, I…".** One line each, and this is the sentence that should
survive when the detail is re-derived:

| Era | What the player repeatedly does |
| --- | --- |
| 1 Hard Winter | **Place protective coverage** |
| 2 Lost Herd | **Follow and compare clues** |
| 3 Raid | **Redirect visible routes** |
| 4 Succession | **Bank and spend political influence** |
| 5 Great Fire | **Choose irreversible sacrifices** |
| 6 Plague | **Close movement links temporarily** |
| 7 Boiler Cascade | **Diagnose and repair in order** |
| 8 Missile Alert | **Assign responses before simultaneous resolution** |
| 9 Intrusion | **Choose diagnostic questions** |
| 10 Robot Uprising | **Reconfigure the city's power state** |

**The seven cadences.** Ten crises over seven cadences, so three pairs share one:

| Cadence | Crises |
| --- | --- |
| **Answer, then act** | 1, 3 |
| **Choose an investigation, then answer to determine the QUALITY OF INFORMATION** | 2, 9 |
| **Answer repeatedly, bank, then one larger decision** | 4 |
| **Answer to earn permission or duration, then accept a cost** | 5, 6 |
| **Inspect freely, answer to execute** | 7 |
| **Plan several responses, resolve them together** | 8 |
| **Planning phase, alter the grid, then watch it simulate** | 10 |

> **NARROWED 2026-07-31 by D-CRISIS-31, and the consequence is unusually clean.** Both tables
> keep all ten rows, because a ritual identity is the most compressed form each shelved design
> has and losing it would be losing the design. **In the shipping set every one of the three
> shared cadences loses a member:** *answer, then act* keeps **era 1** and loses era 3;
> *choose an investigation, then answer for the quality of information* loses **both** (eras 2
> and 9); and *answer to earn permission or duration, then accept a cost* loses **both** (eras 5
> and 6). **So the four in-scope crises hold four distinct cadences — answer-then-act (1), bank
> then one larger decision (4), inspect freely then answer to execute (7), and plan-alter-simulate
> (10) — and no cadence is shared at all.** Three things follow. The caution below, about eras
> five and six sharing a cadence while adjacent, **describes two shelved crises and cannot arise
> in the shipping run**; it is kept in full because it *is* their separation. **D-CRISIS-29**,
> which permits eras two and nine to share one, is now moot for the same reason and is kept for
> the same reason. And **D-CRISIS-19's own failure mode is further away than it has ever been**:
> ten crises could have been one encounter in the hand, and four with four cadences cannot be. D-CRISIS-1 allows two crises to share a
hazard shape provided their axes differ, and a cadence is the same kind of thing: eras one and
three both answer-then-act, and *area* against *interception* is a real difference in the hand.
**What makes a shared cadence risky is proximity**, because two crises a player meets in
succession are compared directly. Of the three pairs, eras two and nine are **seven** eras
apart and eras one and three are **two** apart. **Eras five and six are adjacent — the worst
placement a shared cadence could have.**

> **RE-DERIVED 2026-07-31 by D-CRISIS-33, and the result is tidier than the set it replaces.**
> Both tables keep all ten rows for the same reason as before. **Under {1, 4, 6, 9} each of the
> three shared cadences keeps exactly ONE member**, where the old set kept one and lost two
> outright: *answer, then act* keeps **era 1** and loses era 3; *choose an investigation, then
> answer for the quality of information* keeps **era 9** and loses era 2; *answer to earn permission
> or duration, then accept a cost* keeps **era 6** and loses era 5. The two cadences held by a
> single crisis apiece both leave — *inspect freely, answer to execute* (era 7) and
> *planning phase, alter the grid, then watch it simulate* (era 10).
>
> **So the four in-scope crises again hold four distinct cadences, and they are four different ones:
> answer-then-act (1), bank then one larger decision (4), answer to earn permission or duration then
> accept a cost (6), and choose an investigation then answer for the quality of information (9).**
> No cadence is shared, so D-CRISIS-1's permission is still unspent and D-CRISIS-19's failure mode
> is as far away as it was.
>
> **Proximity, which is what the caution below is actually about, is comfortable on the new set.**
> The closest pair of in-scope eras is 4 and 6, two apart, and they hold different cadences; eras 6
> and 9 are three apart and also differ. **No two crises a player meets in succession share a
> cadence**, which is the property the adjacent five/six pair threatened.
>
> **The caution below now describes ONE shelved crisis and one shipping one**, rather than two
> shelved ones: era five is deferred and era six is being built. **That makes its content
> load-bearing in a way the previous note explicitly said it was not.** *"Era six is batched — you
> close a link and then find out, at the end of the cycle, where the disease had already gone"* is
> now a specification for a crisis in scope, and the immediate/batched distinction is one of the
> three axes separating it from a design that may yet be picked up. Read it as era six's own
> resolution timing first and as a separation second. **D-CRISIS-29 stays moot** — it permits eras
> two and nine to share a cadence, era nine now ships and era two does not, so the pair it licences
> still cannot occur; the reason has changed and the state has not.

**THE CAUTION, and it is recorded here rather than left to the summary because the summary is
what flattens it.** Eras five and six share a cadence *and* are adjacent *and* are already the
pair D-CRISIS-8 was written to separate. That is three things in common, and the cadence table
above is exactly the artefact that would let a reader conclude the two are the same encounter.
**They are not, and the lead's own process descriptions already separate them on resolution
timing:** the Great Fire's chosen building *"collapses before the next spread step"* while the
Plague's infections travel *"at the end of a cycle"*.

**Immediate against batched.** That is a difference in the third clause of D-CRISIS-19 — *how
consequences resolve* — and it is the one a player feels every single turn:

- **Era five is immediate.** You pull a building down and the gap is there before the fire
  moves. The decision and its effect are one beat, which is what makes an irreversible
  sacrifice feel irreversible.
- **Era six is batched.** You close a link and then find out, at the end of the cycle, where
  the disease had already gone. The decision and its effect are two beats, which is what makes
  containment feel like a bet on incomplete information — and which is the reading §5 takes of
  the lead's *"partly hidden"* network (the links are visible, the infection along them is not).

**So the two crises now separate on three axes, not two.** D-CRISIS-8 gave them different
propagation topologies and different sacrifices; this caution adds **resolution timing**, which
is D-CRISIS-19's third clause applied to the one adjacent pair. **Any future change that made
era five's demolition resolve at the end of a cycle would collapse the third axis silently**,
and it would look like a consistency improvement to the person making it — the same shape as
violation (1) in §5.7.

### D-CRISIS-21, D-CRISIS-22, D-CRISIS-23 (RULED) — three narrower rulings

#### 5.21 One baseline claimed, one mechanic protected, one inversion placed

**D-CRISIS-21 — Hard Winter should be the ONLY crisis built around repeated area placement.**
The lead named era one as the baseline and said so explicitly. **This is stronger than
D-CRISIS-1 and the difference is worth being precise about**: D-CRISIS-1 forbids two crises
*sharing an axis*, and era one owns **Area**, so no other crisis may own it. D-CRISIS-21 goes
further and forbids the **mechanic** — repeated area placement — even in a crisis whose axis is
something else. A crisis could plausibly ask an ordering question or a triage question through
repeated area placement and satisfy D-CRISIS-1 while being era one in the hand, which is
exactly what D-CRISIS-19 says matters. **Era one is also the only crisis where the mechanic is
measured**: `hard-winter-layouts.test.ts` exists because *"a fire tuned against one arrangement
is an UNTUNED one that happens to be measured"*, and it quantifies footprint against board over
three layouts. A second area crisis would owe that whole file again.

**D-CRISIS-22 — the Intrusion mechanic is worth protecting: a weak answer returns "likely
compromised" rather than nothing.** It is **the only place in the run where being partly right
gives something partly useful.**

**One clarification this claim needs, because a reader could take it as contradicting
INV-CRISIS-4.** INV-CRISIS-4 says accuracy sizes the action rather than deciding whether it
happens, and era one's bottom rung is the proof — `radius_by_tier.none` is `null`, so a fire is
still lit and wards nothing. **The two are consistent, and the distinction is what makes era
nine special.** Everywhere else partial correctness buys a **smaller effect**, and at the bottom
of the ladder a smaller effect is worth nothing at all: a fire warding nothing is not partly
useful, it is a lit fire and no protection. In era nine partial correctness buys **degraded
information**, and degraded information is genuinely actionable — *"likely compromised"* narrows
a search where a null radius protects nobody. **So the honest form of the ruling is: era nine is
the only crisis where the partial-credit output is itself useful rather than merely smaller**,
and it is worth protecting for that reason. It is also the only crisis whose axis is *paying for
information* (§3), so it is the only one where a graded output can be an information grade.

**D-CRISIS-23 — era ten inverts the premise, and that is the correct place for the last one.**
**You survive by switching your own city off**, in a game where growth has always meant
powering more of it. Every era up to that point has rewarded building, placing, mastering and
lighting; era ten's answer is to take it back, temporarily and by choice.

- **It is the right inversion to place last** because it only reads as an inversion to a player
  who has spent nine eras doing the opposite. Placed at era three it would be a rule; placed at
  era ten it is a reversal.
- **It is inside the floor by the most literal possible route**, which §7 already records:
  switching a building off is the plainest instance of *"buildings become temporarily
  unusable"*, and it is **player-initiated**, so it is a sacrifice chosen rather than damage
  done.
- **Its second terminal condition needs the same care as the Raid's third.** §5.13 records that
  the Robot Uprising ends when every robot is trapped or destroyed **or the city is dark**. *The
  city is dark* must be an **ending with consequences** and not a failure — INV-CRISIS-3 records
  that `HardWinterOutcome` has no `lost` and no `failed`, and *"A losable encounter would be the
  first dead end in a codebase that has carefully avoided them."* A player who switches
  everything off has **solved** the crisis at the maximum price, which is the era's premise
  taken to its conclusion rather than a loss state.

### D-CRISIS-24 (WORDING, and deliberately not a new decision) — the entry trigger is stated as `ceil(n / 2)`, never as "the median, rounded up"

**No number changes. Nothing about the trigger moves.** This ruling is about how D-CRISIS-9
is *written*, and it earns an id only so that a later reader can see the question was asked
and closed rather than never noticed.

**The formula is `ceil(n / 2)`.** It yields **3** for five- and six-node eras and **5** for
nine-node eras, which is exactly the table the lead approved and exactly what §5.12 already
reproduces against `eras.ts`.

**The word is ambiguous and the formula is not.** Read literally, the median of six
positions is 3.5, which rounds to **4** — and that reading would move the four six-node
eras, **one, six, seven and nine**, off the trigger the lead named. Odd counts agree under
either reading, so the ambiguity is invisible in six of the ten eras and changes four of
them. **The note explaining this must stay** wherever the trigger is stated, because a
reader who meets only the formula has no way to know that the English sentence was
considered and rejected, and will re-derive the 4.

#### 5.22 What was actually owed here, which was less than the ruling was scoped for — and both edits are now MADE

**D-CRISIS-9's BODY already did this, and the finding is worth keeping because it narrowed
the work to two lines.** §5 above already says *"The arithmetic is `ceil(n / 2)`"*, already
gives the 3.5 → 4 worked example, already names the four eras the English reading would
move, and already closes with *"An implementer should code `ceil(n / 2)` and not the English
sentence."* Every substantive thing this ruling asks for was there before it was written.

**What still led with the word was the two places a reader looks first, and they are the two
places that get quoted onward.** Both were re-checked at the merged tip — #279 landed as
`dcbf963` with both sites unchanged — and **both are edited here**. Listed rather than
silently fixed, so a reader who remembers the old wording knows it was deliberate:

| Site | Was | Now |
| --- | --- | --- |
| The **§5 section heading** | *"D-CRISIS-9 (RULED) — the crisis fires at the median of that era's own node count, rounded up"* | *"...fires after `ceil(n / 2)` of that era's own nodes, which is what 'the median, rounded up' means"* — formula first, the word following as the thing it disambiguates |
| The **§10 register row** | opened *"The crisis fires at the median of that era's own node count, rounded up"*, with the formula in the second sentence | Opens with the formula and the two worked values; the English follows, **carrying its own ambiguity note** (3.5 → 4) rather than standing alone. **The register row is the one most likely to be quoted into another document**, which is the whole reason this was worth an id |

**Nothing else moved.** D-CRISIS-9's body is untouched, §5.12's table is untouched, and no
number anywhere changed — which is why this is recorded as a wording ratification rather
than as an amendment to the trigger. **The standing rule is that the ambiguity note travels
with the formula**: a reader who meets only `ceil(n / 2)` has no way to know the English
sentence was considered and rejected, and will re-derive the 4.

### D-CRISIS-25 (RULED) — "genuine attempt" sweeps an accuracy BAND of 33% to 80%, and D-CRISIS-12 must hold across ALL of it

> **Simulate a band, not a figure: from one right answer in three (33%) up to four in five
> (80%), and require the recovery-cost bound (D-CRISIS-12) to hold at every point in it.**

**The anchor it replaces pointed at nothing, and that is why this is a ruling rather than a
clarification.** D-CRISIS-13 defines a genuine attempt as *"simulate players around the
**minimum passing accuracy**"*. The value that supplied that phrase was
`ERA_TRIAL_CLEAR_RATIO`, and it was **superseded the same morning** by **D-ET4** in
`2026-07-29-era-trial-contract.md`, which rules that *"under the ceremony the transformation
IS the gate, so finishing requires every node answered correctly"* and retires the constant
outright. A definition anchored to a retired constant is not a strict definition; it is an
unresolvable one.

**Why a band beats a figure, and it is not a hedge.** A single value tunes for **one
learner**. D-CRISIS-12's claim is about a **population** — *"a player making a genuine
attempt"* is a class, not a person — so a bound measured at exactly one accuracy is not a
bound on that class, it is a reading at a point. And the specific failure the bound exists
to catch is by construction a claim about a *range*: `hard-winter-layouts.test.ts` names it
in its own words at this tip, *"the optimum stays reachable while ordinary play falls off a
cliff"*. A cliff is only visible to something that walks across it.

#### 5.23 Where the two endpoints come from, and how era one already realises the band

**Neither endpoint is invented, and both were re-read at `4f879bb`.**

| Endpoint | What it is | Why it is the right end |
| --- | --- | --- |
| **33%** — one right answer in three | The bottom rung of era one's live tier ladder (`batch_size: 3` gives 3/3 `strong`, 2/3 `steady`, 1/3 `weak`, 0/3 `none`) and the floor the shipped sweep already starts from | It is **below every candidate pass bar in the product**, so a bound that holds here holds for anyone still trying. It is also the **lowest** accuracy at which the abandon exploit was found — that player *"opened with this at EVERY accuracy from one right answer in three upward"* |
| **80%** — four in five | `STORM_CLEAR_RATIO`, the one gate ratio still live, and the value the retired `ERA_TRIAL_CLEAR_RATIO` aliased | It is the **highest bar the product still enforces anywhere**. Above it a player is not the population the bound protects; they are the optimum D-CRISIS-13's first exclusion rules out |

**The band's endpoints do not fall on era one's rungs, and the honest consequence is worth
stating rather than smoothing over.** A four-rung ladder over three questions offers 0%,
33%, 67% and 100%. The band `[33%, 80%]` therefore contains exactly **two** of era one's
rungs — 1 of 3 and 2 of 3 — with 3/3 sitting above it. The general rule for any crisis is
**every rung whose ratio falls inside the band**, which is well defined at any batch size
and needs no new number authored.

**The machinery to reuse is already shipped and is the precedent the lead named.**
`engines/game/src/hard-winter-layouts.test.ts` at `4f879bb`, in a test named *"leaves a
competent player something on every layout, from one right answer up"*:

```ts
for (const layout of winterLayouts()) {
  for (const correct of [1, 2, 3]) {
    const survived = greedySurvivors(layout, correct);
    // ...
    measured += 1;
  }
}
expect(measured).toBe(winterLayouts().length * 3);
```

**So the shipped sweep already covers the band and one rung above it**, with a floor under
it so a sweep that quietly stopped measuring fails rather than passes. That floor is not
decoration here: a band is a claim about a *set* of accuracies, and a containment assertion
over an empty sweep is satisfied trivially.

**The one thing the band does not fix, carried forward from §5.14 because it is the
way this ruling will fail.** *A policy measures only what its objective prices.*
`standing(state)` never counts ruined ground, which is why a greedy survival-maximising
player discovered the abandon exploit — *"the action was worth +3 buildings and cost zero"*.
**A sweep of the whole band whose objective ignores the recovery bill measures nothing, at
every point in the band, and reports green at all of them.** Widening the sweep multiplies
the readings and not the evidence. `netMaterial`'s `payout.material - recovery_cost` is the
objective D-CRISIS-12 is denominated in, and it is what the policy must climb.

### D-CRISIS-26 (RULED) — the three solve-it crises get a finite action budget, and each can end UNSOLVED with the damage standing

**The Lost Herd (2), the Boiler Cascade (7) and Intrusion (9) each have a finite action
budget. When it is spent, the crisis ends with the damage standing.** That gives all three a
real ending they can arrive at without succeeding, rather than making them puzzles a player
retries until they work.

**The gap this closes is one D-CRISIS-11 asserts across and does not establish.** Its
section's claim is that *"no crisis is unbounded"*, and its own text concedes the hole two
paragraphs later: *"Two of the four solve-it crises have no stated solve condition: the
Boiler Cascade and Intrusion. Their category is ruled and their exit is not, which is
exactly the gap a section claiming boundedness cannot leave open."* A bucket named *solve
it* whose members cannot say what solving is bounds nothing.

**Scope note: the solve-it bucket has FOUR members and this ruling names three.** The
**Succession Crisis (4)** is untouched and deliberately so — its terminal condition is
already supplied by D-CRISIS-16's neutral drift (*"the crisis settles when no district
remains neutral"*), which §5.13 calls the cleanest of the four because the mechanism that
creates the pressure is the same one that guarantees the end. Era four needs no budget to be
bounded, so it is not given one. Written down so the omission reads as a decision.

#### 5.24 The three solve conditions, confirmed against each crisis's own section

**Checked against what each crisis already says about itself rather than transcribed from
the brief**, which turned up that only two of the three were actually missing one:

| Crisis | Solve condition | Confirmed against |
| --- | --- | --- |
| **Lost Herd (2)** | **The herd is found — a full recovery** | **Already ruled, and this document did not need to supply it.** D-CRISIS-5: *"A successful partial recovery prevents the next departure event. A full recovery ends the crisis."* Era two's exit was never the gap; its **budget** is |
| **Boiler Cascade (7)** | **The network is restored — no node is left in the failed state** | The crisis's own vocabulary in three places: §7's *"Failure runs downstream through the machine network"*, D-CRISIS-2's *"dependency-order repair puzzle, where fixing the wrong thing first fixes nothing"*, and §5.9's era-seven node states, *"working/failed/repaired"*. **Restored is a state era seven already names**, so this is its own word rather than a new one |
| **Intrusion (9)** | **The source is isolated** | D-CRISIS-18 supplies both halves: a wrong isolation *"costs the clean building's capacity AND the source relocates"*. **Isolation is era nine's verb and the source is what it aims at**, so the solve condition is that verb landing on that noun. §7 frames the same thing as *"Buildings may be compromised and you cannot see which"* |

**Two of the three budgets are also already ruled, which makes this ruling narrower than it
looks and is worth knowing before anyone builds one.** Era two's axis in §3 is
*"Information-gathering under a **search budget**"* and §7 calls it *"Limited search
parties"*; D-CRISIS-17's last bullet already says to *"pair it with a finite repair budget
earned from accuracy"* for era seven. **For those two the budget exists and what is new is
that exhausting it ENDS the crisis. Only era nine gains a budget it did not have.**

**Why it follows from the stakes mechanisms rather than being bolted onto them.**
D-CRISIS-17's burn-out is the clearest case: *"Not 'produces little benefit'. The action is
spent AND the node is damaged, so that section now needs two repairs where it needed one."*
Against an unbounded budget that costs a player a turn and nothing else, and the ruling's own
claim — that a wrong order is *wrong* rather than merely *inefficient* — quietly fails.
**Burn-out only bites against a budget that can run out.** D-CRISIS-18's relocation is the
same shape one era later: evidence going stale compounds only if the evidence-gathering is
finite.

> **NARROWED 2026-07-31 by D-CRISIS-31: of the three crises D-CRISIS-26 gives a budget to,
> only the Boiler Cascade (7) is in scope.** The Lost Herd (2) and Intrusion (9) are shelved,
> so **the ruling has one live customer** and the sentence above — *"only era nine gains a
> budget it did not have"* — now describes a budget nobody will build. Two things this does and
> does not do. It **does** narrow **O-18** (*how big are the three action budgets*) from three
> unknowns to **one**, era seven's, which is also the one §5.25 and D-CRISIS-17 call the
> sharpest because burn-out **adds** repairs to a finite pool. It does **not** touch
> **O-19** (is an unsolved ending a losing outcome), because era seven can still end unsolved
> with the damage standing, so the contradiction with INV-CRISIS-3 survives intact on one
> crisis. **And the Succession Crisis's exclusion is unchanged and now more visible:** era four
> is in scope, is a solve-it crisis, and is still deliberately budget-free because D-CRISIS-16's
> neutral drift bounds it — so of the two solve-it crises that ship, one has a budget and one
> has a drift, for the reasons each already carries.

> **RE-POINTED 2026-07-31 by D-CRISIS-33: the one live budget is now INTRUSION's, not the Boiler
> Cascade's.** D-CRISIS-26 gives a budget to eras 2, 7 and 9; eras two and seven are shelved and
> era nine ships, so the ruling still has **exactly one customer** and it has changed identity.
> Three consequences, and the middle one is a genuine loss of a head start.
>
> - **The sentence above that read as an aside is now the whole of the row.** *"Only era nine gains
>   a budget it did not have"* was written to make the ruling look narrower than it was. Under this
>   set it describes the only budget anybody will build, so **the one live action budget is also the
>   only one with no existing form to start from** — era two's search parties and era seven's repair
>   budget were the two that already existed in some shape, and both are shelved.
> - **O-18 narrows to one number again and the number is era nine's.** It loses the difficulty the
>   previous note named — burn-out adding repairs to a finite pool is D-CRISIS-17's, and era seven is
>   shelved — and it keeps a different one, which is that nothing constrains the starting point. The
>   `materialForEra` denominator problem is unchanged and still blocks pricing it against D-CRISIS-12.
> - **O-19 survives whole, on era nine instead of era seven.** Intrusion can still end unsolved with
>   the damage standing, so the contradiction with INV-CRISIS-3's *"no losing outcome to reach"* is
>   intact on exactly one crisis, as before.
>
> **The Succession Crisis's exclusion is untouched**, and the pleasing symmetry the previous note
> found survives the swap: of the two solve-it crises that ship, one has a budget (9) and one has a
> drift (4). **The solve conditions in the table above are unaffected** — era nine's *the source is
> isolated* was already confirmed against D-CRISIS-18's own verb and noun, so the in-scope member
> arrives with its solve condition ruled and its **terminal** argument still owed (**O-16**).

#### 5.25 The floor check, quoting both, and the one contradiction this ruling does NOT resolve

**Ending unsolved must leave damage and locked capacity, never lost mastery or a deleted
building.** D-CRISIS-7 in full:

> **Crises can damage, disable, scar, or reduce capacity, but they cannot undo mastery or
> permanently remove an earned building.**
>
> **Permitted consequences.** Buildings become temporarily unusable; civic capacity is
> reduced; structures need repairs; districts gain visible scars; resources are lost; the
> player begins the next era at a disadvantage; optional upgrades are delayed.
>
> **Always preserved.** Completed lessons, earned skill buildings, unlocked eras, permanent
> city history.

**Every consequence an unsolved ending can leave is on the permitted list, item for item.**
An unsearched herd leaves *civic capacity reduced* and *structures needing repairs*
(D-CRISIS-5's departure events); an unrepaired network leaves machines *temporarily
unusable*; an un-isolated intrusion leaves compromised buildings *temporarily unusable* and
their capacity suspended. **A player who ends unsolved also lands squarely on the sixth
permission — *"the player begins the next era at a disadvantage"* — which is the one item on
that list that only makes sense if a crisis can end badly.** The floor anticipated this
ending before there was a ruling for it.

**And it is structural at `4f879bb` rather than a reading of the prose**, which is the
stronger form of the check. `engines/game/src/crisis-damage.ts`:

> This module is that ruling expressed as a TYPE. Every field below names something a
> crisis is allowed to do, and the shape has no field for anything it is not — there is
> no `removed_buildings`, no `lost_mastery`, no `relocked_nodes`, and adding one would be
> a visible change to this file rather than a quiet write somewhere downstream.

`CrisisDamage` holds exactly `ruined_buildings`, `ruined_cells` and `suspended_civic` beside
its id mint. **So an unsolved ending cannot record a lost mastery or a deleted building,
because there is no field to record one in** — and `crisis-damage.test.ts` carries a block
named *"every kind of damage the shape can hold can be CLEARED again"*, which is
D-CRISIS-12's viable-recovery-path clause measured over the whole damage shape rather than
argued per crisis. The floor check passes on the prose and on the type.

**The contradiction, reported and NOT resolved: INV-CRISIS-3's third clause.** §4 says:

> There is also no losing outcome to reach — `HardWinterOutcome` has no `lost` and no
> `failed`, and says why: *"A losable encounter would be the first dead end in a codebase
> that has carefully avoided them."*

**"A real losing end" and "no losing outcome to reach" cannot both be read literally.** Two
readings are available and this document does not pick between them:

- **The soft reading**, which the document already has precedent for twice: an unsolved
  ending is an *ending with consequences* rather than a failure. D-CRISIS-11 says of the
  Raid that reaching an objective is *"an ending rather than a loss"*, and D-CRISIS-23 says
  *"the city is dark"* *"must be an **ending with consequences**, never a loss"*. Under this
  reading nothing in INV-CRISIS-3 moves, and an unsolved crisis simply reports more damage.
- **The hard reading**, which is what the phrase *a real losing end* most naturally means:
  the three crises gain an outcome era one deliberately does not have, and INV-CRISIS-3's
  third clause stops being inherited by all ten.

**The two are not stylistic variants of each other** — the first is a presentation choice
and the second changes what an outcome type may contain. Carried as **O-19**. Note also that
INV-CRISIS-3's *other* halves are untouched either way: an illegal choice still costs
nothing, and a budget running out is not the same thing as a board with no legal move on it.

**What this does to O-15 and O-16, whose missing terminal conditions are what it supplies.**
Both rows narrow rather than close, and O-15's narrows in a direction worth naming: it asked
whether the repair budget must be sized against the worst plausible ordering *or* burn-out
capped, *"because INV-CRISIS-3 forbids the board that cannot be won"*. **Under D-CRISIS-26
running out of budget is an ending rather than an unwinnable board, so that dilemma
dissolves** — and reappears immediately as the sizing question, which is **O-18**, because a
budget so small that ending unsolved is the normal result is a different game from one where
it is the price of a bad order. O-16's relocation half gets its bound for free: a player who
keeps guessing keeps resetting the board, but only as many times as the budget allows.

**No budget sizes are set here**, per §1.

### D-CRISIS-27 (RULED) — era one's crisis runs FEWER rounds, and nothing is retuned here

**The lead's words: *"6 rounds is too many anyways."*** The ruling is the **direction**. No
new count is set in this document, per §1's rule against inventing tuning numbers, and the
re-tune that would choose one is **O-17**.

**This is a pacing judgement about the Hard Winter, and it stands on that alone.** It was
also offered as a fix for D-CRISIS-15's sampling vacuity in era one, and **that half does not
survive measurement** — reported here rather than carried, because a ruling propped up by a
second argument that is false is a ruling that gets re-opened.

#### 5.26 The vacuity is not a function of the round count, measured at `4f879bb`

D-CRISIS-15's rule is *"a crisis does not re-ask one skill while others in its window go
untouched"*, and **O-12** already records that it is vacuous in era one. **The reason
it is vacuous has nothing to do with how many rounds there are.** Three facts, each read at
this tip:

1. The trigger leaves **3** of era one's 6 nodes mastered (D-CRISIS-9, `ceil(6 / 2)`).
2. `batch_size` is **3** (`hard-winter-tuning.ts`).
3. `composeHardWinterBatch` **round-robins the mastered nodes**, so every batch of three
   touches all three skills.

**A window holding exactly `batch_size` skills is one where every single batch is already a
complete pass over the window** — at six rounds, at four, at one. Cutting the round count
reduces how many times each skill repeats (six each today) and cannot make a skill-level
no-repeat rule bite, because the rule is satisfied by every individual batch. **The thing
that would bite is O-12's item-level record**, which is a different decision and is already
open.

#### 5.27 What the ruling costs, and why the re-tune is deferred rather than attempted

**Six rounds is not an arbitrary length; it is the length everything else was measured
against.** `HARD_WINTER.rounds`'s own docblock at `4f879bb`:

> Six rounds is six actions against six buildings, which is what makes the whole table hang
> together. Two properties of this length were MEASURED against the values below, and both
> are asserted in `hard-winter.test.ts` so they cannot drift:
>
>  1. **The zero-accuracy baseline ruins everything, and the last building falls on the
>     final round.** [...]
>  2. **The reachable ceiling rises with every accuracy step.** Searched over a
>     15-action-per-round candidate set at a fixed uniform accuracy (beam width 2500,
>     stable against width 4000): 0 of 3 saves at most 0 buildings, 1 of 3 at most 4,
>     2 of 3 at most 5, 3 of 3 all 6.

**What a shorter winter re-derives, each with the site that pins it today:**

| Derived against six rounds | Where it is pinned at `4f879bb` |
| --- | --- |
| **The zero-accuracy calibration** — the last building falls on the *final* round | `hard-winter.test.ts`'s *"falls at the tier the tuning says, and reports the round it fell"*, which asserts `["NUM.S", 6]` among the whole freeze timetable. Cut a round and this fails, **and it should**: the round it names is the calibration, not an incidental |
| **The accuracy ceiling ladder** — 0/4/5/6 buildings at 0, 1, 2, 3 of 3 | The `rounds` docblock's property 2, a beam search over the six-round game |
| **`cold_rounds_to_ruin: 2` and `burn_rounds: 2`** | Both are *counts of rounds*, so both change meaning the moment the total does — a two-round reprieve is a third of a six-round winter and half of a four-round one |
| **The fire radius ladder** | Retuned against the live board over six rounds; still generous per **O-1**, which is a live open question against the current length |
| **`abandon.reclaim_cost_per_cell: 3`**, derived against `rebuild_cost_per_ruin: 60` | The 240-material gap between the exploit and the honest route is asserted in `hard-winter-layouts.test.ts`, and both routes are **six-round plans** |
| **The payout bands** | Paid per surviving building with a clean-sweep bonus, so they are denominated in an outcome the round count moves |
| **Every witnessed full-accuracy plan** | `hard-winter-layouts.test.ts` asserts each witness `.toHaveLength(HARD_WINTER.rounds)` — the witnesses are *length-checked against the constant*, so **they all fail on the first round removed** |

**The last row is the sharpest consequence and the reason this is a ruling rather than a
change.** INV-CRISIS-3's second half — *no board is unwinnable* — is evidenced by exactly
those witnesses, one per layout, asserted by set equality both ways. **Cutting rounds does
not merely fail assertions; it withdraws the evidence for an inherited invariant until new
witnesses are authored and found.** That is authoring work over a changed board, not a
constant edit.

**And the schedule is the deciding factor, stated plainly so it is not mistaken for a
technical objection: there is a demo tomorrow and the Hard Winter is what is being
demoed.** Re-deriving the whole table the day before is how a demo breaks. The ruling is
recorded now, at full strength; the re-tune is **O-17**, with its scope named there rather
than discovered later.

### D-CRISIS-28 (RULED) — a departure event MAY consume capacity somebody is using, and the people come back when the capacity does

> **The lead, verbatim:** *"I think people leave because there's a reduction of the capacity
> (so it goes back to the capacity problem anyways), but they'll come back if you increase
> capacity via the civic buildings."*

**Three clauses, and the third is what makes the first two affordable.**

1. **A crisis never writes to population.** It writes to **capacity**. This is D-CRISIS-5's
   mechanism, unchanged, and it is now ruled for all four crises that carry a capacity
   penalty — the Lost Herd (D-CRISIS-5), the Plague (D-CRISIS-8), the Succession Crisis
   (D-CRISIS-16) and Intrusion (D-CRISIS-18).
2. **Population is bounded by capacity, so the overflow leaves.** The ceiling was always
   allowed to bind; what is new is that it may come **down** to meet a population already
   above it. A crisis may therefore reduce the number of people in the settlement, and it
   does so without a single write to any population term.
3. **Restoring capacity restores the people, and the lever is named.** *Civic buildings.*
   The return is not a separate mechanic to build and not a queue to replay — it is the same
   bound read again at a higher ceiling.

**Why this preserves D-CIT2 rather than breaching it, stated precisely because the lead
offered a wider licence and this is the narrower thing he then said.** He was willing to
relax D-CIT2 outright: *"it doesn't have to be a pure function of learner state in that it
can't be modified at all by any non-learning lever."* **That licence is not spent.** D-CIT2
forbids one specific loop — capacity feeding **arrivals** — and §5.5's measurement of it is
untouched by this ruling: taking capacity to zero still provably cannot move the headcount.
What D-CRISIS-28 changes is which of that headcount is **housed**, which was never a
learning-state claim. The honest form is: *the crowd is still earned by learning; whether
the settlement can hold it is not.*

**Inside the failure floor, and the reversibility is what puts it there.** D-CRISIS-7 permits
reducing capacity and forbids undoing mastery or removing an earned building. A departure
under this ruling touches neither: no mastery moves, no placement is deleted, and the person
who left is the same indexed person who comes back with the same seeded look and, once the
ceiling clears their index again, the same home.

**Two consequences an implementer must not undo.**

- **The departure must be REVERSIBLE BY THE PLAYER'S OWN LEVER**, which is buying capacity.
  A departure that could only be undone by lifting the crisis's own suspension would make
  the recovery the crisis's to grant rather than the player's to buy, and D-CRISIS-12's
  viable-path clause is about what the player can still do.
- **No citizen may acquire a state that expresses harm.** *Leaving* is not a state on a
  person and must not become one: the union is guarded by an exhaustive switch that fails to
  compile on a new member and a banned-substring list containing the literal `"leaving"`
  (§5.6's first finding, which this ruling leaves entirely intact). The existing `waiting`
  is the state a displaced citizen occupies, and it is documented as *patient, not
  suffering*.

#### 5.28 What the tree does today, measured at `03d5a2b9`

**The mechanism the ruling needs already exists, and it is on the wrong ledger.** That is the
whole finding, and both halves of it are measured.

**`waiting` is reachable, and it is reachable on the first frame of the game.** The
derivation's cold open is `population=8 residence_capacity=0 housed=0 waiting=8` — every
founder waiting, which `citizens-tuning.ts` calls *"the crowd that has to be housed"* and
which is the game's premise rather than an edge case. A single mastered node with no homes
(`NUM.3`, the Workshop) reads `population=14 residence_capacity=0 waiting=14`.

**Reachable in the ARITHMETIC and not in the product, which is a separate and load-bearing
fact.** The only importer of `cityCitizenRoster` anywhere in the tree is its own test, so
nothing that renders derives a roster and **no learner has ever seen a citizen, a crowd or a
waiting count.** A crisis that displaced people today would displace them invisibly.
#273 is the change that mounts
the surface and is open (`mergedAt: null`), which is why O-20 says to sequence against it.

**A capacity drop below usage does exactly what the ruling asks, with no throw and no
clamp.** The only lever in the shipped tree that lowers residence capacity is un-mastering a
node, which lowers population too, so the measurement is taken twice — once with that lever
and once with a capacity-only penalty injected into `buildingLedger`, which is the shape a
crisis penalty would have:

| | population | capacity | housed | waiting | roster size |
| --- | --- | --- | --- | --- | --- |
| Settled island | 44 | 44 | 44 | 0 | 44 |
| Capacity-only cut of 16 | **44** | 28 | 28 | **16** | **44** |
| `NUM.2` un-mastered (both terms move) | 40 | 28 | 28 | 12 | 40 |

The middle row is the ruling's own case and it is clean: sixteen citizens
(`citizen-028`..`citizen-043`) move from housed to `waiting`, **nobody is deleted**, and the
first of them reads `{ state: "waiting", home_node_id: null, day_node_id: null }`. The third
row is what the *available* lever does and shows why a crisis must not use it — four people
leave the roster entirely, because un-mastering moves the population term as well.

**Recovery is automatic, and it is automatic for the strongest possible reason: nothing is
latched.** The roster is recomputed from `{ nodes, seed }` on every call (D-CIT1), so
restoring the ceiling returns a **deep-equal** roster: `waiting` goes `0 → 16 → 0`, and every
citizen's `home_node_id` and seeded `look` come back identical. On the economy side the same
holds through shipped code rather than through an argument: `civicCityCapacities` skips a
suspended placement and sums the rest, so buying a building raises livability the moment it
is placed, with no un-suspension and no bookkeeping.

**But `waiting` is bounded by the wrong capacity, and this is the one place real code is
owed.** There are two disjoint capacity ledgers at this tip:

| | `residence_capacity` (`engines/game`) | `livability` (`packages/economy`) |
| --- | --- | --- |
| Fed by | the six **skill nodes**, keyed by node id | **civic placements** bought with material |
| Monotone? | yes — both terms key on mastery, and mastery and placement are monotone | no — a suspension withholds a contribution |
| What a crisis can move | **nothing.** D-CRISIS-7 forbids undoing mastery or removing a building | `suspended_civic` → `CivicPlacement.suspended` → `civicCityCapacities` |
| What a civic building adds | **zero.** `capacityForNode` returns all-zeros for any id outside the six | its whole contribution |
| What it bounds | `housed`, and therefore `waiting` | **nothing.** `capacityShortfall` reports `unsustained` as a number |

Measured: `capacityForNode("civic-1")`, `("family-lodge")`, `("smokehouse")`, `("NUM.9")` and
`("")` all return `{ residence_built: 0, residence_mastered: 0, daytime: 0 }`, and
`residence_capacity` at full mastery is 44 — a sum over the six skill nodes and nothing else.
On the other side, suspending one contribution takes livability from 60 to 40 and
`unsustained` from 0 to 4 for a population of 44; buying two dwellings takes livability to 80
and `unsustained` back to 0. **The citizen roster is identical under all three**
(`waiting=0 housed=44`), because it takes no capacity input at all — a property asserted by
`citizens-roster-invariants.test.ts`, which pins `CitizenRosterInput`'s keys to exactly
`nodes` and `seed`.

**So the lead's lever and the lead's effect are on opposite sides of a seam.** *Increase
capacity via the civic buildings* moves livability. *People leave* is `waiting`, which reads
residence capacity. Nothing in the tree connects them, and nothing consumes `capacityShortfall`
at all. The wiring is **O-20**.

**One thing that is not a defect and is worth saying so: this seam was found once already,
and named exactly.** Era progression §7 rules that *"there is no separate housing
capacity"*, and the capacity-model ruling recorded in
`work-log/gabe/2026-07-29-capacity-model-ruling.md`
(#218, merged 2026-07-29) says
what that means for this exact code:

> today's shipped `CitizenCapacity` is precisely the thing the ruling reclassifies from *a
> capacity* to *the housing input to livability*, and today's `population <= capacity`
> guarantee is a single-term bound.

It was left there deliberately — *"it lands with the era economy, not now, and it is Evan's
file, so it is recorded here rather than raised as a change request"* — which was the right
call at the time and is why O-20 is a reconciliation the design has already asked for twice
rather than a new discovery. What D-CRISIS-28 adds is a **product behaviour** that does not
work until it happens.

#### 5.29 The no-eviction guard cannot see this defect, measured by injection

§5.6 predicted that the existing sweep *"would stay green while the product behaviour
changed"*. That is the load-bearing claim in this whole amendment, so it is measured rather
than repeated, and it is measured in both directions.

**With the defect live, the guard is green.** A capacity-only penalty injected into
`buildingLedger` — the exact shape of a crisis penalty, and demonstrated in §5.28 to evict
sixteen people — leaves `citizens-roster-invariants.test.ts` reporting **8 passed, 0 failed**,
its own *"keeps every housed citizen housed"* among them. Widened to every file that touches
the two ledgers (`citizens.test.ts`, `citizens-population.test.ts`, `citizens-invariants.test.ts`,
`citizens-roster-invariants.test.ts`, `apps/web/src/city/citizens.test.ts`,
`test/citySolvencyTrajectory.test.ts`): **65 passed across 8 files, 0 failed.** Not one guard
in the tree catches it.

**The guard is not vacuous, though, and that distinction is the point.** Make capacity fall as
a function of **mastery** instead — set `NUM.2`'s `residence_mastered` below its
`residence_built`, so mastering the Dwellings *reduces* its homes — and the same sweep fails
loudly, naming the citizen, the node and the vector for every one it finds: *"citizen-022
lost its home when NUM.2 advanced (vector 4062)"*.

**So the guard measures capacity falling in the one variable it quantifies over, and is blind
to it falling in any other.** Its population is 4096 mastery vectors and their 24,576
single-node advances; a crisis penalty is not in that space, so the defect cannot appear
there however carefully the sweep is written. This is the shape `.cursor/rules/qa-verification.mdc`
names: *a guard scoped by the implementation rather than by the behaviour.* Whoever wires
O-20 owes that file a widened population — capacity reductions from any source, not advances
— and owes it a demonstrated red at the widened lines before claiming it still catches what
it was written for. Era progression's own reversal banner asks for exactly that, in the same
words, and it asked first.

### D-CRISIS-29 (RULED) — era two and era nine may share a cadence, because they are seven eras apart

> **The lead, verbatim:** *"they're so far apart that it's fine."*

**What it relaxes.** §5.20 records the *choose an investigation, then answer to set the
quality of information* cadence as shared by eras two and nine, and argues that **proximity
is what makes a shared cadence risky** — eras five and six adjacent is *"the worst placement
a shared cadence could have"*, eras one and three are two apart, and eras two and nine are
seven. The lead has ruled the seven-era gap sufficient on its own. So the era-two/era-nine
pair needs no third separating axis, and the separation table era two's brief is drawn on is
**not load-bearing for that reason** any more.

**What it does NOT relax, and this is the part a reader will get wrong.** **D-CRISIS-22 is
untouched.** Era nine is still the only crisis where a partial answer buys something *itself
useful* rather than merely smaller, and that ruling has nothing to do with distance — it is
about what era nine's axis is (paying for information) and about INV-CRISIS-4. So era two's
weak result still may not be a hedged reading, and **era two's brief keeps its Q1**: whether
a weak batch there returns less **ground covered** or less **certain information** is
undecided, and the era-two column is still the reading under which D-CRISIS-22 stays true.

**Nothing about eras five and six moves either.** D-CRISIS-20's caution is about the one
**adjacent** pair, and this ruling's whole content is that distance is what does the work.

#### 5.30 Why D-CRISIS-29 lowers the stakes on era two's Q1 without answering it

Era two's brief states the tension exactly: *"the crisis spec's cadence table groups era two
with era nine, and D-CRISIS-22 rules that era nine is the only crisis where partial
correctness is partly useful. Those two cannot both be read loosely."* D-CRISIS-29 settles
**one** of those two loose readings — the cadence table is fine as it stands — and leaves the
other exactly where it was. What changes is the cost of getting Q1 wrong: before this ruling,
answering Q1 the era-nine way would have collapsed a pair that had no other separating axis,
and now it would only collide with D-CRISIS-22 directly. That is a smaller failure and a more
obvious one, which is worth recording, and it is not an answer.

#### 5.31 What era two's brief will need, once its review lands

Era two's brief is
#307/`docs/superpowers/specs/crises/era-02-lost-herd.md`,
**open and unmerged (`mergedAt: null`), with two reviewers reading it.** It is deliberately
**not edited here** — editing under a live review makes the reviewers' findings stale. What
it will need is listed instead, so whoever lands the review can take it in one pass. Line
numbers are from the PR's head and expire the moment it moves.

1. **The contorted framing can relax.** The brief's *"the settlement does not lose
   population, it loses the ability to support population"* was written to keep D-CIT2
   intact, and D-CRISIS-28 says plainly that people leaving is fine. It should say people
   leave, say what brings them back, and stop working around a constraint that has moved.
2. **Q4 is ANSWERED.** *"Does the headroom cap apply to era two's departure events?"* — no
   cap. A departure may consume capacity somebody is using, housed citizens do become
   `waiting`, and the no-eviction argument does lose its premise (amended, not deleted). The
   row's own consequence follows: **a departure is never refused**, so the refused-departure
   copy line the row says §9 lacks is not owed after all.
3. **Q5 is PARTLY answered.** *"What does an unsolved ending leave on the island?"* — a
   capacity penalty may stand after the crisis (D-CRISIS-5's rebuilding consequence,
   unchanged), and D-CRISIS-28 adds that **the departure it causes is not permanent damage**:
   the people return as soon as the ceiling clears. Whether the penalty itself lifts at the
   era advance is still unruled, so B8's crisis-only-versus-persistent question survives.
4. **Section 8's damage vocabulary needs the return.** The brief has a departure event on the
   board, an accumulation rule and a repair; it has no beat for **people coming back**, which
   D-CRISIS-28 makes half the mechanic and which era progression's **O-7** says gates the
   whole reversal being shippable.
5. **The read-out panel owes the two numbers the ruling is about.** Whatever bounds
   population after **O-20**, the panel has to show the ceiling and the crowd against each
   other, or a player cannot tell a departure from a bug. Era one's §6 already requires every
   capacity, shortfall and count to live in the DOM because the canvas is `aria-hidden`.
6. **Section 1's separation table stops being load-bearing on the proximity argument**
   (D-CRISIS-29), and its Q1 pointer should say so — while keeping the table, because
   D-CRISIS-22 still needs the era-two column.
7. **A reference row for this amendment**, since the brief cites D-CRISIS-5 for *"the capacity
   stake and its framing"* and that framing has moved.

### D-CRISIS-30 (RULED) — every crisis CONCLUDES, and the screen that concludes it reports the outcome it actually reached

**The lead's words, about era one and then about all ten in the same breath:**

> *"the final screen should be different: it should be its standalone popup that says 'crisis
> complete!' along with the damage list. theres' too much like bookeeping on '88 tiles ___' it
> needs to just be a simple report on building status and overall accuracy. in general, all of
> these crises need to have like concluding screens so that its not just anticlimatic"*

**The ruling is that every crisis has a concluding screen, and it is deliberately NOT that every
crisis has THIS concluding screen.** D-CRISIS-19 is the reason the distinction matters rather
than being pedantry: what differentiates the ten is the player ritual, and *how consequences
resolve* is one of its three clauses. A single shared conclusion card imposed on all ten would
make the last thing a player sees identical in ten crises that spent every other beat being
different, which is the *"one encounter in the hand"* failure D-CRISIS-19 exists to forbid,
arriving through the one screen nobody would think to check for it. **So this ruling fixes the
CONTRACT a concluding screen owes and leaves its FORM to each crisis's own brief.**

#### 5.32 The contract, in four clauses, each with the failure it forbids

**1. It is an EVENT, not the last panel of the surface the crisis was played on.** *"Not just
anticlimactic"* is a request about punctuation: the encounter has to stop rather than trail off.
Era one's failure is the diagnostic one — its outcome was a fourth `hw-panel` in the same rail
the declare panel and the question panel had been using, so the screen that meant *this is over*
was the same object in the same place as the screen that meant *choose your next action*, and
nothing marked the difference. **A crisis whose ending is a state of its own HUD has no ending.**

**2. It reports in the PLAYER's units, never the simulation's.** The lead's *"88 tiles"* is the
whole of this clause. A player has a relationship with their buildings and with how well they
answered; they have none with a cell count, and *"0 of 88 cells frozen"* is the model's own
bookkeeping surfaced raw. **The general form: a number belongs on a concluding screen when the
player could have made a different decision because of it, and cells, nodes, links and stage
counters are the mechanism rather than the stake.** Era one's replacement is buildings and
accuracy, which is what the lead named; era two's is capacity and the people who left, era
seven's is machines restored, era nine's is buildings cleared. **Each is that crisis's own noun
and none of them is a tile.** D-CRISIS-14's item bookkeeping is the same class of thing and is
equally not owed here.

**3. It reads honestly across the WHOLE outcome range, and the difference between the ends of
that range is legible WITHOUT reading the list.** This is the clause D-CRISIS-26 makes
load-bearing: three crises can end **unsolved with the damage standing**, and era one can end
with every building in ruins. **A fixed celebratory headline over that outcome is not merely
tonally wrong, it is the game failing to notice what happened to the player** — and the naive
implementation of *"a popup that says crisis complete"* is exactly that screen. Two halves,
because either alone is insufficient:

- **The verdict is DERIVED from the outcome**, so the sentence at the top of the screen is
  different at the two ends of the range rather than the same sentence over a different list.
- **And it is readable at a glance**, because a player who has to compare a list of six rows
  against a list of six rows to find out how it went has been handed the bookkeeping again in a
  new shape. A count, a mark per subject, or a named grade; and never a hue alone, which
  **INV-CRISIS-16** already requires of every other state on these surfaces.

**4. It AGREES with what the world is doing.** Era one's `apps/web/src/winter/thaw.ts` already
reverts the island when the crisis ends and deliberately leaves the ruins and the given-up
ground standing, and the concluding screen has to be a commentary on that picture rather than a
second, competing account of it. **The general form: whatever the crisis did to the environment
reverts, whatever it did as damage persists, and the concluding screen names the second and not
the first.** A screen that billed the player for weather would contradict its own island; one
that reported nothing durable would contradict the repair they are about to pay for.

#### 5.33 This does NOT resolve O-19, and the reason is the point

**O-19 asks whether an unsolved ending is a losing outcome or an ending with consequences, and
this ruling is compatible with both answers.** That is a property worth recording rather than a
hedge, because it is what stops the presentation work being blocked on a decision the lead has
not made:

- Under the **soft reading**, a derived verdict *is* the ending-with-consequences: the screen
  reports more damage in stronger words and no outcome type gains a field.
- Under the **hard reading**, one more verdict string joins the ladder at the bottom and names
  the loss.

**Either resolution changes a STRING in a slot that already exists. Neither changes the
structure.** So a crisis may build its concluding screen now, and O-19 stays open and stays the
lead's. What would have foreclosed it is the naive version: a single fixed *"crisis complete"*
headline has no slot for a verdict at all, so resolving O-19 either way would then have required
rebuilding the screen rather than writing a sentence into it.

#### 5.34 What the nine briefs owe, once #307's review lands

**The same channel §5.31 uses, and for the same reason.** The nine per-crisis briefs are
#307/`docs/superpowers/specs/crises/`,
**open and unmerged (`mergedAt: null` at the time of writing), held for rewrite.** They are
deliberately **not edited here**: they are the documents the nine crises will be built from, and
a rule written into a diff under review is a rule the rewrite may drop. So the requirement is
recorded where the rewrite provably reads, which is **three places, not one**:

1. **Here**, as the ruling, because every one of the nine briefs cites this document as the
   authority for its mechanics (*"Every mechanic is ruled in
   `docs/superpowers/specs/2026-07-29-mid-era-crisis-design.md`"* is in that folder's README).
2. **§6b of era one's own brief**, `2026-07-30-hard-winter-crisis-art-brief.md`, which is in the
   tree and merged (#302,
   `mergedAt: 2026-07-31T04:02:46Z`). **That is the load-bearing site.** The nine briefs adopt
   era one's structure section by section, and their README carries the map that does it as a
   table with one row per era-one section. **A new section in era one's brief is therefore a
   missing row in that table**, which a rewrite has to either fill or explicitly decline, where
   a ruling in a document it merely cites can be satisfied by a sentence.
3. **The register in §10**, which is the index a reader consults before writing a brief at all.

**What each of the nine owes, concretely.** Their template's **section 8 is *"Damage and
consequence"*** and their **section 7 is *"The read-out panel"***. A concluding screen is neither:
the read-out panel is consulted *while* deciding, and section 8 is about what the damage IS. So
each brief owes **a concluding-screen section**, and the natural slot is immediately after
section 8, since the screen's substance is that section's own vocabulary reported once the crisis
has stopped. **What it must specify** is the four clauses above made concrete for that crisis: the
verdict ladder in that crisis's own nouns, the units the report is denominated in, what the
environment reverts to and what persists, and how the two ends of the range differ at a glance.
**Their README's section map gains one row.**

**Two of the nine are worth naming because the general rule is hardest there.** Era ten's crisis
ends with the city dark by the player's own choice, so its concluding screen has to distinguish
*switched off deliberately* from *taken from you* in a fiction where both look the same
(D-CRISIS-23 already rules the dark city *"an ending with consequences, never a loss"*). And era
six's Plague **leaves no trace** by design (O-10b), which makes it the one crisis whose
concluding screen cannot report durable damage because there is none, and clause 4 therefore asks
it to say what the outbreak cost while it was running rather than what is left.

> **NARROWED 2026-07-31 by D-CRISIS-31, and one of the two named hard cases changes side.**
> **Three of the nine briefs are in scope** — eras 4, 7 and 10 — and each still owes the
> concluding-screen section this ruling specifies. The other six are **shelved, not dropped**
> (D-CRISIS-32), so the obligation is deferred with them rather than deleted: a brief that is
> picked up later is picked up owing its concluding screen. **Era ten stays a named hard case
> and is in scope** — its dark city has to read as *switched off deliberately* rather than
> *taken from you* — while **era six's no-trace problem is now a shelved problem.** The
> three-site recording strategy is unchanged and **§6b of era one's brief is still the
> load-bearing site**, because the briefs that remain in scope still adopt era one's structure
> section by section. **The channel this section relies on is what O-24 is about:** the six
> shelved briefs live in #307, which
> is still open (`mergedAt: null`, read from the API at `2a484b1b`), so the shelving has to reach
> that rewrite or six designs are cut by a PR acting on D-CRISIS-31 alone.

### D-CRISIS-31 (RULED) — FOUR crises, at eras 1, 4, 7 and 10; the Hard Winter is era one's; and all TEN eras keep a persistent end-of-era progression

> **THE SET IN THIS HEADING IS SUPERSEDED. AMENDED 2026-07-31, later the same day, by D-CRISIS-33:
> the four are eras 1, 4, 6 and 9.** The heading and the quotation below are kept as the ruling was
> made, per this document's convention, and **only clause 1 moves.** Clause 2 (the Hard Winter is
> era one's) and clause 3 (all ten eras keep a persistent end-of-era progression) are confirmed
> unchanged, so **nothing in this section's argument about D-ERA16 and D-ET3 is affected** — the cut
> still removes crises and no era's ending. **What else does not survive is half the justification:**
> §5.35's *"not one engine capability is shared by two of the four"* is a true statement about
> {1, 4, 7, 10} and a false one about the shipping set, where three rows are shared by three of the
> four. **§5.39 is the live derivation.** The progression half of the justification is untouched.

> *"on the crisis design, i think eras 1/4/7/10 makes sense, and there will always be a
> persistent end-of-era progression"*
>
> *"hard winter is an era 1 crisis"*

**Three clauses, and the third is the one a reader drops.**

1. **Four crises, at eras 1, 4, 7 and 10.** Not one per era. **This supersedes every statement
   in this document and in every other that a crisis is a per-era encounter** — §5.38 lists them.
2. **The Hard Winter is the era one crisis**, which ratifies what is built rather than moving it.
   Era one's is the only crisis with an engine, a surface and tuning (§1), so the ruling costs
   nothing here and closes a placement that was never actually in doubt.
3. **Every one of the ten eras keeps a persistent end-of-era progression.** The crises thin out;
   the endings do not. This is a **confirmation** of `2026-07-27-era-progression-design.md`
   **D-ERA16** (mastering the era unlocks the trial, passing it advances the era) and
   `2026-07-29-era-trial-contract.md` **D-ET3** (*"The same ritual in all ten eras, and the
   sameness is the point"*), neither of which moves.

**Why the third clause is load-bearing rather than reassurance.** Read without it, the ruling
says *six of ten eras lose their set-piece*, and a reader tallying content would conclude that
six eras end on nothing. They do not: each still ends on its trial, its Town Hall retheme and its
advance. The cut removes six *crises* and **no era's ending**, and D-ET3's contrast is what makes
that a design and not a shortfall — *the crisis is the unpredictable thing; the trial is the
dependable graduation.* Under this ruling six eras keep the dependable half and drop the
unpredictable one, which is a thinner run and not a broken one.

**What the ruling does NOT say.** It does not rank the four, order their build, or say that the
four are *sufficient* — §5.35's asymmetry is an argument about relative cost and not a claim that
four is the right number. It does not repeal a single mechanic ruling: **D-CRISIS-1 through
D-CRISIS-30 all stand**, and the ones whose *population* it narrows are marked in the register
rather than rewritten, because the population is what changed and the mechanic is not.
And it does not settle era ten, which is **O-22**.

#### 5.35 The cost asymmetry, measured against §9 rather than asserted — and NOT ONE capability survives as shared

> **HALF OF THIS SECTION IS SUPERSEDED 2026-07-31 by D-CRISIS-33, and it is the half in the
> heading.** Everything below is a correct derivation **over {1, 4, 7, 10}**, which is no longer the
> shipping set. **Half one — the capability re-derivation and the *"not one capability is shared"*
> finding — does not survive the set change and INVERTS**: over {1, 4, 6, 9} three rows are shared
> by three of the four. **§5.39 re-derives it and is the live version.** **Half two — ten
> progressions is one mechanic with ten dressings — is untouched**, because it is an argument about
> the progression side and D-CRISIS-33 does not reach that at all.
>
> **The section is kept rather than rewritten for a reason that outlives it.** Its derivation is
> the worked method §5.39 repeats, and the two read side by side are the evidence for the most
> useful thing either of them found: **how much of a cost argument is a fact about the capability
> table and how much is a fact about which four eras were picked.** The answer turned out to be
> almost all of the second. Nothing in §9 changed between the two derivations, and the sharing went
> from zero to three rows.

**This is the justification, and it is what makes the cut defensible rather than merely
smaller.** The argument in outline: **four crises is four bespoke mechanics; ten progressions is
one mechanic with ten dressings, and the dressings are already committed.** Both halves are
checkable, so both are checked here.

**Half one — the four crises share almost nothing, and two rulings in this document are why.**
**D-CRISIS-19** makes the *player ritual* the unit of difference — *when the question happens,
what follows it, and how consequences resolve* — and explicitly forbids ten crises being one
loop with different variables. **D-CRISIS-21** goes further for era one specifically: repeated
area placement is reserved to the Hard Winter **even in a crisis whose axis is something else**.
Between them there is no shared shell to build: a second crisis cannot reuse era one's mechanic
by ruling, and cannot reuse its ritual without becoming it.

**And §9's own table says the same thing with numbers, which is stronger than the argument.**
Read §9's *"Needed by"* column against the surviving set {1, 4, 7, 10}:

| §9 capability | Its stated population | In scope after the cut |
| --- | --- | --- |
| Repair: rebuilding a ruin | 1, 5, 8, 3 | **1 only** |
| Repair: reclaiming ruined ground | 1 | 1 only (unchanged) |
| Capacity locking — the durable record | 2, 4, 6, 9 | **4 only** |
| Capacity locking — a penalty term | 2, 4, 6, 9 | **4 only** |
| Capacity locking — restoring it | 2, 4, 6, 9 | **4 only** |
| Mobile agents with pathing | 3, 10 | **10 only** |
| Hidden state — unknown location | 2 | **none** |
| Hidden state — unknown status | 9 | **none** |
| Directed dependency graph | 7 | 7 only (unchanged) |
| Tile adjacency between buildings | 5 | **none** |
| A drawn link layer over buildings | 6, 7 | **7 only** |
| A propagation rule over a graph | 5, 6, 7 | **7 only** |
| A power network with switchable state | 10 | 10 only (unchanged) |
| Faction ownership per building | 4 | 4 only (unchanged) |
| A banked crisis-scoped currency | 4 | 4 only (unchanged) |
| Turn-indexed arrival schedule | 8 | **none** |
| Per-era authored land (D-ERA25) | 2–10 | 4, 7, 10 |

**Every engine capability in §9 is now needed by exactly one crisis or by none. Not one is
shared by two of the four.** The only dependency the surviving three unbuilt crises still hold
in common is **authored land**, which §1 already classifies as a content dependency rather than
an engine one. So the ten-crisis plan's economies of scale lived **entirely** in the six now
shelved: repair was shared by four, capacity locking by four, the propagation rule by three, and
pathing, hidden state and the link layer by two each — and each of those groups loses every
member but one.

**Read the direction of that finding carefully, because it cuts both ways and the honest
statement is the useful one.** It confirms the lead's framing exactly — four crises really is four
bespoke builds with no reuse to bank on. It also means **§9's build-order argument and O-3 are
largely moot for the shipping set**: there is nothing left to sequence for sharing's sake, era
six's schedule-sensitivity (the sharpest thing in §5.8) concerns a shelved crisis, and the
recommendation *"build the penalty term early, whoever gets there first"* now has one customer.
**What it does not do is make the four cheap.** Four single-customer builds is what four bespoke
mechanics costs; the cut removed the overlap and removed the reuse along with it.

**Half two — ten progressions is one mechanic with ten dressings, and the dressings are already
committed.** Verified at `2a484b1b` rather than repeated from the brief that asked for this
section:

- **The trial itself is one mechanic.** **D-ET3** rules *"The same ritual in all ten eras, and the
  sameness is the point"*, and names the entire list of what varies: the construction stages, the
  sound and music, the advisor's short speech, the materials and machinery, and the final reveal.
  In code it is *"a re-skin of the existing checkpoint machinery"* (**D-ERA16**), which is the
  reason it is one build rather than ten.
- **The Town Hall re-themes per era.** `2026-07-27-era-progression-design.md` §6.4a: *"**Never
  fixed.** It rethemes at every advance, and it is now the only building that does"* — the single
  named exception to the 2026-07-29 re-dressing ruling, and **D-ERA22** keeps its three-way
  resolution axis verbatim for the hall alone.
- **The island, the advisor and the roads still re-dress**, and this was **asked rather than
  inferred**: *"i think these should definitely be redressed. i know evan has plans to
  expand/re-theme the island."* **D-ERA26, D-ERA30 and D-ERA28 all stand as written, with no
  amendment owed to any of the three** (§6.4a; record at `eras/2026-07-29-skill-building-rulings.md`
  §2).
- **The rule behind those two bullets is the one that generalises**, and it is why this half of the
  asymmetry is not a coincidence: **per-era art freezes where it MULTIPLIES with a catalogue and is
  kept where it is one-per-era.** A building costs `catalogue × eras`; the island, the advisor, the
  road surface and the hall are **one each per era by construction**, so re-dressing them costs ten
  apiece and buys the whole visible progression.
- **The sixty-two skill buildings freeze.** **D-ERA8 as amended 2026-07-29:** *"there is no upgrade.
  A skill building is drawn once, in the era it is built, and never re-dressed"* — fixed at
  construction (§6.4a), over the 62 skill buildings that are one per in-product node.

**So the two sides of the ledger are genuinely different in kind, which is the whole claim.** A
progression's per-era cost is a dressing on a shared mechanic, and every one of those dressings is
already ruled and already owned. A crisis's per-era cost is a mechanic, and after the cut each of
the four pays for its own machinery alone.

#### 5.36 Era one now permanently carries a crisis over the thinnest question pool in the game, so its fallback is STRUCTURAL and not a patch

**The ruling fixes a crisis onto era one forever, and era one's pool is the thinnest of the four.
That makes the thin-pool fallback a permanent structural dependency rather than the bug fix it
shipped as.** This is recorded because a later reader looking at
`hardWinterItems.winterDrawSetFromIds` will see a defensive branch and a defect report behind it,
and defensive branches over fixed defects get deleted.

**Why era one's pool is the thinnest, measured at `2a484b1b`, and it is NOT the node count.** Era
one holds **six** nodes, which is joint-largest among the six-node eras and larger than the four
five-node eras — so *"era one is the smallest era"* is false and is not the argument. **What is
thin is the WINDOW.** D-CRISIS-14 samples the current era plus the previous two, and era one has
no previous eras, so its pool is its own six nodes and nothing else. Measured over `ERA_SEQUENCE`
at the four in-scope eras:

| Era | Own nodes | D-CRISIS-14 window | Window size | Trigger |
| --- | --: | --- | --: | --: |
| **1 Prehistoric** | 6 | prehistoric | **6** | 3 |
| 4 Classical | 5 | neolithic + bronze_age + classical | 15 | 3 |
| 7 Industrial | 6 | medieval + renaissance + industrial | 17 | 3 |
| 10 Cyberpunk | 9 | atomic_age + information_age + cyberpunk | 24 | 5 |

**Era one's pool is 6 against 15, 17 and 24 — under half the next thinnest, and it is a
structural floor rather than a tuning choice**, because no era can precede the first one. At the
trigger it is thinner again: D-CRISIS-14's era-one exception is *100% of its own mastered nodes*,
which is **three of six** when the call arrives.

> **RE-MEASURED 2026-07-31 for D-CRISIS-33's set, over `eras.ts` at `db2b18c2`.** The table above
> is right about eras 1 and 4 and describes two eras that are now shelved. The in-scope windows are:
>
> | Era | Own nodes | D-CRISIS-14 window | Window size | Trigger |
> | --- | --: | --- | --: | --: |
> | **1 Prehistoric** | 6 | prehistoric | **6** | 3 |
> | 4 Classical | 5 | neolithic + bronze_age + classical | 15 | 3 |
> | 6 Early Modern | 6 | classical + medieval + renaissance | 16 | 3 |
> | 9 Information | 6 | industrial + atomic_age + information_age | 21 | 3 |
>
> **The whole of this section's argument survives, with smaller numbers.** Era one's pool is now
> **6 against 15, 16 and 21** rather than 6 against 15, 17 and 24 — still under half the next
> thinnest, still a structural floor no era can precede, and still three of six at the trigger.
> **The conclusion is unchanged: `winterDrawSetFromIds`'s fallback is a permanent structural
> dependency and must not be deleted as defensive tidying**, and
> `crisisFromAFreshSession.test.tsx` is a load-bearing guard. **The spread across the other three
> narrowed** — 15/16/21 rather than 15/17/24 — which makes era one's window no less exceptional
> and the other three more alike, so a pool-sizing decision taken for era four now transfers to
> eras six and nine more readily than it would have to eras seven and ten.

**The fallback, cited from the code rather than described.** It is
`winterDrawSetFromIds` in `apps/web/src/winter/hardWinterItems.ts`:

```ts
export function winterDrawSetFromIds(practisedNodeIds: readonly string[]): WinterDrawSet {
  const practised = winterEligibleNodesFromIds(practisedNodeIds);
  return poolDepth(practised) >= HARD_WINTER.batch_size
    ? { nodeIds: practised, source: "practised" }
    : { nodeIds: WINTER_NODE_ORDER, source: "era" };
}
```

**Three details matter and each is easy to get wrong from a summary.** The threshold is the
**pool's own item depth** against `HARD_WINTER.batch_size`, not a node count, *"because
`batch_size` items can come from a single node"* — so one practised lesson keeps drawing from that
one lesson and only a set the pool genuinely cannot serve falls back. The fallback target is
`WINTER_NODE_ORDER`, **era one's authored node set taken from `D1_PRACTICE_ITEMS`** rather than
written out again. And the **provenance comes back beside the ids** (`source: "practised" | "era"`),
because the entry advisor promises questions *"drawn from lessons you have already done"* and under
the fallback that sentence is untrue, so the surface has to be able to say so.

**Measured at `2a484b1b`:** `winterDrawSetFromIds([])` returns
`{ nodeIds: ["NUM.S","NUM.F","NUM.2","NUM.3","NUM.4","NUM.5"], source: "era" }`, and with three
nodes practised it returns those three at `source: "practised"`. So the branch is live in both
directions and neither arm is dead code.

**What it does NOT do, and this is the half worth protecting.** It draws the questions; it does
**not** grant the evidence. Nothing in it writes a `node_state`, calls `advanceMasteryDev` or
reaches `@cr/mastery-service`. The alternative fix — crediting the six skills so the crisis has
something to ask about — would corrupt the mastery signal this repository protects hardest and
would be unpickable afterwards.

**Why the ruling promotes it from patch to structure.** It was written for a **defect**: the lead
opened the winter on a fresh session and got *"No batch to ask"* with no question and nothing to
press, reproduced through the player's own doors in
`apps/web/src/city/crisisFromAFreshSession.test.tsx`. The refusal was *right about the pool and
wrong about the product*, because the ☰ menu's entry is deliberately reachable below the trigger.
**Under D-CRISIS-31 that is no longer a story about one bad session.** Era one is now permanently
the first crisis, permanently over the thinnest window in the game, and permanently the one a
fresh install reaches first — so **the fallback is the only thing standing between the shipping
configuration and an unplayable encounter, and it must be treated as part of the design.** Two
consequences follow: a future reader must not delete it as defensive tidying, and **any change to
D-CRISIS-14's window or to era one's authored node set changes what the fallback falls back to**,
which makes `crisisFromAFreshSession.test.tsx` a load-bearing guard rather than a regression test
for a closed bug.

#### 5.37 The Hard Winter is the first crisis any player meets, so it does tutorial duty — and its instructional copy cannot be trimmed to nothing

**One consequence, and it is a constraint on a live activity.** Under D-CRISIS-31 era one's crisis
is the **first** crisis every player meets and, for a player who stops before the Classical era,
the **only** one. It therefore teaches the rules that §4 says all the others inherit, and **copy
that reads as boilerplate on that surface is in several cases the only statement of a rule the
player is ever given.** Measured at `2a484b1b` against the shipped briefing
(`crisisBriefingFor`, `apps/web/src/city/crisisCall.ts`, whose own docblock calls the lead line the
hook and *"the slides the manual"*):

- *"Nothing runs on a timer. The winter waits until you act."* — the only player-facing statement
  of **INV-CRISIS-1**, which every crisis inherits.
- *"A building takes damage before it is ruined. It takes more than one bad round to lose it."* —
  the damage/ruin distinction the whole of **D-CRISIS-7**'s floor rests on.
- *"Nothing in the winter takes damage back off. A shield stops the next bite, so raise one before
  the frost arrives."* — carried with a code comment saying why it is said out loud: *"a learner who
  expected one would keep a scarred building back waiting for it."*
- *"Damage left at the end of the winter can be repaired on the island. Repairs cost material."* —
  **D-CRISIS-7**'s *"you survive, but the city carries the consequences"* in the player's own units.

**So the constraint is: trim this copy for register, never for coverage.** A trimming pass may
shorten a sentence, drop a clause that repeats itself, or move a line to a better slide. It may not
remove the **last** statement of an inherited rule, because there is no second crisis early enough
to restate it and no other surface that does. Recorded here and at §7.4 of
`2026-07-30-hard-winter-crisis-art-brief.md`, which is the section a copy pass actually reads.

### D-CRISIS-32 (RULED) — the six out-of-scope crises are SHELVED, not cancelled

**The Lost Herd (2), the Raid (3), the Great Fire (5), the Plague (6), Missile Alert (8) and
Intrusion (9) are DEFERRED as of 2026-07-31.** Their designs stay in this document, complete and
unedited except for a scope marker.

> **THE MEMBERSHIP OF THAT LIST CHANGED LATER THE SAME DAY (D-CRISIS-33), AND THE RULING DID NOT.**
> **The shelf now holds the Lost Herd (2), the Raid (3), the Great Fire (5), the Boiler Cascade (7),
> Missile Alert (8) and the Robot Uprising (10).** The Plague (6) and Intrusion (9) came off it;
> eras seven and ten went on. **Still six deep, and every obligation below applies unchanged to the
> new membership** — the two arriving designs are deferred on exactly the terms the six original
> ones were, and the two leaving designs stop being shelved rather than stop being ruled.
> **The reserved-axis clause below inverts with the membership; §5.40 works it through and is the
> live version of that list.**

**The reason, stated plainly because it is the clause that will be tested by a tidying pass.**
These six are designed to the same depth as the four: each has a ruled axis (§3), a ritual
identity and a cadence (§5.20), a duration shape and — for four of them — a stated terminal
condition (§5.13), a floor check against D-CRISIS-7 (§7), and three of them carry their own
stakes ruling (D-CRISIS-5, D-CRISIS-8, D-CRISIS-18). **That is work already paid for, and the
whole of its value is that a later reader can pick one up without re-deriving it.** Deleting the
six would convert a scope cut into a loss of design, and the two are not the same decision.

**What "shelved" obliges, in three clauses:**

- **A shelved axis is still RESERVED.** D-CRISIS-1 forbids two crises sharing an axis, and being
  out of scope does not release one. No crisis among the four may take Sacrifice, Topology,
  Triage, Interception, Uncertainty or Information-gathering, because the whole point of keeping
  the designs is that they remain pickable.
  **AMENDED 2026-07-31 by D-CRISIS-33 — the list is now Sacrifice (5), Triage (8), Interception
  (3), Information-gathering (2), *Ordering* (7) and *Denial* (10).** **Topology and Uncertainty
  come OFF**, because eras six and nine now ship and own them; **Ordering and Denial go ON**,
  because eras seven and ten do not. The clause is unchanged and its list is inverted with the
  shelf. **§5.40 is the worked version, and it records why *Information-gathering* stays reserved**
  even though era nine ships: Information-gathering is era **two's** axis and era two is still
  shelved, while era nine's axis is **Uncertainty**. Releasing the wrong one would have freed a
  shelved design's axis and simultaneously forbidden Intrusion from taking its own.
- **A shelved design is not evidence of a shipping decision.** Anything derived from *"the ten"* —
  a build order, a shared-capability plan, a count of briefs — has to be re-derived over the four
  before it is used. §5.35 does that for §9 and finds the answer changes completely.
- **A shelved design must not be silently orphaned.** The six per-crisis briefs are in an open pull
  request, not in the tree (**O-24**), so this ruling has somewhere to leak: a rewrite told "cut to
  four" would delete six briefs and satisfy the letter of D-CRISIS-31 while breaching this one.

#### 5.38 Every place one-crisis-per-era was asserted or assumed, and what each now says

**A ruling recorded at its definition site does not reach its citation sites**, so the tree was
swept at `2a484b1b` for anything that asserts or assumes a crisis per era, and each site is listed
with its disposition. **The negatives are listed too**, because "I checked and it was clean" is a
finding and "I did not check" looks identical without it.

**In this document — amended:**

| Site | What it said | What it now says |
| --- | --- | --- |
| The **title** and the **status line** | *"the ten"*; *"the design is RULED for all ten; ONE of the ten is built"* | Four in scope, ten designed, one built — with the old text quoted in a dated note beneath |
| **§1**, the built/unbuilt table | *"The other nine"* as the working population | Kept, with a dated narrowing: in scope it is the other **three**, all three on unauthored ground |
| **§3**, the ten-crisis spine | Ten rows, no scope | Ten rows plus a **Scope** column; four in scope, six marked *SHELVED 2026-07-31* |
| **§3**, the three near-collisions | Three hazard overlaps to keep distinct | Each carries its scope: two trios collapse to one member, the Fire/Plague pair is wholly shelved |
| **§5.12**, the trigger table | *"Eight of the ten fire at three"* | Kept as arithmetic, with the four in-scope triggers derived beside it |
| **§5.13**, three duration shapes | Ten crises across three shapes | Kept in full; the four in-scope members named, because two shapes now hold one crisis each |
| **§5.20**, ten rituals and seven cadences | Ten identities, seven cadences, three shared pairs | Kept in full; **all three shared pairs lose a member**, so no cadence is shared in the shipping set |
| **§5.24**, three solve-it crises | 2, 7, 9 | Kept; **only era 7 is in scope**, so D-CRISIS-26's budget ruling has one live customer |
| **§5.34**, what the nine briefs owe | Nine briefs | Kept; three of the nine are in scope and the other six are shelved rather than dropped (**O-24**) |
| **§7**, the nine in era one's terms | Nine entries, no scope | Each entry carries **IN SCOPE** or **DEFERRED 2026-07-31**; no floor check, axis or caveat is deleted |
| **§9**, the capability table | Populations of 1–4 crises each | A dated note plus §5.35's re-derivation: every row is single-crisis or empty after the cut |
| **§10**, the register | Rows enumerating crises by era | Twenty-two rows carry a dated scope clause naming their surviving members — **fifteen narrowed, shelved or made moot; seven marked in scope; nine untouched; none repealed** |

**In other documents — amended:**

| Site | What it said | What it now says |
| --- | --- | --- |
| `2026-07-29-era-trial-contract.md` **§11.3** | *"The rhythm of an era is master the era, survive its crisis, rebuild the hall, enter the next age"* — the plainest one-crisis-per-era sentence in the tree, and it is in a document about a different encounter | Corrected in place with a dated note: the crisis beat is present in four eras and the other three beats in all ten. **D-ET3 is untouched**, and the ruling's third clause confirms it |
| `2026-07-29-era-trial-contract.md` **D-ET3 register row** | The same rhythm, restated in the register | Carries the same dated note, because a register row is the form most likely to be quoted onward |
| `2026-07-30-hard-winter-crisis-art-brief.md` **§6b** | *"the nine unbuilt crises' briefs adopt this document's structure"* | Dated note: three of the nine are in scope, and the structural obligation applies to those three |
| `2026-07-30-hard-winter-crisis-art-brief.md` **§7.4** | — | **New.** §5.37's tutorial-duty constraint, put where a copy-trimming pass reads |
| `2026-07-27-era-progression-design.md` **§1** and **§9** | The era loop and the trial, with no crisis in either | **Nothing was wrong.** Both gain a dated cross-reference recording that D-CRISIS-31 **confirms** D-ERA16 for all ten eras, so the era design carries the ruling that concerns it |

**Swept and clean — no edit owed, and each was read rather than assumed:**

- **`2026-07-27-era-progression-design.md`** contains the string *crisis* **zero times**. Its loop
  diagram (§1) is *master the era's skills → pass the era trial → Town Hall upgrade → advance*,
  with no crisis beat, so the document that would most plausibly have asserted one per era never
  did. The cross-references above are additions, not corrections.
- **The ten era folders under `docs/superpowers/specs/eras/`** contain the string *crisis* **zero
  times**, across all twenty `civic-buildings.md` / `style-guide.md` files and the folder README.
  **So nothing under `eras/` was touched by this amendment**, which is also why the two era-markdown
  parsers were never at risk.
- **`docs/README.md`** — zero occurrences.
- **`2026-07-27-citizens-and-city-life-design.md`** — 26 occurrences, all of the form *"a mid-era
  crisis may lower capacity"*. It nowhere enumerates crises by era, and *a* crisis lowering capacity
  is still true of era four, so **AMENDMENT 3 and the narrowed D-CIT6 / D-CIT19 need no edit.** The
  population claim that did need narrowing is D-CRISIS-28's own *"all four capacity crises (2, 4, 6,
  9)"*, which lives in **this** document's register and is narrowed there.
- **`TEAM_CHECKLIST.md`** — one occurrence, inside a diagnostic-scope note, unrelated. **O-8** still
  stands: mid-era crisis encounters have no checklist item in any lane, and cutting to four does not
  create one.

**In code — reported, NOT changed, because §1 forbids it and this is a documentation ruling:**

- **`engines/game/src/mid-era-crisis.ts`** is the strongest assumption in the tree and it is
  structural rather than a comment: `midEraCrisisCall` computes a standing crisis call for **any**
  era from `ERA_SEQUENCE`, and its docblock's table gives a *"fires after"* figure for all ten.
  **Measured at `2a484b1b`:** seeded with each era's own `midEraCrisisNodeIds` at mastery 2,
  `midEraCrisisCall` returns `standing: true` for **all ten** eras — including the six now shelved
  (`neolithic 3/5`, `bronze_age 3/5`, `medieval 3/5`, `renaissance 3/6`, `atomic_age 5/9`,
  `information_age 3/6`). That is **O-23**.
- **`engines/game/src/mid-era-crisis.test.ts`** asserts its sweep covers *"every era in the shipped
  sequence, and there are ten of them"* as its floor. The floor is correct for the arithmetic
  D-CRISIS-9 rules and would need re-scoping only if O-23 is answered by gating the call.
- **`apps/web/src/city/crisisCall.ts:445`** — *"each era has its own crisis and its own
  [trigger]"*, in the comment explaining why an era advance re-arms everything. **The behaviour is
  already correct**: `CRISIS_BRIEFING_ERAS` is `[CURRENT_ERA_ID]` and `hasPlayableCrisis` gates on
  it, so only era one has a playable crisis today. The comment's *reason* is what the ruling
  narrows.
- **`apps/web/src/city/crisisEntrySequence.test.tsx:374`** — the same sentence in a test comment.
- **`apps/web/src/winter/WinterStatusStrip.tsx:51`** — *"for all ten crises"*.

**All five code sites are carried by O-23 rather than edited**, which is deliberate:
`engines/game` is Evan's lane, none of the five is wrong about what the code *does* today, and a
comment sweep across two lanes is not a documentation change.

### D-CRISIS-33 (RULED) — the four move to eras 1, 4, **6** and **9**. Boiler Cascade and Robot Uprising are SHELVED; Plague and Intrusion come OFF the shelf

> *"plague feels the most on theme"*

**This AMENDS D-CRISIS-31 and D-CRISIS-32. It repeals neither, and it changes exactly one thing
about either.**

| Era | Crisis | Axis | Scope before | Scope now |
| --- | --- | --- | --- | --- |
| 1 Prehistoric | **Hard Winter** | **Area** | in scope | **in scope**, unchanged |
| 4 Classical | **Succession Crisis** | **Allegiance** | in scope | **in scope**, unchanged |
| 6 Early Modern | **Plague** | **Topology** | shelved | **IN SCOPE** |
| 9 Information | **Intrusion** | **Uncertainty** | shelved | **IN SCOPE** |
| 7 Industrial | **Boiler Cascade** | Ordering | in scope | **SHELVED** |
| 10 Cyberpunk | **Robot Uprising** | Denial | in scope | **SHELVED** |

**What does NOT move, stated first because it is what a reader checks for.** Still **four** crises.
Still **one per selected era**. Still a **persistent end-of-era progression in all ten eras** —
D-CRISIS-31's third clause is untouched, so **D-ERA16 and D-ET3 are confirmed exactly as they were
and neither is reached by this amendment.** The progression side of the design does not move at
all, and no `D-ERA` or `D-ET` id changes.

**Two reasons, and they answer different objections, which is why both are recorded.**

1. **Theme, and it is the lead's own.** *"plague feels the most on theme"*. Era six is the
   Renaissance. A plague there is historically resonant in a way no other placement of that hazard
   would be, so the move **strengthens the fiction** rather than merely surviving. That is a
   positive argument for era six specifically, and it is worth separating from the cost argument
   because a cost argument is satisfied by any cheap crisis and this one is not interchangeable.
2. **Cost.** The Robot Uprising was the sole in-scope customer for mobile agents with pathing and
   for a switchable power network; the Boiler Cascade for the directed dependency graph. **All
   three leave the plan.** §5.39 measures the whole of it against §9 and **corrects the brief that
   produced this ruling in four specifics**, because the ruling stands either way and a recorded
   justification that is wrong is worse than none.

**What this ruling does NOT say.** It does not rank the four, order their build or claim four is
the right number — the same disclaimer D-CRISIS-31 carries. **It repeals no mechanic ruling:
D-CRISIS-1 through D-CRISIS-32 all stand**, and the rows whose *population* it moves are marked in
the register rather than rewritten. **And it does not touch the two placement arguments for the
crises it shelves**, which is deliberate and is the next paragraph.

**D-CRISIS-2 and D-CRISIS-23 keep their reasoning in full, because that reasoning is exactly what a
future un-shelving needs.** D-CRISIS-2 spent the Industrial era on ordering because it is *"the only
era that can host a dependency-order repair puzzle"* — the first era with a machine network — and
**that is still true and still where the Boiler Cascade goes if it is ever built.** D-CRISIS-23
placed the Robot Uprising at era ten because *"it only reads as an inversion to a player who has
spent nine eras doing the opposite"* — **so if it returns, it returns to era ten.** Neither argument
is weakened by the shelving; both are the answer to a question a later reader will otherwise ask
from scratch. Deleting them would convert a scope change into a loss of design, which is
D-CRISIS-32's own clause applied to the two crises it did not originally cover.

#### 5.39 The cost arithmetic, re-derived over {1, 4, 6, 9} — and the brief that asked for it is WRONG in four places

**This section exists because the brief that produced D-CRISIS-33 reasoned from a summary of §5.35
rather than from §9's table, and asked to be checked.** It was right about the direction and wrong
about the size, and one of its errors would have contradicted a ruling. **The ruling stands on the
lead's theme argument and on a real saving; what follows is the accurate version of the saving.**

**§9's *"Needed by"* column, read against {1, 4, 6, 9} the way §5.35 read it against {1, 4, 7, 10}.**
Nothing in §9 was edited to produce this; the populations are its own.

| §9 capability | Its stated population | In scope under {1, 4, 7, 10} | **In scope under {1, 4, 6, 9}** |
| --- | --- | --- | --- |
| Repair: rebuilding a ruin | 1, 5, 8, 3 | 1 only | **1 only** |
| Repair: reclaiming ruined ground | 1 | 1 only | **1 only** |
| Capacity locking — the durable record | 2, 4, 6, 9 | 4 only | **4, 6 and 9 — THREE** |
| Capacity locking — a penalty term | 2, 4, 6, 9 | 4 only | **4, 6 and 9 — THREE** |
| Capacity locking — restoring it | 2, 4, 6, 9 | 4 only | **4, 6 and 9 — THREE** |
| Mobile agents with pathing | 3, 10 | 10 only | **none — LEAVES** |
| Hidden state — unknown location | 2 | none | none |
| Hidden state — unknown status | 9 | none | **9 only — ARRIVES** |
| Directed dependency graph | 7 | 7 only | **none — LEAVES** |
| Tile adjacency between buildings | 5 | none | none |
| A drawn link layer over buildings | 6, 7 | 7 only | **6 only — customer transfers** |
| A propagation rule over a graph | 5, 6, 7 | 7 only | **6 only — customer transfers** |
| A power network with switchable state | 10 | 10 only | **none — LEAVES** |
| Faction ownership per building | 4 | 4 only | **4 only** |
| A banked crisis-scoped currency | 4 | 4 only | **4 only** |
| Turn-indexed arrival schedule | 8 | none | none |
| Per-era authored land (D-ERA25) | 2–10 | 4, 7, 10 | **4, 6, 9** |

**Finding one, and it reverses §5.35's headline. THREE capabilities are shared by THREE of the four,
where the old set shared nothing with anything.** All three capacity-locking rows are needed by eras
4, 6 and 9 alike. This is not a discovery; **§9 already says it and §5.18 already argued it** —
D-CRISIS-16's contested districts and D-CRISIS-18's wrong-isolation cost *"both suspend a building's
contribution"*, which is what moved that row's population from two crises to four on 2026-07-30.
**The old set simply happened to contain only one of the four capacity crises, and the new set
contains three.** So *"the ten-crisis plan's economies of scale lived entirely in the six now
shelved"* was true of {1, 4, 7, 10} and is false of {1, 4, 6, 9}: **the largest economy of scale in
the table is now inside the shipping set.**

**With the caveat §9 itself attaches, because the sharing is not uniform across the three rows.**
The four capacity crises *"share only their penalty half — era two's restore is a purchasable
action, era six's is an automatic lift, and eras four and nine are unruled"*. So the genuinely
shared build is **the durable record — which already ships, as `CrisisDamage.suspended_civic` — plus
the penalty term on `deriveCapacities`**. The restore row is shared in name and diverges in
implementation, and eras four and nine have not been ruled on. **Read the sharing as two rows deep
rather than three.**

**Finding two — *"Intrusion needs only hidden-status state"* is wrong.** Era nine needs hidden
status **and all three capacity-locking rows**, because D-CRISIS-18 rules that a wrong isolation
*"costs the clean building's capacity"*. That is three unbuilt rows, not one. It is the same error
as finding one seen from the other end: the brief carried era nine's distinctive capability and
missed the one it shares.

**Finding three — the Plague is the more expensive of the two, not *"roughly Boiler minus the graph
and the burn-out"*.** Counting unbuilt rows:

- **Boiler Cascade (7): three.** The directed dependency graph, the drawn link layer, the
  propagation rule.
- **Plague (6): four.** The drawn link layer, the propagation rule, the capacity penalty term and
  the capacity restore. It sheds the directed graph and picks up the whole capacity group.

**§9's own prose says so in terms**: *"Under D-CRISIS-8 the Plague needs three capabilities — the
capacity penalty term, the link layer, and a propagation rule over it — which is more than any other
crisis needs."* **So swapping era seven for era six adds a row rather than removing one.** The
saving in this amendment is entirely on the era-ten side. **Two smaller corrections travel with
this one.** *"Reuses"* is the wrong word for the link layer and the propagation rule: both rows had
exactly one in-scope customer before and have exactly one after, so **the customer transferred and
nothing was shared or saved there.** And **burn-out is not a §9 capability at all** — D-CRISIS-17 is
era-seven-specific logic inside the crisis, never a row and never shared, so it leaves with the
crisis without appearing in this arithmetic.

**Finding four — three rows leave the plan, not two, and the missing one is in the brief's own
prose.** *"Pathfinding, mobile agents and the directed dependency graph all leave"* names **two**
§9 rows, because pathfinding and mobile agents are one row (*"Mobile agents with pathing"*, needed
by 3 and 10). **The switchable power network leaves too**, and the brief says so a paragraph earlier
before dropping it from the conclusion. The three that leave are: mobile agents with pathing, the
directed dependency graph, and the power network with switchable state.

**The honest total.** Counting distinct §9 engine rows in the union, and excluding per-era authored
land because §1 classifies it as a content dependency rather than an engine one:

| | {1, 4, 7, 10} | **{1, 4, 6, 9}** |
| --- | --: | --: |
| Rows in the union | 12 | **10** |
| Of those, already built | 1 (the durable record) | 1 (the durable record) |
| **Unbuilt engine rows** | **11** | **9** |
| Rows shared by two or more of the four | **0** | **3** |
| Crisis-to-capability demands | 11 | 13 |
| Demands per unbuilt row | 1.00 | **1.44** |

**Read the *shared* row against the *already built* row before quoting either.** Three union rows
are shared under the new set, and **one of the three already ships** — the durable record, which
landed on 2026-07-30. **So the shared build that is still owed is two rows deep**, the penalty term
and the restore, and it is the two-row figure that every per-crisis count below uses.

**Three rows leave, one arrives, so the union falls from eleven unbuilt to nine — a saving of two
rows out of eleven.** That is real and it is **smaller than the framing implies**; anyone quoting
this ruling should say *"two of eleven"* rather than *"pathfinding, mobile agents, a power network
and a dependency graph all leave"*, which sounds like four and is three rows against one arriving.

**What the move actually buys is better described by the last two rows of that table than by the
saving.** The old set was eleven bespoke builds serving eleven demands, one customer each. The new
set is nine builds serving thirteen demands, with the two-row capacity core doing duty for three of
the four crises. **That is a different kind of cheaper**, and it is the opposite of what §5.35 found
about the previous set.

**Per-crisis, which is what a scheduler wants**, counting unbuilt rows each in-scope crisis needs:

| Era | Unbuilt rows it needs | Of which single-customer | Of which shared |
| --- | --: | --- | --- |
| 1 Hard Winter | 2 | both repair rows | — |
| 4 Succession | 4 | faction ownership, banked currency | capacity penalty, capacity restore |
| 6 Plague | 4 | link layer, propagation rule | capacity penalty, capacity restore |
| 9 Intrusion | 3 | hidden status | capacity penalty, capacity restore |

**Era four is no longer uniquely the most expensive; era six ties it at four rows**, and both carry
exactly two single-customer systems. **O-3 comes back from the dead**, because §5.35 narrowed the
build order *"almost to nothing"* on the grounds that there was nothing left to sequence for
sharing's sake, and there now is: **the capacity penalty term is worth building once, before or
alongside whichever of eras 4, 6 and 9 is scheduled first.** §5.8's schedule-sensitivity argument is
about a crisis in scope again, and it half survives — era six built after eras two and seven would
have been *"nearly free"*, and both of those are shelved, so era six pays for the link layer and the
propagation rule alone whatever the order. **Its swing is now two rows rather than three**, and it
is still the most order-sensitive of the four.

**One consequence lands outside §9 and is the largest single effect of this amendment on owed code.
O-20's population goes from one live customer to three.** D-CRISIS-28's capacity mechanism is
*"inert until wired"*, and the wiring is O-20. Under the old set it had one in-scope customer, era
four. Under this set it has **eras 4, 6 and 9 — three quarters of the shipping spine** — so the
seam between `residence_capacity` and `livability` is now load-bearing for three of the four crises
rather than one. **Nothing about O-20 changes in kind and its priority changes a great deal.**

**Repair is unaffected and stays §9's most load-bearing unbuilt system.** It is era one's alone in
both sets, D-CRISIS-7 still makes it required rather than desirable, and era one still ships two
prices it cannot collect. **Neither incoming crisis needs it** — the Plague destroys nothing and the
Intrusion disables rather than ruins — so the *"if one system is built before any second crisis, it
should be this one"* recommendation is untouched.

#### 5.40 D-CRISIS-32's reserved-axis list inverts — and the brief's version of it would have forbidden Intrusion from being Intrusion

**D-CRISIS-32's first clause is the one that has to move with the set**, because it is what tells a
future author what the in-scope four may not take. It read:

> No crisis among the four may take Sacrifice, Topology, Triage, Interception, Uncertainty or
> Information-gathering, because the whole point of keeping the designs is that they remain
> pickable.

**Under D-CRISIS-33 the reserved list is: Sacrifice (5), Triage (8), Interception (3),
Information-gathering (2), *Ordering* (7) and *Denial* (10).** Two off, two on, and the list is
still six long because the shelf is still six deep:

| Axis | Its era | Before | Now |
| --- | --- | --- | --- |
| **Topology** | 6 Plague | reserved | **OFF — era six ships and owns it** |
| **Uncertainty** | 9 Intrusion | reserved | **OFF — era nine ships and owns it** |
| **Ordering** | 7 Boiler Cascade | in scope | **ON — reserved for a shelved design** |
| **Denial** | 10 Robot Uprising | in scope | **ON — reserved for a shelved design** |
| Sacrifice | 5 Great Fire | reserved | reserved |
| Triage | 8 Missile Alert | reserved | reserved |
| Interception | 3 Raid | reserved | reserved |
| Information-gathering | 2 Lost Herd | reserved | **reserved — see below** |

**The brief that produced this amendment got that list wrong, and the error is worth recording
rather than quietly fixing, because it is the exact failure the clause exists to prevent.** It asked
for *"Topology and Information-gathering"* to come off, on the reading that Information-gathering is
what Intrusion does. **Information-gathering is era TWO's axis** — the Lost Herd's, *"under a search
budget"* (§3) — and era two is still shelved. **Era nine's axis is Uncertainty**, *"paying for
information rather than for effect"*.

**Taken literally the brief's list would have done two contradictory things at once.** It would have
**released a shelved crisis's axis**, so a future author could have given the Lost Herd's
information-gathering to one of the four and left era two unpickable — which is what D-CRISIS-32
exists to forbid. And it would have **left Uncertainty reserved while era nine ships**, so the
reserved list would have forbidden the Intrusion from taking the Intrusion's own axis. **That is a
direct collision with D-CRISIS-1**, which forbids two crises sharing an axis and cannot coherently
forbid one crisis from holding its own.

**The gloss is understandable and it is still a defect.** *Information-gathering* is a fair
plain-English description of what Intrusion does; the two axes are genuinely adjacent, which is why
§3 distinguishes them by what the player is buying — era two pays to find **where** a thing is, era
nine pays to find **what** a known thing is. **§9 keeps them on separate rows for the same reason
and says so**: *"it is different machinery: 2 hides where a thing is, 9 hides what a known thing
is."* **The reserved list uses §3's names**, and it must, because those are the names D-CRISIS-1
adjudicates over.

**The other two clauses of D-CRISIS-32 are unchanged in substance and change population.** *A
shelved design is not evidence about shipping* now applies to eras 7 and 10 as well, and cuts the
other way for eras 6 and 9 — **anything derived from the four while the four were 1/4/7/10 must be
re-derived**, which is the whole of §5.39. And *a shelved design must not be silently orphaned*
applies to the briefs on #307 with a
changed membership, which is **O-24**, re-pointed in §5.41.

#### 5.41 Every citation site swept for the new set, and what each now says

**Swept at `db2b18c2`, searching for the CONCEPT rather than the literal**, because §5.38's own
sweep found the plainest one-crisis-per-era sentence in the tree sitting in the era **trial**
contract, which is a document about a different encounter. Four searches were run and all four are
reported, negatives included: the set literals (`1/4/7/10` and its spelled forms), the decision ids
(`D-CRISIS-31`, `D-CRISIS-32`), the shelving vocabulary (`SHELVED`, `DEFERRED 2026-07-31`), and the
four crisis names (`Plague`, `Intrusion`, `Boiler Cascade`, `Robot Uprising`).

**In this document — amended:**

| Site | What it said | What it now says |
| --- | --- | --- |
| The **status line** | *"eras 1, 4, 7 and 10"* | *"eras 1, 4, 6 and 9"*, with the previous set recorded in the note beneath and the count noted as unmoved |
| **§1**'s narrowing note | *"the other three — eras 4, 7 and 10"* | Re-pointed to 4, 6 and 9, with the land dependency re-checked and found **unchanged** — all three are still unauthored |
| **§3**, the scope column | Four rows carried the wrong value | Eras 6 and 9 **IN SCOPE**, eras 7 and 10 **SHELVED**, each dated to D-CRISIS-33 |
| **§3**, the four-axes paragraph | *"Area, Allegiance, Ordering and Denial"*, and the near-collisions *"all fall outside the surviving set"* | Corrected: Area, Allegiance, **Topology** and **Uncertainty**, and the near-collision claim is now **false** and marked so — two of the three have an in-scope member |
| **§3**, the three near-collisions | Scope clauses naming the old survivors | Each re-marked: the moving-hazard trio is **shelved entirely**, the Fire/Plague pair **collapses to the Plague**, and the Boiler/Plague pair's surviving member is now the **other** one |
| **§5.12**, the trigger table | *"three of the four fire at three, and era ten is the one that differs"* | Re-derived: **all four fire at three**, era ten having been the only exception |
| **§5.13**, duration shapes | In scope: era 1; era 10; eras 4 and 7 | Era 1; **era 6**; eras 4 and **9** — still one of each shape plus one. **O-15 and O-16 swap sides** |
| **§5.20**, rituals and cadences | Four distinct cadences, naming eras 1, 4, 7, 10 | Four distinct cadences again, naming eras 1, 4, **6**, **9**; **each of the three shared pairs now keeps exactly one member**, and no two adjacent in-scope eras share one |
| **§5.24**, the action budgets | *"the Boiler Cascade is the only live budget"* | **Intrusion's is the only live budget**, and it is the only one of the three with no existing form to start from |
| **§5.35**, the cost asymmetry | *"not one engine capability is shared by two of the four"* | **Half superseded**, with a dated banner: half one inverts and §5.39 is the live derivation; half two, the progression argument, is untouched |
| **§5.36**, era one's thin pool | 6 against 15, 17 and 24 | Re-measured: **6 against 15, 16 and 21**. Every conclusion survives |
| **§7**, the nine in era one's terms | Scope markers on 4, 7, 10 / six deferred | Re-marked for 4, 6, 9; **no floor check, axis or caveat is deleted**, per D-CRISIS-32 |
| **§9**, the capability table | A note saying every row is single-crisis or empty | A dated note: that is true of the old set and **false of this one**, with the populations pointed at §5.39 |
| **§10**, the register | Twenty-two rows carrying D-CRISIS-31 scope clauses | **Nineteen rows besides D-CRISIS-33's own carry a dated D-CRISIS-33 clause** — seventeen amended decision rows, a new *D-CRISIS-32, as amended* row for the inverted reserved list, and the INV-CRISIS row's membership note. **The figure is checkable rather than asserted:** grep this table for `D-CRISIS-33`. **None is repealed**, and the two placement arguments (D-CRISIS-2, D-CRISIS-23) keep every word |
| **§11**, open questions | O-22 open; O-15 live; O-9, O-10, O-16 deferred | **O-22 RESOLVED**; **O-15 DORMANT**; **O-9, O-10 and O-16 wake**; O-18, O-19, O-20, O-23 and O-24 re-pointed |

**In other documents — amended:**

| Site | What it said | What it now says |
| --- | --- | --- |
| `2026-07-29-era-trial-contract.md` **§11.3** | *"four — eras 1, 4, 7 and 10"* in the note correcting the era rhythm | Set corrected to 1, 4, 6 and 9. **The correction's substance is untouched** — the rhythm is still four eras' rhythm and D-ET3 still covers all ten |
| `2026-07-29-era-trial-contract.md` **D-ET3 register row** | The same set, restated in the register | Same correction, made separately because a register row is the form most likely to be quoted onward |
| `2026-07-27-era-progression-design.md` **§1** | *"four — eras 1, 4, 7 and 10"* beneath the loop diagram | Set corrected. **The loop is still unchanged and complete for all ten eras** |
| `2026-07-27-era-progression-design.md` **§9** | *"four, at eras 1, 4, 7 and 10"* in the D-ERA16 confirmation | Set corrected. **D-ERA16 is confirmed exactly as before**, and no `D-ERA` id is added — the pinned tally in `test/eraDecisionCount.test.ts` does not move |
| `2026-07-30-hard-winter-crisis-art-brief.md` **§6b** | *"eras 4, 7 and 10 still owe a concluding-screen section"* | **Eras 4, 6 and 9 owe it.** This is the load-bearing one outside this file: it names which of #307's nine briefs are in scope |
| `2026-07-30-hard-winter-crisis-art-brief.md` **§7.4** | *"cut the mid-era crises to four, at eras 1, 4, 7 and 10"* | Set corrected. **The tutorial-duty constraint is unchanged**, and so is its reasoning: era four is still the second crisis, so *"a player who stops before the Classical era"* still meets only the Hard Winter |
| `2026-07-30-hard-winter-crisis-art-brief.md` **§9**, the reference list | The same set, in the D-CRISIS-31/32 reference | Set corrected and D-CRISIS-33 named |
| `2026-07-31-game-completion-ceremony-design.md` **§4** and **§9** | *"IN AN OPEN PR, NOT IN THE TREE"*, and *"Era ten is in the surviving set either way"* | **Both were already stale and are now wrong.** #345 **merged at `2026-07-31T20:23:37Z`**, so the ruling is in the tree; and **era ten is no longer in the surviving set**, so the era-ten endgame loses its first beat. See below — this is the sharpest external consequence |

**The completion-ceremony document is where this ruling actually bites outside the crisis spec, and
it is not where the sweep expected to land.** Its §9 enumerated era ten's endgame as **four**
surfaces in order — the mid-era crisis firing after `ceil(9/2) = 5` of era ten's own nodes, then the
era-ten trial, then era ten's four-beat progression, then the completion ceremony — and said *"the
sequencing is unchanged by #345 merging or not… era ten is in the surviving set either way"*. **Under
D-CRISIS-33 that is false and the first of the four surfaces is gone.** Era ten's endgame is now
**three** surfaces: the trial, the progression, and the ceremony. **That is also the evidence for
O-22's resolution** (below), and it is why the resolution can say nothing is lost at era ten: the
document that owns the ending had already established that the last three beats carry it.

**Swept and clean — no edit owed, and each was read rather than assumed:**

- **The four crisis names** — `Plague`, `Intrusion`, `Boiler Cascade`, `Robot Uprising` — occurred
  **nowhere in the tree outside this document** before this amendment. Measured at `db2b18c2`:
  **zero** occurrences across all files excluding `node_modules` and this one. **So no brief, test,
  comment or work log named the crises whose scope moved**, and the four-name search — the one
  designed to catch a site that discusses a crisis *without* quoting the set, which is how §5.38's
  sweep found the era trial contract — returned nothing to fix. **This amendment then made its own
  measurement stale, which is worth stating rather than leaving as a claim a reader can falsify in
  one grep:** the four names now occur outside this file in exactly one place, the §9 correction
  this amendment wrote into `2026-07-31-game-completion-ceremony-design.md`. **The pre-amendment
  zero is the finding**; the post-amendment count is a fact about this edit.
- **`docs/superpowers/specs/crises/` does not exist in the tree.** The nine per-crisis briefs are on
  #307 only, which is **O-24** and is
  re-pointed rather than closed.
- **The ten era folders under `docs/superpowers/specs/eras/`** contain the string *crisis* **zero
  times**, re-measured at this tip rather than carried from §5.38. **So nothing under `eras/` is
  touched by this amendment either**, and the two era-markdown parsers are again not at risk.
- **`2026-07-27-citizens-and-city-life-design.md`** — its crisis references are all of the form *"a
  mid-era crisis may lower capacity"* and it nowhere enumerates crises by era. **It needs no edit and
  it is now MORE true than it was**: three of the four in-scope crises lower capacity under this set,
  where one did under the last.
- **`engines/game/src/mid-era-crisis.ts`, `mid-era-crisis.test.ts`, `crisisCall.ts`,
  `crisisEntrySequence.test.tsx`, `WinterStatusStrip.tsx`** — the five code sites of **O-23**.
  **Unaffected in kind and re-pointed in set.** `midEraCrisisCall` still reports a standing call for
  all ten eras; `CRISIS_BRIEFING_ERAS = [CURRENT_ERA_ID]` still gates the playable surface to era one,
  so no shelved era can open anything and nothing is broken today. **What changed is the answer O-23
  would be reconciled against**: the four eras are now 1, 4, 6 and 9. **No code is changed here**,
  per §1, and `engines/game` is Evan's lane.
- **`work-log/gabe/2026-07-31-completion-ceremony-and-the-denominator.md`** names the old cadence.
  **Left alone deliberately**: a work log is a dated record of what was found at a SHA, and its
  sentence was true when written. Rewriting one would destroy the thing it is for.

**What this ruling means for #307, which
is open, `mergedAt: null`, and NOT edited here.** Read from the API at `db2b18c2`. The pull request
holds the nine per-crisis briefs and is held for rewrite because two reviews found eight of the nine
sharing one identical declare sentence. **D-CRISIS-33 changes which of those nine are load-bearing
and changes nothing about the rewrite it is held for.**

- **The three briefs that owe a concluding-screen section under D-CRISIS-30 are now eras 4, 6 and 9**,
  not 4, 7 and 10. §6b of the art brief is corrected accordingly, and that is the document #307's
  briefs inherit their section map from.
- **Era six's and era nine's briefs are now the two that describe crises somebody will build**, so
  the identical-declare-sentence defect matters most in exactly those two — a shared sentence across
  shelved designs is a tidiness problem, and across shipping ones it is D-CRISIS-19's failure arriving
  through the briefs.
- **Era seven's and era ten's briefs are now shelved designs** and are **retained**, marked deferred,
  with their README rows kept. D-CRISIS-32's third clause covers them now that they have changed
  sides, and the trap it names is unchanged: a rewrite briefed *"the spine is 1/4/6/9"* would delete
  the wrong two briefs and satisfy the letter of this ruling while breaching D-CRISIS-32.
- **O-24 is re-pointed, not closed.** It still has a deadline attached to somebody else's merge, and
  the deadline now protects eight shelved briefs' worth of design rather than six.

### D-CRISIS-34 (RULED) — a Succession "cycle" is a QUESTION BATCH

**THE RULING (the team lead, 2026-07-31): a cycle advances on an answered question batch.**
D-CRISIS-16 settled that a cycle must advance on player actions and never on elapsed time,
which fixed the clock and left the unit open; **the unit is the batch.** This closes **O-14**,
and it takes the option O-14 called *the likely answer* — by analogy with era one's
`end_round`, which is the same unit one crisis earlier.

#### 5.42 Why the batch, and the two questions that follow from it rather than being decided beside it

**The reasoning is the ruling and is what makes the crisis work, so it is recorded rather
than left as a preference between two units.**

**Neutral drift is the crisis's entire clock.** D-CRISIS-16 gives era four no timer, no
budget and no supply to exhaust — **D-CRISIS-26's scope note** records that the Succession
Crisis is deliberately the one solve-it crisis with **no action budget**, because its
terminal condition is *"already supplied by D-CRISIS-16's neutral drift"*. The cycle is
therefore not one pacing knob among several. It is the only thing
that moves the board without the player, and §5.13 leans on it for the terminal condition
as well: the crisis settles **when no district remains neutral**, and drift is what
guarantees it gets there.

**Tying the cycle to the batch makes EARNING INFLUENCE AND LOSING GROUND THE SAME ACT.** A
batch is how influence is minted (D-CRISIS-4: *"correct answers earn visible influence"*),
so under this ruling the act that funds you is the act that moves a neutral district toward
whoever is already strongest. **You cannot accumulate without the board moving against
you.** That is what charges the player for **hesitation rather than for error**, which
§5.18 names as the whole reason drift is the right mechanism for era four rather than a
generic penalty — error already has a home in every crisis, since accuracy sizes the action
(INV-CRISIS-4), and nothing else in the ten charges for declining to act. **The batch is
the unit that puts the two on the same tick**, and that axis is the one this crisis exists
to occupy.

**The rejected alternative is recorded because the reason it fails is the sharpest statement
of what the ruling buys.** If a cycle advanced on **commitment** — on the player spending
influence — then **never committing would mean never drifting**, so waiting would be free
in the one crisis in the ten built to punish it. The mechanism would be armed only against
players who were already acting. The other rejected end is O-14's own: if **any** action
advanced a cycle, opening a menu would cost a district, which charges for navigation rather
than for hesitation and makes the board hostile to inspection — INV-CRISIS-10 (*everything
provisional is previewed*) assumes a player may look before committing, so an
any-action cycle would price the preview the invariant guarantees.

#### 5.42a O-6 is RESOLVED BY CONSEQUENCE, and the derivation is shown so it reads as one

**It was not decided separately, and it can be overridden without reopening D-CRISIS-34.**
Both halves are recorded with what each rests on, because they do not rest on the same thing.

**Unspent influence SURVIVES BETWEEN CYCLES.** This half follows from the ruling and from
nothing else: once a cycle is a batch, influence that did not survive one would only ever be
spendable inside the batch that minted it, which is **era one's spend-on-earn shape** —
*"the tier is spent the instant it is earned"* (D-CRISIS-4). Banking would then be a
mechanic in name only, and D-CRISIS-4's own claim that influence is *"the first
crisis-scoped resource in the ten"* and *"a genuine departure from era one's shape"* would
be false of the thing it describes. **The unit is what makes this half derivable at all**:
under a coarser cycle *between cycles* would have no referent, and under an any-action cycle
it would be the trivial claim that influence survives a menu.

**Unspent influence EVAPORATES AT THE END OF THE CRISIS.** This half is not a consequence of
the cycle unit and is not presented as one — it is **the leaning D-CRISIS-4 already carried**
(*"whether unspent influence survives the crisis — it should not, or it becomes a passive
store and brushes INV-CRISIS-2"*), now ruled. Influence is **crisis-scoped currency**, so it
ends with its crisis, and INV-CRISIS-2 is the reason: a balance that outlives the encounter
that scopes it is a passive store, and nothing in the city may hold value that no learning
work has to be done to keep.

**The two halves together are what O-6 asked for**, and they do not conflict: surviving
between cycles is what makes banking real, and expiring at the end is what stops it becoming
a store. **O-6's other half stays where D-CRISIS-16 left it** — the declare-before-you-answer
worry was already narrowed on 2026-07-30 because drift makes waiting cost something, and
nothing here moves it.

#### 5.42b O-13 is NOT resolved by this ruling, and the failed derivation is recorded rather than the conclusion

**This was put to the document as a second resolution-by-consequence and it does not
survive contact with O-13's actual text.** It is recorded as a failed derivation, because a
reader who is told O-13 followed from D-CRISIS-34 would have no way to find out that it
could not have.

**What was proposed:** that a player who never answers the call sees drift take every
district, and the crisis ends decided against them — an ending with consequences and never a
loss, per INV-CRISIS-3.

**Why it cannot follow from D-CRISIS-34.** A cycle now advances on an **answered question
batch**. A player who never answers the call never enters the crisis, so answers no batch
inside it, so **no cycle advances and no district drifts.** The proposed consequence needs
the drift to be running, and this ruling is precisely what stops it running for that player.
Far from resolving O-13, the batch unit **sharpens** it: it makes *the crisis sitting on the
doorstep is frozen* a fact about the mechanism rather than an oversight.

**And O-13 is not the question the proposal answers.** O-13's subject is the call, not the
commitment: D-CRISIS-10 carries it as *"whether the call can be left unanswered
indefinitely … the announcement waits, and nothing here says whether **era advancement
waits with it**"*, and it points at §5.13 with the distinction spelled out — boundedness *"is
a claim about a crisis in progress and not about one on the doorstep."* **Era advancement is
untouched by any cycle unit**, and it is what O-13 needs ruling. It also still interacts with
D-ERA17's *"a banked era still owes its trial"*, which O-13 records as the same question one
encounter later, already ruled the other way. **O-13 stays OPEN, with the team lead, exactly
as it stood.**

> **O-13 IS NOW CLOSED — see D-CRISIS-35 (§5.43), the team lead, 2026-07-31 — and EVERY WORD
> OF THIS SECTION IS UPHELD RATHER THAN SUPERSEDED.** The sentence above is the last thing
> that expired: O-13 did stay open exactly as it stood, and it stood for one more evening.
>
> **The failed derivation recorded here is what made the eventual answer the right shape**, so
> it is worth reading before the ruling rather than after. This section established two things
> and the ruling rests on both. **That no cycle unit could ever have closed O-13**: the drift
> mechanism structurally cannot reach a player who never entered, so the answer had to come
> from the game rather than from era four — which is exactly where D-CRISIS-35 comes from.
> And **that era advancement was the half O-13 actually needed ruling**, which is why
> D-CRISIS-35 rules it as its own clause (§5.43b) instead of letting it fall out of the
> freeze, where it would not have fallen out at all.
>
> **The claim this section makes about the mechanism is unchanged and is now permanent rather
> than provisional.** *The crisis sitting on the doorstep is frozen* was written here as a
> property of the batch unit and a sharpening of the question. Under D-CRISIS-35 it is still
> true of the crisis — nothing drifts, nothing progresses, the encounter waits — and the
> ruling adds what the sentence never claimed: **the city is frozen with it.**

**What the proposal IS true of, and it is worth keeping.** Read against a player who
**enters and never commits**, it is sound and it does follow — from D-CRISIS-16 and this
ruling together. That player answers batches, so cycles advance, so every neutral district
drifts to the strongest faction and the crisis reaches its terminal condition **decided
against them**. It is carried below as this ruling's outcome clause rather than as O-13's
answer, because the two differ in the one way that matters: **one player is inside the
crisis and the other never opened it.**

#### 5.42c The outcome clause, and the one thing it deliberately does not touch

**A Succession Crisis settled entirely by drift is an ENDING WITH CONSEQUENCES, never a
loss.** The city carries what the factions took — D-CRISIS-7's floor, *"you survive, but the
city carries the consequences"* — and INV-CRISIS-3 has no losing outcome to reach. Era four's
consequence is already named and needs nothing new permitted: contested districts **suspend a
building's contribution**, which §5.18 records as one of the two capacity-penalty customers
and which D-CRISIS-7 already allows.

**This does NOT touch O-19, and the reason is structural rather than a decision to leave it
alone.** O-19 asks whether an **unsolved** ending is a loss or an ending with consequences,
and it is scoped to the crises D-CRISIS-26 gives a finite action budget to — one, after
D-CRISIS-33 re-pointed it at Intrusion. **Succession is excluded from that ruling by name**
(D-CRISIS-26's scope note: *"era four needs no budget to be bounded, so it is not given
one"*), and a
drift-settled Succession is not an unsolved ending at all: **it reaches its terminal
condition**, which is that no district is neutral. A crisis that ends the way its own
mechanism says it ends is solved, however badly. So nothing here narrows O-19 in either
direction, and a reader should not take this outcome clause as a precedent for it.

**No numbers are set here**, per §1 — not the influence yield of a batch, not how many
neutral districts a cycle takes, and not how many batches a Succession Crisis runs for.
D-CRISIS-34 fixes a **unit**, and every magnitude denominated in that unit is still unset.

> **THIS CLAUSE IS UNDISTURBED BY D-CRISIS-35, and the reason is the distinction that ruling
> is built on.** §5.43 freezes the city of a player who **never enters**. Everything above
> describes a player who **entered and never committed**, who is inside the crisis, answering
> batches, with cycles advancing and districts drifting. **The two players never meet**: the
> first has no crisis running to drift anything, and the second is not frozen out of a city
> they are not currently standing in. Read §5.43a before assuming either clause reaches the
> other's player.

### D-CRISIS-35 (RULED) — an unanswered call FREEZES THE CITY, and never the learning

**THE RULING (the team lead, 2026-07-31), in three parts.**

**Part 1 — the city freezes.** A player who is given a crisis call and does not enter the
crisis **cannot do anything in their city**. No building of any kind, no road laying, no
civic purchases, no moving of placed buildings. **The city is frozen until they enter the
crisis.**

**Part 2 — learning is NOT frozen.** Lessons and practice continue normally during the
freeze. **The lead ruled this explicitly**, and the reasoning is recorded because it will
otherwise be re-litigated: the city is **the reward layer**, and holding it hostage is what
creates the pressure to engage — whereas blocking lessons would stop the learner doing the
thing the product exists for. It would also be **self-defeating**, because a crisis draws its
questions from skills the learner has mastered (**D-CRISIS-14**, **INV-CRISIS-8**), so locking
them out of learning locks them out of the only activity that makes the crisis winnable.

**Part 3 — the safety valve is a RELEASE GATE AT AUTHORING TIME, not an in-game escape
hatch.** Because the crisis is now modal, a crisis that cannot be entered or completed would
leave the player permanently stuck with no way out. The valve is **a check that fails if a
crisis era cannot compose a playable crisis, so such a state can never ship.** It is recorded
here as a requirement; **its release-gate part was implemented on 2026-08-18** in
`apps/web/src/release/eraReleaseGate.ts`; §5.43c states precisely what
it must assert.

**This CLOSES O-13**, at the level O-13 itself said the answer had to come from. The row asked
what happens if the player never answers the call, and §5.42b established the evening before
that no ruling about the inside of a crisis could reach it — **so this is a ruling about the
game, and the city is the thing it rules on.**

#### 5.43 Why the city and not the lessons, and why that is the ruling rather than a preference

**The asymmetry IS the design, so it is recorded as an argument rather than as a pair of
switches.** A freeze that took both halves and a freeze that took neither are both coherent
products; this one is neither, and the reason it is neither is the whole of what the ruling
buys.

**The city is the reward layer, and a reward layer is the only thing that can be held
hostage.** Everything the freeze touches — a building, a road, a civic purchase, a move —
is something the learner **earned by learning** and then spends on the place they are
making. That is what gives the freeze its grip: it does not punish, it **suspends the
payoff**, and the payoff resumes the moment the player walks through the door that is
already open. **A crisis you can decline forever is a crisis with no stakes at the level the
player actually feels**, and every stake this document has ruled so far — capacity, damage,
influence, districts — is a stake **inside** an encounter the player has already chosen to
enter. D-CRISIS-35 is the first that bites before entry, which is why it had to be ruled at
the game level and could not be assembled out of the crisis rulings.

**Blocking the lessons would stop the learner doing the thing the product exists for.** This
is the half the lead ruled explicitly, and it is not a softening of Part 1. A learner who sits
down to learn and is told they may not is a learner the product has failed on its own terms,
whatever the encounter design wanted. **The city is a reward for learning; the learning is not
a reward for anything**, and a freeze that reached it would have inverted the relationship
the whole game is built on.

**And it would be SELF-DEFEATING, which is the argument that makes Part 2 structural rather
than merciful.** A crisis draws its questions from skills the learner has already mastered —
D-CRISIS-14's three-era window, and for era one *100% of its own mastered nodes*. So the
pool a crisis is composed from **grows only through lessons and practice**. Freeze the
learning and the crisis does not become more urgent; it becomes **permanently no more
winnable than it is at the moment of the freeze**, and for a learner who is not ready it
becomes a wall with the only ladder removed. **Part 2 is what keeps the exit reachable**, and
in that sense it is doing the same work as Part 3 one layer up: Part 3 stops a crisis
shipping that nobody can enter, Part 2 stops a player being held at one that nobody in their
position could win.

**This is the same shape as D-ERA17 one encounter earlier, and O-13 recorded that
interaction as a divergence.** `2026-07-27-era-progression-design.md` **D-ERA17** rules that
*a banked era still owes its trial* — prior credit discharges the **lessons** and never the
**encounter**. O-13 noted the interaction and called it *"already ruled the other way"*, which
was correct while O-13 was open and is now backwards: under this ruling the two agree.
**An encounter is not dischargeable by not doing it**, at either level, and the thing that is
always discharged rather than gated is the teaching. D-ERA17 discharges lessons and keeps
the trial; D-CRISIS-35 keeps the lessons running and gates everything else. **The same
principle, and it now reads as a precedent rather than as a conflict.**

#### 5.43a THE TWO PLAYERS, stated in one place because collapsing them is the original error

**O-13 was written collapsing them, D-CRISIS-34 was nearly closed on the collapse, and the
distinction is what caught it.** §5.42b records the failed derivation; this table is what a
reader needs so the failure is not repeated in the other direction.

| | **Never enters** | **Enters and never commits** |
| --- | --- | --- |
| Where they are | Outside the crisis; the call stands on the doorstep | Inside the crisis, answering batches |
| Does anything drift? | **No.** A cycle advances on an answered batch (D-CRISIS-34) and they answer none, so no cycle advances and no district moves | **Yes.** Cycles advance, so every neutral district goes to the strongest faction |
| How it ends | It does not end. **It waits**, and the city waits with it | It **reaches its terminal condition** — no district neutral — **decided against them** |
| What it costs | The whole city, suspended, until they enter (**D-CRISIS-35**) | The districts, and the contested-building capacity penalty (**§5.42c**) |
| Is it a loss? | No. Nothing has happened yet | No. **An ending with consequences** (INV-CRISIS-3, D-CRISIS-7) |
| Ruled by | **D-CRISIS-35**, at the game level | **D-CRISIS-34's outcome clause**, at the crisis level |

**Neither answer is available at the other's level, and that is why there are two rulings.**
The drift mechanism cannot reach the first player — **structurally**, not by omission — because
the unit that drives it is an answered batch and they answer none. And the freeze has nothing
to say about the second, who is not being kept out of a city they are not in. **A future
reader who finds only one of these two rows has found half the answer**, which is the failure
this table exists to prevent.

#### 5.43b ERA ADVANCEMENT IS GATED, and it does NOT follow from the freeze

**The conclusion is the lead's and the derivation offered for it fails, so the gate is ruled
as its own clause.** This is recorded at length because the failing derivation is the
plausible one, and a later reader who re-derives it will reach the wrong answer confidently.

**What was put:** that a player cannot advance an era with an unanswered crisis, **since they
cannot build**.

**Why it does not follow.** `2026-07-27-era-progression-design.md` **D-ERA5** rules that *the
Town Hall upgrade is the chapter break, and it is gated on learning alone* — mastering every
skill in the era unlocks the trial, and passing the trial advances the era. Its §4 is explicit
that nothing else may gate it: *"Resources can never buy progress. Era advance is gated on
mastery and the trial, never on a balance, a population figure, or a happiness reading."*
**Neither half is a build action.** Mastery comes from lessons and practice, which Part 2
keeps running by name, and the trial is an encounter rather than a placement. **So the freeze
in Part 1 does not touch either half of the advance**, and a frozen player who simply kept
learning would master the rest of the era, pass its trial, and **advance out from under the
crisis** — with the era advance functioning as a documented exit from the freeze, in the
document that rules the freeze.

**It is worse than a gap, because the exit is already wired.** Measured at `de43b481`:
`apps/web/src/city/crisisCall.ts` re-arms the whole call on an era change —
*"AN ERA ADVANCE RE-ARMS EVERYTHING, because each era has its own crisis and its own
trigger"* — clearing `pending`, `answered` and the standing baseline. **So an era advance does
not merely bypass the standing call; it discards it.** A freeze built on Part 1 alone would be
escapable by the one action the game is most keen for the player to take, and the crisis would
be quietly skipped by the most diligent learners rather than by the least.

**THE CLAUSE, therefore, ruled and not derived: a standing crisis call GATES ERA ADVANCEMENT.**
A player with an unanswered call may master every remaining node and may attempt nothing that
advances the era until they enter the crisis. **This is what O-13 asked** — D-CRISIS-10 carried
the row as *"the announcement waits, and nothing here says whether era advancement waits with
it"* — and the answer is that it waits with it.

**D-ERA5 is NARROWED and INV-COS-1 / INV-COS-2 are NOT touched, and the distinction is worth
being exact about.** D-ERA5's *gated on learning alone* acquires a second gate, and that is a
real amendment recorded at the era design's own §4 rather than only here. But the thing D-ERA5
exists to forbid is untouched: **the crisis is an encounter, not a resource.** A crisis call is
not a balance, not a population figure and not a happiness reading, so *resources can never buy
progress* survives word for word — no amount of gold, livability or citizens opens this gate,
and the only thing that opens it is entering an encounter made of the learner's own mastered
skills. **The new gate is on the learning side of D-ERA5's own line**, which is why it can be
added without repealing the decision it narrows.

#### 5.43c THE RELEASE GATE — what it must assert, and the prerequisite it depends on

**Part 3 is a requirement and NOT a build.** No code is changed by this document (§1). What
follows is what the gate must assert, stated so that whoever builds it does not have to
re-derive the population — and the repository's own guard conventions
(`.cursor/rules/qa-verification.mdc`) are why the population is argued rather than asserted.

**Scope it by the BEHAVIOUR, not by the implementation.** The population is **every era that
can freeze a city**, which is every era that can raise a call the freeze would honour. It is
**not** *every era that imports the crisis shell* and **not** *the four in D-CRISIS-33's
spine*, because an era can freeze a city without either being true of it. Deriving the
population from the crisis surface would produce exactly the guard that passes while the
defect ships.

| | The gate must assert | The state it forbids |
| --- | --- | --- |
| **A** | Every era that can raise a standing call **has a playable crisis** — and the predicate the freeze keys on is **the same predicate** that decides a crisis exists, not a second copy of it | A city frozen by a call that opens nothing |
| **B** | For each such era, a crisis batch **composes at the trigger state** — at exactly `ceil(n / 2)` mastered nodes, over D-CRISIS-14's window, **through the real composer** rather than by re-deriving its arithmetic | A crisis that can be entered and cannot be played |
| **C** | From that state the crisis **can reach a terminal condition** — D-CRISIS-11 rules that none is unbounded and D-CRISIS-30 that every one concludes, so a crisis with no reachable ending is a frozen city with a door that leads back to itself | A crisis that can be entered and never completed |
| **D** | A **floor** under the population, and any era that legitimately owes none of the above named in a list asserted **in both directions** | A gate that is green because it measured nothing |

**B borrows its discipline from a gate that already exists**, and deliberately: the era trial's
assertion C at `2026-07-29-era-trial-contract.md` §14 runs `composeEraTrial` *"through the real
composer rather than by re-deriving its arithmetic, so the rule cannot drift from the thing it
guards"*. The same reasoning applies with the same force here, and re-deriving `ceil(n / 2)` or
a batch shape inside the gate would reproduce the failure that convention was written against.

**THE PREREQUISITE, and it is a hard one rather than a nice-to-have.** *You cannot do anything
until you enter it* presupposes **a call the player was actually given**. A freeze imposed on a
player who was never called is the permanently-stuck state Part 3 exists to forbid, arriving
through the front door. **So an automatic crisis call is a prerequisite of this ruling**, and
the dependency is recorded here rather than built (§1).

**What is actually in the tree is not what the brief assumed, and the correction sharpens the
dependency rather than dissolving it.** Measured at `de43b481`:

- **Something does call automatically.** `apps/web/src/city/crisisCall.ts`'s `useCrisisCall`
  watches for the trigger crossing, raises the standing notice, opens the advisor and speaks
  an announcement. So *"nothing currently triggers a crisis automatically"* is **not right** as
  stated, and the menu entry is not the only route in.
- **But the call is SESSION-LOCAL and TRANSITION-ONLY.** `wasStandingRef` starts null and *"the
  first ready read only seeds the baseline"*, so only a learner who crosses the trigger **while
  the surface is mounted** is ever called. The module says so in its own words: *"It is not
  persisted, and it does not need to be: mastery only rises, so the crossing happens once and a
  reload re-seeds the baseline past it."*
- **So a learner who returns past the trigger is called by nothing**, and that is pinned rather
  than inferred — `apps/web/src/city/crisisEntrySequence.test.tsx` carries
  *"does not fire for a city that was ALREADY past the trigger when it loaded"*, asserting the
  sequence is quiet and the menu entry is the standing way in. **For that learner the brief's
  description is exactly right**, and that learner is every learner on their second session.
- **And it exists for ONE era.** `CRISIS_BRIEFING_ERAS = [CURRENT_ERA_ID]` gates
  `hasPlayableCrisis`, so eras 4, 6 and 9 can raise no call and open nothing, while
  `midEraCrisisCall` reports `standing: true` for all ten eras — which is **O-23**, and which
  this ruling promotes from a question about where scope lives to a question the freeze cannot
  be built over. A freeze keyed on `standing` alone would freeze all ten eras against one
  playable crisis. **That is gate row A, and it is why row A is written as a same-predicate
  requirement rather than as an existence check.**

**What is therefore owed is not an automatic call but a DURABLE one** — a standing call that is
a fact about the save rather than about a React ref, surviving a reload, and answerable exactly
once. **A freeze keyed on today's call would freeze the city of a player who was never shown
one**, every time they came back. It is named here as this ruling's dependency, and it belongs
to the surface owner rather than to this document.

#### 5.43d The preview-node trap is a SEPARATE hazard, and this gate would NOT catch it

**Both are content-authoring failures that trap a learner, both are answered at release rather
than in play, and neither one's assertions reach the other's failure.** They are siblings, not
duplicates, and a reader who takes the crisis gate as covering the preview node will ship the
preview node.

**The preview-node trap, as `2026-07-29-era-trial-contract.md` §14 traces it.** A node whose
bank cannot fill a valid five-item practice set renders as `preview`; mastery 2 is unreachable
for such a node, because mastery evidence needs the practice set and test-out seeds
`lesson_stage: "done"` at mastery 0; and the trial requires mastery 2 on every node of the era.
So **one under-authored node freezes its era's advance permanently, with no action available to
the learner.** That document is precise about which link does the freezing: the gate keys on
mastery and never on the construction state, so the missing practice set is the cause and
`preview` is the visible symptom. It is **INV-TRIAL-1**, and **D-ET6** answers it with two
chosen safeguards and the four assertions at §14.

**Why the crisis gate would pass over it.** A crisis draws its pool from the learner's
**mastered** nodes (D-CRISIS-14; era one, *100% of its own mastered nodes*). **A preview node
can never be mastered, so it is never in the crisis pool** — it is silently absent rather than
short. The crisis therefore composes exactly as it would in a fully authored era, rows A, B and
C above all pass, and the learner is trapped anyway by a chain the gate never looked at.
**The gate is not weak here; it is aimed elsewhere.**

**And why D-ET6's assertions would not catch a crisis failure either**, which is the same point
in the other direction and the one that decides this is a second gate rather than an extra
clause on the first. §14's assertion C composes **`composeEraTrial`**; nothing in A through D
runs a crisis composer, asserts that an era has a playable crisis, or reads the predicate the
freeze would key on. An era can satisfy every one of them and still be an era where
`hasPlayableCrisis` is false while a call stands — which, measured above, is the state **nine of
the ten eras are in today**.

**They COMPOUND under a modal crisis, and that is what is new.** Before this ruling, a preview
node in a crisis era cost the learner their **advance**: bad, and they could still build, still
play, still spend. Under Part 1 the same learner has a standing call they cannot resolve and a
city they cannot touch, so they lose **the exit and the reward layer at once** — no trial to
pass, no city to build, and the one door out already shut. **The two traps stack rather than
overlapping**, which is precisely why the second gate is owed and why the first is not enough.

**Where the crisis gate belongs: beside D-ET6's, under INV-TRIAL-1's principle rather than
inside its assertions.** *"A content-authoring failure may never trap the learner in an era"* is
already the right sentence; what this ruling adds is a second way to be trapped, one the
existing safeguards were not written over. Both obey the same rule — **block the release, not
the student** — and both are cheap at authoring time and impossible to fix in play, which is the
reason D-ET6 gives for choosing a release gate and the reason the lead gave for choosing one
here.

---

## 6. DEFECT REPORT — era one's tuning documentation contradicts its own constants

**Reported, not fixed. No code is changed by this document.**

Era one's prose says its abandoned ground is permanently lost. Its constants say the ground
has a price to get back. Both readings are in the same two files, and under D-CRISIS-7 the
prose is the half that is wrong.

**The prose, from `engines/game/src/hard-winter-tuning.ts`** (the `reclaim_cost_per_cell`
docblock), and repeated almost verbatim in `hard-winter.ts`'s `winterRuinedGround`:

> The frost is a SEASON: the ground it takes thaws when winter ends, which is why
> `frozen_cells` is reported and never billed. Abandonment is a DECISION: the ground **is
> ruined, it does not come back**, and it is the land the next era wanted to build on. That
> difference is the whole mechanic — the only way to lose ground permanently is to choose
> to.

**The constants, from the same file, disagree on three separate points.**

1. **The name.** The constant is `abandon.reclaim_cost_per_cell` — *reclaim*, not
   *penalty*, not *forfeit*. A reclaim cost is the price of getting something back.
2. **The derivation.** It is anchored against the rebuild cost precisely so that the two
   are exchangeable: *"A ruined BUILDING costs `rebuild_cost_per_ruin` (60) to rebuild. At
   3 material per cell, twenty ruined cells cost the same 60."* Ground is priced in units
   of *a repair that is explicitly possible*.
3. **The anchor's own comment.** `rebuild_cost_per_ruin: 60` reads: *"What rebuilding one
   ruin would cost, in the era's material. REPORTED on the outcome and never spent here:
   the winter has no economy write, and rebuilding is a city-surface action **that does not
   exist yet**. Just over half a lesson's material lump, so **a ruin is a real setback and
   never an unrecoverable one**."*

**And the outcome type settles it.** `HardWinterOutcome` carries `reclaim_cost` — *"The
material reclaiming every ruined CELL would cost. Reported, never spent."* — beside
`rebuild_cost`, and sums them into a field named **`recovery_cost`**, documented as *"Both
bills together: **what putting the settlement back would cost**."* A codebase does not
compute the price of putting back something that does not come back.

**Which reading D-CRISIS-7 selects.** Damage is **scarring with a stated repair price**.
Era one's ground is ruined until it is reclaimed, at 3 material per cell; its buildings are
ruined until they are rebuilt, at 60 each. Neither is a removal. The prose's *"it does not
come back"* is the sentence to correct, and the correction is narrow: what the prose was
reaching for is the genuine and important asymmetry that **frost thaws for free while
ruined ground has to be bought back** — that argument survives completely and is what makes
abandoning a real price. Only the word *permanent* is wrong.

**Note that the two repair prices are authored and unimplemented.** Both are computed and
displayed; neither is spendable, because the actions do not exist. That is the same gap
§9 records as the most load-bearing unbuilt system across the ten.

**A separate confirmation that buildings were never in doubt.** `winterActionRefusal`
already tells the player so, in a string on the screen: *"A ruin cannot be reinforced. **It
can be rebuilt after the winter.**"* The building half of era one has always been
repairable in both prose and constants. The contradiction is confined to the ground.

**A SECOND documentation defect of the same shape was found on 2026-07-30 and is reported at
§5.16**, kept beside the ruling that creates it rather than moved here. Two code docblocks —
`hard-winter.ts`'s `composeHardWinterBatch` and `hardWinterItems.ts`'s `WINTER_NODE_ORDER` —
state that the **cumulative** draw is *"the one thing"* that lets the mechanic scale across ten
eras without a rule change. D-CRISIS-14 retires exactly that claim. Both are accurate about era
one and both are now wrong about era eight, which is the era each of them picked as its example.
No code is changed here either; carried as **O-11**.

---

## 7. The nine, in era one's terms — and rechecked against the failure floor

Each entry gives its axis, the era-one vocabulary it reuses, and the D-CRISIS-7 check.
**No tuning numbers appear here, because none have been authored.**

> **SCOPE MARKERS ADDED 2026-07-31 (D-CRISIS-31, D-CRISIS-32).** All nine entries are kept
> **verbatim** — every axis, every era-one mapping, every floor check and every caveat to author.
> Three are **IN SCOPE** (4, 7, 10) and six are **DEFERRED**. **A deferred entry's floor check is
> still a ruling**, not a note: it is the analysis a later reader would otherwise have to redo,
> and two of the six carry caveats that are the only place a real hazard is written down (the
> Raid's and Missile Alert's *ruin, never delete*; the Great Fire's *repairable ruin, not a
> removal*). Nothing here is safe to compress on the grounds that its crisis is shelved.
>
> **SCOPE MARKERS RE-POINTED 2026-07-31 (D-CRISIS-33).** Four of the nine entries changed value and
> five did not: **eras 6 and 9 are now IN SCOPE, eras 7 and 10 are now DEFERRED.** **Not one word of
> any entry's body is edited** — every axis, era-one mapping, floor check and caveat stands exactly
> as written for all nine, which is the whole of D-CRISIS-32 and applies to the two crises that just
> changed sides in both directions. **Two entries are worth re-reading now that they describe crises
> somebody will build:** era six's floor check is the strongest in the section (*"of the ten it now
> sits furthest inside the floor"*) and carries the accident risk that a plague's natural
> implementation drops population, which D-CIT2 forbids; and era nine's inverts era one's preview
> discipline, with the constraint that *"the cost of an action must still be legible even when its
> target is not"*. Both were analysis about a shelf and are now specifications.

**2 — The Lost Herd.** ***DEFERRED 2026-07-31 (D-CRISIS-32).*** *Where do I look?* Limited search parties into hidden areas,
following tracks and clues. Era one's shape: rounds with a declared action before a batch,
accuracy sizing the search rather than deciding whether it happens. **Floor check: inside
the list**, per D-CRISIS-7 above. Note it is also the **gentlest** of the ten by design,
and the shared constraints permit that — nothing requires a crisis to be as punishing as
era one.

**3 — The Raid.** ***DEFERRED 2026-07-31 (D-CRISIS-32).*** *Where do I block?* Raiders enter at the edge and move toward the hub
along visible routes. Era one's shape: the frost's advance is already an inward march from
the rim, and the Raid replaces a flood front with agents on routes. **Floor check: passes,
with one caveat to author** — raiders reaching a building must scar or loot it, not remove
it. Resources lost is a named permission; a deleted building is not.

**4 — Succession Crisis.** ***IN SCOPE (D-CRISIS-31).*** *Who do I back?* Rival factions claim civic buildings; some
districts turn hostile. Era one's shape: none directly; this is the least era-one-like of
the nine, which is why D-CRISIS-4 gave it a concrete currency. **Floor check: passes only
if factions are confined to CIVIC buildings**, which is what the design says. A faction
taking a **skill** building would breach "earned skill buildings" outright, because a skill
building is the record of a completed lesson. Contested civic capacity may be suspended;
ownership of a lesson may not change.

**5 — The Great Fire.** ***DEFERRED 2026-07-31 (D-CRISIS-32).*** *What do I destroy to stop the flames?* Fire spreads **strictly
through tile adjacency**, building to touching building, and never along a route or a link
(D-CRISIS-8). Firebreaks cost you your own buildings, and **the damage outlasts the
crisis** — a demolished building is still damaged when the fire is out, and recovery costs
materials or rebuilding actions. **The player sacrifices structures.** **This is the one
closest to the line, and era one has already answered it.** A demolished building **must
become a repairable ruin, not a removal** — and that is not a new mechanic, it is exactly
what `abandon` already does: `applyResolution` sets `state: "ruin"` with
`ruined_by: "abandoned"`, the building stays on the board carrying its lesson, and
`rebuild_cost_per_ruin` is reported against it. **The Great Fire's firebreak is era one's
`abandon` applied to a chosen building rather than to the next ring inward.** Framed that
way it is inside the floor by construction and needs no new ruling. **Floor check: passes,
conditional on the ruin-not-deletion framing being written into the design rather than left
to an implementer.**

**6 — Plague.** ***IN SCOPE 2026-07-31 (D-CRISIS-33; deferred by D-CRISIS-32 earlier the same day).*** *What do I shut down, and for how long?* **Spread runs through use and
shared routes, along a few visible links between the buildings people visit — never
through tile adjacency (D-CRISIS-8).** The player closes gathering places, quarantines
buildings and suspends routes; a closed building temporarily loses its livability or
happiness capacity, **nothing is destroyed**, and capacity returns when the outbreak ends.
**The player sacrifices access and capacity, not structures.** **Floor check: passes, and
of the ten it now sits furthest inside the floor** — it matches two of D-CRISIS-7's named
permissions verbatim (*"buildings become temporarily unusable"*, *"civic capacity is
reduced"*) and, having no destructive verb at all, cannot reach the *always preserved*
list even by an implementation slip. §5.10 works this through against the floor's own
wording and against `capacity.ts`'s INV-COS-1 note that *"a shortfall gates nothing"*.
**The accident risk it was flagged for is narrowed but not gone:** the natural
implementation of a plague is still that population falls, which is the exact reading
D-CIT2 forbids and D-CRISIS-5 exists to prevent. **The Plague inherits D-CRISIS-5's
resolution wholesale**: the stake is capacity and the use of gathering places, never the
population count, and the framing language rule applies to it verbatim. §5.10 also records
that the obvious version of the mistake — a `sick` citizen state — **fails to compile**
against a shipped guard, and how era six's capacity stake differs from era two's.

**7 — Boiler Cascade.** ***DEFERRED 2026-07-31 (D-CRISIS-33; in scope under D-CRISIS-31 earlier the same day). Its placement at era seven is UNCHANGED and still ruled by D-CRISIS-2 — the Industrial era is the first with a machine network, so this is where it goes if it is ever built.*** *What do I fix first?* Failure runs downstream through the machine
network. Era one's shape: cumulative damage with a budget before a thing fails, which
`cold_rounds_to_ruin` already models; the Cascade replaces "cold rounds absorbed" with
"time spent downstream of an unfixed fault". **Floor check: passes cleanly** — a failed
machine is *"temporarily unusable"*, a named permission, and repair is the axis rather than
a consequence.

**8 — Missile Alert.** ***DEFERRED 2026-07-31 (D-CRISIS-32).*** *What do I save?* Limited interceptors, several targets, different
arrival times — **in turns, per D-CRISIS-3**. **Floor check: passes, with the same caveat
as the Raid and it bites harder here** — an unintercepted target must ruin, not delete. Of
the ten this is the crisis whose fiction most strongly implies destruction, so the floor
should be restated inside its own design.

**9 — Intrusion.** ***IN SCOPE 2026-07-31 (D-CRISIS-33; deferred by D-CRISIS-32 earlier the same day).*** *What do I spend on finding out?* Buildings may be compromised and you
cannot see which. Era one's shape: the preview discipline inverted. Where INV-CRISIS-10
guarantees you can always see what an action *would* buy, Intrusion's axis is that you
cannot see the **board** — which is a legitimate and different unknown, and the two must
not be confused. The cost of an action must still be legible even when its target is not.
**Floor check: passes** — a compromised building is disabled until cleaned, which is
*"temporarily unusable"*.

**10 — Robot Uprising.** ***DEFERRED 2026-07-31 (D-CRISIS-33; in scope under D-CRISIS-31 earlier the same day). O-22, which was open against this entry, is RESOLVED by the shelving — era ten has no crisis, and its ending is carried by its progression plus the game-completion ceremony. Its placement at era ten is UNCHANGED and still ruled by D-CRISIS-23 — the inversion premise only reads after nine eras of the opposite, so if it returns it returns here.*** *What do I switch off?* Hostiles activate and move toward powered
buildings. **Floor check: passes cleanly** — switching a building off is the most literal
possible instance of *"buildings become temporarily unusable"*, and it is player-initiated,
which makes it a sacrifice the player chooses rather than damage done to them.

---

## 8. One measured finding, and it bears on tuning all ten

**A city built entirely from the build menu's own defaults comes out at seven buildings
across three rim bands with nothing at all on the shoreline — tighter than the `packed`
test fixture — and one top-tier fire still covers five of the seven.**

**The compact board is the game as it ships, not an artefact of the fixtures.** That is the
finding, and it matters to all ten because every crisis will be tuned against some assumed
city, and the assumed city has now been measured against the real one.

It is pinned by `apps/web/src/winter/liveCityLayout.test.ts`, in a test named *"reproduces
the compact board when the city is built from the menu's defaults"*, which asserts the
board through the real converter over real `defaultPlacements` output:

```
expect(result.layout.buildings).toHaveLength(7);
expect(result.layout.includes_hall).toBe(true);
// Nothing on the shoreline, which is exactly the case that made abandoning free.
expect(depths.filter((d) => d === 0)).toEqual([]);
expect(Math.min(...depths)).toBeGreaterThanOrEqual(2);
```

and places it against the authored fixtures in the same test, `expect(bandsOf("packed")).toBe(2)`
and `expect(bandsOf("spread")).toBe(4)`, with `expect(result.layout.bands).toBeLessThan(bandsOf("spread"))`.
Its header states the consequence directly: *"If this ever reports four bands, the city
surface has started spreading buildings out and the winter's difficulty assumptions want
re-reading."*

**Two caveats, stated because the claim should not be over-read.** The seven-building
figure follows from only six of the graph's sixty-two nodes having a building model today,
all of them era one, so the live board is *"six skills plus the hall"* — as more nodes get
models the shape may change, and this test is the tripwire for that. And the **"one
top-tier fire covers five of the seven"** figure is from the work-log measurement
(`work-log/gabe/2026-07-29-hard-winter-on-the-city-you-actually-built.md`); the coverage
count is **not** itself asserted in the test file, which pins the board's shape rather than
what a fire reaches on it. The shape is pinned; the coverage number is measured but
unguarded.

**Why it bears on the other nine.** Every crisis in §3 is spatial, and the real board is
more compact than the fixtures any of them would be tuned against. A compact city makes
area-based answers stronger and separation-based answers weaker — which is already visible
in era one, where *"six buildings in a four-cell-wide box are smaller than any ward worth
having"*. **The Raid and the Great Fire** are the two whose axes depend most directly on
buildings being far enough apart to make separation meaningful, and both should be measured
against the live board before their numbers are chosen, not after. The Great Fire is the
sharper case of the two: on a seven-building board packed into three rim bands, a firebreak
may have to take out a large fraction of the settlement to be a break at all, and the
demolition is permanent (D-CRISIS-8), so the compact board makes era five's sacrifice
harsher rather than merely less effective.

**The Plague was listed here as a third and no longer belongs.** *This paragraph originally
named "the Raid, the Great Fire and the Plague".* Under D-CRISIS-8 the Plague propagates
along authored links between the buildings people use, and two linked buildings may sit on
opposite sides of the settlement, so **its axis is independent of physical spacing** — a
compact board neither helps nor hurts it. What era six must be tuned against instead is the
**number of links per building and the size of the building set**, which is a property of
the authored visit lists rather than of the layout. That is a genuinely different tuning
input, and the compact-board finding above says nothing about it.

---

## 9. Engine capabilities each crisis would require

**Almost none of the machinery below exists.** Grouped so the build order is visible: the
shared rows are worth building once, and the single-crisis rows are a real cost attached to
one design.

> **THE GROUPING PREMISE IS RETIRED FOR THE SHIPPING SET, 2026-07-31 (D-CRISIS-31).** The
> sentence above is why this section is arranged the way it is, and after the cut to eras 1, 4, 7
> and 10 it no longer describes the surviving work: **§5.35 re-derives every *"Needed by"* column
> below against {1, 4, 7, 10} and finds that not one capability is shared by two of the four.**
> Every row is single-crisis or empty. **The table itself is kept exactly as written**, because
> its populations are what tell a later reader what a shelved crisis would cost to pick up, and
> because the shared rows are the argument for picking a *particular* one up — era six's three
> capabilities are all shared, so it is the cheapest of the six to revive if era seven ships
> first. **What is retired is the inference**, in three places: the *"build these two together"*
> recommendations, the *"build the penalty term early, whoever gets there first"* amendment, and
> the era-six schedule-sensitivity argument at §5.8 all concern crises that are now shelved.
> **O-3, the build order, is narrowed to near-nothing for the same reason** — with no sharing
> left there is nothing to sequence for sharing's sake, and the surviving three unbuilt crises
> are gated on authored land rather than on each other.

> **THAT NOTE IS TRUE OF {1, 4, 7, 10} AND FALSE OF THE SHIPPING SET, 2026-07-31 (D-CRISIS-33).**
> **The grouping premise is RESTORED, not retired.** Re-derived over {1, 4, 6, 9} at §5.39: **three
> rows below are shared by three of the four in-scope crises** — the durable record, the penalty
> term and the restore, all needed by eras 4, 6 and 9 — so the *"every row is single-crisis or
> empty"* finding above belongs to a set that no longer ships. **Nothing in the table was edited to
> produce that result**; the old set simply held one of the four capacity crises and the new set
> holds three.
>
> **Three rows go empty and one comes back.** *Mobile agents with pathing*, *directed dependency
> graph* and *a power/supply network with switchable state* have **no in-scope customer at all**
> now. *Hidden state — unknown status of a visible thing* has one again, era nine's. **Two rows
> change customer without changing population:** the *drawn link layer* and the *propagation rule*
> each still serve exactly one crisis, and it is now era six rather than era seven.
>
> **O-3 comes back with the sharing**, and the recommendation is concrete: **the capacity penalty
> term on `deriveCapacities` is worth building once, ahead of or alongside whichever of eras 4, 6
> and 9 is scheduled first.** The *"build the penalty term early, whoever gets there first"*
> amendment further down this section had one customer under the old set and has **three** under
> this one, which makes it the live recommendation rather than a stranded one. **The era-six
> schedule-sensitivity argument at §5.8 is also live again** — era six is in scope — though it half
> expires on its own terms: the two crises §5.8 wanted era six to follow are both shelved, so era
> six pays for the link layer and the propagation rule alone whatever the order, and only its
> capacity half is order-sensitive.
>
> **The table itself is again kept exactly as written**, for both of the reasons the note above
> gives and for a third this amendment adds: its populations were the thing that made the
> correction possible. §5.39 found four errors in a cost argument by reading this column, and the
> column would not have caught them had it been trimmed to the shipping set either time.

> **STALENESS NOTED 2026-07-30, reported and not rewritten.** This section was written
> against `bc27f02`, when *"none of the machinery below exists"* was true without
> qualification. At `769f704` it no longer is: **`apps/web/src/city/crisisRepair.ts`
> exists**, and its `RepairTarget` is `{ kind: "building" }` or `{ kind: "ground" }` — the
> first two rows, *rebuilding a ruin* and *reclaiming ruined ground*, have shipped as a
> real spend against `hardWinterRepairPrices()`. **The two repair rows and the paragraph
> below them are left for whoever owns that work to update**, because a repair branch is
> live in this area and this amendment is not going to race it. What matters here is only
> the part D-CRISIS-8 depends on, and it was re-read directly rather than inferred:
> **capacity locking has *not* shipped.** `deriveCapacities` at this tip is still a bare
> sum over contributions with no penalty term and no restore path, so era six gets nothing
> for free from the repair work that landed, and §5.8's build-order argument stands
> unchanged.

> **SECOND STALENESS NOTE, 2026-07-30 at `6abf299`.** The note above was written at
> `769f704` and its capacity finding has **half expired**, in the direction that lowers cost
> rather than raises it. **The derivation is unchanged and the claim above is still literally
> true:** `packages/economy/src/capacity.ts:97-107` is a two-accumulator loop with no penalty
> term and no restore path. **The durable state, however, now exists.**
> `engines/game/src/crisis-damage.ts` — new since that note — carries `suspended_civic` as
> *"the field that carries it, so that crisis needs no new state and no second migration"*, it
> is persisted and parsed (`devSession.ts:282`, `:298`), and `crisis-damage.test.ts` pins it
> in a case named *"carries the Lost Herd's locked capacity without a second migration"*.
> **Nothing reads it into a capacity yet** — grepped at this tip, `suspended_civic` has no
> consumer outside the damage module, its persistence and its tests. So the capability is
> **half-shipped: the record and its migration are paid for; the derivation that honours it is
> not.** The two rows below are amended to say which half is missing rather than claiming the
> whole capability is absent, and the population has grown from two crises to four —
> D-CRISIS-18's wrong-isolation cost and D-CRISIS-16's contested districts both suspend a
> building's contribution.
>
> Also at this tip: **`crisis-damage.ts` is D-CRISIS-7's protected floor expressed as a
> type** — *"the shape has no field for anything it is not — there is no `removed_buildings`,
> no `lost_mastery`, no `relocked_nodes`"* — and *"every kind of damage the shape can hold can
> be CLEARED again"* is a named test block, which is the *"at least one viable recovery path"*
> clause of D-CRISIS-12's floor measured over the whole shape rather than argued per crisis.

| Capability | Needed by | Exists? | Nearest thing that does exist |
| --- | --- | --- | --- |
| **Repair: rebuilding a ruin** | 1 (authored, unspent), 5, 8, 3 | **no** | `rebuild_cost_per_ruin` is computed and displayed; the action is *"a city-surface action that does not exist yet"* |
| **Repair: reclaiming ruined ground** | 1 (authored, unspent) | **no** | `winterReclaimCost` is computed and reported, never spent |
| **Capacity locking — the durable RECORD** | 2, **4**, **6**, **9** | **yes, since 2026-07-30** | `CrisisDamage.suspended_civic` carries it, persisted and parsed (`devSession.ts:282`, `:298`) and pinned by *"carries the Lost Herd's locked capacity without a second migration"*. **Nothing consumes it yet.** Added as a row by the second staleness note, because the capability the two rows below describe turned out to be two halves with different states |
| **Capacity locking — a penalty term on the derivation** | 2, **4**, **6**, **9** | **no** | `deriveCapacities` (`capacity.ts:97-107`) is a two-accumulator sum with **no penalty term at all**; re-read at `6abf299` and still true. All four eras need this same missing half. **Population grew from 2 to 4 by D-CRISIS-16 and D-CRISIS-18**, which makes it the most widely shared unbuilt capability after repair |
| **Capacity locking — restoring it** | 2 (a purchasable action), **4**, **6** (an automatic lift when the outbreak ends), **9** | **no** | as above, no restore path. **Era six's is the cheapest** — its capacity returns as a consequence of resolving the crisis, with no bill and no player action (D-CRISIS-8, §5.10). Eras four and nine are unspecified: whether a contested district or a wrongly-isolated building is bought back or released on resolution is not ruled |
| **Mobile agents with pathing** | 3, 10 | no | the frost's orthogonal flood is a spreading field, not an agent that chooses a route |
| **Hidden state — unknown location** | 2 | no | nothing; the whole board is visible in era one by design |
| **Hidden state — unknown status of a visible thing** | 9 | no | as above, and it is *different* machinery: 2 hides where a thing is, 9 hides what a known thing is |
| **Directed dependency graph over buildings** | 7 | no | **`@cr/skill-graph` has a prereq DAG** — `transitivePrereqs`, `teachingOrder`, `prereqDepth`. Nearest reuse candidate in the repo, over the wrong nodes |
| **Tile adjacency between buildings** | 5 | no | era one models adjacency over *cells*, not over buildings. **Needs no edge rendering** — this is a neighbour lookup, and the frost's orthogonal flood is substantially it |
| **A drawn link layer over buildings** | **6, 7** | no | nothing. Era six's edges are *human movement* and undirected; era seven's are *machine dependencies* and directed. **§5.9 evaluates the sharing and finds for it**: one primitive (routing, hit-testing, two non-colour state channels per INV-CRISIS-16, a direction flag, a reachability walk for the preview), with each era supplying its own edge set, propagation rule and edge styling. **Era six alone needs edges to be selectable**, so build them selectable and directional whoever goes first. **Era five must NOT be moved onto this row** — that is violation (1) of §5.7 |
| **A propagation rule — a walk that carries something along a graph** | 5, 6, 7 | no | **§9 previously listed the graphs and never the traversal over them.** `winterSpreadSteps(round)` is era one's orthogonal flood over *cells*, which is the nearest thing and is the wrong shape for all three. The three rules are genuinely different (tile flood, undirected infection, directed downstream failure) but sit over the same walk |
| **A power/supply network with switchable state** | 10 | no | — |
| **Faction ownership per building** | 4 | no | buildings have `state: "standing" \| "ruin"` and no owner |
| **A banked, spendable crisis-scoped currency** | 4 | no | era one's tier is spent the instant it is earned and never stored |
| **Turn-indexed arrival schedule for several threats** | 8 | no | `winterSpreadSteps(round)` is a single global schedule, not per-threat |
| **Per-era authored land (D-ERA25)** | 2–10 | **one of ten** | blocks everything; see §1 |

**Repair is the single most load-bearing unbuilt system across the ten, and it is the same
missing machinery seen from three directions.** Era one has authored a price for rebuilding
a ruin and a price for reclaiming ruined ground, and can spend neither. The Lost Herd needs
locked capacity restored through later event-driven actions. The Great Fire needs a
demolished building to come back. D-CRISIS-7 makes repair not merely desirable but
**required**, because a floor that says damage is never permanent is only true if something
can undo it — at present nothing can, and era one ships two prices that are quoted and
uncollectable. **If one system is built before any second crisis, it should be this one.**

**Three capabilities are shared by exactly two crises each and are worth building together**
— pathing (the Raid and the Robot Uprising), hidden state (the Lost Herd and Intrusion), and
**the link layer (the Plague and the Boiler Cascade)**. One carries a caveat rather than a
straight recommendation: the two hidden-state cases are genuinely different machinery and
should not be scoped as one.

**AMENDED 2026-07-30 — capacity locking has left that list, because it is now shared by
FOUR.** It read *"the Lost Herd and the Plague"* until D-CRISIS-16 and D-CRISIS-18 added era
four's contested districts and era nine's wrong-isolation cost. **That makes it the most
widely shared unbuilt capability in this table after repair**, and it changes the
recommendation from "build these two together" to "build the penalty term early, whoever gets
there first". The four still share only their *penalty* half — era two's restore is a
purchasable action, era six's is an automatic lift, and eras four and nine are unruled — so the
shared build is the penalty term on `deriveCapacities` and the restores stay separate
(D-CRISIS-8, §5.10). The record itself is already paid for; see the second staleness note.

**One capability is shared by three crises, and it is the newest row: the propagation
rule.** Eras five, six and seven all need a walk that carries something along a graph, and
D-CRISIS-8 is what makes that visible — the table used to list the *graphs* and never the
traversal over them, so the one genuinely three-way shared capability in the whole section
had no row. It is worth building once and parameterising three ways, **but with §5.7's
warning attached**: the three rules sit over a common walk precisely because the three
*graphs* differ, and a walk built to serve all three must not become an argument for
merging the graphs underneath it.

**Six capabilities are needed by exactly one crisis each**: the dependency graph (7), tile
adjacency (5), faction ownership (4), banked currency (4), the power network (10) and the
arrival schedule (8). Era four therefore carries **two** single-use systems, which makes the
Succession Crisis the most expensive of the nine to build and is worth knowing before it is
scheduled.

**Era six is not the most expensive, but it is the most schedule-sensitive, and that is a
different thing worth scheduling around.** Under D-CRISIS-8 the Plague needs three
capabilities — the capacity penalty term, the link layer, and a propagation rule over it —
which is more than any other crisis needs. **But all three are shared**, so era six's cost
is almost entirely a function of *where it sits*: built first it pays for three systems,
and built after eras two and seven it supplies only an authored edge set, an undirected
flag and an infection rule. Era four's cost is order-independent because its systems are
single-use; era six's is not. Both belong to **O-3**, and §5.8 works the order through,
including the trap that shipping in era order puts era six ahead of era seven and therefore
makes era six the one that pays for the link layer.

---

## 10. Decision register

| Id | Decision | §|
| --- | --- | --- |
| **D-CRISIS-1** | A crisis is differentiated by the **kind of decision** it asks, never by the hazard. Two crises may share a hazard shape; no two may share an axis | §2 |
| **D-CRISIS-2** | The Industrial crisis is the **Boiler Cascade**, not a Factory Revolt. A revolt duplicated the Raid and the Robot Uprising and sat beside the Plague; the Industrial era is the only one that can host a **dependency-order repair** puzzle. **Era seven is IN SCOPE after D-CRISIS-31**. **SHELVED 2026-07-31 by D-CRISIS-33, and THE PLACEMENT ARGUMENT IS DELIBERATELY NOT DELETED** — the Industrial era being the first with a machine network is still true, so era seven is still where the Boiler Cascade goes **if it is ever built**. This row is what a future un-shelving needs and it is kept whole for that reason | §5 |
| **D-CRISIS-3** | **Missile Alert stays clockless.** "Arrival times" means turns or completed answers, never real-time seconds. Inherited by every crisis, not granted as an exception to this one. **Its HOST (era eight) is SHELVED 2026-07-31, and the ruling is not**: it was inherited by every crisis and is inherited by all four | §5 |
| **D-CRISIS-4** | The **Succession Crisis gets influence tokens** — correct answers earn visible influence, spent to secure buildings, cancel claims or sway districts. The first banked crisis-scoped currency in the ten, and a recorded departure from era one's spend-on-earn shape. **Era four is IN SCOPE after D-CRISIS-31**, so this is one of the two banked/drift mechanics that ship. **Both of its unspecified consequences are now closed**, on different dates and by different routes: the declare-before-you-answer half was narrowed by D-CRISIS-16 (2026-07-30), and the survival half is ruled by consequence of D-CRISIS-34 (2026-07-31) — **influence survives between cycles and evaporates at the end of the crisis**, which upholds this row's own leaning and adds the between-cycles half that makes *banked* true of it (§5.42a) | §5 |
| **D-CRISIS-5** | **The Lost Herd's stake lands on capacity, not population.** Departure events are triggered by failed search steps; capacity is restorable. **AMENDED 2026-07-31 by D-CRISIS-28:** the mechanism stands and is now ruled for four crises, but *"the settlement does not lose population"* is withdrawn — it does, as the arithmetic consequence of the ceiling falling below it, and the people **come back** when capacity is restored. **D-CIT2 is still not breached**: its forbidden loop is capacity feeding *arrivals*, and §5.5's measurement of that is untouched. The framing ban narrows from *"never as population falls"* to **"never as population falls and stays down"**. **SHELVED 2026-07-31 with era two (D-CRISIS-32); the ruling stands and is inherited** — D-CRISIS-28 carries the capacity mechanism to era four, which does ship. **WIDENED 2026-07-31 by D-CRISIS-33: the mechanism is now inherited by THREE shipping crises, eras 4, 6 and 9**, so this shelved design's stake model governs three quarters of the spine (§5.39) | §5, §5.5 |
| **D-CRISIS-6** | The earthquake's **prepare-before-impact mechanic is not restored.** Considered and declined: Hard Winter already covers advance preparation as its entire premise | §5 |
| **D-CRISIS-7** | **The failure floor.** Crises can damage, disable, scar or reduce capacity; they cannot undo mastery or permanently remove an earned building. *"You survive, but the city carries the consequences."* A design constraint on all nine unbuilt crises. **NARROWED 2026-07-31 by D-CRISIS-31 to the three unbuilt crises in scope (4, 7, 10); it still binds the six shelved designs, which is why their floor checks in §7 are kept**. **RE-POINTED 2026-07-31 by D-CRISIS-33 to eras 4, 6 and 9**, and the shelf it also binds is now eras 2, 3, 5, 7, 8 and 10 | §5, §7 |
| **D-CRISIS-8** | **The Great Fire and the Plague separate on TWO axes: what propagation follows, and what the player sacrifices.** Fire spreads only through **tile adjacency** and the player sacrifices **structures**, permanently damaged and paid for in materials. Plague spreads through **use and shared routes** — a few visible links per active public building — and the player sacrifices **access and capacity**, temporarily, destroying nothing. **The general rule: eras five, six and seven propagate along adjacency, human movement and machine dependencies respectively, and a change to any of the three must preserve the distinction.** *"A few visible links" is a constraint, not a suggestion* — simplicity was a condition of choosing the spread-through-use version. **NARROWED 2026-07-31 by D-CRISIS-31: of the three propagation crises only the Boiler Cascade (7) is in scope**, so the three-topology rule now governs two shelved designs and one live one, and era seven pays for the link layer alone (§5.35). **RE-POINTED 2026-07-31 by D-CRISIS-33: the surviving propagation crisis is now the PLAGUE (6)**, so the live half of this ruling is the half it was written to defend — *"the Plague moves through human movement and never through tile adjacency"* is now a constraint on a crisis in scope. Era six pays for the link layer and the propagation rule alone, and §5.9's asymmetry resolves the other way: the shipping requirement is **selectable and undirected** (§5.39) | §5, §5.7–5.11 |
| **D-CRISIS-9** | **The crisis fires after `ceil(n / 2)` of that era's own nodes** — derived from the era's size, not authored per era: five or six nodes → **3**, nine → **5**. *"The median, rounded up"* is the same rule in English and is **ambiguous on an even count** (3.5 → **4**), which is why the formula leads and the word follows it as the thing it disambiguates (**D-CRISIS-24**). **Eight of the ten fire at three; only eras eight and ten differ**, reproduced against `eras.ts` at `6abf299`. **NARROWED 2026-07-31 by D-CRISIS-31: the arithmetic is untouched and the live rows are eras 1, 4, 7 (three) and 10 (five)** — three of the four, not eight of the ten (§5.12). **RE-DERIVED 2026-07-31 by D-CRISIS-33 and the exception disappears: ALL FOUR in-scope eras fire at THREE** (1 of 6, 4 of 5, 6 of 6, 9 of 6). Era ten was the only member of the old set that differed, so the claim about the game is now simply *the crisis fires after three of the era's own nodes* (§5.12) | §5, §5.12, §5.22 |
| **D-CRISIS-10** | **The crisis announces itself and the player chooses when to answer the call.** Unexpected, never an interruption — a player mid-lesson finishes the lesson. *A crisis sprung on someone mid-thought is hostile; a crisis you choose to face is a decision.* Independently required by INV-CRISIS-1, INV-CRISIS-3 and INV-CRISIS-10 | §5 |
| **D-CRISIS-11** | **Three duration shapes, and NO crisis is unbounded.** *Survive until it ends* (1, 8); *supply-exhaustion terminated* (5, 6, 3, 10), each with its terminal condition stated; *solve it* (2, 4, 7, 9). Boundedness and INV-CRISIS-3's no-unwinnable-board are the same guarantee from opposite sides and neither implies the other. **NARROWED 2026-07-31 by D-CRISIS-31: in scope the shapes hold era 1; era 10; and eras 4 and 7** (§5.13). **RE-POINTED 2026-07-31 by D-CRISIS-33: era 1; era 6; and eras 4 and 9** — still one of each shape plus one, so the variety property survives the set change. **The two unstated solve conditions swap sides: O-15 goes dormant with era seven and O-16 wakes with era nine** (§5.13) | §5, §5.13 |
| **D-CRISIS-12** | **The recovery-cost bound:** *"for a player making a genuine attempt, the maximum plausible crisis recovery cost must not exceed the resources normally earnable before era advancement."* The lead corrected **income** to **resources still earnable through normal remaining play**, because there is no passive output — which makes the bound a **counting** claim, not a rate claim. Already measured for era one in practice sets. **The protected floor is D-CRISIS-7 restated, with one addition: at least one viable recovery path must remain** | §5, §5.14 |
| **D-CRISIS-13** | **"Genuine attempt", operationally defined:** simulate players around the minimum passing accuracy choosing legal, non-deliberately-destructive actions. Not perfect play, and not the worst action every time. **The precedent is `hard-winter-layouts.test.ts`** — a legal-action enumerator delegating to the engine's predicate, a one-round-lookahead policy deliberately weaker than a search, an accuracy sweep with a floor, a random-legal second bracket and no adversary at all. **A policy measures only what its objective prices** | §5, §5.14 |
| **D-CRISIS-14** | **The question pool is a three-era window sampled BUCKET-FIRST** — the current era plus the previous two at **40 / 35 / 25**, then a skill within the bucket, never uniformly across eligible nodes. **Era two: 40 / 60. Era one: 100% of its own mastered nodes**, three of six at the trigger, and that exception must be written in or a general implementation leaves the only built crisis serving a batch INV-CRISIS-9 refuses. **This narrows INV-CRISIS-8**, which said *cumulatively*; every amended sentence is listed at §5.16. **NARROWED 2026-07-31 by D-CRISIS-31: era two's 40 / 60 is SHELVED with its crisis, and the era-one exception is now PERMANENT rather than transitional** — era one's window is 6 nodes against 15, 17 and 24 at eras 4, 7 and 10, which makes its thin-pool fallback structural (§5.36). **RE-MEASURED 2026-07-31 for D-CRISIS-33's set: 6 against 15, 16 and 21 at eras 4, 6 and 9.** Every conclusion survives with smaller numbers — era one is still under half the next thinnest and the fallback is still structural (§5.36) | §5, §5.15, §5.16, §4 |
| **D-CRISIS-15** | **A no-repeat record**, so a crisis does not re-ask one skill while others in its window go untouched. **It is the record the practice scheduler is missing — build it once and both get it.** Verified at `6abf299`: `buildRandomizedSetByShape` starts a fresh `seen` per call and nothing persists served items anywhere. **But `seen` is answer-variety keys, not served items**, so the shared thing is a new record. **It must be a PREFERENCE, never a CONSTRAINT**, or it collides with INV-CRISIS-9 and INV-CRISIS-3 | §5, §5.17 |
| **D-CRISIS-16** | **Succession: neutral districts drift toward whoever is winning.** Each cycle the player does not commit, an undecided district picks the currently strongest faction, so waiting compounds. **It charges for HESITATION, which nothing else in the ten does**, and it supplies §5.13's terminal condition. **A "cycle" must advance on player actions and never on elapsed time** (INV-CRISIS-1, asserted by two derived-population sweeps). Narrows **O-6**. **Era four is IN SCOPE after D-CRISIS-31**, and this drift is why era four needs no action budget (§5.24). **COMPLETED 2026-07-31 by D-CRISIS-34, which supplies the UNIT this row deliberately left open** — a cycle is an answered question batch, so the clock and the unit are now both settled and the drift mechanism is fully specified (§5.42) | §5, §5.18 |
| **D-CRISIS-17** | **Boiler Cascade: a repair attempted downstream of a live fault BURNS OUT.** Not "produces little benefit" — the action is spent **and** the node is damaged, so the section needs two repairs instead of one. Thematically exact, and it is what makes repair order **load-bearing** rather than merely efficient, which is what D-CRISIS-2 bought the era for. Pair with a finite repair budget earned from accuracy. **Era seven is IN SCOPE after D-CRISIS-31, and it is now the ONLY live customer of D-CRISIS-26's budget** (§5.24). **SHELVED 2026-07-31 with era seven (D-CRISIS-33); the ruling stands as that design's own**, and the live budget passes to Intrusion. **Burn-out is era-seven logic and was never a §9 capability**, so it leaves with the crisis without appearing in §5.39's arithmetic — which is worth saying because a summary of the cost argument named it as a saving | §5, §5.18 |
| **D-CRISIS-18** | **Intrusion: a wrong isolation costs the clean building's capacity AND the source relocates.** You lose the function *and* your evidence goes stale. **It converts "am I sure enough to act" from a feeling into the actual decision**, which is what the ritual describes and what the design previously did not charge for. **Acting early becomes how you lose**. **SHELVED 2026-07-31 with era nine (D-CRISIS-32)**; the ruling stands as that design's own. **IN SCOPE 2026-07-31 (D-CRISIS-33), and it is now a specification rather than a shelved design's own.** Two consequences: **it is why Intrusion needs the capacity penalty term** (a wrong isolation suspends a clean building's contribution), which is the fact a summary of the cost argument missed — era nine is **not** hidden-status-only (§5.39); and **its unruled termination is now O-16 against a shipping crisis** | §5, §5.18 |
| **D-CRISIS-19** | **What differentiates the crises is the PLAYER RITUAL — when the question happens, what follows it, and how consequences resolve — not different variables under the same loop.** The operational half of D-CRISIS-1: ten crises could satisfy D-CRISIS-1 on paper and be one encounter in the hand. **This is half of D-CRISIS-31's justification** — a ritual is bespoke by ruling, so four crises share no shell (§5.35) | §5, §5.20 |
| **D-CRISIS-20** | **The ten ritual identities and the seven cadences.** Three pairs share a cadence, which D-CRISIS-1 permits. **Eras five and six share one and are adjacent — the worst placement — so their separation is made explicit rather than left to the summary:** the Fire's building *"collapses before the next spread step"* and the Plague's infections travel *"at the end of a cycle"*. **Immediate against batched, which is a third separating axis on top of D-CRISIS-8's two**. **NARROWED 2026-07-31 by D-CRISIS-31: all three shared pairs lose a member, so the four in-scope crises hold FOUR DISTINCT cadences and the adjacent five/six caution describes two shelved designs** (§5.20). **RE-DERIVED 2026-07-31 by D-CRISIS-33 and the result is tidier: each of the three shared pairs keeps EXACTLY ONE member** (1 of {1,3}, 9 of {2,9}, 6 of {5,6}) and both single-member cadences leave with eras 7 and 10. **Four distinct cadences again, and no two in-scope eras that a player meets in succession share one.** The five/six caution now describes one shelved design and one **shipping** one, so era six's batched resolution timing is a specification (§5.20) | §5, §5.20 |
| **D-CRISIS-21** | **Hard Winter is the ONLY crisis built around repeated area placement.** Stronger than D-CRISIS-1: that forbids sharing the **axis**, this forbids the **mechanic** even where the axis differs, because D-CRISIS-19 says the mechanic is what the player experiences. **This is the other half of D-CRISIS-31's justification, and it still binds all three unbuilt crises in scope** (§5.35) | §5, §5.21 |
| **D-CRISIS-22** | **The Intrusion partial-credit mechanic is protected:** a weak answer returns *"likely compromised"* rather than nothing — **the only place in the run where being partly right gives something partly useful.** Consistent with INV-CRISIS-4 and sharper than it: elsewhere partial correctness buys a *smaller effect*, and at the bottom rung a smaller effect is worth nothing; here it buys **degraded information**, which is actionable. **SHELVED 2026-07-31 with era nine (D-CRISIS-32)**, so the run no longer contains a place where being partly right is partly useful — a real loss, recorded rather than papered over. **IN SCOPE 2026-07-31 (D-CRISIS-33), and THE LOSS IS REVERSED** — era nine ships, so the run does again contain the one place where a partial answer is itself useful. Recorded because the previous row recorded the loss, and a loss undone should be as visible as a loss taken | §5, §5.21 |
| **D-CRISIS-23** | **Era ten inverts the premise** — you survive by switching your own city off, where growth has always meant powering more of it. Correct place for the last one, because it only reads as an inversion after ten eras of the opposite. *"The city is dark"* must be an **ending with consequences**, never a loss (INV-CRISIS-3). **IN SCOPE after D-CRISIS-31, and it is the one placement with a question open against it — O-22**. **SHELVED 2026-07-31 by D-CRISIS-33, which RESOLVES O-22 in the direction it reserved: era ten has no crisis. THE PLACEMENT ARGUMENT IS DELIBERATELY NOT DELETED** — the inversion only reads to a player who has spent nine eras doing the opposite, so it cannot be relocated and **if it returns it returns to era ten**. That is what a future un-shelving needs, and it is why this row keeps every word | §5, §5.21 |
| **D-CRISIS-24** | **The entry trigger is stated as `ceil(n / 2)`, never as "the median, rounded up".** A wording ratification of D-CRISIS-9 that moves **no number**: the formula gives 3 for five- and six-node eras and 5 for nine-node eras, which is the approved table. The English reads 3.5 → **4** on an even count and would move eras one, six, seven and nine. **D-CRISIS-9's body already said this; its section heading and its register row led with the word, and both are edited here** — §5.22 quotes what each said before. The note explaining the ambiguity must travel with the formula | §5, §5.22 |
| **D-CRISIS-25** | **"Genuine attempt" sweeps an accuracy BAND of 33% to 80%, and D-CRISIS-12 must hold across all of it.** Not a figure: D-CRISIS-13's *"minimum passing accuracy"* was supplied by `ERA_TRIAL_CLEAR_RATIO`, which **D-ET4 retired** the same morning, so the definition pointed at nothing. **A single value tunes for one learner and the bound is about a population.** The endpoints are era one's bottom rung (1 of 3) and `STORM_CLEAR_RATIO` (0.8); the machinery is `hard-winter-layouts.test.ts`'s existing sweep, which already covers the band with a floor under it. **The warning travels with it: a policy whose objective ignores the recovery bill measures nothing at every point in the band** | §5, §5.23 |
| **D-CRISIS-26** | **The three solve-it crises get a finite action budget and each can end UNSOLVED with the damage standing.** The Lost Herd, the Boiler Cascade and Intrusion; **Succession is excluded** because D-CRISIS-16's drift already bounds it. Solve conditions, confirmed against each crisis's own section: **the herd found** (already ruled in D-CRISIS-5), **the network restored** (era seven's own `working/failed/repaired`), **the source isolated** (D-CRISIS-18's own verb and noun). **Only era nine gains a budget it did not have.** Inside D-CRISIS-7 on the prose and on the type (`crisis-damage.ts` has no field for a removed building). **Contradicts INV-CRISIS-3's *"no losing outcome to reach"* and does not resolve it — O-19**. **NARROWED 2026-07-31 by D-CRISIS-31: two of the three are shelved, so the Boiler Cascade is the only live budget and O-18 narrows to one number; O-19 survives whole on that one crisis** (§5.24). **RE-POINTED 2026-07-31 by D-CRISIS-33: the one live budget is INTRUSION's.** Eras two and seven are shelved and era nine ships, so *"only era nine gains a budget it did not have"* — written as an aside — now describes **the only action budget anybody will build, and the only one with no existing form to start from**. O-18 keeps its single number and changes its difficulty; O-19 survives whole on era nine (§5.24) | §5, §5.24, §5.25 |
| **D-CRISIS-27** | **Era one's crisis runs FEWER rounds** — *"6 rounds is too many anyways."* The **direction** is ruled and **no new count is set**, per §1. A pacing judgement, and it stands on that alone: **the sampling vacuity it was also offered for is not a function of the round count** and survives the cut, because the trigger leaves exactly `batch_size` nodes and every batch already touches all three. **Nothing is retuned here** — the zero-accuracy calibration, the ceiling ladder, both round-denominated constants, the reclaim price and **every full-accuracy witness** are derived against six rounds, and the witnesses are length-checked against the constant. Demo tomorrow; the re-tune is **O-17** | §5, §5.26, §5.27 |
| **D-CRISIS-28** | **A departure event MAY consume capacity somebody is using, and the people come back when the capacity does.** *"I think people leave because there's a reduction of the capacity […] but they'll come back if you increase capacity via the civic buildings."* Three clauses: a crisis writes only to **capacity**; population is bounded by capacity, so the overflow **leaves**; restoring capacity — **by buying civic buildings**, the player's own lever — brings them back. **This OVERRULES §5.6's headroom cap**, which two open questions rested on, and it keeps INV-CRISIS-3 rather than trading it for a monotonicity premise. Ruled for all four capacity crises (2, 4, 6, 9). **The lead offered a wider licence to relax D-CIT2 outright and it is deliberately not spent.** Measured at `03d5a2b9`: a capacity-only cut of 16 takes a settled island to `waiting=16` with nobody deleted, recovery is deep-equal because nothing is latched, and **the citizens sweep stays green over the live defect (65 passed / 8 files)** while catching the same drop keyed on mastery. **`waiting` is on the wrong ledger — O-20**. **NARROWED 2026-07-31 by D-CRISIS-31: of the four capacity crises only era four is in scope**, so O-20's wiring has one live customer and three shelved ones. **WIDENED 2026-07-31 by D-CRISIS-33, and this is the largest single effect of that ruling on owed code: THREE of the four capacity crises are now in scope (4, 6, 9).** O-20's wiring goes from one live customer to three — **three quarters of the shipping spine** — so the `residence_capacity` / `livability` seam is load-bearing for most of the game rather than for one era, and the capacity penalty term becomes the one genuinely shared build in §9 (§5.39) | §5, §5.28, §5.29 |
| **D-CRISIS-29** | **Era two and era nine may share a cadence: *"they're so far apart that it's fine."*** Seven eras is sufficient separation on its own, so the pair needs no third axis and §5.20's proximity argument is satisfied rather than worked around. **D-CRISIS-22 is untouched** — era nine is still the only crisis where a partial answer is itself useful, which is a fact about its axis and not about distance — so **era two's Q1 survives**, with a smaller and more obvious failure behind it. Nothing about the adjacent eras five/six pair moves. **MOOT 2026-07-31 under D-CRISIS-31, and kept**: eras two and nine are both shelved, so the permission it grants applies to no crisis that ships (§5.20). **STILL MOOT under D-CRISIS-33 for a different reason, and the difference is worth a line:** era nine now ships and era two does not, so the pair it licences still cannot occur — the permission is unspent because only one member is in scope rather than because neither is (§5.20) | §5, §5.30 |
| **D-CRISIS-30** | **Every crisis CONCLUDES, and the screen that concludes it reports the outcome it actually reached.** *"all of these crises need to have like concluding screens so that its not just anticlimatic"*, and *"too much like bookeeping on '88 tiles'"*. **Not one shared card** — D-CRISIS-19 makes *how consequences resolve* part of the ritual, so an identical last screen in ten different crises is that ruling's own failure arriving through the one place nobody checks. So the CONTRACT is ruled and the FORM is each brief's: it is **an event** rather than the surface's last panel; it reports in **the player's units** and never the simulation's; it reads **honestly across the whole range** with the two ends legible at a glance and the verdict **derived**, which is what D-CRISIS-26's unsolved-with-damage-standing ending demands; and it **agrees with the world**, naming what persists rather than what reverted. **Deliberately does not resolve O-19** — either reading changes a string in a slot that already exists, which is precisely what the naive fixed-headline version would have foreclosed. **Recorded at three sites** because the nine briefs are held for rewrite on #307; §5.34 names them and says which is load-bearing. **NARROWED 2026-07-31 by D-CRISIS-31 to the three briefs in scope (4, 7, 10); the other six owe it when picked up, and O-24 is how the shelving reaches #307**. **RE-POINTED 2026-07-31 by D-CRISIS-33 to the three briefs in scope (4, 6, 9)**, which is the change #307 most needs to hear: the briefs that must carry a concluding-screen section are now eras four, six and nine (§5.41) | §5, §5.32, §5.33, §5.34 |
| **D-CRISIS-31** | **FOUR crises, at eras 1, 4, 7 and 10. The Hard Winter is era one's. All TEN eras keep a persistent end-of-era progression.** *"on the crisis design, i think eras 1/4/7/10 makes sense, and there will always be a persistent end-of-era progression"* and *"hard winter is an era 1 crisis"*. **This SUPERSEDES one-crisis-per-era wherever it was asserted, in this document and outside it** — §5.38 lists every site and what each now says, including the five code sites reported and not changed. **The third clause is the one a reader drops and it is load-bearing:** the cut removes six *crises* and **no era's ending**, so it CONFIRMS D-ERA16 and D-ET3 rather than touching them, and in six eras the trial becomes the era's only set-piece. **The justification is a cost asymmetry, measured rather than asserted (§5.35):** four crises is four bespoke mechanics — D-CRISIS-19 makes the ritual the unit of difference and D-CRISIS-21 reserves area placement to era one — and re-derived against §9's own capability table, **not one engine capability is shared by two of the four**, so the ten-crisis plan's economies of scale lived entirely in the six shelved. Ten progressions is one mechanic with ten dressings, all of them already ruled (§6.4a of the era design: the hall rethemes, island / advisor / roads re-dress under *per-era art freezes where it MULTIPLIES with a catalogue and is kept where it is one-per-era*, and the 62 skill buildings freeze). **It narrows the POPULATION of fifteen earlier register rows, marks seven more as in scope, leaves nine untouched, and REPEALS NONE** — the counts are per-row markers in this table, so they are checkable rather than asserted. Era ten's placement is queried but not reopened — **O-22**. **AMENDED 2026-07-31 by D-CRISIS-33 on ONE clause and confirmed on the other two: the SET is now eras 1, 4, 6 and 9.** Clause two (the Hard Winter is era one's) and clause three (all ten eras keep a persistent end-of-era progression) are untouched, so **D-ERA16 and D-ET3 stay confirmed exactly as this row says**. Its justification is superseded in half: §5.35's *"not one capability is shared by two of the four"* is true of {1, 4, 7, 10} and **false** of the shipping set, where three rows are shared by three of the four (§5.39). The progression half of the justification is untouched. **O-22 is RESOLVED by D-CRISIS-33** | §5, §5.35–§5.38, §3, §7 |
| **D-CRISIS-32** | **The six out-of-scope crises are SHELVED, not cancelled.** The Lost Herd (2), the Raid (3), the Great Fire (5), the Plague (6), Missile Alert (8) and Intrusion (9) are **DEFERRED 2026-07-31** and **every one of their designs stays exactly as written** — axis, ritual, cadence, duration shape, terminal condition, stakes mechanism and floor check. Deleting them would convert a scope cut into a loss of design, and those are not the same decision. **Three obligations travel with the word *shelved*: a shelved AXIS is still reserved** (D-CRISIS-1 does not release one, so none of the four may take Sacrifice, Topology, Triage, Interception, Uncertainty or Information-gathering); **a shelved design is not evidence about shipping**, so anything derived from *"the ten"* must be re-derived over the four before use (§5.35 does this for §9 and the answer changes completely); and **a shelved design must not be silently orphaned** — six of the briefs are on #307, open and unmerged, where a rewrite obeying D-CRISIS-31 alone would delete them (**O-24**). **This document is the only merged record of the shelving** | §5, §5.38, §3, §7 |
| **D-CRISIS-32, as amended** | **AMENDED 2026-07-31 by D-CRISIS-33 in MEMBERSHIP, not in force.** The shelf is still six deep and now holds the Lost Herd (2), the Raid (3), the Great Fire (5), the **Boiler Cascade (7)**, Missile Alert (8) and the **Robot Uprising (10)**. The Plague (6) and Intrusion (9) came off it. **All three obligations apply unchanged to the new membership**, and the first one inverts with it: **the reserved-axis list is now Sacrifice (5), Triage (8), Interception (3), Information-gathering (2), Ordering (7) and Denial (10)** — Topology and Uncertainty released to eras six and nine, which now own them. **Information-gathering stays reserved because it is era TWO's axis and era two is still shelved**; era nine's is Uncertainty, and getting that backwards would have released a shelved design's axis while forbidding Intrusion from taking its own (§5.40) | §5, §5.40, §3, §7 |
| **D-CRISIS-33** | **THE SET MOVES: four crises at eras 1, 4, 6 and 9.** *"plague feels the most on theme"*. **AMENDS D-CRISIS-31 and D-CRISIS-32 and repeals neither.** The Plague (6, **Topology**) and Intrusion (9, **Uncertainty**) come off the shelf; the Boiler Cascade (7, Ordering) and the Robot Uprising (10, Denial) go on it. **Nothing else about the shape moves** — still four crises, still one per selected era, and **still a persistent end-of-era progression in all ten eras**, so D-ERA16 and D-ET3 are untouched and no `D-ERA` or `D-ET` id changes. **Two reasons, both recorded because they answer different objections:** era six is the Renaissance, so a plague is on theme in a way that makes the fiction stronger rather than merely surviving the move; and the Robot Uprising was the sole in-scope customer for mobile agents with pathing and for a switchable power network, the Boiler Cascade for the directed dependency graph, so **all three rows leave the plan**. **The cost argument was put as arithmetic and is CORRECTED rather than repeated (§5.39):** §5.35's headline **inverts** — three §9 rows are shared by three of the four (all three capacity-locking rows, eras 4/6/9) where the old set shared nothing; Intrusion needs the capacity penalty as well as hidden status, so it is three unbuilt rows and not one; the Plague is **more** expensive than the Boiler Cascade and not *"Boiler minus the graph"*; and the union of unbuilt engine rows falls from **eleven to nine**, a saving of two, which is real and smaller than the framing implies. **D-CRISIS-32's reserved-axis list inverts** — Topology and Uncertainty off, Ordering and Denial on, and **Information-gathering stays reserved because it is era TWO's axis, not era nine's** (§5.40). **D-CRISIS-2's and D-CRISIS-23's placement arguments are deliberately kept whole**, because a future un-shelving needs them. **O-22 is RESOLVED** (era ten has no crisis; its ending is its progression plus the game-completion ceremony), **O-15 goes DORMANT**, **O-9, O-10 and O-16 wake**, and O-18, O-19, O-20, O-23 and O-24 are re-pointed. **No code is changed**, per §1 | §5, §5.39–§5.41, §3, §7, §9 |
| **D-CRISIS-34** | **A Succession "cycle" is an ANSWERED QUESTION BATCH.** D-CRISIS-16 settled the clock and left the unit; this settles the unit and **closes O-14**, taking the option O-14 itself called the likely answer by analogy with era one's `end_round`. **The reasoning is what makes the crisis work and is recorded rather than summarised:** drift is era four's entire clock — it is the one solve-it crisis with no action budget, deliberately, because drift bounds it — so tying the cycle to the batch makes **earning influence and losing ground the same act**. A player cannot accumulate without the board moving against them, which is what charges for **hesitation rather than error**, the axis this crisis exists to occupy. **The rejected alternative is kept because its failure is the clearest statement of what the ruling buys:** had a cycle advanced on **commitment**, never committing would mean never drifting, so waiting would be free in the one crisis built to punish it. **O-6 is RESOLVED BY CONSEQUENCE and O-13 is NOT** — the first derives (influence survives between cycles, or banking is not banking; it evaporates at the end, per D-CRISIS-4's own leaning and INV-CRISIS-2), and the second cannot, because a player who never answers the call answers no batch and so drifts no district (§5.42b). **A drift-settled crisis is an ending with consequences, never a loss** (INV-CRISIS-3), and that clause does **not** touch O-19, which is scoped to UNSOLVED endings under a finite budget and from which Succession is excluded by name. **No numbers are set here and no code is changed**, per §1 | §5, §5.42–§5.42c, §5.18 |
| **D-CRISIS-35** | **AN UNANSWERED CALL FREEZES THE CITY, AND NEVER THE LEARNING.** Three parts. **(1)** A player given a crisis call who does not enter it **cannot do anything in their city** — no building of any kind, no road laying, no civic purchases, no moving of placed buildings — **until they enter**. **(2)** **Lessons and practice continue normally**, ruled explicitly: the city is the **reward layer** and holding it hostage is what creates the pressure to engage, where blocking lessons would stop the learner doing the thing the product exists for — and would be **self-defeating**, since a crisis draws its questions from mastered skills (D-CRISIS-14), so locking them out of learning locks them out of the only activity that makes the crisis winnable. **(3)** The safety valve is a **RELEASE GATE AT AUTHORING TIME**, not an in-game escape hatch: a check that fails if a crisis era cannot compose a playable crisis, so a permanently-stuck state can never ship. **Part 3 implemented 2026-08-18:** four shipping crises are tied to the explicit era release predicate, composed through their real adapters at the derived trigger, and driven to bounded terminal phases; non-crisis exemptions are asserted both ways and injected failures are red. **This CLOSES O-13**, at the game level, which §5.42b established was the only level that could close it. **ERA ADVANCEMENT IS GATED and it does NOT follow from the freeze** — D-ERA5 gates the advance on mastery plus the trial, neither of which is a build action, so a frozen player could otherwise advance out from under the crisis, and `crisisCall.ts` **re-arms on an era change**, discarding the call. Ruled as its own clause (§5.43b). **D-ERA5 is narrowed and INV-COS-1 / INV-COS-2 are untouched**: a crisis is an encounter, not a resource, so *resources can never buy progress* survives word for word. **The preview-node trap is a SEPARATE hazard this gate would not catch** — a preview node can never be mastered, so it is absent from the crisis pool rather than short, and the crisis composes over it (§5.43d). **Does NOT touch D-CRISIS-34's outcome clause**: that is the player who entered and never committed, and §5.43a states the distinction so the two are not collapsed again | §5, §5.43–§5.43d, §5.42b, §5.42c |
| **INV-CRISIS-1..17** | What era one establishes and all ten inherit, each with its enforcement site. **INV-CRISIS-8 was narrowed on 2026-07-30 by D-CRISIS-14** — it said *cumulatively* and now says *a three-era window*; §5.16 lists every sentence that moved. **The inheriting population is NARROWED 2026-07-31 by D-CRISIS-31 from ten crises to four; every invariant is unchanged in substance**. **D-CRISIS-33 changes the MEMBERSHIP of that population and not its size** — it is now eras 1, 4, 6 and 9 — and again no invariant moves in substance. **Two are worth re-reading against the arrivals:** INV-CRISIS-16's two-non-colour-channel rule applies to a drawn edge exactly as to a cell, which era six now needs (§5.9); and INV-CRISIS-10's *everything provisional is previewed* is the one era nine deliberately inverts on the **board** while keeping it on the **cost** (§7) | §4, §5.16 |

---

## 11. Open questions

> **SCOPE PASS 2026-07-31 (D-CRISIS-31, D-CRISIS-32).** Every row below was re-read against the
> four-crisis spine, because an open question about a shelved crisis is not the same kind of item
> as one about a crisis that ships. **No row is deleted and no number is reused.** Rows that turn
> out to be about a shelved crisis are marked **DEFERRED WITH ITS CRISIS** — still open, and open
> against something nobody is building, so they are not on anyone's critical path. Rows whose
> population shrank are marked narrowed. **Live and unchanged in force:** O-1, O-5, O-7, O-8,
> O-11, O-13, O-17, O-19, O-20, O-21 and the three new rows. **The full list of rows this pass
> touched:** O-3, O-9, O-10, O-12, O-15, O-16, O-18.

> **SECOND SCOPE PASS 2026-07-31 (D-CRISIS-33), and this one both wakes rows and puts one to
> sleep.** Every row was re-read against the new spine, eras 1 / 4 / 6 / 9. **No row is deleted, no
> number is reused, and one row is RESOLVED rather than carried.**
>
> - **RESOLVED: O-22.** It asked whether era ten was the right place for the fourth crisis. **Era
>   ten has no crisis.** The row is kept with its resolution written into it.
> - **DORMANT: O-15.** The Boiler Cascade's terminal condition and repair-budget sizing. It goes to
>   sleep **with its crisis** rather than being answered or deleted.
> - **WAKING: O-9, O-10 and O-16.** All three were *DEFERRED WITH ITS CRISIS* under the last pass,
>   two with era six and one with era nine, and all three eras are back in scope. **They are live
>   design gaps in the shipping set again**, and O-16 inherits O-15's old standing as the sharpest
>   of them.
> - **RE-POINTED: O-3, O-18, O-19, O-20, O-23 and O-24.** O-3 comes back from *"narrowed almost to
>   nothing"* because the sharing came back; O-20 goes from one live customer to three, which is the
>   largest change on this list.
> - **Untouched and live exactly as before:** O-1, O-5, O-6, O-7, O-8, O-11, O-12, O-13, O-14, O-17
>   and O-21. **O-6 and O-14 are era four's and O-12's *"starts biting at era four"* is unaffected**,
>   because era four is in both sets.

> **ERA FOUR'S CYCLE PASS 2026-07-31 (D-CRISIS-34), and it moves three rows in three different
> directions.** No row is deleted and no number is reused. **This is not a scope pass** — the
> spine does not move and no crisis changes sides; it settles one unit inside one crisis and
> then follows the unit wherever it reaches.
>
> - **RESOLVED: O-14.** What advances a Succession cycle. **An answered question batch** (§5.42).
> - **RESOLVED BY CONSEQUENCE: O-6.** Unspent influence survives between cycles and evaporates at
>   the end of the crisis. **Marked as a consequence rather than as a ruling on purpose**, because
>   it was not separately decided and may be overridden without reopening O-14 (§5.42a).
> - **STILL OPEN, having been put up and failed: O-13.** It was offered as a second
>   resolution-by-consequence and the derivation does not hold — a player who never answers the
>   call answers no batch, so nothing drifts. **The failed derivation is recorded at §5.42b**, and
>   the sound half of the proposal is carried at §5.42c as D-CRISIS-34's outcome clause, where it
>   describes a player who entered and never committed.
> - **The note directly above is superseded for two of the rows it names.** *"Untouched and live
>   exactly as before … O-6, O-13, O-14"* was true on the morning of 2026-07-31 and by that evening
>   O-6 and O-14 were closed. **O-13 is the only one of the three the sentence still describes.**

> **THE DOORSTEP PASS 2026-07-31, later the same evening (D-CRISIS-35), and it closes the row the
> pass above could not.** No row is deleted and no number is reused. **This is not a scope pass
> either** — the spine does not move, no crisis changes sides, and no magnitude is set.
>
> - **RESOLVED: O-13.** What happens if the player never answers the call. **The city freezes and
>   the learning does not**, and **era advancement waits with the call** (§5.43, §5.43b).
> - **The sentence immediately above this block is now spent, and it is the third time in two days
>   that a note about O-13 has outlived the row's state.** *"O-13 is the only one of the three the
>   sentence still describes"* was written hours before this ruling. It is kept rather than edited,
>   because the sequence — put up, failed, ruled — is what a later reader needs and what the
>   striking-through convention exists to preserve.
> - **Two rows are re-pointed and NEITHER is closed. O-8** is sharpened rather than answered: the
>   governance gap it names (*mid-era crisis encounters have no `TEAM_CHECKLIST.md` item in any
>   lane*) now sits under a ruling that makes an automatic call and a release gate **owed** rather
>   than desirable, so the missing lane item has two named deliverables behind it instead of none.
>   **O-23** is promoted in force and unchanged in kind: *where the scope lives* is no longer only a
>   tidiness question, because a freeze keyed on `standing` would freeze ten eras against one
>   playable crisis (§5.43c, gate row A).
> - **Untouched:** every other row. **O-19 is specifically NOT reached** — it asks whether an
>   **unsolved** ending under a finite budget is a loss, and a crisis that was never entered has
>   reached no ending at all.

| # | Question | Owner | State |
| --- | --- | --- | --- |
| **O-1** | **Era one's top-tier fire radius is still generous against the real board.** The retune took it from a 25-cell square (28% of the island) to a 13-cell disc (14.8%), but on the live seven-building board one top-tier fire still covers five of the seven (§8). Radius 1.5 is 9 cells (10.2%) and needs no code change. | Team lead | **Open.** The lead has said he will return to it after playing |
| ~~**O-2**~~ | ~~**Can a crisis genuinely cost an era's progress, or is the floor always "you keep the city, it is scarred"?**~~ | ~~Team lead~~ | **RESOLVED 2026-07-29 by the team lead — see D-CRISIS-7.** The floor is *"You survive, but the city carries the consequences."* Row kept so the number is never reused |
| **O-3** | **The build order for §9's capabilities.** Repair is argued above to be first; the rest is unscheduled, and two crises need machinery no other crisis needs. **Partly answered 2026-07-30 by D-CRISIS-8 (§5.8):** era six wants to come after eras two and seven, or it pays for three shared systems alone; era four's cost is order-independent because its two systems are single-use. **Still open** for everything else. **NARROWED ALMOST TO NOTHING 2026-07-31 by D-CRISIS-31:** §5.35 measures that no §9 capability is shared by two of the four crises in scope, so there is no sharing left to sequence for. Era six's schedule-sensitivity — the sharpest thing this row carried — is now a fact about a shelved crisis. What survives is era four's and era seven's own internal ordering and the authored-land dependency, which is content and not machinery. **UN-NARROWED 2026-07-31 by D-CRISIS-33, and this row is live again.** §5.39 re-derives §9 over {1, 4, 6, 9} and finds **three rows shared by three of the four**, so there is sharing to sequence for once more. **The concrete recommendation:** build **the capacity penalty term on `deriveCapacities`** once, ahead of or alongside whichever of eras 4, 6 and 9 comes first — it is the one genuinely shared unbuilt row, its durable-record half already ships, and three quarters of the spine wants it. **Era six's schedule-sensitivity is live again and half expired on its own terms:** §5.8 wanted era six to follow eras two and seven, both of which are now shelved, so era six pays for the link layer and the propagation rule alone whatever the order and only its capacity half is order-sensitive — a swing of two rows rather than three. **Repair is unchanged and still first**, and neither incoming crisis needs it. | Unassigned | **Open, and live again** |
| ~~**O-4**~~ | ~~**Does a crisis-induced capacity shortfall feed the era design's departure path?**~~ ~~§5.6 recommends capping the crisis penalty at available headroom, which closes this **and** the no-eviction question together.~~ | ~~Era progression owner~~ | **RESOLVED 2026-07-31 by the team lead — see D-CRISIS-28.** Yes, and it is the intended mechanism rather than a leak: the crisis cuts capacity, the shortfall is real, and people leave. The headroom cap is **overruled**. Row kept so the number is never reused. **Two residues, and both are new rows rather than this one reopened:** which ledger bounds population (**O-20**) and whether departures are metered or immediate (**O-21**). The ruling still wants restating in D-ERA14/D-ERA15's own terms by that document's owner, which is **O-21**'s second half |
| **O-5** | **Does the crisis ever feed mastery?** Era one grades honestly through the real checker and throws the verdict away (INV-CRISIS-7). The docblock calls feeding mastery *"a deliberate decision to take once the encounter is known to be fair"* and *"a one-line addition"*. | Team lead | Open, deliberately deferred |
| ~~**O-6**~~ | ~~**Does unspent influence survive the Succession Crisis?**~~ It should not, or it becomes a store of value and brushes INV-CRISIS-2 (D-CRISIS-4). **Narrowed 2026-07-30 by D-CRISIS-16:** the second half of this row — whether banking weakens INV-CRISIS-5's declare-before-you-answer gamble, *"since a player who can save is a player who can wait for certainty"* — is largely answered, because under neutral drift **waiting is no longer free**. Banking now buys flexibility at a price rather than certainty outright. ~~**Still open** for the survival question, which is untouched.~~ **RESOLVED BY CONSEQUENCE 2026-07-31 — see D-CRISIS-34 and §5.42a. It survives BETWEEN CYCLES and evaporates AT THE END of the crisis, and the two halves rest on different things**, which is why both are written down. *Between cycles* follows from the cycle unit and nothing else: influence that did not survive a batch would be spendable only inside the batch that minted it, which is era one's spend-on-earn shape and would make *banked* false of the first banked currency in the ten. *At the end* is **this row's own leaning, upheld** — crisis-scoped currency ends with its crisis, and INV-CRISIS-2 is the reason. **This was NOT decided separately from D-CRISIS-34 and may be overridden without reopening it**: the derivation is one-way, so a different survival rule would cost the banking mechanic rather than the cycle unit. Row kept so the number is never reused | ~~Unassigned~~ | **RESOLVED BY CONSEQUENCE 2026-07-31 (D-CRISIS-34)** |
| **O-7** | **Does `packed` stay in era one's authored rotation** now the live board reproduces it? Three synthetic boards plus a real one that duplicates one of them is four boards measuring three shapes. | Unassigned | Open, carried from the prototype's work log |
| **O-8** | **Governance: mid-era crisis encounters have no `TEAM_CHECKLIST.md` item in any lane.** Reported by all four era-one work-log entries and never resolved; creating one is a shared-scope decision. **SHARPENED 2026-07-31 by D-CRISIS-35 and not answered.** The row previously named a gap with no deliverable behind it, which is part of why it stayed open — a lane item for *"mid-era crisis encounters"* is hard to size. It now has **two named, owed pieces of work**: a **durable crisis call** that survives a reload, which the freeze cannot be built without (§5.43c), and the **release gate** of Part 3, which must exist before any era ships a modal crisis. **Neither is implemented by this document** and neither has a lane. **The governance question is unchanged and its cost is not** — an unowned gap in front of a ruled encounter is a different item from an unowned gap in front of a design | Team lead | **Open, and now with two named deliverables behind it** |
| **O-9** | **Does the headroom cap apply to the Plague's closures, and what happens when it refuses one the player needs?** §5.6 recommends capping a crisis's capacity penalty at available headroom, so no citizen is evicted — `citizens.ts` derives its no-eviction guarantee structurally from capacity being monotone, and `const housed = Math.min(population, capacity)` is the line it turns on. Applied to era six the recommendation collides with itself: **cap the closures** and a containment move the player needs may be refused, which risks the unwinnable board INV-CRISIS-3 forbids; **do not cap them** and housed citizens become `waiting`, breaking the monotonicity premise. **Era six has one argument era two does not:** its suspension is temporary and `waiting` is documented as *"patient, not suffering"* (D-CIT6), so waiting out an outbreak and being re-housed may be acceptable where a permanent version is not. **WIDENED 2026-07-30 by D-CRISIS-11:** this is now a **boundedness** question as well as a winnability one. A refused closure also leaves an infected building with an active link, so the crisis does not progress toward its own terminal condition either — and *"no crisis is unbounded"* is a ruling rather than an aspiration. **Also widened in population:** D-CRISIS-16 and D-CRISIS-18 put eras four and nine on the same capacity penalty, so the headroom question is no longer era two's and era six's alone. Needs a ruling before era six is built. **MOSTLY RESOLVED 2026-07-31 by D-CRISIS-28: there is no headroom cap, for any of the four.** The dilemma this row is built on dissolves in the direction it hoped for — a closure is never refused, so INV-CRISIS-3 and boundedness both survive, and the monotonicity premise is paid for by amending it. **Era six's own argument turned out to be the general one:** *waiting out an outbreak and being re-housed* is now what every capacity crisis does. **What survives** is narrower and still era six's: whether the Plague's closures should be *unbounded in magnitude* as well as uncapped in kind, since nothing else in the ten lets a player suspend capacity by their own choice as the containment move. **DEFERRED WITH ITS CRISIS 2026-07-31 (D-CRISIS-32): what survived of this row was era six's own half, and era six is shelved.** It is not resolved — the magnitude question is genuinely unanswered — and it is no longer blocking, because the closure mechanic it is about will not be built. Its general half stays resolved by D-CRISIS-28, which still governs era four. **WOKEN 2026-07-31 by D-CRISIS-33: era six is back in scope, so the closure mechanic WILL be built and this row is blocking again.** What survived the last pass is exactly what is now live — **whether the Plague's closures should be unbounded in MAGNITUDE as well as uncapped in kind**, since nothing else in the four lets a player suspend capacity by their own choice as the containment move. **The deferral note above is void and its analysis is not**; read it as the statement of a live question. **Needs a ruling before era six is built**, which is what this row said before it was put to sleep. | Era progression owner, with the citizens owner | **Open, and LIVE again** |
| **O-10** | **Two loose ends in D-CRISIS-8's era-six detail.** (a) The lead's contrast calls the movement network *"partly hidden"* while the implementation calls the links *"visible"*. §5 takes the reading that reconciles them — links visible, infection along them partly hidden, which is era nine's kind of hidden state and not era two's — but the alternative, that some links are themselves unknown until used, is not ruled out. (b) Era six's capacity **lifts entirely when the outbreak ends**, which makes the Plague the only crisis of the ten that leaves **no trace**; every other permitted consequence in D-CRISIS-7 outlives its crisis. Whether that is intended, and what *"for how long"* means mechanically if the lift is automatic, are the same question. **The reading §5 records:** the player chooses *when* to close, the closure lasts until containment, so "how long" is decided by how fast they contain it rather than by a reopening decision. Not ruled. **Sharpened 2026-07-30 by D-CRISIS-11:** era six's terminal condition is *no infected building has an active link to a clean one*, which makes suspending a route a way to **shorten** the crisis and not merely to limit it — a stronger reading of *"for how long"* than this row currently carries. **DEFERRED WITH ITS CRISIS 2026-07-31 (D-CRISIS-32).** Both halves are era six's, so both wait with it. **(b) is worth keeping visible anyway**, because *the only crisis of the ten that leaves no trace* is a statement about D-CRISIS-7's floor and would need re-asking of any future crisis that reverts cleanly. **WOKEN 2026-07-31 by D-CRISIS-33: era six is back in scope, so both halves are live.** **(a)** the *"partly hidden"* / *"visible"* reconciliation now needs settling before the link layer is drawn, and it decides whether era six joins era nine on §9's hidden-status row — which would make that row shared and change §5.39's arithmetic, so it is a cost question as well as a design one. **(b)** *the only crisis that leaves no trace* is now a statement about a **shipping** crisis and therefore about what D-CRISIS-7's floor permits in practice rather than in principle. | Team lead | **Open, and LIVE again** |
| **O-11** | **Two code docblocks still state the cumulative-scaling claim D-CRISIS-14 retires**, and who reworders them is not this document's call. `hard-winter.ts` (`composeHardWinterBatch`) and `hardWinterItems.ts` (`WINTER_NODE_ORDER`) both say the cumulative draw is *"the one thing"* that lets the mechanic scale across ten eras without a rule change, each using **era eight** as its example — and era eight's window under D-CRISIS-14 is eras six, seven and eight. Both are still accurate about era one's prefix draw; only the scaling claim is wrong, so the correction is narrow. Reported at §5.16 and §6; **no code is changed by this document**. Secondary question: should INV-CRISIS-8 keep its number now that its content has changed, or does the register's convention want a new one? | Whoever owns `hard-winter.ts` | **Open**, and cheap |
| **O-12** | **Is the no-repeat record's unit the ITEM or the SKILL?** D-CRISIS-15's wording is skill-level, and in era one that is **vacuous** — `rounds: 6` × `batch_size: 3` is 18 questions, the trigger leaves 3 mastered nodes, and `composeHardWinterBatch` round-robins them, so **every batch already touches every skill.** The rule cannot bite in the only era with authored items; it starts biting at era two, whose window holds nine nodes. An **item-level** record bites everywhere and is also the record the practice side needs (§5.17). Related: who owns the shared store, since `@cr/item-bank` is deliberately I/O-free and the scoping note puts it in `apps/web/src/devPersistence/`. **RE-POINTED 2026-07-31 by D-CRISIS-31:** *"it starts biting at era two, whose window holds nine nodes"* is now wrong, because era two is shelved. **It starts biting at era FOUR, whose window holds fifteen** (neolithic + bronze_age + classical, measured at `2a484b1b`; §5.36 has the table). The argument is unchanged and strengthened — a 15-node window makes the skill-level reading emptier still, so the case for an item-level record is stronger than this row states. **And era one's vacuity is now permanent**, not a first-era transient. | Unassigned | **Open**, and it decides what gets built |
| ~~**O-13**~~ | ~~**What happens if the player never answers the call?**~~ ~~D-CRISIS-10 rules that the crisis announces itself and waits. Nothing says whether **era advancement waits with it**, and the two candidate answers are very different products: a crisis that gates the era advance is an interruption with extra steps, and one that does not is a crisis a player can decline permanently — which would make D-CRISIS-11's boundedness claim true of every crisis *in progress* and silent about the ten sitting on doorsteps.~~ Interacts with D-ERA17's *"a banked era still owes its trial"*, which is the same question one encounter later and has already been ruled the other way — **and that interaction inverts on resolution: under D-CRISIS-35 the two now AGREE**, because an encounter is not dischargeable by not doing it at either level, and the thing discharged is the teaching in both (§5.43). **PUT UP FOR RESOLUTION BY CONSEQUENCE 2026-07-31 alongside O-6, and it DID NOT SURVIVE the derivation** — the failed derivation is recorded at §5.42b rather than the conclusion. The proposal was that drift takes every district and the crisis ends decided against the player. **It cannot follow from D-CRISIS-34**, which is what makes recording the attempt worth more than recording the answer: a cycle now advances on an **answered question batch**, and a player who never answers the call answers no batch inside the crisis, so **no cycle advances and no district drifts**. The batch unit therefore **sharpened** this row instead of closing it — *the crisis on the doorstep is frozen* became a property of the mechanism rather than an omission. **And the proposal answers a different question:** this row's subject is the **call** and era advancement, not the commitment, per D-CRISIS-10's own carrying sentence. The proposal is sound about a player who **enters and never commits**, and it is recorded there, as D-CRISIS-34's outcome clause (§5.42c). ~~**Still open, with the team lead, exactly as it stood.**~~ **RESOLVED 2026-07-31 by the team lead — see D-CRISIS-35 and §5.43. THE CITY FREEZES AND THE LEARNING DOES NOT.** A player given a call who does not enter it can do nothing in their city — no building, no roads, no civic purchases, no moving placed buildings — until they enter; lessons and practice continue normally, ruled explicitly, because the city is the reward layer and a crisis draws its questions from mastered skills, so freezing the learning would lock the player out of the only activity that makes the crisis winnable. **Era advancement waits with the call**, which is the half this row named and which is ruled as its own clause **because it does NOT follow from the freeze** — D-ERA5 gates the advance on mastery plus the trial and neither is a build action, so a frozen player would otherwise have advanced out from under the crisis (§5.43b). **It was answered at the GAME level, which is what §5.42b said it would take**, and the failed derivation is what established that. **The analysis above is deliberately NOT struck through**, following O-22 rather than O-2 and O-4: those were a sentence each, and this row's body is the record of a resolution attempt that failed for a structural reason worth keeping — striking it would make the sequence unreadable, and deleting it would have it re-derived. **Two residues, and both are named rather than folded in:** an automatic call becomes a hard prerequisite and what the tree holds is session-local, so a **durable** call is owed (§5.43c); and Part 3's release gate is a requirement this document does not implement. Row kept so the number is never reused | ~~Team lead~~ | **RESOLVED 2026-07-31 by the team lead — see D-CRISIS-35.** Survived a 2026-07-31 attempt to close it by consequence (§5.42b) and was ruled directly the same evening |
| ~~**O-14**~~ | ~~**What advances a Succession "cycle"?**~~ ~~D-CRISIS-16 rules it must be player actions and never elapsed time, which settles the clock and not the unit. If **any** action advances a cycle, opening a menu costs a district; if only an **answered batch** does, hesitation between batches is free and the mechanism does not bite the behaviour it was written for. The likely answer is the batch, by analogy with era one's `end_round`, but it is not ruled.~~ **RESOLVED 2026-07-31 by the team lead — see D-CRISIS-34. It is the ANSWERED QUESTION BATCH**, which is the option this row called likely and for the reason it named. **The argument is at §5.42 and is not summarised into this row**, because it is what makes the crisis work rather than a tiebreak between two units: the batch is what makes earning influence and losing ground the same act, so the player cannot accumulate without the board moving against them — hesitation, not error. **The rejected alternative is kept there too:** a cycle advancing on **commitment** would make never committing mean never drifting, so waiting would be free in the one crisis built to punish it. Row kept so the number is never reused | ~~Unassigned~~ | **RESOLVED 2026-07-31 by the team lead — see D-CRISIS-34** |
| **O-15** | **The Boiler Cascade owes a terminal condition and a budget ruling, and they are the same question.** §5.13 puts it in the *solve it* bucket and D-CRISIS-11 rules that no crisis is unbounded, but its solve condition is not stated. It is not invented here. The budget half: D-CRISIS-17 makes a burned-out repair **add** a repair while the budget is finite, so a player who probes downstream early can face more repairs than budget — which INV-CRISIS-3 forbids. Either the budget is sized against the worst plausible ordering or burn-out is capped, and the choice changes what the crisis is about. **STILL LIVE AFTER D-CRISIS-31, and it is now the sharpest unbuilt-crisis row in this table:** era seven is one of the four, it is the only surviving customer of D-CRISIS-26's budget, and it holds both halves of O-18's difficulty on its own. **DORMANT 2026-07-31 (D-CRISIS-33) — the Boiler Cascade is SHELVED and this question sleeps with it.** **It is neither answered nor deleted**, and the distinction is the point of this marker: the terminal condition is still unstated and the budget/burn-out interaction is still unresolved, so a future un-shelving picks up a live question rather than a closed one. **What the marker is FOR: nobody should spend a session closing a question about a shelved crisis.** The sentence above calling it the sharpest row in this table was true for about six hours and is superseded — **O-16 holds that place now**, having woken with era nine as this row went to sleep. The analysis is kept in full because it is what era seven's design owes and would otherwise be re-derived. | Unassigned | **Open, DORMANT with era seven** |
| **O-16** | **Intrusion owes a terminal condition, and relocation makes it non-obvious.** Same *solve it* bucket, same missing exit. D-CRISIS-18 relocates the source on every wrong isolation, so a player who keeps guessing keeps resetting the board and D-CRISIS-11's boundedness claim needs an argument rather than an assumption — a bound on relocations, a monotone quantity that survives one, or an exit that does not depend on identifying the source at all. **DEFERRED WITH ITS CRISIS 2026-07-31 (D-CRISIS-32).** Era nine is shelved, so the missing exit waits with it. **Kept in full rather than trimmed**, because the boundedness argument this row asks for is the hardest single piece of analysis owed by any of the six and is exactly what a later reader would otherwise redo. **WOKEN 2026-07-31 by D-CRISIS-33, and it INHERITS O-15's standing as the sharpest live gap in an unbuilt in-scope design.** Era nine ships, so *"the hardest single piece of analysis owed"* is now owed by a crisis somebody will build — and the sentence was written as a reason to keep this row while it slept, which makes it a reason to schedule it now. **What is owed is unchanged:** a bound on relocations, a monotone quantity that survives one, or an exit that does not depend on identifying the source at all. **It compounds with O-18**, because era nine also holds the one live action budget and a budget interacts with an unbounded relocation exactly the way era seven's did with burn-out — the difficulty moved eras rather than disappearing. | Unassigned | **Open, and LIVE — the sharpest of the unbuilt-design rows** |
| **O-17** | **What era one's round count becomes, and the re-tune that follows it.** D-CRISIS-27 rules the direction — fewer than six — and deliberately sets no number. **The scope, so this is schedulable rather than open-ended:** pick the count; re-derive the zero-accuracy timetable so the last building still falls on the *final* round and update `hard-winter.test.ts`'s freeze assertion; re-search the accuracy ceiling ladder (0/4/5/6 at 0, 1, 2, 3 of 3) at the new length; re-read `cold_rounds_to_ruin` and `burn_rounds`, which are round counts and change meaning without changing value; re-check the fire radius ladder, which **O-1** already has open against the six-round board; re-check the 240-material gap the reclaim price is derived to produce; and **re-author a full-accuracy witness per layout**, since each is length-checked against `HARD_WINTER.rounds` and INV-CRISIS-3's no-unwinnable-board evidence is exactly those witnesses. **Do it after the demo** — the Hard Winter is what is being demoed. | Whoever owns `hard-winter-tuning.ts` | **Open, scoped, and deliberately not started** |
| **O-18** | **How big are the three action budgets?** D-CRISIS-26 rules them finite and §1 forbids inventing the numbers here. This is where **O-15**'s budget question re-lands after D-CRISIS-26 dissolves its INV-CRISIS-3 half: a budget so tight that ending unsolved is the ordinary result is a different game from one where it is the price of a bad ordering, and the two are indistinguishable in the ruling. Era seven is the sharpest because burn-out **adds** repairs to a finite pool (D-CRISIS-17); era nine's is the only budget that does not already exist in some form. **None of the three has a denominator yet** — `materialForEra` returns `null` for every era but `prehistoric`, so D-CRISIS-12's bound cannot price them either. **NARROWED 2026-07-31 by D-CRISIS-31 from three budgets to ONE.** Eras two and nine are shelved; **era seven's is the survivor, and it is the one this row already called the sharpest** because burn-out adds repairs to a finite pool (D-CRISIS-17). So the row loses two thirds of its population and none of its difficulty. The `materialForEra` denominator problem is unchanged. **RE-POINTED 2026-07-31 by D-CRISIS-33 from era seven to ERA NINE.** Era seven is shelved and era nine ships, so the population is still one and the survivor has changed. **It loses the difficulty the last note named and gains a different one:** burn-out adding repairs to a finite pool is era seven's, so that interaction sleeps with **O-15** — and era nine's is, in this row's own words, *"the only budget that does not already exist in some form"*, so there is no existing shape to size against. **It also compounds with O-16**, which is live again: an unbounded relocation against a finite budget is the same structural problem burn-out posed, one era along. The `materialForEra` denominator problem is unchanged and still blocks pricing it against D-CRISIS-12. | Unassigned | **Open, narrowed to era nine** |
| **O-19** | **Is an UNSOLVED ending a losing outcome, or an ending with consequences?** D-CRISIS-26 gives three crises an ending they can reach without succeeding and calls it *a real losing end*; INV-CRISIS-3's third clause says *"There is also no losing outcome to reach"*, on the grounds that *"a losable encounter would be the first dead end in a codebase that has carefully avoided them."* **The soft reading has precedent in this document twice** — the Raid's objective reached is *"an ending rather than a loss"* and era ten's dark city *"must be an ending with consequences, never a loss"* — and under it nothing in INV-CRISIS-3 moves. **The hard reading changes what an outcome type may contain**, and would make INV-CRISIS-3's third clause era one's rather than all ten's. Presentation choice versus contract change, and they are not variants of each other. §5.25 states both and picks neither. **NARROWED 2026-07-31 by D-CRISIS-30, and narrowed in the one direction that matters for scheduling: nothing is blocked on it.** A concluding screen whose verdict is derived from the outcome has a slot for whichever answer this row gets, so the soft reading is *already* what such a screen delivers and the hard reading adds one more string at the bottom of its ladder. **Neither changes the structure**, so the nine briefs and era one's implementation may proceed without this row closing. What the ruling does foreclose is the version that would have made this row urgent: a single fixed *"crisis complete"* headline has nowhere to put a verdict, so resolving this either way would then have meant rebuilding the screen. **Still entirely open on its own terms** — the question is which reading is right, and that is unchanged. **RE-POINTED 2026-07-31 by D-CRISIS-33: the one crisis that can reach an unsolved ending is now INTRUSION (9), not the Boiler Cascade (7).** The contradiction with INV-CRISIS-3's *"no losing outcome to reach"* survives whole, on one crisis, exactly as before; nothing about either reading moves and nothing is blocked on it | Team lead | **Open, and it is the sharpest of the new rows** |
| **O-20** | **WHICH capacity bounds population — and it is the only place D-CRISIS-28 owes real code.** Measured at `03d5a2b9` (§5.28): `waiting` is bounded by `residence_capacity`, a sum over the six **skill nodes** that no crisis may lower (D-CRISIS-7 forbids undoing mastery) and that a civic building adds exactly **zero** to. The capacity a crisis *does* reduce, and the one *"increase capacity via the civic buildings"* names, is **livability** — and livability bounds nothing: `capacityShortfall` reports `unsustained` as a number, nothing in the tree consumes it, and INV-COS-1 forbids it gating anything. **So the lead's lever and the lead's effect are on opposite sides of a seam, and the ruling is inert until they are wired.** The candidate is `housed = min(population, livability)`. **The design has already asked for this reconciliation twice and named this exact code once** — era progression §7's *"there is no separate housing capacity"*, and `work-log/gabe/2026-07-29-capacity-model-ruling.md` (#218): *"today's shipped `CitizenCapacity` is precisely the thing the ruling reclassifies from a capacity to the housing input to livability, and today's `population <= capacity` guarantee is a single-term bound."* Both were documentation rulings that moved no code, and the second deliberately left it (*"it is Evan's file"*). **Two things travel with it and are not optional:** the no-eviction sweep needs its population widened from *learning advances* to *capacity reductions from any source*, with a demonstrated red (§5.29); and `citizens-tuning.ts` is calibrated so `population === residence_capacity` at full mastery (`ENDGAME_SPARE_HOMES = 0`), so re-pointing the bound at livability changes what *settled* means and D-CIT4's settled-ending guarantee is asserted against the old one. **Sequence this deliberately:** #273 is open in exactly these files. **WIDENED 2026-07-31 by D-CRISIS-33, and this is the largest single change that ruling makes to owed code.** Under D-CRISIS-31 this row had **one** in-scope customer, era four. Under D-CRISIS-33 it has **three** — eras 4, 6 and 9 — because D-CRISIS-16's contested districts, D-CRISIS-8's closures and D-CRISIS-18's wrong-isolation cost all suspend a building's contribution (§5.39). **So the seam is load-bearing for three quarters of the shipping spine rather than for one era.** Nothing about the row changes in kind: same measurement, same candidate (`housed = min(population, livability)`), same two non-optional companions (the no-eviction sweep's widened population with a demonstrated red, and `citizens-tuning.ts`'s `ENDGAME_SPARE_HOMES = 0` calibration). **What changes is that it stopped being one era's wiring problem and became the design's.** | Citizens owner, with the economy owner | **Open, and now blocking three of the four crises** |
| **O-21** | **Is a departure IMMEDIATE or METERED, and who restates the ruling in the era design's terms?** D-CRISIS-28 is a state comparison — the ceiling falls below the crowd and the overflow leaves — which is what INV-CRISIS-1 and the clockless roster both want. `2026-07-27-era-progression-design.md` §8 meters departures instead, at *"roughly one per ten minutes of play, after a ten-minute grace period"*, and its reversal banner puts the trigger in **happiness** where D-CRISIS-28 puts it in **livability**. **The lead's words settle neither**: *"people leave"* and *"they'll come back"* are compatible with an immediate bound and with a slow drain, and the two are different products — an immediate bound is legible and slightly brutal, a drain is gentle and needs a queue, which is state, which is a latch, which is the one thing §5.28 measured the absence of. **The second half is a hand-off, not a question:** the ruling should be restated in D-ERA14/D-ERA15's own terms by that document's owner, which is what the old O-4 asked for and did not get | Team lead for the shape; era progression owner for the restatement | **Open** |
| ~~**O-22**~~ | ~~**Is era TEN the right place for the fourth crisis?**~~ **RESOLVED 2026-07-31 by the team lead — see D-CRISIS-33. It is not: era ten has NO crisis.** The reservation below was put to him and he answered it by moving the set, so the question is closed in the direction it reserved. **The row is kept and the number is never reused**, per this table's convention. **The analysis below is deliberately NOT struck through**, which is a departure from how O-2 and O-4 were closed and is worth one line of explanation: those two were a sentence each, and this one is the argument for a placement that could be revisited if the Robot Uprising is ever un-shelved. **D-CRISIS-23 says it would return to era ten if it returned at all**, so this is the objection that would have to be met a second time. Struck through it would be unreadable; deleted it would have to be re-derived. **What the resolution costs era ten, which is nothing:** its ending is carried by its **progression** — the era-ten trial, the Town Hall retheme and the advance, all confirmed for all ten eras by D-CRISIS-31's third clause — **plus the game-completion ceremony**, which `2026-07-31-game-completion-ceremony-design.md` owns. That document's §9 enumerated era ten's endgame as four surfaces with the crisis first; **it is now three, and the three that remain are the three it called the ending** (§5.41). ~~Raised by Gabe, 2026-07-31, put to the team lead and NOT YET ANSWERED.~~ **The reservation as it was recorded, kept whole:** D-CRISIS-31 rules 1/4/7/10 and that was what shipped; this row recorded a reservation against one of the four rather than reopening the ruling. Two halves. **(a) Reach.** The reach curve is steep, so an era-ten crisis is the **most expensive per player who actually arrives at it** — every other crisis in the four is met by strictly more learners than the one after it, and era ten is the floor of that curve. It is also the most expensive of the four in absolute terms after era four: §9 gives it a power network with switchable state and mobile agents with pathing, and after the cut **it is the only customer for both** (§5.35). **(b) The ending is already taken.** Era ten's *progression* is the game's ending ceremony — `2026-07-27-era-progression-design.md` §9 and **O-14** there ask whether the unbuilt *"calculus attack"* endgame becomes the final era's trial — so era ten is the one era where a crisis and a trial compete for the same beat rather than dividing the era between them, and D-ET3's *the crisis is the unpredictable thing; the trial is the dependable graduation* is hardest to hold when the graduation is the last thing in the game. **The argument on the other side is in the document already and is not weak:** D-CRISIS-23 rules that era ten **inverts the premise** — you survive by switching your own city off — and that *"it only reads as an inversion to a player who has spent nine eras doing the opposite"*, which is an argument that this crisis is worth *more* at era ten than anywhere else and cannot simply be relocated. **Not decided here.** If the lead moves it, the candidates are era eight (the shelved Missile Alert, and the only other nine-node era) or three crises rather than four. **HOW IT WAS ACTUALLY ANSWERED, and it is neither candidate this row named — worth recording because a reservation that guesses wrong about the remedy is still a reservation that was right about the problem.** The lead did not move it to era eight and did not drop to three crises; he moved the *whole back half* of the spine, era seven to era six and era ten to era nine, and kept four. **Both halves of the reservation were met by that.** (a) is met directly: the two capabilities this row called era ten's alone — the power network and mobile agents with pathing — **now have no in-scope customer at all** and are §5.39's two largest single-crisis savings. (b) is met by removing the competition entirely: era ten's trial and ceremony no longer share the era with a crisis, so D-ET3's *the crisis is the unpredictable thing; the trial is the dependable graduation* holds at era ten without strain | ~~Team lead~~ | **RESOLVED 2026-07-31 by the team lead — see D-CRISIS-33. Era ten has no crisis; the spine is 1/4/6/9.** Row kept so the number is never reused |
| **O-23** | **`midEraCrisisCall` reports a standing crisis call for all TEN eras, and six of those are now shelved.** Measured at `2a484b1b`, not read: seeded with each era's own `midEraCrisisNodeIds` at mastery 2, `engines/game/src/mid-era-crisis.ts` returns `standing: true` for every era — `neolithic 3/5`, `bronze_age 3/5`, `medieval 3/5`, `renaissance 3/6`, `atomic_age 5/9` and `information_age 3/6` among them. **Nothing is broken today**, and that is the reason this is a question rather than a defect: `apps/web/src/city/crisisCall.ts` gates the playable surface on `CRISIS_BRIEFING_ERAS = [CURRENT_ERA_ID]`, so no shelved era can open anything. **What is unresolved is where the scope lives.** Either the engine learns which eras have crises — a per-era predicate beside the trigger, which makes `midEraCrisisCall` answerable only for four eras and re-scopes `mid-era-crisis.test.ts`'s *"every era in the shipped sequence, and there are ten of them"* floor — or it stays pure arithmetic and every caller gates, which is one gate per surface and the shape that goes wrong quietly. **The arithmetic itself must not move either way:** `crisisTriggerForNodeCount` is exported precisely so it can be tested at counts no era holds, and D-CRISIS-9's derivation is what stops a literal `3` from passing. Four comment sites carry the same assumption in prose — `crisisCall.ts:445` and `crisisEntrySequence.test.tsx:374` (*"each era has its own crisis and its own trigger"*) and `WinterStatusStrip.tsx:51` (*"for all ten crises"*) — and none is wrong about today's behaviour. **RE-POINTED 2026-07-31 by D-CRISIS-33, and UNAFFECTED IN KIND.** Everything measured above is still true at `db2b18c2`: `midEraCrisisCall` still returns `standing: true` for all ten eras, `CRISIS_BRIEFING_ERAS = [CURRENT_ERA_ID]` still gates the playable surface to era one, so **no shelved era can open anything and nothing is broken today**. **What changed is the answer this row would eventually be reconciled against: the four eras are now 1, 4, 6 and 9.** The `renaissance 3/6` and `information_age 3/6` rows in the measurement above are now in-scope eras rather than shelved ones, and `industrial 3/6` and cyberpunk's `5/9` have gone the other way. **The question — where the scope lives, a per-era predicate beside the trigger or a gate per caller — is unchanged**, and so is the constraint that the arithmetic itself must not move. **Still Evan's lane, and still no code changed by this document** | `engines/game` owner (Evan), with the city surface owner | **Open. No code is changed by this document (§1)** |
| **O-23, as promoted** | **PROMOTED IN FORCE 2026-07-31 by D-CRISIS-35, and UNCHANGED IN KIND.** Every measurement in the row above still holds and nothing about the question moves: it is still *where does the scope live*, still a per-era predicate beside the trigger against a gate per caller, and still true that **nothing is broken today** because `CRISIS_BRIEFING_ERAS = [CURRENT_ERA_ID]` keeps every shelved era from opening anything. **What changes is what a wrong answer would now cost.** Before this ruling the mismatch was untidy — an engine reporting a standing call for ten eras against one playable crisis, harmless because no surface acted on it. **D-CRISIS-35 makes something act on it.** A freeze keyed on `midEraCrisisCall(...).standing` would freeze the city in **all ten eras** at three mastered nodes, against **one** crisis anybody can enter, which is exactly the permanently-stuck state Part 3's release gate exists to forbid — arriving not through an under-authored era but through the seam this row has been describing all along. **This is why gate row A is written as a same-predicate requirement** rather than as an existence check: *the predicate the freeze keys on must be the predicate that decides a crisis exists*, so the two cannot be answered differently (§5.43c). **The row is not closed and its answer is not pre-empted** — either shape can satisfy row A, and choosing between them is still Evan's. **What is foreclosed is leaving them disagreeing**, which was survivable while nothing read the disagreement | `engines/game` owner (Evan), with the city surface owner | **Open, and now load-bearing for D-CRISIS-35 rather than latent** |
| **O-24** | **The shelving has to reach #307 before it lands, or D-CRISIS-32 is breached by a PR obeying D-CRISIS-31.** The nine per-crisis briefs are `docs/superpowers/specs/crises/` on that pull request — **open, `mergedAt: null`, read from the API at `2a484b1b`** — so **six of the shelved designs' fullest statements are not in the tree at all** and cannot be marked deferred by this document. **The failure is specific and cheap to walk into:** a rewrite briefed *"the spine is four now"* deletes six briefs, passes every gate, and satisfies D-CRISIS-31 to the letter while destroying exactly the work D-CRISIS-32 exists to keep. **What is owed:** the six briefs are **retained and marked DEFERRED**, their README's section map keeps its rows, and the three in scope (4, 7, 10) carry the concluding-screen section §5.34 requires. **This document is the only merged record of the shelving**, which is why it says so here rather than relying on the brief that produced the ruling. **RE-POINTED 2026-07-31 by D-CRISIS-33, and the membership of both lists changed while the count did not.** Read from the API at `db2b18c2`: #307 is still **open, `mergedAt: null`**, last updated `2026-07-30T22:45:29Z`, and `docs/superpowers/specs/crises/` still does not exist in the tree. **The three briefs that must carry a concluding-screen section are now eras 4, 6 and 9**; the six to retain and mark deferred are now eras **2, 3, 5, 7, 8 and 10**. **The trap this row names is unchanged and has a second form now:** a rewrite briefed *"the spine is 1/4/6/9"* would delete the wrong two briefs, satisfy D-CRISIS-33 to the letter and breach D-CRISIS-32 — and a rewrite briefed from the older ruling would delete the *other* wrong two. **Whoever lands it should read D-CRISIS-33 first and D-CRISIS-31 second.** One thing this ruling adds rather than re-points: **eras six and nine are now briefs for crises somebody will build**, so the identical-declare-sentence defect two reviews found matters most there — a shared sentence across shelved designs is untidy, and across shipping ones it is D-CRISIS-19's failure mode arriving through the briefs (§5.41) | Whoever lands #307 | **Open, and it is the one row with a deadline attached to somebody else's merge** |

---

## 12. References

- `engines/game/src/hard-winter.ts`, `hard-winter-tuning.ts` — the only built crisis. **`HARD_WINTER.rounds`'s docblock is what D-CRISIS-27 defers** (§5.27)
- `engines/game/src/hard-winter.test.ts`, `hard-winter-invariants.test.ts`, `hard-winter-layouts.test.ts` — the last of these is **D-CRISIS-13's precedent**: the legal-action enumerator, the one-round-lookahead policy, the accuracy sweep with its floor, the random-legal bracket, `netMaterial`, and `standing`'s missing ground term (§5.14). **That same sweep is the machinery D-CRISIS-25's band reuses**, and its witness lengths are checked against `HARD_WINTER.rounds`, which is what D-CRISIS-27 costs (§5.23, §5.27). The **first** pins the zero-accuracy freeze timetable the same ruling re-derives
- `test/hardWinterClockless.test.ts`, `packages/economy/src/clockless.test.ts` — INV-CRISIS-1's two population-derived token sweeps, both with a self-test that proves they can see a clock read. **D-CRISIS-16's clockless-cycle rule** rests on these
- `engines/game/src/crisis-damage.ts`, `crisis-damage.test.ts` — D-CRISIS-7's floor **expressed as a type**, and `suspended_civic`, the durable record half of capacity locking (§5.19, §9's second staleness note). **It is also D-CRISIS-26's floor check in structural form**: an unsolved ending has no field to record a lost mastery in, and *"every kind of damage the shape can hold can be CLEARED again"* is D-CRISIS-12's viable-path clause measured over the whole shape (§5.25)
- `apps/web/src/city/crisisRepairRecovery.test.ts` — **D-CRISIS-12's bound already measured for era one**, priced in practice sets rather than in material
- `apps/web/src/city/interleavedPayoutSeam.test.tsx` — the fix that makes practice pay, without which D-CRISIS-12's denominator would be zero (§5.19)
- `packages/item-bank/src/practiceSelect.ts` — `buildRandomizedSetByShape`'s fresh `seen` and `drawSpreadByShape`'s preference-not-constraint rule, both load-bearing for D-CRISIS-15
- `apps/web/src/lessons/infiniteScheduler.ts` — `createInterleavedScheduler`'s shuffled bag, which is D-CRISIS-15's no-repeat shape one level up and already built
- `engines/game/src/era-trial.ts`, `storm.ts` — `ERA_TRIAL_CLEAR_RATIO`, `STORM_CLEAR_RATIO` and `ERA_TRIAL_MASTERY_GATE`, for §5.14's finding that the gates do not agree on a minimum passing accuracy
- `docs/superpowers/specs/2026-07-29-economy-measured-at-tip.md` §6 — the cross-session practice-memory measurement D-CRISIS-15 shares machinery with, and §6.5's scoping of the store. **Its §0 headline is stale at `6abf299`; see §5.19**
- `apps/web/src/winter/` — the playable surface, `liveCityLayout.test.ts` (§8), `liveCitySandbox.test.tsx`
- `packages/skill-graph/src/eras.ts` — D-ERA25 and the nine unauthored eras; **`ERA_SEQUENCE`'s node counts are what D-CRISIS-9's trigger is derived from**, and `ERA_MIN_NODES` / `ERA_MAX_NODES` bound it (§5.12)
- `packages/economy/src/capacity.ts`, `capacity.test.ts` — livability and happiness as derived readouts; INV-COS-1's *"a shortfall gates nothing"*, and the test that pins it by shape (D-CRISIS-8, §5.10)
- `apps/web/src/city/crisisRepair.ts` — the repair action, which has shipped since this document was written; see §9's staleness note
- `engines/game/src/citizens-population.ts`, `citizens.ts`, `citizens-invariants.test.ts`, `citizens-roster-invariants.test.ts` — D-CIT2, D-CIT6, the forbidden loop. **`citizens.ts`'s no-eviction argument is what D-CRISIS-28 amends**, and it is amended in place there with a dated note rather than deleted; `citizens-tuning.ts` holds `CITIZEN_NODE_CAPACITY`, whose all-zero fallback is why a civic building adds no homes (§5.28)
- `packages/economy/src/civicBuilding.ts` — **`civicCityCapacities` is the whole of D-CRISIS-28's recovery path and it already ships**: a suspended placement contributes nothing, an unsuspended one contributes its decayed figure, and the sum is a pure read, so buying capacity restores it with no un-latching. `civicSuspendedCapacity` is what a readout needs to name the penalty
- `packages/economy/src/capacity.ts` — `capacityShortfall`'s `unsustained` is the overflow D-CRISIS-28 is about, computed today and **consumed by nothing** (§5.28, O-20)
- `docs/superpowers/specs/2026-07-27-citizens-and-city-life-design.md` §5 — D-CIT2. **Its AMENDMENT 3 (2026-07-31) is D-CRISIS-28 on the citizens side**, and carries the narrowed D-CIT6 and D-CIT19
- `docs/superpowers/specs/2026-07-29-era-resource-model-design.md` §5 — the no-generation ruling
- `docs/superpowers/specs/2026-07-27-era-progression-design.md` §8, D-ERA14, D-ERA15, D-ERA25, INV-ERA-3, INV-ERA-4. **It is also D-CRISIS-31's other half:** **D-ERA16** is the persistent end-of-era progression the ruling keeps for all ten eras, and §1 and §9 there carry the dated cross-reference. **§6.4a is where the ten dressings are ruled** — the Town Hall's per-era retheme, D-ERA26 / D-ERA28 / D-ERA30 holding for the island, advisor and roads, D-ERA8's construction-time freeze over the 62 skill buildings, and the line that decides the general case: *per-era art freezes where it MULTIPLIES with a catalogue and is kept where it is one-per-era* (§5.35). **The document contains the string *crisis* zero times, which is why nothing there had to be corrected** (§5.38)
- `docs/superpowers/specs/eras/2026-07-29-skill-building-rulings.md` §2 — the record of the ruling that holds the island, roads and advisor re-dressing, and §2.1's statement that the multiplies-with-a-catalogue line *is predictive*. §5.35's second half rests on it
- `docs/superpowers/specs/2026-07-29-era-trial-contract.md` — the end-of-era encounter this one is deliberately unlike. **D-ET4** overturns the 80% clear rule and with it `ERA_TRIAL_CLEAR_RATIO`, which is why §5.14 does not use it as a minimum passing accuracy. **D-ET3 is what D-CRISIS-31's third clause confirms** — *the same ritual in all ten eras* — and **§11.3 carried the plainest one-crisis-per-era sentence in the tree** (*"The rhythm of an era is master the era, survive its crisis, rebuild the hall, enter the next age"*), corrected in place with a dated note (§5.38)
- `apps/web/src/winter/hardWinterItems.ts` — **`winterDrawSetFromIds` is D-CRISIS-31's one permanent structural dependency**: era one's crisis now sits forever on a 6-node window against **15, 16 and 21 at eras 4, 6 and 9** (re-measured for D-CRISIS-33's set; it read 15, 17 and 24 at eras 4, 7 and 10 under the previous one), and this is the fallback that keeps it playable when the practised set cannot fill a batch. Do not delete it as defensive tidying (§5.36)
- `apps/web/src/city/crisisFromAFreshSession.test.tsx` — the defect that fallback was written for, reproduced through the player's own doors, and **a load-bearing guard rather than a closed-bug regression test** after D-CRISIS-31 (§5.36)
- `engines/game/src/mid-era-crisis.ts`, `mid-era-crisis.test.ts` — D-CRISIS-9's trigger, and the **strongest one-crisis-per-era assumption in the tree**: `midEraCrisisCall` reports a standing call for all ten eras, measured at `2a484b1b`. **O-23**, and no code is changed here
- `apps/web/src/city/crisisCall.ts` — `CRISIS_BRIEFING_ERAS = [CURRENT_ERA_ID]` and `hasPlayableCrisis`, which is why O-23 is a question about where scope lives rather than a live defect. **`crisisBriefingFor` is also the copy §5.37 protects**: the slides are the only player-facing statement of INV-CRISIS-1 and of D-CRISIS-7's repair clause. **It is also where D-CRISIS-35's prerequisite is measured** (§5.43c): `useCrisisCall` DOES call automatically, on the trigger crossing, but `wasStandingRef`'s baseline seeding makes the call **session-local and transition-only** and the module states it is not persisted — so what the freeze needs is a **durable** call rather than an automatic one. **The era-advance re-arm in the same hook is what makes §5.43b's gate a ruling rather than a derivation**: an era change clears `pending`, `answered` and the baseline, so advancing would discard a standing call
- `apps/web/src/city/crisisEntrySequence.test.tsx` — **the test that pins the gap D-CRISIS-35 depends on closing**: *"does not fire for a city that was ALREADY past the trigger when it loaded"*. It asserts the sequence is quiet and the menu entry is the standing way in, which is correct behaviour today and is the population a freeze would harm most, since it is every learner on their second session (§5.43c)
- `docs/superpowers/specs/2026-07-29-era-trial-contract.md` §14 — **INV-TRIAL-1**, **D-ET6**, and the four assertions that close the preview-node trap. **D-CRISIS-35's Part 3 is their sibling and not their extension** (§5.43d): assertion C composes `composeEraTrial` and nothing there runs a crisis composer, while a preview node can never be mastered and so is absent from the crisis pool rather than short. Neither gate catches the other's failure, and under a modal crisis the two traps compound. §14's *block the release, not the student* is the principle both obey
- `work-log/gabe/2026-07-29-hard-winter-mid-era-crisis-prototype.md`, `-fire-retune-and-tier-preview.md`, `-abandoning-costs-ground.md`, `-on-the-city-you-actually-built.md`
