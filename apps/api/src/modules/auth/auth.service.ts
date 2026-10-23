import { Types } from "mongoose";

import type {
  AuthResponse,
  AuthTokens,
  ChangePasswordInput,
  RegisterInput,
  SessionInfo,
  SocialLoginInput,
} from "@chatbox/shared";

import { env } from "@/config/env";
import { randomDigits, randomToken, sha256, safeEqual } from "@/lib/crypto";
import { AppError, badRequest, conflict, forbidden, unauthorized } from "@/lib/errors";
import { sendOtpEmail } from "@/lib/mailer";
import { hashPassword, verifyPassword } from "@/lib/password";
import { verifySocialToken } from "@/lib/social";
import { signAccessToken } from "@/lib/tokens";
import { Conversation } from "@/models/conversation";
import { Contact, Device, EmailVerification, PasswordReset } from "@/models/misc";
import { Session } from "@/models/session";
import { User, type UserDoc } from "@/models/user";
import { hub } from "@/realtime/hub";
import { toCurrentUser } from "@/serializers/users";

export interface ClientMeta {
  ip: string;
  userAgent: string | null;
  deviceName?: string | undefined;
  platform?: string | undefined;
}

const CODE_TTL_MINUTES = 10;
const CODE_MAX_ATTEMPTS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

const isAdminEmail = (email: string | null | undefined) =>
  Boolean(email && env.ADMIN_EMAILS.map((item) => item.toLowerCase()).includes(email.toLowerCase()));

const findByIdentifier = (identifier: string) => {
  if (identifier.includes("@")) return User.findOne({ email: identifier });
  if (/^\+?\d{6,}$/.test(identifier))
    return User.findOne({ phone: identifier.startsWith("+") ? identifier : `+${identifier}` });
  return User.findOne({ handle: identifier.toLowerCase() });
};

const issueSession = async (user: UserDoc, meta: ClientMeta): Promise<AuthTokens & { sessionId: string }> => {
  const refreshToken = randomToken(48);
  const refreshExpiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * DAY_MS);
  const session = await Session.create({
    userId: user._id,
    tokenHash: sha256(refreshToken),
    deviceName: meta.deviceName ?? null,
    platform: meta.platform ?? null,
    userAgent: meta.userAgent?.slice(0, 256) ?? null,
    ip: meta.ip,
    expiresAt: refreshExpiresAt,
    lastUsedAt: new Date(),
  });
  const access = await signAccessToken({
    userId: user._id.toString(),
    sessionId: session._id.toString(),
    role: user.role,
  });
  return {
    sessionId: session._id.toString(),
    accessToken: access.token,
    accessTokenExpiresAt: access.expiresAt.toISOString(),
    refreshToken,
    refreshTokenExpiresAt: refreshExpiresAt.toISOString(),
  };
};

const respond = async (user: UserDoc, meta: ClientMeta): Promise<AuthResponse & { sessionId: string }> => {
  const { sessionId, ...tokens } = await issueSession(user, meta);
  const withPassword = await User.findById(user._id).select("+passwordHash");
  return { user: toCurrentUser(withPassword ?? user), tokens, sessionId };
};

const assertActive = <T extends UserDoc>(user: T | null): T => {
  if (!user) throw unauthorized("Incorrect email/phone or password");
  if (user.disabledAt) throw forbidden("This account has been disabled");
  return user;
};

const emailTaken = () => conflict("An account with this email already exists", "EMAIL_TAKEN");

export const requestEmailCode = async (email: string, log: (message: string) => void) => {
  if (await User.exists({ email })) throw emailTaken();
  const code = randomDigits(6);
  await EmailVerification.findOneAndUpdate(
    { email },
    {
      codeHash: sha256(`${email}:${code}`),
      attempts: 0,
      expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60_000),
    },
    { upsert: true },
  );
  await sendOtpEmail(email, code, "verify-email", CODE_TTL_MINUTES, log);
};

const consumeEmailCode = async (email: string, code: string | undefined) => {
  if (!code) throw new AppError(400, "EMAIL_CODE_REQUIRED", "Enter the code we emailed you");
  const invalid = badRequest("That code is incorrect or has expired");
  const pending = await EmailVerification.findOne({ email });
  if (!pending || pending.expiresAt.getTime() < Date.now() || pending.attempts >= CODE_MAX_ATTEMPTS)
    throw invalid;
  if (!safeEqual(pending.codeHash, sha256(`${email}:${code}`))) {
    pending.attempts += 1;
    await pending.save();
    throw invalid;
  }
  await pending.deleteOne();
};

export const register = async (input: RegisterInput, meta: ClientMeta) => {
  const [emailExists, phoneTaken] = await Promise.all([
    input.email ? User.exists({ email: input.email }) : null,
    input.phone ? User.exists({ phone: input.phone }) : null,
  ]);
  if (emailExists) throw emailTaken();
  if (phoneTaken) throw conflict("An account with this phone number already exists", "PHONE_TAKEN");
  if (input.email) await consumeEmailCode(input.email, input.code);

  const user = await User.create({
    name: input.name,
    email: input.email ?? null,
    phone: input.phone ?? null,
    passwordHash: await hashPassword(input.password),
    role: isAdminEmail(input.email) ? "admin" : "user",
  });
  return respond(user, meta);
};

export const login = async (identifier: string, password: string, meta: ClientMeta) => {
  const user = await findByIdentifier(identifier).select("+passwordHash");
  const valid = await verifyPassword(user?.passwordHash, password);
  if (!valid) throw unauthorized("Incorrect email/phone or password");
  const active = assertActive(user);
  if (isAdminEmail(active.email) && active.role !== "admin") {
    active.role = "admin";
    await active.save();
  }
  return respond(active, meta);
};

export const socialLogin = async (input: SocialLoginInput, meta: ClientMeta) => {
  const profile = await verifySocialToken(input.provider, input.token);
  let user = await User.findOne({
    providers: { $elemMatch: { provider: profile.provider, providerId: profile.providerId } },
  });

  if (!user && profile.email && profile.emailVerified) {
    user = await User.findOne({ email: profile.email });
    if (user) {
      user.providers.push({ provider: profile.provider, providerId: profile.providerId });
      await user.save();
    }
  }

  user ??= await User.create({
    name: input.name ?? profile.name ?? "Chatbox user",
    email: profile.email && profile.emailVerified ? profile.email : null,
    avatar: profile.avatarUrl ? { key: "", url: profile.avatarUrl } : null,
    providers: [{ provider: profile.provider, providerId: profile.providerId }],
    role: profile.emailVerified && isAdminEmail(profile.email) ? "admin" : "user",
  });

  return respond(assertActive(user), meta);
};

export const refresh = async (refreshToken: string) => {
  const tokenHash = sha256(refreshToken);
  const session = await Session.findOne({ tokenHash });

  if (!session) {
    // A rotated token being replayed means it leaked: kill the whole session.
    const replayed = await Session.findOneAndUpdate(
      { previousTokenHash: tokenHash },
      { revokedAt: new Date() },
    );
    if (replayed) hub.disconnectSession(replayed._id.toString());
    throw unauthorized("Session expired, please sign in again");
  }
  if (session.revokedAt || session.expiresAt.getTime() < Date.now())
    throw unauthorized("Session expired, please sign in again");

  const user = await User.findById(session.userId);
  if (!user || user.disabledAt) {
    session.revokedAt = new Date();
    await session.save();
    throw unauthorized("Session expired, please sign in again");
  }

  const nextToken = randomToken(48);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * DAY_MS);
  session.previousTokenHash = tokenHash;
  session.tokenHash = sha256(nextToken);
  session.lastUsedAt = new Date();
  session.expiresAt = expiresAt;
  await session.save();

  const access = await signAccessToken({
    userId: user._id.toString(),
    sessionId: session._id.toString(),
    role: user.role,
  });
  const tokens: AuthTokens = {
    accessToken: access.token,
    accessTokenExpiresAt: access.expiresAt.toISOString(),
    refreshToken: nextToken,
    refreshTokenExpiresAt: expiresAt.toISOString(),
  };
  return tokens;
};

export const revokeSession = async (sessionId: string, userId?: string) => {
  const filter = userId ? { _id: sessionId, userId } : { _id: sessionId };
  const session = await Session.findOneAndUpdate(filter, { revokedAt: new Date() });
  if (!session) return false;
  await Device.deleteMany({ sessionId: session._id });
  hub.toSession(sessionId, "session:revoked");
  hub.disconnectSession(sessionId);
  return true;
};

export const revokeAllSessions = async (userId: string, exceptSessionId?: string) => {
  const sessions = await Session.find(
    { userId, revokedAt: null, ...(exceptSessionId ? { _id: { $ne: exceptSessionId } } : {}) },
    { _id: 1 },
  );
  await Promise.all(sessions.map((session) => revokeSession(session._id.toString())));
};

export const listSessions = async (userId: string, currentSessionId: string): Promise<SessionInfo[]> => {
  const sessions = await Session.find({ userId, revokedAt: null, expiresAt: { $gt: new Date() } })
    .sort({ lastUsedAt: -1 })
    .lean();
  return sessions.map((session) => ({
    id: session._id.toString(),
    deviceName: session.deviceName ?? null,
    platform: session.platform ?? null,
    createdAt: session.createdAt.toISOString(),
    lastUsedAt: session.lastUsedAt.toISOString(),
    current: session._id.toString() === currentSessionId,
  }));
};

export const requestPasswordReset = async (identifier: string, log: (message: string) => void) => {
  const user = await findByIdentifier(identifier);
  if (!user || user.disabledAt) return;

  const code = randomDigits(6);
  await PasswordReset.findOneAndUpdate(
    { userId: user._id },
    {
      codeHash: sha256(`${user._id.toString()}:${code}`),
      attempts: 0,
      expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60_000),
    },
    { upsert: true },
  );

  if (user.email) await sendOtpEmail(user.email, code, "reset-password", CODE_TTL_MINUTES, log);
};

export const resetPassword = async (identifier: string, code: string, password: string) => {
  const user = await findByIdentifier(identifier);
  const invalid = badRequest("That code is incorrect or has expired");
  if (!user) throw invalid;

  const reset = await PasswordReset.findOne({ userId: user._id });
  if (!reset || reset.expiresAt.getTime() < Date.now() || reset.attempts >= CODE_MAX_ATTEMPTS) throw invalid;
  if (!safeEqual(reset.codeHash, sha256(`${user._id.toString()}:${code}`))) {
    reset.attempts += 1;
    await reset.save();
    throw invalid;
  }

  user.passwordHash = await hashPassword(password);
  await user.save();
  await reset.deleteOne();
  await revokeAllSessions(user._id.toString());
};

export const changePassword = async (userId: string, sessionId: string, input: ChangePasswordInput) => {
  const user = await User.findById(userId).select("+passwordHash");
  if (!user) throw unauthorized();
  if (user.passwordHash && !(await verifyPassword(user.passwordHash, input.currentPassword ?? ""))) {
    throw new AppError(400, "INVALID_PASSWORD", "Your current password is incorrect");
  }
  user.passwordHash = await hashPassword(input.newPassword);
  await user.save();
  await revokeAllSessions(userId, sessionId);
};

export const deleteAccount = async (userId: string, password?: string) => {
  const user = await User.findById(userId).select("+passwordHash");
  if (!user) throw unauthorized();
  if (user.passwordHash && !(await verifyPassword(user.passwordHash, password ?? ""))) {
    throw new AppError(400, "INVALID_PASSWORD", "Your password is incorrect");
  }
  const id = new Types.ObjectId(userId);
  await Promise.all([
    User.updateOne(
      { _id: id },
      {
        $set: { name: "Deleted account", disabledAt: new Date(), providers: [], blockedUserIds: [] },
        $unset: { email: 1, phone: 1, handle: 1, avatar: 1, about: 1, passwordHash: 1 },
      },
    ),
    Contact.deleteMany({ $or: [{ ownerId: id }, { userId: id }] }),
    Conversation.updateMany({ type: "group" }, { $pull: { members: { userId: id } } }),
  ]);
  await revokeAllSessions(userId);
  hub.disconnectUser(userId);
};
