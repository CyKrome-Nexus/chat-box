import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { IAttachment } from "@/src/interfaces/message-interface";
import AudioMessageBubble from "./AudioMessageBubble";

const formatFileSize = (bytes?: number) => {
	if (!bytes) return "";
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const AttachmentContent = ({
	messageId,
	attachment,
	isSender,
	onPressImage,
}: {
	messageId: string;
	attachment: IAttachment;
	isSender: boolean;
	onPressImage?: (uri: string) => void;
}) => {
	if (attachment.type === "audio") {
		return <AudioMessageBubble messageId={messageId} attachment={attachment} isSender={isSender} />;
	}

	const isUploading = (attachment.uploadProgress ?? 100) < 100;

	if (attachment.type === "image" || attachment.type === "video") {
		return (
			<TouchableOpacity
				activeOpacity={0.85}
				style={styles.mediaWrapper}
				onPress={() => attachment.uri && onPressImage?.(attachment.uri)}
				disabled={attachment.type === "video"}
			>
				<Image source={{ uri: attachment.uri }} style={styles.mediaImage} />
				{attachment.type === "video" && (
					<View style={styles.playOverlay}>
						<Ionicons name="play-circle" size={40} color="#fff" />
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
		return (
			<View style={styles.documentRow}>
				<View
					style={[
						styles.documentIcon,
						{ backgroundColor: isSender ? "rgba(255,255,255,0.15)" : "#FFFFFF" },
					]}
				>
					<Ionicons
						name="document-text"
						size={24}
						color={isSender ? "#FFFFFF" : "#24786D"}
					/>
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
			</View>
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
