# Revised actual-renderer archipelago evidence

Binding comparison:
`output/claude-design/archipelago-actual-renderer/frames/00-contact-sheet.png`.

The desktop frames are whole 1024x580 learner surfaces mounted through `CitySurface` inside
`.city-shell`. The narrow and zoom frames are direct `App` learner mounts against a local Vite
build with the capability-qualified archipelago mode enabled. No frame uses `?dev`, a story,
the design compositor, or a screenshot as its hero.

## Required matrix

| # | State | Evidence |
| ---: | --- | --- |
| 1 | standing | `1024x580-01-standing.png` |
| 2 | settled earlier | `1024x580-02-settled.png` |
| 3 | closed landing | `1024x580-03-closed.png` |
| 4 | diagnostic-cleared | `1024x580-04-diagnostic.png` |
| 5 | founding peak | `1024x580-05-founding-peak.png` |
| 6 | founding endpoint, reduced motion | `1024x580-06-founding-endpoint.png` |
| 7 | first island | `1024x580-07-first.png` |
| 8 | last island | `1024x580-08-last.png` |
| 9 | 200% effective browser zoom | `1024x580-09-200-percent-top.png` and `-bottom.png` |
| 10 | selected manifest GLB | **NOT AVAILABLE:** the current manifest has zero GLB island rows and `apps/web/src/city/art/islands/` contains no GLB; no substitute asset was fabricated |
| 11 | heaviest founded island | `1024x580-11-heaviest.png` |
| 12 | lesson labels off | `1024x580-12-lesson-labels-off.png` |

Additional true phone evidence: `390x580-top.png` and `390x580-bottom.png`. The pair is
intentional: the responsive surface is 720 CSS pixels tall, so the top proves the surrounding
world remains visible and the scrolled endpoint proves the complete ladder, status consequence,
and action remain reachable.

Reset placement evidence:

- `1024x580-reset-overflow.png`
- `1024x580-reset-confirmation.png`
- `390x580-reset-overflow.png`
- `390x580-reset-confirmation.png`

The overflow frames show `Reset past island` only in the separated destructive section while the
primary `Sail to Prehistoric` action remains unchanged. The confirmation frames retain the whole
island context and state exactly what is cleared and preserved. The destructive confirmation is
212×44 at desktop and 316×44 at the true phone viewport.

`responsive-evidence.json` records the actual CSS viewport, physical screen, DPR, PNG dimensions,
one-canvas count, canvas backing dimensions, scroll height, and target boxes. The 200% case uses
a 512x290 CSS viewport at DPR 2 and produces an exact 1024x580 physical raster.

## Visual inspection

- The hero middle is panel-free from the bottom of the compact top banner to the ladder.
- Standing, settled, closed, diagnostic, and founding frames are distinct real era renderers.
- The closed Bronze island is full-colour and unfounded; the mooring, progress meter, Preview,
  and visibly refused Enter action carry the state.
- The Classical diagnostic frame has four corner stakes around the 3x2 Town Hall footprint and
  no founded Hall.
- The founding peak shows the real Bronze Hall, two panel-clearing arcs, and one western wake
  that reaches zero opacity well inside the left frame edge. The reduced endpoint has no overlay.
- First and Last remain named at sequence ends. The visible ten-rung ladder independently shows
  selected and standing state.
- The 390x580 and 200% pairs show the surrounding island in both scroll positions, with no
  clipped status consequence.
- The reset overflow sits outside the primary action cluster; its confirmation is legible over
  the still-visible past island at both required viewports.

## Performance

`performance-browser.json` is a 1024x580 DPR-1 parity measurement after model loading and a fresh
60-frame sample:

- heaviest ordinary city: 11,967 draw calls, 321,995 triangles, 6,930 scene objects,
  272.32ms average / 287.0ms p95;
- the same heaviest city in the carousel: 11,967 draw calls, 321,995 triangles, 6,930 scene
  objects, 271.30ms average / 281.0ms p95;
- delta: -0.37% average, at exact draw/triangle/object parity;
- ten consecutive selections: one canvas and one settled hero root throughout;
- close: carousel canvas removed and the ordinary city canvas restored;
- cold unselected island-model requests: 0.

The DPR-2 run in `responsive-evidence.json` records one 512-CSS-pixel canvas backed by 1,024
physical pixels. The DPR-1 390 run records a 390-CSS-pixel canvas backed by 390 pixels.

The seven-canvas diagnostic-shop reproduction is
`archipelagoPanelClear.browser.test.tsx`: its positive control reaches one city plus six thumbnail
canvases, then verifies the shop, Buildings, and Town all close before the single hero mounts.
