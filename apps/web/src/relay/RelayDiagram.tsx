import type { RelayAction } from "@cr/game";
import type { ReactElement } from "react";

export interface RelayDiagramProps {
  readonly dark: number;
  readonly shuttersClosed: number;
  readonly copy: "ready" | "spent";
  readonly proposal?: RelayAction | null;
}

/**
 * Deterministic fallback for the real island renderer.
 *
 * It uses the approved record, crest, shutter and cartridge grammar. The production in-city
 * mount leaves this slot transparent and shows the actual island beneath the rail instead.
 */
export function RelayDiagram({
  dark,
  shuttersClosed,
  copy,
  proposal = null,
}: RelayDiagramProps): ReactElement {
  const cells = Array.from({ length: 9 }, (_, index) => index);
  const shutters = Array.from({ length: 3 }, (_, index) => index);
  return (
    <svg
      className="relay-diagram"
      viewBox="0 0 560 440"
      role="img"
      aria-label={`The Civic Archive Relay. ${dark} of its nine bands have been overwritten.`}
      data-testid="relay-diagram"
    >
      <title>{`The Civic Archive Relay. ${dark} of its nine bands have been overwritten.`}</title>
      <path d="M30 372 280 224 530 372 280 430Z" fill="#a9a49a" stroke="#7d786f" />
      <rect x="154" y="105" width="252" height="275" fill="#96a1ab" />
      <rect x="382" y="105" width="24" height="275" fill="#6c747b" />
      <rect x="154" y="105" width="252" height="14" fill="#bdc8d1" />

      <g data-testid="relay-crest">
        {cells.map((index) => {
          const taken = index < dark;
          return (
            <rect
              key={index}
              x={166 + index * 26}
              y={taken ? 94 : 66}
              width="16"
              height={taken ? 10 : 38}
              fill={taken ? "#5d686e" : "#c3dae3"}
              data-state={taken ? "folded" : "standing"}
            />
          );
        })}
      </g>

      <g data-testid="relay-intake">
        <rect x="198" y="128" width="164" height="54" fill="#464f55" />
        {shutters.map((index) => {
          const closed = index < shuttersClosed;
          const proposed = proposal === "cut" && !closed;
          return (
            <rect
              key={index}
              x={207 + index * 52}
              y="137"
              width="42"
              height="36"
              fill={closed ? "#8b959c" : "#2c3236"}
              stroke={proposed ? "#f4fdff" : "#464f55"}
              strokeWidth={proposed ? 4 : 2}
              data-state={closed ? "closed" : proposed ? "proposed" : "open"}
            />
          );
        })}
      </g>

      <g data-testid="relay-record">
        <rect x="174" y="204" width="212" height="112" fill="#5d686e" />
        <rect x="182" y="212" width="196" height="96" fill="#464f55" />
        {cells.map((index) => {
          const taken = index < dark;
          const x = 188 + index * 20.5;
          return (
            <g key={index} data-state={taken ? "taken" : "standing"}>
              <rect
                x={x}
                y="220"
                width="16"
                height="80"
                fill={taken ? "#262b2f" : "#c3dae3"}
                stroke="#5d686e"
              />
              {taken ? (
                <rect x={x + 2} y="258" width="12" height="4" fill="#9db0b7" />
              ) : (
                <rect x={x + 4} y="231" width="8" height="58" fill="#f4fdff" />
              )}
            </g>
          );
        })}
      </g>

      <g data-testid="relay-copy">
        <rect
          x="240"
          y="334"
          width="80"
          height="24"
          fill="#2c3236"
          stroke={proposal === "restore" ? "#f4fdff" : "#464f55"}
          strokeWidth={proposal === "restore" ? 4 : 2}
        />
        {copy === "spent" && (
          <rect x="249" y="340" width="62" height="12" fill="#c3dae3" stroke="#f4fdff" />
        )}
      </g>
    </svg>
  );
}
