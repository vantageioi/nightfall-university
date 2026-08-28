// Time-limited email ownership codes (#163). A 6-digit code is issued to the
// student's email at the final account-unlock moment; only after verifying it
// does the caller receive a short-lived signed unlock token that the existing
// sign-up flow requires before it will save anything. Codes are stored hashed,
// expire quickly, resist brute force with a per-code attempt ceiling, and the
// issue path is both per-email rate limited and IP rate limited at the route.
import { createHash, randomInt, timingSafeEqual } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./_core/env";

export const EMAIL_CODE_PURPOSE = "registration";

const CODE_TTL_MS = 10 * 60 * 1000;
const SEND_COOLDOWN_MS = 60 * 1000;
const MAX_CODES_PER_EMAIL_PER_HOUR = 5;
const MAX_ATTEMPTS_PER_CODE = 5;
const UNLOCK_TOKEN_TTL_MS = 15 * 60 * 1000;

export class EmailCodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailCodeError";
  }
}

export type EmailCodeRecord = {
  id: number;
  email: string;
  purpose: string;
  codeHash: string;
  attempts: number;
  consumedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
};

/** Persistence contract so unit tests run against an in-memory store. */
export interface EmailCodeStore {
  insert(record: Omit<EmailCodeRecord, "id">): Promise<void>;
  latestForEmail(email: string, purpose: string): Promise<EmailCodeRecord | null>;
  countIssuedSince(email: string, purpose: string, since: Date): Promise<number>;
  markConsumed(id: number): Promise<void>;
  saveAttempts(id: number, attempts: number): Promise<void>;
}

export type PlatformCodeSender = (input: { email: string; code: string; expiresAt: Date }) => Promise<void>;

function hashCode(code: string): string {
  return createHash("sha256").update(`nightfall-email-code:${code}`).digest("hex");
}

function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(normalized)) throw new EmailCodeError("Enter a valid email address.");
  return normalized;
}

function unlockSecret(): Uint8Array {
  return new TextEncoder().encode(ENV.cookieSecret);
}

async function mintUnlockToken(email: string): Promise<string> {
  return new SignJWT({ purpose: "account_unlock", email })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(Math.floor(Date.now() / 1000))
    .setExpirationTime(Math.floor((Date.now() + UNLOCK_TOKEN_TTL_MS) / 1000))
    .sign(unlockSecret());
}

/** Confirms the presented token was minted by us for exactly this email. */
export async function assertEmailUnlockToken(token: string, email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  let payloadEmail = "";
  try {
    const { payload } = await jwtVerify(token, unlockSecret(), { algorithms: ["HS256"] });
    if (payload.purpose !== "account_unlock") throw new Error("wrong purpose");
    payloadEmail = typeof payload.email === "string" ? payload.email : "";
  } catch {
    throw new EmailCodeError("Your verification link expired. Request a new code.");
  }
  if (payloadEmail !== normalized) throw new EmailCodeError("This verification was requested for a different email.");
}

async function defaultSendCode({ email, code }: { email: string; code: string; expiresAt: Date }): Promise<void> {
  const { sendPlatformEmail } = await import("./platformEmail");
  await sendPlatformEmail({
    to: email,
    subject: "Your Nightfall verification code",
    text: `Your Nightfall verification code is ${code}. It expires in 10 minutes. If you did not request it, you can ignore this email.`,
  });
}

export async function requestEmailCode(
  rawEmail: string,
  options?: { store?: EmailCodeStore; sendCode?: PlatformCodeSender; now?: Date }
): Promise<{ sent: true; expiresAt: Date }> {
  const store = options?.store ?? (await import("./emailVerificationStore")).defaultStore;
  const sendCode = options?.sendCode ?? defaultSendCode;
  const now = options?.now ?? new Date();
  const email = normalizeEmail(rawEmail);

  const latest = await store.latestForEmail(email, EMAIL_CODE_PURPOSE);
  if (latest && now.getTime() - latest.createdAt.getTime() < SEND_COOLDOWN_MS) {
    throw new EmailCodeError("A code was just sent. Wait a minute before requesting another.");
  }
  const issuedLastHour = await store.countIssuedSince(email, EMAIL_CODE_PURPOSE, new Date(now.getTime() - 60 * 60 * 1000));
  if (issuedLastHour >= MAX_CODES_PER_EMAIL_PER_HOUR) {
    throw new EmailCodeError("Too many codes requested for this email. Try again later.");
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(now.getTime() + CODE_TTL_MS);
  await store.insert({ email, purpose: EMAIL_CODE_PURPOSE, codeHash: hashCode(code), attempts: 0, consumedAt: null, expiresAt, createdAt: now });
  await sendCode({ email, code, expiresAt });
  return { sent: true, expiresAt };
}

export async function verifyEmailCode(
  rawEmail: string,
  code: string,
  options?: { store?: EmailCodeStore; now?: Date }
): Promise<{ unlockToken: string }> {
  const store = options?.store ?? (await import("./emailVerificationStore")).defaultStore;
  const now = options?.now ?? new Date();
  const email = normalizeEmail(rawEmail);

  const record = await store.latestForEmail(email, EMAIL_CODE_PURPOSE);
  if (!record || record.consumedAt || record.expiresAt.getTime() <= now.getTime()) {
    throw new EmailCodeError("That code is no longer valid. Request a new one.");
  }
  if (record.attempts >= MAX_ATTEMPTS_PER_CODE) {
    throw new EmailCodeError("Too many incorrect attempts. Request a new code.");
  }

  const provided = Buffer.from(hashCode(code.trim()), "hex");
  const stored = Buffer.from(record.codeHash, "hex");
  if (provided.length !== stored.length || !timingSafeEqual(provided, stored)) {
    await store.saveAttempts(record.id, record.attempts + 1);
    const remaining = MAX_ATTEMPTS_PER_CODE - (record.attempts + 1);
    throw new EmailCodeError(remaining > 0 ? `That code is not correct. ${remaining} attempt${remaining === 1 ? "" : "s"} left.` : "Too many incorrect attempts. Request a new code.");
  }

  await store.markConsumed(record.id);
  return { unlockToken: await mintUnlockToken(email) };
}
