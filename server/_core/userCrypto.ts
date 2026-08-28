// Per-user encryption (GDPR crypto-shredding). See userKeys in schema.ts.
//
// Threat model: the server holds MASTER_KEY, so server compromise defeats
// this. The purpose is erasure, not defense against the operator: once a
// user's wrapped DEK is destroyed, every payload encrypted under it is
// permanently unrecoverable — including from backups taken earlier.
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import * as db from "../db";

const MASTER_KEY = (() => {
  const raw = process.env.MASTER_KEY?.trim() ?? "";
  if (raw) {
    const decoded = Buffer.from(raw, "base64");
    if (decoded.length !== 32) throw new Error("MASTER_KEY must decode to exactly 32 bytes (base64).");
    return decoded;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("MASTER_KEY must be set in production (32 bytes, base64). Generate: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"");
  }
  // Development-only deterministic fallback so local tooling runs without setup.
  return Buffer.alloc(32, "nightfall-dev-master-key");
})();

export type UserDek = Buffer;

function wrap(dek: UserDek): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", MASTER_KEY, nonce);
  const encrypted = Buffer.concat([cipher.update(dek), cipher.final()]);
  return Buffer.concat([nonce, encrypted, cipher.getAuthTag()]).toString("base64");
}

function unwrap(wrapped: string): UserDek | null {
  try {
    const blob = Buffer.from(wrapped, "base64");
    const nonce = blob.subarray(0, 12);
    const tag = blob.subarray(blob.length - 16);
    const ciphertext = blob.subarray(12, blob.length - 16);
    const decipher = createDecipheriv("aes-256-gcm", MASTER_KEY, nonce);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    return null;
  }
}

/** Fetches (creating on first use) a live, unwrapped DEK for the user. */
export async function getOrCreateUserDek(userId: number): Promise<UserDek | null> {
  const existing = await db.getUserKey(userId);
  if (existing) {
    if (existing.destroyedAt) return null; // shredded — data is gone by design
    return unwrap(existing.wrappedDek);
  }
  const dek = randomBytes(32);
  await db.createUserKey(userId, wrap(dek));
  return dek;
}

function seal(dek: UserDek, plaintext: string): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", dek, nonce);
  const encrypted = Buffer.concat([cipher.update(Buffer.from(plaintext, "utf8")), cipher.final()]);
  return `v1:${Buffer.concat([nonce, encrypted, cipher.getAuthTag()]).toString("base64")}`;
}

function open(dek: UserDek | null, sealed: string): string | null {
  if (!dek) return null;
  if (!sealed.startsWith("v1:")) return null;
  try {
    const blob = Buffer.from(sealed.slice(3), "base64");
    const nonce = blob.subarray(0, 12);
    const tag = blob.subarray(blob.length - 16);
    const ciphertext = blob.subarray(12, blob.length - 16);
    const decipher = createDecipheriv("aes-256-gcm", dek, nonce);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** Encrypts a secret under the user's DEK. Returns null when the key was shredded. */
export async function encryptForUser(userId: number, plaintext: string): Promise<string | null> {
  const dek = await getOrCreateUserDek(userId);
  if (!dek) return null;
  return seal(dek, plaintext);
}

/** Decrypts a user-secret. Returns null for shredded keys or foreign data. */
export async function decryptForUser(userId: number, sealed: string | null): Promise<string | null> {
  if (!sealed) return null;
  const existing = await db.getUserKey(userId);
  if (!existing || !sealed.startsWith("v1:")) return null;
  const dek = unwrap(existing.wrappedDek);
  if (!dek) return null;
  return open(dek, sealed);
}
