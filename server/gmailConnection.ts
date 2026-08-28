import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { google } from "googleapis";

const GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/gmail.readonly"] as const;
const STATE_TTL_MS = 10 * 60 * 1000;

export type GmailOAuthConfig = { clientId: string; clientSecret: string; tokenEncryptionKey: string };

export function isGmailConfigured() {
  return Boolean(process.env.GMAIL_CLIENT_ID?.trim() && process.env.GMAIL_CLIENT_SECRET?.trim() && (process.env.GMAIL_TOKEN_ENCRYPTION_KEY?.length ?? 0) >= 32);
}

export function getGmailOAuthConfig(): GmailOAuthConfig {
  const clientId = process.env.GMAIL_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.GMAIL_CLIENT_SECRET?.trim() ?? "";
  const tokenEncryptionKey = process.env.GMAIL_TOKEN_ENCRYPTION_KEY ?? "";
  if (!isGmailConfigured()) throw new Error("Gmail connection is not configured yet.");
  return { clientId, clientSecret, tokenEncryptionKey };
}

export function getGmailScopes() { return [...GMAIL_SCOPES]; }

function derivedKey(secret: string) { return createHash("sha256").update(secret).digest(); }

export function encryptGmailRefreshToken(token: string, secret = getGmailOAuthConfig().tokenEncryptionKey) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", derivedKey(secret), iv);
  const payload = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${authTag.toString("base64url")}.${payload.toString("base64url")}`;
}

export function decryptGmailRefreshToken(encrypted: string, secret = getGmailOAuthConfig().tokenEncryptionKey) {
  const [ivEncoded, authTagEncoded, payloadEncoded] = encrypted.split(".");
  if (!ivEncoded || !authTagEncoded || !payloadEncoded) throw new Error("Invalid encrypted Gmail token format.");
  const decipher = createDecipheriv("aes-256-gcm", derivedKey(secret), Buffer.from(ivEncoded, "base64url"));
  decipher.setAuthTag(Buffer.from(authTagEncoded, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(payloadEncoded, "base64url")), decipher.final()]).toString("utf8");
}

export function createGmailOAuthState(userId: number, now = Date.now(), secret = getGmailOAuthConfig().tokenEncryptionKey) {
  const nonce = randomBytes(18).toString("base64url");
  const payload = `${userId}.${now}.${nonce}`;
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function validateGmailOAuthState(state: string, userId: number, now = Date.now(), secret = getGmailOAuthConfig().tokenEncryptionKey) {
  const pieces = state.split(".");
  if (pieces.length !== 4) return false;
  const [stateUserId, issuedAt, nonce, signature] = pieces;
  if (!stateUserId || !issuedAt || !nonce || !signature || Number(stateUserId) !== userId || now - Number(issuedAt) > STATE_TTL_MS || Number(issuedAt) > now + 30_000) return false;
  const payload = `${stateUserId}.${issuedAt}.${nonce}`;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  return expected.length === signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function sendApprovedGmailMessage(input: { encryptedRefreshToken: string; to: string; subject: string; body: string; communicationId: number; threadId?: string | null }) {
  if (!/^\S+@\S+\.\S+$/.test(input.to)) throw new Error("A valid confirmed university email is required.");
  if (/[\r\n]/.test(input.subject) || /[\r\n]/.test(input.to)) throw new Error("Email headers contain an unsupported line break.");
  const config = getGmailOAuthConfig();
  const client = new google.auth.OAuth2(config.clientId, config.clientSecret);
  client.setCredentials({ refresh_token: decryptGmailRefreshToken(input.encryptedRefreshToken) });
  const raw = Buffer.from([
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    `Message-ID: <nightfall-${input.communicationId}-${randomBytes(8).toString("hex")}@nightfall.app>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    input.body,
  ].join("\r\n"), "utf8").toString("base64url");
  const sent = await google.gmail({ version: "v1", auth: client }).users.messages.send({ userId: "me", requestBody: { raw, threadId: input.threadId ?? undefined } });
  if (!sent.data.id) throw new Error("Gmail did not return a sent-message ID.");
  return { providerMessageId: sent.data.id, providerThreadId: sent.data.threadId ?? undefined };
}

function headerValue(headers: Array<{ name?: string | null; value?: string | null }> | undefined, key: string) {
  return headers?.find((header) => header.name?.toLowerCase() === key.toLowerCase())?.value ?? "";
}

function decodeBody(data?: string | null) {
  if (!data) return "";
  return Buffer.from(data, "base64url").toString("utf8");
}

function textFromPayload(payload: { mimeType?: string | null; body?: { data?: string | null }; parts?: Array<any> | null }): string {
  if (payload.mimeType?.startsWith("text/plain")) return decodeBody(payload.body?.data);
  for (const part of payload.parts ?? []) {
    const text = textFromPayload(part);
    if (text) return text;
  }
  return decodeBody(payload.body?.data);
}

function emailAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim().toLowerCase();
}

export async function readRecentUniversityGmailReplies(input: { encryptedRefreshToken: string; confirmedContactEmails: string[] }) {
  const config = getGmailOAuthConfig();
  const client = new google.auth.OAuth2(config.clientId, config.clientSecret);
  client.setCredentials({ refresh_token: decryptGmailRefreshToken(input.encryptedRefreshToken) });
  const gmail = google.gmail({ version: "v1", auth: client });
  const contactEmails = new Set(input.confirmedContactEmails.map((email) => email.trim().toLowerCase()));
  if (!contactEmails.size) return [];
  const listed = await gmail.users.messages.list({ userId: "me", q: "in:inbox newer_than:30d", maxResults: 40 });
  const messages = [] as Array<{ providerMessageId: string; providerThreadId?: string; from: string; subject: string; body: string; receivedAt: Date }>;
  for (const stub of listed.data.messages ?? []) {
    if (!stub.id) continue;
    const message = await gmail.users.messages.get({ userId: "me", id: stub.id, format: "full" });
    const from = emailAddress(headerValue(message.data.payload?.headers, "From"));
    if (!contactEmails.has(from)) continue;
    const body = textFromPayload(message.data.payload as any).trim().slice(0, 8000);
    messages.push({ providerMessageId: stub.id, providerThreadId: message.data.threadId ?? undefined, from, subject: headerValue(message.data.payload?.headers, "Subject") || "University reply", body: body || "(No plain-text body was available.)", receivedAt: new Date(Number(message.data.internalDate ?? Date.now())) });
  }
  return messages;
}
