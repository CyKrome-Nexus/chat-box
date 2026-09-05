import { getDatabase } from "./database";

export interface ISyncQueueEntry {
    id: string;
    conversationId: string;
    messageId: string;
    payload: string;
    retryCount: number;
    nextAttemptAt: number;
}

const BASE_BACKOFF_MS = 2000;
const MAX_BACKOFF_MS = 60000;

/** 2s, 4s, 8s, 16s... capped at 60s — standard exponential backoff. */
export const computeNextAttempt = (retryCount: number) =>
    Date.now() + Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** retryCount);

export const enqueueSync = async (conversationId: string, messageId: string, payload: unknown) => {
    const db = await getDatabase();
    await db.runAsync(
        `INSERT OR REPLACE INTO sync_queue (id, conversation_id, message_id, payload, retry_count, next_attempt_at, created_at)
         VALUES (?, ?, ?, ?, 0, 0, ?)`,
        [messageId, conversationId, messageId, JSON.stringify(payload), Date.now()]
    );
};

export const dequeueSync = async (messageId: string) => {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM sync_queue WHERE id = ?`, [messageId]);
};

export const bumpRetry = async (messageId: string, retryCount: number) => {
    const db = await getDatabase();
    await db.runAsync(`UPDATE sync_queue SET retry_count = ?, next_attempt_at = ? WHERE id = ?`, [
        retryCount,
        computeNextAttempt(retryCount),
        messageId,
    ]);
};

/** Entries whose backoff window has elapsed and are due for another attempt. */
export const listDueSyncEntries = async (): Promise<ISyncQueueEntry[]> => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
        `SELECT * FROM sync_queue WHERE next_attempt_at <= ? ORDER BY created_at ASC`,
        [Date.now()]
    );
    return rows.map((row) => ({
        id: row.id,
        conversationId: row.conversation_id,
        messageId: row.message_id,
        payload: row.payload,
        retryCount: row.retry_count,
        nextAttemptAt: row.next_attempt_at,
    }));
};
