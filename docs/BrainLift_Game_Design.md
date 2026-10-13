# Freshman Readiness, Game Design and Engagement BrainLift

*The engagement-and-learning-mechanics BrainLift: what makes city-building games engaging, how educational apps gamify and whether it works (including for adults), how a resource loop is used without becoming the point, and how retrieval and spacing turn engagement into durable learning. The product, diagnostic, and remedial-market case (prerequisite frameworks, error-typing, honest measurement, churn, heterogeneity) lives in the companion doc, [BrainLift_Product_Diagnostic.md](BrainLift_Product_Diagnostic.md). Model: each knowledge-graph node = a building the learner constructs by mastering that skill; underprepared, math-anxious community-college and adult audience; accuracy-based monotonic mastery; cooperative-only; checkpoint "storms." Conventions: 2 atomic bullets per source, 2-3 sentence Summary and Analysis ending on a general claim, design framing lives in DOK 3/4 not the DOK 2 summaries, no em dashes, no reliability tags in source headings.*

## Owners
- Gabriel Xiong
- Evan Cabrera
- Anthony Zheng

## Purpose
To understand how current educational applications stay engaging while still teaching effectively, how current city-building games (Civ 5, 6) stay fun, and how retrieval and spacing convert engagement into retention, so we can weave real learning into a city-builder loop for a math-anxious audience.

## In Scope
- What makes current city-building games fun, and the features that support this.
- How current educational apps introduce gamification and the efficacy of those approaches, including for college-age and adult learners.
- Game design mechanics and resource loops.
- How to make learning durable through retrieval practice and spacing.
- Tangible examples of successful features.

## Out of Scope
- Monetization and real-money economies (our economy is cosmetic-only).
- The controlled efficacy study itself (we build the measurement pipeline; the study runs after handoff; measurement design is covered in the companion product doc).
- Non-city-builder genres except as comparison points.
- The diagnostic engine, prerequisite frameworks, error-typing, and the remedial-market case (covered in the companion product and diagnostic BrainLift).

---

## DOK 4: Spiky Points of View (SPOVs)

*Contrarian, defensible positions the team holds. Each is spiky because it cuts against a default that the edtech or game-design mainstream treats as obvious. Grounded in the DOK 2/3 evidence below.*

- **SPOV 1: Engagement is not our success metric, mastery is, and we will refuse to report an engagement number that is not downstream of demonstrated learning.** The industry sells on DAU, streaks, and time-in-app, but engagement and learning dissociate: gamified cognitive training raised engagement (g = 0.72) with no learning gain at all, and misuse studies show points and leaderboards push users toward shallow app usage over understanding. We treat every engagement mechanic as guilty until it is shown to serve the mastery loop, so our headline metric is the parallel-form pre/post gain, never minutes-in-app.
  - Design implication: in our design, this translates to instrumenting mastery gain as the primary metric and treating engagement signals (session length, return rate, streak length) as diagnostic secondaries that are never optimized on their own. A feature that raises time-in-app without moving the pre/post gain is treated as a cost, not a win, and gets cut, which is the discipline the companion product doc's measurement pipeline is built to enforce.

- **SPOV 2: The three things most people mean by "gamification," points, badges, and leaderboards, are the three we refuse to ship.** That canonical triad is exactly what the negative-effects literature indicts: competition breeds anxiety and toxicity, and badges and points cause extrinsic drift and reward-gaming that sacrifices real learning. Our gamification is game STRUCTURE, a city that IS the progress bar, not a reward skin bolted onto worksheets, and the most independently validated math app (ST Math, roughly +0.07 SD across ~150,000 students) ships none of the triad.
  - Design implication: in our design, this translates to a UI with no points balance, no badge shelf, and no leaderboard screen anywhere, where the city itself is the only progress display and every mechanic reads off the single mastery signal (BUILD 1, BUILD 2). Any proposed reward feature has to justify itself as game structure that advances the city, not as a collectible or a rank, and the default answer to "should we add a points or comparison feature" is no.

- **SPOV 3: Busywork is not a game-design flaw, it is unmastered math wearing a costume, and for our audience it is lethal.** The city-builder genre's most consistent criticism is busywork: micromanagement with no stakes, maintenance overshadowing creativity, and cognitive overload from too many variables. For a math-anxious learner whose working memory is already consumed under pressure, filler does not just bore, it eats the exact resource learning needs, so every action in our core loop must be a genuine retrieval rep and any click that is not learning gets cut even if it "adds engagement."
  - Design implication: in our design, this translates to a core loop where every interaction that advances the city is a math action (a retrieval rep or a mastery check), and there is no resource micromanagement, no maintenance chore, and no filler tap that exists only to create activity. The resource economy is kept cosmetic and effort-fauceted (BUILD 10, Category 3) precisely so it cannot become the busywork layer, and any mechanic that adds clicks without adding a learning rep is rejected in review.

- **SPOV 4: The engagement loop is worthless unless it is a retrieval-and-spacing engine, so the "reward" for mastering a building is being made to use that skill again later.** The mechanic that produces durable learning is not more content or more points, it is repeated retrieval spaced over time (retrieval practice beats rereading and concept-mapping, and spaced practice beats massed practice), and gamification's only proven job is to get an anxious learner to keep showing up. So we deliberately fuse the two: the city's return-pull (the reason to open the app tomorrow) is wired to resurface an already-built skill for a light retrieval check at expanding intervals, which means our engagement mechanic and our learning mechanic are the same mechanic, not a reward skin over a worksheet.
  - Design implication: in our design, this translates to a spaced-review scheduler that owns the return-pull: a built skill is queued to resurface at expanding intervals (BUILD 4, Category 4), and the "reason to come back tomorrow" the city surfaces is that a due skill needs a quick recall check to keep its building thriving. The interval widens as retention target grows (Cepeda 2006), and the review is framed as tending the city rather than as a test, so the same event serves both spacing and engagement.

---

## Experts

*People whose frameworks this brainlift leans on. Listed with the one thing we take from each.*

- **Michael Sailer and Lisa Homner** (gamification meta-analysis): the anchor effect sizes and the finding that no single element drives the effect, so design coherence beats any one mechanic.
- **Edward Deci and Richard Ryan** (Self-Determination Theory / overjustification): why controlling rewards undermine intrinsic motivation and why informational feedback is the escape hatch.
- **Mark Ashcraft** (math anxiety and working memory): the mechanism that makes time pressure specifically harmful for our audience.
- **Jeffrey Karpicke** (retrieval practice): the finding that testing yourself produces more durable learning and transfer than restudying, which is why our loop is built on retrieval, not review.
- **Yu-kai Chou** (Octalysis, White Hat vs Black Hat) *[practitioner framework]*: the vocabulary for separating competence-building mechanics from pressure mechanics.
- **Bluma Zeigarnik** (unfinished-task tension): the retention mechanism we adopt in its approach form and reject in its loss form.

---

## DOK 3: Insights

**From Category 1: What makes city-building games engaging**
- **Insight (city-1):** The genre's engine is a challenge to action to reward loop wrapped around cultivation, and players stay because progress is always visible. Our city-builder inherits this for free, because mastering a node is the "action" and the resulting building is the visible reward, so we do not need to invent engagement, we need to make sure the action underneath every building is real learning.
- **Insight (city-2):** "One more turn" comes from overlapping, cascading goals that never resolve at the same time, so there is never a clean quit point. We reproduce this with staggered node and neighborhood goals (one skill almost done, a neighborhood nearly complete, a district beyond that), but we power it with approach motivation (finish the city) rather than the loss aversion that fuels streaks.
- **Insight (city-3):** The genre's fatal failure mode is busywork, micromanagement and cognitive overload that turn play into chores, and that is precisely the load our math-anxious audience cannot absorb. So our design rule is that every interaction must be a learning rep, and any maintenance or resource fiddling that does not teach is cut, no matter how much "activity" it adds.
- **Insight (city-4):** Clash of Clans retains on the Zeigarnik effect (unfinished tasks pull you back) by guaranteeing visible promised progress on every return and layering a goal at every timescale. We adopt the visible-progress-on-every-return structure and the multi-timescale goal stack, but we take the approach half of the mechanism and refuse the punitive half.

**From Category 2: How current educational apps introduce gamification and the efficacy of those approaches**
- **Insight (gamification-1):** The apps that work do not bolt game elements onto content; they make one low-friction daily action the whole loop and wrap it in mutually reinforcing mechanics (Duolingo: a 3-to-5 minute lesson wrapped in streak, XP, and league, each feeding the others through one shared XP currency). The lesson is that a single unifying progress currency that every mechanic reads from is what makes a gamified system feel coherent instead of like scattered widgets, so our design routes streak, city growth, and any social layer off the one mastery signal rather than inventing parallel point systems.
- **Insight (gamification-2):** The strongest and safest specific feature across every source is visible mastery progress with immediate, meaningful feedback, and the best executions keep it in the background (Khan Academy: progress and mastery markers that never overshadow the content). Because a construction/city metaphor is a progress display by construction, our design gets the single best-evidenced feature for free, and the design job is to make each building visibly reflect real mastery and to give feedback that explains the error, not just marks it.
- **Insight (gamification-3):** The apps that retain without harm pair a commitment device with a forgiveness mechanic (Duolingo streak freeze, streak repair), so a bad day does not erase months of progress. For an anxious audience the forgiveness half is the load-bearing part, so our design keeps any streak or momentum feature humane by default (freezes, easy repair, compare-to-your-own-past) and never catastrophizes a missed day.
- **Insight (gamification-4):** The recurring "done right" distinction is White Hat (mechanics that build competence, autonomy, and meaning) versus Black Hat (mechanics that rely on external pressure, urgency, and comparison); the same feature helps or harms depending on which it serves. Our design keeps rewards informational ("here is what you can now do"), replaces public leaderboards with personal-progress dashboards, and keeps narrative as the learner-as-protagonist frame, because those are the White Hat versions of features that otherwise backfire for low-confidence learners.
- **Insight (gamification-5):** The same reward mechanics that raise app usage can actively suppress learning, "gamification misuse," when they redirect attention from understanding to collecting points and beating others. The takeaway is that an engagement win is not a learning win, so we validate every mechanic against mastery, not usage, and we design out the collect-and-compare features that invite reward-gaming.
- **Insight (gamification-6):** Gamification is not a children's tool that our college-age, underprepared audience will find condescending; higher-education meta-analyses report large positive effects for college and adult learners, and the age of the learner is a weak-to-null moderator once design quality is controlled. The mechanism explains why: adult-learning theory (andragogy) says adults are driven mainly by internal motivators, and Self-Determination Theory says gamification works by feeding autonomy, competence, and relatedness, which are exactly those internal drivers, so a competence-first, autonomy-respecting design should land at least as well with adults as with children. The design consequence is that we lean into the White Hat, competence-and-autonomy features (which adults reward) and stay away from the childish spectacle and surveillance-flavored ranking that adults specifically resent.

**From Category 3: How to effectively include a resource loop into a city builder**
- **Insight (resource-1):** A healthy game economy balances faucets (resource sources) against drains (resource sinks) so the player is never flooded or starved, and active faucets (earned by effort) behave very differently from passive ones (earned by waiting). For a learning app the only faucet we want is effort, mastering skills, because a passive drip of currency rewards waiting instead of learning, so our economy is effort-fauceted and cosmetic-drained.
- **Insight (resource-2):** The cost curve, how much the next thing costs as you progress, is really a dial on how much work stands between the learner and the next reward, so it doubles as a difficulty and pacing lever. We set that curve to serve spaced retrieval and steady perceived progress rather than to maximize reward frequency, which is the White Hat use of a mechanic games usually tune for spending.

**From Category 4: Making learning durable through retrieval and spacing**
- **Insight (retention-1):** The durable-learning lever is retrieval, not review: being made to recall a skill produces better long-term retention and transfer than rereading or concept-mapping, even though learners feel less confident during retrieval and wrongly prefer passive restudy. So our loop is built so that progressing the city requires recalling a previously mastered skill, and we accept that the more effortful, less comfortable path is the one that actually sticks, which is the opposite of what an engagement-maximizing design would choose.
- **Insight (retention-2):** Spacing beats massing: the same amount of practice distributed over time produces more durable retention than the same practice packed together, and the effect holds for mathematics specifically. This is what makes the return-pull of a city-builder pedagogically valuable rather than just habit-forming, because a skill that resurfaces days after it was built is being spaced by design, so the engagement mechanic (come back tomorrow) and the learning mechanic (space the practice) are literally the same event.

---

## DOK 2: Knowledge Tree

### Category 1: What makes city-building games engaging

The genre's appeal is a specific loop (cultivate, grow, reinvest) driven by overlapping goals and visible progress, with a well-documented failure mode (busywork) and a well-documented retention mechanism (unfinished-task tension). Understanding both the draw and the failure mode tells us which parts of the genre to borrow and which to design out for a math-anxious audience.

**Subcategory 1.1: The core loop is cultivate, grow, reinvest**

**Source 1: "Why the Core Gameplay Loop is Critical for Game Design" and "Core Loops in Gameplay" (game-design writing)**
- Almost every builder runs a challenge to action to reward loop: build, generate resources or population, hit a new challenge, then reinvest to grow.
- The genre's distinctive appeal is cultivation, shaping an environment and watching systems respond over time, and investment is sustained because the loop is tied to visible progress.

*Summary and Analysis:* The builder genre runs on a tight cultivate-grow-reinvest loop whose payoff is watching a system you shaped respond over time. What keeps players in it is that every turn of the loop is legible as visible progress. A city-builder is engaging to the degree its core loop makes cultivation and progress continuously visible.

**Subcategory 1.2: Cascading, overlapping goals ("one more turn")**

**Source 1: "Psychology Behind One More Turn" and "Basis of One More Turn Syndrome" (game-design writing)**
- Goals overlap and stagger (a building finishes next turn, a technology two turns later, a unit after that), so there is never a clean stopping point.
- Progression itself is the goal: there is no win screen, and continued expansion is the point.

*Summary and Analysis:* "One more turn" is engineered, not accidental: staggering goals so they never resolve at the same moment means the player is always mid-way through something. Because progression itself is the reward, there is no natural quit point. Overlapping, never-aligned goals are what convert a builder from a task into a compulsion.

**Subcategory 1.3: The busywork failure mode (the anti-pattern to design out)**

**Source 1: Genre-criticism synthesis (builder-genre reviews and postmortems)**
- The genre's most consistent criticism is busywork: micromanagement with no stakes and maintenance that overshadows creativity, making mandatory tasks feel like chores.
- The second failure is cognitive overload: too many variables create stress over strategy, and repetition at scale (the same build order across many cities) drains the experience.

*Summary and Analysis:* The genre's signature weakness is busywork and cognitive overload, where maintenance and variable-juggling crowd out the creative, strategic core. For a math-anxious audience whose working memory is already taxed, this failure mode is not a mild annoyance but a direct threat to learning. A learning city-builder has to aggressively cut anything that reads as chore or clutter rather than as meaningful progress.

**Subcategory 1.4: Retention through unfinished-task tension (Clash of Clans, Zeigarnik)**

**Source 1: Neurolaunch, "The Zeigarnik Effect in Psychology" (applied to Clash of Clans retention)**
- The Zeigarnik effect is the tendency to remember unfinished tasks more readily than completed ones, and Clash of Clans exploits it by guaranteeing visible, promised progress on every return.
- It layers timescales, a short/mid-term loop plus two long-term loops, so there is a goal at every scale and always something partly done.

*Summary and Analysis:* Clash of Clans retains players by keeping something always unfinished and always visibly progressing, tapping the Zeigarnik pull of the incomplete task. Stacking short, medium, and long loops guarantees a goal at every timescale. The mechanism is powerful, but it runs on the tension of the unfinished and on loss, so it must be adopted in its approach form and stripped of its punitive form for our audience.

### Category 2: How current educational apps introduce gamification and the efficacy of those approaches

Gamification is standard in learning apps, but the useful questions are which specific features the successful apps implement, why they work, whether they still work for our college-age and adult audience, and which features actively hurt learning. The pattern across the strongest apps is a small set of recurring features (a unifying progress currency, visible mastery, immediate feedback, a commitment-plus-forgiveness loop, and competence-supporting framing); the higher-education evidence shows these work for adults, not just children; and the failure literature shows that points, badges, and competition can suppress learning even as they raise usage.

**Subcategory 2.1: A single unifying progress currency is what makes the good apps cohere**

**Source 1: Duolingo gamification design teardowns (StriveCloud, Trophy, Apptitude, Deconstructor of Fun), 2022-2026**
- The loop is one tiny daily action (a 3-to-5 min lesson), and XP is the single shared currency that streak, league, and achievements all read from.
- The streak is shown on open and XP is awarded before the lesson closes; vendor-reported launches include Daily Quests (+25% DAU) and Treasure Chest (+15% completion).

*Summary and Analysis:* The teardowns converge on one structural feature: a shared currency (XP) that every other mechanic reads from, which is what makes the system feel coherent rather than like a pile of separate widgets. The specific engagement percentages are vendor-reported and should be treated as directional. A gamified learning system works better when one progress signal unifies every mechanic than when each mechanic keeps its own score.

Link to Source: https://apptitude.io/blog/how-duolingos-streak-mechanic-actually-works/

**Source 2: Sailer and Homner, "The Gamification of Learning: A Meta-Analysis," Educational Psychology Review 32(1):77-112, 2020**
- Reported effects were cognitive g = 0.49, motivational g = 0.36, and behavioral g = 0.25, and only the cognitive effect held under high-rigor subanalysis.
- Combining competition with collaboration, and adding game fiction, were the significant moderators for behavior.

*Summary and Analysis:* The anchor meta-analysis shows the learning benefit of gamification is real but modest (g ≈ 0.49), and that the durable effect is the cognitive one. It also identifies combining cooperative and competitive elements, and adding narrative, as the moderators that actually move behavior. Gamification's learning payoff is small enough that the mechanics have to serve real practice, not replace it.

Link to Source: https://link.springer.com/article/10.1007/s10648-019-09498-w

**Subcategory 2.2: Visible mastery progress with immediate feedback is the feature every strong app shares**

**Source 1: Khan Academy design analyses and general-gamification syntheses (GESS Education; Park University; practitioner reviews), 2023-2026**
- Khan Academy uses energy points, tiered mastery badges, and visible progress, deliberately kept in the background so they do not overshadow the content.
- Cross-app reviews name immediate feedback that explains the error and visible mastery progress as the top "must-haves," and continuous low-stakes progress is linked to lower test anxiety.

*Summary and Analysis:* Across app reviews the common denominator of the well-regarded products is visible mastery progress plus feedback that explains the error, with Khan Academy cited as the restraint-done-well example where the game layer stays subordinate to the content. These are the two features reviewers name most, and they are learning features, not decorative ones. The most consistently endorsed features are the ones that communicate competence and next steps rather than the ones that add spectacle.

Link to Source: https://www.gesseducation.com/gess-talks/articles/gamification-education-driving-engagement-motivation-and-mastery

**Source 2: Bai, Hew and Huang, "Does gamification improve student learning outcome?" Educational Research Review 30:100322, 2020**
- Learning-outcome effect was g = 0.504 across 30 interventions (N=3,202) with no publication bias, and it did not vary by which specific game element was used.
- The qualitative synthesis found students value clear progress and feedback and dislike gamification that feels like empty point-chasing.

*Summary and Analysis:* An independent meta-analysis confirming the moderate learning effect (g ≈ 0.50) and, tellingly, finding no single game element drives it, the effect comes from the overall design. Its qualitative half reports students themselves valuing clear progress and feedback and rejecting empty point-chasing. What matters is a coherent design centered on progress and feedback, not the presence of any particular badge or point.

Link to Source: https://www.sciencedirect.com/science/article/abs/pii/S1747938X19302908

**Subcategory 2.3: The best retention feature pairs a commitment device with forgiveness**

**Source 1: Duolingo streak-and-freeze design teardowns (Apptitude, Medium/Singha, Digia, Deconstructor of Fun), 2022-2026**
- The streak is a loss-aversion commitment device kept alive by constant visibility, paired with forgiveness mechanics (streak freeze, streak repair, event revival).
- The stated design principle is "humane pressure" so one missed day is survivable, and adding freezes reportedly raised, not lowered, long-term engagement.

*Summary and Analysis:* The teardowns are explicit that the streak alone would make users quit after one bad day, and that the forgiveness layer (freezes, repair) is what makes the commitment device sustainable. The counterintuitive reported result is that leniency raised engagement, and this is practitioner evidence so the direction is more reliable than the numbers. A commitment mechanic sustains behavior only when paired with forgiveness that prevents one lapse from erasing accumulated progress.

Link to Source: https://medium.com/@salamprem49/duolingo-streak-system-detailed-breakdown-design-flow-886f591c953f

**Source 2: Deci, Koestner and Ryan, "A Meta-Analytic Review of Experiments Examining the Effects of Extrinsic Rewards on Intrinsic Motivation," Psychological Bulletin 125(6):627, 1999**
- Across 128 experiments, expected tangible rewards undermined intrinsic motivation (d = -0.40 engagement-contingent, -0.36 completion-contingent, -0.28 performance-contingent).
- Unexpected rewards and verbal or informational feedback did not undermine, and could increase, intrinsic motivation.

*Summary and Analysis:* The foundational evidence for why reward mechanics have to be designed carefully: expected contingent rewards reduce the intrinsic interest a learning tool relies on, at d ≈ -0.3 to -0.4. The escape hatch is that informational feedback does not carry this cost, so a reward is safe to the degree it reads as competence information rather than as payment. Reward features help only when framed as information about progress, not as controlling incentives.

Link to Source: https://www.selfdeterminationtheory.org/SDT/documents/1999_DeciKoestnerRyan.pdf

**Subcategory 2.4: The features that succeed build competence (White Hat), not pressure (Black Hat)**

**Source 1: White Hat vs Black Hat gamification analyses, incl. reference to a 2024 British Journal of Educational Technology study on autonomy/competence-supporting mechanics (practitioner syntheses citing BJET)**
- White Hat mechanics build competence, autonomy, and meaning; Black Hat mechanics rely on urgency, pressure, and social comparison, and apps blend both (Duolingo hooks Black Hat, retains White Hat).
- Recommended practice is personal-progress dashboards over public leaderboards for struggling learners, and narrative that works best as learner-as-protagonist quest framing.

*Summary and Analysis:* The recurring design distinction is not which mechanic but which need it serves: features that build competence and autonomy sustain learning, while pure-pressure features create stress once the novelty passes. The specific safe substitutions named are personal-progress dashboards over public leaderboards and protagonist-quest narrative over decorative story. The BJET grounding is cited secondhand here, so treat the White/Black Hat label as a practitioner frame over a peer-reviewed core.

Link to Source: https://yukaichou.com/gamification-examples/10-best-gamification-education-apps/

**Source 2: WestEd, "Evaluation of ST Math," 2019 (independently reviewed to ESSA Tier 2 by SRI International)**
- ST Math gamifies through language-free visual puzzles and informative animated feedback (the JiJi penguin), not points, badges, or leaderboards.
- A matched-comparison evaluation across 474 schools, 16 states, and ~150,000 students found statistically significant favorable math effects, though small (Evidence for ESSA ~+0.07 SD).

*Summary and Analysis:* The learning app with the strongest independent efficacy evidence gamifies through visual progress and informative feedback rather than reward-and-rank, which is the White Hat pattern in a validated product. It is the counterexample to the assumption that competitive mechanics are what make a math app work. A feedback-and-progress design can clear an independent efficacy bar without any competitive or reward-chasing mechanics at all.

Link to Source: https://eric.ed.gov/?id=ED601907

**Subcategory 2.5: Gamification still works for college-age and adult learners (not a kids-only tool)**

**Source 1: Higher-education gamification meta-analyses (Kim et al. 2021 behavioral-change meta-analysis, IJERPH; a 2026 higher-education outcomes meta-analysis, SAGE Open; and a subgroup meta-analysis reporting college as the strongest level)**
- The Kim et al. 2021 behavioral-change meta-analysis reported gamification effects slightly higher for adults in higher education (ES = 0.95) than for K-12 students (ES = 0.92), and a subgroup meta-analysis found the College/Course subgroup had the largest effect (~0.68) while High School was not significant.
- A 2026 higher-education-specific meta-analysis (22 studies, ~55% undergraduates) found a large overall effect (Cohen's d ≈ 1.12) but very high heterogeneity (I² ≈ 99%), and other analyses find educational level is not a significant moderator at all.

*Summary and Analysis:* Across higher-education meta-analyses gamification shows clear positive effects for college and adult learners, and the direct adult-versus-K-12 comparisons come out roughly even rather than favoring children. The evidence on whether age moderates the effect is genuinely mixed: some analyses put college highest, others find level is not a significant moderator, and the effect sizes carry very high heterogeneity, so the honest claim is not "adults benefit more" but "adults benefit, and design quality matters far more than age." Gamification is not a childhood-only intervention; a well-designed system is at least as effective for older, underprepared learners.

Link to Source: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8037535/

**Source 2: Andragogy plus Self-Determination Theory as the mechanism (Knowles' adult-learning principles; Deci and Ryan's SDT; and SDT-based gamification analyses)**
- Andragogy holds that adults are driven mainly by internal motivators (interest, competence, self-direction) rather than external ones, and SDT identifies autonomy, competence, and relatedness as the intrinsic needs that drive motivation.
- SDT-based analyses argue gamification works precisely by satisfying those three needs, and adult-training studies note that competitive ranking can read as surveillance to adults, so competence-and-autonomy mechanics fit adult learners better than pressure-and-comparison ones.

*Summary and Analysis:* The mechanism explains the empirical result: gamification motivates by feeding autonomy, competence, and relatedness, and those are exactly the internal drivers adult-learning theory says matter most for adults. This predicts that a competence-first, autonomy-respecting design should work at least as well for adults as for children, while childish spectacle and surveillance-style ranking are the parts adults specifically reject. For an older, underprepared audience the safe and effective design leans on the competence-supporting (White Hat) features and drops the comparison-driven ones.

Link to Source: https://webspace.science.uu.nl/~veltk101/publications/art/chi2022-sdtws.pdf

**Subcategory 2.6: Game features that hurt learning (the failure literature)**

**Source 1: "When Gamification Spoils Your Learning: A Qualitative Case Study of Gamification Misuse in a Language-Learning App"**
- Badges, points, and leaderboards give the illusion of promoting learning and do increase how often students use the app.
- In practice they drive shallow engagement, users focus on earning points and awards rather than understanding the material, a pattern the authors name gamification misuse.

*Summary and Analysis:* The case study shows the exact trap that engagement metrics hide: the reward triad reliably increases usage while redirecting attention away from understanding. Gamification misuse is when the mechanics optimize the wrong target, activity instead of learning. An increase in usage is not evidence of learning and can be evidence against it.

Link to Source: (team-provided; locate DOI before quoting)

**Source 2: "Negative Effects of Gamification in Education Software: Systematic Mapping and Practitioner Perceptions"**
- Competitive app features correlated with worse learning effects, performance, and motivation, because competition can cause toxicity, anxiety, and demotivation.
- Badges and points shift students toward extrinsic reward collection, students may exploit shortcuts to farm rewards, and overdone game features add noise that distracts from the core learning logic.

*Summary and Analysis:* The systematic mapping is the negative case for our two biggest design refusals: competition harms performance and motivation, and reward-collection invites gaming the system at the expense of learning. It also warns that piling on game features adds noise that buries the learning logic. The safe design is minimal and competence-focused, not maximally gamified.

Link to Source: (team-provided; locate DOI before quoting)

### Category 3: How to effectively include a resource loop into a city builder

A resource loop can give the city texture and pace the reward, but in a learning app it has to be constrained so it never becomes the point. The two core mechanics are the faucet-and-drain balance (where resources come from and go) and the cost curve (how much the next thing costs), and both are pacing levers we repurpose to serve learning rather than spending.

**Subcategory 3.1: Faucets and drains**

**Source 1: Game-economy design writing (faucet-and-drain model)**
- A standard economy has faucets that generate resources and drains that transform or remove them, with active faucets requiring direct player effort and passive faucets generating over time.
- Every drain should have a matching source, which keeps the economy from inflating (excess) or starving (shortage).

*Summary and Analysis:* A stable game economy balances what it hands out against what it takes back, and it distinguishes effort-earned (active) from time-earned (passive) resources. Balancing faucets against drains is what prevents runaway inflation or dead-end scarcity. For a learning economy this argues for effort as the only faucet and cosmetics as the drain, so the loop rewards learning rather than waiting.

**Subcategory 3.2: Cost curves**

**Source 1: Game-economy design writing (cost-curve model)**
- A cost curve is the pattern of how much something costs as the player progresses.
- It can directly control how many problems a student must solve to earn the next reward.

*Summary and Analysis:* The cost curve sets how much effort stands between the learner and the next reward, which makes it a difficulty and pacing dial rather than just an economic one. Tuning it decides how many problems buy the next cosmetic or unlock. Set to serve spacing and steady perceived progress, the cost curve becomes a learning lever; set to maximize reward frequency, it becomes a spending lever, and we choose the former.

### Category 4: Making learning durable through retrieval and spacing

Gamification's proven job is to keep an anxious learner showing up; it does not by itself make learning stick. The two mechanics that do are retrieval practice (recalling a skill rather than reviewing it) and spacing (distributing practice over time rather than massing it). Both are learning mechanics, not motivational ones, and both are what a city-builder's return-pull can be wired to serve.

**Subcategory 4.1: Retrieval practice beats passive review**

**Source 1: Karpicke and Blunt, "Retrieval Practice Produces More Learning than Elaborative Studying with Concept Mapping," Science 331(6018):772-775, 2011**
- Students who practiced retrieval (recalling material from memory) outperformed students who restudied or built concept maps on a delayed test of both retention and meaningful inference.
- Learners predicted retrieval practice would be the least effective method, so the technique that worked best was the one students felt least confident using.

*Summary and Analysis:* Retrieval practice outperformed the study strategies learners intuitively prefer, including elaborative concept-mapping, on delayed tests of both retention and transfer. The gap between what worked and what students expected to work means a design cannot rely on learner preference to pick the effective activity. A learning loop should force recall rather than offer review, even though recall feels harder and less rewarding in the moment.

Link to Source: https://www.science.org/doi/10.1126/science.1199327

**Source 2: Roediger and Karpicke, "Test-Enhanced Learning: Taking Memory Tests Improves Long-Term Retention," Psychological Science 17(3):249-255, 2006**
- On a delayed test, students who had been tested on material retained substantially more than students who had spent the same time restudying it, and the advantage grew as the retention interval lengthened.
- Repeated studying produced higher confidence and better short-term performance, so it looked more effective at the time even though it retained less later.

*Summary and Analysis:* The testing effect is durable and grows with delay, which is exactly the timescale a readiness tool cares about, and restudying only looks better in the short window right after practice. Because the more effective method feels worse and tests worse immediately, an engagement-optimizing design will systematically pick the wrong one. This is the direct evidence for making the core loop a recall event rather than a review screen.

Link to Source: https://journals.sagepub.com/doi/10.1111/j.1467-9280.2006.01693.x

**Subcategory 4.2: Spacing distributes practice for durable retention**

**Source 1: Cepeda, Pashler, Vul, Wixted and Rohrer, "Distributed practice in verbal recall tasks: A review and quantitative synthesis," Psychological Bulletin 132(3):354-380, 2006**
- Across a large body of studies, practice spread over time produced better long-term retention than the same amount of practice massed together (the spacing effect).
- The optimal gap between practice sessions grows with how long the material needs to be retained, so longer retention goals call for wider spacing.

*Summary and Analysis:* The spacing effect is one of the most robust findings in learning research: distributing practice beats massing it for durable retention, and the ideal interval scales with the target retention horizon. That makes spacing a schedulable design parameter, not just a study tip. A tool that controls when a skill resurfaces can set the spacing interval deliberately rather than leaving it to the learner.

Link to Source: https://doi.org/10.1037/0033-2909.132.3.354

**Source 2: Rohrer and Taylor, "The shuffling of mathematics problems improves learning," Instructional Science 35:481-498, 2007**
- In a mathematics task, spacing and interleaving practice problems produced much better performance on a delayed test than massing problems of one type together, even though massed practice looked better during the practice session itself.
- Interleaving different problem types forced students to choose the right procedure, not just execute a known one, which is the skill a real test requires.

*Summary and Analysis:* The spacing and interleaving advantage holds specifically for mathematics, and it improves the exact capability a gateway exam demands: selecting the correct procedure rather than repeating a primed one. As with retrieval, massed practice feels more effective in the moment, so learner preference again points the wrong way. Spacing and interleaving math practice is therefore a design decision the tool should make on the learner's behalf.

Link to Source: https://link.springer.com/article/10.1007/s11251-007-9015-8

---

## Feature recommendations for the city-builder (full set)

*Derived from the categories above and mapped to our model (each node = a building the learner constructs by mastering that skill; underprepared, math-anxious audience; cooperative-only; checkpoint "storms"). BUILD = evidence backs it and it fits; CAREFUL = do it only with the named guardrail; AVOID = evidence says it harms our population.*

BUILD:
1. **The city IS the progress bar.** Node mastery produces a permanent, visible building and the neighborhood fills in. Rationale: visible-artifact progress is the single best-evidenced motivational feature (2.2) and the genre's core draw (1.1), and we get it natively.
2. **One unifying progress currency (mastery).** Route streak, city growth, and any social layer off the single mastery signal, no parallel point systems. Rationale: the shared-currency structure is what makes Duolingo cohere (2.1).
3. **Cascading, overlapping goals powered by approach motivation.** Stagger node, neighborhood, and district goals so something is always nearly done. Rationale: this is the "one more turn" engine (1.2) and the Zeigarnik return-pull (1.4), kept in its approach form.
4. **Retrieval-and-spacing baked into the return-pull.** The reason to open the app tomorrow resurfaces an already-built skill for a light recall check at expanding intervals. Rationale: retrieval beats review and spacing beats massing for durable retention (4.1/4.2), so this fuses the engagement mechanic and the learning mechanic into one event.
5. **Informational reward framing.** Every completion reads as "here is what you can now do," never "you earned 50 coins." Rationale: the SDT escape hatch from the overjustification effect, d ≈ -0.3 to -0.4 for controlling rewards (2.3).
6. **Restraint / keep the game layer subordinate.** Progress markers never overshadow the math, and busywork is cut. Rationale: Khan Academy restraint (2.2) plus the genre's busywork failure mode (1.3).
7. **Cooperative / relatedness features only.** Shared city goals, co-op neighborhood builds. Rationale: relatedness is one of the needs gamification actually moves, and cooperation is the documented safe alternative to competition (2.4/2.5).
8. **White Hat narrative (learner-as-protagonist).** Quest framing, "still building this skill" language. Rationale: narrative works best as protagonist framing and co-occurs with lower anxiety (2.4).

CAREFUL:
9. **Streaks, mercy-designed only.** Guardrail: freezes, easy repair, compare-to-your-own-past, never catastrophize a missed day. Rationale: the commitment-plus-forgiveness pattern retains better AND lowers anxiety; the forgiveness half is load-bearing (2.3). Defer for MVP if in doubt.
10. **Cosmetic resource economy (faucets/drains, cost curves).** Guardrail: effort-fauceted, cosmetic-drained, never gate learning, frame earning as competence feedback. Rationale: virtual currency boosts engagement but does not move learning and can crowd out motivation (2.3/2.5), and the economy must never become pay-to-skip (Category 3).
11. **Levels / neighborhood progression.** Guardrail: "locked" must read as "not yet," not "you failed." Rationale: useful scaffolding, but not a learning driver on its own (2.1/2.2).

AVOID:
12. **Public leaderboards / competitive ranking.** Rationale: demotivates low performers and raises anxiety; competitive features correlate with worse learning (2.4/2.5). Use personal-progress dashboards instead.
13. **Pressure-only Black Hat mechanics (urgency, public comparison, timers on mastery tasks).** Rationale: they create stress once novelty fades and backfire for low-confidence learners (2.4).
14. **Points/XP as the headline.** Rationale: the weakest-evidence element on its own and the overjustification trap; fine only as a quiet substrate (2.1/2.3).
15. **Busywork / micromanagement for its own sake.** Rationale: the genre's #1 criticism and a direct working-memory tax on an anxious audience (1.3).

---

*Verification notes (project citation standard): the peer-reviewed backbone is cross-corroborated: Sailer and Homner 2020 (g = 0.49/0.36/0.25), Bai/Hew/Huang 2020 (g = 0.504), Deci/Koestner/Ryan 1999 (d = -0.28 to -0.40), ST Math ESSA Tier 2 (~+0.07 SD). On the age question (Subcategory 2.5) the literature is genuinely mixed and must be presented that way: Sailer and Homner 2020 actually found SCHOOL settings larger than higher-education settings; the "adults ≈ or > K-12" result is a DIFFERENT meta-analysis (Kim et al. 2021 behavioral change, ES 0.95 vs 0.92); a separate subgroup analysis puts College highest (~0.68); and other analyses find educational level is not a significant moderator, all under very high heterogeneity. So the only defensible claim is "gamification works for adults, and design quality dominates age," NOT "adults benefit more." The andragogy/SDT mechanism is theory, not effect-size evidence. The two "features that hurt learning" sources (gamification misuse; negative-effects systematic mapping) are as provided by the team; confirm exact titles/DOIs and effect directions against the primaries before a mentor presentation. The Category 1 (city-building) and Category 3 (resource-loop) sources are game-design writing, not peer-reviewed; they are reliable as descriptions of genre patterns, not as efficacy evidence, and I have not independently re-verified them. Design-teardown sources (Duolingo, White vs Black Hat) are practitioner analyses; their engagement percentages (25% DAU, 15% completion) are vendor-reported and used only directionally. The 2024 BJET autonomy/competence study is cited secondhand; locate the primary before quoting. Category 4 (retrieval and spacing) is newly added to consolidate the memory-retention material: Karpicke and Blunt 2011 (Science), Roediger and Karpicke 2006 (Psychological Science), Cepeda et al. 2006 (Psychological Bulletin), and Rohrer and Taylor 2007 (Instructional Science) are the canonical primaries for the testing effect and the spacing/interleaving effect; the general directions (retrieval beats restudy, spacing beats massing, both hold for math) are well established, but reconfirm each citation and any specific figure against the primary, and if the original capstone Category 6 cited different retention sources, reconcile the two before the mentor presentation. The churn and heterogeneity material that previously lived here has moved to the companion product and diagnostic BrainLift, where it belongs with the remedial-market thesis. SPOVs are the team's positions, argued from this evidence, not claims of settled fact.*
