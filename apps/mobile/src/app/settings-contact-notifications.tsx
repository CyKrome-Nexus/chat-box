import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";

import SettingsScreenHeader from "@/src/components/settings/SettingsScreenHeader";
import { useAppTheme } from "@/src/lib/theme/ThemeContext";
import { CALL_RINGTONES, MESSAGE_TONES, previewTone } from "@/src/lib/audio/notificationTones";
import {
	clearCustomNotificationConfig,
	ICustomNotificationConfig,
	setCustomNotificationConfig,
	TVibrationPattern,
} from "@/src/redux/features/settingsSlice";

const VIBRATION_OPTIONS: { key: TVibrationPattern; label: string }[] = [
	{ key: "default", label: "Default" },
	{ key: "short", label: "Short" },
	{ key: "long", label: "Long" },
	{ key: "off", label: "Off" },
];

const DEFAULT_CONFIG: ICustomNotificationConfig = { vibrationPattern: "default" };

/** Reached from Contact Info -> "Custom Notifications". Assigns a per-chat
 * message tone, call ringtone, and vibration pattern — see
 * docs/architecture/sound-haptics.md. */
const CustomNotificationsScreen = () => {
	const dispatch = useDispatch();
	const theme = useAppTheme();
	const params = useLocalSearchParams<{ conversationId: string; name?: string }>();
	const conversationId = params.conversationId;

	const config: ICustomNotificationConfig = useSelector(
		(state: any) => state.settings.customNotifications[conversationId] || DEFAULT_CONFIG
	);

	const save = (patch: Partial<ICustomNotificationConfig>) => {
		dispatch(setCustomNotificationConfig({ conversationId, config: { ...config, ...patch } }));
	};

	const handlePickCustomTone = async (kind: "messageTone" | "callRingtone") => {
		const result = await DocumentPicker.getDocumentAsync({ type: "audio/*", copyToCacheDirectory: true });
		if (result.canceled || !result.assets?.[0]) return;
		save({ [kind]: result.assets[0].uri });
	};

	const renderToneSection = (
		title: string,
		kind: "messageTone" | "callRingtone",
		library: typeof MESSAGE_TONES
	) => {
		const activeValue = config[kind] || "default";
		const isCustom = !library.some((tone) => tone.key === activeValue);

		return (
			<>
				<Text style={styles.sectionTitle}>{title}</Text>
				<View style={styles.toneList}>
					{library.map((tone) => (
						<TouchableOpacity
							key={tone.key}
							style={styles.toneRow}
							onPress={() => save({ [kind]: tone.key })}
						>
							<Ionicons
								name={activeValue === tone.key ? "radio-button-on" : "radio-button-off"}
								size={20}
								color={activeValue === tone.key ? theme.accent : "#CDD1D0"}
							/>
							<Text style={styles.toneLabel}>{tone.label}</Text>
							<TouchableOpacity onPress={() => previewTone(tone.key, library)} hitSlop={8}>
								<Ionicons name="play-circle-outline" size={22} color="#797C7B" />
							</TouchableOpacity>
						</TouchableOpacity>
					))}
					{isCustom && (
						<View style={styles.toneRow}>
							<Ionicons name="radio-button-on" size={20} color={theme.accent} />
							<Text style={styles.toneLabel} numberOfLines={1}>
								Custom file
							</Text>
							<TouchableOpacity onPress={() => previewTone(activeValue, library)} hitSlop={8}>
								<Ionicons name="play-circle-outline" size={22} color="#797C7B" />
							</TouchableOpacity>
						</View>
					)}
					<TouchableOpacity style={styles.pickFileRow} onPress={() => handlePickCustomTone(kind)}>
						<Ionicons name="folder-open-outline" size={18} color={theme.accent} />
						<Text style={[styles.pickFileText, { color: theme.accent }]}>Choose from device…</Text>
					</TouchableOpacity>
				</View>
			</>
		);
	};

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<SettingsScreenHeader title={`Custom Notifications — ${params.name || "Chat"}`} />

			{renderToneSection("Message Tone", "messageTone", MESSAGE_TONES)}
			{renderToneSection("Call Ringtone", "callRingtone", CALL_RINGTONES)}

			<Text style={styles.sectionTitle}>Vibration</Text>
			<View style={styles.vibrationRow}>
				{VIBRATION_OPTIONS.map((option) => (
					<TouchableOpacity
						key={option.key}
						style={[styles.vibrationChip, config.vibrationPattern === option.key && { backgroundColor: theme.accent }]}
						onPress={() => {
							if (option.key !== "off") {
								Haptics.impactAsync(
									option.key === "long" ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light
								);
							}
							save({ vibrationPattern: option.key });
						}}
					>
						<Text
							style={[
								styles.vibrationChipText,
								config.vibrationPattern === option.key && styles.vibrationChipTextActive,
							]}
						>
							{option.label}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			<TouchableOpacity
				style={styles.resetRow}
				onPress={() => dispatch(clearCustomNotificationConfig(conversationId))}
			>
				<Ionicons name="refresh" size={16} color="#D63A4C" />
				<Text style={styles.resetText}>Reset to app defaults</Text>
			</TouchableOpacity>
		</ScrollView>
	);
};

export default CustomNotificationsScreen;

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
		marginBottom: 8,
	},
	toneList: {
		gap: 2,
	},
	toneRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: "#F0F0F0",
	},
	toneLabel: {
		flex: 1,
		fontSize: 15,
		color: "#000E08",
	},
	pickFileRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingVertical: 12,
	},
	pickFileText: {
		fontSize: 14,
		fontWeight: "600",
	},
	vibrationRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	vibrationChip: {
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 14,
		backgroundColor: "#F2F8F7",
	},
	vibrationChipText: {
		fontSize: 13,
		fontWeight: "600",
		color: "#24786D",
	},
	vibrationChipTextActive: {
		color: "#fff",
	},
	resetRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		marginTop: 28,
	},
	resetText: {
		fontSize: 13,
		fontWeight: "600",
		color: "#D63A4C",
	},
});
