import { router, Stack } from "expo-router";
import { TouchableOpacity } from "react-native";
import { useSelector } from "react-redux";

import { backArrow } from "@/src/constants/svgs/icons";
import IconSVG from "@/src/components/images/IconSVG";
import { IUser } from "@/src/interfaces/user-interface";
import { useEffect } from "react";

const RootLayout = () => {
	const user = useSelector((state: { user: IUser | null }) => state.user);

	// The root Stack (src/app/_layout.tsx) only renders this group once
	// session hydration has finished, so `user` here is always the final
	// hydrated value — no separate "mounted"/loading guard is needed to
	// avoid an aggressive redirect firing on stale/uninitialized state.
	useEffect(() => {
		if (user?.name || user?.username) {
			router.replace("(tabs)/messages");
		} else {
			router.replace("/");
		}
	}, [user]);

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
