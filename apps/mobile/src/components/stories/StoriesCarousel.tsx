import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Image, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Animated, { FadeInRight } from "react-native-reanimated";

import Avatar from "@/src/components/images/Avatar";
import { AppText, ScalePressable, palette } from "@/src/components/ui";
import StoryCreateSheet, { type TStoryCreateOption } from "./StoryCreateSheet";
import type { IStory } from "@/src/interfaces/story-interface";
import { storyComposerBridge } from "@/src/lib/media/storyComposerBridge";
import { publishStory } from "@/src/lib/sync/storiesSync";
import type { RootState } from "@/src/redux/store/store";

interface IStoryGroup {
	authorId: string;
	authorName: string;
	authorAvatar?: IStory["authorAvatar"];
	hasUnviewed: boolean;
	latest: number;
}

const RING = 64;

// Status row on the dark home header: "My status" with an add badge, then contacts' stories.
const StoriesCarousel = () => {
	const user = useSelector((state: RootState) => state.user);
	const stories = useSelector((state: RootState) => state.stories.stories);
	const [showCreateSheet, setShowCreateSheet] = useState(false);

	const { mine, groups } = useMemo(() => {
		const now = Date.now();
		const live = stories.filter((story) => story.expiresAt > now);
		const byAuthor = new Map<string, IStory[]>();
		for (const story of live) byAuthor.set(story.authorId, [...(byAuthor.get(story.authorId) ?? []), story]);
		const mine = byAuthor.get("me") ?? [];
		byAuthor.delete("me");
		const groups: IStoryGroup[] = [...byAuthor.entries()].map(([authorId, items]) => ({
			authorId,
			authorName: items[0]?.authorName ?? "",
			authorAvatar: items[0]?.authorAvatar,
			hasUnviewed: items.some((story) => !story.viewedByMe),
			latest: Math.max(...items.map((story) => story.createdAt)),
		}));
		groups.sort((a, b) => Number(b.hasUnviewed) - Number(a.hasUnviewed) || b.latest - a.latest);
		return { mine, groups };
	}, [stories]);

	useEffect(() => {
		stories
			.filter((story) => story.type === "image" && story.uri && !story.viewedByMe)
			.slice(0, 6)
			.forEach((story) => void Image.prefetch(story.uri ?? ""));
	}, [stories]);

	const openViewer = (authorId: string) => router.push({ pathname: "/story-viewer", params: { authorId } });

	const publish = (input: Parameters<typeof publishStory>[0]) =>
		publishStory(input).catch((error: Error) => Alert.alert("Couldn't post your status", error.message));

	const handleComposed = (result: { uri: string; type: "image" | "video"; caption: string } | null) => {
		if (result) void publish({ type: result.type, uri: result.uri, text: result.caption || undefined });
	};

	const handleCreateOption = async (option: TStoryCreateOption) => {
		setShowCreateSheet(false);
		if (option === "text") return router.push("/story-text-editor");
		if (option === "camera") {
			storyComposerBridge.waitForResult(handleComposed);
			return router.push({ pathname: "/camera-capture", params: { target: "story" } });
		}
		const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (!permission.granted) return;
		const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"], quality: 0.85 });
		const asset = result.canceled ? undefined : result.assets[0];
		if (!asset) return;
		storyComposerBridge.waitForResult(handleComposed);
		router.push({ pathname: "/media-editor", params: { uri: asset.uri, type: asset.type === "video" ? "video" : "image", target: "story" } });
	};

	return (
		<View style={styles.container}>
			<FlatList
				horizontal
				showsHorizontalScrollIndicator={false}
				data={groups}
				keyExtractor={(item) => item.authorId}
				contentContainerStyle={styles.list}
				ListHeaderComponent={
					<ScalePressable accessibilityLabel="My status" onPress={() => (mine.length ? openViewer("me") : setShowCreateSheet(true))} style={styles.item}>
						<View style={[styles.ring, { borderColor: mine.length ? palette.storyRing : "rgba(255,255,255,0.35)" }]}>
							<Avatar data={user?.avatar} size={RING - 8} />
						</View>
						<ScalePressable accessibilityLabel="Add to my status" onPress={() => setShowCreateSheet(true)} style={styles.addBadge} hitSlop={8}>
							<Ionicons name="add" size={12} color={palette.ink} />
						</ScalePressable>
						<AppText variant="label" weight="regular" tone="inverse" numberOfLines={1} style={styles.label}>
							My status
						</AppText>
					</ScalePressable>
				}
				renderItem={({ item, index }) => (
					<Animated.View entering={FadeInRight.delay(index * 40).springify().damping(20)}>
						<ScalePressable accessibilityLabel={`${item.authorName}'s status`} onPress={() => openViewer(item.authorId)} style={styles.item}>
							<View style={[styles.ring, { borderColor: item.hasUnviewed ? palette.storyRing : "rgba(255,255,255,0.25)" }]}>
								<Avatar data={item.authorAvatar} size={RING - 8} />
							</View>
							<AppText variant="label" weight="regular" tone="inverse" numberOfLines={1} style={styles.label}>
								{item.authorName.split(" ")[0]}
							</AppText>
						</ScalePressable>
					</Animated.View>
				)}
			/>
			<StoryCreateSheet visible={showCreateSheet} onClose={() => setShowCreateSheet(false)} onSelect={(option) => void handleCreateOption(option)} />
		</View>
	);
};

const styles = StyleSheet.create({
	container: { paddingBottom: 24 },
	list: { gap: 16, paddingHorizontal: 24 },
	item: { alignItems: "center", width: RING + 6 },
	ring: { width: RING, height: RING, borderRadius: RING / 2, borderWidth: 2, alignItems: "center", justifyContent: "center" },
	addBadge: {
		position: "absolute",
		top: RING - 18,
		right: 2,
		width: 18,
		height: 18,
		borderRadius: 9,
		backgroundColor: palette.white,
		borderWidth: 1.5,
		borderColor: palette.ink,
		alignItems: "center",
		justifyContent: "center",
	},
	label: { marginTop: 8, maxWidth: RING + 6 },
});

export default StoriesCarousel;
