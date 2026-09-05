import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	TextInput,
	TouchableWithoutFeedback,
	Keyboard,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, runOnJS } from "react-native-reanimated";
import { KeyboardStickyView } from "react-native-keyboard-controller";

import BIcon from "@/src/components/buttons/BIcon";
import Colors from "@/src/constants/Colors";
import { clip } from "@/src/constants/svgs/icons";
import MessageBubble from "@/src/components/messages/MessageBubble";
import DateSeparator, { getDateLabel } from "@/src/components/messages/DateSeparator";
import EmptyChatState from "@/src/components/messages/EmptyChatState";
import AttachmentSheet, { TAttachmentOption } from "@/src/components/messages/AttachmentSheet";
import MediaViewerModal from "@/src/components/messages/MediaViewerModal";
import VoiceRecordingBar from "@/src/components/messages/VoiceRecordingBar";
import HandsfreeRecordingBar from "@/src/components/messages/HandsfreeRecordingBar";
import EmojiPicker from "@/src/components/messages/EmojiPicker";
import ReplyPreviewBar from "@/src/components/messages/ReplyPreviewBar";
import { composeMessage, seedConversation, updateAttachmentProgress } from "@/src/redux/features/messagesSlice";
import { useChatRealtime } from "@/src/hooks/useChatRealtime";
import { useAttachmentPicker } from "@/src/hooks/useAttachmentPicker";
import { useVoiceRecorder } from "@/src/hooks/useVoiceRecorder";
import { audioPlaybackManager } from "@/src/lib/audio/playbackManager";
import { IAttachment, IMessage } from "@/src/interfaces/message-interface";
import { IChatRibbon } from "@/src/interfaces/list-interface";

const SLIDE_TO_CANCEL_THRESHOLD = 80;
const SWIPE_UP_TO_LOCK_THRESHOLD = 80;

const MIN_INPUT_HEIGHT = 36;
const MAX_INPUT_HEIGHT = 120;

type TDisplayItem =
	| { kind: "separator"; id: string; label: string }
	| { kind: "message"; id: string; message: IMessage };

const buildDisplayData = (messages: IMessage[]): TDisplayItem[] => {
	const ascending = [...messages].sort((a, b) => a.timestamp - b.timestamp);
	const withSeparators: TDisplayItem[] = [];
	let lastLabel: string | null = null;

	for (const message of ascending) {
		const label = getDateLabel(message.timestamp);
		if (label !== lastLabel) {
			withSeparators.push({ kind: "separator", id: `sep-${label}`, label });
			lastLabel = label;
		}
		withSeparators.push({ kind: "message", id: message.id, message });
	}

	return withSeparators.reverse();
};

const Chat = () => {
	const params = useLocalSearchParams();
	const user: IChatRibbon | null = (() => {
		if (!params.user) return null;
		try {
			return JSON.parse(params.user as string);
		} catch {
			return null;
		}
	})();

	const conversationId = user?.id || user?.name || "unknown";
	const currentUserId = useSelector(
		(state: any) => state.user?._id || state.user?.username || "me"
	);

	const dispatch = useDispatch();
	const messages = useSelector(
		(state: any) => state.messages.byConversation[conversationId] as IMessage[] | undefined
	) || [];
	const { connectionStatus, typingUsers, sendMessage, notifyTyping } = useChatRealtime(
		conversationId,
		currentUserId
	);

	const [text, setText] = useState("");
	const [selection, setSelection] = useState({ start: 0, end: 0 });
	const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
	const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const [viewerUri, setViewerUri] = useState<string | undefined>();
	const [replyTo, setReplyTo] = useState<IMessage | null>(null);
	const flatListRef = useRef<FlatList>(null);
	const { pickAttachment } = useAttachmentPicker();
	const voiceRecorder = useVoiceRecorder();
	const [recordingMode, setRecordingMode] = useState<"idle" | "dragging" | "locked" | "preview">("idle");
	const [previewRecording, setPreviewRecording] = useState<{ uri: string; durationMillis: number; waveform: number[] } | null>(null);
	const slideX = useSharedValue(0);
	const slideY = useSharedValue(0);
	const sendMorph = useSharedValue(0);

	// Seed a small, realistic backlog for existing conversations (identified by
	// having a preview `lastMessage`) so the timeline/bubble UI has something to
	// show; brand-new conversations stay empty and render EmptyChatState.
	useEffect(() => {
		if (!user?.lastMessage) return;

		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		yesterday.setHours(18, 30, 0, 0);

		const today = new Date();
		today.setHours(today.getHours() - 1, 0, 0, 0);

		dispatch(
			seedConversation({
				conversationId,
				messages: [
					{
						id: `${conversationId}-seed-1`,
						conversationId,
						text: `Hey! Nice to chat with you 👋`,
						type: "receiver",
						timestamp: yesterday.getTime(),
					},
					{
						id: `${conversationId}-seed-2`,
						conversationId,
						text: user.lastMessage,
						type: "receiver",
						timestamp: today.getTime(),
					},
				],
			})
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [conversationId]);

	const displayData = useMemo(() => buildDisplayData(messages), [messages]);

	// Lets voice notes auto-play the next one in the thread on finish (see
	// audioPlaybackManager.playNext / docs/architecture/voice-note-studio.md).
	useEffect(() => {
		const audioMessageIds = [...messages]
			.sort((a, b) => a.timestamp - b.timestamp)
			.filter((m) => m.attachment?.type === "audio")
			.map((m) => m.id);
		audioPlaybackManager.registerSequence(conversationId, audioMessageIds);
	}, [messages, conversationId]);

	const handleSend = () => {
		if (!text.trim()) return;

		sendMessage(
			text,
			replyTo ? { text: replyTo.text || "Attachment", isSender: replyTo.type === "sender" } : undefined
		);
		setText("");
		setInputHeight(MIN_INPUT_HEIGHT);
		setReplyTo(null);

		requestAnimationFrame(() => {
			flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
		});
	};

	const handleSelectEmoji = (emoji: string) => {
		const before = text.slice(0, selection.start);
		const after = text.slice(selection.end);
		const nextText = before + emoji + after;
		const cursor = before.length + emoji.length;

		setText(nextText);
		setSelection({ start: cursor, end: cursor });
	};

	const sendAttachmentMessage = (attachment: IAttachment) => {
		const message: IMessage = {
			id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
			conversationId,
			text: "",
			type: "sender",
			timestamp: Date.now(),
		};

		dispatch(composeMessage({ conversationId, message: { ...message, attachment }, queued: false }));

		requestAnimationFrame(() => {
			flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
		});

		// Simulate an upload progress bar for media/documents — there is no
		// backend/storage service in this repo yet to upload to for real.
		if (attachment.uploadProgress != null) {
			let progress = 0;
			const interval = setInterval(() => {
				progress = Math.min(100, progress + 20);
				dispatch(updateAttachmentProgress({ conversationId, messageId: message.id, progress }));
				if (progress >= 100) clearInterval(interval);
			}, 250);
		}
	};

	const handleAttachmentOption = async (option: TAttachmentOption) => {
		const attachment = await pickAttachment(option);
		if (attachment) sendAttachmentMessage(attachment);
	};

	const handleStartRecording = () => {
		voiceRecorder.start();
		setRecordingMode("dragging");
	};

	const handleLockRecording = () => {
		setRecordingMode("locked");
	};

	const handleFinishRecording = async (cancelled: boolean) => {
		if (cancelled) {
			await voiceRecorder.cancel();
			setRecordingMode("idle");
			return;
		}

		const result = await voiceRecorder.stop();
		setRecordingMode("idle");
		if (!result) return;

		sendAttachmentMessage({
			type: "audio",
			uri: result.uri,
			duration: result.durationMillis / 1000,
			waveform: result.waveform,
			uploadProgress: 0,
		});
	};

	const handlePauseForPreview = async () => {
		const result = await voiceRecorder.stop();
		if (!result) {
			setRecordingMode("idle");
			return;
		}
		setPreviewRecording(result);
		setRecordingMode("preview");
	};

	const handleDiscardRecording = async () => {
		if (recordingMode === "locked") await voiceRecorder.cancel();
		setPreviewRecording(null);
		setRecordingMode("idle");
	};

	const handleSendPreview = () => {
		if (!previewRecording) return;
		sendAttachmentMessage({
			type: "audio",
			uri: previewRecording.uri,
			duration: previewRecording.durationMillis / 1000,
			waveform: previewRecording.waveform,
			uploadProgress: 0,
		});
		setPreviewRecording(null);
		setRecordingMode("idle");
	};

	const micPanGesture = Gesture.Pan()
		.minDistance(0)
		.enabled(recordingMode === "idle" || recordingMode === "dragging")
		.onBegin(() => {
			runOnJS(handleStartRecording)();
		})
		.onUpdate((e) => {
			slideX.value = Math.min(0, e.translationX);
			slideY.value = Math.min(0, e.translationY);
		})
		.onEnd(() => {
			const cancelled = slideX.value < -SLIDE_TO_CANCEL_THRESHOLD;
			const locked = slideY.value < -SWIPE_UP_TO_LOCK_THRESHOLD;

			if (locked && !cancelled) {
				runOnJS(handleLockRecording)();
			} else {
				runOnJS(handleFinishRecording)(cancelled);
			}
			slideX.value = withSpring(0);
			slideY.value = withSpring(0);
		});

	const micAnimatedStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: slideX.value }, { scale: voiceRecorder.isRecording ? 1.15 : 1 }],
	}));

	// Morph target: 0 = mic fully visible, 1 = send fully visible.
	useEffect(() => {
		sendMorph.value = withTiming(text.trim() ? 1 : 0, { duration: 180 });
	}, [text, sendMorph]);

	const micMorphStyle = useAnimatedStyle(() => ({
		opacity: 1 - sendMorph.value,
		transform: [{ scale: 1 - sendMorph.value * 0.4 }],
	}));
	const sendMorphStyle = useAnimatedStyle(() => ({
		opacity: sendMorph.value,
		transform: [{ scale: 0.6 + sendMorph.value * 0.4 }],
	}));

	const isTyping = typingUsers.length > 0;
	const hasText = !!text.trim();

	const renderItem = ({ item }: { item: TDisplayItem }) => (
		<View style={styles.invertedItem}>
			{item.kind === "separator" ? (
				<DateSeparator label={item.label} />
			) : (
				<MessageBubble
					message={item.message}
					avatar={user?.avatar}
					onPressImage={setViewerUri}
					onSwipeReply={setReplyTo}
				/>
			)}
		</View>
	);

	return (
		<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
			<View style={styles.container}>
				{connectionStatus === "offline" && (
					<View style={styles.offlineBanner}>
						<Text style={styles.offlineBannerText}>
							You're offline — messages will send once you're back online
						</Text>
					</View>
				)}
				{isTyping && (
					<View style={styles.typingBanner}>
						<Text style={styles.typingBannerText}>{user?.name || "Contact"} is typing…</Text>
					</View>
				)}

				<View style={styles.messagesArea}>
					{displayData.length === 0 ? (
						<EmptyChatState name={user?.name} />
					) : (
						<FlatList
							ref={flatListRef}
							data={displayData}
							renderItem={renderItem}
							keyExtractor={(item) => item.id}
							contentContainerStyle={styles.messageList}
							showsVerticalScrollIndicator={false}
							keyboardShouldPersistTaps="handled"
							inverted
						/>
					)}
				</View>

				<KeyboardStickyView>
					{replyTo && recordingMode === "idle" && (
						<ReplyPreviewBar
							message={replyTo}
							contactName={user?.name}
							onDismiss={() => setReplyTo(null)}
						/>
					)}

					<View style={styles.inputBar}>
						{recordingMode === "dragging" ? (
							<VoiceRecordingBar
								durationMillis={voiceRecorder.durationMillis}
								waveform={voiceRecorder.waveform}
								slideX={slideX}
								slideY={slideY}
							/>
						) : recordingMode === "locked" || recordingMode === "preview" ? (
							<HandsfreeRecordingBar
								mode={recordingMode}
								durationMillis={voiceRecorder.durationMillis}
								waveform={recordingMode === "locked" ? voiceRecorder.waveform : previewRecording?.waveform || []}
								previewUri={previewRecording?.uri}
								onPauseForPreview={handlePauseForPreview}
								onDiscard={handleDiscardRecording}
								onSend={handleSendPreview}
							/>
						) : (
							<>
								<BIcon
									style={{ marginHorizontal: 5 }}
									svg={clip}
									height={20}
									width={20}
									onPress={() => setShowAttachmentSheet(true)}
								/>
								<View style={styles.inputContainer}>
									<TextInput
										style={[styles.textInput, { height: inputHeight }]}
										placeholder="Type your message"
										placeholderTextColor="#797C7B"
										returnKeyType="send"
										blurOnSubmit={false}
										value={text}
										selection={selection}
										onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
										onChangeText={(value) => {
											setText(value);
											if (value.trim()) notifyTyping();
										}}
										multiline
										onContentSizeChange={(e) => {
											const nextHeight = Math.min(
												MAX_INPUT_HEIGHT,
												Math.max(MIN_INPUT_HEIGHT, e.nativeEvent.contentSize.height)
											);
											setInputHeight(nextHeight);
										}}
										onSubmitEditing={handleSend}
										onFocus={() => {
											setShowEmojiPicker(false);
											requestAnimationFrame(() => {
												flatListRef.current?.scrollToOffset({
													offset: 0,
													animated: true,
												});
											});
										}}
									/>
								</View>
								<TouchableOpacity
									onPress={() => {
										Keyboard.dismiss();
										setShowEmojiPicker((prev) => !prev);
									}}
								>
									<MaterialCommunityIcons
										name="sticker-emoji"
										size={22}
										color={showEmojiPicker ? Colors.focused : "#818181"}
									/>
								</TouchableOpacity>
							</>
						)}

						{/* Morphing mic <-> send: both share the same box and cross-fade/scale
						    based on whether there's text, instead of two separately-shown buttons.
						    Hidden once locked/preview — HandsfreeRecordingBar has its own send button. */}
						{(recordingMode === "idle" || recordingMode === "dragging") && (
							<View style={styles.actionButtonSlot}>
								<GestureDetector gesture={micPanGesture}>
									<Animated.View
										style={[
											styles.micButton,
											voiceRecorder.isRecording && styles.micButtonActive,
											micAnimatedStyle,
											micMorphStyle,
										]}
										pointerEvents={hasText ? "none" : "auto"}
									>
										<Ionicons name="mic" size={20} color={voiceRecorder.isRecording ? "#fff" : "#818181"} />
									</Animated.View>
								</GestureDetector>

								<Animated.View
									style={[styles.sendButton, sendMorphStyle, StyleSheet.absoluteFill]}
									pointerEvents={hasText ? "auto" : "none"}
								>
									<TouchableOpacity style={styles.sendButtonTouchable} onPress={handleSend}>
										<Ionicons name="send" size={22} color="#fff" />
									</TouchableOpacity>
								</Animated.View>
							</View>
						)}
					</View>

					{showEmojiPicker && <EmojiPicker onSelectEmoji={handleSelectEmoji} />}
				</KeyboardStickyView>

				<AttachmentSheet
					visible={showAttachmentSheet}
					onClose={() => setShowAttachmentSheet(false)}
					onSelect={handleAttachmentOption}
				/>
				<MediaViewerModal
					uri={viewerUri}
					visible={!!viewerUri}
					onClose={() => setViewerUri(undefined)}
				/>
			</View>
		</TouchableWithoutFeedback>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fcfcfc",
	},
	messagesArea: {
		flex: 1,
	},
	messageList: {
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 16,
	},
	invertedItem: {
		transform: [{ scaleY: -1 }],
	},
	inputBar: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 10,
		paddingVertical: 10,
		backgroundColor: "#fff",
		borderTopWidth: 1,
		borderTopColor: "#eee",
	},
	inputContainer: {
		flex: 1,
		marginHorizontal: 8,
		backgroundColor: "#F3F6F6",
		borderRadius: 20,
		paddingHorizontal: 14,
		paddingVertical: 5,
	},
	textInput: {
		fontSize: 16,
		minHeight: 32,
		color: "#222",
	},
	actionButtonSlot: {
		width: 38,
		height: 38,
		marginLeft: 4,
	},
	sendButton: {
		borderRadius: 21,
		justifyContent: "center",
		alignItems: "center",
	},
	sendButtonTouchable: {
		flex: 1,
		width: "100%",
		borderRadius: 21,
		backgroundColor: "#11BC6B",
		justifyContent: "center",
		alignItems: "center",
	},
	micButton: {
		position: "absolute",
		width: 38,
		height: 38,
		borderRadius: 19,
		justifyContent: "center",
		alignItems: "center",
	},
	micButtonActive: {
		backgroundColor: "#F04A4C",
	},
	offlineBanner: {
		backgroundColor: "#F04A4C",
		paddingVertical: 6,
		paddingHorizontal: 16,
	},
	offlineBannerText: {
		color: "#fff",
		fontSize: 12,
		textAlign: "center",
	},
	typingBanner: {
		paddingVertical: 4,
		paddingHorizontal: 16,
	},
	typingBannerText: {
		color: "#797C7B",
		fontSize: 12,
		fontStyle: "italic",
	},
});

export default Chat;
