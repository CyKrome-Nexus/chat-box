import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

import { formatDuration } from "@/src/lib/audio/format";
import { resampleWaveform } from "@/src/lib/audio/waveform";
import Colors from "@/src/constants/Colors";

const DISPLAY_BARS = 40;

/** Scrubbable preview player shown while reviewing a voice note before sending. */
const VoicePreviewPlayer = ({ uri, waveform: rawWaveform }: { uri: string; waveform: number[] }) => {
	const player = useAudioPlayer(uri);
	const status = useAudioPlayerStatus(player);
	const waveform = resampleWaveform(rawWaveform, DISPLAY_BARS);

	const togglePlay = () => {
		if (status.playing) {
			player.pause();
			return;
		}
		if (status.duration > 0 && status.currentTime >= status.duration) player.seekTo(0);
		player.play();
	};

	const duration = status.duration || 0;
	const progress = duration > 0 ? Math.min(1, status.currentTime / duration) : 0;
	const activeBars = Math.round(progress * waveform.length);

	return (
		<View style={styles.container}>
			<TouchableOpacity onPress={togglePlay} style={styles.playButton}>
				<Ionicons name={status.playing ? "pause" : "play"} size={16} color="#fff" />
			</TouchableOpacity>
			<View style={styles.waveformRow}>
				{waveform.map((amplitude, index) => (
					<View
						key={index}
						style={[
							styles.bar,
							{
								height: 4 + amplitude * 20,
								backgroundColor: index < activeBars ? Colors.focused : "#CDD1D0",
							},
						]}
					/>
				))}
			</View>
			<Text style={styles.duration}>{formatDuration(duration)}</Text>
		</View>
	);
};

export default VoicePreviewPlayer;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	playButton: {
		width: 30,
		height: 30,
		borderRadius: 15,
		backgroundColor: Colors.focused,
		justifyContent: "center",
		alignItems: "center",
	},
	waveformRow: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: 2,
		height: 24,
	},
	bar: {
		width: 3,
		borderRadius: 2,
	},
	duration: {
		fontSize: 11,
		color: "#797C7B",
		minWidth: 32,
	},
});
