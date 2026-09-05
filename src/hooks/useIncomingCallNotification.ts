import { useEffect } from "react";
import { Platform } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import notifee, { EventType } from "@notifee/react-native";

import { showIncomingCallNotification, dismissIncomingCallNotification } from "@/src/lib/calling/incomingCallNotification";
import { endCall, markCallConnected } from "@/src/redux/features/callSlice";

/**
 * Shows/dismisses the Android full-screen incoming-call notification in
 * lockstep with `state.call.activeCall`, and wires its Accept/Decline
 * actions back into the call state machine. iOS uses CallKit instead (see
 * useCallKeepIntegration) — Notifee's own UI is Android-only here.
 */
export const useIncomingCallNotification = () => {
    const dispatch = useDispatch();
    const activeCall = useSelector((state: any) => state.call.activeCall);

    useEffect(() => {
        if (Platform.OS !== "android") return;
        if (activeCall?.direction === "incoming" && activeCall.status === "ringing") {
            showIncomingCallNotification(activeCall.id, activeCall.contactName);
        } else if (activeCall) {
            dismissIncomingCallNotification(activeCall.id);
        }
    }, [activeCall]);

    useEffect(() => {
        if (Platform.OS !== "android") return;

        return notifee.onForegroundEvent(({ type, detail }) => {
            if (type !== EventType.ACTION_PRESS) return;
            if (detail.pressAction?.id === "accept") dispatch(markCallConnected());
            if (detail.pressAction?.id === "decline") dispatch(endCall());
        });
    }, [dispatch]);
};
