import { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View, Vibration } from "react-native";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { createAudioPlayer } from "expo-audio";

import Avatar from "../images/Avatar";
import { IActiveCall } from "@/src/redux/features/callSlice";
import { ICustomNotificationConfig, TVibrationPattern } from "@/src/redux/features/settingsSlice";
import { CALL_RINGTONES } from "@/src/lib/audio/notificationTones";

// Long buzz, short pause, repeat — the "Default" vibration pattern, and the
// fallback when no ringtone asset can be resolved.
const VIBRATION_PATTERNS: Record<TVibrationPattern, number[]> = {
	default: [0, 800, 400],
	short: [0, 250, 200],
	long: [0, 1600, 400],
	off: [],
};

const IncomingCallView = ({
	call,
	onAccept,
	onDecline,
}: {
	call: IActiveCall;
	onAccept: () => void;
	onDecline: () => void;
}) => {
	// Calling's signaling layer keys conversations by contact name (see
	// callEngineManager.ts), so per-contact overrides are looked up the
	// same way here.
	const customConfig: ICustomNotificationConfig | undefined = useSelector(
		(state: any) => state.settings.customNotifications[call.contactName]
	);
	const inAppSoundsEnabled = useSelector((state: any) => state.settings.notifications.inAppSounds as boolean);
	const vibrationPattern = customConfig?.vibrationPattern || "default";

	useEffect(() => {
		if (vibrationPattern !== "off") {
			Vibration.vibrate(VIBRATION_PATTERNS[vibrationPattern], true);
		}
		return () => Vibration.cancel();
	}, [vibrationPattern]);

	useEffect(() => {
		if (!inAppSoundsEnabled) return;

		const ringtoneKey = customConfig?.callRingtone || "default";
		const bundled = CALL_RINGTONES.find((tone) => tone.key === ringtoneKey);
		const player = createAudioPlayer(bundled ? bundled.source : { uri: ringtoneKey });
		player.loop = true;
		player.play();
		return () => player.pause();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [customConfig?.callRingtone, inAppSoundsEnabled]);

	return (
		<View style={styles.container}>
			<View style={styles.info}>
				<Avatar data={call.contactAvatar} size={140} />
				<Text style={styles.name}>{call.contactName}</Text>
				<Text style={styles.status}>
					Incoming {call.type === "video" ? "video" : "audio"} call…
				</Text>
			</View>

			<View style={styles.actionsRow}>
				<TouchableOpacity style={[styles.actionButton, styles.decline]} onPress={onDecline}>
					<Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
				</TouchableOpacity>
				<TouchableOpacity style={[styles.actionButton, styles.accept]} onPress={onAccept}>
					<Ionicons name="call" size={28} color="#fff" />
				</TouchableOpacity>
			</View>
		</View>
	);
};

export default IncomingCallView;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#0B1F1B",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: 80,
	},
	info: {
		alignItems: "center",
		gap: 12,
		marginTop: 60,
	},
	name: {
		color: "#fff",
		fontSize: 26,
		fontWeight: "700",
	},
	status: {
		color: "rgba(255,255,255,0.7)",
		fontSize: 16,
	},
	actionsRow: {
		flexDirection: "row",
		gap: 60,
	},
	actionButton: {
		width: 68,
		height: 68,
		borderRadius: 34,
		justifyContent: "center",
		alignItems: "center",
	},
	decline: {
		backgroundColor: "#F04A4C",
	},
	accept: {
		backgroundColor: "#11BC6B",
	},
});
