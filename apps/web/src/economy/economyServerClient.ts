import type { EraId } from "@cr/skill-graph";

import {
  type AccessTokenGetter,
  apiGetJsonAuthenticated,
  apiPostJsonAuthenticated,
} from "../api";
import { cityEraId } from "../city/useCityEra";
import type {
  CivicPurchaseOutcome,
  EconomyClient,
  GrantOutcome,
  InterleavedClearOutcome,
  PracticeSetCompleteOutcome,
  RepairOutcome,
  WalletView,
} from "./economyClient";

interface EconomyRead {
  readonly wallet: WalletView;
  readonly appliedEventIds: readonly string[];
}

export function createServerEconomyClient(options: {
  readonly apiBase: string;
  readonly getToken: AccessTokenGetter;
}): EconomyClient {
  const url = `${options.apiBase}/economy`;
  const read = (eraId: EraId = cityEraId()): Promise<EconomyRead> =>
    apiGetJsonAuthenticated<EconomyRead>(`${url}?era=${eraId}`, options.getToken);
  const act = <T>(body: unknown): Promise<T> =>
    apiPostJsonAuthenticated<T>(url, options.getToken, body);

  return {
    getWallet: async () => (await read()).wallet,
    appliedEventIds: async () => (await read()).appliedEventIds,
    reportIslandFounded: ({ eraId, authority }): Promise<GrantOutcome> =>
      act({ action: "found_island", eraId, authority }),
    reportCivicBootstrap: ({ eraId }): Promise<GrantOutcome> =>
      act({ action: "civic_bootstrap", eraId }),
    foundDiagnosticPrefix: () =>
      act({
        action: "found_diagnostic_prefix",
      }),
    recordIslandExamResponse: ({ eraId, sessionId, responseId, sequence, response }) =>
      act({
        action: "island_exam_response",
        eraId,
        sessionId,
        responseId,
        sequence,
        response,
      }),
    landOnIsland: async ({ eraId }): Promise<void> => {
      await act({ action: "land_island", eraId });
    },
    resetIslandWallet: async ({ eraId }): Promise<void> => {
      await apiPostJsonAuthenticated<{ reset: boolean }>(
        `${options.apiBase}/city/reset`,
        options.getToken,
        { island_era: eraId },
      );
    },
    reportPracticeSetComplete: ({
      evidenceId,
      nodeId,
      struggleLevel,
    }): Promise<PracticeSetCompleteOutcome> =>
      act({
        action: "practice_complete",
        evidenceId,
        nodeId,
        struggleLevel,
      }),
    reportLessonComplete: ({ nodeId }): Promise<GrantOutcome> =>
      act({ action: "lesson_complete", nodeId }),
    reportInterleavedClear: ({
      sessionId,
      responses,
      struggleLevel,
    }): Promise<InterleavedClearOutcome> =>
      act({
        action: "interleaved",
        sessionId,
        responses: responses ?? [],
        struggleLevel,
      }),
    purchaseCivicBuilding: ({ placementId, building }): Promise<CivicPurchaseOutcome> =>
      act({
        action: "purchase_civic",
        placementId,
        building,
      }),
    repairRuin: ({ damageId, subjectKind, subject }): Promise<RepairOutcome> =>
      act({
        action: "repair",
        damageId,
        subjectKind,
        subject,
      }),
  };
}
