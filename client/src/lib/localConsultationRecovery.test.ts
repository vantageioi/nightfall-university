import { afterEach, describe, expect, it, vi } from "vitest";
import { clearLocalConsultationRecovery, readLocalConsultationRecovery, writeLocalConsultationRecovery } from "./localConsultationRecovery";

function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
}

afterEach(() => vi.unstubAllGlobals());

describe("local consultation recovery", () => {
  it("keeps a changed-direction note browser-local and trims it safely", () => {
    vi.stubGlobal("window", { sessionStorage: storage() });
    writeLocalConsultationRecovery({ note: "I got rejected and need space to think", direction: "Biotechnology" });
    expect(readLocalConsultationRecovery()).toMatchObject({ note: "I got rejected and need space to think", direction: "Biotechnology" });
  });

  it("does not retain recovery context after the student completes or leaves the conversation", () => {
    vi.stubGlobal("window", { sessionStorage: storage() });
    writeLocalConsultationRecovery({ note: "I want to reconsider Anthropology" });
    clearLocalConsultationRecovery();
    expect(readLocalConsultationRecovery()).toBeNull();
  });
});
