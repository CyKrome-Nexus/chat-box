import { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";

import SettingsScreenHeader from "@/src/components/settings/SettingsScreenHeader";
import GestureSlider from "@/src/components/common/GestureSlider";
import ChatWallpaperDoodle from "@/src/components/messages/ChatWallpaperDoodle";
import { useAppTheme } from "@/src/lib/theme/ThemeContext";
import { DOODLE_TINT_PRESETS, GRADIENT_PRESETS } from "@/src/lib/wallpaper/wallpaperPresets";
import { DEFAULT_WALLPAPER, IWallpaperConfig, TWallpaperKind } from "@/src/lib/wallpaper/wallpaperTypes";
import { clearChatWallpaper, setChatWallpaper, setGlobalWallpaper } from "@/src/redux/features/settingsSlice";

const KIND_TABS: { key: TWallpaperKind; label: string }[] = [
	{ key: "none", label: "None" },
	{ key: "doodle", label: "Doodle" },
	{ key: "gradient", label: "Gradient" },
	{ key: "photo", label: "Photo" },
];

const SOLID_PRESETS = ["#FFFFFF", "#181818", "#000000", "#F5ECD9", "#EAF4F2", "#1B2A2E"];

/**
 * Reached either as the app-wide default (from Settings -> Chat -> Chat
 * Wallpaper) or as a per-chat override (from Contact Info -> Wallpaper &
 * Sound, with `?conversationId=...`). Same screen either way — only the
 * save target differs.
 */
const SettingsWallpaper = () => {
	const dispatch = useDispatch();
	const theme = useAppTheme();
	const params = useLocalSearchParams<{ conversationId?: string; name?: string }>();
	const conversationId = params.conversationId;

	const globalWallpaper: IWallpaperConfig = useSelector((state: any) => state.settings.wallpaper.global);
	const perChatWallpaper: IWallpaperConfig | undefined = useSelector(
		(state: any) => (conversationId ? state.settings.wallpaper.perChat[conversationId] : undefined)
	);
	const isPerChat = !!conversationId;
	const hasOverride = isPerChat && !!perChatWallpaper;
	const baseline = (isPerChat ? perChatWallpaper : undefined) || globalWallpaper || DEFAULT_WALLPAPER;

	const [draft, setDraft] = useState<IWallpaperConfig>(baseline);

	const save = (next: IWallpaperConfig) => {
		setDraft(next);
		if (isPerChat && conversationId) {
			dispatch(setChatWallpaper({ conversationId, config: next }));
		} else {
			dispatch(setGlobalWallpaper(next));
		}
	};

	const handlePickPhoto = async () => {
		const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (!permission.granted) {
			Alert.alert("Photos access needed", "Enable access in Settings to pick a wallpaper from your gallery.");
			return;
		}
		const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 });
		if (result.canceled || !result.assets?.[0]) return;
		save({ ...draft, kind: "photo", photoUri: result.assets[0].uri, blur: draft.blur ?? 0, dim: draft.dim ?? 0 });
	};

	const handleResetToDefault = () => {
		if (!conversationId) return;
		dispatch(clearChatWallpaper(conversationId));
		setDraft(globalWallpaper || DEFAULT_WALLPAPER);
	};

	const preview = useMemo(() => {
		if (draft.kind === "none") {
			return <View style={[styles.previewFill, { backgroundColor: theme.colors.background }]} />;
		}
		if (draft.kind === "doodle") {
			return (
				<View style={[styles.previewFill, { backgroundColor: theme.colors.background }]}>
					<ChatWallpaperDoodle tint={draft.doodleColor || theme.accent} opacity={0.16} />
				</View>
			);
		}
		if (draft.kind === "solid") {
			return <View style={[styles.previewFill, { backgroundColor: draft.solidColor || theme.colors.background }]} />;
		}
		if (draft.kind === "gradient") {
			const preset = GRADIENT_PRESETS.find((g) => g.key === draft.gradientKey) || GRADIENT_PRESETS[0];
			return <LinearGradient colors={preset.colors} style={styles.previewFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />;
		}
		if (draft.kind === "photo" && draft.photoUri) {
			return (
				<View style={styles.previewFill}>
					<Image
						source={{ uri: draft.photoUri }}
						style={styles.previewFill}
						contentFit="cover"
						blurRadius={draft.blur ? Math.round((draft.blur / 100) * 25) : 0}
					/>
					{!!draft.dim && <View style={[styles.previewFill, { backgroundColor: `rgba(0,0,0,${draft.dim / 100})` }]} />}
				</View>
			);
		}
		return <View style={[styles.previewFill, { backgroundColor: theme.colors.background }]} />;
	}, [draft, theme]);

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<SettingsScreenHeader title={isPerChat ? `Wallpaper — ${params.name || "Chat"}` : "Chat Wallpaper"} />

			<View style={styles.previewCard}>{preview}</View>

			{hasOverride && (
				<TouchableOpacity style={styles.resetRow} onPress={handleResetToDefault}>
					<Ionicons name="refresh" size={16} color={theme.accent} />
					<Text style={[styles.resetText, { color: theme.accent }]}>Use app default wallpaper</Text>
				</TouchableOpacity>
			)}

			<View style={styles.tabRow}>
				{KIND_TABS.map((tab) => (
					<TouchableOpacity
						key={tab.key}
						style={[styles.tab, draft.kind === tab.key && { backgroundColor: theme.accent }]}
						onPress={() => {
							if (tab.key === "photo") {
								handlePickPhoto();
								return;
							}
							save({ ...draft, kind: tab.key });
						}}
					>
						<Text style={[styles.tabText, draft.kind === tab.key && styles.tabTextActive]}>{tab.label}</Text>
					</TouchableOpacity>
				))}
			</View>

			{draft.kind === "doodle" && (
				<>
					<Text style={styles.sectionTitle}>Pattern Color</Text>
					<View style={styles.swatchRow}>
						{DOODLE_TINT_PRESETS.map((color) => (
							<TouchableOpacity
								key={color}
								style={[styles.swatch, { backgroundColor: color }, draft.doodleColor === color && styles.swatchActive]}
								onPress={() => save({ ...draft, doodleColor: color })}
							/>
						))}
					</View>
				</>
			)}

			{draft.kind === "solid" && (
				<>
					<Text style={styles.sectionTitle}>Solid Colors</Text>
					<View style={styles.swatchRow}>
						{SOLID_PRESETS.map((color) => (
							<TouchableOpacity
								key={color}
								style={[styles.swatch, { backgroundColor: color, borderWidth: 1, borderColor: "#E4E9E8" }, draft.solidColor === color && styles.swatchActive]}
								onPress={() => save({ ...draft, solidColor: color })}
							/>
						))}
					</View>
				</>
			)}

			{draft.kind === "gradient" && (
				<>
					<Text style={styles.sectionTitle}>Gradients ({GRADIENT_PRESETS.length})</Text>
					<View style={styles.gradientGrid}>
						{GRADIENT_PRESETS.map((preset) => (
							<TouchableOpacity key={preset.key} onPress={() => save({ ...draft, gradientKey: preset.key })}>
								<LinearGradient
									colors={preset.colors}
									style={[styles.gradientSwatch, draft.gradientKey === preset.key && styles.swatchActive]}
									start={{ x: 0, y: 0 }}
									end={{ x: 1, y: 1 }}
								/>
							</TouchableOpacity>
						))}
					</View>
				</>
			)}

			{draft.kind === "photo" && draft.photoUri && (
				<>
					<TouchableOpacity style={styles.changePhotoRow} onPress={handlePickPhoto}>
						<Ionicons name="image-outline" size={18} color={theme.accent} />
						<Text style={[styles.changePhotoText, { color: theme.accent }]}>Choose a different photo</Text>
					</TouchableOpacity>

					<Text style={styles.sectionTitle}>Blur ({draft.blur ?? 0}%)</Text>
					<GestureSlider
						min={0}
						max={100}
						value={draft.blur ?? 0}
						onChange={(v) => save({ ...draft, blur: v })}
						color={theme.accent}
					/>

					<Text style={styles.sectionTitle}>Dim ({draft.dim ?? 0}%)</Text>
					<GestureSlider
						min={0}
						max={80}
						value={draft.dim ?? 0}
						onChange={(v) => save({ ...draft, dim: v })}
						color={theme.accent}
					/>
				</>
			)}
		</ScrollView>
	);
};

export default SettingsWallpaper;

const styles = StyleSheet.create({
	container: {
		flexGrow: 1,
		backgroundColor: "#fff",
		paddingHorizontal: 20,
		paddingBottom: 40,
	},
	previewCard: {
		height: 220,
		borderRadius: 20,
		overflow: "hidden",
		marginTop: 8,
	},
	previewFill: {
		...StyleSheet.absoluteFillObject,
	},
	resetRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		marginTop: 10,
	},
	resetText: {
		fontSize: 13,
		fontWeight: "600",
	},
	tabRow: {
		flexDirection: "row",
		gap: 8,
		marginTop: 18,
	},
	tab: {
		flex: 1,
		paddingVertical: 10,
		borderRadius: 12,
		backgroundColor: "#F2F8F7",
		alignItems: "center",
	},
	tabText: {
		fontSize: 13,
		fontWeight: "600",
		color: "#24786D",
	},
	tabTextActive: {
		color: "#fff",
	},
	sectionTitle: {
		fontSize: 13,
		fontWeight: "700",
		color: "#797C7B",
		textTransform: "uppercase",
		marginTop: 20,
		marginBottom: 10,
	},
	swatchRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 12,
	},
	swatch: {
		width: 40,
		height: 40,
		borderRadius: 20,
	},
	swatchActive: {
		borderWidth: 3,
		borderColor: "#00000044",
	},
	gradientGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 10,
	},
	gradientSwatch: {
		width: 64,
		height: 64,
		borderRadius: 12,
	},
	changePhotoRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		marginTop: 16,
	},
	changePhotoText: {
		fontSize: 13,
		fontWeight: "600",
	},
});
