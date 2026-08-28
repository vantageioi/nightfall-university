export type LocalConsultationRecovery = { note: string; direction: string; recordedAt: number };

const RECOVERY_STORAGE_KEY = "nightfall-consultation-recovery-v1";

function storage() { return typeof window === "undefined" ? null : window.sessionStorage; }

export function readLocalConsultationRecovery(): LocalConsultationRecovery | null {
  try {
    const raw = storage()?.getItem(RECOVERY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalConsultationRecovery>;
    const note = typeof parsed.note === "string" ? parsed.note.trim().slice(0, 1200) : "";
    const direction = typeof parsed.direction === "string" ? parsed.direction.trim().slice(0, 180) : "";
    return note || direction ? { note, direction, recordedAt: typeof parsed.recordedAt === "number" ? parsed.recordedAt : Date.now() } : null;
  } catch { return null; }
}

export function writeLocalConsultationRecovery(input: { note?: string; direction?: string }) {
  const note = input.note?.trim().slice(0, 1200) ?? "";
  const direction = input.direction?.trim().slice(0, 180) ?? "";
  if (!note && !direction) return null;
  const value: LocalConsultationRecovery = { note, direction, recordedAt: Date.now() };
  try { storage()?.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(value)); } catch { /* Browser-local recovery context is optional. */ }
  return value;
}

export function clearLocalConsultationRecovery() {
  try { storage()?.removeItem(RECOVERY_STORAGE_KEY); } catch { /* Nothing to clear outside a browser context. */ }
}
