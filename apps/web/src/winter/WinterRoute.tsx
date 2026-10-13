import { type ReactElement, useState } from "react";
import { CrisisCallAdvisor } from "../city/CrisisCallAdvisor";
import { crisisBriefingForCity } from "../city/crisisCall";
import { loadEraId } from "../city/eraState";
import { HardWinterSurface, type HardWinterSurfaceProps } from "./HardWinterSurface";

/**
 * THE `?winter` ROUTE, WITH THE ADVISOR IN FRONT OF IT.
 *
 * ## The fault this exists to close
 *
 * The speech bubble and the stepped slides shipped in #322, and they render from
 * `CitySurface`. `App.tsx` short-circuits on `?winter` and returns `HardWinterSurface`
 * directly, several branches ABOVE the one that mounts `CitySurface`, so on that route the
 * advisor could not appear at all: not hidden by a flag, not lost to a gate, absent by
 * construction. Measured rather than reasoned about, in `winterRouteAdvisor.test.tsx`.
 *
 * That route is the one the encounter is demonstrated from, so this is where the card has to
 * be reachable. It is the SAME card: `CrisisCallAdvisor` with a briefing off
 * `crisisBriefingForCity`, which is the second half of the same fault — the terms used to
 * exist for era one alone, and the lead's save is in era two.
 *
 * ## Why a wrapper and not a flag inside the surface
 *
 * Because the in-city mount already has an advisor in front of it, and putting one inside
 * `HardWinterSurface` would give that path two. The entry sequence belongs to whoever OPENS
 * the encounter, which is `CitySurface` on one route and this component on the other; the
 * surface itself stays the thing that plays a winter and knows nothing about being announced.
 *
 * ## Nothing here gates anything
 *
 * `onFace` and `onLater` do the same thing, because on this route there is nothing to defer
 * to: the winter is the whole page, so "Not yet" can only mean "put the card away". The
 * encounter is mounted UNDERNEATH from the first frame rather than being swapped in, so
 * dismissing the card reveals a board that is already there, and `Escape` and the corner
 * close work the way they do in the city. The chip in the surface's header brings it back,
 * so a dismissal is not one-way for somebody presenting this.
 */
export function WinterRoute(props: HardWinterSurfaceProps = {}): ReactElement {
  // The era the CITY is standing in, which decides whose advisor speaks and which board
  // gets resolved behind him. `?winter` is opened cold, so storage is the only city there
  // is to read, exactly as `HardWinterSurface` reads it for the same reason.
  const briefing = crisisBriefingForCity(props.liveEraId ?? loadEraId());
  const [open, setOpen] = useState(true);

  return (
    <>
      <HardWinterSurface
        {...props}
        advisorName={briefing?.advisorName ?? null}
        onTalkToAdvisor={briefing === null ? undefined : () => setOpen(true)}
      />
      {briefing !== null && open && (
        <CrisisCallAdvisor
          briefing={briefing}
          onFace={() => setOpen(false)}
          onLater={() => setOpen(false)}
        />
      )}
    </>
  );
}
