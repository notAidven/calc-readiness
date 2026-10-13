import {
  footprintFor,
  GRID_CELL,
  type PlacedTransform,
  transformCenter,
} from "../worldLayout";
import { applyCityFraming, type ViewOffsetCamera } from "./cityFraming";
import { VILLAGE_CAMERA } from "./orbitCamera";

export type { ViewOffsetCamera };

/**
 * **WHERE THE ISLAND IS DRAWN WHILE A CRISIS PANEL IS OVER IT.**
 *
 * The lead's objection, three times, on three shapes of the same panel: *"i dont get to see the
 * actual changes in the island because its completely blocked by the panel"*; then, after the
 * panel had become a bottom band and this module had lifted the frame over it, *"it still looks
 * terrible - the panel absolutely needs to be sized down, because now we're too zoomed out to
 * see the actual island"*; then the ruling that ends it: *"maybe make it a sidebar instead of at
 * the bottom - i think that makes more sense."*
 *
 * ## WHY A SIDE PANEL MAKES THE CORRECTION CHEAP, WHICH IS THE WHOLE OF THIS REWRITE
 *
 * The island is a wide disc and the viewport is a wide box, so the two axes are not
 * interchangeable and the panel's edge decides which one this module has to spend.
 *
 * Pixels per world unit are the same on both axes — square pixels — so a world extent of `e`
 * units reads `e · viewportHeight / frustumHeight` pixels whichever way it is measured. The
 * ground is seen at a locked tilt, so a HORIZONTAL extent is not foreshortened at all while a
 * vertical one is scaled by `sin(elevation)`, which is 0.75 here. A spread era-one settlement is
 * therefore WIDER on screen than it is tall: at 1024x580 it is about 615px across and 559px
 * down, in a box 1024 by 580.
 *
 * That asymmetry is the argument:
 *
 *  - a BAND along the bottom takes the axis where the settlement already very nearly fills the
 *    screen, so every pixel of band had to be bought back by dollying out. Measured at the tip
 *    this replaced: a 304px band at 1024x580 left a 276px strip against a 551px settlement, so
 *    the fit needed a **2.32x** view, and 2.45x at 1440x900. That is the picture the lead called
 *    too zoomed out, and it was arithmetically unavoidable rather than a mistuned constant;
 *  - a SIDE panel takes the axis with slack in it. 484px of panel and gutter at 1024x580 leaves
 *    a 540px strip — 52.7% of the screen — and the fit needs **1.47x**, against 1.29x at
 *    1440x900 where the strip is 66.4%.
 *
 * THOSE TWO NUMBERS CAME DOWN WHEN THE PANEL WAS SIZED TO ITS CONTENT, which is the point worth
 * recording: the correction shrinks with the thing it is correcting for. Measured through this
 * module over `winterFraming.test.ts`'s own spread city, before and after `--hw-side` went from
 * `min(620px, 50vw)` to `min(470px, 50vw)`:
 *
 *  - 1024x580: reach 526 -> 484, strip 498 -> 540 (48.6% -> 52.7% of the screen), zoom 1.59 ->
 *    1.47. The island is handed back a majority of the width for the first time;
 *  - 1440x900: reach 634 -> 484, strip 806 -> 956 (56.0% -> 66.4%), zoom 1.53 -> 1.29;
 *  - 920x800: unchanged at reach 474, because there the `50vw` share binds and not the cap.
 *
 * THE CORRECTION DID NOT GO AWAY, WHICH WAS THE FIRST THING TO CHECK — AND WAS CHECKED AGAIN
 * WHEN THE PANEL NARROWED. The settlement is drawn centred, so even a panel narrower than half
 * the screen covers a large part of its left side: measured through a real projection with the
 * framing disabled, it still runs 335px behind the panel's edge at 1024x580 and 327px at
 * 1440x900. A narrower panel makes the slide cheaper, not unnecessary. What changed is the
 * price: the island is handed back two thirds of its scale instead of two fifths, and
 * `winterFraming.test.ts` keeps a ceiling on the zoom for exactly that reason.
 *
 * ## THE TWO NUMBERS, AND WHY THERE IS NO LONGER A VERTICAL ONE
 *
 *  - **`offsetX`** slides the frame sideways by half the panel's reach, which puts the point the
 *    camera is aimed at in the middle of the strip the panel leaves free rather than in the
 *    middle of the screen. Half the reach and not the whole of it, for the same reason the band
 *    version lifted by half its height: the strip's centre is exactly that far from the screen's.
 *  - **`zoom`** widens the view until the SETTLEMENT fits in that strip. Only as far as it has
 *    to: `zoom` is `1` when it already fits, and it is capped at the dolly the game already
 *    allows itself (`VILLAGE_CAMERA.maxDistanceRatio`), so the crisis can never frame the island
 *    from further out than the player's own zoom control can.
 *
 * There is no vertical term, and its absence is a claim rather than an omission: a full-height
 * side panel covers no more of the island's top than of its bottom, so there is nothing for a
 * lift to uncover. The vertical constraint that remains is only that the settlement is ON SCREEN,
 * which the fit below checks on both axes and takes whichever is binding.
 *
 * ## IT REPLACES THE DEFAULT FRAMING RATHER THAN COMPOSING WITH IT
 *
 * `cityFraming.ts` frames the whole ISLAND into the whole CANVAS whenever no crisis is running.
 * The two are answers to different questions — the whole board into the whole screen, against
 * the SETTLEMENT into the strip beside the panel — and this module's own header records that
 * fitting the whole board was measured and rejected, at the lead's insistence, because it costs
 * 5% of zoom for ground nothing is standing on. So `CityScene` applies exactly one of them, and
 * while a crisis is on it is this one. Maxing the two zooms together was the alternative and it
 * gives back the picture the lead rejected: at 1440x900 it would draw the settlement at 90% of
 * the size this framing was tuned to.
 *
 * ## THE SETTLEMENT AND NOT THE WHOLE BOARD, WHICH WAS TRIED FIRST
 *
 * Fitting all 88 cells is the tidier rule and it was measured before it was rejected. The board
 * is a disc, and fitting the whole of it into the free strip costs another 5% of zoom for ground
 * with nothing standing on it. So the fit is sized by WHAT IS STANDING, capped at the board. A
 * fresh island with only the hall on it needs no widening at all — which is the state a demo
 * machine is in. What it costs is the outermost ring of cells on the panel's side, which the
 * panel's edge crops; the frost line is visible everywhere else, and the player can pan and zoom
 * throughout.
 *
 * ## IT IS ARITHMETIC OVER THE CSS, AND THE CSS IS WHERE THE PANEL'S SIZE LIVES
 *
 * `crisisPanelReach` mirrors `winter-in-city.css`'s `--hw-side` and `--hw-gutter` rather than
 * measuring the DOM, because the scene has no way to observe a sibling element and a measurement
 * would make the camera depend on a layout pass. The mirror is the risk that buys, and
 * `test/winterCrisisBandMirror.test.ts` is what makes it a checkable one: it reads the stylesheet
 * and fails if a width moves there without moving here.
 */

/** `--hw-gutter`: the margin the panel keeps between itself and the viewport's edge. */
const PANEL_GUTTER = 14;
/**
 * `--hw-side: min(470px, 50vw)`.
 *
 * The cap is the panel's CONTENT measured rather than a width chosen — the declare step's
 * middle action card needs a 351.5px column to hold its description on one line in DejaVu Sans,
 * the widest family the body stack lands on, and the panel spends 90px on its own chrome.
 * `winter-in-city.css` carries the derivation and `crisisPanelFitsItsContent.browser.test.tsx`
 * re-measures it; what matters out here is only that this file agrees with that file, which is
 * `test/winterCrisisBandMirror.test.ts`'s job.
 */
const PANEL_SHARE = 0.5;
const PANEL_CAP = 470;
/** `@media (max-width: 560px)` is one full-width 76vh bottom sheet, flush to the edge. */
const PHONE_WIDTH = 560;

/**
 * How far across the viewport the crisis panel reaches, in CSS pixels, measured from the edge
 * it is anchored to.
 *
 * ONE SHAPE FOR EVERY PHASE, which is what the side layout bought: the band had to become a
 * centred sheet while answering and a taller band at the end, so the framing had to be derived
 * for one phase and deliberately not re-derived for the others — a camera that re-framed itself
 * on every phase change would lurch four times a round. There is nothing to choose between now.
 * `answering` sits in the same box as `declaring`.
 *
 * At phone width this is the whole width, and the framing below refuses rather than trying to
 * fit an island into what is left.
 */
export function crisisPanelReach(view: {
  readonly width: number;
  readonly height: number;
}): number {
  if (view.width <= PHONE_WIDTH) {
    return view.width;
  }
  return Math.min(view.width * PANEL_SHARE, PANEL_CAP) + PANEL_GUTTER;
}

/**
 * Breathing room kept on either side of the fitted settlement, as a share of the free strip.
 *
 * ORDINARY MARGIN AND NOTHING ELSE, which is why it is 4% and not the 7% the band's fit carried.
 * A settlement flush against the panel's edge reads as cut off even when it is not, and that is
 * the whole of what this number is for now. The other 3% was covering the roofline's effect on the
 * extent, silently and by about the right amount by luck; that is an explicit term in the fit
 * below, so paying for it twice would be paying in the one currency the lead is objecting about.
 */
const STRIP_MARGIN = 0.04;

/**
 * And the margin kept above and below it, as a share of the viewport's height.
 *
 * SMALLER THAN THE STRIP'S, because it is answering a different question. The strip margin is
 * measured against the PANEL'S EDGE, where a settlement flush to it reads as cut off. This one is
 * measured against the top and bottom of the SCREEN, where the only real requirement is that the
 * roofs are on it: a wide gutter of empty sky above the island is not breathing room, it is the
 * zoom-out the lead objected to. 3% is what the closed form below needs to be safe — it
 * under-states a real projection by up to 8% of the span, which is about 2% of the viewport at
 * this tilt — and nothing more.
 */
const SCREEN_MARGIN = 0.03;

/**
 * The roofline the fit has to make room for, in world units.
 *
 * A building projects ABOVE the cell it stands on, so fitting the board's ground disc alone
 * would clip the tallest roofs off the screen. Era one's tallest is the Lookout, which
 * `worldLayout.ts` records rendering at **9.769u** on its 2x2 plot; `MAX_BUILD_HEIGHT` is a cap
 * rather than a height and is not binding for any era-one building, so it is the wrong number to
 * fit against — it is 24u, which would cost the fit another 40% of zoom for headroom nothing uses.
 */
export const WINTER_ROOFLINE_ALLOWANCE = 10;

/**
 * How much the roofline widens the settlement's extent ON SCREEN, as a multiple of the extent of
 * the ground it stands on, across and down.
 *
 * **IT WIDENS BOTH AXES, AND THAT WAS THE ASSUMPTION THIS MODULE GOT WRONG FIRST.** The obvious
 * reading is that a roof is drawn above its own footprint and therefore adds height and nothing
 * else. It is false under a perspective camera with an oblique heading, and
 * `winterFraming.test.ts` measured it: at 1440x900 the roofline pushes the settlement's LEFT edge
 * 58px further left, which is 58px straight behind a left-hand panel.
 *
 * The geometry is a similar-triangles one. The ray from the camera through a point `h` above the
 * ground meets the ground at `p + (p - C) · h/(H - h)`, where `C` is the camera's ground position
 * and `H` its height — so the whole ring raised by `h` projects exactly as a ring **scaled about
 * the camera's nadir** by `H/(H - h)`, which is 1.239 at this dolly and tilt. Both axes, not one.
 *
 * The two numbers below are smaller than 1.239 and differ from each other because that scaling
 * also pushes the raised ring's centre AWAY from the camera, so part of the extra size is taken
 * back by depth — and the push is along the view direction, which the tilt foreshortens, so it
 * costs the across extent more than the down one. Closing that in algebra needs the projection
 * itself; instead they are stated here, conservatively rounded up from a real 256-point
 * projection, and `winterFraming.test.ts` fails if the reckoning stops being both safe and tight.
 */
export const ROOFLINE_SPREAD_ACROSS = 1.13;
export const ROOFLINE_SPREAD_DOWN = 1.21;

export interface WinterFraming {
  /**
   * CSS pixels to slide the frame sideways by, away from the panel, so the aimed-at point sits
   * in the free strip. Positive moves the picture right, which is the only direction a
   * left-anchored panel needs.
   */
  readonly offsetX: number;
  /** How much wider a view to take. `1` is the framing the city already had. */
  readonly zoom: number;
}

/**
 * How far the settlement reaches from the island's centre, in world units.
 *
 * The farthest building's footprint centre plus one cell, which covers half the diagonal of even
 * the hall's 3x2 plot (3.6u against a 4u cell). Capped at `buildableRadius`, because nothing can
 * stand outside the board and a stale placement should not be able to pull the camera out past
 * it.
 *
 * Zero for an island with nothing on it, which is a case the in-city mount refuses before it gets
 * here — the winter has nothing to fall on — and which `winterFraming` handles anyway by leaving
 * the zoom at 1.
 */
export function settlementRadius(
  placements: readonly PlacedTransform[],
  buildableRadius: number,
): number {
  let reach = 0;
  for (const placed of placements) {
    const centre = transformCenter(placed, footprintFor(placed.nodeId));
    reach = Math.max(reach, Math.hypot(centre.x, centre.z) + GRID_CELL);
  }
  return Math.min(reach, buildableRadius);
}

/**
 * How many CSS pixels a world extent of `units` reads at the default framing.
 *
 * Pixels are square, so this is one relation for both axes and the axes differ only in what
 * extent they are handed. It is the same relation `winterCamera.test.ts` measures through real
 * three.js projections. Perspective makes the near half of the board read slightly larger than
 * the far half, which this ignores: it over-states the span at the near edge and under-states it
 * at the far one, and the two nearly cancel at this tilt and distance. `winterFraming.test.ts`
 * pins how much rather than leaving the approximation on trust.
 */
function worldToPx(input: {
  readonly units: number;
  readonly distance: number;
  readonly fov: number;
  readonly viewportHeight: number;
}): number {
  const frustumHeight = 2 * input.distance * Math.tan((input.fov * Math.PI) / 360);
  return (input.units / frustumHeight) * input.viewportHeight;
}

/** The framing the winter asks of the city camera, or `null` when there is no room to ask. */
export function winterFraming(input: {
  readonly view: { readonly width: number; readonly height: number };
  /** How far out the thing that must be visible reaches, in world units. */
  readonly fitRadius: number;
  /** The camera's current distance from its target. */
  readonly distance: number;
  readonly fov: number;
  /** Another crisis may reuse the fit with a differently sized side panel. */
  readonly panelReach?: number;
  /** A crisis may deliberately close in on a compact settlement. Winter defaults to 1. */
  readonly minimumZoom?: number;
}): WinterFraming | null {
  const { view } = input;
  if (view.width <= 0 || view.height <= 0) {
    return null;
  }
  const reach = input.panelReach ?? crisisPanelReach(view);
  const strip = view.width - reach;
  const elevation = Math.PI / 2 - VILLAGE_CAMERA.polarAngle;
  const px = (units: number) =>
    worldToPx({
      units,
      distance: input.distance,
      fov: input.fov,
      viewportHeight: view.height,
    });
  /*
   * BOTH AXES, AND WHICHEVER IS BINDING WINS.
   *
   * The horizontal one is what the panel constrains and is the one that usually binds. The
   * vertical one is not a panel constraint at all — a full-height side panel uncovers no more of
   * the top than of the bottom — it is the screen itself: a spread settlement is 559px tall at
   * 1024x580, which leaves 21px in a 580px viewport, so a fit that only looked sideways would
   * clip the Lookout's roof off the top of the screen at a viewport 40px shorter.
   */
  const acrossFit =
    px(2 * input.fitRadius * ROOFLINE_SPREAD_ACROSS) / (strip * (1 - 2 * STRIP_MARGIN));
  const downFit =
    px(2 * input.fitRadius * Math.sin(elevation) * ROOFLINE_SPREAD_DOWN) /
    (view.height * (1 - 2 * SCREEN_MARGIN));
  const needed = Math.max(acrossFit, downFit);
  /*
   * REFUSED WHEN THE SETTLEMENT CANNOT FIT EVEN AT THE FURTHEST DOLLY THE GAME ALLOWS.
   *
   * Not a viewport threshold picked by hand: the question is whether this framing can deliver
   * what it promises, and where it cannot, sliding the frame anyway would move the island
   * sideways and still leave it behind the panel — a worse picture than the centred one, for
   * nothing. Phone width is where this bites, and there `winter-in-city.css` has already made the
   * other trade: one full-width 76vh bottom sheet in every phase, with the panel scrolling.
   */
  if (strip <= 0 || needed > VILLAGE_CAMERA.maxDistanceRatio) {
    return null;
  }
  return { offsetX: reach / 2, zoom: Math.max(input.minimumZoom ?? 1, needed) };
}

/**
 * Put the crisis framing on a camera, or take it off with `null`.
 *
 * The `setViewOffset` arithmetic, and the argument for using the projection rather than the
 * controls, moved to `cityFraming.ts` when the DEFAULT framing needed the same mechanism —
 * read {@link applyCityFraming} for both. What stays here is only the crisis's own shape: a
 * sideways slide and a widening, and deliberately no lift (see {@link WinterFraming}), which
 * is what `winterFraming.test.ts` asserts on the projection rather than on the absent field.
 *
 * One call for both numbers, so `clearViewOffset` is a complete undo and there is never a
 * partly-applied framing to reason about.
 */
export function applyWinterFraming(
  camera: ViewOffsetCamera,
  framing: WinterFraming | null,
  view: { readonly width: number; readonly height: number },
): void {
  applyCityFraming(
    camera,
    framing === null ? null : { offsetX: framing.offsetX, lift: 0, zoom: framing.zoom },
    view,
  );
}
