import type { PlagueState } from "@cr/game";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import type * as THREE from "three";

import type { PlagueSession } from "../../plague/plaguePersistence";
import { plagueWorldFrom } from "../../plague/plagueWorld";
import { buildCareHouseLayer, disposeCareHouseLayer } from "../../plague/careHouseScene";
import type { PlacedTransform } from "../worldLayout";

const PlagueSurface = lazy(async () => ({
  default: (await import("../../plague/PlagueSurface")).PlagueSurface,
}));

export interface PlagueInCityProps {
  readonly session: PlagueSession;
  readonly placements: readonly PlacedTransform[];
  readonly townHall: PlacedTransform;
  readonly practisedNodeIds: readonly string[];
  readonly onLayer: (layer: THREE.Object3D | null) => void;
  readonly onExit: () => void;
}

/** The Care House controls over the city, with its temporary kit on the city's own canvas. */
export function PlagueInCity({
  session,
  placements,
  townHall,
  practisedNodeIds,
  onLayer,
  onExit,
}: PlagueInCityProps) {
  const [state, setState] = useState<PlagueState | null>(null);
  const world = useMemo(
    () => plagueWorldFrom(placements, townHall),
    [placements, townHall],
  );
  const labels = useMemo(
    () => Object.fromEntries(world.nodes.map((node) => [node.id, node.label])),
    [world],
  );
  const layer = useMemo(
    () =>
      state === null
        ? null
        : buildCareHouseLayer({
            state,
            world,
          }),
    [state, world],
  );

  useEffect(() => {
    onLayer(layer);
    return () => onLayer(null);
  }, [layer, onLayer]);

  useEffect(
    () => () => {
      if (layer !== null) {
        disposeCareHouseLayer(layer);
      }
    },
    [layer],
  );

  const mastered = useMemo(() => () => practisedNodeIds, [practisedNodeIds]);

  return (
    <div className="plague-in-city" data-testid="plague-in-city">
      <Suspense
        fallback={
          <p className="pl-care-shell pl-care-shell--loading">Opening the Care House…</p>
        }
      >
        <PlagueSurface
          session={session}
          readMasteredNodes={mastered}
          nodeLabels={labels}
          onStateChange={setState}
          onExit={onExit}
        />
      </Suspense>
    </div>
  );
}
