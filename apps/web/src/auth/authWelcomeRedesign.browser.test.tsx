import { afterEach, expect, test } from "vitest";
import { commands, page } from "vitest/browser";

import { type Harness, mount, waitFor } from "../lessons/testHarness";
import type { AccountRuntimeConfig } from "../runtimeMode";
import { captureFrame } from "../test/frameEvidence";
import { AccountBoundary } from "./AccountBoundary";
import type { CognitoAuthService } from "./cognitoClient";

import "../styles.css";

const SHOTS = Boolean(import.meta.env.VITE_ACCOUNT_DOOR_SHOTS);

const CONFIG: AccountRuntimeConfig = {
  userPoolId: "us-east-1_pool",
  clientId: "public-client",
  oauthDomain: "calc-readiness.auth.us-east-1.amazoncognito.com",
  region: "us-east-1",
  diagnosticApiUrl: "/api/diagnostic",
};

const service: CognitoAuthService = {
  restoreIdentity: async () => null,
  getAccessToken: async () => null,
  startGoogleSignIn: async () => undefined,
  signIn: async () => {
    throw new Error("not reached");
  },
  signUp: async () => ({ confirmationRequired: false }),
  forgotPassword: async () => undefined,
  confirmForgotPassword: async () => undefined,
  signOut: () => undefined,
};

let harness: Harness | null = null;

afterEach(() => {
  harness?.cleanup();
  harness = null;
  window.history.replaceState(null, "", "/");
});

test("Google is the clear first action on a concise responsive front door", async () => {
  for (const viewport of [
    { width: 1024, height: 580, name: "desktop" },
    { width: 390, height: 844, name: "phone" },
  ]) {
    await page.viewport(viewport.width, viewport.height);
    harness?.cleanup();
    harness = mount(
      <AccountBoundary config={CONFIG} service={service}>
        {() => <p>not reached</p>}
      </AccountBoundary>,
    );
    await waitFor(
      () => document.querySelector(".auth-google") !== null,
      "Google action did not render",
      20_000,
    );
    await document.fonts.ready;

    const card = document.querySelector<HTMLElement>(".auth-welcome") as HTMLElement;
    const google = document.querySelector<HTMLElement>(".auth-google") as HTMLElement;
    const fallback = [...document.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === "Use email instead",
    ) as HTMLElement;
    const text = (card.textContent ?? "").replace(/\s+/gu, " ").trim();
    const cardBox = card.getBoundingClientRect();
    const googleBox = google.getBoundingClientRect();
    const fallbackBox = fallback.getBoundingClientRect();

    expect(text.length, "the front door grew back into a wall of copy").toBeLessThan(130);
    expect(googleBox.top, "Google is not first in the action stack").toBeLessThan(
      fallbackBox.top,
    );
    expect(googleBox.height).toBeGreaterThanOrEqual(44);
    expect(fallbackBox.height).toBeGreaterThanOrEqual(44);
    expect(cardBox.top).toBeGreaterThanOrEqual(0);
    expect(cardBox.bottom).toBeLessThanOrEqual(viewport.height);
    expect(cardBox.right).toBeLessThanOrEqual(viewport.width);

    if (SHOTS) {
      await commands.writeFile(
        `output/auth-redesign-${viewport.name}.png`,
        await captureFrame(),
        { encoding: "base64" },
      );
    }
  }
});
