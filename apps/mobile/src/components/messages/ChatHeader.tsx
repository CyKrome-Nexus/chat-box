import { Alert, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useSelector } from "react-redux";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Avatar from "@/src/components/images/Avatar";
import { AppText, CircleButton, ScalePressable, palette } from "@/src/components/ui";
import type { IChatRibbon } from "@/src/interfaces/list-interface";
import { callEngineManager } from "@/src/lib/calling/callEngineManager";
import { formatLastSeen } from "@/src/lib/format/time";
import { useAppTheme } from "@/src/lib/theme/ThemeContext";
import type { RootState } from "@/src/redux/store/store";

const EMPTY: string[] = [];

// Figma chat header: back, avatar with presence, name + live status, call buttons.
export const ChatHeader = ({ chat, onSearch, embedded }: { chat: IChatRibbon; onSearch: () => void; embedded?: boolean }) => {
	const insets = useSafeAreaInsets();
	const theme = useAppTheme();
	const presence = useSelector((state: RootState) => state.connection.presenceByUser);
	const lastSeen = useSelector((state: RootState) => (chat.peerId ? state.connection.lastSeenByUser[chat.peerId] : undefined));
	const typing = useSelector((state: RootState) => state.connection.typingByConversation[chat.id] ?? EMPTY);

	const others = (chat.participants ?? []).filter((participant) => participant.id !== "me");
	const onlineCount = others.filter((participant) => presence[participant.id] === "online").length;
	const peerOnline = chat.peerId ? presence[chat.peerId] === "online" : false;

	const typingNames = typing.map((id) => others.find((participant) => participant.id === id)?.name.split(" ")[0]).filter(Boolean);
	const status = typing.length
		? chat.isGroup
			? `${typingNames.join(", ")} typing…`
			: "typing…"
		: chat.isGroup
			? `${others.length + 1} members${onlineCount ? `, ${onlineCount} online` : ""}`
			: formatLastSeen(peerOnline, lastSeen);

	const call = (type: "audio" | "video") =>
		callEngineManager.startOutgoing(chat, type).catch((error: Error) => Alert.alert("Call failed", error.message));

	const openInfo = () =>
		chat.isGroup
			? router.push({ pathname: "/group-info", params: { chatId: chat.id } })
			: router.push({ pathname: "/contact-info", params: { userId: chat.peerId, conversationId: chat.id } });

	return (
		<View style={[styles.header, { paddingTop: (embedded ? 12 : insets.top + 8), backgroundColor: theme.colors.background }]}>
			{!embedded ? <CircleButton icon="arrow-back" label="Back" variant="plain" size={40} iconSize={24} iconColor={theme.colors.text} onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/messages"))} /> : null}
			<ScalePressable accessibilityLabel={`${chat.name} details`} onPress={openInfo} scaleTo={0.98} style={styles.identity}>
				<Avatar data={chat.avatar} size={44} showStatus={Boolean(chat.peerId)} statusColor={peerOnline ? palette.online : "#9AA09E"} />
				<View style={styles.text}>
					<AppText variant="body" weight="medium" numberOfLines={1}>
						{chat.name}
					</AppText>
					{status ? (
						<Animated.View key={status} entering={FadeInDown.duration(160)} exiting={FadeOutUp.duration(120)}>
							<AppText variant="caption" tone={typing.length ? "brand" : "muted"} numberOfLines={1}>
								{status}
							</AppText>
						</Animated.View>
					) : null}
				</View>
			</ScalePressable>
			<CircleButton icon="search-outline" label="Search in chat" variant="plain" size={36} iconSize={22} iconColor={theme.colors.text} onPress={onSearch} />
			{!chat.isBroadcast ? (
				<>
					<CircleButton icon="call-outline" label="Voice call" variant="plain" size={36} iconSize={22} iconColor={theme.colors.text} onPress={() => void call("audio")} />
					<CircleButton icon="videocam-outline" label="Video call" variant="plain" size={36} iconSize={24} iconColor={theme.colors.text} onPress={() => void call("video")} />
				</>
			) : null}
		</View>
	);
};

const styles = StyleSheet.create({
	header: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingHorizontal: 16,
		paddingBottom: 12,
		shadowColor: "#000",
		shadowOpacity: 0.04,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 8 },
		elevation: 2,
		zIndex: 2,
	},
	identity: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
	text: { flex: 1, gap: 2 },
});
