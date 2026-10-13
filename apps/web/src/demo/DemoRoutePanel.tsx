import { ERA_SEQUENCE, eraNumber } from "@cr/skill-graph";
import { type CSSProperties, type ReactElement, useState } from "react";

import { isDevPersistenceEnabled } from "../devPersistence/devSession";
import { isDemoMode } from "./demoMode";
import {
  DEMO_CRISES,
  demoCrisisHref,
  demoEraHref,
  eraCaption,
  requestedEra,
} from "./demoRoutes";

/**
 * The title-screen map to every era preview and every built crisis.
 *
 * Local development keeps the era/crisis console that originally lived here. The explicit
 * frontend-only demo renders only a queued-era note here. Presenter mode belongs to the real
 * city Menu, where it is discoverable without becoming a floating title-screen control.
 *
 * The local console's crisis rows still come directly from `CRISIS_PREVIEW_ROUTES` through
 * `DEMO_CRISES`; era rows come from `ERA_SEQUENCE`. Every destination is a link, so opening
 * the panel or choosing a row grants no learning evidence.
 */

/** The palette shared with the existing presenter instruments. */
const AMBER = "#f0b429";
const INK = "#e8eef4";
const MUTED = "#9fb0c0";

const PANEL: CSSProperties = {
  position: "fixed",
  top: 10,
  left: 10,
  zIndex: 80,
  boxSizing: "border-box",
  width: "min(216px, calc(100vw - 20px))",
  maxHeight: "calc(100vh - 72px)",
  overflowY: "auto",
  padding: "6px 9px 7px",
  border: `1px solid ${AMBER}`,
  borderRadius: 4,
  background: "rgba(16, 22, 30, 0.96)",
  boxShadow: "0 8px 26px rgba(0, 0, 0, 0.42)",
  color: INK,
  fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  fontSize: 10.5,
  lineHeight: 1.3,
  textAlign: "left",
};

const EYEBROW: CSSProperties = {
  margin: 0,
  color: AMBER,
  fontSize: 8.5,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const TITLE: CSSProperties = {
  display: "flex",
  gap: 6,
  alignItems: "baseline",
  justifyContent: "space-between",
  width: "100%",
  margin: "1px 0 5px",
  padding: 0,
  border: 0,
  background: "none",
  color: INK,
  font: "inherit",
  fontSize: 11.5,
  fontWeight: 700,
  textAlign: "left",
  cursor: "pointer",
};

const GROUP: CSSProperties = { minWidth: 0, margin: 0, padding: 0, border: 0 };

const LEGEND: CSSProperties = {
  padding: 0,
  color: MUTED,
  fontSize: 9,
  letterSpacing: "0.03em",
  textTransform: "uppercase",
};

const ERA_GRID: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, 1fr)",
  gap: 3,
  margin: "3px 0 6px",
};

const ERA_RUNG: CSSProperties = {
  display: "block",
  minWidth: 0,
  padding: "3px 0",
  border: "1px solid #46586a",
  borderRadius: 3,
  background: "#1d2833",
  color: INK,
  font: "inherit",
  fontSize: 10,
  fontWeight: 700,
  textAlign: "center",
  textDecoration: "none",
};

/** The era the address bar is already asking for reads as where you are, not as a press. */
const ERA_HERE: CSSProperties = {
  ...ERA_RUNG,
  border: `1px solid ${AMBER}`,
  background: "rgba(240, 180, 41, 0.34)",
};

/**
 * A column rather than a row, and that is read off a frame rather than chosen. Side by side, at
 * the 196px this panel has inside its padding, *"The Hard Winter"* wrapped onto two lines with
 * *"era 1 · Prehistoric Era"* stranded beside the second — and the panel cannot be widened,
 * because at 1024x580 the title card starts at x=232 and this box already ends at 226.
 */
const CRISIS_ROW: CSSProperties = {
  display: "block",
  margin: "0 0 3px",
  padding: "3px 5px",
  border: "1px solid rgba(240, 180, 41, 0.5)",
  borderRadius: 3,
  background: "rgba(240, 180, 41, 0.1)",
  color: INK,
  font: "inherit",
  fontSize: 10,
  lineHeight: 1.25,
  textDecoration: "none",
};

const CRISIS_ERA: CSSProperties = { display: "block", color: MUTED, fontSize: 8.5 };

const NOTE: CSSProperties = { margin: "4px 0 0", color: MUTED, fontSize: 9 };

const PRESENTATION_PANEL: CSSProperties = {
  ...PANEL,
  width: "min(216px, calc(100vw - 20px))",
  overflow: "hidden",
  padding: 6,
  borderColor: "rgba(244, 162, 97, 0.72)",
  borderRadius: 7,
  background:
    "linear-gradient(145deg, rgba(236, 228, 211, 0.97), rgba(217, 204, 178, 0.97))",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,.42), 0 8px 24px rgba(20, 32, 46, 0.32)",
  color: "#14202e",
  fontFamily: "var(--font-body, system-ui, sans-serif)",
};

export function DemoRoutePanel(): ReactElement | null {
  const publicDemo = isDemoMode();
  const from = typeof window === "undefined" ? "http://localhost/" : window.location.href;
  const queued =
    typeof window === "undefined" ? null : requestedEra(window.location.search);
  /**
   * The local presenter console stays open. The public demo is a compact, clearly labelled
   * optional entry until someone asks for it; an era link reopens it on the destination page
   * so the queued preview is visible before Start.
   */
  const [open, setOpen] = useState(() => !publicDemo || queued !== null);

  if (!publicDemo && !isDevPersistenceEnabled()) {
    return null;
  }

  if (publicDemo) {
    if (queued === null) {
      return null;
    }
    return (
      <aside
        style={PRESENTATION_PANEL}
        aria-label="Presentation showcase"
        data-testid="demo-route-panel"
      >
        <p
          style={{
            margin: "0 5px 4px",
            color: "#6f4b2d",
            fontSize: 8.5,
            fontWeight: 760,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Temporary era preview
        </p>
        <p
          style={{ margin: "5px 5px 1px", color: "#5f4d3b", fontSize: 8.5 }}
          data-testid="demo-route-note"
        >
          Queued preview: {eraCaption(queued)}. This starts outside normal progression and
          does not advance the saved city. Press <strong>Start</strong>.
        </p>
      </aside>
    );
  }

  return (
    <aside style={PANEL} aria-labelledby="demo-route-title" data-testid="demo-route-panel">
      <p style={EYEBROW}>Dev only, not on the learner build</p>
      <button
        type="button"
        id="demo-route-title"
        style={TITLE}
        aria-expanded={open}
        data-testid="demo-route-fold"
        onClick={() => setOpen(!open)}
      >
        Demo route
        <span style={{ color: MUTED, fontSize: 9, fontWeight: 400 }} aria-hidden="true">
          {open ? "hide" : "show"}
        </span>
      </button>

      {open && (
        <>
          <fieldset style={GROUP}>
            <legend style={LEGEND}>
              {queued === null ? "Stand the city in" : `Queued: ${eraCaption(queued)}`}
            </legend>
            <div style={ERA_GRID}>
              {/* Every era, derived from `ERA_SEQUENCE` rather than listed, so an eleventh
                  needs no edit here and a re-ordering re-orders the row. */}
              {ERA_SEQUENCE.map((era) => (
                <a
                  key={era.id}
                  style={era.id === queued ? ERA_HERE : ERA_RUNG}
                  data-testid={`demo-route-era-${era.id}`}
                  data-queued={era.id === queued}
                  href={demoEraHref(from, era.id)}
                  title={`Stand the city in the ${era.name}, then press Start.`}
                  aria-label={`Stand the city in the ${era.name}, ${eraCaption(era.id)}`}
                >
                  {eraNumber(era.id)}
                </a>
              ))}
            </div>
          </fieldset>

          <fieldset style={GROUP}>
            <legend style={LEGEND}>Go straight to a crisis</legend>
            <div style={{ margin: "3px 0 0" }}>
              {DEMO_CRISES.map((crisis) => (
                <a
                  key={crisis.param}
                  style={CRISIS_ROW}
                  data-testid={`demo-route-crisis-${crisis.param}`}
                  href={demoCrisisHref(from, crisis.param)}
                  title={`Opens ?${crisis.param}. It writes no mastery and changes nothing in the city.`}
                >
                  <span style={{ fontWeight: 700 }}>
                    <span aria-hidden="true">{crisis.glyph}</span> {crisis.label}
                  </span>
                  <span style={CRISIS_ERA}>{eraCaption(crisis.eraId)}</span>
                </a>
              ))}
            </div>
          </fieldset>

          <p style={NOTE} data-testid="demo-route-note">
            Pick an era, then <strong style={{ color: INK }}>Start at Era 1</strong>. For a
            no-answer walkthrough, open <strong style={{ color: INK }}>Presentation</strong>
            . The presenter tray covers unlock and build era, lesson, practice, AI work,
            reset, and in-app era selection. No question on these preview routes is graded
            or stored.
          </p>
        </>
      )}
    </aside>
  );
}
