import { describe, expect, it } from "vitest";
import { deadlineForSavedUniversity, discoveryCatalog, filterUniversityCatalog } from "./universityDiscovery";

describe("university discovery", () => {
  it("filters a student-facing catalog by query, region, and field", () => {
    const result = filterUniversityCatalog(discoveryCatalog, "computer", "Germany", "Computing");
    expect(result).toHaveLength(1);
    expect(result[0]?.university).toBe("TU Berlin");
  });

  it("keeps featured comparison entries source-backed", () => {
    expect(discoveryCatalog.every((university) => university.sourceUrl.startsWith("https://") && university.scholarshipSourceUrl.startsWith("https://"))).toBe(true);
    expect(discoveryCatalog.every((university) => university.tuition.length > 20 && university.scholarshipInfo.length > 20)).toBe(true);
  });

  it("derives only valid saved-university deadline events", () => {
    expect(deadlineForSavedUniversity("Amsterdam", "2027-01-14")?.date.getFullYear()).toBe(2027);
    expect(deadlineForSavedUniversity("No date", null)).toBeNull();
  });
});
