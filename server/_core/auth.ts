// Self-hosted credential auth. Replaces the external OAuth SDK:
// scrypt password hashing + HS256 session JWTs in the app_session_id cookie.
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "crypto";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import { COOKIE_NAME } from "@shared/const";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { assertEmailUnlockToken } from "../emailVerification";
import { ENV } from "./env";

export type SessionPayload = {
  openId: string;
  name: string;
  tokenVersion: number;
};

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function sessionSecret(): Uint8Array {
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function createSessionToken(user: Pick<User, "openId" | "name" | "tokenVersion">): Promise<string> {
  const issuedAt = Date.now();
  return new SignJWT({ openId: user.openId, name: user.name ?? "", tv: user.tokenVersion })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(Math.floor(issuedAt / 1000))
    .setExpirationTime(Math.floor((issuedAt + ENV.sessionDurationMs) / 1000))
    .sign(sessionSecret());
}

export async function verifySession(cookieValue: string | undefined | null): Promise<SessionPayload | null> {
  if (!cookieValue) return null;
  try {
    const { payload } = await jwtVerify(cookieValue, sessionSecret(), { algorithms: ["HS256"] });
    const openId = typeof payload.openId === "string" ? payload.openId : "";
    const tokenVersion = typeof payload.tv === "number" ? payload.tv : -1;
    if (!openId || tokenVersion < 0) return null;
    return { openId, name: typeof payload.name === "string" ? payload.name : "", tokenVersion };
  } catch {
    return null;
  }
}

function readSessionToken(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (header) {
    const pair = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
    if (pair) return pair.slice(COOKIE_NAME.length + 1);
  }
  const authorization = req.headers.authorization;
  if (typeof authorization === "string" && authorization.startsWith("Bearer ")) {
    return authorization.slice(7);
  }
  return undefined;
}

export async function authenticateRequest(req: Request): Promise<User> {
  const session = await verifySession(readSessionToken(req));
  if (!session) throw Object.assign(new Error("Not authenticated"), { statusCode: 401 });
  const user = await db.getUserByOpenId(session.openId);
  // Server-side revocation: a session minted before the user's current
  // tokenVersion is dead, even though its signature and expiry are valid.
  if (!user || user.tokenVersion !== session.tokenVersion) throw Object.assign(new Error("Not authenticated"), { statusCode: 401 });
  return user;
}

const PASSWORD_MIN_LENGTH = 8;
const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

export async function registerUser(input: { email: string; name: string; password: string; unlockToken: string }) {
  const email = input.email.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter a valid email address.");
  if (input.password.length < PASSWORD_MIN_LENGTH) throw new Error(`Use at least ${PASSWORD_MIN_LENGTH} characters for your password.`);
  // #163 gate: registration only proceeds with an unlock token minted after a
  // verified time-limited code was confirmed for exactly this email address.
  await assertEmailUnlockToken(input.unlockToken ?? "", email);
  const existing = await db.getUserByEmail(email);
  if (existing?.passwordHash) throw new Error("An account with this email already exists. Sign in instead.");
  // First account on a fresh deployment becomes the admin (sees Admin Intake).
  const isFirstUser = (await db.countUsers()) === 0;
  const verifiedAt = new Date();
  if (existing) {
    await db.upsertUser({ openId: existing.openId, name: input.name.trim() || existing.name || null, loginMethod: "password", passwordHash: hashPassword(input.password), emailVerifiedAt: existing.emailVerifiedAt ?? verifiedAt, role: isFirstUser ? "admin" : existing.role });
    return db.getUserByOpenId(existing.openId);
  }
  const openId = `local-${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  await db.upsertUser({ openId, name: input.name.trim() || null, email, loginMethod: "password", passwordHash: hashPassword(input.password), emailVerifiedAt: verifiedAt, role: isFirstUser ? "admin" : "user" });
  return db.getUserByOpenId(openId);
}

export async function loginUser(input: { email: string; password: string; unlockToken: string }) {
  const email = input.email.trim().toLowerCase();
  // #164 gate: sign-in, like registration, only proceeds with an unlock token
  // minted after a verified time-limited code was confirmed for exactly this
  // email address — acting as both an ownership check and a rate-limit gate.
  await assertEmailUnlockToken(input.unlockToken ?? "", email);
  const user = await db.getUserByEmail(email);
  if (!user || !verifyPassword(input.password, user.passwordHash)) throw new Error("Email or password is incorrect.");
  // Note: no emailVerifiedAt hard gate here. Registration (#163) guarantees
  // verification for every new password account; the #164 login code gate
  // covers legacy accounts without locking them out.
  return user;
}
