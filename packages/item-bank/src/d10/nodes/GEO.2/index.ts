import { latexPi } from "../../../promptFormat";
import {
  expressionAnswer,
  type ItemTemplate,
  numericAnswer,
  type Rng,
} from "../../../template";

/**
 * GEO.2 practice templates: the measurements of a standard figure, and which of them a given
 * question is actually asking for. Five shapes across the locked 1xL1 / 2xL2 / 2xL3 mix:
 *
 *  - L1  the area of a rectangle (the measurement everything else here is contrasted with);
 *  - L2a a perimeter, including the L-shaped composite figure where the two cut edges are
 *        part of the boundary and a learner who measures the bounding rectangle misses them;
 *  - L2b the volume of a rectangular prism, the first move off the plane;
 *  - L3a the volume of a cylinder left exactly in terms of pi;
 *  - L3b the surface area of a rectangular prism, which is the shape this node most needs
 *        held apart from volume: same solid, same three numbers, a different question.
 *
 * ## Answer path, measured rather than assumed
 *
 * Graded against the real v2 checker before any of this was written:
 *
 *  - A UNIT in a typed answer is `invalid_input/unknown_symbol`: `48 m^2`, `48m2` and
 *    `48 square meters` all fail. Every prompt therefore states its unit and asks for a plain
 *    number, and no item anywhere in D10 asks a unit CONVERSION.
 *  - Exact pi is authorable through exactly one spelling. `numericAnswer("36*pi")` is broken
 *    AT THE KEY, returning `scoring_error/invalid_answer_key`, and `radicalAnswer` fails the
 *    same way, because nothing binds the symbol. `expressionAnswer(key, ["pi"])` declares it,
 *    and then `36*pi`, `36pi` and `18*2*pi` all grade correct while `35*pi` is a value
 *    mismatch.
 *  - Note what that does NOT require: against key `45*pi`, the answer `pi*9*5` grades
 *    correct, so an exact-pi item does not oblige the learner to finish the arithmetic. No
 *    hint or worked-solution step here claims it does.
 *  - Numeric keys carry no tolerance but accept fractions and decimals interchangeably, so
 *    every draw below lands on a whole number rather than anything reached by rounding.
 *
 * ## Why no hint here contains a standalone digit
 *
 * `hint_leaks_answer` matches an answer key as a standalone value, so a hint that named any
 * small number would leak on precisely the draws whose answer is that number. The hints name
 * the measurement and how it is built instead of ever substituting into it.
 */

export const GEO2_NODE = "GEO.2";

/**
 * L1, the area of a rectangle. The baseline the rest of the node is defined against, so the
 * numbers are small and the only decision is which measurement the question wants.
 */
export const d10_geo2_rect_area_l1: ItemTemplate = {
  template_id: "d10.geo2.rect-area.l1",
  node_id: GEO2_NODE,
  difficulty: 1,
  generate(rng: Rng) {
    const w = rng.int(3, 15);
    const h = rng.int(3, 15);
    return {
      prompt: `A rectangular slab measures $${w}$ meters by $${h}$ meters. What is its area, in square meters? Enter one number.`,
      answer: numericAnswer(`${w * h}`),
      params: { w, h },
      hints: [
        "Area counts the square units that cover a surface, so for a rectangle it is the two side lengths multiplied together.",
      ],
      worked_solution: [
        `Area counts the square units covering the surface, and for a rectangle that is its two side lengths multiplied.`,
        `Here that is $${w} \\times ${h}$.`,
        `So the slab has an area of $${w * h}$ square meters.`,
      ],
    };
  },
  varietyKey: (params) => `${params.w ?? 0}:${params.h ?? 0}`,
};

/**
 * L2a, a perimeter, drawn either on a plain rectangle or on an L-shaped composite figure.
 *
 * The composite draw is the reason this shape is L2. Cutting a smaller rectangle out of one
 * corner leaves the perimeter UNCHANGED, because the two new edges going in replace exactly
 * the two edges taken out, and a learner who believes a smaller figure must have a smaller
 * boundary is wrong in a way no plain rectangle can reveal. The hints are worded to cover
 * both draws, since a hint that mentioned the cut would announce which draw the learner had.
 */
export const d10_geo2_perimeter_l2: ItemTemplate = {
  template_id: "d10.geo2.perimeter.l2",
  node_id: GEO2_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const composite = rng.int(0, 1) === 1;
    const w = rng.int(6, 18);
    const h = rng.int(6, 18);
    // The notch is drawn strictly inside both sides so the figure stays an L rather than
    // degenerating into a rectangle or a disconnected pair.
    const cutW = rng.int(2, Math.max(2, w - 3));
    const cutH = rng.int(2, Math.max(2, h - 3));
    const perimeter = 2 * (w + h);
    const prompt = composite
      ? `An L-shaped courtyard is a rectangle $${w}$ meters by $${h}$ meters with a rectangle $${cutW}$ meters by $${cutH}$ meters removed from one corner. How many meters of curb run right around its boundary? Enter one number.`
      : `A rectangular courtyard measures $${w}$ meters by $${h}$ meters. How many meters of curb run right around its boundary? Enter one number.`;
    return {
      prompt,
      answer: numericAnswer(`${perimeter}`),
      params: { composite: composite ? 1 : 0, w, h, cutW, cutH },
      hints: [
        "Perimeter is the distance right around the boundary, so it is a total of lengths rather than a count of squares, and it is found by walking the edge and adding every side you cross.",
        "Walk the whole boundary and keep track of how far you travel in each direction. Going right around returns you to the start, so the distance travelled across equals the full width and the distance travelled up equals the full height.",
      ],
      worked_solution: composite
        ? [
            `Perimeter is the distance right around the boundary, so walk the edge of the L and add every side.`,
            `Removing a corner replaces two pieces of the original boundary with the two new edges of the notch, and those two new edges are exactly as long as the pieces they replaced.`,
            `So the boundary is the same length as the full rectangle's: $2 \\times (${w} + ${h})$.`,
            `That gives $${perimeter}$ meters of curb.`,
          ]
        : [
            `Perimeter is the distance right around the boundary, so add the four sides.`,
            `Opposite sides of a rectangle are equal, so that is $2 \\times (${w} + ${h})$.`,
            `That gives $${perimeter}$ meters of curb.`,
          ],
    };
  },
  varietyKey: (params) =>
    `${params.composite ?? 0}:${params.w ?? 0}:${params.h ?? 0}:${params.cutW ?? 0}`,
};

/**
 * L2b, the volume of a rectangular prism. The move off the plane, and the first shape whose
 * answer is a count of cubes rather than of squares.
 */
export const d10_geo2_prism_volume_l2: ItemTemplate = {
  template_id: "d10.geo2.prism-volume.l2",
  node_id: GEO2_NODE,
  difficulty: 2,
  generate(rng: Rng) {
    const l = rng.int(2, 12);
    const w = rng.int(2, 12);
    const d = rng.int(2, 9);
    return {
      prompt: `A rectangular cistern measures $${l}$ meters long, $${w}$ meters wide and $${d}$ meters deep. What volume of water does it hold when full, in cubic meters? Enter one number.`,
      answer: numericAnswer(`${l * w * d}`),
      params: { l, w, d },
      hints: [
        "Volume counts the unit cubes that fill a solid, so it is what a question about filling asks for rather than a question about covering.",
        "One layer of cubes on the floor is the floor's area, and the depth says how many such layers stack up. So multiply the three dimensions together.",
      ],
      worked_solution: [
        `Filling is a question about volume, which counts the unit cubes inside the solid.`,
        `A single layer of cubes covering the floor is the floor's area: $${l} \\times ${w} = ${l * w}$ square meters.`,
        `The depth says how many such layers stack, so multiply by it: $${l * w} \\times ${d}$.`,
        `The cistern holds $${l * w * d}$ cubic meters.`,
      ],
    };
  },
  varietyKey: (params) => `${params.l ?? 0}:${params.w ?? 0}:${params.d ?? 0}`,
};

/**
 * L3a, a cylinder's volume left exactly in terms of pi.
 *
 * The tier is about FORM rather than about the formula: the same layer-times-depth reasoning
 * as the prism, but the layer is a circle, so the answer carries a symbol and stops being a
 * plain number. `expressionAnswer` with `pi` declared is the only authorable spelling, and it
 * accepts `36*pi`, `36pi` and an unfinished `pi*9*4` alike, so nothing here tells the learner
 * to multiply the coefficient out.
 */
export const d10_geo2_cylinder_volume_exact_l3: ItemTemplate = {
  template_id: "d10.geo2.cylinder-volume-exact.l3",
  node_id: GEO2_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const r = rng.int(2, 9);
    const h = rng.int(2, 12);
    const coefficient = r * r * h;
    return {
      prompt: `A cylindrical well shaft has a radius of $${r}$ meters and a depth of $${h}$ meters. Give its volume in cubic meters exactly, in terms of ${latexPi()}. Write ${latexPi()} as pi, for example 3*pi.`,
      answer: expressionAnswer(`${coefficient}*pi`, ["pi"]),
      params: { r, h, coefficient },
      hints: [
        "A cylinder fills the same way a prism does: one layer covering the base, stacked as many times as the depth.",
        `So the volume is the area of the circular base multiplied by the depth, and the area of a circle is ${latexPi()} times the square of its radius.`,
        `Leave ${latexPi()} standing as a symbol rather than replacing it with a decimal, since the question asks for the volume exactly.`,
      ],
      worked_solution: [
        `A cylinder fills like a prism: the area of its base, stacked to the full depth.`,
        `The base is a circle of radius $${r}$, so its area is $\\pi \\times ${r}^{2} = ${r * r}\\pi$ square meters.`,
        `Stacking that to a depth of $${h}$ multiplies it by the depth: $${r * r}\\pi \\times ${h}$.`,
        `So the shaft holds $${coefficient}\\pi$ cubic meters, typed as ${coefficient}*pi.`,
      ],
    };
  },
  varietyKey: (params) => `${params.r ?? 0}:${params.h ?? 0}`,
};

/**
 * L3b, surface area of a rectangular prism. Deliberately the same solid and the same three
 * numbers as the volume shape above, because the difficulty this node actually carries is
 * choosing between the two measurements rather than executing either. A learner who has
 * multiplied all three together gets a number here that is wrong for a reason worth seeing.
 */
export const d10_geo2_prism_surface_area_l3: ItemTemplate = {
  template_id: "d10.geo2.prism-surface-area.l3",
  node_id: GEO2_NODE,
  difficulty: 3,
  generate(rng: Rng) {
    const l = rng.int(2, 10);
    const w = rng.int(2, 10);
    const d = rng.int(2, 8);
    const area = 2 * (l * w + l * d + w * d);
    return {
      prompt: `A closed rectangular chest measures $${l}$ meters long, $${w}$ meters wide and $${d}$ meters high. What is its total surface area, in square meters? Enter one number.`,
      answer: numericAnswer(`${area}`),
      params: { l, w, d, area },
      hints: [
        "Covering a solid is a question about surface area, which is the total area of its faces, so the answer is a number of squares rather than of cubes.",
        "A rectangular box has three distinct pairs of faces, and the two faces in each pair are identical.",
        "So find the area of one face from each pair, add those three, and double the total.",
      ],
      worked_solution: [
        `Covering the outside is a question about surface area, so add the areas of the faces rather than multiplying all three dimensions.`,
        `The box has three pairs of identical faces, one of each pair measuring $${l} \\times ${w} = ${l * w}$, $${l} \\times ${d} = ${l * d}$ and $${w} \\times ${d} = ${w * d}$ square meters.`,
        `One of each pair totals $${l * w} + ${l * d} + ${w * d} = ${l * w + l * d + w * d}$ square meters.`,
        `Each face has a twin, so double that: the chest has a surface area of $${area}$ square meters.`,
      ],
    };
  },
  varietyKey: (params) => `${params.l ?? 0}:${params.w ?? 0}:${params.d ?? 0}`,
};

/** GEO.2's five practice shapes, in the 1xL1 / 2xL2 / 2xL3 order the pool freezes them. */
export const GEO2_TEMPLATES: readonly ItemTemplate[] = [
  d10_geo2_rect_area_l1,
  d10_geo2_perimeter_l2,
  d10_geo2_prism_volume_l2,
  d10_geo2_cylinder_volume_exact_l3,
  d10_geo2_prism_surface_area_l3,
];
