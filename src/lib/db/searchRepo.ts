import { getDatabase } from "./database";

export interface IMessageSearchHit {
    messageId: string;
    conversationId: string;
    content: string;
}

/** Re-indexes one message's text — call after every insert/update. Delete-then-insert is the standard FTS5 "update" pattern. */
export const indexMessage = async (messageId: string, conversationId: string, content: string) => {
    const db = await getDatabase();
    try {
        await db.runAsync(`DELETE FROM messages_fts WHERE message_id = ?`, [messageId]);
        if (content && content.trim()) {
            await db.runAsync(
                `INSERT INTO messages_fts (content, message_id, conversation_id) VALUES (?, ?, ?)`,
                [content, messageId, conversationId]
            );
        }
    } catch {
        // No FTS5 table/support — searchMessages() falls back to LIKE, which
        // doesn't need an index at all, so there's nothing to do here.
    }
};

export const removeMessageFromIndex = async (messageId: string) => {
    const db = await getDatabase();
    try {
        await db.runAsync(`DELETE FROM messages_fts WHERE message_id = ?`, [messageId]);
    } catch {
        // See indexMessage.
    }
};

/**
 * Turns free-text user input into an FTS5 MATCH query: each whitespace-
 * separated token becomes a quoted prefix match (`"word"*`), so search
 * behaves like as-you-type/autocomplete rather than requiring whole-word
 * exact matches, and embedded quotes/FTS operators in the input can't break
 * the query syntax.
 */
const toFtsQuery = (query: string) =>
    query
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((token) => `"${token.replace(/"/g, '""')}"*`)
        .join(" ");

/**
 * Full-text search over indexed message content, optionally scoped to one
 * conversation (in-chat search). Tries FTS5 first (fast, prefix-aware,
 * scales to thousands of rows per the ticket's <100ms target); falls back to
 * a plain LIKE scan if FTS5 isn't available in this SQLite build.
 */
export const searchMessages = async (
    query: string,
    options: { conversationId?: string; limit?: number } = {}
): Promise<IMessageSearchHit[]> => {
    const { conversationId, limit = 100 } = options;
    if (!query.trim()) return [];

    const db = await getDatabase();
    const matchQuery = toFtsQuery(query);

    try {
        const rows = conversationId
            ? await db.getAllAsync<any>(
                    `SELECT message_id, conversation_id, content FROM messages_fts
                     WHERE messages_fts MATCH ? AND conversation_id = ? LIMIT ?`,
                    [matchQuery, conversationId, limit]
              )
            : await db.getAllAsync<any>(
                    `SELECT message_id, conversation_id, content FROM messages_fts
                     WHERE messages_fts MATCH ? LIMIT ?`,
                    [matchQuery, limit]
              );
        return rows.map((row) => ({
            messageId: row.message_id,
            conversationId: row.conversation_id,
            content: row.content,
        }));
    } catch {
        return searchMessagesFallback(query, conversationId, limit);
    }
};

const searchMessagesFallback = async (
    query: string,
    conversationId: string | undefined,
    limit: number
): Promise<IMessageSearchHit[]> => {
    const db = await getDatabase();
    const like = `%${query.trim()}%`;
    const rows = conversationId
        ? await db.getAllAsync<any>(
                `SELECT id as message_id, conversation_id, content FROM messages
                 WHERE content LIKE ? AND conversation_id = ? AND is_deleted = 0 LIMIT ?`,
                [like, conversationId, limit]
          )
        : await db.getAllAsync<any>(
                `SELECT id as message_id, conversation_id, content FROM messages
                 WHERE content LIKE ? AND is_deleted = 0 LIMIT ?`,
                [like, limit]
          );
    return rows.map((row) => ({
        messageId: row.message_id,
        conversationId: row.conversation_id,
        content: row.content,
    }));
};
