import { useState } from "react";
import { FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import Avatar from "@/src/components/images/Avatar";
import HighlightedText from "@/src/components/search/HighlightedText";
import Colors from "@/src/constants/Colors";
import { useDeviceContacts } from "@/src/hooks/useDeviceContacts";
import { useGlobalSearch, TSearchFilter } from "@/src/hooks/useGlobalSearch";
import { IContactRibbon } from "@/src/interfaces/list-interface";

const FILTERS: { key: TSearchFilter; label: string }[] = [
	{ key: "chats", label: "Chats" },
	{ key: "photos", label: "Photos" },
	{ key: "videos", label: "Videos" },
	{ key: "links", label: "Links" },
	{ key: "audio", label: "Audio" },
	{ key: "documents", label: "Documents" },
];

/**
 * Full-screen global search — reached by tapping the search icon in the
 * Home tab header. See docs/architecture/search.md.
 */
const SearchScreen = () => {
	const [query, setQuery] = useState("");
	const [filter, setFilter] = useState<TSearchFilter | null>(null);
	const { contacts: deviceContacts } = useDeviceContacts();
	const manualContacts = useSelector((state: any) => state.contacts.manualContacts as IContactRibbon[]);
	const allContacts = [...manualContacts, ...deviceContacts];

	const { chats, contacts, messages, media } = useGlobalSearch(query, filter, allContacts);

	const hasQuery = query.trim().length > 0;
	const hasResults = chats.length || contacts.length || messages.length || media.length;

	return (
		<View style={styles.container}>
			<View style={styles.searchBar}>
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name="chevron-back" size={24} color="#000E08" />
				</TouchableOpacity>
				<View style={styles.inputWrapper}>
					<Ionicons name="search" size={16} color="#797C7B" />
					<TextInput
						style={styles.input}
						placeholder="Search chats, contacts, messages…"
						placeholderTextColor="#797C7B"
						value={query}
						onChangeText={setQuery}
						autoFocus
					/>
					{!!query && (
						<TouchableOpacity onPress={() => setQuery("")}>
							<Ionicons name="close-circle" size={16} color="#797C7B" />
						</TouchableOpacity>
					)}
				</View>
			</View>

			<View style={styles.filterRow}>
				<FlatList
					data={FILTERS}
					horizontal
					showsHorizontalScrollIndicator={false}
					keyExtractor={(item) => item.key}
					contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
					renderItem={({ item }) => (
						<TouchableOpacity
							style={[styles.filterPill, filter === item.key && styles.filterPillActive]}
							onPress={() => setFilter((prev) => (prev === item.key ? null : item.key))}
						>
							<Text style={[styles.filterPillText, filter === item.key && styles.filterPillTextActive]}>
								{item.label}
							</Text>
						</TouchableOpacity>
					)}
				/>
			</View>

			{!hasQuery ? (
				<View style={styles.emptyState}>
					<Ionicons name="search" size={40} color="#ccc" />
					<Text style={styles.emptyStateText}>Search for chats, contacts, or messages</Text>
				</View>
			) : !hasResults ? (
				<View style={styles.emptyState}>
					<Text style={styles.emptyStateText}>No results for "{query}"</Text>
				</View>
			) : (
				<FlatList
					data={[
						...(chats.length ? [{ kind: "section" as const, id: "sec-chats", label: "Chats" }] : []),
						...chats.map((chat) => ({ kind: "chat" as const, id: `chat-${chat.id}`, chat })),
						...(contacts.length ? [{ kind: "section" as const, id: "sec-contacts", label: "Contacts" }] : []),
						...contacts.map((contact) => ({ kind: "contact" as const, id: `contact-${contact.id}`, contact })),
						...(messages.length ? [{ kind: "section" as const, id: "sec-messages", label: "Messages" }] : []),
						...messages.map((hit) => ({ kind: "message" as const, id: `msg-${hit.message.id}`, hit })),
						...(media.length ? [{ kind: "section" as const, id: "sec-media", label: FILTERS.find((f) => f.key === filter)?.label || "Media" }] : []),
						...media.map((hit: any) => ({ kind: "media" as const, id: `media-${hit.message.id}`, hit })),
					]}
					keyExtractor={(item) => item.id}
					contentContainerStyle={{ paddingBottom: 40 }}
					renderItem={({ item }) => {
						if (item.kind === "section") {
							return <Text style={styles.sectionLabel}>{item.label}</Text>;
						}
						if (item.kind === "chat") {
							return (
								<TouchableOpacity
									style={styles.resultRow}
									onPress={() =>
										router.push({ pathname: "/messages/Chat", params: { user: JSON.stringify(item.chat) } })
									}
								>
									<Avatar data={item.chat.avatar} size={40} />
									<HighlightedText
										text={item.chat.name}
										query={query}
										style={styles.resultTitle}
										highlightStyle={styles.highlight}
									/>
								</TouchableOpacity>
							);
						}
						if (item.kind === "contact") {
							return (
								<View style={styles.resultRow}>
									<Avatar data={item.contact.avatar} size={40} />
									<View style={{ flex: 1 }}>
										<HighlightedText
											text={item.contact.name}
											query={query}
											style={styles.resultTitle}
											highlightStyle={styles.highlight}
										/>
										{!!item.contact.phoneNumber && (
											<HighlightedText
												text={item.contact.phoneNumber}
												query={query}
												style={styles.resultSubtitle}
												highlightStyle={styles.highlight}
											/>
										)}
									</View>
								</View>
							);
						}
						if (item.kind === "message") {
							return (
								<TouchableOpacity
									style={styles.resultRow}
									onPress={() =>
										item.hit.chat &&
										router.push({
											pathname: "/messages/Chat",
											params: { user: JSON.stringify(item.hit.chat), jumpToMessageId: item.hit.message.id },
										})
									}
								>
									<Avatar data={item.hit.chat?.avatar} size={40} />
									<View style={{ flex: 1 }}>
										<Text style={styles.resultTitle}>{item.hit.chat?.name || "Unknown chat"}</Text>
										<HighlightedText
											text={item.hit.message.text}
											query={query}
											style={styles.resultSubtitle}
											highlightStyle={styles.highlight}
											numberOfLines={1}
										/>
									</View>
								</TouchableOpacity>
							);
						}
						// media / link result
						const hit = item.hit;
						return (
							<TouchableOpacity
								style={styles.resultRow}
								onPress={() =>
									hit.chat &&
									router.push({
										pathname: "/messages/Chat",
										params: { user: JSON.stringify(hit.chat), jumpToMessageId: hit.message.id },
									})
								}
							>
								{filter === "photos" || filter === "videos" ? (
									<Image source={{ uri: hit.attachment.uri }} style={styles.mediaThumb} />
								) : (
									<View style={styles.mediaIcon}>
										<Ionicons
											name={
												filter === "audio"
													? "mic"
													: filter === "links"
														? "link"
														: "document-text"
											}
											size={20}
											color={Colors.focused}
										/>
									</View>
								)}
								<View style={{ flex: 1 }}>
									<Text style={styles.resultTitle} numberOfLines={1}>
										{hit.chat?.name || "Unknown chat"}
									</Text>
									<Text style={styles.resultSubtitle} numberOfLines={1}>
										{filter === "links" ? hit.url : hit.attachment?.name || hit.message.text || filter}
									</Text>
								</View>
							</TouchableOpacity>
						);
					}}
				/>
			)}
		</View>
	);
};

export default SearchScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
	},
	searchBar: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		paddingTop: 56,
		paddingHorizontal: 16,
		paddingBottom: 10,
	},
	inputWrapper: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		backgroundColor: "#F3F6F6",
		borderRadius: 20,
		paddingHorizontal: 14,
		paddingVertical: 8,
	},
	input: {
		flex: 1,
		fontSize: 15,
		color: "#000E08",
	},
	filterRow: {
		paddingVertical: 8,
	},
	filterPill: {
		paddingHorizontal: 14,
		paddingVertical: 6,
		borderRadius: 16,
		backgroundColor: "#F2F8F7",
	},
	filterPillActive: {
		backgroundColor: Colors.focused,
	},
	filterPillText: {
		fontSize: 13,
		color: "#24786D",
		fontWeight: "600",
	},
	filterPillTextActive: {
		color: "#fff",
	},
	sectionLabel: {
		fontSize: 12,
		fontWeight: "700",
		color: "#797C7B",
		textTransform: "uppercase",
		paddingHorizontal: 16,
		paddingTop: 14,
		paddingBottom: 6,
	},
	resultRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		paddingHorizontal: 16,
		paddingVertical: 10,
	},
	resultTitle: {
		fontSize: 15,
		fontWeight: "600",
		color: "#000E08",
	},
	resultSubtitle: {
		fontSize: 13,
		color: "#797C7B",
		marginTop: 2,
	},
	highlight: {
		backgroundColor: "#FFF3B0",
		color: "#000E08",
		fontWeight: "700",
	},
	mediaThumb: {
		width: 44,
		height: 44,
		borderRadius: 8,
		backgroundColor: "#eee",
	},
	mediaIcon: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: "#F2F8F7",
		justifyContent: "center",
		alignItems: "center",
	},
	emptyState: {
		alignItems: "center",
		paddingTop: 80,
		gap: 10,
	},
	emptyStateText: {
		color: "#797C7B",
		fontSize: 13,
	},
});
