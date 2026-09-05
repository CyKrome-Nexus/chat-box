import { StyleSheet, Text, View } from "react-native";
import { RTCView } from "react-native-webrtc";

import Colors from "@/src/constants/Colors";
import Avatar from "../images/Avatar";
import { IAvatar } from "@/src/interfaces/list-interface";

export interface IGridParticipant {
	id: string;
	name: string;
	avatar?: IAvatar;
	streamUrl?: string;
	isSpeaking?: boolean;
	isMuted?: boolean;
}

/**
 * Dynamic N-up grid (up to 8, per the ticket) for multi-party video. There
 * is no SFU/multi-party signaling backend in this repo (see
 * docs/architecture/video-calling.md), so today this only ever renders one
 * or two tiles in practice — it's built to take an arbitrary participant
 * array so wiring in a real SFU later is a data-plumbing change, not a UI
 * rewrite.
 */
const ParticipantGrid = ({ participants }: { participants: IGridParticipant[] }) => {
	const columns = participants.length <= 1 ? 1 : participants.length <= 4 ? 2 : 3;

	return (
		<View style={styles.grid}>
			{participants.map((participant) => (
				<View
					key={participant.id}
					style={[
						styles.tile,
						{ width: `${100 / columns}%` },
						participant.isSpeaking && styles.tileSpeaking,
					]}
				>
					{participant.streamUrl ? (
						<RTCView streamURL={participant.streamUrl} style={styles.video} objectFit="cover" />
					) : (
						<View style={styles.avatarWrapper}>
							<Avatar data={participant.avatar} size={64} />
						</View>
					)}
					<View style={styles.nameTag}>
						{participant.isMuted && <Text style={styles.muteIcon}>🔇</Text>}
						<Text style={styles.nameText} numberOfLines={1}>
							{participant.name}
						</Text>
					</View>
				</View>
			))}
		</View>
	);
};

export default ParticipantGrid;

const styles = StyleSheet.create({
	grid: {
		flex: 1,
		flexDirection: "row",
		flexWrap: "wrap",
	},
	tile: {
		aspectRatio: 3 / 4,
		padding: 2,
		position: "relative",
	},
	tileSpeaking: {
		borderWidth: 2,
		borderColor: Colors.focused,
		borderRadius: 4,
	},
	video: {
		flex: 1,
		borderRadius: 4,
		backgroundColor: "#1a1a1a",
	},
	avatarWrapper: {
		flex: 1,
		borderRadius: 4,
		backgroundColor: "#1a1a1a",
		justifyContent: "center",
		alignItems: "center",
	},
	nameTag: {
		position: "absolute",
		bottom: 8,
		left: 8,
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		backgroundColor: "rgba(0,0,0,0.5)",
		borderRadius: 8,
		paddingHorizontal: 6,
		paddingVertical: 2,
	},
	muteIcon: {
		fontSize: 10,
	},
	nameText: {
		color: "#fff",
		fontSize: 12,
	},
});
