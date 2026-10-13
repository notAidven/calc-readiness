import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AccountRuntimeConfig } from "../runtimeMode";
import { AccountBoundary } from "./AccountBoundary";
import {
  type CognitoAuthService,
  type CognitoIdentity,
  CognitoOperationError,
} from "./cognitoClient";

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
    // The PreSignUp Lambda trigger (`infra/lib/calc-readiness-stack.ts`) auto-confirms every
    // Cognito-native sign-up, so the real service never reports `confirmationRequired: true`.
    signUp: vi.fn(async () => ({ confirmationRequired: false })),
    forgotPassword: vi.fn(async () => undefined),
    confirmForgotPassword: vi.fn(async () => undefined),
    signOut: vi.fn(),
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});

describe("the Cognito account boundary", () => {
  it("restores a Cognito subject before mounting the learner app and signs out globally", async () => {
    const service = fakeService({
      restoreIdentity: vi.fn(async () => IDENTITY),
    });
    render(
      <AccountBoundary config={CONFIG} service={service}>
        {(account) => <p>learner subject {account.studentId}</p>}
      </AccountBoundary>,
    );

    expect(await screen.findByText(`learner subject ${IDENTITY.studentId}`)).toBeVisible();
    const user = userEvent.setup();
    // Sign out lives inside the account-chrome popover now, not as a top-level control.
    await user.click(screen.getByRole("button", { name: "Account menu" }));
    await user.click(screen.getByRole("menuitem", { name: "Sign out" }));

    expect(service.signOut).toHaveBeenCalledTimes(1);
    // Signing out clears identity and lands back on the welcome screen (not the "sign-in"
    // intent directly) -- the way back in either way, which is the claim this test makes.
    expect(
      await screen.findByRole("heading", { name: "Welcome to Calculus Readiness!" }),
    ).toBeVisible();
    expect(screen.queryByText(/learner subject/i)).toBeNull();
  });

  it("creates a direct-to-consumer email account and signs the learner straight in", async () => {
    const service = fakeService();
    const user = userEvent.setup();
    render(
      <AccountBoundary config={CONFIG} service={service}>
        {() => <p>Account city</p>}
      </AccountBoundary>,
    );

    await user.click(await screen.findByRole("button", { name: "Create account" }));
    await screen.findByRole("heading", { name: "Create your account" });
    expect(
      screen.getByRole("complementary", { name: "Beta privacy notice" }),
    ).toHaveTextContent(/ages 13\+/i);
    await user.type(screen.getByLabelText("Email"), "learner@example.test");
    await user.type(screen.getByLabelText("Password"), "CorrectHorse1!");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    // The PreSignUp Lambda trigger auto-confirms and auto-verifies every Cognito-native
    // sign-up, so there is no confirmation-code screen left: sign-up goes straight into the
    // app, the same way sign-in does.
    expect(await screen.findByText("Account city")).toBeVisible();
    expect(service.signUp).toHaveBeenCalledWith("learner@example.test", "CorrectHorse1!");
    expect(service.signIn).toHaveBeenCalledWith("learner@example.test", "CorrectHorse1!");
  });

  it("runs forgot-password and confirm-new-password without opening the app", async () => {
    const service = fakeService();
    const user = userEvent.setup();
    render(
      <AccountBoundary config={CONFIG} service={service}>
        {() => <p>Account city</p>}
      </AccountBoundary>,
    );

    await user.click(await screen.findByRole("button", { name: "Sign in" }));
    await user.click(await screen.findByRole("button", { name: "Forgot password?" }));
    await user.type(screen.getByLabelText("Email"), "learner@example.test");
    await user.click(screen.getByRole("button", { name: "Send reset code" }));
    expect(
      await screen.findByRole("heading", { name: "Choose a new password" }),
    ).toBeVisible();

    await user.type(screen.getByLabelText("Reset code"), "654321");
    await user.type(screen.getByLabelText("New password"), "NewCorrectHorse2!");
    await user.click(screen.getByRole("button", { name: "Save new password" }));

    expect(
      await screen.findByRole("heading", { name: "Sign in to your account" }),
    ).toBeVisible();
    expect(service.forgotPassword).toHaveBeenCalledWith("learner@example.test");
    expect(service.confirmForgotPassword).toHaveBeenCalledWith(
      "learner@example.test",
      "654321",
      "NewCorrectHorse2!",
    );
    expect(screen.queryByText("Account city")).toBeNull();
  });

  it("shows a retryable fail-closed state when session restoration cannot reach Cognito", async () => {
    const restoreIdentity = vi
      .fn<CognitoAuthService["restoreIdentity"]>()
      .mockRejectedValueOnce(new CognitoOperationError("NetworkError"))
      .mockResolvedValueOnce(null);
    const service = fakeService({ restoreIdentity });
    render(
      <AccountBoundary config={CONFIG} service={service}>
        {() => <p>Account city</p>}
      </AccountBoundary>,
    );

    expect(
      await screen.findByRole("heading", { name: "Account service unavailable" }),
    ).toBeVisible();
    expect(screen.queryByText("Account city")).toBeNull();
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByTestId("account-welcome")).toBeVisible();
    expect(restoreIdentity).toHaveBeenCalledTimes(2);
  });

  it("announces a safe sign-in error and moves focus to it", async () => {
    const service = fakeService({
      signIn: vi.fn(async () => {
        throw new CognitoOperationError("NotAuthorizedException");
      }),
    });
    const user = userEvent.setup();
    render(
      <AccountBoundary config={CONFIG} service={service}>
        {() => <p>Account city</p>}
      </AccountBoundary>,
    );

    await user.click(await screen.findByRole("button", { name: "Sign in" }));
    await user.type(await screen.findByLabelText("Email"), "learner@example.test");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("The email or password is not correct.");
    await waitFor(() => expect(alert).toHaveFocus());
    expect(alert).not.toHaveTextContent(/NotAuthorized|learner@example/i);

    // The alert takes focus ONCE when the error appears. It must not take it back on every
    // render after the learner returns to a field: each typed character updates controlled
    // input state, which is the render cadence that exposed the callback-ref focus theft.
    const email = screen.getByLabelText("Email");
    await user.click(email);
    await user.type(email, "x");
    expect(email).toHaveFocus();
    expect(email).toHaveValue("learner@example.testx");
  });

  it("removes account state when another same-origin tab signs out", async () => {
    const service = fakeService({
      restoreIdentity: vi.fn(async () => IDENTITY),
    });
    render(
      <AccountBoundary config={CONFIG} service={service}>
        {() => <p>Account city</p>}
      </AccountBoundary>,
    );
    expect(await screen.findByText("Account city")).toBeVisible();

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "cr.account.signout",
        newValue: "1",
      }),
    );

    expect(await screen.findByTestId("account-welcome")).toBeVisible();
    expect(service.signOut).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Account city")).toBeNull();
  });
});
