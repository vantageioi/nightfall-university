// Drizzle-backed EmailCodeStore — the production persistence for #163 codes.
import * as db from "./db";
import type { EmailCodeRecord, EmailCodeStore } from "./emailVerification";

function toRecord(row: Awaited<ReturnType<typeof db.getLatestEmailVerification>>): EmailCodeRecord | null {
  if (!row) return null;
  return { id: row.id, email: row.email, purpose: row.purpose, codeHash: row.codeHash, attempts: row.attempts, consumedAt: row.consumedAt, expiresAt: row.expiresAt, createdAt: row.createdAt };
}

export const defaultStore: EmailCodeStore = {
  async insert(record) {
    await db.insertEmailVerification(record);
  },
  async latestForEmail(email, purpose) {
    return toRecord(await db.getLatestEmailVerification(email, purpose));
  },
  async countIssuedSince(email, purpose, since) {
    return db.countEmailVerificationsSince(email, purpose, since);
  },
  async markConsumed(id) {
    await db.markEmailVerificationConsumed(id);
  },
  async saveAttempts(id, attempts) {
    await db.saveEmailVerificationAttempts(id, attempts);
  },
};
