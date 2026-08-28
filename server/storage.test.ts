import { beforeEach, describe, expect, it, vi } from "vitest";

const aws = vi.hoisted(() => {
  const send = vi.fn();
  class S3Client {
    send = send;
    constructor(_config?: unknown) {}
  }
  class PutObjectCommand {
    constructor(readonly input: unknown) {}
  }
  class GetObjectCommand {
    constructor(readonly input: unknown) {}
  }
  return { send, S3Client, PutObjectCommand, GetObjectCommand };
});

const presigner = vi.hoisted(() => ({ getSignedUrl: vi.fn() }));

vi.mock("@aws-sdk/client-s3", () => aws);
vi.mock("@aws-sdk/s3-request-presigner", () => presigner);

import { resetStorageClientForTests, storageGetSignedUrl, storagePut } from "./storage";

describe("S3 private storage adapter", () => {
  beforeEach(() => {
    process.env.S3_BUCKET = "nightfall-private";
    process.env.S3_REGION = "eu-west-1";
    process.env.S3_ACCESS_KEY_ID = "test-key";
    process.env.S3_SECRET_ACCESS_KEY = "test-secret";
    delete process.env.S3_ENDPOINT;
    resetStorageClientForTests();
    aws.send.mockReset();
    presigner.getSignedUrl.mockReset();
  });

  it("writes a private object with a non-guessable filename suffix", async () => {
    aws.send.mockResolvedValue({});
    const result = await storagePut("students/7/transcript.pdf", Buffer.from("private"), "application/pdf");

    expect(result.key).toMatch(/^students\/7\/transcript_[a-f0-9]{8}\.pdf$/);
    expect(result.url).toBe(`/files/${result.key}`);
    expect(aws.send).toHaveBeenCalledWith(expect.objectContaining({
      input: expect.objectContaining({ Bucket: "nightfall-private", Key: result.key, ContentType: "application/pdf" }),
    }));
  });

  it("requests a short-lived object URL rather than exposing a bucket URL", async () => {
    presigner.getSignedUrl.mockResolvedValue("https://signed.example/object?expires=300");
    await expect(storageGetSignedUrl("students/7/transcript.pdf")).resolves.toBe("https://signed.example/object?expires=300");
    expect(presigner.getSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      input: { Bucket: "nightfall-private", Key: "students/7/transcript.pdf" },
    }), { expiresIn: 300 });
  });
});
