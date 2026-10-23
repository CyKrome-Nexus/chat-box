import { getDatabase } from "./database";
import type { IChatRibbon } from "@/src/interfaces/list-interface";

interface IConversationRow {
    id: string;
    title: string;
    avatar_url: string | null;
    unread_count: number;
    is_pinned: number;
    is_archived: number;
    is_muted: number;
    draft_text: string | null;
    payload: string | null;
}

export const upsertConversation = async (chat: IChatRibbon) => {
    const db = await getDatabase();
    await db.runAsync(
        `INSERT INTO conversations (id, type, title, avatar_url, unread_count, is_pinned, is_archived, is_muted, draft_text, payload, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
            type = excluded.type,
            title = excluded.title,
            avatar_url = excluded.avatar_url,
            unread_count = excluded.unread_count,
            is_pinned = excluded.is_pinned,
            is_archived = excluded.is_archived,
            is_muted = excluded.is_muted,
            draft_text = excluded.draft_text,
            payload = excluded.payload,
            updated_at = excluded.updated_at`,
        [
            chat.id,
            chat.isGroup ? "group" : "direct",
            chat.name,
            chat.avatar?.url || "",
            chat.notificationCount || 0,
            chat.pinned ? 1 : 0,
            chat.archived ? 1 : 0,
            chat.muted ? 1 : 0,
            chat.draft || null,
            JSON.stringify(chat),
            chat.lastMessageAt ?? Date.now(),
        ]
    );
};

export const replaceConversations = async (chats: IChatRibbon[]) => {
    const db = await getDatabase();
    const ids = chats.map((chat) => chat.id);
    await db.runAsync(
        ids.length ? `DELETE FROM conversations WHERE id NOT IN (${ids.map(() => "?").join(",")})` : `DELETE FROM conversations`,
        ids
    );
    await Promise.all(chats.map(upsertConversation));
};

export const deleteConversation = async (id: string) => {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM conversations WHERE id = ?`, [id]);
    await db.runAsync(`DELETE FROM messages WHERE conversation_id = ?`, [id]);
};

export const listConversations = async (): Promise<IChatRibbon[]> => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<IConversationRow>(`SELECT * FROM conversations ORDER BY updated_at DESC`);
    return rows.map((row) => {
        if (row.payload) return JSON.parse(row.payload) as IChatRibbon;
        return {
            id: row.id,
            name: row.title,
            avatar: { url: row.avatar_url || "" },
            notificationCount: row.unread_count,
            pinned: !!row.is_pinned,
            archived: !!row.is_archived,
            muted: !!row.is_muted,
            draft: row.draft_text || undefined,
        };
    });
};
