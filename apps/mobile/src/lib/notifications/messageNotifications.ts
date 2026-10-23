import { Platform } from "react-native";
import notifee, { AndroidImportance, AndroidVisibility } from "@notifee/react-native";

const CHANNEL_ID = "messages";
export const MESSAGE_CATEGORY_ID = "message";
export const REPLY_ACTION_ID = "reply";
export const MARK_READ_ACTION_ID = "mark-read";

/**
 * Registers the Android notification channel and iOS notification category
 * (Reply + Mark as Read quick actions) once at startup. See
 * docs/architecture/push-notifications.md.
 */
export const ensureMessageNotificationSetup = async () => {
    await notifee.requestPermission();

    if (Platform.OS === "android") {
        await notifee.createChannel({
            id: CHANNEL_ID,
            name: "Messages",
            importance: AndroidImportance.HIGH,
            visibility: AndroidVisibility.PRIVATE,
            sound: "default",
            vibration: true,
        });
    }

    if (Platform.OS === "ios") {
        await notifee.setNotificationCategories([
            {
                id: MESSAGE_CATEGORY_ID,
                actions: [
                    {
                        id: REPLY_ACTION_ID,
                        title: "Reply",
                        input: { buttonText: "Send", placeholderText: "Message…" },
                    },
                    { id: MARK_READ_ACTION_ID, title: "Mark as Read" },
                ],
            },
        ]);
    }
};

/**
 * Displays a rich, actionable, per-conversation-grouped notification for an
 * incoming message. Callers are responsible for deciding *whether* to call
 * this at all (see useMessageNotifications.ts — skipped for muted chats,
 * and for whichever conversation is currently on screen).
 */
export const showMessageNotification = async ({
    conversationId,
    chatName,
    chatAvatarUrl,
    messageText,
}: {
    conversationId: string;
    chatName: string;
    chatAvatarUrl?: string;
    messageText: string;
}) => {
    await notifee.displayNotification({
        id: `${conversationId}-${Date.now()}`,
        title: chatName,
        body: messageText,
        data: { conversationId },
        android: {
            channelId: CHANNEL_ID,
            importance: AndroidImportance.HIGH,
            groupId: conversationId,
            largeIcon: chatAvatarUrl,
            circularLargeIcon: true,
            pressAction: { id: "default", launchActivity: "default" },
            actions: [
                { title: "Mark as Read", pressAction: { id: MARK_READ_ACTION_ID } },
                { title: "Reply", pressAction: { id: REPLY_ACTION_ID }, input: { placeholder: "Message…" } },
            ],
        },
        ios: {
            threadId: conversationId,
            categoryId: MESSAGE_CATEGORY_ID,
            attachments: chatAvatarUrl ? [{ url: chatAvatarUrl, thumbnailHidden: false }] : undefined,
        },
    });
};

export const clearNotificationsForConversation = async (conversationId: string) => {
    const displayed = await notifee.getDisplayedNotifications();
    await Promise.all(
        displayed
            .filter((n) => n.notification.data?.conversationId === conversationId)
            .map((n) => notifee.cancelNotification(n.id!))
    );
};

export const setAppBadgeCount = (count: number) => notifee.setBadgeCount(count);
