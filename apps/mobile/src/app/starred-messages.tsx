import { useMemo } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import { IMessage } from "@/src/interfaces/message-interface";
import { IChatRibbon } from "@/src/interfaces/list-interface";
import Colors from "@/src/constants/Colors";

interface IStarredEntry {
	message: IMessage;
	chat?: IChatRibbon;
}

/** Settings > Chat > Starred Messages — every starred message across every conversation. */
const StarredMessagesScreen = () => {
	const byConversation = useSelector(
		(state: any) => state.messages.byConversation as Record<string, IMessage[]>
	);
	const chats = useSelector((state: any) => state.chats.chats as IChatRibbon[]);

	const starred: IStarredEntry[] = useMemo(() => {
		const entries: IStarredEntry[] = [];
		for (const messages of Object.values(byConversation)) {
			for (const message of messages) {
				if (message.starred) {
					entries.push({ message, chat: chats.find((c) => c.id === message.conversationId) });
				}
			}
		}
		return entries.sort((a, b) => b.message.timestamp - a.message.timestamp);
	}, [byConversation, chats]);

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name="chevron-back" size={24} color="#000E08" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Starred Messages</Text>
				<View style={{ width: 24 }} />
			</View>

			<FlatList
				data={starred}
				keyExtractor={(item) => item.message.id}
				contentContainerStyle={styles.listContent}
				ListEmptyComponent={
					<View style={styles.emptyState}>
						<Ionicons name="star-outline" size={40} color="#ccc" />
						<Text style={styles.emptyStateText}>No starred messages yet</Text>
					</View>
				}
				renderItem={({ item }) => (
					<TouchableOpacity
						style={styles.row}
						onPress={() =>
							item.chat &&
							router.push({ pathname: "/messages/Chat", params: { user: JSON.stringify(item.chat) } })
						}
					>
						<Text style={styles.rowChatName}>{item.chat?.name || "Unknown chat"}</Text>
						<Text style={styles.rowText} numberOfLines={2}>
							{item.message.attachment ? `[${item.message.attachment.type}] ${item.message.text}` : item.message.text}
						</Text>
						<Text style={styles.rowTime}>{new Date(item.message.timestamp).toLocaleString()}</Text>
					</TouchableOpacity>
				)}
			/>
		</View>
	);
};

export default StarredMessagesScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingTop: 56,
		paddingHorizontal: 16,
		paddingBottom: 12,
	},
	headerTitle: {
		fontSize: 16,
		fontWeight: "700",
		color: "#000E08",
	},
	listContent: {
		padding: 16,
	},
	row: {
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#f2f2f2",
	},
	rowChatName: {
		fontSize: 13,
		fontWeight: "700",
		color: Colors.focused,
	},
	rowText: {
		fontSize: 14,
		color: "#000E08",
		marginTop: 2,
	},
	rowTime: {
		fontSize: 11,
		color: "#797C7B",
		marginTop: 4,
	},
	emptyState: {
		alignItems: "center",
		paddingTop: 80,
		gap: 8,
	},
	emptyStateText: {
		color: "#797C7B",
	},
});
