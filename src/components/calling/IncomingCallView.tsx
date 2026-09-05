import { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View, Vibration } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Avatar from "../images/Avatar";
import { IActiveCall } from "@/src/redux/features/callSlice";

// Long buzz, short pause, repeat — no ringtone asset ships in this repo, so
// vibration stands in for it (see docs/architecture/calling.md).
const RING_PATTERN = [0, 800, 400];

const IncomingCallView = ({
	call,
	onAccept,
	onDecline,
}: {
	call: IActiveCall;
	onAccept: () => void;
	onDecline: () => void;
}) => {
	useEffect(() => {
		Vibration.vibrate(RING_PATTERN, true);
		return () => Vibration.cancel();
	}, []);

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
