import { QueryClient, type InfiniteData } from "@tanstack/react-query";

import type { Conversation, Message, Page } from "@chatbox/shared";

import { ApiRequestError } from "./api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (count, error) => !(error instanceof ApiRequestError && error.status < 500) && count < 2,
    },
  },
});

export const keys = {
  me: ["me"] as const,
  conversations: ["conversations"] as const,
  conversation: (id: string) => ["conversations", id] as const,
  messages: (id: string) => ["messages", id] as const,
  contacts: ["contacts"] as const,
  search: (q: string) => ["users", "search", q] as const,
  admin: (section: string, params: unknown) => ["admin", section, params] as const,
};

export type MessagePages = InfiniteData<Page<Message>, string | undefined>;

const sortConversations = (items: Conversation[]) =>
  [...items].sort(
    (a, b) =>
      Date.parse(b.lastMessage?.createdAt ?? b.updatedAt) -
      Date.parse(a.lastMessage?.createdAt ?? a.updatedAt),
  );

export const cache = {
  upsertConversation(conversation: Conversation) {
    queryClient.setQueryData<Conversation[]>(keys.conversations, (current = []) =>
      sortConversations([conversation, ...current.filter((item) => item.id !== conversation.id)]),
    );
  },
  removeConversation(conversationId: string) {
    queryClient.setQueryData<Conversation[]>(keys.conversations, (current = []) =>
      current.filter((item) => item.id !== conversationId),
    );
    queryClient.removeQueries({ queryKey: keys.messages(conversationId) });
  },
  patchConversation(conversationId: string, patch: (conversation: Conversation) => Conversation) {
    queryClient.setQueryData<Conversation[]>(keys.conversations, (current = []) =>
      sortConversations(current.map((item) => (item.id === conversationId ? patch(item) : item))),
    );
  },
  // Inserts or replaces by id/clientId so optimistic messages reconcile with the server copy.
  upsertMessage(message: Message) {
    queryClient.setQueryData<MessagePages>(keys.messages(message.conversationId), (data) => {
      if (!data) return data;
      const matches = (item: Message) =>
        item.id === message.id || (message.clientId !== null && item.clientId === message.clientId);
      const exists = data.pages.some((page) => page.items.some(matches));
      if (exists) {
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => (matches(item) ? message : item)),
          })),
        };
      }
      const [first, ...rest] = data.pages;
      if (!first) return data;
      return { ...data, pages: [{ ...first, items: [...first.items, message] }, ...rest] };
    });
  },
  patchMessage(conversationId: string, messageId: string, patch: (message: Message) => Message) {
    queryClient.setQueryData<MessagePages>(keys.messages(conversationId), (data) =>
      data
        ? {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              items: page.items.map((item) => (item.id === messageId ? patch(item) : item)),
            })),
          }
        : data,
    );
  },
  removeMessage(conversationId: string, messageId: string) {
    queryClient.setQueryData<MessagePages>(keys.messages(conversationId), (data) =>
      data
        ? {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              items: page.items.filter((item) => item.id !== messageId),
            })),
          }
        : data,
    );
  },
};
