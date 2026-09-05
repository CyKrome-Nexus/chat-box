import { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import StickerView from "./StickerView";
import Colors from "@/src/constants/Colors";
import { toggleFavoriteSticker } from "@/src/redux/features/stickersSlice";
import { ISticker, IStickerPack } from "@/src/interfaces/sticker-interface";

export const STICKER_PICKER_HEIGHT = 260;
const NUM_COLUMNS = 4;

/**
 * Sticker keyboard panel — Recent/Favorites tabs plus one tab per installed
 * pack, matching the emoji picker's panel styling. See stickers.md.
 */
const StickerPicker = ({ onSelectSticker }: { onSelectSticker: (stickerId: string) => void }) => {
	const dispatch = useDispatch();
	const packs = useSelector((state: any) => state.stickers.packs as IStickerPack[]);
	const stickers = useSelector((state: any) => state.stickers.stickers as Record<string, ISticker>);
	const installedPackIds = useSelector((state: any) => state.stickers.installedPackIds as string[]);
	const favoriteStickerIds = useSelector((state: any) => state.stickers.favoriteStickerIds as string[]);
	const recentStickerIds = useSelector((state: any) => state.stickers.recentStickerIds as string[]);

	const installedPacks = useMemo(
		() => installedPackIds.map((id) => packs.find((p) => p.id === id)).filter((p): p is IStickerPack => !!p),
		[installedPackIds, packs]
	);

	const [activeTab, setActiveTab] = useState<string>("recent");

	const activeStickerIds: string[] =
		activeTab === "recent"
			? recentStickerIds
			: activeTab === "favorites"
				? favoriteStickerIds
				: installedPacks.find((p) => p.id === activeTab)?.stickerIds || [];

	return (
		<View style={styles.container}>
			<FlatList
				horizontal
				showsHorizontalScrollIndicator={false}
				style={styles.tabRow}
				data={[{ id: "recent", icon: "time-outline" as const }, { id: "favorites", icon: "star-outline" as const }, ...installedPacks.map((p) => ({ id: p.id, icon: undefined }))]}
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => (
					<TouchableOpacity
						style={[styles.tab, activeTab === item.id && styles.tabActive]}
						onPress={() => setActiveTab(item.id)}
					>
						{item.icon ? (
							<Ionicons name={item.icon} size={16} color={activeTab === item.id ? Colors.focused : "#797C7B"} />
						) : (
							<Text style={[styles.tabLabel, activeTab === item.id && styles.tabLabelActive]} numberOfLines={1}>
								{installedPacks.find((p) => p.id === item.id)?.name}
							</Text>
						)}
					</TouchableOpacity>
				)}
			/>

			<TouchableOpacity style={styles.managePacksLink} onPress={() => router.push("/sticker-packs")}>
				<Ionicons name="apps-outline" size={14} color={Colors.focused} />
				<Text style={styles.managePacksLinkText}>Manage Sticker Packs</Text>
				<TouchableOpacity onPress={() => router.push("/sticker-maker")}>
					<Ionicons name="add-circle-outline" size={18} color={Colors.focused} />
				</TouchableOpacity>
			</TouchableOpacity>

			{activeStickerIds.length === 0 ? (
				<View style={styles.emptyState}>
					<Text style={styles.emptyStateText}>
						{activeTab === "recent" ? "No recently used stickers" : activeTab === "favorites" ? "No favorites yet" : "Empty pack"}
					</Text>
				</View>
			) : (
				<FlatList
					data={activeStickerIds}
					keyExtractor={(id) => id}
					numColumns={NUM_COLUMNS}
					renderItem={({ item }) => {
						const sticker = stickers[item];
						if (!sticker) return null;
						return (
							<TouchableOpacity
								style={styles.stickerCell}
								onPress={() => onSelectSticker(item)}
								onLongPress={() => dispatch(toggleFavoriteSticker(item))}
							>
								<StickerView sticker={sticker} size={72} />
							</TouchableOpacity>
						);
					}}
				/>
			)}
		</View>
	);
};

export default StickerPicker;

const styles = StyleSheet.create({
	container: {
		height: STICKER_PICKER_HEIGHT,
		backgroundColor: "#fff",
		borderTopWidth: 1,
		borderTopColor: "#eee",
	},
	tabRow: {
		flexGrow: 0,
		paddingHorizontal: 10,
		paddingVertical: 8,
	},
	tab: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 14,
		marginRight: 6,
		backgroundColor: "#F3F6F6",
		justifyContent: "center",
	},
	tabActive: {
		backgroundColor: "#E4F3F0",
	},
	tabLabel: {
		fontSize: 12,
		color: "#797C7B",
		maxWidth: 90,
	},
	tabLabelActive: {
		color: Colors.focused,
		fontWeight: "600",
	},
	managePacksLink: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingHorizontal: 12,
		paddingBottom: 6,
	},
	managePacksLinkText: {
		flex: 1,
		fontSize: 11,
		color: Colors.focused,
	},
	stickerCell: {
		flex: 1 / NUM_COLUMNS,
		aspectRatio: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	emptyState: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	emptyStateText: {
		color: "#797C7B",
		fontSize: 12,
	},
});
