import { useEffect, useState } from "react";
import type { MediaStream } from "react-native-webrtc";

import { useCallManager } from "./useCallManager";
import { callEngineManager } from "@/src/lib/calling/callEngineManager";
import { TCallMediaType } from "@/src/redux/features/callSlice";
import { IAvatar } from "@/src/interfaces/list-interface";

/**
 * Thin React binding on top of `callEngineManager` (the actual WebRTC
 * lifecycle owner — see that module and
 * docs/architecture/video-calling.md for why it's a singleton rather than
 * living in this hook: the peer connection must survive navigating away
 * from the /call screen for in-app PiP to actually keep the call running).
 * `useCallManager`'s local call-UI simulation is always the fallback when
 * no realtime server is configured (the default in this repo).
 */
export const useCallEngine = (currentUserId: string) => {
    const base = useCallManager();
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

    useEffect(() => {
        callEngineManager.ensureSignalingListeners(currentUserId);
        return callEngineManager.onRemoteStreamChange(setRemoteStream);
    }, [currentUserId]);

    const startOutgoingCall = (contact: { name: string; avatar?: IAvatar }, type: TCallMediaType) => {
        base.startOutgoingCall(contact, type);
        callEngineManager.startOutgoingCall(contact, type, currentUserId);
    };

    const hangUp = () => {
        callEngineManager.hangUp();
        base.hangUp();
    };

    return { ...base, startOutgoingCall, hangUp, remoteStream };
};
