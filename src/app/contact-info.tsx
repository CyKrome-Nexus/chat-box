import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import Avatar from "@/src/components/images/Avatar";
import Colors from "@/src/constants/Colors";

/**
 * Minimal per-contact info screen — its main purpose for this ticket is
 * being the entry point to the Shared Media Gallery (docs/architecture/
 * media-gallery.md). Group Info is out of scope until groups (#33) exist.
 */
const ContactInfoScreen = () => {
	const params = useLocalSearchParams<{ user: string }>();
	const user = (() => {
		if (!params.user) return null;
		try {
			return JSON.parse(params.user);
		} catch {
			return null;
		}
	})();

	const conversationId = user?.id || user?.name || "unknown";

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name="chevron-back" size={24} color="#000E08" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Contact Info</Text>
				<View style={{ width: 24 }} />
			</View>

			<View style={styles.profileSection}>
				<Avatar data={user?.avatar} size={96} />
				<Text style={styles.name}>{user?.name || "Contact"}</Text>
				{user?.status && <Text style={styles.status}>Active Now</Text>}
			</View>

			<TouchableOpacity
				style={styles.row}
				onPress={() =>
					router.push({
						pathname: "/shared-media",
						params: { conversationId, name: user?.name || "" },
					})
				}
			>
				<Ionicons name="images-outline" size={22} color={Colors.focused} />
				<Text style={styles.rowLabel}>Shared Media</Text>
				<Ionicons name="chevron-forward" size={18} color="#797C7B" />
			</TouchableOpacity>
		</View>
	);
};

export default ContactInfoScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingTop: 56,
		paddingHorizontal: 16,
		paddingBottom: 12,
	},
	headerTitle: {
		fontSize: 16,
		fontWeight: "700",
		color: "#000E08",
	},
	profileSection: {
		alignItems: "center",
		paddingVertical: 24,
		gap: 6,
	},
	name: {
		fontSize: 20,
		fontWeight: "700",
		color: "#000E08",
	},
	status: {
		fontSize: 13,
		color: "#797C7B",
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderTopWidth: 1,
		borderBottomWidth: 1,
		borderColor: "#f2f2f2",
	},
	rowLabel: {
		flex: 1,
		fontSize: 15,
		color: "#000E08",
	},
});
