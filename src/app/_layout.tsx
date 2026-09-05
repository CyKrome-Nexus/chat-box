import { useCallback, useEffect } from "react";
import { StyleSheet } from "react-native";
import { Provider, useSelector } from "react-redux";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";

import { store } from "../redux/store/store";
import { useRealtimeConnection } from "../hooks/useRealtimeConnection";
import { Stack } from "expo-router";

SplashScreen.preventAutoHideAsync();

const RealtimeGate = ({ children }: { children: React.ReactNode }) => {
	const userId = useSelector((state: any) => state.user?._id || state.user?.username);
	useRealtimeConnection(userId);
	return <>{children}</>;
};

const BaseLayout = () => {
	const [fontsLoaded, fontError] = useFonts({
		"Carme Regular": require("../../assets/fonts/Carme Regular.ttf"),
		"Inter 18pt Bold": require("../../assets/fonts/Inter 18pt Bold.ttf"),
	});

	const isReady = fontsLoaded || !!fontError;

	useEffect(() => {
		if (isReady) {
			SplashScreen.hideAsync();
		}
	}, [isReady]);

	const onLayoutRootView = useCallback(() => {
		if (isReady) {
			SplashScreen.hideAsync();
		}
	}, [isReady]);

	if (!isReady) {
		return null;
	}

	return (
		<Provider store={store}>
			<RealtimeGate>
				<GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
	                <Stack screenOptions={{ headerShown: false }}>
	                    <Stack.Screen name="(root)" />
	                    <Stack.Screen name="(tabs)" />
	                </Stack>
	            </GestureHandlerRootView>
			</RealtimeGate>
		</Provider>
	);
};

export default BaseLayout;

const styles = StyleSheet.create({});
