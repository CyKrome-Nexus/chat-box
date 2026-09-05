import { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import Avatar from "@/src/components/images/Avatar";
import Colors from "@/src/constants/Colors";
import { useDeviceContacts } from "@/src/hooks/useDeviceContacts";
import { IContactRibbon } from "@/src/interfaces/list-interface";

/**
 * Multi-select contact picker shared by Group and Broadcast List creation
 * (step 1 of each flow) — see docs/architecture/groups.md.
 */
const ContactPickerScreen = () => {
	const params = useLocalSearchParams<{ mode: "group" | "broadcast" }>();
	const { contacts: deviceContacts } = useDeviceContacts();
	const manualContacts = useSelector((state: any) => state.contacts.manualContacts as IContactRibbon[]);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);

	const allContacts = useMemo(() => [...manualContacts, ...deviceContacts], [manualContacts, deviceContacts]);
	const selectedContacts = allContacts.filter((c) => selectedIds.includes(c.id));

	const toggle = (id: string) => {
		setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
	};

	const handleNext = () => {
		if (selectedContacts.length === 0) return;
		const participantsJson = JSON.stringify(
			selectedContacts.map((c) => ({ id: c.id, name: c.name, avatarUrl: c.avatar?.url }))
		);
		router.push({
			pathname: params.mode === "broadcast" ? "/broadcast-create-details" : "/group-create-details",
			params: { participantsJson },
		});
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name="chevron-back" size={24} color="#000E08" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>
					{params.mode === "broadcast" ? "New Broadcast List" : "New Group"}
				</Text>
				<Text style={styles.headerCount}>{selectedIds.length}</Text>
			</View>

			<FlatList
				data={allContacts}
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => {
					const selected = selectedIds.includes(item.id);
					return (
						<TouchableOpacity style={styles.row} onPress={() => toggle(item.id)}>
							<Avatar data={item.avatar} size={40} />
							<Text style={styles.rowName}>{item.name}</Text>
							<Ionicons
								name={selected ? "checkmark-circle" : "ellipse-outline"}
								size={22}
								color={selected ? Colors.focused : "#ccc"}
							/>
						</TouchableOpacity>
					);
				}}
			/>

			{selectedIds.length > 0 && (
				<TouchableOpacity style={styles.nextButton} onPress={handleNext}>
					<Text style={styles.nextButtonText}>Next</Text>
					<Ionicons name="arrow-forward" size={18} color="#fff" />
				</TouchableOpacity>
			)}
		</View>
	);
};

export default ContactPickerScreen;

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
	headerCount: {
		fontSize: 13,
		color: "#797C7B",
		minWidth: 20,
		textAlign: "right",
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		paddingHorizontal: 16,
		paddingVertical: 10,
	},
	rowName: {
		flex: 1,
		fontSize: 15,
		color: "#000E08",
	},
	nextButton: {
		position: "absolute",
		right: 20,
		bottom: 30,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		backgroundColor: Colors.focused,
		paddingHorizontal: 20,
		paddingVertical: 14,
		borderRadius: 28,
	},
	nextButtonText: {
		color: "#fff",
		fontWeight: "700",
	},
});
