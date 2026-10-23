import { useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { router } from "expo-router";
import Animated, { FadeInUp } from "react-native-reanimated";

import { CircleButton, palette } from "@/src/components/ui";
import { setSpeakerphoneEnabled } from "@/src/hooks/useCallAudioRouting";
import type { IActiveCall } from "@/src/redux/features/callSlice";
import { useCallEngine } from "@/src/hooks/useCallEngine";
import { store } from "@/src/redux/store/store";

// Mic, speaker, camera, chat, hang-up row from the Figma call screens.
const CallControls = ({ call, style }: { call: IActiveCall; style?: StyleProp<ViewStyle> }) => {
	const { toggleMute, toggleVideo, switchCamera, hangUp } = useCallEngine();
	const [muted, setMuted] = useState(false);
	const [speaker, setSpeaker] = useState(call.type === "video");
	const [videoOn, setVideoOn] = useState(call.type === "video");

	const openChat = () => {
		const chat = store.getState().chats.chats.find((item) => item.id === call.conversationId);
		if (chat) router.push({ pathname: "/messages/Chat", params: { user: JSON.stringify(chat) } });
	};

	return (
		<Animated.View entering={FadeInUp.springify().damping(18)} style={[styles.row, style]}>
			<CircleButton icon={muted ? "mic-off" : "mic-outline"} label={muted ? "Unmute" : "Mute"} variant="glass" size={48} iconSize={22} onPress={() => setMuted(toggleMute())} style={muted ? styles.active : undefined} iconColor={muted ? palette.ink : palette.white} />
			<CircleButton
				icon={speaker ? "volume-high" : "volume-medium-outline"}
				label={speaker ? "Speaker off" : "Speaker on"}
				variant="glass"
				size={48}
				iconSize={22}
				onPress={() => {
					setSpeakerphoneEnabled(!speaker);
					setSpeaker(!speaker);
				}}
				style={speaker ? styles.active : undefined}
				iconColor={speaker ? palette.ink : palette.white}
			/>
			{call.type === "video" ? (
				<View>
					<CircleButton icon={videoOn ? "videocam-outline" : "videocam-off-outline"} label={videoOn ? "Turn camera off" : "Turn camera on"} variant="glass" size={48} iconSize={22} onPress={() => setVideoOn(toggleVideo())} />
					{videoOn ? <CircleButton icon="camera-reverse-outline" label="Switch camera" variant="glass" size={26} iconSize={14} onPress={switchCamera} style={styles.flip} /> : null}
				</View>
			) : null}
			<CircleButton icon="chatbubble-ellipses-outline" label="Open chat" variant="brand" size={48} iconSize={22} onPress={openChat} />
			<CircleButton icon="close" label="End call" variant="danger" size={48} iconSize={26} onPress={hangUp} />
		</Animated.View>
	);
};

export default CallControls;

const styles = StyleSheet.create({
	row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
	active: { backgroundColor: palette.white },
	flip: { position: "absolute", top: -10, right: -10 },
});
