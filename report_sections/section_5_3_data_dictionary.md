## 5.3) Data Dictionary and Data Model

### 5.3.1) Users Collection

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `_id` | ObjectId | PK, auto-generated | MongoDB unique document identifier |
| `username` | String | Unique, required, trimmed, 3–20 chars | User's chosen display name |
| `email` | String | Unique, required, lowercase, trimmed | Email address used for login and OTP delivery |
| `password` | String | Required, min 6 chars | bcrypt-hashed password (12 salt rounds); never returned in API responses |
| `avatar` | String | Default: `''` (empty string) | Full URL to uploaded avatar image (e.g., `https://server/uploads/avatar_userId_timestamp.jpg`) |
| `contacts` | Array of ObjectId | Refs → User | List of mutually accepted contact user IDs; managed via `$addToSet` and `$pull` operators |
| `isOnline` | Boolean | Default: `false` | Set to `true` on Socket.IO connection, `false` on disconnect; also persisted to DB for REST API accuracy |
| `createdAt` | Date | Auto-generated (Mongoose `timestamps: true`) | Account creation timestamp |
| `updatedAt` | Date | Auto-generated | Last profile update timestamp |

Indexes: `{ username: 1, unique: true }`, `{ email: 1, unique: true }`
Mongoose Hooks: `post('findOneAndDelete')` and `post('deleteOne')` cascade contact removal — when a user is deleted, their ObjectId is pulled from all other users' `contacts` arrays.

---

### 5.3.2) Messages Collection

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `_id` | ObjectId | PK, auto-generated | Unique message identifier |
| `conversationId` | String | Indexed | For DMs only: deterministic key formed by sorting two user IDs alphabetically and joining with underscore (e.g., `"64a1b2c3_64d5e6f7"`) |
| `groupId` | ObjectId | Refs → Group, optional | For group messages only; `null` for DMs. The Message collection is polymorphic — differentiated by which field is populated |
| `sender` | ObjectId | Refs → User, required | The user who sent this message |
| `text` | String | Default: `''`, max 500 chars | Message body text; can be empty when sending file-only messages |
| `fileUrl` | String | Optional | Full server URL path to the uploaded file (e.g., `https://server/uploads/1711234567-987654321.pdf`) |
| `fileName` | String | Optional | Sanitized original filename (special characters replaced with underscores) |
| `fileType` | String | Optional | MIME type of the uploaded file (e.g., `image/jpeg`, `application/pdf`) |
| `fileSize` | Number | Optional | File size in bytes |
| `deletedFor` | Array of ObjectId | Refs → User | Soft delete tracking: when a user selects "delete for me," their ObjectId is appended here. Queries use `{ deletedFor: { $ne: userId } }` to filter |
| `status` | String | Enum: `'sent'` \| `'delivered'` \| `'read'`, default: `'sent'` | Read receipt status displayed as checkmarks in the UI |
| `readBy` | Array of ObjectId | Refs → User | Tracks which users have read this message; updated via `$addToSet` when a read receipt is sent |
| `createdAt` | Date | Auto-generated | Message creation timestamp (used for chronological sorting) |
| `updatedAt` | Date | Auto-generated | Last modification timestamp |

Indexes: `{ conversationId: 1 }`
Design Note: Private (ephemeral) messages are NOT stored in this collection. The comment in the schema explicitly states: "isPrivate is NOT stored here — private messages never touch the DB. They live only in RAM via privateStore.js."

---

### 5.3.3) Groups Collection

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `_id` | ObjectId | PK, auto-generated | Unique group identifier |
| `name` | String | Required, trimmed, 1–60 chars | Group display name |
| `description` | String | Optional, max 200 chars, default: `''` | Group description text |
| `avatar` | String | Default: `''` | URL to group avatar image |
| `creator` | ObjectId | Refs → User, required | The user who created this group; only this user can delete the group |
| `members` | Array of ObjectId | Refs → User | All group members including the creator; creator is always included via deduplication logic |
| `admins` | Array of ObjectId | Refs → User | Subset of members with elevated privileges (add/remove members, edit group info, start private sessions) |
| `createdAt` | Date | Auto-generated | Group creation timestamp |
| `updatedAt` | Date | Auto-generated | Last modification timestamp |

---

### 5.3.4) Invitations Collection

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `_id` | ObjectId | PK, auto-generated | Unique invitation identifier |
| `from` | ObjectId | Refs → User, required | The user who sent the invitation |
| `to` | ObjectId | Refs → User, required | The user who received the invitation |
| `status` | String | Enum: `'pending'` \| `'accepted'` \| `'declined'`, default: `'pending'` | Current lifecycle state of the invitation |
| `type` | String | Enum: `'normal'` \| `'private'` \| `'contact_request'`, default: `'normal'` | Purpose classification; all types result in mutual contact addition on acceptance |
| `createdAt` | Date | Auto-generated | Invitation creation timestamp |
| `updatedAt` | Date | Auto-generated | Last status change timestamp |

Business Logic: When sending an invitation, the system checks for a reverse pending invitation (where the target has already invited the sender). If found, it auto-accepts the reverse invitation and adds both users as mutual contacts, avoiding duplicate invitations.

---

### 5.3.5) Sessions Collection (DM Private Sessions)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `_id` | ObjectId | PK, auto-generated | Unique session identifier |
| `conversationId` | String | Required | Same format as `Message.conversationId` — links the session to a specific DM conversation |
| `participants` | Array of ObjectId | Refs → User, exactly 2 entries | The two users in this private session |
| `status` | String | Enum: `'active'` \| `'ended'`, default: `'active'` | Lifecycle state; only one `active` session per `conversationId` is allowed at a time |
| `startedBy` | ObjectId | Refs → User | The user who initiated the private session |
| `createdAt` | Date | Auto-generated | Session start timestamp |
| `updatedAt` | Date | Auto-generated | Session end timestamp (when status changes to `'ended'`) |

---

### 5.3.6) GroupSessions Collection (Group Private Sessions)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `_id` | ObjectId | PK, auto-generated | Unique group session identifier |
| `groupId` | ObjectId | Refs → Group, required | The group this private session belongs to |
| `participants` | Array of ObjectId | Refs → User | Copied from `Group.members` at session creation time |
| `status` | String | Enum: `'active'` \| `'ended'`, default: `'active'` | Lifecycle state; only admins or the session starter can end it |
| `startedBy` | ObjectId | Refs → User | The admin who started this private session |
| `createdAt` | Date | Auto-generated | Session start timestamp |
| `updatedAt` | Date | Auto-generated | Session end timestamp |

---

### 5.3.7) VerificationCodes Collection

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `_id` | ObjectId | PK, auto-generated | Unique document identifier |
| `email` | String | Required, indexed, lowercase, trimmed | Email address the verification code was sent to |
| `code` | String | Required | 6-digit numeric verification code (e.g., `"847293"`) |
| `expiresAt` | Date | Required, TTL indexed (`expireAfterSeconds: 0`) | Expiration timestamp; defaults to 10 minutes from creation. MongoDB's TTL monitor automatically purges expired documents |
| `createdAt` | Date | Auto-generated | Document creation timestamp |
| `updatedAt` | Date | Auto-generated | Last update timestamp |

TTL Auto-Purge: The `expiresAt` field has a TTL index defined as `verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })`. When `expiresAt` passes, MongoDB's background TTL thread automatically deletes the document within approximately 60 seconds, eliminating the need for a scheduled cleanup job.

---

### 5.3.8) Private Message In-Memory Store (NOT a MongoDB Collection)

Private messages are deliberately excluded from MongoDB. They are stored in a server-side JavaScript `Map` defined in `socket/privateStore.js`:

```javascript
const privateMessages = new Map()  // sessionId → Array<MessageObject>
```

Each message object in the array has the following structure:

| Field | Type | Description |
|-------|------|-------------|
| `_id` | String | UUID generated via `crypto.randomUUID()` |
| `sender` | Object `{ _id, username }` | Sender identification (embedded, not a reference) |
| `text` | String | Message text content |
| `fileUrl` | String (optional) | URL to uploaded file (file is tracked for deletion on session end) |
| `fileName` | String (optional) | Sanitized original filename |
| `fileType` | String (optional) | MIME type |
| `fileSize` | Number (optional) | File size in bytes |
| `isPrivate` | Boolean | Always `true` — used by the frontend to apply ephemeral UI styling |
| `createdAt` | String (ISO 8601) | Creation timestamp as ISO string |

Lifecycle: Created on session start → populated during session → completely destroyed (`Map.delete(sessionId)`) on session end, socket disconnect, page unload (Beacon API), or server restart. Associated files on disk are also deleted via `fs.unlink()`.

---

### 5.3.9) Data Model Design Decisions

1. Deterministic Conversation ID: DM conversations are identified by a computed string (`[smallerUserId]_[largerUserId]`) rather than a separate Conversation collection. This eliminates a lookup table and makes the DM relationship implicit and idempotent.

2. Polymorphic Message Collection: A single `messages` collection stores both DM and group messages. DM messages populate `conversationId` (with `groupId` null); group messages populate `groupId` (with `conversationId` null). This simplifies querying and avoids schema duplication.

3. Soft Delete via Array: The `deletedFor` array enables per-user message visibility without modifying the message itself. This is more efficient than maintaining separate per-user message copies.

4. Embedded Arrays over Junction Tables: MongoDB's document model favours embedding related IDs (contacts, members, admins, readBy, deletedFor) directly in the parent document rather than using separate junction collections, reducing query complexity.

5. RAM-Only Private Store: The conscious architectural decision to use a volatile `Map` for private messages — rather than an encrypted database field or a Redis store — provides the strongest guarantee of ephemerality: private messages cannot survive any form of session termination or server restart.
