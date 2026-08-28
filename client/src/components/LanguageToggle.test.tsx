import { describe, expect, it } from "vitest";
import { getPublicLanguage, PUBLIC_LANGUAGE_OPTIONS } from "./LanguageToggle";

describe("Nightfall public language contract", () => {
  it("keeps English as a stable global default without inventing unsupported locales", () => {
    expect(getPublicLanguage(null)).toBe("en");
    expect(getPublicLanguage("fr")).toBe("en");
    expect(getPublicLanguage("en")).toBe("en");
  });

  it("recognizes Arabic as the dedicated RTL public experience", () => {
    expect(getPublicLanguage("ar")).toBe("ar");
    expect(PUBLIC_LANGUAGE_OPTIONS).toEqual([
      { code: "en", label: "English", region: "Global" },
      { code: "ar", label: "العربية", region: "الشام والمنطقة" },
    ]);
  });
});
