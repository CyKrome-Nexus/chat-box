import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ACCENT_PRESETS, isValidHexColor, normalizeHexColor } from "@/src/lib/theme/accentColors";

/**
 * 8 curated presets (a simple color-swatch grid) plus a validated free-text
 * hex input for a fully custom brand color — real input validation via
 * `normalizeHexColor`, not a decorative placeholder.
 */
const AccentColorPicker = ({ value, onChange }: { value: string; onChange: (hex: string) => void }) => {
	const [hexInput, setHexInput] = useState(value);
	const [hexError, setHexError] = useState(false);

	const handleSubmitHex = () => {
		const normalized = normalizeHexColor(hexInput);
		if (!normalized) {
			setHexError(true);
			return;
		}
		setHexError(false);
		onChange(normalized);
	};

	return (
		<View>
			<View style={styles.grid}>
				{ACCENT_PRESETS.map((preset) => {
					const isActive = value.toLowerCase() === preset.value.toLowerCase();
					return (
						<TouchableOpacity
							key={preset.key}
							style={[styles.swatch, { backgroundColor: preset.value }, isActive && styles.swatchActive]}
							onPress={() => {
								setHexInput(preset.value);
								setHexError(false);
								onChange(preset.value);
							}}
							accessibilityLabel={preset.label}
						>
							{isActive && <Ionicons name="checkmark" size={18} color="#fff" />}
						</TouchableOpacity>
					);
				})}
			</View>

			<View style={styles.hexRow}>
				<View style={[styles.hexPreview, { backgroundColor: isValidHexColor(hexInput.startsWith("#") ? hexInput : `#${hexInput}`) ? hexInput : "#ccc" }]} />
				<TextInput
					style={[styles.hexInput, hexError && styles.hexInputError]}
					value={hexInput}
					onChangeText={(text) => {
						setHexInput(text);
						setHexError(false);
					}}
					placeholder="#24786D"
					autoCapitalize="none"
					autoCorrect={false}
					maxLength={7}
					onSubmitEditing={handleSubmitHex}
				/>
				<TouchableOpacity style={styles.hexApplyButton} onPress={handleSubmitHex}>
					<Text style={styles.hexApplyText}>Apply</Text>
				</TouchableOpacity>
			</View>
			{hexError && <Text style={styles.hexErrorText}>Enter a valid hex color, e.g. #24786D</Text>}
		</View>
	);
};

export default AccentColorPicker;

const styles = StyleSheet.create({
	grid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 12,
	},
	swatch: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
	},
	swatchActive: {
		borderWidth: 3,
		borderColor: "#00000022",
	},
	hexRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		marginTop: 16,
	},
	hexPreview: {
		width: 32,
		height: 32,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#E4E9E8",
	},
	hexInput: {
		flex: 1,
		borderWidth: 1,
		borderColor: "#CDD1D0",
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 8,
		fontSize: 14,
	},
	hexInputError: {
		borderColor: "#D63A4C",
	},
	hexApplyButton: {
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderRadius: 10,
		backgroundColor: "#F2F8F7",
	},
	hexApplyText: {
		fontWeight: "600",
		color: "#24786D",
	},
	hexErrorText: {
		marginTop: 6,
		fontSize: 12,
		color: "#D63A4C",
	},
});
