import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";

import SettingsScreenHeader from "@/src/components/settings/SettingsScreenHeader";
import SettingToggleRow from "@/src/components/settings/SettingToggleRow";
import DisplayScaleSlider from "@/src/components/settings/DisplayScaleSlider";
import Colors from "@/src/constants/Colors";
import { setUseSystemTextSize, setZoomLevel } from "@/src/redux/features/settingsSlice";
import { DISPLAY_SCALE_PRESETS, useDisplayScale } from "@/src/lib/display/useDisplayScale";

const SettingsDisplay = () => {
	const dispatch = useDispatch();
	const { scale, scaleFont, scaleSpacing, zoomLevel, useSystemTextSize } = useDisplayScale();

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<SettingsScreenHeader title="Text & Display Size" />

			<Text style={styles.sectionTitle}>Accessibility</Text>
			<SettingToggleRow
				label="Match System Text Size"
				description="Use your device's Dynamic Type / Display Size accessibility setting instead of the slider below"
				value={useSystemTextSize}
				onValueChange={(value) => dispatch(setUseSystemTextSize(value))}
			/>

			<Text style={styles.sectionTitle}>Zoom Level</Text>
			<View style={[styles.sliderRow, !useSystemTextSize ? undefined : styles.disabled]} pointerEvents={useSystemTextSize ? "none" : "auto"}>
				<DisplayScaleSlider value={zoomLevel} onChange={(value) => dispatch(setZoomLevel(value))} />
				<Text style={styles.percentLabel}>{Math.round((useSystemTextSize ? scale : zoomLevel) * 100)}%</Text>
			</View>

			<View style={styles.presetRow}>
				{DISPLAY_SCALE_PRESETS.map((preset) => (
					<TouchableOpacity
						key={preset.key}
						disabled={useSystemTextSize}
						style={[
							styles.presetChip,
							!useSystemTextSize && Math.abs(zoomLevel - preset.value) < 0.01 && styles.presetChipActive,
							useSystemTextSize && styles.disabled,
						]}
						onPress={() => dispatch(setZoomLevel(preset.value))}
					>
						<Text
							style={[
								styles.presetChipText,
								!useSystemTextSize && Math.abs(zoomLevel - preset.value) < 0.01 && styles.presetChipTextActive,
							]}
						>
							{preset.label}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			<Text style={styles.sectionTitle}>Preview</Text>
			<Text style={[styles.note, { fontSize: scaleFont(12) }]}>
				This card updates live as you drag the slider — it uses the exact same `scaleFont`/`scaleSpacing`
				helpers wired into message bubbles and the chat list.
			</Text>
			<View style={[styles.previewCard, { padding: scaleSpacing(14) }]}>
				<View style={styles.previewRow}>
					<View style={[styles.previewAvatar, { width: scaleSpacing(40), height: scaleSpacing(40), borderRadius: scaleSpacing(20) }]} />
					<View style={{ flex: 1 }}>
						<Text style={{ fontSize: scaleFont(16), fontWeight: "700" }}>Ayesha Khan</Text>
						<Text style={{ fontSize: scaleFont(12), color: "#797C7B" }} numberOfLines={1}>
							Sounds good, see you at 6!
						</Text>
					</View>
				</View>

				<View style={[styles.previewBubbleReceiver, { padding: scaleSpacing(10), borderRadius: scaleSpacing(14) }]}>
					<Text style={{ fontSize: scaleFont(16), color: "#000E08" }}>
						Hey! Are we still on for dinner tonight?
					</Text>
					<Text style={{ fontSize: scaleFont(11), color: "#797C7B", marginTop: scaleSpacing(4) }}>9:14 AM</Text>
				</View>
				<View style={[styles.previewBubbleSender, { padding: scaleSpacing(10), borderRadius: scaleSpacing(14) }]}>
					<Text style={{ fontSize: scaleFont(16), color: "#fff" }}>Yes, absolutely! Can't wait 🎉</Text>
					<Text style={{ fontSize: scaleFont(11), color: "rgba(255,255,255,0.8)", marginTop: scaleSpacing(4) }}>9:15 AM</Text>
				</View>
			</View>
		</ScrollView>
	);
};

export default SettingsDisplay;

const styles = StyleSheet.create({
	container: {
		flexGrow: 1,
		backgroundColor: "#fff",
		paddingHorizontal: 20,
		paddingBottom: 40,
	},
	sectionTitle: {
		fontSize: 13,
		fontWeight: "700",
		color: "#797C7B",
		textTransform: "uppercase",
		marginTop: 20,
		marginBottom: 8,
	},
	sliderRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	disabled: {
		opacity: 0.4,
	},
	percentLabel: {
		fontSize: 15,
		fontWeight: "700",
		color: "#000E08",
		minWidth: 48,
		textAlign: "right",
	},
	presetRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
		marginTop: 14,
	},
	presetChip: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: "#CDD1D0",
	},
	presetChipActive: {
		backgroundColor: Colors.focused,
		borderColor: Colors.focused,
	},
	presetChipText: {
		fontSize: 13,
		fontWeight: "600",
		color: "#333",
	},
	presetChipTextActive: {
		color: "#fff",
	},
	note: {
		color: "#797C7B",
		lineHeight: 18,
	},
	previewCard: {
		backgroundColor: "#F2F8F7",
		borderRadius: 16,
		gap: 10,
	},
	previewRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	previewAvatar: {
		backgroundColor: Colors.focused,
	},
	previewBubbleReceiver: {
		alignSelf: "flex-start",
		maxWidth: "85%",
		backgroundColor: "#fff",
	},
	previewBubbleSender: {
		alignSelf: "flex-end",
		maxWidth: "85%",
		backgroundColor: Colors.focused,
	},
});
