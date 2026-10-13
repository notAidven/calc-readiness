import { describe, expect, it } from "vitest";

import { identityFromVerifiedCognitoClaims } from "./cognito-auth";

describe("the authenticated learner subject contract", () => {
  it("maps the verified Cognito sub exactly and exposes no caller-selected id", () => {
    const verifiedSubject = "11111111-1111-4111-8111-111111111111";
    const callerSelectedStudent = "22222222-2222-4222-8222-222222222222";
    const identity = identityFromVerifiedCognitoClaims({
      sub: verifiedSubject,
      // A hostile extra claim/body-like property cannot become the student id because the
      // mapper has exactly one authority input: the verifier's `sub`.
      student_id: callerSelectedStudent,
    } as { sub: string });

    expect(identity).toEqual({ student_id: verifiedSubject });
    expect(identity.student_id).not.toBe(callerSelectedStudent);
    expect(Object.keys(identity)).toEqual(["student_id"]);
  });
});
