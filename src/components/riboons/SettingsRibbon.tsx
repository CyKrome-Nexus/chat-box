import {
	StyleSheet,
	View,
	Text,
} from "react-native";
import Animated from "react-native-reanimated";
import { TouchableOpacity } from "react-native-gesture-handler";

import { ISettingsRibbon } from "@/src/interfaces/list-interface";
import IconSVG from "../images/IconSVG";


const SettingsRibbon = ({ content }: { content: ISettingsRibbon }) => {
	return (
		<View style={styles.row}>
			{/* Swipeable ribbon content */}
			<Animated.View style={[styles.ribbon]}>
				<TouchableOpacity style={styles.container}>
					<View style={styles.content}>
						<View style={styles.iconContainer}>
							<IconSVG svg={content?.svg} />
						</View>
						<View style={styles.mainContent}>
							<Text style={{ fontSize: 22, fontWeight: "bold" }}>
								{content?.title}
							</Text>
							<Text style={{ fontSize: 12, color: "#797C7B" }}>
								{content?.description}
							</Text>
						</View>
					</View>
				</TouchableOpacity>
			</Animated.View>
		</View>
	);
};

const styles = StyleSheet.create({
	row: {
		width: "100%",
		position: "relative",
		height: 80,
		marginBottom: 4,
		overflow: "hidden",
	},
	ribbon: {
		width: "100%",
		height: "100%",
		zIndex: 2,
		backgroundColor: "white",
	},
	container: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		width: "100%",
		height: 80,
		paddingVertical: 10,
		// paddingHorizontal: 20,  // This is handled in ListDrawer Component Itself
		gap: 5,
	},
	content: {
		gap: 10,
		flex: 0.8,
		flexDirection: "row",
		overflow: "hidden",
	},
	mainContent: {
		justifyContent: "center",
		flex: 1,
		gap: 1,
	},
	iconContainer: {
		alignItems: 'center',
		backgroundColor: "#F2F8F7",
		borderRadius: '100%',
		height: 65,
		justifyContent: 'center',
		width: 65,
	},
});

export default SettingsRibbon;
