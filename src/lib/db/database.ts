import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

const DATABASE_NAME = "chatbox.db";

let dbPromise: Promise<SQLiteDatabase> | null = null;

/**
 * The local embedded database backing offline-first storage: conversations,
 * messages, contacts, call logs, and the outbound sync queue all live here
 * so the app can render instantly from disk before any network round trip.
 * `expo-sqlite` was chosen over WatermelonDB because it works in the
 * existing Expo managed workflow without a custom dev client/native config
 * — the ticket explicitly allows "op-sqlite... or similar" as an
 * alternative, and this repo has no custom native build set up.
 */
export const getDatabase = (): Promise<SQLiteDatabase> => {
    if (!dbPromise) {
        dbPromise = openDatabaseAsync(DATABASE_NAME).then(async (db) => {
            await db.execAsync("PRAGMA journal_mode = WAL;");
            await runMigrations(db);
            return db;
        });
    }
    return dbPromise;
};

const runMigrations = async (db: SQLiteDatabase) => {
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY NOT NULL,
            type TEXT NOT NULL DEFAULT 'direct',
            title TEXT NOT NULL,
            avatar_url TEXT,
            last_message_id TEXT,
            unread_count INTEGER NOT NULL DEFAULT 0,
            is_pinned INTEGER NOT NULL DEFAULT 0,
            is_archived INTEGER NOT NULL DEFAULT 0,
            is_muted INTEGER NOT NULL DEFAULT 0,
            draft_text TEXT,
            updated_at INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY NOT NULL,
            conversation_id TEXT NOT NULL,
            direction TEXT NOT NULL DEFAULT 'sender',
            content_type TEXT NOT NULL DEFAULT 'text',
            content TEXT,
            media_url TEXT,
            media_size INTEGER,
            duration REAL,
            status TEXT,
            reply_to_id TEXT,
            is_starred INTEGER NOT NULL DEFAULT 0,
            is_deleted INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

        CREATE TABLE IF NOT EXISTS contacts (
            id TEXT PRIMARY KEY NOT NULL,
            phone TEXT,
            display_name TEXT NOT NULL,
            username TEXT,
            avatar_url TEXT,
            about TEXT,
            is_registered INTEGER NOT NULL DEFAULT 0,
            source TEXT NOT NULL DEFAULT 'device',
            synced_at INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS call_logs (
            id TEXT PRIMARY KEY NOT NULL,
            contact_name TEXT NOT NULL,
            avatar_url TEXT,
            call_type TEXT NOT NULL,
            call_time TEXT,
            timestamp INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sync_queue (
            id TEXT PRIMARY KEY NOT NULL,
            conversation_id TEXT NOT NULL,
            message_id TEXT NOT NULL,
            payload TEXT NOT NULL,
            retry_count INTEGER NOT NULL DEFAULT 0,
            next_attempt_at INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL
        );
    `);

    // Full-text index for the global/in-chat search engine (see
    // docs/architecture/search.md). Kept as a separate, manually-synced FTS5
    // table (searchRepo.ts) rather than an "external content" table tied to
    // `messages` via triggers — simpler to reason about, at the cost of
    // every write needing an explicit index call.
    try {
        await db.execAsync(`
            CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
                content,
                message_id UNINDEXED,
                conversation_id UNINDEXED,
                tokenize = 'porter'
            );
        `);

        // One-time backfill for databases created before this table existed.
        const [{ count }] = await db.getAllAsync<{ count: number }>(
            `SELECT COUNT(*) as count FROM messages_fts`
        );
        if (count === 0) {
            await db.execAsync(`
                INSERT INTO messages_fts (content, message_id, conversation_id)
                SELECT content, id, conversation_id FROM messages
                WHERE is_deleted = 0 AND content IS NOT NULL AND content != '';
            `);
        }
    } catch {
        // FTS5 isn't available in every SQLite build. searchRepo.ts falls
        // back to a LIKE-based scan over `messages` when this table (or the
        // MATCH operator) isn't usable.
    }
};

/** Test-only escape hatch: forces the next getDatabase() call to reopen. */
export const _resetDatabaseForTests = () => {
    dbPromise = null;
};
