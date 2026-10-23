import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import Animated, { SlideInDown } from "react-native-reanimated";

import type { PublicUser } from "@chatbox/shared";

import Avatar from "../images/Avatar";
import { AppText, CircleButton, ScalePressable, UnderlineField, palette, radii } from "@/src/components/ui";
import { errorMessage } from "@/src/lib/api/client";
import { usersApi } from "@/src/lib/api/services";
import { normalizePhone, saveContact } from "@/src/lib/sync/contactsSync";
import type { RootState } from "@/src/redux/store/store";
import { setShowAddContactModal } from "@/src/redux/features/contactsSlice";

// Finds Chatbox users by name, @username or phone and saves them as contacts.
const AddContactModal = () => {
	const dispatch = useDispatch();
	const visible = useSelector((state: RootState) => state.contacts.showAddContactModal);
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<PublicUser[]>([]);
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	useEffect(() => {
		const term = query.trim();
		if (term.length < 2) {
			setResults([]);
			return;
		}
		setLoading(true);
		const timer = setTimeout(() => {
			const phone = normalizePhone(term);
			const lookup = phone
				? usersApi.discover({ phones: [phone], emails: [] }).then((matches) => matches.map((match) => match.user))
				: usersApi.search(term);
			lookup
				.then(setResults)
				.catch(() => setResults([]))
				.finally(() => setLoading(false));
		}, 300);
		return () => clearTimeout(timer);
	}, [query]);

	const close = () => {
		dispatch(setShowAddContactModal(false));
		setQuery("");
		setResults([]);
		setMessage(null);
	};

	const add = async (user: PublicUser) => {
		try {
			await saveContact(user.id);
			setMessage(`${user.name} added to your contacts`);
		} catch (error) {
			setMessage(errorMessage(error));
		}
	};

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
			<Pressable style={styles.backdrop} onPress={close}>
				<Animated.View entering={SlideInDown.springify().damping(22)} style={styles.sheet}>
					<Pressable onPress={(event) => event.stopPropagation()}>
						<View style={styles.header}>
							<CircleButton icon="close" label="Close" variant="plain" size={36} onPress={close} />
							<AppText variant="heading" align="center" style={styles.flex}>
								Add contact
							</AppText>
							<View style={styles.spacer} />
						</View>
						<UnderlineField label="Name, @username or phone" value={query} onChangeText={setQuery} autoCapitalize="none" autoFocus />
						{message ? (
							<AppText variant="caption" tone="brand" style={styles.message}>
								{message}
							</AppText>
						) : null}
						{loading ? <ActivityIndicator color={palette.brand} style={styles.loader} /> : null}
						<FlatList
							data={results}
							keyExtractor={(item) => item.id}
							style={styles.list}
							keyboardShouldPersistTaps="handled"
							renderItem={({ item }) => (
								<View style={styles.row}>
									<Avatar data={{ url: item.avatarUrl ?? undefined }} size={44} />
									<View style={styles.flex}>
										<AppText variant="body" weight="medium" numberOfLines={1}>
											{item.name}
										</AppText>
										<AppText variant="caption" tone="muted" numberOfLines={1}>
											{item.handle ? `@${item.handle}` : (item.about ?? "")}
										</AppText>
									</View>
									{item.isContact ? (
										<AppText variant="caption" tone="muted">
											Saved
										</AppText>
									) : (
										<ScalePressable accessibilityLabel={`Add ${item.name}`} onPress={() => void add(item)} style={styles.addButton}>
											<AppText variant="label" tone="inverse">
												Add
											</AppText>
										</ScalePressable>
									)}
								</View>
							)}
						/>
					</Pressable>
				</Animated.View>
			</Pressable>
		</Modal>
	);
};

export default AddContactModal;

const styles = StyleSheet.create({
	backdrop: { flex: 1, backgroundColor: "rgba(0,14,8,0.45)", justifyContent: "flex-end" },
	sheet: { backgroundColor: palette.white, borderTopLeftRadius: radii.sheet, borderTopRightRadius: radii.sheet, padding: 24, paddingBottom: 40, maxHeight: "80%" },
	header: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
	spacer: { width: 36 },
	flex: { flex: 1 },
	message: { marginTop: 10 },
	loader: { marginTop: 16 },
	list: { marginTop: 12 },
	row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
	addButton: { backgroundColor: palette.brand, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radii.full },
});
