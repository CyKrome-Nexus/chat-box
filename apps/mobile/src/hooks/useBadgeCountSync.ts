import { useEffect } from "react";
import { useSelector } from "react-redux";

import { setAppBadgeCount } from "@/src/lib/notifications/messageNotifications";
import { IChatRibbon } from "@/src/interfaces/list-interface";

/** Keeps the app icon's badge count in sync with total unread conversations. */
export const useBadgeCountSync = () => {
    const totalUnread = useSelector((state: any) =>
        (state.chats.chats as IChatRibbon[]).reduce((sum, c) => sum + (c.notificationCount || 0), 0)
    );

    useEffect(() => {
        setAppBadgeCount(totalUnread);
    }, [totalUnread]);
};
