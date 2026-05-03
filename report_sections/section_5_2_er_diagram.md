## 5.2) ER Diagram

The following Mermaid code describes the Entity-Relationship diagram for the Privacy Chat MongoDB collections. Each entity maps directly to a Mongoose schema defined in the `backend/models/` directory. Field names, types, and constraints correspond exactly to the implemented codebase.

```mermaid
erDiagram
    USERS {
        ObjectId _id PK
        String username UK "unique, 3-20 chars, trimmed"
        String email UK "unique, lowercase, trimmed"
        String password "bcrypt hash, min 6 chars"
        String avatar "URL to uploaded image, default empty"
        Boolean isOnline "default false"
        ObjectId_Array contacts "refs User, self-referencing"
        DateTime createdAt "auto-generated"
        DateTime updatedAt "auto-generated"
    }

    MESSAGES {
        ObjectId _id PK
        String conversationId "indexed, for DMs: sorted userId1_userId2"
        ObjectId groupId FK "refs Group, null for DMs"
        ObjectId sender FK "refs User, required"
        String text "default empty, max 500 chars"
        String fileUrl "optional, URL to uploaded file"
        String fileName "optional, sanitized original name"
        String fileType "optional, MIME type"
        Number fileSize "optional, bytes"
        ObjectId_Array deletedFor "refs User, soft delete tracking"
        String status "enum: sent | delivered | read"
        ObjectId_Array readBy "refs User, read receipt tracking"
        DateTime createdAt "auto-generated"
        DateTime updatedAt "auto-generated"
    }

    GROUPS {
        ObjectId _id PK
        String name "required, 1-60 chars, trimmed"
        String description "optional, max 200 chars"
        String avatar "URL, default empty"
        ObjectId creator FK "refs User, required"
        ObjectId_Array members "refs User"
        ObjectId_Array admins "refs User"
        DateTime createdAt "auto-generated"
        DateTime updatedAt "auto-generated"
    }

    INVITATIONS {
        ObjectId _id PK
        ObjectId from FK "refs User, required"
        ObjectId to FK "refs User, required"
        String status "enum: pending | accepted | declined"
        String type "enum: normal | private | contact_request"
        DateTime createdAt "auto-generated"
        DateTime updatedAt "auto-generated"
    }

    SESSIONS {
        ObjectId _id PK
        String conversationId "required, same format as Message"
        ObjectId_Array participants "refs User, exactly 2"
        String status "enum: active | ended"
        ObjectId startedBy FK "refs User"
        DateTime createdAt "auto-generated"
        DateTime updatedAt "auto-generated"
    }

    GROUPSESSIONS {
        ObjectId _id PK
        ObjectId groupId FK "refs Group, required"
        ObjectId_Array participants "refs User, copied from Group.members"
        String status "enum: active | ended"
        ObjectId startedBy FK "refs User"
        DateTime createdAt "auto-generated"
        DateTime updatedAt "auto-generated"
    }

    VERIFICATIONCODES {
        ObjectId _id PK
        String email "required, indexed, lowercase"
        String code "required, 6-digit numeric"
        DateTime expiresAt "TTL index, 10 min from creation"
        DateTime createdAt "auto-generated"
        DateTime updatedAt "auto-generated"
    }

    USERS ||--o{ MESSAGES : "sends (via sender)"
    USERS }o--o{ USERS : "contacts (self-referencing M:M)"
    USERS ||--o{ INVITATIONS : "sends (via from)"
    USERS ||--o{ INVITATIONS : "receives (via to)"
    USERS }o--o{ GROUPS : "member of (via members[])"
    USERS ||--o{ GROUPS : "creates (via creator)"
    USERS }o--o{ SESSIONS : "participates in"
    USERS }o--o{ GROUPSESSIONS : "participates in"
    GROUPS ||--o{ MESSAGES : "contains (via groupId)"
    GROUPS ||--o{ GROUPSESSIONS : "has (via groupId)"
    USERS }o--o{ MESSAGES : "soft-deleted for (via deletedFor[])"
    USERS }o--o{ MESSAGES : "read by (via readBy[])"
```

### Relationship Descriptions

1. User ↔ User (Many-to-Many, self-referencing via `contacts` array): A user can have many contacts; each contact is also a user. This is a mutual, bidirectional relationship — when User A accepts User B's invitation, both users' `contacts` arrays are updated using the `$addToSet` operator to prevent duplicates.

2. User → Message (One-to-Many via `sender`): Each message has exactly one sender. A user can send an unlimited number of messages across multiple conversations and groups.

3. User → Message (Many-to-Many via `deletedFor`): The `deletedFor` array enables per-user soft deletion. When a user deletes a message "for me," their ObjectId is appended to this array. Queries filter messages where the requesting user's ID appears in `deletedFor`, rendering the message invisible to that user while preserving it for other participants.

4. User → Message (Many-to-Many via `readBy`): The `readBy` array tracks which users have read a given message, enabling read receipt functionality. The `status` field (`sent` → `delivered` → `read`) provides a summary status for UI display (single checkmark, double checkmark, blue checkmark).

5. User → Group (One-to-Many via `creator`): Each group has exactly one creator who cannot leave the group and is the only user authorized to delete it.

6. User ↔ Group (Many-to-Many via `members` and `admins`): The `members` array tracks all group participants, while the `admins` array (a subset of members) governs which users can add/remove members, edit group info, and start private sessions.

7. User → Invitation (One-to-Many via `from` and `to`): Invitations are directional — one user sends (`from`) and another receives (`to`). The system detects reverse pending invitations (where the target has already invited the sender) and auto-accepts them to establish mutual contact.

8. Group → Message (One-to-Many via `groupId`): Group messages use the `groupId` field instead of `conversationId`. The Message collection is polymorphic — DM messages have `conversationId` set and `groupId` null; group messages have `groupId` set and `conversationId` null.

9. Group → GroupSession (One-to-Many via `groupId`): Each group can have multiple private sessions over time, but only one can be `active` at any given moment.

10. Session (DM Private Sessions): The `Session` model tracks 1:1 private sessions using a `conversationId` (identical format to `Message.conversationId`) and a `participants` array containing exactly two user ObjectIds.

> Note on Private Messages: Private messages are deliberately excluded from the ER diagram because they are never persisted to MongoDB. They exist exclusively in a server-side JavaScript `Map<sessionId, Array<messageObject>>` (defined in `socket/privateStore.js`) and are irrecoverably destroyed when the session ends.
