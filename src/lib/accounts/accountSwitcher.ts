import type { Dispatch } from "@reduxjs/toolkit";

import { getAccountsRegistry, saveAccountsRegistry } from "./accountsRegistry";
import { getSession, ISessionUser } from "@/src/lib/auth/session";
import { setActiveDatabaseAccount } from "@/src/lib/db/database";
import { setActiveIdentityAccount } from "@/src/lib/crypto/identityKeyStore";
import { hydrateOfflineDataForActiveAccount } from "@/src/hooks/useOfflineDbSync";
import { updateUser } from "@/src/redux/features/userSlice";
import { setActiveAccountId } from "@/src/redux/features/accountsSlice";
import { hydrateChats } from "@/src/redux/features/chatsSlice";
import { hydrateMessages } from "@/src/redux/features/messagesSlice";
import { hydrateManualContacts } from "@/src/redux/features/contactsSlice";
import { hydrateCallHistory } from "@/src/redux/features/callSlice";

/**
 * The single entry point for "switch which account is active" — called both
 * by the Account Switcher UI (a deliberate tap) and by
 * `useMessageNotifications.ts` (tapping a background account's push
 * notification, per the ticket's acceptance criteria). Every step here is
 * real: it doesn't just change which `IUser` is in Redux, it repoints the
 * SQLite database, the E2EE identity keystore, and every conversation-list
 * slice at the target account's own storage. See
 * docs/architecture/multi-account.md.
 */
export const switchActiveAccount = async (accountId: string, dispatch: Dispatch): Promise<void> => {
    setActiveDatabaseAccount(accountId);
    setActiveIdentityAccount(accountId);

    const registry = await getAccountsRegistry();
    if (registry.activeAccountId !== accountId) {
        await saveAccountsRegistry({ ...registry, activeAccountId: accountId });
    }
    dispatch(setActiveAccountId(accountId));

    const session: ISessionUser | null = await getSession(accountId);
    dispatch(updateUser(session));

    // Every conversation-list slice is fully replaced (not merged) by the
    // target account's own database — see hydrateOfflineDataForActiveAccount
    // — which is what makes the switch instant and leak-free rather than
    // blending the previous account's chats into the new one's view. A
    // brand-new account's database is empty, so this also correctly clears
    // out whatever the previously-active account had loaded.
    await hydrateOfflineDataForActiveAccount(
        dispatch as any,
        { chats: { chats: [] }, call: { history: [] } },
        false
    );
};

/** Clears the four conversation-list slices immediately — used by the
 * switcher UI to avoid a flash of the outgoing account's chats while the
 * new account's database is still loading (the hydrate calls above are
 * async; this runs synchronously first). */
export const clearConversationSlicesForSwitch = (dispatch: Dispatch) => {
    dispatch(hydrateChats([]));
    dispatch(hydrateMessages({}));
    dispatch(hydrateManualContacts([]));
    dispatch(hydrateCallHistory([]));
};
