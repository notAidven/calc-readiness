import { type ReactElement, useState } from "react";

import { CityReturnFromIntrusion } from "../intrusion/IntrusionEntryChip";
import { RelaySurface, type RelaySurfaceProps } from "./RelaySurface";

export const RELAY_ANNOUNCEMENT = {
  heading: "Someone is rewriting the record",
  body: "A counterfeit broadcast is overwriting the city's public record. Four of its nine bands are already gone. You have three rounds and one clean copy.",
  control: "Go and look",
} as const;

export function RelayRoute(props: RelaySurfaceProps = {}): ReactElement {
  const [announcing, setAnnouncing] = useState(true);
  return (
    <div className="city-shell">
      <RelaySurface {...props} />
      {announcing && (
        <div className="relay-announcement" data-testid="relay-announcement">
          <section aria-labelledby="relay-announcement-title">
            <h2 id="relay-announcement-title">{RELAY_ANNOUNCEMENT.heading}</h2>
            <p>{RELAY_ANNOUNCEMENT.body}</p>
            <div>
              <button
                type="button"
                className="primary-action"
                data-testid="relay-announcement-go"
                onClick={() => setAnnouncing(false)}
              >
                {RELAY_ANNOUNCEMENT.control}
              </button>
              <CityReturnFromIntrusion />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
