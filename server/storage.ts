import { randomUUID } from "crypto";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let client: S3Client | null = null;

function safeKey(relKey: string): string {
  const normalized = relKey.replace(/^\/+/, "").replace(/\.\./g, "_");
  return normalized;
}

function storageConfig() {
  const bucket = process.env.S3_BUCKET?.trim();
  if (!bucket) throw new Error("S3_BUCKET must be configured for persistent uploads.");
  const endpoint = process.env.S3_ENDPOINT?.trim();
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  if (Boolean(accessKeyId) !== Boolean(secretAccessKey)) throw new Error("S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must be configured together.");
  return {
    bucket,
    clientConfig: {
      region: process.env.S3_REGION?.trim() || "auto",
      ...(endpoint ? { endpoint, forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true" } : {}),
      ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
    },
  };
}

export function isStorageConfigured() {
  const bucket = process.env.S3_BUCKET?.trim();
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  return Boolean(bucket) && Boolean(accessKeyId) === Boolean(secretAccessKey);
}

function getClient() {
  if (!client) client = new S3Client(storageConfig().clientConfig);
  return client;
}

export function resetStorageClientForTests() {
  client = null;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  _contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const hash = randomUUID().replace(/-/g, "").slice(0, 8);
  let key = safeKey(relKey);
  const lastDot = key.lastIndexOf(".");
  key = lastDot === -1 ? `${key}_${hash}` : `${key.slice(0, lastDot)}_${hash}${key.slice(lastDot)}`;
  const bytes = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
  const { bucket } = storageConfig();
  await getClient().send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes, ContentType: _contentType }));
  return { key, url: `/files/${key}` };
}

export async function storageRead(key: string): Promise<Buffer | null> {
  try {
    const { bucket } = storageConfig();
    const response = await getClient().send(new GetObjectCommand({ Bucket: bucket, Key: safeKey(key) }));
    if (!response.Body) return null;
    const bytes = await response.Body.transformToByteArray();
    return Buffer.from(bytes);
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status !== 404 && (error as { name?: string }).name !== "NoSuchKey") throw error;
    return null;
  }
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const { bucket } = storageConfig();
  return getSignedUrl(getClient(), new GetObjectCommand({ Bucket: bucket, Key: safeKey(relKey) }), { expiresIn: 5 * 60 });
}
