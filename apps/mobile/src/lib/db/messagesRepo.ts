import { getDatabase } from "./database";
import type { IMessage, TAttachmentType } from "@/src/interfaces/message-interface";

interface IMessageRow {
    id: string;
    conversation_id: string;
    direction: string;
    content_type: string | null;
    content: string | null;
    media_url: string | null;
    media_size: number | null;
    duration: number | null;
    status: string | null;
    expires_at: number | null;
    created_at: number;
    payload: string | null;
}

// Most recent messages kept per conversation in the offline cache.
const CACHE_LIMIT_PER_CONVERSATION = 200;

export const upsertMessage = async (conversationId: string, message: IMessage) => {
    const db = await getDatabase();
    await db.runAsync(
        `INSERT INTO messages (id, conversation_id, direction, content_type, content, media_url, media_size, duration, status, expires_at, payload, is_deleted, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
         ON CONFLICT(id) DO UPDATE SET
            content = excluded.content,
            content_type = excluded.content_type,
            media_url = excluded.media_url,
            media_size = excluded.media_size,
            duration = excluded.duration,
            status = excluded.status,
            expires_at = excluded.expires_at,
            payload = excluded.payload`,
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
            JSON.stringify(message),
            message.timestamp,
        ]
    );
};

export const upsertMessages = async (conversationId: string, messages: IMessage[]) => {
    await Promise.all(messages.map((message) => upsertMessage(conversationId, message)));
    // Optimistic copies are superseded once the server echo (same clientId) lands.
    const clientIds = messages.filter((message) => message.clientId && !message.id.startsWith("local-")).map((message) => `local-${message.clientId}`);
    if (clientIds.length) {
        const db = await getDatabase();
        await db.runAsync(`DELETE FROM messages WHERE id IN (${clientIds.map(() => "?").join(",")})`, clientIds);
    }
};

const rowToMessage = (row: IMessageRow): IMessage => {
    if (row.payload) return JSON.parse(row.payload) as IMessage;
    return {
        id: row.id,
        conversationId: row.conversation_id,
        text: row.content || "",
        type: row.direction === "receiver" ? "receiver" : "sender",
        timestamp: row.created_at,
        status: (row.status as IMessage["status"]) || undefined,
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
    };
};

export const listMessagesForConversation = async (conversationId: string): Promise<IMessage[]> => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<IMessageRow>(
        `SELECT * FROM messages WHERE conversation_id = ? AND is_deleted = 0 ORDER BY created_at ASC`,
        [conversationId]
    );
    return rows.map(rowToMessage);
};

export const listAllMessages = async (): Promise<Record<string, IMessage[]>> => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<IMessageRow>(
        `SELECT * FROM (
            SELECT *, ROW_NUMBER() OVER (PARTITION BY conversation_id ORDER BY created_at DESC) AS rank
            FROM messages WHERE is_deleted = 0
         ) WHERE rank <= ? ORDER BY created_at ASC`,
        [CACHE_LIMIT_PER_CONVERSATION]
    );
    const byConversation: Record<string, IMessage[]> = {};
    for (const row of rows) {
        (byConversation[row.conversation_id] ??= []).push(rowToMessage(row));
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
