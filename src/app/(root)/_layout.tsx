import { router, Stack, usePathname } from "expo-router";
import { TouchableOpacity, View } from "react-native";
import { useSelector } from "react-redux";

import { backArrow } from "@/src/constants/svgs/icons";
import IconSVG from "@/src/components/images/IconSVG";
import { IUser } from "@/src/interfaces/user-interface";
import { useEffect } from "react";

const RootLayout = () => {
	const user = useSelector((state: { user: IUser | null }) => state.user);
	const pathname = usePathname();
	// Android gesture navigation can cancel a normal press in the left-edge zone.
	// Acting on touch-down keeps the arrow in place and fires before that cancellation.
	const handleBackPress = () => {
		if (router.canGoBack()) {
			router.back();
		} else {
			router.push("/");
		}
	};

	// The root Stack (src/app/_layout.tsx) only renders this group once
	// session hydration has finished, so `user` here is always the final
	// hydrated value — no separate "mounted"/loading guard is needed to
	// avoid an aggressive redirect firing on stale/uninitialized state.
	//
	// Deliberately depends on `[user]` only, not `pathname` — this effect
	// should re-run when auth state itself changes (login/logout), not on
	// every in-group navigation. Reading `pathname` inside without listing
	// it as a dependency is intentional: it's only used to skip a redundant
	// `router.replace` to the route we're already on. Adding `pathname` as a
	// dependency (an earlier attempt at fixing the bug below) reintroduced a
	// worse bug — it forced every navigation to `/auth` or `/forgot-password`
	// while logged out to immediately bounce back to "/", making those
	// screens permanently unreachable.
	//
	// The `pathname !== "/"` / `!== "/messages"` guards themselves exist
	// because `router.replace(...)` to the route we're already on
	// re-triggers Expo Router's navigation state, remounting this layout and
	// re-running this same effect — an infinite loop that crashed the app
	// with "Maximum update depth exceeded" the first time this was ever
	// actually run on a device.
	useEffect(() => {
		if (user?.name || user?.username) {
			if (pathname !== "/messages") router.replace("(tabs)/messages");
		} else if (pathname !== "/") {
			router.replace("/");
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
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
					headerBackground: () => <View pointerEvents="none" style={{ flex: 1 }} />,
					headerBackVisible: false,
					headerLeft: () => {
						return (
							<>
								<TouchableOpacity
									style={{ alignItems: "flex-start", paddingRight: 40 }}
									onPressIn={handleBackPress}
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
					headerBackground: () => <View pointerEvents="none" style={{ flex: 1 }} />,
					headerBackVisible: false,
					headerLeft: () => {
						return (
							<>
								<TouchableOpacity
									style={{ alignItems: "flex-start", paddingRight: 40 }}
									onPressIn={handleBackPress}
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
