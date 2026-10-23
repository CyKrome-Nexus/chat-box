import { PassThrough, Transform } from "node:stream";

import type { MultipartFile } from "@fastify/multipart";
import { fileTypeStream } from "file-type/node";
import { nanoid } from "nanoid";

import { isAllowedUploadMime, LIMITS, type CurrentUser, type MediaUpload } from "@chatbox/shared";

import { badRequest, notFound, tooLarge } from "@/lib/errors";
import { storage } from "@/lib/storage";
import { toObjectId } from "@/lib/viewer";
import { Media } from "@/models/misc";
import { User } from "@/models/user";
import { toCurrentUser } from "@/serializers/users";

type Purpose = "media" | "avatars";

const INLINE_PREFIXES = ["image/", "video/", "audio/"];

export const isInlineMime = (mime: string) =>
  INLINE_PREFIXES.some((prefix) => mime.startsWith(prefix)) && mime !== "image/svg+xml";

const extensionFor = (mime: string, filename: string | undefined, detectedExt: string | undefined) => {
  if (detectedExt) return detectedExt;
  const fromName = filename?.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{1,8}$/.test(fromName)) return fromName;
  return mime === "text/plain" ? "txt" : "bin";
};

const storeFile = async (
  ownerId: string,
  file: MultipartFile | undefined,
  options: { purpose: Purpose; maxBytes: number; imagesOnly?: boolean },
): Promise<{ key: string; url: string; mimeType: string; size: number }> => {
  if (!file) throw badRequest("Attach a file in the 'file' field");

  const sniffed = await fileTypeStream(file.file);
  const detected = sniffed.fileType;
  const declared = file.mimetype.toLowerCase();

  let mimeType: string;
  if (detected) {
    mimeType = detected.mime;
  } else if (INLINE_PREFIXES.some((prefix) => declared.startsWith(prefix))) {
    throw badRequest("The file content doesn't match its type");
  } else {
    mimeType = declared;
  }

  if (!isAllowedUploadMime(mimeType) || mimeType === "image/svg+xml")
    throw badRequest(`Files of type ${mimeType} aren't allowed`);
  if (options.imagesOnly && !mimeType.startsWith("image/")) throw badRequest("Upload an image");

  const now = new Date();
  const key = `${options.purpose}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${nanoid(24)}.${extensionFor(mimeType, file.filename, detected?.ext)}`;

  let size = 0;
  const counter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      size += chunk.length;
      if (size > options.maxBytes)
        callback(tooLarge(`Files must be under ${Math.round(options.maxBytes / 1024 / 1024)} MB`));
      else callback(null, chunk);
    },
  });

  try {
    await storage.put(key, sniffed.pipe(counter).pipe(new PassThrough()), mimeType);
  } catch (error) {
    await storage.remove(key).catch(() => undefined);
    throw error;
  }
  if (file.file.truncated) {
    await storage.remove(key).catch(() => undefined);
    throw tooLarge(`Files must be under ${Math.round(options.maxBytes / 1024 / 1024)} MB`);
  }

  const stored = { key, url: storage.publicUrl(key), mimeType, size };
  await Media.create({ ownerId: toObjectId(ownerId), ...stored });
  return stored;
};

export const uploadMedia = (ownerId: string, file: MultipartFile | undefined): Promise<MediaUpload> =>
  storeFile(ownerId, file, { purpose: "media", maxBytes: LIMITS.uploadBytesMax });

export const uploadAvatar = async (userId: string, file: MultipartFile | undefined): Promise<CurrentUser> => {
  const stored = await storeFile(userId, file, {
    purpose: "avatars",
    maxBytes: LIMITS.avatarBytesMax,
    imagesOnly: true,
  });
  const user = await User.findById(userId).select("+passwordHash");
  if (!user) throw notFound("User");
  const previous = user.avatar?.key;
  user.avatar = { key: stored.key, url: stored.url };
  await user.save();
  if (previous) await removeStoredFile(previous);
  return toCurrentUser(user);
};

export const uploadImage = async (
  ownerId: string,
  file: MultipartFile | undefined,
): Promise<{ key: string; url: string }> => {
  const stored = await storeFile(ownerId, file, {
    purpose: "avatars",
    maxBytes: LIMITS.avatarBytesMax,
    imagesOnly: true,
  });
  return { key: stored.key, url: stored.url };
};

export const removeStoredFile = async (key: string): Promise<void> => {
  await Promise.all([storage.remove(key).catch(() => undefined), Media.deleteOne({ key })]);
};

// Attachments must reference files the sender uploaded themselves.
export const resolveOwnedMedia = async (ownerId: string, keys: string[]) => {
  if (keys.length === 0) return new Map<string, { url: string; mimeType: string; size: number }>();
  const media = await Media.find({ ownerId: toObjectId(ownerId), key: { $in: keys } }).lean();
  if (media.length !== new Set(keys).size)
    throw badRequest("One or more attachments were not uploaded by you");
  return new Map(
    media.map((item) => [item.key, { url: item.url, mimeType: item.mimeType, size: item.size }]),
  );
};
