import { getDatabase } from "./database";
import { IContactRibbon } from "@/src/interfaces/list-interface";

export const upsertContact = async (contact: IContactRibbon) => {
    const db = await getDatabase();
    await db.runAsync(
        `INSERT INTO contacts (id, phone, display_name, username, avatar_url, about, is_registered, source, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
            display_name = excluded.display_name,
            avatar_url = excluded.avatar_url,
            is_registered = excluded.is_registered,
            synced_at = excluded.synced_at`,
        [
            contact.id,
            contact.phoneNumber || null,
            contact.name,
            null,
            contact.avatar?.url || "",
            contact.about || null,
            contact.isRegistered ? 1 : 0,
            contact.source || "device",
            Date.now(),
        ]
    );
};

export const listManualContacts = async (): Promise<IContactRibbon[]> => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(`SELECT * FROM contacts WHERE source = 'manual'`);
    return rows.map(rowToContact);
};

const rowToContact = (row: any): IContactRibbon => ({
    id: row.id,
    name: row.display_name,
    avatar: { url: row.avatar_url || "" },
    phoneNumber: row.phone || undefined,
    about: row.about || undefined,
    isRegistered: !!row.is_registered,
    source: row.source,
});
