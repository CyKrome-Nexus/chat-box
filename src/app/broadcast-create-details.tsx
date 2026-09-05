import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useDispatch } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import { createBroadcastList } from "@/src/redux/features/chatsSlice";
import Colors from "@/src/constants/Colors";

/** Step 2 of broadcast list creation: just a name. See docs/architecture/groups.md. */
const BroadcastCreateDetailsScreen = () => {
	const dispatch = useDispatch();
	const params = useLocalSearchParams<{ participantsJson: string }>();
	const [name, setName] = useState("");

	const participants: { id: string }[] = (() => {
		try {
			return JSON.parse(params.participantsJson || "[]");
		} catch {
			return [];
		}
	})();

	const handleCreate = () => {
		if (!name.trim()) return;
		const id = `broadcast-${Date.now()}`;
		dispatch(
			createBroadcastList({
				id,
				name: name.trim(),
				recipientIds: participants.map((p) => p.id),
			})
		);
		router.replace({
			pathname: "/messages/Chat",
			params: { user: JSON.stringify({ id, name: name.trim(), avatar: { url: "" }, isBroadcast: true }) },
		});
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name="chevron-back" size={24} color="#000E08" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>New Broadcast List</Text>
				<TouchableOpacity onPress={handleCreate} disabled={!name.trim()}>
					<Text style={[styles.createText, !name.trim() && styles.createTextDisabled]}>Create</Text>
				</TouchableOpacity>
			</View>

			<TextInput
				style={styles.nameInput}
				placeholder="Broadcast List Name"
				placeholderTextColor="#797C7B"
				value={name}
				onChangeText={setName}
				autoFocus
			/>
			<Text style={styles.note}>
				{participants.length} recipient{participants.length === 1 ? "" : "s"} — messages you send here go to
				each of them individually, not into a shared group.
			</Text>
		</View>
	);
};

export default BroadcastCreateDetailsScreen;

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
	createText: {
		color: Colors.focused,
		fontWeight: "700",
		fontSize: 15,
	},
	createTextDisabled: {
		color: "#ccc",
	},
	nameInput: {
		marginHorizontal: 20,
		marginTop: 20,
		fontSize: 18,
		borderBottomWidth: 1,
		borderBottomColor: "#eee",
		paddingVertical: 8,
	},
	note: {
		marginHorizontal: 20,
		marginTop: 12,
		fontSize: 13,
		color: "#797C7B",
	},
});
