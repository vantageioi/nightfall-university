import { ArrowLeft, ArrowRight, Check, CircleHelp, LockKeyhole, Send, Sparkles } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { LanguageToggle, usePublicLanguage } from "@/components/LanguageToggle";
import { ChangeDirectionHandoff } from "@/components/ChangeDirectionHandoff";
import { buildConsultationPriorities, consultantInputQuality, emptyWarmInterviewDraft, fitProfileFromInterview, type WarmInterviewDraft } from "@/lib/consultantOnboarding";
import { clearPendingConsultantInterview, readPendingConsultantInterview, storePendingConsultantInterview } from "@/lib/pendingConsultantInterview";
import { readLocalResearchFeedback } from "@/lib/localResearchFeedback";
import { clearLocalConsultationRecovery, readLocalConsultationRecovery, writeLocalConsultationRecovery } from "@/lib/localConsultationRecovery";
import { EXPLORING_STUDY_DIRECTION, EXPLORING_STUDY_DIRECTION_AR } from "@shared/studyDirection";

type Step = "name" | "direction" | "motivation" | "priorities" | "qualification" | "average" | "language" | "budget" | "location" | "consent" | "unlock";
const standardSteps: Step[] = ["name", "direction", "motivation", "priorities", "qualification", "average", "language", "budget", "location", "consent", "unlock"];
const ease = [0.23, 1, 0.32, 1] as const;

const copy = {
  en: {
    label: "NIGHTFALL / CONSULTANT", eyebrow: "A PRIVATE CONSULTATION", hero: "Tell me what you do know.", note: "You do not need a polished plan before we begin. Every answer can be a sentence, a choice, or an honest “I’m not sure.”", local: "This conversation stays in this browser", feedbackKicker: "FROM YOUR LAST RESEARCH SET", feedbackLead: "You said some options were not working because of:", feedbackNote: "This is a local conversation note, not a silent change to your saved profile.", previous: "Back", continue: "Continue", somethingElse: "Something else", notSure: "I’m not sure", explore: "I’m still exploring", chooseUpToThree: "Choose up to three. You can change your mind.", nonNegotiable: "Which one is non-negotiable?", noPriority: "Nothing yet — I’m still exploring", savePriorities: "Keep these priorities", clarify: "A short, real answer is enough. You can also choose “I’m not sure.”", clarifyDirection: "Try a field such as Architecture or Medicine, choose “I’m still exploring,” or describe it in your own words.",
    name: { q: "What should I call you?", hint: "For example, Rania" }, direction: { q: "What are you considering studying?", hint: "For example, Architecture", choices: ["Architecture", "Medicine", "Engineering", "Computer Science", "Business", "Law"] }, motivation: { q: "What draws you to it?", hint: "For example, I love designing spaces", choices: ["Designing things", "Creative work", "Building / engineering", "I’m not completely sure"] }, priorities: { q: "When you picture studying abroad, what matters most?", hint: "Or tell me in your own words…", choices: ["Keeping costs low", "Strong career prospects", "University reputation", "The city / country", "The programme itself", "Getting in realistically"] }, qualification: { q: "What qualification are you finishing—or have you completed?", hint: "For example, Lebanese Baccalaureate", choices: ["Finishing secondary school", "Completed secondary school", "Already at university"] }, average: { q: "What are your current grades like?", hint: "For example, around 89/100" }, language: { q: "How comfortable are you studying in another language?", hint: "For example, English and some German", choices: ["I’d prefer English", "I’m comfortable in German", "I could study in German", "I’m still learning"] }, budget: { q: "One practical question: how much does keeping costs manageable matter to you?", choices: ["Very important", "Important", "Somewhat", "Not a major concern"] }, location: { q: "Is a country or city a preference, or a requirement?", hint: "For example, Germany", choices: ["It is a requirement", "It is a preference", "I’m open to stronger options"] }, consent: { q: "May I use this context to prepare reviewable research signals?", body: "Nightfall will not make an eligibility, admission, visa, or funding decision. You will inspect sources and decide what happens next.", agree: "Yes, use this for my research", later: "Not yet" }, unlock: { q: "I have enough to start looking.", body: "Your first research set is ready to be prepared in a private Nightfall journey. Sign up only now, after the conversation—not before it.", google: "Continue with Google", signedIn: "Open my private research set", note: "No recommendations are shown here. Your first, explainable research set appears only after this private unlock." },
  },
  ar: {
    label: "نايتفول / المستشار", eyebrow: "استشارة خاصة", hero: "قلّي شو بتعرف.", note: "ما بدك خطة مرتّبة قبل ما نبلّش. كل جواب فيك تقوله بجملة، تختار من الخيارات، أو بصراحة تقول «مش متأكد». ", local: "هالمحادثة بتضل بهالمتصفح", feedbackKicker: "من مجموعة البحث السابقة", feedbackLead: "قلت إن بعض الخيارات ما ركّبت بسبب:", feedbackNote: "هاي ملاحظة محلية للحديث، مش تغيير صامت لملفك المحفوظ.", previous: "رجوع", continue: "كمّل", somethingElse: "شي تاني", notSure: "مش متأكد", explore: "بعدني عم استكشف", chooseUpToThree: "اختار لحد ٣. فيك تغيّر رأيك.", nonNegotiable: "أي وحدة ما فيك تتنازل عنها؟", noPriority: "مش محدد شي بعد — بعدني عم استكشف", savePriorities: "ثبّت هالأولويات", clarify: "جواب قصير وحقيقي بكفي. فيك كمان تختار «مش متأكد». ", clarifyDirection: "جرّب مجال مثل عمارة أو طب، اختار «بعدني عم استكشف»، أو صفه بكلماتك.",
    name: { q: "شو بتحب نناديك؟", hint: "مثلاً، رانيا" }, direction: { q: "شو عم تفكّر تدرس؟", hint: "مثلاً، عمارة", choices: ["عمارة", "طب", "هندسة", "علوم حاسوب", "أعمال", "قانون"] }, motivation: { q: "شو اللي بجذبك لهالمجال؟", hint: "مثلاً، بحب أصمّم أماكن", choices: ["تصميم الأشياء", "شغل إبداعي", "بناء / هندسة", "مش متأكد تماماً"] }, priorities: { q: "لما تتخيّل الدراسة برا، شو أهم شي إلك؟", hint: "أو قلّي بطريقتك شو المهم…", choices: ["تكاليف أقل", "فرص مهنية قوية", "سمعة الجامعة", "المدينة / البلد", "البرنامج نفسه", "مسار واقعي للقبول"] }, qualification: { q: "شو الشهادة اللي عم تخلصها أو خلصتها؟", hint: "مثلاً، بكالوريا لبنانية", choices: ["عم خلّص الثانوية", "مخلّص الثانوية", "أنا بالجامعة"] }, average: { q: "كيف وضع علاماتك حالياً؟", hint: "مثلاً، تقريباً ٨٩ من ١٠٠" }, language: { q: "قديش مرتاح تدرس بلغة تانية؟", hint: "مثلاً، إنجليزي ومعي ألماني بسيط", choices: ["بفضّل الإنجليزي", "مرتاح بالألماني", "فيني أدرس بالألماني", "بعدني عم بتعلّم"] }, budget: { q: "سؤال عملي واحد: قديش مهم إنك تحافظ على التكاليف معقولة؟", choices: ["مهم جداً", "مهم", "إلى حد ما", "مش همّ كبير"] }, location: { q: "البلد أو المدينة تفضيل، أو شرط أساسي؟", hint: "مثلاً، ألمانيا", choices: ["شرط أساسي", "تفضيل", "مفتوح لخيارات أقوى"] }, consent: { q: "بتوافق نستخدم هالسياق لنحضّر إشارات بحث قابلة للمراجعة؟", body: "نايتفول ما بيقرر الأهلية أو القبول أو الفيزا أو التمويل. إنت بتراجع المصادر وبتقرر شو بصير بعدين.", agree: "نعم، استخدمه لبحثي", later: "مش هلق" }, unlock: { q: "صار عندي كفاية لأبلّش أبحث.", body: "أول مجموعة بحث إلك جاهزة لتتحضّر بمساحة نايتفول خاصة. سجّل فقط هلّق، بعد الحديث—مش قبله.", google: "كمّل مع Google", signedIn: "افتح مجموعة بحثي الخاصة", note: "ما في توصيات معروضة هون. أول مجموعة بحث مفسّرة بتظهر فقط بعد هالفتح الخاص." },
  },
} as const;

function Mark() { return <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/35 bg-[#171717] shadow-[0_12px_32px_rgba(0,0,0,.32)]"><Sparkles className="h-3.5 w-3.5 fill-white text-white" /></span>; }

function GoogleMark() { return <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4"><path fill="#f5f5f5" d="M12 5.04c1.62 0 3.06.56 4.2 1.64l3.12-3.12C17.46 1.8 14.96.75 12 .75 7.62.75 3.84 3.27 2.04 6.86l3.66 2.84C6.54 7.02 9 5.04 12 5.04z" /><path fill="#c9c9c9" d="M23.25 12.23c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.32-5.17 3.32-8.82z" /><path fill="#a0a0a0" d="M5.7 14.71c-.23-.69-.36-1.42-.36-2.16s.13-1.47.35-2.16L2.04 7.55A11.26 11.26 0 0 0 .75 12.55c0 1.81.44 3.52 1.29 5l3.66-2.84z" /><path fill="#777" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3 0-5.46-1.98-6.3-4.66l-3.66 2.84C3.84 21.28 7.62 24 12 24z" /></svg>; }

function ChoiceCard({ children, selected, onClick }: { children: React.ReactNode; selected?: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-pressed={selected} className={`nf-button min-h-14 border px-4 py-3 text-left text-sm leading-5 transition-all ${selected ? "border-white bg-white text-black shadow-[0_8px_26px_rgba(255,255,255,.12)]" : "border-white/16 bg-white/[.025] text-white/80 hover:-translate-y-px hover:border-white/60 hover:bg-white/[.06]"}`}>{children}</button>;
}

function CardShell({ children, step, onBack, canGoBack, language }: { children: React.ReactNode; step: Step; onBack: () => void; canGoBack: boolean; language: "en" | "ar" }) {
  const t = copy[language];
  return <motion.section key={step} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: .24, ease }} className="relative min-h-[470px] overflow-hidden border border-white/16 bg-[#151515]/95 p-6 shadow-[0_28px_80px_rgba(0,0,0,.42),inset_0_1px_rgba(255,255,255,.05)] sm:min-h-[520px] sm:p-9"><div className="absolute -right-20 -top-20 h-56 w-56 rounded-full border border-white/[.045]" /><div className="relative flex h-full min-h-[408px] flex-col sm:min-h-[448px]"><div className="flex items-center justify-between gap-4"><span className="nf-label text-[9px] tracking-[.16em] text-white/45">// {t.label}</span><span className="inline-flex items-center gap-2 text-[10px] text-white/45"><LockKeyhole className="h-3.5 w-3.5" />{t.local}</span></div><div className="my-auto py-10">{children}</div><div className="flex min-h-8 items-center justify-between border-t border-white/10 pt-5">{canGoBack ? <button type="button" onClick={onBack} className="nf-button inline-flex items-center gap-2 text-xs text-white/55 hover:text-white"><ArrowLeft className={`h-3.5 w-3.5 ${language === "ar" ? "rotate-180" : ""}`} />{t.previous}</button> : <span className="text-[10px] text-white/35">NIGHTFALL</span>}<span className="text-[10px] text-white/35">PRIVATE · REVIEWABLE · YOURS</span></div></div></motion.section>;
}

function FreeText({ value, onChange, placeholder, inputRef, multiline = false }: { value: string; onChange: (next: string) => void; placeholder: string; inputRef?: React.RefObject<HTMLInputElement | null>; multiline?: boolean }) {
  const className = "w-full border-b border-white/25 bg-transparent px-0 py-4 text-lg leading-7 text-white outline-none placeholder:text-white/28 focus:border-white";
  return multiline ? <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={3} className={`${className} resize-none`} /> : <input ref={inputRef} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={className} />;
}

function ConsultantCards({ draft, setDraft, language, userName, onUnlock, resumeAtUnlock, startAtDirection = false }: { draft: WarmInterviewDraft; setDraft: React.Dispatch<React.SetStateAction<WarmInterviewDraft>>; language: "en" | "ar"; userName?: string | null; onUnlock: () => void; resumeAtUnlock: boolean; startAtDirection?: boolean }) {
  const t = copy[language];
  const isArabic = language === "ar";
  const reduceMotion = useReducedMotion();
  const activeSteps = startAtDirection ? standardSteps.filter((candidate) => candidate !== "name") : standardSteps;
  const [stepIndex, setStepIndex] = useState(() => resumeAtUnlock ? activeSteps.length - 1 : 0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [priorityChoices, setPriorityChoices] = useState<string[]>([]);
  const [primaryPriority, setPrimaryPriority] = useState("");
  const [priorityNote, setPriorityNote] = useState("");
  const [locationKind, setLocationKind] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const step = activeSteps[stepIndex];

  useEffect(() => {
    setFeedback("");
    setAnswer("");
    if (["name", "direction", "motivation", "qualification", "average", "language", "location"].includes(step)) window.setTimeout(() => inputRef.current?.focus(), 30);
  }, [step]);

  const next = () => setStepIndex((index) => Math.min(index + 1, activeSteps.length - 1));
  const back = () => setStepIndex((index) => Math.max(0, index - 1));
  const setField = (field: keyof WarmInterviewDraft, value: string) => setDraft((current) => ({ ...current, [field]: value }));
  const textField: Partial<Record<Step, keyof WarmInterviewDraft>> = { name: "preferredName", direction: "studyDirection", motivation: "motivation", qualification: "highSchoolDiplomaOrigin", average: "academicAverage", language: "languageComfort" };
  const qualityForStep = step === "name" ? "name" : step === "direction" ? "direction" : step === "average" ? "grades" : "context";
  const submitText = (event: FormEvent) => { event.preventDefault(); if (consultantInputQuality(qualityForStep, answer) !== "usable") { setFeedback(step === "direction" ? t.clarifyDirection : t.clarify); return; } const field = textField[step]; if (field) setField(field, answer.trim()); next(); };
  const selectAndAdvance = (field: keyof WarmInterviewDraft, value: string) => { setField(field, value); next(); };
  const submitLocation = (event: FormEvent) => { event.preventDefault(); const location = answer.trim(); if (!location && !locationKind) { setFeedback(t.clarify); return; } setField("destinationPreference", [location, locationKind].filter(Boolean).join(" — ") || t.notSure); next(); };
  const togglePriority = (item: string) => setPriorityChoices((current) => current.includes(item) ? current.filter((value) => value !== item) : current.length === 3 ? current : [...current, item]);
  const submitPriorities = () => { const choices = priorityNote.trim() ? [...priorityChoices, priorityNote.trim()] : priorityChoices; if (!choices.length) { setPriorityChoices([t.noPriority]); setPrimaryPriority(t.noPriority); setDraft((current) => ({ ...current, priorities: buildConsultationPriorities({ primary: t.noPriority, selected: [t.noPriority], motivation: current.motivation }) })); next(); return; } const primary = primaryPriority || choices[0]; setDraft((current) => ({ ...current, priorities: buildConsultationPriorities({ primary, selected: choices, custom: priorityNote, motivation: current.motivation }) })); next(); };
  const question = step !== "unlock" ? t[step].q : t.unlock.q;

  const body = () => {
    if (step === "unlock") return <><p className="mt-5 max-w-lg text-base leading-7 text-white/62">{t.unlock.body}</p><div className="mt-8 border border-white/12 bg-black/20 p-5"><p className="flex items-center gap-2 text-sm font-semibold text-white"><Check className="h-4 w-4" />{language === "ar" ? "حديثك بقي محلياً" : "Your conversation stayed local."}</p><p className="mt-2 text-xs leading-5 text-white/52">{t.unlock.note}</p></div><button type="button" onClick={onUnlock} className="nf-button mt-7 inline-flex w-full items-center justify-center gap-3 border border-white bg-white px-5 py-4 text-xs font-bold text-black hover:bg-[#e9e9e9]"><GoogleMark />{userName ? t.unlock.signedIn : t.unlock.google}<ArrowRight className={`h-4 w-4 ${isArabic ? "rotate-180" : ""}`} /></button></>;
    if (step === "consent") return <><p className="mt-5 max-w-xl text-sm leading-6 text-white/60">{t.consent.body}</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><button type="button" onClick={() => { setDraft((current) => ({ ...current, consent: true })); next(); }} className="nf-button inline-flex items-center justify-center gap-2 border border-white bg-white px-5 py-4 text-xs font-bold text-black"><Check className="h-4 w-4" />{t.consent.agree}</button><button type="button" onClick={() => setFeedback(t.clarify)} className="nf-button border border-white/20 px-5 py-4 text-xs font-semibold text-white/70 hover:border-white">{t.consent.later}</button></div></>;
    if (step === "priorities") return <><p className="mt-4 text-sm text-white/52">{t.chooseUpToThree}</p><div className="mt-6 grid gap-3 sm:grid-cols-2">{t.priorities.choices.map((choice) => <ChoiceCard key={choice} selected={priorityChoices.includes(choice)} onClick={() => { togglePriority(choice); if (!primaryPriority) setPrimaryPriority(choice); }}>{choice}</ChoiceCard>)}</div>{priorityChoices.length > 0 && <div className="mt-7"><p className="nf-label text-[9px] text-white/45">{t.nonNegotiable}</p><div className="mt-3 flex flex-wrap gap-2">{priorityChoices.map((choice) => <button type="button" key={choice} onClick={() => setPrimaryPriority(choice)} className={`nf-button border px-3 py-2 text-xs ${primaryPriority === choice ? "border-white bg-white text-black" : "border-white/20 text-white/70"}`}>{choice}</button>)}</div></div>}<FreeText value={priorityNote} onChange={setPriorityNote} placeholder={t.priorities.hint} multiline /><div className="mt-6 flex flex-wrap items-center gap-4"><button type="button" onClick={submitPriorities} className="nf-button inline-flex items-center gap-2 border border-white bg-white px-5 py-3 text-[10px] font-bold uppercase tracking-[.08em] text-black">{t.savePriorities}<ArrowRight className={`h-4 w-4 ${isArabic ? "rotate-180" : ""}`} /></button><button type="button" onClick={submitPriorities} className="text-xs text-white/50 underline decoration-white/30 underline-offset-4 hover:text-white">{t.noPriority}</button></div></>;
    if (step === "budget") return <div className="mt-8 grid gap-3 sm:grid-cols-2">{t.budget.choices.map((choice, index) => <ChoiceCard key={choice} onClick={() => selectAndAdvance("tuitionBudgetBand", (["low", "medium", "medium", "flexible"] as const)[index])}>{choice}</ChoiceCard>)}<ChoiceCard onClick={() => selectAndAdvance("tuitionBudgetBand", "unsure")}><span className="inline-flex items-center gap-2"><CircleHelp className="h-4 w-4" />{t.notSure}</span></ChoiceCard></div>;
    if (step === "location") return <form onSubmit={submitLocation} className="mt-8"><FreeText value={answer} onChange={setAnswer} placeholder={t.location.hint} inputRef={inputRef} /><div className="mt-6 grid gap-3 sm:grid-cols-3">{t.location.choices.map((choice) => <ChoiceCard key={choice} selected={locationKind === choice} onClick={() => setLocationKind(choice)}>{choice}</ChoiceCard>)}<ChoiceCard selected={locationKind === t.notSure} onClick={() => setLocationKind(t.notSure)}>{t.notSure}</ChoiceCard></div><button className="nf-button mt-7 inline-flex items-center gap-2 border border-white bg-white px-5 py-3 text-[10px] font-bold uppercase tracking-[.08em] text-black">{t.continue}<ArrowRight className={`h-4 w-4 ${isArabic ? "rotate-180" : ""}`} /></button></form>;
    const data = t[step as Exclude<Step, "priorities" | "budget" | "location" | "consent" | "unlock">];
    const choices = "choices" in data ? data.choices : [];
    const field = textField[step];
    const uncertainty = step === "direction" ? t.explore : t.notSure;
    const uncertainValue = step === "direction" ? (isArabic ? EXPLORING_STUDY_DIRECTION_AR : EXPLORING_STUDY_DIRECTION) : uncertainty;
    return <><form onSubmit={submitText} className="mt-8"><FreeText value={answer} onChange={setAnswer} placeholder={data.hint} inputRef={inputRef} multiline={step === "motivation"} /><button className="nf-button mt-6 inline-flex items-center gap-2 border border-white bg-white px-5 py-3 text-[10px] font-bold uppercase tracking-[.08em] text-black">{t.continue}<ArrowRight className={`h-4 w-4 ${isArabic ? "rotate-180" : ""}`} /></button></form>{choices.length > 0 && <><div className="my-6 flex items-center gap-3"><span className="h-px flex-1 bg-white/10" /><span className="nf-label text-[8px] text-white/35">{language === "ar" ? "أو اختر" : "or choose"}</span><span className="h-px flex-1 bg-white/10" /></div><div className="grid gap-3 sm:grid-cols-2">{choices.map((choice) => <ChoiceCard key={choice} onClick={() => field && selectAndAdvance(field, choice)}>{choice}</ChoiceCard>)}<ChoiceCard onClick={() => field && selectAndAdvance(field, uncertainValue)}><span className="inline-flex items-center gap-2"><CircleHelp className="h-4 w-4" />{uncertainty}</span></ChoiceCard></div></>}</>;
  };

  return <AnimatePresence mode="wait" initial={false}><CardShell step={step} onBack={back} canGoBack={stepIndex > 0} language={language}><p className="nf-label text-[10px] tracking-[.16em] text-white/42">{step === "unlock" ? "// PRIVATE UNLOCK" : "// ONE QUESTION AT A TIME"}</p><h2 className="mt-5 max-w-xl text-3xl font-semibold leading-[1.02] tracking-[-.055em] text-white sm:text-4xl">{question}</h2>{body()}{feedback && <p role="alert" className="mt-5 border-l border-white/35 pl-3 text-xs leading-5 text-white/65">{feedback}</p>}</CardShell></AnimatePresence>;
}

export default function ConsultantOnboarding() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const { language, isArabic, setLanguage } = usePublicLanguage();
  const t = copy[language];
  const profile = trpc.student.profile.useQuery(undefined, { enabled: Boolean(user) });
  const complete = trpc.student.completeOnboarding.useMutation();
  const saveFitProfile = trpc.student.saveFitProfile.useMutation();
  const beginConsultation = trpc.student.beginConsultation.useMutation();
  const pending = readPendingConsultantInterview();
  const recoveryRequested = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("recovery") === "1";
  const [recoveryStarted, setRecoveryStarted] = useState(() => !recoveryRequested);
  const [draft, setDraft] = useState<WarmInterviewDraft>(() => ({ ...emptyWarmInterviewDraft, ...(pending?.draft ?? {}) }));
  const [unlockError, setUnlockError] = useState("");
  const localResearchFeedback = readLocalResearchFeedback();
  const localRecovery = readLocalConsultationRecovery();
  const localFeedbackLabels: Record<string, string> = isArabic
    ? { city: "المدينة", cost: "الكلفة", programme: "البرنامج", language: "اللغة", difficulty: "حاسه صعب كتير", other: "شي تاني" }
    : { city: "The city", cost: "The cost", programme: "The programme", language: "The language", difficulty: "It feels too difficult", other: "Something else" };

  useEffect(() => { if (user?.email) setDraft((current) => ({ ...current, contactEmail: current.contactEmail || user.email || "", preferredName: current.preferredName || user.name || "" })); }, [user?.email, user?.name]);

  const unlock = async () => {
    setUnlockError("");
    storePendingConsultantInterview(draft, language);
    if (!user) { window.location.assign("/api/auth/google"); return; }
    const preferredName = draft.preferredName.trim() || user.name?.trim() || "";
    if (preferredName.length < 2) { setUnlockError(language === "ar" ? "قبل الفتح، قلّنا شو بتحب نناديك." : "Before unlocking, tell us what you would like to be called."); return; }
    try {
      await complete.mutateAsync({ preferredName, contactEmail: user.email || draft.contactEmail.trim(), phoneNumber: "", destination: draft.destinationPreference.trim() || (isArabic ? "مفتوح لوجهات دراسية" : "Open to study destinations"), graduationYear: isArabic ? "لم يحدده بعد" : "Not yet specified", highSchoolDiplomaOrigin: draft.highSchoolDiplomaOrigin.trim(), preferredLanguage: language });
      await saveFitProfile.mutateAsync(fitProfileFromInterview({ ...draft, preferredName, consent: true }));
      await beginConsultation.mutateAsync();
      clearPendingConsultantInterview();
      clearLocalConsultationRecovery();
      setLocation(`/dashboard?tab=discover&mode=recommendations&lang=${language}`);
    } catch (error) { setUnlockError(error instanceof Error ? error.message : "Nightfall could not open your private research set right now."); }
  };

  if (loading || (user && profile.isLoading)) return <div className="nf-shell grid min-h-screen place-items-center text-white"><span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" /></div>;
  return <div dir={isArabic ? "rtl" : "ltr"} className="night-bloom min-h-screen text-[#f5f5f5]"><header className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div className="flex items-center gap-3"><Mark /><span><span className="block text-sm font-semibold tracking-[.16em]">NIGHTFALL</span><span className="nf-label mt-1 block text-[8px] text-white/45">{user ? "PRIVATE CONSULTATION" : "LOCAL-ONLY CONSULTATION"}</span></span></div><LanguageToggle language={language} onToggle={() => setLanguage(isArabic ? "en" : "ar")} /></header><main className={recoveryRequested && !recoveryStarted ? "mx-auto max-w-[1180px] px-5 py-12 sm:py-20 lg:px-10" : "mx-auto grid max-w-[1180px] gap-10 px-5 py-10 lg:min-h-[calc(100vh-73px)] lg:grid-cols-[.72fr_1.28fr] lg:items-center lg:px-10"}>{recoveryRequested && !recoveryStarted ? <ChangeDirectionHandoff language={language} onBack={() => setLocation(`/dashboard?lang=${language}`)} onContinue={({ note, direction }) => { writeLocalConsultationRecovery({ note, direction }); setDraft((current) => ({ ...current, studyDirection: direction || current.studyDirection })); setRecoveryStarted(true); }} /> : <><section className="lg:pr-8"><p className="nf-eyebrow text-[#bdbdbd]">// {t.eyebrow}</p><h1 className="mt-5 max-w-md text-5xl font-semibold leading-[.9] tracking-[-.075em] sm:text-6xl">{t.hero}</h1><p className="mt-6 max-w-md text-base leading-7 text-white/58">{t.note}</p><div className="mt-9 border-l border-white/25 pl-4 text-xs leading-5 text-white/60"><LockKeyhole className="mb-2 h-4 w-4" />{t.local}</div>{localRecovery?.note && <div className="mt-7 border-y border-white/15 py-5"><p className="nf-label text-[8px] text-white/42">// {isArabic ? "شو تغيّر" : "WHAT CHANGED"}</p><p className="mt-3 text-sm leading-6 text-white/75">{localRecovery.note}</p><p className="mt-3 text-xs leading-5 text-white/48">{isArabic ? "هاي ملاحظة محلية للمحادثة. ما غيّرت ملفك أو خياراتك المحفوظة." : "This is a local conversation note. It has not changed your saved profile or options."}</p></div>}{localResearchFeedback.length > 0 && <div className="mt-7 border-y border-white/15 py-5"><p className="nf-label text-[8px] text-white/42">// {t.feedbackKicker}</p><p className="mt-3 text-sm leading-6 text-white/75">{t.feedbackLead}</p><p className="mt-2 text-sm text-white">{localResearchFeedback.map((value) => localFeedbackLabels[value] || value).join(" · ")}</p><p className="mt-3 text-xs leading-5 text-white/48">{t.feedbackNote}</p></div>}</section><div><ConsultantCards draft={draft} setDraft={setDraft} language={language} userName={user?.name} onUnlock={() => void unlock()} resumeAtUnlock={Boolean(user && pending)} startAtDirection={recoveryRequested} />{unlockError && <p role="alert" className="mt-4 border-l border-white/35 pl-3 text-xs leading-5 text-white/65">{unlockError}</p>}</div></>}</main></div>;
}
