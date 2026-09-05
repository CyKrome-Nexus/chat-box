import {
    concatBytes,
    diffieHellman,
    generateX25519KeyPair,
    hkdfSha256,
    verifySignature,
    IKeyPair,
} from "./primitives";
import { IIdentity, IPublicBundle } from "./identityKeyStore";

const X3DH_INFO = "ChatboxE2EE_X3DH_v1";
const F = new Uint8Array(32).fill(0xff); // constant prefix recommended by the X3DH spec, prepended to the DH outputs

export interface IX3dhInitiatorResult {
    rootKey: Uint8Array;
    ephemeralKeyPair: IKeyPair;
    usedOneTimePrekeyId?: number;
}

/**
 * X3DH (Extended Triple Diffie-Hellman) — establishes the shared secret that
 * seeds the Double Ratchet. See docs/architecture/e2ee-crypto.md.
 *
 * Alice (initiator) computes:
 *   DH1 = DH(IK_A,  SPK_B)   DH2 = DH(EK_A, IK_B)
 *   DH3 = DH(EK_A,  SPK_B)   DH4 = DH(EK_A, OPK_B)  (if a one-time prekey was available)
 *   SK  = KDF(F || DH1 || DH2 || DH3 || DH4)
 */
export const initiateSession = (myIdentity: IIdentity, peerBundle: IPublicBundle): IX3dhInitiatorResult => {
    const verified = verifySignature(peerBundle.identitySignPub, peerBundle.signedPrekeyPub, peerBundle.signedPrekeySignature);
    if (!verified) {
        throw new Error("Signed prekey signature verification failed — refusing to establish a session.");
    }

    const ephemeralKeyPair = generateX25519KeyPair();

    const dh1 = diffieHellman(myIdentity.identityDH.privateKey, peerBundle.signedPrekeyPub);
    const dh2 = diffieHellman(ephemeralKeyPair.privateKey, peerBundle.identityDHPub);
    const dh3 = diffieHellman(ephemeralKeyPair.privateKey, peerBundle.signedPrekeyPub);
    const dh4 = peerBundle.oneTimePrekeyPub
        ? diffieHellman(ephemeralKeyPair.privateKey, peerBundle.oneTimePrekeyPub)
        : new Uint8Array(0);

    const ikm = concatBytes(F, dh1, dh2, dh3, dh4);
    const rootKey = hkdfSha256(ikm, new Uint8Array(32), X3DH_INFO, 32);

    return { rootKey, ephemeralKeyPair, usedOneTimePrekeyId: peerBundle.oneTimePrekeyId };
};

/**
 * Bob (responder) mirrors the same four DH computations from his side to
 * arrive at the identical SK, given Alice's identity/ephemeral public keys
 * (which would arrive in the first message's header over the wire) and his
 * own (signed prekey, and the specific one-time prekey Alice's bundle fetch
 * said she'd use).
 */
export const respondToSession = (
    myIdentityDHPriv: Uint8Array,
    mySignedPrekeyPriv: Uint8Array,
    myOneTimePrekeyPriv: Uint8Array | undefined,
    initiatorIdentityDHPub: Uint8Array,
    initiatorEphemeralPub: Uint8Array
): Uint8Array => {
    const dh1 = diffieHellman(mySignedPrekeyPriv, initiatorIdentityDHPub);
    const dh2 = diffieHellman(myIdentityDHPriv, initiatorEphemeralPub);
    const dh3 = diffieHellman(mySignedPrekeyPriv, initiatorEphemeralPub);
    const dh4 = myOneTimePrekeyPriv ? diffieHellman(myOneTimePrekeyPriv, initiatorEphemeralPub) : new Uint8Array(0);

    const ikm = concatBytes(F, dh1, dh2, dh3, dh4);
    return hkdfSha256(ikm, new Uint8Array(32), X3DH_INFO, 32);
};
