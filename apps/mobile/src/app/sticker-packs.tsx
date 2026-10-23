import { Alert, FlatList, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";

import StickerView from "@/src/components/stickers/StickerView";
import Colors from "@/src/constants/Colors";
import { installPack, movePack, uninstallPack } from "@/src/redux/features/stickersSlice";
import { ISticker, IStickerPack } from "@/src/interfaces/sticker-interface";
import { buildStickerPackDisplayLink } from "@/src/lib/stickers/packLink";

/** Sticker Pack Manager: install/uninstall, reorder, share via deep link. See docs/architecture/stickers.md. */
const StickerPacksScreen = () => {
	const dispatch = useDispatch();
	const packs = useSelector((state: any) => state.stickers.packs as IStickerPack[]);
	const stickers = useSelector((state: any) => state.stickers.stickers as Record<string, ISticker>);
	const installedPackIds = useSelector((state: any) => state.stickers.installedPackIds as string[]);

	const installedPacks = installedPackIds.map((id) => packs.find((p) => p.id === id)).filter((p): p is IStickerPack => !!p);
	const availablePacks = packs.filter((p) => !p.isCustom && !installedPackIds.includes(p.id));

	const handleShare = async (pack: IStickerPack) => {
		try {
			await Share.share({ message: `Check out the "${pack.name}" sticker pack on Chatbox: ${buildStickerPackDisplayLink(pack.id)}` });
		} catch {}
	};

	const handleCopyLink = async (pack: IStickerPack) => {
		await Clipboard.setStringAsync(buildStickerPackDisplayLink(pack.id));
		Alert.alert("Copied", "Sticker pack link copied to clipboard.");
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name="chevron-back" size={24} color="#000E08" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Sticker Packs</Text>
				<TouchableOpacity onPress={() => router.push("/sticker-maker")}>
					<Ionicons name="add-circle-outline" size={22} color={Colors.focused} />
				</TouchableOpacity>
			</View>

			<Text style={styles.sectionTitle}>Installed</Text>
			<FlatList
				data={installedPacks}
				keyExtractor={(item) => item.id}
				renderItem={({ item, index }) => (
					<View style={styles.packRow}>
						{stickers[item.thumbnailSticker] ? (
							<StickerView sticker={stickers[item.thumbnailSticker]} size={44} isVisible={false} />
						) : (
							<View style={styles.emptyThumb} />
						)}
						<View style={styles.packInfo}>
							<Text style={styles.packName}>{item.name}</Text>
							<Text style={styles.packCount}>{item.stickerIds.length} stickers</Text>
						</View>
						{!item.isCustom && (
							<>
								<TouchableOpacity onPress={() => dispatch(movePack({ packId: item.id, direction: "up" }))} disabled={index === 0}>
									<Ionicons name="chevron-up" size={20} color={index === 0 ? "#ccc" : "#797C7B"} />
								</TouchableOpacity>
								<TouchableOpacity
									onPress={() => dispatch(movePack({ packId: item.id, direction: "down" }))}
									disabled={index === installedPacks.length - 1}
								>
									<Ionicons name="chevron-down" size={20} color={index === installedPacks.length - 1 ? "#ccc" : "#797C7B"} />
								</TouchableOpacity>
								<TouchableOpacity onPress={() => handleShare(item)}>
									<Ionicons name="share-outline" size={20} color={Colors.focused} />
								</TouchableOpacity>
								<TouchableOpacity onPress={() => handleCopyLink(item)}>
									<Ionicons name="copy-outline" size={20} color={Colors.focused} />
								</TouchableOpacity>
								<TouchableOpacity onPress={() => dispatch(uninstallPack(item.id))}>
									<Ionicons name="trash-outline" size={20} color="#F04A4C" />
								</TouchableOpacity>
							</>
						)}
					</View>
				)}
				ListEmptyComponent={<Text style={styles.emptyText}>No packs installed</Text>}
			/>

			{availablePacks.length > 0 && (
				<>
					<Text style={styles.sectionTitle}>Available</Text>
					<FlatList
						data={availablePacks}
						keyExtractor={(item) => item.id}
						renderItem={({ item }) => (
							<View style={styles.packRow}>
								{stickers[item.thumbnailSticker] && (
									<StickerView sticker={stickers[item.thumbnailSticker]} size={44} isVisible={false} />
								)}
								<View style={styles.packInfo}>
									<Text style={styles.packName}>{item.name}</Text>
									<Text style={styles.packCount}>{item.stickerIds.length} stickers</Text>
								</View>
								<TouchableOpacity style={styles.installButton} onPress={() => dispatch(installPack(item.id))}>
									<Text style={styles.installButtonText}>Install</Text>
								</TouchableOpacity>
							</View>
						)}
					/>
				</>
			)}
		</View>
	);
};

export default StickerPacksScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingTop: 56,
		paddingHorizontal: 16,
		paddingBottom: 12,
	},
	headerTitle: {
		fontSize: 16,
		fontWeight: "700",
		color: "#000E08",
	},
	sectionTitle: {
		fontSize: 12,
		fontWeight: "700",
		color: "#797C7B",
		textTransform: "uppercase",
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 6,
	},
	packRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		paddingHorizontal: 16,
		paddingVertical: 8,
	},
	emptyThumb: {
		width: 44,
		height: 44,
		borderRadius: 8,
		backgroundColor: "#F2F8F7",
	},
	packInfo: {
		flex: 1,
	},
	packName: {
		fontSize: 14,
		fontWeight: "600",
		color: "#000E08",
	},
	packCount: {
		fontSize: 11,
		color: "#797C7B",
	},
	installButton: {
		backgroundColor: Colors.focused,
		paddingHorizontal: 14,
		paddingVertical: 6,
		borderRadius: 14,
	},
	installButtonText: {
		color: "#fff",
		fontSize: 12,
		fontWeight: "700",
	},
	emptyText: {
		paddingHorizontal: 16,
		color: "#797C7B",
		fontSize: 13,
	},
});
