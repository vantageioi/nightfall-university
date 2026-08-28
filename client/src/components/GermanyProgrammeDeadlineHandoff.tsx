import { CalendarPlus, ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

type SavedProgramme = { programmeId: string; programmeName: string; officialName: string; programmeEvidenceUrl: string; officialProgrammeUrl: string | null };
type DeadlineHandoff = { programmeId: string; programmeName: string; deadlineAt: Date; officialEvidenceUrl: string; reviewedAt: Date };

type Props = {
  programmes: SavedProgramme[];
  handoffs: DeadlineHandoff[];
  isSaving: boolean;
  isArabic: boolean;
  onSave: (programmeId: string, deadlineAt: number) => void;
  onRemove: (programmeId: string) => void;
  onOpenCalendar: () => void;
};

export function GermanyProgrammeDeadlineHandoff({ programmes, handoffs: _handoffs, isSaving, isArabic, onSave, onRemove: _onRemove, onOpenCalendar }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [programmeId, setProgrammeId] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const selected = useMemo(() => programmes.find((programme) => programme.programmeId === programmeId), [programmeId, programmes]);
  const copy = isArabic
    ? { label: "تاريخ مراجَع", title: "أضف تاريخ راجعته للتقويم", body: "اختياري. افتح المصدر، راجع التاريخ، وبعدها احفظه إلك.", open: "أضف موعد", close: "خلصت", select: "اختار برنامج محفوظ", date: "التاريخ اللي راجعته", source: "افتح الدليل الرسمي", save: "أضف لتقويمي", calendar: "شوف التقويم", note: "بتقدر تعدّل أو تحذف التاريخ من صفحة التقويم." }
    : { label: "REVIEWED DATE", title: "Add one verified date to your calendar.", body: "Optional. Open the source, review the date, then save it for yourself.", open: "Add a date", close: "Done", select: "Choose a saved programme", date: "Date you reviewed", source: "Open official source", save: "Add to calendar", calendar: "View calendar", note: "You can edit or remove the date from Calendar." };
  if (!programmes.length) return null;
  return <section className="mt-6 border-t border-white/15 pt-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="nf-label text-[8px] text-[#afafaf]">// {copy.label}</p><h3 className="mt-2 text-lg font-semibold tracking-[-.04em]">{copy.title}</h3><p className="mt-1 max-w-xl text-xs leading-5 text-[#a2a2a2]">{copy.body}</p></div><button type="button" onClick={() => setIsOpen((current) => !current)} className="nf-button inline-flex items-center gap-2 border border-white/20 px-3 py-2 text-[10px] font-semibold"><CalendarPlus className="h-3.5 w-3.5" />{isOpen ? copy.close : copy.open}<ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} /></button></div>{isOpen && <div className="mt-4 grid gap-3 border border-white/10 bg-black/20 p-3 md:grid-cols-[1fr_170px_auto]"><select value={programmeId} onChange={(event) => setProgrammeId(event.target.value)} className="border border-white/10 bg-[#141414] px-3 py-3 text-xs text-white outline-none"><option value="">{copy.select}</option>{programmes.map((programme) => <option key={programme.programmeId} value={programme.programmeId}>{programme.programmeName} — {programme.officialName}</option>)}</select><input type="date" value={deadlineDate} onChange={(event) => setDeadlineDate(event.target.value)} aria-label={copy.date} className="border border-white/10 bg-[#141414] px-3 py-3 text-xs text-white outline-none" /><button type="button" disabled={!programmeId || !deadlineDate || isSaving} onClick={() => { onSave(programmeId, Date.parse(`${deadlineDate}T00:00:00.000Z`)); setIsOpen(false); }} className="nf-button border border-white bg-white px-4 py-3 text-xs text-black disabled:bg-white/10 disabled:text-white/50">{copy.save}</button>{selected && <div className="md:col-span-3 flex flex-wrap items-center gap-3 text-[10px]"><a href={selected.officialProgrammeUrl || selected.programmeEvidenceUrl} target="_blank" rel="noreferrer" className="underline text-[#e0e0e0]">{copy.source}</a><button type="button" onClick={onOpenCalendar} className="nf-button underline text-[#e0e0e0]">{copy.calendar}</button><span className="text-[#a2a2a2]">{copy.note}</span></div>}</div>}</section>;
}
