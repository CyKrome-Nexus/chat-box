import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * expo-secure-store isn't available on web, so this falls back to
 * AsyncStorage there — the session payload isn't a secret credential (no
 * password/token exists yet, since there's no backend issuing one), so the
 * weaker storage on web is an acceptable trade-off rather than a security
 * regression.
 */
const SESSION_KEY = "chatbox:session";

export interface ISessionUser {
    name: string;
    username: string;
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

export const saveSession = async (user: ISessionUser): Promise<void> => {
    await storage.setItem(SESSION_KEY, JSON.stringify(user));
};

export const getSession = async (): Promise<ISessionUser | null> => {
    const raw = await storage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
};

export const clearSession = async (): Promise<void> => {
    await storage.deleteItem(SESSION_KEY);
};
