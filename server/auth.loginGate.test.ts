// #164: sign-in requires the same verified email-code unlock token as #163 registration.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestEmailCode, verifyEmailCode, type EmailCodeRecord, type EmailCodeStore } from "./emailVerification";

const usersByEmail = new Map<string, { openId: string; email: string; name: string | null; passwordHash: string | null; tokenVersion: number }>();

vi.mock("./db", () => ({
  getUserByEmail: async (email: string) => usersByEmail.get(email) ?? null,
}));

import { hashPassword, loginUser } from "./_core/auth";

type Row = EmailCodeRecord & { id: number };

function memoryStore(): EmailCodeStore & { rows: Row[] } {
  const rows: Row[] = [];
  let nextId = 1;
  return {
    rows,
    async insert(record) {
      rows.push({ ...record, id: nextId++ });
    },
    async latestForEmail(email, purpose) {
      const matches = rows.filter((row) => row.email === email && row.purpose === purpose).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return matches[0] ?? null;
    },
    async countIssuedSince(email, purpose, since) {
      return rows.filter((row) => row.email === email && row.purpose === purpose && row.createdAt.getTime() >= since.getTime()).length;
    },
    async markConsumed(id) {
      const row = rows.find((item) => item.id === id);
      if (row) row.consumedAt = new Date();
    },
    async saveAttempts(id, attempts) {
      const row = rows.find((item) => item.id === id);
      if (row) row.attempts = attempts;
    },
  };
}

const sent: Array<{ email: string; code: string }> = [];
const sendCode = async (input: { email: string; code: string }) => {
  sent.push({ email: input.email, code: input.code });
};

async function unlockTokenFor(email: string): Promise<string> {
  const store = memoryStore();
  await requestEmailCode(email, { store, sendCode, now: new Date(0) });
  const { unlockToken } = await verifyEmailCode(email, sent[0].code, { store, now: new Date(60 * 1000) });
  return unlockToken;
}

describe("loginUser email-code gate (#164)", () => {
  beforeEach(() => {
    sent.length = 0;
    usersByEmail.clear();
    usersByEmail.set("student@example.com", { openId: "local-student", email: "student@example.com", name: "Student", passwordHash: hashPassword("correct-horse-8"), tokenVersion: 0 });
  });

  it("rejects sign-in without an unlock token", async () => {
    await expect(loginUser({ email: "student@example.com", password: "correct-horse-8", unlockToken: "" })).rejects.toBeInstanceOf(Error);
  });

  it("rejects an unlock token minted for a different address", async () => {
    const token = await unlockTokenFor("other@example.com");
    await expect(loginUser({ email: "student@example.com", password: "correct-horse-8", unlockToken: token })).rejects.toThrow(/different email/);
  });

  it("signs in with a valid unlock token and correct password", async () => {
    const token = await unlockTokenFor("student@example.com");
    await expect(loginUser({ email: "student@example.com", password: "correct-horse-8", unlockToken: token })).resolves.toMatchObject({ email: "student@example.com" });
  });

  it("still rejects a wrong password when the token is valid", async () => {
    const token = await unlockTokenFor("student@example.com");
    await expect(loginUser({ email: "student@example.com", password: "wrong-password", unlockToken: token })).rejects.toThrow(/incorrect/);
  });
});
