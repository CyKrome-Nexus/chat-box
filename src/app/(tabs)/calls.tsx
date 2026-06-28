import ListDrawer from "@/src/components/ListDrawer";
import CallRibbon from "@/src/components/riboons/CallRibbon";
import { ICallRibbon } from "@/src/interfaces/list-interface";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { FlatList } from "react-native-gesture-handler";
import ECallTypes from "../../enums/call-types";

const Calls = () => {
	const [calls, setCalls] = useState<ICallRibbon[]>([
		{
			avatar: { url: "https://randomuser.me/api/portraits/men/12.jpg" },
			name: "Aarav Mehta",
			callTime: "Today, 9:30 AM",
			callType: ECallTypes.incoming,
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/women/45.jpg" },
			name: "Priya Sharma",
			callTime: "Today, 8:15 AM",
			callType: ECallTypes.outgoing,
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/men/27.jpg" },
			name: "Rohan Das",
			callTime: "Yesterday, 10:45 PM",
			callType: ECallTypes.missed,
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/women/55.jpg" },
			name: "Neha Kapoor",
			callTime: "Yesterday, 5:20 PM",
			callType: ECallTypes.incoming,
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/men/32.jpg" },
			name: "Aditya Rao",
			callTime: "Sunday, 11:00 AM",
			callType: ECallTypes.outgoing,
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/women/62.jpg" },
			name: "Simran Kaur",
			callTime: "Sunday, 9:10 AM",
			callType: ECallTypes.missed,
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/men/81.jpg" },
			name: "Rahul Verma",
			callTime: "Saturday, 7:45 PM",
			callType: ECallTypes.incoming,
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/women/19.jpg" },
			name: "Isha Nair",
			callTime: "Saturday, 6:10 PM",
			callType: ECallTypes.outgoing,
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/men/93.jpg" },
			name: "Vikram Singh",
			callTime: "Friday, 9:25 PM",
			callType: ECallTypes.missed,
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/women/74.jpg" },
			name: "Ananya Iyer",
			callTime: "Friday, 3:50 PM",
			callType: ECallTypes.incoming,
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/men/10.jpg" },
			name: "Mohan Bhatia",
			callTime: "Friday, 9:00 AM",
			callType: ECallTypes.outgoing,
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/women/9.jpg" },
			name: "Kavya Menon",
			callTime: "Thursday, 8:40 PM",
			callType: ECallTypes.missed,
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/men/50.jpg" },
			name: "Dev Patel",
			callTime: "Thursday, 7:15 AM",
			callType: ECallTypes.incoming,
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/women/24.jpg" },
			name: "Sonal Reddy",
			callTime: "Wednesday, 10:05 PM",
			callType: ECallTypes.outgoing,
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/men/61.jpg" },
			name: "Kabir Joshi",
			callTime: "Wednesday, 4:30 PM",
			callType: ECallTypes.missed,
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/women/70.jpg" },
			name: "Tanya Malhotra",
			callTime: "Tuesday, 2:10 PM",
			callType: ECallTypes.incoming,
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/men/73.jpg" },
			name: "Siddharth Jain",
			callTime: "Tuesday, 8:55 AM",
			callType: ECallTypes.outgoing,
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/women/88.jpg" },
			name: "Ritika Vyas",
			callTime: "Monday, 7:10 PM",
			callType: ECallTypes.missed,
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/men/39.jpg" },
			name: "Amit Thakur",
			callTime: "Monday, 11:25 AM",
			callType: ECallTypes.incoming,
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/women/38.jpg" },
			name: "Maya Pillai",
			callTime: "Last Sunday, 10:15 PM",
			callType: ECallTypes.outgoing,
		},
	]);

	return (
		<>
			<View style={styles.container}>
				<ListDrawer>
					<Text
						style={{
							fontFamily: "Inter 18pt Bold",
							fontSize: 18,
							fontWeight: "600",
							marginBottom: 8,
						}}
					>
						Recent
					</Text>
					<FlatList
						data={calls}
						scrollEnabled
						renderItem={({ item }) => <CallRibbon content={item} />}
						contentContainerStyle={{ paddingBottom: 180 }}
						// ListFooterComponent={() => (
						// 	<View style={styles.chatListFooterContainer}>
						// 		<Text style={styles.chatListFooterText}>
						// 			{calls?.length
						// 				? "- - - - > > End of chats < < - - - - - ."
						// 				: "You have No Chats"}
						// 		</Text>
						// 	</View>
						// )}
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

export default Calls;
