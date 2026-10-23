import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";

import { formatDuration } from "@/src/lib/audio/format";
import LiveWaveform from "./LiveWaveform";
import Colors from "@/src/constants/Colors";

const LOCK_THRESHOLD = 80;

const VoiceRecordingBar = ({
	durationMillis,
	waveform,
	slideX,
	slideY,
}: {
	durationMillis: number;
	waveform: number[];
	slideX: SharedValue<number>;
	slideY: SharedValue<number>;
}) => {
	const hintStyle = useAnimatedStyle(() => ({
		opacity: 1 - Math.min(1, Math.abs(slideX.value) / 80),
		transform: [{ translateX: slideX.value * 0.4 }],
	}));

	const lockStyle = useAnimatedStyle(() => ({
		opacity: 1,
		transform: [
			{ translateY: slideY.value * 0.5 },
			{ scale: 1 + Math.min(1, Math.abs(slideY.value) / LOCK_THRESHOLD) * 0.3 },
		],
	}));

	return (
		<View style={styles.container}>
			<View style={styles.recordDot} />
			<Text style={styles.timer}>{formatDuration(durationMillis / 1000)}</Text>
			<LiveWaveform samples={waveform} />
			<Animated.Text style={[styles.hint, hintStyle]}>‹ Slide to cancel</Animated.Text>
			<Animated.View style={[styles.lockIndicator, lockStyle]}>
				<Ionicons name="lock-closed-outline" size={16} color={Colors.focused} />
				<Ionicons name="chevron-up" size={12} color={Colors.focused} />
			</Animated.View>
		</View>
	);
};

export default VoiceRecordingBar;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingHorizontal: 14,
	},
	recordDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: "#F04A4C",
	},
	timer: {
		fontSize: 15,
		color: "#333",
		minWidth: 40,
	},
	hint: {
		color: "#797C7B",
		fontSize: 13,
	},
	lockIndicator: {
		position: "absolute",
		right: 4,
		top: -44,
		alignItems: "center",
		backgroundColor: "#F2F8F7",
		borderRadius: 16,
		paddingVertical: 6,
		paddingHorizontal: 8,
		gap: 2,
	},
});
