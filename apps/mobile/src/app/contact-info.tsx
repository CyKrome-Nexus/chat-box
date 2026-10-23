import { useCallback, useEffect, useState } from "react";
import { ActionSheetIOS, Alert, Image, Platform, ScrollView, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useDispatch, useSelector, useStore } from "react-redux";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Attachment, PublicUser } from "@chatbox/shared";

import Avatar from "@/src/components/images/Avatar";
import { AppText, CircleButton, ScalePressable, palette, radii } from "@/src/components/ui";
import { errorMessage } from "@/src/lib/api/client";
import { timerToSeconds } from "@/src/lib/api/mappers";
import { conversationsApi, usersApi } from "@/src/lib/api/services";
import { callEngineManager } from "@/src/lib/calling/callEngineManager";
import { formatLastSeen } from "@/src/lib/format/time";
import { DISAPPEARING_TIMER_LABELS } from "@/src/lib/security/disappearingMessages";
import { applyConversation } from "@/src/lib/sync/chatSync";
import { openDirectConversation, removeContact, saveContact } from "@/src/lib/sync/contactsSync";
import type { IChatRibbon } from "@/src/interfaces/list-interface";
import type { RootState } from "@/src/redux/store/store";
import { patchChat } from "@/src/redux/features/chatsSlice";

const TIMERS: NonNullable<IChatRibbon["disappearingTimer"]>[] = ["off", "24h", "7d", "90d"];

const Field = ({ label, value }: { label: string; value?: string | null }) =>
	value ? (
		<View style={styles.field}>
			<AppText variant="label" weight="regular" tone="muted">
				{label}
			</AppText>
			<AppText variant="heading" weight="regular" selectable>
				{value}
			</AppText>
		</View>
	) : null;

// "User profile" from the Figma file: dark header with quick actions, details sheet and shared media.
const ContactInfoScreen = () => {
	const dispatch = useDispatch();
	const store = useStore<RootState>();
	const insets = useSafeAreaInsets();
	const params = useLocalSearchParams<{ userId?: string; conversationId?: string; user?: string }>();
	const legacy = (() => {
		try {
			return params.user ? (JSON.parse(params.user) as IChatRibbon) : null;
		} catch {
			return null;
		}
	})();
	const userId = params.userId ?? legacy?.peerId;
	const [conversationId, setConversationId] = useState(params.conversationId ?? legacy?.id);
	const chat = useSelector((state: RootState) => state.chats.chats.find((item) => item.id === conversationId));
	const online = useSelector((state: RootState) => (userId ? state.connection.presenceByUser[userId] === "online" : false));
	const [profile, setProfile] = useState<PublicUser | null>(null);
	const [media, setMedia] = useState<Attachment[]>([]);

	const load = useCallback(() => {
		if (userId) usersApi.get(userId).then(setProfile).catch(() => undefined);
		if (conversationId) {
			conversationsApi
				.media(conversationId, "media")
				.then((page) => setMedia(page.items.flatMap((message) => message.attachments.filter((item) => item.kind === "image" || item.kind === "video"))))
				.catch(() => undefined);
		}
	}, [userId, conversationId]);

	useEffect(load, [load]);

	const ensureConversation = async () => {
		if (conversationId) return conversationId;
		if (!userId) throw new Error("This contact is unavailable.");
		const id = await openDirectConversation(userId);
		setConversationId(id);
		return id;
	};

	const openChat = async () => {
		try {
			const conversation = await conversationsApi.get(await ensureConversation());
			applyConversation(conversation);
			const ribbon = store.getState().chats.chats.find((item) => item.id === conversation.id);
			router.push({ pathname: "/messages/Chat", params: { user: JSON.stringify(ribbon) } });
		} catch (error) {
			Alert.alert("Couldn't open chat", errorMessage(error));
		}
	};

	const call = async (type: "audio" | "video") => {
		try {
			const id = await ensureConversation();
			const target = store.getState().chats.chats.find((item) => item.id === id);
			if (!target) throw new Error("Open the chat once before calling.");
			await callEngineManager.startOutgoing(target, type);
		} catch (error) {
			Alert.alert("Call failed", errorMessage(error));
		}
	};

	const setTimer = async (timer: NonNullable<IChatRibbon["disappearingTimer"]>) => {
		const id = await ensureConversation();
		dispatch(patchChat({ chatId: id, patch: { disappearingTimer: timer } }));
		await conversationsApi.update(id, { disappearingSeconds: timerToSeconds(timer) }).then(applyConversation).catch((error: Error) => Alert.alert("Couldn't update", error.message));
	};

	const toggleBlock = async () => {
		if (!profile) return;
		try {
			if (profile.isBlocked) await usersApi.unblock(profile.id);
			else await usersApi.block(profile.id);
			setProfile({ ...profile, isBlocked: !profile.isBlocked });
		} catch (error) {
			Alert.alert("Couldn't update", errorMessage(error));
		}
	};

	const toggleContact = async () => {
		if (!profile) return;
		try {
			if (profile.isContact) await removeContact(profile.id);
			else await saveContact(profile.id);
			load();
		} catch (error) {
			Alert.alert("Couldn't update", errorMessage(error));
		}
	};

	const more = () => {
		const timerLabel = DISAPPEARING_TIMER_LABELS[chat?.disappearingTimer ?? "off"];
		const options = [
			{ label: profile?.isContact ? "Remove from contacts" : "Add to contacts", run: () => void toggleContact() },
			{ label: `Disappearing messages · ${timerLabel}`, run: () => Alert.alert("Disappearing messages", "New messages will disappear after:", [...TIMERS.map((timer) => ({ text: DISAPPEARING_TIMER_LABELS[timer], onPress: () => void setTimer(timer) })), { text: "Cancel", style: "cancel" as const }]) },
			{ label: "Chat wallpaper", run: () => conversationId && router.push({ pathname: "/settings-wallpaper", params: { conversationId, name: profile?.name ?? "" } }) },
			{ label: profile?.isBlocked ? `Unblock ${profile.name}` : `Block ${profile?.name ?? ""}`, run: () => void toggleBlock(), destructive: true },
		];
		if (Platform.OS === "ios") {
			ActionSheetIOS.showActionSheetWithOptions(
				{ options: [...options.map((option) => option.label), "Cancel"], cancelButtonIndex: options.length, destructiveButtonIndex: options.length - 1 },
				(index) => options[index]?.run()
			);
		} else {
			Alert.alert(profile?.name ?? "Options", undefined, [...options.map((option) => ({ text: option.label, onPress: option.run, style: option.destructive ? ("destructive" as const) : undefined })), { text: "Cancel", style: "cancel" }]);
		}
	};

	const name = profile?.name ?? legacy?.name ?? "Contact";
	const avatarUrl = profile?.avatarUrl ?? legacy?.avatar?.url;
	const preview = media.slice(0, 3);
	const extra = media.length - 3;

	return (
		<View style={styles.root}>
			<View style={[styles.top, { paddingTop: insets.top + 16 }]}>
				<CircleButton icon="arrow-back" label="Back" variant="plain" iconColor={palette.white} onPress={() => router.back()} style={styles.back} />
				<Animated.View entering={ZoomIn.springify().damping(16)}>
					<Avatar data={{ url: avatarUrl }} size={82} showStatus={online} statusColor={palette.online} />
				</Animated.View>
				<Animated.View entering={FadeIn.delay(80)} style={styles.identity}>
					<AppText variant="title" weight="bold" tone="inverse" align="center">
						{name}
					</AppText>
					<AppText variant="caption" align="center" style={styles.handle}>
						{profile?.handle ? `@${profile.handle}` : formatLastSeen(online, profile?.lastSeenAt ? Date.parse(profile.lastSeenAt) : undefined)}
					</AppText>
				</Animated.View>
				<Animated.View entering={FadeInDown.delay(120).springify().damping(18)} style={styles.actions}>
					<CircleButton icon="chatbubble-ellipses-outline" label="Message" variant="dark" onPress={() => void openChat()} />
					<CircleButton icon="videocam-outline" label="Video call" variant="dark" onPress={() => void call("video")} />
					<CircleButton icon="call-outline" label="Voice call" variant="dark" onPress={() => void call("audio")} />
					<CircleButton icon="ellipsis-horizontal" label="More options" variant="dark" onPress={more} />
				</Animated.View>
			</View>
			<Animated.View entering={FadeInDown.springify().damping(22)} style={styles.sheet}>
				<View style={styles.handleBar} />
				<ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
					<Field label="Display Name" value={name} />
					<Field label="Email Address" value={profile?.email} />
					<Field label="About" value={profile?.about} />
					<Field label="Phone Number" value={profile?.phone} />
					{profile?.isBlocked ? (
						<AppText variant="label" tone="danger">
							You've blocked this contact.
						</AppText>
					) : null}
					{media.length ? (
						<View style={styles.mediaBlock}>
							<View style={styles.mediaHeader}>
								<AppText variant="label" weight="regular" tone="muted">
									Media Shared
								</AppText>
								<ScalePressable accessibilityLabel="View all media" onPress={() => conversationId && router.push({ pathname: "/shared-media", params: { conversationId, name } })}>
									<AppText variant="label" weight="semibold" style={{ color: palette.brand }}>
										View All
									</AppText>
								</ScalePressable>
							</View>
							<View style={styles.mediaRow}>
								{preview.map((item, index) => (
									<View key={item.key} style={styles.thumb}>
										<Image source={{ uri: item.url }} style={StyleSheet.absoluteFill} />
										{index === 2 && extra > 0 ? (
											<View style={styles.more}>
												<AppText variant="body" weight="semibold" tone="inverse">
													{extra}+
												</AppText>
											</View>
										) : null}
									</View>
								))}
							</View>
						</View>
					) : null}
				</ScrollView>
			</Animated.View>
		</View>
	);
};

const styles = StyleSheet.create({
	root: { flex: 1, backgroundColor: palette.ink },
	top: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 32 },
	back: { position: "absolute", left: 16, top: 56 },
	identity: { marginTop: 12, gap: 4 },
	handle: { color: "#797C7B" },
	actions: { flexDirection: "row", gap: 20, marginTop: 20 },
	sheet: { flex: 1, backgroundColor: palette.white, borderTopLeftRadius: radii.sheet, borderTopRightRadius: radii.sheet },
	handleBar: { alignSelf: "center", width: 30, height: 3, borderRadius: 2, backgroundColor: "#E6E6E6", marginTop: 14 },
	sheetContent: { padding: 24, gap: 24, paddingBottom: 48 },
	field: { gap: 8 },
	mediaBlock: { gap: 16 },
	mediaHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
	mediaRow: { flexDirection: "row", gap: 12 },
	thumb: { width: 92, height: 92, borderRadius: radii.lg, overflow: "hidden", backgroundColor: palette.field },
	more: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
});

export default ContactInfoScreen;
