import { getDatabase } from "./database";
import { IChatRibbon } from "@/src/interfaces/list-interface";

export const upsertConversation = async (chat: IChatRibbon) => {
    const db = await getDatabase();
    await db.runAsync(
        `INSERT INTO conversations (id, type, title, avatar_url, unread_count, is_pinned, is_archived, is_muted, draft_text, updated_at)
         VALUES (?, 'direct', ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            avatar_url = excluded.avatar_url,
            unread_count = excluded.unread_count,
            is_pinned = excluded.is_pinned,
            is_archived = excluded.is_archived,
            is_muted = excluded.is_muted,
            draft_text = excluded.draft_text,
            updated_at = excluded.updated_at`,
        [
            chat.id,
            chat.name,
            chat.avatar?.url || "",
            chat.notificationCount || 0,
            chat.pinned ? 1 : 0,
            chat.archived ? 1 : 0,
            chat.muted ? 1 : 0,
            chat.draft || null,
            Date.now(),
        ]
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
        pinned: !!row.is_pinned,
        archived: !!row.is_archived,
        muted: !!row.is_muted,
        draft: row.draft_text || undefined,
    }));
};
