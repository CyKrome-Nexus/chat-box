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
import { useSettingsPersistence } from "../hooks/useSettingsPersistence";
import { useOfflineDbSync } from "../hooks/useOfflineDbSync";
import { useNetworkSync } from "../hooks/useNetworkSync";
import { useCallKeepIntegration } from "../hooks/useCallKeepIntegration";
import { useIncomingCallNotification } from "../hooks/useIncomingCallNotification";
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
	useSettingsPersistence();
	useOfflineDbSync();
	useNetworkSync();
	useRealtimeConnection(userId);
	useCallKeepIntegration();
	useIncomingCallNotification();

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
			<KeyboardProvider>
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Screen name="(root)" />
				<Stack.Screen name="(tabs)" />
				<Stack.Screen name="call" options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }} />
				<Stack.Screen name="profile" options={{ presentation: "modal" }} />
				<Stack.Screen name="qr-code" options={{ presentation: "modal" }} />
				<Stack.Screen name="qr-scanner" options={{ presentation: "fullScreenModal" }} />
				<Stack.Screen name="settings-account" />
				<Stack.Screen name="settings-chat" />
				<Stack.Screen name="settings-notifications" />
				<Stack.Screen name="settings-help" />
				<Stack.Screen name="settings-storage" />
			</Stack>
			</KeyboardProvider>
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
