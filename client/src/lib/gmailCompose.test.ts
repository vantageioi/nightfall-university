import { describe, expect, it } from "vitest";
import { buildGmailComposeUrl, buildMailtoUrl } from "./gmailCompose";

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

  it("creates a neutral mail-client compose link without an inbox API grant", () => {
    expect(buildMailtoUrl({ to: "admissions@example.edu", subject: "Question", body: "Hello" }))
      .toBe("mailto:admissions%40example.edu?subject=Question&body=Hello");
  });
});
