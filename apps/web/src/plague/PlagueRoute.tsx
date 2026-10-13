import { getEraOrThrow } from "@cr/skill-graph";
import type { UUID } from "@cr/state-schema";
import { type ReactElement, useMemo } from "react";

import { CitySurface } from "../city/CitySurface";
import { MOCK_CITY_LOAD } from "../city/mockCity";
import { cityHrefFromPlague } from "./PlagueEntryChip";
import type { PlagueSurfaceProps } from "./PlagueSurface";
import { createLocalPlagueSession } from "./plaguePersistence";

const previewLoad = async () => ({
  ...MOCK_CITY_LOAD,
  node_states: [
    ...MOCK_CITY_LOAD.node_states,
    ...getEraOrThrow("renaissance")
      .nodes.slice(0, 3)
      .map((nodeId) => ({
        student_id:
          MOCK_CITY_LOAD.node_states[0]?.student_id ??
          ("00000000-0000-4000-8000-000000000006" as UUID),
        node_id: nodeId,
        placement_estimate: 3 as const,
        mastery: 3 as const,
        mastery_updated_at: null,
        completion_status: "complete" as const,
        lesson_stage: "done" as const,
        last_practiced_at: null,
      })),
  ],
});

/** Reviewer door. The learner path uses the same in-city mount over their loaded session. */
export function PlagueRoute(props: PlagueSurfaceProps = {}): ReactElement {
  const session = useMemo(
    () =>
      props.session ??
      createLocalPlagueSession({
        storage: window.localStorage,
        userKey: "plague-route-preview",
      }),
    [props.session],
  );
  return (
    <div className="city-shell">
      <CitySurface
        enableCanvas
        eraId="renaissance"
        loadCity={previewLoad}
        plagueSession={session}
        initialPlagueInCity
        onPlagueExit={
          props.onExit ??
          (() => {
            window.location.assign(cityHrefFromPlague(window.location.href));
          })
        }
        onOpenSurface={() => undefined}
      />
      <style>
        {".achievement-note, [data-testid='ob-dev-replay'] { display: none !important; }"}
      </style>
    </div>
  );
}
