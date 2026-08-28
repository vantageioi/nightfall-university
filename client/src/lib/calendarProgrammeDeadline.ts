export type CalendarDate = { university: string; date: Date; label: string } | { university: string; date: Date; label: string; programmeId: string; officialEvidenceUrl: string };

export function isProgrammeCalendarDate(entry: CalendarDate): entry is Extract<CalendarDate, { programmeId: string }> {
  return "programmeId" in entry && "officialEvidenceUrl" in entry;
}

export function programmeDeadlineMonth(handoffs: Array<{ deadlineAt: Date }> | undefined) {
  return handoffs?.[0]?.deadlineAt ? new Date(handoffs[0].deadlineAt) : null;
}
