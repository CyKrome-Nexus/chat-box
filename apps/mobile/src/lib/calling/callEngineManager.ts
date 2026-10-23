import { router } from "expo-router";
import * as Crypto from "expo-crypto";
import type { MediaStream } from "react-native-webrtc";

import type { CallInvitePayload, CallMediaPayload, CallSignalPayload, CallStatePayload } from "@chatbox/shared";

import { realtimeSocketClient } from "@/src/lib/realtime/socketClient";
import { syncCallHistory } from "@/src/lib/sync/chatSync";
import type { IChatRibbon } from "@/src/interfaces/list-interface";
import { store } from "@/src/redux/store/store";
import {
    clearActiveCall,
    endCall,
    markCallConnected,
    setCallId,
    setCallStatus,
    startCall,
    updateParticipant,
    type IActiveCall,
    type TCallMediaType,
} from "@/src/redux/features/callSlice";
import { AdaptiveBitrateController } from "./adaptiveBitrate";
import { loadIceServers } from "./webrtcConfig";
import { CallPeerConnection, getLocalMedia } from "./webrtcService";

type TStreamsListener = (streams: { local: MediaStream | null; remote: Map<string, MediaStream> }) => void;

const END_SCREEN_MS = 1200;

// Full-mesh WebRTC engine: one peer per participant, signalled through the API socket.
class CallEngineManager {
    private myId = "";
    private attached = false;
    private localStream: MediaStream | null = null;
    private peers = new Map<string, CallPeerConnection>();
    private bitrate = new Map<string, AdaptiveBitrateController>();
    private remoteStreams = new Map<string, MediaStream>();
    private listeners = new Set<TStreamsListener>();
    private joined = false;
    private audioMuted = false;
    private videoEnabled = true;
    uuid: string | null = null;

    private get call(): IActiveCall | null {
        return store.getState().call.activeCall;
    }

    subscribe(listener: TStreamsListener) {
        this.listeners.add(listener);
        listener({ local: this.localStream, remote: this.remoteStreams });
        return () => {
            this.listeners.delete(listener);
        };
    }

    private emitStreams() {
        const snapshot = { local: this.localStream, remote: new Map(this.remoteStreams) };
        this.listeners.forEach((listener) => listener(snapshot));
    }

    attach(myId: string) {
        this.myId = myId;
        if (this.attached) return;
        this.attached = true;
        realtimeSocketClient.on("call:incoming", this.onIncoming);
        realtimeSocketClient.on("call:signal", this.onSignal);
        realtimeSocketClient.on("call:state", this.onState);
        realtimeSocketClient.on("call:media", this.onMedia);
    }

    detach() {
        if (!this.attached) return;
        this.attached = false;
        realtimeSocketClient.off("call:incoming", this.onIncoming);
        realtimeSocketClient.off("call:signal", this.onSignal);
        realtimeSocketClient.off("call:state", this.onState);
        realtimeSocketClient.off("call:media", this.onMedia);
    }

    async startOutgoing(chat: IChatRibbon, type: TCallMediaType) {
        if (this.call) return;
        const socket = realtimeSocketClient.raw;
        if (!socket || realtimeSocketClient.getStatus() !== "online") throw new Error("You're offline. Connect to the internet to place calls.");

        this.uuid = Crypto.randomUUID();
        this.joined = true;
        store.dispatch(
            startCall({
                id: "",
                conversationId: chat.id,
                contactName: chat.name,
                contactAvatar: chat.avatar?.url ? chat.avatar : undefined,
                isGroup: Boolean(chat.isGroup),
                type,
                direction: "outgoing",
                participants: (chat.participants ?? [])
                    .filter((participant) => participant.id !== "me")
                    .map((participant) => ({ id: participant.id, name: participant.name, avatar: participant.avatar })),
            }),
        );
        router.push("/call");

        try {
            await Promise.all([loadIceServers(), this.ensureLocalStream(type === "video")]);
            const response = await socket.timeout(10_000).emitWithAck("call:invite", { conversationId: chat.id, type });
            if (!response.ok) throw new Error(response.error.message);
            store.dispatch(setCallId(response.data.callId));
        } catch (error) {
            this.finish("failed");
            throw error;
        }
    }

    async accept() {
        const call = this.call;
        if (!call || call.direction !== "incoming" || this.joined) return;
        this.joined = true;
        store.dispatch(setCallStatus("connecting"));
        await Promise.all([loadIceServers(), this.ensureLocalStream(call.type === "video")]);
        realtimeSocketClient.emit("call:accept", { callId: call.id });
    }

    decline() {
        const call = this.call;
        if (!call) return;
        realtimeSocketClient.emit("call:decline", { callId: call.id });
        this.finish("declined");
    }

    hangUp() {
        const call = this.call;
        if (!call) return;
        if (call.direction === "incoming" && !this.joined) realtimeSocketClient.emit("call:decline", { callId: call.id });
        else if (call.id) realtimeSocketClient.emit("call:end", { callId: call.id });
        this.finish("ended");
    }

    toggleMute(): boolean {
        this.audioMuted = !this.audioMuted;
        this.localStream?.getAudioTracks().forEach((track) => (track.enabled = !this.audioMuted));
        this.broadcastMedia();
        return this.audioMuted;
    }

    toggleVideo(): boolean {
        this.videoEnabled = !this.videoEnabled;
        this.localStream?.getVideoTracks().forEach((track) => (track.enabled = this.videoEnabled));
        this.broadcastMedia();
        return this.videoEnabled;
    }

    switchCamera() {
        const track = this.localStream?.getVideoTracks()[0] as unknown as { _switchCamera?: () => void } | undefined;
        track?._switchCamera?.();
    }

    private broadcastMedia() {
        const call = this.call;
        if (call?.id) realtimeSocketClient.emit("call:media", { callId: call.id, audioMuted: this.audioMuted, videoEnabled: this.videoEnabled });
    }

    private async ensureLocalStream(video: boolean) {
        if (this.localStream) return this.localStream;
        this.localStream = await getLocalMedia(video);
        this.videoEnabled = video;
        this.emitStreams();
        return this.localStream;
    }

    private createPeer(userId: string): CallPeerConnection | null {
        const call = this.call;
        if (!call || !this.localStream) return null;
        this.peers.get(userId)?.close();

        const peer = new CallPeerConnection(this.localStream);
        peer.onIceCandidate = (candidate) =>
            realtimeSocketClient.emit("call:signal", { callId: call.id, toUserId: userId, candidate });
        peer.onRemoteStream = (stream) => {
            this.remoteStreams.set(userId, stream);
            this.emitStreams();
        };
        peer.onConnectionStateChange = (state) => {
            if (state === "connected") {
                store.dispatch(markCallConnected());
                store.dispatch(updateParticipant({ id: userId, joined: true }));
            }
            if (state === "failed" || state === "closed") this.dropPeer(userId);
        };
        if (call.type === "video") {
            const controller = new AdaptiveBitrateController();
            controller.start(peer.getRawConnection());
            this.bitrate.set(userId, controller);
        }
        this.peers.set(userId, peer);
        return peer;
    }

    private dropPeer(userId: string) {
        this.bitrate.get(userId)?.stop();
        this.bitrate.delete(userId);
        this.peers.get(userId)?.close();
        this.peers.delete(userId);
        this.remoteStreams.delete(userId);
        store.dispatch(updateParticipant({ id: userId, joined: false }));
        this.emitStreams();
    }

    private onIncoming = (payload: CallInvitePayload) => {
        if (this.call) {
            realtimeSocketClient.emit("call:decline", { callId: payload.callId, busy: true });
            return;
        }
        const chat = store.getState().chats.chats.find((item) => item.id === payload.conversationId);
        this.uuid = Crypto.randomUUID();
        this.joined = false;
        store.dispatch(
            startCall({
                id: payload.callId,
                conversationId: payload.conversationId,
                contactName: payload.from.name,
                contactAvatar: payload.from.avatarUrl ? { url: payload.from.avatarUrl } : undefined,
                isGroup: Boolean(chat?.isGroup),
                type: payload.type,
                direction: "incoming",
                participants: (chat?.participants ?? [])
                    .filter((participant) => participant.id !== "me")
                    .map((participant) => ({ id: participant.id, name: participant.name, avatar: participant.avatar })),
            }),
        );
        router.push("/call");
    };

    // Joined participants offer to whoever accepts next, building the mesh without glare.
    private onState = (payload: CallStatePayload) => {
        const call = this.call;
        if (!call || payload.callId !== call.id) return;
        if (payload.state === "missed") return this.finish("missed");
        if (payload.userId === this.myId) {
            // Answered or rejected on another of my devices: stop ringing here.
            if (!this.joined) this.finish(payload.state === "accepted" ? "ended" : "declined");
            return;
        }

        if (payload.state === "accepted") {
            store.dispatch(updateParticipant({ id: payload.userId, joined: true }));
            if (!this.joined) return;
            store.dispatch(setCallStatus(call.status === "active" ? "active" : "connecting"));
            void (async () => {
                const peer = this.createPeer(payload.userId);
                if (!peer) return;
                const sdp = await peer.createOffer();
                realtimeSocketClient.emit("call:signal", { callId: call.id, toUserId: payload.userId, sdp, sdpType: "offer" });
            })();
            return;
        }

        if (payload.state === "declined" || payload.state === "busy") {
            if (!call.isGroup) return this.finish(payload.state);
            store.dispatch(updateParticipant({ id: payload.userId, joined: false }));
            return;
        }
        if (payload.state === "ended") {
            this.dropPeer(payload.userId);
            const ringingAlone = call.direction === "incoming" && !this.joined;
            if (!call.isGroup || ringingAlone || this.peers.size === 0) this.finish("ended");
        }
    };

    private onSignal = (payload: CallSignalPayload) => {
        const call = this.call;
        if (!call || payload.callId !== call.id) return;
        void (async () => {
            if (payload.sdpType === "offer" && payload.sdp) {
                const peer = this.createPeer(payload.fromUserId);
                if (!peer) return;
                const sdp = await peer.createAnswer(payload.sdp);
                realtimeSocketClient.emit("call:signal", { callId: call.id, toUserId: payload.fromUserId, sdp, sdpType: "answer" });
                return;
            }
            const peer = this.peers.get(payload.fromUserId);
            if (!peer) return;
            if (payload.sdpType === "answer" && payload.sdp) await peer.acceptAnswer(payload.sdp);
            if (payload.candidate) await peer.addRemoteIceCandidate(payload.candidate);
        })();
    };

    private onMedia = (payload: CallMediaPayload) => {
        if (payload.callId !== this.call?.id) return;
        store.dispatch(updateParticipant({ id: payload.userId, audioMuted: payload.audioMuted, videoEnabled: payload.videoEnabled }));
    };

    private finish(reason: NonNullable<IActiveCall["endReason"]>) {
        [...this.peers.keys()].forEach((userId) => this.dropPeer(userId));
        this.localStream?.getTracks().forEach((track) => track.stop());
        this.localStream = null;
        this.joined = false;
        this.audioMuted = false;
        this.videoEnabled = true;
        this.emitStreams();
        store.dispatch(endCall(reason));
        setTimeout(() => {
            store.dispatch(clearActiveCall());
            this.uuid = null;
            void syncCallHistory().catch(() => undefined);
        }, END_SCREEN_MS);
    }
}

export const callEngineManager = new CallEngineManager();
