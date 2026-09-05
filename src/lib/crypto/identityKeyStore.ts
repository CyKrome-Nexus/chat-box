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

const CORE_STORE_KEY = "chatbox_e2ee_identity_core_v1";
const OTPK_INDEX_STORE_KEY = "chatbox_e2ee_otpk_index_v1";
const otpkStoreKey = (keyId: number) => `chatbox_e2ee_otpk_${keyId}`;

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

let cachedIdentity: IIdentity | null = null;

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

const persistOneTimePrekey = async (keyId: number, keyPair: IKeyPair) => {
    await SecureStore.setItemAsync(
        otpkStoreKey(keyId),
        JSON.stringify({ priv: bytesToBase64(keyPair.privateKey), pub: bytesToBase64(keyPair.publicKey) })
    );
};

const loadOneTimePrekey = async (keyId: number): Promise<IKeyPair | null> => {
    const raw = await SecureStore.getItemAsync(otpkStoreKey(keyId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { privateKey: base64ToBytes(parsed.priv), publicKey: base64ToBytes(parsed.pub) };
};

const persistOneTimePrekeyIndex = (ids: number[]) =>
    SecureStore.setItemAsync(OTPK_INDEX_STORE_KEY, JSON.stringify(ids));

const generateAndPersistOneTimePrekeys = async (startId: number, count: number): Promise<number[]> => {
    const ids: number[] = [];
    for (let i = 0; i < count; i++) {
        const keyId = startId + i;
        await persistOneTimePrekey(keyId, generateX25519KeyPair());
        ids.push(keyId);
    }
    return ids;
};

const createIdentity = async (): Promise<IIdentity> => {
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
    await SecureStore.setItemAsync(CORE_STORE_KEY, serializeCore(core));

    const oneTimePrekeyIds = await generateAndPersistOneTimePrekeys(1, ONE_TIME_PREKEY_POOL_SIZE);
    await persistOneTimePrekeyIndex(oneTimePrekeyIds);

    return { ...core, oneTimePrekeyIds };
};

/**
 * Loads (or generates on first run) this device's long-term identity key
 * pair, signed prekey, and one-time prekey pool — all private key material
 * lives only in `expo-secure-store` (iOS Keychain / Android Keystore), never
 * in Redux/SQLite. See docs/architecture/e2ee-crypto.md.
 */
export const ensureIdentity = async (): Promise<IIdentity> => {
    if (cachedIdentity) return cachedIdentity;

    const storedCore = await SecureStore.getItemAsync(CORE_STORE_KEY);
    if (!storedCore) {
        cachedIdentity = await createIdentity();
        return cachedIdentity;
    }

    const core = deserializeCore(storedCore);
    const storedIndex = await SecureStore.getItemAsync(OTPK_INDEX_STORE_KEY);
    const oneTimePrekeyIds: number[] = storedIndex ? JSON.parse(storedIndex) : [];
    cachedIdentity = { ...core, oneTimePrekeyIds };

    await rotateSignedPrekeyIfDue(cachedIdentity);
    await replenishOneTimePrekeys(cachedIdentity);
    return cachedIdentity;
};

const rotateSignedPrekeyIfDue = async (identity: IIdentity) => {
    if (Date.now() - identity.signedPrekey.createdAt < SIGNED_PREKEY_ROTATION_MS) return;
    const keyPair = generateX25519KeyPair();
    identity.signedPrekey = {
        keyId: identity.signedPrekey.keyId + 1,
        keyPair,
        signature: signPrekey(identity.identitySign, keyPair.publicKey),
        createdAt: Date.now(),
    };
    await SecureStore.setItemAsync(CORE_STORE_KEY, serializeCore(identity));
};

const replenishOneTimePrekeys = async (identity: IIdentity) => {
    if (identity.oneTimePrekeyIds.length >= ONE_TIME_PREKEY_REPLENISH_THRESHOLD) return;
    const needed = ONE_TIME_PREKEY_POOL_SIZE - identity.oneTimePrekeyIds.length;
    const newIds = await generateAndPersistOneTimePrekeys(identity.nextPrekeyId, needed);
    identity.oneTimePrekeyIds = identity.oneTimePrekeyIds.concat(newIds);
    identity.nextPrekeyId += needed;
    await persistOneTimePrekeyIndex(identity.oneTimePrekeyIds);
    await SecureStore.setItemAsync(CORE_STORE_KEY, serializeCore(identity));
};

/** The "publishable" half of this identity — what a real key-distribution server would store. */
export const getPublicBundle = async (): Promise<IPublicBundle> => {
    const identity = await ensureIdentity();
    const oneTimePrekeyId = identity.oneTimePrekeyIds[0];
    const oneTimePrekey = oneTimePrekeyId != null ? await loadOneTimePrekey(oneTimePrekeyId) : null;
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
    const identity = await ensureIdentity();
    const keyPair = await loadOneTimePrekey(keyId);
    if (!keyPair) return null;

    identity.oneTimePrekeyIds = identity.oneTimePrekeyIds.filter((id) => id !== keyId);
    await SecureStore.deleteItemAsync(otpkStoreKey(keyId));
    await persistOneTimePrekeyIndex(identity.oneTimePrekeyIds);
    await replenishOneTimePrekeys(identity);
    return keyPair;
};

export const getIdentityFingerprintMaterial = async (): Promise<Uint8Array> => {
    const identity = await ensureIdentity();
    return concatBytes(identity.identityDH.publicKey, identity.identitySign.publicKey);
};
