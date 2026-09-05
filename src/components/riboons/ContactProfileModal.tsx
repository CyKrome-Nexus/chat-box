import { Alert, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";

import Avatar from "../images/Avatar";
import Colors from "@/src/constants/Colors";
import { IContactRibbon } from "@/src/interfaces/list-interface";

const ContactProfileModal = ({
	contact,
	onClose,
}: {
	contact: IContactRibbon | null;
	onClose: () => void;
}) => {
	if (!contact) return null;

	const handleMessage = () => {
		onClose();
		router.push({
			pathname: "/messages/Chat",
			params: { user: JSON.stringify(contact) },
		});
	};

	const handleInvite = () => {
		onClose();
		Alert.alert("Invite sent", `An invite to join Chatbox was "sent" to ${contact.name}.`);
	};

	return (
		<Modal visible={!!contact} transparent animationType="fade" onRequestClose={onClose}>
			<Pressable style={styles.backdrop} onPress={onClose}>
				<Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
					<Avatar data={contact.avatar} size={80} />
					<Text style={styles.name}>{contact.name}</Text>
					{!!contact.phoneNumber && <Text style={styles.detail}>{contact.phoneNumber}</Text>}
					{!!contact.about && <Text style={styles.detail}>{contact.about}</Text>}

					{contact.isRegistered ? (
						<TouchableOpacity style={styles.primaryButton} onPress={handleMessage}>
							<Text style={styles.primaryButtonText}>Message</Text>
						</TouchableOpacity>
					) : (
						<TouchableOpacity style={styles.primaryButton} onPress={handleInvite}>
							<Text style={styles.primaryButtonText}>Invite to Chatbox</Text>
						</TouchableOpacity>
					)}
				</Pressable>
			</Pressable>
		</Modal>
	);
};

export default ContactProfileModal;

const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.4)",
		justifyContent: "center",
		alignItems: "center",
	},
	sheet: {
		width: "80%",
		backgroundColor: "#fff",
		borderRadius: 20,
		padding: 24,
		alignItems: "center",
		gap: 6,
	},
	name: {
		fontSize: 20,
		fontWeight: "bold",
		marginTop: 8,
	},
	detail: {
		fontSize: 13,
		color: "#797C7B",
		textAlign: "center",
	},
	primaryButton: {
		backgroundColor: Colors.focused,
		borderRadius: 16,
		paddingVertical: 12,
		paddingHorizontal: 24,
		marginTop: 14,
		width: "100%",
	},
	primaryButtonText: {
		color: "#fff",
		fontWeight: "bold",
		textAlign: "center",
		fontSize: 15,
	},
});
