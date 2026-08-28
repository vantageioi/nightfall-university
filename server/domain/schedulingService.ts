import {
  getReminderPreferences,
  saveReminderPreferences,
} from "../db";
import {
  getUniversityWatchPreferences,
  saveUniversityRequirementWatch,
  saveUniversityWatchPreferences,
} from "../universityWatch";
import { primeUniversityRequirementWatch } from "../requirementsWatchRunner";

type UserId = Parameters<typeof saveReminderPreferences>[0];


export type ReminderSettings = { enabled: boolean; remindSevenDays: boolean; remindThreeDays: boolean; remindOneDay: boolean; preferredHourUtc: number };
export type WatchSettings = { enabled: boolean; preferredHourUtc: number };

export async function updateReminderPreferencesWithSchedule(userId: UserId, input: ReminderSettings) {
  await saveReminderPreferences(userId, input);
  return getReminderPreferences(userId);
}

export async function updateUniversityWatchPreferencesWithSchedule(userId: UserId, input: WatchSettings) {
  await saveUniversityWatchPreferences(userId, input);
  return getUniversityWatchPreferences(userId);
}

export async function syncRequirementWatch(userId: UserId, input: Parameters<typeof saveUniversityRequirementWatch>[1]) {
  const watch = await saveUniversityRequirementWatch(userId, input);
  if (watch?.enabled) await primeUniversityRequirementWatch({ userId, watch });
  return watch;
}
