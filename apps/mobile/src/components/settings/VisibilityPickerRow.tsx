import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { TVisibility } from "@/src/redux/features/settingsSlice";
import Colors from "@/src/constants/Colors";

const OPTIONS: { key: TVisibility; label: string }[] = [
	{ key: "everyone", label: "Everyone" },
	{ key: "contacts", label: "My Contacts" },
	{ key: "nobody", label: "Nobody" },
];

/** A three-way Everyone/My Contacts/Nobody row for the granular privacy toggles. */
const VisibilityPickerRow = ({
	label,
	description,
	value,
	onValueChange,
}: {
	label: string;
	description?: string;
	value: TVisibility;
	onValueChange: (value: TVisibility) => void;
}) => (
	<View style={styles.container}>
		<Text style={styles.label}>{label}</Text>
		{!!description && <Text style={styles.description}>{description}</Text>}
		<View style={styles.optionsRow}>
			{OPTIONS.map((option) => (
				<TouchableOpacity
					key={option.key}
					style={[styles.option, value === option.key && styles.optionActive]}
					onPress={() => onValueChange(option.key)}
				>
					<Text style={[styles.optionText, value === option.key && styles.optionTextActive]}>
						{option.label}
					</Text>
				</TouchableOpacity>
			))}
		</View>
	</View>
);

export default VisibilityPickerRow;

const styles = StyleSheet.create({
	container: {
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#F0F0F0",
	},
	label: {
		fontSize: 15,
		fontWeight: "600",
		color: "#000E08",
	},
	description: {
		fontSize: 12,
		color: "#797C7B",
		marginTop: 2,
	},
	optionsRow: {
		flexDirection: "row",
		gap: 8,
		marginTop: 10,
	},
	option: {
		flex: 1,
		paddingVertical: 8,
		borderRadius: 12,
		backgroundColor: "#F2F8F7",
		alignItems: "center",
	},
	optionActive: {
		backgroundColor: Colors.focused,
	},
	optionText: {
		fontSize: 12,
		fontWeight: "600",
		color: "#24786D",
	},
	optionTextActive: {
		color: "#fff",
	},
});
