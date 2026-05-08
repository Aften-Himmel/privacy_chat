## 5.1) Data Flow Diagram

### 5.1.1) DFD Level 0 — Context Diagram

The Level 0 DFD represents the entire Privacy Chat system as a single process interacting with three external entities. It establishes the system boundary and shows the highest-level data flows entering and leaving the system.

```mermaid
flowchart LR
    A["👤 Client Browser<br/>(User)"] -->|"Registration Data, Login Credentials,<br/>Messages, Files, Invitations,<br/>Profile Updates"| B(("Privacy Chat<br/>System"))
    B -->|"JWT Token, Chat Messages,<br/>Notifications, Online Status,<br/>File Downloads, Read Receipts"| A
    B -->|"SMTP Email Request<br/>(Verification OTP)"| C["📧 Email Service<br/>(Gmail SMTP / Ethereal)"]
    C -->|"Verification Email<br/>Delivery Confirmation"| A
    B <-->|"Read / Write:<br/>Users, Messages, Groups,<br/>Invitations, Sessions"| D[("☁️ MongoDB Atlas<br/>Database")]
    B <-->|"Read / Write / Delete:<br/>Uploaded Files<br/>(Avatars, Documents, Media)"| E["📁 Server Filesystem<br/>(/uploads directory)"]
```

External Entities:
- Client Browser (User): Represents any user accessing Privacy Chat through a web browser. All interactions flow through the React 19 frontend, which communicates with the backend via REST API calls (Axios) and WebSocket events (Socket.IO).
- Email Service (Gmail SMTP / Ethereal): External SMTP server used for sending 6-digit OTP verification codes during registration and password recovery. In production, Gmail SMTP is used; in development, Ethereal provides a testing fallback.
- MongoDB Atlas Database: Cloud-hosted NoSQL database storing all persistent data: user accounts, normal messages, groups, invitations, sessions, and verification codes.
- Server Filesystem: The `/uploads` directory on the backend server, used for storing uploaded files (avatars, images, documents, audio, video). Files associated with private sessions are tracked and deleted when the session ends.

---

### 5.1.2) DFD Level 1 — Subsystem Decomposition

The Level 1 DFD decomposes the Privacy Chat system into six major processing subsystems, showing the data flows between them and the data stores they access.

```mermaid
flowchart TD
    U["👤 Client Browser"] -->|"Credentials,<br/>OTP Code"| AUTH["1.0 Authentication<br/>& User Management"]
    AUTH -->|"JWT Token,<br/>User Profile"| U
    AUTH -->|"OTP Email<br/>Request"| EMAIL["📧 Email Service"]
    AUTH -->|"Create / Read / Update<br/>User Records"| DB[("MongoDB Atlas")]
    AUTH -->|"Store / Validate<br/>Verification Codes"| DB

    U -->|"Invitation<br/>Requests"| CONT["2.0 Contact &<br/>Invitation Management"]
    CONT -->|"Create / Update<br/>Invitations, Contacts"| DB
    CONT -->|"Real-time Invitation<br/>Events"| SOCK["6.0 Real-Time<br/>Notification Engine<br/>(Socket.IO)"]

    U -->|"Text Messages<br/>& Files"| MSG["3.0 Normal<br/>Messaging"]
    MSG -->|"Persist Messages"| DB
    MSG -->|"Store Files"| FS["📁 Server Filesystem"]
    MSG -->|"Deliver via<br/>Socket"| SOCK

    U -->|"Start / End<br/>Session"| PRIV["4.0 Private Session<br/>Management"]
    PRIV -->|"Create / Update<br/>Session Records"| DB
    PRIV -->|"Store / Clear<br/>RAM Messages"| MEM[("🧠 In-Memory Map<br/>(Volatile RAM)")]
    PRIV -->|"Track / Cleanup<br/>Private Files"| FS
    PRIV -->|"Session Lifecycle<br/>Events"| SOCK

    U -->|"Group Create /<br/>Edit / Delete"| GRP["5.0 Group<br/>Management"]
    GRP -->|"Group & Member<br/>Records"| DB
    GRP -->|"Group Events"| SOCK

    SOCK -->|"Messages, Typing Indicators,<br/>Online Status, Notifications,<br/>Read Receipts"| U
```

Process Descriptions:

| Process | Description |
|---------|-------------|
| 1.0 Authentication & User Management | Handles user registration (with email OTP verification), login (with JWT generation), profile updates (avatar, username), password changes, and password recovery. Interacts with the Email Service for OTP delivery and with MongoDB for user record CRUD operations. |
| 2.0 Contact & Invitation Management | Manages user search by username, invitation sending/accepting/declining, mutual contact addition, and contact removal with cascading cleanup (chat history deletion, file removal). |
| 3.0 Normal Messaging | Handles sending and receiving text messages and file attachments in DMs and groups. Messages are persisted to MongoDB and delivered in real-time via Socket.IO. Supports read receipts, message deletion (for me / for everyone), and the 500-character text limit. |
| 4.0 Private Session Management | The architectural core of the privacy system. Manages private session lifecycle (start, message exchange, end) for both DMs and groups. Messages are stored exclusively in the In-Memory Map and never written to MongoDB. Files uploaded during private sessions are tracked and deleted when the session ends. |
| 5.0 Group Management | Handles group CRUD operations, member management (add/remove), admin role management, group private sessions, and group deletion with message cascade. |
| 6.0 Real-Time Notification Engine | The Socket.IO server managing all real-time events: user online/offline status broadcasting, typing indicators (start/stop for DMs and groups), message delivery notifications, invitation alerts, read receipt propagation, private session lifecycle events, and unread count tracking. Maintains a `Map<userId, socketId>` for targeted message delivery. |

---

### 5.1.3) DFD Level 2 — Authentication Process (1.0) Decomposition

```mermaid
flowchart TD
    %% External Entities
    U["👤 Client Browser"]
    EMAIL["SMTP Service"]

    %% Processes
    subgraph "1.0 Authentication Process"
        direction TB
        P1("1.1 Send Verification Code")
        P2("1.2 Register User")
        P3("1.3 Login")
        P4("1.4 Update Profile")
        P5("1.5 Password Recovery")
    end

    %% Data Stores
    D1[("D1: Users Collection")]
    D7[("D7: Verification Codes")]
    FS["Server Filesystem (/uploads)"]

    %% Data Flows
    U -->|"Registration Details"| P1
    P1 -->|"Check Uniqueness"| D1
    P1 -->|"Store OTP"| D7
    P1 -->|"Send OTP Request"| EMAIL

    U -->|"Registration + OTP"| P2
    P2 -->|"Validate & Delete OTP"| D7
    P2 -->|"Create User Record"| D1
    P2 -->|"Token + Profile"| U

    U -->|"Login Details"| P3
    P3 -->|"Lookup & Compare"| D1
    P3 -->|"Token + Profile"| U

    U -->|"Avatar File"| P4
    P4 -->|"Update Avatar URL"| D1
    P4 -->|"Store File"| FS

    U -->|"Email for Recovery"| P5
    P5 -->|"Verify User"| D1
    P5 -->|"Store OTP"| D7
    P5 -->|"Send OTP Request"| EMAIL
    U -->|"OTP + New Password"| P5
    P5 -->|"Update Hash"| D1
```

### 5.1.4) DFD Level 2 — Contact & Invitation Management (2.0) Decomposition

```mermaid
flowchart TD
    %% External Entities
    U["👤 Client Browser"]
    SOCK["🔌 Real-Time Engine (Socket.IO)"]

    %% Processes
    subgraph "2.0 Contact & Invitation Management"
        direction TB
        P21("2.1 Search Users")
        P22("2.2 Send Invitation")
        P23("2.3 Accept / Decline Invitation")
        P24("2.4 Remove Contact")
    end

    %% Data Stores
    D1[("D1: Users Collection")]
    D4[("D4: Invitations Collection")]
    D2[("D2: Messages Collection")]
    FS["📁 Server Filesystem (/uploads)"]

    %% Data Flows
    U -->|"Search Query"| P21
    P21 -->|"Query Username"| D1
    P21 -->|"Search Results"| U

    U -->|"Invite Request"| P22
    P22 -->|"Check Existing"| D4
    P22 -->|"Create Invitation"| D4
    P22 -->|"Notify Target"| SOCK

    U -->|"Accept/Decline"| P23
    P23 -->|"Update Status"| D4
    P23 -->|"Update Contacts Array"| D1
    P23 -->|"Notify Sender"| SOCK

    U -->|"Remove Contact"| P24
    P24 -->|"Remove from Arrays"| D1
    P24 -->|"Delete DM History"| D2
    P24 -->|"Delete DM Files"| FS
    P24 -->|"Notify Peer"| SOCK
```

### 5.1.5) DFD Level 2 — Normal Messaging (3.0) Decomposition

```mermaid
flowchart TD
    %% External Entities
    U["👤 Client Browser"]
    SOCK["🔌 Real-Time Engine (Socket.IO)"]

    %% Processes
    subgraph "3.0 Normal Messaging"
        direction TB
        P31("3.1 Send Message")
        P32("3.2 Upload File Attachment")
        P33("3.3 Mark Messages Read")
        P34("3.4 Delete Message")
    end

    %% Data Stores
    D2[("D2: Messages Collection")]
    FS["📁 Server Filesystem (/uploads)"]

    %% Data Flows
    U -->|"Text Message"| P31
    P31 -->|"Store Message"| D2
    P31 -->|"Broadcast to Peer/Group"| SOCK

    U -->|"File Upload"| P32
    P32 -->|"Save File"| FS
    P32 -->|"Store Metadata"| D2
    P32 -->|"Broadcast File Info"| SOCK

    U -->|"Read Request"| P33
    P33 -->|"Update readBy Array"| D2
    P33 -->|"Push Read Receipt"| SOCK

    U -->|"Delete Request"| P34
    P34 -->|"Update deletedFor Array"| D2
    P34 -->|"Sync Deletion"| SOCK
```

### 5.1.6) DFD Level 2 — Private Session Management (4.0) Decomposition

```mermaid
flowchart TD
    %% External Entities
    U["👤 Client Browser"]
    SOCK["🔌 Real-Time Engine (Socket.IO)"]

    %% Processes
    subgraph "4.0 Private Session Management"
        direction TB
        P41("4.1 Start Session")
        P42("4.2 Exchange Private Messages")
        P43("4.3 End Session & Cleanup")
    end

    %% Data Stores
    D5[("D5: Sessions Collection")]
    MEM[("🧠 D8: In-Memory Map (RAM)")]
    FS["📁 Server Filesystem (/uploads)"]

    %% Data Flows
    U -->|"Start Request"| P41
    P41 -->|"Create Session Record"| D5
    P41 -->|"Notify Peer"| SOCK

    U -->|"Private Message / File"| P42
    P42 -->|"Verify Session Active"| D5
    P42 -->|"Save Transient Message"| MEM
    P42 -->|"Store Encrypted File"| FS
    P42 -->|"Deliver Message"| SOCK

    U -->|"End Request"| P43
    P43 -->|"Mark Session Ended"| D5
    P43 -->|"Clear Map Entries (Irreversible!)"| MEM
    P43 -->|"Delete Secure Files"| FS
    P43 -->|"Notify Peer"| SOCK
```

### 5.1.7) DFD Level 2 — Group Management (5.0) Decomposition

```mermaid
flowchart TD
    %% External Entities
    U["👤 Client Browser"]
    SOCK["🔌 Real-Time Engine (Socket.IO)"]

    %% Processes
    subgraph "5.0 Group Management"
        direction TB
        P51("5.1 Create Group")
        P52("5.2 Manage Members / Admins")
        P53("5.3 Update Group Profile")
        P54("5.4 Delete Group")
    end

    %% Data Stores
    D3[("D3: Groups Collection")]
    D2[("D2: Messages Collection")]
    FS["📁 Server Filesystem (/uploads)"]

    %% Data Flows
    U -->|"Group Details"| P51
    P51 -->|"Create Group Doc"| D3
    P51 -->|"Join Group Room"| SOCK

    U -->|"Add/Remove Request"| P52
    P52 -->|"Update Arrays"| D3
    P52 -->|"Notify Members"| SOCK

    U -->|"Avatar / Name Update"| P53
    P53 -->|"Update Fields"| D3
    P53 -->|"Save Group Avatar"| FS
    P53 -->|"Broadcast Update"| SOCK

    U -->|"Delete Request"| P54
    P54 -->|"Remove Group"| D3
    P54 -->|"Delete Group Messages"| D2
    P54 -->|"Delete Group Files"| FS
    P54 -->|"Notify Deletion"| SOCK
```

### 5.1.8) DFD Level 2 — Real-Time Notification Engine (6.0) Decomposition

```mermaid
flowchart TD
    %% External Entities
    U["👤 Client Browser"]
    SYS["⚙️ Backend System (Processes 1-5)"]

    %% Processes
    subgraph "6.0 Notification Engine (Socket.IO)"
        direction TB
        P61("6.1 Connection Management")
        P62("6.2 Typing Indicators")
        P63("6.3 Presence Broadcaster")
        P64("6.4 Event Router")
    end

    %% Data Stores
    D1[("D1: Users Collection")]
    SM[("🖥️ D9: Socket Map (RAM)")]

    %% Data Flows
    U -->|"Connect / Disconnect"| P61
    P61 -->|"Map UserId to SocketId"| SM
    P61 -->|"Update isOnline"| D1
    P61 -->|"Trigger Presence Update"| P63

    U -->|"typing:start / stop"| P62
    P62 -->|"Route Typing Event"| U

    P63 -->|"online / offline Alert"| U

    SYS -->|"Internal Triggers<br/>(Messages, Invites, Sessions)"| P64
    P64 -->|"Lookup Target Sockets"| SM
    P64 -->|"Push WebSocket Event"| U
```

---

## 5.4) Schema Design and Strategies

The MongoDB schema for Privacy Chat follows a heavily optimized denormalised, embedded-reference hybrid architecture. 

### 5.4.1) Collection Hierarchy Overview

```mermaid
flowchart LR
    %% Root
    DB[("🗄️ Database:<br/>privacy_chat")]

    %% Collections
    DB --> C_U[/"👥 Collection: users"/]
    C_U --> U1("Indexes: { username: 1 }, { email: 1 }")
    C_U --> U2("Embedded: contacts[] refs")
    C_U --> U3("Hooks: post-delete cascade")

    DB --> C_M[/"💬 Collection: messages"/]
    C_M --> M1("Indexes: { conversationId: 1 }")
    C_M --> M2("Embedded: deletedFor[], readBy[]")
    C_M --> M3("Polymorphic: DMs / Groups")

    DB --> C_G[/"👥 Collection: groups"/]
    C_G --> G1("Embedded: members[], admins[]")
    C_G --> G2("Constraint: creator in members")

    DB --> C_I[/"💌 Collection: invitations"/]
    C_I --> I1("Fields: from → users, to → users")
    C_I --> I2("Logic: auto-accept reverse pending")

    DB --> C_S[/"🔒 Collection: sessions (DM private)"/]
    C_S --> S1("Indexes: { conversationId: 1, status: 1 }")
    C_S --> S2("Constraint: max 1 active per DM")

    DB --> C_GS[/"🔒 Collection: groupsessions"/]
    C_GS --> GS1("Indexes: { groupId: 1, status: 1 }")
    C_GS --> GS2("Constraint: max 1 active per Group")

    DB --> C_V[/"✅ Collection: verificationcodes"/]
    C_V --> V1("Indexes: { email: 1 }, { expiresAt: 1, TTL }")
    C_V --> V2("Auto-purge: TTL deletes expired")

    DB -.-> C_RAM[/"🧠 In-Memory Store (NOT a collection)"/]
    C_RAM -.-> R1("Map<sessionId, Array<MessageObject>>")
    C_RAM -.-> R2("Volatile: destroyed on session end / restart")
```

### 5.4.2) Implicit Conversation Tracking (No Junction Tables)

A major design decision was the **removal of a dedicated `conversations` table for DMs**. Instead, Direct Messaging (DM) conversations are tracked implicitly using a **deterministic computed key** format: `sorted(userId1_userId2)`. This completely eliminates the need for expensive secondary collection lookups just to verify if an active DM history exists between two users, lowering database overhead.

### 5.4.3) Embedded Arrays for Many-to-Many Relationships

Traditional SQL structures use junction tables for `M:N` relationships. MongoDB idiomatic design embeds related IDs directly inside arrays. Privacy Chat leverages this heavily:
- **`Users.contacts[]`**: Stores mutual contacts.
- **`Groups.members[]` & `Groups.admins[]`**: Replaces the need for a `Group_Members` collection.
- **`Messages.readBy[]` & `Messages.deletedFor[]`**: Arrays inherently track message receipts and soft-deletions cleanly without requiring nested subdocuments.

### 5.4.4) Polymorphic Message Architecture

Both Direct Messages and Group Messages co-exist in the exact same `Messages` collection. The schema relies on application-level polymorphism to render the messages correctly:
- DMs inject a `conversationId` while leaving `groupId: null`.
- Group Messages inject a `groupId` while leaving `conversationId: null`.
This choice radically simplifies backend query logic, allowing unified Socket.IO broadcast services and unified pagination pipelines regardless of the chat origin type.

### 5.4.5) Database Native Auto-Purging (TTL Index)

Registration verification logic generates thousands of 6-digit OTP codes. Instead of writing custom cleanup jobs or cron scripts to remove stale OTPs, Privacy Chat utilizes a MongoDB `TTL (Time-To-Live)` index:
`{ expiresAt: 1 }, { expireAfterSeconds: 0 }`
The background MongoDB Thread seamlessly purges `VerificationCode` documents instantly after the 10-minute expiry window, removing all server burden.

### 5.4.6) Strict Decoupling of Private Content (RAM Map)

Crucially, **Private Session content never interfaces with MongoDB**. 
The `Sessions` collection strictly records "metadata and lifecycle" events. However, the raw sensitive text and images sent during Private Sessions are stored solely in a Node.js Volatile Javascript `Map`. If the application restarts, or the PM session officially ends, all chat data instantly perishes, enforcing absolute non-recoverable privacy limits that purely rest within internal RAM arrays.
