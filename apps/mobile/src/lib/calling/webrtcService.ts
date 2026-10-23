import {
    mediaDevices,
    MediaStream,
    RTCIceCandidate,
    RTCPeerConnection,
    RTCSessionDescription,
} from "react-native-webrtc";

import { getIceServers } from "./webrtcConfig";

export interface IIceCandidate {
    candidate: string;
    sdpMLineIndex: number | null;
    sdpMid: string | null;
}

interface IPeerEvents {
    icecandidate: { candidate: RTCIceCandidate | null };
    track: { streams: MediaStream[] };
    connectionstatechange: Event;
}

type TEventTarget = {
    addEventListener<K extends keyof IPeerEvents>(type: K, listener: (event: IPeerEvents[K]) => void): void;
};

export const getLocalMedia = async (video: boolean): Promise<MediaStream> =>
    (await mediaDevices.getUserMedia({
        audio: true,
        video: video ? { facingMode: "user", width: 1280, height: 720, frameRate: 30 } : false,
    })) as MediaStream;

// One RTCPeerConnection per remote participant; candidates arriving early are buffered.
export class CallPeerConnection {
    private readonly pc: RTCPeerConnection;
    private pendingCandidates: IIceCandidate[] = [];
    private hasRemoteDescription = false;

    onIceCandidate: ((candidate: IIceCandidate) => void) | null = null;
    onRemoteStream: ((stream: MediaStream) => void) | null = null;
    onConnectionStateChange: ((state: string) => void) | null = null;

    constructor(localStream: MediaStream) {
        this.pc = new RTCPeerConnection({ iceServers: getIceServers() });
        const target = this.pc as unknown as TEventTarget;

        target.addEventListener("icecandidate", (event) => {
            const candidate = event.candidate;
            if (candidate) {
                this.onIceCandidate?.({ candidate: candidate.candidate, sdpMLineIndex: candidate.sdpMLineIndex ?? null, sdpMid: candidate.sdpMid ?? null });
            }
        });
        target.addEventListener("track", (event) => {
            const [stream] = event.streams;
            if (stream) this.onRemoteStream?.(stream);
        });
        target.addEventListener("connectionstatechange", () => this.onConnectionStateChange?.(this.pc.connectionState));

        localStream.getTracks().forEach((track) => this.pc.addTrack(track, localStream));
    }

    async createOffer(): Promise<string> {
        const offer = await this.pc.createOffer({});
        await this.pc.setLocalDescription(offer);
        return this.pc.localDescription?.sdp ?? "";
    }

    async createAnswer(remoteSdp: string): Promise<string> {
        await this.setRemote(remoteSdp, "offer");
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        return this.pc.localDescription?.sdp ?? "";
    }

    async acceptAnswer(remoteSdp: string): Promise<void> {
        await this.setRemote(remoteSdp, "answer");
    }

    async addRemoteIceCandidate(candidate: IIceCandidate): Promise<void> {
        if (!this.hasRemoteDescription) {
            this.pendingCandidates.push(candidate);
            return;
        }
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => undefined);
    }

    private async setRemote(sdp: string, type: "offer" | "answer") {
        await this.pc.setRemoteDescription(new RTCSessionDescription({ sdp, type }));
        this.hasRemoteDescription = true;
        const queued = this.pendingCandidates;
        this.pendingCandidates = [];
        await Promise.all(queued.map((candidate) => this.pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => undefined)));
    }

    getRawConnection(): RTCPeerConnection {
        return this.pc;
    }

    close() {
        this.pc.close();
    }
}
