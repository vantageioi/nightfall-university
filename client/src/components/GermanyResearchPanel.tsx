import React, { useMemo } from "react";
import { ProgrammeBriefingPanel, type ProgrammeBriefingRecord } from "@/components/ProgrammeBriefingPanel";
import { ProgrammeResearchPanel, type ProgrammeResearchPanelProps, type ProgrammeResearchRecord } from "@/components/ProgrammeResearchPanel";
import { germanyProgrammeResearchPanelContract } from "@/lib/germanyProgrammeComparisonProvider";
import { trpc } from "@/lib/trpc";

export type GermanyProgrammeRecord = ProgrammeResearchRecord;

function GermanyProgrammeBriefing({ programmeId, isArabic }: { programmeId: string; isArabic: boolean }) {
  const language = isArabic ? "ar" as const : "en" as const;
  const briefingInput = useMemo(() => ({ language }), [language]);
  const briefingsQuery = trpc.student.germanyProgrammeBriefings.useQuery(briefingInput);
  const utils = trpc.useUtils();
  const generateBriefing = trpc.student.generateGermanyProgrammeBriefing.useMutation({ onSuccess: () => void utils.student.germanyProgrammeBriefings.invalidate() });
  const briefing = (briefingsQuery.data ?? []).find((item) => item.programmeId === programmeId) as ProgrammeBriefingRecord | undefined;
  return <ProgrammeBriefingPanel briefing={briefing} isGenerating={generateBriefing.isPending && generateBriefing.variables?.programmeId === programmeId} isArabic={isArabic} onGenerate={() => generateBriefing.mutate({ programmeId, language })} />;
}

export function GermanyResearchPanel(props: Omit<ProgrammeResearchPanelProps, "provider" | "renderProgrammeSupplement">) {
  return <ProgrammeResearchPanel {...props} provider={germanyProgrammeResearchPanelContract} renderProgrammeSupplement={(programme, isArabic) => <GermanyProgrammeBriefing programmeId={programme.programmeId} isArabic={isArabic} />} />;
}
