import { useAuth } from "@/_core/hooks/useAuth";
import { JourneyHome } from "@/components/JourneyHome";
import { DecisionRoom, type DecisionRoomMatch } from "@/components/DecisionRoom";
import { ProgrammePreparationDetail, type ProgrammePreparationDetailData } from "@/components/ProgrammePreparationDetail";
import { DocumentsWorkspace } from "@/components/DocumentsWorkspace";
import { EssayStudio } from "@/components/EssayStudio";
import { ConsultingChat } from "@/components/ConsultingChat";
import { LanguageToggle, usePublicLanguage } from "@/components/LanguageToggle";
import { resolveJourneyDestination, resolveJourneyHome, type JourneyAction, type JourneyDestination } from "@/lib/journeyStage";
import { journeyTabFromSearch } from "@/lib/journeyTabs";
import { trpc } from "@/lib/trpc";
import JourneyToolsLegacy from "@/pages/JourneyToolsLegacy";
import { ChevronDown, Heart, Loader2, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";

const labels = {
  en: { tools: "JOURNEY AREAS", close: "Close", fallback: "Nightfall brought you to the step that makes this useful first.", tab: { consult: "Research Agent", discover: "Source research", essays: "Essay studio", compare: "Compare", reach: "Outreach", calendar: "Dates that matter", watch: "Nightfall watch", documents: "Documents" } },
  ar: { tools: "مساحات الرحلة", close: "إغلاق", fallback: "نايتفول رجّعتك للخطوة اللي بتخلي هالأداة مفيدة بالأول.", tab: { consult: "وكيل البحث", discover: "بحث بالمصادر", essays: "استديو المقال", compare: "قارن", reach: "تواصل", calendar: "المواعيد المهمة", watch: "مراقبة نايتفول", documents: "الأوراق" } },
} as const;

function dashboardLocation(destination: JourneyDestination) {
  const params = new URLSearchParams(window.location.search);
  params.delete("programme");
  if (destination === "home") params.delete("tab");
  else params.set("tab", destination);
  const search = params.toString();
  return `/dashboard${search ? `?${search}` : ""}`;
}

export default function JourneyTools() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const { language, isArabic, setLanguage } = usePublicLanguage();
  const t = labels[language];
  const [toolsOpen, setToolsOpen] = useState(false);
  const [researchMessages, setResearchMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [researchError, setResearchError] = useState("");

  const profile = trpc.student.profile.useQuery(undefined, { enabled: !!user });
  const fitProfile = trpc.student.fitProfile.useQuery(undefined, { enabled: !!user });
  const consultationCycle = trpc.student.consultationCycle.useQuery(undefined, { enabled: !!user });
  const savedGermanyProgrammes = trpc.student.savedGermanyProgrammes.useQuery(undefined, { enabled: !!user });
  const universities = trpc.student.universities.useQuery(undefined, { enabled: !!user });
  const documents = trpc.student.documents.useQuery(undefined, { enabled: !!user });
  const documentStorageAvailability = trpc.student.documentStorageAvailability.useQuery(undefined, { enabled: !!user });
  const documentRequirementLinks = trpc.student.documentRequirementLinks.useQuery(undefined, { enabled: !!user });
  const deadlineHandoffs = trpc.student.germanyProgrammeDeadlineHandoffs.useQuery(undefined, { enabled: !!user });
  const relationship = trpc.student.universityRelationshipWorkspace.useQuery(undefined, { enabled: !!user });
  const germanyProgrammeMatches = trpc.student.germanyProgrammeMatches.useQuery(undefined, { enabled: !!user });
  const requirementWatches = trpc.student.universityRequirementWatches.useQuery(undefined, { enabled: !!user });
  const requirementAlerts = trpc.student.universityRequirementAlerts.useQuery(undefined, { enabled: !!user });
  const applicationEvents = trpc.student.applicationEvents.useQuery({ limit: 120 }, { enabled: !!user });
  const llmAvailability = trpc.student.llmAvailability.useQuery(undefined, { enabled: !!user });
  const utils = trpc.useUtils();
  const saveGermanyProgramme = trpc.student.saveGermanyProgramme.useMutation({ onSuccess: () => void utils.student.savedGermanyProgrammes.invalidate() });
  const startGermanyProgrammePreparation = trpc.student.startGermanyProgrammePreparation.useMutation({ onSuccess: () => void utils.student.applicationEvents.invalidate() });
  const confirmDocumentRequirementLink = trpc.student.confirmDocumentRequirementLink.useMutation({ onSuccess: () => { void utils.student.documentRequirementLinks.invalidate(); } });
  const removeDocumentRequirementLink = trpc.student.removeDocumentRequirementLink.useMutation({ onSuccess: () => { void utils.student.documentRequirementLinks.invalidate(); } });
  const uploadTranscript = trpc.student.uploadTranscript.useMutation({ onSuccess: () => { void utils.student.documents.invalidate(); } });
  const generateEssayDraft = trpc.student.generateEssayDraft.useMutation();
  const consult = trpc.student.consult.useMutation({
    onSuccess: (response) => setResearchMessages((messages) => [...messages, { role: "assistant", content: response.content }]),
    onError: (error) => setResearchError(error.message),
  });

  useEffect(() => {
    if (!loading && !user) setLocation(`/login?lang=${language}`);
    if (!loading && user && !profile.isLoading && !profile.data?.onboardingComplete) setLocation(`/student-onboarding?lang=${language}`);
  }, [language, loading, profile.data, profile.isLoading, setLocation, user]);

  const journeyContext = useMemo(() => {
    const programmes = savedGermanyProgrammes.data ?? [];
    const contacts = relationship.data?.contacts ?? [];
    const communications = relationship.data?.communications ?? [];
    const followUps = relationship.data?.followUpPlans ?? [];
    const fallbackUniversityCount = (universities.data ?? []).length;
    return {
      hasMatchingContext: Boolean(fitProfile.data?.matchingConsentAt && fitProfile.data.studyDirection.trim()),
      savedProgrammeCount: programmes.length || fallbackUniversityCount,
      priorityProgrammeCount: programmes.filter((programme) => programme.isPinned || (programme.priorityRank !== null && programme.priorityRank !== undefined)).length,
      confirmedDeadlineCount: (deadlineHandoffs.data ?? []).length,
      documentCount: (documents.data ?? []).length,
      confirmedContactCount: contacts.filter((contact) => Boolean(contact.studentConfirmedAt)).length,
      unreadReplyCount: communications.filter((communication) => communication.direction === "inbound" && communication.status === "needs_review").length,
      draftCount: communications.filter((communication) => communication.direction === "outbound" && ["draft", "ready_for_review", "student_approved"].includes(communication.status)).length,
      dueFollowUpCount: followUps.filter((plan) => plan.status === "draft_ready").length,
      activeWatchCount: (requirementWatches.data ?? []).filter((watch) => watch.enabled).length,
      remainingConsultations: consultationCycle.data?.remainingUses ?? 0,
    };
  }, [consultationCycle.data, deadlineHandoffs.data, documents.data, fitProfile.data, relationship.data, requirementWatches.data, savedGermanyProgrammes.data, universities.data]);

  const state = useMemo(() => resolveJourneyHome(journeyContext), [journeyContext]);
  const search = typeof window === "undefined" ? "" : window.location.search;
  const requestedTab = journeyTabFromSearch(search);
  const hasRequestedTool = new URLSearchParams(search).has("tab");
  const requestedDestination: { destination: JourneyDestination; fallback?: JourneyAction } = hasRequestedTool ? resolveJourneyDestination(journeyContext, requestedTab) : { destination: "home" };
  const discoveryMode = new URLSearchParams(search).get("mode");
  const showDecisionRoom = requestedDestination.destination === "discover" && !requestedDestination.fallback && discoveryMode !== "explore";
  const journeyDataLoading = fitProfile.isLoading || savedGermanyProgrammes.isLoading || universities.isLoading || documents.isLoading || documentStorageAvailability.isLoading || documentRequirementLinks.isLoading || deadlineHandoffs.isLoading || relationship.isLoading || consultationCycle.isLoading || requirementWatches.isLoading || requirementAlerts.isLoading || applicationEvents.isLoading || llmAvailability.isLoading;

  useEffect(() => {
    if (!journeyDataLoading && requestedDestination.fallback) setLocation(dashboardLocation(requestedDestination.destination));
  }, [journeyDataLoading, requestedDestination.destination, requestedDestination.fallback, setLocation]);

  const go = (destination: JourneyDestination) => {
    setToolsOpen(false);
    setLocation(dashboardLocation(destination));
  };
  const openProgramme = (programmeId: string) => {
    setToolsOpen(false);
    const params = new URLSearchParams(window.location.search);
    params.delete("tab");
    params.delete("mode");
    params.set("programme", programmeId);
    setLocation(`/dashboard?${params.toString()}`);
  };
  const onAction = (action: JourneyAction) => {
    if (action.reason === "compare_options" && (savedGermanyProgrammes.data ?? []).length >= 2) {
      const params = new URLSearchParams(window.location.search);
      params.set("tab", "discover");
      params.set("mode", "explore");
      params.set("compare", "all");
      setLocation(`/dashboard?${params.toString()}`);
      return;
    }
    go(action.destination);
  };
  const programmes = useMemo(() => {
    const germany = (savedGermanyProgrammes.data ?? []).map((programme) => ({ id: programme.programmeId, programme: programme.programmeName, university: programme.officialName, city: programme.city, isPriority: Boolean(programme.isPinned || programme.priorityRank !== null), sourceUrl: programme.officialProgrammeUrl ?? programme.programmeEvidenceUrl, canOpenPreparationDetail: true }));
    if (germany.length) return germany;
    return (universities.data ?? []).map((university) => ({ id: String(university.id), programme: university.program, university: university.university, city: university.location, isPriority: false, sourceUrl: null, canOpenPreparationDetail: false }));
  }, [savedGermanyProgrammes.data, universities.data]);
  const attentionItems = useMemo(() => {
    const communications = relationship.data?.communications ?? [];
    const followUps = relationship.data?.followUpPlans ?? [];
    const messages = communications.filter((communication) => communication.direction === "inbound" && communication.status === "needs_review").map((communication) => ({ id: `reply-${communication.id}`, kind: "reply" as const, title: language === "ar" ? "وصل رد من جامعة" : "A university reply is ready to review", detail: communication.subject }));
    const drafts = communications.filter((communication) => communication.direction === "outbound" && ["ready_for_review", "student_approved"].includes(communication.status)).map((communication) => ({ id: `draft-${communication.id}`, kind: "draft" as const, title: language === "ar" ? "مسودة بانتظارك" : "A draft is waiting", detail: communication.subject }));
    const due = followUps.filter((plan) => plan.status === "draft_ready").map((plan) => ({ id: `follow-up-${plan.id}`, kind: "follow_up" as const, title: language === "ar" ? "متابعة جاهزة للمراجعة" : "A follow-up is ready for review", detail: plan.university }));
    const dates = (deadlineHandoffs.data ?? []).slice(0, 2).map((handoff) => ({ id: `deadline-${handoff.programmeId}`, kind: "deadline" as const, title: language === "ar" ? "موعد محفوظ" : "A saved programme date", detail: handoff.programmeName }));
    const watches = (requirementAlerts.data ?? []).filter((alert) => !alert.read).map((alert) => ({ id: `watch-${alert.id}`, kind: "watch" as const, title: alert.title, detail: alert.body }));
    return [...watches, ...messages, ...drafts, ...due, ...dates];
  }, [deadlineHandoffs.data, language, relationship.data, requirementAlerts.data]);
  const openExploration = () => {
    const params = new URLSearchParams(window.location.search);
    params.set("tab", "discover");
    params.set("mode", "explore");
    setLocation(`/dashboard?${params.toString()}`);
  };
  const openRecovery = () => setLocation(`/onboarding?recovery=1&lang=${language}`);
  const decisionMatches = (germanyProgrammeMatches.data?.decisionRoom?.matches ?? []) as DecisionRoomMatch[];
  const preparingProgrammeIds = useMemo(() => new Set((applicationEvents.data ?? []).filter((event) => event.eventType === "application_preparation_started" && event.programmeId).map((event) => event.programmeId as string)), [applicationEvents.data]);
  const requestedProgrammeId = new URLSearchParams(search).get("programme");
  const selectedProgramme = (savedGermanyProgrammes.data ?? []).find((programme) => programme.programmeId === requestedProgrammeId);
  const programmeDetail: ProgrammePreparationDetailData | null = selectedProgramme ? {
    programmeId: selectedProgramme.programmeId,
    programmeName: selectedProgramme.programmeName,
    officialName: selectedProgramme.officialName,
    city: selectedProgramme.city,
    programmeLanguage: selectedProgramme.programmeLanguage,
    admissionSemester: selectedProgramme.admissionSemester,
    admissionMode: selectedProgramme.admissionMode,
    qualificationNote: selectedProgramme.syrianBaccalaureateAnabinCondition,
    studentLanguageContext: fitProfile.data?.languageComfort ?? null,
    sourceUrl: selectedProgramme.officialProgrammeUrl ?? selectedProgramme.programmeEvidenceUrl,
    isPreparationStarted: preparingProgrammeIds.has(selectedProgramme.programmeId),
  } : null;
  const programmeDeadline = selectedProgramme ? (deadlineHandoffs.data ?? []).find((handoff) => handoff.programmeId === selectedProgramme.programmeId) : undefined;
  const programmeActivity = selectedProgramme ? (applicationEvents.data ?? []).filter((event) => event.programmeId === selectedProgramme.programmeId) : [];

  if (loading || profile.isLoading || journeyDataLoading || !user || !profile.data?.onboardingComplete) return <div className="nf-shell grid min-h-screen place-items-center text-white"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const uploadPrivateTranscript = (file: File) => {
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type) || file.size > 10 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => uploadTranscript.mutate({ fileName: file.name, mimeType: file.type as "application/pdf" | "image/jpeg" | "image/png", dataBase64: String(reader.result).split(",")[1] ?? "" });
    reader.readAsDataURL(file);
  };

  if (programmeDetail) return <div dir={isArabic ? "rtl" : "ltr"} className="night-bloom min-h-screen overflow-x-hidden text-white"><header className="sticky top-0 z-30 border-b border-white/10 bg-[#0d0d0d]/92 px-5 py-4 backdrop-blur-xl sm:px-8"><div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4"><button onClick={() => go("home")} className="flex items-center gap-3 text-left"><span className="grid h-9 w-9 place-items-center border border-white/65"><Heart className="h-3.5 w-3.5 fill-white text-white" /></span><span><span className="block text-sm font-semibold tracking-[.16em]">NIGHTFALL</span><span className="nf-label mt-1 block text-[8px] text-[#959595]">{language === "ar" ? "رحلتي" : "MY JOURNEY"}</span></span></button><LanguageToggle language={language} onChange={setLanguage} /></div></header><main className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8 sm:py-10 lg:px-12"><ProgrammePreparationDetail language={language} programme={programmeDetail} documents={documents.data ?? []} documentLinks={documentRequirementLinks.data ?? []} deadline={programmeDeadline} activity={programmeActivity} onBack={() => go("home")} onStartPreparation={() => startGermanyProgrammePreparation.mutate({ programmeId: programmeDetail.programmeId })} onOpenDocuments={() => go("documents")} onOpenConsultant={() => setLocation(`/dashboard?tab=consult&context=${encodeURIComponent(programmeDetail.programmeId)}`)} /></main></div>;

  if (requestedDestination.destination === "documents" && !requestedDestination.fallback) return <div dir={isArabic ? "rtl" : "ltr"} className="night-bloom min-h-screen overflow-x-hidden text-white"><header className="sticky top-0 z-30 border-b border-white/10 bg-[#0d0d0d]/92 px-5 py-4 backdrop-blur-xl sm:px-8"><div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4"><button onClick={() => go("home")} className="flex items-center gap-3 text-left"><span className="grid h-9 w-9 place-items-center border border-white/65"><Heart className="h-3.5 w-3.5 fill-white text-white" /></span><span><span className="block text-sm font-semibold tracking-[.16em]">NIGHTFALL</span><span className="nf-label mt-1 block text-[8px] text-[#959595]">{language === "ar" ? "رحلتي" : "MY JOURNEY"}</span></span></button><LanguageToggle language={language} onChange={setLanguage} /></div></header><main className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8 sm:py-10 lg:px-12"><DocumentsWorkspace language={language} documents={documents.data ?? []} programmes={(savedGermanyProgrammes.data ?? []).map((programme) => ({ programmeId: programme.programmeId, programmeName: programme.programmeName, officialName: programme.officialName, city: programme.city }))} links={documentRequirementLinks.data ?? []} storageConfigured={Boolean(documentStorageAvailability.data?.configured)} isLinking={confirmDocumentRequirementLink.isPending} isRemoving={removeDocumentRequirementLink.isPending} onBack={() => go("home")} onOpenProgramme={openProgramme} onLink={(input) => confirmDocumentRequirementLink.mutate(input)} onRemoveLink={(linkId) => removeDocumentRequirementLink.mutate({ linkId })} onUploadTranscript={uploadPrivateTranscript} /></main></div>;

  if (requestedDestination.destination === "essays" && !requestedDestination.fallback) return <div dir={isArabic ? "rtl" : "ltr"} className="night-bloom min-h-screen overflow-x-hidden text-white"><header className="sticky top-0 z-30 border-b border-white/10 bg-[#0d0d0d]/92 px-5 py-4 backdrop-blur-xl sm:px-8"><div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4"><button onClick={() => go("home")} className="flex items-center gap-3 text-left"><span className="grid h-9 w-9 place-items-center border border-white/65"><Heart className="h-3.5 w-3.5 fill-white text-white" /></span><span><span className="block text-sm font-semibold tracking-[.16em]">NIGHTFALL</span><span className="nf-label mt-1 block text-[8px] text-[#959595]">{language === "ar" ? "رحلتي" : "MY JOURNEY"}</span></span></button><LanguageToggle language={language} onChange={setLanguage} /></div></header><main className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8 sm:py-10 lg:px-12"><EssayStudio language={language} available={Boolean(llmAvailability.data?.available)} isGenerating={generateEssayDraft.isPending} onGenerate={(input) => generateEssayDraft.mutateAsync({ language, ...input })} /></main></div>;

  if (requestedDestination.destination === "consult" && !requestedDestination.fallback && !new URLSearchParams(search).get("context")) return <div dir={isArabic ? "rtl" : "ltr"} className="night-bloom min-h-screen overflow-x-hidden text-white"><header className="sticky top-0 z-30 border-b border-white/10 bg-[#0d0d0d]/92 px-5 py-4 backdrop-blur-xl sm:px-8"><div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4"><button onClick={() => go("home")} className="flex items-center gap-3 text-left"><span className="grid h-9 w-9 place-items-center border border-white/65"><Heart className="h-3.5 w-3.5 fill-white text-white" /></span><span><span className="block text-sm font-semibold tracking-[.16em]">NIGHTFALL</span><span className="nf-label mt-1 block text-[8px] text-[#959595]">{language === "ar" ? "رحلتي" : "MY JOURNEY"}</span></span></button><LanguageToggle language={language} onChange={setLanguage} /></div></header><main className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8 sm:py-10 lg:px-12"><ConsultingChat language={language} messages={researchMessages} isLoading={consult.isPending} available={Boolean(llmAvailability.data?.available)} error={researchError} onSend={(content) => { const next = [...researchMessages, { role: "user" as const, content }]; setResearchError(""); setResearchMessages(next); consult.mutate({ language, messages: next }); }} /></main></div>;

  if (requestedDestination.destination !== "home" && !requestedDestination.fallback && !showDecisionRoom) return <JourneyToolsLegacy />;

  const name = user.name?.split(" ")[0] ?? (language === "ar" ? "صديقي" : "there");
  // Research remains reachable independent of a profile-refresh allowance. The
  // student controls a separate Consultation update when their underlying facts
  // change, but can ask the Agent about any field at any time.
  const toolEntries = state.enabledTools;
  return <div dir={isArabic ? "rtl" : "ltr"} className="night-bloom min-h-screen overflow-x-hidden text-white">
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0d0d0d]/92 px-5 py-4 backdrop-blur-xl sm:px-8"><div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4"><button onClick={() => go("home")} className="flex items-center gap-3 text-left"><span className="grid h-9 w-9 place-items-center border border-white/65"><Heart className="h-3.5 w-3.5 fill-white text-white" /></span><span><span className="block text-sm font-semibold tracking-[.16em]">NIGHTFALL</span><span className="nf-label mt-1 block text-[8px] text-[#959595]">{language === "ar" ? "رحلتي" : "MY JOURNEY"}</span></span></button><div className="flex items-center gap-2"><div className="relative"><button type="button" onClick={() => setToolsOpen((open) => !open)} aria-expanded={toolsOpen} className="nf-button inline-flex items-center gap-2 border border-white/15 px-3 py-2 text-[10px] font-semibold tracking-[.07em] text-[#dbdbdb] hover:border-white/45"><Wrench className="h-3.5 w-3.5" />{t.tools}<ChevronDown className={`h-3 w-3 transition-transform ${toolsOpen ? "rotate-180" : ""}`} /></button>{toolsOpen && <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 border border-white/20 bg-[#171717] p-1.5 shadow-[0_22px_60px_rgba(0, 0, 0,.48)]"><p className="px-2.5 pb-1.5 pt-1 nf-label text-[8px] text-white/42">{t.tools}</p>{toolEntries.map((tab) => <button key={tab} type="button" onClick={() => { if (tab === "discover") openExploration(); else if (tab === "compare") onAction({ destination: "compare", reason: "compare_options" }); else go(tab); }} className="block w-full px-2.5 py-2.5 text-left text-[11px] font-semibold text-white/70 transition-colors hover:bg-white/[.07] hover:text-white">{t.tab[tab]}</button>)}{!toolEntries.length && <p className="px-2.5 py-3 text-xs leading-5 text-white/45">{t.fallback}</p>}</div>}</div><LanguageToggle language={language} onChange={setLanguage} /></div></div></header>
    <main className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8 sm:py-10 lg:px-12">{showDecisionRoom ? <DecisionRoom language={language} matches={decisionMatches} savedProgrammeIds={new Set((savedGermanyProgrammes.data ?? []).map((programme) => programme.programmeId))} isSavingProgrammeId={saveGermanyProgramme.isPending ? saveGermanyProgramme.variables?.programmeId : undefined} onKeep={(programmeId) => saveGermanyProgramme.mutate({ programmeId })} onExplore={openRecovery} onAdjustDirection={openRecovery} onBuildJourney={() => go("home")} /> : <JourneyHome language={language} name={name} state={state} programmes={programmes} attentionItems={attentionItems} preparingProgrammeIds={preparingProgrammeIds} onAction={onAction} onOpenProgramme={openProgramme} onOpenTools={() => setToolsOpen(true)} onRecover={openRecovery} onOpenResearch={() => go("consult")} onOpenEssays={() => go("essays")} onOpenOutreach={() => go("reach")} onOpenSettings={() => setLocation("/settings")} />}</main>
  </div>;
}
