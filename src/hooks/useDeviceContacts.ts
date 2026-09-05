import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import * as Contacts from "expo-contacts";

import { IContactRibbon } from "@/src/interfaces/list-interface";
import { findRegisteredIdentifiers } from "@/src/lib/auth/authService";

/**
 * Reads the device's contact list (with a permission prompt) and cross-
 * references phone numbers against the local mock auth store to flag which
 * contacts are "on Chatbox" — there's no real backend to sync against yet,
 * so this is the closest available stand-in for that check.
 */
export const useDeviceContacts = () => {
	const [contacts, setContacts] = useState<IContactRibbon[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [permissionDenied, setPermissionDenied] = useState(false);

	const load = useCallback(async () => {
		setIsLoading(true);
		try {
			const { status } = await Contacts.requestPermissionsAsync();
			if (status !== "granted") {
				setPermissionDenied(true);
				setContacts([]);
				return;
			}
			setPermissionDenied(false);

			const { data } = await Contacts.getContactsAsync({
				fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Image],
			});

			const withPhones = data.filter((c) => c.name && c.phoneNumbers?.[0]?.number);
			const phoneNumbers = withPhones.map((c) => c.phoneNumbers![0].number!.replace(/[\s-()]/g, ""));
			const registered = await findRegisteredIdentifiers(phoneNumbers);

			const mapped: IContactRibbon[] = withPhones.map((c) => {
				const phoneNumber = c.phoneNumbers![0].number!.replace(/[\s-()]/g, "");
				return {
					id: c.id || phoneNumber,
					name: c.name!,
					avatar: { url: c.image?.uri || "" },
					phoneNumber,
					isRegistered: registered.has(phoneNumber),
					source: "device",
				};
			});

			setContacts(mapped);
		} catch (e: any) {
			Alert.alert("Couldn't load contacts", e.message || "Please try again.");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	return { contacts, isLoading, permissionDenied, reload: load };
};
