import { StyleSheet, Switch, Text, View } from "react-native";

import Colors from "@/src/constants/Colors";

const SettingToggleRow = ({
	label,
	description,
	value,
	onValueChange,
}: {
	label: string;
	description?: string;
	value: boolean;
	onValueChange: (value: boolean) => void;
}) => (
	<View style={styles.row}>
		<View style={styles.textColumn}>
			<Text style={styles.label}>{label}</Text>
			{!!description && <Text style={styles.description}>{description}</Text>}
		</View>
		<Switch
			value={value}
			onValueChange={onValueChange}
			trackColor={{ true: Colors.focused }}
		/>
	</View>
);

export default SettingToggleRow;

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 14,
		borderBottomWidth: 1,
		borderBottomColor: "#F0F0F0",
	},
	textColumn: {
		flex: 1,
		paddingRight: 12,
	},
	label: {
		fontSize: 16,
		fontWeight: "600",
	},
	description: {
		fontSize: 12,
		color: "#797C7B",
		marginTop: 2,
	},
});
