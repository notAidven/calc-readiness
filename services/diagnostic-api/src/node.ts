import { serve } from "@hono/node-server";

import { nodeEnv } from "./env";
import { createLambdaApi } from "./lambdaComposition";

/**
 * Standalone Node entry (containers: Fly.io / Railway / Render / ECS, or local
 * dev). Serves the same Hono app over an HTTP listener. `PORT` defaults to 8787.
 */
const env = nodeEnv();
const app = createLambdaApi(env);

const port = Number(env.PORT ?? "8787");
serve({ fetch: app.fetch, port });
