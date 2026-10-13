# Island Atlas: camera pullback over the founded world

**Status:** implementation brief
**Read at:** `integration` `3fbe5fcb`
**Scope:** one overview mode inside the existing archipelago surface. The selected-island
carousel, sailing, diagnostic settlement, future preview, and persistence rules remain the
authority.

## Product reading

The Atlas is the wide lens on the same island chain, not another progress dashboard. Opening it
from the carousel dock pulls the camera back over one continuous bay. Ten organic, raised
miniatures keep each era's terrain palette and Town Hall silhouette; route soundings, brass
survey marks, restrained parchment labels, and sea depth lines make the surface read as a
cartographer's civic instrument rather than a card grid.

The bay geometry comes from `bayLayout.ts`. The selected island remains the carousel's selected
island, and the standing island remains the durable city under the learner's feet. Selecting an
Atlas island returns to the existing focused renderer for that island. It never sails, settles,
builds, saves, or starts a preview by itself:

- standing and founded islands retain the existing Enter/Sail actions;
- diagnostic-cleared ground retains the existing Settle action;
- future islands retain the classic lock and the explicit, reversible camera-only Preview action.

“Return to focused island” returns without changing selection. Escape does the same while the
Atlas is open; Escape from the focused renderer still closes the archipelago.

## State language

The Atlas derives durable facts from the existing carousel view:

- **Completed:** every authored skill in that era is mastered.
- **Unlocked:** the carousel state is standing, settled, diagnostic, or ceremony.
- **Future / locked:** the carousel state is closed.
- **You are here:** the era equals the standing era.

There is no persisted visited-island field in the API, archipelago schema, or local bay store.
**Looked at this visit** is therefore a component-local set. An era joins it only after it becomes
the rendered carousel focus, including a focus chosen from the Atlas. The set begins with the
standing island and is discarded when the archipelago unmounts. It is intentionally not presented
as cross-session history.

## Interaction and access

“Atlas · All islands” sits beside the existing island chooser. Opening moves focus to the standing
island in the Atlas. Every island is a real button with an accessible name that includes its
position, era, durable state, standing state, and this-visit mark. Left/Right and Home/End move
focus through the authored sequence; Enter/Space use native button activation. Returning restores
focus to the Atlas entry.

The pullback is a short transform from the selected island's map position. The explicit
`reducedMotion` reading and `prefers-reduced-motion` both remove it.

## Responsive frame

The whole bay remains in one frame at both ruled learner viewports:

- **1024x580:** the bay uses the central sea between a compact masthead and survey dock; island
  miniatures retain city marks and full era labels.
- **390x580:** the same bay is fitted by width, with 44px minimum hit targets, compact labels, and
  a two-line survey dock. No horizontal scrolling or off-screen island is allowed.

Spatial acceptance requires learner-mounted full-surface frames at both sizes, showing the whole
bay and its surrounding navigation, not crops of the miniatures.

## Deliberate limits

The Atlas is a lightweight cartographic rendering, not ten simultaneous `StarterIsland` scene
graphs. The selected-island renderer remains the fidelity surface and the only write-capable
surface. Atlas miniatures reuse the shipped era terrain palettes, bay geometry, and Town Hall
glyph assets; they summarize placed cities rather than reconstructing every building and road.
