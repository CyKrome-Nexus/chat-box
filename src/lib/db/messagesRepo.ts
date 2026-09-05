import { getDatabase } from "./database";
import { IMessage, TAttachmentType } from "@/src/interfaces/message-interface";

export const upsertMessage = async (conversationId: string, message: IMessage) => {
    const db = await getDatabase();
    await db.runAsync(
        `INSERT INTO messages (id, conversation_id, direction, content_type, content, media_url, media_size, duration, status, expires_at, is_deleted, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
         ON CONFLICT(id) DO UPDATE SET
            content = excluded.content,
            content_type = excluded.content_type,
            media_url = excluded.media_url,
            media_size = excluded.media_size,
            duration = excluded.duration,
            status = excluded.status,
            expires_at = excluded.expires_at`,
        [
            message.id,
            conversationId,
            message.type,
            message.attachment?.type || "text",
            message.text,
            message.attachment?.uri || null,
            message.attachment?.size || null,
            message.attachment?.duration || null,
            message.status || null,
            message.expiresAt || null,
            message.timestamp,
        ]
    );
};

export const listMessagesForConversation = async (conversationId: string): Promise<IMessage[]> => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
        `SELECT * FROM messages WHERE conversation_id = ? AND is_deleted = 0 ORDER BY created_at ASC`,
        [conversationId]
    );
    return rows.map(rowToMessage);
};

export const listAllMessages = async (): Promise<Record<string, IMessage[]>> => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
        `SELECT * FROM messages WHERE is_deleted = 0 ORDER BY created_at ASC`
    );
    const byConversation: Record<string, IMessage[]> = {};
    for (const row of rows) {
        if (!byConversation[row.conversation_id]) byConversation[row.conversation_id] = [];
        byConversation[row.conversation_id].push(rowToMessage(row));
    }
    return byConversation;
};

export const clearAllMessagesFromDb = async () => {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM messages`);
};

export const deleteMessageFromDb = async (messageId: string) => {
    const db = await getDatabase();
    await db.runAsync(`UPDATE messages SET is_deleted = 1 WHERE id = ?`, [messageId]);
};

const rowToMessage = (row: any): IMessage => ({
    id: row.id,
    conversationId: row.conversation_id,
    text: row.content || "",
    type: row.direction === "receiver" ? "receiver" : "sender",
    timestamp: row.created_at,
    status: row.status || undefined,
    expiresAt: row.expires_at || undefined,
    attachment:
        row.content_type && row.content_type !== "text"
            ? {
                    type: row.content_type as TAttachmentType,
                    uri: row.media_url || undefined,
                    size: row.media_size || undefined,
                    duration: row.duration || undefined,
                }
            : undefined,
});
