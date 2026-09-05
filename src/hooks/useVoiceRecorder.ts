import { useRef } from "react";
import { Alert } from "react-native";
import {
    RecordingPresets,
    requestRecordingPermissionsAsync,
    useAudioRecorder,
    useAudioRecorderState,
} from "expo-audio";

const RECORDING_OPTIONS = { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true };

/**
 * Wraps expo-audio's recorder for the chat input's mic button: handles the
 * permission prompt, exposes live duration/metering via
 * `useAudioRecorderState`, and returns the finished file's uri on stop.
 */
export const useVoiceRecorder = () => {
    const recorder = useAudioRecorder(RECORDING_OPTIONS);
    const state = useAudioRecorderState(recorder, 100);
    const cancelledRef = useRef(false);

    const start = async () => {
        const permission = await requestRecordingPermissionsAsync();
        if (!permission.granted) {
            Alert.alert("Microphone access needed", "Enable microphone access in Settings to record voice messages.");
            return false;
        }

        cancelledRef.current = false;
        await recorder.prepareToRecordAsync();
        recorder.record();
        return true;
    };

    const stop = async (): Promise<{ uri: string; durationMillis: number } | null> => {
        const durationMillis = state.durationMillis;
        await recorder.stop();

        if (cancelledRef.current || !recorder.uri) return null;
        return { uri: recorder.uri, durationMillis };
    };

    const cancel = async () => {
        cancelledRef.current = true;
        await recorder.stop();
    };

    return {
        isRecording: state.isRecording,
        durationMillis: state.durationMillis,
        metering: state.metering,
        start,
        stop,
        cancel,
    };
};
