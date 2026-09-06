import type { ExpoConfig } from "expo/config";

import packageJson from "./package.json";
// A plain `require()` of a CommonJS file, not a TS import — Expo's config
// loader only transpiles this single app.config.ts file in-memory, not
// whatever it imports, so a sibling .ts module can't be resolved here. See
// scripts/versioning.js for the full explanation and the actual implementation.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { calculateBuildNumber, calculateVersionCode } = require("./scripts/versioning.js");

/**
 * Single Source of Truth (SSOT) versioning — see
 * docs/architecture/versioning.md. `package.json`'s `"version"` is the one
 * place a human ever edits a version number; everything else (this file's
 * `expo.version`/`ios.buildNumber`/`android.versionCode`, and every in-app
 * UI surface via `expo-constants`/`expo-application` at runtime) derives
 * from it. This file replaces the previous static `app.json` — a dynamic
 * config was required specifically because a plain JSON file can't import
 * or compute anything.
 */
const config: ExpoConfig = {
    name: "chat-box",
    slug: "chat-box",
    scheme: "chat-box",
    version: packageJson.version,
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
        image: "./assets/splash-icon.png",
        resizeMode: "contain",
        backgroundColor: "#ffffff",
    },
    ios: {
        supportsTablet: true,
        bundleIdentifier: "com.anonymous.exporouterlearn",
        usesAppleSignIn: true,
        buildNumber: calculateBuildNumber(packageJson.version),
        infoPlist: {
            NSFaceIDUsageDescription: "Chatbox uses Face ID to unlock the app and keep your chats private.",
        },
    },
    android: {
        adaptiveIcon: {
            foregroundImage: "./assets/adaptive-icon.png",
            backgroundColor: "#ffffff",
        },
        edgeToEdgeEnabled: true,
        predictiveBackGestureEnabled: false,
        package: "com.anonymous.exporouterlearn",
        versionCode: calculateVersionCode(packageJson.version),
        permissions: ["android.permission.USE_FULL_SCREEN_INTENT", "android.permission.POST_NOTIFICATIONS"],
    },
    web: {
        favicon: "./assets/favicon.png",
    },
    plugins: [
        "expo-router",
        "expo-font",
        [
            "expo-image-picker",
            {
                photosPermission: "Chatbox needs access to your photos to share images and videos in chats.",
                cameraPermission: "Chatbox needs access to your camera to take and share photos and videos in chats.",
            },
        ],
        [
            "expo-location",
            {
                locationWhenInUsePermission: "Chatbox needs your location to let you share it in a chat.",
            },
        ],
        [
            "expo-audio",
            {
                microphonePermission: "Chatbox needs access to your microphone to record voice messages.",
            },
        ],
        "expo-web-browser",
        "expo-apple-authentication",
        "expo-secure-store",
        [
            "expo-contacts",
            {
                contactsPermission: "Chatbox needs access to your contacts to help you find friends already using Chatbox.",
            },
        ],
        [
            "expo-camera",
            {
                cameraPermission: "Chatbox needs access to your camera to scan QR codes and record video notes.",
                microphonePermission: "Chatbox needs access to your microphone to record video notes.",
            },
        ],
        "expo-sqlite",
        [
            "@config-plugins/react-native-webrtc",
            {
                cameraPermission: "Chatbox needs access to your camera for video calls.",
                microphonePermission: "Chatbox needs access to your microphone for audio and video calls.",
            },
        ],
        "@config-plugins/react-native-callkeep",
        "expo-video",
        [
            "expo-media-library",
            {
                photosPermission: "Chatbox needs access to your photos to save media from chats.",
                savePhotosPermission: "Chatbox needs permission to save photos and videos to your device.",
            },
        ],
        "./plugins/withEncryptedPush.js",
    ],
};

export default config;
