import type { ComponentProps } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, SlideInDown, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, CircleButton, ScalePressable, palette, radii } from "@/src/components/ui";

export type TAttachmentOption = "camera" | "gallery" | "document" | "location" | "poll" | "contact";

const OPTIONS: { key: TAttachmentOption; label: string; icon: ComponentProps<typeof Ionicons>["name"] }[] = [
	{ key: "camera", label: "Camera", icon: "camera-outline" },
	{ key: "document", label: "Documents", icon: "document-text-outline" },
	{ key: "poll", label: "Create a poll", icon: "bar-chart-outline" },
	{ key: "gallery", label: "Media", icon: "image-outline" },
	{ key: "location", label: "Location", icon: "location-outline" },
	{ key: "contact", label: "Contact", icon: "person-circle-outline" },
];

// Figma "Share Content" bottom sheet.
const AttachmentSheet = ({
	visible,
	onClose,
	onSelect,
	allowPoll = true,
}: {
	visible: boolean;
	onClose: () => void;
	onSelect: (option: TAttachmentOption) => void;
	allowPoll?: boolean;
}) => {
	const insets = useSafeAreaInsets();
	const options = OPTIONS.filter((option) => allowPoll || option.key !== "poll");

	return (
		<Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
			<Animated.View entering={FadeIn.duration(180)} style={styles.backdrop}>
				<Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
				<Animated.View entering={SlideInDown.springify().damping(22).stiffness(220)} style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
					<View style={styles.header}>
						<CircleButton icon="close" label="Close" variant="plain" size={32} iconSize={22} onPress={onClose} />
						<AppText variant="heading" align="center" style={styles.title}>
							Share Content
						</AppText>
						<View style={styles.spacer} />
					</View>
					<View style={styles.grid}>
						{options.map((option, index) => (
							<Animated.View key={option.key} entering={ZoomIn.delay(60 + index * 35).springify().damping(16)} style={styles.cell}>
								<ScalePressable
									accessibilityLabel={option.label}
									haptic
									scaleTo={0.92}
									onPress={() => {
										onClose();
										onSelect(option.key);
									}}
									style={styles.option}
								>
									<View style={styles.iconCircle}>
										<Ionicons name={option.icon} size={30} color={palette.muted} />
									</View>
									<AppText variant="caption" tone="muted">
										{option.label}
									</AppText>
								</ScalePressable>
							</Animated.View>
						))}
					</View>
				</Animated.View>
			</Animated.View>
		</Modal>
	);
};

export default AttachmentSheet;

const styles = StyleSheet.create({
	backdrop: { flex: 1, backgroundColor: "rgba(0,14,8,0.45)", justifyContent: "flex-end" },
	sheet: { backgroundColor: palette.white, borderTopLeftRadius: radii.sheet, borderTopRightRadius: radii.sheet, paddingHorizontal: 24, paddingTop: 24 },
	header: { flexDirection: "row", alignItems: "center", marginBottom: 28 },
	title: { flex: 1 },
	spacer: { width: 32 },
	grid: { flexDirection: "row", flexWrap: "wrap", rowGap: 24 },
	cell: { width: "33.33%", alignItems: "center" },
	option: { alignItems: "center", gap: 8 },
	iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: palette.brandSoft, alignItems: "center", justifyContent: "center" },
});
