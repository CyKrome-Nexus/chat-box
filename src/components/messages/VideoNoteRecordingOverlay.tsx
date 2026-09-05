import { forwardRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CameraView } from "expo-camera";
import Svg, { Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";

import { formatDuration } from "@/src/lib/audio/format";
import { VIDEO_NOTE_MAX_DURATION_SECONDS } from "@/src/hooks/useVideoNoteRecorder";
import Colors from "@/src/constants/Colors";

const SIZE = 130;
const STROKE_WIDTH = 4;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * The circular front-camera recording overlay, positioned above the input
 * bar while recording a video note. `ref` is expo-camera's CameraView ref
 * (see useVideoNoteRecorder) — this component only renders the camera and
 * the circular progress ring; recording is driven imperatively by the hook.
 */
const VideoNoteRecordingOverlay = forwardRef<
	CameraView,
	{ durationMillis: number; locked: boolean; onCameraReady: () => void }
>(({ durationMillis, locked, onCameraReady }, ref) => {
		const progress = Math.min(1, durationMillis / (VIDEO_NOTE_MAX_DURATION_SECONDS * 1000));
		const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

		return (
			<View style={styles.container}>
				<View style={styles.cameraClip}>
					<CameraView
						ref={ref}
						style={StyleSheet.absoluteFill}
						facing="front"
						mode="video"
						onCameraReady={onCameraReady}
					/>
				</View>
				<Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
					<Circle
						cx={SIZE / 2}
						cy={SIZE / 2}
						r={RADIUS}
						stroke={Colors.focused}
						strokeWidth={STROKE_WIDTH}
						strokeDasharray={CIRCUMFERENCE}
						strokeDashoffset={strokeDashoffset}
						strokeLinecap="round"
						fill="none"
						rotation={-90}
						origin={`${SIZE / 2}, ${SIZE / 2}`}
					/>
				</Svg>
				<Text style={styles.timer}>{formatDuration(durationMillis / 1000)}</Text>
				{locked && (
					<View style={styles.lockedBadge}>
						<Ionicons name="lock-closed" size={12} color="#fff" />
					</View>
				)}
			</View>
		);
	}
);

VideoNoteRecordingOverlay.displayName = "VideoNoteRecordingOverlay";

export default VideoNoteRecordingOverlay;

const styles = StyleSheet.create({
	container: {
		position: "absolute",
		bottom: "100%",
		alignSelf: "center",
		width: SIZE,
		height: SIZE,
		marginBottom: 12,
	},
	cameraClip: {
		position: "absolute",
		top: STROKE_WIDTH,
		left: STROKE_WIDTH,
		right: STROKE_WIDTH,
		bottom: STROKE_WIDTH,
		borderRadius: SIZE / 2,
		overflow: "hidden",
		backgroundColor: "#000",
	},
	timer: {
		position: "absolute",
		bottom: -22,
		alignSelf: "center",
		fontSize: 13,
		fontWeight: "600",
		color: "#333",
	},
	lockedBadge: {
		position: "absolute",
		top: 4,
		right: 4,
		backgroundColor: Colors.focused,
		borderRadius: 10,
		padding: 4,
	},
});
