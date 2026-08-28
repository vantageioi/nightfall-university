import { describe, expect, it } from "vitest";
import { getGoogleSignInConfig, isGoogleSignInConfigured } from "./googleSignIn";

describe("Google account sign-in configuration", () => {
  it("prefers dedicated account sign-in credentials when they are available", () => {
    expect(getGoogleSignInConfig({ GOOGLE_CLIENT_ID: "google-id", GOOGLE_CLIENT_SECRET: "google-secret", GMAIL_CLIENT_ID: "gmail-id", GMAIL_CLIENT_SECRET: "gmail-secret" })).toEqual({ clientId: "google-id", clientSecret: "google-secret" });
  });

  it("safely reuses the configured Google OAuth client when dedicated values are not yet present", () => {
    expect(getGoogleSignInConfig({ GMAIL_CLIENT_ID: "gmail-id", GMAIL_CLIENT_SECRET: "gmail-secret" })).toEqual({ clientId: "gmail-id", clientSecret: "gmail-secret" });
    expect(isGoogleSignInConfigured({ GMAIL_CLIENT_ID: "gmail-id", GMAIL_CLIENT_SECRET: "gmail-secret" })).toBe(true);
  });

  it("does not claim availability with incomplete credentials", () => {
    expect(isGoogleSignInConfigured({ GMAIL_CLIENT_ID: "gmail-id" })).toBe(false);
    expect(() => getGoogleSignInConfig({})).toThrow("Google sign-in is not configured.");
  });
});
