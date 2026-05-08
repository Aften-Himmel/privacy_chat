# Chapter 4: System Design

This chapter presents the high-level architectural design of Privacy Chat using standardised diagrams. All diagrams are provided as Mermaid code that can be rendered via [mermaid.live](https://mermaid.live) or any compatible tool and exported as PNG/SVG images for the final report.

---

## 4.1 System Architecture Diagram

The system follows a three-tier, decoupled architecture with separate frontend and backend services communicating via REST APIs and WebSocket connections, backed by a cloud database and in-memory volatile store.

```mermaid
flowchart TB
    subgraph "Client Tier (Browser)"
        direction TB
        REACT["React 19 SPA\n(Vite 7 Build)"]
        AXIOS["Axios HTTP Client\n(REST API Calls)"]
        SIOC["Socket.IO Client\n(WebSocket Events)"]
        REACT --> AXIOS
        REACT --> SIOC
    end

    subgraph "Application Tier (Render — Node.js)"
        direction TB
        EXPRESS["Express 5\nREST API Server"]
        MIDDLEWARE["Middleware Pipeline\n(Helmet, CORS, Rate Limit,\nJWT Auth, Multer)"]
        ROUTES["Route Handlers\n(auth, contacts, messages,\ngroups, invitations)"]
        SIO["Socket.IO 4 Server\n(Real-Time Engine)"]
        PSTORE["Private Store\n(JavaScript Map)\n⚡ Volatile RAM"]

        EXPRESS --> MIDDLEWARE --> ROUTES
        EXPRESS --- SIO
        ROUTES --> PSTORE
        SIO --> PSTORE
    end

    subgraph "Data Tier"
        direction TB
        MONGO[("MongoDB Atlas\n(Cloud Database)\n7 Collections")]
        FS["Server Filesystem\n/uploads Directory"]
        SMTP["Gmail SMTP\n(Email Service)"]
    end

    AXIOS -->|"HTTPS\nREST API"| EXPRESS
    SIOC <-->|"WebSocket\n(wss://)"| SIO
    ROUTES --> MONGO
    ROUTES --> FS
    ROUTES --> SMTP
    SIO --> MONGO
```

Architectural Highlights:
- Decoupled Frontend/Backend: The React SPA and Node.js API are independently deployed, communicating only via well-defined API contracts and WebSocket events.
- Dual Storage Architecture: Normal messages flow to MongoDB; private messages flow to the in-memory `Map` (shown with ⚡ indicating volatility).
- Middleware Pipeline: Every HTTP request passes through Helmet → CORS → JSON parser → route-specific middleware (rate limiter, JWT auth, Multer upload) before reaching the route handler.

---

## 4.2 Component Diagram

### 4.2.1 Backend Components

```mermaid
flowchart TD
    subgraph "Backend Component Architecture"
        direction TB
        subgraph "Entry Point"
            direction TB
            SERVER["server.js\n(HTTP + Socket.IO Init)"]
        end

        subgraph "Middleware Layer"
            direction TB
            HELM["helmet\n(Security Headers)"]
            CORS_MW["cors\n(Origin Control)"]
            RATE["express-rate-limit\n(Auth Throttle)"]
            AUTH_MW["auth.js\n(JWT Verification)"]
            MULTER["multer\n(File Upload)"]
        end

        subgraph "Route Layer"
            direction TB
            R_AUTH["routes/auth.js\n(Register, Login,\nVerify, Recover)"]
            R_CONT["routes/contacts.js\n(Search, Remove)"]
            R_MSG["routes/messages.js\n(DM, Private,\nFiles, Delete)"]
            R_GRP["routes/groups.js\n(CRUD, Members,\nGroup Messages,\nGroup Sessions)"]
            R_INV["routes/invitations.js\n(Send, Accept,\nDecline, List)"]
        end

        subgraph "Model Layer"
            direction TB
            M_USER["User"]
            M_MSG["Message"]
            M_GRP["Group"]
            M_INV["Invitation"]
            M_SESS["Session"]
            M_GSESS["GroupSession"]
            M_VCODE["VerificationCode"]
        end

        subgraph "Socket Layer"
            direction TB
            SM["socketManager.js\n(Connection, Events,\nPresence, Cleanup)"]
            PS["privateStore.js\n(RAM Map Store)"]
        end

        subgraph "Utilities"
            direction TB
            MAIL["utils/email.js\n(Nodemailer SMTP)"]
        end
    end

    SERVER --> HELM & CORS_MW & RATE
    SERVER --> SM
    R_AUTH --> M_USER & M_VCODE & MAIL
    R_CONT --> M_USER & M_MSG
    R_MSG --> M_MSG & M_SESS & PS
    R_GRP --> M_GRP & M_MSG & M_GSESS & PS
    R_INV --> M_INV & M_USER
    SM --> PS & M_SESS & M_GSESS & M_USER
```

### 4.2.2 Frontend Components

```mermaid
flowchart TD
    subgraph "Frontend Component Architecture"
        direction TB
        subgraph "Providers (Context Layer)"
            direction TB
            AUTH_CTX["AuthContext\n(User State, Login/Logout)"]
            SOCK_CTX["SocketContext\n(Socket.IO Connection)"]
            THEME_CTX["ThemeContext\n(Dark/Light Mode)"]
        end

        subgraph "Routing Layer"
            direction TB
            ROUTER["BrowserRouter\n(React Router 7)"]
            PROT["ProtectedRoute\n(JWT Gate)"]
        end

        subgraph "Layout"
            direction TB
            LAYOUT["ChatLayout\n(Sidebar + Content)"]
        end

        subgraph "Page Components"
            direction TB
            LOGIN["Login"]
            REG["Register"]
            FORGOT["ForgotPassword"]
            EMPTY["EmptyChat"]
            CHAT["ChatWindow\n(DM Messaging)"]
            GROUP["GroupWindow\n(Group Messaging)"]
            PROFILE["ProfilePage"]
        end

        subgraph "UI Components"
            direction TB
            NOTIF["NotificationBell\n(Alerts Dropdown)"]
            INV_DD["InvitationsDropdown\n(Pending Invites)"]
            GRP_INFO["GroupInfoPanel\n(Members, Settings)"]
            GRP_MODAL["CreateGroupModal\n(Group Creation)"]
        end

        subgraph "API Layer"
            direction TB
            AXIOS_API["api/axios.js\n(Interceptors)"]
        end
    end

    ROUTER --> LOGIN & REG & FORGOT
    ROUTER --> PROT --> LAYOUT
    LAYOUT --> EMPTY & CHAT & GROUP & PROFILE
    LAYOUT --> NOTIF & INV_DD & GRP_MODAL
    GROUP --> GRP_INFO
    CHAT --> AXIOS_API
    GROUP --> AXIOS_API
    PROFILE --> AXIOS_API
    AUTH_CTX --> ROUTER
    SOCK_CTX --> LAYOUT
    THEME_CTX --> ROUTER
```

---

## 4.3 Deployment Diagram

```mermaid
flowchart TB
    subgraph "User Device"
        direction TB
        BROWSER["🌐 Web Browser\n(Chrome / Firefox / Edge / Safari)"]
    end

    subgraph "Render Cloud Platform"
        direction TB
        subgraph "Frontend Service (Static Site)"
            direction TB
            FE_BUILD["Vite Production Build\n(dist/ directory)"]
            FE_ROUTES["SPA Rewrite Rules\n(/* → index.html)"]
        end

        subgraph "Backend Service (Web Service)"
            direction TB
            NODE["Node.js 18+ Runtime"]
            EXPRESS_SRV["Express 5 HTTP Server\n(Port from env)"]
            SOCKET_SRV["Socket.IO 4 Server\n(Attached to HTTP)"]
            UPLOADS["/uploads Directory\n(File Storage)"]
        end
    end

    subgraph "External Services"
        direction TB
        ATLAS[("MongoDB Atlas\nM0 Free Cluster\n(Cloud Database)")]
        GMAIL["Gmail SMTP\n(Email Delivery)"]
        GITHUB["GitHub Repository\n(Source Code + CI/CD)"]
    end

    BROWSER -->|"HTTPS GET\n(Static Assets)"| FE_BUILD
    BROWSER -->|"HTTPS\n(REST API)"| EXPRESS_SRV
    BROWSER <-->|"WSS://\n(WebSocket)"| SOCKET_SRV
    EXPRESS_SRV --> UPLOADS
    EXPRESS_SRV -->|"Mongoose\nConnection"| ATLAS
    EXPRESS_SRV -->|"Nodemailer\nSMTP"| GMAIL
    GITHUB -->|"Auto Deploy\n(git push)"| FE_BUILD
    GITHUB -->|"Auto Deploy\n(git push)"| NODE
```

---

## 4.4 Sequence Diagrams

### 4.4.1 User Registration Flow

```mermaid
sequenceDiagram
    actor User as 👤 User
    participant FE as React Frontend
    participant BE as Express Backend
    participant DB as MongoDB Atlas
    participant SMTP as Gmail SMTP

    User->>FE: Fill registration form\n(username, email, password)
    FE->>BE: POST /api/auth/send-code\n{username, email, password}
    BE->>DB: Check username/email uniqueness
    DB-->>BE: No duplicates found
    BE->>BE: Generate 6-digit OTP
    BE->>DB: Upsert VerificationCode\n(email, code, expiresAt: +10min)
    BE->>SMTP: Send OTP email
    SMTP-->>User: 📧 Email with 6-digit code
    BE-->>FE: 200 "Verification code sent"
    FE-->>User: Show OTP input field

    User->>FE: Enter OTP code
    FE->>BE: POST /api/auth/register\n{username, email, password, code}
    BE->>DB: Validate OTP (find by email + code)
    DB-->>BE: Code valid & not expired
    BE->>BE: bcrypt.hash(password, 12)
    BE->>DB: Create User document
    BE->>DB: Delete used VerificationCode
    BE->>BE: jwt.sign({id, username}, secret, 7d)
    BE-->>FE: 201 {user} + Set-Cookie: token (HttpOnly)
    FE->>FE: Browser automatically stores cookie
    FE-->>User: Redirect to /chat
```

### 4.4.2 Private Session Lifecycle (DM)

```mermaid
sequenceDiagram
    actor A as 👤 User A
    participant FE_A as A's Frontend
    participant BE as Express Backend
    participant RAM as Private Store (Map)
    participant SIO as Socket.IO
    participant FE_B as B's Frontend
    actor B as 👤 User B

    Note over A,B: Phase 1: Session Start
    A->>FE_A: Click "Start Private Session"
    FE_A->>BE: POST /api/messages/:userB/private/start
    BE->>BE: Check no active session exists
    BE->>BE: Create Session {status: 'active'}
    BE->>SIO: sendNotification(userB,\n{type: 'private_session_started'})
    SIO-->>FE_B: notification:receive
    BE-->>FE_A: 201 {session}
    FE_A-->>A: UI switches to Private Mode 🔒
    FE_B-->>B: UI switches to Private Mode 🔒

    Note over A,B: Phase 2: Private Messaging (RAM Only)
    A->>FE_A: Type and send message
    FE_A->>BE: POST /api/messages/:userB/private/message\n{text, sessionId}
    BE->>RAM: storePrivateMessage(sessionId, msg)
    Note right of RAM: Message stored ONLY\nin Map — never in DB
    BE->>SIO: sendNotification(userB,\n{type: 'new_private_message'})
    SIO-->>FE_B: notification:receive
    BE-->>FE_A: 201 {message}
    FE_B-->>B: Display private message

    Note over A,B: Phase 3: Session End (Cleanup)
    A->>FE_A: Click "End Private Session"
    FE_A->>BE: POST /api/messages/:userB/private/end\n{sessionId}
    BE->>BE: session.status = 'ended'
    BE->>RAM: clearPrivateMessages(sessionId)
    Note right of RAM: Map.delete(sessionId)\n⚡ Messages destroyed forever
    BE->>BE: cleanupPrivateFiles(sessionId)
    Note right of BE: fs.unlink() on any\nprivate uploaded files
    BE->>SIO: sendNotification(userB,\n{type: 'private_session_ended'})
    SIO-->>FE_B: notification:receive
    BE-->>FE_A: 200 "Session ended"
    FE_A-->>A: UI clears, returns to Normal Mode
    FE_B-->>B: UI clears, returns to Normal Mode
```

### 4.4.3 Real-Time DM Messaging Flow

```mermaid
sequenceDiagram
    actor A as 👤 User A
    participant FE_A as A's Frontend
    participant BE as Express Backend
    participant DB as MongoDB
    participant SIO as Socket.IO
    participant FE_B as B's Frontend
    actor B as 👤 User B

    A->>FE_A: Start typing
    FE_A->>SIO: emit('typing:start', {toUserId: B})
    SIO-->>FE_B: emit('typing:start', {userId: A})
    FE_B-->>B: Show "A is typing..."

    A->>FE_A: Send message
    FE_A->>BE: POST /api/messages/:userB\n{text: "Hello!"}
    BE->>BE: Generate conversationId\n(sorted userId1_userId2)
    BE->>DB: Create Message document\n{sender, text, conversationId, status: 'sent'}
    BE->>SIO: sendNotification(userB,\n{type: 'new_message', message})
    SIO-->>FE_B: notification:receive
    BE-->>FE_A: 201 {message}
    FE_A-->>A: Display message (✓ sent)
    FE_B-->>B: Display message + unread badge

    B->>FE_B: Open conversation with A
    FE_B->>BE: PATCH /api/messages/:userA/read
    BE->>DB: Update messages:\nstatus='read', readBy += [B]
    BE->>SIO: sendNotification(userA,\n{type: 'messages_read'})
    SIO-->>FE_A: notification:receive
    FE_A-->>A: Update checkmarks (✓✓ blue)
```

### 4.4.4 Contact Invitation Flow

```mermaid
sequenceDiagram
    actor A as 👤 User A
    participant FE_A as A's Frontend
    participant BE as Express Backend
    participant DB as MongoDB
    participant SIO as Socket.IO
    participant FE_B as B's Frontend
    actor B as 👤 User B

    A->>FE_A: Search for "userB"
    FE_A->>BE: GET /api/contacts/search?q=userB
    BE->>DB: User.find({username: /userB/i})
    DB-->>BE: [{_id, username, avatar}]
    BE-->>FE_A: 200 [search results]
    FE_A-->>A: Display matching users

    A->>FE_A: Click "Send Invitation"
    FE_A->>BE: POST /api/invitations\n{toUserId: B}
    BE->>DB: Check for existing/reverse invitations
    alt Reverse pending invitation exists
        BE->>DB: Auto-accept reverse invitation
        BE->>DB: Add A to B.contacts, B to A.contacts
        BE->>SIO: Notify both users (mutual contact added)
    else No reverse invitation
        BE->>DB: Create Invitation {from: A, to: B, status: 'pending'}
        BE->>SIO: sendNotification(B,\n{type: 'invitation_received'})
        SIO-->>FE_B: notification:receive
        FE_B-->>B: Show invitation notification 🔔
    end

    B->>FE_B: Accept invitation
    FE_B->>BE: PATCH /api/invitations/:id/accept
    BE->>DB: Invitation.status = 'accepted'
    BE->>DB: A.contacts.push(B)\nB.contacts.push(A)
    BE->>SIO: sendNotification(A,\n{type: 'invitation_accepted'})
    SIO-->>FE_A: notification:receive
    BE-->>FE_B: 200 {message: 'accepted'}
    FE_A-->>A: B appears in contact list
    FE_B-->>B: A appears in contact list
```

---

## 4.5 Class Diagram (Backend Models)

```mermaid
classDiagram
    class User {
        +ObjectId _id
        +String username
        +String email
        +String password
        +String avatar
        +Boolean isOnline
        +String publicKey
        +ObjectId[] contacts
        +Date createdAt
        +Date updatedAt
    }

    class Message {
        +ObjectId _id
        +String conversationId
        +ObjectId groupId
        +ObjectId sender
        +String text
        +String fileUrl
        +String fileName
        +String fileType
        +Number fileSize
        +ObjectId[] deletedFor
        +String status
        +ObjectId[] readBy
        +Date createdAt
    }

    class Group {
        +ObjectId _id
        +String name
        +String description
        +String avatar
        +ObjectId creator
        +ObjectId[] members
        +ObjectId[] admins
        +Date createdAt
    }

    class Invitation {
        +ObjectId _id
        +ObjectId from
        +ObjectId to
        +String status
        +String type
        +Date createdAt
    }

    class Session {
        +ObjectId _id
        +String conversationId
        +ObjectId[] participants
        +String status
        +ObjectId startedBy
        +Date createdAt
    }

    class GroupSession {
        +ObjectId _id
        +ObjectId groupId
        +ObjectId[] participants
        +String status
        +ObjectId startedBy
        +Date createdAt
    }

    class VerificationCode {
        +ObjectId _id
        +String email
        +String code
        +Date expiresAt
        +Date createdAt
    }

    class PrivateStore {
        -Map~sessionId, Message[]~ privateMessages
        +storePrivateMessage(sessionId, msg)
        +getPrivateMessages(sessionId)
        +clearPrivateMessages(sessionId)
    }

    User "1" --> "*" Message : sends
    User "" <--> "" User : contacts
    User "1" --> "*" Invitation : sends (from)
    User "1" --> "*" Invitation : receives (to)
    User "" <--> "" Group : member of
    User "1" --> "*" Group : creates
    User "" <--> "" Session : participates
    User "" <--> "" GroupSession : participates
    Group "1" --> "*" Message : contains
    Group "1" --> "*" GroupSession : has
    Session ..> PrivateStore : references
    GroupSession ..> PrivateStore : references
```
