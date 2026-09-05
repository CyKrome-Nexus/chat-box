import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import StickerView from "@/src/components/stickers/StickerView";
import Colors from "@/src/constants/Colors";
import { installPack } from "@/src/redux/features/stickersSlice";
import { ISticker, IStickerPack } from "@/src/interfaces/sticker-interface";

/**
 * Sticker pack install deep-link landing screen — `chat-box://addstickers/
 * [packId]` (mirrors `/join/[code]` for group invites). See
 * docs/architecture/stickers.md for why this only demonstrates the
 * mechanism on this same device rather than real cross-user pack sharing.
 */
const AddStickersScreen = () => {
	const dispatch = useDispatch();
	const params = useLocalSearchParams<{ packId: string }>();
	const packs = useSelector((state: any) => state.stickers.packs as IStickerPack[]);
	const stickers = useSelector((state: any) => state.stickers.stickers as Record<string, ISticker>);
	const installedPackIds = useSelector((state: any) => state.stickers.installedPackIds as string[]);

	const pack = packs.find((p) => p.id === params.packId);
	const alreadyInstalled = pack ? installedPackIds.includes(pack.id) : false;

	return (
		<View style={styles.container}>
			{!pack ? (
				<>
					<Ionicons name="close-circle-outline" size={48} color="#F04A4C" />
					<Text style={styles.title}>Sticker pack not found</Text>
				</>
			) : (
				<>
					<StickerView sticker={stickers[pack.thumbnailSticker]} size={100} />
					<Text style={styles.title}>{pack.name}</Text>
					<Text style={styles.subtitle}>{pack.stickerIds.length} stickers</Text>
					{alreadyInstalled ? (
						<Text style={styles.installedText}>Already installed</Text>
					) : (
						<TouchableOpacity style={styles.button} onPress={() => dispatch(installPack(pack.id))}>
							<Text style={styles.buttonText}>Add Sticker Pack</Text>
						</TouchableOpacity>
					)}
				</>
			)}
			<TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
				<Text style={styles.cancelText}>Close</Text>
			</TouchableOpacity>
		</View>
	);
};

export default AddStickersScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
		justifyContent: "center",
		alignItems: "center",
		gap: 8,
		paddingHorizontal: 40,
	},
	title: {
		fontSize: 18,
		fontWeight: "700",
		color: "#000E08",
		textAlign: "center",
	},
	subtitle: {
		fontSize: 13,
		color: "#797C7B",
	},
	installedText: {
		marginTop: 16,
		color: "#797C7B",
		fontSize: 13,
	},
	button: {
		marginTop: 16,
		backgroundColor: Colors.focused,
		paddingHorizontal: 32,
		paddingVertical: 14,
		borderRadius: 24,
	},
	buttonText: {
		color: "#fff",
		fontWeight: "700",
	},
	cancelText: {
		color: "#797C7B",
	},
});
