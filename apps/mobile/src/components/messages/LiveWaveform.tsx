import { ScrollView, StyleSheet, View } from "react-native";

/** Scrolls to the right as more samples arrive, like a live audio scope. */
const LiveWaveform = ({ samples, color = "#F04A4C" }: { samples: number[]; color?: string }) => {
	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			style={styles.scroll}
			contentContainerStyle={styles.content}
			ref={(ref) => ref?.scrollToEnd({ animated: false })}
		>
			{samples.map((amplitude, index) => (
				<View key={index} style={[styles.bar, { height: 4 + amplitude * 22, backgroundColor: color }]} />
			))}
		</ScrollView>
	);
};

export default LiveWaveform;

const styles = StyleSheet.create({
	scroll: {
		flex: 1,
		height: 26,
	},
	content: {
		alignItems: "center",
		gap: 2,
		paddingHorizontal: 4,
	},
	bar: {
		width: 3,
		borderRadius: 2,
	},
});
