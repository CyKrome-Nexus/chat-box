import { isAnyOf, type Middleware } from "@reduxjs/toolkit";

import { deleteConversation, replaceConversations, upsertConversation } from "@/src/lib/db/conversationsRepo";
import { clearAllMessagesFromDb, deleteMessageFromDb, upsertMessage, upsertMessages } from "@/src/lib/db/messagesRepo";
import { indexMessage, removeMessageFromIndex } from "@/src/lib/db/searchRepo";
import { upsertContact } from "@/src/lib/db/contactsRepo";
import type { IChatRibbon } from "@/src/interfaces/list-interface";
import type { IMessage } from "@/src/interfaces/message-interface";
import {
    deleteChat,
    markChatRead,
    markChatUnread,
    patchChat,
    removeChat,
    setChatDraft,
    toggleArchiveChat,
    toggleMuteChat,
    togglePinChat,
    unarchiveChat,
    upsertChat,
    upsertChats,
} from "@/src/redux/features/chatsSlice";
import {
    clearAllMessages,
    composeMessage,
    deleteForEveryone,
    deleteMessage,
    editMessage,
    markMessageFailed,
    patchMessage,
    removeConversationMessages,
    toggleStarMessage,
    updateAttachmentProgress,
    updateMessageStatus,
    upsertMessages as upsertMessagesAction,
} from "@/src/redux/features/messagesSlice";
import { addManualContact } from "@/src/redux/features/contactsSlice";

interface IPersistedState {
    chats: { chats: IChatRibbon[] };
    messages: { byConversation: Record<string, IMessage[]> };
}

const ignore = () => undefined;

// Write-through cache: mirrors chat/message state into SQLite for instant offline startup.
export const persistenceMiddleware: Middleware<object, IPersistedState> = (store) => (next) => (action) => {
    const result = next(action);
    const state = store.getState();
    const findChat = (id: string) => state.chats.chats.find((chat) => chat.id === id);
    const findMessage = (conversationId: string, messageId: string) =>
        state.messages.byConversation[conversationId]?.find((message) => message.id === messageId);

    if (upsertChats.match(action)) {
        replaceConversations(state.chats.chats).catch(ignore);
    } else if (upsertChat.match(action)) {
        upsertConversation(action.payload).catch(ignore);
    } else if (isAnyOf(toggleMuteChat, togglePinChat, toggleArchiveChat, markChatRead, markChatUnread, unarchiveChat)(action)) {
        const chat = findChat(action.payload);
        if (chat) upsertConversation(chat).catch(ignore);
    } else if (isAnyOf(setChatDraft, patchChat)(action)) {
        const chat = findChat(action.payload.chatId);
        if (chat) upsertConversation(chat).catch(ignore);
    } else if (isAnyOf(deleteChat, removeChat)(action)) {
        deleteConversation(action.payload).catch(ignore);
    } else if (removeConversationMessages.match(action)) {
        deleteConversation(action.payload).catch(ignore);
    } else if (composeMessage.match(action)) {
        const { conversationId, message } = action.payload;
        upsertMessage(conversationId, message).catch(ignore);
    } else if (upsertMessagesAction.match(action)) {
        const { conversationId, messages } = action.payload;
        const stored = messages.map((message) => findMessage(conversationId, message.id) ?? message);
        upsertMessages(conversationId, stored).catch(ignore);
        stored.forEach((message) => {
            if (message.deletedForEveryone) removeMessageFromIndex(message.id).catch(ignore);
            else if (message.text) indexMessage(message.id, conversationId, message.text).catch(ignore);
        });
    } else if (
        isAnyOf(patchMessage, markMessageFailed, updateMessageStatus, updateAttachmentProgress, toggleStarMessage, editMessage, deleteForEveryone)(action)
    ) {
        const { conversationId, messageId } = action.payload;
        const message = findMessage(conversationId, messageId);
        if (message) upsertMessage(conversationId, message).catch(ignore);
    } else if (deleteMessage.match(action)) {
        deleteMessageFromDb(action.payload.messageId).catch(ignore);
        removeMessageFromIndex(action.payload.messageId).catch(ignore);
    } else if (clearAllMessages.match(action)) {
        clearAllMessagesFromDb().catch(ignore);
    } else if (addManualContact.match(action)) {
        upsertContact(action.payload).catch(ignore);
    }

    return result;
};
