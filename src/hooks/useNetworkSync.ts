import { useEffect } from "react";
import { useDispatch } from "react-redux";
import NetInfo from "@react-native-community/netinfo";

import { realtimeSocketClient } from "@/src/lib/realtime/socketClient";
import { bumpRetry, dequeueSync, listDueSyncEntries } from "@/src/lib/db/syncQueueRepo";
import { markMessageFlushed } from "@/src/redux/features/messagesSlice";

const POLL_INTERVAL_MS = 5000;

/**
 * Drains the SQLite-backed sync_queue (the durable outbox — see
 * docs/architecture/offline-database.md) whenever the device is online: on
 * every reconnect event from @react-native-community/netinfo, and on a
 * steady poll while connected (so entries whose exponential backoff window
 * elapses get retried even without a fresh connectivity transition).
 */
export const useNetworkSync = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        const drain = async () => {
            const netState = await NetInfo.fetch();
            if (!netState.isConnected) return;

            const dueEntries = await listDueSyncEntries();
            for (const entry of dueEntries) {
                const message = JSON.parse(entry.payload);
                const emitted = realtimeSocketClient.emit("message:send", {
                    conversationId: entry.conversationId,
                    messageId: entry.messageId,
                    text: message.text,
                    senderId: message.senderId || "me",
                    timestamp: message.timestamp,
                });

                if (emitted) {
                    await dequeueSync(entry.messageId);
                    dispatch(markMessageFlushed({ conversationId: entry.conversationId, messageId: entry.messageId }));
                } else {
                    await bumpRetry(entry.messageId, entry.retryCount + 1);
                }
            }
        };

        const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
            if (state.isConnected) drain();
        });
        const interval = setInterval(drain, POLL_INTERVAL_MS);

        return () => {
            unsubscribeNetInfo();
            clearInterval(interval);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
};
