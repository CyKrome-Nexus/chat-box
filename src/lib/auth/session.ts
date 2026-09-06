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
 * the original unsuffixed `chatbox:session` key so existing installs don't
 * lose their session on upgrade; every account added after uses
 * `chatbox:session:<accountId>`.
 */
const sessionKey = (accountId: string) => (accountId === "default" ? "chatbox:session" : `chatbox:session:${accountId}`);

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
