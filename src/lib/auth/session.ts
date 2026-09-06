import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * expo-secure-store isn't available on web, so this falls back to
 * AsyncStorage there — the session payload isn't a secret credential (no
 * password/token exists yet, since there's no backend issuing one), so the
 * weaker storage on web is an acceptable trade-off rather than a security
 * regression.
 *
 * Multi-Account (see docs/architecture/multi-account.md): each linked
 * account gets its own session slot, keyed by account id — "default" keeps
 * the original unsuffixed `chatbox.session` key so existing installs don't
 * lose their session on upgrade; every account added after uses
 * `chatbox.session.<accountId>`.
 *
 * The key must contain only alphanumerics, ".", "-", and "_" —
 * `expo-secure-store` (iOS Keychain / Android Keystore) rejects any other
 * character, including ":". The original key here was `chatbox:session`,
 * which is actually invalid and made every `getItemAsync`/`setItemAsync`
 * call throw; this was never caught before because this was the first time
 * this app was ever run as a real build rather than only type-checked (see
 * docs/architecture/versioning.md's sibling bugs found the same way). The
 * thrown exception, unhandled inside `useSessionPersistence`'s startup
 * effect, silently prevented `session.status` from ever reaching "ready" —
 * which is what actually kept the splash screen up forever, not anything
 * about the splash screen itself.
 */
const sessionKey = (accountId: string) => (accountId === "default" ? "chatbox.session" : `chatbox.session.${accountId}`);

export interface ISessionUser {
    name: string;
    username: string;
    handle?: string;
    avatar?: { url?: string };
    about?: string;
}

const storage = Platform.OS === "web"
    ? {
          getItem: AsyncStorage.getItem,
          setItem: AsyncStorage.setItem,
          deleteItem: AsyncStorage.removeItem,
      }
    : {
          getItem: SecureStore.getItemAsync,
          setItem: SecureStore.setItemAsync,
          deleteItem: SecureStore.deleteItemAsync,
      };

export const saveSession = async (user: ISessionUser, accountId: string = "default"): Promise<void> => {
    await storage.setItem(sessionKey(accountId), JSON.stringify(user));
};

export const getSession = async (accountId: string = "default"): Promise<ISessionUser | null> => {
    const raw = await storage.getItem(sessionKey(accountId));
    return raw ? JSON.parse(raw) : null;
};

export const clearSession = async (accountId: string = "default"): Promise<void> => {
    await storage.deleteItem(sessionKey(accountId));
};
