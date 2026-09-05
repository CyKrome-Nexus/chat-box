import {
    mediaDevices,
    MediaStream,
    RTCIceCandidate,
    RTCPeerConnection as RNRTCPeerConnection,
    RTCSessionDescription,
} from "react-native-webrtc";

import { getIceServers } from "./webrtcConfig";

/**
 * Thin wrapper around one RTCPeerConnection for the lifetime of a single
 * call. There is no signaling server in this repo to exchange SDP/ICE with
 * (see docs/architecture/audio-calling-engine.md) — this class is written
 * against the real react-native-webrtc API so it works as soon as one
 * exists; `useCallEngine` decides whether to use it (server configured) or
 * fall back to the local call-UI simulation from the calling-UI ticket.
 */
export class CallPeerConnection {
    private pc: RNRTCPeerConnection;
    private localStream: MediaStream | null = null;

    onIceCandidate: ((candidate: RTCIceCandidate) => void) | null = null;
    onRemoteStream: ((stream: MediaStream) => void) | null = null;
    onConnectionStateChange: ((state: string) => void) | null = null;

    constructor() {
        this.pc = new RNRTCPeerConnection({ iceServers: getIceServers() });

        // react-native-webrtc's shipped RTCPeerConnection.d.ts imports its
        // EventTarget base from a "./vendor/event-target-shim" path that
        // isn't actually included in the published package, so TS resolves
        // the class's inherited members (addEventListener, etc.) as an
        // error type even though they exist at runtime. Cast to `any` for
        // just these registrations rather than losing type-checking on the
        // rest of this file.
        const pc = this.pc as any;

        pc.addEventListener("icecandidate", (event: any) => {
            if (event.candidate) this.onIceCandidate?.(event.candidate);
        });

        pc.addEventListener("track", (event: any) => {
            const [stream] = event.streams;
            if (stream) this.onRemoteStream?.(stream);
        });

        pc.addEventListener("connectionstatechange", () => {
            this.onConnectionStateChange?.(this.pc.connectionState);
        });
    }

    async startLocalStream(video: boolean): Promise<MediaStream> {
        const stream = await mediaDevices.getUserMedia({
            audio: true,
            video: video
                ? { facingMode: "user", width: 1280, height: 720 }
                : false,
        });

        this.localStream = stream as unknown as MediaStream;
        this.localStream.getTracks().forEach((track) => this.pc.addTrack(track, this.localStream!));
        return this.localStream;
    }

    async createOffer(): Promise<RTCSessionDescription> {
        const offer = await this.pc.createOffer({});
        await this.pc.setLocalDescription(offer);
        return this.pc.localDescription!;
    }

    async createAnswer(remoteOffer: { sdp: string; type: "offer" | "answer" }): Promise<RTCSessionDescription> {
        await this.pc.setRemoteDescription(new RTCSessionDescription(remoteOffer));
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        return this.pc.localDescription!;
    }

    async acceptAnswer(remoteAnswer: { sdp: string; type: "offer" | "answer" }): Promise<void> {
        await this.pc.setRemoteDescription(new RTCSessionDescription(remoteAnswer));
    }

    async addRemoteIceCandidate(candidate: { candidate: string; sdpMLineIndex: number | null; sdpMid: string | null }): Promise<void> {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    }

    setMuted(muted: boolean) {
        this.localStream?.getAudioTracks().forEach((track) => (track.enabled = !muted));
    }

    setVideoEnabled(enabled: boolean) {
        this.localStream?.getVideoTracks().forEach((track) => (track.enabled = enabled));
    }

    /** Flips between front/rear camera on the active local video track. */
    switchCamera() {
        const videoTrack = this.localStream?.getVideoTracks()[0] as any;
        videoTrack?._switchCamera?.();
    }

    getLocalStream(): MediaStream | null {
        return this.localStream;
    }

    /** Exposes the underlying connection read-only, for stats-based adaptive bitrate. */
    getRawConnection(): RNRTCPeerConnection {
        return this.pc;
    }

    close() {
        this.localStream?.getTracks().forEach((track) => track.stop());
        this.pc.close();
    }
}
