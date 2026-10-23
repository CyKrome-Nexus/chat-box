import { forwardRef, useState } from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "@/src/lib/theme/ThemeContext";
import { AppText } from "./AppText";
import { ScalePressable } from "./Pressable";
import { fonts, palette } from "./tokens";

interface IUnderlineFieldProps extends TextInputProps {
	label: string;
	error?: string;
	secure?: boolean;
}

// Figma form field: teal label, underline that animates to brand on focus and red on error.
export const UnderlineField = forwardRef<TextInput, IUnderlineFieldProps>(({ label, error, secure, style, onFocus, onBlur, ...props }, ref) => {
	const theme = useAppTheme();
	const [focused, setFocused] = useState(false);
	const [revealed, setRevealed] = useState(false);
	const underline = useAnimatedStyle(() => ({
		backgroundColor: withTiming(error ? palette.danger : focused ? palette.brand : "#CDD1D0", { duration: 180 }),
		height: withTiming(focused || error ? 1.5 : 1, { duration: 180 }),
	}));

	return (
		<View style={styles.container}>
			<AppText variant="label" style={{ color: error ? palette.danger : palette.brandDark }}>
				{label}
			</AppText>
			<View style={styles.row}>
				<TextInput
					ref={ref}
					{...props}
					secureTextEntry={secure && !revealed}
					placeholderTextColor={palette.muted}
					onFocus={(event) => {
						setFocused(true);
						onFocus?.(event);
					}}
					onBlur={(event) => {
						setFocused(false);
						onBlur?.(event);
					}}
					style={[styles.input, { color: theme.colors.text }, style]}
				/>
				{secure ? (
					<ScalePressable accessibilityLabel={revealed ? "Hide password" : "Show password"} onPress={() => setRevealed((value) => !value)} hitSlop={10}>
						<Ionicons name={revealed ? "eye-off-outline" : "eye-outline"} size={20} color={palette.muted} />
					</ScalePressable>
				) : null}
			</View>
			<Animated.View style={underline} />
			{error ? (
				<AppText variant="caption" tone="danger" align="right" style={styles.error}>
					{error}
				</AppText>
			) : null}
		</View>
	);
});
UnderlineField.displayName = "UnderlineField";

const styles = StyleSheet.create({
	container: { width: "100%" },
	row: { flexDirection: "row", alignItems: "center" },
	input: { flex: 1, fontFamily: fonts.regular, fontSize: 16, paddingVertical: 12 },
	error: { marginTop: 6 },
});
