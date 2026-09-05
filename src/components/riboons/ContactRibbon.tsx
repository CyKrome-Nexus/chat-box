import {
	StyleSheet,
	View,
	Text,
	TouchableOpacity,
} from "react-native";
import Animated from "react-native-reanimated";
import { router } from "expo-router";

import Avatar from "../images/Avatar";
import { IContactRibbon } from "@/src/interfaces/list-interface";

const ContactRibbon = ({
	content,
	onLongPressContact,
}: {
	content: IContactRibbon;
	onLongPressContact?: (contact: IContactRibbon) => void;
}) => {
	const handlePress = () => {
		if (!content.isRegistered) {
			onLongPressContact?.(content);
			return;
		}

		router.push({
			pathname: "/messages/Chat",
			params: { user: JSON.stringify(content) },
		});
	};

	return (
		<View style={styles.row}>
			{/* Swipeable ribbon content */}
			<Animated.View style={[styles.ribbon]}>
				<TouchableOpacity
					style={styles.container}
					onPress={handlePress}
					onLongPress={() => onLongPressContact?.(content)}
				>
					<View style={styles.content}>
						<Avatar data={content?.avatar} isWhite={true} />
						<View style={styles.mainContent}>
							<Text style={{ fontSize: 22, fontWeight: "bold" }}>
								{content?.name}
							</Text>
							<Text style={{ fontSize: 12, color: "#797C7B" }}>
								{content?.isRegistered === false
									? "Not on Chatbox"
									: content?.about || content?.phoneNumber}
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
