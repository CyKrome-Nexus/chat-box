import { Image, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RTCView, type MediaStream } from "react-native-webrtc";

import Avatar from "@/src/components/images/Avatar";
import { AppText, CircleButton, palette } from "@/src/components/ui";
import type { IActiveCall } from "@/src/redux/features/callSlice";
import CallControls from "./CallControls";
import CallTimer from "./CallTimer";
import DraggablePipView from "./DraggablePipView";

const END_LABEL: Record<NonNullable<IActiveCall["endReason"]>, string> = {
	ended: "Call ended",
	declined: "Call declined",
	busy: "Busy",
	missed: "No answer",
	failed: "Call failed",
};

const statusLabel = (call: IActiveCall) => {
	if (call.status === "ended") return END_LABEL[call.endReason ?? "ended"];
	if (call.status === "connecting") return "Connecting…";
	if (call.status === "ringing") return call.id ? "Ringing…" : "Calling…";
	return null;
};

// Figma "Video Call" (remote full screen + local PiP) and the matching voice-call layout.
const ActiveCallView = ({ call, localStream, remoteStream }: { call: IActiveCall; localStream: MediaStream | null; remoteStream: MediaStream | null }) => {
	const insets = useSafeAreaInsets();
	const remoteVideo = call.type === "video" && remoteStream && call.participants.find((participant) => participant.joined)?.videoEnabled !== false;
	const status = statusLabel(call);

	return (
		<View style={styles.root}>
			{remoteVideo && remoteStream ? (
				<Animated.View entering={FadeIn.duration(400)} style={StyleSheet.absoluteFill}>
					<RTCView streamURL={remoteStream.toURL()} style={StyleSheet.absoluteFill} objectFit="cover" />
				</Animated.View>
			) : call.contactAvatar?.url ? (
				<Image source={{ uri: call.contactAvatar.url }} blurRadius={40} style={StyleSheet.absoluteFill} />
			) : null}
			<LinearGradient colors={["rgba(0,0,0,0.35)", "transparent", "transparent", "rgba(0,14,8,0.85)"]} locations={[0, 0.25, 0.6, 1]} style={StyleSheet.absoluteFill} />

			<View style={[styles.top, { paddingTop: insets.top + 12 }]}>
				<CircleButton icon="arrow-back" label="Minimize call" variant="plain" iconColor={palette.white} onPress={() => router.back()} />
			</View>

			{!remoteVideo ? (
				<Animated.View entering={ZoomIn.springify().damping(14)} style={[styles.identity, { marginTop: insets.top + 120 }]}>
					<Avatar data={call.contactAvatar} size={128} />
					<AppText variant="display" weight="bold" tone="inverse" align="center" style={styles.name} numberOfLines={2}>
						{call.contactName}
					</AppText>
					{status ? (
						<Animated.View key={status} entering={FadeInDown}>
							<AppText variant="body" align="center" style={styles.status}>
								{status}
							</AppText>
						</Animated.View>
					) : call.connectedAt ? (
						<CallTimer connectedAt={call.connectedAt} />
					) : null}
				</Animated.View>
			) : (
				<View style={[styles.videoInfo, { top: insets.top + 64 }]}>
					<AppText variant="heading" weight="semibold" tone="inverse">
						{call.contactName}
					</AppText>
					{call.connectedAt ? <CallTimer connectedAt={call.connectedAt} /> : null}
				</View>
			)}

			{call.type === "video" && localStream ? <DraggablePipView streamUrl={localStream.toURL()} /> : null}

			{call.status !== "ended" ? <CallControls call={call} style={[styles.controls, { bottom: insets.bottom + 32 }]} /> : null}
		</View>
	);
};

export default ActiveCallView;

const styles = StyleSheet.create({
	root: { flex: 1, backgroundColor: palette.ink },
	top: { flexDirection: "row", paddingHorizontal: 16 },
	identity: { alignItems: "center", paddingHorizontal: 24, gap: 8 },
	name: { marginTop: 16, fontSize: 24, lineHeight: 30 },
	status: { color: "rgba(255,255,255,0.8)" },
	videoInfo: { position: "absolute", left: 24, gap: 2 },
	controls: { position: "absolute", left: 24, right: 24 },
});
