import { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { EMOJI_CATEGORIES, IEmoji } from "@/src/constants/emojis";
import { useRecentEmojis } from "@/src/hooks/useRecentEmojis";
import Colors from "@/src/constants/Colors";

export const EMOJI_PICKER_HEIGHT = 280;
const NUM_COLUMNS = 8;

const EmojiPicker = ({ onSelectEmoji }: { onSelectEmoji: (emoji: string) => void }) => {
	const [query, setQuery] = useState("");
	const [activeCategory, setActiveCategory] = useState(EMOJI_CATEGORIES[0].key);
	const { recents, addRecent } = useRecentEmojis();

	const allEmojis = useMemo(() => EMOJI_CATEGORIES.flatMap((c) => c.emojis), []);

	const searchResults = useMemo(() => {
		if (!query.trim()) return null;
		const q = query.trim().toLowerCase();
		return allEmojis.filter(
			(e) => e.name.toLowerCase().includes(q) || e.keywords.some((k) => k.includes(q))
		);
	}, [query, allEmojis]);

	const activeEmojis: IEmoji[] = useMemo(() => {
		if (searchResults) return searchResults;
		if (activeCategory === "recent") {
			return allEmojis.filter((e) => recents.includes(e.char));
		}
		return EMOJI_CATEGORIES.find((c) => c.key === activeCategory)?.emojis || [];
	}, [searchResults, activeCategory, allEmojis, recents]);

	const handleSelect = (emoji: string) => {
		addRecent(emoji);
		onSelectEmoji(emoji);
	};

	return (
		<View style={styles.container}>
			<View style={styles.searchRow}>
				<Ionicons name="search" size={16} color="#797C7B" />
				<TextInput
					style={styles.searchInput}
					placeholder="Search emoji"
					placeholderTextColor="#797C7B"
					value={query}
					onChangeText={setQuery}
				/>
			</View>

			{!query.trim() && (
				<View style={styles.tabsRow}>
					<TouchableOpacity
						style={[styles.tab, activeCategory === "recent" && styles.tabActive]}
						onPress={() => setActiveCategory("recent")}
					>
						<Ionicons
							name="time-outline"
							size={18}
							color={activeCategory === "recent" ? Colors.focused : "#797C7B"}
						/>
					</TouchableOpacity>
					{EMOJI_CATEGORIES.map((category) => (
						<TouchableOpacity
							key={category.key}
							style={[styles.tab, activeCategory === category.key && styles.tabActive]}
							onPress={() => setActiveCategory(category.key)}
						>
							<Text style={styles.tabIcon}>{category.icon}</Text>
						</TouchableOpacity>
					))}
				</View>
			)}

			{activeEmojis.length === 0 ? (
				<View style={styles.emptyState}>
					<Text style={styles.emptyText}>
						{activeCategory === "recent" && !query.trim()
							? "No recent emojis yet"
							: "No emojis found"}
					</Text>
				</View>
			) : (
				<FlatList
					data={activeEmojis}
					numColumns={NUM_COLUMNS}
					keyExtractor={(item) => item.char}
					contentContainerStyle={styles.grid}
					keyboardShouldPersistTaps="handled"
					renderItem={({ item }) => (
						<TouchableOpacity style={styles.emojiCell} onPress={() => handleSelect(item.char)}>
							<Text style={styles.emojiChar}>{item.char}</Text>
						</TouchableOpacity>
					)}
				/>
			)}
		</View>
	);
};

export default EmojiPicker;

const styles = StyleSheet.create({
	container: {
		height: EMOJI_PICKER_HEIGHT,
		backgroundColor: "#fff",
		borderTopWidth: 1,
		borderTopColor: "#eee",
	},
	searchRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		marginHorizontal: 12,
		marginTop: 10,
		paddingHorizontal: 12,
		paddingVertical: 8,
		backgroundColor: "#F3F6F6",
		borderRadius: 12,
	},
	searchInput: {
		flex: 1,
		fontSize: 14,
		color: "#222",
	},
	tabsRow: {
		flexDirection: "row",
		paddingHorizontal: 8,
		paddingTop: 8,
	},
	tab: {
		flex: 1,
		paddingVertical: 8,
		alignItems: "center",
		borderBottomWidth: 2,
		borderBottomColor: "transparent",
	},
	tabActive: {
		borderBottomColor: Colors.focused,
	},
	tabIcon: {
		fontSize: 16,
	},
	grid: {
		paddingHorizontal: 8,
		paddingVertical: 4,
	},
	emojiCell: {
		flex: 1 / NUM_COLUMNS,
		aspectRatio: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	emojiChar: {
		fontSize: 24,
	},
	emptyState: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	emptyText: {
		color: "#797C7B",
		fontSize: 13,
	},
});
