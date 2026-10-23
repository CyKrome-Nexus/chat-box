import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";

import SettingsScreenHeader from "@/src/components/settings/SettingsScreenHeader";
import SettingToggleRow from "@/src/components/settings/SettingToggleRow";
import { setAutoDownloadPref } from "@/src/redux/features/settingsSlice";
import { IChatRibbon } from "@/src/interfaces/list-interface";
import { IMessage } from "@/src/interfaces/message-interface";

const formatBytes = (bytes: number) => {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const SettingsStorage = () => {
	const dispatch = useDispatch();
	const autoDownload = useSelector((state: any) => state.settings.autoDownload);
	const chats = useSelector((state: any) => state.chats.chats as IChatRibbon[]);
	const byConversation = useSelector(
		(state: any) => state.messages.byConversation as Record<string, IMessage[]>
	);

	const breakdown = useMemo(() => {
		return Object.entries(byConversation).map(([conversationId, messages]) => {
			const chat = chats.find((c) => c.id === conversationId);
			const bytes = messages.reduce((sum, m) => sum + (m.attachment?.size || 0), 0);
			return {
				conversationId,
				name: chat?.name || conversationId,
				messageCount: messages.length,
				bytes,
			};
		});
	}, [byConversation, chats]);

	const totalBytes = breakdown.reduce((sum, entry) => sum + entry.bytes, 0);

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<SettingsScreenHeader title="Storage and Data" />

			<Text style={styles.sectionTitle}>Network Usage</Text>
			<Text style={styles.note}>
				Media storage used across all chats: {formatBytes(totalBytes)}. This reflects attachments sent/received
				in this app session only — there's no on-device storage scan or a real network-usage API integrated yet.
			</Text>

			<Text style={styles.sectionTitle}>Storage by Chat</Text>
			{breakdown.length === 0 ? (
				<Text style={styles.note}>No chat data yet.</Text>
			) : (
				breakdown.map((entry) => (
					<View key={entry.conversationId} style={styles.chatRow}>
						<Text style={styles.chatName}>{entry.name}</Text>
						<Text style={styles.chatMeta}>
							{entry.messageCount} messages · {formatBytes(entry.bytes)}
						</Text>
					</View>
				))
			)}

			<Text style={styles.sectionTitle}>Auto-Download Media</Text>
			<SettingToggleRow
				label="Photos"
				value={autoDownload.photos}
				onValueChange={(value) => dispatch(setAutoDownloadPref({ key: "photos", value }))}
			/>
			<SettingToggleRow
				label="Videos"
				value={autoDownload.videos}
				onValueChange={(value) => dispatch(setAutoDownloadPref({ key: "videos", value }))}
			/>
			<SettingToggleRow
				label="Documents"
				value={autoDownload.documents}
				onValueChange={(value) => dispatch(setAutoDownloadPref({ key: "documents", value }))}
			/>
		</ScrollView>
	);
};

export default SettingsStorage;

const styles = StyleSheet.create({
	container: {
		flexGrow: 1,
		backgroundColor: "#fff",
		paddingHorizontal: 20,
		paddingBottom: 40,
	},
	sectionTitle: {
		fontSize: 13,
		fontWeight: "700",
		color: "#797C7B",
		textTransform: "uppercase",
		marginTop: 20,
		marginBottom: 4,
	},
	note: {
		color: "#797C7B",
		fontSize: 13,
		lineHeight: 18,
	},
	chatRow: {
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: "#F0F0F0",
	},
	chatName: {
		fontSize: 15,
		fontWeight: "600",
	},
	chatMeta: {
		fontSize: 12,
		color: "#797C7B",
		marginTop: 2,
	},
});
