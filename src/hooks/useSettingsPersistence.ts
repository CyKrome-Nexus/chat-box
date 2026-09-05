import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { hydrateSettings } from "@/src/redux/features/settingsSlice";

const STORAGE_KEY = "chatbox:settings";

/** Loads persisted preferences on startup and saves them on every change. */
export const useSettingsPersistence = () => {
    const dispatch = useDispatch();
    const settings = useSelector((state: any) => state.settings);
    const hasHydratedRef = useRef(false);

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
            if (raw) dispatch(hydrateSettings(JSON.parse(raw)));
            hasHydratedRef.current = true;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!hasHydratedRef.current) return;
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }, [settings]);
};
