import { useEffect, useMemo, useRef, useState } from "react";
import { GestureResponderEvent, LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

import { IAttachment } from "@/src/interfaces/message-interface";
import { generateWaveform, resampleWaveform } from "@/src/lib/audio/waveform";
import { audioPlaybackManager } from "@/src/lib/audio/playbackManager";
import { formatDuration } from "@/src/lib/audio/format";

const WAVEFORM_BARS = 28;
const PLAYBACK_SPEEDS = [1, 1.5, 2];

const AudioMessageBubble = ({
	messageId,
	conversationId,
	attachment,
	isSender,
}: {
	messageId: string;
	conversationId: string;
	attachment: IAttachment;
	isSender: boolean;
}) => {
	const player = useAudioPlayer(attachment.uri || null);
	const status = useAudioPlayerStatus(player);
	const [speedIndex, setSpeedIndex] = useState(0);
	const rowWidthRef = useRef(0);
	const wasPlayingRef = useRef(false);

	// Real captured samples (see useVoiceRecorder) when available; falls back
	// to the deterministic placeholder for messages recorded before that
	// existed, or received from elsewhere without waveform data.
	const waveform = useMemo(
		() =>
			attachment.waveform && attachment.waveform.length > 0
				? resampleWaveform(attachment.waveform, WAVEFORM_BARS)
				: generateWaveform(messageId, WAVEFORM_BARS),
		[attachment.waveform, messageId]
	);

	useEffect(() => {
		return () => {
			audioPlaybackManager.clearIfActive(messageId);
		};
	}, [messageId]);

	const play = () => {
		if (status.duration > 0 && status.currentTime >= status.duration) {
			player.seekTo(0);
		}
		audioPlaybackManager.setActive(messageId, () => player.pause());
		player.play();
	};

	useEffect(() => {
		// Re-registers on every status change (cheap — just a Map.set) so the
		// registered handler's closure never reads stale duration/currentTime
		// when another bubble triggers it via playNext.
		return audioPlaybackManager.registerPlayHandler(messageId, play);
	});

	// Continuous playback: auto-play the next voice note in this
	// conversation's timeline once this one finishes.
	useEffect(() => {
		if (status.playing) wasPlayingRef.current = true;
		if (wasPlayingRef.current && status.didJustFinish) {
			wasPlayingRef.current = false;
			audioPlaybackManager.clearIfActive(messageId);
			audioPlaybackManager.playNext(conversationId, messageId);
		}
	}, [status.didJustFinish, status.playing, conversationId, messageId]);

	const togglePlay = () => {
		if (status.playing) {
			player.pause();
			audioPlaybackManager.clearIfActive(messageId);
			return;
		}
		play();
	};

	const cycleSpeed = () => {
		const nextIndex = (speedIndex + 1) % PLAYBACK_SPEEDS.length;
		setSpeedIndex(nextIndex);
		player.setPlaybackRate(PLAYBACK_SPEEDS[nextIndex]);
	};

	const handleScrub = (e: GestureResponderEvent) => {
		if (!duration || !rowWidthRef.current) return;
		const fraction = Math.max(0, Math.min(1, e.nativeEvent.locationX / rowWidthRef.current));
		player.seekTo(fraction * duration);
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
			<TouchableOpacity
				activeOpacity={1}
				style={styles.waveformRow}
				onLayout={(e: LayoutChangeEvent) => (rowWidthRef.current = e.nativeEvent.layout.width)}
				onPress={handleScrub}
			>
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
			</TouchableOpacity>
			<TouchableOpacity onPress={cycleSpeed} style={styles.speedButton}>
				<Text style={[styles.speedText, { color: accentColor }]}>{PLAYBACK_SPEEDS[speedIndex]}x</Text>
			</TouchableOpacity>
			<Text style={[styles.duration, { color: accentColor }]}>{formatDuration(duration)}</Text>
		</View>
	);
};

export default AudioMessageBubble;

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		minWidth: 220,
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
	speedButton: {
		paddingHorizontal: 4,
	},
	speedText: {
		fontSize: 11,
		fontWeight: "700",
	},
	duration: {
		fontSize: 11,
		minWidth: 32,
	},
});
