# Scope of Work

This document defines the complete scope of the **Privacy Chat** project — a full-stack, real-time web-based messaging application built with a fundamental emphasis on user privacy. It describes all functional areas, technical boundaries, deliverables, and explicitly identifies what falls outside the project boundary.

---

## 1. Project Summary

Privacy Chat is a browser-based messaging platform that provides two distinct communication modes: a **Normal Mode** in which messages are persisted in a MongoDB database, and a **Private Mode** in which messages are stored exclusively in volatile server RAM and are irrecoverably destroyed when the session ends, the user disconnects, or the server restarts. The system is implemented as a decoupled full-stack application with a Node.js/Express REST API + Socket.IO backend and a React 19 SPA frontend, both deployed on Render.

---

## 2. In-Scope Features and Deliverables

### 2.1 User Authentication and Account Management

| Feature | Description |
|---|---|
| Email-verified registration | 6-digit OTP sent via SMTP; code expires after 10 minutes (TTL-indexed in MongoDB) |
| Login / Logout | Email + password credentials; JWT issued in an `HttpOnly` cookie (7-day expiry) |
| Password recovery | Forgot-password flow: email OTP → verify code → set new password |
| Profile management | Update display username (unique), upload avatar image, change password |
| Session security | JWT validation middleware on all protected routes; automatic redirect to `/login` on 401 |

### 2.2 Contact and Invitation System

| Feature | Description |
|---|---|
| User search | Search registered users by username to discover contacts |
| Invitation flow | Send, accept, or decline contact invitations; real-time Socket.IO notification on receipt |
| Mutual contact addition | Accepting an invitation automatically adds both users to each other's contact list |
| Contact removal | Removing a contact triggers bilateral cleanup: removes from each other's contact list, deletes shared chat history from MongoDB, and purges shared uploaded files from disk |

### 2.3 Direct Messaging (DM)

| Feature | Description |
|---|---|
| Real-time text messaging | One-to-one messaging via Socket.IO; 500-character message limit |
| File sharing | Upload and share images, documents, audio, and video files up to 100 MB (30+ MIME types whitelisted) |
| Read receipts | Three-state status: **Sent → Delivered → Read**, shown as visual checkmarks in the UI |
| Typing indicators | Real-time "User is typing…" notification for the other party |
| Message deletion | **Delete for me** (soft delete via `deletedFor` array) and **Delete for everyone** (hard delete with file removal from disk) |
| Unread badges | Count of unread messages displayed on the contact list entry |
| End-to-End Encryption | All DM messages are encrypted using the Web Crypto API (ECDH key exchange + AES-GCM); decryption keys stored as non-extractable `CryptoKey` objects in IndexedDB |

### 2.4 Group Messaging

| Feature | Description |
|---|---|
| Group creation | Create named groups with optional description and avatar; creator is automatically an admin |
| Member management | Admin can add and remove members; any member can leave a group |
| Admin controls | Multiple admins supported; creator cannot be demoted; group info editing restricted to admins |
| Group text messaging | Real-time group chat via Socket.IO; same 500-character limit |
| Group file sharing | Same file types and size limits as DM; Multer handles multipart uploads |
| Group deletion | Admin-initiated; cascades to delete all group messages and uploaded files |
| End-to-End Encryption | Group messages encrypted using a Sender-Key pattern with per-member key wrapping via ECDH + AES-GCM |

### 2.5 Private (Ephemeral) Messaging Mode

| Feature | Description |
|---|---|
| DM private sessions | Either participant initiates a private session; messages stored in a server-side `Map` (RAM) keyed by session ID |
| Group private sessions | Group admin initiates; all current members become session participants |
| Zero database persistence | Private messages are **never written to MongoDB** at any point in their lifecycle |
| File handling in private mode | Files may be shared during a private session; they are deleted from disk when the session ends |
| Session lifecycle events | Session ends on: explicit end-session action, participant disconnect, server restart, or page unload (via the Beacon API) |
| Real-time session notifications | Socket.IO broadcasts session-start and session-end events to all participants |
| Single active session constraint | Only one private session can be active per DM conversation or group at a time |

### 2.6 Real-Time and UX Features

| Feature | Description |
|---|---|
| Online / Offline status | Real-time presence indicator broadcast to all contacts on connect/disconnect |
| Notification bell | In-app notification centre for new messages, invitations, and session events |
| Dark / Light mode | Theme toggle persisted via `localStorage`; activated via a `data-theme` attribute on the root element |
| Responsive design | Layout adapts for desktop and mobile viewports |

### 2.7 Security Hardening

| Measure | Implementation |
|---|---|
| Authentication | JWT in `HttpOnly`, `Secure`, `SameSite=Strict` cookies; eliminates XSS token theft |
| Password storage | bcrypt hashing with 12 salt rounds |
| HTTP security headers | Helmet middleware (Content-Security-Policy, X-Frame-Options, etc.) |
| Rate limiting | `express-rate-limit`: 20 requests per 15-minute window on all authentication routes |
| CORS enforcement | Origin restricted to the frontend domain via the `cors` middleware |
| File upload security | MIME-type whitelist; filename sanitised to alphanumeric + `._-` characters only; 100 MB size cap |
| End-to-End Encryption | Web Crypto API (ECDH + AES-GCM); private keys stored as non-extractable `CryptoKey` in IndexedDB |

### 2.8 Technical Infrastructure and Deployment

| Item | Deliverable |
|---|---|
| Backend | Node.js 18 + Express 5 REST API + Socket.IO 4 WebSocket server |
| Frontend | React 19 SPA built with Vite 7 and Tailwind CSS 4 |
| Database | MongoDB Atlas (cloud-hosted) with Mongoose 9 ODM |
| Deployment | Both backend and frontend deployed on Render; Git-based CI/CD with environment variable management |
| Version control | Git with GitHub; all code changes managed through commits |

---

## 3. Out-of-Scope Items

The following are **explicitly excluded** from this project:

| Item | Reason |
|---|---|
| Voice and video calling | Requires WebRTC integration; not part of the current feature set |
| Mobile native applications | Only a web browser client is provided; no React Native or Flutter app |
| Cloud/CDN file storage (e.g., AWS S3) | Files are stored on the server filesystem (`/uploads`); cloud migration is a future enhancement |
| Message search / full-text search | No search index (e.g., MongoDB Atlas Search) is implemented in this version |
| Message pagination / infinite scroll | Message history is capped at the 100 most recent messages per conversation |
| Push notifications (Service Workers / FCM) | Notifications require an active browser tab; no background push support |
| Horizontal scaling / multi-instance deployment | The in-memory private store (`Map`) is not shared across instances; Redis is a planned future enhancement |
| Admin dashboard / monitoring panel | No server-side user management or analytics UI is implemented |
| Two-Factor Authentication (2FA / TOTP) | Single-factor authentication only (email OTP is used only for registration and password recovery) |
| Message reactions and threaded replies | Not implemented in this version |
| Disappearing-message timers | Privacy is achieved through the private session mode, not configurable timers |
| Audit logging | No comprehensive server-side security event log is maintained |

---

## 4. Technical Boundaries

| Boundary | Specification |
|---|---|
| Message length | Maximum 500 characters per text message |
| File upload size | Maximum 100 MB per file |
| Supported file types | Images (JPEG, PNG, GIF, WebP, SVG), documents (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV, ZIP, RAR), audio (MP3, WAV, OGG, AAC, FLAC), video (MP4, WebM, OGG, AVI, MOV, MKV) |
| Browser support | Modern evergreen browsers: Chrome, Firefox, Edge, Safari |
| Authentication token expiry | 7 days (JWT); verification OTP expires after 10 minutes |
| Rate limiting | 20 auth-endpoint requests per 15-minute window per IP |
| Private session constraint | Maximum one active private session per DM or group conversation at a time |
| Message history | Most recent 100 messages loaded per conversation (no pagination) |
| Deployment environment | Render's free tier; single-instance backend |

---

## 5. Project Phases and Schedule

| Phase | Duration | Deliverables |
|---|---|---|
| Phase 1 — Core Foundation | Week 1–2 | Project setup, user authentication (registration, OTP, login), MongoDB integration, REST API skeleton |
| Phase 2 — Messaging | Week 3–4 | Invitation-based contact system, DM messaging, Socket.IO real-time delivery, message persistence |
| Phase 3 — Privacy Features | Week 5–6 | Private session architecture, RAM-only message store (`privateStore.js`), session lifecycle management, Beacon API cleanup |
| Phase 4 — Groups | Week 7–8 | Group CRUD, group messaging, group private sessions, admin controls |
| Phase 5 — File Sharing | Week 9 | Multer file upload, MIME-type filtering, file messages in DMs/groups/private mode, file cleanup on session end and contact removal |
| Phase 6 — UX Enhancements | Week 10 | Typing indicators, read receipts (three-state), unread badges, message deletion (for me / for everyone), notification bell |
| Phase 7 — User Management | Week 11 | Profile page (avatar upload, username change, password change), forgot-password flow, invitation management UI |
| Phase 8 — Security and Deployment | Week 12 | End-to-End Encryption (ECDH + AES-GCM), `HttpOnly` cookie auth, Helmet/CORS/rate-limit hardening, dark mode, Render deployment, testing |

---

## 6. Assumptions and Constraints

1. **Internet connectivity** is assumed for all users; the application requires a stable connection for real-time WebSocket communication.
2. **SMTP access** (Gmail or Ethereal fallback) is required for email OTP delivery; no alternative delivery mechanism is in scope.
3. **Server restarts** will irrecoverably destroy all active private sessions and their messages — this is an intentional design constraint, not a defect.
4. **Local file storage** on the Render server filesystem is ephemeral; uploaded files may be lost on deployment redeploys (cloud storage migration is a future scope item).
5. The application is designed for **small to medium concurrent user loads** consistent with Render's free-tier resource limits; enterprise-scale traffic is out of scope.
6. **Browser-based Web Crypto API** is required for E2E encryption; environments that disable the Crypto API (e.g., non-HTTPS contexts) will not support encryption.
