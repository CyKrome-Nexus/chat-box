import { useMemo, useState } from "react";
import { Alert, RefreshControl, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useSelector } from "react-redux";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import Avatar from "@/src/components/images/Avatar";
import ChatRibbon from "@/src/components/riboons/ChatRibbon";
import StoriesCarousel from "@/src/components/stories/StoriesCarousel";
import MasterDetailLayout from "@/src/components/layout/MasterDetailLayout";
import { AppText, CircleButton, ScalePressable, SheetScreen, palette } from "@/src/components/ui";
import type { IChatRibbon } from "@/src/interfaces/list-interface";
import { syncConversations } from "@/src/lib/sync/chatSync";
import { useResponsiveLayout } from "@/src/lib/display/useResponsiveLayout";
import type { RootState } from "@/src/redux/store/store";

type TFilter = "all" | "unread" | "groups";
const FILTERS: { key: TFilter; label: string }[] = [
	{ key: "all", label: "All" },
	{ key: "unread", label: "Unread" },
	{ key: "groups", label: "Groups" },
];

const byPinnedThenActivity = (a: IChatRibbon, b: IChatRibbon) =>
	Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0);

const Messages = () => {
	const user = useSelector((state: RootState) => state.user);
	const chats = useSelector((state: RootState) => state.chats.chats);
	const connection = useSelector((state: RootState) => state.connection.status);
	const [filter, setFilter] = useState<TFilter>("all");
	const [showArchived, setShowArchived] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const { isTablet } = useResponsiveLayout();
	const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
	const selectedChat = useMemo(() => chats.find((c) => c.id === selectedChatId) ?? null, [chats, selectedChatId]);

	const archived = useMemo(() => chats.filter((c) => c.archived).sort(byPinnedThenActivity), [chats]);
	const visible = useMemo(() => {
		const active = chats.filter((c) => !c.archived);
		const filtered = filter === "unread" ? active.filter((c) => (c.notificationCount ?? 0) > 0) : filter === "groups" ? active.filter((c) => c.isGroup) : active;
		return [...filtered].sort(byPinnedThenActivity);
	}, [chats, filter]);

	const refresh = async () => {
		setRefreshing(true);
		await syncConversations().catch(() => undefined);
		setRefreshing(false);
	};

	const openNewMenu = () =>
		Alert.alert("Start a conversation", undefined, [
			{ text: "New chat", onPress: () => router.push("/search") },
			{ text: "New group", onPress: () => router.push({ pathname: "/contact-picker", params: { mode: "group" } }) },
			{ text: "Cancel", style: "cancel" },
		]);

	const listPane = (
		<SheetScreen
			title="Home"
			left={<CircleButton icon="search-outline" label="Search" variant="outline" onPress={() => router.push("/search")} />}
			right={
				<ScalePressable accessibilityLabel="Your profile" onPress={() => router.push("/profile")}>
					<Avatar data={user?.avatar} size={44} />
				</ScalePressable>
			}
			header={<StoriesCarousel />}
		>
			{connection === "offline" || connection === "connecting" ? (
				<Animated.View entering={FadeIn} style={styles.connection}>
					<AppText variant="caption" tone="muted" align="center">
						{connection === "offline" ? "Waiting for network…" : "Connecting…"}
					</AppText>
				</Animated.View>
			) : null}
			<Animated.FlatList
				data={showArchived ? [...archived, ...visible] : visible}
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => <ChatRibbon content={item} onSelect={isTablet ? (content) => setSelectedChatId(content.id) : undefined} />}
				itemLayoutAnimation={LinearTransition.springify().damping(24)}
				contentContainerStyle={styles.list}
				showsVerticalScrollIndicator={false}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={palette.brand} />}
				ListHeaderComponent={
					<View>
						<View style={styles.filters}>
							{FILTERS.map((item) => (
								<ScalePressable
									key={item.key}
									accessibilityLabel={`Show ${item.label.toLowerCase()} chats`}
									onPress={() => setFilter(item.key)}
									style={[styles.filter, filter === item.key && styles.filterActive]}
								>
									<AppText variant="label" style={{ color: filter === item.key ? palette.white : palette.brandDark }}>
										{item.label}
									</AppText>
								</ScalePressable>
							))}
						</View>
						{archived.length > 0 ? (
							<ScalePressable accessibilityLabel="Archived chats" onPress={() => setShowArchived((value) => !value)} style={styles.archived}>
								<Ionicons name="archive-outline" size={18} color={palette.muted} />
								<AppText variant="label" style={styles.flex}>
									Archived ({archived.length})
								</AppText>
								<Ionicons name={showArchived ? "chevron-up" : "chevron-down"} size={16} color={palette.muted} />
							</ScalePressable>
						) : null}
					</View>
				}
				ListEmptyComponent={
					<View style={styles.empty}>
						<AppText variant="heading" align="center">
							{filter === "all" ? "No chats yet" : "Nothing here"}
						</AppText>
						<AppText variant="label" weight="regular" tone="muted" align="center">
							Find friends by name or @username and say hello.
						</AppText>
					</View>
				}
			/>
			<CircleButton icon="add" label="New conversation" variant="brand" size={56} onPress={openNewMenu} style={styles.fab} />
		</SheetScreen>
	);

	return isTablet ? <MasterDetailLayout listPane={listPane} selectedChat={selectedChat} /> : listPane;
};

const styles = StyleSheet.create({
	flex: { flex: 1 },
	list: { paddingBottom: 120 },
	connection: { paddingBottom: 4 },
	filters: { flexDirection: "row", gap: 8, paddingHorizontal: 24, paddingVertical: 8 },
	filter: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, backgroundColor: palette.brandSoft },
	filterActive: { backgroundColor: palette.brand },
	archived: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 24, paddingVertical: 12 },
	empty: { paddingTop: 80, paddingHorizontal: 40, gap: 8 },
	fab: { position: "absolute", right: 24, bottom: 24, shadowColor: palette.brand, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
});

export default Messages;
