export const MAX_STUDENT_UNIVERSITY_EMAILS_PER_24H = 5;
export const MAX_EMAILS_PER_CONTACT_PER_24H = 1;

export function canSendUniversityEmailInWindow(input: { studentSentCount: number; contactSentCount: number }) {
  if (input.studentSentCount >= MAX_STUDENT_UNIVERSITY_EMAILS_PER_24H) return { allowed: false, reason: "student_daily_limit" as const };
  if (input.contactSentCount >= MAX_EMAILS_PER_CONTACT_PER_24H) return { allowed: false, reason: "contact_daily_limit" as const };
  return { allowed: true, reason: null } as const;
}
