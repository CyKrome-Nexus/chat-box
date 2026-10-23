import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";

import { AppText, CircleButton, palette } from "@/src/components/ui";

// Back arrow + "Highlighted rest" title + subtitle used across the auth screens.
export const AuthHeader = ({ highlight, rest, subtitle }: { highlight: string; rest: string; subtitle: string }) => (
	<View>
		<CircleButton
			icon="arrow-back"
			label="Back"
			variant="plain"
			size={40}
			iconSize={24}
			onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
			style={styles.back}
		/>
		<Animated.View entering={FadeIn.duration(400)} style={styles.titleBlock}>
			<View style={styles.titleRow}>
				<View>
					<View style={styles.highlight} />
					<AppText variant="heading" weight="bold">
						{highlight}
					</AppText>
				</View>
				<AppText variant="heading" weight="bold">
					{" "}
					{rest}
				</AppText>
			</View>
			<AppText variant="label" weight="regular" tone="muted" align="center" style={styles.subtitle}>
				{subtitle}
			</AppText>
		</Animated.View>
	</View>
);

const styles = StyleSheet.create({
	back: { marginLeft: -8 },
	titleBlock: { alignItems: "center", marginTop: 32, gap: 16 },
	titleRow: { flexDirection: "row", alignItems: "flex-end" },
	highlight: { position: "absolute", left: 0, right: 0, bottom: 1, height: 8, backgroundColor: palette.brand, opacity: 0.55, borderRadius: 2 },
	subtitle: { maxWidth: 300, lineHeight: 20 },
});
