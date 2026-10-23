import type { CurrentUser, PublicUser, UserSummary } from "@chatbox/shared";

import type { UserDoc } from "@/models/user";
import { canSee, type LeanUser, type ViewerContext } from "@/lib/viewer";

const DELETED_USER: UserSummary = { id: "", name: "Deleted account", handle: null, avatarUrl: null };

export const toCurrentUser = (user: UserDoc & { passwordHash?: string | null }): CurrentUser => ({
  id: user._id.toString(),
  name: user.name,
  handle: user.handle ?? null,
  avatarUrl: user.avatar?.url ?? null,
  about: user.about ?? null,
  email: user.email ?? null,
  phone: user.phone ?? null,
  role: user.role,
  privacy: {
    lastSeen: user.privacy?.lastSeen ?? "everyone",
    profilePhoto: user.privacy?.profilePhoto ?? "everyone",
    about: user.privacy?.about ?? "everyone",
    readReceipts: user.privacy?.readReceipts ?? true,
    discoverableByPhone: user.privacy?.discoverableByPhone ?? true,
    discoverableByEmail: user.privacy?.discoverableByEmail ?? true,
  },
  hasPassword: Boolean(user.passwordHash),
  providers: user.providers.map((provider) => provider.provider),
  createdAt: user.createdAt.toISOString(),
});

export const toUserSummary = (user: LeanUser | undefined, context: ViewerContext | null): UserSummary => {
  if (!user || user.disabledAt) return { ...DELETED_USER, id: user?._id.toString() ?? "" };
  const id = user._id.toString();
  return {
    id,
    name: user.name,
    handle: user.handle ?? null,
    avatarUrl: canSee(user.privacy?.profilePhoto, id, context) ? (user.avatar?.url ?? null) : null,
  };
};

export const toPublicUser = (user: LeanUser, context: ViewerContext): PublicUser => {
  const id = user._id.toString();
  const isContact = context.myContacts.has(id);
  const blockedMe = user.blockedUserIds?.some((blocked) => blocked.toString() === context.viewerId) ?? false;
  const showLastSeen = !blockedMe && canSee(user.privacy?.lastSeen, id, context);
  return {
    ...toUserSummary(user, context),
    about: canSee(user.privacy?.about, id, context) ? (user.about ?? null) : null,
    lastSeenAt: showLastSeen ? (user.lastSeenAt?.toISOString() ?? null) : null,
    online: showLastSeen && context.online.has(id),
    isContact,
    isBlocked: context.blockedByMe.has(id),
    phone: isContact || id === context.viewerId ? (user.phone ?? null) : null,
    email: isContact || id === context.viewerId ? (user.email ?? null) : null,
  };
};
