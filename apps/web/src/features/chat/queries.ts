import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import type {
  Contact,
  Conversation,
  CreateGroupInput,
  CurrentUser,
  MediaUpload,
  Message,
  Page,
  PublicUser,
  SendMessageInput,
} from "@chatbox/shared";

import { api } from "@/lib/api";
import { cache, keys, queryClient } from "@/lib/query";
import { getSocket } from "@/lib/socket";
import { newClientId } from "@/lib/utils";

export const useConversations = () =>
  useQuery({
    queryKey: keys.conversations,
    queryFn: async () => (await api.get<{ items: Conversation[] }>("/conversations")).items,
  });

export const useConversation = (conversationId: string | undefined) => {
  const { data } = useConversations();
  return useMemo(() => data?.find((item) => item.id === conversationId) ?? null, [data, conversationId]);
};

export const useMessages = (conversationId: string) =>
  useInfiniteQuery({
    queryKey: keys.messages(conversationId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.get<Page<Message>>(
        `/conversations/${conversationId}/messages?limit=40${pageParam ? `&before=${pageParam}` : ""}`,
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    // Newest page is first; render order is reversed by the view.
    select: (data) =>
      data.pages
        .slice()
        .reverse()
        .flatMap((page) => page.items),
  });

export const PENDING_PREFIX = "pending:";

const optimisticMessage = (input: SendMessageInput, me: CurrentUser): Message => ({
  id: `${PENDING_PREFIX}${input.clientId}`,
  clientId: input.clientId,
  conversationId: input.conversationId,
  sender: { id: me.id, name: me.name, handle: me.handle, avatarUrl: me.avatarUrl },
  kind: input.kind,
  text: input.text ?? null,
  attachments: [],
  location: input.location ? { ...input.location, label: input.location.label ?? null } : null,
  contact: null,
  poll: input.poll
    ? {
        question: input.poll.question,
        allowMultiple: input.poll.allowMultiple,
        closedAt: null,
        options: input.poll.options.map((option, index) => ({
          id: `tmp-${index}`,
          text: option.text,
          description: option.description ?? null,
          voterIds: [],
        })),
      }
    : null,
  sticker: null,
  replyTo: null,
  reactions: [],
  editedAt: null,
  deletedAt: null,
  expiresAt: null,
  createdAt: new Date().toISOString(),
});

// Sends over the socket when connected (with ack), falling back to REST.
export const useSendMessage = (me: CurrentUser) =>
  useCallback(
    async (input: Omit<SendMessageInput, "clientId">) => {
      const payload = { ...input, clientId: newClientId() } as SendMessageInput;
      if (!payload.attachments?.length) cache.upsertMessage(optimisticMessage(payload, me));
      const socket = getSocket();
      try {
        const message = socket?.connected
          ? await socket
              .timeout(10_000)
              .emitWithAck("message:send", payload)
              .then((response) => {
                if (!response.ok) throw new Error(response.error.message);
                return response.data;
              })
          : await api.post<Message>("/messages", payload);
        cache.upsertMessage(message);
        return message;
      } catch (error) {
        cache.removeMessage(payload.conversationId, `${PENDING_PREFIX}${payload.clientId}`);
        throw error;
      }
    },
    [me],
  );

export const uploadFile = async (file: File): Promise<MediaUpload> => {
  const form = new FormData();
  form.append("file", file);
  return api.post<MediaUpload>("/media", form);
};

export const useUserSearch = (query: string) =>
  useQuery({
    queryKey: keys.search(query),
    queryFn: async () =>
      (await api.get<{ items: PublicUser[] }>(`/users/search?q=${encodeURIComponent(query)}`)).items,
    enabled: query.trim().length > 0,
    staleTime: 10_000,
  });

export const useContacts = () =>
  useQuery({
    queryKey: keys.contacts,
    queryFn: async () => (await api.get<{ items: Contact[] }>("/contacts")).items,
  });

export const useStartDirect = () =>
  useMutation({
    mutationFn: (userId: string) => api.post<Conversation>("/conversations/direct", { userId }),
    onSuccess: (conversation) => cache.upsertConversation(conversation),
  });

export const useCreateGroup = () =>
  useMutation({
    mutationFn: (input: CreateGroupInput) => api.post<Conversation>("/conversations/group", input),
    onSuccess: (conversation) => cache.upsertConversation(conversation),
  });

export const markConversationRead = (
  conversation: Conversation,
  lastMessage: Message | undefined,
  myId: string,
) => {
  if (!lastMessage || lastMessage.id.startsWith(PENDING_PREFIX)) return;
  const me = conversation.members.find((member) => member.user.id === myId);
  if (conversation.unreadCount === 0 && me?.lastReadMessageId === lastMessage.id) return;
  cache.patchConversation(conversation.id, (item) => ({
    ...item,
    unreadCount: 0,
    members: item.members.map((member) =>
      member.user.id === myId
        ? { ...member, lastReadMessageId: lastMessage.id, lastReadAt: lastMessage.createdAt }
        : member,
    ),
  }));
  const socket = getSocket();
  if (socket?.connected)
    socket.emit("message:read", { conversationId: conversation.id, messageId: lastMessage.id });
  else
    void api
      .post(`/conversations/${conversation.id}/read`, { messageId: lastMessage.id })
      .catch(() => undefined);
};

export const refreshConversations = () => queryClient.invalidateQueries({ queryKey: keys.conversations });
