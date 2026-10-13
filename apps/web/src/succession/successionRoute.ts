/** The canonical query parameter for the real in-city Succession QA route. */
export const SUCCESSION_PARAM = "succession";

/**
 * Physical prefix for the route's tab-scoped storage.
 *
 * The route must survive a refresh without reading or writing the ordinary demo city. Keeping
 * the prefix beside the route identity makes that isolation one route contract rather than a
 * second parameter list in the storage layer.
 */
export const SUCCESSION_QA_STORAGE_PREFIX = "cr.qa.succession.";

/** Whether a URL search string is asking for the real in-city Succession. */
export function isSuccessionEntry(search: string): boolean {
  return new URLSearchParams(search).has(SUCCESSION_PARAM);
}

/** The registry fields that jointly identify a route as the in-city Succession. */
export interface SuccessionRouteCandidate {
  readonly param: string;
  readonly destination: string;
}

/**
 * Select the Succession composition by route identity, never by mount type alone.
 *
 * `destination: "city"` is an invariant of the approved Succession route, but it is shared by
 * every crisis that moves into the live city. The canonical parameter is therefore required
 * twice: on the registry member the router resolved and in the address that requested it.
 */
export function isSuccessionRouteRequest(
  route: SuccessionRouteCandidate | null,
  search: string,
): boolean {
  return (
    route?.destination === "city" &&
    route.param === SUCCESSION_PARAM &&
    isSuccessionEntry(search)
  );
}
