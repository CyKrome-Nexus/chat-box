# End-to-End Encryption (E2EE) & Security

## 1. Key Agreement & Signal Protocol
- **X3DH (Extended Triple Diffie-Hellman)**: Prekey bundles (Identity Key, Signed Prekey, One-Time Prekeys) stored on server; private keys preserved in hardware Keychain / Keystore.
- **Double Ratchet**: Symmetric KDF ratchet (forward secrecy) combined with DH ratchet (break-in recovery).
- **Group Sender Keys**: Single encryption per group payload distributed through pairwise 1-on-1 ratchets.

## 2. Media Encryption (AES-256-GCM)
- Media files are encrypted on-device with an ephemeral 256-bit AES-GCM key.
- Ciphertext is uploaded to object storage; decryption keys travel inside the Signal Protocol message payload.

## 3. Zero-Knowledge Push Notifications
- Push notification payloads through APNs and FCM contain only encrypted bytes.
- The iOS Notification Service Extension (NSE) and Android Background Worker decrypt messages locally before rendering system alerts.
