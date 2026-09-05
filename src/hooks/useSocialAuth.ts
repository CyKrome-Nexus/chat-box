import { useEffect, useRef } from "react";
import { Alert, Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as Facebook from "expo-auth-session/providers/facebook";
import * as AppleAuthentication from "expo-apple-authentication";

import { decodeJwtPayload, fetchFacebookProfile, ISocialProfile } from "@/src/lib/auth/socialAuth";

WebBrowser.maybeCompleteAuthSession();

/**
 * There are no real OAuth app credentials configured in this repo (no Google
 * Cloud / Meta Developer app to point at). Client IDs are read from
 * EXPO_PUBLIC_* env vars so the flows are fully wired and will work as soon
 * as real credentials are supplied — until then, prompting Google/Facebook
 * surfaces a clear "not configured" message instead of a confusing OAuth
 * error.
 */
export const useSocialAuth = (onSuccess: (profile: ISocialProfile) => void) => {
    const onSuccessRef = useRef(onSuccess);
    onSuccessRef.current = onSuccess;

    const googleConfigured = !!(
        process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
        process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
    );
    const facebookConfigured = !!process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_ID;

    const [, googleResponse, promptGoogleAsync] = Google.useIdTokenAuthRequest({
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
        androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    });

    const [, facebookResponse, promptFacebookAsync] = Facebook.useAuthRequest({
        clientId: process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_ID || "unconfigured",
    });

    useEffect(() => {
        if (googleResponse?.type === "success" && googleResponse.params.id_token) {
            const claims = decodeJwtPayload(googleResponse.params.id_token);
            onSuccessRef.current({
                provider: "google",
                identifier: claims.email,
                name: claims.name,
                avatarUrl: claims.picture,
            });
        } else if (googleResponse?.type === "error") {
            Alert.alert("Google sign-in failed", googleResponse.error?.message || "Please try again.");
        }
    }, [googleResponse]);

    useEffect(() => {
        if (facebookResponse?.type === "success" && facebookResponse.authentication?.accessToken) {
            fetchFacebookProfile(facebookResponse.authentication.accessToken)
                .then((profile) => onSuccessRef.current(profile))
                .catch((e) => Alert.alert("Facebook sign-in failed", e.message));
        } else if (facebookResponse?.type === "error") {
            Alert.alert("Facebook sign-in failed", facebookResponse.error?.message || "Please try again.");
        }
    }, [facebookResponse]);

    const signInWithGoogle = () => {
        if (!googleConfigured) {
            Alert.alert("Google sign-in not configured", "Set EXPO_PUBLIC_GOOGLE_*_CLIENT_ID to enable this.");
            return;
        }
        promptGoogleAsync();
    };

    const signInWithFacebook = () => {
        if (!facebookConfigured) {
            Alert.alert("Facebook sign-in not configured", "Set EXPO_PUBLIC_FACEBOOK_CLIENT_ID to enable this.");
            return;
        }
        promptFacebookAsync();
    };

    const signInWithApple = async () => {
        if (Platform.OS !== "ios") {
            Alert.alert("Apple sign-in unavailable", "Sign in with Apple is only available on iOS.");
            return;
        }

        try {
            const available = await AppleAuthentication.isAvailableAsync();
            if (!available) {
                Alert.alert("Apple sign-in unavailable", "This device doesn't support Sign in with Apple.");
                return;
            }

            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });

            const name = credential.fullName
                ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(" ")
                : "Apple User";

            onSuccessRef.current({
                provider: "apple",
                identifier: credential.email || `apple:${credential.user}`,
                name: name || "Apple User",
            });
        } catch (e: any) {
            if (e.code !== "ERR_REQUEST_CANCELED") {
                Alert.alert("Apple sign-in failed", e.message || "Please try again.");
            }
        }
    };

    return { signInWithGoogle, signInWithFacebook, signInWithApple };
};
