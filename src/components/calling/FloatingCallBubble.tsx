import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { useSelector } from "react-redux";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { RTCView, type MediaStream } from "react-native-webrtc";

import Avatar from "../images/Avatar";
import CallTimer from "./CallTimer";
import Colors from "@/src/constants/Colors";
import { callEngineManager } from "@/src/lib/calling/callEngineManager";

/**
 * App-wide "in-app PiP": when a call is active and the user has navigated
 * off the /call screen (to browse chats, contacts, etc.), this floating,
 * draggable bubble stays on screen and reopens the call screen on tap. This
 * is the in-app PiP mode from the ticket; true OS-level PiP (continuing a
 * video call as a system-managed floating window when switching to another
 * app entirely) needs additional native modules not present in this repo —
 * see docs/architecture/video-calling.md.
 */
const FloatingCallBubble = () => {
	const activeCall = useSelector((state: any) => state.call.activeCall);
	const pathname = usePathname();
	const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
	const translateX = useSharedValue(0);
	const translateY = useSharedValue(0);
	const offsetX = useSharedValue(0);
	const offsetY = useSharedValue(0);

	const panGesture = Gesture.Pan()
		.onBegin(() => {
			offsetX.value = translateX.value;
			offsetY.value = translateY.value;
		})
		.onUpdate((e) => {
			translateX.value = offsetX.value + e.translationX;
			translateY.value = offsetY.value + e.translationY;
		});

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
	}));

	useEffect(() => {
		return callEngineManager.onRemoteStreamChange(setRemoteStream);
	}, []);

	if (!activeCall || activeCall.status !== "active" || pathname === "/call") {
		return null;
	}

	const isVideo = activeCall.type === "video" && !!remoteStream;

	return (
		<GestureDetector gesture={panGesture}>
			<Animated.View style={[styles.container, animatedStyle]}>
				<TouchableOpacity style={styles.content} onPress={() => router.push("/call")} activeOpacity={0.85}>
					{isVideo ? (
						<RTCView streamURL={remoteStream!.toURL()} style={styles.thumbnail} objectFit="cover" />
					) : (
						<Avatar data={activeCall.contactAvatar} size={40} />
					)}
					<View style={styles.textColumn}>
						<Text style={styles.name} numberOfLines={1}>
							{activeCall.contactName}
						</Text>
						{activeCall.connectedAt && <CallTimer connectedAt={activeCall.connectedAt} />}
					</View>
					<Ionicons name="expand" size={16} color="#fff" />
				</TouchableOpacity>
			</Animated.View>
		</GestureDetector>
	);
};

export default FloatingCallBubble;

const styles = StyleSheet.create({
	container: {
		position: "absolute",
		top: 80,
		right: 16,
		zIndex: 999,
	},
	content: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		backgroundColor: Colors.focused,
		borderRadius: 24,
		paddingVertical: 6,
		paddingHorizontal: 10,
		shadowColor: "#000",
		shadowOpacity: 0.3,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 4 },
		elevation: 6,
	},
	textColumn: {
		maxWidth: 100,
	},
	thumbnail: {
		width: 40,
		height: 40,
		borderRadius: 20,
	},
	name: {
		color: "#fff",
		fontSize: 13,
		fontWeight: "700",
	},
});
