import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useSelector } from "react-redux";
import RNCallKeep from "react-native-callkeep";

import { callEngineManager } from "@/src/lib/calling/callEngineManager";
import type { RootState } from "@/src/redux/store/store";

// Mirrors the active call into CallKit / Android ConnectionService so the OS call UI stays in sync.
export const useCallKeepIntegration = (enabled: boolean) => {
    const activeCall = useSelector((state: RootState) => state.call.activeCall);
    const isSetupRef = useRef(false);
    const reportedUuidRef = useRef<string | null>(null);

    useEffect(() => {
        if (!enabled || isSetupRef.current) return;
        isSetupRef.current = true;

        try {
            RNCallKeep.setup({
                ios: { appName: "Chatbox", supportsVideo: true, includesCallsInRecents: true },
                android: {
                    alertTitle: "Phone account permission",
                    alertDescription: "Chatbox needs access to manage calls to show the native call screen.",
                    cancelButton: "Cancel",
                    okButton: "OK",
                    additionalPermissions: [],
                    selfManaged: true,
                },
            }).catch(() => undefined);

            RNCallKeep.addEventListener("answerCall", () => void callEngineManager.accept());
            RNCallKeep.addEventListener("endCall", () => callEngineManager.hangUp());
        } catch {
            // CallKeep is unavailable in Expo Go and simulators without telephony.
        }

        return () => {
            try {
                RNCallKeep.removeEventListener("answerCall");
                RNCallKeep.removeEventListener("endCall");
            } catch {
                // Listener already removed.
            }
        };
    }, [enabled]);

    useEffect(() => {
        try {
            const uuid = callEngineManager.uuid;
            if (activeCall && uuid && reportedUuidRef.current !== uuid && activeCall.status !== "ended") {
                reportedUuidRef.current = uuid;
                if (activeCall.direction === "incoming") {
                    RNCallKeep.displayIncomingCall(uuid, activeCall.contactName, activeCall.contactName, "generic", activeCall.type === "video");
                } else {
                    RNCallKeep.startCall(uuid, activeCall.contactName, activeCall.contactName, "generic", activeCall.type === "video");
                    if (Platform.OS === "ios") RNCallKeep.reportConnectingOutgoingCallWithUUID(uuid);
                }
            }

            if (activeCall?.status === "active" && reportedUuidRef.current) {
                if (activeCall.direction === "outgoing" && Platform.OS === "ios") RNCallKeep.reportConnectedOutgoingCallWithUUID(reportedUuidRef.current);
                RNCallKeep.setCurrentCallActive(reportedUuidRef.current);
            }

            if ((!activeCall || activeCall.status === "ended") && reportedUuidRef.current) {
                RNCallKeep.endCall(reportedUuidRef.current);
                reportedUuidRef.current = null;
            }
        } catch {
            // Native call UI is best-effort; the in-app call screen still works.
        }
    }, [activeCall]);
};
