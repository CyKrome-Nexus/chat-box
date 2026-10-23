import type { SocialProvider } from "./schemas/auth";
import type { GroupSettings, MemberRole } from "./schemas/conversations";
import type { AttachmentKind, MessageKind } from "./schemas/messages";
import type { CallType } from "./schemas/misc";
import type { Visibility } from "./schemas/users";

export type ISODateString = string;

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface UserSummary {
  id: string;
  name: string;
  handle: string | null;
  avatarUrl: string | null;
}

export interface PublicUser extends UserSummary {
  about: string | null;
  lastSeenAt: ISODateString | null;
  online: boolean;
  isContact: boolean;
  isBlocked: boolean;
  phone: string | null;
  email: string | null;
}

export interface PrivacySettings {
  lastSeen: Visibility;
  profilePhoto: Visibility;
  about: Visibility;
  readReceipts: boolean;
  discoverableByPhone: boolean;
  discoverableByEmail: boolean;
}

export type UserRole = "user" | "admin";

export interface CurrentUser extends UserSummary {
  about: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  privacy: PrivacySettings;
  hasPassword: boolean;
  providers: SocialProvider[];
  createdAt: ISODateString;
}

export interface AuthTokens {
  accessToken: string;
  accessTokenExpiresAt: ISODateString;
  refreshToken: string;
  refreshTokenExpiresAt: ISODateString;
}

export interface AuthResponse {
  user: CurrentUser;
  tokens: AuthTokens;
}

export interface SessionInfo {
  id: string;
  deviceName: string | null;
  platform: string | null;
  createdAt: ISODateString;
  lastUsedAt: ISODateString;
  current: boolean;
}

export interface Contact {
  user: PublicUser;
  nickname: string | null;
  addedAt: ISODateString;
}

export interface DiscoverMatch {
  user: PublicUser;
  matchedBy: "phone" | "email";
  value: string;
}

export interface MediaUpload {
  key: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface Attachment {
  kind: AttachmentKind;
  key: string;
  url: string;
  name: string | null;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  waveform: number[] | null;
  viewOnce: boolean;
}

export interface MessageLocation {
  latitude: number;
  longitude: number;
  label: string | null;
}

export interface SharedContact {
  name: string;
  phone: string | null;
  email: string | null;
  userId: string | null;
}

export interface PollOption {
  id: string;
  text: string;
  description: string | null;
  voterIds: string[];
}

export interface Poll {
  question: string;
  options: PollOption[];
  allowMultiple: boolean;
  closedAt: ISODateString | null;
}

export interface Reaction {
  emoji: string;
  userIds: string[];
}

export interface ReplyPreview {
  id: string;
  senderId: string | null;
  senderName: string | null;
  kind: MessageKind;
  text: string | null;
}

export interface Message {
  id: string;
  clientId: string | null;
  conversationId: string;
  sender: UserSummary | null;
  kind: MessageKind;
  text: string | null;
  attachments: Attachment[];
  location: MessageLocation | null;
  contact: SharedContact | null;
  poll: Poll | null;
  sticker: { id: string; emoji: string | null } | null;
  replyTo: ReplyPreview | null;
  reactions: Reaction[];
  editedAt: ISODateString | null;
  deletedAt: ISODateString | null;
  expiresAt: ISODateString | null;
  createdAt: ISODateString;
}

export interface MessagePreview {
  id: string;
  senderId: string | null;
  senderName: string | null;
  kind: MessageKind;
  text: string | null;
  deleted: boolean;
  createdAt: ISODateString;
}

export interface ConversationMember {
  user: UserSummary;
  role: MemberRole;
  joinedAt: ISODateString;
  lastReadMessageId: string | null;
  lastReadAt: ISODateString | null;
  lastDeliveredAt: ISODateString | null;
}

export type ConversationType = "direct" | "group";

export interface Conversation {
  id: string;
  type: ConversationType;
  name: string | null;
  description: string | null;
  avatarUrl: string | null;
  tags: string[];
  members: ConversationMember[];
  settings: GroupSettings;
  inviteCode: string | null;
  disappearingSeconds: number | null;
  lastMessage: MessagePreview | null;
  unreadCount: number;
  mutedUntil: ISODateString | null;
  createdById: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface InvitePreview {
  conversationId: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  memberCount: number;
  alreadyMember: boolean;
}

export type CallStatus = "ringing" | "ongoing" | "completed" | "missed" | "declined" | "cancelled";

export interface CallLog {
  id: string;
  conversationId: string;
  type: CallType;
  status: CallStatus;
  direction: "incoming" | "outgoing";
  initiator: UserSummary;
  participants: UserSummary[];
  startedAt: ISODateString;
  answeredAt: ISODateString | null;
  endedAt: ISODateString | null;
  durationSeconds: number;
}

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface IceConfig {
  iceServers: IceServer[];
  ttlSeconds: number;
}

export interface Story {
  id: string;
  author: UserSummary;
  kind: "image" | "video" | "text";
  media: Attachment | null;
  text: string | null;
  backgroundColor: string | null;
  viewedByMe: boolean;
  viewCount: number | null;
  createdAt: ISODateString;
  expiresAt: ISODateString;
}

export interface StoryViewer {
  user: UserSummary;
  viewedAt: ISODateString;
}

export interface AdminStats {
  users: number;
  activeUsers24h: number;
  groups: number;
  directChats: number;
  messages: number;
  messagesLast7Days: { date: string; count: number }[];
}

export interface AdminUser extends UserSummary {
  email: string | null;
  phone: string | null;
  role: UserRole;
  disabled: boolean;
  groups: number;
  directChats: number;
  createdAt: ISODateString;
  lastSeenAt: ISODateString | null;
}

export interface AdminConversation {
  id: string;
  type: ConversationType;
  name: string | null;
  avatarUrl: string | null;
  memberCount: number;
  messageCount: number;
  createdBy: UserSummary | null;
  createdAt: ISODateString;
}

export interface AdminMessage {
  id: string;
  conversationId: string;
  conversationType: ConversationType;
  sender: UserSummary | null;
  kind: MessageKind;
  attachmentCount: number;
  deleted: boolean;
  createdAt: ISODateString;
}

export interface AdminPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
