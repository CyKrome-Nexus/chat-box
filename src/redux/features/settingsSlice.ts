import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type TTheme = "system" | "light" | "dark";
export type TVisibility = "everyone" | "contacts" | "nobody";
export type TAutoLockTimeout = "immediately" | "1min" | "15min" | "1hour";

interface SettingsState {
    privacy: {
        lastSeenVisibility: TVisibility;
        profilePhotoVisibility: TVisibility;
        aboutVisibility: TVisibility;
        readReceipts: boolean;
        twoFactorEnabled: boolean;
    };
    notifications: {
        sound: boolean;
        vibration: boolean;
        messagePreview: boolean;
        groupNotifications: boolean;
    };
    theme: TTheme;
    autoDownload: {
        photos: boolean;
        videos: boolean;
        documents: boolean;
    };
    chat: {
        /** Off = an incoming message for an archived chat stays archived. See chat-organization.md. */
        unarchiveOnNewMessage: boolean;
    };
    /** App Lock — see docs/architecture/security-privacy.md. */
    security: {
        biometricLockEnabled: boolean;
        autoLockTimeout: TAutoLockTimeout;
    };
    lastBackupAt: number | null;
}

const initialState: SettingsState = {
    privacy: {
        lastSeenVisibility: "everyone",
        profilePhotoVisibility: "everyone",
        aboutVisibility: "everyone",
        readReceipts: true,
        twoFactorEnabled: false,
    },
    notifications: {
        sound: true,
        vibration: true,
        messagePreview: true,
        groupNotifications: true,
    },
    theme: "system",
    autoDownload: {
        photos: true,
        videos: false,
        documents: false,
    },
    chat: {
        unarchiveOnNewMessage: true,
    },
    security: {
        biometricLockEnabled: false,
        autoLockTimeout: "immediately",
    },
    lastBackupAt: null,
};

export const settingsSlice = createSlice({
    name: "settings",
    initialState,
    reducers: {
        // Merges rather than replaces so a persisted blob saved before a
        // newly-added settings key (e.g. `chat`) still gets that key's default.
        hydrateSettings: (state, action: PayloadAction<Partial<SettingsState>>) => ({
            ...state,
            ...action.payload,
            privacy: { ...state.privacy, ...action.payload.privacy },
            chat: { ...state.chat, ...action.payload.chat },
            security: { ...state.security, ...action.payload.security },
        }),
        setPrivacyPref: (
            state,
            action: PayloadAction<{ key: "readReceipts" | "twoFactorEnabled"; value: boolean }>
        ) => {
            state.privacy[action.payload.key] = action.payload.value;
        },
        setPrivacyVisibility: (
            state,
            action: PayloadAction<{
                key: "lastSeenVisibility" | "profilePhotoVisibility" | "aboutVisibility";
                value: TVisibility;
            }>
        ) => {
            state.privacy[action.payload.key] = action.payload.value;
        },
        setNotificationPref: (
            state,
            action: PayloadAction<{ key: keyof SettingsState["notifications"]; value: boolean }>
        ) => {
            state.notifications[action.payload.key] = action.payload.value;
        },
        setTheme: (state, action: PayloadAction<TTheme>) => {
            state.theme = action.payload;
        },
        setAutoDownloadPref: (
            state,
            action: PayloadAction<{ key: keyof SettingsState["autoDownload"]; value: boolean }>
        ) => {
            state.autoDownload[action.payload.key] = action.payload.value;
        },
        setLastBackupAt: (state, action: PayloadAction<number>) => {
            state.lastBackupAt = action.payload;
        },
        setUnarchiveOnNewMessage: (state, action: PayloadAction<boolean>) => {
            state.chat.unarchiveOnNewMessage = action.payload;
        },
        setBiometricLockEnabled: (state, action: PayloadAction<boolean>) => {
            state.security.biometricLockEnabled = action.payload;
        },
        setAutoLockTimeout: (state, action: PayloadAction<TAutoLockTimeout>) => {
            state.security.autoLockTimeout = action.payload;
        },
    },
});

export const {
    hydrateSettings,
    setPrivacyPref,
    setPrivacyVisibility,
    setNotificationPref,
    setTheme,
    setAutoDownloadPref,
    setLastBackupAt,
    setUnarchiveOnNewMessage,
    setBiometricLockEnabled,
    setAutoLockTimeout,
} = settingsSlice.actions;
export default settingsSlice.reducer;
