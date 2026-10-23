import { useEffect, useMemo, useRef, useState } from "react";
import {
	Alert,
	Dimensions,
	Image,
	Modal,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { VideoView, useVideoPlayer } from "expo-video";

import Avatar from "@/src/components/images/Avatar";
import { IStory } from "@/src/interfaces/story-interface";
import { IUser } from "@/src/interfaces/user-interface";
import { viewStory, deleteStory, toggleArchiveStory } from "@/src/redux/features/storiesSlice";
import type { StoryViewer } from "@chatbox/shared";
import { errorMessage } from "@/src/lib/api/client";
import { storiesApi } from "@/src/lib/api/services";
import { sendMessage } from "@/src/lib/sync/chatSync";
import { openDirectConversation } from "@/src/lib/sync/contactsSync";
import { markStoryViewed, removeStory } from "@/src/lib/sync/storiesSync";
import type { RootState } from "@/src/redux/store/store";



const SCREEN = Dimensions.get("window");
const TICK_MS = 50;
const DURATION_MS = { image: 5000, text: 5000, video: 8000 } as const;

interface IGroup {
	authorId: string;
	authorName: string;
	authorAvatarUrl?: string;
	stories: IStory[];
}

/**
 * Full-screen story player: segmented top progress bars, tap left/right to
 * rewind/advance, press-and-hold to pause, swipe up to reply. See
 * docs/architecture/stories.md.
 */
const StoryViewerScreen = () => {
	const params = useLocalSearchParams<{ authorId: string }>();
	const dispatch = useDispatch();
	const user = useSelector((state: { user: IUser | null }) => state.user);
	const readReceiptsEnabled = useSelector((state: RootState) => state.user?.privacy?.readReceipts ?? true);
	const [viewers, setViewers] = useState<StoryViewer[]>([]);
	const allStories = useSelector((state: any) => state.stories.stories as IStory[]);

	const groups = useMemo<IGroup[]>(() => {
		const byAuthor = new Map<string, IStory[]>();
		for (const story of allStories) {
			if (!byAuthor.has(story.authorId)) byAuthor.set(story.authorId, []);
			byAuthor.get(story.authorId)!.push(story);
		}
		return Array.from(byAuthor.entries()).map(([authorId, stories]) => ({
			authorId,
			authorName: stories[0].authorName,
			authorAvatarUrl: stories[0].authorAvatar?.url,
			stories: [...stories].sort((a, b) => a.createdAt - b.createdAt),
		}));
	}, [allStories]);

	const [groupIndex, setGroupIndex] = useState(() => groups.findIndex((g) => g.authorId === params.authorId));
	const [storyIndex, setStoryIndex] = useState(0);
	const [progress, setProgress] = useState(0);
	const [paused, setPaused] = useState(false);
	const [showViewers, setShowViewers] = useState(false);
	const [showReplyInput, setShowReplyInput] = useState(false);
	const [replyText, setReplyText] = useState("");

	const group = groups[groupIndex];
	const story = group?.stories[storyIndex];
	const isOwnStory = group?.authorId === "me";

	const isHoldingRef = useRef(false);
	const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const elapsedRef = useRef(0);

	const videoPlayer = useVideoPlayer(story?.type === "video" ? story.uri || "" : "", (p) => {
		p.loop = false;
	});

	useEffect(() => {
		if (!group || groupIndex === -1) router.back();
	}, [group, groupIndex]);

	const goToStory = (nextGroupIndex: number, nextStoryIndex: number) => {
		if (nextGroupIndex < 0 || nextGroupIndex >= groups.length) {
			router.back();
			return;
		}
		setGroupIndex(nextGroupIndex);
		setStoryIndex(Math.max(0, nextStoryIndex));
	};

	const next = () => {
		if (!group) return;
		if (storyIndex < group.stories.length - 1) {
			setStoryIndex(storyIndex + 1);
		} else {
			goToStory(groupIndex + 1, 0);
		}
	};

	const prev = () => {
		if (storyIndex > 0) {
			setStoryIndex(storyIndex - 1);
		} else {
			const prevGroup = groups[groupIndex - 1];
			goToStory(groupIndex - 1, (prevGroup?.stories.length || 1) - 1);
		}
	};

	// Reset the progress timer whenever the current story changes.
	useEffect(() => {
		elapsedRef.current = 0;
		setProgress(0);
		if (story?.type === "video") videoPlayer.play();
	}, [groupIndex, storyIndex, story?.type, videoPlayer]);

	// Mark viewed (respecting the *viewer's own* Read Receipts setting — see
	// docs/architecture/stories-pipeline.md) + auto-advance timer.
	useEffect(() => {
		if (!story) return;
		if (!isOwnStory && readReceiptsEnabled) {
			dispatch(viewStory({ storyId: story.id, viewerId: user?.id ?? "me", viewerName: user?.name || "Me" }));
			void markStoryViewed(story.id);
		}

		const interval = setInterval(() => {
			if (paused || showReplyInput) return;

			if (story.type === "video") {
				// Segmented progress bar synced to the *actual* video
				// playback clock, not a fixed timer — the ticket's explicit
				// ask, and a real fix over the previous fixed-duration
				// approximation.
				const duration = videoPlayer.duration || DURATION_MS.video / 1000;
				const ratio = duration > 0 ? Math.min(1, videoPlayer.currentTime / duration) : 0;
				setProgress(ratio);
				if (ratio >= 1) next();
				return;
			}

			elapsedRef.current += TICK_MS;
			const ratio = Math.min(1, elapsedRef.current / DURATION_MS[story.type]);
			setProgress(ratio);
			if (ratio >= 1) next();
		}, TICK_MS);

		return () => clearInterval(interval);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [story?.id, paused, showReplyInput, readReceiptsEnabled]);

	if (!group || !story) return null;

	const handlePressIn = () => {
		holdTimerRef.current = setTimeout(() => {
			isHoldingRef.current = true;
			setPaused(true);
			if (story.type === "video") videoPlayer.pause();
		}, 200);
	};

	const handlePressOut = (x: number) => {
		if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
		if (isHoldingRef.current) {
			isHoldingRef.current = false;
			setPaused(false);
			if (story.type === "video") videoPlayer.play();
			return;
		}
		if (x < SCREEN.width / 3) prev();
		else next();
	};

	const handleDelete = () => {
		Alert.alert("Delete status?", undefined, [
			{ text: "Cancel", style: "cancel" },
			{ text: "Delete", style: "destructive", onPress: () => { void removeStory(story.id); router.back(); } },
		]);
	};

	const handleSendReply = async () => {
		if (!replyText.trim()) return;
		try {
			const conversationId = await openDirectConversation(group.authorId);
			await sendMessage({ conversationId, kind: "text", text: `↩️ Replied to your status: ${replyText.trim()}` }, { text: replyText.trim() });
		} catch (error) {
			Alert.alert("Couldn't send reply", errorMessage(error));
			return;
		}
		setReplyText("");
		setShowReplyInput(false);
		Alert.alert("Reply sent", `Sent to ${group.authorName}.`);
	};

	const swipeUpGesture = Gesture.Pan()
		.enabled(!isOwnStory)
		.onEnd((e) => {
			if (e.translationY < -60) setShowReplyInput(true);
		});

	return (
		<View style={styles.container}>
			<View style={styles.progressRow}>
				{group.stories.map((s, index) => (
					<View key={s.id} style={styles.progressTrack}>
						<View
							style={[
								styles.progressFill,
								{
									width:
										index < storyIndex ? "100%" : index === storyIndex ? `${progress * 100}%` : "0%",
								},
							]}
						/>
					</View>
				))}
			</View>

			<View style={styles.header}>
				<Avatar data={{ url: group.authorAvatarUrl || "" }} size={36} />
				<Text style={styles.headerName}>{isOwnStory ? "My Status" : group.authorName}</Text>
				<Text style={styles.headerTime}>{new Date(story.createdAt).toLocaleTimeString()}</Text>
				<View style={{ flex: 1 }} />
				{isOwnStory && (
					<>
						<TouchableOpacity onPress={() => dispatch(toggleArchiveStory(story.id))} style={{ marginRight: 12 }}>
							<Ionicons name={story.archivedByAuthor ? "archive" : "archive-outline"} size={22} color="#fff" />
						</TouchableOpacity>
						<TouchableOpacity onPress={handleDelete} style={{ marginRight: 12 }}>
							<Ionicons name="trash-outline" size={22} color="#fff" />
						</TouchableOpacity>
					</>
				)}
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name="close" size={26} color="#fff" />
				</TouchableOpacity>
			</View>

			<GestureDetector gesture={swipeUpGesture}>
				<View style={styles.content}>
					{story.type === "text" ? (
						<View style={[styles.textStory, { backgroundColor: story.backgroundColor || "#24786D" }]}>
							<Text style={styles.textStoryText}>{story.textContent}</Text>
						</View>
					) : story.type === "video" ? (
						<VideoView player={videoPlayer} style={styles.media} contentFit="cover" nativeControls={false} />
					) : (
						<Image source={{ uri: story.uri }} style={styles.media} />
					)}

					<Pressable
						style={StyleSheet.absoluteFill}
						onPressIn={handlePressIn}
						onPressOut={(e) => handlePressOut(e.nativeEvent.locationX)}
					/>

					{!!story.caption && (
						<View style={styles.captionBar}>
							<Text style={styles.captionText}>{story.caption}</Text>
						</View>
					)}
				</View>
			</GestureDetector>

			{isOwnStory ? (
				<TouchableOpacity
					style={styles.viewersBar}
					onPress={() => {
						setShowViewers(true);
						storiesApi.viewers(story.id).then(setViewers).catch(() => undefined);
					}}
				>
					<Ionicons name="eye-outline" size={18} color="#fff" />
					<Text style={styles.viewersText}>{story.viewCount ?? viewers.length} views</Text>
				</TouchableOpacity>
			) : (
				<TouchableOpacity style={styles.replyBar} onPress={() => setShowReplyInput(true)}>
					<Ionicons name="arrow-up-outline" size={16} color="rgba(255,255,255,0.7)" />
					<Text style={styles.replyBarText}>Swipe up to reply</Text>
				</TouchableOpacity>
			)}

			<Modal visible={showViewers} transparent animationType="slide" onRequestClose={() => setShowViewers(false)}>
				<Pressable style={styles.viewersBackdrop} onPress={() => setShowViewers(false)}>
					<Pressable style={styles.viewersSheet} onPress={(e) => e.stopPropagation()}>
						<Text style={styles.viewersTitle}>Viewed by {viewers.length}</Text>
						{viewers.length === 0 ? (
							<Text style={styles.viewersEmpty}>No views yet</Text>
						) : (
							viewers.map((v) => (
									<View key={v.user.id} style={styles.viewerRow}>
										<Text style={styles.viewerName}>{v.user.name}</Text>
										<Text style={styles.viewerTime}>{new Date(v.viewedAt).toLocaleTimeString()}</Text>
									</View>
								))
						)}
					</Pressable>
				</Pressable>
			</Modal>

			<Modal visible={showReplyInput} transparent animationType="fade" onRequestClose={() => setShowReplyInput(false)}>
				<View style={styles.replyModalBackdrop}>
					<View style={styles.replyModalCard}>
						<TextInput
							style={styles.replyModalInput}
							placeholder={`Reply to ${group.authorName}…`}
							placeholderTextColor="#797C7B"
							value={replyText}
							onChangeText={setReplyText}
							autoFocus
						/>
						<View style={styles.replyModalActions}>
							<TouchableOpacity onPress={() => setShowReplyInput(false)}>
								<Text style={styles.replyModalCancel}>Cancel</Text>
							</TouchableOpacity>
							<TouchableOpacity onPress={handleSendReply}>
								<Text style={styles.replyModalSend}>Send</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
		</View>
	);
};

export default StoryViewerScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
	},
	progressRow: {
		flexDirection: "row",
		gap: 4,
		paddingTop: 54,
		paddingHorizontal: 8,
	},
	progressTrack: {
		flex: 1,
		height: 3,
		borderRadius: 2,
		backgroundColor: "rgba(255,255,255,0.3)",
		overflow: "hidden",
	},
	progressFill: {
		height: "100%",
		backgroundColor: "#fff",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		paddingHorizontal: 12,
		paddingVertical: 10,
	},
	headerName: {
		color: "#fff",
		fontWeight: "700",
		fontSize: 14,
	},
	headerTime: {
		color: "rgba(255,255,255,0.7)",
		fontSize: 12,
	},
	content: {
		flex: 1,
	},
	media: {
		flex: 1,
		width: "100%",
	},
	textStory: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 30,
	},
	textStoryText: {
		color: "#fff",
		fontSize: 26,
		fontWeight: "700",
		textAlign: "center",
	},
	captionBar: {
		position: "absolute",
		bottom: 20,
		left: 20,
		right: 20,
	},
	captionText: {
		color: "#fff",
		fontSize: 15,
		textAlign: "center",
	},
	viewersBar: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 6,
		paddingVertical: 14,
	},
	viewersText: {
		color: "#fff",
		fontSize: 13,
	},
	replyBar: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 6,
		paddingVertical: 14,
	},
	replyBarText: {
		color: "rgba(255,255,255,0.7)",
		fontSize: 12,
	},
	viewersBackdrop: {
		flex: 1,
		justifyContent: "flex-end",
		backgroundColor: "rgba(0,0,0,0.4)",
	},
	viewersSheet: {
		backgroundColor: "#fff",
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		padding: 20,
		maxHeight: "60%",
	},
	viewersTitle: {
		fontSize: 16,
		fontWeight: "700",
		marginBottom: 12,
	},
	viewersEmpty: {
		color: "#797C7B",
	},
	viewerRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: "#f2f2f2",
	},
	viewerName: {
		fontSize: 14,
		color: "#000E08",
	},
	viewerTime: {
		fontSize: 12,
		color: "#797C7B",
	},
	replyModalBackdrop: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.6)",
		justifyContent: "center",
		padding: 24,
	},
	replyModalCard: {
		backgroundColor: "#fff",
		borderRadius: 16,
		padding: 16,
		gap: 12,
	},
	replyModalInput: {
		fontSize: 15,
		color: "#000E08",
	},
	replyModalActions: {
		flexDirection: "row",
		justifyContent: "flex-end",
		gap: 20,
	},
	replyModalCancel: {
		color: "#797C7B",
		fontSize: 14,
	},
	replyModalSend: {
		color: "#24786D",
		fontWeight: "700",
		fontSize: 14,
	},
});
