import { useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { router } from "expo-router";

import { IAvatar } from "@/src/interfaces/list-interface";
import { endCall, markCallConnected, startCall, TCallMediaType } from "@/src/redux/features/callSlice";

/**
 * There is no WebRTC/signaling backend wired up yet (that's the scope of the
 * production calling engine tickets). This drives the call UI end-to-end
 * with a locally-simulated lifecycle — ringing for a few seconds, then
 * "answered" — so the outgoing/incoming/active screens are all real and
 * testable now, and only need their timers replaced with real signaling
 * events later.
 */
const SIMULATED_RING_MS = 3000;

export const useCallManager = () => {
    const dispatch = useDispatch();
    const activeCall = useSelector((state: any) => state.call.activeCall);
    const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearRingTimeout = () => {
        if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
    };

    const startOutgoingCall = useCallback(
        (contact: { name: string; avatar?: IAvatar }, type: TCallMediaType) => {
            dispatch(
                startCall({
                    contactName: contact.name,
                    contactAvatar: contact.avatar,
                    type,
                    direction: "outgoing",
                })
            );
            router.push("/call");

            clearRingTimeout();
            ringTimeoutRef.current = setTimeout(() => {
                dispatch(markCallConnected());
            }, SIMULATED_RING_MS);
        },
        [dispatch]
    );

    /**
     * Dev-only affordance for previewing the incoming-call screen without a
     * second real client — see docs/architecture/calling.md.
     */
    const simulateIncomingCall = useCallback(
        (contact: { name: string; avatar?: IAvatar }, type: TCallMediaType) => {
            dispatch(
                startCall({
                    contactName: contact.name,
                    contactAvatar: contact.avatar,
                    type,
                    direction: "incoming",
                })
            );
            router.push("/call");
        },
        [dispatch]
    );

    const acceptIncomingCall = useCallback(() => {
        dispatch(markCallConnected());
    }, [dispatch]);

    const hangUp = useCallback(() => {
        clearRingTimeout();
        dispatch(endCall());
        if (router.canGoBack()) router.back();
    }, [dispatch]);

    return { activeCall, startOutgoingCall, simulateIncomingCall, acceptIncomingCall, hangUp };
};
