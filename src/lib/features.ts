import { Dispatch } from "redux"
import { router } from "expo-router"

import { updateUser } from "../redux/features/userSlice"
import { clearSession } from "./auth/session"
import { getAccountsRegistry, saveAccountsRegistry } from "./accounts/accountsRegistry"
import { switchActiveAccount } from "./accounts/accountSwitcher"
import { removeAccount } from "../redux/features/accountsSlice"

/**
 * Multi-Account (see docs/architecture/multi-account.md): logging out fully
 * unlinks whichever account is currently active — its session is cleared
 * and it's removed from the accounts registry — then switches to another
 * linked account if one remains, or falls back to the auth screen if this
 * was the last (or only) account, matching this app's original single-
 * account logout behavior for anyone who never links a second account.
 */
export const logoutUser = async (dispatch: Dispatch) => {
    const registry = await getAccountsRegistry()
    const loggedOutId = registry.activeAccountId
    await clearSession(loggedOutId)

    const remaining = registry.accounts.filter((a) => a.id !== loggedOutId)
    dispatch(removeAccount(loggedOutId))

    if (remaining.length > 0) {
        const nextAccountId = remaining[0].id
        await saveAccountsRegistry({ accounts: remaining, activeAccountId: nextAccountId })
        await switchActiveAccount(nextAccountId, dispatch)
        return
    }

    await saveAccountsRegistry({ accounts: [], activeAccountId: "default" })
    dispatch(updateUser(null))
    router.replace('/')
}
