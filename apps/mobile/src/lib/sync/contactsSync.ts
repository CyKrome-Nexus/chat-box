import type { PublicUser } from "@chatbox/shared";

import { contactsApi, conversationsApi, usersApi } from "@/src/lib/api/services";
import { applyConversation } from "@/src/lib/sync/chatSync";
import type { IContactRibbon } from "@/src/interfaces/list-interface";
import { store } from "@/src/redux/store/store";
import { setSavedContacts } from "@/src/redux/features/contactsSlice";

export const userToContact = (user: PublicUser, nickname?: string | null): IContactRibbon => ({
    id: user.id,
    userId: user.id,
    name: nickname ?? user.name,
    handle: user.handle ?? undefined,
    avatar: { url: user.avatarUrl ?? "" },
    about: user.about ?? undefined,
    phoneNumber: user.phone ?? undefined,
    isRegistered: true,
    source: "server",
});

export const syncContacts = async () => {
    const contacts = await contactsApi.list();
    store.dispatch(setSavedContacts(contacts.map((contact) => userToContact(contact.user, contact.nickname))));
};

export const saveContact = async (userId: string, nickname?: string) => {
    await contactsApi.add(userId, nickname);
    await syncContacts();
};

export const removeContact = async (userId: string) => {
    await contactsApi.remove(userId);
    await syncContacts();
};

// Best-effort E.164 normalisation; numbers without an international prefix can't be matched reliably.
export const normalizePhone = (raw: string): string | null => {
    const compact = raw.replace(/[\s().-]/g, "");
    if (/^\+[1-9]\d{7,14}$/.test(compact)) return compact;
    if (/^00[1-9]\d{7,14}$/.test(compact)) return `+${compact.slice(2)}`;
    if (/^[1-9]\d{10,14}$/.test(compact)) return `+${compact}`;
    return null;
};

export const discoverRegistered = async (phones: string[]): Promise<Map<string, PublicUser>> => {
    const normalized = [...new Set(phones.map(normalizePhone).filter((phone): phone is string => phone !== null))];
    const matches = new Map<string, PublicUser>();
    for (let index = 0; index < normalized.length; index += 1000) {
        const batch = await usersApi.discover({ phones: normalized.slice(index, index + 1000), emails: [] });
        batch.forEach((match) => matches.set(match.value, match.user));
    }
    return matches;
};

// Opens (or creates) the 1:1 conversation with a user and returns its id.
export const openDirectConversation = async (userId: string): Promise<string> => {
    const conversation = await conversationsApi.createDirect(userId);
    applyConversation(conversation);
    return conversation.id;
};
