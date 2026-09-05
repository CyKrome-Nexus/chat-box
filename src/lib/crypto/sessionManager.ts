import { ensureIdentity } from "./identityKeyStore";
import { getSimulatedPeerBundle } from "./simulatedPeer";
import { initiateSession, respondToSession } from "./x3dh";
import {
    IDoubleRatchetState,
    IRatchetEnvelope,
    initRatchetAsInitiator,
    ratchetDecrypt,
    ratchetEncrypt,
} from "./doubleRatchet";
import { bytesToBase64 } from "./primitives";

/**
 * Per-conversation Double Ratchet sessions, kept in memory only (not
 * persisted across app restarts) — see docs/architecture/e2ee-crypto.md for
 * why: persisting an evolving ratchet state (skipped-key cache, rotating
 * chain keys) safely within `expo-secure-store`'s 2KB-per-item limit adds
 * real complexity beyond this ticket's scope, and losing the session on
 * restart just means the next message re-runs a fresh (still fully real)
 * X3DH handshake rather than resuming forward-secret chain state.
 */
const sessions = new Map<string, IDoubleRatchetState>();

/**
 * Establishes this device's end of a conversation's session by running a
 * real X3DH handshake against the (simulated, see simulatedPeer.ts) peer
 * bundle, then seeding a Double Ratchet from the resulting root key.
 */
const establishSession = async (conversationId: string): Promise<IDoubleRatchetState> => {
    const myIdentity = await ensureIdentity();
    const peerBundle = getSimulatedPeerBundle(conversationId);
    const { rootKey } = initiateSession(myIdentity, peerBundle);
    return initRatchetAsInitiator(rootKey, peerBundle.signedPrekeyPub);
};

const getSession = async (conversationId: string): Promise<IDoubleRatchetState> => {
    let session = sessions.get(conversationId);
    if (!session) {
        session = await establishSession(conversationId);
        sessions.set(conversationId, session);
    }
    return session;
};

/** Encrypts a plaintext message for the wire — returns a JSON envelope string. */
export const encryptForConversation = async (conversationId: string, plaintext: string): Promise<string> => {
    const session = await getSession(conversationId);
    const envelope = ratchetEncrypt(session, plaintext);
    return JSON.stringify(envelope);
};

/** Decrypts a received envelope back to plaintext. */
export const decryptFromConversation = async (conversationId: string, envelopeJson: string): Promise<string> => {
    const session = await getSession(conversationId);
    const envelope: IRatchetEnvelope = JSON.parse(envelopeJson);
    return ratchetDecrypt(session, envelope);
};

/** A string this envelope format can never produce by coincidence in plain chat text, to distinguish encrypted wire payloads from plaintext. */
export const isEncryptedEnvelope = (text: string): boolean => {
    try {
        const parsed = JSON.parse(text);
        return !!(parsed?.header?.dhPub && parsed?.ciphertext && parsed?.mac);
    } catch {
        return false;
    }
};

/**
 * Cryptographic self-test: independently derives the responder's (Bob's,
 * simulated) side of the same X3DH handshake and confirms it produces an
 * identical root key to this device's (Alice's) side, then runs a real
 * encrypt/decrypt round trip through both parties' Double Ratchet states.
 * This is what actually *proves* the engine is correct without a second
 * real device — see the "Safety Number" screen, which surfaces this result.
 */
export const runSessionSelfTest = async (conversationId: string): Promise<boolean> => {
    try {
        const myIdentity = await ensureIdentity();
        const peerBundle = getSimulatedPeerBundle(conversationId);

        const { rootKey: aliceRootKey, ephemeralKeyPair } = initiateSession(myIdentity, peerBundle);
        const bobRootKey = respondToSession(
            peerBundle.identityDHPriv,
            peerBundle.signedPrekeyPriv,
            peerBundle.oneTimePrekeyPriv,
            myIdentity.identityDH.publicKey,
            ephemeralKeyPair.publicKey
        );

        if (bytesToBase64(aliceRootKey) !== bytesToBase64(bobRootKey)) return false;

        const aliceRatchet = initRatchetAsInitiator(aliceRootKey, peerBundle.signedPrekeyPub);
        const envelope = ratchetEncrypt(aliceRatchet, "e2ee-self-test");

        const bobRatchet = {
            rootKey: bobRootKey,
            myRatchetKeyPair: { privateKey: peerBundle.signedPrekeyPriv, publicKey: peerBundle.signedPrekeyPub },
            theirRatchetPub: null,
            sendingChain: null,
            receivingChain: null,
            prevSendingChainLength: 0,
            skippedMessageKeys: new Map(),
        };
        const decrypted = ratchetDecrypt(bobRatchet, JSON.parse(JSON.stringify(envelope)));
        return decrypted === "e2ee-self-test";
    } catch {
        return false;
    }
};

export const clearSessionCache = () => sessions.clear();
