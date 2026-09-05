import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import Avatar from "../images/Avatar";
import CallControlButton from "./CallControlButton";
import CallTimer from "./CallTimer";
import { IActiveCall } from "@/src/redux/features/callSlice";

const ActiveCallView = ({ call, onHangUp }: { call: IActiveCall; onHangUp: () => void }) => {
	const [muted, setMuted] = useState(false);
	const [speakerOn, setSpeakerOn] = useState(call.type === "video");
	const [frontCamera, setFrontCamera] = useState(true);

	const isVideo = call.type === "video";

	return (
		<View style={[styles.container, isVideo && styles.videoContainer]}>
			{isVideo && (
				<View style={styles.selfViewPlaceholder}>
					<Text style={styles.selfViewLabel}>You</Text>
				</View>
			)}

			<View style={styles.info}>
				<Avatar data={call.contactAvatar} size={isVideo ? 100 : 140} />
				<Text style={styles.name}>{call.contactName}</Text>
				{call.connectedAt && <CallTimer connectedAt={call.connectedAt} />}
			</View>

			<View style={styles.controlsRow}>
				<CallControlButton
					icon={muted ? "mic-off" : "mic"}
					label="Mute"
					active={muted}
					onPress={() => setMuted((prev) => !prev)}
				/>
				<CallControlButton
					icon={speakerOn ? "volume-high" : "volume-mute"}
					label="Speaker"
					active={speakerOn}
					onPress={() => setSpeakerOn((prev) => !prev)}
				/>
				{isVideo && (
					<CallControlButton
						icon="camera-reverse"
						label="Flip"
						onPress={() => setFrontCamera((prev) => !prev)}
					/>
				)}
				<CallControlButton icon="call" label="End" danger rotate135 onPress={onHangUp} />
			</View>
		</View>
	);
};

export default ActiveCallView;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#0B1F1B",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: 80,
	},
	videoContainer: {
		backgroundColor: "#000",
	},
	selfViewPlaceholder: {
		position: "absolute",
		top: 60,
		right: 20,
		width: 90,
		height: 130,
		borderRadius: 14,
		backgroundColor: "rgba(255,255,255,0.12)",
		justifyContent: "center",
		alignItems: "center",
	},
	selfViewLabel: {
		color: "rgba(255,255,255,0.7)",
		fontSize: 12,
	},
	info: {
		alignItems: "center",
		gap: 10,
		marginTop: 60,
	},
	name: {
		color: "#fff",
		fontSize: 24,
		fontWeight: "700",
	},
	controlsRow: {
		flexDirection: "row",
		gap: 20,
	},
});
