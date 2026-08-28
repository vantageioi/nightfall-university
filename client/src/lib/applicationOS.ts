export type OsItem = { id: string; kind: "task" | "evidence" | "essay" | "reply" | "decision" | "language" | "cost" | "reflection"; title: string; detail: string; complete?: boolean; createdAt: string };
export type ApplicationOsState = { items: OsItem[]; reducedMotion: boolean; highContrast: boolean; largeText: boolean };

export const APPLICATION_OS_KEY = "nightfall.application-os.v1";
export const emptyApplicationOsState: ApplicationOsState = { items: [], reducedMotion: false, highContrast: false, largeText: false };

export function loadApplicationOsState(raw: string | null): ApplicationOsState {
  if (!raw) return emptyApplicationOsState;
  try {
    const parsed = JSON.parse(raw) as Partial<ApplicationOsState>;
    return { ...emptyApplicationOsState, ...parsed, items: Array.isArray(parsed.items) ? parsed.items : [] };
  } catch { return emptyApplicationOsState; }
}

export function createOsItem(kind: OsItem["kind"], title: string, detail = ""): OsItem {
  return { id: crypto.randomUUID(), kind, title: title.trim(), detail: detail.trim(), createdAt: new Date().toISOString() };
}

export function buildCalendarEvent(title: string, date: string, description: string) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const day = date.replace(/-/g, "");
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Nightfall//Application OS//EN", "BEGIN:VEVENT", `UID:${crypto.randomUUID()}@nightfall.app`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${day}`, `SUMMARY:${title.replace(/[\r\n]/g, " ")}`, `DESCRIPTION:${description.replace(/[\r\n]/g, "\\n")}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
}
