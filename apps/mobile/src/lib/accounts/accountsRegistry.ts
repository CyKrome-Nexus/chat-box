import AsyncStorage from "@react-native-async-storage/async-storage";

import { IAccountSummary } from "@/src/redux/features/accountsSlice";

/**
 * The list of linked accounts and which one is active — separate from each
 * account's own session (`src/lib/auth/session.ts`, which holds that
 * account's `IUser`) and separate from each account's E2EE identity
 * (`identityKeyStore.ts`) and local database (`database.ts`). This registry
 * is just the "table of contents" the Account Switcher UI reads to know
 * which accounts exist at all. See docs/architecture/multi-account.md.
 */
const REGISTRY_KEY = "chatbox:accounts:registry";

export interface IAccountsRegistry {
    accounts: IAccountSummary[];
    activeAccountId: string;
}

const DEFAULT_REGISTRY: IAccountsRegistry = { accounts: [], activeAccountId: "default" };

export const getAccountsRegistry = async (): Promise<IAccountsRegistry> => {
    const raw = await AsyncStorage.getItem(REGISTRY_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_REGISTRY;
};

export const saveAccountsRegistry = async (registry: IAccountsRegistry): Promise<void> => {
    await AsyncStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
};

/** Generates a short, storage-key-safe id for a newly linked account —
 * distinct from "default" (reserved for the original single-account
 * session) by construction, since this always includes a hyphen. */
export const generateAccountId = (): string => `acct-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
