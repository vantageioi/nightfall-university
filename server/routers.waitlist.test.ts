import { describe, expect, it } from "vitest";
import { waitlistInput } from "./routers";

describe("waitlist input", () => {
  it("accepts a complete event-access request", () => {
    const result = waitlistInput.safeParse({
      name: "Mika Ofori",
      email: "mika@example.com",
      destination: "Universities in the Netherlands",
      journeyStage: "Preparing my documents",
      graduationYear: "Class of 2027",
      note: "I want a calmer way to plan applications.",
    });
    expect(result.success).toBe(true);
  });

  it("assigns the Instagram campaign source when a social waitlist form omits an application stage", () => {
    const result = waitlistInput.parse({
      name: "Mika Ofori",
      email: "mika@example.com",
      destination: "Universities in the Netherlands",
      graduationYear: "Class of 2027",
    });
    expect(result.journeyStage).toBe("Instagram early list");
  });

  it("rejects incomplete contact data", () => {
    const result = waitlistInput.safeParse({ name: "M", email: "not-an-email", destination: "", journeyStage: "", graduationYear: "" });
    expect(result.success).toBe(false);
  });
});
