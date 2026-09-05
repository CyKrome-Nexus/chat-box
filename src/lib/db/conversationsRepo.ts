import { getDatabase } from "./database";
import { IChatRibbon } from "@/src/interfaces/list-interface";

export const upsertConversation = async (chat: IChatRibbon) => {
    const db = await getDatabase();
    await db.runAsync(
        `INSERT INTO conversations (id, type, title, avatar_url, unread_count, is_muted, updated_at)
         VALUES (?, 'direct', ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            avatar_url = excluded.avatar_url,
            unread_count = excluded.unread_count,
            is_muted = excluded.is_muted,
            updated_at = excluded.updated_at`,
        [chat.id, chat.name, chat.avatar?.url || "", chat.notificationCount || 0, chat.muted ? 1 : 0, Date.now()]
    );
};

export const deleteConversation = async (id: string) => {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM conversations WHERE id = ?`, [id]);
};

export const listConversations = async (): Promise<IChatRibbon[]> => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(`SELECT * FROM conversations ORDER BY updated_at DESC`);
    return rows.map((row) => ({
        id: row.id,
        name: row.title,
        avatar: { url: row.avatar_url || "" },
        notificationCount: row.unread_count,
        muted: !!row.is_muted,
    }));
};
