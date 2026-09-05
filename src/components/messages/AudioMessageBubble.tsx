import { useEffect, useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

import { IAttachment } from "@/src/interfaces/message-interface";
import { generateWaveform } from "@/src/lib/audio/waveform";
import { audioPlaybackManager } from "@/src/lib/audio/playbackManager";
import { formatDuration } from "@/src/lib/audio/format";

const WAVEFORM_BARS = 28;

const AudioMessageBubble = ({
	messageId,
	attachment,
	isSender,
}: {
	messageId: string;
	attachment: IAttachment;
	isSender: boolean;
}) => {
	const player = useAudioPlayer(attachment.uri || null);
	const status = useAudioPlayerStatus(player);
	const waveform = useMemo(() => generateWaveform(messageId, WAVEFORM_BARS), [messageId]);

	useEffect(() => {
		return () => {
			audioPlaybackManager.clearIfActive(messageId);
		};
	}, [messageId]);

	const togglePlay = () => {
		if (status.playing) {
			player.pause();
			audioPlaybackManager.clearIfActive(messageId);
			return;
		}

		if (status.duration > 0 && status.currentTime >= status.duration) {
			player.seekTo(0);
		}

		audioPlaybackManager.setActive(messageId, () => player.pause());
		player.play();
	};

	const duration = status.duration || attachment.duration || 0;
	const progress = duration > 0 ? Math.min(1, status.currentTime / duration) : 0;
	const activeBars = Math.round(progress * waveform.length);

	const accentColor = isSender ? "#FFFFFF" : "#24786D";
	const dimColor = isSender ? "rgba(255,255,255,0.4)" : "#C6D6D3";

	return (
		<View style={styles.row}>
			<TouchableOpacity onPress={togglePlay} style={styles.playButton}>
				<Ionicons name={status.playing ? "pause" : "play"} size={18} color={accentColor} />
			</TouchableOpacity>
			<View style={styles.waveformRow}>
				{waveform.map((amplitude, index) => (
					<View
						key={index}
						style={[
							styles.bar,
							{
								height: 6 + amplitude * 18,
								backgroundColor: index < activeBars ? accentColor : dimColor,
							},
						]}
					/>
				))}
			</View>
			<Text style={[styles.duration, { color: accentColor }]}>{formatDuration(duration)}</Text>
		</View>
	);
};

export default AudioMessageBubble;

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		minWidth: 200,
		paddingVertical: 2,
	},
	playButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "rgba(120,120,120,0.15)",
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
		minWidth: 32,
	},
});
