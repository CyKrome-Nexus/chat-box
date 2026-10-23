import { useEffect, useRef, useState } from "react";
import { Alert, Dimensions, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch } from "react-redux";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";

import LightboxPage from "./LightboxPage";
import ForwardSheet from "./ForwardSheet";
import { deleteMessage, composeMessage } from "@/src/redux/features/messagesSlice";
import { IAttachment, IMessage } from "@/src/interfaces/message-interface";
import { IChatRibbon } from "@/src/interfaces/list-interface";

const SCREEN_WIDTH = Dimensions.get("window").width;

export interface ILightboxItem {
	messageId: string;
	uri: string;
	type: "image" | "video";
}

/**
 * Full-screen media lightbox: horizontal swipe across every image/video in
 * the conversation, pinch-zoom + swipe-down-to-dismiss per page (see
 * LightboxPage), and a top action bar (Share/Save/Forward/Delete). See
 * docs/architecture/media-gallery.md.
 */
const MediaViewerModal = ({
	items,
	initialMessageId,
	conversationId,
	visible,
	onClose,
}: {
	items: ILightboxItem[];
	initialMessageId?: string;
	conversationId: string;
	visible: boolean;
	onClose: () => void;
}) => {
	const dispatch = useDispatch();
	const listRef = useRef<FlatList>(null);
	const [index, setIndex] = useState(0);
	const [isZoomed, setIsZoomed] = useState(false);
	const [showForward, setShowForward] = useState(false);

	useEffect(() => {
		if (!visible) return;
		const startIndex = Math.max(0, items.findIndex((item) => item.messageId === initialMessageId));
		setIndex(startIndex);
		requestAnimationFrame(() => {
			listRef.current?.scrollToIndex({ index: startIndex, animated: false });
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [visible, initialMessageId]);

	if (!visible || items.length === 0) return null;

	const currentItem = items[index];

	const handleShare = async () => {
		if (await Sharing.isAvailableAsync()) {
			await Sharing.shareAsync(currentItem.uri);
		} else {
			Alert.alert("Sharing unavailable", "This device can't share files.");
		}
	};

	const handleSave = async () => {
		const permission = await MediaLibrary.requestPermissionsAsync();
		if (!permission.granted) {
			Alert.alert("Permission needed", "Enable photo library access in Settings to save media.");
			return;
		}
		await MediaLibrary.saveToLibraryAsync(currentItem.uri);
		Alert.alert("Saved", "Saved to your device gallery.");
	};

	const handleDelete = () => {
		Alert.alert("Delete media?", "This removes it from the chat for you.", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: () => {
					dispatch(deleteMessage({ conversationId, messageId: currentItem.messageId }));
					if (items.length <= 1) onClose();
				},
			},
		]);
	};

	const handleForward = (target: IChatRibbon) => {
		const attachment: IAttachment = { type: currentItem.type, uri: currentItem.uri, uploadProgress: 100 };
		const message: IMessage = {
			id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
			conversationId: target.id,
			text: "",
			type: "sender",
			timestamp: Date.now(),
			attachment,
		};
		dispatch(composeMessage({ conversationId: target.id, message, queued: false }));
		Alert.alert("Forwarded", `Sent to ${target.name}.`);
	};

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<View style={styles.container}>
				<View style={styles.topBar}>
					<TouchableOpacity onPress={onClose}>
						<Ionicons name="close" size={26} color="#fff" />
					</TouchableOpacity>
					<Text style={styles.counter}>
						{index + 1} / {items.length}
					</Text>
					<View style={styles.actionsRow}>
						<TouchableOpacity onPress={handleShare} style={styles.actionButton}>
							<Ionicons name="share-outline" size={20} color="#fff" />
						</TouchableOpacity>
						<TouchableOpacity onPress={handleSave} style={styles.actionButton}>
							<Ionicons name="download-outline" size={20} color="#fff" />
						</TouchableOpacity>
						<TouchableOpacity onPress={() => setShowForward(true)} style={styles.actionButton}>
							<Ionicons name="arrow-redo-outline" size={20} color="#fff" />
						</TouchableOpacity>
						<TouchableOpacity onPress={handleDelete} style={styles.actionButton}>
							<Ionicons name="trash-outline" size={20} color="#F04A4C" />
						</TouchableOpacity>
					</View>
				</View>

				<FlatList
					ref={listRef}
					data={items}
					keyExtractor={(item) => item.messageId}
					horizontal
					pagingEnabled
					scrollEnabled={!isZoomed}
					showsHorizontalScrollIndicator={false}
					initialScrollIndex={index}
					getItemLayout={(_, i) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * i, index: i })}
					onMomentumScrollEnd={(e) => {
						const next = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
						setIndex(next);
					}}
					renderItem={({ item }) => (
						<LightboxPage
							uri={item.uri}
							type={item.type}
							width={SCREEN_WIDTH}
							onDismiss={onClose}
							onZoomChange={setIsZoomed}
						/>
					)}
				/>
			</View>

			<ForwardSheet visible={showForward} onClose={() => setShowForward(false)} onSelect={handleForward} />
		</Modal>
	);
};

export default MediaViewerModal;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.95)",
	},
	topBar: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingTop: 56,
		paddingHorizontal: 16,
		paddingBottom: 8,
		zIndex: 1,
	},
	counter: {
		color: "rgba(255,255,255,0.8)",
		fontSize: 12,
	},
	actionsRow: {
		flexDirection: "row",
		gap: 16,
	},
	actionButton: {
		padding: 4,
	},
});
