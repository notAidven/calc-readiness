/**
 * A triangle's vertices DERIVED from the angles it is labelled with.
 *
 * Two D10 figures drew a triangle at hardcoded vertices and then wrote whatever angles the
 * board or the draw happened to carry onto its corners. `GeoAngleExplore` drew one outline
 * measuring about 66 / 47 / 67 for both of its boards, whose labels are 43 / 61 / 76 and
 * 58 / 74 / 48: on both, the drawn ordering ran INVERSE to the labels, so the angle the
 * learner had just computed as the largest was drawn as one of the smaller ones.
 * `TriangleAnglesWorked` drew about 54 / 46 / 80 whatever it was passed, so a learner shown
 * 60 / 60 / 60 read it off a visibly scalene triangle.
 *
 * Checking an answer against the picture is the ordinary move, and it is the move these
 * figures exist to encourage; both were telling a learner that a correct answer was wrong.
 * So the vertices are computed FROM the angles rather than hand-tuned until the boards in
 * front of us look right. There is then no state in which the drawing and its labels can
 * disagree, and a new board or a wider draw range cannot put the defect back.
 *
 * The label positions come with them, for the same reason. A fixed `+30, -14` offset that
 * sits neatly inside a 60-degree corner is outside a 20-degree one, and a derived triangle
 * draws both: `d10.geo1.angle-third.l2` draws its two given angles anywhere in 25 to 80, so
 * the third runs from 20 to 130.
 */

const RADIANS = Math.PI / 180;

/** How near a corner a label may sit, even where the corner is wide enough to allow closer. */
const MIN_LABEL_REACH = 20;

/**
 * How far along a bisector a label may sit, as a fraction of the way to the opposite side.
 *
 * A cap rather than a target: it is what keeps a sharp corner's label inside the triangle
 * it names instead of parked against the far side.
 */
const MAX_LABEL_REACH = 0.45;

/** Half the ink width of an `NN^{\circ}` label at the 14 to 15 units these figures set. */
const DEFAULT_LABEL_HALF_WIDTH = 14;

/** How close to a corner a label may be pushed by the rule below, before it is on the vertex. */
const CROWDED_LABEL_REACH = 9;

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** The rectangle of SVG user space the OUTLINE is fitted inside. Labels sit within it. */
export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface AngleTriangle {
  /** The left end of the base, drawn at the `first` angle. */
  readonly left: Point;
  /** The right end of the base, drawn at the `second` angle. */
  readonly right: Point;
  /** The remaining corner, drawn at {@link AngleTriangle.third}. */
  readonly apex: Point;
  /** Where each corner's own angle label goes, on the bisector of the corner it names. */
  readonly leftLabel: Point;
  readonly rightLabel: Point;
  readonly apexLabel: Point;
  /** `180 - first - second`. */
  readonly third: number;
}

function normalise(x: number, y: number): Point {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function direction(from: Point, to: Point): Point {
  return normalise(to.x - from.x, to.y - from.y);
}

/**
 * The interior angle at `vertex` of the corner between `one` and `other`, in degrees.
 *
 * Exported because a figure built by this module owes a guard that MEASURES what it drew,
 * and a measurement that borrows the construction's own arithmetic proves nothing. Nothing
 * below uses this: {@link triangleFromAngles} builds by the law of sines and never asks
 * what it has drawn, so a guard reading the painted outline through this function is
 * genuinely a second opinion.
 */
export function angleAt(vertex: Point, one: Point, other: Point): number {
  const a = direction(vertex, one);
  const b = direction(vertex, other);
  return Math.acos(Math.min(1, Math.max(-1, a.x * b.x + a.y * b.y))) / RADIANS;
}

/** How far a ray leaving `from` along `along` runs before it crosses the line `one`-`other`. */
function crossingDistance(from: Point, along: Point, one: Point, other: Point): number {
  const nx = -(other.y - one.y);
  const ny = other.x - one.x;
  const denominator = along.x * nx + along.y * ny;
  if (Math.abs(denominator) < 1e-9) {
    return Number.POSITIVE_INFINITY;
  }
  return ((one.x - from.x) * nx + (one.y - from.y) * ny) / denominator;
}

/** The unit bisector of the corner at `vertex`, pointing into the triangle. */
function bisector(vertex: Point, one: Point, other: Point): Point {
  const a = direction(vertex, one);
  const b = direction(vertex, other);
  return normalise(a.x + b.x, a.y + b.y);
}

/**
 * How far along its bisector a corner's label would like to sit.
 *
 * Far enough that a label of `halfWidth` clears both of the corner's sides: the room a corner
 * of `angle` degrees offers at distance `d` is `d * sin(angle / 2)`, so this is that relation
 * solved the other way round. Capped at {@link MAX_LABEL_REACH} of the way to the opposite
 * side, which is what keeps a sharp corner's label inside the triangle it names.
 */
function wantedReach(
  vertex: Point,
  one: Point,
  other: Point,
  angle: number,
  halfWidth: number,
): number {
  return Math.min(
    Math.max(MIN_LABEL_REACH, halfWidth / Math.sin((angle / 2) * RADIANS)),
    MAX_LABEL_REACH * crossingDistance(vertex, bisector(vertex, one, other), one, other),
  );
}

/**
 * A triangle drawn at the angles it is labelled with, fitted inside `box`.
 *
 * `first` is drawn at the left end of the base, `second` at the right end, and the third
 * angle at the apex above them.
 */
export function triangleFromAngles(
  first: number,
  second: number,
  box: Box,
  options: { readonly labelHalfWidth?: number } = {},
): AngleTriangle {
  const third = 180 - first - second;
  if (!(first > 0) || !(second > 0) || !(third > 0)) {
    throw new Error(
      `a triangle labelled ${first} and ${second} degrees leaves no third angle to draw`,
    );
  }

  // One unit frame, from the law of sines. The base runs left to right along the x axis, so
  // the corner drawn at each end IS the angle that end is labelled with by construction; the
  // one remaining freedom is how far up the left side the apex sits, and
  // `sin(second) / sin(third)` is what closes the triangle on the second angle as well.
  const side = Math.sin(second * RADIANS) / Math.sin(third * RADIANS);
  const unit: readonly Point[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: side * Math.cos(first * RADIANS), y: -side * Math.sin(first * RADIANS) },
  ];

  const xs = unit.map((p) => p.x);
  const ys = unit.map((p) => p.y);
  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanY = Math.max(...ys) - Math.min(...ys);
  // ONE scale for both axes. Stretching a triangle to fill its box would draw angles that
  // are not the ones it was built from, which is the whole defect this module is here for.
  const scale = Math.min(box.width / spanX, box.height / spanY);
  const offsetX = box.x + (box.width - spanX * scale) / 2 - Math.min(...xs) * scale;
  const offsetY = box.y + (box.height - spanY * scale) / 2 - Math.min(...ys) * scale;
  const place = (p: Point): Point => ({
    x: offsetX + p.x * scale,
    y: offsetY + p.y * scale,
  });

  const left = place(unit[0] as Point);
  const right = place(unit[1] as Point);
  const apex = place(unit[2] as Point);
  const halfWidth = options.labelHalfWidth ?? DEFAULT_LABEL_HALF_WIDTH;

  const corner = [left, right, apex];
  const angle = [first, second, third];
  const reach = corner.map((vertex, at) =>
    wantedReach(
      vertex,
      corner[(at + 1) % 3] as Point,
      corner[(at + 2) % 3] as Point,
      angle[at] as number,
      halfWidth,
    ),
  );

  // TWO NEIGHBOURS ON A SHORT SIDE CANNOT BOTH HAVE THE ROOM THEY ASKED FOR.
  //
  // Each corner's reach above is decided from that corner alone, and on a narrow triangle the
  // two ends of the short side then walk into each other: at 80 / 80 / 20 the fitted base is
  // 44 units long and the two `80^{\circ}` labels wanted 17 of it each from opposite ends,
  // which drew them as one unreadable run of digits. So the pair is settled together. What has
  // to survive along a side of length `L` is `2 * halfWidth` of clear space between the two
  // labels' ink, and each label spends `reach * cos(angle / 2)` of that side getting to where
  // it sits; where the two ends want more than there is, both are scaled back by the same
  // factor, since shrinking one and not the other would push a label onto the vertex it names
  // while its neighbour kept the room.
  //
  // The clearance a corner gets from its OWN sides is what is given up, so on a needle
  // triangle a label sits partly across the outline. That is the lesser of the two, and it is
  // the one a reader can still read.
  for (let at = 0; at < 3; at += 1) {
    const next = (at + 1) % 3;
    const here = corner[at] as Point;
    const there = corner[next] as Point;
    const side = Math.hypot(there.x - here.x, there.y - here.y);
    const spent =
      (reach[at] as number) * Math.cos((((angle[at] as number) / 2) * Math.PI) / 180) +
      (reach[next] as number) * Math.cos((((angle[next] as number) / 2) * Math.PI) / 180);
    const room = side - 2 * halfWidth;
    if (spent > room) {
      const factor = Math.max(room / spent, 0);
      reach[at] = Math.max(CROWDED_LABEL_REACH, (reach[at] as number) * factor);
      reach[next] = Math.max(CROWDED_LABEL_REACH, (reach[next] as number) * factor);
    }
  }

  const label = corner.map((vertex, at) => {
    const along = bisector(
      vertex,
      corner[(at + 1) % 3] as Point,
      corner[(at + 2) % 3] as Point,
    );
    const out = reach[at] as number;
    return { x: vertex.x + along.x * out, y: vertex.y + along.y * out };
  });

  return {
    left,
    right,
    apex,
    third,
    leftLabel: label[0] as Point,
    rightLabel: label[1] as Point,
    apexLabel: label[2] as Point,
  };
}
