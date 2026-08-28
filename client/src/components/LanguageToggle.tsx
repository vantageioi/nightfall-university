// Nightfall public-language control: English is the global default; Arabic has a dedicated RTL experience.
import { Check, ChevronDown, Languages } from "lucide-react";
import { useEffect, useState } from "react";

export type PublicLanguage = "en" | "ar";

export const PUBLIC_LANGUAGE_OPTIONS = [
  { code: "en", label: "English", region: "Global" },
  { code: "ar", label: "العربية", region: "الشام والمنطقة" },
] as const satisfies ReadonlyArray<{ code: PublicLanguage; label: string; region: string }>;

export function getPublicLanguage(value: string | null | undefined): PublicLanguage {
  return value === "ar" ? "ar" : "en";
}

export function usePublicLanguage() {
  const [language, setLanguageState] = useState<PublicLanguage>(() => getPublicLanguage(new URLSearchParams(window.location.search).get("lang")));

  useEffect(() => {
    document.documentElement.lang = language === "ar" ? "ar" : "en";
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  const setLanguage = (next: PublicLanguage) => {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
    setLanguageState(next);
  };

  return { language, isArabic: language === "ar", setLanguage };
}

export function LanguageToggle({ language, onChange, onToggle }: { language: PublicLanguage; onChange?: (language: PublicLanguage) => void; onToggle?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const current = PUBLIC_LANGUAGE_OPTIONS.find((option) => option.code === language) ?? PUBLIC_LANGUAGE_OPTIONS[0];
  const menuLabel = language === "ar" ? "اللغة" : "Language";
  const selectLanguage = (next: PublicLanguage) => {
    if (next === language) return;
    if (onChange) onChange(next);
    else onToggle?.();
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`${menuLabel}: ${current.label}`}
        aria-controls="nightfall-language-menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="nf-button inline-flex items-center gap-1.5 border border-white/15 px-2.5 py-2 text-[10px] font-semibold tracking-[.07em] text-[#cfcfcf] hover:border-white/45 hover:text-white"
      >
        <Languages className="h-3.5 w-3.5" />
        <span>{language === "ar" ? "AR" : "EN"}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div id="nightfall-language-menu" role="listbox" aria-label={menuLabel} className="absolute right-0 top-[calc(100%+8px)] z-50 w-52 border border-white/20 bg-[#171717] p-1.5 shadow-[0_22px_60px_rgba(0, 0, 0,.48)]">
          <p className="px-2.5 pb-1.5 pt-1 nf-label text-[8px] text-white/42">{menuLabel}</p>
          {PUBLIC_LANGUAGE_OPTIONS.map((option) => {
            const selected = language === option.code;
            return (
              <button
                key={option.code}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => { selectLanguage(option.code); setIsOpen(false); }}
                className={`flex w-full items-center justify-between gap-3 px-2.5 py-2.5 text-left transition-colors ${selected ? "bg-white/[.09] text-white" : "text-white/66 hover:bg-white/[.06] hover:text-white"}`}
              >
                <span><span className="block text-[11px] font-semibold">{option.label}</span><span className="mt-0.5 block text-[9px] text-white/42">{option.region}</span></span>
                {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
