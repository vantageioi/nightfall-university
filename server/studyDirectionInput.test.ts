import { describe, expect, it } from "vitest";
import { EXPLORING_STUDY_DIRECTION } from "@shared/studyDirection";
import { studentFitProfileInput } from "./routers";

const baseline = { hasSponsor: false, consent: true };

describe("student fit-profile study direction contract", () => {
  it("accepts any non-empty student-written discipline at the protected procedure boundary", () => {
    expect(studentFitProfileInput.safeParse({ ...baseline, studyDirection: "Nanotechnology and quantum materials" }).success).toBe(true);
    expect(studentFitProfileInput.safeParse({ ...baseline, studyDirection: "دراسات بينية بالعلوم الصحية" }).success).toBe(true);
    expect(studentFitProfileInput.safeParse({ ...baseline, studyDirection: "!" }).success).toBe(false);
  });

  it("accepts a supported Arabic subject and the explicit exploration choice", () => {
    expect(studentFitProfileInput.safeParse({ ...baseline, studyDirection: "علوم حاسوب" }).success).toBe(true);
    expect(studentFitProfileInput.safeParse({ ...baseline, studyDirection: EXPLORING_STUDY_DIRECTION }).success).toBe(true);
  });

  it("accepts student-written Biotech and Anthropology directions without turning them into a menu choice", () => {
    expect(studentFitProfileInput.safeParse({ ...baseline, studyDirection: "Biotech" }).success).toBe(true);
    expect(studentFitProfileInput.safeParse({ ...baseline, studyDirection: "Anthropology" }).success).toBe(true);
  });
});
