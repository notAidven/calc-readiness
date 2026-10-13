import { createDiagnosticApi } from "./app";
import { createApiProviders, type EnvSource } from "./env";

/**
 * Build the HTTP app served by the Lambda from the production provider composition.
 *
 * Keep this as the single deployable composition root: the Lambda entry, the standalone
 * Node entry, and the infrastructure route-parity guard all call this function. A provider
 * added here therefore changes the real route registry the guard reads; the guard never
 * reconstructs this provider list by hand.
 */
export function createLambdaApi(env: EnvSource) {
  const providers = createApiProviders(env);
  return createDiagnosticApi({
    getServer: providers.getServer,
    getReads: providers.getReads,
    getWrites: providers.getWrites,
    getMastery: providers.getMastery,
    getSuccession: providers.getSuccession,
    getPlague: providers.getPlague,
    getEconomy: providers.getEconomy,
    getWorkUploads: providers.getWorkUploads,
    getWorkUploadParse: providers.getWorkUploadParse,
    getBugReports: providers.getBugReports,
    getBetaMetrics: providers.getBetaMetrics,
    allowedOrigins: env.CORS_ALLOWED_ORIGIN ?? "*",
  });
}
