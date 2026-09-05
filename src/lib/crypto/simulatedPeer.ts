import { x25519, ed25519 } from "@noble/curves/ed25519.js";
import { hkdfSha256, sha256, sign } from "./primitives";
import { IPublicBundle } from "./identityKeyStore";

const x25519PublicKeyFrom = (privateKey: Uint8Array) => x25519.getPublicKey(privateKey);
const ed25519PublicKeyFrom = (privateKey: Uint8Array) => ed25519.getPublicKey(privateKey);

/**
 * There is no second real device in this app to actually publish a prekey
 * bundle to a key-distribution server (see docs/architecture/e2ee-crypto.md
 * for why this ticket's scope stops short of a real server). To still
 * exercise the *real* X3DH/Double Ratchet math end-to-end, this generates a
 * structurally-identical, cryptographically valid "peer" identity —
 * deterministically derived from the conversation id via HKDF, so it's
 * stable across app restarts (not fresh random garbage every time, which
 * would make the ratchet state impossible to resume). This is a clearly
 * fictional counterpart, not real second-party key material.
 */
const deriveSeed = (conversationId: string, label: string): Uint8Array => {
    const base = sha256(new TextEncoder().encode(`chatbox-e2ee-simulated-peer:${conversationId}`));
    return hkdfSha256(base, new Uint8Array(32), label, 32);
};

export const getSimulatedPeerBundle = (conversationId: string): IPublicBundle & { signedPrekeyPriv: Uint8Array; identityDHPriv: Uint8Array; oneTimePrekeyPriv?: Uint8Array } => {
    const identityDHPriv = deriveSeed(conversationId, "identityDH");
    const identitySignPriv = deriveSeed(conversationId, "identitySign");
    const signedPrekeyPriv = deriveSeed(conversationId, "signedPrekey");
    const oneTimePrekeyPriv = deriveSeed(conversationId, "oneTimePrekey-1");

    const identityDHPub = x25519PublicKeyFrom(identityDHPriv);
    const identitySignPub = ed25519PublicKeyFrom(identitySignPriv);
    const signedPrekeyPub = x25519PublicKeyFrom(signedPrekeyPriv);
    const oneTimePrekeyPub = x25519PublicKeyFrom(oneTimePrekeyPriv);

    return {
        identityDHPub,
        identitySignPub,
        signedPrekeyId: 1,
        signedPrekeyPub,
        signedPrekeySignature: sign(identitySignPriv, signedPrekeyPub),
        oneTimePrekeyId: 1,
        oneTimePrekeyPub,
        signedPrekeyPriv,
        identityDHPriv,
        oneTimePrekeyPriv,
    };
};
