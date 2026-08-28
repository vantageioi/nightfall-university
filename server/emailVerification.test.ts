import { beforeEach, describe, expect, it } from "vitest";
import { assertEmailUnlockToken, EmailCodeError, requestEmailCode, verifyEmailCode, type EmailCodeRecord, type EmailCodeStore } from "./emailVerification";

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

function at(minutes: number, base: number) {
  return new Date(base + minutes * 60 * 1000);
}

describe("emailVerification (#163)", () => {
  let store: ReturnType<typeof memoryStore>;
  const t0 = Date.UTC(2026, 0, 10, 12, 0, 0);

  beforeEach(() => {
    store = memoryStore();
    sent.length = 0;
  });

  it("issues a six-digit code and verifies it into an unlock token bound to the email", async () => {
    await requestEmailCode("Student@Example.com ", { store, sendCode, now: new Date(t0) });
    expect(sent).toHaveLength(1);
    expect(sent[0].code).toMatch(/^\d{6}$/);

    const { unlockToken } = await verifyEmailCode("student@example.com", sent[0].code, { store, now: at(2, t0) });
    await expect(assertEmailUnlockToken(unlockToken, "student@example.com")).resolves.toBeUndefined();
  });

  it("rejects an unlock token presented for a different address", async () => {
    await requestEmailCode("a@example.com", { store, sendCode, now: new Date(t0) });
    const { unlockToken } = await verifyEmailCode("a@example.com", sent[0].code, { store, now: at(1, t0) });
    await expect(assertEmailUnlockToken(unlockToken, "b@example.com")).rejects.toBeInstanceOf(EmailCodeError);
  });

  it("enforces the per-code attempt ceiling before locking out", async () => {
    await requestEmailCode("a@example.com", { store, sendCode, now: new Date(t0) });
    const realCode = sent[0].code;
    for (let attempt = 0; attempt < 5; attempt++) {
      await expect(verifyEmailCode("a@example.com", "000000", { store, now: at(1, t0) })).rejects.toBeInstanceOf(EmailCodeError);
    }
    await expect(verifyEmailCode("a@example.com", realCode, { store, now: at(1, t0) })).rejects.toThrow(/Too many incorrect attempts/);
  });

  it("expires codes after ten minutes", async () => {
    await requestEmailCode("a@example.com", { store, sendCode, now: new Date(t0) });
    await expect(verifyEmailCode("a@example.com", sent[0].code, { store, now: at(11, t0) })).rejects.toThrow(/no longer valid/);
  });

  it("rate-limits re-issue with a one-minute cooldown and five-per-hour cap", async () => {
    await requestEmailCode("a@example.com", { store, sendCode, now: new Date(t0) });
    await expect(requestEmailCode("a@example.com", { store, sendCode, now: new Date(t0 + 30 * 1000) })).rejects.toThrow(/Wait a minute/);
    for (let index = 2; index <= 5; index++) await requestEmailCode("a@example.com", { store, sendCode, now: at(index * 2, t0) });
    await expect(requestEmailCode("a@example.com", { store, sendCode, now: at(12, t0) })).rejects.toThrow(/Too many codes/);
    // A different address is unaffected.
    await expect(requestEmailCode("b@example.com", { store, sendCode, now: at(12, t0) })).resolves.toMatchObject({ sent: true });
  });

  it("does not accept a consumed code twice", async () => {
    await requestEmailCode("a@example.com", { store, sendCode, now: new Date(t0) });
    const code = sent[0].code;
    await verifyEmailCode("a@example.com", code, { store, now: at(1, t0) });
    await expect(verifyEmailCode("a@example.com", code, { store, now: at(2, t0) })).rejects.toThrow(/no longer valid/);
  });
});
