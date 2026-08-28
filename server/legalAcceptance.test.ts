import { describe, expect, it } from "vitest";
import { PENDING_PROFILE_VALUE, legalAcceptanceProfile } from "./legalAcceptance";

describe("first-login legal acceptance profile", () => {
  it("creates only an explicitly incomplete profile shell while recording the accepted version", () => {
    expect(legalAcceptanceProfile(42, " 2026-08 ")).toEqual({
      userId: 42,
      destination: PENDING_PROFILE_VALUE,
      graduationYear: PENDING_PROFILE_VALUE,
      acceptedLegalVersion: "2026-08",
      onboardingComplete: false,
    });
  });

  it("never stores an overlong legal-version value", () => {
    expect(legalAcceptanceProfile(7, "12345678901234567890").acceptedLegalVersion).toHaveLength(16);
  });
});
