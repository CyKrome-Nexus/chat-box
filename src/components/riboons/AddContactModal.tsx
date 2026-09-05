import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";

import TextInput from "../inputs/TextInput";
import Colors from "@/src/constants/Colors";
import { addManualContact, setShowAddContactModal } from "@/src/redux/features/contactsSlice";

const AddContactModal = () => {
	const dispatch = useDispatch();
	const visible = useSelector((state: any) => state.contacts.showAddContactModal);
	const [name, setName] = useState("");
	const [identifier, setIdentifier] = useState("");

	const close = () => {
		dispatch(setShowAddContactModal(false));
		setName("");
		setIdentifier("");
	};

	const handleAdd = () => {
		if (!name.trim() || !identifier.trim()) return;

		dispatch(
			addManualContact({
				id: `manual-${Date.now()}`,
				name: name.trim(),
				avatar: { url: "" },
				phoneNumber: identifier.trim(),
				isRegistered: true,
				source: "manual",
			})
		);
		close();
	};

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
			<Pressable style={styles.backdrop} onPress={close}>
				<Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
					<Text style={styles.title}>Add Contact</Text>
					<TextInput value={name} onChange={setName} label="Name" labelColor={Colors.focused} />
					<TextInput
						value={identifier}
						onChange={setIdentifier}
						label="Phone number or @username"
						labelColor={Colors.focused}
					/>
					<TouchableOpacity
						style={[styles.button, !!name.trim() && !!identifier.trim() && styles.buttonActive]}
						disabled={!name.trim() || !identifier.trim()}
						onPress={handleAdd}
					>
						<Text style={styles.buttonText}>Add</Text>
					</TouchableOpacity>
				</Pressable>
			</Pressable>
		</Modal>
	);
};

export default AddContactModal;

const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.4)",
		justifyContent: "center",
		alignItems: "center",
	},
	sheet: {
		width: "85%",
		backgroundColor: "#fff",
		borderRadius: 20,
		padding: 20,
		gap: 8,
	},
	title: {
		fontSize: 18,
		fontWeight: "bold",
		marginBottom: 8,
	},
	button: {
		backgroundColor: "#e8e8e8ff",
		padding: 14,
		borderRadius: 16,
		marginTop: 10,
	},
	buttonActive: {
		backgroundColor: Colors.focused,
	},
	buttonText: {
		textAlign: "center",
		color: "#fff",
		fontWeight: "bold",
		fontSize: 16,
	},
});
