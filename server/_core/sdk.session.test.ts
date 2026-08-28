import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./auth";

describe("self-hosted credential auth", () => {
  it("hashes passwords with a unique salt and verifies them without storing plaintext", () => {
    const stored = hashPassword("correct horse battery staple");
    expect(stored).not.toContain("correct horse");
    expect(stored).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
    expect(verifyPassword("correct horse battery staple", stored)).toBe(true);
    expect(verifyPassword("wrong password", stored)).toBe(false);
  });

  it("produces different hashes for the same password (per-hash salt)", () => {
    expect(hashPassword("same-password")).not.toBe(hashPassword("same-password"));
  });

  it("rejects verification against a missing or malformed stored hash", () => {
    expect(verifyPassword("anything", null)).toBe(false);
    expect(verifyPassword("anything", "garbage")).toBe(false);
  });
});
