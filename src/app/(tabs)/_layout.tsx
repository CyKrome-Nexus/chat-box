import { router, Tabs } from "expo-router";
import { Alert, TouchableOpacity, View } from "react-native";
import { useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";

import IconSVG from "@/src/components/images/IconSVG";
import {
	addCall,
	addContact,
	backArrow,
	contact,
	message,
	phone,
	search,
	settings,
} from "@/src/constants/svgs/icons";
import BIcon from "@/src/components/buttons/BIcon";
import Avatar from "@/src/components/images/Avatar";
import { useDispatch, useSelector } from "react-redux";
import { IUser } from "@/src/interfaces/user-interface";
import { setShowAddContactModal } from "@/src/redux/features/contactsSlice";
import { IChatRibbon } from "@/src/interfaces/list-interface";
import { useAppTheme } from "@/src/lib/theme/ThemeContext";
import { hapticLightTap } from "@/src/lib/haptics/haptics";

export default function TabLayout() {
	const user = useSelector((state: { user: IUser | null }) => state.user);
	const totalUnread = useSelector((state: any) =>
		(state.chats.chats as IChatRibbon[]).reduce((sum, c) => sum + (c.notificationCount || 0), 0)
	);
	const theme = useAppTheme();

	// Guards this whole group against unauthenticated access — e.g. a deep
	// link straight into "(tabs)/messages" with no session.
	useEffect(() => {
		if (!user?.name && !user?.username) {
			router.replace("/");
		}
	}, [user]);

	if (!user?.name && !user?.username) {
		return null;
	}

	return (
		<Tabs
			screenListeners={{
				tabPress: hapticLightTap,
			}}
			screenOptions={{
				headerTitleAlign: "center",
				headerTitleStyle: {
					color: "white",
					fontFamily: "Inter 18pt Bold",
					fontWeight: "bold",
					fontSize: 24,
				},
				headerStyle: {
					backgroundColor: "black",
				},
				headerStatusBarHeight: 60,
				headerLeft: () => (
					<View style={{ marginLeft: 30 }}>
						<BIcon
							svg={search}
							width={45}
							height={45}
							iconWidth={22}
							iconHeight={22}
							onPress={() => router.push("/search")}
						/>
					</View>
				),
				tabBarStyle: {
					paddingTop: 15,
					height: "10%",
				},
			}}
		>
			<Tabs.Screen
				name="messages"
				options={{
					title: "Home",
					tabBarIcon: ({ focused }) => (
						<IconSVG svg={message} includeBorder={false} focused={focused} />
					),
					tabBarBadge: totalUnread > 0 ? totalUnread : undefined,
					tabBarActiveTintColor: theme.accent,
					headerRight: () => {
						const user = useSelector((state: { user: IUser }) => state.user);
						return (
							<>
								<TouchableOpacity
									style={{ marginRight: 20 }}
									onPress={() =>
										Alert.alert("New", undefined, [
											{ text: "New Group", onPress: () => router.push({ pathname: "/contact-picker", params: { mode: "group" } }) },
											{ text: "New Broadcast List", onPress: () => router.push({ pathname: "/contact-picker", params: { mode: "broadcast" } }) },
											{ text: "Cancel", style: "cancel" },
										])
									}
								>
									<Ionicons name="add-circle-outline" size={26} color="#000" />
								</TouchableOpacity>
								<TouchableOpacity style={{ marginRight: 30 }} onPress={() => router.push("/profile")}>
									<Avatar data={user?.avatar} />
								</TouchableOpacity>
							</>
						);
					},
				}}
			/>
			<Tabs.Screen
				name="calls"
				options={{
					title: "Calls",
					tabBarIcon: ({ focused }) => (
						<IconSVG svg={phone} includeBorder={false} focused={focused} />
					),
					tabBarActiveTintColor: theme.accent,
					headerRight: () => (
						<>
							<View style={{ marginRight: 30 }}>
								<BIcon
									svg={addCall}
									width={45}
									height={45}
									iconWidth={22}
									iconHeight={22}
								/>
							</View>
						</>
					),
				}}
			/>
			<Tabs.Screen
				name="contacts"
				options={{
					title: "Contacts",
					tabBarIcon: ({ focused }) => (
						<IconSVG svg={contact} includeBorder={false} focused={focused} />
					),
					headerRight: () => {
						const dispatch = useDispatch();
						return (
							<>
								<View style={{ marginRight: 30 }}>
									<BIcon
										svg={addContact}
										width={45}
										height={45}
										iconWidth={22}
										iconHeight={22}
										onPress={() => dispatch(setShowAddContactModal(true))}
									/>
								</View>
							</>
						);
					},
					tabBarActiveTintColor: theme.accent,
				}}
			/>
			<Tabs.Screen
				name="settings"
				options={{
					title: "Settings",
					tabBarIcon: ({ focused }) => (
						<IconSVG svg={settings} includeBorder={false} focused={focused} />
					),
					tabBarActiveTintColor: theme.accent,
					headerLeft: () => {
						return (
							<>
								<TouchableOpacity
									style={{ marginLeft: 30 }}
									onPress={() => {
										if (router.canGoBack()) {
											router.back();
										} else {
											router.push("/");
										}
									}}
								>
									<IconSVG
										svg={backArrow?.dark as string}
										height={20}
										width={20}
										includeBorder={false}
									/>
								</TouchableOpacity>
							</>
						);
					},
				}}
			/>
		</Tabs>
	);
}
