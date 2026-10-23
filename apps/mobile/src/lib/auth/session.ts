import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { IUser } from "@/src/interfaces/user-interface";

// SecureStore keys may only contain alphanumerics, ".", "-" and "_".
const sessionKey = (accountId: string) => (accountId === "default" ? "chatbox.session" : `chatbox.session.${accountId}`);

export type ISessionUser = IUser;

const storage =
    Platform.OS === "web"
        ? { getItem: AsyncStorage.getItem, setItem: AsyncStorage.setItem, deleteItem: AsyncStorage.removeItem }
        : { getItem: SecureStore.getItemAsync, setItem: SecureStore.setItemAsync, deleteItem: SecureStore.deleteItemAsync };

export const saveSession = async (user: IUser, accountId: string = "default"): Promise<void> => {
    await storage.setItem(sessionKey(accountId), JSON.stringify(user));
};

export const getSession = async (accountId: string = "default"): Promise<IUser | null> => {
    const raw = await storage.getItem(sessionKey(accountId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<IUser>;
    return parsed.id ? (parsed as IUser) : null;
};

export const clearSession = async (accountId: string = "default"): Promise<void> => {
    await storage.deleteItem(sessionKey(accountId));
};
