import { Alert, Share, StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { useDispatch, useSelector } from "react-redux";

import ListDrawer from "@/src/components/ListDrawer";
import { IUser } from "@/src/interfaces/user-interface";
import Avatar from "@/src/components/images/Avatar";
import BIcon from "@/src/components/buttons/BIcon";
import {
	contact,
	data,
	inviteFriends,
	key,
	message,
	notificationBell,
	qr,
	question,
} from "@/src/constants/svgs/icons";
import { FlatList } from "react-native-gesture-handler";
import { ISettingsRibbon } from "@/src/interfaces/list-interface";
import SettingsRibbon from "@/src/components/riboons/SettingsRibbon";
import { router } from "expo-router";
import { logoutUser } from "@/src/lib/features";

const handleInviteFriend = () => {
	Share.share({
		message: "Join me on Chatbox! Download the app to start chatting: https://chatbox.link/download",
	});
};

const Settings = () => {
	const dispatch = useDispatch();
	const user = useSelector((state: { user: IUser }) => state.user);

	const settingsList: ISettingsRibbon[] = [
		{
			title: "Accounts",
			description: "Switch between linked accounts, or add another",
			svg: contact,
			onPress: () => router.push("/accounts"),
		},
		{
			title: "Account",
			description: "Privacy, Security, Change Number etc",
			svg: key,
			onPress: () => router.push("/settings-account"),
		},
		{
			title: "Chat",
			description: "Chat History, Theme, Wallpapers",
			svg: message,
			onPress: () => router.push("/settings-chat"),
		},
		{
			title: "Notifications",
			description: "Messages, Groups and Others",
			svg: notificationBell?.focused as string,
			onPress: () => router.push("/settings-notifications"),
		},
		{
			title: "Help",
			description: "Help Center, Contact Us, Privacy Policy etc",
			svg: question,
			onPress: () => router.push("/settings-help"),
		},
		{
			title: "Storage and Data",
			description: "Network Usage, Storage Usage etc",
			svg: data,
			onPress: () => router.push("/settings-storage"),
		},
		{
			title: "Invite a Friend",
			description: "Share Chatbox with your contacts",
			svg: inviteFriends,
			onPress: handleInviteFriend,
		},
	];

	const handleLogout = () => {
		Alert.alert("Log Out", "Are you sure you want to log out?", [
			{ text: "Cancel", style: "cancel" },
			{ text: "Log Out", style: "destructive", onPress: () => logoutUser(dispatch) },
		]);
	};

	return (
		<>
			<View style={styles.container}>
				<ListDrawer>
					<TouchableOpacity
						style={styles.userRibbon}
						onPress={() => router.push("/profile")}
						onLongPress={() => router.push("/accounts")}
					>
						<Avatar data={user?.avatar} size={70} />
						<View style={styles.userAbout}>
							<Text style={{ fontSize: 22, fontWeight: "bold" }}>
								{user?.name}
							</Text>
							<Text style={{ fontSize: 12, color: "#797C7B" }}>
								{user?.about}
							</Text>
						</View>
						<BIcon svg={qr} onPress={() => router.push("/qr-code")} />
					</TouchableOpacity>
					<FlatList
						style={{ marginTop: 20 }}
						data={settingsList}
						renderItem={({ item }: { item: ISettingsRibbon }) => (
							<>
								<SettingsRibbon content={item} onPress={item.onPress} />
							</>
						)}
						ListFooterComponent={() => (
							<TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
								<Text style={styles.logoutText}>Log Out</Text>
							</TouchableOpacity>
						)}
					/>
				</ListDrawer>
			</View>
		</>
	);
};

const styles = StyleSheet.create({
	container: {
		backgroundColor: "black",
		flexDirection: "column-reverse",
		height: "100%",
	},
	userRibbon: {
		alignItems: "center",
		borderBottomWidth: 0.2,
		borderBottomColor: "#c0c0c0ff",
		flexDirection: "row",
		gap: 10,
		paddingBottom: 15,
	},
	userAbout: {
		justifyContent: "center",
		flex: 1,
		gap: 1,
	},
	logoutButton: {
		marginTop: 20,
		marginBottom: 40,
		alignItems: "center",
		paddingVertical: 14,
		borderRadius: 14,
		backgroundColor: "#FDECEC",
	},
	logoutText: {
		color: "#F04A4C",
		fontWeight: "700",
		fontSize: 16,
	},
});

export default Settings;
