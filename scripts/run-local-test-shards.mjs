import { spawnSync } from "node:child_process";
import { availableParallelism } from "node:os";
import { join } from "node:path";

const suite = process.argv[2];
if (suite !== "unit" && suite !== "browser") {
  console.error(
    "Usage: node scripts/run-local-test-shards.mjs <unit|browser> [shard-count]",
  );
  process.exit(2);
}

const fallback = suite === "browser" ? 16 : 4;
const count = Number(process.argv[3] ?? fallback);
if (!Number.isInteger(count) || count < 1 || count > 64) {
  console.error("Shard count must be an integer from 1 to 64.");
  process.exit(2);
}

const vitest = join(process.cwd(), "node_modules", "vitest", "vitest.mjs");
const config = suite === "browser" ? ["--config", "vitest.browser.config.ts"] : [];

console.log(
  `Running ${suite} tests in ${count} deterministic shard(s), one worker at a time ` +
    `(host reports ${availableParallelism()} logical cores).`,
);
for (let index = 1; index <= count; index += 1) {
  console.log(`\n[${suite} shard ${index}/${count}]`);
  const run = spawnSync(
    process.execPath,
    [vitest, "run", ...config, "--maxWorkers=1", `--shard=${index}/${count}`],
    { cwd: process.cwd(), stdio: "inherit", env: process.env },
  );
  if (run.error) throw run.error;
  if (run.status !== 0) process.exit(run.status ?? 1);
}
