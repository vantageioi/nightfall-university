import { describe, expect, it } from "vitest";
import { getGoogleAccessNote } from "../pages/Access";

describe("Google sign-in fallback notice", () => {
  it("explains the approved-test limitation and points students to email verification", () => {
    expect(getGoogleAccessNote("en")).toContain("approved test accounts");
    expect(getGoogleAccessNote("en")).toContain("email verification");
  });

  it("keeps the Arabic notice bilingual and actionable", () => {
    expect(getGoogleAccessNote("ar")).toContain("Google");
    expect(getGoogleAccessNote("ar")).toContain("الإيميل");
  });
});
