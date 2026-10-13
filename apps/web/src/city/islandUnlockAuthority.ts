export type IslandUnlockExamResponse =
  | {
      readonly itemVersionId: string;
      readonly outcome: "answer";
      readonly rawAnswer: unknown;
    }
  | {
      readonly itemVersionId: string;
      readonly outcome: "skip";
    };

export type IslandFoundingAuthority =
  | {
      readonly source: "exam";
      readonly sessionId: string;
    }
  | {
      readonly source: "diagnostic";
    };

export interface IslandUnlockExamResponseRequest {
  readonly sessionId: string;
  readonly responseId: string;
  readonly sequence: number;
  readonly response: IslandUnlockExamResponse;
}

export interface IslandUnlockExamResponseOutcome {
  readonly score: number;
  readonly target: number;
  readonly delta: 1 | -1;
  readonly passed: boolean;
  readonly responseCount: number;
}
