import { documentRequirementKeys, documentRequirementLabel, type DocumentRequirementKey } from "@shared/documentRequirements";
import { ArrowLeft, ArrowRight, FileText, Link2, LockKeyhole, Plus, ShieldCheck, Unlink } from "lucide-react";
import { ChangeEvent, useState } from "react";

export type PrivateJourneyDocument = {
  id: number;
  documentType: string;
  fileName: string;
  mimeType: string;
  extractionStatus: string;
  createdAt: Date;
};

export type SavedProgrammeForDocuments = {
  programmeId: string;
  programmeName: string;
  officialName: string;
  city: string;
};

export type DocumentRequirementLink = {
  id: number;
  documentId: number;
  programmeId: string;
  requirementKey: string;
  createdAt: Date;
};

const copy = {
  en: {
    back: "Back to my Journey",
    kicker: "NIGHTFALL / DOCUMENTS",
    title: "Keep the papers in their place.",
    body: "A private file is not treated as a requirement until you choose to place it beside a specific official requirement. A link records your review; it does not prove a document is accepted or complete.",
    private: "Private to your journey",
    emptyTitle: "No private documents yet.",
    emptyBody: "You can review programme requirements first. Uploads remain unavailable until private document storage is configured.",
    upload: "Upload a transcript",
    unavailable: "Private uploads are not configured yet. Existing files remain private and reviewable here.",
    uploaded: "Uploaded",
    extractionComplete: "Reviewable extraction available",
    extracting: "Extraction in progress",
    review: "Needs your review",
    unopened: "Not reviewed yet",
    linked: "Linked by you for review",
    notLinked: "Not linked to a programme requirement",
    link: "Place beside a requirement",
    close: "Close requirements",
    pick: "Choose a saved programme and official requirement. This does not change the file, submit anything, or decide whether the requirement is met.",
    noProgrammes: "Save a Germany programme before creating a private requirement link.",
    linkedHere: "Linked by you",
    remove: "Remove link",
    unknownProgramme: "Saved programme no longer available",
    noClaim: "Nightfall does not verify, submit, or send this document for you.",
  },
  ar: {
    back: "ارجع لرحلتي",
    kicker: "نايتفول / الأوراق",
    title: "خلّي كل ورقة بمكانها.",
    body: "الملف الخاص ما بينحسب كمتطلّب قبل ما تختار إنت تحطّه جنب متطلب رسمي محدد. الربط بس بيسجّل مراجعتك؛ ما بيثبت إن الورقة مقبولة أو كاملة.",
    private: "خاص برحلتك",
    emptyTitle: "ما في أوراق خاصة لسه.",
    emptyBody: "فيك تراجع متطلبات البرنامج بالأول. الرفع بعده غير متاح لحد ما تتجهّز مساحة التخزين الخاصة.",
    upload: "ارفع كشف علامات",
    unavailable: "الرفع الخاص مش مهيّأ لسه. الملفات الموجودة بتضل خاصة وقابلة للمراجعة هون.",
    uploaded: "تم الرفع",
    extractionComplete: "استخراج قابل للمراجعة جاهز",
    extracting: "الاستخراج قيد المعالجة",
    review: "بدها مراجعتك",
    unopened: "لسه ما انراجعت",
    linked: "إنت ربطتها للمراجعة",
    notLinked: "مش مربوطة بمتطلب برنامج",
    link: "حطّها جنب متطلب",
    close: "سكّر المتطلبات",
    pick: "اختار برنامج محفوظ ومتطلب رسمي. هالشي ما بغيّر الملف، ما بقدّم شي، وما بقرّر إذا المتطلب متلبّى.",
    noProgrammes: "احفظ برنامج ألماني قبل ما تعمل رابط متطلب خاص.",
    linkedHere: "إنت ربطتها",
    remove: "شيل الرابط",
    unknownProgramme: "البرنامج المحفوظ مش متاح هلق",
    noClaim: "نايتفول ما بتتحقق من هالورقة، ما بتقدّمها، وما بتبعتها عنك.",
  },
} as const;

function documentStatus(document: PrivateJourneyDocument, language: "en" | "ar") {
  const t = copy[language];
  if (document.extractionStatus === "complete") return t.extractionComplete;
  if (document.extractionStatus === "processing") return t.extracting;
  if (document.extractionStatus === "needs_review") return t.review;
  return t.unopened;
}

function dateText(value: Date, language: "en" | "ar") {
  return new Intl.DateTimeFormat(language === "ar" ? "ar" : "en", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function requirementLinkLabel(key: string, language: "en" | "ar") {
  return documentRequirementKeys.includes(key as DocumentRequirementKey) ? documentRequirementLabel(key as DocumentRequirementKey, language) : language === "ar" ? "متطلب رسمي" : "Official requirement";
}

export function DocumentsWorkspace({
  language,
  documents,
  programmes,
  links,
  storageConfigured,
  isLinking,
  isRemoving,
  onBack,
  onOpenProgramme,
  onLink,
  onRemoveLink,
  onUploadTranscript,
}: {
  language: "en" | "ar";
  documents: PrivateJourneyDocument[];
  programmes: SavedProgrammeForDocuments[];
  links: DocumentRequirementLink[];
  storageConfigured: boolean;
  isLinking: boolean;
  isRemoving: boolean;
  onBack: () => void;
  onOpenProgramme: (programmeId: string) => void;
  onLink: (input: { documentId: number; programmeId: string; requirementKey: DocumentRequirementKey }) => void;
  onRemoveLink: (linkId: number) => void;
  onUploadTranscript: (file: File) => void;
}) {
  const t = copy[language];
  const isArabic = language === "ar";
  const [expandedDocumentId, setExpandedDocumentId] = useState<number | null>(null);
  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onUploadTranscript(file);
    event.target.value = "";
  };

  return <section className="pb-14" aria-labelledby="documents-workspace-heading">
    <button type="button" onClick={onBack} className="nf-button inline-flex items-center gap-2 text-xs text-white/60 hover:text-white"><ArrowLeft className={`h-3.5 w-3.5 ${isArabic ? "rotate-180" : ""}`} />{t.back}</button>
    <header className="mt-8 border-b border-white/15 pb-9"><p className="nf-label text-[9px] text-white/45">// {t.kicker}</p><div className="mt-6 grid gap-7 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end"><div><h1 id="documents-workspace-heading" className="max-w-4xl text-5xl font-semibold leading-[.86] tracking-[-.075em] sm:text-7xl">{t.title}</h1><p className="mt-5 max-w-2xl text-sm leading-6 text-white/60">{t.body}</p></div><div className="border-l border-white/25 pl-5"><p className="nf-label text-[8px] text-white/45">{t.private}</p><p className="mt-3 flex items-center gap-2 text-sm text-white/72"><LockKeyhole className="h-4 w-4" />{documents.length} {language === "ar" ? "ملف" : "files"}</p></div></div></header>

    <section className="mt-9 border-y border-white/35 bg-white/[.025] px-5 py-6 sm:px-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="nf-label text-[9px] text-white/45">// {t.private}</p><p className="mt-3 max-w-2xl text-sm leading-6 text-white/62">{storageConfigured ? t.noClaim : t.unavailable}</p></div>{storageConfigured && <label className="nf-button inline-flex cursor-pointer items-center justify-center gap-2 border border-white/30 px-4 py-3 text-[10px] font-bold uppercase tracking-[.08em] text-white hover:bg-white hover:text-black"><Plus className="h-3.5 w-3.5" />{t.upload}<input className="sr-only" type="file" accept="application/pdf,image/jpeg,image/png" onChange={onFile} /></label>}</div></section>

    {!documents.length ? <section className="mt-10 border-y border-white/15 py-10"><FileText className="h-5 w-5 text-white/55" /><h2 className="mt-5 text-2xl font-semibold tracking-[-.05em]">{t.emptyTitle}</h2><p className="mt-3 max-w-xl text-sm leading-6 text-white/55">{t.emptyBody}</p></section> : <section className="mt-10 divide-y divide-white/12 border-y border-white/15">{documents.map((document) => {
      const documentLinks = links.filter((link) => link.documentId === document.id);
      const expanded = expandedDocumentId === document.id;
      return <article key={document.id} className="py-6"><div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]"><div className="flex items-start gap-3"><FileText className="mt-1 h-4 w-4 shrink-0 text-white/75" /><div><p className="nf-label text-[8px] text-white/42">{document.documentType} / {dateText(document.createdAt, language)}</p><h2 className="mt-2 break-words text-lg font-semibold tracking-[-.04em]">{document.fileName}</h2><p className="mt-2 text-xs leading-5 text-white/58">{documentStatus(document, language)}</p></div></div><div className="lg:text-right"><p className="nf-label text-[8px] text-white/42">{documentLinks.length ? t.linked : t.notLinked}</p><button type="button" onClick={() => setExpandedDocumentId(expanded ? null : document.id)} className="nf-button mt-3 inline-flex items-center gap-2 text-xs font-semibold text-white underline underline-offset-4"><Link2 className="h-3.5 w-3.5" />{expanded ? t.close : t.link}</button></div></div>
        {documentLinks.length > 0 && <div className="mt-5 divide-y divide-white/10 border-y border-white/12">{documentLinks.map((link) => { const programme = programmes.find((item) => item.programmeId === link.programmeId); return <div key={link.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold text-white/82">{programme ? `${programme.officialName} / ${programme.programmeName}` : t.unknownProgramme}</p><p className="mt-1 text-xs text-white/52">{requirementLinkLabel(link.requirementKey, language)} · {t.linkedHere}</p></div><div className="flex items-center gap-3"><button type="button" onClick={() => programme && onOpenProgramme(programme.programmeId)} disabled={!programme} className="nf-button text-[10px] text-white/62 underline underline-offset-4 hover:text-white disabled:no-underline disabled:opacity-35">{programme ? programme.city : "—"}</button><button type="button" onClick={() => onRemoveLink(link.id)} disabled={isRemoving} className="nf-button inline-flex items-center gap-1 text-[10px] text-white/62 underline underline-offset-4 hover:text-white disabled:opacity-45"><Unlink className="h-3 w-3" />{t.remove}</button></div></div>; })}</div>}
        {expanded && <div className="mt-6 border-t border-white/12 pt-5"><p className="max-w-3xl text-sm leading-6 text-white/62">{t.pick}</p>{programmes.length ? <div className="mt-5 space-y-5">{programmes.map((programme) => <section key={programme.programmeId} className="border border-white/12 p-4"><p className="text-sm font-semibold">{programme.officialName} / {programme.programmeName}</p><p className="mt-1 text-xs text-white/48">{programme.city}</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{documentRequirementKeys.map((key) => { const linked = documentLinks.some((link) => link.programmeId === programme.programmeId && link.requirementKey === key); return <button key={key} type="button" disabled={linked || isLinking} onClick={() => onLink({ documentId: document.id, programmeId: programme.programmeId, requirementKey: key })} className="nf-button border border-white/18 px-3 py-3 text-left text-xs text-white/76 hover:border-white/55 hover:bg-white/[.05] disabled:cursor-default disabled:border-white/10 disabled:text-white/38"><span className="block font-semibold">{documentRequirementLabel(key, language)}</span><span className="mt-1 block text-[10px] text-white/48">{linked ? t.linkedHere : t.link}</span></button>; })}</div></section>)}</div> : <p className="mt-5 border-y border-white/12 py-4 text-sm leading-6 text-white/55">{t.noProgrammes}</p>}</div>}
      </article>;
    })}</section>}
    <p className="mt-8 flex items-start gap-2 text-xs leading-5 text-white/45"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />{t.noClaim}</p>
  </section>;
}
