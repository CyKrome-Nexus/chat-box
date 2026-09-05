import { concatBytes, sha512 } from "./primitives";

const ITERATIONS = 5200; // matches Signal's actual fingerprint algorithm
const VERSION = new Uint8Array([0, 0]);

/**
 * Signal's fingerprint algorithm: iterate SHA-512 over
 * (version || identityKey || stableUserId) 5200 times, take the first 30
 * bytes of the final digest, and render as five-digit decimal chunks (6
 * chunks = 30 digits) per party. See docs/architecture/e2ee-crypto.md.
 */
const iterateFingerprint = (identityKeyMaterial: Uint8Array, userId: string): Uint8Array => {
    const userIdBytes = new TextEncoder().encode(userId);
    let hash = concatBytes(VERSION, identityKeyMaterial, userIdBytes);
    for (let i = 0; i < ITERATIONS; i++) {
        hash = sha512(concatBytes(hash, identityKeyMaterial));
    }
    return hash.slice(0, 30);
};

const bytesToDigitChunks = (bytes: Uint8Array): string => {
    let output = "";
    for (let i = 0; i < bytes.length; i += 5) {
        const chunk = bytes.slice(i, i + 5);
        let value = 0n;
        for (const byte of chunk) value = value * 256n + BigInt(byte);
        output += (value % 100000n).toString().padStart(5, "0");
    }
    return output;
};

export interface ISafetyNumberParty {
    userId: string;
    identityKeyMaterial: Uint8Array;
}

/**
 * A 60-digit safety number combining both parties' fingerprints, always in
 * the same (numerically-smaller-userId-first) order on both devices so they
 * produce an identical number to compare/scan.
 */
export const computeSafetyNumber = (me: ISafetyNumberParty, them: ISafetyNumberParty): string => {
    const [first, second] = me.userId <= them.userId ? [me, them] : [them, me];
    const firstDigits = bytesToDigitChunks(iterateFingerprint(first.identityKeyMaterial, first.userId));
    const secondDigits = bytesToDigitChunks(iterateFingerprint(second.identityKeyMaterial, second.userId));
    return firstDigits + secondDigits;
};

export const formatSafetyNumber = (digits: string): string => digits.match(/.{1,5}/g)?.join(" ") || digits;
