import { describe, expect, it } from "vitest";
import { isCronRequestAuthorized } from "./cronRoutes";

describe("external scheduler bearer authentication", () => {
  const secret = "a-long-test-secret-value";

  it("accepts only the configured bearer credential", () => {
    expect(isCronRequestAuthorized(`Bearer ${secret}`, secret)).toBe(true);
    expect(isCronRequestAuthorized(`bearer ${secret}`, secret)).toBe(true);
    expect(isCronRequestAuthorized("Bearer wrong", secret)).toBe(false);
  });

  it("rejects absent, malformed, and legacy query-style credentials", () => {
    expect(isCronRequestAuthorized(undefined, secret)).toBe(false);
    expect(isCronRequestAuthorized(secret, secret)).toBe(false);
    expect(isCronRequestAuthorized("Basic abc123", secret)).toBe(false);
  });
});
