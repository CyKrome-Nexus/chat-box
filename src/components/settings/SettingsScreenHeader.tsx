import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const SettingsScreenHeader = ({ title }: { title: string }) => (
	<View style={styles.header}>
		<TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
			<Ionicons name="chevron-back" size={26} color="#000" />
		</TouchableOpacity>
		<Text style={styles.title}>{title}</Text>
		<View style={{ width: 26 }} />
	</View>
);

export default SettingsScreenHeader;

const styles = StyleSheet.create({
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 20,
		paddingTop: 60,
		paddingBottom: 16,
	},
	title: {
		fontSize: 18,
		fontWeight: "700",
	},
});
