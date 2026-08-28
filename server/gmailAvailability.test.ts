import { afterEach, describe, expect, it } from "vitest";
import { isGmailConfigured } from "./gmailConnection";

const original = {
  clientId: process.env.GMAIL_CLIENT_ID,
  clientSecret: process.env.GMAIL_CLIENT_SECRET,
  tokenKey: process.env.GMAIL_TOKEN_ENCRYPTION_KEY,
};

function restore(name: "GMAIL_CLIENT_ID" | "GMAIL_CLIENT_SECRET" | "GMAIL_TOKEN_ENCRYPTION_KEY", value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  restore("GMAIL_CLIENT_ID", original.clientId);
  restore("GMAIL_CLIENT_SECRET", original.clientSecret);
  restore("GMAIL_TOKEN_ENCRYPTION_KEY", original.tokenKey);
});

describe("deferred Gmail configuration", () => {
  it("stays unavailable until every server-side OAuth value is present", () => {
    delete process.env.GMAIL_CLIENT_ID;
    delete process.env.GMAIL_CLIENT_SECRET;
    delete process.env.GMAIL_TOKEN_ENCRYPTION_KEY;
    expect(isGmailConfigured()).toBe(false);

    process.env.GMAIL_CLIENT_ID = "client-id";
    process.env.GMAIL_CLIENT_SECRET = "client-secret";
    process.env.GMAIL_TOKEN_ENCRYPTION_KEY = "too-short";
    expect(isGmailConfigured()).toBe(false);

    process.env.GMAIL_TOKEN_ENCRYPTION_KEY = "a-configured-token-encryption-key-that-is-at-least-32-chars";
    expect(isGmailConfigured()).toBe(true);
  });
});
