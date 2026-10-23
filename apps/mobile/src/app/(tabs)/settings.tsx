import type { ComponentProps } from "react";
import { Alert, ScrollView, Share, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

import Avatar from "@/src/components/images/Avatar";
import { AppText, CircleButton, ScalePressable, SheetScreen, palette } from "@/src/components/ui";
import { logoutUser } from "@/src/lib/features";
import type { RootState } from "@/src/redux/store/store";

type TIcon = ComponentProps<typeof Ionicons>["name"];

const ITEMS: { title: string; description?: string; icon: TIcon; onPress: () => void }[] = [
	{ title: "Account", description: "Privacy, security, sessions", icon: "key-outline", onPress: () => router.push("/settings-account") },
	{ title: "Chat", description: "Chat history, theme, wallpapers", icon: "chatbubble-ellipses-outline", onPress: () => router.push("/settings-chat") },
	{ title: "Notifications", description: "Messages, group and others", icon: "notifications-outline", onPress: () => router.push("/settings-notifications") },
	{ title: "Help", description: "Help center, contact us, privacy policy", icon: "help-circle-outline", onPress: () => router.push("/settings-help") },
	{ title: "Storage and data", description: "Network usage, storage usage", icon: "swap-vertical-outline", onPress: () => router.push("/settings-storage") },
	{ title: "Linked accounts", description: "Switch accounts or add another", icon: "people-outline", onPress: () => router.push("/accounts") },
	{
		title: "Invite a friend",
		icon: "person-add-outline",
		onPress: () => void Share.share({ message: "Let's chat on Chatbox — fast, private messaging. Download it and say hi!" }),
	},
];

const Settings = () => {
	const dispatch = useDispatch();
	const user = useSelector((state: RootState) => state.user);

	const logout = () =>
		Alert.alert("Log out", "Are you sure you want to log out?", [
			{ text: "Cancel", style: "cancel" },
			{ text: "Log out", style: "destructive", onPress: () => void logoutUser(dispatch) },
		]);

	return (
		<SheetScreen
			title="Settings"
			left={<CircleButton icon="arrow-back" label="Back" variant="plain" iconColor={palette.white} onPress={() => router.navigate("/(tabs)/messages")} />}
		>
			<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
				<ScalePressable accessibilityLabel="Edit profile" onPress={() => router.push("/profile")} onLongPress={() => router.push("/accounts")} scaleTo={0.98} style={styles.profile}>
					<Avatar data={user?.avatar} size={60} />
					<View style={styles.flex}>
						<AppText variant="title" weight="semibold" numberOfLines={1}>
							{user?.name}
						</AppText>
						<AppText variant="caption" tone="muted" numberOfLines={1}>
							{user?.about || (user?.handle ? `@${user.handle}` : "Add an about")}
						</AppText>
					</View>
					<CircleButton icon="qr-code-outline" label="My QR code" variant="plain" iconColor={palette.brandDark} onPress={() => router.push("/qr-code")} />
				</ScalePressable>
				<View style={styles.divider} />
				{ITEMS.map((item, index) => (
					<Animated.View key={item.title} entering={FadeInDown.delay(index * 35).springify().damping(22)}>
						<ScalePressable accessibilityLabel={item.title} onPress={item.onPress} scaleTo={0.985} style={styles.row}>
							<View style={styles.icon}>
								<Ionicons name={item.icon} size={22} color={palette.muted} />
							</View>
							<View style={styles.flex}>
								<AppText variant="body" weight="medium">
									{item.title}
								</AppText>
								{item.description ? (
									<AppText variant="caption" tone="muted">
										{item.description}
									</AppText>
								) : null}
							</View>
						</ScalePressable>
					</Animated.View>
				))}
				<ScalePressable accessibilityLabel="Log out" onPress={logout} style={styles.row}>
					<View style={[styles.icon, styles.logoutIcon]}>
						<Ionicons name="log-out-outline" size={22} color={palette.danger} />
					</View>
					<AppText variant="body" weight="medium" tone="danger">
						Log out
					</AppText>
				</ScalePressable>
			</ScrollView>
		</SheetScreen>
	);
};

const styles = StyleSheet.create({
	content: { paddingBottom: 40 },
	flex: { flex: 1, gap: 4 },
	profile: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 24, paddingVertical: 16 },
	divider: { height: StyleSheet.hairlineWidth, backgroundColor: "#EEFAF8", marginBottom: 8 },
	row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 24, paddingVertical: 12 },
	icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: palette.brandSoft, alignItems: "center", justifyContent: "center" },
	logoutIcon: { backgroundColor: "#FDECEC" },
});

export default Settings;
