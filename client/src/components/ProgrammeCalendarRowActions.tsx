import React from "react";

type Props = {
  date: Date;
  officialEvidenceUrl: string;
  isArabic: boolean;
  isRemoving: boolean;
  onSave: (deadlineAt: number) => void;
  onRemove: () => void;
};

export function ProgrammeCalendarRowActions({ date, officialEvidenceUrl, isArabic, isRemoving, onSave, onRemove }: Props) {
  const dateValue = date.toISOString().slice(0, 10);
  return <div className="mt-3 flex flex-wrap items-center gap-2"><input aria-label={isArabic ? "عدّل الموعد" : "Edit date"} type="date" defaultValue={dateValue} onChange={(event) => { const deadlineAt = Date.parse(`${event.target.value}T00:00:00.000Z`); if (event.target.value && !Number.isNaN(deadlineAt) && deadlineAt !== date.getTime()) onSave(deadlineAt); }} className="border border-white/15 bg-black/20 px-2 py-1.5 text-[10px] text-white outline-none" /><a href={officialEvidenceUrl} target="_blank" rel="noreferrer" className="nf-button text-[9px] underline">{isArabic ? "المصدر" : "Source"}</a><button type="button" disabled={isRemoving} onClick={onRemove} className="nf-button text-[9px] underline disabled:opacity-50">{isArabic ? "احذف" : "Remove"}</button></div>;
}
