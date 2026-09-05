import { StyleSheet, View, Text } from "react-native";
import { useSelector } from "react-redux";

import ListDrawer from "@/src/components/ListDrawer";
import { IUser } from "@/src/interfaces/user-interface";
import Avatar from "@/src/components/images/Avatar";
import BIcon from "@/src/components/buttons/BIcon";
import {
	data,
	inviteFriends,
	key,
	message,
	notificationBell,
	qr,
	question,
} from "@/src/constants/svgs/icons";
import { FlatList } from "react-native-gesture-handler";
import { useState } from "react";
import { ISettingsRibbon } from "@/src/interfaces/list-interface";
import SettingsRibbon from "@/src/components/riboons/SettingsRibbon";
import { updateUser } from "@/src/redux/features/userSlice";
import { router } from "expo-router";

const Settings = () => {
	const user = useSelector((state: { user: IUser }) => state.user);

	const [settingsList, setSettingsList] = useState<ISettingsRibbon[]>([
		{
			title: "Account",
			description: "Privacy, Security, Change Number etc",
			svg: key,
		},
		{
			title: "Chat",
			description: "Chat History, Theme, Wallpapers",
			svg: message,
		},
		{
			title: "Notifications",
			description: "Messages, Groups and Others",
			svg: notificationBell?.focused as string,
		},
		{
			title: "Help",
			description: "Help Center, Contact Us, Privacy Policy etc",
			svg: question,
		},
		{
			title: "Storage and Data",
			description: "Network Usage, Storage Usage etc",
			svg: data,
		},
		{
			title: "Invite a Friend",
			description: "Share Chatbox with your contacts",
			svg: inviteFriends,
		},
	]);

	return (
		<>
			<View style={styles.container}>
				<ListDrawer>
					<View style={styles.userRibbon}>
						<Avatar data={user?.avatar} size={70} />
						<View style={styles.userAbout}>
							<Text style={{ fontSize: 22, fontWeight: "bold" }}>
								{user?.name}
							</Text>
							<Text style={{ fontSize: 12, color: "#797C7B" }}>
								{user?.about}
							</Text>
						</View>
						{/* TODO: wire up to the QR sharing/scanner screen (tracked separately) */}
						<BIcon svg={qr} />
					</View>
					<FlatList
						style={{ marginTop: 20 }}
						data={settingsList}
						renderItem={({ item }: { item: ISettingsRibbon }) => (
							<>
								<SettingsRibbon content={item} />
							</>
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
});

export default Settings;
