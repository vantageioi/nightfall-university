import React, { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bookmark, ChevronDown, ExternalLink, Loader2, Search, SlidersHorizontal } from "lucide-react";
import { ProgrammeComparisonPanel } from "@/components/ProgrammeComparisonPanel";
import { toggleProgrammeComparison } from "@/lib/programmeComparison";
import type { ProgrammeResearchPanelContract } from "@/lib/programmeResearchPanel";

export type ProgrammeResearchRecord = {
  programmeId: string;
  officialName: string;
  city: string;
  region: string;
  programmeName: string;
  broadSubjectCategories: string;
  programmeEvidenceUrl: string;
  officialProgrammeUrl: string | null;
  programmeLanguage: string | null;
  admissionSemester: string | null;
  admissionMode: string | null;
  sourceLayer: string;
  reputationTier: string | null;
  securityInfrastructure: string | null;
  feeRiskCategory: string | null;
  syrianBaccalaureateAnabinCondition: string | null;
  isPinned?: boolean;
  priorityRank?: number | null;
  decisionNotes?: string | null;
};

export type ProgrammeResearchPanelProps = {
  provider: ProgrammeResearchPanelContract<ProgrammeResearchRecord>;
  records: ProgrammeResearchRecord[];
  savedProgrammes: ProgrammeResearchRecord[];
  archivedProgrammes: ProgrammeResearchRecord[];
  savedProgrammeIds: Set<string>;
  isLoading: boolean;
  isSavingProgrammeId?: string;
  isLifecyclePending?: boolean;
  initialComparisonIds?: string[];
  query: string;
  category: string;
  language: string;
  isArabic: boolean;
  onQueryChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onLanguageChange: (value: string) => void;
  onSaveProgramme: (programmeId: string) => void;
  onPinProgramme: (programmeId: string, isPinned: boolean) => void;
  onArchiveProgramme: (programmeId: string, archived: boolean) => void;
  onRemoveProgramme: (programmeId: string) => void;
  onSaveNotes: (programmeId: string, decisionNotes: string) => void;
  onSetPriority?: (programmeId: string, priorityRank: number | null) => void;
  renderProgrammeSupplement?: (programme: ProgrammeResearchRecord, isArabic: boolean) => React.ReactNode;
};

const safeUrl = (url: string | null) => url && /^https?:\/\//i.test(url) ? url : null;

function SourceLink({ programme, provider, label }: { programme: ProgrammeResearchRecord; provider: ProgrammeResearchPanelContract<ProgrammeResearchRecord>; label: string }) {
  const source = safeUrl(provider.sourceUrl(programme));
  return source ? <a href={source} target="_blank" rel="noreferrer" className="nf-button inline-flex items-center gap-1 text-[10px] font-semibold underline hover:text-white">{label}<ExternalLink className="h-3 w-3" /></a> : null;
}

export function ProgrammeResearchPanel({ provider, records, savedProgrammes, archivedProgrammes, savedProgrammeIds, isLoading, isSavingProgrammeId, isLifecyclePending, initialComparisonIds = [], query, category, language, isArabic, onQueryChange, onCategoryChange, onLanguageChange, onSaveProgramme, onPinProgramme, onArchiveProgramme, onRemoveProgramme, onSaveNotes, onSetPriority, renderProgrammeSupplement }: ProgrammeResearchPanelProps) {
  const reduceMotion = useReducedMotion();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(true);
  const [activeSavedId, setActiveSavedId] = useState<string | null>(null);
  const [comparisonIds, setComparisonIds] = useState<string[]>(() => initialComparisonIds.filter((programmeId) => savedProgrammeIds.has(programmeId)).slice(0, 3));
  const [notesOpen, setNotesOpen] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [showAllResults, setShowAllResults] = useState(false);
  const activeProgramme = savedProgrammes.find((programme) => programme.programmeId === activeSavedId) ?? savedProgrammes[0];
  const comparedProgrammes = savedProgrammes.filter((programme) => comparisonIds.includes(programme.programmeId));
  const visibleRecords = showAllResults ? records : records.slice(0, provider.initialVisibleResultCount);
  const remainingResultCount = Math.max(0, records.length - provider.initialVisibleResultCount);
  const presentation = isArabic ? provider.presentation.ar : provider.presentation.en;
  const copy = isArabic
    ? { ...presentation, shortlist: "قائمتك القصيرة", saved: "برامج محفوظة", open: "افتح مساحة البحث", close: "سكّر مساحة البحث", source: "افتح المصدر", filters: "فلترة", hideFilters: "إخفاء الفلاتر", search: "دوّر على برنامج، جامعة أو مدينة", fields: "كل المجالات", languages: "كل اللغات", results: "برامج لتبدأ منها", save: "احفظ برحلتي", savedLabel: "محفوظ", workspace: "مساحة بحثك", pin: "ثبّت", unpin: "شيل التثبيت", archive: "أرشف", remove: "احذف", notes: "ملاحظات القرار", notesHint: "ليش هالبرنامج لفتك؟ شو بدك تتأكد منه؟", showNotes: "أضف ملاحظات", hideNotes: "خبّي الملاحظات", compare: "قارن", comparison: "مقارنة هادئة", archived: "المؤرشفة", restore: "رجّع للقائمة", boundary: "المصدر الرسمي هو المرجع النهائي. نايتفول بيساعدك ترتّب بحثك، مش يقرر أهليتك أو قبولك.", language: "اللغة", admission: "القبول", term: "الفصل", cost: "سياق الرسوم", noResults: "ما لقينا نتائج بهالفلترة. جرّب بحث أوسع.", more: "شوف الباقي", fewer: "شوف أقل" }
    : { ...presentation, shortlist: "YOUR SHORTLIST", saved: "SAVED PROGRAMMES", open: "Open research space", close: "Close research space", source: "Open source", filters: "Refine", hideFilters: "Hide refinement", search: "Search programme, university, or city", fields: "All fields", languages: "All languages", results: "PROGRAMMES TO START WITH", save: "Save to my journey", savedLabel: "Saved", workspace: "YOUR RESEARCH SPACE", pin: "Pin", unpin: "Unpin", archive: "Archive", remove: "Remove", notes: "DECISION NOTES", notesHint: "Why does this programme matter? What still needs confirming?", showNotes: "Add notes", hideNotes: "Hide notes", compare: "Compare", comparison: "QUIET COMPARISON", archived: "ARCHIVED", restore: "Restore", boundary: "The official source remains the final reference. Nightfall helps organize research; it does not decide eligibility or admission.", language: "LANGUAGE", admission: "ADMISSION", term: "SEMESTER", cost: "COST CONTEXT", noResults: "No programmes match this view yet. Try a broader search.", more: "Show more programmes", fewer: "Show fewer" };

  return <section className="mt-10 border border-white/15 bg-[#141414] p-5 sm:p-7">
    <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end"><div><p className="nf-label text-[#adadad]">// {presentation.kicker}</p><h2 className="mt-3 max-w-3xl text-4xl font-semibold leading-[.88] tracking-[-.075em] sm:text-5xl">{presentation.title}</h2><p className="mt-4 max-w-2xl text-sm leading-6 text-[#a2a2a2]">{presentation.body}</p></div><div className="border-l border-white/15 pl-4"><p className="nf-label text-[8px] text-[#a0a0a0]">// {copy.shortlist}</p><p className="mt-2 text-3xl font-semibold tracking-[-.06em]">{savedProgrammes.length}</p><p className="mt-1 text-[11px] text-[#afafaf]">{copy.saved}</p></div></div>
    {savedProgrammes.length > 0 && <section className="mt-8 border-y border-white/15 py-5"><div className="flex flex-wrap items-center justify-between gap-3"><p className="nf-label text-[9px] text-[#afafaf]">// {copy.shortlist}</p><button type="button" onClick={() => setWorkspaceOpen((current) => !current)} className="nf-button inline-flex items-center gap-2 border border-white/20 px-3 py-2 text-[10px] font-semibold"><Bookmark className="h-3 w-3" />{workspaceOpen ? copy.close : copy.open}<ChevronDown className={`h-3 w-3 transition-transform ${workspaceOpen ? "rotate-180" : ""}`} /></button></div><div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{savedProgrammes.slice(0, 6).map((programme) => <button key={programme.programmeId} type="button" onClick={() => { setActiveSavedId(programme.programmeId); setWorkspaceOpen(true); setNotesOpen(false); }} className={`group relative overflow-hidden border p-3 text-left transition-colors ${activeProgramme?.programmeId === programme.programmeId && workspaceOpen ? "border-white bg-white text-black" : "border-white/10 bg-black/15 hover:border-white/35"}`}><span className={`night-orbit absolute -right-6 -top-8 h-20 w-20 ${activeProgramme?.programmeId === programme.programmeId && workspaceOpen ? "border-black/15" : "border-white/10"}`} /><span className="relative block nf-label text-[8px] opacity-65">{programme.isPinned ? "★ " : ""}{programme.city} / {programme.region}</span><span className="relative mt-2 block text-sm font-semibold leading-tight">{programme.programmeName}</span><span className="relative mt-3 block text-[10px] opacity-70">{programme.programmeLanguage || copy.source}</span></button>)}</div></section>}
    <AnimatePresence initial={false}>{workspaceOpen && activeProgramme && <motion.section key={activeProgramme.programmeId} initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .22 }} className="mt-6 grid gap-6 border border-white/15 bg-black/20 p-4 lg:grid-cols-[minmax(0,1fr)_280px]"><div><p className="nf-label text-[8px] text-[#afafaf]">// {copy.workspace}</p><div className="mt-3 flex flex-wrap items-start justify-between gap-4"><div><p className="text-2xl font-semibold leading-tight tracking-[-.045em]">{activeProgramme.programmeName}</p><p className="mt-2 text-xs text-[#b2b2b2]">{activeProgramme.officialName} · {activeProgramme.city}</p></div><SourceLink programme={activeProgramme} provider={provider} label={copy.source} /></div><div className="mt-5 grid gap-px border border-white/10 bg-white/10 sm:grid-cols-2"><InfoCell label={copy.language} value={activeProgramme.programmeLanguage} /><InfoCell label={copy.admission} value={activeProgramme.admissionMode} /><InfoCell label={copy.term} value={activeProgramme.admissionSemester} /><InfoCell label={copy.cost} value={activeProgramme.feeRiskCategory} /></div><div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4"><button type="button" disabled={isLifecyclePending} onClick={() => onPinProgramme(activeProgramme.programmeId, !activeProgramme.isPinned)} className="nf-button border border-white/20 px-3 py-2 text-[10px]">{activeProgramme.isPinned ? copy.unpin : copy.pin}</button><button type="button" disabled={isLifecyclePending} onClick={() => setComparisonIds((current) => toggleProgrammeComparison(current, activeProgramme.programmeId))} className={`nf-button border px-3 py-2 text-[10px] ${comparisonIds.includes(activeProgramme.programmeId) ? "border-white bg-white text-black" : "border-white/20"}`}>{copy.compare}</button><button type="button" disabled={isLifecyclePending} onClick={() => setNotesOpen((current) => !current)} className="nf-button border border-white/20 px-3 py-2 text-[10px]">{notesOpen ? copy.hideNotes : copy.showNotes}</button><button type="button" disabled={isLifecyclePending} onClick={() => onArchiveProgramme(activeProgramme.programmeId, true)} className="nf-button px-2 py-2 text-[10px] text-[#cfcfcf] underline">{copy.archive}</button><button type="button" disabled={isLifecyclePending} onClick={() => onRemoveProgramme(activeProgramme.programmeId)} className="nf-button px-2 py-2 text-[10px] text-[#cfcfcf] underline">{copy.remove}</button></div><AnimatePresence>{notesOpen && <motion.label initial={reduceMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: .18 }} className="mt-4 block border-t border-white/10 pt-4"><span className="nf-label text-[8px] text-[#a1a1a1]">// {copy.notes}</span><textarea defaultValue={activeProgramme.decisionNotes ?? ""} onBlur={(event) => onSaveNotes(activeProgramme.programmeId, event.target.value)} placeholder={copy.notesHint} maxLength={3000} rows={3} className="mt-2 w-full resize-y border border-white/15 bg-[#141414] px-3 py-2.5 text-xs leading-5 text-white outline-none placeholder:text-[#787878]" /></motion.label>}</AnimatePresence>{renderProgrammeSupplement?.(activeProgramme, isArabic)}</div><aside className="border-t border-white/10 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0"><p className="nf-label text-[8px] text-[#a1a1a1]">// {copy.comparison}</p><ProgrammeComparisonPanel programmes={comparedProgrammes.map(provider.toComparableProgramme)} language={isArabic ? "ar" : "en"} /><div className="mt-5 border-t border-white/10 pt-4"><button type="button" onClick={() => setArchivedOpen((current) => !current)} className="nf-button flex w-full items-center justify-between text-[10px] font-semibold"><span>{copy.archived} ({archivedProgrammes.length})</span><ChevronDown className={`h-3 w-3 transition-transform ${archivedOpen ? "rotate-180" : ""}`} /></button>{archivedOpen && <div className="mt-3 space-y-2">{archivedProgrammes.map((programme) => <div key={programme.programmeId} className="border border-white/10 p-2"><p className="truncate text-[11px] text-[#e0e0e0]">{programme.programmeName}</p><div className="mt-2 flex gap-3"><button type="button" disabled={isLifecyclePending} onClick={() => onArchiveProgramme(programme.programmeId, false)} className="nf-button text-[9px] underline">{copy.restore}</button><button type="button" disabled={isLifecyclePending} onClick={() => onRemoveProgramme(programme.programmeId)} className="nf-button text-[9px] underline">{copy.remove}</button></div></div>)}</div>}</div></aside></motion.section>}</AnimatePresence>
    <section className="mt-9"><div className="flex flex-col gap-4 border-b border-white/15 pb-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="nf-label text-[8px] text-[#a1a1a1]">// {copy.results}</p><p className="mt-2 text-lg font-semibold">{records.length} {isArabic ? "نتيجة بهالعرض" : "results in this view"}</p></div><button type="button" onClick={() => setFiltersOpen((current) => !current)} className="nf-button inline-flex items-center gap-2 border border-white/20 px-3 py-2 text-[10px] font-semibold"><SlidersHorizontal className="h-3.5 w-3.5" />{filtersOpen ? copy.hideFilters : copy.filters}</button></div><div className="mt-4 grid gap-3"><label className="flex items-center gap-3 border border-white/15 bg-black/20 px-3 py-3"><Search className="h-4 w-4 text-[#b9b9b9]" /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={copy.search} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#757575]" /></label><AnimatePresence>{filtersOpen && <motion.div initial={reduceMotion ? false : { opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .18 }} className="grid gap-3 sm:grid-cols-2"><select value={category} onChange={(event) => onCategoryChange(event.target.value)} className="border border-white/10 bg-black/20 px-3 py-3 text-xs text-white outline-none"><option value="">{copy.fields}</option>{provider.fieldOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><select value={language} onChange={(event) => onLanguageChange(event.target.value)} className="border border-white/10 bg-black/20 px-3 py-3 text-xs text-white outline-none"><option value="">{copy.languages}</option>{provider.languageOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></motion.div>}</AnimatePresence></div><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{isLoading ? Array.from({ length: 6 }, (_, index) => <div key={index} className="h-56 animate-pulse border border-white/10 bg-white/[.03]" />) : visibleRecords.map((record, index) => <article key={record.programmeId} className="group relative flex min-h-[245px] flex-col overflow-hidden border border-white/10 bg-black/15 p-4 transition-colors hover:border-white/35"><div className="night-orbit absolute -right-8 -top-10 h-28 w-28 border-white/10 transition-transform duration-300 group-hover:scale-110" /><p className="relative nf-label text-[8px] text-[#a1a1a1]">{String(index + 1).padStart(2, "0")} / {record.city} · {record.region}</p><h3 className="relative mt-5 max-w-[15rem] text-xl font-semibold leading-[.96] tracking-[-.045em]">{record.programmeName}</h3><p className="relative mt-3 text-[11px] text-[#afafaf]">{record.officialName}</p><div className="relative mt-auto flex items-end justify-between gap-3 border-t border-white/10 pt-3"><div><p className="nf-label text-[8px] text-[#8c8c8c]">{copy.language}</p><p className="mt-1 text-[10px] text-[#dedede]">{record.programmeLanguage || "—"}</p></div>{savedProgrammeIds.has(record.programmeId) ? <button type="button" onClick={() => { setActiveSavedId(record.programmeId); setWorkspaceOpen(true); }} className="nf-button border border-white/20 px-2.5 py-2 text-[9px]">{copy.savedLabel}</button> : <button type="button" disabled={isSavingProgrammeId === record.programmeId} onClick={() => onSaveProgramme(record.programmeId)} className="nf-button border border-white/25 px-2.5 py-2 text-[9px] hover:bg-white hover:text-black disabled:opacity-50">{isSavingProgrammeId === record.programmeId ? <Loader2 className="h-3 w-3 animate-spin" /> : copy.save}</button>}</div><div className="relative mt-3"><SourceLink programme={record} provider={provider} label={copy.source} /></div></article>)}{!isLoading && !records.length && <div className="col-span-full border border-dashed border-white/20 p-8 text-center text-sm text-[#9e9e9e]">{copy.noResults}</div>}</div>{!isLoading && remainingResultCount > 0 && <div className="mt-5 flex justify-center"><button type="button" onClick={() => setShowAllResults((current) => !current)} className="nf-button border border-white/20 px-4 py-2.5 text-[10px] font-semibold">{showAllResults ? copy.fewer : `${copy.more} (${remainingResultCount})`}</button></div>}</section>
    <p className="mt-7 border-l border-white/25 pl-3 text-xs leading-5 text-[#b2b2b2]">{copy.boundary}</p>
  </section>;
}

function InfoCell({ label, value }: { label: string; value: string | null }) {
  return <div className="bg-[#141414] p-3"><p className="nf-label text-[8px] text-[#a1a1a1]">{label}</p><p className="mt-1 text-[11px] leading-5 text-[#e0e0e0]">{value || "—"}</p></div>;
}
