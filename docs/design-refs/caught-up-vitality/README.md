# What a caught-up learner's vitality panel reads, once the civics are seeded age by age

Six frames at **1024x580**, the product lead's own window, taken through the real `CitySurface`
over a real `createCityDevSession`. The reasoning behind every figure in them is
[`docs/superpowers/specs/2026-08-04-what-a-caught-up-city-inherits.md`](../../superpowers/specs/2026-08-04-what-a-caught-up-city-inherits.md).

**The frames are the whole window rather than the panel.** `.cursor/rules/qa-verification.mdc`:
*"cropped to the element that changed, a screenshot proves nothing about occlusion: the element
is the one part of the picture nobody doubted."* The claim under test is not that the panel
renders a number — it is that a learner arriving at this city reads figures matching what they
can see, and the island is half of that sentence.

## The seeding on its own

| file | what it shows |
| --- | --- |
| `caught-up-to-neolithic-1024x580.png` | One age handed over. 6 skill buildings, **6 of 6** inherited civics: *8 people · 108 sustained · room for 100 more · 8 of 8 · Content*. |
| `caught-up-to-bronze-age-1024x580.png` | Two ages. 11 skills, **12 of 12** civics: *8 people · 268 sustained · room for 260 more · 8 of 8 · Content*. |
| `caught-up-to-medieval-1024x580.png` | Four ages — the deep case the change is for. 21 skills, **23 of 24** civics: *8 people · 988 sustained · room for 980 more · 8 of 8 · Content · "Everybody is sustained, and an amenity reaches all of them"* over **0 of 26 mastered**. |
| `cold-start-at-era-one-1024x580.png` | The control. A learner who started normally inherits nothing, and this frame is unchanged: *8 people · 28 sustained · 0 of 8 · "Wants more to do"*. |

**⚑ THAT LAST CHIP HAS BEEN REWORDED SINCE THE FRAME WAS TAKEN.** The product lead replaced the
`restless` band's label on 2026-08-04 and the cold-start frame is the one place in this set it
appears; the row reads *"Your people are unhappy!"* in the tree now (`RESTLESS_LABEL` in
`CityVitalityPanel.tsx`). Nothing else in these frames or their figures moved, so they are
re-taken with the next change to this area rather than for one word.

**The unhappiness state is gone and the amenities are real** — that is what the seeding was for,
and the deep frame is a full island rather than a bare one. **And the panel still does not read
correctly on its own**, for the reason
#567 exists: the crowd is 8 against a
capacity of 988, so the notch sits at the far left of the livability track under the figure *"988
sustained"*, and the settled note congratulates a city built for a thousand and holding eight.

## The same cities with #567's population in the tree

Measured by checking out #567's five source files over this branch, shooting the frames, and
reverting them — this branch contains none of that work.

> **⚑ 2026-08-05: re-shot for real, and the figures below are unchanged.** This change
> squash-merged as `25bcbdfd`; #567 then merged trunk and #584 and re-shot the pair through the
> shipped surface with the walk's real per-founding seeding, at the same 1024x580. Both rows
> below matched digit for digit. The frames of the merged tree live at
> [`docs/design-refs/caught-up-crowd/`](../caught-up-crowd/) — this pair is kept as the
> five-file substitution it was, because it is what made the case for merging the two lanes
> rather than shipping either alone.

| file | what it shows |
| --- | --- |
| `with-567-caught-up-to-medieval-1024x580.png` | Four ages: **134 people · 1032 sustained · room for 898 more · 134 of 134 · Content**, and the note reads *"The city arrived with its crowd, and 21 of its skills are still waiting for a first practice set."* |
| `with-567-caught-up-to-bronze-age-1024x580.png` | Two ages: **74 people · 312 sustained · room for 238 more · 74 of 74 · Content**. |

**This pair is the one that reads correctly**, and neither half gets there alone: without the
seeding #567 has a crowd and no amenities, and without #567 the seeding has amenities and no
crowd. What is left over even together is the *margin* — 898 spare at four ages — because the
civics are seeded to the era's capacity TARGET (`3 × 20 × 2^(N-1)`, what a played-through city
buys) while the crowd is the era's population. Scaling the seeding to the crowd instead is §5's
option B in the record, and it is the lead's call rather than this change's.

Regenerate with

```sh
npx vitest run --config vitest.browser.config.ts \
  apps/web/src/city/caughtUpVitalityShots.browser.test.tsx
```

which writes to the gitignored `.qa-frames/caught-up-vitality/`. The copies here were put in by
hand, so a plain `npm run check` never rewrites them
(`test/testWritesStayOutOfTheTree.test.ts`).
