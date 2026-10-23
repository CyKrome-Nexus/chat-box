import { useEffect } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Colors from "@/src/constants/Colors";

/** Blocks the whole app behind a biometric prompt — see useAppLock. */
const AppLockScreen = ({ visible, onUnlock }: { visible: boolean; onUnlock: () => void }) => {
	useEffect(() => {
		if (visible) onUnlock();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [visible]);

	if (!visible) return null;

	return (
		<Modal visible={visible} animationType="none">
			<View style={styles.container}>
				<Ionicons name="lock-closed" size={56} color={Colors.focused} />
				<Text style={styles.title}>Chatbox is Locked</Text>
				<Text style={styles.subtitle}>Unlock with Face ID, Touch ID, or your device PIN</Text>
				<TouchableOpacity style={styles.button} onPress={onUnlock}>
					<Text style={styles.buttonText}>Unlock</Text>
				</TouchableOpacity>
			</View>
		</Modal>
	);
};

export default AppLockScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
		justifyContent: "center",
		alignItems: "center",
		gap: 12,
		paddingHorizontal: 40,
	},
	title: {
		fontSize: 20,
		fontWeight: "700",
		color: "#000E08",
		marginTop: 8,
	},
	subtitle: {
		fontSize: 13,
		color: "#797C7B",
		textAlign: "center",
	},
	button: {
		marginTop: 20,
		backgroundColor: Colors.focused,
		paddingHorizontal: 32,
		paddingVertical: 12,
		borderRadius: 24,
	},
	buttonText: {
		color: "#fff",
		fontWeight: "700",
		fontSize: 15,
	},
});
