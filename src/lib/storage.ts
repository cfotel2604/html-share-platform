import {
  CreateBucketCommand, DeleteObjectsCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client,
} from "@aws-sdk/client-s3";
import { createHash } from "node:crypto";

const globalStore = globalThis as typeof globalThis & { __htmlShareS3?: S3Client };

export const bucket = process.env.STORAGE_BUCKET ?? "html-share-local";

export function storage() {
  if (!globalStore.__htmlShareS3) {
    globalStore.__htmlShareS3 = new S3Client({
      region: process.env.STORAGE_REGION ?? "us-east-1",
      endpoint: process.env.STORAGE_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY ?? "",
        secretAccessKey: process.env.STORAGE_SECRET_KEY ?? "",
      },
    });
  }
  return globalStore.__htmlShareS3;
}

export async function ensureBucket() {
  try {
    await storage().send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (error) {
    const code = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (code !== 404) throw error;
    try {
      await storage().send(new CreateBucketCommand({ Bucket: bucket }));
    } catch (createError) {
      const name = (createError as Error).name;
      if (!["BucketAlreadyExists", "BucketAlreadyOwnedByYou"].includes(name)) throw createError;
    }
  }
}

export async function storeFile(key: string, body: Buffer, type: string) {
  const result = await storage().send(new PutObjectCommand({
    Bucket: bucket, Key: key, Body: body, ContentType: type, IfNoneMatch: "*",
  }));
  return result.ETag;
}

export async function readbackFile(key: string, expected: { size: number; sha256: string; etag: string | undefined }) {
  if (!expected.etag || !/^"[a-zA-Z0-9-]{1,128}"$/.test(expected.etag)) throw new Error("Missing immutable object ETag");
  const result = await storage().send(new GetObjectCommand({ Bucket: bucket, Key: key, IfMatch: expected.etag }));
  const stream = result.Body as (AsyncIterable<Uint8Array> & { destroy?: () => void }) | undefined;
  try {
    if (!stream || result.ContentLength !== expected.size || result.ETag !== expected.etag) {
      throw new Error("Immutable object metadata mismatch");
    }
    const digest = createHash("sha256");
    let size = 0;
    for await (const chunk of stream) {
      size += chunk.length;
      if (size > expected.size) throw new Error("Immutable object readback exceeded size");
      digest.update(chunk);
    }
    if (size !== expected.size || digest.digest("hex") !== expected.sha256) throw new Error("Immutable object readback mismatch");
    return expected.etag.slice(1, -1);
  } finally { stream?.destroy?.(); }
}

export async function removeFiles(keys: string[]) {
  if (!keys.length) return;
  const result = await storage().send(new DeleteObjectsCommand({
    Bucket: bucket, Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
  }));
  // S3 may return HTTP 200 with per-object failures. Treat them as failed cleanup.
  if (result.Errors?.length) throw new Error("Không dọn được toàn bộ staging objects");
}
