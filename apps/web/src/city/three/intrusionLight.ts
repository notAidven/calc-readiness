import type { CrisisAtmosphere } from "./crisis/atmosphere";
import { INTRUSION_SCENE_TONES } from "./intrusion-tones";

/**
 * **ERA NINE'S WEATHER, AND IT IS THE ONLY THING IN THIS PAIR OF FILES THAT WAS CHOSEN.**
 *
 * `intrusion-tones.ts` is the palette and every number in it is QUOTED — from `$ERA9` in the
 * plate generator, or from a hex the prompt sheet writes out, or from one of those through a
 * stated arithmetic. This file is the other kind of number: `era-09-intrusion.md` §2.1 gives the
 * atmosphere as a table of DIRECTIONS — *"down substantially"*, *"cooler, dimmer"*, *"pull the
 * far plane in a little"* — and a direction is not a number. **Eight of the values below are
 * judgements this file made, and each is flagged `⚑ CHOSEN` at its own field with the word the
 * brief actually used**, so a reviewer can overrule a guess without having to work out which
 * were quoted.
 *
 * ## WHY IT IS A SEPARATE FILE FROM THE TONES
 *
 * Because two agents are writing about era nine's palette at once and one of them owns the
 * table. `intrusion-tones.ts` arrived from that lane; this is the half it does not carry, and
 * keeping them apart means the table can be taken wholesale rather than merged line by line.
 * The one dependency runs this way — the hemisphere's ground colour is the paving, read from
 * there rather than repeated.
 *
 * **The two derivations agreed, which is worth recording.** This lane derived era nine's palette
 * independently from `$ERA9` before that file existed, and every overlapping value came out
 * identical: the body, the glass accent, the paving and its deep cut, the kerb, the sky, the
 * haze, the water, the void, the cover face, the collar, the barrier rail and its post. Two
 * independent reads of one source agreeing is a stronger claim about the source than either
 * read on its own.
 *
 * Nothing here imports `three`, which is `winterTones.ts`'s rule and the reason both files are
 * plain numbers: they are reached from a surface's static import graph, and pulling the renderer
 * into that graph is the cost the lazy surface exists to avoid.
 *
 * ## LATE, FLAT AND COLOURLESS
 *
 * §2's requirement is *"from a still frame with no UI, a player can tell something is wrong"*,
 * in the hardest case of the nine, because **era nine's crisis is invisible by design**. Nothing
 * burns, nothing arrives, nothing falls over.
 *
 * **Why not night**, which is the one decision the brief argues rather than tabulates: *"a dark
 * scene would make era nine's lit panels look wonderful and it would be a lie: those panels
 * light nothing, so a night scene would have bright rectangles floating in blackness with no
 * falloff anywhere, which reads as broken rather than as atmospheric."* So this is a dimmed late
 * afternoon, and every number is sized to leave the emissive panels something to be brighter
 * than.
 *
 * ## THE LEVER ERA NINE DRIVES THAT NEITHER OF THE OTHER TWO DOES
 *
 * **The key goes DOWN in elevation.** Era one raises its key to about 53 degrees and era four to
 * about 77, both above the fair-weather rig's 47; era nine asks for *"low and flat, long soft
 * shadows across a precise floor"*, which resolves to about 35. That is the first time the angle
 * control has been driven below the shipped rig, and it is worth naming: a field only ever driven
 * one way is a field whose range nobody has tested.
 */
export const INTRUSION_LIGHT = {
  /**
   * ⚑ CHOSEN. The brief names no exposure. Era one pulls the top end down to 0.92 for an
   * overcast sky and era four pushes it to 1.06 for a hot noon; era nine is a dimmed late
   * afternoon, so this sits just under neutral and leaves the panels the top of the range.
   */
  exposure: 0.96,
  /**
   * QUOTED, from the era's own palette. *"A flat cool grey, slightly darker than the other
   * briefs' skies. No horizon warmth."* — which is `SKY_LATE` exactly, and it is darker than era
   * one's `#dce0de` and era four's `#e8f1f7` as the brief asks.
   */
  sky: INTRUSION_SCENE_TONES.SKY_LATE,
  /**
   * Colour QUOTED (*"match"* the sky, so `HAZE`). ⚑ CHOSEN ratios: the brief says only *"pull
   * the far plane in a little"* from the fair-weather 3-to-20. The near plane stays where fair
   * weather has it, because era nine wants the town legible; the far plane comes in to 14, which
   * is 420 world units against a worst-case view distance of about 259 at full zoom-out — so the
   * world beyond the town goes indistinct and the island never does.
   */
  fog: { color: INTRUSION_SCENE_TONES.HAZE, nearRatio: 3, farRatio: 14 },
  /**
   * ⚑ CHOSEN sky and intensity (*"cooler, dimmer"*, *"down"* from 0.95). The GROUND is quoted
   * and is the one hemisphere value that is not a judgement: a hemisphere light's second colour
   * is the colour the ground actually is, and era nine's paving is `PAVING`. The brief calls it
   * *"cool pale stone"*; era nine's own floor is neither cool nor pale, and this takes the era's
   * floor over the brief's adjective, because a bounce colour that is not the ground is a lie the
   * renderer tells every frame.
   */
  hemi: { sky: 0xc3ced5, ground: INTRUSION_SCENE_TONES.PAVING, intensity: 0.66 },
  /** ⚑ CHOSEN. *"Down and cold"* from `#F5EFE2` at 0.30. */
  ambient: { color: 0xccd3d6, intensity: 0.26 },
  key: {
    /**
     * QUOTED in kind: *"neutral grey. Era nine's palette is anodised grey-blue and warmth is
     * foreign to it"*. Dead neutral — red, green and blue equal — which is what *neutral* means
     * and is a claim a test can check. Era one's `#f4f7f6` and era four's `#f4f6f8` are both
     * slightly tinted; this is the first key in the registry that is not.
     */
    color: 0xeaeaea,
    /**
     * ⚑ CHOSEN. *"Down substantially"* from 1.32, but not to era one's overcast 0.58: era nine
     * still has a sun, it is just late.
     */
    intensity: 0.72,
    /**
     * ⚑ CHOSEN. *"Long soft shadows across a precise floor."* Present and long, softened a
     * little — between era one's shallow overcast 0.55 and era four's hard noon 1.
     */
    shadowIntensity: 0.82,
    /**
     * ⚑ CHOSEN, and this is the identifying lever. *"Low and flat"*: against the shipped key
     * position `[-1.5, 2.1, 1.25]` this resolves to about 35 degrees of elevation, where fair
     * weather is 47, era one 53 and era four 77. The multiplier form is `winterTones.ts`'s and is
     * load-bearing for the same reason — the rig derives light positions from the island radius,
     * so a literal would stop scaling with it.
     */
    posRatio: [1.34, 0.86, 1.34],
  },
  /**
   * QUOTED, and the brief's instruction is one word: *"keep"*. *"Era nine's buildings are flat
   * sealed planes and the rim is the only thing separating one from the next."* So this is the
   * shipped rim untouched, which era four also keeps — the two agreeing here is what the brief
   * asked for rather than a copy.
   */
  fill: { color: 0xbfdcef, intensity: 0.48, posRatio: [1, 1, 1] },
} as const satisfies CrisisAtmosphere;
