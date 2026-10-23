import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LIMITS, handleSchema } from "@chatbox/shared";

import Avatar from "@/src/components/images/Avatar";
import { AppText, CircleButton, PrimaryButton, ScalePressable, UnderlineField, palette } from "@/src/components/ui";
import { errorMessage } from "@/src/lib/api/client";
import { toLocalUser } from "@/src/lib/api/mappers";
import { usersApi } from "@/src/lib/api/services";
import { useAvatarPicker } from "@/src/hooks/useAvatarPicker";
import type { RootState } from "@/src/redux/store/store";
import { updateUser } from "@/src/redux/features/userSlice";

type THandleState = "idle" | "checking" | "available" | "taken" | "invalid";

const Profile = () => {
	const dispatch = useDispatch();
	const insets = useSafeAreaInsets();
	const user = useSelector((state: RootState) => state.user);
	const { pickAvatar } = useAvatarPicker();
	const [name, setName] = useState(user?.name ?? "");
	const [about, setAbout] = useState(user?.about ?? "");
	const [handle, setHandle] = useState(user?.handle ?? "");
	const [handleState, setHandleState] = useState<THandleState>("idle");
	const [handleError, setHandleError] = useState<string | undefined>();
	const [saving, setSaving] = useState(false);
	const [uploading, setUploading] = useState(false);

	useEffect(() => {
		const draft = handle.trim();
		if (!draft || draft.toLowerCase() === (user?.handle ?? "")) {
			setHandleState("idle");
			setHandleError(undefined);
			return;
		}
		const parsed = handleSchema.safeParse(draft);
		if (!parsed.success) {
			setHandleState("invalid");
			setHandleError(parsed.error.issues[0]?.message);
			return;
		}
		setHandleState("checking");
		setHandleError(undefined);
		const timer = setTimeout(() => {
			usersApi
				.handleAvailable(parsed.data)
				.then((available) => {
					setHandleState(available ? "available" : "taken");
					setHandleError(available ? undefined : "That username is taken");
				})
				.catch(() => setHandleState("idle"));
		}, 400);
		return () => clearTimeout(timer);
	}, [handle, user?.handle]);

	const dirty = name.trim() !== (user?.name ?? "") || about.trim() !== (user?.about ?? "") || handle.trim().toLowerCase() !== (user?.handle ?? "");
	const canSave = dirty && name.trim().length > 0 && handleState !== "invalid" && handleState !== "taken" && handleState !== "checking";

	const save = async () => {
		setSaving(true);
		try {
			const updated = await usersApi.updateMe({ name: name.trim(), about: about.trim() || null, handle: handle.trim() ? handle.trim().toLowerCase() : null });
			dispatch(updateUser(toLocalUser(updated)));
			router.back();
		} catch (error) {
			Alert.alert("Couldn't save profile", errorMessage(error));
		} finally {
			setSaving(false);
		}
	};

	const changePhoto = () =>
		Alert.alert("Profile photo", undefined, [
			{ text: "Take photo", onPress: () => void upload("camera") },
			{ text: "Choose from library", onPress: () => void upload("gallery") },
			{ text: "Cancel", style: "cancel" },
		]);

	const upload = async (source: "camera" | "gallery") => {
		const uri = await pickAvatar(source);
		if (!uri) return;
		setUploading(true);
		try {
			const updated = await usersApi.uploadAvatar({ uri, name: "avatar.jpg", type: "image/jpeg" });
			dispatch(updateUser(toLocalUser(updated)));
		} catch (error) {
			Alert.alert("Couldn't update photo", errorMessage(error));
		} finally {
			setUploading(false);
		}
	};

	const handleHint = {
		idle: user?.handle ? "This is your public username" : "Lets people find you without your phone number",
		checking: "Checking…",
		available: "Available",
		taken: undefined,
		invalid: undefined,
	}[handleState];

	return (
		<KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
			<View style={[styles.root, { paddingTop: insets.top + 8 }]}>
				<View style={styles.header}>
					<CircleButton icon="arrow-back" label="Back" variant="plain" onPress={() => router.back()} />
					<AppText variant="heading" align="center" style={styles.flex}>
						Edit profile
					</AppText>
					<CircleButton icon="qr-code-outline" label="My QR code" variant="plain" iconColor={palette.brandDark} onPress={() => router.push("/qr-code")} />
				</View>
				<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
					<Animated.View entering={ZoomIn.springify().damping(15)} style={styles.avatarWrap}>
						<ScalePressable accessibilityLabel="Change profile photo" onPress={changePhoto}>
							<Avatar data={user?.avatar} size={112} />
							<View style={styles.cameraBadge}>
								{uploading ? <ActivityIndicator size="small" color={palette.white} /> : <Ionicons name="camera" size={16} color={palette.white} />}
							</View>
						</ScalePressable>
					</Animated.View>
					<Animated.View entering={FadeIn.delay(100)} style={styles.form}>
						<UnderlineField label="Display name" value={name} onChangeText={setName} maxLength={LIMITS.nameMax} />
						<View>
							<UnderlineField label="Username" value={handle} onChangeText={(value) => setHandle(value.replace(/\s/g, ""))} autoCapitalize="none" autoCorrect={false} maxLength={LIMITS.handleMax} error={handleError} />
							{handleHint ? (
								<AppText variant="caption" tone={handleState === "available" ? "brand" : "muted"} style={styles.hint}>
									{handleHint}
								</AppText>
							) : null}
						</View>
						<UnderlineField label="About" value={about} onChangeText={setAbout} maxLength={LIMITS.aboutMax} placeholder="Never give up 💪" />
						<View style={styles.readonly}>
							<AppText variant="label" tone="brand">
								{user?.email ? "Email" : "Phone"}
							</AppText>
							<AppText variant="body">{user?.email ?? user?.phone ?? "—"}</AppText>
						</View>
					</Animated.View>
				</ScrollView>
				<View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
					<PrimaryButton title="Save" onPress={() => void save()} disabled={!canSave} loading={saving} />
				</View>
			</View>
		</KeyboardAvoidingView>
	);
};

export default Profile;

const styles = StyleSheet.create({
	flex: { flex: 1 },
	root: { flex: 1, backgroundColor: palette.white },
	header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16 },
	content: { paddingHorizontal: 24, paddingBottom: 24 },
	avatarWrap: { alignItems: "center", marginVertical: 24 },
	cameraBadge: { position: "absolute", right: 4, bottom: 4, width: 34, height: 34, borderRadius: 17, backgroundColor: palette.brand, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: palette.white },
	form: { gap: 28 },
	hint: { marginTop: 6 },
	readonly: { gap: 6 },
	footer: { paddingHorizontal: 24, paddingTop: 8 },
});
