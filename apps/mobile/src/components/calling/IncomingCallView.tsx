import { useEffect } from "react";
import { Image, StyleSheet, useWindowDimensions, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
	FadeIn,
	interpolate,
	runOnJS,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withSequence,
	withSpring,
	withTiming,
	ZoomIn,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import notifee, { TriggerType } from "@notifee/react-native";

import Avatar from "@/src/components/images/Avatar";
import { AppText, CircleButton, ScalePressable, palette, springs } from "@/src/components/ui";
import type { IActiveCall } from "@/src/redux/features/callSlice";
import { store } from "@/src/redux/store/store";

const KNOB = 48;
const REMIND_IN_MS = 10 * 60 * 1000;

// Figma "Incoming call": blurred caller photo, Remind me / Message, and slide to answer.
const IncomingCallView = ({ call, onAccept, onDecline }: { call: IActiveCall; onAccept: () => void; onDecline: () => void }) => {
	const { width } = useWindowDimensions();
	const insets = useSafeAreaInsets();
	const track = width - 100;
	const maxX = track - KNOB - 8;
	const x = useSharedValue(0);
	const pulse = useSharedValue(0);

	useEffect(() => {
		pulse.value = withRepeat(withSequence(withTiming(1, { duration: 900 }), withTiming(0, { duration: 900 })), -1);
	}, [pulse]);

	const slide = Gesture.Pan()
		.onUpdate((event) => {
			x.value = Math.min(maxX, Math.max(0, event.translationX));
		})
		.onEnd(() => {
			if (x.value > maxX * 0.75) {
				x.value = withSpring(maxX, springs.snappy);
				runOnJS(onAccept)();
			} else {
				x.value = withSpring(0, springs.gentle);
			}
		});

	const doubleTap = Gesture.Tap()
		.numberOfTaps(2)
		.onEnd(() => runOnJS(onAccept)());

	const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { scale: 1 + pulse.value * 0.06 }] }));
	const hintStyle = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [0, maxX * 0.5], [1, 0]) }));

	const remindMe = async () => {
		onDecline();
		await notifee
			.createTriggerNotification(
				{ title: `Call ${call.contactName} back`, body: "You asked to be reminded about this call.", data: { conversationId: call.conversationId } },
				{ type: TriggerType.TIMESTAMP, timestamp: Date.now() + REMIND_IN_MS }
			)
			.catch(() => undefined);
	};

	const message = () => {
		onDecline();
		const chat = store.getState().chats.chats.find((item) => item.id === call.conversationId);
		if (chat) setTimeout(() => router.push({ pathname: "/messages/Chat", params: { user: JSON.stringify(chat) } }), 300);
	};

	return (
		<View style={styles.root}>
			{call.contactAvatar?.url ? <Image source={{ uri: call.contactAvatar.url }} blurRadius={30} style={StyleSheet.absoluteFill} /> : null}
			<View style={styles.scrim} />
			<Animated.View entering={ZoomIn.springify().damping(14)} style={[styles.identity, { marginTop: insets.top + 140 }]}>
				<Avatar data={call.contactAvatar} size={128} />
				<AppText variant="display" weight="bold" tone="inverse" align="center" style={styles.name} numberOfLines={2}>
					{call.contactName}
				</AppText>
				<AppText variant="body" align="center" style={styles.subtitle}>
					{call.type === "video" ? "Incoming video call" : "Incoming call"}
				</AppText>
			</Animated.View>

			<Animated.View entering={FadeIn.delay(200)} style={[styles.bottom, { paddingBottom: insets.bottom + 28 }]}>
				<View style={styles.quickRow}>
					<ScalePressable accessibilityLabel="Remind me" onPress={() => void remindMe()} style={styles.quick}>
						<Ionicons name="alarm" size={26} color={palette.white} />
						<AppText variant="body" tone="inverse">
							Remind me
						</AppText>
					</ScalePressable>
					<CircleButton icon="call" label="Decline" variant="danger" size={56} iconSize={26} onPress={onDecline} style={styles.decline} />
					<ScalePressable accessibilityLabel="Reply with a message" onPress={message} style={styles.quick}>
						<Ionicons name="chatbubble-ellipses" size={26} color={palette.white} />
						<AppText variant="body" tone="inverse">
							Message
						</AppText>
					</ScalePressable>
				</View>
				<View style={[styles.track, { width: track }]}>
					<Animated.View style={[styles.hint, hintStyle]}>
						<AppText variant="heading" weight="regular" tone="inverse">
							slide to answer
						</AppText>
					</Animated.View>
					<GestureDetector gesture={Gesture.Exclusive(slide, doubleTap)}>
						<Animated.View style={[styles.knob, knobStyle]} accessibilityRole="button" accessibilityLabel="Answer call" accessibilityHint="Slide right or double tap to answer">
							<Ionicons name="call" size={22} color="#11BC6B" />
						</Animated.View>
					</GestureDetector>
				</View>
			</Animated.View>
		</View>
	);
};

export default IncomingCallView;

const styles = StyleSheet.create({
	root: { flex: 1, backgroundColor: "#2A2F2D" },
	scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
	identity: { alignItems: "center", paddingHorizontal: 24 },
	name: { marginTop: 24, fontSize: 24, lineHeight: 30 },
	subtitle: { marginTop: 8, color: "rgba(255,255,255,0.8)" },
	bottom: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center", gap: 40 },
	quickRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", paddingHorizontal: 48 },
	quick: { alignItems: "center", gap: 8 },
	decline: { transform: [{ rotate: "135deg" }] },
	track: { height: KNOB + 8, borderRadius: (KNOB + 8) / 2, backgroundColor: "rgba(255,255,255,0.18)", justifyContent: "center", paddingHorizontal: 4 },
	hint: { position: "absolute", left: 0, right: 0, alignItems: "center" },
	knob: { width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: palette.white, alignItems: "center", justifyContent: "center" },
});
