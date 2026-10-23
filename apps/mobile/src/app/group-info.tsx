import { useState, type ComponentProps } from "react";
import { Alert, ScrollView, Share, StyleSheet, Switch, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import Animated, { FadeIn, FadeInDown, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Conversation } from "@chatbox/shared";

import Avatar from "@/src/components/images/Avatar";
import { AppText, Chip, CircleButton, ScalePressable, fonts, palette, radii } from "@/src/components/ui";
import type { IGroupParticipant } from "@/src/interfaces/list-interface";
import { errorMessage } from "@/src/lib/api/client";
import { timerToSeconds } from "@/src/lib/api/mappers";
import { conversationsApi } from "@/src/lib/api/services";
import { buildGroupInviteDeepLink, buildGroupInviteDisplayLink } from "@/src/lib/groups/inviteLink";
import { DISAPPEARING_TIMER_LABELS } from "@/src/lib/security/disappearingMessages";
import { applyConversation, forgetConversation } from "@/src/lib/sync/chatSync";
import type { RootState } from "@/src/redux/store/store";

const TIMERS = ["off", "24h", "7d", "90d"] as const;
const ROLE_LABEL: Record<IGroupParticipant["role"], string> = { owner: "Owner", admin: "Admin", member: "" };

const Row = ({ icon, label, value, onPress, danger }: { icon: ComponentProps<typeof Ionicons>["name"]; label: string; value?: string; onPress: () => void; danger?: boolean }) => (
	<ScalePressable accessibilityLabel={label} onPress={onPress} scaleTo={0.985} style={styles.row}>
		<View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
			<Ionicons name={icon} size={20} color={danger ? palette.danger : palette.brandDark} />
		</View>
		<AppText variant="body" weight="medium" tone={danger ? "danger" : "default"} style={styles.flex}>
			{label}
		</AppText>
		{value ? (
			<AppText variant="caption" tone="muted">
				{value}
			</AppText>
		) : null}
	</ScalePressable>
);

const GroupInfoScreen = () => {
	const insets = useSafeAreaInsets();
	const params = useLocalSearchParams<{ chatId: string }>();
	const chat = useSelector((state: RootState) => state.chats.chats.find((c) => c.id === params.chatId));
	const [showQr, setShowQr] = useState(false);
	const [editingName, setEditingName] = useState<string | null>(null);

	if (!chat) return null;

	const participants = chat.participants ?? [];
	const isAdmin = chat.myRole === "owner" || chat.myRole === "admin";
	const isOwner = chat.myRole === "owner";
	const canEditInfo = isAdmin || chat.groupSettings?.whoCanEditInfo === "all";

	const run = async (task: () => Promise<Conversation | void>) => {
		try {
			const result = await task();
			if (result) applyConversation(result);
		} catch (error) {
			Alert.alert("Something went wrong", errorMessage(error));
		}
	};

	const participantActions = (participant: IGroupParticipant) => {
		if (!isAdmin || participant.id === "me" || participant.role === "owner") return;
		Alert.alert(participant.name, undefined, [
			{ text: "Cancel", style: "cancel" },
			participant.role === "admin"
				? { text: "Dismiss as admin", onPress: () => void run(() => conversationsApi.setRole(chat.id, participant.id, "member")) }
				: { text: "Make group admin", onPress: () => void run(() => conversationsApi.setRole(chat.id, participant.id, "admin")) },
			{ text: "Remove from group", style: "destructive", onPress: () => void run(() => conversationsApi.removeMember(chat.id, participant.id)) },
		]);
	};

	const saveName = () => {
		const name = editingName?.trim();
		setEditingName(null);
		if (name && name !== chat.name) void run(() => conversationsApi.update(chat.id, { name }));
	};

	const changePhoto = async () => {
		const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
		const asset = result.canceled ? undefined : result.assets[0];
		if (asset) await run(() => conversationsApi.setAvatar(chat.id, { uri: asset.uri, name: "group.jpg", type: asset.mimeType ?? "image/jpeg" }));
	};

	const setTimer = () =>
		Alert.alert("Disappearing messages", "New messages will disappear after:", [
			...TIMERS.map((timer) => ({
				text: DISAPPEARING_TIMER_LABELS[timer],
				onPress: () => void run(() => conversationsApi.update(chat.id, { disappearingSeconds: timerToSeconds(timer) })),
			})),
			{ text: "Cancel", style: "cancel" as const },
		]);

	const createInvite = () =>
		run(async () => {
			await conversationsApi.createInvite(chat.id);
			return conversationsApi.get(chat.id);
		});

	const leave = () =>
		Alert.alert("Leave group", `Leave "${chat.name}"?`, [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Leave",
				style: "destructive",
				onPress: () =>
					void conversationsApi
						.leave(chat.id)
						.then(() => {
							forgetConversation(chat.id);
							router.dismissAll();
						})
						.catch((error: unknown) => Alert.alert("Couldn't leave", errorMessage(error))),
			},
		]);

	const deleteGroup = () =>
		Alert.alert("Delete group", "Delete this group and its messages for everyone? This can't be undone.", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: () =>
					void conversationsApi
						.remove(chat.id, "everyone")
						.then(() => {
							forgetConversation(chat.id);
							router.dismissAll();
						})
						.catch((error: unknown) => Alert.alert("Couldn't delete", errorMessage(error))),
			},
		]);

	const inviteLink = chat.inviteCode ? buildGroupInviteDisplayLink(chat.inviteCode) : null;

	return (
		<View style={[styles.root, { paddingTop: insets.top + 8 }]}>
			<View style={styles.header}>
				<CircleButton icon="arrow-back" label="Back" variant="plain" onPress={() => router.back()} />
				<AppText variant="heading" align="center" style={styles.flex}>
					Group Info
				</AppText>
				<View style={styles.spacer} />
			</View>
			<ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
				<Animated.View entering={FadeIn} style={styles.profile}>
					<ScalePressable accessibilityLabel="Change group photo" disabled={!canEditInfo} onPress={() => void changePhoto()} style={{ opacity: 1 }}>
						<Avatar data={chat.avatar} size={96} />
						{canEditInfo ? (
							<View style={styles.cameraBadge}>
								<Ionicons name="camera" size={14} color={palette.white} />
							</View>
						) : null}
					</ScalePressable>
					{editingName !== null ? (
						<TextInput value={editingName} onChangeText={setEditingName} onSubmitEditing={saveName} onBlur={saveName} autoFocus maxLength={64} style={styles.nameInput} />
					) : (
						<ScalePressable accessibilityLabel="Rename group" disabled={!canEditInfo} onPress={() => setEditingName(chat.name)} style={{ opacity: 1 }}>
							<AppText variant="title" weight="semibold" align="center">
								{chat.name}
							</AppText>
						</ScalePressable>
					)}
					<AppText variant="caption" tone="muted">
						Group · {participants.length} members
					</AppText>
					{chat.groupDescription ? (
						<AppText variant="label" weight="regular" tone="muted" align="center">
							{chat.groupDescription}
						</AppText>
					) : null}
					{chat.groupTags?.length ? (
						<View style={styles.tags}>
							{chat.groupTags.map((tag) => (
								<Chip key={tag} label={tag} />
							))}
						</View>
					) : null}
				</Animated.View>

				{isAdmin ? (
					<Animated.View entering={FadeInDown.springify().damping(20)} style={styles.card}>
						<AppText variant="label" tone="muted">
							Invite via link
						</AppText>
						{inviteLink && chat.inviteCode ? (
							<>
								<AppText variant="label" tone="brand" numberOfLines={1}>
									{inviteLink}
								</AppText>
								<View style={styles.inviteActions}>
									<CircleButton icon="share-outline" label="Share invite" onPress={() => void Share.share({ message: `Join "${chat.name}" on Chatbox: ${inviteLink}` })} />
									<CircleButton icon="copy-outline" label="Copy invite" onPress={() => void Clipboard.setStringAsync(inviteLink).then(() => Alert.alert("Copied", "Invite link copied."))} />
									<CircleButton icon="qr-code-outline" label="Show QR" onPress={() => setShowQr((value) => !value)} />
									<CircleButton icon="refresh-outline" label="Reset link" iconColor={palette.danger} onPress={() => Alert.alert("Reset invite link?", "The old link will stop working.", [{ text: "Cancel", style: "cancel" }, { text: "Reset", style: "destructive", onPress: () => void createInvite() }])} />
								</View>
								{showQr ? (
									<Animated.View entering={FadeIn} style={styles.qr}>
										<QRCode value={buildGroupInviteDeepLink(chat.inviteCode)} size={160} />
									</Animated.View>
								) : null}
							</>
						) : (
							<Row icon="link-outline" label="Create invite link" onPress={() => void createInvite()} />
						)}
					</Animated.View>
				) : null}

				<View style={styles.card}>
					{isAdmin ? (
						<View style={styles.switchRow}>
							<AppText variant="body" weight="medium" style={styles.flex}>
								Only admins can send messages
							</AppText>
							<Switch
								value={chat.groupSettings?.whoCanSendMessages === "admins"}
								onValueChange={(value) => void run(() => conversationsApi.update(chat.id, { settings: { onlyAdminsCanSend: value } }))}
								trackColor={{ true: palette.brand, false: "#E4EAE9" }}
							/>
						</View>
					) : null}
					<Row icon="timer-outline" label="Disappearing messages" value={DISAPPEARING_TIMER_LABELS[chat.disappearingTimer ?? "off"]} onPress={setTimer} />
					<Row icon="images-outline" label="Shared media" onPress={() => router.push({ pathname: "/shared-media", params: { conversationId: chat.id, name: chat.name } })} />
					<Row icon="image-outline" label="Chat wallpaper" onPress={() => router.push({ pathname: "/settings-wallpaper", params: { conversationId: chat.id, name: chat.name } })} />
				</View>

				<View style={styles.membersHeader}>
					<AppText variant="label" tone="muted">
						{participants.length} members
					</AppText>
					{isAdmin || chat.groupSettings?.requireAdminApproval === false ? (
						<ScalePressable accessibilityLabel="Add members" onPress={() => router.push({ pathname: "/contact-picker", params: { mode: "add", chatId: chat.id } })} style={styles.addMembers}>
							<Ionicons name="person-add-outline" size={18} color={palette.brand} />
							<AppText variant="label" style={{ color: palette.brand }}>
								Add
							</AppText>
						</ScalePressable>
					) : null}
				</View>
				{participants.map((participant) => (
					<Animated.View key={participant.id} layout={LinearTransition.springify().damping(22)}>
						<ScalePressable accessibilityLabel={participant.name} onPress={() => participantActions(participant)} scaleTo={0.985} style={styles.member}>
							<Avatar data={participant.avatar} size={44} />
							<AppText variant="body" weight="medium" style={styles.flex} numberOfLines={1}>
								{participant.name}
							</AppText>
							{ROLE_LABEL[participant.role] ? (
								<View style={styles.roleBadge}>
									<AppText variant="caption" tone="brand">
										{ROLE_LABEL[participant.role]}
									</AppText>
								</View>
							) : null}
						</ScalePressable>
					</Animated.View>
				))}

				<View style={styles.card}>
					<Row icon="log-out-outline" label="Leave group" onPress={leave} danger />
					{isOwner ? <Row icon="trash-outline" label="Delete group for everyone" onPress={deleteGroup} danger /> : null}
				</View>
			</ScrollView>
		</View>
	);
};

export default GroupInfoScreen;

const styles = StyleSheet.create({
	root: { flex: 1, backgroundColor: palette.white },
	flex: { flex: 1 },
	header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16 },
	spacer: { width: 44 },
	content: { paddingHorizontal: 24, gap: 16 },
	profile: { alignItems: "center", gap: 8, paddingVertical: 16 },
	cameraBadge: { position: "absolute", right: 0, bottom: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: palette.brand, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: palette.white },
	nameInput: { fontFamily: fonts.semibold, fontSize: 20, textAlign: "center", borderBottomWidth: 1.5, borderBottomColor: palette.brand, minWidth: 160, paddingVertical: 4 },
	tags: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 4 },
	card: { borderRadius: radii.xl, backgroundColor: "#F8FAFA", padding: 16, gap: 8 },
	inviteActions: { flexDirection: "row", gap: 12, marginTop: 4 },
	qr: { alignItems: "center", paddingVertical: 12 },
	switchRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
	row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
	rowIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.brandSoft, alignItems: "center", justifyContent: "center" },
	rowIconDanger: { backgroundColor: "#FDECEC" },
	membersHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
	addMembers: { flexDirection: "row", alignItems: "center", gap: 6 },
	member: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
	roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.full, backgroundColor: palette.brandSoft },
});
