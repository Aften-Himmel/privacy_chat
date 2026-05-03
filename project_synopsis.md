# Privacy Chat — Detailed Project Synopsis

---

## 1. Introduction

**Privacy Chat** is a full-stack, real-time web-based messaging application built with a strong emphasis on user privacy. Unlike conventional chat platforms that store every message permanently on servers, Privacy Chat introduces a dual-mode messaging architecture: a **Normal Mode** where messages are persisted in a MongoDB database, and a **Private Mode** where messages exist exclusively in server RAM and are permanently destroyed when the session ends, the user disconnects, or the server restarts.

The application supports **one-to-one (DM) messaging**, **group chat**, **file sharing** (images, documents, audio, video up to 100 MB), **real-time typing indicators**, **read receipts**, **unread message badges**, **message deletion** (delete for me / delete for everyone), **invitation-based contact management**, **email-verified registration**, **password recovery**, **user profile management** (avatar upload, username change, password change), and **dark mode**.

The system is deployed as a decoupled architecture: the **backend** is a Node.js/Express REST API + Socket.IO WebSocket server deployed on **Render**, and the **frontend** is a React single-page application (SPA) built with **Vite** and deployed on **Vercel** (or Render Static Site).

**Project Name:** Privacy Chat  
**Platform:** Web (Browser-based)  
**Backend Stack:** Node.js, Express 5, MongoDB (Mongoose 9), Socket.IO 4  
**Frontend Stack:** React 19, Vite 7, Tailwind CSS 4, React Router 7, Axios  
**Deployment:** Render (backend), Vercel/Render (frontend)

---

## 2. Survey of Technology

### 2.1 Frontend Technologies

| Technology | Version | Purpose |
|---|---|---|
| **React** | 19.2 | Core UI library using functional components and hooks (useState, useEffect, useRef, useCallback, useContext) |
| **Vite** | 7.3 | Build tool and dev server; provides fast HMR (Hot Module Replacement) and optimized production bundling |
| **React Router DOM** | 7.13 | Client-side routing with nested routes, protected route wrappers, and URL parameter extraction |
| **Tailwind CSS** | 4.2 | Utility-first CSS framework for responsive, modern styling with dark mode support via `data-theme` attribute |
| **Axios** | 1.13 | HTTP client with request/response interceptors for automatic JWT token attachment and 401 redirect handling |
| **Socket.IO Client** | 4.8 | WebSocket client for real-time bidirectional communication (messages, typing indicators, notifications, online status) |

### 2.2 Backend Technologies

| Technology | Version | Purpose |
|---|---|---|
| **Node.js** | 18+ (LTS) | JavaScript runtime for the server |
| **Express** | 5.2 | Web framework for REST API routing, middleware, static file serving |
| **MongoDB** | Cloud (Atlas) | NoSQL document database for storing users, messages, groups, invitations, sessions |
| **Mongoose** | 9.2 | ODM (Object Document Mapper) providing schemas, validation, indexing, population, and middleware hooks |
| **Socket.IO** | 4.8 | WebSocket server for real-time events: message delivery, typing indicators, online presence, session notifications |
| **JSON Web Token (jsonwebtoken)** | 9.0 | Stateless authentication; tokens contain user ID and username with 7-day expiry |
| **bcrypt** | 6.0 | Password hashing with salt rounds of 12 for secure credential storage |
| **Multer** | 2.1 | Multipart form-data handling for file uploads (avatars and chat files) with MIME type filtering |
| **Nodemailer** | 8.0 | Email sending for verification codes and password reset via SMTP (Gmail or Ethereal fallback) |
| **Helmet** | 8.1 | HTTP security headers (Content-Security-Policy, X-Frame-Options, etc.) |
| **express-rate-limit** | 8.3 | Rate limiting on authentication routes (20 requests per 15-minute window) |
| **dotenv** | 17.3 | Environment variable management from `.env` files |
| **cors** | 2.8 | Cross-Origin Resource Sharing configuration for frontend-backend communication |
| **crypto** (Node built-in) | — | UUID generation for private session messages |

### 2.3 Database

- **MongoDB Atlas** (cloud-hosted) — chosen for its flexible document schema, horizontal scalability, and native support for array fields (contacts, members, readBy, deletedFor).
- **TTL Indexes** — used on the `VerificationCode` collection so MongoDB automatically purges expired codes.
- **Compound Indexes** — `conversationId` and `email` fields are indexed for query performance.

### 2.4 Deployment & DevOps

| Service | Role |
|---|---|
| **Render** | Backend hosting (Node.js web service), automatic deploys from Git, environment variable management |
| **Vercel** | Frontend hosting (static SPA), automatic builds from Git, rewrite rules for SPA routing |
| **Git/GitHub** | Version control and CI/CD integration |

---

## 3. Requirement Analysis

### 3.1 Problem Definition

Modern messaging applications (WhatsApp, Telegram, Discord) store all user conversations permanently on centralized servers. Even "disappearing messages" features in these platforms are controlled by timers and can be backed up or forwarded. Users who need truly ephemeral, private conversations — for sensitive business discussions, personal matters, or whistleblowing — have no guarantee that their messages are not being logged, cached, or made available to third parties.

**Privacy Chat addresses this gap** by providing a verifiably ephemeral messaging mode where private messages are held only in volatile server memory (RAM), never written to any database, and are irrecoverably destroyed the moment the private session ends. This gives users a tangible, architectural guarantee of privacy rather than a policy-based promise.

### 3.2 Drawbacks of Existing Systems

1. **Permanent Server-Side Storage:** WhatsApp, Telegram, and most platforms store all messages on their servers indefinitely, creating a large attack surface for data breaches.
2. **Cloud Backups Undermine Encryption:** Even end-to-end encrypted apps like WhatsApp have cloud backup options (Google Drive, iCloud) which store messages in plaintext or with weak encryption.
3. **Metadata Retention:** Even with E2E encryption, platforms retain metadata (who talked to whom, when, how often), which can be subpoenaed or leaked.
4. **Timer-Based Disappearing Messages Are Unreliable:** Disappearing message features use client-side timers — the recipient can screenshot, forward, or use modified clients to bypass them.
5. **No True Ephemeral Mode:** No mainstream platform offers a mode where messages are architecturally incapable of being persisted.
6. **No Invitation-Based Contact System:** Most platforms allow anyone with your phone number to message you, leading to spam and unsolicited contact.
7. **Limited Group Privacy Controls:** Group chats lack ephemeral/private session modes entirely.

### 3.3 Requirement Specification

#### 3.3.1 Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | User registration with email verification (6-digit OTP via SMTP) | High |
| FR-02 | User login with email and password, JWT-based authentication | High |
| FR-03 | Password recovery via email verification code | High |
| FR-04 | Invitation-based contact system (send, accept, decline invitations) | High |
| FR-05 | One-to-one (DM) text messaging with 500-character limit | High |
| FR-06 | Group chat with text messaging (create, join, leave, member management) | High |
| FR-07 | Private/Ephemeral messaging mode for DMs (RAM-only, session-based) | High |
| FR-08 | Private/Ephemeral messaging mode for Groups (admin-initiated) | High |
| FR-09 | File sharing in DMs and groups (images, docs, audio, video; up to 100MB) | Medium |
| FR-10 | File sharing in private mode (files auto-deleted when session ends) | Medium |
| FR-11 | Real-time typing indicators for DMs and groups | Medium |
| FR-12 | Read receipts (sent → delivered → read status with checkmarks) | Medium |
| FR-13 | Unread message badges on contact/group list | Medium |
| FR-14 | Message deletion: "delete for me" and "delete for everyone" | Medium |
| FR-15 | User profile management (avatar upload, username change, password change) | Medium |
| FR-16 | Online/offline status indicator with real-time updates | Medium |
| FR-17 | User search by username for sending invitations | Medium |
| FR-18 | Contact removal with mutual cleanup (chat history and files deleted) | Medium |
| FR-19 | Dark mode / Light mode toggle with persistence | Low |
| FR-20 | Notification bell with real-time alerts for messages, invitations, and session events | Medium |
| FR-21 | Automatic session cleanup on tab close (via Beacon API) | Medium |
| FR-22 | Group admin controls (add/remove members, edit group info, delete group) | Medium |

#### 3.3.2 Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-01 | Response time under 200ms for API calls under normal load |
| NFR-02 | WebSocket message delivery latency under 100ms |
| NFR-03 | Support for concurrent users via Socket.IO's event-driven architecture |
| NFR-04 | Security: bcrypt password hashing (12 salt rounds), JWT with 7-day expiry, Helmet HTTP headers, rate limiting |
| NFR-05 | Cross-browser compatibility (Chrome, Firefox, Edge, Safari) |
| NFR-06 | Responsive design for desktop and mobile viewports |
| NFR-07 | CORS enforcement restricting API access to the frontend domain only |
| NFR-08 | File upload security: MIME type whitelist, filename sanitization, file size limits |

### 3.4 Feasibility Study

#### 3.4.1 Technical Feasibility
All technologies used (Node.js, React, MongoDB, Socket.IO) are mature, well-documented, and open-source. The ephemeral messaging feature is implemented using Node.js's native `Map` data structure for in-memory storage, which is a standard, proven approach. File uploads use Multer, a widely-used multipart handler. The technical stack is well-suited for real-time applications.

#### 3.4.2 Economic Feasibility
The entire stack is built on free/open-source technologies. Render and Vercel offer free-tier hosting sufficient for development and small-scale deployment. MongoDB Atlas provides a free 512MB shared cluster. The only potential cost is SMTP service for email verification (Gmail SMTP is free for low volume; Ethereal provides a free testing fallback).

#### 3.4.3 Operational Feasibility
The application runs entirely in a web browser, requiring no installation. Users need only a modern browser and internet connection. The invitation-based system reduces spam and unwanted contacts. Dark mode and responsive design improve usability across devices.

### 3.5 Planning and Scheduling

| Phase | Duration | Activities |
|---|---|---|
| **Phase 1: Core Foundation** | Week 1-2 | Project setup, User authentication (register, login, JWT), MongoDB integration, basic API structure |
| **Phase 2: Messaging** | Week 3-4 | Contact management, DM messaging, real-time Socket.IO integration, message persistence |
| **Phase 3: Privacy Features** | Week 5-6 | Private session architecture, RAM-only message store, session lifecycle management, Beacon API cleanup |
| **Phase 4: Groups** | Week 7-8 | Group CRUD, group messaging, group private sessions, admin controls |
| **Phase 5: File Sharing** | Week 9 | Multer file upload, MIME filtering, file messages in DMs/groups/private mode, private file cleanup |
| **Phase 6: UX Enhancements** | Week 10 | Typing indicators, read receipts, unread badges, message deletion, notification bell |
| **Phase 7: User Management** | Week 11 | Profile page, avatar upload, password change, email verification, forgot password flow, invitation system |
| **Phase 8: Polish & Deploy** | Week 12 | Dark mode, security hardening (Helmet, rate limiting, CORS), deployment to Render/Vercel, testing |

---

## 4. System Design

### 4.1 Data Flow Diagram (DFD) — Detailed Description

#### 4.1.1 Context Diagram (Level 0 DFD)

**Description for diagram generation:**

Draw a context diagram (Level 0 DFD) with the following elements:

- **Central Process (circle/rounded rectangle):** Label it "Privacy Chat System" — this is the single process representing the entire application.
- **External Entities (rectangles):**
  1. **User** — positioned on the left. This represents any registered user of the system.
  2. **SMTP Server** — positioned on the bottom-right. This represents the email service (Gmail SMTP / Ethereal).
  3. **MongoDB Atlas** — positioned on the right. This represents the cloud database.
- **Data Flows (labeled arrows):**
  - User → System: "Registration Data, Login Credentials, Messages, Files, Invitations, Profile Updates"
  - System → User: "JWT Token, Chat Messages, Notifications, Online Status, File Downloads, Verification Codes"
  - System → SMTP Server: "Verification Email Requests"
  - SMTP Server → System: "Delivery Confirmation"
  - System ↔ MongoDB Atlas: "User Data, Messages, Groups, Invitations, Sessions, Verification Codes"

#### 4.1.2 Level 1 DFD

**Description for diagram generation:**

Draw a Level 1 DFD decomposing the central process into 6 sub-processes. Use circles for processes, open rectangles for data stores, rectangles for external entities.

**Processes (circles numbered 1.0 through 6.0):**
1. **1.0 Authentication & User Management** — handles registration (with email verification), login, profile updates, password changes, forgot password.
2. **2.0 Contact & Invitation Management** — handles user search, sending/accepting/declining invitations, contact removal with mutual cleanup.
3. **3.0 Normal Messaging** — handles sending/receiving text messages and files in DMs and groups, message deletion, read receipts.
4. **4.0 Private Session Management** — handles starting/ending private sessions (DM and group), RAM-only message store, file cleanup on session end.
5. **5.0 Group Management** — handles group creation, member management, admin controls, group deletion.
6. **6.0 Real-Time Notification Engine** — handles Socket.IO connections, online status broadcasting, typing indicators, notification delivery, unread count tracking.

**Data Stores (open-ended rectangles):**
- D1: Users
- D2: Messages
- D3: Groups
- D4: Invitations
- D5: Sessions (DM private sessions)
- D6: GroupSessions
- D7: VerificationCodes
- D8: Private Message Store (RAM — shown with dashed border to indicate volatility)
- D9: File Storage (disk — /uploads directory)

**Key Data Flows:**
- User → 1.0: Registration data (username, email, password, verification code)
- 1.0 → SMTP Server: Verification email request
- 1.0 → D1: Create/update user record
- 1.0 → D7: Store/validate verification codes
- 1.0 → User: JWT token, user profile
- User → 2.0: Invitation request (toUserId)
- 2.0 → D4: Create invitation record
- 2.0 → D1: Update contacts arrays (on acceptance)
- 2.0 → 6.0: Send real-time invitation notification
- User → 3.0: Message text/file
- 3.0 → D2: Persist message
- 3.0 → D9: Store uploaded file
- 3.0 → 6.0: Trigger real-time message delivery
- User → 4.0: Start/end private session
- 4.0 → D5/D6: Create/update session record
- 4.0 → D8: Store/retrieve/clear RAM messages
- 4.0 → D9: Store/cleanup private files
- 4.0 → 6.0: Broadcast session start/end notifications
- User → 5.0: Group operations (create, add members, leave)
- 5.0 → D3: CRUD group records
- 6.0 → User: Online status, typing indicators, notifications, unread counts

#### 4.1.3 Level 2 DFD — Authentication Process (1.0)

**Description for diagram generation:**

Decompose Process 1.0 into sub-processes:

- **1.1 Send Verification Code:** Receives email from user → validates uniqueness against D1 (Users) → generates 6-digit code → stores in D7 (VerificationCodes) with 10-min TTL → sends email via SMTP Server.
- **1.2 Register User:** Receives (username, email, password, code) → validates code against D7 → hashes password with bcrypt → creates user in D1 → deletes used code from D7 → returns JWT token.
- **1.3 Login:** Receives (email, password) → looks up user in D1 → compares password hash with bcrypt → generates and returns JWT token.
- **1.4 Update Profile:** Receives (username change and/or avatar file) → validates uniqueness → updates D1 → stores avatar file in D9.
- **1.5 Password Recovery:** Receives email → validates user exists in D1 → sends verification code via SMTP → verifies code → hashes new password → updates D1.

### 4.2 Entity-Relationship (ER) Diagram — Detailed Description

**Description for diagram generation:**

Draw an ER diagram with the following 7 entities, their attributes, and relationships. Use rectangles for entities, ovals for attributes (underline primary keys, mark foreign keys with "FK"), and diamonds for relationships.

#### Entities and Attributes:

**1. User**
- `_id` (PK, ObjectId) — auto-generated MongoDB primary key
- `username` (String, unique, required, 3-20 chars)
- `email` (String, unique, required, lowercase)
- `password` (String, required, min 6 chars, stored as bcrypt hash)
- `avatar` (String, URL to uploaded image, default empty)
- `contacts` (Array of ObjectId references to User) — self-referencing many-to-many
- `isOnline` (Boolean, default false)
- `createdAt` (Date, auto-generated)
- `updatedAt` (Date, auto-generated)

**2. Message**
- `_id` (PK, ObjectId)
- `conversationId` (String, indexed) — for DMs, computed as sorted concatenation of two user IDs (e.g., "userId1_userId2")
- `groupId` (FK → Group._id, ObjectId) — for group messages; null for DMs
- `sender` (FK → User._id, ObjectId, required)
- `text` (String, default empty, max 500 chars)
- `fileUrl` (String, optional) — URL to uploaded file
- `fileName` (String, optional) — sanitized original filename
- `fileType` (String, optional) — MIME type
- `fileSize` (Number, optional) — bytes
- `deletedFor` (Array of ObjectId refs to User) — soft delete tracking per user
- `status` (String, enum: 'sent'|'delivered'|'read', default 'sent')
- `readBy` (Array of ObjectId refs to User)
- `createdAt`, `updatedAt` (timestamps)

**3. Group**
- `_id` (PK, ObjectId)
- `name` (String, required, 1-60 chars)
- `description` (String, optional, max 200 chars)
- `avatar` (String, URL, default empty)
- `creator` (FK → User._id, required)
- `members` (Array of ObjectId refs to User)
- `admins` (Array of ObjectId refs to User)
- `createdAt`, `updatedAt` (timestamps)

**4. Invitation**
- `_id` (PK, ObjectId)
- `from` (FK → User._id, required) — sender of invitation
- `to` (FK → User._id, required) — recipient of invitation
- `status` (String, enum: 'pending'|'accepted'|'declined', default 'pending')
- `type` (String, enum: 'normal'|'private'|'contact_request', default 'normal')
- `createdAt`, `updatedAt` (timestamps)

**5. Session** (DM Private Session)
- `_id` (PK, ObjectId)
- `conversationId` (String, required) — same format as Message.conversationId
- `participants` (Array of 2 ObjectId refs to User)
- `status` (String, enum: 'active'|'ended', default 'active')
- `startedBy` (FK → User._id)
- `createdAt`, `updatedAt` (timestamps)

**6. GroupSession** (Group Private Session)
- `_id` (PK, ObjectId)
- `groupId` (FK → Group._id, required)
- `participants` (Array of ObjectId refs to User) — copied from Group.members at session start
- `status` (String, enum: 'active'|'ended', default 'active')
- `startedBy` (FK → User._id)
- `createdAt`, `updatedAt` (timestamps)

**7. VerificationCode**
- `_id` (PK, ObjectId)
- `email` (String, required, indexed)
- `code` (String, required) — 6-digit numeric code
- `expiresAt` (Date, required, default: 10 minutes from creation) — TTL index for auto-deletion
- `createdAt`, `updatedAt` (timestamps)

#### Relationships:

1. **User ↔ User** (Many-to-Many, self-referencing via `contacts` array): A user can have many contacts, and each contact is also a user. This is a mutual relationship — when A adds B, B is also added to A's contacts.

2. **User → Message** (One-to-Many via `sender`): A user can send many messages. Each message has exactly one sender.

3. **User → Message** (Many-to-Many via `deletedFor`): A message can be soft-deleted for multiple users independently.

4. **User → Message** (Many-to-Many via `readBy`): A message can be read by multiple users.

5. **User → Group** (Many-to-Many via `members`): A user can be a member of multiple groups. A group can have multiple members.

6. **User → Group** (One-to-Many via `creator`): A user can create multiple groups. Each group has exactly one creator.

7. **User → Group** (Many-to-Many via `admins`): Multiple users can be admins of a group.

8. **User → Invitation** (One-to-Many via `from`): A user can send many invitations.

9. **User → Invitation** (One-to-Many via `to`): A user can receive many invitations.

10. **Group → Message** (One-to-Many via `groupId`): A group can have many messages.

11. **Group → GroupSession** (One-to-Many via `groupId`): A group can have multiple private sessions (sequentially, only one active at a time).

12. **User → Session** (Many-to-Many via `participants`): DM private sessions have exactly 2 participants.

13. **User → GroupSession** (Many-to-Many via `participants`): Group private sessions can have multiple participants.

### 4.3 Data Dictionary

| Field | Table | Data Type | Constraints | Description |
|---|---|---|---|---|
| _id | All | ObjectId (12-byte) | PK, auto-generated | MongoDB unique document identifier |
| username | User | String | Unique, required, 3-20 chars, trimmed | User's display name |
| email | User | String | Unique, required, lowercase, trimmed | User's email for login and verification |
| password | User | String | Required, min 6 chars | bcrypt-hashed password (12 salt rounds) |
| avatar | User | String | Optional, default '' | Full URL to avatar image in /uploads |
| contacts | User | Array[ObjectId] | Refs User | List of mutual contact user IDs |
| isOnline | User | Boolean | Default false | True when user has active WebSocket connection |
| conversationId | Message | String | Indexed | Sorted concatenation: "smallerUserId_largerUserId" |
| groupId | Message | ObjectId | Refs Group, optional | Null for DMs, set for group messages |
| sender | Message | ObjectId | Refs User, required | User who sent the message |
| text | Message | String | Default '', max 500 chars | Message body text |
| fileUrl | Message | String | Optional | Server URL path to uploaded file |
| fileName | Message | String | Optional | Sanitized original filename |
| fileType | Message | String | Optional | MIME type (e.g., image/jpeg) |
| fileSize | Message | Number | Optional | File size in bytes |
| deletedFor | Message | Array[ObjectId] | Refs User | Users who deleted this message for themselves |
| status | Message | String | Enum: sent/delivered/read | Read receipt status |
| readBy | Message | Array[ObjectId] | Refs User | Users who have read this message |
| name | Group | String | Required, 1-60 chars | Group display name |
| description | Group | String | Optional, max 200 chars | Group description |
| creator | Group | ObjectId | Refs User, required | User who created the group |
| members | Group | Array[ObjectId] | Refs User | All group members including creator |
| admins | Group | Array[ObjectId] | Refs User | Group administrators |
| from | Invitation | ObjectId | Refs User, required | User who sent the invitation |
| to | Invitation | ObjectId | Refs User, required | User who received the invitation |
| status | Invitation | String | Enum: pending/accepted/declined | Current invitation status |
| type | Invitation | String | Enum: normal/private/contact_request | Invitation purpose type |
| conversationId | Session | String | Required | Links session to DM conversation |
| participants | Session | Array[ObjectId] | Refs User (exactly 2) | DM session participants |
| status | Session | String | Enum: active/ended | Session lifecycle state |
| startedBy | Session | ObjectId | Refs User | Who initiated the private session |
| groupId | GroupSession | ObjectId | Refs Group, required | Group this session belongs to |
| email | VerificationCode | String | Required, indexed, lowercase | Email address the code was sent to |
| code | VerificationCode | String | Required | 6-digit numeric verification code |
| expiresAt | VerificationCode | Date | Required, TTL indexed | Auto-delete time (10 min from creation) |

### 4.4 Data Model

The application uses a **document-oriented NoSQL data model** via MongoDB/Mongoose.

**Key Design Decisions:**

1. **Conversation ID Convention:** DM conversations do not have a separate "Conversation" collection. Instead, the conversation is identified by a deterministic string: the two user IDs sorted alphabetically and joined with an underscore (e.g., `"abc123_def456"`). This avoids a lookup table and makes the relationship implicit.

2. **Dual Message Storage:** The `Message` model stores only normal (persistent) messages. Private messages use an in-memory `Map<sessionId, Array<message>>` in `privateStore.js` and are never written to MongoDB.

3. **Self-Referencing Contacts:** The `User.contacts` array stores ObjectId references back to the User collection, implementing a many-to-many self-relationship without a junction table.

4. **Soft Delete Pattern:** The `deletedFor` array on messages enables "delete for me" without removing the message from the database — only the requesting user's ID is added to the array, and queries filter it out.

5. **Polymorphic Messages:** The `Message` collection holds both DM messages (identified by `conversationId`) and group messages (identified by `groupId`), acting as a polymorphic store differentiated by which field is populated.

### 4.5 Schema Design

The MongoDB schema design follows a **denormalized, embedded-reference hybrid** pattern:

```
Database: privacy_chat

├── Collection: users
│   ├── Indexes: { username: 1, unique }, { email: 1, unique }
│   └── Embedded: contacts[] (array of ObjectId refs)
│
├── Collection: messages
│   ├── Indexes: { conversationId: 1 }, { groupId: 1 }
│   └── Embedded: deletedFor[], readBy[] (arrays of ObjectId refs)
│
├── Collection: groups
│   ├── Indexes: { members: 1 }
│   └── Embedded: members[], admins[] (arrays of ObjectId refs)
│
├── Collection: invitations
│   ├── Indexes: { from: 1, to: 1, status: 1 }
│   └── Relationships: from → users, to → users
│
├── Collection: sessions
│   ├── Indexes: { conversationId: 1, status: 1 }
│   └── Embedded: participants[] (array of 2 ObjectId refs)
│
├── Collection: groupsessions
│   ├── Indexes: { groupId: 1, status: 1 }
│   └── Embedded: participants[] (array of ObjectId refs)
│
├── Collection: verificationcodes
│   ├── Indexes: { email: 1 }, { expiresAt: 1, expireAfterSeconds: 0 } (TTL)
│   └── Auto-purge: MongoDB TTL removes expired docs automatically
│
└── In-Memory Store (NOT a collection):
    └── privateMessages: Map<sessionId, Array<messageObject>>
        └── Volatile — lost on server restart or session end
```

---

## 5. Testing

### 5.1 Unit Testing Areas

| Module | Test Cases |
|---|---|
| **Authentication** | Valid/invalid registration, duplicate email/username, verification code validation, code expiry, login with correct/incorrect credentials, JWT generation and expiry |
| **Password Management** | Password change with correct/incorrect current password, minimum length validation, forgot password flow with valid/expired/invalid codes |
| **Contact Management** | Search by username, invitation send/accept/decline, duplicate invitation prevention, mutual auto-accept, contact removal with cascading cleanup |
| **Messaging** | Text message creation, 500-character limit enforcement, file upload with allowed/disallowed MIME types, 100MB file size limit, conversation ID generation |
| **Private Sessions** | Session creation, duplicate session prevention, message RAM storage, session end cleanup, Beacon API cleanup on tab close, disconnect cleanup |
| **Groups** | Group creation with member dedup, admin-only operations, member add/remove, creator protection, group deletion with message cascade |
| **Read Receipts** | Marking messages as read, status progression (sent → read), real-time checkmark notifications |
| **Message Deletion** | Delete for me (soft delete via deletedFor), delete for everyone (hard delete with file cleanup), authorization check (only own messages) |

### 5.2 Integration Testing

| Test Area | Description |
|---|---|
| **Auth Flow** | Send code → receive email → register → login → access protected routes → token expiry → redirect to login |
| **Real-Time Messaging** | User A sends message → Socket.IO delivers to User B → message appears in B's chat → read receipt sent back to A |
| **Private Session Lifecycle** | Start session → send private messages → verify not in DB → end session → verify RAM cleared → verify files deleted |
| **File Sharing** | Upload file → verify stored in /uploads → send as message → recipient downloads → delete for everyone → verify file removed from disk |
| **Contact Removal** | Remove contact → verify bilateral removal → verify chat history deleted → verify real-time notification sent → verify files cleaned |

### 5.3 Security Testing

| Test | Expected Behavior |
|---|---|
| Access protected route without token | 401 Unauthorized |
| Access protected route with expired token | 401 + redirect to /login |
| Rate limit on auth routes | 429 Too Many Requests after 20 calls in 15 minutes |
| Upload malicious file type (e.g., .exe) | 400 Bad Request — MIME type not in whitelist |
| Path traversal in filename | Filename sanitized to alphanumeric + ._- only |
| Delete other user's messages "for everyone" | 403 Forbidden |
| Cross-conversation message deletion | Scoped by conversationId — messages from other conversations untouched |
| CORS violation | Request blocked — only CLIENT_URL origin allowed |

---

## 6. Limitations

1. **No End-to-End Encryption (E2E):** Messages are transmitted in plaintext over HTTPS. The server can read all normal messages. Private messages are ephemeral but not encrypted in transit beyond TLS.

2. **Single-Server Private Store:** The in-memory private message store (`Map`) does not support horizontal scaling. If the backend runs on multiple server instances, private messages would be isolated to one instance.

3. **No Message Pagination:** Messages are limited to the most recent 100 per conversation with no infinite scroll / pagination support.

4. **No Push Notifications:** The app relies on WebSocket connections — users must have the browser tab open to receive real-time updates. There are no browser push notifications or mobile notifications.

5. **File Storage on Server Disk:** Files are stored directly on the server's filesystem (`/uploads`), which does not scale well for production use and is lost on Render's ephemeral filesystem.

6. **No Voice/Video Calls:** The platform is text and file-based only, with no WebRTC integration for voice or video communication.

7. **No Message Search:** There is no full-text search capability for finding messages within conversations.

8. **500-Character Message Limit:** Messages are capped at 500 characters, which may be restrictive for some use cases.

9. **Single Active Private Session:** Only one private session can be active per conversation (DM or group) at a time.

10. **No Offline Message Queue:** If a user is offline when a message is sent, they will see it when they next load the conversation, but there is no offline message queue or delivery retry mechanism.

---

## 7. Future Scope

1. **End-to-End Encryption (E2E):** Implement the Signal Protocol or similar for true E2E encryption where the server cannot read message content, even in normal mode.

2. **Cloud File Storage:** Migrate from local disk storage to AWS S3 or Cloudinary for scalable, persistent, CDN-backed file hosting.

3. **Message Pagination & Search:** Implement cursor-based pagination for message history and full-text search using MongoDB Atlas Search or Elasticsearch.

4. **Push Notifications:** Integrate Web Push API (Service Workers) for browser notifications and Firebase Cloud Messaging (FCM) for mobile push.

5. **Voice & Video Calls:** Add WebRTC-based peer-to-peer voice and video calling with Socket.IO for signaling.

6. **Horizontal Scaling:** Replace the in-memory `Map` private store with Redis for multi-instance support. Use Socket.IO's Redis adapter for cross-instance event broadcasting.

7. **Mobile Applications:** Build native mobile apps using React Native or Flutter, leveraging the existing REST API and Socket.IO backend.

8. **Message Reactions & Replies:** Add emoji reactions and threaded replies to messages.

9. **Admin Dashboard:** Build an admin panel for user management, abuse reporting, and system monitoring.

10. **Two-Factor Authentication (2FA):** Add TOTP-based 2FA for enhanced account security.

11. **Disappearing Messages Timer:** Add configurable auto-delete timers (1 hour, 24 hours, 7 days) for normal messages as an alternative to the binary normal/private split.

12. **Media Previews & Compression:** Generate image thumbnails and compress uploaded media for faster loading and reduced storage.

13. **Status/Stories Feature:** Add ephemeral status updates (like WhatsApp Status or Instagram Stories) that disappear after 24 hours.

14. **Audit Logging:** Implement comprehensive server-side audit logging for security events (login attempts, password changes, admin actions).

---

*This synopsis provides a complete architectural and functional understanding of the Privacy Chat project. All code references, data flows, and system interactions are derived directly from the implemented codebase.*
