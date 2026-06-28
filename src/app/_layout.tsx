import { StyleSheet } from "react-native";
import { Provider } from "react-redux";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { store } from "../redux/store/store";
import { Stack } from "expo-router";

const BaseLayout = () => {
	return (
		<Provider store={store}>
			<GestureHandlerRootView style={{ flex: 1 }}>
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(root)" />
                    <Stack.Screen name="(tabs)" />
                </Stack>
            </GestureHandlerRootView>
		</Provider>
	);
};

export default BaseLayout;

const styles = StyleSheet.create({});
