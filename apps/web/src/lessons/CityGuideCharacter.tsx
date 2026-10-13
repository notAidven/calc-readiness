/**
 * The CityGuide advisor character — a friendly hard-hat construction guide holding
 * a rolled blueprint, ported from the in-repo design source
 * `apps/web/src/city/art/sources/CityGuide.dc.html` (a 240×240 SVG).
 *
 * PRESERVED AND DELIBERATELY UNWIRED since 2026-07-28. **Nothing in the product imports
 * this file.** Era one is the Prehistoric Era and its advisor is Oru
 * (`OruAdvisorCharacter`), which replaced this guide in both surfaces that hosted it —
 * `AdvisorNpc` and `city/onboarding/DemoReel`. The hard hat, hi-vis and skyline badge are
 * roughly eras 8-10 vocabulary, and per D-ERA28 the advisor is per-era art re-dressed at
 * every advance, so this comes back when its era does. Do not delete it, and do not let
 * its `.city-guide` block in `styles.css` be tidied away with it: two guards
 * (`cityGuidePreserved.test.tsx` and `cityGuidePreserved.browser.test.tsx`) stand in for
 * the consumer it no longer has. See `city/art/sources/README.md`.
 *
 * The `mood` prop drives four poses (matching the source's `renderVals`):
 *   - `idle`  — gentle arm sway, open (blinking) eyes, a calm smile
 *   - `talk`  — the mouth chatters (smile fades to an open, animating mouth)
 *   - `wave`  — the right arm waves
 *   - `cheer` — the arm waves AND the eyes switch to happy arcs
 *
 * All motion is CSS, keyed off `data-mood` and scoped under `.city-guide` in
 * `styles.css`, and gated by `prefers-reduced-motion` — so this component is pure,
 * static markup and swapping moods never re-mounts anything.
 */
export type CityGuideMood = "idle" | "talk" | "wave" | "cheer";

export function CityGuideCharacter({ mood = "idle" }: { mood?: CityGuideMood }) {
  return (
    <svg
      className="city-guide"
      data-mood={mood}
      viewBox="0 0 240 240"
      role="img"
      aria-label="Your city guide, a friendly construction advisor"
    >
      {/* ambient city sparkles */}
      <g fill="#E7B24B" opacity="0.9">
        <rect className="city-guide__spark" x="42" y="60" width="7" height="7" rx="1.6" />
        <circle className="city-guide__spark" cx="196" cy="72" r="3.4" />
        <rect className="city-guide__spark" x="188" y="118" width="6" height="6" rx="1.4" />
        <circle className="city-guide__spark" cx="48" cy="120" r="3" />
      </g>

      {/* ground shadow */}
      <ellipse cx="120" cy="216" rx="56" ry="11" fill="rgba(6,20,15,0.30)" />

      <g className="city-guide__body">
        {/* feet */}
        <ellipse cx="101" cy="207" rx="15" ry="9" fill="#24564A" />
        <ellipse cx="139" cy="207" rx="15" ry="9" fill="#24564A" />

        {/* left arm holding a rolled blueprint */}
        <g>
          <rect x="70" y="132" width="20" height="50" rx="10" fill="#2F6E5E" />
          <circle cx="80" cy="184" r="12" fill="#F6E6C8" />
          <g transform="rotate(-24 80 176)">
            <rect x="62" y="150" width="36" height="15" rx="7.5" fill="#EAF2ED" />
            <rect x="62" y="150" width="7" height="15" rx="3.5" fill="#2F6E5E" />
            <rect x="91" y="150" width="7" height="15" rx="3.5" fill="#2F6E5E" />
            <line x1="74" y1="155" x2="90" y2="155" stroke="#7FB0A2" strokeWidth="1.4" />
            <line x1="74" y1="159" x2="86" y2="159" stroke="#7FB0A2" strokeWidth="1.4" />
          </g>
        </g>

        {/* torso / hi-vis jacket */}
        <rect x="76" y="118" width="88" height="80" rx="30" fill="#2F6E5E" />
        <rect x="94" y="122" width="52" height="76" rx="22" fill="#E7B24B" />
        <rect
          x="101"
          y="126"
          width="9"
          height="70"
          rx="4.5"
          fill="#F6E6C8"
          opacity="0.85"
        />
        <rect
          x="130"
          y="126"
          width="9"
          height="70"
          rx="4.5"
          fill="#F6E6C8"
          opacity="0.85"
        />

        {/* chest skyline badge */}
        <g transform="translate(108,150)">
          <rect x="0" y="0" width="24" height="20" rx="4" fill="#1F4E44" />
          <rect x="3" y="9" width="5" height="9" fill="#EAF2ED" />
          <rect x="9.5" y="5" width="5" height="13" fill="#EAF2ED" />
          <rect x="16" y="8" width="5" height="10" fill="#EAF2ED" />
        </g>

        {/* right arm (sways / waves) */}
        <g className="city-guide__arm">
          <rect x="150" y="132" width="20" height="48" rx="10" fill="#2F6E5E" />
          <circle cx="160" cy="182" r="12" fill="#F6E6C8" />
        </g>

        {/* neck */}
        <rect x="110" y="104" width="20" height="16" rx="8" fill="#EAD3AE" />

        {/* head */}
        <circle cx="120" cy="86" r="42" fill="#F6E6C8" />
        <ellipse cx="80" cy="88" rx="7" ry="9" fill="#F0DCBB" />
        <ellipse cx="160" cy="88" rx="7" ry="9" fill="#F0DCBB" />

        {/* cheeks */}
        <ellipse cx="98" cy="98" rx="8" ry="5" fill="#E79E82" opacity="0.55" />
        <ellipse cx="142" cy="98" rx="8" ry="5" fill="#E79E82" opacity="0.55" />

        {/* eyebrows */}
        <rect x="92" y="70" width="17" height="5" rx="2.5" fill="#8A5E3C" />
        <rect x="131" y="70" width="17" height="5" rx="2.5" fill="#8A5E3C" />

        {/* open eyes (blink) — hidden on cheer */}
        <g className="city-guide__eyes-open">
          <g className="city-guide__eye">
            <ellipse cx="101" cy="86" rx="7" ry="9" fill="#22332C" />
            <circle cx="103.4" cy="82.5" r="2.4" fill="#fff" />
          </g>
          <g className="city-guide__eye">
            <ellipse cx="139" cy="86" rx="7" ry="9" fill="#22332C" />
            <circle cx="141.4" cy="82.5" r="2.4" fill="#fff" />
          </g>
        </g>

        {/* happy eyes (cheer) */}
        <g
          className="city-guide__eyes-happy"
          fill="none"
          stroke="#22332C"
          strokeWidth="5"
          strokeLinecap="round"
        >
          <path d="M93 89 Q101 79 109 89" />
          <path d="M131 89 Q139 79 147 89" />
        </g>

        {/* mouth: smile (idle) + chatter (talk) */}
        <path
          className="city-guide__mouth-smile"
          d="M108 103 Q120 114 132 103"
          fill="none"
          stroke="#B5654A"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <ellipse
          className="city-guide__mouth-talk"
          cx="120"
          cy="106"
          rx="8"
          ry="7"
          fill="#9C4A3A"
        />

        {/* hard hat */}
        <g className="city-guide__hat">
          <ellipse cx="120" cy="58" rx="50" ry="13" fill="#E7B24B" />
          <ellipse cx="120" cy="56" rx="50" ry="10" fill="#F0C165" />
          <path d="M86 58 Q88 26 120 24 Q152 26 154 58 Z" fill="#E7B24B" />
          <path
            d="M86 58 Q88 26 120 24 Q136 25 145 40 Q120 30 96 52 Z"
            fill="#F0C165"
            opacity="0.75"
          />
          <rect x="115" y="26" width="10" height="30" rx="4" fill="#C9922F" />
          <circle cx="120" cy="30" r="5" fill="#F6E6C8" />
        </g>
      </g>
    </svg>
  );
}
