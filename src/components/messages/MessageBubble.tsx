import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { IMessage } from "@/src/interfaces/message-interface";
import { IAvatar } from "@/src/interfaces/list-interface";
import Avatar from "../images/Avatar";
import Colors from "@/src/constants/Colors";
import AttachmentContent from "./AttachmentContent";

const formatTime = (timestamp: number) => {
	const date = new Date(timestamp);
	let hours = date.getHours();
	const minutes = date.getMinutes().toString().padStart(2, "0");
	const meridiem = hours >= 12 ? "PM" : "AM";
	hours = hours % 12 || 12;
	return `${hours}:${minutes} ${meridiem}`;
};

const StatusTicks = ({ status }: { status?: IMessage["status"] }) => {
	if (!status) {
		// No status yet = queued in the offline outbox (see
		// docs/architecture/offline-database.md) — a clock, like WhatsApp's
		// pending-message indicator, flips to a checkmark once connectivity
		// returns and the message is actually sent.
		return <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.8)" />;
	}

	if (status === "sent") {
		return <Ionicons name="checkmark" size={14} color="rgba(255,255,255,0.8)" />;
	}

	return (
		<Ionicons
			name="checkmark-done"
			size={14}
			color={status === "read" ? "#53BDEB" : "rgba(255,255,255,0.8)"}
		/>
	);
};

const MessageBubble = ({
	message,
	avatar,
	onPressImage,
}: {
	message: IMessage;
	avatar?: IAvatar;
	onPressImage?: (uri: string) => void;
}) => {
	const isSender = message.type === "sender";

	return (
		<View
			style={[
				styles.row,
				isSender ? styles.rowSender : styles.rowReceiver,
			]}
		>
			{!isSender && (
				<Avatar data={avatar} size={28} />
			)}
			<View
				style={[
					styles.bubble,
					isSender ? styles.senderBubble : styles.receiverBubble,
				]}
			>
				{message.attachment && (
					<AttachmentContent
						messageId={message.id}
						attachment={message.attachment}
						isSender={isSender}
						onPressImage={onPressImage}
					/>
				)}
				{!!message.text && (
					<Text style={isSender ? styles.senderText : styles.receiverText}>
						{message.text}
					</Text>
				)}
				<View style={styles.metaRow}>
					<Text style={isSender ? styles.senderTime : styles.receiverTime}>
						{formatTime(message.timestamp)}
					</Text>
					{isSender && <StatusTicks status={message.status} />}
				</View>
			</View>
		</View>
	);
};

export default MessageBubble;

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "flex-end",
		gap: 8,
		marginVertical: 4,
		maxWidth: "100%",
	},
	rowSender: {
		justifyContent: "flex-end",
		alignSelf: "flex-end",
	},
	rowReceiver: {
		justifyContent: "flex-start",
		alignSelf: "flex-start",
	},
	bubble: {
		maxWidth: "78%",
		borderRadius: 16,
		paddingHorizontal: 12,
		paddingVertical: 8,
	},
	senderBubble: {
		backgroundColor: Colors.focused,
		borderBottomRightRadius: 4,
	},
	receiverBubble: {
		backgroundColor: "#F2F8F7",
		borderBottomLeftRadius: 4,
	},
	senderText: {
		color: "#FFFFFF",
		fontSize: 16,
	},
	receiverText: {
		color: "#000E08",
		fontSize: 16,
	},
	metaRow: {
		flexDirection: "row",
		alignItems: "center",
		alignSelf: "flex-end",
		gap: 4,
		marginTop: 4,
	},
	senderTime: {
		fontSize: 11,
		color: "rgba(255,255,255,0.8)",
	},
	receiverTime: {
		fontSize: 11,
		color: "#797C7B",
	},
});
