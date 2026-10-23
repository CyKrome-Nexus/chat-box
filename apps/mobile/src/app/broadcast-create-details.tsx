import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { errorMessage } from "@/src/lib/api/client";
import { openDirectConversation } from "@/src/lib/sync/contactsSync";
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

	const [creating, setCreating] = useState(false);

	const handleCreate = async () => {
		if (!name.trim() || creating) return;
		setCreating(true);
		try {
			const recipientIds = await Promise.all(participants.map((participant) => openDirectConversation(participant.id)));
			const id = `broadcast-${Date.now()}`;
			dispatch(createBroadcastList({ id, name: name.trim(), recipientIds }));
			router.dismissAll();
			router.push({
				pathname: "/messages/Chat",
				params: { user: JSON.stringify({ id, name: name.trim(), avatar: { url: "" }, isBroadcast: true, broadcastRecipientIds: recipientIds }) },
			});
		} catch (error) {
			Alert.alert("Couldn't create list", errorMessage(error));
		} finally {
			setCreating(false);
		}
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name="chevron-back" size={24} color="#000E08" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>New Broadcast List</Text>
				<TouchableOpacity onPress={() => void handleCreate()} disabled={!name.trim() || creating}>
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
