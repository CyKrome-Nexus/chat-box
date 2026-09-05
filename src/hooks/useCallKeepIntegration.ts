import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import RNCallKeep from "react-native-callkeep";

import { endCall, markCallConnected } from "@/src/redux/features/callSlice";

/**
 * Reports the app's own call state to the OS via react-native-callkeep, so
 * an active call shows the native in-call UI (iOS CallKit lock-screen
 * poster / Android ConnectionService UI) while the app is foregrounded or
 * backgrounded.
 *
 * This does NOT cover waking the app from a fully terminated state for an
 * incoming call — that requires PushKit (iOS) / FCM high-priority data
 * messages (Android) delivering a VoIP push before CallKeep can display
 * anything, which in turn requires real push credentials and a backend to
 * send them. Neither exists in this repo — see
 * docs/architecture/audio-calling-engine.md for what a real deployment
 * still needs to wire up.
 */
export const useCallKeepIntegration = () => {
    const dispatch = useDispatch();
    const activeCall = useSelector((state: any) => state.call.activeCall);
    const isSetupRef = useRef(false);
    const currentUuidRef = useRef<string | null>(null);

    useEffect(() => {
        if (isSetupRef.current) return;
        isSetupRef.current = true;

        RNCallKeep.setup({
            ios: {
                appName: "Chatbox",
                supportsVideo: true,
                includesCallsInRecents: true,
            },
            android: {
                alertTitle: "Phone account permission",
                alertDescription: "Chatbox needs access to manage calls to show the native call screen.",
                cancelButton: "Cancel",
                okButton: "OK",
                additionalPermissions: [],
                selfManaged: true,
            },
        }).catch(() => {
            // No-op: CallKeep's native module isn't linked (e.g. running in
            // Expo Go / a dev client built before this feature was added).
        });

        RNCallKeep.addEventListener("answerCall", () => {
            dispatch(markCallConnected());
        });
        RNCallKeep.addEventListener("endCall", () => {
            dispatch(endCall());
        });

        return () => {
            RNCallKeep.removeEventListener("answerCall");
            RNCallKeep.removeEventListener("endCall");
        };
    }, [dispatch]);

    // Mirror our own call state into the native UI.
    useEffect(() => {
        try {
            if (activeCall && !currentUuidRef.current) {
                currentUuidRef.current = activeCall.id;
                if (activeCall.direction === "incoming") {
                    RNCallKeep.displayIncomingCall(
                        activeCall.id,
                        activeCall.contactName,
                        activeCall.contactName,
                        "generic",
                        activeCall.type === "video"
                    );
                } else {
                    RNCallKeep.startCall(activeCall.id, activeCall.contactName, activeCall.contactName);
                    if (Platform.OS === "ios") {
                        RNCallKeep.reportConnectingOutgoingCallWithUUID(activeCall.id);
                    }
                }
            }

            if (activeCall?.status === "active" && currentUuidRef.current) {
                if (activeCall.direction === "outgoing" && Platform.OS === "ios") {
                    RNCallKeep.reportConnectedOutgoingCallWithUUID(currentUuidRef.current);
                }
                RNCallKeep.setCurrentCallActive(currentUuidRef.current);
            }

            if (!activeCall && currentUuidRef.current) {
                RNCallKeep.endCall(currentUuidRef.current);
                currentUuidRef.current = null;
            }
        } catch {
            // Same as above: silently no-op without a linked native module.
        }
    }, [activeCall]);
};
