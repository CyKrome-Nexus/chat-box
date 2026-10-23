import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, StyleSheet, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Avatar from "@/src/components/images/Avatar";
import { AppText, CircleButton, PrimaryButton, ScalePressable, fonts, palette } from "@/src/components/ui";
import type { IContactRibbon } from "@/src/interfaces/list-interface";
import { errorMessage } from "@/src/lib/api/client";
import { conversationsApi, usersApi } from "@/src/lib/api/services";
import { applyConversation } from "@/src/lib/sync/chatSync";
import { userToContact } from "@/src/lib/sync/contactsSync";
import { useDeviceContacts } from "@/src/hooks/useDeviceContacts";
import type { RootState } from "@/src/redux/store/store";

export interface IPickedUser {
	id: string;
	name: string;
	avatarUrl?: string;
}

// Multi-select of Chatbox users (saved contacts, registered device contacts, or server search).
const ContactPickerScreen = () => {
	const insets = useSafeAreaInsets();
	const params = useLocalSearchParams<{ mode?: "group" | "broadcast" | "add"; chatId?: string }>();
	const [adding, setAdding] = useState(false);
	const { contacts: deviceContacts } = useDeviceContacts();
	const saved = useSelector((state: RootState) => state.contacts.savedContacts);
	const [query, setQuery] = useState("");
	const [remote, setRemote] = useState<IContactRibbon[]>([]);
	const [selected, setSelected] = useState<Map<string, IPickedUser>>(new Map());

	useEffect(() => {
		const term = query.trim();
		if (term.length < 2) return setRemote([]);
		const timer = setTimeout(() => {
			usersApi
				.search(term)
				.then((users) => setRemote(users.map((user) => userToContact(user))))
				.catch(() => setRemote([]));
		}, 250);
		return () => clearTimeout(timer);
	}, [query]);

	const people = useMemo(() => {
		const byUser = new Map<string, IContactRibbon>();
		[...saved, ...deviceContacts.filter((contact) => contact.isRegistered), ...remote].forEach((contact) => {
			if (contact.userId && !byUser.has(contact.userId)) byUser.set(contact.userId, contact);
		});
		const term = query.trim().toLowerCase();
		return [...byUser.values()]
			.filter((contact) => !term || contact.name.toLowerCase().includes(term) || contact.handle?.includes(term))
			.sort((a, b) => a.name.localeCompare(b.name));
	}, [saved, deviceContacts, remote, query]);

	const toggle = (contact: IContactRibbon) => {
		if (!contact.userId) return;
		const next = new Map(selected);
		if (next.has(contact.userId)) next.delete(contact.userId);
		else next.set(contact.userId, { id: contact.userId, name: contact.name, avatarUrl: contact.avatar?.url || undefined });
		setSelected(next);
	};

	const next = async () => {
		if (params.mode === "add" && params.chatId) {
			setAdding(true);
			try {
				applyConversation(await conversationsApi.addMembers(params.chatId, [...selected.keys()]));
				router.back();
			} catch (error) {
				Alert.alert("Couldn't add members", errorMessage(error));
			} finally {
				setAdding(false);
			}
			return;
		}
		router.push({
			pathname: params.mode === "broadcast" ? "/broadcast-create-details" : "/group-create-details",
			params: { participantsJson: JSON.stringify([...selected.values()]) },
		});
	};

	return (
		<View style={[styles.root, { paddingTop: insets.top + 8 }]}>
			<View style={styles.header}>
				<CircleButton icon="arrow-back" label="Back" variant="plain" onPress={() => router.back()} />
				<AppText variant="heading" align="center" style={styles.flex}>
					{params.mode === "broadcast" ? "New broadcast list" : params.mode === "add" ? "Add to group" : "New group"}
				</AppText>
				<AppText variant="label" tone="brand" style={styles.count}>
					{selected.size}
				</AppText>
			</View>
			<View style={styles.search}>
				<Ionicons name="search" size={18} color={palette.muted} />
				<TextInput value={query} onChangeText={setQuery} placeholder="Search name or @username" placeholderTextColor={palette.muted} autoCapitalize="none" style={styles.searchInput} />
			</View>
			{selected.size ? (
				<Animated.ScrollView horizontal entering={FadeIn} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
					{[...selected.values()].map((user) => (
						<Animated.View key={user.id} entering={ZoomIn.springify().damping(15)}>
							<ScalePressable accessibilityLabel={`Remove ${user.name}`} onPress={() => toggle({ id: user.id, userId: user.id, name: user.name, avatar: { url: user.avatarUrl ?? "" } })} style={styles.chip}>
								<Avatar data={{ url: user.avatarUrl }} size={52} />
								<View style={styles.chipBadge}>
									<Ionicons name="close" size={12} color={palette.white} />
								</View>
								<AppText variant="caption" numberOfLines={1} style={styles.chipName}>
									{user.name.split(" ")[0]}
								</AppText>
							</ScalePressable>
						</Animated.View>
					))}
				</Animated.ScrollView>
			) : null}
			<FlatList
				data={people}
				keyExtractor={(item) => item.userId ?? item.id}
				keyboardShouldPersistTaps="handled"
				contentContainerStyle={styles.list}
				renderItem={({ item }) => {
					const isSelected = Boolean(item.userId && selected.has(item.userId));
					return (
						<ScalePressable accessibilityLabel={item.name} accessibilityState={{ selected: isSelected }} onPress={() => toggle(item)} scaleTo={0.985} style={styles.row}>
							<Avatar data={item.avatar} size={48} />
							<View style={styles.flex}>
								<AppText variant="body" weight="medium" numberOfLines={1}>
									{item.name}
								</AppText>
								<AppText variant="caption" tone="muted" numberOfLines={1}>
									{item.handle ? `@${item.handle}` : (item.about ?? "")}
								</AppText>
							</View>
							<Ionicons name={isSelected ? "checkmark-circle" : "ellipse-outline"} size={24} color={isSelected ? palette.brand : "#CDD1D0"} />
						</ScalePressable>
					);
				}}
				ListEmptyComponent={
					<AppText variant="label" weight="regular" tone="muted" align="center" style={styles.empty}>
						Search for people by name or @username.
					</AppText>
				}
			/>
			<View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
				<PrimaryButton title={`${params.mode === "add" ? "Add" : "Next"}${selected.size ? ` · ${selected.size}` : ""}`} onPress={() => void next()} disabled={selected.size === 0} loading={adding} />
			</View>
		</View>
	);
};

export default ContactPickerScreen;

const styles = StyleSheet.create({
	root: { flex: 1, backgroundColor: palette.white },
	flex: { flex: 1 },
	header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 8 },
	count: { width: 44, textAlign: "center" },
	search: { flexDirection: "row", alignItems: "center", gap: 8, margin: 24, marginBottom: 8, paddingHorizontal: 14, height: 48, borderRadius: 12, backgroundColor: palette.field },
	searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: palette.ink },
	chips: { paddingHorizontal: 24, gap: 14, paddingVertical: 8 },
	chip: { alignItems: "center", width: 60 },
	chipBadge: { position: "absolute", top: 34, right: 2, width: 18, height: 18, borderRadius: 9, backgroundColor: palette.ink, alignItems: "center", justifyContent: "center" },
	chipName: { marginTop: 4 },
	list: { paddingBottom: 24 },
	row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 24, paddingVertical: 10 },
	empty: { marginTop: 48, paddingHorizontal: 40 },
	footer: { paddingHorizontal: 24, paddingTop: 8 },
});
