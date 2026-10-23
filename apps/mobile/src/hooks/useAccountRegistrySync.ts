import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import { getAccountsRegistry, saveAccountsRegistry } from "@/src/lib/accounts/accountsRegistry";
import { addAccount, IAccountSummary, updateAccountProfile } from "@/src/redux/features/accountsSlice";
import { IUser } from "@/src/interfaces/user-interface";

/**
 * Keeps the accounts registry's entry for the *currently active* account in
 * sync with that account's own profile (name/avatar/handle) — including
 * registering it for the first time on an account's very first successful
 * login, since before that there's nothing yet for the Account Switcher to
 * show. See docs/architecture/multi-account.md.
 */
export const useAccountRegistrySync = () => {
    const dispatch = useDispatch();
    const user = useSelector((state: { user: IUser | null }) => state.user);
    const activeAccountId = useSelector((state: any) => state.accounts.activeAccountId as string);
    const sessionStatus = useSelector((state: any) => state.session.status);
    const existingEntry: IAccountSummary | undefined = useSelector((state: any) =>
        state.accounts.accounts.find((a: IAccountSummary) => a.id === activeAccountId)
    );

    useEffect(() => {
        if (sessionStatus !== "ready" || !user) return;

        if (!existingEntry) {
            dispatch(
                addAccount({
                    id: activeAccountId,
                    name: user.name,
                    avatarUrl: user.avatar?.url,
                    identifier: user.username,
                    handle: user.handle,
                    unreadCount: 0,
                })
            );
        } else if (
            existingEntry.name !== user.name ||
            existingEntry.avatarUrl !== user.avatar?.url ||
            existingEntry.handle !== user.handle
        ) {
            dispatch(
                updateAccountProfile({
                    id: activeAccountId,
                    name: user.name,
                    avatarUrl: user.avatar?.url,
                    handle: user.handle,
                })
            );
        }

        (async () => {
            const registry = await getAccountsRegistry();
            const nextEntry: IAccountSummary = {
                id: activeAccountId,
                name: user.name,
                avatarUrl: user.avatar?.url,
                identifier: user.username,
                handle: user.handle,
                unreadCount: existingEntry?.unreadCount || 0,
            };
            const accounts = registry.accounts.filter((a) => a.id !== nextEntry.id).concat(nextEntry);
            await saveAccountsRegistry({ accounts, activeAccountId: registry.activeAccountId });
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch, user, activeAccountId, sessionStatus]);
};
