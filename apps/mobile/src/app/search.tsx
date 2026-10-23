import { useEffect, useMemo, useState } from "react";
import { Keyboard, SectionList, StyleSheet, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { PublicUser } from "@chatbox/shared";

import Avatar from "@/src/components/images/Avatar";
import HighlightedText from "@/src/components/search/HighlightedText";
import { AppText, CircleButton, ScalePressable, fonts, palette, radii } from "@/src/components/ui";
import type { IChatRibbon } from "@/src/interfaces/list-interface";
import { usersApi } from "@/src/lib/api/services";
import { formatRelative } from "@/src/lib/format/time";
import { useGlobalSearch, type IMessageSearchResult } from "@/src/hooks/useGlobalSearch";
import type { RootState } from "@/src/redux/store/store";

type TRow =
	| { type: "person"; key: string; user: PublicUser }
	| { type: "chat"; key: string; chat: IChatRibbon }
	| { type: "message"; key: string; hit: IMessageSearchResult };

const EMPTY_CONTACTS: never[] = [];

// Figma "search": People, Group Chat, then chats and matching messages from the local index.
const SearchScreen = () => {
	const insets = useSafeAreaInsets();
	const chats = useSelector((state: RootState) => state.chats.chats);
	const [query, setQuery] = useState("");
	const [people, setPeople] = useState<PublicUser[]>([]);
	const { messages: messageHits } = useGlobalSearch(query, null, EMPTY_CONTACTS);

	useEffect(() => {
		const term = query.trim();
		if (term.length < 2) return setPeople([]);
		const timer = setTimeout(() => {
			usersApi.search(term).then(setPeople).catch(() => setPeople([]));
		}, 250);
		return () => clearTimeout(timer);
	}, [query]);

	const sections = useMemo(() => {
		const term = query.trim().toLowerCase();
		if (!term) return [];
		const matching = chats.filter((chat) => chat.name.toLowerCase().includes(term));
		const knownPeers = new Set(chats.map((chat) => chat.peerId).filter(Boolean));
		const result: { title: string; data: TRow[] }[] = [];
		const directs = matching.filter((chat) => !chat.isGroup);
		const strangers = people.filter((user) => !knownPeers.has(user.id));
		if (directs.length || strangers.length) {
			result.push({
				title: "People",
				data: [
					...directs.map((chat): TRow => ({ type: "chat", key: `chat-${chat.id}`, chat })),
					...strangers.map((user): TRow => ({ type: "person", key: `user-${user.id}`, user })),
				],
			});
		}
		const groups = matching.filter((chat) => chat.isGroup);
		if (groups.length) result.push({ title: "Group Chat", data: groups.map((chat) => ({ type: "chat", key: `group-${chat.id}`, chat })) });
		if (messageHits.length) result.push({ title: "Messages", data: messageHits.slice(0, 50).map((hit) => ({ type: "message", key: `msg-${hit.message.id}`, hit })) });
		return result;
	}, [query, chats, people, messageHits]);

	const openChat = (chat: IChatRibbon, jumpToMessageId?: string) =>
		router.push({ pathname: "/messages/Chat", params: { user: JSON.stringify(chat), ...(jumpToMessageId ? { jumpToMessageId } : {}) } });

	const openPerson = (user: PublicUser) => router.push({ pathname: "/contact-info", params: { userId: user.id } });

	const renderRow = ({ item, index }: { item: TRow; index: number }) => {
		if (item.type === "message") {
			const { message, chat } = item.hit;
			return (
				<ScalePressable accessibilityLabel="Open message" onPress={() => chat && openChat(chat, message.id)} scaleTo={0.985} style={styles.row}>
					<Avatar data={chat?.avatar} size={52} />
					<View style={styles.main}>
						<View style={styles.topLine}>
							<AppText variant="body" weight="medium" numberOfLines={1} style={styles.flex}>
								{chat?.name ?? "Chat"}
							</AppText>
							<AppText variant="caption" tone="muted">
								{formatRelative(message.timestamp)}
							</AppText>
						</View>
						<HighlightedText text={message.text} query={query} style={styles.snippet} highlightStyle={styles.highlight} numberOfLines={2} />
					</View>
				</ScalePressable>
			);
		}
		const name = item.type === "chat" ? item.chat.name : item.user.name;
		const subtitle =
			item.type === "chat"
				? item.chat.isGroup
					? `${item.chat.participants?.length ?? 0} participants`
					: (item.chat.lastMessage ?? "")
				: (item.user.about ?? (item.user.handle ? `@${item.user.handle}` : ""));
		return (
			<Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 25).springify().damping(22)}>
				<ScalePressable accessibilityLabel={name} onPress={() => (item.type === "chat" ? openChat(item.chat) : openPerson(item.user))} scaleTo={0.985} style={styles.row}>
					<Avatar data={item.type === "chat" ? item.chat.avatar : { url: item.user.avatarUrl ?? undefined }} size={52} />
					<View style={styles.main}>
						<AppText variant="title" numberOfLines={1}>
							{name}
						</AppText>
						<AppText variant="caption" tone="muted" numberOfLines={1}>
							{subtitle}
						</AppText>
					</View>
				</ScalePressable>
			</Animated.View>
		);
	};

	return (
		<View style={[styles.root, { paddingTop: insets.top + 16 }]}>
			<Animated.View entering={FadeIn.duration(200)} style={styles.searchBar}>
				<Ionicons name="search-outline" size={24} color={palette.ink} />
				<TextInput
					value={query}
					onChangeText={setQuery}
					placeholder="People, groups and messages"
					placeholderTextColor={palette.muted}
					autoFocus
					autoCapitalize="none"
					returnKeyType="search"
					selectionColor={palette.brand}
					style={styles.input}
				/>
				<CircleButton icon="close" label={query ? "Clear search" : "Close search"} variant="plain" size={32} iconSize={22} onPress={() => (query ? setQuery("") : router.back())} />
			</Animated.View>
			<SectionList
				sections={sections}
				keyExtractor={(item) => item.key}
				renderItem={renderRow}
				renderSectionHeader={({ section }) => (
					<AppText variant="body" weight="medium" style={styles.sectionHeader}>
						{section.title}
					</AppText>
				)}
				stickySectionHeadersEnabled={false}
				keyboardShouldPersistTaps="handled"
				onScrollBeginDrag={Keyboard.dismiss}
				contentContainerStyle={styles.list}
				ListEmptyComponent={
					query.trim().length >= 2 ? (
						<AppText variant="label" weight="regular" tone="muted" align="center" style={styles.empty}>
							No results for “{query.trim()}”
						</AppText>
					) : (
						<AppText variant="label" weight="regular" tone="muted" align="center" style={styles.empty}>
							Search by name, @username, or words in your messages.
						</AppText>
					)
				}
			/>
		</View>
	);
};

export default SearchScreen;

const styles = StyleSheet.create({
	root: { flex: 1, backgroundColor: palette.white },
	flex: { flex: 1 },
	searchBar: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 24, paddingHorizontal: 12, height: 44, borderRadius: radii.md, backgroundColor: palette.field },
	input: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: palette.ink },
	list: { paddingBottom: 40 },
	sectionHeader: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 6 },
	row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 24, paddingVertical: 10 },
	main: { flex: 1, gap: 4 },
	topLine: { flexDirection: "row", alignItems: "center", gap: 8 },
	snippet: { fontFamily: fonts.regular, fontSize: 12, color: palette.muted },
	highlight: { backgroundColor: "#FFF3B0", color: palette.ink },
	empty: { marginTop: 60, paddingHorizontal: 40 },
});
