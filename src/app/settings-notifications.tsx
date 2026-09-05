import { ScrollView, StyleSheet, Text } from "react-native";
import { useDispatch, useSelector } from "react-redux";

import SettingsScreenHeader from "@/src/components/settings/SettingsScreenHeader";
import SettingToggleRow from "@/src/components/settings/SettingToggleRow";
import { setNotificationPref } from "@/src/redux/features/settingsSlice";

const SettingsNotifications = () => {
	const dispatch = useDispatch();
	const notifications = useSelector((state: any) => state.settings.notifications);

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<SettingsScreenHeader title="Notifications" />

			<Text style={styles.sectionTitle}>Messages</Text>
			<SettingToggleRow
				label="Sound"
				description="Play a sound for new messages"
				value={notifications.sound}
				onValueChange={(value) => dispatch(setNotificationPref({ key: "sound", value }))}
			/>
			<SettingToggleRow
				label="Vibration"
				value={notifications.vibration}
				onValueChange={(value) => dispatch(setNotificationPref({ key: "vibration", value }))}
			/>
			<SettingToggleRow
				label="Message Preview"
				description="Show message text in notifications"
				value={notifications.messagePreview}
				onValueChange={(value) => dispatch(setNotificationPref({ key: "messagePreview", value }))}
			/>

			<Text style={styles.sectionTitle}>Groups</Text>
			<SettingToggleRow
				label="Group Notifications"
				description="Get notified about group chat activity"
				value={notifications.groupNotifications}
				onValueChange={(value) => dispatch(setNotificationPref({ key: "groupNotifications", value }))}
			/>
		</ScrollView>
	);
};

export default SettingsNotifications;

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
});
