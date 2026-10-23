import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";

import SettingsScreenHeader from "@/src/components/settings/SettingsScreenHeader";
import SettingToggleRow from "@/src/components/settings/SettingToggleRow";
import PassphraseModal from "@/src/components/settings/PassphraseModal";
import AccentColorPicker from "@/src/components/settings/AccentColorPicker";
import Colors from "@/src/constants/Colors";
import { setAccentColor, setLastBackupAt, setTheme, setUnarchiveOnNewMessage, TTheme } from "@/src/redux/features/settingsSlice";
import { clearAllMessages, hydrateMessages } from "@/src/redux/features/messagesSlice";
import { hydrateChats } from "@/src/redux/features/chatsSlice";
import { hydrateManualContacts } from "@/src/redux/features/contactsSlice";
import { hydrateCallHistory } from "@/src/redux/features/callSlice";
import { createEncryptedBackup, persistRestoredBackup, restoreEncryptedBackup } from "@/src/lib/backup/encryptedBackup";
import { useAppTheme } from "@/src/lib/theme/ThemeContext";

const THEME_OPTIONS: { key: TTheme; label: string }[] = [
	{ key: "system", label: "System" },
	{ key: "light", label: "Light" },
	{ key: "dark", label: "Dark" },
	{ key: "oledBlack", label: "OLED Black" },
	{ key: "sepia", label: "Sepia" },
];

const SettingsChat = () => {
	const dispatch = useDispatch();
	const appTheme = useAppTheme();
	const theme = useSelector((state: any) => state.settings.theme as TTheme);
	const accentColor = useSelector((state: any) => state.settings.appearance.accentColor as string);
	const lastBackupAt = useSelector((state: any) => state.settings.lastBackupAt as number | null);
	const unarchiveOnNewMessage = useSelector((state: any) => state.settings.chat.unarchiveOnNewMessage as boolean);
	const [backupModal, setBackupModal] = useState(false);
	const [restoreModal, setRestoreModal] = useState(false);
	const [pendingRestoreUri, setPendingRestoreUri] = useState<string | null>(null);
	const [isWorking, setIsWorking] = useState(false);

	const handleCreateBackup = async (passphrase: string) => {
		setBackupModal(false);
		setIsWorking(true);
		try {
			const fileUri = await createEncryptedBackup(passphrase);
			dispatch(setLastBackupAt(Date.now()));
			if (await Sharing.isAvailableAsync()) {
				await Sharing.shareAsync(fileUri, { mimeType: "application/octet-stream" });
			} else {
				Alert.alert("Backup created", `Saved to ${fileUri}`);
			}
		} catch {
			Alert.alert("Backup failed", "Something went wrong while creating the backup.");
		} finally {
			setIsWorking(false);
		}
	};

	const handlePickRestoreFile = async () => {
		const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
		if (result.canceled || !result.assets?.[0]) return;
		setPendingRestoreUri(result.assets[0].uri);
		setRestoreModal(true);
	};

	const handleRestoreBackup = async (passphrase: string) => {
		setRestoreModal(false);
		if (!pendingRestoreUri) return;
		setIsWorking(true);
		try {
			const restored = await restoreEncryptedBackup(pendingRestoreUri, passphrase);
			dispatch(hydrateChats(restored.conversations));
			dispatch(hydrateMessages(restored.messagesByConversation));
			dispatch(hydrateManualContacts(restored.manualContacts));
			await persistRestoredBackup(restored);
			Alert.alert("Restored", "Your chats have been restored from the backup.");
		} catch {
			Alert.alert("Restore failed", "Wrong passphrase, or this file isn't a valid Chatbox backup.");
		} finally {
			setIsWorking(false);
			setPendingRestoreUri(null);
		}
	};

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
						style={[
							styles.themeOption,
							theme === option.key && { backgroundColor: appTheme.accent, borderColor: appTheme.accent },
						]}
						onPress={() => dispatch(setTheme(option.key))}
					>
						<Text style={[styles.themeOptionText, theme === option.key && styles.themeOptionTextActive]}>
							{option.label}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			<Text style={styles.sectionTitle}>Accent Color</Text>
			<AccentColorPicker value={accentColor} onChange={(hex) => dispatch(setAccentColor(hex))} />

			<Text style={styles.sectionTitle}>Appearance</Text>
			<TouchableOpacity style={styles.starredRow} onPress={() => router.push("/settings-display")}>
				<Ionicons name="text" size={20} color={appTheme.accent} />
				<Text style={styles.starredRowLabel}>Text & Display Size</Text>
				<Ionicons name="chevron-forward" size={18} color="#797C7B" />
			</TouchableOpacity>
			<TouchableOpacity style={styles.starredRow} onPress={() => router.push("/settings-wallpaper")}>
				<Ionicons name="image" size={20} color={appTheme.accent} />
				<Text style={styles.starredRowLabel}>Chat Wallpaper</Text>
				<Ionicons name="chevron-forward" size={18} color="#797C7B" />
			</TouchableOpacity>

			<Text style={styles.sectionTitle}>Archiving</Text>
			<SettingToggleRow
				label="Unarchive on New Message"
				description="Move an archived chat back to your inbox when it gets a new message"
				value={unarchiveOnNewMessage}
				onValueChange={(value) => dispatch(setUnarchiveOnNewMessage(value))}
			/>

			<Text style={styles.sectionTitle}>Backup</Text>
			<Text style={styles.note}>
				{lastBackupAt
					? `Last backed up ${new Date(lastBackupAt).toLocaleString()}`
					: "You haven't backed up your chats yet."}{" "}
				Backups are encrypted end-to-end with a passphrase only you know — see Encryption docs.
			</Text>
			<TouchableOpacity
				style={[styles.primaryButton, { backgroundColor: appTheme.accent }]}
				onPress={() => setBackupModal(true)}
				disabled={isWorking}
			>
				<Text style={styles.primaryButtonText}>Create Encrypted Backup</Text>
			</TouchableOpacity>
			<TouchableOpacity
				style={[styles.secondaryButton, { borderColor: appTheme.accent }]}
				onPress={handlePickRestoreFile}
				disabled={isWorking}
			>
				<Text style={[styles.secondaryButtonText, { color: appTheme.accent }]}>Restore from Backup</Text>
			</TouchableOpacity>

			<Text style={styles.sectionTitle}>Danger Zone</Text>
			<TouchableOpacity style={styles.dangerButton} onPress={handleClearAllChats}>
				<Text style={styles.dangerButtonText}>Clear All Chats</Text>
			</TouchableOpacity>

			<PassphraseModal
				visible={backupModal}
				title="Set a Backup Passphrase"
				confirmLabel="Create Backup"
				requireConfirmation
				onCancel={() => setBackupModal(false)}
				onSubmit={handleCreateBackup}
			/>
			<PassphraseModal
				visible={restoreModal}
				title="Enter Backup Passphrase"
				confirmLabel="Restore"
				onCancel={() => {
					setRestoreModal(false);
					setPendingRestoreUri(null);
				}}
				onSubmit={handleRestoreBackup}
			/>
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
		flexWrap: "wrap",
		gap: 10,
	},
	themeOption: {
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: "#CDD1D0",
		alignItems: "center",
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
	secondaryButton: {
		borderWidth: 1,
		borderColor: Colors.focused,
		borderRadius: 14,
		paddingVertical: 14,
		alignItems: "center",
		marginTop: 10,
	},
	secondaryButtonText: {
		color: Colors.focused,
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
