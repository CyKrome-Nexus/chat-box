import { useState } from "react";
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { createGroup, colorForParticipant } from "@/src/redux/features/chatsSlice";
import { IGroupParticipant } from "@/src/interfaces/list-interface";
import { IUser } from "@/src/interfaces/user-interface";
import Colors from "@/src/constants/Colors";

/** Step 2 of group creation: name, icon, description. See docs/architecture/groups.md. */
const GroupCreateDetailsScreen = () => {
	const dispatch = useDispatch();
	const params = useLocalSearchParams<{ participantsJson: string }>();
	const user = useSelector((state: { user: IUser | null }) => state.user);
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [avatarUrl, setAvatarUrl] = useState("");

	const participants: { id: string; name: string; avatarUrl?: string }[] = (() => {
		try {
			return JSON.parse(params.participantsJson || "[]");
		} catch {
			return [];
		}
	})();

	const pickIcon = async () => {
		const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (!permission.granted) return;
		const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
		if (!result.canceled && result.assets?.[0]) setAvatarUrl(result.assets[0].uri);
	};

	const handleCreate = () => {
		if (!name.trim()) return;

		const groupParticipants: IGroupParticipant[] = [
			{
				id: "me",
				name: user?.name || user?.username || "Me",
				avatar: { url: user?.avatar?.url || "" },
				role: "admin",
				color: colorForParticipant(0),
			},
			...participants.map((p, index) => ({
				id: p.id,
				name: p.name,
				avatar: { url: p.avatarUrl || "" },
				role: "member" as const,
				color: colorForParticipant(index + 1),
			})),
		];

		const id = `group-${Date.now()}`;
		dispatch(
			createGroup({
				id,
				name: name.trim(),
				avatar: { url: avatarUrl },
				description: description.trim() || undefined,
				participants: groupParticipants,
			})
		);

		router.replace({
			pathname: "/messages/Chat",
			params: { user: JSON.stringify({ id, name: name.trim(), avatar: { url: avatarUrl }, isGroup: true }) },
		});
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name="chevron-back" size={24} color="#000E08" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>New Group</Text>
				<TouchableOpacity onPress={handleCreate} disabled={!name.trim()}>
					<Text style={[styles.createText, !name.trim() && styles.createTextDisabled]}>Create</Text>
				</TouchableOpacity>
			</View>

			<View style={styles.iconRow}>
				<TouchableOpacity style={styles.iconCircle} onPress={pickIcon}>
					{avatarUrl ? (
						<Image source={{ uri: avatarUrl }} style={styles.iconImage} />
					) : (
						<Ionicons name="camera" size={26} color={Colors.focused} />
					)}
				</TouchableOpacity>
				<TextInput
					style={styles.nameInput}
					placeholder="Group Name"
					placeholderTextColor="#797C7B"
					value={name}
					onChangeText={setName}
					autoFocus
				/>
			</View>

			<TextInput
				style={styles.descriptionInput}
				placeholder="Group description (optional)"
				placeholderTextColor="#797C7B"
				value={description}
				onChangeText={setDescription}
				multiline
			/>

			<Text style={styles.participantsLabel}>Participants: {participants.length + 1}</Text>
		</View>
	);
};

export default GroupCreateDetailsScreen;

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
	iconRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 16,
		paddingHorizontal: 20,
		paddingVertical: 20,
	},
	iconCircle: {
		width: 72,
		height: 72,
		borderRadius: 36,
		backgroundColor: "#F2F8F7",
		justifyContent: "center",
		alignItems: "center",
		overflow: "hidden",
	},
	iconImage: {
		width: "100%",
		height: "100%",
	},
	nameInput: {
		flex: 1,
		fontSize: 18,
		borderBottomWidth: 1,
		borderBottomColor: "#eee",
		paddingVertical: 8,
	},
	descriptionInput: {
		marginHorizontal: 20,
		fontSize: 14,
		color: "#000E08",
		minHeight: 60,
		textAlignVertical: "top",
	},
	participantsLabel: {
		marginHorizontal: 20,
		marginTop: 20,
		fontSize: 13,
		color: "#797C7B",
	},
});
