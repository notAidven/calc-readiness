import type { SuccessionBoardView } from "../../succession/successionView";
import { successionClaimant } from "../../succession/successionView";
import type { SuccessionCityBinding } from "../../succession/successionCity";
import { footprintFor, GRID_CELL, rotationYFor, transformCenter } from "../worldLayout";
import {
  buildAssemblySupporters,
  buildClaimPost,
  buildDriftBlock,
  buildFigure,
  buildPlinth,
  buildShearLegs,
  ghostSuccession,
  PLINTH_HEIGHT,
} from "./successionScene";
import * as THREE from "three";

export const CITY_WARD_MARKER_NAME = "succession-city-ward";

/**
 * Build the Succession's state markers around the buildings that actually stand in the city.
 *
 * Buildings remain the city's own GLBs in the shared scene. This layer adds only the dispute:
 * a ground-set claim post, claimant statue and supporters, or the next hoist. The placement id
 * on each group is the city session's stable identity and never an authored stand-in.
 */
export function buildCivicConflictLayer(
  view: SuccessionBoardView,
  bindings: readonly SuccessionCityBinding[],
): THREE.Group {
  const layer = new THREE.Group();
  layer.name = "succession-city-conflict";
  layer.userData.boundPlacementIds = bindings.map((binding) => binding.placement.nodeId);

  for (const binding of bindings) {
    const district = view.districts.find(
      (candidate) => candidate.id === binding.district.id,
    );
    if (!district) {
      continue;
    }
    const fp = footprintFor(binding.placement.nodeId);
    const center = transformCenter(binding.placement, fp);
    const turn = rotationYFor(binding.placement.rot);
    const clearance = (Math.max(fp.w, fp.d) * GRID_CELL) / 2 + 1.8;
    const x = center.x + Math.sin(turn) * clearance;
    const z = center.z + Math.cos(turn) * clearance;

    const marker = new THREE.Group();
    marker.name = CITY_WARD_MARKER_NAME;
    marker.userData.districtId = district.id;
    marker.userData.placementId = binding.placement.nodeId;
    marker.position.set(x, 0, z);
    marker.rotation.y = turn;

    if (district.figure !== "none") {
      const claimant = successionClaimant(district.figure);
      const plinth = buildPlinth();
      plinth.scale.setScalar(0.72);
      marker.add(plinth);

      const figure = buildFigure(claimant.pose);
      figure.position.y = PLINTH_HEIGHT * 0.72;
      figure.scale.setScalar(0.72);
      marker.add(figure);

      const standard = buildClaimPost(claimant.mark, 3);
      standard.position.set(-1.25, 0, 0.4);
      marker.add(standard);

      const supporters = buildAssemblySupporters(claimant.mark);
      supporters.position.set(0, 0, 2.1);
      supporters.scale.setScalar(0.82);
      marker.add(supporters);
    } else if (district.proposed_figure !== null) {
      const claimant = successionClaimant(district.proposed_figure);
      const proposal = ghostSuccession(buildFigure(claimant.pose));
      proposal.position.y = PLINTH_HEIGHT * 0.72;
      proposal.scale.setScalar(0.72);
      marker.add(proposal);
    }

    if (district.block !== null) {
      const legs = buildShearLegs("slack");
      legs.scale.setScalar(0.72);
      marker.add(legs);
      const block = buildDriftBlock(district.block.mark);
      block.position.set(1.7, 0, 0.2);
      block.scale.setScalar(0.82);
      marker.add(block);
    }

    layer.add(marker);
  }
  return layer;
}
