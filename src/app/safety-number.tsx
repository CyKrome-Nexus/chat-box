import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";

import Colors from "@/src/constants/Colors";
import { getIdentityFingerprintMaterial } from "@/src/lib/crypto/identityKeyStore";
import { getSimulatedPeerBundle } from "@/src/lib/crypto/simulatedPeer";
import { computeSafetyNumber, formatSafetyNumber } from "@/src/lib/crypto/safetyNumber";
import { runSessionSelfTest } from "@/src/lib/crypto/sessionManager";
import { setSafetyNumber, setSessionEstablished, setVerified } from "@/src/redux/features/e2eeSlice";
import { concatBytes } from "@/src/lib/crypto/primitives";
import { IUser } from "@/src/interfaces/user-interface";

/**
 * Safety Number verification screen — see docs/architecture/e2ee-crypto.md.
 */
const SafetyNumberScreen = () => {
	const dispatch = useDispatch();
	const params = useLocalSearchParams<{ conversationId: string; name?: string }>();
	const user = useSelector((state: { user: IUser | null }) => state.user);
	const currentUserId = useSelector((state: any) => state.user?._id || state.user?.username || "me");
	const e2ee = useSelector((state: any) => state.e2ee.byConversation[params.conversationId]);

	const [loading, setLoading] = useState(true);
	const [safetyNumber, setLocalSafetyNumber] = useState<string | null>(null);
	const [selfTestPassed, setSelfTestPassed] = useState<boolean | null>(null);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			const myMaterial = await getIdentityFingerprintMaterial();
			const peerBundle = getSimulatedPeerBundle(params.conversationId);
			const peerMaterial = concatBytes(peerBundle.identityDHPub, peerBundle.identitySignPub);

			const number = computeSafetyNumber(
				{ userId: currentUserId, identityKeyMaterial: myMaterial },
				{ userId: params.conversationId, identityKeyMaterial: peerMaterial }
			);
			const passed = await runSessionSelfTest(params.conversationId);

			if (cancelled) return;
			setLocalSafetyNumber(number);
			setSelfTestPassed(passed);
			setLoading(false);
			dispatch(setSafetyNumber({ conversationId: params.conversationId, safetyNumber: number }));
			dispatch(setSessionEstablished({ conversationId: params.conversationId, selfTestPassed: passed }));
		})();
		return () => {
			cancelled = true;
		};
	}, [params.conversationId, currentUserId, dispatch]);

	const handleToggleVerified = () => {
		dispatch(setVerified({ conversationId: params.conversationId, verified: !e2ee?.verified }));
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<TouchableOpacity onPress={() => router.back()}>
					<Ionicons name="chevron-back" size={24} color="#000E08" />
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Encryption</Text>
				<View style={{ width: 24 }} />
			</View>

			{loading ? (
				<ActivityIndicator style={{ marginTop: 60 }} color={Colors.focused} />
			) : (
				<View style={styles.content}>
					<Ionicons name="lock-closed" size={40} color={Colors.focused} />
					<Text style={styles.title}>
						Messages with {params.name || "this contact"} are secured with end-to-end encryption
					</Text>
					<Text style={styles.subtitle}>
						No one outside this chat, not even Chatbox, can read them.
					</Text>

					<View style={styles.qrCard}>
						<QRCode value={safetyNumber || ""} size={180} />
					</View>
					<Text style={styles.safetyNumber}>{formatSafetyNumber(safetyNumber || "")}</Text>

					<View style={styles.selfTestRow}>
						<Ionicons
							name={selfTestPassed ? "checkmark-circle" : "close-circle"}
							size={18}
							color={selfTestPassed ? "#11BC6B" : "#F04A4C"}
						/>
						<Text style={styles.selfTestText}>
							{selfTestPassed ? "Encryption engine verified" : "Encryption verification failed"}
						</Text>
					</View>

					<TouchableOpacity
						style={[styles.verifyButton, e2ee?.verified && styles.verifyButtonActive]}
						onPress={handleToggleVerified}
					>
						<Ionicons
							name={e2ee?.verified ? "checkmark-circle" : "shield-checkmark-outline"}
							size={18}
							color={e2ee?.verified ? "#fff" : Colors.focused}
						/>
						<Text style={[styles.verifyButtonText, e2ee?.verified && styles.verifyButtonTextActive]}>
							{e2ee?.verified ? "Marked as Verified" : "Mark as Verified"}
						</Text>
					</TouchableOpacity>

					<Text style={styles.note}>
						Compare this number with {params.name || "your contact"}'s device in person or over another
						trusted channel, or scan their QR code, to confirm no one is intercepting your messages.
					</Text>
				</View>
			)}
		</View>
	);
};

export default SafetyNumberScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingTop: 56,
		paddingHorizontal: 16,
		paddingBottom: 12,
	},
	headerTitle: {
		fontSize: 16,
		fontWeight: "700",
		color: "#000E08",
	},
	content: {
		alignItems: "center",
		paddingHorizontal: 30,
		gap: 10,
	},
	title: {
		fontSize: 15,
		fontWeight: "700",
		color: "#000E08",
		textAlign: "center",
		marginTop: 8,
	},
	subtitle: {
		fontSize: 13,
		color: "#797C7B",
		textAlign: "center",
	},
	qrCard: {
		marginTop: 16,
		padding: 16,
		backgroundColor: "#F2F8F7",
		borderRadius: 16,
	},
	safetyNumber: {
		fontSize: 15,
		fontFamily: "Courier",
		textAlign: "center",
		letterSpacing: 1,
		marginTop: 8,
	},
	selfTestRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		marginTop: 12,
	},
	selfTestText: {
		fontSize: 12,
		color: "#797C7B",
	},
	verifyButton: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		marginTop: 16,
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 24,
		borderWidth: 1,
		borderColor: Colors.focused,
	},
	verifyButtonActive: {
		backgroundColor: Colors.focused,
	},
	verifyButtonText: {
		color: Colors.focused,
		fontWeight: "700",
	},
	verifyButtonTextActive: {
		color: "#fff",
	},
	note: {
		fontSize: 12,
		color: "#797C7B",
		textAlign: "center",
		marginTop: 16,
	},
});
