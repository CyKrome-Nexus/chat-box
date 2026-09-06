import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSelector } from "react-redux";

import ChatWallpaperDoodle from "./ChatWallpaperDoodle";
import { getGradientPreset } from "@/src/lib/wallpaper/wallpaperPresets";
import { IWallpaperConfig } from "@/src/lib/wallpaper/wallpaperTypes";
import { useAppTheme } from "@/src/lib/theme/ThemeContext";

/**
 * Resolves a conversation's wallpaper — its own per-chat override if set,
 * else the app-wide default (see settings-wallpaper.tsx) — into an
 * absolute-fill background rendered behind the message list. Real for every
 * kind: doodle (vector SVG pattern), solid (flat fill), gradient
 * (expo-linear-gradient), and photo (expo-image with its native `blurRadius`
 * prop for the blur slider, plus a semi-transparent overlay View for dimming).
 */
const ChatWallpaper = ({ conversationId }: { conversationId: string }) => {
	const theme = useAppTheme();
	const config: IWallpaperConfig = useSelector((state: any) => {
		const perChat = state.settings.wallpaper.perChat[conversationId];
		return perChat || state.settings.wallpaper.global;
	});

	if (!config || config.kind === "none") {
		return null;
	}

	if (config.kind === "doodle") {
		return (
			<View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.background }]}>
				<ChatWallpaperDoodle tint={config.doodleColor || theme.accent} />
			</View>
		);
	}

	if (config.kind === "solid") {
		return <View style={[StyleSheet.absoluteFill, { backgroundColor: config.solidColor || theme.colors.background }]} />;
	}

	if (config.kind === "gradient") {
		const preset = getGradientPreset(config.gradientKey);
		return <LinearGradient colors={preset.colors} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />;
	}

	if (config.kind === "photo" && config.photoUri) {
		return (
			<View style={StyleSheet.absoluteFill}>
				<Image
					source={{ uri: config.photoUri }}
					style={StyleSheet.absoluteFill}
					contentFit="cover"
					blurRadius={config.blur ? Math.round((config.blur / 100) * 25) : 0}
				/>
				{!!config.dim && (
					<View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${config.dim / 100})` }]} />
				)}
			</View>
		);
	}

	return null;
};

export default ChatWallpaper;
