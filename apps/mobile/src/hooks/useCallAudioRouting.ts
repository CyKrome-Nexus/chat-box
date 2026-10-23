import { useEffect } from "react";
import InCallManager from "react-native-incall-manager";

/**
 * Starts/stops react-native-incall-manager alongside the active call.
 * `auto: true` is InCallManager's built-in proximity-sensor handling: it
 * turns the screen off and routes audio to the earpiece when the device is
 * held to the ear, and reverses both when it's pulled away — this is the
 * concrete implementation of the ticket's proximity-sensor requirement
 * (there's no separate proximity API in Expo/React Native core; InCallManager
 * bundles native proximity handling specifically for call UIs like this).
 */
export const useCallAudioRouting = (isCallActive: boolean, isVideo: boolean) => {
    useEffect(() => {
        if (!isCallActive) return;

        InCallManager.start({ media: isVideo ? "video" : "audio", auto: true });

        return () => {
            InCallManager.stop();
        };
    }, [isCallActive, isVideo]);
};

export const setSpeakerphoneEnabled = (enabled: boolean) => {
    InCallManager.setForceSpeakerphoneOn(enabled);
};

export const setMicrophoneMuted = (muted: boolean) => {
    InCallManager.setMicrophoneMute(muted);
};
