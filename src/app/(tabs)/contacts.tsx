import { useState } from "react";
import { StyleSheet, View, Text } from "react-native";
import { FlatList } from "react-native-gesture-handler";

import ListDrawer from "@/src/components/ListDrawer";
import { IContactRibbon } from "@/src/interfaces/list-interface";
import ContactRibbon from "@/src/components/riboons/ContactRibbon";

const Contacts = () => {
	const [contacts, setContacts] = useState<IContactRibbon[]>([
		{
			avatar: { url: "https://randomuser.me/api/portraits/men/12.jpg" },
			name: "Aarav Mehta",
			about: "Loves hiking and outdoor adventures.",
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/women/43.jpg" },
			name: "Anika Singh",
			about: "Graphic designer and coffee enthusiast.",
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/men/65.jpg" },
			name: "Rohit Kapoor",
			about: "Passionate about tech startups.",
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/women/29.jpg" },
			name: "Simran Kaur",
			about: "Loves painting and yoga.",
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/men/34.jpg" },
			name: "Vikram Gupta",
			about: "Photographer and traveller.",
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/women/50.jpg" },
			name: "Neha Patel",
			about: "Foodie and aspiring chef.",
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/men/70.jpg" },
			name: "Aditya Singh",
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/women/12.jpg" },
			name: "Meera Joshi",
			about: "Yoga instructor and wellness coach.",
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/men/25.jpg" },
			name: "Sandeep Jain",
			about: "Enthusiast of classic literature.",
		},
		{
			avatar: { url: "https://randomuser.me/api/portraits/women/32.jpg" },
			name: "Pooja Sharma",
			about: "Digital marketing specialist.",
		},
	]);

	const flatListData = prepareAlphabetSections(contacts);

	return (
		<>
			<View style={styles.container}>
				<ListDrawer>
					<FlatList
						data={flatListData}
						keyExtractor={(item, index) =>
							item.type === "header"
								? `header-${item.letter}-${index}`
								: item.name
						}
						renderItem={({ item }) => {
							if (item.type === "header") {
								return (
									<View
										style={{
											paddingHorizontal: 16,
											paddingVertical: 4,
											backgroundColor: "#fff",
										}}
									>
										<Text style={{ fontWeight: "bold", fontSize: 18 }}>
											{item.letter}
										</Text>
									</View>
								);
							}
							return <ContactRibbon content={item} />;
						}}
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
	messagesContainer: { flex: 1, backgroundColor: "white" },
	messageRow: {
		flexDirection: "row",
		alignItems: "center",
		padding: 12,
		borderBottomWidth: 1,
		borderColor: "#ddd",
	},
	avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
	name: { fontWeight: "bold" },
	statusesContainer: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		backgroundColor: "white",
		paddingVertical: 10,
	},
	statusItem: { alignItems: "center", marginHorizontal: 10 },
	statusAvatar: { width: 60, height: 60, borderRadius: 30, marginBottom: 4 },
});

export default Contacts;

const prepareAlphabetSections = (contacts: IContactRibbon[]) => {
	// Sort contacts alphabetically
	const sortedContacts = [...contacts].sort((a, b) =>
		a.name.localeCompare(b.name)
	);
	let displayList: Array<any> = [];
	let lastLetter = "";
	sortedContacts.forEach((contact) => {
		const firstLetter = contact.name[0].toUpperCase();
		if (firstLetter !== lastLetter) {
			displayList.push({ type: "header", letter: firstLetter });
			lastLetter = firstLetter;
		}
		displayList.push({ type: "item", ...contact });
	});
	return displayList;
};
