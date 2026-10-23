import { Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { Ionicons } from "@expo/vector-icons";

const FullscreenVideoModal = ({
	uri,
	visible,
	onClose,
}: {
	uri?: string;
	visible: boolean;
	onClose: () => void;
}) => {
	const player = useVideoPlayer(uri || "", (p) => {
		p.loop = true;
		p.play();
	});

	if (!uri) return null;

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<View style={styles.container}>
				<TouchableOpacity style={styles.closeButton} onPress={onClose}>
					<Ionicons name="close" size={28} color="#fff" />
				</TouchableOpacity>
				<VideoView player={player} style={styles.video} contentFit="contain" nativeControls />
			</View>
		</Modal>
	);
};

export default FullscreenVideoModal;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.95)",
		justifyContent: "center",
	},
	closeButton: {
		position: "absolute",
		top: 60,
		right: 20,
		zIndex: 1,
		padding: 8,
	},
	video: {
		width: "100%",
		height: "80%",
	},
});
