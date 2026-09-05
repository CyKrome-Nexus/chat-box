import { useMemo, useState } from "react";
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import Avatar from "@/src/components/images/Avatar";
import Colors from "@/src/constants/Colors";
import StoryCreateSheet, { TStoryCreateOption } from "./StoryCreateSheet";
import { IStory } from "@/src/interfaces/story-interface";
import { IUser } from "@/src/interfaces/user-interface";
import { addStory } from "@/src/redux/features/storiesSlice";
import { storyComposerBridge } from "@/src/lib/media/storyComposerBridge";
import { simulateStoryViews } from "@/src/lib/stories/simulateStoryViews";

const CURRENT_VIEWER_ID = "me";
const DAY_MS = 24 * 60 * 60 * 1000;

interface IStoryGroup {
	authorId: string;
	authorName: string;
	authorAvatar?: IStory["authorAvatar"];
	stories: IStory[];
	hasUnviewed: boolean;
}

/**
 * Horizontal row of status rings above the chat list: "My Status" first
 * (with a "+" badge to post), then every other author with an active story,
 * unviewed authors sorted before fully-viewed ones. See docs/architecture/stories.md.
 */
const StoriesCarousel = () => {
	const dispatch = useDispatch();
	const user = useSelector((state: { user: IUser | null }) => state.user);
	const stories = useSelector((state: any) => state.stories.stories as IStory[]);
	const statusPrivacy = useSelector((state: any) => state.settings.privacy.statusPrivacy as IStory["privacy"]);
	const [showCreateSheet, setShowCreateSheet] = useState(false);

	const { myStories, groups } = useMemo(() => {
		const byAuthor = new Map<string, IStory[]>();
		for (const story of stories) {
			if (!byAuthor.has(story.authorId)) byAuthor.set(story.authorId, []);
			byAuthor.get(story.authorId)!.push(story);
		}

		const myStories = byAuthor.get("me") || [];
		byAuthor.delete("me");

		const groups: IStoryGroup[] = Array.from(byAuthor.entries()).map(([authorId, authorStories]) => ({
			authorId,
			authorName: authorStories[0].authorName,
			authorAvatar: authorStories[0].authorAvatar,
			stories: authorStories,
			hasUnviewed: authorStories.some((s) => !s.views.some((v) => v.viewerId === CURRENT_VIEWER_ID)),
		}));
		groups.sort((a, b) => (a.hasUnviewed === b.hasUnviewed ? 0 : a.hasUnviewed ? -1 : 1));

		return { myStories, groups };
	}, [stories]);

	const openViewer = (authorId: string) => router.push({ pathname: "/story-viewer", params: { authorId } });

	const handleCreateOption = async (option: TStoryCreateOption) => {
		if (option === "text") {
			router.push("/story-text-editor");
			return;
		}
		if (option === "camera") {
			storyComposerBridge.waitForResult(handleComposedStory);
			router.push({ pathname: "/camera-capture", params: { target: "story" } });
			return;
		}
		// Gallery: pick directly, then route into the same editor used for photos
		// captured in-app, so stickers/text/doodle/caption still apply.
		const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (!permission.granted) return;
		const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"], quality: 0.9 });
		if (result.canceled || !result.assets?.[0]) return;
		const asset = result.assets[0];
		storyComposerBridge.waitForResult(handleComposedStory);
		router.push({
			pathname: "/media-editor",
			params: { uri: asset.uri, type: asset.type === "video" ? "video" : "image", target: "story" },
		});
	};

	const handleComposedStory = (result: { uri: string; type: "image" | "video"; caption: string } | null) => {
		if (!result) return;
		const now = Date.now();
		const id = `story-${now}-${Math.random().toString(36).slice(2, 8)}`;
		dispatch(
			addStory({
				id,
				authorId: "me",
				authorName: user?.name || user?.username || "Me",
				authorAvatar: { url: user?.avatar?.url || "" },
				type: result.type,
				uri: result.uri,
				caption: result.caption,
				createdAt: now,
				expiresAt: now + DAY_MS,
				views: [],
				privacy: statusPrivacy,
			})
		);
		simulateStoryViews(dispatch, id);
	};

	return (
		<View style={styles.container}>
			<FlatList
				horizontal
				showsHorizontalScrollIndicator={false}
				data={groups}
				keyExtractor={(item) => item.authorId}
				contentContainerStyle={{ gap: 14, paddingHorizontal: 16 }}
				ListHeaderComponent={
					<TouchableOpacity
						style={styles.item}
						onPress={() => (myStories.length ? openViewer("me") : setShowCreateSheet(true))}
					>
						<View style={styles.myStatusRing}>
							<Avatar data={user?.avatar} size={56} />
							<TouchableOpacity style={styles.addBadge} onPress={() => setShowCreateSheet(true)}>
								<Ionicons name="add" size={14} color="#fff" />
							</TouchableOpacity>
						</View>
						<Text style={styles.label} numberOfLines={1}>
							My Status
						</Text>
					</TouchableOpacity>
				}
				renderItem={({ item }) => (
					<TouchableOpacity style={styles.item} onPress={() => openViewer(item.authorId)}>
						<View style={[styles.ring, item.hasUnviewed ? styles.ringUnviewed : styles.ringViewed]}>
							{item.authorAvatar?.url ? (
								<Image source={{ uri: item.authorAvatar.url }} style={styles.avatarImage} />
							) : (
								<Avatar data={item.authorAvatar} size={54} />
							)}
						</View>
						<Text style={styles.label} numberOfLines={1}>
							{item.authorName.split(" ")[0]}
						</Text>
					</TouchableOpacity>
				)}
			/>

			<StoryCreateSheet
				visible={showCreateSheet}
				onClose={() => setShowCreateSheet(false)}
				onSelect={handleCreateOption}
			/>
		</View>
	);
};

export default StoriesCarousel;

const styles = StyleSheet.create({
	container: {
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: "#f2f2f2",
	},
	item: {
		alignItems: "center",
		width: 68,
		gap: 4,
	},
	ring: {
		width: 60,
		height: 60,
		borderRadius: 30,
		borderWidth: 2.5,
		justifyContent: "center",
		alignItems: "center",
	},
	ringUnviewed: {
		borderColor: Colors.focused,
	},
	ringViewed: {
		borderColor: "#ccc",
	},
	avatarImage: {
		width: 54,
		height: 54,
		borderRadius: 27,
	},
	myStatusRing: {
		width: 60,
		height: 60,
		justifyContent: "center",
		alignItems: "center",
	},
	addBadge: {
		position: "absolute",
		bottom: -2,
		right: -2,
		width: 20,
		height: 20,
		borderRadius: 10,
		backgroundColor: Colors.focused,
		borderWidth: 2,
		borderColor: "#fff",
		justifyContent: "center",
		alignItems: "center",
	},
	label: {
		fontSize: 11,
		color: "#333",
	},
});
