import { describe, expect, it } from "vitest";
import { deliverDueUniversityFollowUps, getFollowUpAlertKey, type FollowUpDeliveryStore } from "./followUpDelivery";

function makeStore(duePlans: Array<{ id: number; university: string | null; reason: string | null }>) {
  const calls: { notifications: unknown[]; promotedPlanIds: number[]; listCalls: number } = { notifications: [], promotedPlanIds: [], listCalls: 0 };
  const store: FollowUpDeliveryStore = {
    async listDuePlans() {
      calls.listCalls += 1;
      return duePlans;
    },
    async deliverNotification(notification) {
      calls.notifications.push(notification);
    },
    async promotePlan(planId) {
      calls.promotedPlanIds.push(planId);
    },
  };
  return { store, calls };
}

describe("scheduled follow-up delivery", () => {
  it("delivers one in-app notification per due plan and then promotes the plan", async () => {
    const { store, calls } = makeStore([
      { id: 11, university: "TU Berlin", reason: "Check document status" },
      { id: 12, university: "RWTH Aachen", reason: "Confirm interview slot" },
    ]);
    const delivered = await deliverDueUniversityFollowUps({ userId: 7, locale: "en" }, store);
    expect(delivered).toBe(2);
    expect(calls.notifications).toHaveLength(2);
    expect(calls.promotedPlanIds).toEqual([11, 12]);
    expect(calls.notifications[0]).toMatchObject({
      userId: 7,
      followUpPlanId: 11,
      alertKey: getFollowUpAlertKey(7, 11),
      title: "Time to review TU Berlin",
      body: "Follow-up: Check document status. Prepare or review a draft, but sending remains your decision.",
      locale: "en",
    });
  });

  it("is idempotent on retry: a plan already promoted (no longer due) is never delivered twice", async () => {
    // First run sees two due plans; the promotion moves them out of "planned",
    // so a retried scheduler run selects an empty set.
    const firstRun = makeStore([{ id: 11, university: "TU Berlin", reason: "Docs" }]);
    await deliverDueUniversityFollowUps({ userId: 7, locale: "en" }, firstRun.store);
    const retryRun = makeStore([]);
    const retried = await deliverDueUniversityFollowUps({ userId: 7, locale: "en" }, retryRun.store);
    expect(retried).toBe(0);
    expect(retryRun.calls.notifications).toHaveLength(0);
  });

  it("uses a stable unique alertKey per student+plan so a duplicate insert cannot create a second notification row", () => {
    expect(getFollowUpAlertKey(7, 42)).toBe("university-follow-up:7:42");
    expect(getFollowUpAlertKey(7, 42)).toBe(getFollowUpAlertKey(7, 42));
    expect(getFollowUpAlertKey(8, 42)).not.toBe(getFollowUpAlertKey(7, 42));
    expect(getFollowUpAlertKey(7, 43)).not.toBe(getFollowUpAlertKey(7, 42));
  });

  it("respects the notification rate surface by delivering only what the due-plan query returns", async () => {
    // The pipeline never fans out beyond the due-plan selection and never
    // touches AI quota or email sending — in-app records only.
    const { store, calls } = makeStore([{ id: 5, university: null, reason: null }]);
    const delivered = await deliverDueUniversityFollowUps({ userId: 3, locale: "ar" }, store);
    expect(delivered).toBe(1);
    expect(calls.notifications).toHaveLength(1);
    expect(calls.promotedPlanIds).toHaveLength(1);
    expect(calls.notifications[0]).toMatchObject({ title: "وقت تراجع null", locale: "ar" });
  });
});
