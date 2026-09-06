import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useUsernameAvailability } from "@/src/hooks/useUsernameAvailability";
import { claimUsername, releaseUsername } from "@/src/lib/username/usernameRegistry";
import { useAppTheme } from "@/src/lib/theme/ThemeContext";

const STATUS_COPY: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
	checking: { label: "Checking availability…", color: "#797C7B", icon: "time-outline" },
	available: { label: "Available", color: "#1E9E5A", icon: "checkmark-circle" },
	taken: { label: "Already taken", color: "#D63A4C", icon: "close-circle" },
};

/**
 * Settings -> Edit Profile -> Username. Claiming, real-time debounced
 * availability, and releasing — see useUsernameAvailability.ts and
 * usernameRegistry.ts for what's genuinely real vs. simulated here.
 */
const UsernameEditor = ({
	currentHandle,
	userId,
	name,
	avatarUrl,
	onClaimed,
}: {
	currentHandle?: string;
	userId: string;
	name: string;
	avatarUrl?: string;
	onClaimed: (handle: string | null) => void;
}) => {
	const theme = useAppTheme();
	const [draft, setDraft] = useState(currentHandle || "");
	const [saving, setSaving] = useState(false);
	const { state, reason } = useUsernameAvailability(draft, userId);

	const isUnchanged = draft.trim() === (currentHandle || "").trim() && draft.trim().length > 0;
	const canSave = !isUnchanged && state === "available" && !saving;

	const handleSave = async () => {
		setSaving(true);
		try {
			const claimed = await claimUsername(draft, userId, name, avatarUrl);
			onClaimed(claimed);
			Alert.alert("Username updated", `You're now @${claimed}`);
		} catch (error) {
			Alert.alert("Couldn't claim username", error instanceof Error ? error.message : "Try a different one.");
		} finally {
			setSaving(false);
		}
	};

	const handleRelease = () => {
		Alert.alert("Remove username", "People will only be able to find you by phone number after this.", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Remove",
				style: "destructive",
				onPress: async () => {
					await releaseUsername(userId);
					setDraft("");
					onClaimed(null);
				},
			},
		]);
	};

	const status = state === "idle" || state === "invalid" ? undefined : STATUS_COPY[state];

	return (
		<View>
			<View style={styles.inputRow}>
				<Text style={[styles.atSign, { color: theme.accent }]}>@</Text>
				<TextInput
					style={styles.input}
					value={draft}
					onChangeText={(text) => setDraft(text.replace(/\s/g, ""))}
					placeholder="username"
					placeholderTextColor="#797C7B"
					autoCapitalize="none"
					autoCorrect={false}
					maxLength={32}
				/>
				{state === "checking" && <ActivityIndicator size="small" color="#797C7B" />}
			</View>

			{state === "invalid" && !!reason && <Text style={styles.errorText}>{reason}</Text>}
			{status && (
				<View style={styles.statusRow}>
					<Ionicons name={status.icon} size={14} color={status.color} />
					<Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
				</View>
			)}

			<View style={styles.actionsRow}>
				<TouchableOpacity
					style={[styles.saveButton, { backgroundColor: canSave ? theme.accent : "#CDD1D0" }]}
					onPress={handleSave}
					disabled={!canSave}
				>
					<Text style={styles.saveButtonText}>{currentHandle ? "Update Username" : "Claim Username"}</Text>
				</TouchableOpacity>
				{!!currentHandle && (
					<TouchableOpacity style={styles.releaseButton} onPress={handleRelease}>
						<Text style={styles.releaseButtonText}>Remove</Text>
					</TouchableOpacity>
				)}
			</View>
		</View>
	);
};

export default UsernameEditor;

const styles = StyleSheet.create({
	inputRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		borderWidth: 1,
		borderColor: "#CDD1D0",
		borderRadius: 12,
		paddingHorizontal: 14,
		paddingVertical: 10,
	},
	atSign: {
		fontSize: 16,
		fontWeight: "700",
	},
	input: {
		flex: 1,
		fontSize: 16,
		color: "#000E08",
	},
	errorText: {
		marginTop: 6,
		fontSize: 12,
		color: "#D63A4C",
	},
	statusRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		marginTop: 6,
	},
	statusText: {
		fontSize: 12,
		fontWeight: "600",
	},
	actionsRow: {
		flexDirection: "row",
		gap: 10,
		marginTop: 12,
	},
	saveButton: {
		flex: 1,
		borderRadius: 12,
		paddingVertical: 12,
		alignItems: "center",
	},
	saveButtonText: {
		color: "#fff",
		fontWeight: "700",
		fontSize: 14,
	},
	releaseButton: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#D63A4C",
	},
	releaseButtonText: {
		color: "#D63A4C",
		fontWeight: "700",
		fontSize: 14,
	},
});
