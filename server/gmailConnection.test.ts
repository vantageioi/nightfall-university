import { describe, expect, it } from "vitest";
import { decryptGmailRefreshToken, encryptGmailRefreshToken, getGmailOAuthConfig, getGmailScopes, validateGmailOAuthState, createGmailOAuthState } from "./gmailConnection";

describe("Gmail OAuth configuration", () => {
  it("loads the configured client, protects refresh credentials, and authenticates with Google before a student can connect", async () => {
    const config = getGmailOAuthConfig();
    expect(config.clientId).toMatch(/\.apps\.googleusercontent\.com$/);
    expect(config.clientSecret.length).toBeGreaterThan(12);
    expect(config.tokenEncryptionKey.length).toBeGreaterThanOrEqual(32);
    expect(getGmailScopes()).toEqual(["https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/gmail.readonly"]);

    const encrypted = encryptGmailRefreshToken("student-refresh-token", config.tokenEncryptionKey);
    expect(encrypted).not.toContain("student-refresh-token");
    expect(decryptGmailRefreshToken(encrypted, config.tokenEncryptionKey)).toBe("student-refresh-token");

    const state = createGmailOAuthState(42, Date.now(), config.tokenEncryptionKey);
    expect(validateGmailOAuthState(state, 42, Date.now(), config.tokenEncryptionKey)).toBe(true);
    expect(validateGmailOAuthState(state, 43, Date.now(), config.tokenEncryptionKey)).toBe(false);

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, grant_type: "refresh_token", refresh_token: "nightfall-config-validation-token" }),
    });
    const body = await response.json() as { error?: string };
    expect(response.status).toBe(400);
    expect(body.error).toBe("invalid_grant");
  }, 20_000);
});
