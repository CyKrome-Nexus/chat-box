import { useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import { FlatList } from "react-native-gesture-handler";

import ListDrawer from "@/src/components/ListDrawer";
import ChatRibbon from "@/src/components/riboons/ChatRibbon";
import { IChatRibbon } from "@/src/interfaces/list-interface";

const Messages = () => {
	const [chats, setChats] = useState<IChatRibbon[]>([
		{
			avatar: { url: "https://randomuser.me/api/portraits/men/12.jpg" },
			name: "Aarav Mehta",
			lastMessage: "Hey! Can you join the meeting?",
			lastStatus: "2 min ago",
			notificationCount: 3,
			status: "ONLINE",
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/women/18.jpg" },
			name: "Priya Sharma",
			lastMessage: "I’ll send the report tonight.",
			lastStatus: "5 min ago",
			notificationCount: 0,
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/men/45.jpg" },
			name: "Rohan Singh",
			lastMessage: "Got it, thanks!",
			lastStatus: "15 min ago",
			notificationCount: 1,
			status: "ONLINE",
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/women/33.jpg" },
			name: "Sara Khan",
			lastMessage: "Let’s catch up later?",
			lastStatus: "1 hr ago",
			notificationCount: 0,
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/men/56.jpg" },
			name: "Aditya Verma",
			lastMessage: "Sending the files now...",
			lastStatus: "Yesterday",
			notificationCount: 2,
		},
		// {
		// 	avatar: {
		// 		url: "https://media.discordapp.net/attachments/1388817003468554313/1388817526817030195/Prachi_Final_Sankalp.jpg?ex=68f55bdd&is=68f40a5d&hm=c8f3f3b2f8b1157313dcf0f2982f9ba9d8ae0b47198977c2058bbe7b8d6e54af&=&format=webp&width=350&height=350",
		// 	},
		// 	name: "Prachi Pallavhi",
		// 	lastMessage: "Sorry! Can't we get back together?",
		// 	lastStatus: "Just Now",
		// 	notificationCount: 20,
		// 	status: "ONLINE",
		// },
		// {
		// 	avatar: {
		// 		url: "https://media.discordapp.net/attachments/1388816974167150674/1390702473135657061/Sanaja_DP.png?ex=68f59fdb&is=68f44e5b&hm=0aa53d9abf14a0ac6075008d7f90854315ff1b607d8ff46afa4a258d645879bd&=&format=webp&quality=lossless",
		// 	},
		// 	name: "Sanjana Singh",
		// 	lastMessage: "Can we hookup for once?",
		// 	lastStatus: "5 sec ago",
		// 	notificationCount: 2,
		// 	status: "ONLINE",
		// },
		// {
		// 	avatar: {
		// 		url: "https://media-maa3-1.cdn.whatsapp.net/v/t61.24694-24/554317930_4042865602634358_8309324111566165679_n.jpg?ccb=11-4&oh=01_Q5Aa2wEyA_PN7MNrxTKPx0ryeT3p5JzPHynRh0k8Ho9Z86q8kw&oe=6901C50C&_nc_sid=5e03e0&_nc_cat=105",
		// 	},
		// 	name: "Anwesha Acharya",
		// 	lastMessage: "I miss you :(",
		// 	lastStatus: "10 sec ago",
		// 	notificationCount: 10,
		// 	status: "ONLINE",
		// },
		// {
		// 	avatar: {
		// 		url: "https://media.licdn.com/dms/image/v2/D5603AQHmG2JwyVQSAw/profile-displayphoto-crop_800_800/B56Zfgy1xiH8AM-/0/1751823114930?e=1762387200&v=beta&t=DvtUfdg7LNioClSlZzLUmWgUXmeNtxsY7vlcxOBe_2Y",
		// 	},
		// 	name: "Kurelli Reshma",
		// 	lastMessage: "I think I have feelings for you..",
		// 	lastStatus: "15 min ago",
		// 	notificationCount: 1,
		// 	status: "ONLINE",
		// },
		{
			avatar: { url: "https://randomuser.me/api/portraits/men/12.jpg" },
			name: "Aarav Mehta",
			lastMessage: "Hey! Can you join the meeting?",
			lastStatus: "2 min ago",
			notificationCount: 3,
			status: "ONLINE",
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/women/18.jpg" },
			name: "Priya Sharma",
			lastMessage: "I’ll send the report tonight.",
			lastStatus: "5 min ago",
			notificationCount: 0,
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/men/45.jpg" },
			name: "Rohan Singh",
			lastMessage: "Got it, thanks!",
			lastStatus: "15 min ago",
			notificationCount: 1,
			status: "ONLINE",
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/women/33.jpg" },
			name: "Sara Khan",
			lastMessage: "Let’s catch up later?",
			lastStatus: "1 hr ago",
			notificationCount: 0,
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/men/56.jpg" },
			name: "Aditya Verma",
			lastMessage: "Sending the files now...",
			lastStatus: "Yesterday",
			notificationCount: 2,
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/men/12.jpg" },
			name: "Aarav Mehta",
			lastMessage: "Hey! Can you join the meeting?",
			lastStatus: "2 min ago",
			notificationCount: 3,
			status: "ONLINE",
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/women/18.jpg" },
			name: "Priya Sharma",
			lastMessage: "I’ll send the report tonight.",
			lastStatus: "5 min ago",
			notificationCount: 0,
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/men/45.jpg" },
			name: "Rohan Singh",
			lastMessage: "Got it, thanks!",
			lastStatus: "15 min ago",
			notificationCount: 1,
			status: "ONLINE",
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/women/33.jpg" },
			name: "Sara Khan",
			lastMessage: "Let’s catch up later?",
			lastStatus: "1 hr ago",
			notificationCount: 0,
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/men/56.jpg" },
			name: "Aditya Verma",
			lastMessage: "Sending the files now...",
			lastStatus: "Yesterday",
			notificationCount: 2,
		},
	]);

	return (
		<>
			<View style={styles.container}>
				<ListDrawer>
					<FlatList
						data={chats}
						scrollEnabled
						renderItem={({ item }) => <ChatRibbon content={item} />}
						contentContainerStyle={{ paddingBottom: 180 }}
						ListFooterComponent={() => (
							<View style={styles.chatListFooterContainer}>
								<Text style={styles.chatListFooterText}>
									{chats?.length
										? "- - - - > > End of chats < < - - - - - ."
										: "You have No Chats"}
								</Text>
							</View>
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
		flex: 1,
		flexDirection: "column-reverse",
		height: "100%",
	},
	name: { fontWeight: "bold" },
	statusesContainer: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		backgroundColor: "white",
		paddingVertical: 10,
	},
	chatListFooterContainer: {
		padding: 20,
		justifyContent: "center",
		alignItems: "center",
		// borderColor: 'red',
		// borderWidth: 3,
	},
	chatListFooterText: {
		color: "#797C7B",
	},
});

export default Messages;
