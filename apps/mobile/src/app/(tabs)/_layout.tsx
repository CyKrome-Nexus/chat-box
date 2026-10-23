import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { router, Tabs } from "expo-router";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import IconSVG from "@/src/components/images/IconSVG";
import { fonts, palette } from "@/src/components/ui";
import { contact, message, phone, settings } from "@/src/constants/svgs/icons";
import { hapticLightTap } from "@/src/lib/haptics/haptics";
import { useAppTheme } from "@/src/lib/theme/ThemeContext";
import type { RootState } from "@/src/redux/store/store";

const TAB_ICONS = { messages: message, calls: phone, contacts: contact, settings } as const;

export default function TabLayout() {
	const userId = useSelector((state: RootState) => state.user?.id);
	const totalUnread = useSelector((state: RootState) => state.chats.chats.reduce((sum, chat) => sum + (chat.muted ? 0 : (chat.notificationCount ?? 0)), 0));
	const theme = useAppTheme();
	const insets = useSafeAreaInsets();

	useEffect(() => {
		if (!userId) router.replace("/");
	}, [userId]);

	if (!userId) return null;

	return (
		<Tabs
			screenListeners={{ tabPress: hapticLightTap }}
			screenOptions={({ route }) => ({
				headerShown: false,
				tabBarActiveTintColor: palette.brandDark,
				tabBarInactiveTintColor: palette.muted,
				tabBarLabelStyle: styles.label,
				tabBarStyle: [styles.bar, { height: 64 + insets.bottom, paddingBottom: insets.bottom + 8, backgroundColor: theme.colors.tabBarBackground }],
				tabBarIcon: ({ focused }) => <IconSVG svg={TAB_ICONS[route.name as keyof typeof TAB_ICONS]} includeBorder={false} focused={focused} width={26} height={26} />,
				animation: "shift",
			})}
		>
			<Tabs.Screen name="messages" options={{ title: "Message", tabBarBadge: totalUnread > 0 ? (totalUnread > 99 ? "99+" : totalUnread) : undefined, tabBarBadgeStyle: styles.badge }} />
			<Tabs.Screen name="calls" options={{ title: "Calls" }} />
			<Tabs.Screen name="contacts" options={{ title: "Contacts" }} />
			<Tabs.Screen name="settings" options={{ title: "Settings" }} />
		</Tabs>
	);
}

const styles = StyleSheet.create({
	bar: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#EEFAF8", paddingTop: 10, elevation: 0 },
	label: { fontFamily: fonts.regular, fontSize: 14, marginTop: 4 },
	badge: { backgroundColor: "#F04A4C", fontFamily: fonts.semibold, fontSize: 10 },
});
