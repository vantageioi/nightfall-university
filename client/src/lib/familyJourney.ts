export type FamilyJourneyMilestone = { id: number; universityId: number; title: string; dueLabel: string | null; completed: boolean };
export type FamilyJourneyReminder = { id: number; title: string; body: string | null; dueLabel: string | null; completed: boolean };

export function familyJourneySummary(milestones: FamilyJourneyMilestone[], reminders: FamilyJourneyReminder[]) {
  const nextMilestone = milestones.find((item) => !item.completed) ?? null;
  const nextReminder = reminders.find((item) => !item.completed) ?? null;
  return { activeRequirementCount: milestones.filter((item) => !item.completed).length, upcomingDateCount: reminders.filter((item) => !item.completed).length, next: nextMilestone ? { kind: "requirement" as const, title: nextMilestone.title, detail: nextMilestone.dueLabel } : nextReminder ? { kind: "date" as const, title: nextReminder.title, detail: nextReminder.dueLabel ?? nextReminder.body } : null };
}
