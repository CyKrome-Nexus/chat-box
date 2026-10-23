import { useEffect } from "react";
import { router, Stack } from "expo-router";
import { useSelector } from "react-redux";

import type { RootState } from "@/src/redux/store/store";

const RootLayout = () => {
	const userId = useSelector((state: RootState) => state.user?.id);

	useEffect(() => {
		if (userId) router.replace("/(tabs)/messages");
	}, [userId]);

	return (
		<Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
			<Stack.Screen name="index" options={{ animation: "fade" }} />
			<Stack.Screen name="auth" />
			<Stack.Screen name="forgot-password" />
		</Stack>
	);
};

export default RootLayout;
