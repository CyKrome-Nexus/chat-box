import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import Colors from "@/src/constants/Colors";

/** Passphrase entry for encrypted backup create/restore — RN has no cross-platform Alert.prompt. */
const PassphraseModal = ({
	visible,
	title,
	confirmLabel,
	requireConfirmation,
	onCancel,
	onSubmit,
}: {
	visible: boolean;
	title: string;
	confirmLabel: string;
	requireConfirmation?: boolean;
	onCancel: () => void;
	onSubmit: (passphrase: string) => void;
}) => {
	const [passphrase, setPassphrase] = useState("");
	const [confirm, setConfirm] = useState("");

	const mismatch = requireConfirmation && passphrase.length > 0 && passphrase !== confirm;
	const canSubmit = passphrase.length >= 6 && (!requireConfirmation || passphrase === confirm);

	const handleSubmit = () => {
		if (!canSubmit) return;
		onSubmit(passphrase);
		setPassphrase("");
		setConfirm("");
	};

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
			<Pressable style={styles.backdrop} onPress={onCancel}>
				<Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
					<Text style={styles.title}>{title}</Text>
					<TextInput
						style={styles.input}
						placeholder="Passphrase"
						placeholderTextColor="#797C7B"
						secureTextEntry
						value={passphrase}
						onChangeText={setPassphrase}
						autoFocus
					/>
					{requireConfirmation && (
						<TextInput
							style={styles.input}
							placeholder="Confirm passphrase"
							placeholderTextColor="#797C7B"
							secureTextEntry
							value={confirm}
							onChangeText={setConfirm}
						/>
					)}
					{mismatch && <Text style={styles.error}>Passphrases don't match</Text>}
					<View style={styles.actions}>
						<TouchableOpacity onPress={onCancel}>
							<Text style={styles.cancelText}>Cancel</Text>
						</TouchableOpacity>
						<TouchableOpacity onPress={handleSubmit} disabled={!canSubmit}>
							<Text style={[styles.confirmText, !canSubmit && styles.confirmTextDisabled]}>
								{confirmLabel}
							</Text>
						</TouchableOpacity>
					</View>
				</Pressable>
			</Pressable>
		</Modal>
	);
};

export default PassphraseModal;

const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.5)",
		justifyContent: "center",
		padding: 30,
	},
	card: {
		backgroundColor: "#fff",
		borderRadius: 16,
		padding: 20,
		gap: 12,
	},
	title: {
		fontSize: 16,
		fontWeight: "700",
		color: "#000E08",
	},
	input: {
		borderWidth: 1,
		borderColor: "#eee",
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 15,
	},
	error: {
		color: "#F04A4C",
		fontSize: 12,
	},
	actions: {
		flexDirection: "row",
		justifyContent: "flex-end",
		gap: 20,
		marginTop: 4,
	},
	cancelText: {
		color: "#797C7B",
		fontSize: 14,
	},
	confirmText: {
		color: Colors.focused,
		fontWeight: "700",
		fontSize: 14,
	},
	confirmTextDisabled: {
		color: "#ccc",
	},
});
