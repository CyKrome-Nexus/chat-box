import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import Avatar from "@/src/components/images/Avatar";
import TextInput from "@/src/components/inputs/TextInput";
import Colors from "@/src/constants/Colors";
import { IUser } from "@/src/interfaces/user-interface";
import { updateUser } from "@/src/redux/features/userSlice";
import { useAvatarPicker } from "@/src/hooks/useAvatarPicker";
import { isEmail } from "@/src/lib/auth/validators";
import UsernameEditor from "@/src/components/settings/UsernameEditor";
import { TVisibility } from "@/src/redux/features/settingsSlice";

const PHONE_VISIBILITY_COPY: Record<TVisibility, string> = {
	everyone: "Your phone number is visible to everyone who views your profile.",
	contacts: "Your phone number is visible only to people who have you saved as a contact.",
	nobody: "Your phone number is hidden from everyone. People can only find and message you via your @username.",
};

const Profile = () => {
	const dispatch = useDispatch();
	const user = useSelector((state: { user: IUser | null }) => state.user);
	const phoneNumberVisibility = useSelector((state: any) => state.settings.privacy.phoneNumberVisibility as TVisibility);
	const { pickAvatar } = useAvatarPicker();

	const [name, setName] = useState(user?.name || "");
	const [about, setAbout] = useState(user?.about || "");

	const isDirty = name !== (user?.name || "") || about !== (user?.about || "");

	const handleChangePhoto = () => {
		Alert.alert("Change profile photo", undefined, [
			{
				text: "Take Photo",
				onPress: async () => {
					const uri = await pickAvatar("camera");
					if (uri) dispatch(updateUser({ ...user, avatar: { url: uri } }));
				},
			},
			{
				text: "Choose from Library",
				onPress: async () => {
					const uri = await pickAvatar("gallery");
					if (uri) dispatch(updateUser({ ...user, avatar: { url: uri } }));
				},
			},
			{ text: "Cancel", style: "cancel" },
		]);
	};

	const handleSave = () => {
		dispatch(updateUser({ ...user, name: name.trim(), about: about.trim() }));
		Alert.alert("Profile updated");
	};

	const identifierLabel = user?.username && isEmail(user.username) ? "Email" : "Phone number";

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
				<Ionicons name="chevron-back" size={26} color="#000" />
			</TouchableOpacity>

			<TouchableOpacity style={styles.avatarWrapper} onPress={handleChangePhoto}>
				<Avatar data={user?.avatar} size={120} />
				<View style={styles.avatarEditBadge}>
					<Ionicons name="camera" size={16} color="#fff" />
				</View>
			</TouchableOpacity>

			<TouchableOpacity style={styles.qrButton} onPress={() => router.push("/qr-code")}>
				<Ionicons name="qr-code-outline" size={18} color={Colors.focused} />
				<Text style={styles.qrButtonText}>My QR Code</Text>
			</TouchableOpacity>

			<View style={styles.form}>
				<TextInput value={name} onChange={setName} label="Name" labelColor={Colors.focused} />
				<View style={styles.readonlyField}>
					<Text style={styles.readonlyLabel}>{identifierLabel}</Text>
					<Text style={styles.readonlyValue}>{user?.username}</Text>
				</View>
				<TextInput value={about} onChange={setAbout} label="About" labelColor={Colors.focused} />
			</View>

			{isDirty && (
				<TouchableOpacity style={styles.saveButton} onPress={handleSave}>
					<Text style={styles.saveButtonText}>Save</Text>
				</TouchableOpacity>
			)}

			<View style={styles.usernameSection}>
				<Text style={styles.sectionLabel}>Username</Text>
				<Text style={styles.sectionHint}>
					Let people start a chat with you without knowing your phone number.
				</Text>
				<UsernameEditor
					currentHandle={user?.handle}
					userId={user?.id || user?.username || "me"}
					name={user?.name || "Me"}
					avatarUrl={user?.avatar?.url}
					onClaimed={(handle) => dispatch(updateUser({ ...user, handle: handle || undefined }))}
				/>
			</View>

			<View style={styles.usernameSection}>
				<Text style={styles.sectionLabel}>Phone Number Privacy</Text>
				<Text style={styles.sectionHint}>{PHONE_VISIBILITY_COPY[phoneNumberVisibility]}</Text>
				<TouchableOpacity style={styles.privacyLink} onPress={() => router.push("/settings-account")}>
					<Text style={styles.privacyLinkText}>Change in Settings → Account → Privacy</Text>
					<Ionicons name="chevron-forward" size={16} color={Colors.focused} />
				</TouchableOpacity>
			</View>
		</ScrollView>
	);
};

export default Profile;

const styles = StyleSheet.create({
	container: {
		padding: 24,
		alignItems: "center",
		backgroundColor: "#fff",
		flexGrow: 1,
	},
	backButton: {
		alignSelf: "flex-start",
		marginBottom: 10,
	},
	avatarWrapper: {
		marginTop: 10,
		marginBottom: 16,
	},
	avatarEditBadge: {
		position: "absolute",
		bottom: 0,
		right: 0,
		width: 34,
		height: 34,
		borderRadius: 17,
		backgroundColor: Colors.focused,
		justifyContent: "center",
		alignItems: "center",
		borderWidth: 2,
		borderColor: "#fff",
	},
	qrButton: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		marginBottom: 24,
	},
	qrButtonText: {
		color: Colors.focused,
		fontWeight: "600",
	},
	form: {
		width: "100%",
		gap: 8,
	},
	readonlyField: {
		width: "100%",
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: "#CDD1D0",
	},
	readonlyLabel: {
		color: Colors.focused,
		fontSize: 14,
	},
	readonlyValue: {
		fontSize: 18,
		color: "#797C7B",
		marginTop: 4,
	},
	saveButton: {
		marginTop: 24,
		backgroundColor: Colors.focused,
		borderRadius: 16,
		paddingVertical: 14,
		paddingHorizontal: 40,
	},
	saveButtonText: {
		color: "#fff",
		fontWeight: "bold",
		fontSize: 16,
	},
	usernameSection: {
		width: "100%",
		marginTop: 28,
	},
	sectionLabel: {
		fontSize: 13,
		fontWeight: "700",
		color: "#797C7B",
		textTransform: "uppercase",
		marginBottom: 6,
	},
	sectionHint: {
		fontSize: 13,
		color: "#797C7B",
		marginBottom: 12,
		lineHeight: 18,
	},
	privacyLink: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	privacyLinkText: {
		fontSize: 13,
		fontWeight: "600",
		color: Colors.focused,
	},
});
