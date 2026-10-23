import { Types } from "mongoose";

import type { Visibility } from "@chatbox/shared";

import { Contact } from "@/models/misc";
import { User, type UserDoc } from "@/models/user";
import { presence } from "@/realtime/presence";

export const USER_PUBLIC_FIELDS = {
  name: 1,
  handle: 1,
  avatar: 1,
  about: 1,
  privacy: 1,
  lastSeenAt: 1,
  phone: 1,
  email: 1,
  blockedUserIds: 1,
  disabledAt: 1,
} as const;

export type LeanUser = Pick<
  UserDoc,
  | "_id"
  | "name"
  | "handle"
  | "avatar"
  | "about"
  | "privacy"
  | "lastSeenAt"
  | "phone"
  | "email"
  | "blockedUserIds"
  | "disabledAt"
>;

export interface ViewerContext {
  viewerId: string;
  // Users who saved the viewer as a contact; "contacts" visibility is evaluated from the owner's list.
  contactOf: Set<string>;
  myContacts: Set<string>;
  blockedByMe: Set<string>;
  online: Set<string>;
}

export const toObjectId = (id: string | Types.ObjectId): Types.ObjectId =>
  typeof id === "string" ? new Types.ObjectId(id) : id;

export const loadUsers = async (ids: Iterable<string | Types.ObjectId>): Promise<Map<string, LeanUser>> => {
  const unique = [...new Set([...ids].map(String))].map((id) => new Types.ObjectId(id));
  if (unique.length === 0) return new Map();
  const users = await User.find({ _id: { $in: unique } }, USER_PUBLIC_FIELDS).lean<LeanUser[]>();
  return new Map(users.map((user) => [user._id.toString(), user]));
};

export const buildViewerContext = async (
  viewerId: string,
  subjectIds: Iterable<string | Types.ObjectId>,
): Promise<ViewerContext> => {
  const ids = [...new Set([...subjectIds].map(String))].filter((id) => id !== viewerId);
  const viewer = toObjectId(viewerId);
  const [reverse, mine, me, online] = await Promise.all([
    ids.length
      ? Contact.find({ ownerId: { $in: ids.map(toObjectId) }, userId: viewer }, { ownerId: 1 }).lean()
      : Promise.resolve([]),
    ids.length
      ? Contact.find({ ownerId: viewer, userId: { $in: ids.map(toObjectId) } }, { userId: 1 }).lean()
      : Promise.resolve([]),
    User.findById(viewer, { blockedUserIds: 1 }).lean(),
    presence.onlineAmong(ids),
  ]);
  return {
    viewerId,
    contactOf: new Set(reverse.map((contact) => contact.ownerId.toString())),
    myContacts: new Set(mine.map((contact) => contact.userId.toString())),
    blockedByMe: new Set((me?.blockedUserIds ?? []).map(String)),
    online: new Set(online),
  };
};

export const canSee = (
  visibility: Visibility | undefined,
  ownerId: string,
  context: ViewerContext | null,
): boolean => {
  if (context && ownerId === context.viewerId) return true;
  if (!visibility || visibility === "everyone") return true;
  if (visibility === "nobody" || !context) return false;
  return context.contactOf.has(ownerId);
};
