import type {
  Contact as ContactDto,
  CurrentUser,
  DiscoverInput,
  DiscoverMatch,
  PublicUser,
  UpdatePrivacyInput,
  UpdateProfileInput,
} from "@chatbox/shared";

import { conflict, notFound, badRequest } from "@/lib/errors";
import { buildViewerContext, loadUsers, toObjectId, USER_PUBLIC_FIELDS, type LeanUser } from "@/lib/viewer";
import { Contact } from "@/models/misc";
import { User } from "@/models/user";
import { toCurrentUser, toPublicUser } from "@/serializers/users";

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getMe = async (userId: string): Promise<CurrentUser> => {
  const user = await User.findById(userId).select("+passwordHash");
  if (!user || user.disabledAt) throw notFound("User");
  return toCurrentUser(user);
};

export const updateMe = async (userId: string, input: UpdateProfileInput): Promise<CurrentUser> => {
  const user = await User.findById(userId).select("+passwordHash");
  if (!user) throw notFound("User");

  if (input.handle !== undefined && input.handle !== user.handle) {
    if (input.handle && (await User.exists({ handle: input.handle, _id: { $ne: user._id } }))) {
      throw conflict("That username is already taken", "HANDLE_TAKEN");
    }
    user.handle = input.handle;
  }
  if (input.phone !== undefined && input.phone !== user.phone) {
    if (await User.exists({ phone: input.phone, _id: { $ne: user._id } }))
      throw conflict("That phone number is already in use", "PHONE_TAKEN");
    user.phone = input.phone;
  }
  if (input.name !== undefined) user.name = input.name;
  if (input.about !== undefined) user.about = input.about;

  await user.save();
  return toCurrentUser(user);
};

export const updatePrivacy = async (userId: string, input: UpdatePrivacyInput): Promise<CurrentUser> => {
  const set = Object.fromEntries(Object.entries(input).map(([key, value]) => [`privacy.${key}`, value]));
  const user = await User.findByIdAndUpdate(userId, { $set: set }, { new: true }).select("+passwordHash");
  if (!user) throw notFound("User");
  return toCurrentUser(user);
};

export const isHandleAvailable = async (handle: string, userId: string): Promise<boolean> =>
  !(await User.exists({ handle, _id: { $ne: toObjectId(userId) } }));

const visibleUsers = async (viewerId: string, users: LeanUser[]): Promise<PublicUser[]> => {
  const context = await buildViewerContext(
    viewerId,
    users.map((user) => user._id),
  );
  return users
    .filter((user) => !user.blockedUserIds?.some((id) => id.toString() === viewerId))
    .map((user) => toPublicUser(user, context));
};

export const searchUsers = async (viewerId: string, query: string, limit: number): Promise<PublicUser[]> => {
  const term = query.replace(/^@/, "");
  const pattern = new RegExp(`^${escapeRegex(term)}`, "i");
  const filter = query.startsWith("@")
    ? { handle: pattern }
    : { $or: [{ handle: pattern }, { name: new RegExp(escapeRegex(term), "i") }] };
  const users = await User.find(
    { ...filter, _id: { $ne: toObjectId(viewerId) }, disabledAt: null },
    USER_PUBLIC_FIELDS,
  )
    .limit(limit)
    .lean<LeanUser[]>();
  return visibleUsers(viewerId, users);
};

export const getUser = async (viewerId: string, userId: string): Promise<PublicUser> => {
  const users = await loadUsers([userId]);
  const user = users.get(userId);
  if (!user || user.disabledAt) throw notFound("User");
  const [visible] = await visibleUsers(viewerId, [user]);
  if (!visible) throw notFound("User");
  return visible;
};

export const getUserByHandle = async (viewerId: string, handle: string): Promise<PublicUser> => {
  const user = await User.findOne(
    { handle: handle.toLowerCase(), disabledAt: null },
    USER_PUBLIC_FIELDS,
  ).lean<LeanUser>();
  if (!user) throw notFound("User");
  const [visible] = await visibleUsers(viewerId, [user]);
  if (!visible) throw notFound("User");
  return visible;
};

export const discover = async (viewerId: string, input: DiscoverInput): Promise<DiscoverMatch[]> => {
  const phones = [
    ...new Set(
      input.phones
        .map((phone) => phone.replace(/[\s()-]/g, ""))
        .filter((phone) => /^\+[1-9]\d{7,14}$/.test(phone)),
    ),
  ];
  const emails = [
    ...new Set(input.emails.map((email) => email.toLowerCase()).filter((email) => email.includes("@"))),
  ];
  if (phones.length === 0 && emails.length === 0) return [];

  const users = await User.find(
    {
      _id: { $ne: toObjectId(viewerId) },
      disabledAt: null,
      $or: [
        { phone: { $in: phones }, "privacy.discoverableByPhone": { $ne: false } },
        { email: { $in: emails }, "privacy.discoverableByEmail": { $ne: false } },
      ],
    },
    USER_PUBLIC_FIELDS,
  ).lean<LeanUser[]>();

  const visible = new Map((await visibleUsers(viewerId, users)).map((user) => [user.id, user]));
  return users.flatMap((user) => {
    const dto = visible.get(user._id.toString());
    if (!dto) return [];
    const byPhone = user.phone && phones.includes(user.phone);
    return [
      {
        user: dto,
        matchedBy: byPhone ? "phone" : "email",
        value: (byPhone ? user.phone : user.email) ?? "",
      } satisfies DiscoverMatch,
    ];
  });
};

export const setBlocked = async (viewerId: string, userId: string, blocked: boolean): Promise<void> => {
  if (viewerId === userId) throw badRequest("You can't block yourself");
  if (!(await User.exists({ _id: userId }))) throw notFound("User");
  await User.updateOne(
    { _id: viewerId },
    blocked
      ? { $addToSet: { blockedUserIds: toObjectId(userId) } }
      : { $pull: { blockedUserIds: toObjectId(userId) } },
  );
};

export const listBlocked = async (viewerId: string): Promise<PublicUser[]> => {
  const me = await User.findById(viewerId, { blockedUserIds: 1 }).lean();
  const users = await loadUsers(me?.blockedUserIds ?? []);
  const context = await buildViewerContext(viewerId, users.keys());
  return [...users.values()].map((user) => toPublicUser(user, context));
};

export const listContacts = async (viewerId: string): Promise<ContactDto[]> => {
  const contacts = await Contact.find({ ownerId: toObjectId(viewerId) })
    .sort({ createdAt: -1 })
    .lean();
  const users = await loadUsers(contacts.map((contact) => contact.userId));
  const context = await buildViewerContext(viewerId, users.keys());
  return contacts.flatMap((contact) => {
    const user = users.get(contact.userId.toString());
    if (!user || user.disabledAt) return [];
    return [
      {
        user: toPublicUser(user, context),
        nickname: contact.nickname ?? null,
        addedAt: contact.createdAt.toISOString(),
      },
    ];
  });
};

export const addContact = async (
  viewerId: string,
  userId: string,
  nickname?: string,
): Promise<ContactDto> => {
  if (viewerId === userId) throw badRequest("You can't add yourself");
  const users = await loadUsers([userId]);
  const user = users.get(userId);
  if (!user || user.disabledAt) throw notFound("User");
  const contact = await Contact.findOneAndUpdate(
    { ownerId: toObjectId(viewerId), userId: toObjectId(userId) },
    { $set: { nickname: nickname ?? null }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true, new: true },
  ).lean();
  const context = await buildViewerContext(viewerId, [userId]);
  return {
    user: toPublicUser(user, context),
    nickname: contact?.nickname ?? null,
    addedAt: (contact?.createdAt ?? new Date()).toISOString(),
  };
};

export const removeContact = async (viewerId: string, userId: string): Promise<void> => {
  await Contact.deleteOne({ ownerId: toObjectId(viewerId), userId: toObjectId(userId) });
};
