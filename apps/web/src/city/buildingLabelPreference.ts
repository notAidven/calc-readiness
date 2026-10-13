/** Origin-local display preference for the floating labels above city buildings. */
export const BUILDING_LABELS_STORAGE_KEY = "cr.city.display.buildingLabels";

const VISIBLE_VALUE = "visible";
const HIDDEN_VALUE = "hidden";

/** The small storage surface this presentational preference needs. */
export interface DisplayPreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function browserStorage(): DisplayPreferenceStorage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/**
 * Missing, blocked, or unrecognised storage keeps the backwards-compatible visible default.
 */
export function readBuildingLabelsVisible(
  storage: DisplayPreferenceStorage | null = browserStorage(),
): boolean {
  try {
    const stored = storage?.getItem(BUILDING_LABELS_STORAGE_KEY) ?? null;
    return stored !== HIDDEN_VALUE;
  } catch {
    return true;
  }
}

/** Best-effort persistence; the caller's in-memory state remains authoritative this session. */
export function writeBuildingLabelsVisible(
  visible: boolean,
  storage: DisplayPreferenceStorage | null = browserStorage(),
): void {
  try {
    storage?.setItem(BUILDING_LABELS_STORAGE_KEY, visible ? VISIBLE_VALUE : HIDDEN_VALUE);
  } catch {
    // A blocked storage partition costs persistence, never the working control.
  }
}
