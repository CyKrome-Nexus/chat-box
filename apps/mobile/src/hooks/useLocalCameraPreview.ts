import { useEffect, useRef, useState } from "react";
import { mediaDevices, MediaStream } from "react-native-webrtc";

/**
 * Live local camera preview for a video call's self-view — independent of
 * any signaling/peer connection (it's just local `getUserMedia`), so it
 * works standalone even without the realtime server that the actual
 * remote-peer connection needs (see docs/architecture/video-calling.md).
 * Provides real camera flip and video-enable/disable on the same stream.
 */
export const useLocalCameraPreview = (enabled: boolean) => {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [frontCamera, setFrontCamera] = useState(true);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;

        mediaDevices
            .getUserMedia({ audio: false, video: { facingMode: "user" } })
            .then((s) => {
                if (cancelled) {
                    (s as unknown as MediaStream).getTracks().forEach((t) => t.stop());
                    return;
                }
                streamRef.current = s as unknown as MediaStream;
                setStream(streamRef.current);
            })
            .catch(() => {
                // No camera permission/hardware — self-view just stays empty.
            });

        return () => {
            cancelled = true;
            streamRef.current?.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
            setStream(null);
        };
    }, [enabled]);

    const switchCamera = () => {
        const track = streamRef.current?.getVideoTracks()[0] as any;
        track?._switchCamera?.();
        setFrontCamera((prev) => !prev);
    };

    const setVideoEnabled = (videoEnabled: boolean) => {
        streamRef.current?.getVideoTracks().forEach((track) => (track.enabled = videoEnabled));
    };

    return { stream, frontCamera, switchCamera, setVideoEnabled };
};
