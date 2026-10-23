import { useEffect, useRef } from "react";
import { Alert, Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as Facebook from "expo-auth-session/providers/facebook";
import * as AppleAuthentication from "expo-apple-authentication";

import type { ISocialCredential } from "@/src/lib/auth/socialAuth";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_IOS = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const GOOGLE_WEB = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const FACEBOOK_APP = process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_ID;

// Collects a provider token (Google ID token, Facebook access token, Apple identity token).
export const useSocialAuth = (onCredential: (credential: ISocialCredential) => void) => {
    const callbackRef = useRef(onCredential);
    callbackRef.current = onCredential;

    const [, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest({
        iosClientId: GOOGLE_IOS,
        androidClientId: GOOGLE_ANDROID,
        webClientId: GOOGLE_WEB,
        clientId: GOOGLE_ANDROID || GOOGLE_IOS || GOOGLE_WEB || "unconfigured",
    });
    const [, facebookResponse, promptFacebook] = Facebook.useAuthRequest({ clientId: FACEBOOK_APP || "unconfigured" });

    useEffect(() => {
        if (googleResponse?.type === "success" && googleResponse.params.id_token) {
            callbackRef.current({ provider: "google", token: googleResponse.params.id_token });
        } else if (googleResponse?.type === "error") {
            Alert.alert("Google sign-in failed", googleResponse.error?.message || "Please try again.");
        }
    }, [googleResponse]);

    useEffect(() => {
        if (facebookResponse?.type === "success" && facebookResponse.authentication?.accessToken) {
            callbackRef.current({ provider: "facebook", token: facebookResponse.authentication.accessToken });
        } else if (facebookResponse?.type === "error") {
            Alert.alert("Facebook sign-in failed", facebookResponse.error?.message || "Please try again.");
        }
    }, [facebookResponse]);

    const signInWithGoogle = () => {
        if (!GOOGLE_IOS && !GOOGLE_ANDROID && !GOOGLE_WEB) {
            Alert.alert("Google sign-in unavailable", "Google sign-in hasn't been configured for this build.");
            return;
        }
        void promptGoogle();
    };

    const signInWithFacebook = () => {
        if (!FACEBOOK_APP) {
            Alert.alert("Facebook sign-in unavailable", "Facebook sign-in hasn't been configured for this build.");
            return;
        }
        void promptFacebook();
    };

    const signInWithApple = async () => {
        if (Platform.OS !== "ios" || !(await AppleAuthentication.isAvailableAsync())) {
            Alert.alert("Apple sign-in unavailable", "Sign in with Apple is only available on supported iOS devices.");
            return;
        }
        try {
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
            });
            if (!credential.identityToken) throw new Error("Apple didn't return an identity token.");
            const name = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(" ");
            callbackRef.current({ provider: "apple", token: credential.identityToken, name: name || undefined });
        } catch (error) {
            const code = (error as { code?: string }).code;
            if (code !== "ERR_REQUEST_CANCELED") Alert.alert("Apple sign-in failed", error instanceof Error ? error.message : "Please try again.");
        }
    };

    return { signInWithGoogle, signInWithFacebook, signInWithApple };
};
