import { useEffect, useRef, useState } from "react";
import {
	Dimensions,
	Image,
	Modal,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import { captureRef } from "react-native-view-shot";

import DoodleCanvas, { DoodleCanvasHandle } from "@/src/components/mediaEditor/DoodleCanvas";
import DraggableOverlayItem from "@/src/components/mediaEditor/DraggableOverlayItem";
import EmojiPicker from "@/src/components/messages/EmojiPicker";
import { mediaComposerBridge } from "@/src/lib/media/mediaComposerBridge";
import { storyComposerBridge } from "@/src/lib/media/storyComposerBridge";
import { compressImage } from "@/src/lib/media/compressImage";
import { cropImageToAspect, rotateImage90, TCropAspect } from "@/src/lib/media/cropRotateImage";
import { IOverlayItem, TEXT_COLORS, TEXT_FONTS } from "@/src/lib/media/overlayTypes";
import { IAttachment } from "@/src/interfaces/message-interface";
import Colors from "@/src/constants/Colors";

type TTool = "none" | "crop" | "draw" | "text" | "sticker";

const SCREEN_WIDTH = Dimensions.get("window").width;
const MAX_CANVAS_HEIGHT = Dimensions.get("window").height * 0.62;
const ASPECT_OPTIONS: { key: TCropAspect; label: string }[] = [
	{ key: "free", label: "Free" },
	{ key: "1:1", label: "1:1" },
	{ key: "4:3", label: "4:3" },
	{ key: "16:9", label: "16:9" },
];

/**
 * Crop/rotate/doodle/text/sticker editor for a freshly captured photo or
 * video, with a caption + "view once" toggle before sending. See
 * docs/architecture/media-editor.md for the full design writeup and its
 * scoping notes (notably: annotations only bake into photos, not video).
 */
const MediaEditorScreen = () => {
	const params = useLocalSearchParams<{ uri: string; type: "image" | "video"; target?: string }>();
	const isVideo = params.type === "video";
	const isStory = params.target === "story";

	const [uri, setUri] = useState(params.uri);
	const [dimensions, setDimensions] = useState({ width: SCREEN_WIDTH, height: SCREEN_WIDTH });
	const [tool, setTool] = useState<TTool>("none");
	const [aspect, setAspect] = useState<TCropAspect>("free");
	const [drawColor, setDrawColor] = useState(TEXT_COLORS[0]);
	const [items, setItems] = useState<IOverlayItem[]>([]);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [showTextInput, setShowTextInput] = useState(false);
	const [pendingText, setPendingText] = useState("");
	const [caption, setCaption] = useState("");
	const [viewOnce, setViewOnce] = useState(false);
	const [isSending, setIsSending] = useState(false);

	const canvasRef = useRef<View>(null);
	const doodleRef = useRef<DoodleCanvasHandle>(null);
	const videoPlayer = useVideoPlayer(isVideo ? uri : "", (p) => { p.loop = true; p.play(); });

	useEffect(() => {
		if (isVideo) return;
		Image.getSize(
			uri,
			(width, height) => setDimensions({ width, height }),
			() => {}
		);
	}, [uri, isVideo]);

	const canvasWidth = SCREEN_WIDTH;
	const canvasHeight = Math.min(MAX_CANVAS_HEIGHT, canvasWidth * (dimensions.height / dimensions.width));

	const handleRotate = async () => {
		const result = await rotateImage90(uri);
		setUri(result.uri);
		setDimensions({ width: result.width, height: result.height });
	};

	const handleAspect = async (nextAspect: TCropAspect) => {
		setAspect(nextAspect);
		const result = await cropImageToAspect(uri, dimensions.width, dimensions.height, nextAspect);
		setUri(result.uri);
		setDimensions({ width: result.width, height: result.height });
	};

	const addTextItem = () => {
		setPendingText("");
		setShowTextInput(true);
	};

	const commitTextItem = () => {
		if (pendingText.trim()) {
			const id = `text-${Date.now()}`;
			setItems((prev) => [
				...prev,
				{
					id,
					kind: "text",
					content: pendingText.trim(),
					x: canvasWidth / 2 - 40,
					y: canvasHeight / 2 - 20,
					scale: 1,
					rotation: 0,
					color: TEXT_COLORS[0],
					fontFamily: undefined,
				},
			]);
			setSelectedId(id);
		}
		setShowTextInput(false);
		setTool("none");
	};

	const addSticker = (emoji: string) => {
		const id = `sticker-${Date.now()}`;
		setItems((prev) => [
			...prev,
			{
				id,
				kind: "sticker",
				content: emoji,
				x: canvasWidth / 2 - 22,
				y: canvasHeight / 2 - 22,
				scale: 1,
				rotation: 0,
				color: "#fff",
			},
		]);
		setSelectedId(id);
		setTool("none");
	};

	const updateItem = (id: string, patch: Partial<IOverlayItem>) => {
		setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
	};

	const deleteSelected = () => {
		if (!selectedId) return;
		setItems((prev) => prev.filter((item) => item.id !== selectedId));
		setSelectedId(null);
	};

	const selectedItem = items.find((item) => item.id === selectedId);

	const handleDiscard = () => {
		if (isStory) {
			storyComposerBridge.submit(null);
		} else {
			mediaComposerBridge.submit(null);
		}
		router.back();
	};

	const handleSend = async () => {
		setIsSending(true);
		try {
			if (isVideo) {
				if (isStory) {
					storyComposerBridge.submit({ uri, type: "video", caption });
				} else {
					const attachment: IAttachment = { type: "video", uri, uploadProgress: 0, viewOnce };
					mediaComposerBridge.submit({ attachment, caption });
				}
				router.back();
				return;
			}

			// Bake doodle/text/sticker overlays into the photo by screenshotting
			// the composed canvas (screen resolution, not the original capture
			// resolution — see docs/architecture/media-editor.md).
			const snapshotUri = await captureRef(canvasRef, { format: "jpg", quality: 1 });
			const { uri: finalUri, size } = await compressImage(snapshotUri);

			if (isStory) {
				storyComposerBridge.submit({ uri: finalUri, type: "image", caption });
			} else {
				const attachment: IAttachment = { type: "image", uri: finalUri, size, uploadProgress: 0, viewOnce };
				mediaComposerBridge.submit({ attachment, caption });
			}
			router.back();
		} finally {
			setIsSending(false);
		}
	};

	return (
		<View style={styles.container}>
			<View style={styles.topBar}>
				<TouchableOpacity onPress={handleDiscard}>
					<Ionicons name="close" size={26} color="#fff" />
				</TouchableOpacity>
				{!isVideo && (
					<View style={styles.toolRow}>
						<TouchableOpacity onPress={() => setTool(tool === "crop" ? "none" : "crop")}>
							<Ionicons name="crop" size={22} color={tool === "crop" ? Colors.focused : "#fff"} />
						</TouchableOpacity>
						<TouchableOpacity
							onPress={() => setTool(tool === "draw" ? "none" : "draw")}
						>
							<Ionicons name="brush" size={22} color={tool === "draw" ? Colors.focused : "#fff"} />
						</TouchableOpacity>
						<TouchableOpacity onPress={addTextItem}>
							<Ionicons name="text" size={22} color="#fff" />
						</TouchableOpacity>
						<TouchableOpacity onPress={() => setTool("sticker")}>
							<Ionicons name="happy-outline" size={22} color="#fff" />
						</TouchableOpacity>
						{selectedId && (
							<TouchableOpacity onPress={deleteSelected}>
								<Ionicons name="trash" size={22} color="#F04A4C" />
							</TouchableOpacity>
						)}
					</View>
				)}
			</View>

			<View style={styles.canvasWrapper}>
				<View
					ref={canvasRef}
					collapsable={false}
					style={[styles.canvas, { width: canvasWidth, height: canvasHeight }]}
				>
					{isVideo ? (
						<VideoView player={videoPlayer} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />
					) : (
						<Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
					)}

					{!isVideo && <DoodleCanvas ref={doodleRef} active={tool === "draw"} color={drawColor} />}

					{!isVideo &&
						items.map((item) => (
							<DraggableOverlayItem
								key={item.id}
								item={item}
								selected={item.id === selectedId}
								onSelect={() => setSelectedId(item.id)}
								onChange={(patch) => updateItem(item.id, patch)}
							/>
						))}
				</View>
			</View>

			{tool === "crop" && (
				<View style={styles.cropBar}>
					{ASPECT_OPTIONS.map((option) => (
						<TouchableOpacity
							key={option.key}
							style={[styles.aspectChip, aspect === option.key && styles.aspectChipActive]}
							onPress={() => handleAspect(option.key)}
						>
							<Text style={styles.aspectChipText}>{option.label}</Text>
						</TouchableOpacity>
					))}
					<TouchableOpacity style={styles.rotateButton} onPress={handleRotate}>
						<Ionicons name="reload" size={18} color="#fff" />
					</TouchableOpacity>
				</View>
			)}

			{tool === "draw" && (
				<View style={styles.drawBar}>
					{TEXT_COLORS.map((color) => (
						<TouchableOpacity
							key={color}
							style={[styles.colorSwatch, { backgroundColor: color }, drawColor === color && styles.colorSwatchActive]}
							onPress={() => setDrawColor(color)}
						/>
					))}
					<TouchableOpacity onPress={() => doodleRef.current?.undo()}>
						<Ionicons name="arrow-undo" size={22} color="#fff" />
					</TouchableOpacity>
					<TouchableOpacity onPress={() => doodleRef.current?.redo()}>
						<Ionicons name="arrow-redo" size={22} color="#fff" />
					</TouchableOpacity>
				</View>
			)}

			{selectedItem?.kind === "text" && (
				<View style={styles.drawBar}>
					{TEXT_COLORS.map((color) => (
						<TouchableOpacity
							key={color}
							style={[styles.colorSwatch, { backgroundColor: color }, selectedItem.color === color && styles.colorSwatchActive]}
							onPress={() => updateItem(selectedItem.id, { color })}
						/>
					))}
					{TEXT_FONTS.map((font) => (
						<TouchableOpacity
							key={font.key}
							style={[styles.fontChip, selectedItem.fontFamily === font.fontFamily && styles.aspectChipActive]}
							onPress={() => updateItem(selectedItem.id, { fontFamily: font.fontFamily })}
						>
							<Text style={[styles.fontChipText, { fontFamily: font.fontFamily }]}>{font.label}</Text>
						</TouchableOpacity>
					))}
				</View>
			)}

			<View style={styles.bottomBar}>
				{!isStory && (
					<TouchableOpacity
						style={[styles.viewOnceButton, viewOnce && styles.viewOnceButtonActive]}
						onPress={() => setViewOnce((prev) => !prev)}
					>
						<Ionicons name="flame" size={18} color={viewOnce ? "#fff" : "#ccc"} />
					</TouchableOpacity>
				)}
				<TextInput
					style={styles.captionInput}
					placeholder="Add a caption…"
					placeholderTextColor="rgba(255,255,255,0.6)"
					value={caption}
					onChangeText={setCaption}
				/>
				<TouchableOpacity style={styles.sendButton} onPress={handleSend} disabled={isSending}>
					<Ionicons name="send" size={20} color="#fff" />
				</TouchableOpacity>
			</View>

			<Modal visible={showTextInput} transparent animationType="fade">
				<View style={styles.textModalBackdrop}>
					<TextInput
						style={styles.textModalInput}
						placeholder="Type something…"
						placeholderTextColor="rgba(255,255,255,0.6)"
						value={pendingText}
						onChangeText={setPendingText}
						autoFocus
						multiline
					/>
					<View style={styles.textModalActions}>
						<TouchableOpacity onPress={() => setShowTextInput(false)}>
							<Text style={styles.textModalActionText}>Cancel</Text>
						</TouchableOpacity>
						<TouchableOpacity onPress={commitTextItem}>
							<Text style={[styles.textModalActionText, { color: Colors.focused }]}>Add</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>

			<Modal visible={tool === "sticker"} transparent animationType="slide" onRequestClose={() => setTool("none")}>
				<View style={styles.stickerModalBackdrop}>
					<View style={styles.stickerModalSheet}>
						<EmojiPicker onSelectEmoji={addSticker} />
					</View>
				</View>
			</Modal>
		</View>
	);
};

export default MediaEditorScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
	},
	topBar: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingTop: 56,
		paddingHorizontal: 20,
		paddingBottom: 12,
	},
	toolRow: {
		flexDirection: "row",
		gap: 18,
	},
	canvasWrapper: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	canvas: {
		backgroundColor: "#111",
		overflow: "hidden",
	},
	cropBar: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 10,
		paddingVertical: 12,
	},
	aspectChip: {
		paddingHorizontal: 14,
		paddingVertical: 6,
		borderRadius: 16,
		backgroundColor: "rgba(255,255,255,0.1)",
	},
	aspectChipActive: {
		backgroundColor: Colors.focused,
	},
	aspectChipText: {
		color: "#fff",
		fontSize: 12,
	},
	rotateButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: "rgba(255,255,255,0.1)",
		justifyContent: "center",
		alignItems: "center",
	},
	drawBar: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 12,
		paddingVertical: 12,
	},
	colorSwatch: {
		width: 24,
		height: 24,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.3)",
	},
	colorSwatchActive: {
		borderWidth: 2,
		borderColor: "#fff",
	},
	fontChip: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 12,
		backgroundColor: "rgba(255,255,255,0.1)",
	},
	fontChipText: {
		color: "#fff",
		fontSize: 14,
	},
	bottomBar: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		paddingHorizontal: 16,
		paddingBottom: 30,
		paddingTop: 8,
	},
	viewOnceButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: "rgba(255,255,255,0.1)",
		justifyContent: "center",
		alignItems: "center",
	},
	viewOnceButtonActive: {
		backgroundColor: "#F04A4C",
	},
	captionInput: {
		flex: 1,
		backgroundColor: "rgba(255,255,255,0.12)",
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingVertical: 8,
		color: "#fff",
	},
	sendButton: {
		width: 42,
		height: 42,
		borderRadius: 21,
		backgroundColor: "#11BC6B",
		justifyContent: "center",
		alignItems: "center",
	},
	textModalBackdrop: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.6)",
		justifyContent: "center",
		padding: 24,
	},
	textModalInput: {
		color: "#fff",
		fontSize: 22,
		textAlign: "center",
	},
	textModalActions: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 24,
	},
	textModalActionText: {
		color: "#fff",
		fontSize: 16,
	},
	stickerModalBackdrop: {
		flex: 1,
		justifyContent: "flex-end",
		backgroundColor: "rgba(0,0,0,0.3)",
	},
	stickerModalSheet: {
		backgroundColor: "#fff",
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		overflow: "hidden",
	},
});
