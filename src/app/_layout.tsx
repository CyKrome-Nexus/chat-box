import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { Provider, useSelector } from "react-redux";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";

import { store } from "../redux/store/store";
import { useRealtimeConnection } from "../hooks/useRealtimeConnection";
import { useSessionPersistence } from "../hooks/useSessionPersistence";
import { useAccountRegistrySync } from "../hooks/useAccountRegistrySync";
import { useSettingsPersistence } from "../hooks/useSettingsPersistence";
import { useOfflineDbSync } from "../hooks/useOfflineDbSync";
import { useNetworkSync } from "../hooks/useNetworkSync";
import { useCallKeepIntegration } from "../hooks/useCallKeepIntegration";
import { useIncomingCallNotification } from "../hooks/useIncomingCallNotification";
import { useAppLock } from "../hooks/useAppLock";
import { useDisappearingMessagesSweep } from "../hooks/useDisappearingMessagesSweep";
import { useStoriesExpirySweep } from "../hooks/useStoriesExpirySweep";
import { useMessageNotifications } from "../hooks/useMessageNotifications";
import { useBadgeCountSync } from "../hooks/useBadgeCountSync";
import FloatingCallBubble from "../components/calling/FloatingCallBubble";
import AppLockScreen from "../components/security/AppLockScreen";
import InAppMessageBanner from "../components/notifications/InAppMessageBanner";
import { AppThemeProvider } from "../lib/theme/ThemeContext";
import { Stack } from "expo-router";

SplashScreen.preventAutoHideAsync();

/**
 * Mounted inside the Redux Provider. Hydrates the persisted session and only
 * renders the navigator (and hides the splash screen) once that finishes —
 * this is what prevents an already-logged-in user from flashing the login
 * screen on cold start.
 */
const AppGate = () => {
	const sessionStatus = useSelector((state: any) => state.session.status);
	const userId = useSelector((state: any) => state.user?._id || state.user?.username);

	useSessionPersistence();
	useAccountRegistrySync();
	useSettingsPersistence();
	useOfflineDbSync();
	useNetworkSync();
	useRealtimeConnection(userId);
	useCallKeepIntegration(!!userId);
	useIncomingCallNotification();
	useDisappearingMessagesSweep();
	useStoriesExpirySweep();
	useMessageNotifications();
	useBadgeCountSync();
	const { isLocked, unlock } = useAppLock();

	useEffect(() => {
		if (sessionStatus === "ready") {
			SplashScreen.hideAsync();
		}
	}, [sessionStatus]);

	if (sessionStatus !== "ready") {
		return null;
	}

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<AppThemeProvider>
			<KeyboardProvider>
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Screen name="(root)" />
				<Stack.Screen name="(tabs)" />
				<Stack.Screen name="call" options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }} />
				<Stack.Screen name="camera-capture" options={{ presentation: "fullScreenModal" }} />
				<Stack.Screen name="media-editor" options={{ presentation: "fullScreenModal" }} />
				<Stack.Screen name="document-preview" options={{ presentation: "fullScreenModal" }} />
				<Stack.Screen name="search" options={{ presentation: "fullScreenModal", animation: "fade" }} />
				<Stack.Screen name="story-viewer" options={{ presentation: "fullScreenModal", animation: "fade" }} />
				<Stack.Screen name="story-text-editor" options={{ presentation: "fullScreenModal" }} />
				<Stack.Screen name="contact-info" options={{ presentation: "card" }} />
				<Stack.Screen name="group-info" options={{ presentation: "card" }} />
				<Stack.Screen name="contact-picker" options={{ presentation: "card" }} />
				<Stack.Screen name="group-create-details" options={{ presentation: "card" }} />
				<Stack.Screen name="broadcast-create-details" options={{ presentation: "card" }} />
				<Stack.Screen name="join/[code]" options={{ presentation: "fullScreenModal" }} />
				<Stack.Screen name="u/[handle]" options={{ presentation: "fullScreenModal" }} />
				<Stack.Screen name="safety-number" options={{ presentation: "card" }} />
				<Stack.Screen name="sticker-packs" options={{ presentation: "card" }} />
				<Stack.Screen name="sticker-maker" options={{ presentation: "fullScreenModal" }} />
				<Stack.Screen name="addstickers/[packId]" options={{ presentation: "fullScreenModal" }} />
				<Stack.Screen name="shared-media" options={{ presentation: "card" }} />
				<Stack.Screen name="starred-messages" options={{ presentation: "card" }} />
				<Stack.Screen name="profile" options={{ presentation: "modal" }} />
				<Stack.Screen name="accounts" options={{ presentation: "modal" }} />
				<Stack.Screen name="add-account" options={{ presentation: "modal" }} />
				<Stack.Screen name="qr-code" options={{ presentation: "modal" }} />
				<Stack.Screen name="qr-scanner" options={{ presentation: "fullScreenModal" }} />
				<Stack.Screen name="settings-account" />
				<Stack.Screen name="settings-chat" />
				<Stack.Screen name="settings-notifications" />
				<Stack.Screen name="settings-help" />
				<Stack.Screen name="settings-storage" />
				<Stack.Screen name="settings-display" />
				<Stack.Screen name="settings-wallpaper" options={{ presentation: "card" }} />
				<Stack.Screen name="settings-contact-notifications" options={{ presentation: "card" }} />
			</Stack>
			<FloatingCallBubble />
			<InAppMessageBanner />
			<AppLockScreen visible={isLocked} onUnlock={unlock} />
			</KeyboardProvider>
			</AppThemeProvider>
		</GestureHandlerRootView>
	);
};

const BaseLayout = () => {
	const [fontsLoaded, fontError] = useFonts({
		"Carme Regular": require("../../assets/fonts/Carme Regular.ttf"),
		"Inter 18pt Bold": require("../../assets/fonts/Inter 18pt Bold.ttf"),
	});

	const fontsReady = fontsLoaded || !!fontError;

	if (!fontsReady) {
		return null;
	}

	return (
		<Provider store={store}>
			<AppGate />
		</Provider>
	);
};

export default BaseLayout;

const styles = StyleSheet.create({});
