import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { ZoomIn } from "react-native-reanimated";

import type { InvitePreview } from "@chatbox/shared";

import Avatar from "@/src/components/images/Avatar";
import { AppText, PrimaryButton, palette } from "@/src/components/ui";
import { errorMessage } from "@/src/lib/api/client";
import { toChatRibbon } from "@/src/lib/api/mappers";
import { conversationsApi } from "@/src/lib/api/services";
import { applyConversation } from "@/src/lib/sync/chatSync";
import { store } from "@/src/redux/store/store";

// Group invite deep link: preview the group, then join through the API.
const JoinGroupScreen = () => {
	const { code = "" } = useLocalSearchParams<{ code: string }>();
	const [preview, setPreview] = useState<InvitePreview | null>(null);
	const [missing, setMissing] = useState(false);
	const [joining, setJoining] = useState(false);

	useEffect(() => {
		conversationsApi.previewInvite(code).then(setPreview).catch(() => setMissing(true));
	}, [code]);

	const open = async (conversationId: string) => {
		const conversation = await conversationsApi.get(conversationId);
		applyConversation(conversation);
		router.replace({ pathname: "/messages/Chat", params: { user: JSON.stringify(toChatRibbon(conversation, store.getState().user?.id ?? "")) } });
	};

	const join = async () => {
		if (!preview) return;
		setJoining(true);
		try {
			if (!preview.alreadyMember) await conversationsApi.joinInvite(code);
			await open(preview.conversationId);
		} catch (error) {
			Alert.alert("Couldn't join", errorMessage(error));
		} finally {
			setJoining(false);
		}
	};

	return (
		<View style={styles.container}>
			{missing ? (
				<>
					<Ionicons name="link-outline" size={48} color={palette.danger} />
					<AppText variant="heading" align="center">
						This invite link is invalid or has been reset
					</AppText>
					<PrimaryButton title="Go back" onPress={() => router.back()} style={styles.button} />
				</>
			) : !preview ? (
				<ActivityIndicator size="large" color={palette.brand} />
			) : (
				<Animated.View entering={ZoomIn.springify().damping(15)} style={styles.card}>
					<Avatar data={{ url: preview.avatarUrl ?? undefined }} size={96} />
					<AppText variant="title" weight="semibold" align="center">
						{preview.name}
					</AppText>
					<AppText variant="label" weight="regular" tone="muted">
						{preview.memberCount} members
					</AppText>
					{preview.description ? (
						<AppText variant="label" weight="regular" tone="muted" align="center">
							{preview.description}
						</AppText>
					) : null}
					<PrimaryButton title={preview.alreadyMember ? "Open group" : "Join group"} onPress={() => void join()} loading={joining} style={styles.button} />
					<PrimaryButton title="Cancel" variant="light" onPress={() => router.back()} style={styles.button} />
				</Animated.View>
			)}
		</View>
	);
};

export default JoinGroupScreen;

const styles = StyleSheet.create({
	container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16, backgroundColor: palette.white },
	card: { alignItems: "center", gap: 10, alignSelf: "stretch" },
	button: { alignSelf: "stretch", marginTop: 8 },
});
