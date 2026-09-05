import { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { parseProfileLink } from "@/src/lib/profile/profileLink";

const QrScannerScreen = () => {
	const [permission, requestPermission] = useCameraPermissions();
	const [scanned, setScanned] = useState(false);

	const handleScanned = ({ data }: { data: string }) => {
		if (scanned) return;
		setScanned(true);

		const username = parseProfileLink(data);
		if (!username) {
			Alert.alert("Not a Chatbox QR code", "This QR code isn't a Chatbox profile link.", [
				{ text: "OK", onPress: () => setScanned(false) },
			]);
			return;
		}

		router.replace({
			pathname: "/messages/Chat",
			// There's no backend to look up a real profile by username yet,
			// so the scanned username becomes both the chat's id and display
			// name — see docs/architecture/profile-qr.md.
			params: { user: JSON.stringify({ id: username, name: username, avatar: { url: "" } }) },
		});
	};

	if (!permission) return <View style={styles.container} />;

	if (!permission.granted) {
		return (
			<View style={styles.container}>
				<Text style={styles.permissionText}>Camera access is needed to scan QR codes.</Text>
				<TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
					<Text style={styles.permissionButtonText}>Grant Access</Text>
				</TouchableOpacity>
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<CameraView
				style={StyleSheet.absoluteFillObject}
				facing="back"
				barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
				onBarcodeScanned={scanned ? undefined : handleScanned}
			/>
			<View style={styles.overlay}>
				<TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
					<Ionicons name="close" size={28} color="#fff" />
				</TouchableOpacity>
				<View style={styles.frame} />
				<Text style={styles.hint}>Point your camera at a Chatbox QR code</Text>
			</View>
		</View>
	);
};

export default QrScannerScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
		justifyContent: "center",
		alignItems: "center",
		padding: 24,
	},
	overlay: {
		...StyleSheet.absoluteFillObject,
		justifyContent: "center",
		alignItems: "center",
	},
	backButton: {
		position: "absolute",
		top: 60,
		left: 20,
	},
	frame: {
		width: 240,
		height: 240,
		borderRadius: 20,
		borderWidth: 3,
		borderColor: "#fff",
	},
	hint: {
		color: "#fff",
		marginTop: 20,
		fontSize: 14,
	},
	permissionText: {
		color: "#fff",
		textAlign: "center",
		marginBottom: 16,
	},
	permissionButton: {
		backgroundColor: "#fff",
		borderRadius: 16,
		paddingVertical: 12,
		paddingHorizontal: 24,
	},
	permissionButtonText: {
		fontWeight: "600",
	},
});
