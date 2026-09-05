import type { Middleware } from "@reduxjs/toolkit";

import { deleteConversation, upsertConversation } from "@/src/lib/db/conversationsRepo";
import { clearAllMessagesFromDb, upsertMessage } from "@/src/lib/db/messagesRepo";
import { upsertContact } from "@/src/lib/db/contactsRepo";
import { clearCallLogsFromDb, insertCallLog } from "@/src/lib/db/callLogsRepo";
import { dequeueSync, enqueueSync } from "@/src/lib/db/syncQueueRepo";

/**
 * Write-through persistence: lets each action reach the reducer first (so
 * `getState()` reflects the update), then mirrors the relevant row(s) into
 * SQLite. Writes are fire-and-forget from the UI's perspective — the Redux
 * state update (and re-render) never waits on disk I/O, matching the
 * "0ms UI latency, write to DB happens after" offline-first model.
 */
export const persistenceMiddleware: Middleware = (store) => (next) => (action: any) => {
    const result = next(action);
    const state = store.getState();

    switch (action.type) {
        case "chats/toggleMuteChat": {
            const chat = state.chats.chats.find((c: any) => c.id === action.payload);
            if (chat) upsertConversation(chat);
            break;
        }
        case "chats/deleteChat": {
            deleteConversation(action.payload);
            break;
        }
        case "messages/composeMessage": {
            const { conversationId, message, queued } = action.payload;
            upsertMessage(conversationId, message);
            if (queued) enqueueSync(conversationId, message.id, message);
            break;
        }
        case "messages/receiveMessage": {
            const { conversationId, message } = action.payload;
            upsertMessage(conversationId, message);
            break;
        }
        case "messages/markMessageFlushed": {
            const { conversationId, messageId } = action.payload;
            const message = state.messages.byConversation[conversationId]?.find(
                (m: any) => m.id === messageId
            );
            if (message) upsertMessage(conversationId, message);
            dequeueSync(messageId);
            break;
        }
        case "messages/updateMessageStatus":
        case "messages/updateAttachmentProgress": {
            const { conversationId, messageId } = action.payload;
            const message = state.messages.byConversation[conversationId]?.find(
                (m: any) => m.id === messageId
            );
            if (message) upsertMessage(conversationId, message);
            break;
        }
        case "messages/clearAllMessages": {
            clearAllMessagesFromDb();
            break;
        }
        case "contacts/addManualContact": {
            upsertContact(action.payload);
            break;
        }
        case "call/endCall": {
            const latest = state.call.history[0];
            if (latest) insertCallLog(latest);
            break;
        }
        case "call/clearCallHistory": {
            clearCallLogsFromDb();
            break;
        }
        default:
            break;
    }

    return result;
};
