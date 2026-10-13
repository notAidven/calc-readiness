/**
 * **WHERE AN ANCHORED HINT GOES, AND WHAT IT IS NOT ALLOWED TO SIT ON.**
 *
 * Split out of `Tooltip.tsx` when the second requirement arrived, because the first one — glue to
 * an anchor, clamp on screen — is four lines and the second is a search.
 *
 * ## The defect this exists for
 *
 * The first-use hint anchors above the Build button, and the camera toolbar sits between the two.
 * Measured on the ordinary learner mount at `b7bdc6d2`, with the hint up over an empty island:
 *
 * | window | camera toolbar covered | camera buttons whose own centre answered the hint |
 * | --- | --- | --- |
 * | 320x568 | 12,504px² | 5 of 6 |
 * | 390x580 | 8,864px² | 4 of 6 |
 * | 844x390 | 5,642px² | 3 of 6 |
 * | 1024x580 | 2,890px² | 1 of 6 |
 * | 512x290 | 2,520px² | 1 of 6 |
 *
 * A hint that lands on the controls is worse than no hint: the learner it is written for is the
 * one who does not yet know that the thing under it is how you look around.
 *
 * ## Why a search rather than a rule
 *
 * The geometry is different at every window and the two clusters move independently — the camera
 * is a vertical column on the right above 700px and a full-width bar along the bottom below it —
 * so "put it to the left" is right at 1024x580 and impossible at 320x568, where nothing clears a
 * bar the width of the screen except going over it. So the caller states the CONSTRAINT (these
 * rectangles are not yours) and this ranks the candidates: least overlap first, then least
 * movement from where the hint wanted to be, because a hint 70px to the left still points at its
 * control and one flung into the far corner does not.
 */

/** Where the tooltip sits relative to its anchor. */
export type Placement = "above" | "below" | "inside-top";

export interface Rect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Position {
  /** Final top-left corner (`position: fixed` coords), clamped on-screen. */
  readonly left: number;
  readonly top: number;
  /** The arrow's x within the tooltip, so it still points at the anchor after clamping. */
  readonly pointerLeft: number;
  /** Which side of the anchor it ended up on, so the arrow points the right way. */
  readonly placement: Placement;
}

/** Gap (px) between the tooltip and its anchor edge, or a rectangle it has to clear. */
export const ANCHOR_GAP = 12;

/** Keep the tooltip (and its pointer) at least this far from the viewport edges. */
export const VIEWPORT_MARGIN = 10;

/** The default placement for an anchor (viewport sits inside near its top). */
export function placementFor(anchor: string): Placement {
  return anchor === "viewport" ? "inside-top" : "above";
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), Math.max(low, high));
}

function overlap(one: Rect, other: Rect): number {
  return (
    Math.max(0, Math.min(one.right, other.right) - Math.max(one.left, other.left)) *
    Math.max(0, Math.min(one.bottom, other.bottom) - Math.max(one.top, other.top))
  );
}

function rectAt(left: number, top: number, tip: Size): Rect {
  return {
    left,
    top,
    right: left + tip.width,
    bottom: top + tip.height,
    width: tip.width,
    height: tip.height,
  };
}

/**
 * Position the tooltip against its anchor, clear of `reserved`, clamped inside the viewport.
 *
 * The preferred position is the one this had before `reserved` existed: above the anchor, flipped
 * below when there is no room up top, and clamped on screen either way. Everything after that is
 * a fallback, tried in a fixed order and scored, so a hint only moves when it is sitting on
 * something and moves as little as clearing it takes.
 */
export function computePosition(
  anchor: Rect,
  tip: Size,
  viewport: Size,
  placement: Placement,
  reserved: readonly Rect[] = [],
): Position {
  const centerX = anchor.left + anchor.width / 2;
  const maxLeft = Math.max(VIEWPORT_MARGIN, viewport.width - VIEWPORT_MARGIN - tip.width);
  const maxTop = Math.max(VIEWPORT_MARGIN, viewport.height - VIEWPORT_MARGIN - tip.height);
  const fit = (left: number, top: number): { left: number; top: number } => ({
    left: clamp(left, VIEWPORT_MARGIN, maxLeft),
    top: clamp(top, VIEWPORT_MARGIN, maxTop),
  });

  const preferredLeft = centerX - tip.width / 2;
  let preferredTop: number;
  if (placement === "inside-top") {
    preferredTop = anchor.top + ANCHOR_GAP;
  } else if (placement === "below") {
    preferredTop = anchor.bottom + ANCHOR_GAP;
  } else {
    preferredTop = anchor.top - ANCHOR_GAP - tip.height;
    if (preferredTop < VIEWPORT_MARGIN) {
      preferredTop = anchor.bottom + ANCHOR_GAP;
    }
  }
  const preferred = fit(preferredLeft, preferredTop);

  const candidates: { left: number; top: number }[] = [preferred];
  for (const zone of reserved) {
    const beside = [zone.left - ANCHOR_GAP - tip.width, zone.right + ANCHOR_GAP];
    const beyond = [zone.top - ANCHOR_GAP - tip.height, zone.bottom + ANCHOR_GAP];
    // Sideways first: a hint 82px along still points at the control it is about.
    for (const left of beside) {
      candidates.push(fit(left, preferred.top));
    }
    // Then over or under the obstacle, which is the only way past a full-width bar.
    for (const top of beyond) {
      candidates.push(fit(preferred.left, top));
    }
    /*
      Then both at once, which is what a MAGNIFIED window needs: at 200% text the hint is twice
      the size and the reserved boxes are too, so one axis of clearance is not always enough —
      shifting on one alone left 450px² of the toolbar covered, measured.
    */
    for (const left of beside) {
      for (const top of beyond) {
        candidates.push(fit(left, top));
      }
    }
  }
  // Last resort, and ranked last by construction: a corner is a long way from the anchor, so it
  // only ever wins when every closer candidate is still sitting on something.
  for (const left of [VIEWPORT_MARGIN, maxLeft]) {
    for (const top of [VIEWPORT_MARGIN, maxTop]) {
      candidates.push({ left, top });
    }
  }

  const scored = candidates.map((candidate) => {
    const box = rectAt(candidate.left, candidate.top, tip);
    return {
      ...candidate,
      covered: reserved.reduce((total, zone) => total + overlap(box, zone), 0),
      moved:
        Math.abs(candidate.left - preferred.left) + Math.abs(candidate.top - preferred.top),
    };
  });
  const best = scored.reduce((low, row) =>
    row.covered < low.covered || (row.covered === low.covered && row.moved < low.moved)
      ? row
      : low,
  );

  const pointerLeft = clamp(centerX - best.left, 14, Math.max(14, tip.width - 14));
  const resolved: Placement =
    best.top + tip.height <= anchor.top
      ? "above"
      : best.top >= anchor.bottom
        ? "below"
        : placement;
  return { left: best.left, top: best.top, pointerLeft, placement: resolved };
}
