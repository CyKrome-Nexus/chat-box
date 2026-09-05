import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { RTCView, MediaStream } from "react-native-webrtc";

import Avatar from "../images/Avatar";
import CallControlButton from "./CallControlButton";
import CallTimer from "./CallTimer";
import DraggablePipView from "./DraggablePipView";
import { IActiveCall } from "@/src/redux/features/callSlice";
import { useCallAudioRouting, setMicrophoneMuted, setSpeakerphoneEnabled } from "@/src/hooks/useCallAudioRouting";
import { useLocalCameraPreview } from "@/src/hooks/useLocalCameraPreview";

const ActiveCallView = ({
	call,
	onHangUp,
	remoteStream,
}: {
	call: IActiveCall;
	onHangUp: () => void;
	remoteStream?: MediaStream | null;
}) => {
	const [muted, setMuted] = useState(false);
	const [speakerOn, setSpeakerOn] = useState(call.type === "video");
	const [videoOn, setVideoOn] = useState(true);

	const isVideo = call.type === "video";

	useCallAudioRouting(true, isVideo);
	const localCamera = useLocalCameraPreview(isVideo);

	useEffect(() => {
		setSpeakerphoneEnabled(speakerOn);
	}, [speakerOn]);

	const toggleMuted = () => {
		setMuted((prev) => {
			setMicrophoneMuted(!prev);
			return !prev;
		});
	};

	const toggleVideo = () => {
		setVideoOn((prev) => {
			localCamera.setVideoEnabled(!prev);
			return !prev;
		});
	};

	return (
		<View style={[styles.container, isVideo && styles.videoContainer]}>
			{isVideo && (
				<>
					{remoteStream ? (
						<RTCView streamURL={remoteStream.toURL()} style={StyleSheet.absoluteFill} objectFit="cover" />
					) : (
						<View style={[StyleSheet.absoluteFill, styles.remotePlaceholder]} />
					)}
					{videoOn && (
						<DraggablePipView streamUrl={localCamera.stream?.toURL()} />
					)}
				</>
			)}

			<View style={styles.info}>
				{(!isVideo || !remoteStream) && <Avatar data={call.contactAvatar} size={isVideo ? 100 : 140} />}
				<Text style={styles.name}>{call.contactName}</Text>
				{call.connectedAt && <CallTimer connectedAt={call.connectedAt} />}
			</View>

			<View style={styles.controlsRow}>
				<CallControlButton
					icon={muted ? "mic-off" : "mic"}
					label="Mute"
					active={muted}
					onPress={toggleMuted}
				/>
				<CallControlButton
					icon={speakerOn ? "volume-high" : "volume-mute"}
					label="Speaker"
					active={speakerOn}
					onPress={() => setSpeakerOn((prev) => !prev)}
				/>
				{isVideo && (
					<>
						<CallControlButton
							icon={videoOn ? "videocam" : "videocam-off"}
							label="Video"
							active={!videoOn}
							onPress={toggleVideo}
						/>
						<CallControlButton icon="camera-reverse" label="Flip" onPress={localCamera.switchCamera} />
					</>
				)}
				<CallControlButton icon="call" label="End" danger rotate135 onPress={onHangUp} />
			</View>
		</View>
	);
};

export default ActiveCallView;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#0B1F1B",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: 80,
	},
	videoContainer: {
		backgroundColor: "#000",
	},
	remotePlaceholder: {
		backgroundColor: "#111",
	},
	info: {
		alignItems: "center",
		gap: 10,
		marginTop: 60,
	},
	name: {
		color: "#fff",
		fontSize: 24,
		fontWeight: "700",
	},
	controlsRow: {
		flexDirection: "row",
		gap: 16,
	},
});
