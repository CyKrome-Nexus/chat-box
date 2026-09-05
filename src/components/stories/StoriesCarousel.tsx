import { useEffect, useMemo, useState } from "react";
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import Avatar from "@/src/components/images/Avatar";
import Colors from "@/src/constants/Colors";
import StoryCreateSheet, { TStoryCreateOption } from "./StoryCreateSheet";
import StoryAudienceModal from "./StoryAudienceModal";
import { IStory } from "@/src/interfaces/story-interface";
import { IUser } from "@/src/interfaces/user-interface";
import { IChatRibbon } from "@/src/interfaces/list-interface";
import { addStory, setStoryKeyDistribution } from "@/src/redux/features/storiesSlice";
import { storyComposerBridge } from "@/src/lib/media/storyComposerBridge";
import { simulateStoryViews } from "@/src/lib/stories/simulateStoryViews";
import { resolveStoryAudience } from "@/src/lib/stories/storyAudience";
import { distributeStoryKey } from "@/src/lib/stories/storyEncryption";

const CURRENT_VIEWER_ID = "me";
const DAY_MS = 24 * 60 * 60 * 1000;

interface IStoryGroup {
	authorId: string;
	authorName: string;
	authorAvatar?: IStory["authorAvatar"];
	stories: IStory[];
	hasUnviewed: boolean;
	muted: boolean;
}

/**
 * Horizontal row of status rings above the chat list: "My Status" first
 * (with a "+" badge to post), then every other author with an active story,
 * unviewed authors sorted before fully-viewed ones, and muted contacts'
 * statuses collapsed into a "Muted Updates" accordion at the end. See
 * docs/architecture/stories-pipeline.md.
 */
const StoriesCarousel = () => {
	const dispatch = useDispatch();
	const user = useSelector((state: { user: IUser | null }) => state.user);
	const stories = useSelector((state: any) => state.stories.stories as IStory[]);
	const chats = useSelector((state: any) => state.chats.chats as IChatRibbon[]);
	const statusPrivacy = useSelector((state: any) => state.settings.privacy.statusPrivacy as IStory["privacy"]);
	const [showCreateSheet, setShowCreateSheet] = useState(false);
	const [showAudienceModal, setShowAudienceModal] = useState(false);
	const [pendingAudienceIds, setPendingAudienceIds] = useState<string[]>([]);
	const [showMutedUpdates, setShowMutedUpdates] = useState(false);

	const { myStories, groups, mutedGroups } = useMemo(() => {
		const byAuthor = new Map<string, IStory[]>();
		for (const story of stories) {
			if (!byAuthor.has(story.authorId)) byAuthor.set(story.authorId, []);
			byAuthor.get(story.authorId)!.push(story);
		}

		const myStories = byAuthor.get("me") || [];
		byAuthor.delete("me");

		const allGroups: IStoryGroup[] = Array.from(byAuthor.entries()).map(([authorId, authorStories]) => ({
			authorId,
			authorName: authorStories[0].authorName,
			authorAvatar: authorStories[0].authorAvatar,
			stories: authorStories,
			hasUnviewed: authorStories.some((s) => !s.views.some((v) => v.viewerId === CURRENT_VIEWER_ID)),
			muted: !!chats.find((c) => c.id === authorId)?.muted,
		}));

		const groups = allGroups.filter((g) => !g.muted);
		const mutedGroups = allGroups.filter((g) => g.muted);
		groups.sort((a, b) => (a.hasUnviewed === b.hasUnviewed ? 0 : a.hasUnviewed ? -1 : 1));

		return { myStories, groups, mutedGroups };
	}, [stories, chats]);

	// Preloading engine: prefetch the first photo of the next couple of
	// unviewed authors' stories so tapping into them feels instant — the
	// ticket's "< 100ms" launch target for prefetched media.
	useEffect(() => {
		groups
			.slice(0, 3)
			.flatMap((g) => g.stories)
			.filter((s) => s.type === "image" && s.uri)
			.forEach((s) => Image.prefetch(s.uri!));
	}, [groups]);

	const openViewer = (authorId: string) => router.push({ pathname: "/story-viewer", params: { authorId } });

	const needsAudiencePicker = statusPrivacy !== "contacts";

	const handlePressAdd = () => {
		if (needsAudiencePicker) {
			setShowAudienceModal(true);
		} else {
			setShowCreateSheet(true);
		}
	};

	const handleConfirmAudience = (audienceIds: string[]) => {
		setPendingAudienceIds(audienceIds);
		setShowAudienceModal(false);
		setShowCreateSheet(true);
	};

	const handleCreateOption = async (option: TStoryCreateOption) => {
		if (option === "text") {
			router.push({
				pathname: "/story-text-editor",
				params: { audienceIds: JSON.stringify(pendingAudienceIds) },
			});
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

	const distributeAndTrack = async (storyId: string, audienceIds: string[]) => {
		const audienceConversationIds = resolveStoryAudience(chats, statusPrivacy, audienceIds);
		const keyDistribution = await distributeStoryKey(storyId, audienceConversationIds);
		dispatch(setStoryKeyDistribution({ storyId, keyDistribution }));
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
				audienceIds: pendingAudienceIds,
			})
		);
		simulateStoryViews(dispatch, id);
		distributeAndTrack(id, pendingAudienceIds);
		setPendingAudienceIds([]);
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
						onPress={() => (myStories.length ? openViewer("me") : handlePressAdd())}
					>
						<View style={styles.myStatusRing}>
							<Avatar data={user?.avatar} size={56} />
							<TouchableOpacity style={styles.addBadge} onPress={handlePressAdd}>
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
				ListFooterComponent={
					mutedGroups.length > 0 ? (
						<View style={styles.mutedSection}>
							<TouchableOpacity style={styles.mutedToggle} onPress={() => setShowMutedUpdates((v) => !v)}>
								<Ionicons name={showMutedUpdates ? "chevron-back" : "chevron-forward"} size={16} color="#797C7B" />
								<Text style={styles.mutedToggleText}>Muted ({mutedGroups.length})</Text>
							</TouchableOpacity>
							{showMutedUpdates &&
								mutedGroups.map((item) => (
									<TouchableOpacity key={item.authorId} style={styles.item} onPress={() => openViewer(item.authorId)}>
										<View style={[styles.ring, styles.ringViewed]}>
											<Avatar data={item.authorAvatar} size={54} />
										</View>
										<Text style={styles.label} numberOfLines={1}>
											{item.authorName.split(" ")[0]}
										</Text>
									</TouchableOpacity>
								))}
						</View>
					) : null
				}
			/>

			<StoryAudienceModal
				visible={showAudienceModal}
				privacy={statusPrivacy}
				onCancel={() => setShowAudienceModal(false)}
				onConfirm={handleConfirmAudience}
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
	mutedSection: {
		flexDirection: "row",
		alignItems: "center",
		gap: 14,
	},
	mutedToggle: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		width: 90,
		paddingHorizontal: 8,
	},
	mutedToggleText: {
		fontSize: 11,
		color: "#797C7B",
	},
});
