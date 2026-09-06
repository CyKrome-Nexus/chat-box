import { useEffect } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";

import { listConversations, upsertConversation } from "@/src/lib/db/conversationsRepo";
import { listAllMessages } from "@/src/lib/db/messagesRepo";
import { listManualContacts } from "@/src/lib/db/contactsRepo";
import { insertCallLog, listCallLogs } from "@/src/lib/db/callLogsRepo";
import { hydrateChats } from "@/src/redux/features/chatsSlice";
import { hydrateMessages } from "@/src/redux/features/messagesSlice";
import { hydrateManualContacts } from "@/src/redux/features/contactsSlice";
import { hydrateCallHistory } from "@/src/redux/features/callSlice";

/**
 * Loads the *currently active account's* SQLite database (see
 * `src/lib/db/database.ts` — `getDatabase()` resolves against whichever
 * account `setActiveDatabaseAccount()` last selected) into Redux, always
 * fully replacing whatever was there before (every `hydrate*` reducer here
 * replaces rather than merges) — that full replacement, not any special
 * "reset" action, is what makes switching accounts instantly switch
 * conversation lists to the new account's own data instead of blending it
 * with the previous account's.
 *
 * `seedDemoDataIfEmpty` is true only for the app's original cold-start path
 * (`useOfflineDbSync` below): if the "default" account's database is empty
 * (a fresh install), it seeds SQLite from the hardcoded demo arrays each
 * slice ships with, exactly like this hook always has. It's false when
 * `src/lib/accounts/accountSwitcher.ts` calls this after switching to a
 * *different* account — a newly linked account should start genuinely
 * empty, not inherit the previous account's (or the demo data's) chats.
 */
export const hydrateOfflineDataForActiveAccount = async (
    dispatch: ReturnType<typeof useDispatch>,
    state: any,
    seedDemoDataIfEmpty: boolean
) => {
    const dbChats = await listConversations();
    if (dbChats.length === 0 && seedDemoDataIfEmpty && state.chats.chats.length > 0) {
        await Promise.all(state.chats.chats.map((chat: any) => upsertConversation(chat)));
    } else {
        dispatch(hydrateChats(dbChats));
    }

    dispatch(hydrateMessages(await listAllMessages()));
    dispatch(hydrateManualContacts(await listManualContacts()));

    const dbCallLogs = await listCallLogs();
    if (dbCallLogs.length === 0 && seedDemoDataIfEmpty && state.call.history.length > 0) {
        await Promise.all(state.call.history.map((call: any) => insertCallLog(call)));
    } else {
        dispatch(hydrateCallHistory(dbCallLogs));
    }
};

/**
 * Runs once at startup, for whichever account is active when the app
 * cold-starts. Gated on `session.status === "ready"` rather than firing
 * unconditionally on mount — `useSessionPersistence` resolves the accounts
 * registry and calls `setActiveDatabaseAccount`/`setActiveIdentityAccount`
 * for the correct account *before* flipping status to "ready", so waiting
 * for that here is what prevents this hook from reading the wrong (default)
 * database on a cold start where the last-active account wasn't "default".
 */
export const useOfflineDbSync = () => {
    const dispatch = useDispatch();
    const store = useStore();
    const status = useSelector((state: any) => state.session.status);

    useEffect(() => {
        if (status !== "ready") return;
        hydrateOfflineDataForActiveAccount(dispatch, store.getState(), true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);
};
