import { StyleSheet, ViewStyle } from "react-native";
import { SvgXml } from "react-native-svg";
import { View } from "react-native";

import IIconSVG from "@/src/interfaces/icon-interface";

interface SvgIconProps {
	svg: IIconSVG | string;
	theme?: "default" | "light" | "dark";
	width?: number;
	height?: number;
	includeBorder?: boolean;
	text?: string;
	focused?: boolean;
	isBackground?: boolean;
	customStyles?: ViewStyle;
}

const IconSVG: React.FC<SvgIconProps> = ({
	svg,
	theme = "default",
	width = 25,
	height = 25,
	includeBorder = true,
	text = "",
	focused = false,
	isBackground = false,
	customStyles = StyleSheet.create({}),
}) => {
	var svgXml: string;
	if (typeof svg === "string") {
		svgXml = svg;
	} else {
		svgXml = focused ? svg?.focused || svg.default : svg.default;
	}
	return (
		<View
			style={[
				styles.iconContainer,
				includeBorder ? styles.border : undefined,
				isBackground ? { position: "absolute" } : undefined,
				customStyles,
			]}
		>
			{isBackground ? (
				<SvgXml xml={svgXml} />
			) : (
				<SvgXml xml={svgXml} width={width} height={height} />
			)}
		</View>
	);
};

export default IconSVG;

const styles = StyleSheet.create({
	iconContainer: {
		justifyContent: "center",
		alignItems: "center",
		padding: 10,
	},
	border: {
		borderRadius: 9999,
		borderWidth: 0.7,
		borderColor: "white",
	},
	text: {
		paddingTop: 5,
	},
	background: {},
});
