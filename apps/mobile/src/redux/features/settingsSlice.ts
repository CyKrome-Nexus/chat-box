import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { DEFAULT_ACCENT_COLOR } from "@/src/lib/theme/accentColors";
import { DEFAULT_WALLPAPER, IWallpaperConfig } from "@/src/lib/wallpaper/wallpaperTypes";
import { TThemeMode } from "@/src/lib/theme/palettes";

/** @deprecated use TThemeMode (adds oledBlack/sepia) — kept as an alias so
 * existing imports of TTheme keep compiling. */
export type TTheme = TThemeMode;
export type TVisibility = "everyone" | "contacts" | "nobody";
export type TAutoLockTimeout = "immediately" | "1min" | "15min" | "1hour";
export type TPhoneDiscoverability = "everyone" | "contacts";
export type TVibrationPattern = "default" | "short" | "long" | "off";

export interface ICustomNotificationConfig {
    /** Key into MESSAGE_TONES (bundled) or a content:// / file:// URI picked
     * from device storage — see docs/architecture/sound-haptics.md. */
    messageTone?: string;
    callRingtone?: string;
    vibrationPattern: TVibrationPattern;
}

interface SettingsState {
    privacy: {
        lastSeenVisibility: TVisibility;
        profilePhotoVisibility: TVisibility;
        aboutVisibility: TVisibility;
        readReceipts: boolean;
        twoFactorEnabled: boolean;
        /** Default audience for new status updates — see stories.md. */
        statusPrivacy: "contacts" | "contactsExcept" | "onlyShareWith";
        /** Username System — see docs/architecture/username-system.md. */
        phoneNumberVisibility: TVisibility;
        discoverableByPhoneNumber: TPhoneDiscoverability;
    };
    notifications: {
        sound: boolean;
        vibration: boolean;
        messagePreview: boolean;
        groupNotifications: boolean;
        /** Sound/Haptics Engine — see docs/architecture/sound-haptics.md.
         * Distinct from `sound` above, which gates the system push
         * notification's own sound; this gates in-app SFX (message sent/
         * received, voice note start/cancel, call ringing) while the app is
         * open and foregrounded. */
        inAppSounds: boolean;
    };
    /** Per-conversation notification overrides — see
     * docs/architecture/sound-haptics.md. */
    customNotifications: Record<string, ICustomNotificationConfig>;
    theme: TThemeMode;
    /** Theming Engine — see docs/architecture/theming-engine.md. */
    appearance: {
        accentColor: string;
    };
    /** Chat Wallpaper Studio — see docs/architecture/theming-engine.md. */
    wallpaper: {
        global: IWallpaperConfig;
        perChat: Record<string, IWallpaperConfig>;
    };
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
    /** Display Zoom / Text Scaling — see docs/architecture/display-scaling.md. */
    display: {
        /** Manual override, used only when useSystemTextSize is false. 0.8–1.65. */
        zoomLevel: number;
        /** When true, ignore zoomLevel and derive scale from the OS's Dynamic
         * Type / Display Size accessibility setting (PixelRatio.getFontScale()). */
        useSystemTextSize: boolean;
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
        statusPrivacy: "contacts",
        phoneNumberVisibility: "contacts",
        discoverableByPhoneNumber: "everyone",
    },
    notifications: {
        sound: true,
        vibration: true,
        messagePreview: true,
        groupNotifications: true,
        inAppSounds: true,
    },
    customNotifications: {},
    theme: "system",
    appearance: {
        accentColor: DEFAULT_ACCENT_COLOR,
    },
    wallpaper: {
        global: DEFAULT_WALLPAPER,
        perChat: {},
    },
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
    display: {
        zoomLevel: 1,
        useSystemTextSize: true,
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
            display: { ...state.display, ...action.payload.display },
            appearance: { ...state.appearance, ...action.payload.appearance },
            notifications: { ...state.notifications, ...action.payload.notifications },
            customNotifications: { ...state.customNotifications, ...action.payload.customNotifications },
            wallpaper: {
                global: action.payload.wallpaper?.global || state.wallpaper.global,
                perChat: { ...state.wallpaper.perChat, ...action.payload.wallpaper?.perChat },
            },
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
                key: "lastSeenVisibility" | "profilePhotoVisibility" | "aboutVisibility" | "phoneNumberVisibility";
                value: TVisibility;
            }>
        ) => {
            state.privacy[action.payload.key] = action.payload.value;
        },
        setDiscoverableByPhoneNumber: (state, action: PayloadAction<TPhoneDiscoverability>) => {
            state.privacy.discoverableByPhoneNumber = action.payload;
        },
        setCustomNotificationConfig: (
            state,
            action: PayloadAction<{ conversationId: string; config: ICustomNotificationConfig }>
        ) => {
            state.customNotifications[action.payload.conversationId] = action.payload.config;
        },
        clearCustomNotificationConfig: (state, action: PayloadAction<string>) => {
            delete state.customNotifications[action.payload];
        },
        setStatusPrivacy: (
            state,
            action: PayloadAction<SettingsState["privacy"]["statusPrivacy"]>
        ) => {
            state.privacy.statusPrivacy = action.payload;
        },
        setNotificationPref: (
            state,
            action: PayloadAction<{ key: keyof SettingsState["notifications"]; value: boolean }>
        ) => {
            state.notifications[action.payload.key] = action.payload.value;
        },
        setTheme: (state, action: PayloadAction<TThemeMode>) => {
            state.theme = action.payload;
        },
        setAccentColor: (state, action: PayloadAction<string>) => {
            state.appearance.accentColor = action.payload;
        },
        setGlobalWallpaper: (state, action: PayloadAction<IWallpaperConfig>) => {
            state.wallpaper.global = action.payload;
        },
        setChatWallpaper: (state, action: PayloadAction<{ conversationId: string; config: IWallpaperConfig }>) => {
            state.wallpaper.perChat[action.payload.conversationId] = action.payload.config;
        },
        clearChatWallpaper: (state, action: PayloadAction<string>) => {
            delete state.wallpaper.perChat[action.payload];
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
        setZoomLevel: (state, action: PayloadAction<number>) => {
            state.display.zoomLevel = action.payload;
        },
        setUseSystemTextSize: (state, action: PayloadAction<boolean>) => {
            state.display.useSystemTextSize = action.payload;
        },
    },
});

export const {
    hydrateSettings,
    setPrivacyPref,
    setPrivacyVisibility,
    setStatusPrivacy,
    setNotificationPref,
    setTheme,
    setAutoDownloadPref,
    setLastBackupAt,
    setUnarchiveOnNewMessage,
    setBiometricLockEnabled,
    setAutoLockTimeout,
    setZoomLevel,
    setUseSystemTextSize,
    setAccentColor,
    setGlobalWallpaper,
    setChatWallpaper,
    clearChatWallpaper,
    setDiscoverableByPhoneNumber,
    setCustomNotificationConfig,
    clearCustomNotificationConfig,
} = settingsSlice.actions;
export default settingsSlice.reducer;
