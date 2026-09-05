import { router, Stack } from "expo-router";
import { TouchableOpacity } from "react-native";
import { useSelector } from "react-redux";

import { backArrow } from "@/src/constants/svgs/icons";
import IconSVG from "@/src/components/images/IconSVG";
import { IUser } from "@/src/interfaces/user-interface";
import { useEffect, useState } from "react";

const RootLayout = () => {
	const [mounted, setMounted] = useState(false);
	const user = useSelector((state: { user: IUser | null }) => state.user);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (!mounted) return; // Only navigate after mounting

		if (user?.name || user?.username) {
			router.replace("(tabs)/messages");
		} else {
			router.replace("/");
		}
	}, [user, mounted]);

	return (
		<Stack>
			<Stack.Screen
				name="index"
				options={{ title: "Index", headerShown: false }}
			/>
			<Stack.Screen
				name="auth"
				options={{
					title: "",
					headerShadowVisible: false,
					headerBackground: () => <></>,
					headerBackVisible: false,
					headerLeft: () => {
						return (
							<>
								<TouchableOpacity
									onPress={() => {
										if (router.canGoBack()) {
											router.back();
										} else {
											router.push("/");
										}
									}}
								>
									<IconSVG svg={backArrow} includeBorder={false} />
								</TouchableOpacity>
							</>
						);
					},
				}}
			/>
			<Stack.Screen
				name="forgot-password"
				options={{
					title: "",
					headerShadowVisible: false,
					headerBackground: () => <></>,
					headerBackVisible: false,
					headerLeft: () => {
						return (
							<>
								<TouchableOpacity
									onPress={() => {
										if (router.canGoBack()) {
											router.back();
										} else {
											router.push("/");
										}
									}}
								>
									<IconSVG svg={backArrow} includeBorder={false} />
								</TouchableOpacity>
							</>
						);
					},
				}}
			/>
		</Stack>
	);
};

export default RootLayout;
