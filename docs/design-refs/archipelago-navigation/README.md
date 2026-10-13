# Archipelago learner frames

All files in this directory are **1024×580 captures of the real learner `CitySurface`**
with `?bay` on the URL. They are not `?dev`, a bare component mount, or a crop.

The `1024x580-camera-*` sequence is the camera contract:

1. `01-landed` — normal city endpoint.
2. `02-mid-pan-out` — inverse trip from the standing island toward the bay.
3. `03-overview` — full bay endpoint.
4. `04-selected` — selected island focused behind its card; bay remains around it.
5. `05-overview-return` — card toolbar returns through the shared command.
6. `06-mid-pan-in` — return toward the current island.
7. `07-landed-return` — normal city endpoint again.
8. `08-reduced-overview` — reduced motion reaches the overview with no in-flight state.
9. `09-reduced-landed` — reduced motion reaches the same landed city endpoint.

Captured by the gated case in `archipelagoNavigation.browser.test.tsx` at the current
branch tip. All nine were opened and inspected after capture; the frame includes the
surface around the changing element, not only the map/card.
