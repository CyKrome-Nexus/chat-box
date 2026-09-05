import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type TTheme = "system" | "light" | "dark";

interface SettingsState {
    privacy: {
        lastSeen: boolean;
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
    lastBackupAt: number | null;
}

const initialState: SettingsState = {
    privacy: {
        lastSeen: true,
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
    lastBackupAt: null,
};

export const settingsSlice = createSlice({
    name: "settings",
    initialState,
    reducers: {
        hydrateSettings: (_state, action: PayloadAction<SettingsState>) => action.payload,
        setPrivacyPref: (
            state,
            action: PayloadAction<{ key: keyof SettingsState["privacy"]; value: boolean }>
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
    },
});

export const {
    hydrateSettings,
    setPrivacyPref,
    setNotificationPref,
    setTheme,
    setAutoDownloadPref,
    setLastBackupAt,
} = settingsSlice.actions;
export default settingsSlice.reducer;
