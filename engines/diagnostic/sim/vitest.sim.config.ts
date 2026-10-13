import { readFileSync } from "node:fs";
import { join } from "node:path";

import { defineConfig } from "vitest/config";

/**
 * Resolve the per-cell sample size. `SIM_N` in the environment is preferred, but
 * it cannot be relied on: on Windows the variable does not reach the vitest
 * process through `npx` / `npm exec` at all — not merely as an inline prefix —
 * so a harness reading it silently runs at its default. The fallback is a local,
 * uncommitted file holding a single number:
 *
 *   echo 6000 > engines/diagnostic/sim/sample-size.local
 *
 * Whichever channel is used, ALWAYS check the printed `n=` before believing a
 * sample size.
 */
function resolveSampleSize(): number {
  const fromEnv = Number(process.env.SIM_N);
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return fromEnv;
  }
  try {
    const raw = readFileSync(join(__dirname, "sample-size.local"), "utf8").trim();
    const fromFile = Number(raw);
    if (Number.isFinite(fromFile) && fromFile > 0) {
      return fromFile;
    }
  } catch {
    // No local override; fall through to the default.
  }
  return 500;
}

const SAMPLE_SIZE = resolveSampleSize();

/**
 * Standalone config for the probe-cost measurement harness. Kept separate from
 * the root `vitest.config.ts` on purpose: a full run is ~100,000 real walks and
 * takes minutes, so it must never be picked up by `npm run test:unit` or CI.
 *
 * The harness also lives outside `engines/diagnostic/src/`, so the root config's
 * `engines/**\/src/**\/*.test.ts` glob cannot collect it even by accident. This
 * config is the only way to run it:
 *
 *   npx vitest run --config engines/diagnostic/sim/vitest.sim.config.ts
 *
 * See `engines/diagnostic/sim/probe-cost.sim.test.ts` for what it measures and
 * `docs/Diagnostic_Probe_Cost_Measurement.md` for the recorded results.
 */
export default defineConfig({
  test: {
    name: "probe-sim",
    root: process.cwd(),
    include: ["engines/diagnostic/sim/**/*.test.ts"],
    testTimeout: 600_000,
    // Hand the resolved sample size to the worker explicitly. `env` covers
    // `probe-cost.sim.test.ts`, which reads `process.env.SIM_N`; `provide`
    // covers `policy-sweep.sim.test.ts`. Both are needed because neither the
    // shell environment nor an inline prefix reaches the worker on its own.
    env: { SIM_N: String(SAMPLE_SIZE) },
    provide: { simN: SAMPLE_SIZE },
  },
});
