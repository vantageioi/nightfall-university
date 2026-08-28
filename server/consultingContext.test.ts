import { describe, expect, it } from "vitest";
import { consultingInput } from "./routers";

describe("selected-programme Consulting context", () => {
  it("accepts a deliberate selected programme only as optional context for a student question", () => {
    expect(consultingInput.parse({ language: "en", focusedProgrammeId: "g-architecture", messages: [{ role: "user", content: "What should I review first?" }] })).toMatchObject({ focusedProgrammeId: "g-architecture" });
  });

  it("does not accept a blank selected-programme context", () => {
    expect(() => consultingInput.parse({ language: "en", focusedProgrammeId: "  ", messages: [{ role: "user", content: "What should I review first?" }] })).toThrow();
  });
});
