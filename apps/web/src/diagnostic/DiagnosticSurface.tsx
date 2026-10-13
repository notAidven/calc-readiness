import { DiagnosticRunner, type PlacementSeed } from "./DiagnosticRunner";

/**
 * Lazy entry point for the in-world "Survey" surface. Owns the auth session so
 * the whole diagnostic — session provider, Cognito auth, engine runtime, and
 * item pack — code-splits into its own chunk and never weighs down the
 * city-first initial load (the same pattern as the lazy `CheckerLab`).
 */
export function DiagnosticSurface({
  onPretestComplete,
  onExit,
}: {
  onPretestComplete?: (
    placement: PlacementSeed,
    unlockedNodeIds: readonly string[],
  ) => void | Promise<void>;
  /** Close the overlay and return to the (now-seeded) city from the hand-off. */
  onExit?: () => void;
}) {
  return <DiagnosticRunner onPretestComplete={onPretestComplete} onExit={onExit} />;
}
