> **SUPERSEDED (2026-07-30).** Consolidated into the reviewer-ready [BrainLift_Game_Design.md](BrainLift_Game_Design.md) (mechanic evidence and ranked feature set). Kept for history; do not edit or send.

# Gamification Research + Feature Recommendations

*Deep-research synthesis on how educational apps gamify and what actually works, then a ranked feature set for our city-builder (each knowledge-graph node = a building the learner constructs by mastering that skill; underprepared / math-anxious audience; accuracy-based monotonic mastery; cooperative-only; checkpoint "storms"). Effect sizes are Hedges g or Cohen d unless noted. Confidence tags: [STRONG] peer-reviewed meta-analysis/RCT, [MIXED] contested or single-study, [WEAK] vendor/blog only. No em dashes.*

## The one finding that should drive every decision

**Gamification reliably raises engagement and motivation, but its effect on actual learning is small and depends entirely on the underlying pedagogy, not the mechanics.** The cleanest demonstration: a meta-analysis of gamified cognitive training found engagement up (g = 0.72) while learning did not move at all. [STRONG] Across the credible education meta-analyses the learning-outcome effect clusters at **g ≈ 0.46 to 0.50** (Sailer & Homner 2020 cognitive g = 0.49; Bai/Hew/Huang 2020 g = 0.50; Huang et al. 2020 g = 0.46), and a 2023 SDT meta-analysis found gamification lifts intrinsic motivation, autonomy, and relatedness but has **minimal impact on competence** (actual skill). So the design rule is: gamification's job is to get the anxious learner to keep showing up; the learning has to come from the mastery loop, spacing, and feedback underneath. Points on a bad lesson do nothing.

## What the evidence says, mechanic by mechanic

**Progress visualization (progress bars, the visible artifact).** [STRONG on engagement, MIXED on learning] Ranked the single most effective element for learning motivation in a 10-element comparison. Mechanism is the goal-gradient effect (effort accelerates as a goal nears) plus endowed progress (a head-start raised task completion 19% to 34% in the classic study). This is the mechanic our city-builder is natively built on: the city IS the progress bar.

**Spaced repetition / retrieval practice.** [STRONG] The most durable-retention lever in the whole review, and it is a *learning* mechanic, not a motivational one. Math-specific spacing effect g ≈ 0.28; retrieval practice beats rereading and concept-mapping for long-term retention and transfer (Karpicke & Blunt 2011). Gamification drives usage; spacing is what converts usage into retention. Pair them.

**Immediate feedback.** [STRONG, with a twist] Feedback is among the strongest learning levers, but a 2026 meta-analysis found feedback *timing* (immediate vs delayed) has no significant average effect (g = 0.03). So: give feedback, but the immediacy is a UX/anxiety choice, not a learning-critical one. Elaborated feedback (why it is wrong) beats mere correctness, and math benefits more than most subjects.

**Goals / quests.** [STRONG] Locke & Latham goal-setting is one of the most replicated findings in the review (d ≈ 0.42 to 0.80): specific + moderately challenging goals beat "do your best." Failure mode that matters for our population: goal *failure* lowers affect, self-esteem, and motivation, so quests that are too hard or punish failure backfire.

**Levels / progression.** [MIXED] Motivation gains are consistent but emerge over time, not immediately; several studies show no achievement effect from levels alone. Understudied (appears in ~17% of studies). Useful as scaffolding structure, not as a learning driver.

**Narrative / world-building.** [MIXED] Counterintuitively, the anchor meta-analysis found narrative did NOT move motivational or cognitive outcomes, only behavioral ones. But narrative co-occurs with *reduced anxiety* in language learners, which matters for our audience. Treat as anxiety-lowering flavor, not a learning lever.

**Avatars / customization.** [MIXED] Strong on engagement/presence, modest on learning. One useful nuance: simple abstract avatars work better than elaborate ones during failure states. Ranked among learners' least-favored elements, so low priority.

**Badges.** [MIXED] Badge-only SMD ≈ 0.33; only works when tied to real performance/quality, and the effect fades with novelty. Reinforces extrinsic motivation, which is a risk (see overjustification).

**Points / XP.** [MIXED to WEAK] The weakest-effect element on its own. Fine as a substrate, dangerous as the point of the app. The overjustification meta-analysis (Deci, Koestner & Ryan 1999, 128 experiments) found expected tangible/contingent rewards *undermine* intrinsic motivation (d = -0.28 to -0.40). Critical escape hatch: the same reward framed as *informational competence feedback* (not as payment for doing the task) does NOT undermine and can help.

**Virtual economy / currency / resources.** [MIXED] Consistent finding: boosts engagement but NO significant effect on intrinsic motivation or achievement, and can crowd out intrinsic motivation. Among the least-favored elements. Keep cosmetic and light if used at all.

**Streaks.** [WEAK evidence, real risk] Strong *usage* retention via loss aversion (Duolingo's own A/B: Day-7 retention lift), but the learning-outcome evidence is vendor-only, and the documented failure mode is "streak anxiety" and "performative learning" (logging in to save the streak, not to learn). For a math-*anxious* audience this is the highest-risk motivational mechanic. If used, the evidence says *mercy* design (freezes, repair, no catastrophizing) actually improves retention AND lowers anxiety; punishment is a dark pattern.

**Leaderboards / competition.** [STRONG negative for our population] This is the clearest "avoid" in the whole review. Leaderboards demotivate consistent low-rankers, harm self-esteem of the bottom ranks, one longitudinal study found they *lowered* exam scores, and competition raises rather than lowers anxiety. Trait-competitiveness moderates it (helps some, harms others). Absolute leaderboards are worst; if any comparison is used, it must be relative/near-peer. Our no-competitive-leaderboard decision is directly supported.

**Variable / random rewards.** [STRONG mechanism, dark-pattern risk] Potent for compulsive usage (same mechanism as slot machines), and disproportionately affects ADHD/anxiety-prone users. This is the mechanic to consciously NOT weaponize.

## The audience constraint (why the above tilts the way it does)

Our learners are underprepared and math-anxious, and the mechanism evidence is specific: math anxiety impairs performance by consuming working memory (Ashcraft & Kirk 2001), and the deficit shows up specifically under **time pressure**, not on untimed tests (Ashcraft & Krause 2007) [STRONG]. That single finding is the strongest argument against timers on anything that feeds mastery. Self-Determination Theory then predicts which mechanics sustain this population: satisfy **autonomy** (meaningful choice), **competence** (informational feedback, self-paced mastery), and **relatedness** (cooperative/team), and avoid controlling/comparative mechanics. Growth-mindset framing has a large national RCT showing gains concentrated among low-achievers (Yeager et al. 2019) [STRONG, magnitude contested].

---

## Feature recommendations for the city-builder

Ranked by evidence strength x fit. "Build" = do it; "Careful" = do it with the guardrail named; "Avoid" = evidence says it harms our population.

### BUILD (high evidence, strong fit)

1. **The city as the progress bar (the artifact IS the visualization).** Our core metaphor is the single best-evidenced motivational mechanic. Make node mastery produce a visible, permanent building; make the neighborhood visibly fill in. This is goal-gradient + endowed-progress + visible-artifact progress all at once. Lean into it hard: this is our strongest research-backed feature and we already have it.
2. **Endowed / head-start progress.** Seed the city from the diagnostic so the learner never starts at zero (endowed-progress raised completion 19% to 34%). A student who places into a half-built city has momentum; an empty lot is a cold start. We already do this via placement_estimate; the research says protect it.
3. **Informational feedback, not reward feedback.** Frame every building-completion and mastery signal as "here is what you now can do" (competence information), never as "you earned 50 coins for that." This is the SDT escape hatch from the overjustification effect: same event, framing determines whether it helps or harms intrinsic motivation.
4. **Spaced retrieval baked into the loop.** The durable-learning mechanic. Our post-MVP `review_due` nudge should be a first-class feature, not an afterthought: buildings that resurface a skill for a light retrieval check at expanding intervals. This is what converts engagement into retention; without it the gamification is hollow.
5. **Specific, moderately-challenging per-node goals.** Each building is a concrete goal ("master signed-number arithmetic"), which is exactly the Locke & Latham prescription. Keep the challenge moderate and NEVER punish failure (goal-failure demotivates); a not-yet-built building should read as "next," not "failed."
6. **Cooperative / relatedness features only.** Shared city goals, co-op neighborhood builds, or a class building something together. SDT relatedness is one of the two needs gamification actually moves, and cooperative designs are the documented safe alternative to competition for anxious learners.
7. **Growth-mindset framing throughout.** Buildings "under construction," skills you are "still building," effort-and-progress language. The one intervention with RCT evidence of helping low-achievers specifically.

### CAREFUL (works only with the named guardrail)

8. **Streaks / daily engagement, mercy-designed only.** Powerful for the retention we need, but streak anxiety is the top risk for a math-anxious audience. Guardrail: freezes, easy repair, compare-to-your-own-past not to a target, and never catastrophize a missed day. The evidence says lenient streaks retain *better* AND lower anxiety, so this is win-win if done gently. If in doubt for the MVP, defer it.
9. **Resource economy tied to question types (the mentor idea).** Fine as engagement texture and it enriches the city, but the evidence says virtual currency does not move learning and can crowd out motivation. Guardrail: keep it cosmetic (customize the city), never gate learning behind resources, and frame earning as competence feedback. Different building types per answer-type is good *variety*; resources as *currency* is the part to keep light.
10. **Levels / neighborhood progression.** Use as scaffolding and difficulty structure (progressive unlocking supports flow), but do not expect it to drive learning on its own, and make sure "locked" content reads as "not yet," not "you failed to unlock."
11. **Adaptive difficulty toward perceived progress.** Match challenge to skill (flow), but the EEG finding is that the real driver is *perceived learning progress*, so tune difficulty to keep the learner visibly advancing, not just to keep it hard. Never add a timer to do it.

### AVOID (evidence says it harms our population)

12. **Competitive leaderboards / public ranking.** Directly demotivates low performers, harms self-esteem, raised anxiety, and one study lowered exam scores. Our no-leaderboard decision is correct; keep it.
13. **Timers on mastery-bearing tasks.** The single strongest audience-specific finding: math-anxiety deficits appear specifically under time pressure. The one caveat is that our "storm" is a *game* moment, not a test, so a timed storm can survive IF it is framed as low-stakes fun and never gates mastery. Keep timing out of lessons and the diagnostic entirely.
14. **Variable / random reward schedules.** The clearest dark pattern, disproportionately harmful to anxiety-prone users. Keep rewards predictable and earned.
15. **Points/XP as the headline.** Fine as a quiet substrate, but do not make accumulating points the point; that is the overjustification trap and the weakest-evidence mechanic.

## The through-line for the team

Our city-builder is, by luck or good instinct, built around the *best-evidenced* mechanic (visible artifact progress) and avoids the *worst* one for our audience (competition). The research says the two highest-leverage additions are both pedagogical, not decorative: **spaced retrieval** (so engagement becomes retention) and **informational-feedback framing** (so our mastery signals help rather than crowd out motivation). Everything else is texture. Do not let points, currency, or streaks become the product; they are there to get an anxious student to open the app, and the learning has to be waiting when they do.

---

*Evidence-quality notes (project citation standard): effect sizes g ≈ 0.46 to 0.50 (learning), the cognitive-training engagement-vs-learning split (g = 0.72 engagement / null learning), overjustification (Deci/Koestner/Ryan 1999, 128 experiments, d = -0.28 to -0.40), spacing (math g ≈ 0.28), endowed progress (19% to 34%), and the Ashcraft working-memory/time-pressure mechanism are all peer-reviewed and cross-corroborated. Streak retention figures and most construction/progress "engagement +X%" numbers are vendor/blog sourced and are used only directionally, not as citable statistics. Bloom 2-sigma and Boaler's causal timed-test claim are flagged as contested in the source notes; the correlational working-memory mechanism is the solid version. Before quoting any single number to a mentor, reconfirm it against the primary source per our standard.*
