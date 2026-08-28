import { describe, expect, it } from "vitest";
import { buildGmailComposeUrl } from "./gmailCompose";

describe("buildGmailComposeUrl", () => {
  it("opens Gmail compose with the approved recipient and reviewable draft content", () => {
    const url = new URL(buildGmailComposeUrl({
      to: "admissions@example.edu",
      subject: "Question about Biotechnology",
      body: "Hello admissions team,\n\nCould you clarify the deadline?",
    }));

    expect(url.origin).toBe("https://mail.google.com");
    expect(url.searchParams.get("view")).toBe("cm");
    expect(url.searchParams.get("to")).toBe("admissions@example.edu");
    expect(url.searchParams.get("su")).toBe("Question about Biotechnology");
    expect(url.searchParams.get("body")).toContain("Could you clarify the deadline?");
  });
});
