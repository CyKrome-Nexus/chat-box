export const API_VERSION = "v1";

export const LIMITS = {
  nameMax: 64,
  aboutMax: 140,
  handleMin: 4,
  handleMax: 32,
  passwordMin: 8,
  passwordMax: 128,
  messageTextMax: 8000,
  attachmentsPerMessage: 10,
  groupNameMax: 64,
  groupDescriptionMax: 512,
  groupTagsMax: 5,
  groupTagMax: 24,
  groupMembersMax: 1024,
  pollOptionsMin: 2,
  pollOptionsMax: 12,
  pollQuestionMax: 300,
  pollOptionMax: 100,
  discoverBatchMax: 1000,
  pageSizeMax: 100,
  storyTextMax: 700,
  uploadBytesMax: 50 * 1024 * 1024,
  avatarBytesMax: 5 * 1024 * 1024,
} as const;

export const STORY_TTL_MS = 24 * 60 * 60 * 1000;
export const EDIT_WINDOW_MS = 15 * 60 * 1000;
export const DELETE_FOR_EVERYONE_WINDOW_MS = 48 * 60 * 60 * 1000;

export const ALLOWED_UPLOAD_MIME_PREFIXES = ["image/", "video/", "audio/"] as const;
export const ALLOWED_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/octet-stream",
  "application/x-tgsticker",
  "text/plain",
  "text/csv",
] as const;

export const isAllowedUploadMime = (mime: string): boolean =>
  ALLOWED_UPLOAD_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix)) ||
  (ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(mime);
