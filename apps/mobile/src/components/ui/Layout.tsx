import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/src/lib/theme/ThemeContext";
import { AppText } from "./AppText";
import { palette, radii, spacing } from "./tokens";

// Dark header + rounded content sheet, the shell shared by the Figma home/calls/contacts/settings screens.
export const SheetScreen = ({
	title,
	left,
	right,
	header,
	children,
	sheetStyle,
}: {
	title?: string;
	left?: ReactNode;
	right?: ReactNode;
	header?: ReactNode;
	children: ReactNode;
	sheetStyle?: StyleProp<ViewStyle>;
}) => {
	const insets = useSafeAreaInsets();
	const theme = useAppTheme();
	return (
		<View style={styles.root}>
			<View style={[styles.header, { paddingTop: insets.top + 16 }]}>
				<View style={styles.side}>{left}</View>
				{title ? (
					<AppText variant="title" tone="inverse" align="center" style={styles.title} numberOfLines={1}>
						{title}
					</AppText>
				) : (
					<View style={styles.title} />
				)}
				<View style={[styles.side, styles.sideRight]}>{right}</View>
			</View>
			{header}
			<Animated.View entering={FadeInDown.springify().damping(22).stiffness(180)} style={[styles.sheet, { backgroundColor: theme.colors.background }, sheetStyle]}>
				<View style={styles.handle} />
				{children}
			</Animated.View>
		</View>
	);
};

export const SectionLabel = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => (
	<View style={[styles.sectionLabel, style]}>
		<AppText variant="body" weight="medium">
			{children}
		</AppText>
	</View>
);

const styles = StyleSheet.create({
	root: { flex: 1, backgroundColor: palette.ink },
	header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.gutter, paddingBottom: 30, gap: 12 },
	side: { width: 92, flexDirection: "row", alignItems: "center", gap: 10 },
	sideRight: { justifyContent: "flex-end" },
	title: { flex: 1 },
	sheet: { flex: 1, borderTopLeftRadius: radii.sheet, borderTopRightRadius: radii.sheet, overflow: "hidden" },
	handle: { alignSelf: "center", width: 30, height: 3, borderRadius: 2, backgroundColor: "#E6E6E6", marginTop: 14, marginBottom: 6 },
	sectionLabel: { paddingHorizontal: spacing.gutter, paddingTop: 14, paddingBottom: 6 },
});
