import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	Platform,
	FlatList,
	TouchableOpacity,
	TextInput,
	TouchableWithoutFeedback,
	Keyboard,
	KeyboardEvent,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, runOnJS } from "react-native-reanimated";

import BIcon from "@/src/components/buttons/BIcon";
import { clip } from "@/src/constants/svgs/icons";
import MessageBubble from "@/src/components/messages/MessageBubble";
import DateSeparator, { getDateLabel } from "@/src/components/messages/DateSeparator";
import EmptyChatState from "@/src/components/messages/EmptyChatState";
import AttachmentSheet, { TAttachmentOption } from "@/src/components/messages/AttachmentSheet";
import MediaViewerModal from "@/src/components/messages/MediaViewerModal";
import VoiceRecordingBar from "@/src/components/messages/VoiceRecordingBar";
import { composeMessage, seedConversation, updateAttachmentProgress } from "@/src/redux/features/messagesSlice";
import { useChatRealtime } from "@/src/hooks/useChatRealtime";
import { useAttachmentPicker } from "@/src/hooks/useAttachmentPicker";
import { useVoiceRecorder } from "@/src/hooks/useVoiceRecorder";
import { IAttachment, IMessage } from "@/src/interfaces/message-interface";
import { IChatRibbon } from "@/src/interfaces/list-interface";

const SLIDE_TO_CANCEL_THRESHOLD = 80;

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
	const user: (IChatRibbon & { id?: string }) | null = params.user
		? JSON.parse(params.user as string)
		: null;

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

	const [keyboardOffset, setKeyboardOffset] = useState(0);
	const [text, setText] = useState("");
	const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
	const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);
	const [viewerUri, setViewerUri] = useState<string | undefined>();
	const flatListRef = useRef<FlatList>(null);
	const { pickAttachment } = useAttachmentPicker();
	const voiceRecorder = useVoiceRecorder();
	const slideX = useSharedValue(0);

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

	useEffect(() => {
		const showEvent =
			Platform.OS === "android" ? "keyboardDidShow" : "keyboardWillShow";
		const hideEvent =
			Platform.OS === "android" ? "keyboardDidHide" : "keyboardWillHide";

		const showSub = Keyboard.addListener(showEvent, (e: KeyboardEvent) => {
			setKeyboardOffset(e.endCoordinates.height);
		});
		const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardOffset(0));

		return () => {
			showSub.remove();
			hideSub.remove();
		};
	}, []);

	const displayData = useMemo(() => buildDisplayData(messages), [messages]);

	const handleSend = () => {
		if (!text.trim()) return;

		sendMessage(text);
		setText("");
		setInputHeight(MIN_INPUT_HEIGHT);

		requestAnimationFrame(() => {
			flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
		});
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
	};

	const handleFinishRecording = async (cancelled: boolean) => {
		if (cancelled) {
			await voiceRecorder.cancel();
			return;
		}

		const result = await voiceRecorder.stop();
		if (!result) return;

		sendAttachmentMessage({
			type: "audio",
			uri: result.uri,
			duration: result.durationMillis / 1000,
			uploadProgress: 0,
		});
	};

	const micPanGesture = Gesture.Pan()
		.minDistance(0)
		.onBegin(() => {
			runOnJS(handleStartRecording)();
		})
		.onUpdate((e) => {
			slideX.value = Math.min(0, e.translationX);
		})
		.onEnd(() => {
			const cancelled = slideX.value < -SLIDE_TO_CANCEL_THRESHOLD;
			runOnJS(handleFinishRecording)(cancelled);
			slideX.value = withSpring(0);
		});

	const micAnimatedStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: slideX.value }, { scale: voiceRecorder.isRecording ? 1.15 : 1 }],
	}));

	const isTyping = typingUsers.length > 0;

	const renderItem = ({ item }: { item: TDisplayItem }) => (
		<View style={styles.invertedItem}>
			{item.kind === "separator" ? (
				<DateSeparator label={item.label} />
			) : (
				<MessageBubble
					message={item.message}
					avatar={user?.avatar}
					onPressImage={setViewerUri}
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
				{displayData.length === 0 ? (
					<EmptyChatState name={user?.name} />
				) : (
					<FlatList
						ref={flatListRef}
						data={displayData}
						renderItem={renderItem}
						keyExtractor={(item) => item.id}
						contentContainerStyle={[
							styles.messageList,
							{ paddingBottom: 80 + keyboardOffset },
						]}
						showsVerticalScrollIndicator={false}
						keyboardShouldPersistTaps="handled"
						inverted
					/>
				)}

				<View
					style={[
						styles.inputBar,
						{
							bottom: keyboardOffset,
						},
					]}
				>
					{voiceRecorder.isRecording ? (
						<VoiceRecordingBar durationMillis={voiceRecorder.durationMillis} slideX={slideX} />
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
										requestAnimationFrame(() => {
											flatListRef.current?.scrollToOffset({
												offset: 0,
												animated: true,
											});
										});
									}}
								/>
							</View>
							<TouchableOpacity>
								<MaterialCommunityIcons
									name="sticker-emoji"
									size={22}
									color="#818181"
								/>
							</TouchableOpacity>
						</>
					)}

					<GestureDetector gesture={micPanGesture}>
						<Animated.View
							style={[
								styles.micButton,
								voiceRecorder.isRecording && styles.micButtonActive,
								micAnimatedStyle,
							]}
						>
							<Ionicons name="mic" size={20} color={voiceRecorder.isRecording ? "#fff" : "#818181"} />
						</Animated.View>
					</GestureDetector>

					{!voiceRecorder.isRecording && (
						<TouchableOpacity
							style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
							onPress={handleSend}
							disabled={!text.trim()}
						>
							<Ionicons name="send" size={22} color="#fff" />
						</TouchableOpacity>
					)}
				</View>

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
	messageList: {
		paddingHorizontal: 16,
		paddingTop: 16,
	},
	invertedItem: {
		transform: [{ scaleY: -1 }],
	},
	inputBar: {
		position: "absolute",
		left: 0,
		right: 0,
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
	sendButton: {
		marginLeft: 8,
		backgroundColor: "#11BC6B",
		borderRadius: 21,
		width: 38,
		height: 38,
		justifyContent: "center",
		alignItems: "center",
	},
	sendButtonDisabled: {
		opacity: 0.5,
	},
	micButton: {
		width: 38,
		height: 38,
		borderRadius: 19,
		justifyContent: "center",
		alignItems: "center",
		marginHorizontal: 4,
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
