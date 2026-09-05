// NotificationService.swift — Reference implementation for the ticket's iOS
// Notification Service Extension. NOT part of this repo's build: it targets
// a second app-extension target (`ChatboxNSE`) that doesn't exist in this
// Expo-managed project, and this environment has no macOS/Xcode toolchain
// to create that target, compile, or run this file. See
// docs/architecture/encrypted-push.md for exactly what's missing and why,
// and src/lib/crypto/*.ts for the TypeScript engine this file's crypto
// calls would need to be ported to Swift/CryptoKit to actually match.
//
// This shows the *integration shape* Apple's NSE API requires — didReceive,
// the content mutation, the 30-second time budget — with the actual
// decryption represented by calls into a not-yet-written `ChatboxCrypto`
// Swift module (a port of doubleRatchet.ts + x3dh.ts). Porting the full
// Double Ratchet to Swift is its own substantial task, not attempted here.

import UserNotifications
import Security

/// Shared with the main app via the `group.com.cykrome.chatbox` App Group
/// entitlement (see plugins/withEncryptedPush.js) — the NSE reads the
/// recipient's Double Ratchet session state from the shared Keychain access
/// group, exactly as the ticket specifies ("Access the shared Keychain to
/// load the recipient's Double Ratchet decryption state").
private let appGroupIdentifier = "group.com.cykrome.chatbox"
private let keychainAccessGroup = "group.com.cykrome.chatbox"

final class NotificationService: UNNotificationServiceExtension {

    var contentHandler: ((UNNotificationContent) -> Void)?
    var bestAttemptContent: UNMutableNotificationContent?

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        self.contentHandler = contentHandler
        guard let content = (request.content.mutableCopy() as? UNMutableNotificationContent) else {
            contentHandler(request.content)
            return
        }
        self.bestAttemptContent = content

        // The push payload contains strictly ciphertext — see
        // encryptedPushPayload.ts's IEncryptedPushPayload for the exact
        // shape the server sends. No sender name or message text is ever
        // present in `request.content.userInfo` before this point.
        guard
            let sessionId = request.content.userInfo["session_id"] as? String,
            let encryptedPayload = request.content.userInfo["encrypted_payload"] as? String
        else {
            // Malformed/non-Chatbox push — fail closed with a generic alert
            // rather than exposing anything about why.
            content.title = "New message"
            content.body = "You have a new message"
            contentHandler(content)
            return
        }

        do {
            let ratchetState = try ChatboxCrypto.loadRatchetState(
                forSession: sessionId,
                keychainAccessGroup: keychainAccessGroup
            )
            let decrypted = try ChatboxCrypto.ratchetDecrypt(
                state: ratchetState,
                envelopeJson: encryptedPayload
            )

            content.title = decrypted.senderDisplayName
            content.body = decrypted.plaintext
            content.userInfo["conversationId"] = sessionId

            // "If message includes media, asynchronously fetch and decrypt
            // the thumbnail attachment and attach it to
            // UNMutableNotificationContent" — mirrors mediaEncryption.ts's
            // decryptMediaFile: download the ciphertext blob, AES-256-GCM
            // decrypt (auth tag verified as part of decrypt), write to a
            // temp file, attach.
            if let mediaEnvelope = decrypted.mediaEnvelope {
                ChatboxCrypto.decryptMediaThumbnail(mediaEnvelope) { attachment in
                    if let attachment = attachment {
                        content.attachments = [attachment]
                    }
                    // Persist the ratchet's post-decrypt state back to the
                    // shared Keychain so the main app (and the next push)
                    // continues the chain from here, not from a stale copy.
                    try? ChatboxCrypto.saveRatchetState(ratchetState, forSession: sessionId, keychainAccessGroup: keychainAccessGroup)
                    contentHandler(content)
                }
            } else {
                try? ChatboxCrypto.saveRatchetState(ratchetState, forSession: sessionId, keychainAccessGroup: keychainAccessGroup)
                contentHandler(content)
            }
        } catch {
            // Decryption failure (corrupt payload, missing/desynced ratchet
            // state) — fail closed, never fall back to showing anything
            // derived from the ciphertext itself.
            content.title = "New message"
            content.body = "You have a new message"
            contentHandler(content)
        }
    }

    /// Apple gives the extension ~30 seconds; if decryption/media fetch is
    /// about to run out of time, this fires so we can still show *something*
    /// rather than nothing.
    override func serviceExtensionTimeWillExpire() {
        if let contentHandler = contentHandler, let bestAttemptContent = bestAttemptContent {
            bestAttemptContent.title = "New message"
            bestAttemptContent.body = "You have a new message"
            contentHandler(bestAttemptContent)
        }
    }
}
