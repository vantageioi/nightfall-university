import { comparisonEvidenceUrl, type ComparableProgramme } from "@/lib/programmeComparison";

import React from "react";

export function ProgrammeComparisonPanel({ programmes, language }: { programmes: ComparableProgramme[]; language: "en" | "ar" }) {
  const ar = language === "ar";
  if (programmes.length < 2) return <p className="mt-4 text-xs leading-5 text-[#a2a2a2]">{ar ? "اختار برنامجين أو أكثر للمقارنة." : "Select two or more programmes to compare."}</p>;
  return <div className="mt-4 space-y-3">{programmes.map((programme) => <article key={`${programme.providerId}:${programme.programmeId}`} className="border-b border-white/10 pb-3"><p className="text-xs font-semibold">{programme.programmeName}</p><p className="mt-1 text-[10px] leading-5 text-[#afafaf]">{programme.institution} · {programme.city}</p><p className="mt-1 text-[10px] leading-5 text-[#afafaf]">{programme.teachingLanguage || "—"} · {programme.admissionContext || "—"}</p><a href={comparisonEvidenceUrl(programme)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[9px] underline">{ar ? "تحقّق من المصدر" : "Verify source"}</a></article>)}</div>;
}
