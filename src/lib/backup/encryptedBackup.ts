import { File, Paths } from "expo-file-system";
import { pbkdf2Async } from "@noble/hashes/pbkdf2.js";
import { sha256 as sha256Hash } from "@noble/hashes/sha2.js";
import { gcm } from "@noble/ciphers/aes.js";

import { base64ToBytes, bytesToBase64, randomBytes } from "../crypto/primitives";
import { listConversations, upsertConversation } from "../db/conversationsRepo";
import { listAllMessages, upsertMessage } from "../db/messagesRepo";
import { listManualContacts, upsertContact } from "../db/contactsRepo";
import { listCallLogs, insertCallLog } from "../db/callLogsRepo";

/**
 * PBKDF2-SHA256 substitutes for the ticket's specified Argon2id — see
 * docs/architecture/e2ee-media.md for why (no WASM support in React
 * Native's Hermes engine, and no native Argon2 module without a custom dev
 * client this environment can't build/verify). 210,000 iterations matches
 * OWASP's 2023 PBKDF2-SHA256 recommendation for password storage.
 */
const PBKDF2_ITERATIONS = 210_000;
const BACKUP_FORMAT_VERSION = 1;

export interface IBackupFile {
    version: number;
    salt: string; // base64, 128-bit
    iv: string; // base64, 96-bit
    ciphertext: string; // base64 — AES-256-GCM(payload)
}

const deriveBackupKey = (passphrase: string, salt: Uint8Array): Promise<Uint8Array> =>
    pbkdf2Async(sha256Hash, new TextEncoder().encode(passphrase), salt, { c: PBKDF2_ITERATIONS, dkLen: 32 });

/**
 * Bundles the local database (conversations, messages, manual contacts,
 * call history) into one JSON payload — the ticket's "entire local
 * database" bundling step, minus the media *directory*: copying every
 * attachment's binary file into the bundle as well is a real amount of
 * additional I/O/size-management work this pass scopes out (message/media
 * *metadata*, including local file uris, is included, so a restore relinks
 * to whatever local media still exists on that device, but doesn't
 * transport the media bytes themselves — see e2ee-media.md).
 */
const buildBackupPayload = async () => ({
    exportedAt: Date.now(),
    conversations: await listConversations(),
    messagesByConversation: await listAllMessages(),
    manualContacts: await listManualContacts(),
    callLogs: await listCallLogs(),
});

/**
 * Encrypts the local database with a passphrase-derived AES-256-GCM key and
 * writes it to a local file, ready to hand to the OS share sheet (Save to
 * Files → iCloud Drive on iOS, or Drive/any installed cloud app on Android)
 * — see e2ee-media.md for why this repo uses the share sheet rather than a
 * direct Google Drive/iCloud API integration.
 */
export const createEncryptedBackup = async (passphrase: string): Promise<string> => {
    const payload = await buildBackupPayload();
    const plaintext = new TextEncoder().encode(JSON.stringify(payload));

    const salt = randomBytes(16);
    const iv = randomBytes(12);
    const key = await deriveBackupKey(passphrase, salt);
    const ciphertext = gcm(key, iv).encrypt(plaintext);

    const backupFile: IBackupFile = {
        version: BACKUP_FORMAT_VERSION,
        salt: bytesToBase64(salt),
        iv: bytesToBase64(iv),
        ciphertext: bytesToBase64(ciphertext),
    };

    const file = new File(Paths.document, `chatbox-backup-${Date.now()}.chatboxbackup`);
    file.create({ overwrite: true });
    file.write(JSON.stringify(backupFile));
    return file.uri;
};

export interface IRestoredBackup {
    conversations: any[];
    messagesByConversation: Record<string, any[]>;
    manualContacts: any[];
    callLogs: any[];
    exportedAt: number;
}

/** Decrypts a backup file with the user's passphrase — throws if the passphrase is wrong (GCM auth tag mismatch) or the file is corrupted. */
export const restoreEncryptedBackup = async (fileUri: string, passphrase: string): Promise<IRestoredBackup> => {
    const raw = await new File(fileUri).text();
    const backupFile: IBackupFile = JSON.parse(raw);
    if (backupFile.version !== BACKUP_FORMAT_VERSION) {
        throw new Error("Unsupported backup file version.");
    }

    const salt = base64ToBytes(backupFile.salt);
    const iv = base64ToBytes(backupFile.iv);
    const ciphertext = base64ToBytes(backupFile.ciphertext);
    const key = await deriveBackupKey(passphrase, salt);

    const plaintext = gcm(key, iv).decrypt(ciphertext); // throws on wrong passphrase / tampered file
    return JSON.parse(new TextDecoder().decode(plaintext));
};

/**
 * Writes a restored backup's contents through to SQLite (not just Redux) so
 * the restore survives the next app restart too, matching this app's
 * existing write-through persistence model everywhere else.
 */
export const persistRestoredBackup = async (restored: IRestoredBackup) => {
    await Promise.all(restored.conversations.map((chat) => upsertConversation(chat)));
    await Promise.all(restored.manualContacts.map((contact) => upsertContact(contact)));
    await Promise.all(restored.callLogs.map((call) => insertCallLog(call)));
    for (const [conversationId, messages] of Object.entries(restored.messagesByConversation)) {
        await Promise.all(messages.map((message: any) => upsertMessage(conversationId, message)));
    }
};
