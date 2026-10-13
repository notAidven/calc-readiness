/**
 * **WHERE AUTHENTICATION HANDS THE LEARNER BACK TO, AND WHY IT IS NEVER TAKEN ON TRUST.**
 *
 * This app's Cognito boundary is the public-SPA SRP flow (`auth/cognitoClient.ts`), so there is
 * no OAuth provider redirect to receive. What there IS, and what this module owns, is the app's
 * own hand-back: the account screens push `/sign-in`, `/create-account`, `/forgot-password` and
 * friends into history, and the moment a session exists the learner has to be returned to the
 * ordinary route rather than left standing on a form they have finished with.
 *
 * That hand-back is a redirect, and a redirect whose destination comes from the URL is an open
 * redirect unless somebody says otherwise. A link of the shape
 * `https://…/sign-in?next=//evil.example/harvest` costs nothing to send and, unvalidated, turns
 * this product's own sign-in page into the first half of a credential-phishing flow. So every
 * candidate destination goes through {@link safeInternalTarget} and anything that is not a plain,
 * same-origin, in-app path is discarded in favour of `/`.
 *
 * The rules are deliberately a whitelist of shape rather than a blacklist of attacks:
 *
 *  - it must be a path, beginning with exactly one `/` — so `https://evil`, `//evil` and
 *    `/\evil` (which several parsers read as protocol-relative) are all out;
 *  - it must resolve to this origin when parsed against it, which is the same check again from
 *    the other end and catches anything the string rules did not anticipate;
 *  - it must carry no backslash, whitespace or control character, because those are how a target
 *    smuggles a second meaning past a reader;
 *  - it must not be `/demo`, because an account sign-in that lands in the device-local showcase
 *    would be telling a signed-in learner their progress lives in this browser;
 *  - it must not be one of the account screens, because handing somebody who has just signed in
 *    back to a sign-in form is a loop.
 */

/** Every path the account boundary itself owns; mirrors `AuthGate`'s own table. */
export const AUTH_SCREEN_PATHS: readonly string[] = [
  "/sign-in",
  "/create-account",
  "/forgot-password",
  "/reset-password",
];

/** The ordinary route, and the answer whenever no safe destination survives validation. */
export const DEFAULT_POST_AUTH_TARGET = "/";

/** Where an intended destination is parked while the learner authenticates. */
export const RETURN_TO_STORAGE_KEY = "cr.auth.returnTo";

/** Long enough for any real in-app address, short enough that nothing can be smuggled. */
const MAX_TARGET_LENGTH = 512;

export function isAuthScreenPath(pathname: string): boolean {
  return AUTH_SCREEN_PATHS.includes(pathname);
}

function originOf(): string {
  return typeof window === "undefined" ? "https://app.invalid" : window.location.origin;
}

/**
 * The candidate as an in-app path, or `null` when it is anything else.
 *
 * Returns the normalised `pathname + search + hash`, so a target cannot carry an origin it
 * merely resolved to.
 */
export function safeInternalTarget(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const candidate = raw.trim();
  if (
    candidate.length === 0 ||
    candidate.length > MAX_TARGET_LENGTH ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    /[\\]/.test(candidate) ||
    // Control characters and whitespace: a target that needs one is not a target.
    // biome-ignore lint/suspicious/noControlCharactersInRegex: rejecting them is the point.
    /[\u0000-\u0020\u007f]/.test(candidate)
  ) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(candidate, originOf());
  } catch {
    return null;
  }
  if (url.origin !== originOf()) {
    return null;
  }
  if (url.pathname === "/demo" || url.pathname.startsWith("/demo/")) {
    return null;
  }
  if (isAuthScreenPath(url.pathname)) {
    return null;
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

interface ReturnToStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStorage(): ReturnToStorage | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Park the destination this visit was aimed at, if any.
 *
 * `sessionStorage` rather than `localStorage`: an intended destination belongs to this tab and
 * this visit, and one left lying around would redirect a completely unrelated sign-in a week
 * later. Two sources are considered, both validated identically — an explicit `?next=`, and the
 * address the unauthenticated visitor actually asked for.
 */
export function rememberIntendedRoute(
  location: { readonly pathname: string; readonly search: string } = typeof window ===
  "undefined"
    ? { pathname: "/", search: "" }
    : { pathname: window.location.pathname, search: window.location.search },
  storage: ReturnToStorage | null = defaultStorage(),
): string | null {
  if (!storage) {
    return null;
  }
  const requested = new URLSearchParams(location.search).get("next");
  const target =
    safeInternalTarget(requested) ??
    safeInternalTarget(`${location.pathname}${location.search}`);
  if (target === null || target === DEFAULT_POST_AUTH_TARGET) {
    return null;
  }
  try {
    storage.setItem(RETURN_TO_STORAGE_KEY, target);
  } catch {
    // A blocked store costs the learner a landing on `/`, which is a correct destination.
  }
  return target;
}

/**
 * The destination to hand a freshly authenticated learner, consuming whatever was parked.
 *
 * Always returns a usable path; the parked value is re-validated on the way out, because it was
 * written by an earlier version of this code as far as this call is concerned.
 */
export function consumePostAuthTarget(
  storage: ReturnToStorage | null = defaultStorage(),
): string {
  if (!storage) {
    return DEFAULT_POST_AUTH_TARGET;
  }
  let parked: string | null = null;
  try {
    parked = storage.getItem(RETURN_TO_STORAGE_KEY);
    storage.removeItem(RETURN_TO_STORAGE_KEY);
  } catch {
    parked = null;
  }
  return safeInternalTarget(parked) ?? DEFAULT_POST_AUTH_TARGET;
}
