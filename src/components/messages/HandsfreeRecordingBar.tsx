import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { formatDuration } from "@/src/lib/audio/format";
import LiveWaveform from "./LiveWaveform";
import VoicePreviewPlayer from "./VoicePreviewPlayer";
import Colors from "@/src/constants/Colors";

/**
 * The locked/handsfree voice-note composer: shown after swiping the mic
 * button up past the lock threshold (see Chat.tsx's micPanGesture). Two
 * sub-states:
 *  - recording: live waveform + timer + a "pause" button that stops and
 *    finalizes the recording into a reviewable file (see
 *    docs/architecture/voice-note-studio.md for why this is a finalize-and-
 *    review step rather than true pause/resume-with-append).
 *  - preview: the finalized recording, scrubbable via VoicePreviewPlayer,
 *    with Trash (discard) and Send.
 */
const HandsfreeRecordingBar = ({
	mode,
	durationMillis,
	waveform,
	previewUri,
	onPauseForPreview,
	onDiscard,
	onSend,
}: {
	mode: "locked" | "preview";
	durationMillis: number;
	waveform: number[];
	previewUri?: string;
	onPauseForPreview: () => void;
	onDiscard: () => void;
	onSend: () => void;
}) => {
	return (
		<View style={styles.container}>
			<TouchableOpacity onPress={onDiscard} style={styles.iconButton}>
				<Ionicons name="trash-outline" size={20} color="#F04A4C" />
			</TouchableOpacity>

			{mode === "locked" ? (
				<>
					<View style={styles.recordDot} />
					<Text style={styles.timer}>{formatDuration(durationMillis / 1000)}</Text>
					<LiveWaveform samples={waveform} color={Colors.focused} />
					<TouchableOpacity onPress={onPauseForPreview} style={styles.iconButton}>
						<Ionicons name="pause" size={20} color={Colors.focused} />
					</TouchableOpacity>
				</>
			) : (
				previewUri && <VoicePreviewPlayer uri={previewUri} waveform={waveform} />
			)}

			<TouchableOpacity
				onPress={onSend}
				style={[styles.sendButton, mode === "locked" && styles.sendButtonDisabled]}
				disabled={mode === "locked"}
			>
				<Ionicons name="send" size={18} color={mode === "locked" ? "#B4BCB9" : "#fff"} />
			</TouchableOpacity>
		</View>
	);
};

export default HandsfreeRecordingBar;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingHorizontal: 10,
	},
	iconButton: {
		width: 30,
		height: 30,
		justifyContent: "center",
		alignItems: "center",
	},
	recordDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: "#F04A4C",
	},
	timer: {
		fontSize: 14,
		color: "#333",
		minWidth: 36,
	},
	sendButton: {
		width: 34,
		height: 34,
		borderRadius: 17,
		backgroundColor: Colors.focused,
		justifyContent: "center",
		alignItems: "center",
	},
	sendButtonDisabled: {
		backgroundColor: "#E0E0E0",
	},
});
