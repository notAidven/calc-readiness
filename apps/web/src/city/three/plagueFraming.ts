/** Width and edge gutter mirrored from `plague.css`. */
export const PLAGUE_PANEL_CAP = 400;
export const PLAGUE_PANEL_GUTTER = 14;
export const PLAGUE_PHONE_WIDTH = 560;

/** How much horizontal room the right-side Plague rail occupies. */
export function plaguePanelReach(view: {
  readonly width: number;
  readonly height: number;
}): number {
  if (view.width <= PLAGUE_PHONE_WIDTH) {
    return view.width;
  }
  return Math.min(PLAGUE_PANEL_CAP, Math.max(0, view.width - 28)) + PLAGUE_PANEL_GUTTER;
}
