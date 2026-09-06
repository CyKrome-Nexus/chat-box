import { createSlice, PayloadAction } from "@reduxjs/toolkit";

/** Multi-Account — see docs/architecture/multi-account.md. */
export const MAX_LINKED_ACCOUNTS = 5;

export interface IAccountSummary {
    /** "default" is the original single-account session (unsuffixed
     * SecureStore/SQLite storage — see identityKeyStore.ts/database.ts).
     * Every account added after gets a generated id. */
    id: string;
    name: string;
    avatarUrl?: string;
    /** The login identifier (phone/email) — mirrors IUser.username. */
    identifier: string;
    /** The public @handle, if claimed — see username-system.md. */
    handle?: string;
    /** Updated externally (see useAccountBadgeSync.ts) so the switcher can
     * show a per-account unread badge without that account being active. */
    unreadCount: number;
}

interface AccountsState {
    accounts: IAccountSummary[];
    activeAccountId: string;
}

const initialState: AccountsState = {
    accounts: [],
    activeAccountId: "default",
};

export const accountsSlice = createSlice({
    name: "accounts",
    initialState,
    reducers: {
        hydrateAccounts: (state, action: PayloadAction<AccountsState>) => {
            state.accounts = action.payload.accounts;
            state.activeAccountId = action.payload.activeAccountId;
        },
        addAccount: (state, action: PayloadAction<IAccountSummary>) => {
            state.accounts = state.accounts.filter((a) => a.id !== action.payload.id).concat(action.payload);
        },
        removeAccount: (state, action: PayloadAction<string>) => {
            state.accounts = state.accounts.filter((a) => a.id !== action.payload);
        },
        updateAccountProfile: (
            state,
            action: PayloadAction<{ id: string; name?: string; avatarUrl?: string; handle?: string }>
        ) => {
            const account = state.accounts.find((a) => a.id === action.payload.id);
            if (!account) return;
            if (action.payload.name !== undefined) account.name = action.payload.name;
            if (action.payload.avatarUrl !== undefined) account.avatarUrl = action.payload.avatarUrl;
            if (action.payload.handle !== undefined) account.handle = action.payload.handle;
        },
        setAccountUnreadCount: (state, action: PayloadAction<{ id: string; count: number }>) => {
            const account = state.accounts.find((a) => a.id === action.payload.id);
            if (account) account.unreadCount = action.payload.count;
        },
        setActiveAccountId: (state, action: PayloadAction<string>) => {
            state.activeAccountId = action.payload;
        },
    },
});

export const {
    hydrateAccounts,
    addAccount,
    removeAccount,
    updateAccountProfile,
    setAccountUnreadCount,
    setActiveAccountId,
} = accountsSlice.actions;
export default accountsSlice.reducer;
