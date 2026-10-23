import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import { clearSession, getSession, saveSession } from "@/src/lib/auth/session";
import { getAccountsRegistry } from "@/src/lib/accounts/accountsRegistry";
import { onSessionExpired } from "@/src/lib/api/client";
import { toLocalUser } from "@/src/lib/api/mappers";
import { usersApi } from "@/src/lib/api/services";
import { tokenStore } from "@/src/lib/api/tokenStore";
import { setActiveDatabaseAccount } from "@/src/lib/db/database";
import { logoutUser } from "@/src/lib/features";
import type { RootState } from "@/src/redux/store/store";
import { updateUser } from "@/src/redux/features/userSlice";
import { setSessionStatus } from "@/src/redux/features/sessionSlice";
import { hydrateAccounts } from "@/src/redux/features/accountsSlice";

// Restores the cached profile + tokens on cold start, then refreshes the profile from the server.
export const useSessionPersistence = () => {
    const dispatch = useDispatch();
    const user = useSelector((state: RootState) => state.user);
    const status = useSelector((state: RootState) => state.session.status);
    const activeAccountId = useSelector((state: RootState) => state.accounts.activeAccountId);

    useEffect(() => {
        void (async () => {
            try {
                const registry = await getAccountsRegistry();
                dispatch(hydrateAccounts(registry));
                setActiveDatabaseAccount(registry.activeAccountId);

                const [session, tokens] = await Promise.all([
                    getSession(registry.activeAccountId),
                    tokenStore.load(registry.activeAccountId),
                ]);
                if (session && tokens) dispatch(updateUser(session));
                if (tokens) {
                    usersApi
                        .me()
                        .then((me) => dispatch(updateUser(toLocalUser(me))))
                        .catch(() => undefined);
                }
            } catch {
                // A corrupt cache degrades to signed-out rather than blocking startup.
            } finally {
                dispatch(setSessionStatus("ready"));
            }
        })();
    }, [dispatch]);

    useEffect(() => onSessionExpired(() => void logoutUser(dispatch)), [dispatch]);

    useEffect(() => {
        if (status !== "ready") return;
        if (user) void saveSession(user, activeAccountId);
        else void clearSession(activeAccountId);
    }, [user, status, activeAccountId]);
};
