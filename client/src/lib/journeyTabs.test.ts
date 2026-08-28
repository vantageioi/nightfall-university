import { describe, expect, it } from "vitest";
import { comparisonSelectionFromSearch, journeySearchForTab, journeyTabFromSearch } from "./journeyTabs";

describe("JourneyTools tab links", () => {
  it("accepts each supported student-tool tab and safely falls back to discovery", () => {
    expect(journeyTabFromSearch("?tab=compare")).toBe("compare");
    expect(journeyTabFromSearch("?tab=calendar")).toBe("calendar");
    expect(journeyTabFromSearch("?tab=watch")).toBe("watch");
    expect(journeyTabFromSearch("?tab=documents")).toBe("documents");
    expect(journeyTabFromSearch("?tab=anything-else")).toBe("discover");
  });

  it("preserves language while writing a direct student-tool link", () => {
    expect(journeySearchForTab("?lang=ar", "documents")).toBe("?lang=ar&tab=documents");
    expect(journeySearchForTab("?lang=ar&tab=watch", "discover")).toBe("?lang=ar");
  });

  it("supports a read-only all-saved comparison link without accepting unknown IDs", () => {
    expect(comparisonSelectionFromSearch("?compare=all", [5, 9, 12, 14])).toEqual([5, 9, 12]);
    expect(comparisonSelectionFromSearch("?compare=9,99,5", [5, 9, 12])).toEqual([9, 5]);
  });
});
