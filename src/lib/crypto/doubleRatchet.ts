import {
    aesCbcDecrypt,
    aesCbcEncrypt,
    bytesToBase64,
    base64ToBytes,
    concatBytes,
    diffieHellman,
    generateX25519KeyPair,
    hkdfSha256,
    hmacSha256,
    IKeyPair,
} from "./primitives";

const MAX_SKIP = 1000;
const MAX_SKIPPED_CACHE_ENTRIES = 2000;

export interface IRatchetHeader {
    dhPub: string; // base64
    prevChainLength: number;
    counter: number;
}

export interface IRatchetEnvelope {
    header: IRatchetHeader;
    ciphertext: string; // base64
    iv: string; // base64
    mac: string; // base64
}

interface IChainState {
    key: Uint8Array;
    counter: number;
}

export interface IDoubleRatchetState {
    rootKey: Uint8Array;
    myRatchetKeyPair: IKeyPair;
    theirRatchetPub: Uint8Array | null;
    sendingChain: IChainState | null;
    receivingChain: IChainState | null;
    prevSendingChainLength: number;
    /** `${theirRatchetPubB64}:${counter}` -> message key, capped and pruned FIFO. See maxSkip below. */
    skippedMessageKeys: Map<string, Uint8Array>;
}

const RATCHET_INFO = "ChatboxE2EE_DoubleRatchet_v1";
const MESSAGE_KEY_INFO = "ChatboxE2EE_MessageKeys_v1";
const CHAIN_STEP_MESSAGE = new Uint8Array([0x01]);
const CHAIN_STEP_NEXT = new Uint8Array([0x02]);

/** Alice (initiator): seeds her sending chain immediately via a DH ratchet step against Bob's signed prekey. */
export const initRatchetAsInitiator = (
    rootKey: Uint8Array,
    theirSignedPrekeyPub: Uint8Array
): IDoubleRatchetState => {
    const myRatchetKeyPair = generateX25519KeyPair();
    const dhOut = diffieHellman(myRatchetKeyPair.privateKey, theirSignedPrekeyPub);
    const [newRootKey, sendingChainKey] = deriveRootAndChain(rootKey, dhOut);

    return {
        rootKey: newRootKey,
        myRatchetKeyPair,
        theirRatchetPub: theirSignedPrekeyPub,
        sendingChain: { key: sendingChainKey, counter: 0 },
        receivingChain: null,
        prevSendingChainLength: 0,
        skippedMessageKeys: new Map(),
    };
};

/** Bob (responder): starts with only a root key — his sending chain, and his own new ratchet key, appear on his first *reply*. */
export const initRatchetAsResponder = (rootKey: Uint8Array, mySignedPrekeyPair: IKeyPair): IDoubleRatchetState => ({
    rootKey,
    myRatchetKeyPair: mySignedPrekeyPair,
    theirRatchetPub: null,
    sendingChain: null,
    receivingChain: null,
    prevSendingChainLength: 0,
    skippedMessageKeys: new Map(),
});

const deriveRootAndChain = (rootKey: Uint8Array, dhOut: Uint8Array): [Uint8Array, Uint8Array] => {
    const output = hkdfSha256(dhOut, rootKey, RATCHET_INFO, 64);
    return [output.slice(0, 32), output.slice(32, 64)];
};

const stepChain = (chain: IChainState): { messageKey: Uint8Array; nextChain: IChainState } => {
    const messageKey = hmacSha256(chain.key, CHAIN_STEP_MESSAGE);
    const nextKey = hmacSha256(chain.key, CHAIN_STEP_NEXT);
    return { messageKey, nextChain: { key: nextKey, counter: chain.counter + 1 } };
};

const deriveMessageSecrets = (messageKey: Uint8Array) => {
    const output = hkdfSha256(messageKey, new Uint8Array(32), MESSAGE_KEY_INFO, 80);
    return { encKey: output.slice(0, 32), macKey: output.slice(32, 64), iv: output.slice(64, 80) };
};

const computeMac = (macKey: Uint8Array, header: IRatchetHeader, ciphertext: Uint8Array) => {
    const headerBytes = new TextEncoder().encode(JSON.stringify(header));
    return hmacSha256(macKey, concatBytes(headerBytes, ciphertext)).slice(0, 16);
};

const dhRatchetStep = (state: IDoubleRatchetState, theirNewRatchetPub: Uint8Array) => {
    state.prevSendingChainLength = state.sendingChain?.counter || 0;
    state.theirRatchetPub = theirNewRatchetPub;

    const dhRecv = diffieHellman(state.myRatchetKeyPair.privateKey, theirNewRatchetPub);
    const [rootAfterRecv, receivingKey] = deriveRootAndChain(state.rootKey, dhRecv);
    state.rootKey = rootAfterRecv;
    state.receivingChain = { key: receivingKey, counter: 0 };

    state.myRatchetKeyPair = generateX25519KeyPair();
    const dhSend = diffieHellman(state.myRatchetKeyPair.privateKey, theirNewRatchetPub);
    const [rootAfterSend, sendingKey] = deriveRootAndChain(state.rootKey, dhSend);
    state.rootKey = rootAfterSend;
    state.sendingChain = { key: sendingKey, counter: 0 };
};

export const ratchetEncrypt = (state: IDoubleRatchetState, plaintext: string): IRatchetEnvelope => {
    if (!state.sendingChain) throw new Error("No sending chain — call initRatchetAsInitiator/respond first.");

    const { messageKey, nextChain } = stepChain(state.sendingChain);
    const header: IRatchetHeader = {
        dhPub: bytesToBase64(state.myRatchetKeyPair.publicKey),
        prevChainLength: state.prevSendingChainLength,
        counter: state.sendingChain.counter,
    };
    state.sendingChain = nextChain;

    const { encKey, macKey, iv } = deriveMessageSecrets(messageKey);
    const ciphertext = aesCbcEncrypt(encKey, iv, new TextEncoder().encode(plaintext));
    const mac = computeMac(macKey, header, ciphertext);

    return {
        header,
        ciphertext: bytesToBase64(ciphertext),
        iv: bytesToBase64(iv),
        mac: bytesToBase64(mac),
    };
};

const trySkippedMessageKey = (state: IDoubleRatchetState, header: IRatchetHeader): Uint8Array | null => {
    const cacheKey = `${header.dhPub}:${header.counter}`;
    const messageKey = state.skippedMessageKeys.get(cacheKey);
    if (messageKey) state.skippedMessageKeys.delete(cacheKey);
    return messageKey || null;
};

const skipMessageKeys = (state: IDoubleRatchetState, until: number) => {
    if (!state.receivingChain) return;
    if (until - state.receivingChain.counter > MAX_SKIP) {
        throw new Error("Too many skipped messages — refusing (possible attack or corrupted session).");
    }
    while (state.receivingChain.counter < until) {
        const { messageKey, nextChain } = stepChain(state.receivingChain);
        const cacheKey = `${bytesToBase64(state.theirRatchetPub!)}:${state.receivingChain.counter}`;
        state.skippedMessageKeys.set(cacheKey, messageKey);
        state.receivingChain = nextChain;
    }
    // FIFO-prune an unbounded cache — forward secrecy for messages so old
    // they'll realistically never arrive shouldn't cost unbounded memory.
    if (state.skippedMessageKeys.size > MAX_SKIPPED_CACHE_ENTRIES) {
        const oldestKey = state.skippedMessageKeys.keys().next().value;
        if (oldestKey) state.skippedMessageKeys.delete(oldestKey);
    }
};

export const ratchetDecrypt = (state: IDoubleRatchetState, envelope: IRatchetEnvelope): string => {
    const { header } = envelope;
    const headerDhPub = base64ToBytes(header.dhPub);
    const ciphertext = base64ToBytes(envelope.ciphertext);
    const iv = base64ToBytes(envelope.iv);
    const mac = base64ToBytes(envelope.mac);

    let messageKey = trySkippedMessageKey(state, header);

    if (!messageKey) {
        const isNewRatchetKey = !state.theirRatchetPub || bytesToBase64(state.theirRatchetPub) !== header.dhPub;
        if (isNewRatchetKey) {
            if (state.receivingChain) skipMessageKeys(state, header.prevChainLength);
            dhRatchetStep(state, headerDhPub);
        }
        skipMessageKeys(state, header.counter);
        const stepped = stepChain(state.receivingChain!);
        messageKey = stepped.messageKey;
        state.receivingChain = stepped.nextChain;
    }

    const { encKey, macKey } = deriveMessageSecrets(messageKey);
    const expectedMac = computeMac(macKey, header, ciphertext);
    if (bytesToBase64(expectedMac) !== bytesToBase64(mac)) {
        throw new Error("MAC verification failed — message may have been tampered with or corrupted.");
    }

    const plaintextBytes = aesCbcDecrypt(encKey, iv, ciphertext);
    return new TextDecoder().decode(plaintextBytes);
};
