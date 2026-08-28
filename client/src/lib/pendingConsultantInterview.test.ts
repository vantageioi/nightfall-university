import { describe, expect, it } from "vitest";
import { emptyWarmInterviewDraft } from "./consultantOnboarding";
import { parsePendingConsultantInterview, serializePendingConsultantInterview } from "./pendingConsultantInterview";

describe("pending Consultant interview handoff", () => {
  it("serializes a complete local-only draft with its selected language", () => {
    const value = serializePendingConsultantInterview({ ...emptyWarmInterviewDraft, preferredName: "Rania", studyDirection: "Architecture", consent: true }, "ar");
    expect(parsePendingConsultantInterview(value)).toMatchObject({ language: "ar", draft: { preferredName: "Rania", studyDirection: "Architecture", consent: true } });
  });

  it("rejects malformed or incomplete session values before they can hydrate an authenticated profile", () => {
    expect(parsePendingConsultantInterview(null)).toBeNull();
    expect(parsePendingConsultantInterview("not-json")).toBeNull();
    expect(parsePendingConsultantInterview(JSON.stringify({ language: "en", savedAt: Date.now() }))).toBeNull();
    expect(parsePendingConsultantInterview(JSON.stringify({ draft: {}, language: "fr", savedAt: Date.now() }))).toBeNull();
  });
});
