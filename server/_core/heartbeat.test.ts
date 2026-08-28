import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Covers the in-process scheduler that fires scheduled callbacks
 * (POST /api/scheduled/deadline-nudges) for due follow-up / deadline plans:
 *  - a matching cron fires exactly once per minute even though the ticker
 *    ticks every ~20s (no double delivery on retries within the same minute);
 *  - the daily shape this app generates ("0 0 H * * *") fires when the tick
 *    lands after second 0 of the scheduled hour.
 */

async function freshScheduler() {
  vi.resetModules();
  return import("./heartbeat");
}

function localDate(hours: number, minutes: number, seconds = 0) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, seconds);
}

describe("in-process scheduler callback firing", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock = vi.fn(() => Promise.resolve(new Response("{}", { status: 200 })));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("fires the scheduled endpoint once for a due cron and dedupes retries in the same minute", async () => {
    const { createHeartbeatJob } = await freshScheduler();
    vi.setSystemTime(localDate(8, 0, 5));
    await createHeartbeatJob({ name: "nudges", cron: "0 0 8 * * *", path: "/api/scheduled/deadline-nudges" });

    // Tick at 08:00:25 — same minute as registration, first fire.
    await vi.advanceTimersByTimeAsync(20_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/scheduled/deadline-nudges?taskUid=");

    // Retry ticks still inside 08:00 must not double-deliver.
    await vi.advanceTimersByTimeAsync(20_000);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // A later minute outside the cron window stays quiet.
    vi.setSystemTime(localDate(9, 30, 0));
    await vi.advanceTimersByTimeAsync(20_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fires the daily '0 0 H * * *' job even when the ticker lands past second 0 of the hour", async () => {
    const { createHeartbeatJob } = await freshScheduler();
    // Register before the window; the ticker only ticks every 20s, so the fire
    // happens at e.g. 08:00:20 — an exact seconds-field match would be missed.
    vi.setSystemTime(localDate(7, 59, 55));
    await createHeartbeatJob({ name: "daily-nudges", cron: "0 0 8 * * *", path: "/api/scheduled/deadline-nudges" });
    expect(fetchMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(40_000); // now ~08:00:35
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Still only once for that whole minute window.
    await vi.advanceTimersByTimeAsync(40_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not fire jobs outside their day-of-week window", async () => {
    const { createHeartbeatJob } = await freshScheduler();
    const now = localDate(8, 0, 10);
    vi.setSystemTime(now);
    const dow = now.getDay();
    const otherDow = dow === 1 ? 2 : 1; // weekly Monday job, unless today IS Monday
    const weeklyCron = `0 0 8 * * ${otherDow === 1 ? 1 : 2}`;
    await createHeartbeatJob({ name: "weekly", cron: weeklyCron, path: "/api/scheduled/deadline-nudges" });
    await vi.advanceTimersByTimeAsync(60_000);
    if (dow === otherDow) {
      expect(fetchMock).toHaveBeenCalled();
    } else {
      expect(fetchMock).not.toHaveBeenCalled();
    }
  });
});
