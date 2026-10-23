import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";

import type { PrivacySettings, SessionInfo, UpdatePrivacyInput } from "@chatbox/shared";

import SettingsScreenHeader from "@/src/components/settings/SettingsScreenHeader";
import SettingToggleRow from "@/src/components/settings/SettingToggleRow";
import VisibilityPickerRow from "@/src/components/settings/VisibilityPickerRow";
import { AppText, PrimaryButton, UnderlineField, palette } from "@/src/components/ui";
import { errorMessage } from "@/src/lib/api/client";
import { toLocalUser } from "@/src/lib/api/mappers";
import { authApi, usersApi } from "@/src/lib/api/services";
import { deleteAccount } from "@/src/lib/auth/authService";
import { logoutUser } from "@/src/lib/features";
import { formatRelative } from "@/src/lib/format/time";
import type { RootState } from "@/src/redux/store/store";
import { setAutoLockTimeout, setBiometricLockEnabled, type TAutoLockTimeout } from "@/src/redux/features/settingsSlice";
import { updateUser } from "@/src/redux/features/userSlice";

const AUTO_LOCK_OPTIONS: { key: TAutoLockTimeout; label: string }[] = [
	{ key: "immediately", label: "Immediately" },
	{ key: "1min", label: "1 min" },
	{ key: "15min", label: "15 min" },
	{ key: "1hour", label: "1 hour" },
];

const DEFAULT_PRIVACY: PrivacySettings = {
	lastSeen: "everyone",
	profilePhoto: "everyone",
	about: "everyone",
	readReceipts: true,
	discoverableByPhone: true,
	discoverableByEmail: true,
};

const SettingsAccount = () => {
	const dispatch = useDispatch();
	const user = useSelector((state: RootState) => state.user);
	const security = useSelector((state: RootState) => state.settings.security);
	const privacy = user?.privacy ?? DEFAULT_PRIVACY;
	const [sessions, setSessions] = useState<SessionInfo[]>([]);
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [savingPassword, setSavingPassword] = useState(false);
	const [deletePassword, setDeletePassword] = useState("");

	const loadSessions = useCallback(() => {
		authApi.sessions().then(setSessions).catch(() => undefined);
	}, []);

	useEffect(loadSessions, [loadSessions]);

	const updatePrivacy = async (patch: UpdatePrivacyInput) => {
		if (!user) return;
		dispatch(updateUser({ ...user, privacy: { ...privacy, ...patch } }));
		try {
			dispatch(updateUser(toLocalUser(await usersApi.updatePrivacy(patch))));
		} catch (error) {
			dispatch(updateUser(user));
			Alert.alert("Couldn't update privacy", errorMessage(error));
		}
	};

	const changePassword = async () => {
		setSavingPassword(true);
		try {
			await authApi.changePassword(user?.hasPassword ? currentPassword : undefined, newPassword);
			setCurrentPassword("");
			setNewPassword("");
			loadSessions();
			Alert.alert("Password updated", "Your other devices have been signed out.");
		} catch (error) {
			Alert.alert("Couldn't change password", errorMessage(error));
		} finally {
			setSavingPassword(false);
		}
	};

	const revoke = (session: SessionInfo) =>
		Alert.alert("Sign out device", `Sign out ${session.deviceName ?? "this device"}?`, [
			{ text: "Cancel", style: "cancel" },
			{ text: "Sign out", style: "destructive", onPress: () => void authApi.revokeSession(session.id).then(loadSessions) },
		]);

	const confirmDelete = (password?: string) =>
		Alert.alert("Delete account", "This permanently deletes your account and signs you out everywhere. This can't be undone.", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: async () => {
					try {
						await deleteAccount(password);
						await logoutUser(dispatch);
					} catch (error) {
						Alert.alert("Couldn't delete account", errorMessage(error));
					}
				},
			},
		]);


	return (
		<ScrollView contentContainerStyle={styles.container}>
			<SettingsScreenHeader title="Account" />

			<AppText variant="heading" style={styles.sectionTitle}>
				Privacy
			</AppText>
			<VisibilityPickerRow label="Last seen & online" description="Who can see when you were last active" value={privacy.lastSeen} onValueChange={(value) => void updatePrivacy({ lastSeen: value })} />
			<VisibilityPickerRow label="Profile photo" value={privacy.profilePhoto} onValueChange={(value) => void updatePrivacy({ profilePhoto: value })} />
			<VisibilityPickerRow label="About" value={privacy.about} onValueChange={(value) => void updatePrivacy({ about: value })} />
			<SettingToggleRow label="Read receipts" description="If off, people won't see when you've read their messages" value={privacy.readReceipts} onValueChange={(value) => void updatePrivacy({ readReceipts: value })} />
			<SettingToggleRow label="Find me by phone number" description="Let people who have your number find you on Chatbox" value={privacy.discoverableByPhone} onValueChange={(value) => void updatePrivacy({ discoverableByPhone: value })} />
			<SettingToggleRow label="Find me by email" value={privacy.discoverableByEmail} onValueChange={(value) => void updatePrivacy({ discoverableByEmail: value })} />

			<AppText variant="heading" style={styles.sectionTitle}>
				Security
			</AppText>
			<SettingToggleRow
				label="Biometric app lock"
				description="Require Face ID, Touch ID or your device PIN to open Chatbox"
				value={security.biometricLockEnabled}
				onValueChange={(value) => dispatch(setBiometricLockEnabled(value))}
			/>
			{security.biometricLockEnabled ? (
				<View style={styles.chips}>
					{AUTO_LOCK_OPTIONS.map((option) => (
						<TouchableOpacity key={option.key} style={[styles.chip, security.autoLockTimeout === option.key && styles.chipActive]} onPress={() => dispatch(setAutoLockTimeout(option.key))}>
							<AppText variant="label" style={{ color: security.autoLockTimeout === option.key ? palette.white : palette.ink }}>
								{option.label}
							</AppText>
						</TouchableOpacity>
					))}
				</View>
			) : null}

			<AppText variant="heading" style={styles.sectionTitle}>
				{user?.hasPassword ? "Change password" : "Set a password"}
			</AppText>
			<View style={styles.form}>
				{user?.hasPassword ? <UnderlineField label="Current password" value={currentPassword} onChangeText={setCurrentPassword} secure /> : null}
				<UnderlineField label="New password" value={newPassword} onChangeText={setNewPassword} secure />
				<PrimaryButton title="Update password" onPress={() => void changePassword()} disabled={newPassword.length < 8 || (user?.hasPassword === true && !currentPassword)} loading={savingPassword} />
			</View>

			<AppText variant="heading" style={styles.sectionTitle}>
				Active sessions
			</AppText>
			{sessions.map((session) => (
				<View key={session.id} style={styles.sessionRow}>
					<View style={styles.flex}>
						<AppText variant="body" weight="medium">
							{session.deviceName ?? session.platform ?? "Unknown device"}
						</AppText>
						<AppText variant="caption" tone="muted">
							{session.current ? "This device" : `Last active ${formatRelative(Date.parse(session.lastUsedAt))}`}
						</AppText>
					</View>
					{!session.current ? (
						<TouchableOpacity onPress={() => revoke(session)}>
							<AppText variant="label" tone="danger">
								Sign out
							</AppText>
						</TouchableOpacity>
					) : null}
				</View>
			))}

			<AppText variant="heading" style={styles.sectionTitle}>
				Danger zone
			</AppText>
			<View style={styles.form}>
				{user?.hasPassword ? <UnderlineField label="Password to confirm" value={deletePassword} onChangeText={setDeletePassword} secure /> : null}
				<PrimaryButton title="Delete account" variant="danger" disabled={user?.hasPassword === true && !deletePassword} onPress={() => confirmDelete(deletePassword || undefined)} />
			</View>
		</ScrollView>
	);
};

export default SettingsAccount;

const styles = StyleSheet.create({
	container: { flexGrow: 1, backgroundColor: "#fff", paddingHorizontal: 20, paddingBottom: 48 },
	flex: { flex: 1 },
	sectionTitle: { marginTop: 28, marginBottom: 12 },
	chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
	chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: palette.brandSoft },
	chipActive: { backgroundColor: palette.brand },
	form: { gap: 20 },
	sessionRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#EEE" },
});
