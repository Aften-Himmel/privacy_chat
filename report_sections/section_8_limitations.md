# Chapter 8: Limitations

Despite its comprehensive feature set, Privacy Chat has several known limitations which are documented here for completeness and to inform future development.

---

## 8.1 Security Limitations

| # | Limitation | Impact | Mitigation Path |
|---|-----------|--------|-----------------|
| 1 | No Perfect Forward Secrecy | Currently uses static ECDH keys for E2E encryption (which now successfully covers both 1:1 DMs and Group Messaging). If a user's private key is ever compromised, past intercepted messages could potentially be decrypted. | Implement the Double Ratchet algorithm (Signal Protocol) for per-message key rotation. |
| 2 | Unencrypted Metadata | While message contents are E2E encrypted across all chat modes, metadata (who is messaging whom, when, and timestamps) is stored in plaintext on the server. | Implement techniques like sealed sender or metadata obfuscation routing. |

## 8.2 Scalability Limitations

| # | Limitation | Impact | Mitigation Path |
|---|-----------|--------|-----------------|
| 3 | Single-Server Private Store | The in-memory `Map` does not support horizontal scaling. If the backend runs on multiple instances, private messages would be isolated to one instance. | Replace `Map` with Redis (without persistence) and use Socket.IO's Redis adapter for cross-instance event broadcasting. |
| 4 | File Storage on Server Disk | Files are stored on the server's filesystem (`/uploads`), which does not scale for production and is lost on Render's ephemeral filesystem redeploys. | Migrate to AWS S3 or Cloudinary for persistent, CDN-backed file hosting. |
| 5 | No Message Pagination | Messages are limited to the most recent 100 per conversation with no infinite scroll or cursor-based pagination. | Implement cursor-based pagination using MongoDB's `_id` or `createdAt` as pagination cursors. |

## 8.3 Feature Limitations

| # | Limitation | Impact | Mitigation Path |
|---|-----------|--------|-----------------|
| 6 | No Push Notifications | Users must have the browser tab open to receive updates. No browser push notifications or mobile notifications. | Integrate Web Push API (Service Workers) for background notifications. |
| 7 | No Voice/Video Calls | The platform is text and file-based only, with no real-time media communication. | Add WebRTC peer-to-peer calling with Socket.IO signalling. |
| 8 | No Message Search | No full-text search capability for finding messages within conversations. | Implement MongoDB Atlas Search or add a text index on the `text` field. |
| 9 | 5000-Character Message Limit | May be restrictive for sharing massive text dumps. | Increase limit or implement expandable message rendering. |
| 10 | Single Active Private Session | Only one private session can be active per conversation (DM or group) at a time. | Allow multiple concurrent sessions with separate session identifiers. |
| 11 | No Offline Message Queue | If a user is offline, messages are delivered only when they next load the conversation. No delivery retry mechanism or offline queue. | Implement a message queue (e.g., Redis Pub/Sub or a dedicated queue collection) for reliable delivery. |
| 12 | No Message Editing | Once sent, messages cannot be edited — only deleted. | Add an edit endpoint with version history tracking. |
