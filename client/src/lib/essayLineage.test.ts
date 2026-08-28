import { describe, expect, it } from "vitest";
import { createEssayVersion, loadEssayLineage } from "./essayLineage";

describe("essay lineage", () => {
  it("keeps only reviewable local versions when persisted data is valid", () => {
    const version = createEssayVersion({ title: "Draft one", body: "My actual words", evidence: "Transcript, official programme page" });
    expect(loadEssayLineage(JSON.stringify([version]))[0]).toMatchObject({ title: "Draft one", body: "My actual words" });
  });
  it("drops malformed local data rather than treating it as an essay", () => expect(loadEssayLineage(JSON.stringify([{ title: 2 }]))).toEqual([]));
});
