import { Dimensions, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut, ZoomIn } from "react-native-reanimated";

import { IMessage } from "@/src/interfaces/message-interface";
import Colors from "@/src/constants/Colors";
import { hapticLightTap } from "@/src/lib/haptics/haptics";

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
export const EDIT_WINDOW_MS = 15 * 60 * 1000;

export interface IBubbleAnchor {
	x: number;
	y: number;
	width: number;
	height: number;
}

const SCREEN = Dimensions.get("window");
const PILL_HEIGHT = 56;
const MENU_WIDTH = 220;

/**
 * The long-press context menu: dims the chat, shows a floating quick-
 * reaction pill and an action menu anchored to the tapped bubble's measured
 * on-screen position. See docs/architecture/message-actions.md.
 */
const MessageActionsOverlay = ({
	message,
	anchor,
	isSender,
	visible,
	onClose,
	onReact,
	onOpenEmojiPicker,
	onReply,
	onCopy,
	onForward,
	onEdit,
	onStar,
	onDelete,
	onInfo,
}: {
	message: IMessage | null;
	anchor: IBubbleAnchor | null;
	isSender: boolean;
	visible: boolean;
	onClose: () => void;
	onReact: (emoji: string) => void;
	onOpenEmojiPicker: () => void;
	onReply: () => void;
	onCopy: () => void;
	onForward: () => void;
	onEdit: () => void;
	onStar: () => void;
	onDelete: () => void;
	onInfo: () => void;
}) => {
	if (!visible || !message || !anchor) return null;

	const canEdit =
		isSender &&
		!message.attachment &&
		!message.deletedForEveryone &&
		Date.now() - message.timestamp < EDIT_WINDOW_MS;

	type TMenuItem = {
		key: string;
		label: string;
		icon: keyof typeof Ionicons.glyphMap;
		danger?: boolean;
		onPress: () => void;
	};

	const menuItems: TMenuItem[] = [
		{ key: "reply", label: "Reply", icon: "arrow-undo-outline", onPress: onReply },
		...(message.text && !message.deletedForEveryone
			? [{ key: "copy", label: "Copy", icon: "copy-outline" as const, onPress: onCopy }]
			: []),
		{ key: "forward", label: "Forward", icon: "arrow-redo-outline", onPress: onForward },
		...(canEdit ? [{ key: "edit", label: "Edit", icon: "create-outline" as const, onPress: onEdit }] : []),
		{
			key: "star",
			label: message.starred ? "Unstar" : "Star",
			icon: message.starred ? "star" : "star-outline",
			onPress: onStar,
		},
		{ key: "delete", label: "Delete", icon: "trash-outline", danger: true, onPress: onDelete },
		...(isSender ? [{ key: "info", label: "Info", icon: "information-circle-outline" as const, onPress: onInfo }] : []),
	];

	const menuHeight = menuItems.length * 46 + 16;
	const spaceBelow = SCREEN.height - (anchor.y + anchor.height);
	// Flip the pill+menu above the bubble when there isn't enough room below.
	const showBelow = spaceBelow > PILL_HEIGHT + menuHeight + 20;

	const pillTop = showBelow ? anchor.y + anchor.height + 8 : Math.max(50, anchor.y - PILL_HEIGHT - 8);
	const menuTop = showBelow
		? pillTop + PILL_HEIGHT + 8
		: Math.max(8, pillTop - menuHeight - 8);

	const menuLeft = isSender
		? Math.max(12, anchor.x + anchor.width - MENU_WIDTH)
		: Math.min(SCREEN.width - MENU_WIDTH - 12, anchor.x);

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<Pressable style={styles.backdrop} onPress={onClose}>
				<Animated.View
					entering={ZoomIn.duration(160)}
					pointerEvents="none"
					style={[
						styles.bubblePreview,
						isSender ? styles.bubblePreviewSender : styles.bubblePreviewReceiver,
						{ top: anchor.y, left: anchor.x, width: anchor.width, minHeight: anchor.height },
					]}
				>
					{message.deletedForEveryone ? (
						<Text style={styles.previewDeletedText}>This message was deleted</Text>
					) : message.text ? (
						<Text style={isSender ? styles.previewTextSender : styles.previewTextReceiver} numberOfLines={6}>
							{message.text}
						</Text>
					) : (
						<View style={styles.previewAttachmentRow}>
							<Ionicons
								name={
									message.attachment?.type === "document"
										? "document-text-outline"
										: message.attachment?.type === "location"
										? "location-outline"
										: message.attachment?.type === "audio" || message.attachment?.type === "video_note"
										? "mic-outline"
										: "image-outline"
								}
								size={18}
								color={isSender ? "#fff" : Colors.focused}
							/>
							<Text style={isSender ? styles.previewTextSender : styles.previewTextReceiver}>
								{message.attachment?.type || "Attachment"}
							</Text>
						</View>
					)}
				</Animated.View>

				<Animated.View
					entering={ZoomIn.duration(160)}
					exiting={FadeOut.duration(120)}
					style={[styles.pill, { top: pillTop, left: Math.max(12, Math.min(SCREEN.width - 260, anchor.x)) }]}
				>
					{QUICK_REACTIONS.map((emoji) => (
						<TouchableOpacity
						key={emoji}
						onPress={() => {
							hapticLightTap();
							onReact(emoji);
						}}
						style={styles.pillEmojiButton}
					>
							<Text style={styles.pillEmoji}>{emoji}</Text>
						</TouchableOpacity>
					))}
					<TouchableOpacity onPress={onOpenEmojiPicker} style={styles.pillAddButton}>
						<Ionicons name="add" size={18} color="#797C7B" />
					</TouchableOpacity>
				</Animated.View>

				<Animated.View
					entering={FadeIn.duration(160).delay(40)}
					exiting={FadeOut.duration(120)}
					style={[styles.menu, { top: menuTop, left: menuLeft, width: MENU_WIDTH }]}
				>
					{menuItems.map((item) => (
						<TouchableOpacity key={item.key} style={styles.menuRow} onPress={item.onPress}>
							<Text style={[styles.menuLabel, item.danger && styles.menuLabelDanger]}>{item.label}</Text>
							<Ionicons name={item.icon} size={18} color={item.danger ? "#F04A4C" : "#000E08"} />
						</TouchableOpacity>
					))}
				</Animated.View>
			</Pressable>
		</Modal>
	);
};

export default MessageActionsOverlay;

const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.45)",
	},
	bubblePreview: {
		position: "absolute",
		borderRadius: 16,
		paddingHorizontal: 12,
		paddingVertical: 8,
		justifyContent: "center",
	},
	bubblePreviewSender: {
		backgroundColor: Colors.focused,
		borderBottomRightRadius: 4,
	},
	bubblePreviewReceiver: {
		backgroundColor: "#F2F8F7",
		borderBottomLeftRadius: 4,
	},
	previewTextSender: {
		color: "#FFFFFF",
		fontSize: 16,
	},
	previewTextReceiver: {
		color: "#000E08",
		fontSize: 16,
	},
	previewDeletedText: {
		color: "rgba(255,255,255,0.7)",
		fontSize: 14,
		fontStyle: "italic",
	},
	previewAttachmentRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	pill: {
		position: "absolute",
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#fff",
		borderRadius: 28,
		paddingHorizontal: 8,
		paddingVertical: 6,
		gap: 4,
		shadowColor: "#000",
		shadowOpacity: 0.2,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 4 },
		elevation: 6,
	},
	pillEmojiButton: {
		padding: 4,
	},
	pillEmoji: {
		fontSize: 22,
	},
	pillAddButton: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: "#F2F8F7",
		justifyContent: "center",
		alignItems: "center",
	},
	menu: {
		position: "absolute",
		backgroundColor: "#fff",
		borderRadius: 14,
		paddingVertical: 6,
		shadowColor: "#000",
		shadowOpacity: 0.2,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 4 },
		elevation: 6,
	},
	menuRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		paddingVertical: 11,
	},
	menuLabel: {
		fontSize: 14,
		color: "#000E08",
	},
	menuLabelDanger: {
		color: "#F04A4C",
	},
});
