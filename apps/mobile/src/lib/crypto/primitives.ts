import * as Crypto from "expo-crypto";
import { x25519, ed25519 } from "@noble/curves/ed25519.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { hmac } from "@noble/hashes/hmac.js";
import { sha256, sha512 } from "@noble/hashes/sha2.js";
import { cbc } from "@noble/ciphers/aes.js";

/**
 * Low-level primitives for the Signal-Protocol-based E2EE engine (see
 * docs/architecture/e2ee-crypto.md). All randomness comes from
 * `expo-crypto`'s synchronous CSPRNG rather than `@noble`'s own
 * `randomSecretKey()` helpers, which expect a global `crypto.getRandomValues`
 * that React Native doesn't provide out of the box — X25519/Ed25519 secret
 * keys are just raw 32-byte buffers, so supplying our own random bytes
 * directly to `getPublicKey`/`sign` works without needing that global.
 */
export const randomBytes = (length: number): Uint8Array => Crypto.getRandomBytes(length);

export interface IKeyPair {
    privateKey: Uint8Array;
    publicKey: Uint8Array;
}

export const generateX25519KeyPair = (): IKeyPair => {
    const privateKey = randomBytes(32);
    return { privateKey, publicKey: x25519.getPublicKey(privateKey) };
};

export const generateEd25519KeyPair = (): IKeyPair => {
    const privateKey = randomBytes(32);
    return { privateKey, publicKey: ed25519.getPublicKey(privateKey) };
};

export const diffieHellman = (privateKey: Uint8Array, publicKey: Uint8Array): Uint8Array =>
    x25519.getSharedSecret(privateKey, publicKey);

export const sign = (privateKey: Uint8Array, message: Uint8Array): Uint8Array =>
    ed25519.sign(message, privateKey);

export const verifySignature = (publicKey: Uint8Array, message: Uint8Array, signature: Uint8Array): boolean =>
    ed25519.verify(signature, message, publicKey);

export const hkdfSha256 = (ikm: Uint8Array, salt: Uint8Array, info: string, length: number): Uint8Array =>
    hkdf(sha256, ikm, salt, new TextEncoder().encode(info), length);

export const hmacSha256 = (key: Uint8Array, data: Uint8Array): Uint8Array => hmac(sha256, key, data);

export { sha256, sha512 };

/** AES-256-CBC — paired with a separate HMAC-SHA256 MAC (see doubleRatchet.ts), matching Signal's actual construction rather than AES-GCM. */
export const aesCbcEncrypt = (key: Uint8Array, iv: Uint8Array, plaintext: Uint8Array): Uint8Array =>
    cbc(key, iv).encrypt(plaintext);

export const aesCbcDecrypt = (key: Uint8Array, iv: Uint8Array, ciphertext: Uint8Array): Uint8Array =>
    cbc(key, iv).decrypt(ciphertext);

export const concatBytes = (...arrays: Uint8Array[]): Uint8Array => {
    const total = arrays.reduce((sum, a) => sum + a.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const a of arrays) {
        out.set(a, offset);
        offset += a.length;
    }
    return out;
};

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export const bytesToBase64 = (bytes: Uint8Array): string => {
    let result = "";
    for (let i = 0; i < bytes.length; i += 3) {
        const b0 = bytes[i];
        const b1 = bytes[i + 1];
        const b2 = bytes[i + 2];
        result += BASE64_CHARS[b0 >> 2];
        result += BASE64_CHARS[((b0 & 3) << 4) | (b1 === undefined ? 0 : b1 >> 4)];
        result += b1 === undefined ? "=" : BASE64_CHARS[((b1 & 15) << 2) | (b2 === undefined ? 0 : b2 >> 6)];
        result += b2 === undefined ? "=" : BASE64_CHARS[b2 & 63];
    }
    return result;
};

export const base64ToBytes = (base64: string): Uint8Array => {
    const clean = base64.replace(/=+$/, "");
    const bytes: number[] = [];
    let buffer = 0;
    let bits = 0;
    for (const char of clean) {
        const value = BASE64_CHARS.indexOf(char);
        if (value === -1) continue;
        buffer = (buffer << 6) | value;
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            bytes.push((buffer >> bits) & 0xff);
        }
    }
    return new Uint8Array(bytes);
};

export const bytesToHex = (bytes: Uint8Array): string =>
    Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
