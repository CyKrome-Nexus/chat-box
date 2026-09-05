import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import Avatar from "@/src/components/images/Avatar";
import Colors from "@/src/constants/Colors";
import { useDeviceContacts } from "@/src/hooks/useDeviceContacts";
import { IContactRibbon } from "@/src/interfaces/list-interface";
import { TStoryPrivacy } from "@/src/interfaces/story-interface";

/**
 * Contact multi-select for "My Contacts Except…"/"Only Share With…" — shown
 * before posting a story whenever the default Status Privacy needs a
 * per-post audience list. See docs/architecture/stories-pipeline.md.
 */
const StoryAudienceModal = ({
	visible,
	privacy,
	onCancel,
	onConfirm,
}: {
	visible: boolean;
	privacy: TStoryPrivacy;
	onCancel: () => void;
	onConfirm: (audienceIds: string[]) => void;
}) => {
	const { contacts: deviceContacts } = useDeviceContacts();
	const manualContacts = useSelector((state: any) => state.contacts.manualContacts as IContactRibbon[]);
	const allContacts = useMemo(() => [...manualContacts, ...deviceContacts], [manualContacts, deviceContacts]);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);

	const toggle = (id: string) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));

	return (
		<Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
			<Pressable style={styles.backdrop} onPress={onCancel}>
				<Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
					<Text style={styles.title}>
						{privacy === "onlyShareWith" ? "Only Share With…" : "Contacts Except…"}
					</Text>
					<FlatList
						data={allContacts}
						keyExtractor={(item) => item.id}
						style={{ maxHeight: 320 }}
						renderItem={({ item }) => {
							const selected = selectedIds.includes(item.id);
							return (
								<TouchableOpacity style={styles.row} onPress={() => toggle(item.id)}>
									<Avatar data={item.avatar} size={36} />
									<Text style={styles.rowName}>{item.name}</Text>
									<Ionicons
										name={selected ? "checkmark-circle" : "ellipse-outline"}
										size={20}
										color={selected ? Colors.focused : "#ccc"}
									/>
								</TouchableOpacity>
							);
						}}
					/>
					<TouchableOpacity style={styles.confirmButton} onPress={() => onConfirm(selectedIds)}>
						<Text style={styles.confirmButtonText}>Post Status</Text>
					</TouchableOpacity>
				</Pressable>
			</Pressable>
		</Modal>
	);
};

export default StoryAudienceModal;

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
		padding: 20,
	},
	title: {
		fontSize: 16,
		fontWeight: "700",
		color: "#000E08",
		marginBottom: 12,
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		paddingVertical: 8,
	},
	rowName: {
		flex: 1,
		fontSize: 14,
		color: "#000E08",
	},
	confirmButton: {
		marginTop: 12,
		backgroundColor: Colors.focused,
		borderRadius: 14,
		paddingVertical: 12,
		alignItems: "center",
	},
	confirmButtonText: {
		color: "#fff",
		fontWeight: "700",
	},
});
