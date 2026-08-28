import { describe, expect, it } from "vitest";
import { shouldRedirectCompletedProfile, shouldResumePendingConsultantInterview } from "./consultantResume";

describe("Consultant account-unlock resume policy", () => {
  it("prioritizes a signed-in student's pending local interview over the generic dashboard", () => {
    expect(shouldResumePendingConsultantInterview(true, true)).toBe(true);
    expect(shouldResumePendingConsultantInterview(false, true)).toBe(false);
  });

  it("never redirects a deliberate Consultant entry to the dashboard, including for an onboarded student", () => {
    expect(shouldRedirectCompletedProfile(true, true)).toBe(false);
    expect(shouldRedirectCompletedProfile(true, false)).toBe(false);
    expect(shouldRedirectCompletedProfile(false, false)).toBe(false);
  });
});
