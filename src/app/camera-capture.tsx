import { useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { CameraView, useCameraPermissions, useMicrophonePermissions, FlashMode } from "expo-camera";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";

const HOLD_TO_RECORD_MS = 300;
const MAX_VIDEO_SECONDS = 120;
const FLASH_CYCLE: FlashMode[] = ["off", "on", "auto"];

/**
 * Fast in-app camera for chat media (tap = photo, hold = video), replacing
 * the system camera app the attachment sheet's "Camera" option used to
 * launch. Hands the captured uri off to /media-editor via
 * mediaComposerBridge — see docs/architecture/media-editor.md.
 */
const CameraCaptureScreen = () => {
	const params = useLocalSearchParams<{ target?: string }>();
	const cameraRef = useRef<CameraView>(null);
	const [cameraPermission, requestCameraPermission] = useCameraPermissions();
	const [micPermission, requestMicPermission] = useMicrophonePermissions();
	const [facing, setFacing] = useState<"front" | "back">("back");
	const [flash, setFlash] = useState<FlashMode>("off");
	const [zoom, setZoom] = useState(0);
	const [cameraMode, setCameraMode] = useState<"picture" | "video">("picture");
	const [isRecording, setIsRecording] = useState(false);
	const zoomStartRef = useRef(0);
	const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const isHoldingRef = useRef(false);
	const pendingRecordRef = useRef(false);
	const recordingPromiseRef = useRef<Promise<{ uri: string } | undefined> | null>(null);

	const ensurePermissions = async () => {
		let camera = cameraPermission;
		let mic = micPermission;
		if (!camera?.granted) camera = await requestCameraPermission();
		if (!mic?.granted) mic = await requestMicPermission();
		return !!camera?.granted && !!mic?.granted;
	};

	const openEditor = (uri: string, type: "image" | "video") => {
		router.replace({
			pathname: "/media-editor",
			params: params.target ? { uri, type, target: params.target } : { uri, type },
		});
	};

	const takePhoto = async () => {
		if (!(await ensurePermissions())) return;
		const photo = await cameraRef.current?.takePictureAsync({ quality: 1 });
		if (photo?.uri) openEditor(photo.uri, "image");
	};

	const startVideo = async () => {
		if (!(await ensurePermissions())) return;
		isHoldingRef.current = true;
		pendingRecordRef.current = true;
		setIsRecording(true);
		// Actual recordAsync() is deferred to onCameraReady — CameraView needs
		// to finish reinitializing for the "video" mode prop before it accepts
		// a recording call (same two-step pattern as useVideoNoteRecorder).
		setCameraMode("video");
	};

	const handleCameraReady = () => {
		if (!pendingRecordRef.current) return;
		pendingRecordRef.current = false;
		recordingPromiseRef.current =
			cameraRef.current?.recordAsync({ maxDuration: MAX_VIDEO_SECONDS }) || null;
	};

	const stopVideo = async () => {
		if (!isHoldingRef.current) return;
		isHoldingRef.current = false;
		setIsRecording(false);
		cameraRef.current?.stopRecording();
		const result = await recordingPromiseRef.current;
		setCameraMode("picture");
		if (result?.uri) openEditor(result.uri, "video");
	};

	const handlePressIn = () => {
		holdTimerRef.current = setTimeout(() => {
			holdTimerRef.current = null;
			startVideo();
		}, HOLD_TO_RECORD_MS);
	};

	const handlePressOut = () => {
		if (holdTimerRef.current) {
			clearTimeout(holdTimerRef.current);
			holdTimerRef.current = null;
			takePhoto();
			return;
		}
		stopVideo();
	};

	const pinchGesture = Gesture.Pinch()
		.onBegin(() => {
			zoomStartRef.current = zoom;
		})
		.onUpdate((e) => {
			const next = Math.max(0, Math.min(1, zoomStartRef.current + (e.scale - 1) * 0.5));
			setZoom(next);
		});

	return (
		<View style={styles.container}>
			<GestureDetector gesture={pinchGesture}>
				<CameraView
					ref={cameraRef}
					style={StyleSheet.absoluteFill}
					facing={facing}
					flash={flash}
					zoom={zoom}
					mode={cameraMode}
					onCameraReady={handleCameraReady}
				/>
			</GestureDetector>

			<TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
				<Ionicons name="close" size={28} color="#fff" />
			</TouchableOpacity>

			<TouchableOpacity
				style={styles.flashButton}
				onPress={() => setFlash((prev) => FLASH_CYCLE[(FLASH_CYCLE.indexOf(prev) + 1) % FLASH_CYCLE.length])}
			>
				<Ionicons
					name={flash === "off" ? "flash-off" : flash === "on" ? "flash" : "flash-outline"}
					size={22}
					color="#fff"
				/>
				<Text style={styles.flashLabel}>{flash.toUpperCase()}</Text>
			</TouchableOpacity>

			<View style={styles.bottomBar}>
				<View style={styles.sideSlot} />
				<TouchableOpacity
					style={[styles.shutter, isRecording && styles.shutterRecording]}
					onPressIn={handlePressIn}
					onPressOut={handlePressOut}
				>
					<View style={[styles.shutterInner, isRecording && styles.shutterInnerRecording]} />
				</TouchableOpacity>
				<TouchableOpacity
					style={styles.sideSlot}
					onPress={() => setFacing((prev) => (prev === "back" ? "front" : "back"))}
				>
					<Ionicons name="camera-reverse" size={28} color="#fff" />
				</TouchableOpacity>
			</View>

			<Text style={styles.hint}>{isRecording ? "Recording…" : "Tap for photo, hold for video"}</Text>
		</View>
	);
};

export default CameraCaptureScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
	},
	closeButton: {
		position: "absolute",
		top: 56,
		left: 20,
		padding: 8,
	},
	flashButton: {
		position: "absolute",
		top: 56,
		right: 20,
		alignItems: "center",
		padding: 8,
	},
	flashLabel: {
		color: "#fff",
		fontSize: 10,
		marginTop: 2,
	},
	bottomBar: {
		position: "absolute",
		bottom: 50,
		left: 0,
		right: 0,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 40,
	},
	sideSlot: {
		width: 44,
		height: 44,
		justifyContent: "center",
		alignItems: "center",
	},
	shutter: {
		width: 74,
		height: 74,
		borderRadius: 37,
		borderWidth: 4,
		borderColor: "#fff",
		justifyContent: "center",
		alignItems: "center",
	},
	shutterRecording: {
		borderColor: "#F04A4C",
	},
	shutterInner: {
		width: 58,
		height: 58,
		borderRadius: 29,
		backgroundColor: "#fff",
	},
	shutterInnerRecording: {
		width: 28,
		height: 28,
		borderRadius: 6,
		backgroundColor: "#F04A4C",
	},
	hint: {
		position: "absolute",
		bottom: 16,
		alignSelf: "center",
		color: "rgba(255,255,255,0.7)",
		fontSize: 12,
	},
});
