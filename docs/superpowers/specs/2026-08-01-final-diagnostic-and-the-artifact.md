# The final diagnostic and the artifact: what the retake gates, and what the ending says to a learner who arrived competent (DESIGN RECORD, nothing built)

**Recorded 2026-08-01, first at `integration` @ `56497b6b` and then RE-GROUNDED at
`376c324b`, which merges `integration` @ `3b655728` after
#389 landed underneath this
record mid-write. Every measurement reproduces and all 87 tree citations were re-checked
against an expected token at the merged tip rather than inherited, alongside 38 further
checks against an open PR's branch (§6.2). Read the figures as measured at `376c324b`. No
production code changed; the two measurement harnesses were deleted after the runs and the
tree was verified byte-identical afterwards.**

**AMENDED 2026-08-01 AFTER THE LEAD RULED. `O-END3` is CLOSED, in the bound direction, by
the team lead, who took it out of Evan's lane to decide it. This record's own recommendation
(Option 4) was overruled and is kept costed rather than dropped, so a later reader can see
what was rejected and by whom.** The ruling, verbatim:

> *"ill decide myself - the final ceremony should be the final diagnostic."*

**Status: DESIGN RECORD + MEASUREMENT. Eleven decisions (`D-FIN1`..`D-FIN11`), of which two
are recommendations in another owner's lane and are labelled as such. Four open items
(`O-FIN1`..`O-FIN4`). Closes the shape of `O-TO4`. It also edits ONE other file, which the
first revision did not: `O-END3` is marked closed in place in
`2026-07-31-game-completion-ceremony-design.md`, with its false clause struck rather than
deleted (§2.1). Nothing else in that document moves and no `D-END` id is minted.**

**The question that opened this record was the lead's, given verbatim:**

> *"the model i had in mind was a diagnostic at the start + a diagnostic at the end. the
> final ceremony doesnt necessarily have to be that same diagnostic, but i thought it made
> sense since theres nothing to progress from era 10 to the next. i suppose we could
> separate the diagnostic from the mechanic but still ask users to do it, but if its not
> mandatory they might not do it which would ruin the artifact"*

He named a real tension. This record's job was to establish what was actually ruled, what
the artifact actually requires, and what the research actually says, and then to cost the
options against those three rather than against the assumptions the question carried. It has
since become the record of how he settled it, and of the three things the ruling does not
settle (§9).

**Who decides what, as it turned out.** `O-END3` was assigned to **Evan** as a game-flow
ruling; **the lead took it himself**, on the grounds that it reaches the metric the product
is sold on. What the pre/post instrument may claim is the **diagnostic lane's** and is ruled
here. The ceremony's copy remains Evan's with the lead, so §10's copy constraints are
written as constraints the ruling *inherits* rather than as a redraft of anybody's words.
Nothing here widens the diagnostic or changes a line of production code.

---

## 1. The answer up front

**Seven findings, in the order that changes the shape of the problem. The first has been
overtaken by the ruling and is kept because the ruling is what overtook it.**

1. **The retake was not mandatory when this record opened, and it was not optional either:
   it was UNRULED, and it is now RULED BOUND.** `O-END3` was open and owned by Evan, and was
   the earlier record's own admission that *"nothing here rules on refusing it"*. **The team
   lead closed it on 2026-08-01, in the bound direction, taking it out of Evan's lane** on
   the grounds that it reaches the metric the product is sold on. The ceremony and the
   retake are one thing; there is no ending that is not the retake's reading (§2.1).

2. **The artifact is a PIPELINE property, not a population property, and one line decides
   it.** `Assessment_Scoring_Spec.md:132`: the ship requirement is *"Demonstrated on test
   input (synthetic pre/post records), not on a live cohort."* There is no cohort during the
   build at all (`:103`). So no learner's decision to skip the retake can move the ship
   requirement, and the lead's *"would ruin the artifact"* rests on a premise the specs
   deny (§3).

3. **A mandatory post cannot manufacture a pair, because the PRE is optional.** The title
   screen's primary action is Start and the diagnostic is the secondary
   (`apps/web/src/TitleScreen.tsx:98-108`). The binding would be applied at the end of a
   ten-era game to protect a pair whose other half was declinable at minute zero. If the
   number of pairs is the real worry, the lever is at the entry and nobody has pulled it
   (§3.3).

4. **Binding a reward to completion has a name and an effect size in our own research, and
   the escape hatch is in the same source.** `BrainLift_Game_Design.md:184` puts
   completion-contingent expected rewards at **d = -0.36** on intrinsic motivation across
   128 experiments; `:185` records that informational feedback does not carry the cost, and
   `BUILD 5` (`:316`) has already adopted that as a design rule. The research also contains
   the strongest argument for asking every learner to take it, and it is an argument from
   **learning** rather than from measurement (§4).

5. **The brief's framing is half right, and the wrong half is load-bearing.** The two
   problems do not share the root proposed. Separating the retake from the ceremony does
   nothing whatever to the tested-out defect that
   `2026-08-01-test-out-placement-experience.md` §7 recorded, and fixing that defect does
   nothing to the completion question. What they DO share is one level up: **`D-END5` is a
   routing rule whose trigger is narrower than its own reasoning**, and it currently has one
   input where the reasoning supports four (§5).

6. **There is a fourth ceremony state that no ruling covers, and the ruling does not settle
   it either.** `D-END5` enumerates three routes to "no comparable pair" (§5.1 of that
   record) and every one of them assumes a post administration exists. A learner who
   declines the retake has none, `D-END5`'s fallback is populated by the retake's own
   resolved state, and the record explicitly forbids the only other filler. **So under the
   rulings as written, a decliner gets no ending at all** (§2.3). Under the ruling this is
   no longer a silent failure to deliver something promised, because declining the check is
   now declining your own ending, which is coherent. **It is a design question instead, and
   §9 answers it.**

7. **The ceremony is unbuilt IN THE TREE and fully built on an open PR, and the difference
   matters to every claim above.**
   #273 carries
   `engines/diagnostic/src/completion-report.ts`, an eight-file `apps/web/src/completion/`
   surface, and the mount. Read from the API rather than inferred from pushes it is
   `state: OPEN`, `mergedAt: null`, so **its contents are not the tree's contents.** It
   already implements four of this record's conclusions independently, including one it
   arrived at before this record did, and it does not implement two others (§6).

---

## 2. What is actually ruled today, quoted

### 2.1 The retake WAS unruled. It is now ruled bound, by the lead, out of Evan's lane

**The ruling, 2026-08-01, verbatim:**

> *"ill decide myself - the final ceremony should be the final diagnostic."*

**So the ceremony and the retake are one thing.** Not "the ceremony is gated on the retake",
which would be two surfaces with a lock between them, but one surface whose last act is the
check and whose consequence is the reading. `D-END2` already described exactly this shape
(*"The retake is the thing the learner does; the ceremony is what happens when the results
come back"*, `:753`); what was missing was the ruling that there is **no other ending**, and
that is what has been supplied.

**Two procedural facts, recorded because a later reader will otherwise misread the row.**

1. **The lane moved.** `O-END3` assigned this to **Evan**, *"(it is a game-flow ruling)"*.
   The lead took it himself on the grounds that it reaches the metric the product is sold
   on, which makes it a decision about the artifact rather than about the flow. That is a
   defensible boundary and it is worth having in writing, because the same argument will
   arrive again the next time a flow decision touches the measurement.
2. **The note Evan would have decided from contained a false statement**, which is the
   second reason it should not have stood. It is corrected in place below.

**What was open, and what it got wrong.** `2026-07-31-game-completion-ceremony-design.md:773`,
quoted in full because the second half of it is where the trouble is:

> **O-END3** | **Whether the retake is offered or required at era ten.** D-END2 makes it
> once-only and D-END9 makes it resumable, but nothing here rules on refusing it. A learner
> who declines gets D-END5's fallback, which is a complete ending — so the cost of making it
> optional is low and the cost of making it mandatory is a 57-item wall between the learner
> and the end of the game | **Evan** (it is a game-flow ruling) | With the ceremony's
> implementation

**The correction, made IN PLACE rather than by deletion.** That row now carries a `CLOSED`
marker, its body struck with `~~`, and a dated note beneath the table setting out the ruling,
the lane transfer, and why the clause is false. The convention is the one
`2026-07-31-game-completion-ceremony-design.md` §9 already used on itself when D-CRISIS-33
falsified its era-ten sentence: **strike, do not delete, so the reasoning that produced the
error stays readable.** The struck clause is:

> A learner who declines gets D-END5's fallback, which is a complete ending

**It is false, and §2.3 is the proof.** All three of `D-END5`'s enumerated routes assume a
post administration happened; the fallback is populated from *"The retake's own resolved
state"* and nothing else; and the only available substitute is explicitly forbidden. It was
an assumption written inside an open item rather than a ruling, and it reads like a settled
fact, which is precisely why it would have been inherited by whoever picked the item up.

**What the ruling does NOT settle, and the record should not pretend otherwise.** It settles
the mechanism. It does not settle what a learner who declines or abandons the retake sees,
which is the question the struck clause had appeared to answer and which §9 now answers on
its merits.

### 2.2 `D-END5` is the precedent, and it is already the answer's shape

`:756`, the clause that matters:

> **D-END5** | **A learner without a comparable pair gets a DIFFERENT ceremony, never a
> degraded one.** The fallback is a **standing-city ceremony** making no pre/post claim: the
> skills the retake confirmed **cold**, mapped to the buildings, and the city as the record
> of the run.

And its reasoning, at §5.2 of that record (`:329-333`):

> **Why this rather than a partial number.** A cold confirmation is a real claim, it is
> positive-shaped, and it is *true of the same evidence* the growth ceremony uses — so the
> two versions are not a good one and a consolation prize, they are the same ceremony with
> and without a second data point.

**That is the pattern for "this learner's achievement does not fit the pre/post frame", it
is correct, and the tested-out learner is another instance of it.** §5 and §7 below argue
that the pattern is right and its **trigger** is what is too narrow.

### 2.3 The fourth state: `D-END5`'s fallback needs a post, and a decliner has none

This is the hole, and it falsifies the second half of `O-END3`'s own sentence.

`D-END5`'s §5.1 enumerates the population it serves: *"Three routes to 'no comparable
pair'"*, which are **no `pre` at all**, **`pre_invalid`**, and **`not_comparable`**
(`:293-303`). Every one of the three has a **post**. And §5.2 populates the fallback from
that post and nothing else: *"The retake's own resolved state is fully sufficient for this:
`finalize()` returns `resolved` and `coverage` for a single administration, and neither
depends on a pair"* (`:325-327`).

Then it closes the only other door (`:335-339`):

> **One thing the fallback must not do: silently substitute stored mastery for the retake.**
> The learner completed every era, so every node is at mastery >= 2 by construction and a
> mastery-based readout would say "you have mastered 62 skills" for every learner
> identically. That is a certificate of attendance, and it is exactly the claim the retake
> exists to make non-trivial.

**So a learner who declines the retake has no comparable pair, no post administration to
read, and a forbidden substitute.** `O-END3`'s *"A learner who declines gets D-END5's
fallback, which is a complete ending"* is not true of `D-END5` as written. It is a
reasonable thing to have believed while writing an open item, and it is exactly the kind of
claim that turns out to be about a state nobody enumerated.

**The built implementation reaches the same conclusion from the other end**, which is the
strongest available confirmation that this is a real gap and not a reading of mine.
`buildCompletionReport` on #273
takes `retake: CompletionRetakeEvidence` as a **required** input and `measurement` as the
nullable one (`engines/diagnostic/src/completion-report.ts:194-197` on that branch). A
missing baseline is a first-class case there and returns `standing_reason: "no_baseline"`.
**A missing retake cannot be expressed at all: the function cannot be called.**

**Grounded in the code, because it also determines what the surface would receive.**
`computeStudentReadiness` returns `null` when either administration is missing
(`services/diagnostic-runtime/src/measurement-read.ts:137-141`), so **the measurement read
cannot distinguish "declined the retake" from "never took the entry diagnostic"**. Both are
`null`. The signal that separates them exists only in the runner's own state
(`hasPost`, `apps/web/src/diagnostic/DiagnosticRunner.tsx:286`). Any ceremony that wants to
say something different to the two of them needs a signal the measurement API does not
carry.

### 2.4 `D-END4` and `D-END10`, since both bear on the options

- **`D-END4`** (`:755`): *"The widening MUST bump `blueprint_version`. The coverage
  denominator is a read-time argument and not a property of the record, so widening the
  reader silently re-denominates every existing baseline"*. Re-measured at
  this tip and unchanged: a perfect entry diagnostic scores **1.000** over the six D1 nodes
  and **0.034** over the 62 in-product nodes, so widening the reader without bumping the
  field would manufacture up to **+96.6 points** with `status: "computed"` (§6 table).
  Nothing in this record touches the denominator, and every option below is neutral to it.
- **`D-END10`** (`:761`): *"A truncated retake may never be reported as a loss."* A retake
  with `ceiling_reached === true` falls back to `D-END5`'s standing ceremony. **Note what
  that already is: `D-END5`'s fallback firing on a signal that is not comparability.** The
  routing generalisation in §7 is therefore not a new idea, it is the second instance of one
  the record already has.

### 2.5 Priors as briefed, checked at `56497b6b`

| Prior | Verdict | Evidence |
| --- | --- | --- |
| The retake is bound to the ceremony "as today" | **FALSE WHEN CHECKED, and it is now TRUE BY RULING.** It was unruled rather than ruled either way; the lead closed it bound on 2026-08-01 | `O-END3`, `2026-07-31-game-completion-ceremony-design.md:773`, and the note beneath that table |
| `D-END5` rules a different ceremony rather than a degraded one, and may already be the answer's shape | **TRUE, and adopted** | `:756`, reasoning at `:315-339`. §7 amends its trigger and not its content |
| `docs/README.md` §10 is explicit that the ship requirement is not "a valid pre/post gain" | **TRUE** | `docs/README.md:118-123` |
| A tested-out learner's headline gain is capped at +72.9 points, depth-weighted coverage 0.271 for eras one to four | **TRUE, re-measured rather than inherited** | §6 table, driven through `computeCoverage` over `ERA_SEQUENCE` at this tip |
| A tested-out node cannot flip, so `D-END7`'s list structurally omits the 21 skills they are best at | **TRUE**, and the complement is measurable: **at most 41 of 62 nodes can appear on that learner's flip list** | §6 table, `flippable nodes` column |
| `INV-COS-1` says nothing gates learning | **PARTLY. The paraphrase is the tree's common usage; the invariant's text is narrower** | `docs/Contracts.md:276`: *"no economy field is an input to any progression decision"*. It is an **economy** invariant. **No option in this record engages it at all**, since none reads a balance. §8.2 states the constraint that IS engaged, rather than borrowing this one |
| `completion-report.ts` explains why `D-END6`'s prohibition is load-bearing | **TRUE OF THE FILE, FALSE OF THE TREE, and the distinction is the whole point.** The file exists **only on #273's head**, which is `state: OPEN` with `mergedAt: null` read from the API. It is absent from `integration`: `git ls-tree -r --name-only origin/integration` matches nothing, and a repository-wide `rg -il 'completionReport|completion_report|completion-report'` over the checkout returns nothing. **A PR's contents are not the tree's contents**, so anybody briefed off that filename will hit the same trap. §6 reads it at the branch and says so explicitly every time it does | `git ls-tree -r --name-only origin/evan/city-population-happiness` lists `engines/diagnostic/src/completion-report.ts`; `gh pr view 273 --json state,mergedAt` returns `"state":"OPEN","mergedAt":null` |

---

## 3. What the artifact actually requires: a pipeline property

This is the question the lead's worry turns on, and the answer is in the documents rather
than in anybody's judgement.

### 3.1 The line that decides it

`docs/Assessment_Scoring_Spec.md` §9, the whole section (`:126-132`):

> The MVP ship requirement is NOT "a valid gain." It is:
> > The pipeline can **reproducibly compute a blueprint-matched pre/post aggregate score
> > difference from versioned, immutable test records**, correctly excluding incomplete
> > administrations, invalidated items, and application faults per §6.
>
> **Demonstrated on test input (synthetic pre/post records), not on a live cohort.**
> "Valid" (the psychometric argument) is explicitly deferred to the inheritor.

`docs/README.md` §10 says the same thing from the other side (`:119`): *"**Test input** can
only establish that responses are recorded, forms are scored, records are joined correctly,
and a difference is computed reproducibly."*

**And the reason it is a pipeline property is not a technicality, it is the team's scope.**
`Assessment_Scoring_Spec.md:103`: *"**There is no student cohort during the build**; the
team builds and hands off (consistent with PRD §11). The actual control-vs-treatment study
is the inheritor's, run after we leave."* `docs/README.md:108` repeats it: *"there is no
efficacy *cohort* during the build."*

**So: a pipeline property, discharged on synthetic records.** A learner who declines the
retake cannot move a requirement that is met with no learners in it.

### 3.2 The population question is real, but it arrives post-handoff and is already ruled

The honest version of the lead's worry is not about the ship requirement. It is about the
eventual study's *n*, and about whether the completers are a biased subset. That is a real
concern, it is anticipated, and the ruling on it is **disclose**, not **coerce**:

- `Assessment_Scoring_Spec.md:93`: *"**Attrition disclosure:** the reported gain is over
  students with valid pre AND post. If many students have a pre but no post, that attrition
  must be reported, because the completers can be a biased (more-engaged) subset."*
- `:71-72`: an administration below the completion threshold is **excluded**, *"not scored as
  if blanks were wrong, which would fabricate a low pre-score and inflate gain"*, and *"A
  student without BOTH a valid pre and a valid post contributes to neither the paired-gain
  statistic nor is silently half-counted."*

**Read those together and the missing post is a HANDLED state, not a corrupting one.** It
produces no number rather than a wrong number. The artifact degrades in *n*; it does not
degrade in correctness. That is the difference between a mechanism with a hole in it and a
mechanism doing what it was designed to do.

**And binding does not fix the bias it appears to fix; it maximises it.** The warning at
`:93` is that completers can be a more-engaged subset. Under the bound design every paired
learner is one who **finished ten eras**, which is the most selected subset this product can
produce. Making the retake mandatory *within that population* does nothing about the
selection, because the selection already happened upstream of the gate.

### 3.3 A mandatory post cannot manufacture a pair, because the pre is optional

A pair needs both halves. The entry diagnostic is declinable, at the first screen, with the
skip as the **primary** button:

```
apps/web/src/TitleScreen.tsx:98-108
  <button ... className="title-screen__cta title-screen__cta--primary" ref={startRef}
          onClick={onStart}>Start</button>
  <button type="button" className="title-screen__cta" onClick={onTakeDiagnostic}>
    Take Diagnostic</button>
```

`D-END5`'s §5.1 already names this as *"the common case"* (`:293-298`). Forcing the post on
a learner who pressed Start yields an unpaired post, which contributes nothing
(`Assessment_Scoring_Spec.md:72`).

**So the bound design applies a hard requirement at the end of a ten-era game in order to
protect a pair whose other half was optional at minute zero.** If the number of pairs is
genuinely the worry, the entry is where the leverage is, it is one screen, and nobody has
touched it. That is recorded as `O-FIN3` rather than recommended here, because making the
entry diagnostic harder to skip is a real product decision with its own anxiety cost and it
is not this record's to take.

**That paragraph in the earlier record is also where its own citation drifted**, which is
worth a sentence because it is the failure mode `.cursor/rules/qa-verification.mdc`
describes. Its `:295` points at `TitleScreen.tsx:102-107`; at this tip the file is
`apps/web/src/TitleScreen.tsx` and the two buttons are at `:98-108`. The claim is intact and
the coordinates are not, which is why every citation in this record was checked against an
expected token at `56497b6b` rather than inherited (§13).

### 3.4 One more thing the artifact does not require

`Assessment_Scoring_Spec.md:104`: *"a single-group pre/post drifts up ~0.25 to 0.5 SD from
retest effects + regression to the mean regardless of learning. So a bare in-house gain is
NOT an efficacy claim on its own; it becomes one only when the eventual study compares
treatment against a control that absorbs those artifacts."* Coercing additional pairs into
a statistic that is explicitly not an efficacy claim buys proportionally little, and it buys
it in the currency the tone bans are most expensive in.

---

## 4. What the research says

**Directly about optional post-tests: nothing.** `docs/BrainLift_Game_Design.md` has no
source on post-test completion rates, and it should not be made to have one. **Adjacently
it says three things, and they do not all point the same way**, which is the useful part.

### 4.1 Binding a reward to completion has a name, an effect size, and an escape hatch

`BrainLift_Game_Design.md:183-187`, Deci, Koestner and Ryan 1999, 128 experiments:

> - Across 128 experiments, expected tangible rewards undermined intrinsic motivation
>   (d = -0.40 engagement-contingent, **-0.36 completion-contingent**, -0.28
>   performance-contingent).
> - Unexpected rewards and verbal or informational feedback did not undermine, and could
>   increase, intrinsic motivation.
>
> *Summary and Analysis:* ... The escape hatch is that informational feedback does not carry
> this cost, so **a reward is safe to the degree it reads as competence information rather
> than as payment.**

**A ceremony the learner receives only by completing the retake is a completion-contingent
expected reward.** That is the named category, and the number beside it is our own
document's. So the research does have a name for what the lead is proposing, and it names it
as a cost.

It also names the way out, and the team has already adopted it as **BUILD 5** (`:316`):
*"**Informational reward framing.** Every completion reads as 'here is what you can now
do,' never 'you earned 50 coins.'"* The constraint that falls out is not "do not bind" but
**"the ending must never read as payment for the test"**, which is a framing requirement and
is satisfiable.

### 4.2 The research's strongest argument for asking everyone is about LEARNING, not measurement

`:271-275`, Karpicke and Blunt 2011:

> - Learners predicted retrieval practice would be the least effective method, so the
>   technique that worked best was the one students felt least confident using.
>
> *Summary and Analysis:* ... The gap between what worked and what students expected to work
> means **a design cannot rely on learner preference to pick the effective activity.** A
> learning loop should force recall rather than offer review, even though recall feels
> harder and less rewarding in the moment.

And `:301`, on spacing and interleaving: *"a design decision the tool should make on the
learner's behalf."*

**That is the closest thing in the document to "do not leave the post-test to the learner",
and note what it is an argument about.** It is about the learner's benefit, not the team's
artifact. Which matters, because of the next one.

### 4.3 SPOV 1 makes that distinction decisive

`:32`: *"**Engagement is not our success metric, mastery is** ... We treat every engagement
mechanic as guilty until it is shown to serve the mastery loop."*

A retake justified as *"we need the number"* is a **measurement** mechanic asking the
learner to pay for the team's deliverable. Under SPOV 1 it starts guilty, and §3 has just
removed its defence: the deliverable does not need it.

A retake justified as **retrieval practice** is a mastery mechanic, and it clears SPOV 1's
bar on evidence in the same document. `:279-283`, Roediger and Karpicke 2006:

> - On a delayed test, students who had been tested on material retained substantially more
>   than students who had spent the same time restudying it, and **the advantage grew as the
>   retention interval lengthened.**
>
> *Summary and Analysis:* The testing effect is durable and grows with delay, which is
> exactly the timescale a readiness tool cares about, and restudying only looks better in
> the short window right after practice.

**A 57-item, un-hinted, no-retry sweep across everything the learner has built, taken at the
longest delay the product ever produces, is the single largest retrieval-and-spacing event
in the game.** It is `SPOV 4` (`:52`, *"the 'reward' for mastering a building is being made
to use that skill again later"*) executed at the scale of the whole playthrough, and the
instrument's own administration rules are what make it a clean retrieval event:
`Assessment_Scoring_Spec.md:47`, *"**Un-hinted, single-attempt, no reveal.**"*

**So the research inverts the justification, and this is the single most useful thing it
has to say about the lead's question.** The reason to put the retake in front of every
learner is not that the artifact needs it. It is that the retake is the best retrieval event
in the product, and the artifact is a **by-product**. On that footing the ask survives SPOV
1, survives Deci (it is information about the learner, not payment), and survives the tone
bans, all at once.

### 4.4 Zeigarnik, in the form the team already chose

`:65` lists Bluma Zeigarnik among the experts with one line: *"unfinished-task tension: the
retention mechanism we adopt in its **approach** form and reject in its **loss** form."*
`:131` says the same of the mechanism itself.

**A ceremony withheld until the test is finished is the loss form. A ceremony the retake
walks toward is the approach form. Same mechanic, opposite frame**, and the team has already
ruled which one it takes. This is the distinction `D-FIN3` is built on.

### 4.5 The tone bans, checked against the mandatory option specifically

`docs/Game_Visual_Design_Brief.md:59-60`: *"**Calm and non-punishing.** Nothing flashes,
nags, shames, or induces urgency. Failure is never a loss"*, and `:68-73` bans
*"countdown/urgency timers framed as pass/fail"* along with *"nagging badge/notification
pressure"*.

The literal ban is on **timers**, and a mandatory retake has none, so the letter is not
tripped. What is approached is `:59-60`, and `CAREFUL 11` in the research says the same thing
in the vocabulary of gating (`BrainLift_Game_Design.md:324`): *"'locked' must read as 'not
yet,' not 'you failed.'"* A last screen the learner cannot reach without finishing a 57-item
un-hinted test is the hardest place in the product to keep that promise, and the audience at
that screen is the anxious adult the whole brief is written for.

---

## 5. The framing offered in the brief, tested

The brief proposes that the two problems share a root: *the ceremony is being asked to do
two jobs, celebration AND measurement instrument; binding them buys completion, and the
price is that the celebration inherits whatever the measurement cannot express.*

**Half of that is right and the other half does not survive a direct test.**

**Right, and it is worth keeping:** the ceremony does carry both jobs, and the test-out
record's §7 IS the celebration inheriting the measurement's expressive limits. A flip list
cannot name a node that was already passed, so the learner's best 21 skills are unnameable
by construction.

**Wrong, and the test is one line:** take the option where the retake is separated and
optional. The tested-out learner still takes it, the measurement is still computed, the
ceremony still fires, and `D-END7`'s flip list **still** cannot name those 21 skills. The
defect is untouched. Run it the other way: fix the flip list, and every question about
completion is exactly where it was. **The two problems are independent. Neither option-set
is a fix for the other, and treating them as one root would produce a change that solves
neither.**

**What they DO share is one level up, and it is more useful than the proposed root.** Both
are the ceremony making a claim about a learner from a frame the learner does not fit:

- The tested-out learner does not fit *"what you gained"*, because they did not gain it
  here, and that is true rather than a measurement bug.
- The learner with no post does not fit *"here is your pre/post"*, because there is no post.
- The truncated learner does not fit it either, and `D-END10` already routes that one out.
- The learner with an incomparable pair does not fit it, and `D-END5` routes that one out.

**So the shared thing is that `D-END5` is a routing rule, its reasoning covers all four, and
its trigger covers two.** That is the finding, it is small, it is buildable, and it does not
require the two problems to be the same problem. `O-TO4` (`2026-08-01-test-out-placement-experience.md:806`)
reached the same doorway from the test-out side and asked for headroom to be added as a
second trigger; §7 argues that adding triggers one at a time is how the list stays behind
the reasoning, and states the predicate instead.

---

## 6. What exists at this tip

### 6.1 The measurements

Driven through `computeCoverage` and the real walk engine (`startWalk` / `recordScoredOutcome`
under `DEFAULT_WALK_POLICY`) at `376c324b`, with the harness deleted afterwards. Output quoted
literally.

```
MVP SCOPE COUNT: 6
IN-PRODUCT SCOPE COUNT: 62
TOTAL DEPTH WEIGHT: 291

CUMULATIVE COVERAGE THROUGH EACH ERA (62-node scope):
  through era prehistoric        6/62 nodes   depth-weighted 0.034   (10/291)   headline cap +96.6 points   flippable nodes 56
  through era neolithic         11/62 nodes   depth-weighted 0.113   (33/291)   headline cap +88.7 points   flippable nodes 51
  through era bronze_age        16/62 nodes   depth-weighted 0.199   (58/291)   headline cap +80.1 points   flippable nodes 46
  through era classical         21/62 nodes   depth-weighted 0.271   (79/291)   headline cap +72.9 points   flippable nodes 41
  through era medieval          26/62 nodes   depth-weighted 0.392   (114/291)   headline cap +60.8 points   flippable nodes 36
  through era renaissance       32/62 nodes   depth-weighted 0.498   (145/291)   headline cap +50.2 points   flippable nodes 30
  through era industrial        38/62 nodes   depth-weighted 0.605   (176/291)   headline cap +39.5 points   flippable nodes 24
  through era atomic_age        47/62 nodes   depth-weighted 0.766   (223/291)   headline cap +23.4 points   flippable nodes 15
  through era information_age   53/62 nodes   depth-weighted 0.876   (255/291)   headline cap +12.4 points   flippable nodes 9
  through era cyberpunk         62/62 nodes   depth-weighted 1.000   (291/291)   headline cap +0.0 points   flippable nodes 0

ERAS 1-4 NODE COUNT: 21

INSTRUMENT LENGTH, driven through the real walk engine:
  D1 six-node scope, answers everything correctly      items  6   probed  3   ceiling_reached false   coverage 0.034
  full 62 scope, answers everything correctly          items 57   probed 34   ceiling_reached false   coverage 1.000
  full 62 scope, answers everything incorrectly        items 17   probed  9   ceiling_reached false   coverage 0.000
  full 62 scope, correct ONLY on the 21 eras 1-4 nodes items 38   probed 29   ceiling_reached false   coverage 0.271
```

**Three things to read off it.**

1. **The inherited figures reproduce exactly.** 0.271 and +72.9 for the eras one to four
   learner, 0.034 and +96.6 for the D1 denominator, 57 items over 34 probed nodes for an
   acing learner at full scope, 6 items at the live D1 scope. Nothing quoted from an earlier
   record is being taken on trust.
2. **The `flippable nodes` column is new and it is the honest statement of the test-out
   record's §7 defect.**
   For the eras one to four learner the flip list can name **at most 41 of 62** skills, and
   `D-END7`'s robustness filter can only shrink that further. For a learner who tested out
   through era eight it is **at most 15**, and through era nine, **9**. The strongest
   learners have both the smallest number and the shortest list.
3. **The last row is new and it prices the entry side.** A learner who genuinely knows eras
   one to four and nothing beyond serves **38 items** at the entry diagnostic, not 57. So
   the 57-item figure is the ceremony's own cost for a learner who has finished the game,
   which is precisely the population `D-END2` sends into the retake.

**And era ten still cannot draw its own progression**, which is what makes everything in
this record a decision rather than a change. Re-measured at `376c324b` over the authored
sequence:

```
ERA PRACTICE POOLS (interleavedPoolItems(era, "all")):
  prehistoric        6 nodes,  6 skills with items, 234 items
  ...
  industrial         6 nodes,  0 skills with items,   0 items
  atomic_age         9 nodes,  4 skills with items, 140 items
  information_age    6 nodes,  6 skills with items, 210 items
  cyberpunk          9 nodes,  0 skills with items,   0 items
```

`cyberpunk` is era ten. **Zero items across all nine `TRG` nodes**, so its four-beat
progression cannot draw a single one of its `9 x 2 = 18` checks, which reproduces `O-END5`
at a third SHA. Nothing at era ten ships today whatever this record decides.

### 6.2 The ceremony is unbuilt in the tree and fully built on an open PR

**This is the most important thing to know before reading §7 to §10, and it was not known
when the first revision of this record was written.**
#273 is Evan's, and beside its
city work it carries the entire completion ceremony:

| On `origin/evan/city-population-happiness` @ `ce48c73a` | Not on `integration` |
| --- | --- |
| `engines/diagnostic/src/completion-report.ts` (+ its test) | absent |
| `apps/web/src/completion/` (8 files: the surface, its CSS, and five test files) | absent |
| the mount and its open condition in `apps/web/src/city/CitySurface.tsx` | absent |

**Read from the API rather than inferred from pushes: `state: OPEN`, `mergedAt: null`.** Its
merge-base with `integration` is `56497b6b`, this record's original base, and it makes no
change to `2026-07-31-game-completion-ceremony-design.md`. Every citation in this subsection
is to that branch and says so; **none of it is in the tree.**

**Four of this record's conclusions are already implemented there, one of them arrived at
before this record existed.**

| Conclusion | Status on #273 |
| --- | --- |
| `D-END6` upheld, and it is load-bearing rather than fussy | **Implemented, and this is the text the brief was pointing at.** `completion-report.ts:42-49`: *"It never reads `placement_by_node`, and it is not given it ... the guard against a retake wrecking a city is at the WRITE boundary, not in the shape of the value."* The prohibition is enforced by the input type, not by a promise |
| `D-END5`'s routing is wider than one trigger (`D-FIN4`) | **Implemented for four of the five reasons**, and one step past `D-END10`'s letter: `standingReasonFor` (`:163-183`) returns `no_baseline`, `pre_invalid`, `post_invalid`, `not_comparable` or `truncated`, **and checks truncation on the BASELINE too**, on the argument that a truncated pre inflates the delta the same way a truncated post fabricates a regression |
| The delta is dropped and the endpoints are kept (`D-FIN6`) | **Already done, independently and before this record said it.** The report carries `{pre, post, gain}` (`:132`), and the surface renders only two of them: *"Across the whole check, the map it covers went from {pre} to {post}."* (`CompletionCeremony.tsx:721-726`). `gain` is computed and never shown |
| The headroom case (`D-FIN4`'s third input) | **NOT implemented, and its degenerate corner is.** `named_node_ids` is `robustlyHeld.filter((id) => !heldAtEntry.has(id))` (`:223`), which is exactly the flip list that cannot name a tested-out learner's 21 best skills. The **empty** case has copy (`CompletionCeremony.tsx:711-715`) and the report's own docblock flags it: *"May be empty, and an empty list is a real answer rather than a failure ... The surface owes copy for it"* (`:104-106`) |

**So `D-FIN6` should be read as a ruling that RATIFIES an existing choice rather than
requests a change**, and `D-FIN4` as one that widens a predicate which is already wider than
the record it implements. That is a better position than the first revision of this record
described, and it is only visible by reading the branch.

**One thing #273 has that no ruling asked for, and §9 leans on it.** Its ceremony has three
beats, `"invitation" | "retake" | "reading"` (`CompletionCeremony.tsx:90`), so the invitation
is a designed surface rather than an implied one. §9.3 checks the copy constraints against
its actual words.

---

## 7. What the ceremony should say to a learner who tested out of half the game

**This defect exists under every option in §8 and is worth settling separately.** It is also
the half of the brief where `D-END5` is closest to already being the answer.

> **UNCHANGED BY THE RULING, and §5 is why.** Separating the retake from the ceremony would
> have done nothing for this learner, so binding it does nothing to them either. The whole
> section stands as written. **One thing did move, and in its favour**: §6.2 finds that
> `D-FIN6` is already what #273's surface does, so this is now a ruling that ratifies working
> code rather than one that asks for a change. What is still owed is `D-FIN4`'s third input,
> and `O-FIN2` now lands on two real symbols in one real function.

### 7.1 The honest frame is "what stands", not "what you gained"

A learner who arrived knowing 21 skills did not gain them here. Saying they did is false.
Saying nothing about them is what the design does today, and it is worse than false: it is a
celebration of a city that never mentions a third of its buildings, and the third it omits
is the part the learner is best at.

**The frame that is true of them is the one `D-END5` already wrote for somebody else.** Two
claims, neither of which is a gain:

1. **"These held."** The 21 arrived confirmed and left confirmed, on an instrument that is
   *"Un-hinted, single-attempt, no reveal"* (`Assessment_Scoring_Spec.md:47`), taken at the
   longest delay the product produces. That is not a consolation statement, it is the only
   evidence anywhere in the system that a skill the learner walked in with is still there
   after ten eras of building on top of it. It is `D-END5`'s own sentence, already drafted:
   *"you sat down today with no lessons, no hints and no retries, and these held"*
   (`2026-07-31-game-completion-ceremony-design.md:323-324`).
2. **"These are new."** The flips, drawn from at most 41 nodes for this learner, named under
   `D-END7`'s robustness filter, mapped to their buildings exactly as ruled.

**The two are not a headline and a fallback. They are two true sentences about the same
sitting**, and the tested-out learner's ceremony leads with the first because it is the
larger true thing about them, where a cold learner's leads with the second for the same
reason. That is the same ceremony with its emphasis following the evidence, which is exactly
what `D-END5` argued when it refused to make its fallback a lesser version.

### 7.2 The delta is the part that punishes, and the endpoints are not

`D-END7` rules the aggregate coverage delta *"a supporting line, shown and not suppressed"*
(`:758`), on the grounds that *"A ceremony that reports only the good half is the kind of
thing that gets found later and read as a lie"* (`:358-359`). That reasoning is right and
this does not overturn it.

**But the delta specifically is smaller for this learner BECAUSE they were better**, and it
is the only quantity on the screen with that property. The two endpoints do not have it. For
the eras one to four learner they read, in the shipped surface's own units, *you started at
27% of the map and finished at 100%*, which is a statement about them, is true, and is not
diminished by anybody else's number. The surface already renders both, in one string
(`apps/web/src/diagnostic/DiagnosticRunner.tsx:766-772`):

```
{gain >= 0 ? "+" : ""}{formatPercent(gain)} of the skill map
  ({formatPercent(record.pre.coverage)} → {formatPercent(record.post.coverage)})
```

So the repair is to **keep the parenthesis and drop the number in front of it** for a
headroom-limited learner, rather than to shrink the headline or suppress the aggregate. The
spec's instinct is the same one, at `Assessment_Scoring_Spec.md:64`: *"the pre and post
denominators must be reported alongside the gain so a reader can see the base"*. That line is
about the item denominator rather than the coverage endpoints, so it is cited as the
existing instinct and not as authority over this.

### 7.3 The routing, which is the part `D-END5` does not cover, and it upholds `D-END6`

`D-END5` fires on `not_comparable`. The tested-out learner is perfectly comparable. So the
content is right and the trigger does not reach them, which is what `O-TO4` filed.

**The repair is to stop adding triggers and state the predicate.** The growth ceremony runs
when the growth frame is both **true** and **non-empty** for this learner; every other state
routes to the standing ceremony. Four known inputs today, and the list is a consequence of
the predicate rather than the definition of it:

| Input | Signal | Already ruled? |
| --- | --- | --- |
| The pair is not comparable | `status !== "computed"` | **Yes**, `D-END5` |
| The retake was truncated | `ceiling_reached === true` | **Yes**, `D-END10` |
| The growth frame is near-empty because the learner arrived competent | the named flip list against the already-held set | **No.** `O-TO4` asked for it as a headroom threshold |
| There is no post administration at all | no post | **No.** §2.3, and nothing covers it |

**On the third input, a shape rather than a number.** `O-TO4` proposed *"a learner whose
pre-coverage was already above some share"* and deliberately declined to pick the share.
Declining is right and the shape can still be improved on: a coverage threshold is a proxy
for the thing that actually matters, which is **whether the flip list is worth leading
with**. That is directly computable from the ceremony's own output, needs no new data, and
degrades gracefully: compare the count of skills the flip list NAMES (after `D-END7`'s
robustness filter) against the count the learner already held at pre. When the second
dominates, the standing ceremony is the honest lead. The comparison operator and any margin
are `O-FIN2` and are the ceremony owner's.

**And the whole predicate is checked against `D-END6`, because "route on headroom" sounds
like it wants the forbidden field and does not.** `D-END6` (`:757`) rules that the ceremony
*"may not read `placement_by_node` off a post"*, and the reason is severe rather than
fussy: `finalize()` returns that field for **every** purpose including `post`
(`engines/diagnostic/src/walk-engine.ts:253-259, 282`), while the write guard sits at the
write boundary (`PLACEMENT_WRITING_PURPOSES` is `{pre, placement}`, `:141-144`, applied at
`:261-269`), and the function the pretest hands it to is a **destructive full reset** of the
city (`apps/web/src/city/citySession.ts:967` onward). Verified at this tip, all four
citations.

**The predicate reads none of it.** Every input above is on the measurement record or the
post's own resolution:

- pre coverage and post coverage are fields of `CoverageAdministrationScore`
  (`engines/diagnostic/src/coverage-measurement.ts:216-224`), already rendered by the
  shipped surface at `DiagnosticRunner.tsx:770`;
- `status` comes from the three-field gate (`coverage-measurement.ts:296-320`), re-verified
  unchanged at this tip;
- `ceiling_reached` and `resolved` are returned on the completed diagnostic
  (`walk-engine.ts:117, 284`).

So the routing rule needs no placement read, and `D-END6` is upheld by the shape of the
design rather than by a promise to remember it.

---

## 8. The options

> **THE LEAD HAS CHOSEN OPTION 1, 2026-08-01.** The section is kept in full, and kept as it
> was argued rather than rewritten to agree, because the point of costing five options is
> that a later reader can see what the chosen one was chosen over. **Option 4 was this
> record's recommendation and was overruled.** §9.1 records that, and §9.2 and §9.3 carry the
> two things Option 1 owes that Option 4 would not have.

**The axis is: what does the retake gate, and what does a learner who does not take it
get?** All five assume the diagnostic has been widened, since `D-END3` already rules that a
D1-only retake measures era one whatever the ceremony says, and `O-END1` is unchanged.

### 8.1 Option 1: bound (CHOSEN by the lead, 2026-08-01)

**No retake, no ceremony. The ending is the retake's result and there is no other ending.**

| | |
| --- | --- |
| **Completion** | Highest available. The mechanism is real: the ceremony is the only thing left in the game, so it is the strongest pull the product can apply |
| **The artifact** | **No change to the ship requirement**, which is a pipeline property (§3). Post-handoff it raises *n* among finishers, and does not touch the selection bias, which is already maximal in that population (§3.2) |
| **The tested-out learner** | Unchanged. The defect is untouched by the option, and §7 is the fix, owed under all five |
| **Cost to build** | **Cheapest.** It is the record as a reader already reads it, and needs no fourth state |
| **What it costs elsewhere** | A completion-contingent expected reward, **d = -0.36** (§4.1). A 57-item un-hinted instrument between the learner and the end of the game, which `O-END3` already names as the cost. And **a decliner gets no ending at all**, which is the state `D-END5` exists to forbid and which no ruling covered when this was written (§2.3); `D-FIN9` now does |
| **Tone** | The highest-risk option in the product against `Game_Visual_Design_Brief.md:59-60`, at the moment the audience is most exposed |

**Two of those rows are now bills rather than objections, and §9 pays them.** The
`d = -0.36` exposure is a property of the **framing**, not of the mechanism, and §9.3 says
what discharges it. The decliner's ending is a design question the ruling leaves open, and
§9.2 answers it.

### 8.2 Option 2: separated, with the retake mandatory by another route

**The ceremony runs regardless; the retake is required somewhere else.**

**This option has no route, and that is a structural fact rather than a preference.** After
era ten's progression there is nothing left in the game to gate: `advanceCityEra` returns
`null` at the end of the sequence and *"nothing moves"*
(`apps/web/src/city/useCityEra.ts:77-84`), which is the hole `D-END1` was written to fill.
The seam the ceremony hangs on is still unwired at this tip, and its only reader is a test
(`apps/web/src/city/eraState.ts:133`, read at `eraState.test.ts:114, 118` and nowhere else),
which is another way of saying there is nothing after era ten yet at all. So the only lever
at the end of the game **is** the ending.

Any mandatory retake therefore has to be either:

- **at the ceremony**, which is Option 1 under a different name; or
- **reaching backwards into era ten's trial or advance**, which makes a progression decision
  depend on an assessment result. That is `D-ERA5`'s gate and the era-trial contract's to
  change, it would be changed for a measurement reason that §3 has just removed, and it
  breaks `D-END9`'s defence of the length outright, since *"the diagnostic is the thing you
  DO, and the ceremony is what happens when the results come back"*
  (`2026-07-31-game-completion-ceremony-design.md:573-576`) stops being available the moment
  the retake is moved off the end. Relocated earlier, a 57-item un-hinted test is simply an
  exam before the party.

**On `INV-COS-1` specifically, since the brief raised it:** its text is *"no economy field is
an input to any progression decision"* (`docs/Contracts.md:276`). A retake is not an economy
field, so **no option here engages the invariant literally**, and this record does not borrow
it. The constraint that is genuinely engaged is the one above: gating the ceremony gates
nothing the learner could learn from, and gating a progression decision on an assessment is a
different act with a different owner.

**Verdict: ruled out**, and recorded as `D-FIN7` so it is not re-proposed.

### 8.3 Option 3: separated and optional

**The ceremony runs on whatever evidence exists; the retake is offered beside it.**

| | |
| --- | --- |
| **Completion** | Lowest, and the magnitude is **unknowable** before handoff: there is no cohort (`Assessment_Scoring_Spec.md:103`). Any number anybody quotes here is invented |
| **The artifact** | **No effect on the ship requirement.** Post-handoff, a smaller *n*, disclosed rather than hidden (`:93`) |
| **The tested-out learner** | Unchanged |
| **Cost to build** | Needs the fourth-state ceremony that nothing specifies (§2.3), which is genuinely new design work, since `D-END5` forbids the obvious filler |
| **What it costs elsewhere** | The lead's stated fear, stated honestly. And it wastes the retrieval event, which by §4.2 is the larger loss and the one the research actually objects to |

### 8.4 Option 4: the retake is the last act, and neither direction is conditional (RECOMMENDED, and OVERRULED)

**The retake is not required, and the ceremony is not withheld. What changes is that the
retake is SCHEDULED rather than OFFERED: after era ten's progression, it is simply the next
thing that happens, leaving is ordinary at any point, and the ceremony fires when the learner
stops, whether that is at item 57 or item 0.**

The learner is never asked to choose between taking a test and seeing their ending, because
there is nothing to decline. Declining is just leaving, and leaving is already ruled
ordinary twice over: `D-END9` makes the walk resumable across sittings at zero cost in
comparability (per-administration `WalkProgressStore`, an unfinalized administration reads
`incomplete`), and `D-ET14`'s precedent makes leaving always available with an
end-of-attempt screen.

| | |
| --- | --- |
| **Completion** | Close to Option 1's, because the mechanism that produces Option 1's completion is *the retake being the path to the ending*, and that is preserved exactly. What is removed is the **threat**, which is the part that carries the d = -0.36 and does the tone damage |
| **The artifact** | Identical to Option 1 for every learner who finishes, and strictly better than Option 3 |
| **The tested-out learner** | Unchanged by the option, and fixed by §7, which is owed under all five |
| **Cost to build** | The routing predicate (§7.3), which is owed under every option including Option 1, plus the fourth-state copy. No new art, no new surface: the standing ceremony already exists as a ruling |
| **Why it is the approach form** | §4.4. The ceremony is the thing the learner walks toward, not the thing that will be taken away. The team already ruled which half of Zeigarnik it takes |

### 8.5 Option 5: bound with an escape hatch

**Gated on the retake, but abandonable at any point, and the abandoned state routes to the
standing ceremony.**

Behaviourally this is Option 4 with a different default: you must **start**, you need not
**finish**. It costs the same to build and it buys nothing extra, because a learner who
starts and immediately leaves is in exactly Option 4's position. What it does cost is the
one sentence where the product says *"you must"*, which is the sentence §4.1 and the tone
bans are about. **Costed and not recommended**, and recorded so it is visibly considered
rather than skipped.

### 8.6 The lead's own alternative, and the half of it that is unavailable

*"the final ceremony doesnt necessarily have to be that same diagnostic"* has two readings
and they have different answers.

- **The CEREMONY need not be the diagnostic.** True, and that is Options 3 to 5.
- **The final MEASUREMENT could be a different instrument.** **Not available, and it fails
  early rather than badly.** Only two forms exist and `counterbalancedForm` spends both on
  the pre/post pair (`services/diagnostic-runtime/src/runtime.ts:99-108`, returning
  `"A" | "B"` and inverting for `purpose: "post"`), and the comparability gate requires the
  same `blueprint_version` and `scoring_model_version`
  (`engines/diagnostic/src/coverage-measurement.ts:310-318`). An instrument that is not the
  counterbalanced other form of the entry diagnostic is not blueprint-matched, so the gate
  returns `not_comparable` and **there is no pre/post number at all**. If the ending is
  built on a different assessment, the artifact is not degraded, it is absent.

### 8.7 The five, side by side

| | **1: Bound (CHOSEN)** | 2: Mandatory elsewhere | 3: Separated, optional | 4: Last act, unconditional (overruled) | 5: Bound with a hatch |
| --- | --- | --- | --- | --- | --- |
| Retake completion | **highest** | n/a | lowest | near-highest | near-highest |
| Ship requirement (pipeline) | **unaffected** | unaffected | unaffected | unaffected | unaffected |
| A decliner's ending | **unruled; §9.2** | full | full | full | full |
| Completion-contingent reward (d = -0.36) | **yes, unless the framing discharges it (§9.3)** | yes | no | no | partly |
| Retrieval event preserved | **yes** | yes | only for volunteers | yes | yes |
| Rulings amended | **0, plus the fourth state it creates** | `D-ERA5` or `D-ET`, plus `D-END9` | 0, plus the fourth state | `D-END5`'s trigger | `D-END5`'s trigger |
| New art or surfaces | **none** | none | none | none | none |
| The tested-out learner's ceremony | **untouched** | untouched | untouched | untouched | untouched |

**Note the last row deliberately reads the same across all five.** That is the point of §5:
no choice on this axis fixes it, and §7 is the fix, owed under whichever option is taken.

---

## 9. The ruling: what it settles, what it overrules, and what it inherits

### 9.1 The recommendation, made and overruled

**This record recommended Option 4. The lead chose Option 1.** The recommendation is kept
here in the form it was made, because a later reader deciding whether to revisit this needs
to see what was rejected rather than a record that has quietly agreed with the outcome.

**What was recommended:** Option 4, together with §7's routing predicate and §7.1's frame.
The retake is the last act and nothing is withheld; the ceremony routes on whether the growth
frame is true and non-empty; and the tested-out learner's ceremony leads with what stands.

**Why it was recommended.** It kept the whole of the mechanism that makes Option 1 work (the
retake is the path to the ending) and dropped only the threat, which is the part that costs
d = -0.36, approaches the tone bans, and produces the uncovered fourth state. §4.3 puts the
retake on the mastery side of SPOV 1's test rather than the measurement side, and §3
establishes the artifact never needed the binding.

**What it gave up, and this is where the two options genuinely differ**, stated when it was
still a live proposal:

1. **The guarantee.** Option 1 can promise that every finisher has a pair. Option 4 cannot,
   and deliberately does not try. The defence is §3: the promise buys nothing at ship, and
   post-handoff it buys *n* in a statistic whose selection bias is already maximal and whose
   attrition is disclosed by rule. **If the lead's instinct is that the guarantee is worth
   having anyway, Option 1 is the coherent choice**, and the price is the completion-contingent
   frame plus a fourth state that must be designed regardless.
2. **Simplicity.** "No retake, no ceremony" needs no routing predicate. Option 4 needs one,
   although §7 argues that predicate is owed under Option 1 too, for a different reason.
3. **A number nobody can produce.** The recommendation asks the lead to accept an argument
   where he asked for a completion rate, and there is no completion rate available:
   `Assessment_Scoring_Spec.md:103` puts the cohort after handoff. This record will not
   invent one. What it can say is that the thing the rate would protect is not at risk before
   handoff, and that the mechanism producing the rate is preserved under the recommendation.
4. **It does not make the retake short.** 57 items is 57 items, `D-END9` already ruled that
   both ways of shortening forfeit the measurement, and splitting the sitting is the only
   lever. The recommendation inherits that unchanged.
5. **It does not fix the entry.** The pre is still optional and still the primary skip
   (§3.3). If pairs are genuinely scarce after handoff, that is where it was decided, and
   `O-FIN3` is where it is recorded.

**Item 1 is the one the ruling turns on, and it was written to be decidable on exactly these
grounds.** The lead read the guarantee as worth having. That is a coherent reading of the
same facts: §3 shows the artifact does not *need* the guarantee before handoff, not that the
guarantee is worthless, and a product whose central claim is a pre/post number has a real
interest in the pair existing for everyone who reaches the end. **What this record asks in
return is that the two bills item 1 named are paid rather than inherited silently**, which is
§9.2 and §9.3.

### 9.2 What a learner who declines or abandons sees

**The question is now a design question rather than a defect, and that is a genuine
improvement the ruling makes.** Before it, the system promised an ending and then silently
had nothing to show a decliner. After it, declining the check is declining your own ending,
which is coherent and can be said out loud. But coherent is not the same as answered.

**Argued against the steer rather than adopting it.** The steer offered was that reaching era
ten is an achievement independent of the retake, so a decliner should still get *something*.
**The premise is right and the obvious implementation of it is wrong**, and the reason is
already ruled: the only material available for a reading of a learner's skills without the
retake is stored mastery, which `D-END5` forbids in terms, because *"every node is at mastery
>= 2 by construction"* for a finisher and the readout would be *"a certificate of
attendance"*. So "something" cannot be an assessment claim of any kind. There is no third
source.

**But something non-assessment IS available, and `D-END5` already names it**: *"the city as
the record of the run"* (`:756`). The city is not a claim about skills, it is a record of
what the learner did, it needs no administration to read, and it is already standing behind
the ceremony's window. **That is the honest answer: a decliner's ending is their city, and
the product does not narrate it at them.**

**Which leads to the recommendation, and it is mostly a refusal to build.** Three clauses:

1. **No fourth ceremony.** Building a separate ending for people who did not take the check
   would be a second ending competing with the first, it could only be made of the forbidden
   material or of nothing, and it would turn the invitation into a menu, which is what
   weakens the retrieval event the ending exists to be. `D-END5` refused a degraded parallel
   ceremony in the other direction and the same argument applies here.
2. **Declining is DEFERRAL, and it is not a forfeit.** This is not a new mechanism: it is
   what `D-END9` (leaving mid-instrument is ordinary, the walk is resumable) and `D-ET14`
   (leaving always available, with an end-of-attempt screen) already rule for every other
   long surface in the game. **#273 already implements exactly this**: its invitation offers
   *"Not yet"* beside *"Sit the last check"* (`CompletionCeremony.tsx:566-577` on that
   branch), both `"Not yet"` and the mid-check step-away route to `onExit`
   (`:316`, `:325`), and `markCompletionCeremonyFinished()` is called **only** from the
   reading's close (`:297`, `:330`). So the once-only flag is not written and the ending
   remains available. Its own copy says so: *"the ending will still be here when you come
   back."*
3. **The way back has to be a door, and today it is an 18-item re-run.** This is the one
   place the deferral answer is currently incomplete, and it is measurable. On #273 the
   ending's only real route is finishing era ten's four-beat progression: `advanceCityEra`
   returns `null`, and the mount opens the ceremony only then
   (`CitySurface.tsx:2946-2949` on that branch). That progression is re-enterable from
   `☰ Menu → Advance the age`, which the mount's own comment calls *"deliberately
   ungated"* (`:2924`), so coming back is possible. **But it costs era ten's `9 x 2 = 18` checks
   again** (§6.1), and the invitation's *"when you come back"* does not say so. A promise
   that the ending waits, whose price is eighteen questions, is a promise with an unstated
   toll on it. **The ending needs its own entry point from the city.**

**What this deliberately does not do.** It does not nag. `D-END2`'s once-only-ness plus a
standing entry point is the whole mechanism; a reminder, a badge or a count of what is left
undone would be the streak-loss shape `Game_Visual_Design_Brief.md:68-73` bans by name and
`AVOID 13` indicts. The door is open and silent.

### 9.3 Bound mechanism, informational invitation: what that means for the copy

**The lead ruled the mechanism. He did not rule that the copy should say "take this test to
get your ending", and the difference is exactly the d = -0.36.** §4.1's finding is that a
completion-contingent **expected reward** undermines intrinsic motivation, and that the
escape hatch is framing that reads as competence information rather than as payment
(`BrainLift_Game_Design.md:185, 187`), already adopted as `BUILD 5` (`:316`). **A bound
mechanism with an informational invitation is not a contradiction: the transaction is what
the evidence indicts, not the sequence.**

**And the reason to ask is not the number, which is what keeps the copy honest.** §4.2 and
§4.3 establish that the retake is the largest retrieval-and-spacing event in the product,
taken at the longest delay it ever produces, on an instrument that is
*"Un-hinted, single-attempt, no reveal"* (`Assessment_Scoring_Spec.md:47`). **That is a thing
worth doing for the learner's own sake, and the measurement is a by-product.** Copy written
from that premise comes out informational without anyone having to police it; copy written
from "we need the pair" cannot, whatever words it uses.

**Six constraints, each checkable, and each checked against #273's actual invitation so this
is a review standard rather than a wish list.**

| Constraint | Why | #273's invitation, at `ce48c73a` |
| --- | --- | --- |
| **1. Name what the check IS, never what it unlocks.** The invitation describes the sitting; it does not price the ending | The payment frame is the d = -0.36 one. A description is information | **Satisfied.** *"one last thing, and it is the thing you did on your very first day here: a cold run at the foundations. No lessons, no hints, no second tries. Just what holds today."* (`:539-543`). It never says "to see your ending" |
| **2. The decline reads "not yet", never "no"** | It is true (the ending waits, §9.2) and it is Zeigarnik's **approach** form, which `BrainLift_Game_Design.md:65` says the team takes and `CAREFUL 11` (`:324`) restates as *"'locked' must read as 'not yet,' not 'you failed.'"* | **Satisfied.** The button is literally `Not yet` (`:575-577`) |
| **3. Leaving is stated BEFORE the learner commits, and framed as ordinary** | 57 items is long enough that not saying so is a trap, and `D-END9` and `D-ET14` already rule leaving ordinary | **Satisfied.** *"It is long, and nobody is timing you. Leave whenever you like"* (`:558-560`) |
| **4. No count against a total, no progress bar, no "N left"** | `BUILD 2` rules one unifying currency and *"no parallel point systems"* (`BrainLift_Game_Design.md:313`), and a visible "question 12 of 57" is a countdown in everything but name for the *"math-anxious"* learner `Game_Visual_Design_Brief.md:50-55` describes | **Satisfied.** The counter is *"Question {n} · {skill}"* with **no denominator** (`:613-615`) |
| **5. The reading never says what the learner should have done** | The tone rule is *"Failure is never a loss"* (`:59-60`). "If you had taken this earlier" and "you skipped" are both retrospective blame | **Satisfied.** The unconfirmed list reads *"These did not come out today. They are still yours: you did the work and the buildings are standing"* (`:735-739`), which is `D-END8b` in copy |
| **6. The ending never thanks the learner for completing the check** | Gratitude for completing is the payment frame in its politest form. The ending reports what the sitting found | **Satisfied.** The reading opens on the evidence and closes on *"This is what one cold sitting found, on this check, today. It is not a grade"* (`:750-753`) |

**All six are already met by copy written before the ruling existed, which is worth stating
plainly rather than claiming credit for the constraints.** What they are for is the next
edit: the ruling makes the ending contingent, and the natural pull on any subsequent copy
pass is toward *"finish this and we'll show you what you built"*. These six are the line that
sentence would cross, and constraint **1** is the one it would cross first.

**The one line worth a second look, and it is a judgement rather than a violation.**
*"Before the lights go up there is one last thing"* (`:540-541`) states a sequence, which is
true and is what constraint 1 permits. Under a bound ruling it can also be heard as naming a
price. It is not recommended for change, because the alternatives are worse: removing the
sequence makes the invitation float free of the ending it belongs to, and the sentence's
surrounding paragraph is doing constraint 1's work correctly. It is flagged so that whoever
next edits this beat knows which sentence carries the load.

---

## 10. Decisions

Eleven, `D-FIN1`..`D-FIN11`. **A new namespace deliberately, rather than `D-END13` onward.**
`2026-07-31-game-completion-ceremony-design.md:745` opens its decision section with *"Twelve
(D-END1..D-END12)"*. This record now edits that file, but it edits **only** the `O-END3` row
and the note beneath its open-items table, so minting a `D-END` id would still make that
sentence false and would still require touching a decision table this record has no business
in. The rulings this amends are named in §11 instead, which is the pattern
`2026-08-01-test-out-placement-experience.md` §8 already set. `D-ERA` is machine-counted off
the era-progression spec (`test/eraDecisionCount.test.ts:112`); nothing here adds a `D-ERA`
id or touches that file.

| ID | Ruling | Lane | Recorded at |
| --- | --- | --- | --- |
| **D-FIN1** | **The artifact is a PIPELINE property and no game-flow decision may be justified by "the artifact needs it".** The ship requirement is *"Demonstrated on test input (synthetic pre/post records), not on a live cohort"* (`Assessment_Scoring_Spec.md:132`), and there is no cohort during the build (`:103`, `docs/README.md:108`). The population question is real, arrives post-handoff, and is **already ruled the other way**: attrition is **disclosed** (`:93`), and a learner without both halves *"contributes to neither the paired-gain statistic nor is silently half-counted"* (`:72`). A missing post produces **no number rather than a wrong one** | **RULED**, diagnostic | §3.1, §3.2 |
| **D-FIN2** | **A mandatory post cannot manufacture a pair, because the pre is optional.** `apps/web/src/TitleScreen.tsx:98-108` makes Start the primary action and the diagnostic the secondary, and `D-END5` §5.1 already calls no-baseline the common case. So the exit may not be asked to carry the artifact's *n*; that leverage is at the entry and is `O-FIN3` | **RULED**, diagnostic | §3.3 |
| **D-FIN3** | **RULED BY THE TEAM LEAD, 2026-08-01: the completion ceremony IS the final diagnostic.** *"ill decide myself - the final ceremony should be the final diagnostic."* One surface, whose last act is the check and whose consequence is the reading; there is no ending that is not the retake's reading. `O-END3` is **CLOSED** in the bound direction and was taken out of **Evan's** lane to decide, on the grounds that it reaches the metric the product is sold on. **This record recommended the opposite (Option 4, scheduled but never withheld) and was overruled; the recommendation and its costing are kept at §8.4 and §9.1 rather than dropped** | **RULED**, team lead | §2.1, §8.1, §9.1 |
| **D-FIN4** | **`D-END5`'s fallback is a ROUTING RULE with one predicate, not a list of special cases: the growth ceremony runs only when the growth frame is both TRUE and NON-EMPTY for this learner.** Four known inputs (`status !== "computed"`; `ceiling_reached`, which is `D-END10` already being the second instance; a flip list the already-held set dominates; and no post at all). The list follows from the predicate rather than defining it, which is what stops the trigger drifting behind the reasoning again | **RULED**, diagnostic | §5, §7.3 |
| **D-FIN5** | **RECOMMENDED: the tested-out learner's ceremony leads with what STANDS, not with what was gained.** Three clauses. (a) *"These held"*, the skills confirmed cold on an un-hinted single-attempt instrument at the longest delay the product produces, which is `D-END5`'s own drafted sentence. (b) *"These are new"*, the flips, at most 41 of 62 for the eras one to four learner and fewer after `D-END7`'s robustness filter. (c) **The ceremony never says they gained what they arrived with.** This is emphasis following evidence, not a second-class ending, which is the argument `D-END5` already made | **RECOMMENDED**, Evan with the lead | §7.1 |
| **D-FIN6** | **For a headroom-limited learner the DELTA is dropped and the two ENDPOINTS are kept.** The delta is the only quantity on the screen that is smaller because the learner was better; *started at 27% of the map, finished at 100%* has no such property. The shipped surface already renders both in one string (`DiagnosticRunner.tsx:766-772`), so this keeps the parenthesis and drops the number in front of it. **`D-END7`'s *"shown and not suppressed"* (`:758`) is honoured**: the aggregate is still on screen, as its endpoints | **RULED**, diagnostic | §7.2 |
| **D-FIN7** | **"Mandatory by another route" has no route, and this is structural.** `advanceCityEra` returns `null` at the end of the sequence and nothing moves (`apps/web/src/city/useCityEra.ts:77-84`), so after era ten's progression the only thing left to gate is the ending. Any mandatory retake is therefore either Option 1 renamed, or a progression decision made to depend on an assessment result, which is `D-ERA5` and the trial contract's to change and would break `D-END9`'s defence of the length. **`INV-COS-1` is NOT the reason**: its text is about economy fields (`docs/Contracts.md:276`) and no option here engages it | **RULED** | §8.2 |
| **D-FIN8** | **A DIFFERENT final instrument cannot produce the artifact at all.** Only two forms exist and `counterbalancedForm` spends both on the pre/post pair (`services/diagnostic-runtime/src/runtime.ts:99-108`), and the gate requires a matching `blueprint_version` and `scoring_model_version` (`engines/diagnostic/src/coverage-measurement.ts:310-318`). So the lead's earlier *"doesnt necessarily have to be that same diagnostic"* is **true of the ceremony and false of the measurement**: on a different instrument the number is absent rather than degraded. **The ruling resolves this in the only direction that keeps the artifact**, and the entry is kept because it is why the other direction was not available | **RULED**, diagnostic | §8.6 |
| **D-FIN9** | **Declining is DEFERRAL and there is no second ending.** Three clauses. (a) **No fourth ceremony is built**: the only material for a skills reading without the retake is stored mastery, which `D-END5` forbids as *"a certificate of attendance"*, so a parallel ending could only be made of forbidden material or of nothing, and it would turn the invitation into a menu. (b) **A decliner's ending is their city**, which `D-END5` already names as *"the city as the record of the run"*: not an assessment claim, needing no administration, and already standing behind the window. (c) **Leaving is not a forfeit and the once-only flag is not written until the reading closes.** #273 already implements (c) exactly (`CompletionCeremony.tsx:297, 316, 325, 330` on that branch) | **RULED** | §9.2 |
| **D-FIN10** | **The ending owes a standing entry point from the city, because today the way back is an 18-item re-run.** On #273 the ceremony opens only when era ten's four-beat progression completes (`CitySurface.tsx:2946-2949` on that branch), and that progression is re-enterable but costs era ten's `9 x 2 = 18` checks again. The invitation promises *"the ending will still be here when you come back"* and does not price the return. A promise that waits behind eighteen questions is a promise with an unstated toll. **The entry point must be a door and must not be a nag**: no reminder, no badge, no count of what is undone (`Game_Visual_Design_Brief.md:68-73`, `AVOID 13`) | **RULED** | §9.2 |
| **D-FIN11** | **The mechanism is bound; the invitation is INFORMATIONAL, and six constraints say what that means.** The ruling makes the ending contingent, which is the d = -0.36 shape unless the framing discharges it, and `BUILD 5` is the already-adopted escape hatch. The constraints: (1) name what the check IS, never what it unlocks; (2) the decline reads *"not yet"*, never *"no"*; (3) leaving is stated before the learner commits; (4) no count against a total and no progress bar; (5) the reading never says what the learner should have done; (6) the ending never thanks the learner for completing the check. **All six are already met by #273's copy, written before the ruling existed**, so this is a review standard for the next edit rather than a redraft. **And the reason to ask is the retrieval event, not the number** (§4.2, §4.3): copy written from that premise comes out informational without policing | **RULED** (copy remains Evan's with the lead) | §9.3 |

---

## 11. Rulings this amends, and the one it falsifies

| Ruling | Where | What changes |
| --- | --- | --- |
| **`D-END5`'s trigger** (the standing-city ceremony fires on `not_comparable`) | `2026-07-31-game-completion-ceremony-design.md:756` | **Widened to a predicate, not overturned.** Its content, its reasoning and its refusal to be a degraded ceremony are adopted verbatim. `D-FIN4` replaces the single trigger with the condition the reasoning already implies, and `D-END10` is re-read as the first instance of that widening rather than as an exception |
| **`O-END3` itself** | `2026-07-31-game-completion-ceremony-design.md:773` | **CLOSED in the bound direction and edited IN PLACE**, which is the one change this record makes to another file. The row carries a `CLOSED` marker, its body is struck with `~~` rather than deleted, its owner column records that the lead took it out of Evan's lane, and a dated note beneath the table carries the ruling verbatim and the correction. Nothing else in that document moves |
| **`O-END3`'s second clause** (*"A learner who declines gets D-END5's fallback, which is a complete ending"*) | `:773`, now struck | **FALSIFIED, and struck rather than deleted so the reasoning stays readable.** `D-END5`'s fallback is populated by the retake's own resolved state and the record forbids substituting stored mastery, so a decliner has nothing the ceremony is permitted to say. Not an error in a ruling: an assumption inside an open item, which is why it would have been inherited. **Confirmed independently at the code level**: `buildCompletionReport` on #273 takes the retake as required and the measurement as nullable, so a missing retake cannot be expressed |
| **`D-END7`'s aggregate line** (the coverage delta is a supporting line, shown and not suppressed) | `:758` | **Narrowed for one population by `D-FIN6`**, and its principle upheld: the aggregate stays on screen as its two endpoints. Nothing is suppressed |
| **`O-TO4`** (route `D-END5` on headroom as well as comparability) | `2026-08-01-test-out-placement-experience.md:806` | **Answered in shape.** `D-FIN4` accepts the finding and replaces the proposed coverage threshold with a comparison the ceremony can make from its own output, so no new data and no threshold constant. The operator and any margin are `O-FIN2` |
| **`D-END6`** (the ceremony may not read `placement_by_node`) | `:757` | **Untouched, and checked rather than assumed.** Every input to `D-FIN4`'s predicate is on the measurement record or the post's resolution; none is placement. Re-verified at this tip: `walk-engine.ts:141-144`, `:253-259`, `:261-269`, `:282`, `citySession.ts:967` |
| **`D-END1`, `D-END2`, `D-END3`, `D-END4`, `D-END8`, `D-END9`, `D-END11`, `D-END12`** | same document | **Untouched.** In particular nothing here widens the diagnostic (`O-END1` is unchanged and is still Gabe's), nothing shortens the instrument, and nothing writes mastery or placement. **`D-END2` is strengthened rather than amended**: it already described the ceremony as what happens when the retake's results come back, and the ruling supplies the clause it was missing, that there is no other ending |

---

## 12. Open items

| ID | The question | Owner | By when |
| --- | --- | --- | --- |
| **O-FIN1** | ~~**Which option**, `D-FIN3` being a recommendation and `O-END3` being the decision it answers~~ **CLOSED 2026-08-01: Option 1, by the team lead.** Struck rather than deleted, on this repository's convention | ~~**Evan**, with the lead~~ **Team lead** | **Answered** |
| **O-FIN2** | **The exact comparison in `D-FIN4`'s third input**: operator and margin between the named flip list and the already-held set. Deliberately not chosen here, because the shape is the contribution and the constant is a judgement about copy. **Now lands on real code**: #273's `named_node_ids` is the list to compare, and its already-held set is `heldAtEntry`, both in one function | Ceremony owner, with whoever lands #273 | Before the ceremony renders a headline |
| **O-FIN3** | **Whether to make the ENTRY diagnostic less skippable**, which §3.3 establishes is the only place the artifact's *n* is actually decided. It has its own anxiety cost and is a product decision rather than a measurement one. **The ruling makes this the ONLY remaining lever on the pair count**, since the exit is now as bound as it can be | **Gabe** with Evan | Before handoff, and independent of the ceremony |
| **O-FIN4** | **Where the ending's standing entry point lives** (`D-FIN10`). The behaviour is ruled: a door, not a nag, and not an 18-item re-run. Where it sits in the city and what it is called is a surface decision on the same shelf as `O-END4` | **Evan**, with the lead | Before the ceremony ships, and it is cheap next to the surface that already exists |

---

## 13. Self-review

- **Every figure was re-driven at `376c324b` rather than inherited**, including the four
  quoted in the brief, and the harness output is pasted literally rather than summarised.
  Both harnesses were deleted and `git status --porcelain -uall` was empty afterwards, so
  the tree is byte-identical to the tip.
- **The record was re-grounded when `integration` moved under it, and the re-grounding was
  cheap because it was mechanical.** #389 landed between the two revisions. All 83 tree
  citations and every measurement reproduce at the merged tip; nothing had to be changed for
  it, which is the outcome to hope for and not a reason to have skipped the check.
- **All 83 tree citations and 36 further checks against #273's branch were verified
  mechanically against an expected token**, not read once and trusted. Three were wrong
  across the two passes, all by one line, and all are corrected above rather than quietly
  widened into a range that would have covered the error. The exercise also caught the
  earlier record's own drift at `TitleScreen.tsx` (§3.3), which is the concrete case for
  doing it.
- **One of the #273 checks is NEGATIVE, because the interesting claim was an absence.**
  `D-FIN6` says the delta is not rendered, and a positive check on the endpoints would not
  establish that: the assertion that carries the claim is that `report.coverage.gain` occurs
  **nowhere** in `CompletionCeremony.tsx`. It does not, so the value is computed and never
  shown.
- **Quotations are verbatim, including punctuation this record's own prose does not use.**
  There are no em dashes in anything written here; the few that appear inside block quotes
  are the quoted document's. Four quotations were truncated mid-sentence on the first pass
  and have been extended to their sentence boundary, because a truncation that reads as a
  complete sentence is a quiet edit of somebody else's ruling.
- **The brief's framing was tested and comes out half wrong, and the record says so in the
  section that would have been easiest to skip.** The two problems do not share the root
  proposed, and the one-line test that shows it is in §5. Adopting the framing would have
  been the more agreeable answer and would have produced a change that fixed neither
  problem.
- **The premise the first revision called false was half true, and the half it got wrong is
  the more interesting one.** `completion-report.ts` is genuinely absent from the tree, and
  the first revision stopped there and concluded the ceremony was unbuilt. It exists on
  **#273**, which is open with `mergedAt: null`, along with the whole ceremony surface. **A
  PR's contents are not the tree's contents, and neither is the tree's absence evidence that
  a thing has not been written.** §6.2 reads that branch, says so on every citation, and
  finds four of this record's conclusions already implemented there. §2.5's row is rewritten
  from FALSE to a distinction rather than left as a scored point.
- **The recommendation was overruled and is kept intact rather than rewritten to agree.**
  §8's costing, §8.4's option and §9.1's give-ups are as they were argued. What has been
  added is which of them the ruling turns on, and the two bills it inherits, which are §9.2
  and §9.3. A record that quietly agreed with the outcome would leave a later reader no way
  to tell whether the alternative was ever considered.
- **The steer offered with the ruling was argued with rather than adopted.** Its premise is
  right and its obvious implementation is ruled out by `D-END5`'s own text, so `D-FIN9` is
  mostly a refusal to build, and the thing it does ask for (`D-FIN10`, a door back in) came
  out of measuring the existing route rather than out of the steer.
- **The most load-bearing finding is a hole in a ruling I am otherwise adopting**, which is
  the uncomfortable shape and is why it is in §1 rather than buried: `O-END3`'s reassurance
  about a decliner is not true of `D-END5` as written. It would have been easy to inherit,
  because it reads like a settled fact inside an open item. It is now struck in place in that
  document rather than corrected here and left wrong there, which is the difference between
  a note somebody might find and a note somebody will read.
- **Where the brief offered an invariant that does not apply, the record declines it rather
  than borrowing its authority.** `INV-COS-1` is an economy invariant and no option here
  engages it. §8.2 makes the actual argument, which is that after era ten there is nothing
  left to gate but the ending.
- **The recommendation was argued, and the thing it could not supply is named.** There is no
  completion rate available before handoff and this record does not invent one; §9.1 item 3
  says so as a cost of the recommendation rather than as a footnote. **That is also the
  honest reason the ruling is not second-guessed here**: with no rate available, "he chose
  the guarantee" and "the guarantee was not worth its price" are not distinguishable by any
  evidence this repository can produce before handoff.
- **Nothing is implemented, no `D-ERA` id is minted, and no production code was touched at
  any point.** Exactly one other document is edited, and only its `O-END3` row and the note
  beneath that table: no decision, no count and no other open item in it moves. The edit is
  a strike plus a dated note rather than a rewrite, on the convention that document already
  used on itself at §9 when D-CRISIS-33 falsified its era-ten sentence.
- **Editing a file other records cite means checking whose citations it breaks, and this one
  breaks none.** The `O-END3` row is edited in place at line 773 and the note is *appended*
  after the last row at line 775, so every line at or below 775 keeps its number. Swept
  across the repository, the only external file:line citations into that document are `:756`
  (from the test-out record and its work log) and `:323-324`, `:573-576`, `:745`, `:756`,
  `:773` from this one. All are at or below the insertion point and all still resolve.

---

## 14. References

- `docs/Assessment_Scoring_Spec.md` §1, §4, §5, §6, §7, §7a, §9, §10: what the instrument may
  claim, the un-hinted administration rules, the exclusion and attrition rules, and the ship
  requirement demonstrated on synthetic records.
- `docs/README.md` §8, §10, §10a: no efficacy cohort during the build, the corrected ship
  requirement, and the D1 diagnostic scope.
- `docs/Contracts.md` §8 (`INV-COS-1`'s actual text), §1.1 (test-out at mastery 0).
- `docs/BrainLift_Game_Design.md`: SPOV 1 (`:32`), SPOV 4 (`:52`), Zeigarnik in the approach
  form (`:65`, `:131`), Deci/Koestner/Ryan 1999 (`:183-187`), Karpicke and Blunt 2011
  (`:271-275`), Roediger and Karpicke 2006 (`:279-283`), BUILD 5 (`:316`), CAREFUL 11
  (`:324`), AVOID 13 (`:328`).
- `docs/Game_Visual_Design_Brief.md` §2 (`:57-73`): the tone requirements and the literal bans.
- `docs/superpowers/specs/2026-07-31-game-completion-ceremony-design.md`: `D-END1`..`D-END12`
  (`:752-763`), the fallback's reasoning (§5), the flip-list amendment (§6.3), the
  placement landmines (§8), and `O-END1`..`O-END5` (`:771-775`).
- `docs/superpowers/specs/2026-08-01-test-out-placement-experience.md` §7 (the ceiling and
  the flip hole), §8 (the amendment table this record's §11 follows), `O-TO4` (`:806`).
- `docs/superpowers/specs/2026-07-29-era-trial-contract.md`: `D-ET14` (`:1216`, *"The trial
  is exitable, and the exit shows an END OF ATTEMPT screen. A learner may leave at any point
  and return to practice or the island."*).
- Code read and re-verified in the tree at `376c324b`: `apps/web/src/TitleScreen.tsx`,
  `apps/web/src/diagnostic/DiagnosticRunner.tsx`, `apps/web/src/city/useCityEra.ts`,
  `apps/web/src/city/citySession.ts`, `apps/web/src/city/eraState.ts`,
  `engines/diagnostic/src/{coverage,coverage-measurement,walk,walk-engine,adjudicator}.ts`,
  `services/diagnostic-runtime/src/{runtime,measurement-read}.ts`,
  `packages/skill-graph/src/eras.ts`, `apps/web/src/lessons/interleavedPool.ts`.
- **NOT in the tree, and cited as such everywhere it appears**: `engines/diagnostic/src/completion-report.ts`,
  `apps/web/src/completion/CompletionCeremony.tsx`, `apps/web/src/completion/completionState.ts`
  and the mount in `apps/web/src/city/CitySurface.tsx`, all read at
  `origin/evan/city-population-happiness` @ `ce48c73a`, the head of
  #273, which is `state: OPEN`
  with `mergedAt: null` read from the API.
