import {
  elsewhere,
  type MechanicCoverage,
  noAnalogue,
  ownedByTheCrisis,
  sharedSeam,
} from "./mechanics";
import type { CrisisPropagation } from "./propagation";

/**
 * The redesigned Intrusion has one ordered probe route over the learner's real buildings.
 * Unlike era six's graph, this route has no branch and no edge the player can sever.
 */
export const INTRUSION_PROPAGATION: CrisisPropagation<never> = {
  read: "probing",
  job: "watch-a-probe",
  topology: {
    kind: "city-route",
    movesWhen: "breached-round",
    visits: "real-building",
  },
  layer: {
    kind: "mounted",
    carrier: { kind: "standing-object", anchor: "city-route" },
    markName: "intrusion-city-layer",
    componentPath: "apps/web/src/city/three/IntrusionCityLayer.tsx",
  },
};

/** The reference pack's twenty-four mechanics, answered for Cut-or-Restore. */
export const INTRUSION_MECHANIC_COVERAGE: MechanicCoverage = {
  M1: elsewhere(
    "apps/web/src/city/crisisCall.ts",
    "the production mid-era call and Oru's three concise briefing steps",
  ),
  M2: elsewhere(
    "apps/web/src/city/crisisCall.ts",
    "the unanswered call waits while lessons remain available and no crisis round advances",
  ),
  M3: sharedSeam(
    "atmosphere",
    "INTRUSION_LIGHT and crisis framing are present only while the crisis owns the actual island",
  ),
  M4: sharedSeam(
    "atmosphere",
    "the neutral late key, long shadows, restrained exposure and pulled fog are registered",
  ),
  M5: ownedByTheCrisis(
    "one hard-edged route crosses the real settlement and changes only when a resolved breach advances it",
  ),
  M6: noAnalogue("the water does not change because the broadcast is not a physical flood"),
  M7: noAnalogue("planting does not change because nothing in the city is abandoned"),
  M8: ownedByTheCrisis(
    "a directional physical probe occupies one real building while the nine-cell record carries pressure",
  ),
  M9: sharedSeam(
    "propagation",
    "the mounted city route advances one real-building hop exactly when a resolved round lets feed through",
  ),
  M10: ownedByTheCrisis(
    "Cover closes physical intake bars on real buildings; Trace writes from the one clean cartridge and then reopens them",
  ),
  M11: ownedByTheCrisis(
    "idle, outlined cover, closed cover, tracing, stale evidence and spent-copy states are visible in world and rail",
  ),
  M12: noAnalogue(
    "there is no aimed footprint because both actions act on the single Civic Archive Relay",
  ),
  M13: ownedByTheCrisis(
    "an armed Cover outlines three building covers and an armed Trace poses a return ring without committing either",
  ),
  M14: noAnalogue(
    "nothing advances or expires on time because every change is caused by a resolved batch",
  ),
  M15: ownedByTheCrisis(
    "closed covers persist on real buildings across Cover rounds and protect the current Trace round before reopening",
  ),
  M16: ownedByTheCrisis(
    "the active probe is a hard triangular silhouette over the building currently carrying the feed",
  ),
  M17: sharedSeam(
    "damage-overlay",
    "earlier evidence plates retain their bars but tilt, dim and take a diagonal cut when the epoch advances",
  ),
  M18: noAnalogue(
    "the relay is never ruined because the crisis leaves a visible record scar and withholds no building",
  ),
  M19: noAnalogue("no ground is lost because the crisis writes no ground damage"),
  M20: elsewhere(
    "apps/web/src/city/RecordVerification.tsx",
    "one optional three-question verification restores one band per right answer for no material",
  ),
  M21: noAnalogue("no ground is lost, so there is no ground-reclamation action"),
  M22: ownedByTheCrisis(
    "both armed cards enumerate all four score consequences before the learner commits",
  ),
  M23: ownedByTheCrisis(
    "probe travel, trace rotation and answer locks happen only from player state; reduced motion holds every carrier posed",
  ),
  M24: elsewhere(
    "apps/web/src/relay/RelaySurface.tsx",
    "the production ending sits over the resulting city, names containment or the remaining crossed-band scar, and leads with Return to my city",
  ),
};
