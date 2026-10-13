# What a caught-up learner's vitality panel reads once the crowd arrives with the city

Four frames at **1024x580**, the product lead's own window, taken through the real
`CitySurface` over a real `createCityDevSession` after a real catch-up. The reasoning behind
every figure is
[`docs/superpowers/specs/2026-08-04-a-caught-up-city-has-its-people.md`](../../superpowers/specs/2026-08-04-a-caught-up-city-has-its-people.md).

**The frames are the whole window rather than the panel**, on
`.cursor/rules/qa-verification.mdc`'s rule: *"cropped to the element that changed, a screenshot
proves nothing about occlusion: the element is the one part of the picture nobody doubted."*
The claim under test is that a learner arriving at this city reads figures matching what they
can see, and the island is half of that sentence. Each `.png` has a `.json` beside it carrying
the figures and the seated counts, so the caption cannot drift from the frame.

## ⚑ Two of these were RE-TAKEN, and the re-take is the interesting part

The first set was shot against #558
as it stood mid-flight, when the civic seeding ran at the diagnostic's **hand-off** — before
any founding had grown the island. A deep placement seated 1 of 24 inherited civic buildings,
so the two deep frames arrived in the **departure warning** with zero amenity coverage against
a crowd a hundred strong, and this file blamed the then-open
#544 for the disc.

Both halves have since closed. #544 landed, so the disc follows the drawn land; and #558's
FINAL form seeds each age's civics **as that age is founded**, so the island with room for them
is the one that founding grew. Re-measured on the merged tree, at the same 1024x580:

```
                   FIRST SET (mid-flight #558)          RE-TAKEN (merged tree)
one age    ( 6 civics)  44 people ·  152 ·  44 of  44   44 people ·  152 ·  44 of  44 · Content
two ages   (12 civics)  73 people ·  152 ·  40 of  74   74 people ·  312 ·  74 of  74 · Content
four ages  (24 civics) 103 people ·  152 ·   0 of 134  134 people · 1032 · 134 of 134 · Content
era one    (control)     8 people ·   28 ·   0 of   8    8 people ·   28 ·   0 of   8 · unchanged
```

**So the honest read this file used to carry is retired rather than restated.** It said *"at
two and four it still reads wrong, and I am not going to claim otherwise"*, and *"the '31 people
have left' in the medieval frame is another lane's to remove"*. Nobody is leaving in any
re-taken frame: the shortfall that tripped the threshold was the unseated civics, and seeding
them age by age closed it. **Only the two deep rows moved**, and the two figure sets that
should not have are `.json`-identical — which is the floor under the claim that this re-take
measured the seeding change rather than something else.

**All four PNGs did change, and not for a reason in either lane.** Trunk moved twice while
this was open, so the frames are of the second tree and say so: #566 removed the grid drawn
over the island's middle, #603 and #604 changed art and the dev hatch's moment list, and #619
retired *"Wants more to do"* as the happiness row's low band. That last one is the only one
that reaches a FIGURE — the control's band now reads *"Your people are unhappy!"* — and it is
in `cold-start-at-era-one.json` rather than only in this prose, so nothing here can go on
quoting copy the product has stopped printing.

The seated counts here are also the ones
`catchup/inheritedCivicsSeatedAtTheFounding.test.tsx` measures off the shipped surface, so a
replay that drifted from the product would photograph a failure rather than a different city.

| file | what it shows |
| --- | --- |
| `caught-up-to-neolithic-1024x580.png` | One age handed over, the placement the shipped island serves whole (6 of 6 skills, 6 of 6 civics): **44 people · 152 sustained · room for 108 more · 44 of 44 · Content**, under a mastery meter reading `0/11`, with *"The city arrived with its crowd, and 6 of its skills are still waiting for a first practice set."* |
| `caught-up-to-bronze-age-1024x580.png` | Two ages, 11 of 11 skills and **12 of 12** civics: **74 people · 312 sustained · room for 238 more · 74 of 74 · Content**, and the same note over 11 unpractised skills. |
| `caught-up-to-medieval-1024x580.png` | Four ages — the deep case both changes are for. 21 of 21 skills and **23 of 24** civics: **134 people · 1032 sustained · room for 898 more · 134 of 134 · Content** over `0/26` mastered, with the note naming 21 skills still waiting. The crowd matches the skyline and the panel agrees with it. |
| `cold-start-at-era-one-1024x580.png` | The control. A learner who started normally inherits nothing and reads **8 people · 28 sustained · room for 20 more · 0 of 8 · "Your people are unhappy!"**, with **no arrival note** — which is what makes "nothing here touches an ordinary start" a measurement rather than a promise. Every figure is the pre-change control's; the band is #619's rename of the string that used to read *"Wants more to do"*. |

**Neither half of this reads right alone**, which is the reason the two changes were
reconciled rather than merged in sequence and patched afterwards: without the seeding the crowd
arrives to no amenities, and without the crowd the seeding furnishes a city holding eight
people. The margin that survives even together — 898 spare at four ages — is not a defect
either: the civics are seeded to the era's capacity TARGET (`3 x 20 x 2^(N-1)`, what a
played-through city buys) while the crowd is the era's population. Scaling the seeding to the
crowd instead is the inheritance record's §5 option B, and it is the lead's call.

The predecessor set, [`docs/design-refs/caught-up-vitality/`](../caught-up-vitality/), is the
same window with the seeding and no crowd, and carries its own `with-567-*` pair showing the
combination from the other change's side. The figures in that pair and the ones here were
measured independently and agree.

## What the frames do not show

The dev-only *"Replay onboarding"* panel in the top right is `CitySurface`'s own dev chrome and
is not on a learner's build. It is in the predecessor set's frames for the same reason and is
left in rather than cropped, because cropping is the substitution this file's own rule warns
about.

A **suspended** civic building is not in any of these. That state is
#584's and has its own frames at
[`docs/design-refs/suspended-civic/`](../suspended-civic/); how it composes with the crowd is
asserted in `apps/web/src/city/caughtUpCityWithASuspension.test.ts` rather than photographed,
because the claim there is arithmetic (which capacity falls, by how much, and that the
headcount does not) rather than spatial.

Regenerate with

```sh
npx vitest run --config vitest.browser.config.ts \
  apps/web/src/city/caughtUpCrowdShots.browser.test.tsx
```

which writes to the gitignored `.qa-frames/caught-up-crowd/`. The copies here were put in by
hand, so a plain `npm run check` never rewrites them
(`test/testWritesStayOutOfTheTree.test.ts`).
