import { type ReactElement, useId } from "react";

/**
 * A deliberately old-world lock: a deep curved shackle, chamfered forged body,
 * rivets and a cut keyhole. The surrounding copy owns the reason for the lock;
 * this component owns the visual and its accessible state label.
 */
export function ClassicIslandLock({
  label,
  className = "",
  visibleLabel = "Entry locked",
}: {
  readonly label: string;
  readonly className?: string;
  readonly visibleLabel?: string;
}): ReactElement {
  const metalId = useId();
  const ironId = useId();

  return (
    <div
      className={`archipelago-classic-lock ${className}`.trim()}
      data-testid="archipelago-classic-lock"
      role="img"
      aria-label={label}
    >
      <svg viewBox="0 0 104 126" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={ironId} x1="16" y1="10" x2="86" y2="72">
            <stop offset="0" stopColor="#716b5b" />
            <stop offset="0.35" stopColor="#302f2b" />
            <stop offset="0.68" stopColor="#171b1b" />
            <stop offset="1" stopColor="#514b3d" />
          </linearGradient>
          <linearGradient id={metalId} x1="15" y1="52" x2="88" y2="118">
            <stop offset="0" stopColor="#b18a46" />
            <stop offset="0.24" stopColor="#73552d" />
            <stop offset="0.56" stopColor="#473522" />
            <stop offset="0.8" stopColor="#806239" />
            <stop offset="1" stopColor="#32291f" />
          </linearGradient>
        </defs>

        <path
          d="M27 57V37C27 18 37 9 52 9s25 9 25 28v20"
          fill="none"
          stroke="#111716"
          strokeWidth="18"
          strokeLinecap="square"
        />
        <path
          d="M27 57V37C27 18 37 9 52 9s25 9 25 28v20"
          fill="none"
          stroke={`url(#${ironId})`}
          strokeWidth="12"
          strokeLinecap="square"
        />
        <path
          d="M30 36C30 20 38 13 52 13"
          fill="none"
          stroke="#9a9076"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.55"
        />

        <path
          d="M13 55 21 47h62l8 8v56l-8 8H21l-8-8Z"
          fill="#171b1b"
          stroke="#111411"
          strokeWidth="5"
          strokeLinejoin="miter"
        />
        <path
          d="M17 57 24 51h56l7 6v51l-7 7H24l-7-7Z"
          fill={`url(#${metalId})`}
          stroke="#c49a53"
          strokeWidth="1.5"
          strokeLinejoin="miter"
        />
        <path
          d="M23 62h58M23 106h58"
          fill="none"
          stroke="#d0ad67"
          strokeWidth="2"
          opacity="0.34"
        />
        <path
          d="M28 56 21 66v35l8 10M76 56l7 10v35l-8 10"
          fill="none"
          stroke="#241e19"
          strokeWidth="2.4"
          opacity="0.75"
        />
        <circle cx="28" cy="67" r="3.4" fill="#29251f" stroke="#b58b4d" />
        <circle cx="76" cy="67" r="3.4" fill="#29251f" stroke="#b58b4d" />
        <circle cx="28" cy="101" r="3.4" fill="#29251f" stroke="#b58b4d" />
        <circle cx="76" cy="101" r="3.4" fill="#29251f" stroke="#b58b4d" />

        <path
          d="M52 70a9 9 0 0 0-5 16l-4 17h18l-4-17a9 9 0 0 0-5-16Z"
          fill="#141817"
          stroke="#c39a57"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="m31 78 8-3m29 24 8-3M34 92l6 2m28-12 6 2"
          fill="none"
          stroke="#d4b978"
          strokeWidth="1.7"
          strokeLinecap="round"
          opacity="0.42"
        />
      </svg>
      <span aria-hidden="true">{visibleLabel}</span>
    </div>
  );
}
