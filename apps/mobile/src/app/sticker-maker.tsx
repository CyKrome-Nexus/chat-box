import { useRef, useState } from "react";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useDispatch } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import Svg, { ClipPath, Defs, Image as SvgImage, Path } from "react-native-svg";
import { captureRef } from "react-native-view-shot";

import { addCustomSticker } from "@/src/redux/features/stickersSlice";

const SIZE = Math.min(Dimensions.get("window").width - 40, 340);

/**
 * In-app custom sticker maker: pick a photo, hand-draw a lasso outline
 * (a real, working substitute for the ticket's automatic ML subject
 * segmentation — see docs/architecture/stickers.md for why that part isn't
 * implemented here), get a white border baked around the cutout, and save
 * into "My Stickers".
 */
const StickerMakerScreen = () => {
	const dispatch = useDispatch();
	const [photoUri, setPhotoUri] = useState<string | null>(null);
	const [lassoPath, setLassoPath] = useState("");
	const [isClosed, setIsClosed] = useState(false);
	const canvasRef = useRef<View>(null);

	const handlePickPhoto = async () => {
		const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (!permission.granted) return;
		const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 });
		if (result.canceled || !result.assets?.[0]) return;
		setPhotoUri(result.assets[0].uri);
		setLassoPath("");
		setIsClosed(false);
	};

	const handleBegin = (x: number, y: number) => setLassoPath(`M${x},${y}`);
	const handleUpdate = (x: number, y: number) => setLassoPath((prev) => `${prev} L${x},${y}`);
	const handleEnd = () => {
		setLassoPath((prev) => (prev ? `${prev} Z` : prev));
		setIsClosed(true);
	};

	const lassoGesture = Gesture.Pan()
		.enabled(!!photoUri)
		.minDistance(0)
		.onBegin((e) => runOnJS(handleBegin)(e.x, e.y))
		.onUpdate((e) => runOnJS(handleUpdate)(e.x, e.y))
		.onEnd(() => runOnJS(handleEnd)());

	const handleClearLasso = () => {
		setLassoPath("");
		setIsClosed(false);
	};

	const handleSave = async () => {
		if (!canvasRef.current) return;
		const uri = await captureRef(canvasRef, { format: "png", quality: 1 });
		const id = `custom-${Date.now()}`;
		dispatch(addCustomSticker({ id, packId: "my-stickers", type: "webp", source: uri }));
		router.back();
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name="close" size={26} color="#fff" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>New Sticker</Text>
				<TouchableOpacity onPress={handleSave} disabled={!isClosed}>
					<Text style={[styles.saveText, !isClosed && styles.saveTextDisabled]}>Save</Text>
				</TouchableOpacity>
			</View>

			{!photoUri ? (
				<TouchableOpacity style={styles.pickButton} onPress={handlePickPhoto}>
					<Ionicons name="image-outline" size={32} color="#fff" />
					<Text style={styles.pickButtonText}>Choose a Photo</Text>
				</TouchableOpacity>
			) : (
				<>
					<GestureDetector gesture={lassoGesture}>
						<View ref={canvasRef} collapsable={false} style={styles.canvas}>
							<Svg width={SIZE} height={SIZE}>
								<Defs>
									<ClipPath id="lasso">
										<Path d={lassoPath || "M0,0"} />
									</ClipPath>
								</Defs>
								<SvgImage
									href={{ uri: photoUri }}
									x={0}
									y={0}
									width={SIZE}
									height={SIZE}
									preserveAspectRatio="xMidYMid slice"
									clipPath={isClosed ? "url(#lasso)" : undefined}
									opacity={isClosed ? 1 : 0.4}
								/>
								{!!lassoPath && (
									<Path
										d={lassoPath}
										stroke="#fff"
										strokeWidth={10}
										strokeLinejoin="round"
										strokeLinecap="round"
										fill="none"
									/>
								)}
							</Svg>
						</View>
					</GestureDetector>

					<Text style={styles.hint}>
						{isClosed ? "Outline traced — Save to add to My Stickers" : "Trace around the subject with your finger"}
					</Text>

					<View style={styles.actionsRow}>
						<TouchableOpacity style={styles.secondaryButton} onPress={handlePickPhoto}>
							<Text style={styles.secondaryButtonText}>Change Photo</Text>
						</TouchableOpacity>
						<TouchableOpacity style={styles.secondaryButton} onPress={handleClearLasso}>
							<Text style={styles.secondaryButtonText}>Retrace</Text>
						</TouchableOpacity>
					</View>
				</>
			)}
		</View>
	);
};

export default StickerMakerScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#111",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingTop: 56,
		paddingHorizontal: 20,
		paddingBottom: 12,
	},
	headerTitle: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "700",
	},
	saveText: {
		color: "#11BC6B",
		fontWeight: "700",
		fontSize: 15,
	},
	saveTextDisabled: {
		color: "#555",
	},
	pickButton: {
		alignSelf: "center",
		marginTop: 100,
		alignItems: "center",
		gap: 10,
		backgroundColor: "rgba(255,255,255,0.08)",
		paddingHorizontal: 30,
		paddingVertical: 24,
		borderRadius: 16,
	},
	pickButtonText: {
		color: "#fff",
		fontSize: 14,
	},
	canvas: {
		alignSelf: "center",
		width: SIZE,
		height: SIZE,
		marginTop: 20,
		borderRadius: 16,
		overflow: "hidden",
		backgroundColor: "transparent",
	},
	hint: {
		color: "rgba(255,255,255,0.6)",
		fontSize: 12,
		textAlign: "center",
		marginTop: 12,
	},
	actionsRow: {
		flexDirection: "row",
		justifyContent: "center",
		gap: 16,
		marginTop: 16,
	},
	secondaryButton: {
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 14,
		backgroundColor: "rgba(255,255,255,0.1)",
	},
	secondaryButtonText: {
		color: "#fff",
		fontSize: 13,
	},
});
