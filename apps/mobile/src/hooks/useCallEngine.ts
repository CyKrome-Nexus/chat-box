import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { MediaStream } from "react-native-webrtc";

import { callEngineManager } from "@/src/lib/calling/callEngineManager";
import type { RootState } from "@/src/redux/store/store";

export const useCallEngine = () => {
    const activeCall = useSelector((state: RootState) => state.call.activeCall);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

    useEffect(
        () =>
            callEngineManager.subscribe(({ local, remote }) => {
                setLocalStream(local);
                setRemoteStreams(new Map(remote));
            }),
        []
    );

    return {
        activeCall,
        localStream,
        remoteStreams,
        accept: () => callEngineManager.accept(),
        decline: () => callEngineManager.decline(),
        hangUp: () => callEngineManager.hangUp(),
        toggleMute: () => callEngineManager.toggleMute(),
        toggleVideo: () => callEngineManager.toggleVideo(),
        switchCamera: () => callEngineManager.switchCamera(),
    };
};
