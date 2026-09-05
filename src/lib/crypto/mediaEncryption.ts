import { File, Paths } from "expo-file-system";
import { gcm } from "@noble/ciphers/aes.js";

import { bytesToBase64, base64ToBytes, bytesToHex, randomBytes, sha256 } from "./primitives";

export interface IEncryptedMediaEnvelope {
    /** Local uri standing in for the ciphertext blob a real deployment would upload to object storage (Cloudflare R2 / S3) — see e2ee-media.md. */
    cipherUri: string;
    key: string; // base64, 256-bit
    iv: string; // base64, 96-bit
    sha256: string; // hex digest of the *plaintext*, verified after decrypt
    size: number; // plaintext byte length
}

/**
 * Step 1-3 of the ticket's media pipeline: generates an ephemeral AES-256
 * key + 96-bit IV, encrypts the file with AES-256-GCM (the auth tag is
 * appended to the ciphertext by `@noble/ciphers`' `gcm()`, exactly like the
 * standard AEAD construction), and writes the ciphertext to a local file —
 * standing in for the "ciphertext blob" a real deployment would upload via a
 * presigned URL, since this repo has no object storage server.
 */
export const encryptMediaFile = async (uri: string): Promise<IEncryptedMediaEnvelope> => {
    const plaintext = await new File(uri).bytes();
    const key = randomBytes(32);
    const iv = randomBytes(12);

    const ciphertext = gcm(key, iv).encrypt(plaintext);

    const cipherFile = new File(Paths.cache, `enc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.bin`);
    cipherFile.create({ overwrite: true });
    cipherFile.write(ciphertext);

    return {
        cipherUri: cipherFile.uri,
        key: bytesToBase64(key),
        iv: bytesToBase64(iv),
        sha256: bytesToHex(sha256(plaintext)),
        size: plaintext.length,
    };
};

/**
 * Step 5: downloads (here: reads the local stand-in file), verifies the GCM
 * auth tag (an `@noble/ciphers` `decrypt()` call throws if the tag doesn't
 * match — a tampered/corrupted ciphertext is rejected automatically, not by
 * a separate manual check) and the SHA-256 hash, then writes the verified
 * plaintext to a fresh local file and returns its uri.
 */
export const decryptMediaFile = async (envelope: IEncryptedMediaEnvelope): Promise<string> => {
    const ciphertext = await new File(envelope.cipherUri).bytes();
    const key = base64ToBytes(envelope.key);
    const iv = base64ToBytes(envelope.iv);

    const plaintext = gcm(key, iv).decrypt(ciphertext); // throws on auth-tag mismatch

    const actualHash = bytesToHex(sha256(plaintext));
    if (actualHash !== envelope.sha256) {
        throw new Error("Decrypted media failed SHA-256 verification — file may be corrupted or tampered with.");
    }

    const plainFile = new File(Paths.cache, `dec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    plainFile.create({ overwrite: true });
    plainFile.write(plaintext);
    return plainFile.uri;
};
