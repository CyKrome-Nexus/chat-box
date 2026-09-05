import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";

import { useCallManager } from "./useCallManager";
import { CallPeerConnection } from "@/src/lib/calling/webrtcService";
import { realtimeSocketClient } from "@/src/lib/realtime/socketClient";
import { ICallSignalEvent } from "@/src/lib/realtime/types";
import { startCall, markCallConnected, TCallMediaType } from "@/src/redux/features/callSlice";
import { IAvatar } from "@/src/interfaces/list-interface";

const REALTIME_CONFIGURED = !!process.env.EXPO_PUBLIC_REALTIME_URL;

/**
 * Wraps useCallManager with real WebRTC signaling over the shared realtime
 * socket, when a realtime server is actually configured (see
 * docs/architecture/audio-calling-engine.md — there isn't one in this repo
 * yet). With no server configured, every method here defers entirely to
 * useCallManager's local call-UI simulation, so the app's behavior is
 * unchanged from before this hook existed.
 */
export const useCallEngine = (currentUserId: string) => {
    const dispatch = useDispatch();
    const base = useCallManager();
    const activeCall = useSelector((state: any) => state.call.activeCall);
    const peerRef = useRef<CallPeerConnection | null>(null);

    const teardownPeer = () => {
        peerRef.current?.close();
        peerRef.current = null;
    };

    useEffect(() => {
        if (!REALTIME_CONFIGURED) return;

        const onOffer = async (payload: ICallSignalEvent) => {
            // An incoming call from another client. useCallManager's own
            // simulateIncomingCall is for local dev/demo only; a real offer
            // drives the same activeCall state via startCall directly.
            dispatch(
                startCall({
                    contactName: payload.fromUserId,
                    type: "audio",
                    direction: "incoming",
                })
            );
        };

        const onAnswer = async (payload: ICallSignalEvent) => {
            if (!peerRef.current || !payload.sdp) return;
            await peerRef.current.acceptAnswer({ sdp: payload.sdp, type: "answer" });
            dispatch(markCallConnected());
        };

        const onIceCandidate = async (payload: ICallSignalEvent) => {
            if (!peerRef.current || !payload.candidate) return;
            await peerRef.current.addRemoteIceCandidate(payload.candidate);
        };

        const onEnd = () => {
            teardownPeer();
            base.hangUp();
        };

        realtimeSocketClient.on("call:offer", onOffer);
        realtimeSocketClient.on("call:answer", onAnswer);
        realtimeSocketClient.on("call:ice-candidate", onIceCandidate);
        realtimeSocketClient.on("call:end", onEnd);

        return () => {
            realtimeSocketClient.off("call:offer", onOffer);
            realtimeSocketClient.off("call:answer", onAnswer);
            realtimeSocketClient.off("call:ice-candidate", onIceCandidate);
            realtimeSocketClient.off("call:end", onEnd);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const startOutgoingCall = async (contact: { name: string; avatar?: IAvatar }, type: TCallMediaType) => {
        base.startOutgoingCall(contact, type);
        if (!REALTIME_CONFIGURED) return;

        const peer = new CallPeerConnection();
        peerRef.current = peer;
        peer.onIceCandidate = (candidate) => {
            realtimeSocketClient.emit("call:ice-candidate", {
                callId: activeCall?.id || "",
                conversationId: contact.name,
                fromUserId: currentUserId,
                candidate: candidate.toJSON() as any,
            });
        };

        await peer.startLocalStream(type === "video");
        const offer = await peer.createOffer();
        realtimeSocketClient.emit("call:offer", {
            callId: activeCall?.id || "",
            conversationId: contact.name,
            fromUserId: currentUserId,
            sdp: offer.sdp,
            type: "offer",
        });
    };

    const acceptIncomingCall = async () => {
        base.acceptIncomingCall();
        // A real integration would create the answer here using the offer's
        // SDP cached from onOffer above and emit "call:answer" — omitted
        // since there's no live offer payload to answer without a server to
        // exchange it with (see the doc referenced above).
    };

    const hangUp = () => {
        if (REALTIME_CONFIGURED && activeCall) {
            realtimeSocketClient.emit("call:end", {
                callId: activeCall.id,
                conversationId: activeCall.contactName,
                reason: "hangup",
            });
        }
        teardownPeer();
        base.hangUp();
    };

    return { ...base, startOutgoingCall, acceptIncomingCall, hangUp };
};
