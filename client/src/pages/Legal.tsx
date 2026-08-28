// Legal documents surface + first-login acceptance gate.
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { LanguageToggle, usePublicLanguage } from "@/components/LanguageToggle";
import { EULA, LEGAL_VERSION, PRIVACY, TERMS } from "@shared/legal";
import type { Doc } from "@shared/legal";
import { Loader2, ShieldCheck } from "lucide-react";

const docs = { terms: TERMS, eula: EULA, privacy: PRIVACY } as const;
type DocKey = keyof typeof docs;

function DocumentBody({ doc }: { doc: Doc }) {
  return <div className="space-y-6">{doc.sections.map((section) => <section key={section.heading}><h3 className="text-sm font-semibold text-white">{section.heading}</h3><p className="mt-2 text-sm leading-6 text-[#bdbdbd]">{section.body}</p></section>)}</div>;
}

const titles: Record<DocKey, string> = { terms: "Terms & Conditions", eula: "EULA", privacy: "Privacy Policy" };

export function LegalPage({ doc }: { doc: DocKey }) {
  const { language, isArabic, setLanguage } = usePublicLanguage();
  const [, setLocation] = useLocation();
  const document = docs[doc][language];
  return <div dir={isArabic ? "rtl" : "ltr"} className="night-bloom min-h-screen text-white"><header className="flex items-center justify-between border-b border-white/10 px-5 py-4"><span className="text-sm font-semibold tracking-[.16em]">NIGHTFALL</span><div className="flex items-center gap-4"><LanguageToggle language={language} onChange={setLanguage} /><button onClick={() => setLocation("/dashboard")} className="nf-label border border-white/20 px-3 py-2 text-[10px] text-white/70 hover:border-white">← Back</button></div></header><main className="mx-auto max-w-3xl px-5 py-10"><p className="nf-label text-[#a4a4a4]">// NIGHTFALL / LEGAL / V{LEGAL_VERSION}</p><h1 className="mt-4 text-4xl font-semibold tracking-[-.04em]">{document.title}</h1><DocumentBody doc={document} /></main></div>;
}

/** Overlay shown until the signed-in student accepts the current legal version. */
export function AcceptGate({ children }: { children: React.ReactNode }) {
  const profile = trpc.student.profile.useQuery();
  const accept = trpc.student.acceptLegal.useMutation({ onSuccess: () => void profile.refetch() });
  const { language, isArabic, setLanguage } = usePublicLanguage();
  const [tab, setTab] = useState<DocKey>("terms");
  if (profile.isLoading) return <div className="nf-shell grid min-h-screen place-items-center text-white"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (profile.data?.acceptedLegalVersion === LEGAL_VERSION) return <>{children}</>;
  const document = docs[tab][language];
  return <div dir={isArabic ? "rtl" : "ltr"} className="night-bloom grid min-h-screen place-items-center p-5 text-white"><div className="w-full max-w-2xl border border-white/15 bg-[#141414] p-6 shadow-[0_24px_80px_rgba(0, 0, 0,.45)] sm:p-8"><div className="flex items-center justify-between"><p className="nf-label text-[#a4a4a4]">// BEFORE YOU CONTINUE / V{LEGAL_VERSION}</p><LanguageToggle language={language} onChange={setLanguage} /></div>
    <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-b border-white/10 pb-3">{(Object.keys(docs) as DocKey[]).map((key) => <button key={key} onClick={() => setTab(key)} className={`text-xs font-semibold ${tab === key ? "text-white underline underline-offset-8" : "text-[#979797] hover:text-white"}`}>{titles[key]}</button>)}</div>
    <div className="mt-5 max-h-[46vh] overflow-y-auto pl-1 pr-1"><h2 className="mb-4 text-xl font-semibold">{document.title}</h2><DocumentBody doc={document} /></div>
    <button type="button" disabled={accept.isPending} onClick={() => accept.mutate({ version: LEGAL_VERSION })} className="nf-button mt-6 flex w-full items-center justify-center gap-2 border border-white bg-white px-4 py-3.5 text-[10px] font-bold uppercase tracking-[.08em] text-black disabled:opacity-60"><ShieldCheck className="h-4 w-4" />{isArabic ? "قرأت وفهمت — أوافق" : "I have read and understood — agree"}</button>
  </div></div>;
}
