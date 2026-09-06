import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { IUsernameRecord, lookupByHandle } from "@/src/lib/username/usernameRegistry";
import Colors from "@/src/constants/Colors";

/**
 * Public profile-link landing screen — `chat-box://u/[handle]` (the app's
 * own custom scheme, the same honest substitute for a real universal-link
 * domain used by `join/[code].tsx` for group invites; `chatbox.link`/
 * `chatbox.me` aren't real registered domains in this environment). Opening
 * `https://chatbox.link/@handle` or `https://chatbox.me/handle` on a device
 * with the app installed would resolve to this same route via a real
 * universal link association, which is the deep-link config this repo can't
 * stand up without owning those domains — see docs/architecture/
 * username-system.md.
 */
const UserProfileLinkScreen = () => {
	const params = useLocalSearchParams<{ handle: string }>();
	const [status, setStatus] = useState<"loading" | "found" | "not-found">("loading");
	const [record, setRecord] = useState<IUsernameRecord | null>(null);

	useEffect(() => {
		let cancelled = false;
		lookupByHandle(params.handle || "").then((result) => {
			if (cancelled) return;
			setRecord(result);
			setStatus(result ? "found" : "not-found");
		});
		return () => {
			cancelled = true;
		};
	}, [params.handle]);

	const openChat = () => {
		if (!record) return;
		router.replace({
			pathname: "/messages/Chat",
			params: {
				user: JSON.stringify({
					id: record.userId,
					name: record.name,
					handle: record.handle,
					avatar: { url: record.avatarUrl || "" },
				}),
			},
		});
	};

	return (
		<View style={styles.container}>
			{status === "loading" && <ActivityIndicator size="large" color={Colors.focused} />}

			{status === "not-found" && (
				<>
					<Ionicons name="close-circle-outline" size={48} color="#F04A4C" />
					<Text style={styles.title}>@{params.handle} isn't a registered Chatbox username</Text>
				</>
			)}

			{status === "found" && record && (
				<>
					<Ionicons name="person-circle-outline" size={64} color={Colors.focused} />
					<Text style={styles.title}>{record.name}</Text>
					<Text style={styles.subtitle}>@{record.handle}</Text>
					<TouchableOpacity style={styles.button} onPress={openChat}>
						<Text style={styles.buttonText}>Start Chat</Text>
					</TouchableOpacity>
				</>
			)}

			<TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
				<Text style={styles.cancelText}>Cancel</Text>
			</TouchableOpacity>
		</View>
	);
};

export default UserProfileLinkScreen;

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
		fontSize: 14,
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
