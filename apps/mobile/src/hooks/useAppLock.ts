import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useSelector } from "react-redux";
import * as LocalAuthentication from "expo-local-authentication";
import * as ScreenCapture from "expo-screen-capture";

import { TAutoLockTimeout } from "@/src/redux/features/settingsSlice";

const TIMEOUT_MS: Record<TAutoLockTimeout, number> = {
    immediately: 0,
    "1min": 60 * 1000,
    "15min": 15 * 60 * 1000,
    "1hour": 60 * 60 * 1000,
};

/**
 * App-wide biometric lock: backgrounding the app starts a timer (per the
 * configured auto-lock timeout); returning to the foreground past that
 * timer shows the lock screen until Face ID/Touch ID/biometric prompt
 * succeeds. Also engages the OS-level "hide content in the app switcher"
 * protection for as long as the lock is enabled — see
 * docs/architecture/security-privacy.md.
 */
export const useAppLock = () => {
    const biometricLockEnabled = useSelector(
        (state: any) => state.settings.security.biometricLockEnabled as boolean
    );
    const autoLockTimeout = useSelector(
        (state: any) => state.settings.security.autoLockTimeout as TAutoLockTimeout
    );

    const [isLocked, setIsLocked] = useState(biometricLockEnabled);
    const backgroundedAtRef = useRef<number | null>(null);

    useEffect(() => {
        if (biometricLockEnabled) {
            ScreenCapture.preventScreenCaptureAsync("app-lock");
            ScreenCapture.enableAppSwitcherProtectionAsync().catch(() => {
                // iOS-only API — no-op (and harmless) on platforms without it.
            });
        } else {
            ScreenCapture.allowScreenCaptureAsync("app-lock");
            ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => {});
            setIsLocked(false);
        }
    }, [biometricLockEnabled]);

    useEffect(() => {
        if (!biometricLockEnabled) return;

        const subscription = AppState.addEventListener("change", (nextState) => {
            if (nextState === "background" || nextState === "inactive") {
                backgroundedAtRef.current = Date.now();
                return;
            }

            if (nextState === "active" && backgroundedAtRef.current != null) {
                const elapsed = Date.now() - backgroundedAtRef.current;
                backgroundedAtRef.current = null;
                if (elapsed >= TIMEOUT_MS[autoLockTimeout]) {
                    setIsLocked(true);
                }
            }
        });

        return () => subscription.remove();
    }, [biometricLockEnabled, autoLockTimeout]);

    const unlock = useCallback(async () => {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (!hasHardware || !isEnrolled) {
            // No biometric hardware/enrollment on this device — don't strand
            // the user behind a lock screen they have no way to pass.
            setIsLocked(false);
            return;
        }

        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: "Unlock Chatbox",
            disableDeviceFallback: false,
        });
        if (result.success) setIsLocked(false);
    }, []);

    return { isLocked: biometricLockEnabled && isLocked, unlock };
};
