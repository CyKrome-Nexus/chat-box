import { useEffect, useRef } from "react";

import type { Conversation, Message } from "@chatbox/shared";

import { liveStore } from "@/lib/live-store";
import { cache, keys, queryClient } from "@/lib/query";
import { connectSocket, disconnectSocket } from "@/lib/socket";

// Bridges socket events into the query cache; mounted once for the signed-in app shell.
export const useRealtime = (myId: string, activeConversationId: string | null) => {
  const activeRef = useRef(activeConversationId);
  activeRef.current = activeConversationId;

  useEffect(() => {
    const socket = connectSocket();

    const onMessage = (message: Message) => {
      cache.upsertMessage(message);
      liveStore.clearTyping(message.conversationId, message.sender?.id ?? "");
      const known = queryClient
        .getQueryData<Conversation[]>(keys.conversations)
        ?.some((item) => item.id === message.conversationId);
      if (!known) {
        void queryClient.invalidateQueries({ queryKey: keys.conversations });
        return;
      }
      const mine = message.sender?.id === myId;
      const viewing = activeRef.current === message.conversationId && document.visibilityState === "visible";
      cache.patchConversation(message.conversationId, (conversation) => ({
        ...conversation,
        lastMessage: {
          id: message.id,
          senderId: message.sender?.id ?? null,
          senderName: message.sender?.name ?? null,
          kind: message.kind,
          text: message.text,
          deleted: false,
          createdAt: message.createdAt,
        },
        unreadCount:
          mine || viewing || message.kind === "system"
            ? conversation.unreadCount
            : conversation.unreadCount + 1,
      }));
      if (!mine)
        socket.emit("message:delivered", { conversationId: message.conversationId, messageId: message.id });
    };

    const onUpdated = (message: Message) => {
      cache.upsertMessage(message);
      cache.patchConversation(message.conversationId, (conversation) =>
        conversation.lastMessage?.id === message.id
          ? {
              ...conversation,
              lastMessage: {
                ...conversation.lastMessage,
                text: message.text,
                deleted: Boolean(message.deletedAt),
              },
            }
          : conversation,
      );
    };

    socket.on("message:new", onMessage);
    socket.on("message:updated", onUpdated);
    socket.on("message:deleted", ({ conversationId, messageId }) =>
      cache.removeMessage(conversationId, messageId),
    );
    socket.on("message:reactions", ({ conversationId, messageId, reactions }) =>
      cache.patchMessage(conversationId, messageId, (message) => ({ ...message, reactions })),
    );
    socket.on("poll:updated", ({ conversationId, messageId, poll }) =>
      cache.patchMessage(conversationId, messageId, (message) => ({ ...message, poll })),
    );
    socket.on("receipt:update", ({ conversationId, userId, status, at, messageId }) =>
      cache.patchConversation(conversationId, (conversation) => ({
        ...conversation,
        members: conversation.members.map((member) =>
          member.user.id !== userId
            ? member
            : status === "read"
              ? { ...member, lastReadAt: at, lastReadMessageId: messageId }
              : { ...member, lastDeliveredAt: at },
        ),
      })),
    );
    socket.on("typing:update", ({ conversationId, userId, isTyping }) =>
      liveStore.setTyping(conversationId, userId, isTyping),
    );
    socket.on("presence:update", (payload) => liveStore.setPresence(payload));
    socket.on("conversation:upsert", (conversation) => cache.upsertConversation(conversation));
    socket.on("conversation:removed", ({ conversationId }) => cache.removeConversation(conversationId));
    socket.on("connect", () => {
      void queryClient.invalidateQueries({ queryKey: keys.conversations });
      void queryClient.invalidateQueries({ queryKey: ["messages"] });
    });

    return () => {
      disconnectSocket();
    };
  }, [myId]);
};
