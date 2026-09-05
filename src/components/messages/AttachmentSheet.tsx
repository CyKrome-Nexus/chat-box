import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Colors from "@/src/constants/Colors";

export type TAttachmentOption = "camera" | "gallery" | "document" | "location";

const OPTIONS: { key: TAttachmentOption; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
	{ key: "camera", label: "Camera", icon: "camera-outline" },
	{ key: "gallery", label: "Gallery", icon: "images-outline" },
	{ key: "document", label: "Document", icon: "document-text-outline" },
	{ key: "location", label: "Location", icon: "location-outline" },
];

const AttachmentSheet = ({
	visible,
	onClose,
	onSelect,
}: {
	visible: boolean;
	onClose: () => void;
	onSelect: (option: TAttachmentOption) => void;
}) => {
	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<Pressable style={styles.backdrop} onPress={onClose}>
				<Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
					<View style={styles.handle} />
					<View style={styles.optionsRow}>
						{OPTIONS.map((option) => (
							<TouchableOpacity
								key={option.key}
								style={styles.option}
								onPress={() => {
									onClose();
									onSelect(option.key);
								}}
							>
								<View style={styles.iconCircle}>
									<Ionicons name={option.icon} size={24} color={Colors.focused} />
								</View>
								<Text style={styles.optionLabel}>{option.label}</Text>
							</TouchableOpacity>
						))}
					</View>
				</Pressable>
			</Pressable>
		</Modal>
	);
};

export default AttachmentSheet;

const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.4)",
		justifyContent: "flex-end",
	},
	sheet: {
		backgroundColor: "#fff",
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingTop: 10,
		paddingBottom: 30,
		paddingHorizontal: 20,
	},
	handle: {
		alignSelf: "center",
		width: 40,
		height: 4,
		borderRadius: 2,
		backgroundColor: "#DDD",
		marginBottom: 16,
	},
	optionsRow: {
		flexDirection: "row",
		justifyContent: "space-between",
	},
	option: {
		alignItems: "center",
		gap: 8,
	},
	iconCircle: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: "#F2F8F7",
		justifyContent: "center",
		alignItems: "center",
	},
	optionLabel: {
		fontSize: 12,
		color: "#333",
	},
});
