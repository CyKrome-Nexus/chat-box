import { useMemo, useState } from "react";
import { StyleSheet, View, Text, TextInput } from "react-native";
import { FlatList } from "react-native-gesture-handler";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import ListDrawer from "@/src/components/ListDrawer";
import { IContactRibbon } from "@/src/interfaces/list-interface";
import ContactRibbon from "@/src/components/riboons/ContactRibbon";
import AddContactModal from "@/src/components/riboons/AddContactModal";
import ContactProfileModal from "@/src/components/riboons/ContactProfileModal";
import { useDeviceContacts } from "@/src/hooks/useDeviceContacts";

const Contacts = () => {
	const { contacts: deviceContacts, isLoading, permissionDenied } = useDeviceContacts();
	const manualContacts = useSelector((state: any) => state.contacts.manualContacts as IContactRibbon[]);
	const [query, setQuery] = useState("");
	const [profileContact, setProfileContact] = useState<IContactRibbon | null>(null);

	const allContacts = useMemo(
		() => [...manualContacts, ...deviceContacts],
		[manualContacts, deviceContacts]
	);

	const filteredContacts = useMemo(() => {
		if (!query.trim()) return allContacts;
		const q = query.trim().toLowerCase();
		return allContacts.filter(
			(c) => c.name.toLowerCase().includes(q) || c.phoneNumber?.toLowerCase().includes(q)
		);
	}, [allContacts, query]);

	const flatListData = prepareAlphabetSections(filteredContacts);

	return (
		<>
			<View style={styles.container}>
				<ListDrawer>
					<View style={styles.searchRow}>
						<Ionicons name="search" size={16} color="#797C7B" />
						<TextInput
							style={styles.searchInput}
							placeholder="Search name or phone number"
							placeholderTextColor="#797C7B"
							value={query}
							onChangeText={setQuery}
						/>
					</View>
					{permissionDenied && (
						<Text style={styles.notice}>
							Contacts permission denied — showing manually added contacts only.
						</Text>
					)}
					{isLoading && !deviceContacts.length ? (
						<Text style={styles.notice}>Loading contacts…</Text>
					) : (
						<FlatList
							data={flatListData}
							keyExtractor={(item, index) =>
								item.type === "header"
									? `header-${item.letter}-${index}`
									: item.id
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
								return <ContactRibbon content={item} onLongPressContact={setProfileContact} />;
							}}
						/>
					)}
				</ListDrawer>
			</View>

			<AddContactModal />
			<ContactProfileModal contact={profileContact} onClose={() => setProfileContact(null)} />
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
	searchRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		marginHorizontal: 4,
		marginBottom: 8,
		paddingHorizontal: 14,
		paddingVertical: 10,
		backgroundColor: "#F3F6F6",
		borderRadius: 14,
	},
	searchInput: {
		flex: 1,
		fontSize: 15,
		color: "#222",
	},
	notice: {
		color: "#797C7B",
		textAlign: "center",
		paddingVertical: 20,
	},
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
