import { Platform } from "react-native";
import * as Device from "expo-device";

import type {
    AuthResponse,
    CallLog,
    Contact,
    Conversation,
    CreateGroupInput,
    CreateStoryInput,
    CurrentUser,
    DiscoverInput,
    DiscoverMatch,
    IceConfig,
    InvitePreview,
    LoginInput,
    MediaUpload,
    Message,
    Page,
    PublicUser,
    RegisterInput,
    SendMessageInput,
    SessionInfo,
    SocialLoginInput,
    Story,
    StoryViewer,
    UpdateConversationInput,
    UpdatePrivacyInput,
    UpdateProfileInput,
} from "@chatbox/shared";

import { api, request, upload, type IUploadFile } from "./client";

const deviceInfo = () => ({
    platform: Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : "web",
    deviceName: (Device.deviceName ?? Device.modelName ?? undefined)?.slice(0, 80),
});

const items = <T>(promise: Promise<{ items: T[] }>) => promise.then((response) => response.items);

export const authApi = {
    register: (input: RegisterInput) => api.post<AuthResponse>("/auth/register", { ...input, ...deviceInfo() }),
    login: (input: LoginInput) => api.post<AuthResponse>("/auth/login", { ...input, ...deviceInfo() }),
    social: (input: SocialLoginInput) => api.post<AuthResponse>("/auth/social", { ...input, ...deviceInfo() }),
    logout: () => api.post<void>("/auth/logout"),
    forgotPassword: (identifier: string) => api.post<{ message: string }>("/auth/password/forgot", { identifier }),
    resetPassword: (identifier: string, code: string, password: string) =>
        api.post<void>("/auth/password/reset", { identifier, code, password }),
    changePassword: (currentPassword: string | undefined, newPassword: string) =>
        api.post<void>("/auth/password/change", { currentPassword, newPassword }),
    sessions: () => items(api.get<{ items: SessionInfo[] }>("/auth/sessions")),
    revokeSession: (id: string) => api.delete<void>(`/auth/sessions/${id}`),
    deleteAccount: (password?: string) => api.post<void>("/auth/account/delete", { password }),
};

export const usersApi = {
    me: () => api.get<CurrentUser>("/users/me"),
    updateMe: (input: UpdateProfileInput) => api.patch<CurrentUser>("/users/me", input),
    updatePrivacy: (input: UpdatePrivacyInput) => api.patch<CurrentUser>("/users/me/privacy", input),
    uploadAvatar: (file: IUploadFile) => upload<CurrentUser>("PUT", "/users/me/avatar", file),
    handleAvailable: (handle: string) =>
        api.get<{ available: boolean }>(`/users/handle-availability?handle=${encodeURIComponent(handle)}`).then((response) => response.available),
    search: (query: string) => items(api.get<{ items: PublicUser[] }>(`/users/search?q=${encodeURIComponent(query)}`)),
    get: (id: string) => api.get<PublicUser>(`/users/${id}`),
    byHandle: (handle: string) => api.get<PublicUser>(`/users/by-handle/${encodeURIComponent(handle)}`),
    discover: (input: DiscoverInput) => items(api.post<{ items: DiscoverMatch[] }>("/users/discover", input)),
    block: (id: string) => api.put<void>(`/users/${id}/block`),
    unblock: (id: string) => api.delete<void>(`/users/${id}/block`),
    blocked: () => items(api.get<{ items: PublicUser[] }>("/users/blocked")),
};

export const contactsApi = {
    list: () => items(api.get<{ items: Contact[] }>("/contacts")),
    add: (userId: string, nickname?: string) => api.post<Contact>("/contacts", { userId, nickname }),
    remove: (userId: string) => api.delete<void>(`/contacts/${userId}`),
};

export const conversationsApi = {
    list: () => items(api.get<{ items: Conversation[] }>("/conversations")),
    get: (id: string) => api.get<Conversation>(`/conversations/${id}`),
    createDirect: (userId: string) => api.post<Conversation>("/conversations/direct", { userId }),
    createGroup: (input: CreateGroupInput) => api.post<Conversation>("/conversations/group", input),
    update: (id: string, input: UpdateConversationInput) => api.patch<Conversation>(`/conversations/${id}`, input),
    setAvatar: (id: string, file: IUploadFile) => upload<Conversation>("PUT", `/conversations/${id}/avatar`, file),
    remove: (id: string, scope: "me" | "everyone") => api.delete<void>(`/conversations/${id}?scope=${scope}`),
    leave: (id: string) => api.post<void>(`/conversations/${id}/leave`),
    mute: (id: string, mutedUntil: string | null) => api.put<void>(`/conversations/${id}/mute`, { mutedUntil }),
    addMembers: (id: string, userIds: string[]) => api.post<Conversation>(`/conversations/${id}/members`, { userIds }),
    removeMember: (id: string, userId: string) => api.delete<Conversation>(`/conversations/${id}/members/${userId}`),
    setRole: (id: string, userId: string, role: "admin" | "member") =>
        api.patch<Conversation>(`/conversations/${id}/members/${userId}`, { role }),
    createInvite: (id: string) => api.post<{ inviteCode: string }>(`/conversations/${id}/invite`),
    revokeInvite: (id: string) => api.delete<void>(`/conversations/${id}/invite`),
    previewInvite: (code: string) => api.get<InvitePreview>(`/invites/${encodeURIComponent(code)}`),
    joinInvite: (code: string) => api.post<Conversation>(`/invites/${encodeURIComponent(code)}/join`),
    markRead: (id: string, messageId: string) => api.post<void>(`/conversations/${id}/read`, { messageId }),
    messages: (id: string, options: { before?: string; after?: string; limit?: number } = {}) => {
        const query = new URLSearchParams({ limit: String(options.limit ?? 40) });
        if (options.before) query.set("before", options.before);
        if (options.after) query.set("after", options.after);
        return api.get<Page<Message>>(`/conversations/${id}/messages?${query.toString()}`);
    },
    media: (id: string, kind: "media" | "document" | "audio", before?: string) =>
        api.get<Page<Message>>(`/conversations/${id}/media?kind=${kind}${before ? `&before=${before}` : ""}`),
};

export const messagesApi = {
    send: (input: SendMessageInput) => api.post<Message>("/messages", input),
    edit: (id: string, text: string) => api.patch<Message>(`/messages/${id}`, { text }),
    remove: (id: string, scope: "me" | "everyone") => api.delete<void>(`/messages/${id}?scope=${scope}`),
    react: (id: string, emoji: string | null) => api.put<void>(`/messages/${id}/reaction`, { emoji }),
    vote: (id: string, optionIds: string[]) => api.put<void>(`/messages/${id}/vote`, { optionIds }),
    forward: (id: string, conversationIds: string[]) =>
        items(api.post<{ items: Message[] }>(`/messages/${id}/forward`, { conversationIds })),
};

export const mediaApi = {
    upload: (file: IUploadFile, onProgress?: (percent: number) => void) => upload<MediaUpload>("POST", "/media", file, onProgress),
};

export const callsApi = {
    history: () => items(api.get<{ items: CallLog[] }>("/calls")),
    iceServers: () => api.get<IceConfig>("/calls/ice-servers"),
};

export const storiesApi = {
    feed: () => items(api.get<{ items: Story[] }>("/stories")),
    create: (input: CreateStoryInput) => api.post<Story>("/stories", input),
    view: (id: string) => api.post<void>(`/stories/${id}/views`),
    viewers: (id: string) => items(api.get<{ items: StoryViewer[] }>(`/stories/${id}/views`)),
    remove: (id: string) => api.delete<void>(`/stories/${id}`),
};

export const devicesApi = {
    register: (pushToken: string) =>
        api.put<void>("/devices", { pushToken, platform: Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web" }),
    unregister: (pushToken: string) => request<void>("DELETE", "/devices", { pushToken }),
};

