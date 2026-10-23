// ChatboxFirebaseMessagingService.kt — Reference implementation for the
// ticket's Android background decryption worker. NOT part of this repo's
// build: it needs a real Firebase project (google-services.json — see
// docs/architecture/push-notifications.md for why none exists here) and a
// native Android module registered in this Expo project's (currently
// nonexistent, since this is a managed-workflow project) android/ directory.
// See docs/architecture/encrypted-push.md.
//
// Shows the integration shape FirebaseMessagingService requires —
// onMessageReceived, building the decrypted notification, dispatching to
// NotificationManager — with the actual decryption represented by calls
// into a not-yet-written ChatboxCrypto Kotlin object (a port of
// doubleRatchet.ts + x3dh.ts to the Android Keystore + javax.crypto APIs).

package com.cykrome.chatbox

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

private const val CHANNEL_ID = "messages"

class ChatboxFirebaseMessagingService : FirebaseMessagingService() {

    // Ticket requirement: "Decrypt ciphertext using Android Keystore keys in
    // a foreground service worker before dispatching notification to the
    // NotificationManager" — high-priority data messages wake this handler
    // even while the app process isn't running, same guarantee APNs'
    // background push + the iOS NSE provide.
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        // The data payload is strictly ciphertext — see
        // encryptedPushPayload.ts's IEncryptedPushPayload for the exact
        // shape the server sends. No sender name or message text is ever
        // present in `remoteMessage.data` before this point.
        val sessionId = remoteMessage.data["session_id"] ?: return
        val encryptedPayload = remoteMessage.data["encrypted_payload"] ?: return
        val collapseKey = remoteMessage.data["collapse_key"] ?: sessionId

        try {
            val ratchetState = ChatboxCrypto.loadRatchetState(sessionId, applicationContext)
            val decrypted = ChatboxCrypto.ratchetDecrypt(ratchetState, encryptedPayload)

            var largeIcon: android.graphics.Bitmap? = null
            decrypted.mediaEnvelope?.let { mediaEnvelope ->
                // Mirrors mediaEncryption.ts's decryptMediaFile: download the
                // ciphertext blob, AES-256-GCM decrypt (auth tag verified as
                // part of decrypt), decode into a Bitmap for the notification's
                // large icon / big-picture style.
                largeIcon = ChatboxCrypto.decryptMediaThumbnail(mediaEnvelope)
            }

            ChatboxCrypto.saveRatchetState(ratchetState, sessionId, applicationContext)

            showNotification(sessionId, collapseKey, decrypted.senderDisplayName, decrypted.plaintext, largeIcon)
        } catch (e: Exception) {
            // Fail closed — never fall back to showing anything derived
            // from the ciphertext itself.
            showNotification(sessionId, collapseKey, "New message", "You have a new message", null)
        }
    }

    // Real APNs/FCM device token registration (the other half of Push
    // Notifications, #34) — this would POST the refreshed token to a
    // backend, which doesn't exist in this repo. See
    // docs/architecture/push-notifications.md.
    override fun onNewToken(token: String) {
        // no-op reference: a real deployment posts `token` to a backend here.
    }

    private fun showNotification(
        conversationId: String,
        groupKey: String,
        title: String,
        body: String,
        largeIcon: android.graphics.Bitmap?
    ) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.createNotificationChannel(
            NotificationChannel(CHANNEL_ID, "Messages", NotificationManager.IMPORTANCE_HIGH)
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(body)
            .setGroup(groupKey)
            .setLargeIcon(largeIcon)
            .setSmallIcon(R.drawable.notification_icon)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            // "Interactive Quick Reply via Extension" — a RemoteInput action
            // wired to a BroadcastReceiver that calls ChatboxCrypto's
            // ratchet-encrypt + an HTTPS POST directly, the same
            // no-JS-engine-required path the iOS NSE reference takes.
            .addAction(buildReplyAction(conversationId))
            .build()

        manager.notify(conversationId.hashCode(), notification)
    }

    private fun buildReplyAction(conversationId: String): NotificationCompat.Action {
        val remoteInput = androidx.core.app.RemoteInput.Builder("reply_text")
            .setLabel("Message…")
            .build()

        val replyIntent = android.content.Intent(this, ChatboxReplyReceiver::class.java).apply {
            putExtra("conversationId", conversationId)
        }
        val pendingIntent = android.app.PendingIntent.getBroadcast(
            this,
            conversationId.hashCode(),
            replyIntent,
            android.app.PendingIntent.FLAG_MUTABLE or android.app.PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Action.Builder(0, "Reply", pendingIntent)
            .addRemoteInput(remoteInput)
            .build()
    }
}
