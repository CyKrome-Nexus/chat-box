import {
	StyleSheet,
	View,
	Text,
	TouchableOpacity,
	Dimensions,
} from "react-native";
import Animated from "react-native-reanimated";
import Avatar from "../images/Avatar";
import { IContactRibbon } from "@/src/interfaces/list-interface";


const ContactRibbon = ({ content }: { content: IContactRibbon }) => {
	return (
		<View style={styles.row}>
			{/* Swipeable ribbon content */}
			<Animated.View style={[styles.ribbon]}>
				<TouchableOpacity style={styles.container}>
					<View style={styles.content}>
						<Avatar data={content?.avatar} isWhite={true} />
						<View style={styles.mainContent}>
							<Text style={{ fontSize: 22, fontWeight: "bold" }}>
								{content?.name}
							</Text>
							<Text style={{ fontSize: 12, color: "#797C7B" }}>
								{content?.about}
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
});

export default ContactRibbon;
