import { useCallback, useEffect, useState } from "react";
import * as Contacts from "expo-contacts";

import type { IContactRibbon } from "@/src/interfaces/list-interface";
import { discoverRegistered, normalizePhone } from "@/src/lib/sync/contactsSync";

// Reads the address book and flags which numbers belong to Chatbox users.
export const useDeviceContacts = () => {
	const [contacts, setContacts] = useState<IContactRibbon[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [permissionDenied, setPermissionDenied] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			const { status } = await Contacts.requestPermissionsAsync();
			if (status !== "granted") {
				setPermissionDenied(true);
				setContacts([]);
				return;
			}
			setPermissionDenied(false);

			const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Image] });
			const withPhones = data.filter((c) => c.name && c.phoneNumbers?.[0]?.number);
			const phones = withPhones.map((c) => c.phoneNumbers?.[0]?.number ?? "");
			const registered = await discoverRegistered(phones).catch(() => new Map());

			setContacts(
				withPhones.map((c) => {
					const phoneNumber = (c.phoneNumbers?.[0]?.number ?? "").replace(/[\s-()]/g, "");
					const user = registered.get(normalizePhone(phoneNumber) ?? "");
					return {
						id: c.id || phoneNumber,
						name: c.name ?? phoneNumber,
						avatar: { url: user?.avatarUrl ?? c.image?.uri ?? "" },
						phoneNumber,
						about: user?.about ?? undefined,
						isRegistered: Boolean(user),
						userId: user?.id,
						handle: user?.handle ?? undefined,
						source: "device",
					};
				})
			);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Couldn't load contacts");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	return { contacts, isLoading, permissionDenied, error, reload: load };
};
