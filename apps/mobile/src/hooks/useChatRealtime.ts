import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import type { AttachmentInput, PollInput } from "@chatbox/shared";

import { errorMessage } from "@/src/lib/api/client";
import { mediaApi, messagesApi } from "@/src/lib/api/services";
import { realtimeSocketClient } from "@/src/lib/realtime/socketClient";
import { loadMessages, newClientId, sendMessage as sendThroughSync } from "@/src/lib/sync/chatSync";
import type { IAttachment, IMessage } from "@/src/interfaces/message-interface";
import type { RootState } from "@/src/redux/store/store";
import { composeMessage, markMessageFailed, patchMessage } from "@/src/redux/features/messagesSlice";
import { patchChat } from "@/src/redux/features/chatsSlice";

const TYPING_TIMEOUT_MS = 3000;
const EMPTY: string[] = [];

const MIME_BY_TYPE: Partial<Record<IAttachment["type"], string>> = {
    image: "image/jpeg",
    video: "video/mp4",
    audio: "audio/m4a",
    video_note: "video/mp4",
    document: "application/octet-stream",
};

const attachmentKind = (type: IAttachment["type"]): AttachmentInput["kind"] | null =>
    type === "location" ? null : type;

export const useChatRealtime = (conversationId: string, currentUserId: string) => {
    const dispatch = useDispatch();
    const isTypingRef = useRef(false);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cursorRef = useRef<string | null | undefined>(undefined);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [hasOlder, setHasOlder] = useState(true);

    const connectionStatus = useSelector((state: RootState) => state.connection.status);
    const typingUsers = useSelector((state: RootState) => state.connection.typingByConversation[conversationId] ?? EMPTY);

    useEffect(() => {
        cursorRef.current = undefined;
        setHasOlder(true);
        loadMessages(conversationId)
            .then((cursor) => {
                cursorRef.current = cursor;
                setHasOlder(Boolean(cursor));
            })
            .catch(() => undefined);
    }, [conversationId, connectionStatus === "online"]);

    const loadOlder = useCallback(async () => {
        if (loadingOlder || !cursorRef.current) return;
        setLoadingOlder(true);
        try {
            const cursor = await loadMessages(conversationId, cursorRef.current);
            cursorRef.current = cursor;
            setHasOlder(Boolean(cursor));
        } finally {
            setLoadingOlder(false);
        }
    }, [conversationId, loadingOlder]);

    const stopTyping = useCallback(() => {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (!isTypingRef.current) return;
        isTypingRef.current = false;
        realtimeSocketClient.emit("typing:update", { conversationId, isTyping: false });
    }, [conversationId]);

    useEffect(() => stopTyping, [stopTyping]);

    const notifyTyping = useCallback(() => {
        if (!isTypingRef.current) {
            isTypingRef.current = true;
            realtimeSocketClient.emit("typing:update", { conversationId, isTyping: true });
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(stopTyping, TYPING_TIMEOUT_MS);
    }, [conversationId, stopTyping]);

    const bumpChat = useCallback(
        (preview: string) => dispatch(patchChat({ chatId: conversationId, patch: { lastMessage: preview, lastMessageAt: Date.now(), draft: undefined } })),
        [conversationId, dispatch]
    );

    const sendMessage = useCallback(
        (text: string, replyTo?: IMessage["replyTo"]): string | undefined => {
            const trimmed = text.trim();
            if (!trimmed) return undefined;
            stopTyping();
            const clientId = newClientId();
            bumpChat(trimmed);
            void sendThroughSync(
                { conversationId, clientId, kind: "text", text: trimmed, replyToId: replyTo?.messageId.startsWith("local-") ? undefined : replyTo?.messageId },
                { replyTo, senderId: currentUserId }
            );
            return clientId;
        },
        [bumpChat, conversationId, currentUserId, stopTyping]
    );

    // Uploads the file with progress, then sends the message referencing the stored media key.
    const sendAttachment = useCallback(
        async (attachment: IAttachment, caption = "") => {
            const clientId = newClientId();
            const localId = `local-${clientId}`;
            const kind = attachmentKind(attachment.type);

            if (attachment.type === "location" && attachment.latitude !== undefined && attachment.longitude !== undefined) {
                bumpChat("📍 Location");
                await sendThroughSync(
                    {
                        conversationId,
                        clientId,
                        kind: "location",
                        location: { latitude: attachment.latitude, longitude: attachment.longitude, label: attachment.name },
                    },
                    { attachment }
                );
                return;
            }
            if (!kind || !attachment.uri) return;

            const optimistic: IMessage = {
                id: localId,
                clientId,
                conversationId,
                kind,
                text: caption,
                type: "sender",
                timestamp: Date.now(),
                status: "pending",
                senderId: currentUserId,
                attachment: { ...attachment, uploadProgress: 0 },
            };
            dispatch(composeMessage({ conversationId, message: optimistic, queued: false }));
            try {
                const name = attachment.name ?? attachment.uri.split("/").pop() ?? `${kind}-${clientId}`;
                const uploaded = await mediaApi.upload(
                    { uri: attachment.uri, name, type: attachment.mimeType ?? MIME_BY_TYPE[attachment.type] ?? "application/octet-stream" },
                    (progress) => dispatch(patchMessage({ conversationId, messageId: localId, patch: { attachment: { ...attachment, uploadProgress: progress } } }))
                );
                await sendThroughSync({
                    conversationId,
                    clientId,
                    kind,
                    text: caption || undefined,
                    attachments: [
                        {
                            kind,
                            key: uploaded.key,
                            name: attachment.name,
                            mimeType: uploaded.mimeType,
                            size: uploaded.size,
                            durationSeconds: attachment.duration,
                            waveform: attachment.waveform?.slice(0, 256),
                            viewOnce: attachment.viewOnce,
                        },
                    ],
                });
                bumpChat(caption || kind);
            } catch {
                dispatch(markMessageFailed({ conversationId, messageId: localId }));
            }
        },
        [bumpChat, conversationId, currentUserId, dispatch]
    );

    const sendSticker = useCallback(
        (stickerId: string, emoji?: string) => {
            bumpChat("Sticker");
            return sendThroughSync(
                { conversationId, kind: "sticker", sticker: { id: stickerId, emoji } },
                { attachment: { type: "sticker", stickerId } }
            );
        },
        [bumpChat, conversationId]
    );

    const sendContact = useCallback(
        (contact: { name: string; phone?: string; email?: string; userId?: string }) => {
            bumpChat("👤 Contact");
            return sendThroughSync({ conversationId, kind: "contact", contact }, { text: contact.name });
        },
        [bumpChat, conversationId]
    );

    const sendPoll = useCallback(
        (poll: PollInput) => {
            bumpChat("📊 Poll");
            return sendThroughSync({ conversationId, kind: "poll", poll });
        },
        [bumpChat, conversationId]
    );

    const editMessage = useCallback(
        async (messageId: string, text: string) => {
            const trimmed = text.trim();
            if (!trimmed) return;
            dispatch(patchMessage({ conversationId, messageId, patch: { text: trimmed, edited: true, editedAt: Date.now() } }));
            await messagesApi.edit(messageId, trimmed).catch(() => undefined);
        },
        [conversationId, dispatch]
    );

    const deleteMessage = useCallback((messageId: string, scope: "me" | "everyone") => messagesApi.remove(messageId, scope), []);

    const react = useCallback(
        (message: IMessage, emoji: string) => {
            const next = message.reaction === emoji ? null : emoji;
            dispatch(patchMessage({ conversationId, messageId: message.id, patch: { reaction: next ?? undefined } }));
            return messagesApi.react(message.id, next).catch(() => undefined);
        },
        [conversationId, dispatch]
    );

    const vote = useCallback((messageId: string, optionIds: string[]) => messagesApi.vote(messageId, optionIds), []);

    const forward = useCallback((messageId: string, conversationIds: string[]) => messagesApi.forward(messageId, conversationIds), []);

    const markRead = useCallback(
        (messageId: string) => {
            if (messageId.startsWith("local-")) return;
            dispatch(patchChat({ chatId: conversationId, patch: { notificationCount: 0 } }));
            realtimeSocketClient.emit("message:read", { conversationId, messageId });
        },
        [conversationId, dispatch]
    );

    return {
        connectionStatus,
        typingUsers,
        hasOlder,
        loadingOlder,
        loadOlder,
        sendMessage,
        sendAttachment,
        sendPoll,
        sendSticker,
        sendContact,
        notifyTyping,
        markRead,
        editMessage,
        deleteMessage,
        react,
        vote,
        forward,
        errorMessage,
    };
};
