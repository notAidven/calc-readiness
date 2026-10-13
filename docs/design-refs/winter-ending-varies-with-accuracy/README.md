# The winter's last frame, at both ends of the accuracy range

Evidence for the lead's ruling of 2026-08-03: *"People shelter INSIDE the buildings that survived.
The thing you spent the crisis protecting becomes the thing that protects you."* And for the
property that made it worth doing: *"the final frame must reflect how well the player did."*

**Nothing was retuned to produce these.** They are evidence about a change, not a decision. Every
number quoted here is at **`21ddc4d0`**, which is `integration` with the three-round retune (#447)
merged: `rounds: 3`, `spread.accelerate_every: 1`, `damage.ruin_at: 1`, and no pull-backs.

## The defect, measured at the merged tip

The frost reaches the island's heart on the last beat, so by the last round almost every cell is
frozen and the few that are not are under the buildings. The first version of the sheltering code
needed standable ground that was NOT under a building, found none, and fell through to its third
tier: the permanently-clear annulus outside the board, which existed only so its claim stayed
satisfiable.

Measured on the live seven-building board with a one-round-lookahead player, people standing off
the board on each board the player is shown, **before** the change:

| closed rounds | 0 of 3 | 1 of 3 | 2 of 3 | 3 of 3 | frozen |
| --- | --- | --- | --- | --- | --- |
| 0 to 1 | 0 | 0 | 0 | 0 | 0..28 |
| **2 (the last board of the crisis)** | **28** | 20 | **28** | **28** | 70..72 |

So a player who answered 3 of 3 saw the same 28 of their 44 people out at the waterline as one who
answered 0 of 3 — and one who answered 1 of 3 saw *fewer* out than either, so more accuracy could
be worse. **After** the change, same board, same player:

| closed rounds | 0 of 3 | 1 of 3 | 2 of 3 | 3 of 3 | standing |
| --- | --- | --- | --- | --- | --- |
| 0 to 1 | 0 | 0 | 0 | 0 | 7 of 7 |
| **2 (the last board of the crisis)** | **10** | **6** | **2** | **2** | 5 / 6 / 6 / 6 |

## Which board is "final", and why it is not the one after the last round

`WinterInCity`'s bridge thaws the rows the instant the phase is `"ended"`, `shelterGround` reads a
thawed board as an ordinary day, and the crowd comes home — which is what the ruling asked for
under *"coming back"*. So **the last board a sheltering crowd is ever drawn on is the one the final
round is played on**, and frames 01 to 08 are of that. Frames 09 and 10 are the island the outcome
panel is really shown over, and the pair where *"a run that saved most buildings and a run that
saved none"* is literally true.

**What the thaw costs this, said plainly.** The strongest crowd contrast the arithmetic can produce
is on the board after the last round — 44 / 36 / 18 / 10 out, because at `ruin_at: 1` and three
rounds most of the loss lands on the final beat — and nothing renders it. So the crisis's crowd
carries the variation up to the last round, and the island the player is left with carries it in the
**ruins**, which persist. Both vary with accuracy; they vary in different channels.

## How the state was reached

Era one's island as the city's own placer builds it, seven buildings including the hall, played by
one-round lookahead — the same policy `hard-winter-layouts.test.ts` tunes against — at 3 of 3 and at
0 of 3. The two frames of a pair differ in the answers and nothing else. The board in each frame is
the board `hardWinterView` projects and the crowd is the crowd `citizenPlaces` stages from it.

`apps/web/src/city/three/winterEndingShots.browser.test.tsx` holds them, and its always-on half
asserts the state the frames are of. Regenerate with `VITE_WINTER_SHOTS=1 npm run test:browser`.

## What each one is

Every frame is at **1024x580** under `reducedMotion`, and the viewport is in the filename because a
frame whose viewport is unstated says nothing about anybody's screen. Each pair shares one camera.
The frames are named by ACCURACY rather than by outcome, because at three rounds a 0-of-3 player
still has five of seven buildings on the last board of the crisis.

| pair | file | what it shows |
| --- | --- | --- |
| whole island | `01-answered-3-of-3-whole-island` | Six standing, one wrecked, and two people out on the ring. |
| | `02-answered-0-of-3-whole-island` | Five standing, two wrecked, and ten out on the ring. |
| settlement | `03-answered-3-of-3-settlement` | Close enough that the doorway knots are figures: tan clusters tight along the plot edges. |
| | `04-answered-0-of-3-settlement` | The same ground with the Tower wrecked and nobody at it. |
| the ring | `05-answered-3-of-3-at-the-ring` | **The clearest pair of the set.** The settlement top-right with knots at its walls; **one** figure out on the ice at bottom-left. |
| | `06-answered-0-of-3-at-the-ring` | The same camera, one more wreck, and a knot of **five** out on the same ice. |
| one doorway | `07-answered-3-of-3-at-a-doorway` | The largest building that survives a flawless winter and falls in a failed one, standing, with its crowd along its plot edge. |
| | `08-answered-0-of-3-at-the-same-door` | The same building, the same camera: rubble with nobody at it. |
| after the thaw | `09-after-the-thaw-answered-3-of-3` | The island the player is left with: the frost gone, the crowd back out among the buildings, two ruins. |
| | `10-after-the-thaw-answered-0-of-3` | The same, with **seven** ruins and no building left — the people came back to nothing. |

## The honest read: is the good ending SAFE, or merely EMPTY?

The lead asked for this to be answered by looking rather than by measuring, and flagged emptiness as
a real risk of the design. Five things, and the third and fifth are the ones worth arguing about.

**1. The pair genuinely differs, and the ring pair is where it reads best.** 05 against 06 is
legible without hunting: one figure out on the ice against five, and one wreck against two, at the
same camera. That is the contrast the ruling asked for and it is delivered.

**2. The good ending is not empty of people.** There are figures in 01, 03, 05 and 07 — tan clusters
pressed tight along the plot edges of the buildings that survived. So "a frame with nobody in it"
did not happen.

**3. But what carries "safe" in the good frame is the BUILDINGS, not the people.** A sheltered
citizen stands a third of a unit over the plot boundary, so most of a 1.3u figure is behind the wall
it is sheltering against, and era one's hide tunic is a tan that sits close to the tan of the plot
ground it stands on. At the settlement framing they read as a knot of people; at the whole-island
framing they are two or three pixels and read as texture. So the "at a glance" difference between 01
and 02 is carried by the wrecks, and the crowd is confirmation rather than the signal. That is a
fair description of the ceiling this design has at the shipped citizen size, and the ceiling is not
new — `citizensInTheWinterShots` records the same limit for the crouch and the shiver.

**4. The crowd is markedly MORE visible after the thaw than while sheltering**, which is inherent
rather than a bug: 09 and 10 are full of figures spread across open ground, because that is what
coming home looks like. Sheltering compresses forty-four people into a few wall lines and puts most
of each figure behind a wall. Anyone comparing 05 and 09 will read the sheltering frame as the
quieter one, which is correct — but it does mean the crisis frames are the ones that most need the
figures to be legible and the ones where they are least so.

**5. THE ABSOLUTE NUMBERS ARE SMALL AT THIS TUNING, and that is the honest headline.** Ten people on
the ring against two is a 5x difference and eight figures. It is legible in 05 against 06 because
they are in one knot on plain ice; it is nearly invisible in 01 against 02. The cause is not the
capacity rule — two per plot cell is the value that spreads the bands widest, and three or four put
nobody on the ring at all on any board the player sees — it is that at `rounds: 3` and `ruin_at: 1`
the settlement is still nearly whole on the last board a crowd is drawn on. If this reads as too
quiet, the lever is the thaw's timing rather than the shelter model: holding the crowd where the
winter left them until the player LEAVES the encounter would put 44 against 10 on the outcome
frame instead of 10 against 2 mid-crisis. That is a change to a shipped ruling (*"the non-damaged
tiles / general environment revert to how they were before"*) and to the instruction in this
ruling, so it is not taken here — it is written down as the one dial that would make this loud.

**What I did not do about item 3, and why.** The two levers are citizen SIZE and citizen TONE, and
both are live in another agent's lane (#464, #467 and #468 are open on one citizen size). The lever
that IS in this change — how far over the threshold a sheltered citizen stands — is already at the
shallowest value that is still indoors: at `SHELTER_DOORWAY_DEPTH` of 0.33 a body spans 0.05u to
0.61u inside the plot against a contain-fit mesh face at 0.2u, so pushing it further out would put
the crowd back on the open ground the ruling objected to and buy about a third of a unit.

**And one hole the frames found.** The lee wall is chosen by where the frost is (`leeBearing` takes
the bearing away from the nearest cold cell) and nothing about it consults the camera, so when the
lee face is the one turned away from the viewpoint a building's own roof covers its crowd. On a
settlement of several buildings the knots land on several faces at once and some are always in
shot — but a single-building settlement can photograph with no visible crowd at all. Choosing
between two equally sheltered faces by which is more open to the current camera would cost nothing
mechanically, and it is deliberately not in this change: the crowd's position is currently a pure
function of the board, and making it a function of the camera as well is a design decision.

## One respect in which these are not the shipped scene, named rather than hidden

**The storm roof is off.** At the merged tip a raised shield draws geometry that covers the whole
building rather than its roof, which is the defect open PR #465 exists to fix. Measured on this set:
with `winterShieldedNodeIds` wired through, the surviving settlement photographed as featureless
brown slabs with every doorway underneath them — a picture of that bug rather than of this change.
Everything else is the scene's own dressing, through `crisisDressing`, which is why the wrecks wear
`lost` badges and the threatened survivors wear chevrons instead of mastery stars.
