/**
 * The zero-knowledge push payload shape from the ticket — exactly what a
 * real server would send through APNs/FCM. See
 * docs/architecture/encrypted-push.md for why the actual native decryptors
 * (iOS Notification Service Extension, Android background worker) that
 * would consume this on-device aren't buildable in this environment.
 */
export interface IEncryptedPushPayload {
    recipient_id: string;
    session_id: string;
    /** Base64 Double Ratchet ciphertext envelope — see e2ee-crypto.md's IRatchetEnvelope. */
    encrypted_payload: string;
    /** Base64 nonce/IV — redundant with the envelope's own IV field, kept at the top level so a native extension can read it without fully parsing the envelope first. */
    nonce: string;
    /** Groups/replaces prior notifications for the same conversation (APNs `apns-collapse-id` / FCM `collapse_key`). */
    collapse_key: string;
}

/**
 * What a real server would build and send as the push payload — the
 * client-side half of "zero sender names, zero plaintext body" is just
 * making sure this is the *only* thing ever handed to the push API, never
 * the raw message.
 */
export const buildEncryptedPushPayload = (
    recipientId: string,
    conversationId: string,
    encryptedEnvelopeJson: string,
    nonceBase64: string
): IEncryptedPushPayload => ({
    recipient_id: recipientId,
    session_id: conversationId,
    encrypted_payload: encryptedEnvelopeJson,
    nonce: nonceBase64,
    collapse_key: `chat_conv_${conversationId}`,
});

export const isEncryptedPushPayload = (value: unknown): value is IEncryptedPushPayload => {
    if (!value || typeof value !== "object") return false;
    const payload = value as Record<string, unknown>;
    return (
        typeof payload.recipient_id === "string" &&
        typeof payload.session_id === "string" &&
        typeof payload.encrypted_payload === "string" &&
        typeof payload.nonce === "string" &&
        typeof payload.collapse_key === "string"
    );
};
