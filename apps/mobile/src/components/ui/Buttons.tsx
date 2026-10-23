import type { ComponentProps, ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "./AppText";
import { ScalePressable } from "./Pressable";
import { palette, radii } from "./tokens";

type TIconName = ComponentProps<typeof Ionicons>["name"];
type TCircleVariant = "outline" | "soft" | "dark" | "brand" | "danger" | "glass" | "plain";

const CIRCLE: Record<TCircleVariant, { background: string; border?: string; icon: string }> = {
	outline: { background: "transparent", border: "rgba(255,255,255,0.2)", icon: palette.white },
	soft: { background: palette.brandSoft, icon: palette.ink },
	dark: { background: palette.inkSoft, icon: palette.white },
	brand: { background: palette.brand, icon: palette.white },
	danger: { background: palette.danger, icon: palette.white },
	glass: { background: "rgba(255,255,255,0.18)", icon: palette.white },
	plain: { background: "transparent", icon: palette.ink },
};

export const CircleButton = ({
	icon,
	label,
	onPress,
	variant = "soft",
	size = 44,
	iconSize,
	iconColor,
	disabled,
	children,
	style,
}: {
	icon?: TIconName;
	label: string;
	onPress?: () => void;
	variant?: TCircleVariant;
	size?: number;
	iconSize?: number;
	iconColor?: string;
	disabled?: boolean;
	children?: ReactNode;
	style?: StyleProp<ViewStyle>;
}) => {
	const spec = CIRCLE[variant];
	return (
		<ScalePressable
			accessibilityLabel={label}
			haptic
			disabled={disabled}
			onPress={onPress}
			scaleTo={0.9}
			hitSlop={6}
			style={[
				styles.circle,
				{ width: size, height: size, borderRadius: size / 2, backgroundColor: spec.background },
				spec.border ? { borderWidth: 1, borderColor: spec.border } : null,
				style,
			]}
		>
			{children ?? (icon ? <Ionicons name={icon} size={iconSize ?? Math.round(size * 0.48)} color={iconColor ?? spec.icon} /> : null)}
		</ScalePressable>
	);
};

export const PrimaryButton = ({
	title,
	onPress,
	disabled,
	loading,
	variant = "brand",
	style,
}: {
	title: string;
	onPress: () => void;
	disabled?: boolean;
	loading?: boolean;
	variant?: "brand" | "light" | "danger";
	style?: StyleProp<ViewStyle>;
}) => {
	const inactive = disabled || loading;
	const background = inactive && variant === "brand" ? palette.field : variant === "light" ? palette.white : variant === "danger" ? palette.danger : palette.brand;
	const color = inactive && variant === "brand" ? palette.muted : variant === "light" ? palette.ink : palette.white;
	return (
		<ScalePressable
			accessibilityLabel={title}
			accessibilityState={{ disabled: inactive, busy: loading }}
			disabled={inactive}
			onPress={onPress}
			haptic
			scaleTo={0.98}
			style={[styles.primary, { backgroundColor: background, opacity: 1 }, style]}
		>
			{loading ? (
				<ActivityIndicator color={color} />
			) : (
				<AppText variant="body" weight="semibold" style={{ color }}>
					{title}
				</AppText>
			)}
		</ScalePressable>
	);
};

export const Chip = ({ label, onPress, selected }: { label: string; onPress?: () => void; selected?: boolean }) => (
	<ScalePressable onPress={onPress} disabled={!onPress} style={[styles.chip, selected && { backgroundColor: palette.brand }, { opacity: 1 }]}>
		<AppText variant="label" weight="regular" style={{ color: selected ? palette.white : palette.ink }}>
			{label}
		</AppText>
	</ScalePressable>
);

export const Divider = ({ label }: { label?: string }) => (
	<View style={styles.dividerRow}>
		<View style={styles.dividerLine} />
		{label ? (
			<AppText variant="label" weight="regular" tone="muted" style={styles.dividerLabel}>
				{label}
			</AppText>
		) : null}
		<View style={styles.dividerLine} />
	</View>
);

const styles = StyleSheet.create({
	circle: { alignItems: "center", justifyContent: "center" },
	primary: { height: 50, borderRadius: radii.lg, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
	chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: radii.full, backgroundColor: palette.brandSoft, alignSelf: "flex-start" },
	dividerRow: { flexDirection: "row", alignItems: "center", gap: 16 },
	dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: "#CDD1D0" },
	dividerLabel: { letterSpacing: 0.2 },
});
