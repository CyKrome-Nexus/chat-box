import { useMemo, useState } from "react";
import { Alert, SectionList, Share, StyleSheet, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import Avatar from "@/src/components/images/Avatar";
import AddContactModal from "@/src/components/riboons/AddContactModal";
import { AppText, CircleButton, ScalePressable, SectionLabel, SheetScreen, fonts, palette } from "@/src/components/ui";
import type { IContactRibbon } from "@/src/interfaces/list-interface";
import { errorMessage } from "@/src/lib/api/client";
import { openDirectConversation } from "@/src/lib/sync/contactsSync";
import { useDeviceContacts } from "@/src/hooks/useDeviceContacts";
import type { RootState } from "@/src/redux/store/store";
import { setShowAddContactModal } from "@/src/redux/features/contactsSlice";

const INVITE_MESSAGE = "Let's chat on Chatbox — fast, private messaging. Download it and say hi!";

const ContactRow = ({ contact, onPress }: { contact: IContactRibbon; onPress: () => void }) => (
	<ScalePressable accessibilityLabel={contact.name} onPress={onPress} scaleTo={0.985} style={styles.row}>
		<Avatar data={contact.avatar} size={52} />
		<View style={styles.main}>
			<AppText variant="heading" numberOfLines={1}>
				{contact.name}
			</AppText>
			<AppText variant="caption" tone="muted" numberOfLines={1}>
				{contact.isRegistered ? (contact.about ?? (contact.handle ? `@${contact.handle}` : "On Chatbox")) : contact.phoneNumber}
			</AppText>
		</View>
		{!contact.isRegistered ? (
			<AppText variant="label" tone="brand">
				Invite
			</AppText>
		) : null}
	</ScalePressable>
);

const Contacts = () => {
	const dispatch = useDispatch();
	const { contacts: deviceContacts, isLoading, permissionDenied, reload } = useDeviceContacts();
	const saved = useSelector((state: RootState) => state.contacts.savedContacts);
	const [query, setQuery] = useState("");

	const sections = useMemo(() => {
		const savedIds = new Set(saved.map((contact) => contact.userId));
		const registeredOnDevice = deviceContacts.filter((contact) => contact.isRegistered && !savedIds.has(contact.userId));
		const others = deviceContacts.filter((contact) => !contact.isRegistered);
		const term = query.trim().toLowerCase();
		const matches = (contact: IContactRibbon) =>
			!term || contact.name.toLowerCase().includes(term) || contact.phoneNumber?.includes(term) || contact.handle?.includes(term);

		const onChatbox = [...saved, ...registeredOnDevice].filter(matches).sort((a, b) => a.name.localeCompare(b.name));
		const grouped = new Map<string, IContactRibbon[]>();
		for (const contact of onChatbox) {
			const letter = contact.name[0]?.toUpperCase() ?? "#";
			grouped.set(letter, [...(grouped.get(letter) ?? []), contact]);
		}
		const result = [...grouped.entries()].map(([title, data]) => ({ title, data }));
		const invites = others.filter(matches).sort((a, b) => a.name.localeCompare(b.name));
		if (invites.length) result.push({ title: "Invite to Chatbox", data: invites });
		return result;
	}, [saved, deviceContacts, query]);

	const open = async (contact: IContactRibbon) => {
		if (!contact.isRegistered || !contact.userId) {
			await Share.share({ message: INVITE_MESSAGE });
			return;
		}
		try {
			const conversationId = await openDirectConversation(contact.userId);
			router.push({ pathname: "/contact-info", params: { userId: contact.userId, conversationId } });
		} catch (error) {
			Alert.alert("Couldn't open contact", errorMessage(error));
		}
	};

	return (
		<SheetScreen
			title="Contacts"
			left={<CircleButton icon="search-outline" label="Search" variant="outline" onPress={() => router.push("/search")} />}
			right={<CircleButton icon="person-add-outline" label="Add contact" variant="outline" onPress={() => dispatch(setShowAddContactModal(true))} />}
		>
			<View style={styles.search}>
				<Ionicons name="search" size={16} color={palette.muted} />
				<TextInput value={query} onChangeText={setQuery} placeholder="Search name or number" placeholderTextColor={palette.muted} style={styles.searchInput} />
			</View>
			<SectionList
				sections={sections}
				keyExtractor={(item) => `${item.source}-${item.id}`}
				stickySectionHeadersEnabled={false}
				renderSectionHeader={({ section }) => (
					<View style={styles.sectionHeader}>
						<AppText variant="label" weight="semibold" tone={section.title.length > 1 ? "muted" : "default"}>
							{section.title}
						</AppText>
					</View>
				)}
				renderItem={({ item }) => <ContactRow contact={item} onPress={() => void open(item)} />}
				ListHeaderComponent={<SectionLabel>My Contact</SectionLabel>}
				contentContainerStyle={styles.list}
				refreshing={isLoading}
				onRefresh={() => void reload()}
				ListEmptyComponent={
					<View style={styles.empty}>
						<AppText variant="label" weight="regular" tone="muted" align="center">
							{permissionDenied ? "Allow contacts access to find friends already on Chatbox, or add someone by @username." : isLoading ? "Loading contacts…" : "No contacts yet."}
						</AppText>
					</View>
				}
			/>
			<AddContactModal />
		</SheetScreen>
	);
};

const styles = StyleSheet.create({
	search: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 24, marginTop: 8, paddingHorizontal: 14, height: 44, borderRadius: 12, backgroundColor: palette.field },
	searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: palette.ink },
	sectionHeader: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 4 },
	row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 24, paddingVertical: 10 },
	main: { flex: 1, gap: 4 },
	list: { paddingBottom: 40 },
	empty: { paddingTop: 60, paddingHorizontal: 40 },
});

export default Contacts;
