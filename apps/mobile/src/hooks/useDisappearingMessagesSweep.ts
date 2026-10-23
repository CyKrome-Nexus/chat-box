import { useEffect } from "react";
import { useDispatch, useStore } from "react-redux";

import { deleteMessage } from "@/src/redux/features/messagesSlice";

const SWEEP_INTERVAL_MS = 15 * 1000;

/**
 * Purges expired disappearing messages (see disappearingMessages.ts) from
 * both Redux and SQLite — `deleteMessage`'s write-through in
 * persistenceMiddleware.ts already handles the DB side and the FTS index.
 * Runs once immediately (to catch anything that expired while the app was
 * closed) and then on a short interval while the app is open.
 */
export const useDisappearingMessagesSweep = () => {
    const dispatch = useDispatch();
    const store = useStore();

    useEffect(() => {
        const sweep = () => {
            const state: any = store.getState();
            const now = Date.now();
            const byConversation = state.messages.byConversation as Record<string, any[]>;

            for (const [conversationId, messages] of Object.entries(byConversation)) {
                for (const message of messages) {
                    if (message.expiresAt && message.expiresAt <= now) {
                        dispatch(deleteMessage({ conversationId, messageId: message.id }));
                    }
                }
            }
        };

        sweep();
        const interval = setInterval(sweep, SWEEP_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [dispatch, store]);
};
