import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import { getSession, saveSession, clearSession } from "@/src/lib/auth/session";
import { getAccountsRegistry, saveAccountsRegistry } from "@/src/lib/accounts/accountsRegistry";
import { setActiveDatabaseAccount } from "@/src/lib/db/database";
import { setActiveIdentityAccount } from "@/src/lib/crypto/identityKeyStore";
import { updateUser } from "@/src/redux/features/userSlice";
import { setSessionStatus } from "@/src/redux/features/sessionSlice";
import { hydrateAccounts } from "@/src/redux/features/accountsSlice";

/**
 * Hydrates Redux from persisted storage on startup, then keeps storage in
 * sync with every subsequent login/logout. Mount once near the app root —
 * `state.session.status` gates routing/splash until hydration finishes so
 * an already-logged-in user never flashes the login screen.
 *
 * Multi-Account (see docs/architecture/multi-account.md): the accounts
 * registry's `activeAccountId` (not always "default") determines which
 * account's session/database/E2EE identity load on cold start.
 * `setActiveDatabaseAccount`/`setActiveIdentityAccount` are called here,
 * synchronously within this effect before `setSessionStatus("ready")`
 * fires, specifically so that `useOfflineDbSync` (which only starts reading
 * the database once session status is "ready" — see that hook) never races
 * this and reads the wrong account's database on a cold start where the
 * last-active account wasn't "default".
 */
export const useSessionPersistence = () => {
    const dispatch = useDispatch();
    const user = useSelector((state: any) => state.user);
    const status = useSelector((state: any) => state.session.status);
    const activeAccountId = useSelector((state: any) => state.accounts.activeAccountId as string);

    useEffect(() => {
        (async () => {
            const registry = await getAccountsRegistry();
            dispatch(hydrateAccounts(registry));

            setActiveDatabaseAccount(registry.activeAccountId);
            setActiveIdentityAccount(registry.activeAccountId);

            const session = await getSession(registry.activeAccountId);
            if (session) dispatch(updateUser(session));
            dispatch(setSessionStatus("ready"));
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (status !== "ready") return;
        if (user) {
            saveSession(user, activeAccountId);
        } else {
            clearSession(activeAccountId);
        }
    }, [user, status, activeAccountId]);
};
