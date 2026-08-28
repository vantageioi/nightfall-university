import { ArrowUpRight, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export type ProgrammeBriefingRecord = {
  programmeId: string;
  keyFitSignals: string[];
  languageRequirements: string;
  costContext: string;
  admissionContext: string;
  nextResearchStep: string;
  reviewNote: string;
  sourceUrl: string;
  generatedAt: Date;
};

export function ProgrammeBriefingPanel({ briefing, isGenerating, isArabic, onGenerate }: { briefing?: ProgrammeBriefingRecord; isGenerating: boolean; isArabic: boolean; onGenerate: () => void }) {
  const reduceMotion = useReducedMotion();
  const copy = isArabic
    ? { kicker: "إيجاز بحث بالـAI", generate: "سوّي إيجاز بحث", refresh: "حدّث الإيجاز", loading: "عم نرتّب فقط المعلومات العامة المتاحة…", empty: "ملخّص قصير مبني على بيانات الدليل وروابطه، من دون حكم على قبولك أو أهليتك.", signals: "إشارات بحث أساسية", language: "اللغة", cost: "سياق الرسوم", admission: "سياق القبول", next: "خطوة البحث الجاية", source: "افتح المصدر", boundary: "ملخّص AI — تأكد من المصدر الرسمي قبل ما تعتمد أي تفصيل.", updated: "تم التحديث" }
    : { kicker: "AI RESEARCH BRIEF", generate: "Generate AI research brief", refresh: "Refresh brief", loading: "Mapping only the supplied public record…", empty: "A short source-grounded read of this programme’s public index data—never an admissions or eligibility verdict.", signals: "KEY RESEARCH SIGNALS", language: "LANGUAGE", cost: "COST CONTEXT", admission: "ADMISSION CONTEXT", next: "NEXT RESEARCH STEP", source: "Open official source", boundary: "AI summary — verify the official source before relying on any detail.", updated: "Updated" };
  const generatedLabel = briefing?.generatedAt ? new Intl.DateTimeFormat(isArabic ? "ar" : "en", { dateStyle: "medium" }).format(new Date(briefing.generatedAt)) : "";
  const showBriefing = !!briefing && !isGenerating;

  return <section className="mt-3 border border-white/15 bg-black/20 p-3">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="nf-label text-[8px] text-[#afafaf]">// {copy.kicker}</p>{briefing && <p className="mt-1 text-[9px] text-[#939393]">{copy.updated}: {generatedLabel}</p>}</div><button type="button" disabled={isGenerating} onClick={onGenerate} className="nf-button inline-flex items-center gap-2 border border-white/25 px-2.5 py-2 text-[9px] font-semibold hover:bg-white hover:text-black disabled:opacity-50"><Sparkles className="h-3 w-3" />{briefing ? copy.refresh : copy.generate}</button></div>
    <AnimatePresence mode="wait">{isGenerating ? <motion.div key="loading" initial={reduceMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: .18 }} className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3 text-xs text-[#e0e0e0]"><Loader2 className="h-3.5 w-3.5 animate-spin" />{copy.loading}</motion.div> : showBriefing ? <motion.div key="briefing" initial={reduceMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: .2 }} className="mt-3 border-t border-white/10 pt-3"><div><p className="nf-label text-[8px] text-[#a1a1a1]">{copy.signals}</p><ul className="mt-2 space-y-1.5">{briefing.keyFitSignals.map((signal) => <li key={signal} className="flex gap-2 text-[11px] leading-5 text-[#e3e3e3]"><span aria-hidden="true">—</span><span>{signal}</span></li>)}</ul></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><BriefFact label={copy.language} value={briefing.languageRequirements} /><BriefFact label={copy.cost} value={briefing.costContext} /><BriefFact label={copy.admission} value={briefing.admissionContext} /><BriefFact label={copy.next} value={briefing.nextResearchStep} /></div><div className="mt-3 flex flex-wrap items-center gap-3 border-t border-white/10 pt-3"><a href={briefing.sourceUrl} target="_blank" rel="noreferrer" className="nf-button inline-flex items-center gap-1 text-[10px] font-semibold underline hover:text-white">{copy.source}<ArrowUpRight className="h-3 w-3" /></a><span className="flex items-center gap-1 text-[10px] leading-4 text-[#bdbdbd]"><ShieldCheck className="h-3.5 w-3.5 shrink-0" />{briefing.reviewNote || copy.boundary}</span></div></motion.div> : <motion.p key="empty" initial={false} className="mt-3 border-t border-white/10 pt-3 text-[11px] leading-5 text-[#a3a3a3]">{copy.empty}</motion.p>}</AnimatePresence>
  </section>;
}

function BriefFact({ label, value }: { label: string; value: string }) {
  return <div className="border-l border-white/15 pl-3"><p className="nf-label text-[8px] text-[#a1a1a1]">{label}</p><p className="mt-1 text-[11px] leading-5 text-[#e0e0e0]">{value}</p></div>;
}
