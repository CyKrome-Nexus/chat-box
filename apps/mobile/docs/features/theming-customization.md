# Theming, Wallpapers & Display Scaling

## Overview
Covers:
- **Theme Modes**: System, Light, Dark Slate, True OLED Pure Black (`#000000`), and Sepia — now implemented, see [theming-engine.md](../architecture/theming-engine.md).
- **Accent Colors**: Customizable primary brand color adapting outgoing bubbles and active tabs — now implemented, see [theming-engine.md](../architecture/theming-engine.md).
- **Chat Wallpaper Studio**: Vector doodle patterns, gallery photos with Gaussian blur (0–100%) and dimming (0–80%) sliders, and per-chat wallpapers — now implemented, see [theming-engine.md](../architecture/theming-engine.md).
- **Display Zoom Engine**: 80% to 165% text and UI scaling slider with non-clipping flexible bubble architecture — now implemented, see [display-scaling.md](../architecture/display-scaling.md).
- **Responsive Tablet/Foldable View**: Master-detail dual pane split view on screens >= 600dp — now implemented, see [display-scaling.md](../architecture/display-scaling.md).

## Settings Subscreens (current implementation)

`src/redux/features/settingsSlice.ts` holds the persisted preferences backing the Settings tab's
subscreens (`src/app/settings-*.tsx`), loaded/saved by `useSettingsPersistence`
(`@react-native-async-storage/async-storage`, key `chatbox:settings`):

- **Account** (`settings-account.tsx`): privacy toggles (last seen, read receipts), a
  two-factor-authentication toggle, a "Change Phone Number" placeholder, and Delete Account
  (removes the local mock account via `authService.deleteAccount` and logs out).
- **Chat** (`settings-chat.tsx`): theme switcher (`settings.theme`, 5 modes, now wired to a real
  `useAppTheme()` Context — see [theming-engine.md](../architecture/theming-engine.md)), an accent
  color picker, links to Text & Display Size and Chat Wallpaper, a "Back Up Now" stub that just
  timestamps `lastBackupAt`, and "Clear All Chats" (`messagesSlice.clearAllMessages`).
- **Notifications** (`settings-notifications.tsx`): sound/vibration/message-preview/group-notification
  toggles. Not yet wired to real notification delivery (see the push notification tickets).
- **Help** (`settings-help.tsx`): a static FAQ accordion, and placeholder Contact Support/Terms/Privacy
  entries (no real support backend or external legal pages exist in this repo).
- **Storage and Data** (`settings-storage.tsx`): approximate storage-by-chat breakdown computed
  from in-memory message attachment sizes (not a real device storage scan), and auto-download
  toggles for photos/videos/documents (not yet enforced anywhere).

`state.settings.theme` is persisted and now read live by `useAppTheme()` — see
[theming-engine.md](../architecture/theming-engine.md) for exactly which surfaces consume it today
versus which still use the original static `Colors` module.

## Log Out

`(tabs)/settings.tsx` now has an explicit "Log Out" button below the settings list, with a
confirmation `Alert`. It calls the existing `logoutUser` (`src/lib/features.ts`), which clears the
Redux user, clears the persisted session (`clearSession`), and navigates to `/`.
