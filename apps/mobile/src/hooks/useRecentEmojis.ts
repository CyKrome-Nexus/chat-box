import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "chatbox:recent-emojis";
const MAX_RECENTS = 24;

export const useRecentEmojis = () => {
    const [recents, setRecents] = useState<string[]>([]);

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
            if (raw) setRecents(JSON.parse(raw));
        });
    }, []);

    const addRecent = useCallback((emoji: string) => {
        setRecents((prev) => {
            const next = [emoji, ...prev.filter((e) => e !== emoji)].slice(0, MAX_RECENTS);
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    return { recents, addRecent };
};
