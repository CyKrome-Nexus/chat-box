import { useRef, useState } from "react";
import { Alert } from "react-native";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";

export const VIDEO_NOTE_MAX_DURATION_SECONDS = 60;

/**
 * Wraps expo-camera's CameraView imperative recording API for circular video
 * notes: a real front-camera recording capped at 60s, with a local timer
 * for the circular progress ring (CameraView doesn't expose recording
 * duration itself).
 */
export const useVideoNoteRecorder = () => {
    const cameraRef = useRef<CameraView>(null);
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const [micPermission, requestMicPermission] = useMicrophonePermissions();
    const [isRecording, setIsRecording] = useState(false);
    const [durationMillis, setDurationMillis] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startedAtRef = useRef(0);
    const cancelledRef = useRef(false);
    const recordingPromiseRef = useRef<Promise<{ uri: string } | undefined> | null>(null);

    const ensurePermissions = async () => {
        let camera = cameraPermission;
        let mic = micPermission;
        if (!camera?.granted) camera = await requestCameraPermission();
        if (!mic?.granted) mic = await requestMicPermission();

        if (!camera?.granted || !mic?.granted) {
            Alert.alert("Camera & microphone access needed", "Enable both to record video notes.");
            return false;
        }
        return true;
    };

    const start = async () => {
        if (!(await ensurePermissions())) return false;

        cancelledRef.current = false;
        setDurationMillis(0);
        startedAtRef.current = Date.now();
        timerRef.current = setInterval(() => {
            setDurationMillis(Date.now() - startedAtRef.current);
        }, 100);

        // recordAsync's promise only resolves once stopRecording() is
        // called (or maxDuration is hit) — started here, awaited in stop().
        setIsRecording(true);
        return true;
    };

    const stop = async (): Promise<{ uri: string; durationMillis: number } | null> => {
        if (timerRef.current) clearInterval(timerRef.current);
        const finalDuration = Date.now() - startedAtRef.current;
        setIsRecording(false);

        try {
            cameraRef.current?.stopRecording();
            const result = await recordingPromiseRef.current;
            if (cancelledRef.current || !result?.uri) return null;
            return { uri: result.uri, durationMillis: finalDuration };
        } catch {
            return null;
        }
    };

    const cancel = () => {
        cancelledRef.current = true;
        cameraRef.current?.stopRecording();
        if (timerRef.current) clearInterval(timerRef.current);
        setIsRecording(false);
    };

    /** Called once the CameraView has mounted and is ready to record. */
    const beginRecordingOnCamera = () => {
        recordingPromiseRef.current = cameraRef.current?.recordAsync({
            maxDuration: VIDEO_NOTE_MAX_DURATION_SECONDS,
        }) || null;
    };

    return {
        cameraRef,
        isRecording,
        durationMillis,
        start,
        beginRecordingOnCamera,
        stop,
        cancel,
    };
};
