import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import Colors from "@/src/constants/Colors";
import { IMessage } from "@/src/interfaces/message-interface";

const ReplyPreviewBar = ({
	message,
	contactName,
	onDismiss,
}: {
	message: IMessage;
	contactName?: string;
	onDismiss: () => void;
}) => {
	const label = message.type === "sender" ? "You" : contactName || "Contact";
	const preview = message.text || (message.attachment ? `📎 ${message.attachment.type}` : "");

	return (
		<Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(120)} style={styles.container}>
			<View style={styles.accentBar} />
			<View style={styles.textColumn}>
				<Text style={styles.label}>Replying to {label}</Text>
				<Text style={styles.preview} numberOfLines={1}>
					{preview}
				</Text>
			</View>
			<TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
				<Ionicons name="close" size={18} color="#797C7B" />
			</TouchableOpacity>
		</Animated.View>
	);
};

export default ReplyPreviewBar;

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		paddingHorizontal: 14,
		paddingVertical: 8,
		backgroundColor: "#F3F6F6",
		borderTopWidth: 1,
		borderTopColor: "#eee",
	},
	accentBar: {
		width: 3,
		alignSelf: "stretch",
		backgroundColor: Colors.focused,
		borderRadius: 2,
	},
	textColumn: {
		flex: 1,
	},
	label: {
		color: Colors.focused,
		fontSize: 12,
		fontWeight: "700",
	},
	preview: {
		color: "#5B6260",
		fontSize: 13,
		marginTop: 1,
	},
});
