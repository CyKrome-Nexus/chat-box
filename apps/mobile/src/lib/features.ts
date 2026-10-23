import type { Dispatch } from "redux";
import { router } from "expo-router";

import { updateUser } from "../redux/features/userSlice";
import { clearSession } from "./auth/session";
import { authApi } from "./api/services";
import { tokenStore } from "./api/tokenStore";
import { realtimeSocketClient } from "./realtime/socketClient";
import { getAccountsRegistry, saveAccountsRegistry } from "./accounts/accountsRegistry";
import { clearConversationSlicesForSwitch, switchActiveAccount } from "./accounts/accountSwitcher";
import { removeAccount } from "../redux/features/accountsSlice";

// Signs out the active account (revoking its server session) and falls back to another linked account.
export const logoutUser = async (dispatch: Dispatch) => {
    const registry = await getAccountsRegistry();
    const loggedOutId = registry.activeAccountId;

    if (tokenStore.get()) await authApi.logout().catch(() => undefined);
    realtimeSocketClient.disconnect();
    await Promise.all([clearSession(loggedOutId), tokenStore.clear(loggedOutId)]);

    const remaining = registry.accounts.filter((a) => a.id !== loggedOutId);
    dispatch(removeAccount(loggedOutId));
    clearConversationSlicesForSwitch(dispatch);

    if (remaining.length > 0) {
        const nextAccountId = remaining[0].id;
        await saveAccountsRegistry({ accounts: remaining, activeAccountId: nextAccountId });
        await switchActiveAccount(nextAccountId, dispatch);
        return;
    }

    await saveAccountsRegistry({ accounts: [], activeAccountId: "default" });
    dispatch(updateUser(null));
    router.replace("/");
};
