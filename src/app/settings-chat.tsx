import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import SettingsScreenHeader from "@/src/components/settings/SettingsScreenHeader";
import SettingToggleRow from "@/src/components/settings/SettingToggleRow";
import Colors from "@/src/constants/Colors";
import { setLastBackupAt, setTheme, setUnarchiveOnNewMessage, TTheme } from "@/src/redux/features/settingsSlice";
import { clearAllMessages } from "@/src/redux/features/messagesSlice";

const THEME_OPTIONS: { key: TTheme; label: string }[] = [
	{ key: "system", label: "System" },
	{ key: "light", label: "Light" },
	{ key: "dark", label: "Dark" },
];

const SettingsChat = () => {
	const dispatch = useDispatch();
	const theme = useSelector((state: any) => state.settings.theme as TTheme);
	const lastBackupAt = useSelector((state: any) => state.settings.lastBackupAt as number | null);
	const unarchiveOnNewMessage = useSelector((state: any) => state.settings.chat.unarchiveOnNewMessage as boolean);

	const handleClearAllChats = () => {
		Alert.alert("Clear all chats", "This deletes every message in every conversation. This can't be undone.", [
			{ text: "Cancel", style: "cancel" },
			{ text: "Clear", style: "destructive", onPress: () => dispatch(clearAllMessages()) },
		]);
	};

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<SettingsScreenHeader title="Chat" />

			<TouchableOpacity style={styles.starredRow} onPress={() => router.push("/starred-messages")}>
				<Ionicons name="star" size={20} color={Colors.focused} />
				<Text style={styles.starredRowLabel}>Starred Messages</Text>
				<Ionicons name="chevron-forward" size={18} color="#797C7B" />
			</TouchableOpacity>

			<Text style={styles.sectionTitle}>Theme</Text>
			<View style={styles.themeRow}>
				{THEME_OPTIONS.map((option) => (
					<TouchableOpacity
						key={option.key}
						style={[styles.themeOption, theme === option.key && styles.themeOptionActive]}
						onPress={() => dispatch(setTheme(option.key))}
					>
						<Text style={[styles.themeOptionText, theme === option.key && styles.themeOptionTextActive]}>
							{option.label}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			<Text style={styles.sectionTitle}>Archiving</Text>
			<SettingToggleRow
				label="Unarchive on New Message"
				description="Move an archived chat back to your inbox when it gets a new message"
				value={unarchiveOnNewMessage}
				onValueChange={(value) => dispatch(setUnarchiveOnNewMessage(value))}
			/>

			<Text style={styles.sectionTitle}>Wallpaper</Text>
			<Text style={styles.note}>
				Chat wallpaper customization is coming soon — the default theme background is used everywhere for now.
			</Text>

			<Text style={styles.sectionTitle}>Backup</Text>
			<Text style={styles.note}>
				{lastBackupAt
					? `Last backed up ${new Date(lastBackupAt).toLocaleString()}`
					: "You haven't backed up your chats yet."}
			</Text>
			<TouchableOpacity style={styles.primaryButton} onPress={() => dispatch(setLastBackupAt(Date.now()))}>
				<Text style={styles.primaryButtonText}>Back Up Now</Text>
			</TouchableOpacity>

			<Text style={styles.sectionTitle}>Danger Zone</Text>
			<TouchableOpacity style={styles.dangerButton} onPress={handleClearAllChats}>
				<Text style={styles.dangerButtonText}>Clear All Chats</Text>
			</TouchableOpacity>
		</ScrollView>
	);
};

export default SettingsChat;

const styles = StyleSheet.create({
	container: {
		flexGrow: 1,
		backgroundColor: "#fff",
		paddingHorizontal: 20,
		paddingBottom: 40,
	},
	starredRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#f2f2f2",
	},
	starredRowLabel: {
		flex: 1,
		fontSize: 15,
		color: "#000E08",
	},
	sectionTitle: {
		fontSize: 13,
		fontWeight: "700",
		color: "#797C7B",
		textTransform: "uppercase",
		marginTop: 20,
		marginBottom: 8,
	},
	themeRow: {
		flexDirection: "row",
		gap: 10,
	},
	themeOption: {
		flex: 1,
		paddingVertical: 12,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: "#CDD1D0",
		alignItems: "center",
	},
	themeOptionActive: {
		backgroundColor: Colors.focused,
		borderColor: Colors.focused,
	},
	themeOptionText: {
		fontWeight: "600",
		color: "#333",
	},
	themeOptionTextActive: {
		color: "#fff",
	},
	note: {
		color: "#797C7B",
		fontSize: 13,
		lineHeight: 18,
	},
	primaryButton: {
		backgroundColor: Colors.focused,
		borderRadius: 14,
		paddingVertical: 14,
		alignItems: "center",
		marginTop: 12,
	},
	primaryButtonText: {
		color: "#fff",
		fontWeight: "700",
		fontSize: 15,
	},
	dangerButton: {
		backgroundColor: "#F04A4C",
		borderRadius: 14,
		paddingVertical: 14,
		alignItems: "center",
	},
	dangerButtonText: {
		color: "#fff",
		fontWeight: "700",
		fontSize: 15,
	},
});
