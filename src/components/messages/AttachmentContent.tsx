import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch } from "react-redux";
import { router } from "expo-router";

import { IAttachment } from "@/src/interfaces/message-interface";
import { markAttachmentViewed } from "@/src/redux/features/messagesSlice";
import { getDocumentIcon } from "@/src/lib/media/documentIcon";
import AudioMessageBubble from "./AudioMessageBubble";
import VideoNoteBubble from "./VideoNoteBubble";

const formatFileSize = (bytes?: number) => {
	if (!bytes) return "";
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const AttachmentContent = ({
	messageId,
	conversationId,
	attachment,
	isSender,
	onPressMedia,
	onPressVideoNote,
}: {
	messageId: string;
	conversationId: string;
	attachment: IAttachment;
	isSender: boolean;
	/** Opens the full-conversation lightbox at this message's image/video. */
	onPressMedia?: (messageId: string) => void;
	onPressVideoNote?: (uri: string) => void;
}) => {
	const dispatch = useDispatch();

	if (attachment.type === "audio") {
		return (
			<AudioMessageBubble
				messageId={messageId}
				conversationId={conversationId}
				attachment={attachment}
				isSender={isSender}
			/>
		);
	}

	if (attachment.type === "video_note") {
		return (
			<VideoNoteBubble
				messageId={messageId}
				attachment={attachment}
				onLongPressFullscreen={() => attachment.uri && onPressVideoNote?.(attachment.uri)}
			/>
		);
	}

	const isUploading = (attachment.uploadProgress ?? 100) < 100;

	// "View once" media is only gated for the recipient side — the sender
	// already knows what they sent (see docs/architecture/media-editor.md).
	if ((attachment.type === "image" || attachment.type === "video") && attachment.viewOnce && !isSender) {
		if (attachment.viewOnceOpened) {
			return (
				<View style={[styles.mediaWrapper, styles.viewOnceCard]}>
					<Ionicons name="checkmark-done" size={22} color="rgba(255,255,255,0.6)" />
					<Text style={styles.viewOnceLabel}>Opened</Text>
				</View>
			);
		}
		return (
			<TouchableOpacity
				style={[styles.mediaWrapper, styles.viewOnceCard]}
				onPress={() => {
					dispatch(markAttachmentViewed({ conversationId, messageId }));
					onPressMedia?.(messageId);
				}}
			>
				<Ionicons name="flame" size={26} color="#fff" />
				<Text style={styles.viewOnceLabel}>Tap to view once</Text>
			</TouchableOpacity>
		);
	}

	if (attachment.type === "image" || attachment.type === "video") {
		return (
			<TouchableOpacity
				activeOpacity={0.85}
				style={styles.mediaWrapper}
				onPress={() => onPressMedia?.(messageId)}
			>
				<Image source={{ uri: attachment.uri }} style={styles.mediaImage} />
				{attachment.type === "video" && (
					<View style={styles.playOverlay}>
						<Ionicons name="play-circle" size={40} color="#fff" />
					</View>
				)}
				{attachment.mediaEncryptionVerified && (
					<View style={styles.encryptionBadge}>
						<Ionicons name="lock-closed" size={10} color="#fff" />
					</View>
				)}
				{isUploading && (
					<View style={styles.progressOverlay}>
						<View style={styles.progressTrack}>
							<View
								style={[
									styles.progressFill,
									{ width: `${attachment.uploadProgress ?? 0}%` },
								]}
							/>
						</View>
						<Text style={styles.progressLabel}>{Math.round(attachment.uploadProgress ?? 0)}%</Text>
					</View>
				)}
			</TouchableOpacity>
		);
	}

	if (attachment.type === "document") {
		const icon = getDocumentIcon(attachment.name, attachment.mimeType);
		return (
			<TouchableOpacity
				style={styles.documentRow}
				onPress={() =>
					attachment.uri &&
					router.push({
						pathname: "/document-preview",
						params: {
							uri: attachment.uri,
							name: attachment.name || "Document",
							mimeType: attachment.mimeType || "",
						},
					})
				}
			>
				<View
					style={[
						styles.documentIcon,
						{ backgroundColor: isSender ? "rgba(255,255,255,0.15)" : "#FFFFFF" },
					]}
				>
					<Ionicons name={icon.name} size={24} color={isSender ? "#FFFFFF" : icon.color} />
				</View>
				<View style={styles.documentMeta}>
					<Text
						numberOfLines={1}
						style={isSender ? styles.documentNameSender : styles.documentNameReceiver}
					>
						{attachment.name || "Document"}
					</Text>
					<Text style={isSender ? styles.documentSizeSender : styles.documentSizeReceiver}>
						{formatFileSize(attachment.size)}
					</Text>
				</View>
				{isUploading && (
					<Text style={isSender ? styles.documentSizeSender : styles.documentSizeReceiver}>
						{Math.round(attachment.uploadProgress ?? 0)}%
					</Text>
				)}
			</TouchableOpacity>
		);
	}

	if (attachment.type === "location") {
		return (
			<TouchableOpacity
				style={styles.locationCard}
				onPress={() => {
					if (attachment.latitude != null && attachment.longitude != null) {
						Linking.openURL(
							`https://maps.google.com/?q=${attachment.latitude},${attachment.longitude}`
						);
					}
				}}
			>
				<Ionicons name="location" size={20} color={isSender ? "#FFFFFF" : "#24786D"} />
				<Text style={isSender ? styles.documentNameSender : styles.documentNameReceiver}>
					{attachment.latitude?.toFixed(4)}, {attachment.longitude?.toFixed(4)}
				</Text>
			</TouchableOpacity>
		);
	}

	return null;
};

export default AttachmentContent;

const styles = StyleSheet.create({
	mediaWrapper: {
		width: 200,
		height: 200,
		borderRadius: 12,
		overflow: "hidden",
		marginBottom: 4,
		backgroundColor: "#00000010",
	},
	mediaImage: {
		width: "100%",
		height: "100%",
	},
	playOverlay: {
		...StyleSheet.absoluteFillObject,
		justifyContent: "center",
		alignItems: "center",
	},
	encryptionBadge: {
		position: "absolute",
		top: 6,
		right: 6,
		backgroundColor: "rgba(0,0,0,0.5)",
		borderRadius: 8,
		padding: 3,
	},
	viewOnceCard: {
		backgroundColor: "#000",
		justifyContent: "center",
		alignItems: "center",
		gap: 6,
	},
	viewOnceLabel: {
		color: "#fff",
		fontSize: 12,
	},
	progressOverlay: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		padding: 8,
		backgroundColor: "rgba(0,0,0,0.4)",
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	progressTrack: {
		flex: 1,
		height: 4,
		borderRadius: 2,
		backgroundColor: "rgba(255,255,255,0.3)",
		overflow: "hidden",
	},
	progressFill: {
		height: "100%",
		backgroundColor: "#fff",
	},
	progressLabel: {
		color: "#fff",
		fontSize: 11,
	},
	documentRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		minWidth: 180,
		marginBottom: 2,
	},
	documentIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "rgba(255,255,255,0.15)",
	},
	documentMeta: {
		flex: 1,
	},
	documentNameSender: {
		color: "#FFFFFF",
		fontSize: 14,
		fontWeight: "600",
	},
	documentNameReceiver: {
		color: "#000E08",
		fontSize: 14,
		fontWeight: "600",
	},
	documentSizeSender: {
		color: "rgba(255,255,255,0.8)",
		fontSize: 11,
	},
	documentSizeReceiver: {
		color: "#797C7B",
		fontSize: 11,
	},
	locationCard: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		minWidth: 160,
		marginBottom: 2,
	},
});
