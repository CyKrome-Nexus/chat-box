import { Text, View, StyleSheet } from "react-native";
import { FlatList } from "react-native-gesture-handler";
import { useSelector } from "react-redux";

import ListDrawer from "@/src/components/ListDrawer";
import ChatRibbon from "@/src/components/riboons/ChatRibbon";
import { IChatRibbon } from "@/src/interfaces/list-interface";

const Messages = () => {
	const chats = useSelector((state: any) => state.chats.chats as IChatRibbon[]);

	return (
		<>
			<View style={styles.container}>
				<ListDrawer>
					<FlatList
						data={chats}
						scrollEnabled
						keyExtractor={(item) => item.id}
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
	},
	chatListFooterText: {
		color: "#797C7B",
	},
});

export default Messages;
