import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";

import SettingsScreenHeader from "@/src/components/settings/SettingsScreenHeader";
import SettingToggleRow from "@/src/components/settings/SettingToggleRow";
import VisibilityPickerRow from "@/src/components/settings/VisibilityPickerRow";
import {
	setAutoLockTimeout,
	setBiometricLockEnabled,
	setPrivacyPref,
	setPrivacyVisibility,
	TAutoLockTimeout,
} from "@/src/redux/features/settingsSlice";
import { deleteAccount } from "@/src/lib/auth/authService";
import { logoutUser } from "@/src/lib/features";
import { IUser } from "@/src/interfaces/user-interface";

const AUTO_LOCK_OPTIONS: { key: TAutoLockTimeout; label: string }[] = [
	{ key: "immediately", label: "Immediately" },
	{ key: "1min", label: "1 min" },
	{ key: "15min", label: "15 min" },
	{ key: "1hour", label: "1 hour" },
];

const SettingsAccount = () => {
	const dispatch = useDispatch();
	const privacy = useSelector((state: any) => state.settings.privacy);
	const security = useSelector((state: any) => state.settings.security);
	const user = useSelector((state: { user: IUser | null }) => state.user);

	const handleDeleteAccount = () => {
		Alert.alert(
			"Delete account",
			"This permanently deletes your account and signs you out. This can't be undone.",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						if (user?.username) await deleteAccount(user.username);
						logoutUser(dispatch);
					},
				},
			]
		);
	};

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<SettingsScreenHeader title="Account" />

			<Text style={styles.sectionTitle}>Privacy</Text>
			<VisibilityPickerRow
				label="Last Seen & Online"
				description="Who can see when you were last active"
				value={privacy.lastSeenVisibility}
				onValueChange={(value) => dispatch(setPrivacyVisibility({ key: "lastSeenVisibility", value }))}
			/>
			<VisibilityPickerRow
				label="Profile Photo"
				value={privacy.profilePhotoVisibility}
				onValueChange={(value) => dispatch(setPrivacyVisibility({ key: "profilePhotoVisibility", value }))}
			/>
			<VisibilityPickerRow
				label="About"
				value={privacy.aboutVisibility}
				onValueChange={(value) => dispatch(setPrivacyVisibility({ key: "aboutVisibility", value }))}
			/>
			<SettingToggleRow
				label="Read Receipts"
				description="Show blue ticks when you've read a message"
				value={privacy.readReceipts}
				onValueChange={(value) => dispatch(setPrivacyPref({ key: "readReceipts", value }))}
			/>

			<Text style={styles.sectionTitle}>Security</Text>
			<SettingToggleRow
				label="Two-Factor Authentication"
				description="Require a verification code on new devices"
				value={privacy.twoFactorEnabled}
				onValueChange={(value) => dispatch(setPrivacyPref({ key: "twoFactorEnabled", value }))}
			/>
			<SettingToggleRow
				label="Biometric App Lock"
				description="Require Face ID, Touch ID, or your device PIN to open Chatbox"
				value={security.biometricLockEnabled}
				onValueChange={(value) => dispatch(setBiometricLockEnabled(value))}
			/>
			{security.biometricLockEnabled && (
				<View style={styles.autoLockRow}>
					<Text style={styles.autoLockLabel}>Auto-Lock After</Text>
					<View style={styles.autoLockOptions}>
						{AUTO_LOCK_OPTIONS.map((option) => (
							<TouchableOpacity
								key={option.key}
								style={[styles.autoLockChip, security.autoLockTimeout === option.key && styles.autoLockChipActive]}
								onPress={() => dispatch(setAutoLockTimeout(option.key))}
							>
								<Text
									style={[
										styles.autoLockChipText,
										security.autoLockTimeout === option.key && styles.autoLockChipTextActive,
									]}
								>
									{option.label}
								</Text>
							</TouchableOpacity>
						))}
					</View>
				</View>
			)}
			<TouchableOpacity
				style={styles.linkRow}
				onPress={() =>
					Alert.alert(
						"Change phone number",
						"Changing your registered phone number will require re-verification. This flow isn't available yet."
					)
				}
			>
				<Text style={styles.linkText}>Change Phone Number</Text>
			</TouchableOpacity>

			<Text style={styles.sectionTitle}>Danger Zone</Text>
			<TouchableOpacity style={styles.dangerButton} onPress={handleDeleteAccount}>
				<Text style={styles.dangerButtonText}>Delete Account</Text>
			</TouchableOpacity>
		</ScrollView>
	);
};

export default SettingsAccount;

const styles = StyleSheet.create({
	container: {
		flexGrow: 1,
		backgroundColor: "#fff",
		paddingHorizontal: 20,
		paddingBottom: 40,
	},
	sectionTitle: {
		fontSize: 13,
		fontWeight: "700",
		color: "#797C7B",
		textTransform: "uppercase",
		marginTop: 20,
		marginBottom: 4,
	},
	linkRow: {
		paddingVertical: 14,
		borderBottomWidth: 1,
		borderBottomColor: "#F0F0F0",
	},
	linkText: {
		fontSize: 16,
		fontWeight: "600",
	},
	dangerButton: {
		backgroundColor: "#F04A4C",
		borderRadius: 14,
		paddingVertical: 14,
		alignItems: "center",
		marginTop: 8,
	},
	dangerButtonText: {
		color: "#fff",
		fontWeight: "700",
		fontSize: 15,
	},
	autoLockRow: {
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: "#F0F0F0",
	},
	autoLockLabel: {
		fontSize: 13,
		color: "#797C7B",
		marginBottom: 8,
	},
	autoLockOptions: {
		flexDirection: "row",
		gap: 8,
	},
	autoLockChip: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 14,
		backgroundColor: "#F2F8F7",
	},
	autoLockChipActive: {
		backgroundColor: "#24786D",
	},
	autoLockChipText: {
		fontSize: 12,
		fontWeight: "600",
		color: "#24786D",
	},
	autoLockChipTextActive: {
		color: "#fff",
	},
});
