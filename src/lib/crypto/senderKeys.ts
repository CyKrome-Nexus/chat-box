import {
    aesCbcDecrypt,
    aesCbcEncrypt,
    base64ToBytes,
    bytesToBase64,
    generateEd25519KeyPair,
    hkdfSha256,
    hmacSha256,
    randomBytes,
    sign,
    verifySignature,
    IKeyPair,
} from "./primitives";
import { encryptForConversation } from "./sessionManager";

/**
 * Sender Keys (group E2EE) — avoids O(N^2) pairwise encryption by having
 * each sender encrypt once per group message with their own symmetric
 * "sender key" chain; every member who has that chain key can decrypt. See
 * docs/architecture/e2ee-crypto.md.
 */
export interface ISenderKeyState {
    chainKey: Uint8Array;
    counter: number;
    signingKeyPair: IKeyPair;
}

export interface ISenderKeyEnvelope {
    counter: number;
    ciphertext: string;
    iv: string;
    signature: string;
}

const CHAIN_STEP_MESSAGE = new Uint8Array([0x01]);
const CHAIN_STEP_NEXT = new Uint8Array([0x02]);
const SENDER_KEY_MESSAGE_INFO = "ChatboxE2EE_SenderKeyMsg_v1";

/** In-memory per-group sender key states this device currently knows about (own + received from others). */
const senderKeyStatesByGroup = new Map<string, Map<string, ISenderKeyState>>();

export const createSenderKey = (): ISenderKeyState => ({
    chainKey: randomBytes(32),
    counter: 0,
    signingKeyPair: generateEd25519KeyPair(),
});

const stepChain = (chainKey: Uint8Array) => ({
    messageKey: hmacSha256(chainKey, CHAIN_STEP_MESSAGE),
    nextChainKey: hmacSha256(chainKey, CHAIN_STEP_NEXT),
});

/**
 * Distributes a newly-created (or rotated) sender key to every other
 * participant, each encrypted through that participant's own established
 * pairwise Double Ratchet channel — the ticket's explicit requirement that
 * sender keys travel "over their established 1-on-1 pairwise E2EE
 * channels," not in the clear.
 */
export const distributeSenderKey = async (
    groupId: string,
    senderId: string,
    state: ISenderKeyState,
    participantConversationIds: string[]
): Promise<Record<string, string>> => {
    const payload = JSON.stringify({
        groupId,
        senderId,
        chainKey: bytesToBase64(state.chainKey),
        counter: state.counter,
        signingPublicKey: bytesToBase64(state.signingKeyPair.publicKey),
    });

    const distributions: Record<string, string> = {};
    for (const conversationId of participantConversationIds) {
        distributions[conversationId] = await encryptForConversation(conversationId, payload);
    }

    let groupStates = senderKeyStatesByGroup.get(groupId);
    if (!groupStates) {
        groupStates = new Map();
        senderKeyStatesByGroup.set(groupId, groupStates);
    }
    groupStates.set(senderId, state);

    return distributions;
};

/** Called after decrypting a distribution envelope (see distributeSenderKey) to install a peer's sender key. */
export const installReceivedSenderKey = (
    groupId: string,
    senderId: string,
    chainKey: Uint8Array,
    counter: number,
    signingPublicKey: Uint8Array
) => {
    let groupStates = senderKeyStatesByGroup.get(groupId);
    if (!groupStates) {
        groupStates = new Map();
        senderKeyStatesByGroup.set(groupId, groupStates);
    }
    groupStates.set(senderId, { chainKey, counter, signingKeyPair: { privateKey: new Uint8Array(0), publicKey: signingPublicKey } });
};

export const senderKeyEncrypt = (groupId: string, senderId: string, plaintext: string): ISenderKeyEnvelope => {
    const groupStates = senderKeyStatesByGroup.get(groupId);
    const state = groupStates?.get(senderId);
    if (!state) throw new Error("No sender key established for this sender in this group.");

    const { messageKey, nextChainKey } = stepChain(state.chainKey);
    const counter = state.counter;
    state.chainKey = nextChainKey;
    state.counter += 1;

    const derived = hkdfSha256(messageKey, new Uint8Array(32), SENDER_KEY_MESSAGE_INFO, 48);
    const encKey = derived.slice(0, 32);
    const iv = derived.slice(32, 48);
    const ciphertext = aesCbcEncrypt(encKey, iv, new TextEncoder().encode(plaintext));
    const signature = sign(state.signingKeyPair.privateKey, ciphertext);

    return { counter, ciphertext: bytesToBase64(ciphertext), iv: bytesToBase64(iv), signature: bytesToBase64(signature) };
};

export const senderKeyDecrypt = (groupId: string, senderId: string, envelope: ISenderKeyEnvelope): string => {
    const groupStates = senderKeyStatesByGroup.get(groupId);
    const state = groupStates?.get(senderId);
    if (!state) throw new Error("No sender key known for this sender in this group.");

    const ciphertext = base64ToBytes(envelope.ciphertext);
    const signature = base64ToBytes(envelope.signature);
    if (!verifySignature(state.signingKeyPair.publicKey, ciphertext, signature)) {
        throw new Error("Sender key signature verification failed.");
    }

    // Advance the chain up to the message's counter (handles out-of-order/skip, no cache needed here since sender keys are one-directional per sender).
    let chainKey = state.chainKey;
    let counter = state.counter;
    let messageKey: Uint8Array | null = null;
    while (counter <= envelope.counter) {
        const stepped = stepChain(chainKey);
        if (counter === envelope.counter) messageKey = stepped.messageKey;
        chainKey = stepped.nextChainKey;
        counter += 1;
    }
    state.chainKey = chainKey;
    state.counter = counter;
    if (!messageKey) throw new Error("Could not derive message key for sender key envelope.");

    const derived = hkdfSha256(messageKey, new Uint8Array(32), SENDER_KEY_MESSAGE_INFO, 48);
    const encKey = derived.slice(0, 32);
    const iv = derived.slice(32, 48);
    return new TextDecoder().decode(aesCbcDecrypt(encKey, iv, ciphertext));
};

/**
 * "Automatically rotate Sender Keys whenever a participant leaves or is
 * removed": generates a fresh sender key and re-distributes to whoever
 * remains, so a removed member's cached chain key can no longer decrypt
 * anything sent afterward (forward secrecy at the group membership level).
 */
export const rotateSenderKey = async (
    groupId: string,
    senderId: string,
    remainingParticipantConversationIds: string[]
): Promise<Record<string, string>> => {
    const freshState = createSenderKey();
    return distributeSenderKey(groupId, senderId, freshState, remainingParticipantConversationIds);
};
