import { describe, expect, it } from "vitest";
import { getSchedulerWindowKey } from "./schedulerRunner";

describe("scheduler window keys", () => {
  it("collapses trigger retries within the same fifteen-minute UTC window", () => {
    const first = getSchedulerWindowKey("deadline-nudges", new Date("2026-08-31T08:01:00.000Z"));
    const retry = getSchedulerWindowKey("deadline-nudges", new Date("2026-08-31T08:14:59.000Z"));
    const next = getSchedulerWindowKey("deadline-nudges", new Date("2026-08-31T08:15:00.000Z"));

    expect(first).toBe("deadline-nudges:2026-08-31T08:00Z");
    expect(retry).toBe(first);
    expect(next).toBe("deadline-nudges:2026-08-31T08:15Z");
  });

  it("keeps independent job ledgers distinct in the same time window", () => {
    const now = new Date("2026-08-31T08:01:00.000Z");
    expect(getSchedulerWindowKey("deadline-nudges", now)).not.toBe(getSchedulerWindowKey("source-watches", now));
  });
});
