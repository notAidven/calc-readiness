# The CITY LIFE explainers, photographed in a running build

Taken with `output/city-life-explainer-shot.mjs` against `npm run dev` on `?mock&paths`
(a fully mastered era-one city with an eighteen-tile path network: 44 people, sustains 72,
an amenity reaches 27 of them).

**Viewport 1024x580, `prefers-reduced-motion: reduce`.** Both are named because both are
half the evidence: a tooltip's claim is spatial, and a comfortable developer viewport
flatters exactly the claim being made.

The two dev-only hatches that sit over this corner (`.catchup-skip` and `.ob-replay`, each
of which prints *"Dev only, not on the learner build"* on itself) are collapsed and removed
before anything is photographed. The catch-up one sits directly on top of the
era-completion capsule, which is the element the occlusion question is about.

## The frames

| File | What it shows |
| --- | --- |
| `00-no-hover-1024x580.png` | The resting cluster. Three question-mark triggers, one per row. |
| `01-population-whole-screen-1024x580.png` | Population open, whole screen. |
| `02-population-cluster-1024x580.png` | Population open, the top-left cluster. |
| `03-livability-whole-screen-1024x580.png` | Livability open, whole screen. |
| `04-livability-cluster-1024x580.png` | Livability open, the top-left cluster. |
| `05-happiness-whole-screen-1024x580.png` | Happiness open, whole screen. |
| `06-happiness-cluster-1024x580.png` | Happiness open, the top-left cluster. |
| `07-livability-by-keyboard-1024x580.png` | Opened by FOCUS with no pointer on the panel; the focus ring is on the trigger. |

The cluster crops are 540x380 from the top-left corner, framed to include the era-completion
capsule and both other rows rather than cropped to the bubble. A crop of the bubble alone
would prove nothing about occlusion: the bubble is the one part of the picture nobody
doubts.

## What the frames answer

**Nothing in the HUD is behind a bubble.** The capsule ends at x=246 and the panel ends at
x=246; every bubble starts at x=249 and is 232 wide. So the era-completion bar
(`MASTERED 6/6` and its meter), the `Checkpoint ready` flag, and all three CITY LIFE rows
are readable with any one of the three open. The script prints the boxes beside each frame,
but the frames are what the claim rests on.

**One at a time.** Hovering a row closes whatever was open, so a bubble never sits over the
row below the one it is about.

**Focus alone opens it.** `07` is taken with the pointer parked at the bottom of the screen
and focus moved to the livability trigger.

## What the bubbles said, read out of the DOM

```
POPULATION  Population counts everyone your skill buildings have brought to the island.
            Practising a skill brings people and mastering it brings twice as many again,
            while buying a building brings nobody.

LIVABILITY  Livability is how many people the city can sustain, and the crowd arrives
            whether or not there is room. Buying a civic building raises it, and the Build
            menu says how many more each one sustains.

HAPPINESS   Happiness counts how many of your people an amenity reaches, rather than how
            they feel. An amenity building reaches the most at once, and each road tile you
            lay reaches one more.
```

Every claim in those three is measured against the derivation by
`apps/web/src/city/cityLifeExplainers.test.tsx`, and each of its assertions was shown
failing before it was trusted: `node scripts/qa/city-life-explainer-injections.mjs`, 14/14
injections caught.
