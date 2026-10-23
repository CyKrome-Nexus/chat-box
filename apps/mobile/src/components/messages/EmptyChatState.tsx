import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Colors from "@/src/constants/Colors";

const EmptyChatState = ({ name }: { name?: string }) => (
	<View style={styles.container}>
		<View style={styles.iconCircle}>
			<Ionicons name="chatbubble-ellipses-outline" size={36} color={Colors.focused} />
		</View>
		<Text style={styles.title}>No messages yet</Text>
		<Text style={styles.subtitle}>
			Say hi to {name || "your contact"} 👋 — messages are end-to-end secured.
		</Text>
	</View>
);

export default EmptyChatState;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 40,
	},
	iconCircle: {
		width: 72,
		height: 72,
		borderRadius: 36,
		backgroundColor: "#F2F8F7",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 16,
	},
	title: {
		fontSize: 18,
		fontWeight: "700",
		color: "#000E08",
		marginBottom: 6,
	},
	subtitle: {
		fontSize: 13,
		color: "#797C7B",
		textAlign: "center",
	},
});
