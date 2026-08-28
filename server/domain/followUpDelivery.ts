/**
 * Scheduled in-app follow-up delivery.
 *
 * Pure orchestration over an injected store so the due-plan -> notification ->
 * promotion pipeline can be tested without a database. The store contract maps
 * 1:1 onto the drizzle calls in server/db.ts:
 *   - listDuePlans: plans with status "planned" and dueAt <= referenceDate
 *   - deliverNotification: idempotent insert on the unique alertKey
 *   - promotePlan: status "planned" -> "draft_ready"
 */
export type FollowUpDeliveryLocale = "en" | "ar";

export type DueFollowUpPlan = { id: number; university: string | null; reason: string | null };

export type FollowUpNotificationInsert = {
  userId: number;
  followUpPlanId: number;
  alertKey: string;
  title: string;
  body: string;
  locale: FollowUpDeliveryLocale;
};

export interface FollowUpDeliveryStore {
  listDuePlans(): Promise<DueFollowUpPlan[]>;
  deliverNotification(notification: FollowUpNotificationInsert): Promise<unknown>;
  promotePlan(planId: number): Promise<unknown>;
}

/** Stable per-plan key so retried scheduler runs cannot double-deliver. */
export function getFollowUpAlertKey(userId: number, followUpPlanId: number): string {
  return `university-follow-up:${userId}:${followUpPlanId}`;
}

export async function deliverDueUniversityFollowUps(
  input: { userId: number; locale: FollowUpDeliveryLocale },
  store: FollowUpDeliveryStore
): Promise<number> {
  const duePlans = await store.listDuePlans();
  let delivered = 0;
  for (const plan of duePlans) {
    const title = input.locale === "ar" ? `وقت تراجع ${plan.university}` : `Time to review ${plan.university}`;
    const body =
      input.locale === "ar"
        ? `متابعة: ${plan.reason}. جهّز أو راجع المسودة، بس الإرسال بيضل قرارك.`
        : `Follow-up: ${plan.reason}. Prepare or review a draft, but sending remains your decision.`;
    await store.deliverNotification({
      userId: input.userId,
      followUpPlanId: plan.id,
      alertKey: getFollowUpAlertKey(input.userId, plan.id),
      title,
      body,
      locale: input.locale,
    });
    // Promote only after the notification exists so a crash between the two
    // steps re-runs delivery on the next tick instead of dropping the plan.
    await store.promotePlan(plan.id);
    delivered += 1;
  }
  return delivered;
}
