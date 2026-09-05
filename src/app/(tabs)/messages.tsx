import { useMemo, useState } from "react";
import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { FlatList } from "react-native-gesture-handler";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import ListDrawer from "@/src/components/ListDrawer";
import ChatRibbon from "@/src/components/riboons/ChatRibbon";
import StoriesCarousel from "@/src/components/stories/StoriesCarousel";
import MasterDetailLayout from "@/src/components/layout/MasterDetailLayout";
import { IChatRibbon } from "@/src/interfaces/list-interface";
import Colors from "@/src/constants/Colors";
import { useResponsiveLayout } from "@/src/lib/display/useResponsiveLayout";

type TFilter = "all" | "unread" | "groups";
const FILTERS: { key: TFilter; label: string }[] = [
	{ key: "all", label: "All" },
	{ key: "unread", label: "Unread" },
	{ key: "groups", label: "Groups" },
];

/** Pinned first, then chats with an unsent draft, preserving order otherwise. */
const sortChats = (chats: IChatRibbon[]) =>
	[...chats].sort((a, b) => {
		if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
		if (!!a.draft !== !!b.draft) return a.draft ? -1 : 1;
		return 0;
	});

const Messages = () => {
	const chats = useSelector((state: any) => state.chats.chats as IChatRibbon[]);
	const [filter, setFilter] = useState<TFilter>("all");
	const [showArchived, setShowArchived] = useState(false);
	const { isTablet } = useResponsiveLayout();
	const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
	const selectedChat = useMemo(() => chats.find((c) => c.id === selectedChatId) || null, [chats, selectedChatId]);

	const archivedChats = useMemo(() => chats.filter((c) => c.archived), [chats]);
	const archivedUnreadCount = useMemo(
		() => archivedChats.reduce((sum, c) => sum + (c.notificationCount || 0), 0),
		[archivedChats]
	);

	const visibleChats = useMemo(() => {
		const notArchived = chats.filter((c) => !c.archived);
		const filtered =
			filter === "unread"
				? notArchived.filter((c) => (c.notificationCount || 0) > 0)
				: filter === "groups"
					? notArchived.filter((c) => c.isGroup)
					: notArchived;
		return sortChats(filtered);
	}, [chats, filter]);

	const listPane = (
		<View style={styles.container}>
			<ListDrawer>
				<FlatList
					data={showArchived ? sortChats(archivedChats).concat(visibleChats) : visibleChats}
					scrollEnabled
					keyExtractor={(item) => item.id}
					renderItem={({ item }) => (
						<ChatRibbon content={item} onSelect={isTablet ? (content) => setSelectedChatId(content.id) : undefined} />
					)}
					contentContainerStyle={{ paddingBottom: 180 }}
					ListHeaderComponent={
						<View>
							<StoriesCarousel />
							<View style={styles.filterRow}>
								{FILTERS.map((f) => (
									<TouchableOpacity
										key={f.key}
										style={[styles.filterPill, filter === f.key && styles.filterPillActive]}
										onPress={() => setFilter(f.key)}
									>
										<Text style={[styles.filterPillText, filter === f.key && styles.filterPillTextActive]}>
											{f.label}
										</Text>
									</TouchableOpacity>
								))}
							</View>

							{archivedChats.length > 0 && (
								<TouchableOpacity style={styles.archivedHeader} onPress={() => setShowArchived((prev) => !prev)}>
									<Ionicons name="archive-outline" size={18} color="#797C7B" />
									<Text style={styles.archivedHeaderLabel}>Archived Chats ({archivedChats.length})</Text>
									{archivedUnreadCount > 0 && (
										<View style={styles.archivedUnreadBadge}>
											<Text style={styles.archivedUnreadBadgeText}>{archivedUnreadCount}</Text>
										</View>
									)}
									<Ionicons name={showArchived ? "chevron-up" : "chevron-down"} size={16} color="#797C7B" />
								</TouchableOpacity>
							)}
						</View>
					}
					ListFooterComponent={() => (
						<View style={styles.chatListFooterContainer}>
							<Text style={styles.chatListFooterText}>
								{chats?.length
									? "- - - - > > End of chats < < - - - - - ."
									: "You have No Chats"}
							</Text>
						</View>
					)}
				/>
			</ListDrawer>
		</View>
	);

	if (isTablet) {
		return <MasterDetailLayout listPane={listPane} selectedChat={selectedChat} />;
	}

	return listPane;
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: "black",
		flex: 1,
		flexDirection: "column-reverse",
		height: "100%",
	},
	name: { fontWeight: "bold" },
	statusesContainer: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		backgroundColor: "white",
		paddingVertical: 10,
	},
	filterRow: {
		flexDirection: "row",
		gap: 8,
		paddingVertical: 10,
	},
	filterPill: {
		paddingHorizontal: 16,
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
	archivedHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#f2f2f2",
		marginBottom: 4,
	},
	archivedHeaderLabel: {
		flex: 1,
		fontSize: 14,
		fontWeight: "600",
		color: "#000E08",
	},
	archivedUnreadBadge: {
		backgroundColor: "#F04A4C",
		borderRadius: 10,
		minWidth: 20,
		paddingHorizontal: 5,
		height: 20,
		justifyContent: "center",
		alignItems: "center",
	},
	archivedUnreadBadgeText: {
		color: "#fff",
		fontSize: 11,
		fontWeight: "700",
	},
	chatListFooterContainer: {
		padding: 20,
		justifyContent: "center",
		alignItems: "center",
	},
	chatListFooterText: {
		color: "#797C7B",
	},
});

export default Messages;
