import { build } from "esbuild";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(fileURLToPath(import.meta.url));

/**
 * Bundle the entry points into single self-contained ESM files the deploy targets
 * ship as-is. Nothing is externalized: `@aws-sdk/client-rds-data` is bundled (pinned)
 * rather than relying on the Lambda runtime's floating minor version — AWS recommends
 * this for consistent Data API behaviour — alongside Hono, `aws-jwt-verify`, and the
 * whole `@cr/*` workspace chain, all from TS source.
 */
// Emit into `bundle/` (NOT `dist/`, which holds the unbundled tsc output) so the
// deploy asset is exactly the two self-contained entry files.
const shared = {
  absWorkingDir: packageRoot,
  bundle: true,
  minify: true,
  platform: "node",
  format: "esm",
  target: "node20",
  external: [],
  logLevel: "info",
  // esbuild ESM output can miss `require`; shim it for any CJS deps that need it.
  banner: {
    js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);",
  },
};

await Promise.all([
  build({
    ...shared,
    entryPoints: [join(packageRoot, "src", "lambda.ts")],
    outfile: join(packageRoot, "bundle", "lambda.mjs"),
  }),
  build({
    ...shared,
    entryPoints: [join(packageRoot, "src", "node.ts")],
    outfile: join(packageRoot, "bundle", "node.mjs"),
  }),
]);
