import type { ReactElement } from "react";

/** Physical influence tablet: equal unnumbered seats, with counters standing proud. */
export function SuccessionSlab({
  banked,
  seats = Math.max(3, banked),
  perLine = 3,
  label = `${banked} influence`,
}: {
  readonly banked: number;
  readonly seats?: number;
  readonly perLine?: number;
  readonly label?: string;
}): ReactElement {
  const gap = 18;
  const radius = 5;
  const rows = Math.ceil(seats / perLine);
  return (
    <svg
      className="sx-slab"
      viewBox={`0 0 ${perLine * gap + 8} ${rows * gap + 8}`}
      width={perLine * gap + 8}
      height={rows * gap + 8}
      role="img"
      aria-label={label}
    >
      <rect
        className="sx-slab__stone"
        x="0"
        y="0"
        width={perLine * gap + 8}
        height={rows * gap + 8}
        rx="3"
      />
      {Array.from({ length: seats }, (_, index) => {
        const cx = 13 + (index % perLine) * gap;
        const cy = 13 + Math.floor(index / perLine) * gap;
        const filled = index < banked;
        return (
          <g key={`seat-${cx}-${cy}`}>
            <circle className="sx-slab__seat" cx={cx} cy={cy} r={radius + 1} />
            {filled && (
              <>
                <circle
                  className="sx-slab__counter-shadow"
                  cx={cx + 1.5}
                  cy={cy + 1.5}
                  r={radius}
                />
                <circle className="sx-slab__counter" cx={cx} cy={cy} r={radius} />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
