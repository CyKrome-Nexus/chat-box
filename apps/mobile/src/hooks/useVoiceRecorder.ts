import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import {
    RecordingPresets,
    requestRecordingPermissionsAsync,
    useAudioRecorder,
    useAudioRecorderState,
} from "expo-audio";

import { playSoundEffect } from "@/src/lib/audio/soundEffects";

const RECORDING_OPTIONS = { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true };
const METERING_POLL_MS = 66; // ~15 samples/sec, per the ticket's 10-20/sec target
const MAX_WAVEFORM_SAMPLES = 200; // ~13s of history at the rate above before it starts scrolling

/** dB (roughly -160 silence .. 0 loudest) -> a 0..1 bar height. */
const normalizeMetering = (db: number) => Math.max(0, Math.min(1, (db + 60) / 60));

/**
 * Wraps expo-audio's recorder for the voice note studio: permission prompt,
 * live duration/metering via `useAudioRecorderState`, pause/resume for
 * handsfree (locked) recording, a live-sampled waveform array (real
 * amplitude samples, not the deterministic placeholder
 * src/lib/audio/waveform.ts falls back to for older messages), and the
 * finished file's uri + duration + waveform on stop.
 */
export const useVoiceRecorder = () => {
    const recorder = useAudioRecorder(RECORDING_OPTIONS);
    const state = useAudioRecorderState(recorder, METERING_POLL_MS);
    const cancelledRef = useRef(false);
    const [waveform, setWaveform] = useState<number[]>([]);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        if (!state.isRecording || state.metering == null) return;
        setWaveform((prev) => {
            const next = [...prev, normalizeMetering(state.metering!)];
            return next.length > MAX_WAVEFORM_SAMPLES ? next.slice(-MAX_WAVEFORM_SAMPLES) : next;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.metering, state.isRecording]);

    const start = async () => {
        const permission = await requestRecordingPermissionsAsync();
        if (!permission.granted) {
            Alert.alert("Microphone access needed", "Enable microphone access in Settings to record voice messages.");
            return false;
        }

        cancelledRef.current = false;
        setWaveform([]);
        setIsPaused(false);
        await recorder.prepareToRecordAsync();
        recorder.record();
        playSoundEffect("voiceNoteStart");
        return true;
    };

    const pause = () => {
        recorder.pause();
        setIsPaused(true);
    };

    const resume = () => {
        recorder.record();
        setIsPaused(false);
    };

    const stop = async (): Promise<{ uri: string; durationMillis: number; waveform: number[] } | null> => {
        const durationMillis = state.durationMillis;
        const capturedWaveform = waveform;
        await recorder.stop();

        if (cancelledRef.current || !recorder.uri) return null;
        return { uri: recorder.uri, durationMillis, waveform: capturedWaveform };
    };

    const cancel = async () => {
        cancelledRef.current = true;
        await recorder.stop();
        setWaveform([]);
        setIsPaused(false);
        playSoundEffect("voiceNoteCancel");
    };

    return {
        isRecording: state.isRecording,
        isPaused,
        durationMillis: state.durationMillis,
        metering: state.metering,
        waveform,
        start,
        pause,
        resume,
        stop,
        cancel,
    };
};
