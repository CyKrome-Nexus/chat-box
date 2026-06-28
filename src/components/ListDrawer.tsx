import { View, Text, StyleSheet, Dimensions } from "react-native";
import ChatRibbon from "./riboons/ChatRibbon";
import { PropsWithChildren, useState } from "react";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from "react-native-reanimated";
import {
	FlatList,
	Gesture,
	GestureDetector,
	GestureUpdateEvent,
	PanGestureHandlerEventPayload,
} from "react-native-gesture-handler";
import { IChatRibbon } from "@/src/interfaces/list-interface";

const MIN_HEIGHT = Dimensions.get("window").height * 0.85;
const MAX_HEIGHT = Dimensions.get("window").height * 0.98;
const START_HEIGHT =
	Dimensions.get("window").height - Dimensions.get("window").height * 0.05;
const START_TOP = Dimensions.get("window").height - START_HEIGHT;

const ListDrawer = ({ children }: PropsWithChildren) => {
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
		{
			avatar: {
				url: "https://media.discordapp.net/attachments/1388817003468554313/1388817526817030195/Prachi_Final_Sankalp.jpg?ex=68f55bdd&is=68f40a5d&hm=c8f3f3b2f8b1157313dcf0f2982f9ba9d8ae0b47198977c2058bbe7b8d6e54af&=&format=webp&width=350&height=350",
			},
			name: "Prachi Pallavhi",
			lastMessage: "Sorry! Can't we get back together?",
			lastStatus: "Just Now",
			notificationCount: 20,
			status: "ONLINE",
		},
		{
			avatar: {
				url: "https://media.discordapp.net/attachments/1388816974167150674/1390702473135657061/Sanaja_DP.png?ex=68f59fdb&is=68f44e5b&hm=0aa53d9abf14a0ac6075008d7f90854315ff1b607d8ff46afa4a258d645879bd&=&format=webp&quality=lossless",
			},
			name: "Sanjana Singh",
			lastMessage: "Can we hookup for once?",
			lastStatus: "5 sec ago",
			notificationCount: 2,
			status: "ONLINE",
		},
		{
			avatar: {
				url: "https://media-maa3-1.cdn.whatsapp.net/v/t61.24694-24/554317930_4042865602634358_8309324111566165679_n.jpg?ccb=11-4&oh=01_Q5Aa2wEyA_PN7MNrxTKPx0ryeT3p5JzPHynRh0k8Ho9Z86q8kw&oe=6901C50C&_nc_sid=5e03e0&_nc_cat=105",
			},
			name: "Anwesha Acharya",
			lastMessage: "I miss you :(",
			lastStatus: "10 sec ago",
			notificationCount: 10,
			status: "ONLINE",
		},
		{
			avatar: {
				url: "https://media.licdn.com/dms/image/v2/D5603AQHmG2JwyVQSAw/profile-displayphoto-crop_800_800/B56Zfgy1xiH8AM-/0/1751823114930?e=1762387200&v=beta&t=DvtUfdg7LNioClSlZzLUmWgUXmeNtxsY7vlcxOBe_2Y",
			},
			name: "Kurelli Reshma",
			lastMessage: "I think I have feelings for you..",
			lastStatus: "15 min ago",
			notificationCount: 1,
			status: "ONLINE",
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

	// const [chats, setChats] = useState<IChatRibbon>([]);

	const sheetHeight = useSharedValue(START_HEIGHT);
	const sheetTop = useSharedValue(START_TOP);
	const panStartTop = useSharedValue(START_TOP);
	const panStartHeight = useSharedValue(START_HEIGHT);

	const gesture = Gesture.Pan()
		.onBegin(() => {
			panStartTop.value = sheetTop.value;
			panStartHeight.value = sheetHeight.value;
		})
		.onUpdate((e: GestureUpdateEvent<PanGestureHandlerEventPayload>) => {
			let nextTop = panStartTop.value + e.translationY;
			let nextHeight = panStartHeight.value - e.translationY;
			// Clamp for min and max
			if (nextHeight < MIN_HEIGHT) {
				nextHeight = MIN_HEIGHT;
				nextTop = panStartTop.value + (panStartHeight.value - MIN_HEIGHT);
			}
			if (nextHeight > MAX_HEIGHT) {
				nextHeight = MAX_HEIGHT;
				nextTop = panStartTop.value - (MAX_HEIGHT - panStartHeight.value);
			}
			sheetTop.value = nextTop;
			sheetHeight.value = nextHeight;
			// console.log(`
			//     Next Top > ${nextTop}
			//     Next Height > ${nextHeight}
			//     Min Height > ${MIN_HEIGHT}
			//     Max Height > ${MAX_HEIGHT}
			//     Height > ${sheetHeight.value}

			// `)
		})
		.onEnd(() => {
			// decide which snap point is closer: MAX_HEIGHT or MIN_HEIGHT
			if (MAX_HEIGHT - sheetHeight.value < sheetHeight.value - MIN_HEIGHT) {
				sheetHeight.value = withSpring(MAX_HEIGHT);
				sheetTop.value = withSpring(START_TOP); // adjust top if you're animating top too
			} else {
				sheetHeight.value = withSpring(MIN_HEIGHT);
				sheetTop.value = withSpring(START_TOP + (START_HEIGHT - MIN_HEIGHT));
			}
			// console.log(`
			//     Min Height > ${MIN_HEIGHT}
			//     Max Height > ${MAX_HEIGHT}
			//     Height > ${sheetHeight.value}
			// `)
		});

	const listAnimated = useAnimatedStyle(() => ({
		top: sheetTop.value,
		height: sheetHeight.value,
	}));

	return (
		// <View style={{ flex: 1 }}>
		<Animated.View
			style={[styles.container, listAnimated]}
			pointerEvents="box-none"
		>
			<GestureDetector gesture={gesture}>
				<View style={styles.topBar}>
					<View style={styles.handle} />
				</View>
			</GestureDetector>
			{children}
		</Animated.View>
		// </View>
	);
};

const styles = StyleSheet.create({
	container: {
		position: "absolute",
		left: 0,
		right: 0,
		paddingHorizontal: 25,
		backgroundColor: "white",
		borderTopRightRadius: 60,
		borderTopLeftRadius: 60,
		overflow: "hidden",
	},
	topBar: {
		height: 40,
		justifyContent: "center",
		alignItems: "center",
	},
	handle: {
		height: 5,
		width: 50,
		borderRadius: 50,
		backgroundColor: "#E6E6E6",
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

export default ListDrawer;
