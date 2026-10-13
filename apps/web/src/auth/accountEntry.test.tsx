import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AccountRuntimeConfig } from "../runtimeMode";
import { AccountBoundary } from "./AccountBoundary";
import { PASSWORD_GUIDANCE } from "./AuthGate";
import type { CognitoAuthService, CognitoIdentity } from "./cognitoClient";
import { SESSION_EXPIRED_EVENT } from "./session";

/**
 * **THE FRONT DOOR: what a production visitor with no session is shown, and what they are
 * asked to do first.**
 *
 * The account boundary already refused an anonymous visitor before this change; what it
 * refused them WITH was a sign-in form, which is the screen for somebody who already has an
 * account. A first-time learner arriving at the product was asked to remember a password they
 * have never set, and the route to creating one was a text link under the button.
 *
 * So the boundary now opens on a start screen: what this is, in one sentence, with Google
 * as the lead action when configured and email as the fallback. Every form
 * behind it is the same real Cognito flow it always was — this file asserts the ENTRY, and
 * `AccountBoundary.test.tsx` still walks sign-up, sign-in and reset end to end against the
 * service. Sign-up no longer waits on an emailed confirmation code: the PreSignUp Lambda
 * trigger in the deployment stack auto-confirms every Cognito-native sign-up,
 * so `signUp` signs the learner straight in.
 */

const CONFIG: AccountRuntimeConfig = {
  userPoolId: "us-east-1_pool",
  clientId: "public-client",
  region: "us-east-1",
  diagnosticApiUrl: "/api/diagnostic",
};
const IDENTITY: CognitoIdentity = {
  studentId: "11111111-1111-4111-8111-111111111111",
  email: "learner@example.test",
};

function fakeService(
  overrides: Partial<CognitoAuthService> = {},
): CognitoAuthService & Record<string, unknown> {
  return {
    restoreIdentity: vi.fn(async () => null),
    getAccessToken: vi.fn(async () => "access-token"),
    signIn: vi.fn(async () => IDENTITY),
    signUp: vi.fn(async () => ({ confirmationRequired: false })),
    forgotPassword: vi.fn(async () => undefined),
    confirmForgotPassword: vi.fn(async () => undefined),
    signOut: vi.fn(),
    ...overrides,
  };
}

function mount(service: CognitoAuthService) {
  return render(
    <AccountBoundary config={CONFIG} service={service}>
      {() => <p>Account city</p>}
    </AccountBoundary>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});

describe("the unauthenticated front door", () => {
  it("opens on a concise start screen with a clear primary auth action", async () => {
    mount(fakeService());

    const create = await screen.findByRole("button", { name: "Create account" });
    expect(create).toBeVisible();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeVisible();

    // The product is explained before the ask. A heading and a sentence, not a form.
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent ?? "").toMatch(/calculus/i);
    expect(document.body.textContent ?? "").toMatch(/city|island/i);
    expect(screen.queryByLabelText("Password")).toBeNull();

    expect(document.activeElement).toBe(document.body);
  });

  it("leads with Google and keeps email behind a fallback when OAuth is configured", async () => {
    const startGoogleSignIn = vi.fn(async () => undefined);
    const user = userEvent.setup();
    mount(fakeService({ startGoogleSignIn }));

    const google = await screen.findByRole("button", { name: "Continue with Google" });
    expect(google).toBeVisible();
    expect(screen.getByRole("button", { name: "Use email instead" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Create account" })).toBeNull();

    await user.click(google);
    expect(startGoogleSignIn).toHaveBeenCalledTimes(1);
  });

  it("puts Create account in front of the real Cognito sign-up form, and signs the learner straight in", async () => {
    const service = fakeService();
    const user = userEvent.setup();
    mount(service);

    await user.click(await screen.findByRole("button", { name: "Create account" }));
    expect(
      await screen.findByRole("heading", { name: "Create your account" }),
    ).toBeVisible();

    await user.type(screen.getByLabelText("Email"), "learner@example.test");
    await user.type(screen.getByLabelText("Password"), "correcthorse1");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    // The PreSignUp Lambda trigger auto-confirms every Cognito-native sign-up, so there is no
    // confirmation-code screen left to land on -- sign-up goes straight into the app.
    expect(await screen.findByText("Account city")).toBeVisible();
    expect(service.signUp).toHaveBeenCalledWith("learner@example.test", "correcthorse1");
    expect(service.signIn).toHaveBeenCalledWith("learner@example.test", "correcthorse1");
  });

  it("sends a returning learner straight to sign in", async () => {
    const user = userEvent.setup();
    mount(fakeService());

    await user.click(await screen.findByRole("button", { name: "Sign in" }));
    expect(
      await screen.findByRole("heading", { name: "Sign in to your account" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Password")).toBeVisible();
  });

  /**
   * An expired session is not a first visit. The learner has an account, they were using it,
   * and the honest screen is the one that gets them back in — not a pitch for a product they
   * are already inside.
   */
  it("does not pitch the product to a learner whose session just expired", async () => {
    window.history.replaceState(null, "", "/");
    const service = fakeService({
      restoreIdentity: vi.fn(async () => IDENTITY),
    });
    mount(service);
    expect(await screen.findByText("Account city")).toBeVisible();

    // The app's own "your tokens are gone" signal, which is the route a session ends by
    // while the learner is still in the city.
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));

    expect(
      await screen.findByRole("heading", { name: "Sign in to your account" }),
    ).toBeVisible();
    expect(
      screen.getByText("Your session ended. Sign in again to continue."),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Create account" })).toBeNull();
  });

  it("shows the password rule the pool actually enforces, and no rule it does not", async () => {
    const user = userEvent.setup();
    mount(fakeService());
    await user.click(await screen.findByRole("button", { name: "Create account" }));
    await screen.findByRole("heading", { name: "Create your account" });

    // The guidance is on the screen the password is typed on, not only in a constant.
    expect(document.body.textContent ?? "").toContain(PASSWORD_GUIDANCE);

    /*
      AND IT AGREES WITH THE DEPLOYED POOL. The user pool's policy, as the deployment stack
      declares it (the stack itself is not part of this repository), so a guidance line that
      over- or under-states the rule fails here. Both directions are asserted.
    */
    const stack = `passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireDigits: true,
        requireUppercase: false,
        requireSymbols: false,
      },`;
    const policy = /passwordPolicy:\s*\{([^}]*)\}/.exec(stack)?.[1];
    expect(policy, "the CDK stack no longer declares a passwordPolicy").toBeDefined();
    const poolMinimum = Number(/minLength:\s*(\d+)/.exec(policy as string)?.[1]);
    expect(poolMinimum, "the pool no longer declares a minimum length").toBeGreaterThan(0);
    const guidanceMinimum = Number(
      /\bat least\s+(\d+)\s+characters?\b/i.exec(PASSWORD_GUIDANCE)?.[1],
    );
    expect(
      guidanceMinimum,
      "the guidance no longer states its minimum as “At least N characters”",
    ).toBe(poolMinimum);

    /*
      EVERY BOOLEAN IN BOTH DIRECTIONS. A required pool rule missing from the copy and a
      disabled pool rule left in stale copy are opposite defects, so implication is too weak:
      the copy's claim has to equal the deployed boolean. Each detector also proves it can
      read its own phrase before it is trusted over the shipped sentence.
    */
    const RULES: readonly {
      readonly poolName: string;
      readonly copySays: RegExp;
      readonly catches: string;
    }[] = [
      {
        poolName: "Lowercase",
        copySays: /\blowercase(?:\s+letter)?\b/i,
        catches: "including a lowercase letter",
      },
      {
        poolName: "Digits",
        copySays: /\b(?:number|digit)\b/i,
        catches: "including a number",
      },
      {
        poolName: "Uppercase",
        copySays: /\b(?:uppercase|capital)(?:\s+letter)?\b/i,
        catches: "including an uppercase letter",
      },
      {
        poolName: "Symbols",
        copySays: /\b(?:symbol|special character)\b/i,
        catches: "including a symbol",
      },
    ];
    expect(RULES.length).toBe(4);
    for (const rule of RULES) {
      expect(
        rule.copySays.test(rule.catches),
        `${rule.copySays} no longer catches "${rule.catches}"`,
      ).toBe(true);
      const declared = new RegExp(`require${rule.poolName}:\\s*(true|false)`).exec(
        policy as string,
      )?.[1];
      expect(
        declared,
        `the pool no longer explicitly declares require${rule.poolName}`,
      ).toMatch(/^(true|false)$/);
      expect(
        rule.copySays.test(PASSWORD_GUIDANCE),
        `password guidance and require${rule.poolName} disagree`,
      ).toBe(declared === "true");
    }
  });
});
