import { describe, expect, it } from "vitest";
import { canSendUniversityEmailInWindow } from "./universityCommunicationPolicy";

describe("university communication rate policy", () => {
  it("allows a measured first contact but blocks a same-contact repeat and excessive daily outreach", () => {
    expect(canSendUniversityEmailInWindow({ studentSentCount: 0, contactSentCount: 0 })).toEqual({ allowed: true, reason: null });
    expect(canSendUniversityEmailInWindow({ studentSentCount: 1, contactSentCount: 1 })).toEqual({ allowed: false, reason: "contact_daily_limit" });
    expect(canSendUniversityEmailInWindow({ studentSentCount: 5, contactSentCount: 0 })).toEqual({ allowed: false, reason: "student_daily_limit" });
  });
});
