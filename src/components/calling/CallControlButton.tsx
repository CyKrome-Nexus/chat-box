import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const CallControlButton = ({
	icon,
	label,
	active,
	danger,
	rotate135,
	onPress,
}: {
	icon: keyof typeof Ionicons.glyphMap;
	label?: string;
	active?: boolean;
	danger?: boolean;
	rotate135?: boolean;
	onPress: () => void;
}) => {
	return (
		<View style={styles.wrapper}>
			<TouchableOpacity
				style={[styles.button, active && styles.buttonActive, danger && styles.buttonDanger]}
				onPress={onPress}
			>
				<Ionicons
					name={icon}
					size={26}
					color={active ? "#000" : "#fff"}
					style={rotate135 ? { transform: [{ rotate: "135deg" }] } : undefined}
				/>
			</TouchableOpacity>
			{!!label && <Text style={styles.label}>{label}</Text>}
		</View>
	);
};

export default CallControlButton;

const styles = StyleSheet.create({
	wrapper: {
		alignItems: "center",
		gap: 8,
	},
	button: {
		width: 60,
		height: 60,
		borderRadius: 30,
		backgroundColor: "rgba(255,255,255,0.15)",
		justifyContent: "center",
		alignItems: "center",
	},
	buttonActive: {
		backgroundColor: "#fff",
	},
	buttonDanger: {
		backgroundColor: "#F04A4C",
	},
	label: {
		color: "#fff",
		fontSize: 12,
		opacity: 0.85,
	},
});
