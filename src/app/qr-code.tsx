import { Alert, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import * as Clipboard from "expo-clipboard";

import Avatar from "@/src/components/images/Avatar";
import Colors from "@/src/constants/Colors";
import { IUser } from "@/src/interfaces/user-interface";
import { buildProfileLink } from "@/src/lib/profile/profileLink";

const QrCodeScreen = () => {
	const user = useSelector((state: { user: IUser | null }) => state.user);
	const profileLink = buildProfileLink(user?.username || "unknown");

	const handleCopyLink = async () => {
		await Clipboard.setStringAsync(profileLink);
		Alert.alert("Copied", "Profile link copied to clipboard.");
	};

	const handleShare = async () => {
		try {
			await Share.share({ message: `Chat with me on Chatbox: ${profileLink}` });
		} catch {
			// user dismissed the share sheet — nothing to do
		}
	};

	return (
		<View style={styles.container}>
			<TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
				<Ionicons name="chevron-back" size={26} color="#fff" />
			</TouchableOpacity>

			<Avatar data={user?.avatar} isWhite size={80} />
			<Text style={styles.name}>{user?.name}</Text>
			<Text style={styles.link}>{profileLink}</Text>

			<View style={styles.qrCard}>
				<QRCode value={profileLink} size={220} backgroundColor="#fff" color="#000" />
			</View>

			<View style={styles.actionsRow}>
				<TouchableOpacity style={styles.actionButton} onPress={handleCopyLink}>
					<Ionicons name="link" size={18} color="#fff" />
					<Text style={styles.actionText}>Copy Link</Text>
				</TouchableOpacity>
				<TouchableOpacity style={styles.actionButton} onPress={handleShare}>
					<Ionicons name="share-social" size={18} color="#fff" />
					<Text style={styles.actionText}>Share</Text>
				</TouchableOpacity>
			</View>

			<TouchableOpacity style={styles.scanButton} onPress={() => router.push("/qr-scanner")}>
				<Ionicons name="scan" size={18} color={Colors.focused} />
				<Text style={styles.scanButtonText}>Scan a QR Code</Text>
			</TouchableOpacity>
		</View>
	);
};

export default QrCodeScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#0B1F1B",
		alignItems: "center",
		paddingTop: 70,
		paddingHorizontal: 24,
	},
	backButton: {
		position: "absolute",
		top: 60,
		left: 20,
	},
	name: {
		color: "#fff",
		fontSize: 20,
		fontWeight: "700",
		marginTop: 12,
	},
	link: {
		color: "rgba(255,255,255,0.6)",
		fontSize: 13,
		marginTop: 4,
		marginBottom: 24,
	},
	qrCard: {
		backgroundColor: "#fff",
		borderRadius: 20,
		padding: 20,
	},
	actionsRow: {
		flexDirection: "row",
		gap: 30,
		marginTop: 30,
	},
	actionButton: {
		alignItems: "center",
		gap: 6,
	},
	actionText: {
		color: "#fff",
		fontSize: 12,
	},
	scanButton: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		backgroundColor: "#fff",
		borderRadius: 16,
		paddingVertical: 12,
		paddingHorizontal: 24,
		marginTop: 40,
	},
	scanButtonText: {
		color: Colors.focused,
		fontWeight: "600",
	},
});
