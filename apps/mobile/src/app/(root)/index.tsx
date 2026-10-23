import { ImageBackground, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SocialButtons } from "@/src/components/auth/SocialButtons";
import { AppText, Divider, PrimaryButton, ScalePressable, spacing } from "@/src/components/ui";

export default function Onboarding() {
	const insets = useSafeAreaInsets();

	return (
		<ImageBackground source={require("@/assets/images/Onboarding.png")} resizeMode="cover" style={styles.container}>
			<Animated.View entering={FadeInUp.duration(700)} style={styles.brand}>
				<AppText variant="display" weight="semibold" tone="inverse" align="center">
					Chatbox
				</AppText>
				<AppText variant="body" align="center" style={styles.tagline}>
					Connect friends easily & quickly
				</AppText>
			</Animated.View>

			<Animated.View entering={FadeInDown.springify().damping(20).delay(120)} style={[styles.actions, { paddingBottom: insets.bottom + 24 }]}>
				<SocialButtons tone="light" />
				<Divider label="OR" />
				<PrimaryButton variant="light" title="Sign up with Phone" onPress={() => router.push({ pathname: "/auth", params: { authType: "signup" } })} />
				<View style={styles.loginRow}>
					<AppText variant="label" weight="regular" style={styles.muted}>
						Existing account?
					</AppText>
					<ScalePressable accessibilityLabel="Log in" onPress={() => router.push({ pathname: "/auth", params: { authType: "login" } })} hitSlop={10}>
						<AppText variant="label" weight="semibold" tone="inverse">
							{" "}Log in
						</AppText>
					</ScalePressable>
				</View>
			</Animated.View>
		</ImageBackground>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: "#1B1B1B", justifyContent: "space-between" },
	brand: { flex: 1, justifyContent: "center", paddingHorizontal: spacing.gutter, gap: 12 },
	tagline: { color: "rgba(255,255,255,0.6)" },
	actions: { paddingHorizontal: spacing.gutter, gap: 30 },
	loginRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
	muted: { color: "#B9C1BE" },
});
