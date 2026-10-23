import { FlatList, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import Avatar from "@/src/components/images/Avatar";
import { IChatRibbon } from "@/src/interfaces/list-interface";

/**
 * Lightbox "Forward" action: picks a destination conversation from the
 * existing chats list. See docs/architecture/media-gallery.md.
 */
const ForwardSheet = ({
	visible,
	onClose,
	onSelect,
}: {
	visible: boolean;
	onClose: () => void;
	onSelect: (chat: IChatRibbon) => void;
}) => {
	const chats = useSelector((state: any) => state.chats.chats as IChatRibbon[]);

	return (
		<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
			<Pressable style={styles.backdrop} onPress={onClose}>
				<Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
					<View style={styles.handle} />
					<Text style={styles.title}>Forward to…</Text>
					<FlatList
						data={chats}
						keyExtractor={(item) => item.id}
						renderItem={({ item }) => (
							<TouchableOpacity
								style={styles.row}
								onPress={() => {
									onSelect(item);
									onClose();
								}}
							>
								<Avatar data={item.avatar} size={40} />
								<Text style={styles.rowLabel}>{item.name}</Text>
								<Ionicons name="arrow-redo-outline" size={18} color="#797C7B" />
							</TouchableOpacity>
						)}
					/>
				</Pressable>
			</Pressable>
		</Modal>
	);
};

export default ForwardSheet;

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
		maxHeight: "70%",
	},
	handle: {
		alignSelf: "center",
		width: 40,
		height: 4,
		borderRadius: 2,
		backgroundColor: "#DDD",
		marginBottom: 12,
	},
	title: {
		fontSize: 16,
		fontWeight: "700",
		color: "#000E08",
		marginBottom: 8,
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		paddingVertical: 10,
	},
	rowLabel: {
		flex: 1,
		fontSize: 15,
		color: "#000E08",
	},
});
