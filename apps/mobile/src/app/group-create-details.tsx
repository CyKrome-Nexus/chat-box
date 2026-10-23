import { useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LIMITS } from "@chatbox/shared";

import Avatar from "@/src/components/images/Avatar";
import { AppText, Chip, CircleButton, PrimaryButton, ScalePressable, fonts, palette } from "@/src/components/ui";
import { errorMessage } from "@/src/lib/api/client";
import { toChatRibbon } from "@/src/lib/api/mappers";
import { conversationsApi } from "@/src/lib/api/services";
import { applyConversation } from "@/src/lib/sync/chatSync";
import type { RootState } from "@/src/redux/store/store";
import type { IPickedUser } from "./contact-picker";

const SUGGESTED_TAGS = ["Group work", "Team relationship", "Family", "Friends"];

// Figma "Create Group": big title, tag chips, admin row and invited members.
const GroupCreateDetailsScreen = () => {
	const insets = useSafeAreaInsets();
	const params = useLocalSearchParams<{ participantsJson: string }>();
	const user = useSelector((state: RootState) => state.user);
	const [name, setName] = useState("");
	const [tags, setTags] = useState<string[]>([]);
	const [tagDraft, setTagDraft] = useState("");
	const [avatarUri, setAvatarUri] = useState<string | null>(null);
	const [creating, setCreating] = useState(false);

	const participants: IPickedUser[] = (() => {
		try {
			return JSON.parse(params.participantsJson || "[]") as IPickedUser[];
		} catch {
			return [];
		}
	})();

	const toggleTag = (tag: string) =>
		setTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : current.length < LIMITS.groupTagsMax ? [...current, tag] : current));

	const addTag = () => {
		const tag = tagDraft.trim().slice(0, LIMITS.groupTagMax);
		if (tag && !tags.includes(tag)) toggleTag(tag);
		setTagDraft("");
	};

	const pickIcon = async () => {
		const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (!permission.granted) return;
		const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
		if (!result.canceled && result.assets[0]) setAvatarUri(result.assets[0].uri);
	};

	const create = async () => {
		if (!name.trim() || creating) return;
		setCreating(true);
		try {
			let conversation = await conversationsApi.createGroup({ name: name.trim(), tags, memberIds: participants.map((participant) => participant.id) });
			if (avatarUri) {
				conversation = await conversationsApi
					.setAvatar(conversation.id, { uri: avatarUri, name: "group.jpg", type: "image/jpeg" })
					.catch(() => conversation);
			}
			applyConversation(conversation);
			router.dismissAll();
			router.push({ pathname: "/messages/Chat", params: { user: JSON.stringify(toChatRibbon(conversation, user?.id ?? "")) } });
		} catch (error) {
			Alert.alert("Couldn't create group", errorMessage(error));
		} finally {
			setCreating(false);
		}
	};

	return (
		<KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
			<View style={[styles.root, { paddingTop: insets.top + 8 }]}>
				<View style={styles.header}>
					<CircleButton icon="arrow-back" label="Back" variant="plain" onPress={() => router.back()} />
					<AppText variant="heading" align="center" style={styles.flex}>
						Create Group
					</AppText>
					<View style={styles.spacer} />
				</View>
				<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
					<View style={styles.titleRow}>
						<View style={styles.flex}>
							<AppText variant="body" tone="muted">
								Group Description
							</AppText>
							<TextInput
								value={name}
								onChangeText={setName}
								placeholder="Make Group for Team Work"
								placeholderTextColor="#C9CFCD"
								maxLength={LIMITS.groupNameMax}
								multiline
								autoFocus
								style={styles.title}
							/>
						</View>
						<ScalePressable accessibilityLabel="Choose group photo" onPress={() => void pickIcon()} style={styles.photo}>
							{avatarUri ? <Image source={{ uri: avatarUri }} style={styles.photoImage} /> : <Ionicons name="camera-outline" size={24} color={palette.brandDark} />}
						</ScalePressable>
					</View>
					<View style={styles.tags}>
						{[...new Set([...SUGGESTED_TAGS, ...tags])].map((tag) => (
							<Chip key={tag} label={tag} selected={tags.includes(tag)} onPress={() => toggleTag(tag)} />
						))}
						<TextInput value={tagDraft} onChangeText={setTagDraft} onSubmitEditing={addTag} placeholder="+ Tag" placeholderTextColor={palette.muted} style={styles.tagInput} returnKeyType="done" />
					</View>

					<AppText variant="body" tone="muted" style={styles.section}>
						Group Admin
					</AppText>
					<View style={styles.admin}>
						<Avatar data={user?.avatar} size={52} />
						<View>
							<AppText variant="body" weight="medium">
								{user?.name}
							</AppText>
							<AppText variant="caption" tone="muted">
								Group Admin
							</AppText>
						</View>
					</View>

					<AppText variant="body" tone="muted" style={styles.section}>
						Invited Members
					</AppText>
					<View style={styles.members}>
						{participants.map((participant, index) => (
							<Animated.View key={participant.id} entering={ZoomIn.delay(index * 40).springify().damping(15)} style={styles.member}>
								<Avatar data={{ url: participant.avatarUrl }} size={70} />
								<AppText variant="caption" numberOfLines={1} align="center">
									{participant.name.split(" ")[0]}
								</AppText>
							</Animated.View>
						))}
						<Animated.View entering={FadeInDown} style={styles.member}>
							<ScalePressable accessibilityLabel="Add more members" onPress={() => router.back()} style={styles.addMember}>
								<Ionicons name="add" size={28} color="#C9CFCD" />
							</ScalePressable>
						</Animated.View>
					</View>
				</ScrollView>
				<View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
					<PrimaryButton title="Create" onPress={() => void create()} disabled={!name.trim()} loading={creating} />
				</View>
			</View>
		</KeyboardAvoidingView>
	);
};

export default GroupCreateDetailsScreen;

const styles = StyleSheet.create({
	flex: { flex: 1 },
	root: { flex: 1, backgroundColor: palette.white },
	header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16 },
	spacer: { width: 44 },
	content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
	titleRow: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
	title: { fontFamily: fonts.medium, fontSize: 36, lineHeight: 44, color: palette.ink, marginTop: 8 },
	photo: { width: 56, height: 56, borderRadius: 28, backgroundColor: palette.brandSoft, alignItems: "center", justifyContent: "center", overflow: "hidden", marginTop: 28 },
	photoImage: { width: 56, height: 56 },
	tags: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 20 },
	tagInput: { fontFamily: fonts.regular, fontSize: 14, minWidth: 70, paddingHorizontal: 12, paddingVertical: 8 },
	section: { marginTop: 28, marginBottom: 12 },
	admin: { flexDirection: "row", alignItems: "center", gap: 14 },
	members: { flexDirection: "row", flexWrap: "wrap", gap: 18 },
	member: { width: 70, gap: 6 },
	addMember: { width: 70, height: 70, borderRadius: 35, borderWidth: 1, borderStyle: "dashed", borderColor: "#C9CFCD", alignItems: "center", justifyContent: "center" },
	footer: { paddingHorizontal: 24, paddingTop: 8 },
});
