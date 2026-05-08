## 5.3) Data Dictionary and Table Design

> **Note:** This section has been split into two separate documents for clarity:
>
> - **[section_5_3a_data_dictionary.md](section_5_3a_data_dictionary.md)** — Field-level definitions (data types, constraints, descriptions) for all collections and the in-memory store.
> - **[section_5_3b_table_design.md](section_5_3b_table_design.md)** — Structural table design with Mermaid ER diagrams for each collection and a combined relationship diagram.


### 5.3.1) Users Collection

```mermaid
erDiagram
    USERS {
        ObjectId _id PK "MongoDB unique document identifier"
        String username UK "Unique, required, trimmed, 3-20 chars"
        String email UK "Unique, required, lowercase, trimmed"
        String password "Required, bcrypt-hashed, min 6 chars"
        String avatar "Default empty, URL to uploaded image"
        Boolean isOnline "Default false, true on Socket.IO connection"
        ObjectId_Array contacts "List of mutually accepted contact IDs ($addToSet)"
        String publicKey "ECDH public key in JWK format string for E2E"
        Date createdAt "Auto-generated Account creation timestamp"
        Date updatedAt "Auto-generated Last profile update timestamp"
    }
```

**Indexes:** `{ username: 1, unique: true }`, `{ email: 1, unique: true }`
**Mongoose Hooks:** `post('findOneAndDelete')` and `post('deleteOne')` cascade contact removal.

---

### 5.3.2) Messages Collection

```mermaid
erDiagram
    MESSAGES {
        ObjectId _id PK "Unique message identifier"
        String conversationId "Indexed, for DMs: deterministic sorted user IDs"
        ObjectId groupId FK "For group messages only (null for DMs)"
        ObjectId sender FK "The user who sent this message"
        String text "Message body text; max 500 chars"
        String fileUrl "Optional, URL to uploaded file attachment"
        String fileName "Optional, sanitized original filename"
        String fileType "Optional, MIME type of uploaded file"
        Number fileSize "Optional, File size in bytes"
        ObjectId_Array deletedFor "Soft delete tracking for specific users"
        String status "Enum: sent | delivered | read"
        ObjectId_Array readBy "Tracks which users have read this message"
        Date createdAt "Message creation timestamp"
        Date updatedAt "Last modification timestamp"
    }
```

**Indexes:** `{ conversationId: 1 }`
**Design Note:** Private (ephemeral) messages are NOT stored in this collection. They live only in RAM via `privateStore.js`.

---

### 5.3.3) Groups Collection

```mermaid
erDiagram
    GROUPS {
        ObjectId _id PK "Unique group identifier"
        String name "Required, trimmed, 1-60 chars (Group display name)"
        String description "Optional, max 200 chars, default empty"
        String avatar "Default empty, URL to group avatar image"
        ObjectId creator FK "User who created group; only they can delete it"
        ObjectId_Array members "All group members (includes creator)"
        ObjectId_Array admins "Subset of members with elevated privileges"
        Date createdAt "Auto-generated Group creation timestamp"
        Date updatedAt "Auto-generated Last modification timestamp"
    }
```

---

### 5.3.4) Invitations Collection

```mermaid
erDiagram
    INVITATIONS {
        ObjectId _id PK "Unique invitation identifier"
        ObjectId from FK "User who sent the invitation"
        ObjectId to FK "User who received the invitation"
        String status "Enum: pending | accepted | declined"
        String type "Enum: normal | private | contact_request"
        Date createdAt "Auto-generated Invitation creation timestamp"
        Date updatedAt "Auto-generated Last status change timestamp"
    }
```

**Business Logic:** When sending an invitation, the system checks for a reverse pending invitation. If found, it auto-accepts and establishes mutual contact natively, avoiding duplicate invitations.

---

### 5.3.5) Sessions Collection (DM Private Sessions)

```mermaid
erDiagram
    SESSIONS {
        ObjectId _id PK "Unique private session identifier"
        String conversationId "Links session to a specific DM conversation"
        ObjectId_Array participants "Exactly 2 users in this private session"
        String status "Enum: active | ended (Only 1 active per DM allowed)"
        ObjectId startedBy FK "User who initiated the private session"
        Date createdAt "Auto-generated Session start timestamp"
        Date updatedAt "Auto-generated Session end timestamp"
    }
```

---

### 5.3.6) GroupSessions Collection (Group Private Sessions)

```mermaid
erDiagram
    GROUPSESSIONS {
        ObjectId _id PK "Unique group session identifier"
        ObjectId groupId FK "The group this private session belongs to"
        ObjectId_Array participants "Copied from Group.members on creation"
        String status "Enum: active | ended (Ended by admins or starter)"
        ObjectId startedBy FK "Admin who started this private session"
        Date createdAt "Auto-generated Session start timestamp"
        Date updatedAt "Auto-generated Session end timestamp"
    }
```

---

### 5.3.7) VerificationCodes Collection

```mermaid
erDiagram
    VERIFICATIONCODES {
        ObjectId _id PK "Unique document identifier"
        String email "Required, lowercase email address for OTP"
        String code "Required, 6-digit numeric verification code"
        Date expiresAt "Required, TTL Index for auto-purge (10 mins)"
        Date createdAt "Auto-generated Document creation timestamp"
        Date updatedAt "Auto-generated Last update timestamp"
    }
```

**TTL Auto-Purge:** The `expiresAt` field uses MongoDB's background TTL thread to automatically delete the document when the time expires, eliminating the need for a scheduled cleanup job.

---

### 5.3.8) Private Message In-Memory Store (NOT a MongoDB Collection)

Private messages are deliberately excluded from MongoDB. They are stored in a server-side JavaScript `Map` defined in `socket/privateStore.js`.

```mermaid
erDiagram
    PRIVATESTORE_MAP {
        String sessionId PK "Map Key mapping to an Array of Private Messages"
        String _messageId "UUID generated via crypto.randomUUID()"
        Object sender "Sender identification (Object { _id, username })"
        String text "Message text content"
        String fileUrl "Optional URL to securely uploaded ephemeral file"
        String fileName "Optional sanitized original filename"
        String fileType "Optional MIME type"
        Number fileSize "Optional File size in bytes"
        Boolean isPrivate "Always true; triggers ephemeral UI styling"
        String createdAt "Creation timestamp as ISO 8601 String"
    }
```

**Lifecycle:** Created on session start → populated during session → completely destroyed (`Map.delete(sessionId)`) on session end, socket disconnect, page unload, or server restart. Associated files on disk are also deleted via `fs.unlink()`.

---

### 5.3.9) Data Model Design Decisions

1. **Deterministic Conversation ID:** DM conversations are identified by a computed string (`[smallerUserId]_[largerUserId]`) rather than a separate structured Collection, eliminating lookup tables.
2. **Polymorphic Message Collection:** A single `messages` collection stores both DM and group messages, simplifying querying and streaming.
3. **Soft Delete via Array:** The `deletedFor` array enables per-user message visibility efficiently without duplicating data or breaking shared logs.
4. **Embedded Arrays over Junction Tables:** MongoDB favours embedding related IDs directly in documents rather than relying on junction SQL-style collections.
5. **RAM-Only Private Store:** Provides the strongest guarantee of ephemerality by avoiding the database completely.
