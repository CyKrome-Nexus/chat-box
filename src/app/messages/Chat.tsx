import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	Alert,
	View,
	Text,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	TextInput,
	TouchableWithoutFeedback,
	Keyboard,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, runOnJS } from "react-native-reanimated";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import * as Clipboard from "expo-clipboard";

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
import StickerPicker from "@/src/components/stickers/StickerPicker";
import { addRecentSticker } from "@/src/redux/features/stickersSlice";
import ReplyPreviewBar from "@/src/components/messages/ReplyPreviewBar";
import VideoNoteRecordingOverlay from "@/src/components/messages/VideoNoteRecordingOverlay";
import FullscreenVideoModal from "@/src/components/messages/FullscreenVideoModal";
import MessageActionsOverlay, { EDIT_WINDOW_MS, IBubbleAnchor } from "@/src/components/messages/MessageActionsOverlay";
import MessageInfoModal from "@/src/components/messages/MessageInfoModal";
import ForwardSheet from "@/src/components/messages/ForwardSheet";
import {
	composeMessage,
	deleteForEveryone,
	deleteMessage,
	seedConversation,
	setMessageReaction,
	toggleStarMessage,
	updateAttachmentProgress,
	updateMessageStatus,
} from "@/src/redux/features/messagesSlice";
import { colorForParticipant, markChatRead, setChatDraft } from "@/src/redux/features/chatsSlice";
import { setActiveConversationId } from "@/src/redux/features/connectionSlice";
import { useChatRealtime } from "@/src/hooks/useChatRealtime";
import { useAttachmentPicker } from "@/src/hooks/useAttachmentPicker";
import { useVoiceRecorder } from "@/src/hooks/useVoiceRecorder";
import { useVideoNoteRecorder } from "@/src/hooks/useVideoNoteRecorder";
import { audioPlaybackManager } from "@/src/lib/audio/playbackManager";
import { formatDuration } from "@/src/lib/audio/format";
import { mediaComposerBridge } from "@/src/lib/media/mediaComposerBridge";
import { computeExpiresAt } from "@/src/lib/security/disappearingMessages";
import { encryptMediaFile, decryptMediaFile } from "@/src/lib/crypto/mediaEncryption";
import { IAttachment, IMessage } from "@/src/interfaces/message-interface";
import { IChatRibbon, IGroupParticipant } from "@/src/interfaces/list-interface";

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

/**
 * `embeddedUser` lets this same component (with its full feature set — real
 * WebRTC calls, encryption, media, everything below) be rendered directly
 * inside the tablet/foldable Master-Detail right pane
 * (see MasterDetailLayout.tsx) instead of only as a pushed stack screen.
 * When present it takes priority over the route's `user` param, which stays
 * the only source on phones (the normal, unmodified navigation path).
 */
const Chat = ({ embeddedUser }: { embeddedUser?: IChatRibbon } = {}) => {
	const params = useLocalSearchParams();
	const user: IChatRibbon | null =
		embeddedUser ??
		(() => {
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
	const { connectionStatus, typingUsers, sendMessage, notifyTyping, markRead, editMessage: editMessageRealtime } = useChatRealtime(
		conversationId,
		currentUserId
	);
	const readReceiptsEnabled = useSelector((state: any) => state.settings.privacy.readReceipts as boolean);

	const chatDraft = useSelector(
		(state: any) => (state.chats.chats as IChatRibbon[]).find((c) => c.id === conversationId)?.draft
	);
	const disappearingTimer = useSelector(
		(state: any) => (state.chats.chats as IChatRibbon[]).find((c) => c.id === conversationId)?.disappearingTimer
	);
	const liveChat = useSelector((state: any) =>
		(state.chats.chats as IChatRibbon[]).find((c) => c.id === conversationId)
	);
	const isGroup = !!liveChat?.isGroup;
	const isBroadcast = !!liveChat?.isBroadcast;
	const groupParticipants = liveChat?.participants || [];
	const myParticipant = groupParticipants.find((p: IGroupParticipant) => p.id === "me");
	const canSendInGroup =
		!isGroup || liveChat?.groupSettings?.whoCanSendMessages !== "admins" || myParticipant?.role === "admin";
	const [mentionQuery, setMentionQuery] = useState<string | null>(null);
	// Lazy initializer: only reads the persisted draft once, on mount — later
	// re-renders (e.g. from other chatsSlice updates) shouldn't stomp on
	// whatever the user is actively typing.
	const [text, setText] = useState(() => chatDraft || "");
	const textRef = useRef(text);
	const [selection, setSelection] = useState({ start: 0, end: 0 });
	const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
	const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const [showStickerPicker, setShowStickerPicker] = useState(false);
	const [viewerMessageId, setViewerMessageId] = useState<string | undefined>();
	const [fullscreenVideoUri, setFullscreenVideoUri] = useState<string | undefined>();
	const [replyTo, setReplyTo] = useState<IMessage | null>(null);
	const [editingMessage, setEditingMessage] = useState<IMessage | null>(null);
	const [selectedMessage, setSelectedMessage] = useState<IMessage | null>(null);
	const [selectedAnchor, setSelectedAnchor] = useState<IBubbleAnchor | null>(null);
	const [reactionEmojiPickerFor, setReactionEmojiPickerFor] = useState<IMessage | null>(null);
	const [infoMessage, setInfoMessage] = useState<IMessage | null>(null);
	const [forwardTarget, setForwardTarget] = useState<IMessage | null>(null);
	const [highlightedMessageId, setHighlightedMessageId] = useState<string | undefined>();
	const isSearching = params.search === "1";
	const [searchQuery, setSearchQuery] = useState("");
	const [searchMatchIndex, setSearchMatchIndex] = useState(0);
	const flatListRef = useRef<FlatList>(null);
	const { pickAttachment } = useAttachmentPicker();
	const voiceRecorder = useVoiceRecorder();
	const videoNoteRecorder = useVideoNoteRecorder();
	const [noteMode, setNoteMode] = useState<"voice" | "video">("voice");
	const [recordingMode, setRecordingMode] = useState<"idle" | "dragging" | "locked" | "preview">("idle");
	const [previewRecording, setPreviewRecording] = useState<{ uri: string; durationMillis: number; waveform: number[] } | null>(null);
	const slideX = useSharedValue(0);
	const slideY = useSharedValue(0);
	const sendMorph = useSharedValue(0);
	const modeFlip = useSharedValue(0);
	const pressStartRef = useSharedValue(0);

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

	// Every image/video in the conversation, in chronological order, so the
	// lightbox can swipe through them (see media-gallery.md).
	const mediaItems = useMemo(
		() =>
			[...messages]
				.sort((a, b) => a.timestamp - b.timestamp)
				.filter(
					(m): m is IMessage & { attachment: IAttachment } =>
						!!m.attachment && (m.attachment.type === "image" || m.attachment.type === "video")
				)
				.map((m) => ({
					messageId: m.id,
					uri: m.attachment.uri || "",
					type: m.attachment.type as "image" | "video",
				})),
		[messages]
	);

	// Lets voice notes auto-play the next one in the thread on finish (see
	// audioPlaybackManager.playNext / docs/architecture/voice-note-studio.md).
	useEffect(() => {
		const audioMessageIds = [...messages]
			.sort((a, b) => a.timestamp - b.timestamp)
			.filter((m) => m.attachment?.type === "audio")
			.map((m) => m.id);
		audioPlaybackManager.registerSequence(conversationId, audioMessageIds);
	}, [messages, conversationId]);

	useEffect(() => {
		textRef.current = text;
	}, [text]);

	// Opening a chat is the natural "I've seen this" signal for the unread
	// badge/filter (see chat-organization.md).
	useEffect(() => {
		dispatch(markChatRead(conversationId));
	}, [conversationId, dispatch]);

	// Tracks which conversation is currently on screen so an incoming message
	// for THIS conversation doesn't also trigger a redundant system
	// notification/in-app banner — see docs/architecture/push-notifications.md.
	useEffect(() => {
		dispatch(setActiveConversationId(conversationId));
		return () => {
			dispatch(setActiveConversationId(null));
		};
	}, [conversationId, dispatch]);

	// Sends a read receipt for the newest received message — gated behind
	// Settings > Account > Read Receipts, per the ticket's "toggle blue double
	// checkmarks on/off" requirement (see security-privacy.md).
	const lastMarkedReadIdRef = useRef<string | undefined>(undefined);
	useEffect(() => {
		if (!readReceiptsEnabled) return;
		const lastReceived = [...messages].filter((m) => m.type === "receiver").sort((a, b) => b.timestamp - a.timestamp)[0];
		if (lastReceived && lastReceived.id !== lastMarkedReadIdRef.current) {
			lastMarkedReadIdRef.current = lastReceived.id;
			markRead(lastReceived.id);
		}
	}, [messages, readReceiptsEnabled, markRead]);

	// Auto-saves an in-progress, unsent draft to the chat record on the way
	// out, so it survives navigating away and shows as "Draft: ..." in the
	// inbox (see docs/architecture/chat-organization.md).
	useEffect(() => {
		return () => {
			dispatch(setChatDraft({ chatId: conversationId, draft: textRef.current }));
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [conversationId, dispatch]);

	// No real backend exists to actually deliver/read a message — this just
	// simulates the tick progression locally so Info has something real to
	// show (see docs/architecture/message-actions.md).
	const simulateDeliveryReceipt = (messageId: string) => {
		setTimeout(() => {
			dispatch(updateMessageStatus({ conversationId, messageId, status: "delivered" }));
		}, 800);
		setTimeout(() => {
			dispatch(updateMessageStatus({ conversationId, messageId, status: "read" }));
		}, 2500);
	};

	// Broadcast Lists fan out one composed message into each recipient's own
	// 1-on-1 conversation, plus a copy into the list's own history — there's
	// no shared "room" the way a group has one. See docs/architecture/groups.md.
	const handleSendBroadcast = () => {
		const trimmed = text.trim();
		if (!trimmed || !liveChat?.broadcastRecipientIds) return;

		const timestamp = Date.now();
		liveChat.broadcastRecipientIds.forEach((recipientId: string) => {
			dispatch(
				composeMessage({
					conversationId: recipientId,
					message: {
						id: `${timestamp}-${recipientId}-${Math.random().toString(36).slice(2, 6)}`,
						conversationId: recipientId,
						text: trimmed,
						type: "sender",
						timestamp,
					},
					queued: false,
				})
			);
		});
		dispatch(
			composeMessage({
				conversationId,
				message: {
					id: `${timestamp}-bc-${Math.random().toString(36).slice(2, 6)}`,
					conversationId,
					text: trimmed,
					type: "sender",
					timestamp,
				},
				queued: false,
			})
		);
		setText("");
		setInputHeight(MIN_INPUT_HEIGHT);
	};

	const handleSend = () => {
		if (!text.trim() || !canSendInGroup) return;
		if (isBroadcast) {
			handleSendBroadcast();
			return;
		}

		if (editingMessage) {
			editMessageRealtime(editingMessage.id, text);
			setEditingMessage(null);
			setText("");
			setInputHeight(MIN_INPUT_HEIGHT);
			return;
		}

		const messageId = sendMessage(
			text,
			replyTo ? { messageId: replyTo.id, text: replyTo.text || "Attachment", isSender: replyTo.type === "sender" } : undefined
		);
		if (messageId) simulateDeliveryReceipt(messageId);
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

	const handleSelectSticker = (stickerId: string) => {
		dispatch(addRecentSticker(stickerId));
		sendAttachmentMessage({ type: "sticker", stickerId });
		setShowStickerPicker(false);
	};

	const sendAttachmentMessage = async (attachment: IAttachment, caption: string = "") => {
		// Real AES-256-GCM encrypt → verify → decrypt round trip on the
		// actual file bytes before it's ever composed/displayed — there's no
		// real object storage server to upload the ciphertext to (or second
		// device to download it), so this proves the pipeline is genuinely
		// correct on real media rather than wiring it to a network call that
		// doesn't exist. See docs/architecture/e2ee-media.md.
		if (attachment.uri && attachment.type !== "location") {
			try {
				const envelope = await encryptMediaFile(attachment.uri);
				const verifiedUri = await decryptMediaFile(envelope);
				attachment = { ...attachment, uri: verifiedUri, mediaEncryptionVerified: true };
			} catch {
				// Falls through with the original plaintext uri — encryption
				// verification failing shouldn't block sending the message.
			}
		}

		const message: IMessage = {
			id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
			conversationId,
			text: caption,
			type: "sender",
			timestamp: Date.now(),
			expiresAt: computeExpiresAt(disappearingTimer),
		};

		dispatch(composeMessage({ conversationId, message: { ...message, attachment }, queued: false }));
		simulateDeliveryReceipt(message.id);

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
		if (option === "camera") {
			mediaComposerBridge.waitForResult((result) => {
				if (result) sendAttachmentMessage(result.attachment, result.caption);
			});
			router.push("/camera-capture");
			return;
		}

		const attachment = await pickAttachment(option);
		if (attachment) sendAttachmentMessage(attachment);
	};

	const handleStartRecording = () => {
		if (noteMode === "video") {
			videoNoteRecorder.start();
		} else {
			voiceRecorder.start();
		}
		setRecordingMode("dragging");
	};

	const handleLockRecording = () => {
		setRecordingMode("locked");
	};

	const handleFinishRecording = async (cancelled: boolean) => {
		if (noteMode === "video") {
			if (cancelled) {
				videoNoteRecorder.cancel();
				setRecordingMode("idle");
				return;
			}

			const result = await videoNoteRecorder.stop();
			setRecordingMode("idle");
			if (!result) return;

			sendAttachmentMessage({
				type: "video_note",
				uri: result.uri,
				duration: result.durationMillis / 1000,
				uploadProgress: 0,
			});
			return;
		}

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

	// A quick tap (short press, negligible movement) on the mic button toggles
	// between voice/video note mode instead of sending a near-zero-length
	// recording — whatever recording had just started on `onBegin` is discarded.
	const handleCancelForModeSwitch = () => {
		if (noteMode === "video") {
			videoNoteRecorder.cancel();
		} else {
			voiceRecorder.cancel();
		}
		setRecordingMode("idle");
		setNoteMode((prev) => (prev === "voice" ? "video" : "voice"));
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

	const TAP_MAX_DURATION_MS = 200;
	const TAP_MAX_MOVEMENT = 10;

	const micPanGesture = Gesture.Pan()
		.minDistance(0)
		.enabled(recordingMode === "idle" || recordingMode === "dragging")
		.onBegin(() => {
			pressStartRef.value = Date.now();
			runOnJS(handleStartRecording)();
		})
		.onUpdate((e) => {
			slideX.value = Math.min(0, e.translationX);
			slideY.value = Math.min(0, e.translationY);
		})
		.onEnd(() => {
			const elapsed = Date.now() - pressStartRef.value;
			const moved = Math.max(Math.abs(slideX.value), Math.abs(slideY.value));

			if (elapsed < TAP_MAX_DURATION_MS && moved < TAP_MAX_MOVEMENT) {
				runOnJS(handleCancelForModeSwitch)();
			} else {
				const cancelled = slideX.value < -SLIDE_TO_CANCEL_THRESHOLD;
				const locked = slideY.value < -SWIPE_UP_TO_LOCK_THRESHOLD;

				if (locked && !cancelled) {
					runOnJS(handleLockRecording)();
				} else {
					runOnJS(handleFinishRecording)(cancelled);
				}
			}
			slideX.value = withSpring(0);
			slideY.value = withSpring(0);
		});

	const isRecordingActive = noteMode === "video" ? videoNoteRecorder.isRecording : voiceRecorder.isRecording;

	const micAnimatedStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: slideX.value }, { scale: isRecordingActive ? 1.15 : 1 }],
	}));

	useEffect(() => {
		modeFlip.value = withTiming(noteMode === "video" ? 1 : 0, { duration: 260 });
	}, [noteMode, modeFlip]);

	const micIconFlipStyle = useAnimatedStyle(() => ({
		transform: [{ perspective: 300 }, { rotateY: `${modeFlip.value * 180}deg` }],
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

	const closeActionsOverlay = () => {
		setSelectedMessage(null);
		setSelectedAnchor(null);
	};

	const handleLongPressMessage = (message: IMessage, anchor: IBubbleAnchor) => {
		setSelectedMessage(message);
		setSelectedAnchor(anchor);
	};

	const handleReact = (emoji: string) => {
		if (selectedMessage) dispatch(setMessageReaction({ conversationId, messageId: selectedMessage.id, emoji }));
		closeActionsOverlay();
	};

	const handleOpenReactionEmojiPicker = () => {
		setReactionEmojiPickerFor(selectedMessage);
		closeActionsOverlay();
	};

	const handleReply = () => {
		if (selectedMessage) setReplyTo(selectedMessage);
		closeActionsOverlay();
	};

	const handleCopy = async () => {
		if (selectedMessage?.text) await Clipboard.setStringAsync(selectedMessage.text);
		closeActionsOverlay();
	};

	const handleForward = () => {
		setForwardTarget(selectedMessage);
		closeActionsOverlay();
	};

	const handleEdit = () => {
		if (selectedMessage) {
			setEditingMessage(selectedMessage);
			setReplyTo(null);
			setText(selectedMessage.text);
		}
		closeActionsOverlay();
	};

	const handleStar = () => {
		if (selectedMessage) dispatch(toggleStarMessage({ conversationId, messageId: selectedMessage.id }));
		closeActionsOverlay();
	};

	const handleDelete = () => {
		const message = selectedMessage;
		closeActionsOverlay();
		if (!message) return;

		const canDeleteForEveryone =
			message.type === "sender" && Date.now() - message.timestamp < EDIT_WINDOW_MS;

		Alert.alert("Delete message?", undefined, [
			{ text: "Cancel", style: "cancel" },
			...(canDeleteForEveryone
				? [
						{
							text: "Delete for Everyone",
							style: "destructive" as const,
							onPress: () => dispatch(deleteForEveryone({ conversationId, messageId: message.id })),
						},
				  ]
				: []),
			{
				text: "Delete for Me",
				style: "destructive",
				onPress: () => dispatch(deleteMessage({ conversationId, messageId: message.id })),
			},
		]);
	};

	const handleInfo = () => {
		setInfoMessage(selectedMessage);
		closeActionsOverlay();
	};

	const handleForwardSelect = (target: IChatRibbon) => {
		if (!forwardTarget) return;
		dispatch(
			composeMessage({
				conversationId: target.id,
				message: {
					id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
					conversationId: target.id,
					text: forwardTarget.text,
					type: "sender",
					timestamp: Date.now(),
					attachment: forwardTarget.attachment,
				},
				queued: false,
			})
		);
		Alert.alert("Forwarded", `Sent to ${target.name}.`);
	};

	const jumpToMessage = (messageId: string) => {
		const index = displayData.findIndex((item) => item.kind === "message" && item.message.id === messageId);
		if (index === -1) {
			Alert.alert("Message not found", "The original message is no longer available.");
			return;
		}
		flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
		setHighlightedMessageId(messageId);
		setTimeout(() => setHighlightedMessageId(undefined), 1200);
	};

	const handlePressReplyQuote = (messageId: string) => jumpToMessage(messageId);

	// In-chat search — a simple in-memory scan over the already-loaded
	// conversation (global search across every conversation uses the SQLite
	// FTS index instead — see docs/architecture/search.md).
	const searchMatches = useMemo(() => {
		if (!isSearching || !searchQuery.trim()) return [];
		const q = searchQuery.trim().toLowerCase();
		return [...messages]
			.filter((m) => m.text?.toLowerCase().includes(q))
			.sort((a, b) => a.timestamp - b.timestamp);
	}, [isSearching, searchQuery, messages]);

	useEffect(() => {
		setSearchMatchIndex(0);
	}, [searchQuery]);

	useEffect(() => {
		if (searchMatches.length && isSearching) jumpToMessage(searchMatches[searchMatchIndex]?.id);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchMatchIndex, searchMatches]);

	const handleCloseSearch = () => {
		router.setParams({ search: undefined });
		setSearchQuery("");
		setSearchMatchIndex(0);
	};

	const handleStepSearch = (direction: 1 | -1) => {
		if (!searchMatches.length) return;
		setSearchMatchIndex((prev) => (prev + direction + searchMatches.length) % searchMatches.length);
	};

	// Deep link from global search results (/search) — jump straight to the
	// message that matched, once the conversation's messages are loaded.
	const jumpToMessageId = params.jumpToMessageId as string | undefined;
	const hasJumpedRef = useRef(false);
	useEffect(() => {
		if (!jumpToMessageId || hasJumpedRef.current || messages.length === 0) return;
		hasJumpedRef.current = true;
		requestAnimationFrame(() => jumpToMessage(jumpToMessageId));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [jumpToMessageId, messages.length]);

	const renderItem = ({ item }: { item: TDisplayItem }) => (
		<View style={styles.invertedItem}>
			{item.kind === "separator" ? (
				<DateSeparator label={item.label} />
			) : (
				<MessageBubble
					message={item.message}
					avatar={user?.avatar}
					onPressMedia={setViewerMessageId}
					onPressVideoNote={setFullscreenVideoUri}
					onSwipeReply={setReplyTo}
					onPressReplyQuote={handlePressReplyQuote}
					onLongPressMessage={handleLongPressMessage}
					highlighted={highlightedMessageId === item.message.id}
					searchQuery={isSearching ? searchQuery : undefined}
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

				{isSearching && (
					<View style={styles.searchBar}>
						<Ionicons name="search" size={16} color="#797C7B" />
						<TextInput
							style={styles.searchInput}
							placeholder="Search in this chat"
							placeholderTextColor="#797C7B"
							value={searchQuery}
							onChangeText={setSearchQuery}
							autoFocus
						/>
						<Text style={styles.searchCounter}>
							{searchMatches.length ? `${searchMatchIndex + 1} of ${searchMatches.length}` : "0 of 0"}
						</Text>
						<TouchableOpacity onPress={() => handleStepSearch(-1)} disabled={!searchMatches.length}>
							<Ionicons name="chevron-up" size={20} color={searchMatches.length ? "#000E08" : "#ccc"} />
						</TouchableOpacity>
						<TouchableOpacity onPress={() => handleStepSearch(1)} disabled={!searchMatches.length}>
							<Ionicons name="chevron-down" size={20} color={searchMatches.length ? "#000E08" : "#ccc"} />
						</TouchableOpacity>
						<TouchableOpacity onPress={handleCloseSearch}>
							<Ionicons name="close" size={20} color="#797C7B" />
						</TouchableOpacity>
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
							onScrollToIndexFailed={(info) => {
								setTimeout(() => {
									flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
								}, 100);
							}}
							inverted
						/>
					)}
				</View>

				<KeyboardStickyView>
					{editingMessage && recordingMode === "idle" && (
						<View style={styles.editingBanner}>
							<Ionicons name="create-outline" size={16} color={Colors.focused} />
							<Text style={styles.editingBannerText}>Editing message</Text>
							<TouchableOpacity
								onPress={() => {
									setEditingMessage(null);
									setText("");
								}}
							>
								<Ionicons name="close" size={18} color="#797C7B" />
							</TouchableOpacity>
						</View>
					)}
					{replyTo && recordingMode === "idle" && !editingMessage && (
						<ReplyPreviewBar
							message={replyTo}
							contactName={user?.name}
							onDismiss={() => setReplyTo(null)}
						/>
					)}

					{isGroup && mentionQuery !== null && (
						<View style={styles.mentionDropdown}>
							{groupParticipants
								.filter(
									(p: IGroupParticipant) =>
										p.id !== "me" && p.name.toLowerCase().includes(mentionQuery.toLowerCase())
								)
								.slice(0, 5)
								.map((p: IGroupParticipant) => (
									<TouchableOpacity
										key={p.id}
										style={styles.mentionRow}
										onPress={() => {
											setText((prev) => prev.replace(/@(\w*)$/, `@${p.name.split(" ")[0]} `));
											setMentionQuery(null);
										}}
									>
										<Text style={[styles.mentionName, { color: colorForParticipant(groupParticipants.indexOf(p)) }]}>
											{p.name}
										</Text>
									</TouchableOpacity>
								))}
						</View>
					)}

					{isGroup && !canSendInGroup && (
						<View style={styles.adminOnlyBanner}>
							<Text style={styles.adminOnlyBannerText}>Only admins can send messages in this group</Text>
						</View>
					)}

					<View style={styles.inputBar}>
						{recordingMode === "dragging" ? (
							noteMode === "video" ? (
								<View style={styles.recordingHintRow}>
									<Ionicons name="chevron-back" size={16} color="#797C7B" />
									<Text style={styles.recordingHintText}>Slide to cancel</Text>
								</View>
							) : (
								<VoiceRecordingBar
									durationMillis={voiceRecorder.durationMillis}
									waveform={voiceRecorder.waveform}
									slideX={slideX}
									slideY={slideY}
								/>
							)
						) : recordingMode === "locked" && noteMode === "video" ? (
							<View style={styles.videoLockedRow}>
								<TouchableOpacity
									style={styles.videoDiscardButton}
									onPress={() => handleFinishRecording(true)}
								>
									<Ionicons name="trash" size={20} color="#F04A4C" />
								</TouchableOpacity>
								<Text style={styles.recordingHintText}>
									{formatDuration(videoNoteRecorder.durationMillis / 1000)}
								</Text>
								<TouchableOpacity
									style={styles.videoSendButton}
									onPress={() => handleFinishRecording(false)}
								>
									<Ionicons name="send" size={18} color="#fff" />
								</TouchableOpacity>
							</View>
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
										placeholder={canSendInGroup ? "Type your message" : "Only admins can send messages"}
										placeholderTextColor="#797C7B"
										editable={canSendInGroup}
										returnKeyType="send"
										blurOnSubmit={false}
										value={text}
										selection={selection}
										onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
										onChangeText={(value) => {
											setText(value);
											if (value.trim()) notifyTyping();
											if (isGroup) {
												const match = value.match(/@(\w*)$/);
												setMentionQuery(match ? match[1] : null);
											}
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
										setShowStickerPicker(false);
									}}
								>
									<MaterialCommunityIcons
										name="sticker-emoji"
										size={22}
										color={showEmojiPicker ? Colors.focused : "#818181"}
									/>
								</TouchableOpacity>
								<TouchableOpacity
									style={{ marginLeft: 6 }}
									onPress={() => {
										Keyboard.dismiss();
										setShowStickerPicker((prev) => !prev);
										setShowEmojiPicker(false);
									}}
								>
									<MaterialCommunityIcons
										name="sticker-outline"
										size={22}
										color={showStickerPicker ? Colors.focused : "#818181"}
									/>
								</TouchableOpacity>
							</>
						)}

						{/* Morphing mic <-> send: both share the same box and cross-fade/scale
						    based on whether there's text, instead of two separately-shown buttons.
						    Hidden once locked/preview — HandsfreeRecordingBar has its own send button. */}
						{(recordingMode === "idle" || recordingMode === "dragging") && (
							<View style={styles.actionButtonSlot}>
								{noteMode === "video" && recordingMode === "dragging" && (
									<VideoNoteRecordingOverlay
										ref={videoNoteRecorder.cameraRef}
										durationMillis={videoNoteRecorder.durationMillis}
										locked={false}
										onCameraReady={videoNoteRecorder.beginRecordingOnCamera}
									/>
								)}
								<GestureDetector gesture={micPanGesture}>
									<Animated.View
										style={[
											styles.micButton,
											isRecordingActive && styles.micButtonActive,
											micAnimatedStyle,
											micMorphStyle,
										]}
										pointerEvents={hasText ? "none" : "auto"}
									>
										<Animated.View style={micIconFlipStyle}>
											<Ionicons
												name={noteMode === "video" ? "videocam" : "mic"}
												size={20}
												color={isRecordingActive ? "#fff" : "#818181"}
											/>
										</Animated.View>
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
						{recordingMode === "locked" && noteMode === "video" && (
							<View style={styles.actionButtonSlot}>
								<VideoNoteRecordingOverlay
									ref={videoNoteRecorder.cameraRef}
									durationMillis={videoNoteRecorder.durationMillis}
									locked
									onCameraReady={videoNoteRecorder.beginRecordingOnCamera}
								/>
							</View>
						)}
					</View>

					{showEmojiPicker && <EmojiPicker onSelectEmoji={handleSelectEmoji} />}
					{showStickerPicker && <StickerPicker onSelectSticker={handleSelectSticker} />}
				</KeyboardStickyView>

				<AttachmentSheet
					visible={showAttachmentSheet}
					onClose={() => setShowAttachmentSheet(false)}
					onSelect={handleAttachmentOption}
				/>
				<MediaViewerModal
					items={mediaItems}
					initialMessageId={viewerMessageId}
					conversationId={conversationId}
					visible={!!viewerMessageId}
					onClose={() => setViewerMessageId(undefined)}
				/>
				<FullscreenVideoModal
					uri={fullscreenVideoUri}
					visible={!!fullscreenVideoUri}
					onClose={() => setFullscreenVideoUri(undefined)}
				/>

				<MessageActionsOverlay
					message={selectedMessage}
					anchor={selectedAnchor}
					isSender={selectedMessage?.type === "sender"}
					visible={!!selectedMessage}
					onClose={closeActionsOverlay}
					onReact={handleReact}
					onOpenEmojiPicker={handleOpenReactionEmojiPicker}
					onReply={handleReply}
					onCopy={handleCopy}
					onForward={handleForward}
					onEdit={handleEdit}
					onStar={handleStar}
					onDelete={handleDelete}
					onInfo={handleInfo}
				/>
				<MessageInfoModal message={infoMessage} visible={!!infoMessage} onClose={() => setInfoMessage(null)} />
				<ForwardSheet
					visible={!!forwardTarget}
					onClose={() => setForwardTarget(null)}
					onSelect={handleForwardSelect}
				/>
				{reactionEmojiPickerFor && (
					<View style={styles.reactionEmojiPickerOverlay}>
						<TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setReactionEmojiPickerFor(null)} />
						<EmojiPicker
							onSelectEmoji={(emoji) => {
								dispatch(setMessageReaction({ conversationId, messageId: reactionEmojiPickerFor.id, emoji }));
								setReactionEmojiPickerFor(null);
							}}
						/>
					</View>
				)}
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
	recordingHintRow: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 4,
	},
	recordingHintText: {
		color: "#797C7B",
		fontSize: 13,
	},
	videoLockedRow: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 4,
	},
	videoDiscardButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		justifyContent: "center",
		alignItems: "center",
	},
	videoSendButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: "#11BC6B",
		justifyContent: "center",
		alignItems: "center",
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
	searchBar: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		backgroundColor: "#F3F6F6",
		borderBottomWidth: 1,
		borderBottomColor: "#eee",
	},
	searchInput: {
		flex: 1,
		fontSize: 14,
		color: "#000E08",
	},
	searchCounter: {
		fontSize: 12,
		color: "#797C7B",
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
	editingBanner: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingHorizontal: 16,
		paddingVertical: 8,
		backgroundColor: "#F2F8F7",
		borderTopWidth: 1,
		borderTopColor: "#eee",
	},
	editingBannerText: {
		flex: 1,
		color: Colors.focused,
		fontSize: 13,
		fontWeight: "600",
	},
	reactionEmojiPickerOverlay: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		top: 0,
		backgroundColor: "rgba(0,0,0,0.3)",
		justifyContent: "flex-end",
	},
	mentionDropdown: {
		backgroundColor: "#fff",
		borderTopWidth: 1,
		borderTopColor: "#eee",
		maxHeight: 180,
	},
	mentionRow: {
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: "#f2f2f2",
	},
	mentionName: {
		fontSize: 14,
		fontWeight: "600",
	},
	adminOnlyBanner: {
		paddingHorizontal: 16,
		paddingVertical: 6,
		backgroundColor: "#FFF3E0",
	},
	adminOnlyBannerText: {
		fontSize: 12,
		color: "#B26A00",
		textAlign: "center",
	},
});

export default Chat;
