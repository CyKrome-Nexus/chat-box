import { StyleSheet, Text, type TextProps } from "react-native";

import { useAppTheme } from "@/src/lib/theme/ThemeContext";
import { fonts, palette } from "./tokens";

type TVariant = "display" | "title" | "heading" | "body" | "label" | "caption" | "tiny";
type TWeight = keyof typeof fonts;

const VARIANTS: Record<TVariant, { fontSize: number; lineHeight: number; weight: TWeight }> = {
	display: { fontSize: 36, lineHeight: 44, weight: "medium" },
	title: { fontSize: 20, lineHeight: 26, weight: "medium" },
	heading: { fontSize: 18, lineHeight: 24, weight: "medium" },
	body: { fontSize: 16, lineHeight: 22, weight: "regular" },
	label: { fontSize: 14, lineHeight: 18, weight: "medium" },
	caption: { fontSize: 12, lineHeight: 16, weight: "regular" },
	tiny: { fontSize: 10, lineHeight: 12, weight: "regular" },
};

export interface IAppTextProps extends TextProps {
	variant?: TVariant;
	weight?: TWeight;
	tone?: "default" | "muted" | "inverse" | "brand" | "danger";
	align?: "left" | "center" | "right";
}

export const AppText = ({ variant = "body", weight, tone = "default", align, style, ...props }: IAppTextProps) => {
	const theme = useAppTheme();
	const spec = VARIANTS[variant];
	const color = {
		default: theme.colors.text,
		muted: theme.colors.subtext,
		inverse: palette.white,
		brand: palette.brandDark,
		danger: palette.danger,
	}[tone];

	return (
		<Text
			{...props}
			maxFontSizeMultiplier={1.6}
			style={[
				styles.base,
				{ fontSize: spec.fontSize, lineHeight: spec.lineHeight, fontFamily: fonts[weight ?? spec.weight], color, textAlign: align },
				style,
			]}
		/>
	);
};

const styles = StyleSheet.create({
	base: { includeFontPadding: false },
});
