// MUST STAY FIRST. Dev-only: wipes this app's persisted browser state when the dev
// server has restarted since the last load, so era-one content can be seen as a first
// run. Import order is evaluation order, and modules further down read `localStorage`
// as they load, so anything above this line would be reading pre-wipe state. Inert in
// any production build — see `devPersistence/devServerReset.ts`.
import "./devPersistence/devServerResetBoot";

import "@fontsource-variable/fredoka";
import "@fontsource-variable/nunito";
import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root element.");
}

const metricsPath = window.location.pathname.replace(/\/+$/, "") === "/metrics";
const Entry = metricsPath
  ? lazy(() =>
      import("./metrics/MetricsPage").then((module) => ({ default: module.MetricsPage })),
    )
  : lazy(() =>
      Promise.all([import("./styles.css"), import("./App")]).then(([, module]) => ({
        default: module.App,
      })),
    );

createRoot(root).render(
  <StrictMode>
    <Suspense fallback={<div className={metricsPath ? "metrics-page" : "city-shell"} />}>
      <Entry />
    </Suspense>
  </StrictMode>,
);
