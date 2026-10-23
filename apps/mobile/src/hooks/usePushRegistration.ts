import { useEffect } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import { devicesApi } from "@/src/lib/api/services";

const projectId = (): string | undefined =>
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? Constants.easConfig?.projectId;

// Registers this device's Expo push token so the API can notify it while the app is closed.
export const usePushRegistration = (userId: string | undefined) => {
    useEffect(() => {
        if (!userId || !Device.isDevice || Platform.OS === "web") return;
        const id = projectId();
        if (!id) return;

        let cancelled = false;
        void (async () => {
            const { status } = await Notifications.getPermissionsAsync();
            const granted = status === "granted" || (await Notifications.requestPermissionsAsync()).status === "granted";
            if (!granted || cancelled) return;
            const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
            if (!cancelled) await devicesApi.register(token);
        })().catch(() => undefined);

        return () => {
            cancelled = true;
        };
    }, [userId]);
};
