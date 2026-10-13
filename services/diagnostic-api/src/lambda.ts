import { handle } from "hono/aws-lambda";

import { nodeEnv } from "./env";
import { createLambdaApi } from "./lambdaComposition";

/**
 * AWS Lambda entry (API Gateway HTTP API / Function URL). Deploy with handler
 * `lambda.handler` on the Node 20 runtime. Env: `DB_CLUSTER_ARN`, `DB_SECRET_ARN`,
 * `DB_NAME`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `WORK_UPLOAD_BUCKET`,
 * `WORK_UPLOAD_PARSE_MODEL` (plus the optional `WORK_UPLOAD_PARSE_*` knobs — see `env.ts`),
 * and an optional `CORS_ALLOWED_ORIGIN` (unnecessary when the SPA is same-origin behind one
 * CloudFront distribution). IAM: `rds-data:*` on the cluster +
 * `secretsmanager:GetSecretValue` on the DB secret + `s3:PutObject`/`GetObject`/
 * `DeleteObject` on `work-uploads/*` in the uploads bucket + the model-invoke action on the
 * one configured parse model (`infra/lib/calc-readiness-stack.ts` spells it, as the place
 * that names a provider by right).
 */
const env = nodeEnv();
const app = createLambdaApi(env);

export const handler = handle(app);
