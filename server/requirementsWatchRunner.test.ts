import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./integrations/llm", () => ({ invokeLLM: vi.fn() }));
vi.mock("./universityWatch", () => ({
  createUniversityRequirementAlert: vi.fn(),
  getUniversityWatchPreferencesByScheduleTaskUid: vi.fn(),
  listUniversityRequirementWatches: vi.fn(),
  recordUniversityWatchObservation: vi.fn(),
  setUniversitySourceCacheSummary: vi.fn(),
  upsertUniversitySourceCache: vi.fn(),
}));

import { invokeLLM } from "./integrations/llm";
import { primeUniversityRequirementWatch } from "./requirementsWatchRunner";
import { recordUniversityWatchObservation, setUniversitySourceCacheSummary, upsertUniversitySourceCache } from "./universityWatch";

describe("official-page watch priming", () => {
  afterEach(() => vi.restoreAllMocks());

  it("creates and persists a first summary as soon as a student enables a watch", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: async () => "<main>English CEFR B2 required</main>" }));
    vi.mocked(upsertUniversitySourceCache).mockResolvedValue({ cache: { contentHash: "hash-1", normalizedText: "English CEFR B2 required", summary: null }, changed: false, previousText: null } as never);
    vi.mocked(invokeLLM).mockResolvedValue({ choices: [{ message: { content: "An official page lists English CEFR B2. Confirm details on the source." } }] } as never);
    vi.mocked(setUniversitySourceCacheSummary).mockResolvedValue({ contentHash: "hash-1", normalizedText: "English CEFR B2 required", summary: "An official page lists English CEFR B2. Confirm details on the source." } as never);
    vi.mocked(recordUniversityWatchObservation).mockResolvedValue({ changed: false, watch: { id: 4 } } as never);

    const result = await primeUniversityRequirementWatch({ userId: 8, watch: { id: 4, universityId: 12, sourceUrl: "https://example.edu/admission", sourceLabel: "Example University · Example Programme" } });

    expect(invokeLLM).toHaveBeenCalledTimes(1);
    expect(setUniversitySourceCacheSummary).toHaveBeenCalledWith("https://example.edu/admission", expect.stringContaining("English CEFR B2"));
    expect(recordUniversityWatchObservation).toHaveBeenCalledWith(8, 4, "hash-1");
    expect(result.cache.summary).toContain("English CEFR B2");
  });
});
