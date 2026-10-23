import { Platform } from "react-native";
import notifee, { AndroidCategory, AndroidImportance } from "@notifee/react-native";

const CHANNEL_ID = "incoming-calls";

/**
 * Android full-screen incoming-call notification (Notifee), wakes the
 * screen and shows Accept/Decline actions even when the app is
 * backgrounded/locked — this is the Android counterpart to CallKit on iOS
 * (see useCallKeepIntegration and docs/architecture/audio-calling-engine.md
 * for what's still missing to wake the app from a fully *terminated* state,
 * which needs a push notification, not just this).
 */
export const showIncomingCallNotification = async (callId: string, callerName: string) => {
    if (Platform.OS !== "android") return;

    await notifee.createChannel({
        id: CHANNEL_ID,
        name: "Incoming Calls",
        importance: AndroidImportance.HIGH,
        sound: "default",
        vibration: true,
    });

    await notifee.displayNotification({
        id: callId,
        title: callerName,
        body: "Incoming call…",
        android: {
            channelId: CHANNEL_ID,
            category: AndroidCategory.CALL,
            importance: AndroidImportance.HIGH,
            fullScreenAction: { id: "default" },
            pressAction: { id: "default", launchActivity: "default" },
            actions: [
                { title: "Decline", pressAction: { id: "decline" } },
                { title: "Accept", pressAction: { id: "accept" } },
            ],
            ongoing: true,
            autoCancel: false,
        },
    });
};

export const dismissIncomingCallNotification = async (callId: string) => {
    if (Platform.OS !== "android") return;
    await notifee.cancelNotification(callId);
};
