import {
  CreateBucketCommand, DeleteObjectsCommand, HeadBucketCommand, PutObjectCommand, S3Client,
} from "@aws-sdk/client-s3";

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
  await storage().send(new PutObjectCommand({
    Bucket: bucket, Key: key, Body: body, ContentType: type,
  }));
}

export async function removeFiles(keys: string[]) {
  if (!keys.length) return;
  const result = await storage().send(new DeleteObjectsCommand({
    Bucket: bucket, Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
  }));
  // S3 may return HTTP 200 with per-object failures. Treat them as failed cleanup.
  if (result.Errors?.length) throw new Error("Không dọn được toàn bộ staging objects");
}
