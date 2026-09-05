import { useEffect } from "react";
import { useDispatch, useStore } from "react-redux";

import { listConversations, upsertConversation } from "@/src/lib/db/conversationsRepo";
import { listAllMessages } from "@/src/lib/db/messagesRepo";
import { listManualContacts } from "@/src/lib/db/contactsRepo";
import { insertCallLog, listCallLogs } from "@/src/lib/db/callLogsRepo";
import { hydrateChats } from "@/src/redux/features/chatsSlice";
import { hydrateMessages } from "@/src/redux/features/messagesSlice";
import { hydrateManualContacts } from "@/src/redux/features/contactsSlice";
import { hydrateCallHistory } from "@/src/redux/features/callSlice";

/**
 * Runs once at startup: on the very first launch (empty database) it seeds
 * SQLite from the in-memory demo data each slice already ships with, so
 * there's always something to persist; on every subsequent launch, the
 * database — not the hardcoded demo arrays — is the source of truth, so
 * anything the user did (sent messages, muted/deleted chats, added
 * contacts, made calls) survives an app restart.
 */
export const useOfflineDbSync = () => {
    const dispatch = useDispatch();
    const store = useStore();

    useEffect(() => {
        (async () => {
            const state: any = store.getState();

            const dbChats = await listConversations();
            if (dbChats.length === 0) {
                await Promise.all(state.chats.chats.map((chat: any) => upsertConversation(chat)));
            } else {
                dispatch(hydrateChats(dbChats));
            }

            const dbMessages = await listAllMessages();
            if (Object.keys(dbMessages).length > 0) {
                dispatch(hydrateMessages(dbMessages));
            }

            const dbManualContacts = await listManualContacts();
            if (dbManualContacts.length > 0) {
                dispatch(hydrateManualContacts(dbManualContacts));
            }

            const dbCallLogs = await listCallLogs();
            if (dbCallLogs.length === 0) {
                await Promise.all(state.call.history.map((call: any) => insertCallLog(call)));
            } else {
                dispatch(hydrateCallHistory(dbCallLogs));
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
};
