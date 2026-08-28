import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { JourneyAction, JourneyHomeState } from "@/lib/journeyStage";

type ActiveProgramme = {
  id: string;
  programme: string;
  university: string;
  city?: string | null;
  isPriority: boolean;
  sourceUrl?: string | null;
  canOpenPreparationDetail?: boolean;
};

type AttentionItem = {
  id: string;
  kind: "reply" | "draft" | "follow_up" | "deadline" | "document" | "watch";
  title: string;
  detail: string;
};

const copy = {
  en: {
    kicker: "NIGHTFALL / YOUR JOURNEY", title: "You have a direction.", body: "These are the programmes worth keeping close. Now we’ll keep track of what happens next.",
    orientationTitle: "Your journey starts with a direction.", orientationBody: "Answer a few private questions first. Nightfall will keep the next useful step clear—without asking you to manage everything at once.",
    snapshot: { shortlist: "SHORTLISTED", preparing: "ACTIVE PREPARATION", dates: "UPCOMING DATES" }, next: "YOUR NEXT STEP", nextDetail: "Before you decide whether to pursue this path, review what the official programme information says you will need.",
    action: { needs_direction: "Continue the Consultant", review_first_options: "Review my first options", build_shortlist: "Keep one more option", compare_options: "Compare my options", review_programme_requirements: "Review programme requirements", prepare_next_item: "Build my path", review_communication: "Review what is waiting", review_sources: "Check the latest source" },
    preparing: "YOUR APPLICATIONS", preparingTitle: "The paths you are actively preparing.", preparingLabel: "PREPARING", preparationMeta: "Source review and organisation only. Nothing is submitted by Nightfall.", review: "REVIEW →",
    saved: "YOUR SHORTLIST", savedTitle: "Programmes worth keeping close.", priority: "PRIORITY", option: "SAVED OPTION", officialSource: "Official source", moreOptions: "Review options →",
    changed: "WHAT CHANGED?", matters: "WHAT MATTERS?", noAttention: "Nothing else requires your attention right now.", attentionSummary: "Review only what is waiting; the rest can stay quiet.",
    areas: "JOURNEY AREAS", tools: "Open Journey areas", adjust: "Something changed? Talk it through", work: "WORK WITH NIGHTFALL", research: "Research with the Agent", researchNote: "Ask in your own words. Nightfall reads source-backed programme evidence with you.", essays: "Draft an essay", essaysNote: "Turn a real prompt and your own notes into a private first draft to review.", outreach: "Prepare outreach", outreachNote: "Draft, approve, send, and plan a follow-up from your own Gmail.", settings: "Settings", settingsNote: "Gemini, Gmail, language, and privacy", open: "Open →",
  },
  ar: {
    kicker: "نايتفول / رحلتك", title: "صار عندك اتجاه.", body: "هني البرامج اللي بستاهلوا يضلّوا قريبين. هلق منتابع شو بصير بعدين.",
    orientationTitle: "رحلتك بتبلّش باتجاه.", orientationBody: "جاوب على كم سؤال خاص بالأول. نايتفول بتخلّي الخطوة المفيدة الجاية واضحة—من دون ما تطلب منك تدير كل شي مرة وحدة.",
    snapshot: { shortlist: "خيارات محفوظة", preparing: "تحضير نشط", dates: "مواعيد قادمة" }, next: "خطوتك الجاية", nextDetail: "قبل ما تقرر إذا بدك تلاحق هالطريق، راجع شو بتقول معلومات البرنامج الرسمية عن اللي بدك إياه.",
    action: { needs_direction: "كمّل مع المستشار", review_first_options: "راجع أول خياراتي", build_shortlist: "احتفظ بخيار كمان", compare_options: "قارن خياراتي", review_programme_requirements: "راجع متطلبات البرنامج", prepare_next_item: "ابنِ طريقي", review_communication: "راجع اللي ناطر", review_sources: "راجع آخر مصدر" },
    preparing: "طلباتك", preparingTitle: "الطرق اللي عم تحضّر إلها فعلياً.", preparingLabel: "قيد التحضير", preparationMeta: "مراجعة مصدر وتنظيم بس. نايتفول ما بتقدّم أي طلب عنك.", review: "راجع ←",
    saved: "قائمة خياراتك", savedTitle: "برامج بستاهلوا يضلّوا قريبين.", priority: "أولوية", option: "خيار محفوظ", officialSource: "المصدر الرسمي", moreOptions: "راجع الخيارات ←",
    changed: "شو تغيّر؟", matters: "شو بيهم؟", noAttention: "ما في شي تاني بدو انتباهك هلق.", attentionSummary: "راجع بس الشي اللي ناطرك؛ الباقي بيضل هادي.",
    areas: "مساحات الرحلة", tools: "افتح مساحات الرحلة", adjust: "صار شي؟ خلّينا نحكي", work: "اشتغل مع نايتفول", research: "ابحث مع الوكيل", researchNote: "اسأل بطريقتك. نايتفول بتقرأ دليل البرامج المبني على المصادر معك.", essays: "حضّر مسودة مقال", essaysNote: "حوّل سؤال حقيقي وملاحظاتك لمسودة خاصة تراجعها.", outreach: "حضّر تواصل", outreachNote: "حضّر المسودة، وافق، ابعث، وخطّط متابعة من Gmail تبعك.", settings: "الإعدادات", settingsNote: "Gemini وGmail واللغة والخصوصية", open: "افتح ←",
  },
} as const;

function count(value: number) { return String(value).padStart(2, "0"); }

export function JourneyHome({ language, name, state, programmes, attentionItems, preparingProgrammeIds, onAction, onOpenProgramme, onOpenTools, onRecover, onOpenResearch, onOpenEssays, onOpenOutreach, onOpenSettings }: { language: "en" | "ar"; name: string; state: JourneyHomeState; programmes: ActiveProgramme[]; attentionItems: AttentionItem[]; preparingProgrammeIds: Set<string>; onAction: (action: JourneyAction) => void; onOpenProgramme: (programmeId: string) => void; onOpenTools: () => void; onRecover: () => void; onOpenResearch: () => void; onOpenEssays: () => void; onOpenOutreach: () => void; onOpenSettings: () => void }) {
  const t = copy[language];
  const isArabic = language === "ar";
  const focusedProgramme = programmes.find((programme) => programme.isPriority) ?? programmes[0];
  const preparing = programmes.filter((programme) => preparingProgrammeIds.has(programme.id));
  const pulse = Object.fromEntries(state.pulse.map((item) => [item.kind, item.value])) as Record<string, number>;
  const isOriented = state.stage !== "orient";
  const primary = state.primaryAction;
  const openPrimary = () => primary.reason === "review_programme_requirements" && focusedProgramme?.canOpenPreparationDetail ? onOpenProgramme(focusedProgramme.id) : onAction(primary);

  return <section className="pb-14" aria-labelledby="journey-heading">
    <header className="border-b border-white/15 pb-9 sm:pb-12">
      <p className="nf-eyebrow">// {t.kicker}</p>
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
        <div><p className="nf-label text-[9px] text-white/45">{isArabic ? "أهلاً" : "HELLO"} / {name}</p><h1 id="journey-heading" className="mt-3 max-w-4xl text-5xl font-semibold leading-[.86] tracking-[-.075em] sm:text-7xl">{isOriented ? t.title : t.orientationTitle}</h1><p className="mt-6 max-w-2xl text-base leading-7 text-white/60 sm:text-lg">{isOriented ? t.body : t.orientationBody}</p></div>
        <div className="border-l border-white/25 pl-4"><p className="text-xs leading-5 text-white/52">{isOriented ? (isArabic ? "رحلتك خاصة، والخطوة الجاية بتضل بإيدك." : "Your journey is private. The next move remains yours.") : (isArabic ? "ما بدك تحل كل شي اليوم." : "You do not need to solve everything today.")}</p><button type="button" onClick={onOpenSettings} className="nf-button mt-4 inline-flex items-center gap-2 text-left text-[10px] font-bold uppercase tracking-[.1em] text-white underline decoration-white/35 underline-offset-4 hover:decoration-white">{t.settings}<ArrowRight className={`h-3 w-3 ${isArabic ? "rotate-180" : ""}`} /><span className="sr-only">{t.settingsNote}</span></button></div>
      </div>
    </header>

    <section aria-label={t.matters} className="grid border-b border-white/15 sm:grid-cols-3">
      {[[count(pulse.shortlist || 0), t.snapshot.shortlist], [count(preparing.length), t.snapshot.preparing], [count(pulse.deadline || 0), t.snapshot.dates]].map(([value, label]) => <div key={String(label)} className="border-b border-white/10 px-0 py-6 last:border-b-0 sm:border-b-0 sm:border-r sm:px-5 sm:first:pl-0 sm:last:border-r-0"><p className="text-4xl font-semibold tracking-[-.07em] text-white">{value}</p><p className="mt-2 nf-label text-[9px] text-white/48">{label}</p></div>)}
    </section>

    <section className="mt-10 border-y border-white/35 bg-white/[.025] px-5 py-7 sm:px-8 sm:py-9">
      <p className="nf-label text-[9px] text-white/45">// {t.next}</p>
      <div className="mt-5 flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="max-w-2xl text-3xl font-semibold leading-[.94] tracking-[-.06em] sm:text-4xl">{t.action[primary.reason]}</h2>{focusedProgramme && primary.reason === "review_programme_requirements" && <p className="mt-3 text-sm font-semibold text-white">{focusedProgramme.programme}<span className="mx-2 text-white/35">/</span><span className="font-normal text-white/55">{focusedProgramme.university}</span></p>}<p className="mt-4 max-w-xl text-sm leading-6 text-white/58">{primary.reason === "review_programme_requirements" ? t.nextDetail : state.stage === "communicate" ? t.attentionSummary : t.body}</p></div><button type="button" onClick={openPrimary} className="nf-button inline-flex shrink-0 items-center gap-2 border border-white bg-white px-5 py-3.5 text-[10px] font-bold uppercase tracking-[.1em] text-black hover:bg-[#e9e9e9]">{t.action[primary.reason]}<ArrowRight className={`h-3.5 w-3.5 ${isArabic ? "rotate-180" : ""}`} /></button></div>
    </section>

    {isOriented && <section className="mt-11"><p className="nf-label text-[9px] text-white/45">// {t.work}</p><div className="mt-5 grid gap-px border border-white/15 bg-white/10 lg:grid-cols-3"><button type="button" onClick={onOpenResearch} className="nf-button bg-[#101010] p-5 text-left transition-colors hover:bg-white hover:text-black"><p className="text-lg font-semibold tracking-[-.04em]">{t.research}</p><p className="mt-3 min-h-12 text-xs leading-5 opacity-65">{t.researchNote}</p><span className="mt-6 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.1em]">{t.open}<ArrowRight className={`h-3.5 w-3.5 ${isArabic ? "rotate-180" : ""}`} /></span></button><button type="button" onClick={onOpenEssays} className="nf-button bg-[#101010] p-5 text-left transition-colors hover:bg-white hover:text-black"><p className="text-lg font-semibold tracking-[-.04em]">{t.essays}</p><p className="mt-3 min-h-12 text-xs leading-5 opacity-65">{t.essaysNote}</p><span className="mt-6 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.1em]">{t.open}<ArrowRight className={`h-3.5 w-3.5 ${isArabic ? "rotate-180" : ""}`} /></span></button><button type="button" onClick={onOpenOutreach} className="nf-button bg-[#101010] p-5 text-left transition-colors hover:bg-white hover:text-black"><p className="text-lg font-semibold tracking-[-.04em]">{t.outreach}</p><p className="mt-3 min-h-12 text-xs leading-5 opacity-65">{t.outreachNote}</p><span className="mt-6 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.1em]">{t.open}<ArrowRight className={`h-3.5 w-3.5 ${isArabic ? "rotate-180" : ""}`} /></span></button></div></section>}

    {preparing.length > 0 && <section className="mt-11"><p className="nf-label text-[9px] text-white/45">// {t.preparing}</p><h2 className="mt-3 text-2xl font-semibold tracking-[-.055em] sm:text-3xl">{t.preparingTitle}</h2><div className="mt-6 divide-y divide-white/12 border-y border-white/15">{preparing.map((programme, index) => <article key={programme.id} className="grid gap-5 py-6 md:grid-cols-[54px_minmax(0,1fr)_auto] md:items-end"><p className="text-2xl font-semibold tracking-[-.06em] text-white/62">{count(index + 1)}</p><div><p className="nf-label text-[8px] text-white/45">{t.preparingLabel}{programme.city ? ` / ${programme.city}` : ""}</p><h3 className="mt-3 text-2xl font-semibold leading-tight">{programme.university}</h3><p className="mt-2 text-sm text-white/62">{programme.programme}</p><p className="mt-4 max-w-xl text-xs leading-5 text-white/45">{t.preparationMeta}</p></div>{programme.canOpenPreparationDetail && <button type="button" onClick={() => onOpenProgramme(programme.id)} className="nf-button text-left text-[10px] font-bold uppercase tracking-[.1em] text-white underline decoration-white/35 underline-offset-4 hover:decoration-white">{t.review}</button>}</article>)}</div></section>}

    {programmes.length > 0 && <section className="mt-11"><div className="flex items-end justify-between gap-4"><div><p className="nf-label text-[9px] text-white/45">// {t.saved}</p><h2 className="mt-3 text-2xl font-semibold tracking-[-.055em] sm:text-3xl">{t.savedTitle}</h2></div><button type="button" onClick={() => onAction({ destination: programmes.length >= 2 ? "compare" : "discover", reason: programmes.length >= 2 ? "compare_options" : "build_shortlist" })} className="nf-button text-xs text-white/60 underline underline-offset-4 hover:text-white">{t.moreOptions}</button></div><div className="mt-6 divide-y divide-white/12 border-y border-white/15">{programmes.slice(0, 3).map((programme) => <article key={programme.id} className="grid gap-4 py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end"><div><p className="nf-label text-[8px] text-white/45">{programme.isPriority ? t.priority : t.option}{programme.city ? ` / ${programme.city}` : ""}</p><h3 className="mt-3 text-xl font-semibold leading-tight">{programme.programme}</h3><p className="mt-2 text-xs leading-5 text-white/58">{programme.university}</p></div><div className="flex flex-wrap gap-4">{programme.sourceUrl && <a href={programme.sourceUrl} target="_blank" rel="noreferrer" className="nf-button text-[10px] font-semibold text-white/60 underline underline-offset-4 hover:text-white">{t.officialSource}</a>}{programme.canOpenPreparationDetail && <button type="button" onClick={() => onOpenProgramme(programme.id)} className="nf-button text-[10px] font-semibold text-white underline underline-offset-4">{t.review}</button>}</div></article>)}</div></section>}

    <section className="mt-11 border-t border-white/15 pt-8"><p className="nf-label text-[9px] text-white/45">// {attentionItems.length ? t.changed : t.matters}</p>{attentionItems.length ? <div className="mt-5 divide-y divide-white/12 border-y border-white/15">{attentionItems.slice(0, 3).map((item) => <article key={item.id} className="grid gap-2 py-5 sm:grid-cols-[minmax(0,1fr)_auto]"><div><h3 className="text-sm font-semibold text-white">{item.title}</h3><p className="mt-2 text-xs leading-5 text-white/55">{item.detail}</p></div><p className="nf-label text-[8px] text-white/40">{item.kind.replace("_", " ")}</p></article>)}</div> : <div className="mt-5 flex gap-3 border-y border-white/15 py-5"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-white/85" /><p className="text-sm leading-6 text-white/60">{t.noAttention}</p></div>}</section>

    <nav aria-label={t.areas} className="mt-11 flex flex-wrap gap-x-5 gap-y-3 border-t border-white/15 pt-6"><button type="button" onClick={onOpenTools} className="nf-button text-xs font-semibold text-white underline underline-offset-4">{t.tools}</button><button type="button" onClick={onRecover} className="nf-button text-xs text-white/58 hover:text-white">{t.adjust}</button></nav>
  </section>;
}
