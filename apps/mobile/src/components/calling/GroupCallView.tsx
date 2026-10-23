import { FlatList, StyleSheet, useWindowDimensions, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeInDown, LinearTransition, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RTCView, type MediaStream } from "react-native-webrtc";

import Avatar from "@/src/components/images/Avatar";
import { AppText, CircleButton, palette, radii } from "@/src/components/ui";
import type { IActiveCall } from "@/src/redux/features/callSlice";
import CallControls from "./CallControls";
import CallTimer from "./CallTimer";

interface IGroupCallViewProps {
	call: IActiveCall;
	localStream: MediaStream | null;
	remoteStreams: Map<string, MediaStream>;
}

// Figma "Group call": meeting title, video tiles on a rounded stage, participant strip with mute badges.
const GroupCallView = ({ call, localStream, remoteStreams }: IGroupCallViewProps) => {
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();
	const joined = call.participants.filter((participant) => participant.joined);
	const tiles = [
		...joined.map((participant) => ({ id: participant.id, name: participant.name, avatar: participant.avatar, stream: remoteStreams.get(participant.id), videoEnabled: participant.videoEnabled !== false })),
		{ id: "me", name: "You", avatar: undefined, stream: localStream ?? undefined, videoEnabled: call.type === "video" },
	];
	const columns = tiles.length <= 2 ? 1 : 2;
	const tileWidth = (width - 48 - (columns - 1) * 8) / columns;
	const tileHeight = tiles.length <= 2 ? 220 : tileWidth * 1.2;

	return (
		<View style={styles.root}>
			<LinearGradient colors={["#0B2A22", palette.ink]} style={StyleSheet.absoluteFill} />
			<View style={[styles.stage, { paddingTop: insets.top + 12 }]}>
				<View style={styles.topRow}>
					<CircleButton icon="arrow-back" label="Minimize call" variant="plain" iconColor={palette.white} onPress={() => router.back()} />
				</View>
				<Animated.View entering={FadeInDown.springify().damping(18)} style={styles.titleBlock}>
					<AppText variant="display" weight="bold" tone="inverse" numberOfLines={2} style={styles.title}>
						Meeting with {call.contactName}
					</AppText>
					<View style={styles.organizer}>
						<Avatar data={call.contactAvatar} size={36} />
						<View>
							<AppText variant="label" weight="semibold" tone="inverse">
								{joined.length + 1} in call
							</AppText>
							{call.connectedAt ? <CallTimer connectedAt={call.connectedAt} /> : (
								<AppText variant="caption" style={styles.dim}>
									{call.status === "ringing" ? "Ringing members…" : "Connecting…"}
								</AppText>
							)}
						</View>
					</View>
				</Animated.View>

				<Animated.View layout={LinearTransition.springify().damping(20)} style={styles.grid}>
					{tiles.map((tile) => (
						<Animated.View key={tile.id} entering={ZoomIn.springify().damping(16)} layout={LinearTransition.springify().damping(20)} style={[styles.tile, { width: tileWidth, height: tileHeight }]}>
							{tile.stream && tile.videoEnabled ? (
								<RTCView streamURL={tile.stream.toURL()} style={StyleSheet.absoluteFill} objectFit="cover" mirror={tile.id === "me"} />
							) : (
								<View style={styles.tileFallback}>
									<Avatar data={tile.avatar} size={64} />
								</View>
							)}
							<View style={styles.tileLabel}>
								<AppText variant="caption" weight="semibold" tone="inverse" numberOfLines={1}>
									{tile.name}
								</AppText>
							</View>
						</Animated.View>
					))}
				</Animated.View>

				{call.status !== "ended" ? <CallControls call={call} style={styles.controls} /> : null}
			</View>

			<Animated.View entering={FadeIn.delay(150)} style={[styles.strip, { paddingBottom: insets.bottom + 16 }]}>
				<FlatList
					horizontal
					data={call.participants}
					keyExtractor={(item) => item.id}
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.stripList}
					renderItem={({ item }) => (
						<View style={[styles.stripItem, !item.joined && styles.stripPending]}>
							<Avatar data={item.avatar} size={64} />
							<View style={styles.muteBadge}>
								<Ionicons name={item.audioMuted ? "mic-off" : "mic"} size={12} color={palette.ink} />
							</View>
						</View>
					)}
				/>
			</Animated.View>
		</View>
	);
};

export default GroupCallView;

const styles = StyleSheet.create({
	root: { flex: 1, backgroundColor: palette.white },
	stage: { flex: 1, borderBottomLeftRadius: radii.sheet, borderBottomRightRadius: radii.sheet, overflow: "hidden", paddingHorizontal: 24, paddingBottom: 24 },
	topRow: { flexDirection: "row", marginLeft: -8 },
	titleBlock: { gap: 16, marginTop: 8 },
	title: { fontSize: 32, lineHeight: 38 },
	organizer: { flexDirection: "row", alignItems: "center", gap: 12 },
	dim: { color: "rgba(255,255,255,0.7)" },
	grid: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 8, alignContent: "center", marginVertical: 16 },
	tile: { borderRadius: radii.lg, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.08)" },
	tileFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
	tileLabel: { position: "absolute", left: 8, bottom: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: "rgba(0,0,0,0.45)" },
	controls: { marginTop: "auto" },
	strip: { paddingTop: 16, backgroundColor: palette.white },
	stripList: { paddingHorizontal: 24, gap: 14 },
	stripItem: {},
	stripPending: { opacity: 0.4 },
	muteBadge: { position: "absolute", right: -2, bottom: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: "#E6E6E6", borderWidth: 2, borderColor: palette.white, alignItems: "center", justifyContent: "center" },
});
