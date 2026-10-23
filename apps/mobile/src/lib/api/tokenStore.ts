import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AuthTokens } from "@chatbox/shared";

type TListener = (tokens: AuthTokens | null) => void;

const storage =
    Platform.OS === "web"
        ? { get: AsyncStorage.getItem, set: AsyncStorage.setItem, remove: AsyncStorage.removeItem }
        : {
              get: (key: string) => SecureStore.getItemAsync(key),
              set: (key: string, value: string) =>
                  SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY }),
              remove: (key: string) => SecureStore.deleteItemAsync(key),
          };

const keyFor = (accountId: string) => (accountId === "default" ? "chatbox.tokens" : `chatbox.tokens.${accountId}`);

let accountId = "default";
let current: AuthTokens | null = null;
const listeners = new Set<TListener>();

const notify = () => listeners.forEach((listener) => listener(current));

// Access/refresh tokens for the active account, kept in memory and mirrored to the keychain.
export const tokenStore = {
    get: () => current,
    accessToken: () => current?.accessToken ?? null,
    async load(nextAccountId: string): Promise<AuthTokens | null> {
        accountId = nextAccountId;
        const raw = await storage.get(keyFor(accountId)).catch(() => null);
        current = raw ? (JSON.parse(raw) as AuthTokens) : null;
        notify();
        return current;
    },
    async save(tokens: AuthTokens): Promise<void> {
        current = tokens;
        await storage.set(keyFor(accountId), JSON.stringify(tokens));
        notify();
    },
    async clear(targetAccountId: string = accountId): Promise<void> {
        await storage.remove(keyFor(targetAccountId)).catch(() => undefined);
        if (targetAccountId === accountId) {
            current = null;
            notify();
        }
    },
    subscribe(listener: TListener): () => void {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    },
};
