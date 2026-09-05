import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import Avatar from "../images/Avatar";
import CallControlButton from "./CallControlButton";
import { IActiveCall } from "@/src/redux/features/callSlice";

const OutgoingCallView = ({ call, onHangUp }: { call: IActiveCall; onHangUp: () => void }) => {
	const [speakerOn, setSpeakerOn] = useState(false);

	return (
		<View style={styles.container}>
			<View style={styles.info}>
				<Avatar data={call.contactAvatar} size={140} />
				<Text style={styles.name}>{call.contactName}</Text>
				<Text style={styles.status}>
					{call.type === "video" ? "Video calling…" : "Calling…"}
				</Text>
			</View>

			<View style={styles.controlsRow}>
				<CallControlButton
					icon={speakerOn ? "volume-high" : "volume-mute"}
					label="Speaker"
					active={speakerOn}
					onPress={() => setSpeakerOn((prev) => !prev)}
				/>
				<CallControlButton icon="call" label="End" danger rotate135 onPress={onHangUp} />
			</View>
		</View>
	);
};

export default OutgoingCallView;

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
	controlsRow: {
		flexDirection: "row",
		gap: 30,
	},
});
