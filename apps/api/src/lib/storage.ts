import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

import { env } from "@/config/env";

export interface StorageDriver {
  put(key: string, body: Readable, mimeType: string): Promise<void>;
  remove(key: string): Promise<void>;
  publicUrl(key: string): string;
  read?(key: string): Promise<{ stream: Readable; size: number } | null>;
}

const safeKey = (key: string): string => {
  if (!/^[a-z0-9/_.-]+$/i.test(key) || key.includes("..")) throw new Error("Invalid storage key");
  return key;
};

const createLocalDriver = (): StorageDriver => {
  const root = path.resolve(env.UPLOAD_DIR);
  const resolve = (key: string) => path.join(root, safeKey(key));
  return {
    async put(key, body) {
      const target = resolve(key);
      await mkdir(path.dirname(target), { recursive: true });
      await pipeline(body, createWriteStream(target, { flags: "wx" }));
    },
    async remove(key) {
      await rm(resolve(key), { force: true });
    },
    publicUrl: (key) => `${env.PUBLIC_API_URL.replace(/\/$/, "")}/files/${key}`,
    async read(key) {
      const target = resolve(key);
      const info = await stat(target).catch(() => null);
      if (!info?.isFile()) return null;
      return { stream: createReadStream(target), size: info.size };
    },
  };
};

const createS3Driver = (): StorageDriver => {
  const client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID ?? "", secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? "" },
  });
  const bucket = env.S3_BUCKET ?? "";
  return {
    async put(key, body, mimeType) {
      await new Upload({
        client,
        params: {
          Bucket: bucket,
          Key: safeKey(key),
          Body: body,
          ContentType: mimeType,
          CacheControl: "public, max-age=31536000, immutable",
        },
      }).done();
    },
    async remove(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: safeKey(key) }));
    },
    publicUrl: (key) => `${(env.S3_PUBLIC_URL ?? "").replace(/\/$/, "")}/${key}`,
  };
};

export const storage: StorageDriver = env.STORAGE_DRIVER === "s3" ? createS3Driver() : createLocalDriver();
