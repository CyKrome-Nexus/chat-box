import { useEffect } from "react";
import { Platform } from "react-native";
import { useSelector } from "react-redux";
import notifee, { EventType } from "@notifee/react-native";

import { dismissIncomingCallNotification, showIncomingCallNotification } from "@/src/lib/calling/incomingCallNotification";
import { callEngineManager } from "@/src/lib/calling/callEngineManager";
import type { RootState } from "@/src/redux/store/store";

// Android full-screen ringing notification with Accept/Decline actions.
export const useIncomingCallNotification = () => {
    const activeCall = useSelector((state: RootState) => state.call.activeCall);

    useEffect(() => {
        if (Platform.OS !== "android" || !activeCall?.id) return;
        if (activeCall.direction === "incoming" && activeCall.status === "ringing") {
            void showIncomingCallNotification(activeCall.id, activeCall.contactName);
        } else {
            void dismissIncomingCallNotification(activeCall.id);
        }
    }, [activeCall]);

    useEffect(() => {
        if (Platform.OS !== "android") return;
        return notifee.onForegroundEvent(({ type, detail }) => {
            if (type !== EventType.ACTION_PRESS) return;
            if (detail.pressAction?.id === "accept") void callEngineManager.accept();
            if (detail.pressAction?.id === "decline") callEngineManager.decline();
        });
    }, []);
};
