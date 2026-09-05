import { StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";

import { formatDuration } from "@/src/lib/audio/format";

const VoiceRecordingBar = ({
	durationMillis,
	slideX,
}: {
	durationMillis: number;
	slideX: SharedValue<number>;
}) => {
	const hintStyle = useAnimatedStyle(() => ({
		opacity: 1 - Math.min(1, Math.abs(slideX.value) / 80),
		transform: [{ translateX: slideX.value * 0.4 }],
	}));

	return (
		<View style={styles.container}>
			<View style={styles.recordDot} />
			<Text style={styles.timer}>{formatDuration(durationMillis / 1000)}</Text>
			<Animated.Text style={[styles.hint, hintStyle]}>‹ Slide to cancel</Animated.Text>
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
		flex: 1,
		textAlign: "right",
		color: "#797C7B",
		fontSize: 13,
	},
});
