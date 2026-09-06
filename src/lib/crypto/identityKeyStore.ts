import * as SecureStore from "expo-secure-store";

import {
    base64ToBytes,
    bytesToBase64,
    concatBytes,
    generateEd25519KeyPair,
    generateX25519KeyPair,
    sign,
    IKeyPair,
} from "./primitives";

/**
 * Multi-Account (see docs/architecture/multi-account.md): every SecureStore
 * key below is namespaced by the currently-active account id, so each
 * linked account gets a genuinely separate Signal Protocol identity/prekey
 * set in the OS Keychain/Keystore — not just a separate Redux/SQLite view
 * of shared key material. "default" (the pre-multi-account single-user
 * case) keeps the original unsuffixed key names so existing installs don't
 * lose their identity on upgrade.
 */
let activeAccountId = "default";
export const setActiveIdentityAccount = (accountId: string) => {
    activeAccountId = accountId;
};

const CORE_STORE_KEY = (accountId: string) =>
    accountId === "default" ? "chatbox_e2ee_identity_core_v1" : `chatbox_e2ee_identity_core_v1_${accountId}`;
const OTPK_INDEX_STORE_KEY = (accountId: string) =>
    accountId === "default" ? "chatbox_e2ee_otpk_index_v1" : `chatbox_e2ee_otpk_index_v1_${accountId}`;
const otpkStoreKey = (accountId: string, keyId: number) =>
    accountId === "default" ? `chatbox_e2ee_otpk_${keyId}` : `chatbox_e2ee_otpk_${accountId}_${keyId}`;

const SIGNED_PREKEY_ROTATION_MS = 7 * 24 * 60 * 60 * 1000; // weekly, per the ticket's "rotated periodically"
export const ONE_TIME_PREKEY_POOL_SIZE = 100;
export const ONE_TIME_PREKEY_REPLENISH_THRESHOLD = 20;

/**
 * `expo-secure-store` caps each item at 2048 bytes (iOS Keychain / Android
 * Keystore-backed storage). A pool of 100 one-time prekeys serialized
 * together would blow well past that, so each one-time prekey is its own
 * SecureStore item (~90 bytes) — still fully hardware-backed, just split
 * across many small entries instead of one large blob, plus a small index
 * item tracking which key ids currently exist. See e2ee-crypto.md.
 */
export interface ISignedPrekey {
    keyId: number;
    keyPair: IKeyPair;
    signature: Uint8Array;
    createdAt: number;
}

export interface IOneTimePrekey {
    keyId: number;
    keyPair: IKeyPair;
}

interface ICoreIdentity {
    identityDH: IKeyPair;
    identitySign: IKeyPair;
    signedPrekey: ISignedPrekey;
    nextPrekeyId: number;
}

export interface IIdentity extends ICoreIdentity {
    oneTimePrekeyIds: number[];
}

export interface IPublicBundle {
    identityDHPub: Uint8Array;
    identitySignPub: Uint8Array;
    signedPrekeyId: number;
    signedPrekeyPub: Uint8Array;
    signedPrekeySignature: Uint8Array;
    oneTimePrekeyId?: number;
    oneTimePrekeyPub?: Uint8Array;
}

const identityCache = new Map<string, IIdentity>();

const signPrekey = (identitySign: IKeyPair, prekeyPub: Uint8Array) => sign(identitySign.privateKey, prekeyPub);

const serializeCore = (core: ICoreIdentity): string =>
    JSON.stringify({
        identityDH: { priv: bytesToBase64(core.identityDH.privateKey), pub: bytesToBase64(core.identityDH.publicKey) },
        identitySign: { priv: bytesToBase64(core.identitySign.privateKey), pub: bytesToBase64(core.identitySign.publicKey) },
        signedPrekey: {
            keyId: core.signedPrekey.keyId,
            priv: bytesToBase64(core.signedPrekey.keyPair.privateKey),
            pub: bytesToBase64(core.signedPrekey.keyPair.publicKey),
            signature: bytesToBase64(core.signedPrekey.signature),
            createdAt: core.signedPrekey.createdAt,
        },
        nextPrekeyId: core.nextPrekeyId,
    });

const deserializeCore = (raw: string): ICoreIdentity => {
    const parsed = JSON.parse(raw);
    return {
        identityDH: { privateKey: base64ToBytes(parsed.identityDH.priv), publicKey: base64ToBytes(parsed.identityDH.pub) },
        identitySign: { privateKey: base64ToBytes(parsed.identitySign.priv), publicKey: base64ToBytes(parsed.identitySign.pub) },
        signedPrekey: {
            keyId: parsed.signedPrekey.keyId,
            keyPair: { privateKey: base64ToBytes(parsed.signedPrekey.priv), publicKey: base64ToBytes(parsed.signedPrekey.pub) },
            signature: base64ToBytes(parsed.signedPrekey.signature),
            createdAt: parsed.signedPrekey.createdAt,
        },
        nextPrekeyId: parsed.nextPrekeyId,
    };
};

const persistOneTimePrekey = async (accountId: string, keyId: number, keyPair: IKeyPair) => {
    await SecureStore.setItemAsync(
        otpkStoreKey(accountId, keyId),
        JSON.stringify({ priv: bytesToBase64(keyPair.privateKey), pub: bytesToBase64(keyPair.publicKey) })
    );
};

const loadOneTimePrekey = async (accountId: string, keyId: number): Promise<IKeyPair | null> => {
    const raw = await SecureStore.getItemAsync(otpkStoreKey(accountId, keyId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { privateKey: base64ToBytes(parsed.priv), publicKey: base64ToBytes(parsed.pub) };
};

const persistOneTimePrekeyIndex = (accountId: string, ids: number[]) =>
    SecureStore.setItemAsync(OTPK_INDEX_STORE_KEY(accountId), JSON.stringify(ids));

const generateAndPersistOneTimePrekeys = async (accountId: string, startId: number, count: number): Promise<number[]> => {
    const ids: number[] = [];
    for (let i = 0; i < count; i++) {
        const keyId = startId + i;
        await persistOneTimePrekey(accountId, keyId, generateX25519KeyPair());
        ids.push(keyId);
    }
    return ids;
};

const createIdentity = async (accountId: string): Promise<IIdentity> => {
    const identityDH = generateX25519KeyPair();
    const identitySign = generateEd25519KeyPair();
    const signedPrekeyPair = generateX25519KeyPair();
    const core: ICoreIdentity = {
        identityDH,
        identitySign,
        signedPrekey: {
            keyId: 1,
            keyPair: signedPrekeyPair,
            signature: signPrekey(identitySign, signedPrekeyPair.publicKey),
            createdAt: Date.now(),
        },
        nextPrekeyId: ONE_TIME_PREKEY_POOL_SIZE + 1,
    };
    await SecureStore.setItemAsync(CORE_STORE_KEY(accountId), serializeCore(core));

    const oneTimePrekeyIds = await generateAndPersistOneTimePrekeys(accountId, 1, ONE_TIME_PREKEY_POOL_SIZE);
    await persistOneTimePrekeyIndex(accountId, oneTimePrekeyIds);

    return { ...core, oneTimePrekeyIds };
};

/**
 * Loads (or generates on first run) the *active account's* long-term
 * identity key pair, signed prekey, and one-time prekey pool — all private
 * key material lives only in `expo-secure-store` (iOS Keychain / Android
 * Keystore), never in Redux/SQLite, and is namespaced per-account (see
 * `setActiveIdentityAccount`) so switching the active account switches
 * encryption keys too. See docs/architecture/e2ee-crypto.md and
 * docs/architecture/multi-account.md.
 */
export const ensureIdentity = async (): Promise<IIdentity> => {
    const accountId = activeAccountId;
    const cached = identityCache.get(accountId);
    if (cached) return cached;

    const storedCore = await SecureStore.getItemAsync(CORE_STORE_KEY(accountId));
    if (!storedCore) {
        const created = await createIdentity(accountId);
        identityCache.set(accountId, created);
        return created;
    }

    const core = deserializeCore(storedCore);
    const storedIndex = await SecureStore.getItemAsync(OTPK_INDEX_STORE_KEY(accountId));
    const oneTimePrekeyIds: number[] = storedIndex ? JSON.parse(storedIndex) : [];
    const identity: IIdentity = { ...core, oneTimePrekeyIds };
    identityCache.set(accountId, identity);

    await rotateSignedPrekeyIfDue(accountId, identity);
    await replenishOneTimePrekeys(accountId, identity);
    return identity;
};

const rotateSignedPrekeyIfDue = async (accountId: string, identity: IIdentity) => {
    if (Date.now() - identity.signedPrekey.createdAt < SIGNED_PREKEY_ROTATION_MS) return;
    const keyPair = generateX25519KeyPair();
    identity.signedPrekey = {
        keyId: identity.signedPrekey.keyId + 1,
        keyPair,
        signature: signPrekey(identity.identitySign, keyPair.publicKey),
        createdAt: Date.now(),
    };
    await SecureStore.setItemAsync(CORE_STORE_KEY(accountId), serializeCore(identity));
};

const replenishOneTimePrekeys = async (accountId: string, identity: IIdentity) => {
    if (identity.oneTimePrekeyIds.length >= ONE_TIME_PREKEY_REPLENISH_THRESHOLD) return;
    const needed = ONE_TIME_PREKEY_POOL_SIZE - identity.oneTimePrekeyIds.length;
    const newIds = await generateAndPersistOneTimePrekeys(accountId, identity.nextPrekeyId, needed);
    identity.oneTimePrekeyIds = identity.oneTimePrekeyIds.concat(newIds);
    identity.nextPrekeyId += needed;
    await persistOneTimePrekeyIndex(accountId, identity.oneTimePrekeyIds);
    await SecureStore.setItemAsync(CORE_STORE_KEY(accountId), serializeCore(identity));
};

/** The "publishable" half of this identity — what a real key-distribution server would store. */
export const getPublicBundle = async (): Promise<IPublicBundle> => {
    const accountId = activeAccountId;
    const identity = await ensureIdentity();
    const oneTimePrekeyId = identity.oneTimePrekeyIds[0];
    const oneTimePrekey = oneTimePrekeyId != null ? await loadOneTimePrekey(accountId, oneTimePrekeyId) : null;
    return {
        identityDHPub: identity.identityDH.publicKey,
        identitySignPub: identity.identitySign.publicKey,
        signedPrekeyId: identity.signedPrekey.keyId,
        signedPrekeyPub: identity.signedPrekey.keyPair.publicKey,
        signedPrekeySignature: identity.signedPrekey.signature,
        oneTimePrekeyId: oneTimePrekey ? oneTimePrekeyId : undefined,
        oneTimePrekeyPub: oneTimePrekey?.publicKey,
    };
};

/** Consumes (removes) a one-time prekey after it's used to respond to a session request — each is single-use. */
export const consumeOneTimePrekey = async (keyId: number): Promise<IKeyPair | null> => {
    const accountId = activeAccountId;
    const identity = await ensureIdentity();
    const keyPair = await loadOneTimePrekey(accountId, keyId);
    if (!keyPair) return null;

    identity.oneTimePrekeyIds = identity.oneTimePrekeyIds.filter((id) => id !== keyId);
    await SecureStore.deleteItemAsync(otpkStoreKey(accountId, keyId));
    await persistOneTimePrekeyIndex(accountId, identity.oneTimePrekeyIds);
    await replenishOneTimePrekeys(accountId, identity);
    return keyPair;
};

export const getIdentityFingerprintMaterial = async (): Promise<Uint8Array> => {
    const identity = await ensureIdentity();
    return concatBytes(identity.identityDH.publicKey, identity.identitySign.publicKey);
};
