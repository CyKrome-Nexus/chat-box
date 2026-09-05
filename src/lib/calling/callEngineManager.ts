import type { MediaStream } from "react-native-webrtc";

import { CallPeerConnection } from "./webrtcService";
import { AdaptiveBitrateController } from "./adaptiveBitrate";
import { realtimeSocketClient } from "@/src/lib/realtime/socketClient";
import { ICallSignalEvent } from "@/src/lib/realtime/types";
import { store } from "@/src/redux/store/store";
import { startCall, markCallConnected, endCall, TCallMediaType } from "@/src/redux/features/callSlice";
import { IAvatar } from "@/src/interfaces/list-interface";

const REALTIME_CONFIGURED = !!process.env.EXPO_PUBLIC_REALTIME_URL;

type TRemoteStreamListener = (stream: MediaStream | null) => void;

/**
 * Owns the actual WebRTC peer connection as a module-level singleton,
 * independent of any single component's mount lifecycle. This is what makes
 * "minimize the call and keep browsing" (in-app PiP, FloatingCallBubble.tsx)
 * actually keep audio/video flowing — if the peer connection lived inside a
 * hook called only from the /call screen, navigating away would unmount it
 * and drop the call. `useCallEngine` is a thin React binding on top of this.
 */
class CallEngineManager {
    private peer: CallPeerConnection | null = null;
    private bitrateController: AdaptiveBitrateController | null = null;
    private remoteStream: MediaStream | null = null;
    private listeners = new Set<TRemoteStreamListener>();
    private listenersRegistered = false;

    getRemoteStream() {
        return this.remoteStream;
    }

    onRemoteStreamChange(listener: TRemoteStreamListener) {
        this.listeners.add(listener);
        listener(this.remoteStream);
        return () => {
            this.listeners.delete(listener);
        };
    }

    private setRemoteStream(stream: MediaStream | null) {
        this.remoteStream = stream;
        this.listeners.forEach((listener) => listener(stream));
    }

    ensureSignalingListeners(currentUserId: string) {
        if (this.listenersRegistered || !REALTIME_CONFIGURED) return;
        this.listenersRegistered = true;

        realtimeSocketClient.on("call:offer", (payload: ICallSignalEvent) => {
            store.dispatch(
                startCall({ contactName: payload.fromUserId, type: "audio", direction: "incoming" })
            );
        });

        realtimeSocketClient.on("call:answer", async (payload: ICallSignalEvent) => {
            if (!this.peer || !payload.sdp) return;
            await this.peer.acceptAnswer({ sdp: payload.sdp, type: "answer" });
            store.dispatch(markCallConnected());
        });

        realtimeSocketClient.on("call:ice-candidate", async (payload: ICallSignalEvent) => {
            if (!this.peer || !payload.candidate) return;
            await this.peer.addRemoteIceCandidate(payload.candidate);
        });

        realtimeSocketClient.on("call:end", () => {
            this.teardown();
            store.dispatch(endCall());
        });
    }

    async startOutgoingCall(
        contact: { name: string; avatar?: IAvatar },
        type: TCallMediaType,
        currentUserId: string
    ) {
        if (!REALTIME_CONFIGURED) return;

        const peer = new CallPeerConnection();
        this.peer = peer;
        peer.onIceCandidate = (candidate) => {
            const callId = store.getState().call.activeCall?.id || "";
            realtimeSocketClient.emit("call:ice-candidate", {
                callId,
                conversationId: contact.name,
                fromUserId: currentUserId,
                candidate: candidate.toJSON() as any,
            });
        };
        peer.onRemoteStream = (stream) => this.setRemoteStream(stream);

        await peer.startLocalStream(type === "video");

        if (type === "video") {
            this.bitrateController = new AdaptiveBitrateController();
            this.bitrateController.start(peer.getRawConnection());
        }

        const offer = await peer.createOffer();
        const callId = store.getState().call.activeCall?.id || "";
        realtimeSocketClient.emit("call:offer", {
            callId,
            conversationId: contact.name,
            fromUserId: currentUserId,
            sdp: offer.sdp,
            type: "offer",
        });
    }

    hangUp() {
        const activeCall = store.getState().call.activeCall;
        if (REALTIME_CONFIGURED && activeCall) {
            realtimeSocketClient.emit("call:end", {
                callId: activeCall.id,
                conversationId: activeCall.contactName,
                reason: "hangup",
            });
        }
        this.teardown();
    }

    private teardown() {
        this.bitrateController?.stop();
        this.bitrateController = null;
        this.peer?.close();
        this.peer = null;
        this.setRemoteStream(null);
    }
}

export const callEngineManager = new CallEngineManager();
