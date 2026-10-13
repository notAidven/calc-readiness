import { type ReactElement, useState } from "react";

import { useReducedMotion } from "../city/useReducedMotion";
import { isDevPersistenceEnabled } from "../devPersistence/devSession";
import { SuccessionAdvisor } from "./SuccessionAdvisor";
import { successionBriefing } from "./successionBriefing";
import { SuccessionSurface, type SuccessionSurfaceProps } from "./SuccessionSurface";

/**
 * Authored forum fixture, retained only for geometry review.
 *
 * The learner-visible `?succession` destination is handled by `App` as a city launch. This
 * fixture has its own explicit `?succession-fixture` hatch and cannot render on a server-backed
 * learner build.
 */
export function SuccessionFixtureRoute(props: SuccessionSurfaceProps = {}): ReactElement {
  const reducedMotion = useReducedMotion();
  const briefing = successionBriefing();
  const [speaking, setSpeaking] = useState(true);

  if (!isDevPersistenceEnabled()) {
    return (
      <main className="sx-shell sx-shell--loading">
        <p>Authored forum fixture is available only in local review builds.</p>
      </main>
    );
  }

  return (
    <>
      <p className="sx-fixture-label">Authored forum fixture · dev only</p>
      <SuccessionSurface
        {...props}
        reducedMotion={reducedMotion}
        presentation="prototype"
        advisorName={briefing.advisorName}
        onTalkToAdvisor={() => setSpeaking(true)}
        enableCanvas={props.enableCanvas ?? true}
      />
      {speaking && (
        <SuccessionAdvisor
          briefing={briefing}
          onBegin={() => setSpeaking(false)}
          onLater={() => setSpeaking(false)}
        />
      )}
    </>
  );
}

export default SuccessionFixtureRoute;
