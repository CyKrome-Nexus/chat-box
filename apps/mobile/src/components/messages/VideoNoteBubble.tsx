import { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEvent } from "expo";
import Svg, { Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";

import { IAttachment } from "@/src/interfaces/message-interface";
import { audioPlaybackManager } from "@/src/lib/audio/playbackManager";

const SIZE = 160;
const STROKE_WIDTH = 3;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Telegram-style circular video note bubble: autoplays muted+looping by
 * default (respecting quiet environments per the ticket), tap unmutes and
 * shows a progress ring around the perimeter, long-press opens a
 * fullscreen/reply action sheet.
 */
const VideoNoteBubble = ({
	messageId,
	attachment,
	onLongPressFullscreen,
}: {
	messageId: string;
	attachment: IAttachment;
	onLongPressFullscreen?: () => void;
}) => {
	const [isMuted, setIsMuted] = useState(true);
	const player = useVideoPlayer(attachment.uri || "", (p) => {
		p.loop = true;
		p.muted = true;
		p.play();
	});

	const { isPlaying } = useEvent(player, "playingChange", { isPlaying: player.playing });
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		const subscription = player.addListener("timeUpdate", (payload) => {
			if (player.duration > 0) setProgress(payload.currentTime / player.duration);
		});
		return () => subscription.remove();
	}, [player]);

	useEffect(() => {
		return () => {
			audioPlaybackManager.clearIfActive(messageId);
		};
	}, [messageId]);

	const toggleSound = () => {
		const nextMuted = !isMuted;
		setIsMuted(nextMuted);
		player.muted = nextMuted;

		if (!nextMuted) {
			// Unmuting a video note counts as "playing audio" for the
			// single-track rule shared with voice notes.
			audioPlaybackManager.setActive(messageId, () => {
				player.muted = true;
				setIsMuted(true);
			});
		} else {
			audioPlaybackManager.clearIfActive(messageId);
		}
	};

	const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

	return (
		<TouchableOpacity
			activeOpacity={0.9}
			onPress={toggleSound}
			onLongPress={onLongPressFullscreen}
			style={styles.container}
		>
			<View style={styles.clip}>
				<VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
			</View>
			<Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
				<Circle
					cx={SIZE / 2}
					cy={SIZE / 2}
					r={RADIUS}
					stroke="#fff"
					strokeWidth={STROKE_WIDTH}
					strokeDasharray={CIRCUMFERENCE}
					strokeDashoffset={strokeDashoffset}
					strokeLinecap="round"
					fill="none"
					rotation={-90}
					origin={`${SIZE / 2}, ${SIZE / 2}`}
				/>
			</Svg>
			{isMuted && (
				<View style={styles.muteBadge}>
					<Ionicons name="volume-mute" size={14} color="#fff" />
				</View>
			)}
			{!isPlaying && (
				<View style={styles.playOverlay}>
					<Ionicons name="play" size={36} color="#fff" />
				</View>
			)}
		</TouchableOpacity>
	);
};

export default VideoNoteBubble;

const styles = StyleSheet.create({
	container: {
		width: SIZE,
		height: SIZE,
	},
	clip: {
		position: "absolute",
		top: STROKE_WIDTH,
		left: STROKE_WIDTH,
		right: STROKE_WIDTH,
		bottom: STROKE_WIDTH,
		borderRadius: SIZE / 2,
		overflow: "hidden",
		backgroundColor: "#000",
	},
	muteBadge: {
		position: "absolute",
		bottom: 10,
		right: 10,
		backgroundColor: "rgba(0,0,0,0.5)",
		borderRadius: 12,
		padding: 5,
	},
	playOverlay: {
		...StyleSheet.absoluteFillObject,
		justifyContent: "center",
		alignItems: "center",
	},
});
