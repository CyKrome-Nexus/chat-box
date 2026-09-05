import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import { joinGroupByInviteCode } from "@/src/redux/features/chatsSlice";
import { IChatRibbon } from "@/src/interfaces/list-interface";
import { IUser } from "@/src/interfaces/user-interface";
import Colors from "@/src/constants/Colors";

/**
 * Group invite-link landing screen — `chat-box://join/[code]` (or
 * `chatbox.link/join/[code]` via a universal link, not configured in this
 * environment). See docs/architecture/groups.md for why this can only be
 * demonstrated on the same device rather than a real second invitee.
 */
const JoinGroupScreen = () => {
	const dispatch = useDispatch();
	const params = useLocalSearchParams<{ code: string }>();
	const user = useSelector((state: { user: IUser | null }) => state.user);
	const chats = useSelector((state: any) => state.chats.chats as IChatRibbon[]);
	const [joined, setJoined] = useState(false);

	const group = chats.find((c) => c.inviteCode === params.code);

	useEffect(() => {
		if (!group || joined) return;
		const alreadyMember = group.participants?.some((p) => p.id === "me");
		if (alreadyMember) setJoined(true);
	}, [group, joined]);

	const handleJoin = () => {
		if (!group) return;
		dispatch(
			joinGroupByInviteCode({
				inviteCode: params.code,
				me: {
					id: "me",
					name: user?.name || user?.username || "Me",
					avatar: { url: user?.avatar?.url || "" },
					role: "member",
					color: "#2E86C1",
				},
			})
		);
		setJoined(true);
	};

	const openChat = () => {
		if (!group) return;
		router.replace({ pathname: "/messages/Chat", params: { user: JSON.stringify(group) } });
	};

	return (
		<View style={styles.container}>
			{!group ? (
				<>
					<Ionicons name="close-circle-outline" size={48} color="#F04A4C" />
					<Text style={styles.title}>Invalid or expired invite link</Text>
				</>
			) : (
				<>
					<Ionicons name="people-circle-outline" size={64} color={Colors.focused} />
					<Text style={styles.title}>{group.name}</Text>
					<Text style={styles.subtitle}>{group.participants?.length || 0} participants</Text>
					{joined ? (
						<TouchableOpacity style={styles.button} onPress={openChat}>
							<Text style={styles.buttonText}>Open Chat</Text>
						</TouchableOpacity>
					) : (
						<TouchableOpacity style={styles.button} onPress={handleJoin}>
							<Text style={styles.buttonText}>Join Group</Text>
						</TouchableOpacity>
					)}
				</>
			)}
			<TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
				<Text style={styles.cancelText}>Cancel</Text>
			</TouchableOpacity>
		</View>
	);
};

export default JoinGroupScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
		justifyContent: "center",
		alignItems: "center",
		gap: 10,
		paddingHorizontal: 40,
	},
	title: {
		fontSize: 18,
		fontWeight: "700",
		color: "#000E08",
		textAlign: "center",
	},
	subtitle: {
		fontSize: 13,
		color: "#797C7B",
	},
	button: {
		marginTop: 20,
		backgroundColor: Colors.focused,
		paddingHorizontal: 32,
		paddingVertical: 14,
		borderRadius: 24,
	},
	buttonText: {
		color: "#fff",
		fontWeight: "700",
	},
	cancelText: {
		color: "#797C7B",
	},
});
